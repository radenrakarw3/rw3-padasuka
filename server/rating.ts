/**
 * Rating & kritik saran warga (RT / RW).
 * Isi rahasia: hanya admin yang bisa melihat. Publik hanya boleh mengirim.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { pool } from "./db";
import { isNomorHpValid, looksLikeNik, normalizeNomorHp } from "@shared/kontak";
import {
  BINTANG_RATING,
  BINTANG_RATING_LABEL,
  MAKS_ISI_RATING,
  MIN_ISI_RATING,
  SASARAN_RATING,
  SASARAN_RATING_INFO,
  type BintangRating,
  type SasaranRating,
} from "@shared/rating";
import { sendWaWithResult } from "./wa-notify";
import { WilayahError } from "./wilayah-auth";

const MAKS_PER_WA_HARI = 5;

export async function ensureRatingSchema() {
  const file = "0037_rating_masukan.sql";
  const kandidat = [path.join(process.cwd(), "migrations", file)];
  if (typeof __dirname !== "undefined") kandidat.push(path.join(__dirname, "..", "migrations", file));
  const lokasi = kandidat.find((p) => fs.existsSync(p));
  if (!lokasi) {
    console.error(`[Rating] migrations/${file} tidak ditemukan`);
    return;
  }
  await pool.query(fs.readFileSync(lokasi, "utf8"));
}

function hashWa(wa: string): string {
  const secret = process.env.SESSION_SECRET || "rw3-rating";
  return crypto.createHmac("sha256", secret).update(wa).digest("hex");
}

function labelSasaran(sasaran: SasaranRating, nomorRt: number | null): string {
  if (sasaran === "rt") return `Ketua RT ${String(nomorRt).padStart(2, "0")}`;
  return "Pengurus RW 03";
}

function bangunKonfirmasi(bintang: BintangRating, sasaran: SasaranRating, nomorRt: number | null): string {
  const sasaranTeks = labelSasaran(sasaran, nomorRt);
  return [
    "Assalamu'alaikum.",
    "",
    "Terima kasih. Rating dan masukan Anda sudah kami terima.",
    "",
    `Sasaran: ${sasaranTeks}`,
    `Nilai: ${"★".repeat(bintang)}${"☆".repeat(5 - bintang)} (${BINTANG_RATING_LABEL[bintang]})`,
    "",
    "Masukan ini bersifat rahasia dan tidak ditampilkan ke publik. Hanya pengurus RW 03 yang membacanya untuk perbaikan pelayanan.",
    "",
    "— KPP RW 03 Padasuka",
  ].join("\n");
}

const skemaKirim = z
  .object({
    sasaran: z.enum(SASARAN_RATING),
    nomorRt: z.number().int().min(1).max(4).optional().nullable(),
    bintang: z.number().int(),
    isi: z.string().trim().min(MIN_ISI_RATING, `Masukan minimal ${MIN_ISI_RATING} karakter`).max(MAKS_ISI_RATING),
    nomorWa: z.string().min(9, "Nomor WhatsApp tidak valid"),
    /** Honeypot */
    website: z.string().max(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (!BINTANG_RATING.includes(v.bintang as BintangRating)) {
      ctx.addIssue({ code: "custom", path: ["bintang"], message: "Pilih rating 1–5 bintang" });
    }
    if (v.sasaran === "rt" && (v.nomorRt == null || v.nomorRt < 1 || v.nomorRt > 4)) {
      ctx.addIssue({ code: "custom", path: ["nomorRt"], message: "Pilih RT 01–04" });
    }
    if (v.sasaran === "rw" && v.nomorRt != null) {
      ctx.addIssue({ code: "custom", path: ["nomorRt"], message: "Rating RW tidak memakai nomor RT" });
    }
  });

export async function kirimRating(raw: unknown): Promise<{ ok: true; konfirmasi: boolean }> {
  const parsed = skemaKirim.safeParse(raw);
  if (!parsed.success) {
    throw new WilayahError(400, parsed.error.issues[0]?.message || "Data tidak valid");
  }
  const v = parsed.data;

  if (looksLikeNik(v.nomorWa)) {
    throw new WilayahError(400, "Nomor WhatsApp tidak valid (terdeteksi seperti NIK)");
  }
  const wa = normalizeNomorHp(v.nomorWa);
  if (!wa || !isNomorHpValid(wa)) {
    throw new WilayahError(400, "Nomor WhatsApp tidak valid");
  }

  const bintang = v.bintang as BintangRating;
  const nomorRt = v.sasaran === "rt" ? v.nomorRt! : null;
  const waHash = hashWa(wa);

  const { rows: batas } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM rating_masukan
     WHERE nomor_wa_hash = $1 AND created_at > now() - interval '1 day'`,
    [waHash],
  );
  if ((batas[0]?.n ?? 0) >= MAKS_PER_WA_HARI) {
    throw new WilayahError(429, `Maksimal ${MAKS_PER_WA_HARI} masukan per nomor WhatsApp per hari`);
  }

  await pool.query(
    `INSERT INTO rating_masukan (sasaran, nomor_rt, bintang, isi, nomor_wa, nomor_wa_hash)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [v.sasaran, nomorRt, bintang, v.isi, wa, waHash],
  );

  const pesan = bangunKonfirmasi(bintang, v.sasaran, nomorRt);
  let konfirmasi = false;
  try {
    const hasil = await sendWaWithResult(wa, pesan, {
      eventKey: `rating-konfirmasi:${waHash}:${Date.now()}`,
      referenceType: "rating_masukan",
      dedup: false,
    });
    konfirmasi = hasil.status === "sent";
  } catch (err) {
    console.error("[rating] gagal kirim konfirmasi WA:", err);
  }

  return { ok: true, konfirmasi };
}

export async function ringkasanRating() {
  const { rows } = await pool.query<{
    total: number;
    belum_dibaca: number;
    rt: number;
    rw: number;
    rata_rt: string | null;
    rata_rw: string | null;
  }>(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE dibaca_at IS NULL)::int AS belum_dibaca,
      count(*) FILTER (WHERE sasaran = 'rt')::int AS rt,
      count(*) FILTER (WHERE sasaran = 'rw')::int AS rw,
      round(avg(bintang) FILTER (WHERE sasaran = 'rt'), 2)::text AS rata_rt,
      round(avg(bintang) FILTER (WHERE sasaran = 'rw'), 2)::text AS rata_rw
    FROM rating_masukan
  `);
  const r = rows[0];
  return {
    total: r?.total ?? 0,
    belumDibaca: r?.belum_dibaca ?? 0,
    rt: r?.rt ?? 0,
    rw: r?.rw ?? 0,
    rataRt: r?.rata_rt ? Number(r.rata_rt) : null,
    rataRw: r?.rata_rw ? Number(r.rata_rw) : null,
  };
}

export async function daftarRating(opsi: { sasaran?: string; rt?: string; belumDibaca?: boolean }) {
  const syarat: string[] = [];
  const args: unknown[] = [];
  let i = 1;

  if (opsi.sasaran === "rt" || opsi.sasaran === "rw") {
    syarat.push(`sasaran = $${i++}`);
    args.push(opsi.sasaran);
  }
  if (opsi.rt && /^\d+$/.test(opsi.rt)) {
    syarat.push(`nomor_rt = $${i++}`);
    args.push(Number(opsi.rt));
  }
  if (opsi.belumDibaca) {
    syarat.push(`dibaca_at IS NULL`);
  }

  const where = syarat.length ? `WHERE ${syarat.join(" AND ")}` : "";
  const { rows } = await pool.query<{
    id: number;
    sasaran: SasaranRating;
    nomor_rt: number | null;
    bintang: number;
    isi: string;
    nomor_wa: string;
    dibaca_at: Date | null;
    created_at: Date;
  }>(
    `SELECT id, sasaran, nomor_rt, bintang, isi, nomor_wa, dibaca_at, created_at
     FROM rating_masukan ${where}
     ORDER BY created_at DESC
     LIMIT 200`,
    args,
  );

  return rows.map((r) => ({
    id: r.id,
    sasaran: r.sasaran,
    sasaranLabel: labelSasaran(r.sasaran, r.nomor_rt),
    nomorRt: r.nomor_rt,
    bintang: r.bintang,
    bintangLabel: BINTANG_RATING_LABEL[r.bintang as BintangRating] ?? String(r.bintang),
    isi: r.isi,
    nomorWa: r.nomor_wa,
    dibaca: Boolean(r.dibaca_at),
    dibuat: r.created_at,
  }));
}

export async function tandaiDibaca(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new WilayahError(400, "ID tidak valid");
  const { rowCount } = await pool.query(
    `UPDATE rating_masukan SET dibaca_at = COALESCE(dibaca_at, now()) WHERE id = $1`,
    [id],
  );
  if (!rowCount) throw new WilayahError(404, "Masukan tidak ditemukan");
  return { ok: true };
}

export function opsiPublik() {
  return {
    sasaran: SASARAN_RATING.map((id) => ({ id, ...SASARAN_RATING_INFO[id] })),
    bintang: BINTANG_RATING.map((n) => ({ nilai: n, label: BINTANG_RATING_LABEL[n] })),
    rt: [1, 2, 3, 4],
  };
}
