/**
 * Rating & kritik saran warga (RT / RW).
 * Kompetisi per bulan (WIB): ranking reset tiap bulan, histori tetap untuk laporan reward.
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
  bulanRatingSekarang,
  bulanRatingSelesai,
  isBulanRating,
  labelBulanRating,
  rentangBulanRating,
  type BintangRating,
  type SasaranRating,
} from "@shared/rating";
import { WILAYAH_RT_NUMBERS, isWilayahRt } from "@shared/wilayah";
import { sendWaWithResult } from "./wa-notify";
import { KETUA_RW_WA, notifyKetuaRwRatingBaru } from "./wa-notify-ketua";
import { WilayahError } from "./wilayah-auth";

const MAKS_PER_WA_HARI = 5;

export class RatingError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "RatingError";
  }
}

/** Varian digit untuk mencocokkan nomor tersimpan (08… / 62… / 8…). */
function varianDigitWa(wa08: string): string[] {
  let d = wa08.replace(/\D/g, "");
  if (d.startsWith("62")) d = `0${d.slice(2)}`;
  else if (d.startsWith("8")) d = `0${d}`;
  const intl = d.startsWith("0") ? `62${d.slice(1)}` : d;
  const bare = d.startsWith("0") ? d.slice(1) : d;
  return [...new Set([d, intl, bare].filter((x) => x.length >= 9))];
}

/** Cek nomor terdaftar sebagai warga RW, Visit RW3, atau RW3BIZ. */
export async function waTerdaftarDiSistem(wa08: string): Promise<{
  ok: boolean;
  sumber: ("warga" | "visitrw3" | "rw3biz")[];
}> {
  const varian = varianDigitWa(wa08);
  if (!varian.length) return { ok: false, sumber: [] };

  const digitExpr = (col: string) => `regexp_replace(coalesce(${col}, ''), '\\D', '', 'g')`;
  const cocok = (col: string) => `${digitExpr(col)} = ANY($1::text[])`;

  const [warga, visit, biz] = await Promise.all([
    pool.query<{ n: number }>(
      `SELECT 1::int AS n FROM warga
       WHERE ${cocok("nomor_whatsapp")} OR ${cocok("nomor_whatsapp_alternatif")}
       LIMIT 1`,
      [varian],
    ),
    pool.query<{ n: number }>(
      `SELECT 1::int AS n WHERE EXISTS (
         SELECT 1 FROM warga_singgah WHERE ${cocok("nomor_whatsapp")}
       ) OR EXISTS (
         SELECT 1 FROM visitrw3_penghuni WHERE ${cocok("nomor_whatsapp")}
       ) OR EXISTS (
         SELECT 1 FROM pemilik_kost
         WHERE ${cocok("nomor_wa_pemilik")} OR ${cocok("nomor_wa_penanggung_jawab")}
       )`,
      [varian],
    ),
    pool.query<{ n: number }>(
      `SELECT 1::int AS n WHERE EXISTS (
         SELECT 1 FROM rw3biz_usaha WHERE ${cocok("pj_nomor_whatsapp")}
       ) OR EXISTS (
         SELECT 1 FROM rw3biz_orang WHERE ${cocok("nomor_whatsapp")}
       ) OR EXISTS (
         SELECT 1 FROM rw3biz_pengajuan WHERE ${cocok("pj_nomor_whatsapp")}
       )`,
      [varian],
    ),
  ]);

  const sumber: ("warga" | "visitrw3" | "rw3biz")[] = [];
  if (warga.rows[0]) sumber.push("warga");
  if (visit.rows[0]) sumber.push("visitrw3");
  if (biz.rows[0]) sumber.push("rw3biz");
  return { ok: sumber.length > 0, sumber };
}

/** Filter created_at ke periode bulan WIB (timestamp disimpan UTC / server). */
const SYARAT_BULAN =
  `(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date >= $BULAN::date` +
  ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date < $SELESAI::date`;

export async function ensureRatingSchema() {
  for (const file of ["0037_rating_masukan.sql", "0038_rating_rt_1_7.sql"]) {
    const kandidat = [path.join(process.cwd(), "migrations", file)];
    if (typeof __dirname !== "undefined") kandidat.push(path.join(__dirname, "..", "migrations", file));
    const lokasi = kandidat.find((p) => fs.existsSync(p));
    if (!lokasi) {
      console.error(`[Rating] migrations/${file} tidak ditemukan`);
      continue;
    }
    await pool.query(fs.readFileSync(lokasi, "utf8"));
  }
}

function hashWa(wa: string): string {
  const secret = process.env.SESSION_SECRET || "rw3-rating";
  return crypto.createHmac("sha256", secret).update(wa).digest("hex");
}

function labelSasaran(sasaran: SasaranRating, nomorRt: number | null): string {
  if (sasaran === "rt") return `Ketua RT ${String(nomorRt).padStart(2, "0")}`;
  return "Pengurus RW 03";
}

function normalisasiBulan(raw?: string | null): string {
  if (raw && isBulanRating(raw)) return raw;
  return bulanRatingSekarang();
}

function syaratBulanSql(mulaiIdx: number, selesaiIdx: number): string {
  return SYARAT_BULAN.replace("$BULAN", `$${mulaiIdx}`).replace("$SELESAI", `$${selesaiIdx}`);
}

function bangunKonfirmasi(
  bintang: BintangRating,
  sasaran: SasaranRating,
  nomorRt: number | null,
  labelBulan: string,
): string {
  const sasaranTeks = labelSasaran(sasaran, nomorRt);
  return [
    "Assalamu'alaikum.",
    "",
    "Terima kasih. Rating dan masukan Anda sudah kami terima.",
    "",
    `Periode: *${labelBulan}*`,
    `Sasaran: ${sasaranTeks}`,
    `Nilai: ${"★".repeat(bintang)}${"☆".repeat(5 - bintang)} (${BINTANG_RATING_LABEL[bintang]})`,
    "",
    "Rating dihitung per bulan untuk penilaian kinerja. Masukan bersifat rahasia dan tidak ditampilkan ke publik.",
    "",
    "— KPP RW 03 Padasuka",
  ].join("\n");
}

const skemaKirim = z
  .object({
    sasaran: z.enum(SASARAN_RATING),
    nomorRt: z.number().int().min(1).max(7).optional().nullable(),
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
    if (v.sasaran === "rt" && !isWilayahRt(v.nomorRt)) {
      ctx.addIssue({ code: "custom", path: ["nomorRt"], message: "Pilih RT 01–07" });
    }
    if (v.sasaran === "rw" && v.nomorRt != null) {
      ctx.addIssue({ code: "custom", path: ["nomorRt"], message: "Rating RW tidak memakai nomor RT" });
    }
  });

export async function kirimRating(raw: unknown): Promise<{ ok: true; konfirmasi: boolean; bulan: string }> {
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

  const daftar = await waTerdaftarDiSistem(wa);
  if (!daftar.ok) {
    throw new RatingError(
      403,
      "Nomor WhatsApp belum terdaftar sebagai warga RW 03, Visit RW3, atau RW3BIZ. Hubungi admin untuk bantu memperbarui data nomor Anda.",
      {
        code: "wa_belum_terdaftar",
        adminWa: KETUA_RW_WA,
        pesanAdmin:
          `Assalamu'alaikum Ketua RW 03,\n\nSaya ingin mengisi rating/masukan, tetapi nomor WhatsApp saya (${wa}) belum terdaftar di sistem.\nMohon bantu perbarui data nomor saya.\n\nTerima kasih.`,
      },
    );
  }

  const bintang = v.bintang as BintangRating;
  const nomorRt = v.sasaran === "rt" ? v.nomorRt! : null;
  const waHash = hashWa(wa);
  const bulan = bulanRatingSekarang();
  const { label } = rentangBulanRating(bulan);

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

  notifyKetuaRwRatingBaru({
    sasaranLabel: `${labelSasaran(v.sasaran, nomorRt)} · ${label}`,
    bintang,
    cuplikan: v.isi,
  });

  const pesan = bangunKonfirmasi(bintang, v.sasaran, nomorRt, label);
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

  return { ok: true, konfirmasi, bulan };
}

function penilaianDariRata(rata: number | null): {
  kode: "sangat_baik" | "baik" | "cukup" | "kurang" | "sangat_kurang" | "belum_ada";
  label: string;
} {
  if (rata == null) return { kode: "belum_ada", label: "Belum ada data" };
  if (rata >= 4.5) return { kode: "sangat_baik", label: "Sangat baik" };
  if (rata >= 3.5) return { kode: "baik", label: "Baik" };
  if (rata >= 2.5) return { kode: "cukup", label: "Cukup" };
  if (rata >= 1.5) return { kode: "kurang", label: "Kurang" };
  return { kode: "sangat_kurang", label: "Sangat kurang" };
}

async function hitungRw(mulai: string, selesai: string) {
  const { rows } = await pool.query<{
    jumlah: number;
    rata: string | null;
    bintang_1: number;
    bintang_2: number;
    bintang_3: number;
    bintang_4: number;
    bintang_5: number;
  }>(
    `SELECT
      count(*)::int AS jumlah,
      round(avg(bintang), 2)::text AS rata,
      count(*) FILTER (WHERE bintang = 1)::int AS bintang_1,
      count(*) FILTER (WHERE bintang = 2)::int AS bintang_2,
      count(*) FILTER (WHERE bintang = 3)::int AS bintang_3,
      count(*) FILTER (WHERE bintang = 4)::int AS bintang_4,
      count(*) FILTER (WHERE bintang = 5)::int AS bintang_5
    FROM rating_masukan
    WHERE sasaran = 'rw'
      AND ${syaratBulanSql(1, 2)}`,
    [mulai, selesai],
  );
  const row = rows[0];
  const jumlah = row?.jumlah ?? 0;
  const rata = jumlah > 0 && row?.rata ? Number(row.rata) : null;
  const penilaian = penilaianDariRata(rata);
  return {
    label: "Pengurus RW 03",
    jumlah,
    rata,
    penilaian,
    sebaran: {
      1: row?.bintang_1 ?? 0,
      2: row?.bintang_2 ?? 0,
      3: row?.bintang_3 ?? 0,
      4: row?.bintang_4 ?? 0,
      5: row?.bintang_5 ?? 0,
    },
  };
}

async function hitungPerRt(mulai: string, selesai: string) {
  const { rows: perRtRows } = await pool.query<{
    nomor_rt: number;
    jumlah: number;
    rata: string;
    bintang_1: number;
    bintang_2: number;
    bintang_3: number;
    bintang_4: number;
    bintang_5: number;
  }>(
    `SELECT
      nomor_rt,
      count(*)::int AS jumlah,
      round(avg(bintang), 2)::text AS rata,
      count(*) FILTER (WHERE bintang = 1)::int AS bintang_1,
      count(*) FILTER (WHERE bintang = 2)::int AS bintang_2,
      count(*) FILTER (WHERE bintang = 3)::int AS bintang_3,
      count(*) FILTER (WHERE bintang = 4)::int AS bintang_4,
      count(*) FILTER (WHERE bintang = 5)::int AS bintang_5
    FROM rating_masukan
    WHERE sasaran = 'rt' AND nomor_rt IS NOT NULL
      AND ${syaratBulanSql(1, 2)}
    GROUP BY nomor_rt`,
    [mulai, selesai],
  );

  const byRt = new Map(perRtRows.map((row) => [row.nomor_rt, row]));
  const perRt = WILAYAH_RT_NUMBERS.map((nomorRt) => {
    const row = byRt.get(nomorRt);
    return {
      nomorRt,
      label: `RT ${String(nomorRt).padStart(2, "0")}`,
      jumlah: row?.jumlah ?? 0,
      rata: row ? Number(row.rata) : null,
      sebaran: {
        1: row?.bintang_1 ?? 0,
        2: row?.bintang_2 ?? 0,
        3: row?.bintang_3 ?? 0,
        4: row?.bintang_4 ?? 0,
        5: row?.bintang_5 ?? 0,
      },
    };
  });

  const berating = perRt.filter((x) => x.jumlah > 0 && x.rata != null);
  const terurut = [...berating].sort((a, b) => (b.rata ?? 0) - (a.rata ?? 0) || b.jumlah - a.jumlah);
  const terbaik = terurut[0] ?? null;
  const terburuk = terurut.length ? terurut[terurut.length - 1] : null;

  return {
    perRt,
    peringkat: terurut.map((x, i) => ({
      peringkat: i + 1,
      nomorRt: x.nomorRt,
      label: x.label,
      rata: x.rata!,
      jumlah: x.jumlah,
    })),
    terbaik: terbaik
      ? { nomorRt: terbaik.nomorRt, label: terbaik.label, rata: terbaik.rata!, jumlah: terbaik.jumlah }
      : null,
    terburuk: terburuk
      ? { nomorRt: terburuk.nomorRt, label: terburuk.label, rata: terburuk.rata!, jumlah: terburuk.jumlah }
      : null,
  };
}

export async function daftarBulanRating() {
  const sekarang = bulanRatingSekarang();
  const { rows } = await pool.query<{ bulan: string }>(`
    SELECT DISTINCT to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS bulan
    FROM rating_masukan
    ORDER BY bulan DESC
  `);
  const set = new Set(rows.map((r) => r.bulan).filter(isBulanRating));
  set.add(sekarang);
  return [...set]
    .sort((a, b) => b.localeCompare(a))
    .map((bulan) => ({
      bulan,
      label: labelBulanRating(bulan),
      berjalan: bulan === sekarang,
      selesai: bulanRatingSelesai(bulan),
    }));
}

export async function ringkasanRating(bulanRaw?: string | null) {
  const bulan = normalisasiBulan(bulanRaw);
  const { mulai, selesai, label } = rentangBulanRating(bulan);
  const berjalan = bulan === bulanRatingSekarang();
  const selesaiPeriode = bulanRatingSelesai(bulan);

  const { rows } = await pool.query<{
    total: number;
    belum_dibaca: number;
    rt: number;
    rw: number;
    rata_rt: string | null;
    rata_rw: string | null;
  }>(
    `SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE dibaca_at IS NULL)::int AS belum_dibaca,
      count(*) FILTER (WHERE sasaran = 'rt')::int AS rt,
      count(*) FILTER (WHERE sasaran = 'rw')::int AS rw,
      round(avg(bintang) FILTER (WHERE sasaran = 'rt'), 2)::text AS rata_rt,
      round(avg(bintang) FILTER (WHERE sasaran = 'rw'), 2)::text AS rata_rw
    FROM rating_masukan
    WHERE ${syaratBulanSql(1, 2)}`,
    [mulai, selesai],
  );
  const r = rows[0];
  const [skor, rekapRw] = await Promise.all([hitungPerRt(mulai, selesai), hitungRw(mulai, selesai)]);
  const daftarBulan = await daftarBulanRating();
  const rataRt = r?.rata_rt ? Number(r.rata_rt) : null;
  const rataRw = r?.rata_rw ? Number(r.rata_rw) : null;

  return {
    bulan,
    labelBulan: label,
    berjalan,
    selesai: selesaiPeriode,
    total: r?.total ?? 0,
    belumDibaca: r?.belum_dibaca ?? 0,
    rt: r?.rt ?? 0,
    rw: r?.rw ?? 0,
    rataRt,
    rataRw,
    ...skor,
    rekapRw,
    daftarBulan,
    laporan: bangunLaporanReward({
      bulan,
      label,
      selesai: selesaiPeriode,
      berjalan,
      total: r?.total ?? 0,
      rataRt,
      rataRw,
      rekapRw,
      terbaik: skor.terbaik,
      terburuk: skor.terburuk,
      peringkat: skor.peringkat,
    }),
  };
}

function bangunLaporanReward(input: {
  bulan: string;
  label: string;
  selesai: boolean;
  berjalan: boolean;
  total: number;
  rataRt: number | null;
  rataRw: number | null;
  rekapRw: Awaited<ReturnType<typeof hitungRw>>;
  terbaik: { nomorRt: number; label: string; rata: number; jumlah: number } | null;
  terburuk: { nomorRt: number; label: string; rata: number; jumlah: number } | null;
  peringkat: { peringkat: number; nomorRt: number; label: string; rata: number; jumlah: number }[];
}) {
  const siapReward = input.selesai && !!input.terbaik && input.terbaik.jumlah > 0;
  const catatan: string[] = [];

  if (input.berjalan) {
    catatan.push(
      `Periode ${input.label} masih berjalan. Ranking akan dikunci setelah akhir bulan untuk penentuan reward.`,
    );
  } else if (siapReward) {
    catatan.push(
      `Laporan ${input.label} siap. Pertimbangkan reward untuk ${input.terbaik!.label} (rata-rata ${input.terbaik!.rata}).`,
    );
    if (input.terburuk && input.terburuk.nomorRt !== input.terbaik!.nomorRt) {
      catatan.push(
        `${input.terburuk.label} perlu perhatian/pembinaan (rata-rata ${input.terburuk.rata}).`,
      );
    }
  } else {
    catatan.push(`Belum ada cukup data rating RT pada ${input.label} untuk menentukan reward.`);
  }

  if (input.rekapRw.jumlah > 0 && input.rekapRw.rata != null) {
    catatan.push(
      `Rating RW ${input.label}: rata-rata ${input.rekapRw.rata} (${input.rekapRw.penilaian.label}) dari ${input.rekapRw.jumlah} masukan.`,
    );
  } else {
    catatan.push(`Belum ada rating RW pada ${input.label}.`);
  }

  return {
    siapReward,
    judul: `Laporan rating ${input.label}`,
    ringkas: siapReward
      ? `Juara RT: ${input.terbaik!.label} · rata-rata ${input.terbaik!.rata} · RW: ${input.rekapRw.rata != null ? formatAngka(input.rekapRw.rata) : "–"} (${input.rekapRw.penilaian.label})`
      : input.berjalan
        ? `Kompetisi ${input.label} masih dibuka. Rating RW sementara: ${input.rekapRw.rata != null ? formatAngka(input.rekapRw.rata) : "belum ada"}.`
        : `Belum ada juara RT untuk ${input.label}. Rating RW: ${input.rekapRw.rata != null ? formatAngka(input.rekapRw.rata) : "belum ada"}.`,
    rekomendasiReward: siapReward
      ? {
          nomorRt: input.terbaik!.nomorRt,
          label: input.terbaik!.label,
          rata: input.terbaik!.rata,
          jumlah: input.terbaik!.jumlah,
          saran: `Berikan apresiasi/reward kepada pengurus ${input.terbaik!.label} atas kinerja terbaik ${input.label}.`,
        }
      : null,
    perluPembinaan:
      siapReward && input.terburuk && input.terburuk.nomorRt !== input.terbaik!.nomorRt
        ? {
            nomorRt: input.terburuk.nomorRt,
            label: input.terburuk.label,
            rata: input.terburuk.rata,
            jumlah: input.terburuk.jumlah,
            saran: `Dampingi ${input.terburuk.label} untuk perbaikan pelayanan pada bulan berikutnya.`,
          }
        : null,
    rekapRw: input.rekapRw,
    peringkat: input.peringkat,
    totalMasukan: input.total,
    rataRt: input.rataRt,
    rataRw: input.rataRw,
    catatan,
  };
}

function formatAngka(n: number): string {
  return n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export async function daftarRating(opsi: {
  sasaran?: string;
  rt?: string;
  belumDibaca?: boolean;
  bulan?: string | null;
}) {
  const bulan = normalisasiBulan(opsi.bulan);
  const { mulai, selesai } = rentangBulanRating(bulan);
  const syarat: string[] = [syaratBulanSql(1, 2)];
  const args: unknown[] = [mulai, selesai];
  let i = 3;

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

  const where = `WHERE ${syarat.join(" AND ")}`;
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
    bulan,
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
  const bulan = bulanRatingSekarang();
  return {
    sasaran: SASARAN_RATING.map((id) => ({ id, ...SASARAN_RATING_INFO[id] })),
    bintang: BINTANG_RATING.map((n) => ({ nilai: n, label: BINTANG_RATING_LABEL[n] })),
    rt: [...WILAYAH_RT_NUMBERS],
    bulan,
    labelBulan: labelBulanRating(bulan),
    adminWa: KETUA_RW_WA,
  };
}
