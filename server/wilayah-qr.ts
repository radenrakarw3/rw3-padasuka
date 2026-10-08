/**
 * QR pendataan keluarga.
 * - Token = Crockford base32 dari HMAC(secret, kk:nonce), 80 bit. DB hanya menyimpan SHA-256 token + nonce acak.
 * - Token hanya membuka form usulan; tidak pernah mengembalikan data keluarga.
 * - Usulan tidak mengubah data resmi sampai Ketua RT menerimanya.
 */
import crypto from "crypto";
import QRCode from "qrcode";
import { z } from "zod";
import { pool } from "./db";
import { catatAudit, WilayahError, type Aktor } from "./wilayah-auth";
import { denganTransaksi, detailKeluarga, simpanFakta } from "./wilayah-data";
import {
  FAKTA_BY_KUNCI,
  FAKTA_FORM_KK,
  FAKTA_FORM_RUMAH,
  FAKTA_FORM_USAHA,
  FAKTA_FORM_WARGA,
  HUBUNGAN_KELUARGA,
  KATEGORI_USAHA,
  validasiNilaiFakta,
  type IsiUsulan,
} from "@shared/wilayah";
import { looksLikeNik, normalizeNomorHp } from "@shared/kontak";

const MASA_BERLAKU_HARI = 180;
const ALFABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function rahasia(): string {
  const s = process.env.QR_TOKEN_SECRET || process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new WilayahError(500, "QR_TOKEN_SECRET/SESSION_SECRET belum diatur");
  return s;
}

function base32(buf: Buffer, panjang: number): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALFABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out.slice(0, panjang);
}

export function turunkanToken(kkId: number, nonce: string): string {
  const mac = crypto.createHmac("sha256", rahasia()).update(`kk:${kkId}:${nonce}`).digest();
  return base32(mac.subarray(0, 10), 16);
}

export function normalisasiToken(raw: string): string | null {
  const t = raw.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(t) ? t : null;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function formatToken(token: string): string {
  return token.match(/.{1,4}/g)!.join("-");
}

function acak(panjang: number): string {
  return base32(crypto.randomBytes(Math.ceil((panjang * 5) / 8) + 1), panjang);
}

function situs(): string {
  return (process.env.PUBLIC_SITE_URL || "https://rw3padasukacimahi.org").replace(/\/+$/, "");
}

// ===========================================================================
// Pengelolaan token (Ketua RT)
// ===========================================================================

async function tokenAktif(kkId: number) {
  const { rows } = await pool.query(
    `SELECT id, nonce, kode_kartu, expires_at FROM wil_kk_token WHERE kk_id = $1 AND dicabut_at IS NULL`,
    [kkId],
  );
  return rows[0] as { id: number; nonce: string; kode_kartu: string; expires_at: Date } | undefined;
}

async function terbitkan(aktor: Aktor, kkId: number, rt: number, ganti: boolean) {
  return denganTransaksi(async (c) => {
    const { rows: lama } = await c.query(`SELECT id, expires_at FROM wil_kk_token WHERE kk_id = $1 AND dicabut_at IS NULL FOR UPDATE`, [kkId]);
    const masihBerlaku = lama[0] && new Date(lama[0].expires_at) > new Date();
    if (lama[0] && masihBerlaku && !ganti) return;
    if (lama[0]) {
      await c.query(`UPDATE wil_kk_token SET dicabut_at = now(), alasan_cabut = $2 WHERE id = $1`, [lama[0].id, ganti ? "diganti" : "kedaluwarsa"]);
    }
    const nonce = crypto.randomBytes(16).toString("hex");
    const token = turunkanToken(kkId, nonce);
    const kode = `RT${String(rt).padStart(2, "0")}-${acak(5)}`;
    await c.query(
      `INSERT INTO wil_kk_token (kk_id, rt, nonce, token_hash, kode_kartu, dibuat_oleh, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::interval)`,
      [kkId, rt, nonce, hashToken(token), kode, aktor.label, String(MASA_BERLAKU_HARI)],
    );
    await catatAudit(aktor, ganti ? "ganti_qr" : "buat_qr", "kk", kkId, rt, null, { kodeKartu: kode }, c);
  });
}

export interface KartuCetak {
  kkId: number;
  rt: number;
  kepala: string;
  alamatSingkat: string;
  kodeKartu: string;
  tokenTampil: string;
  url: string;
  qrSvg: string;
  berlakuSampai: string;
}

function singkatAlamat(alamat: string, noUnit: string | null): string {
  const a = alamat.replace(/\s+/g, " ").trim();
  const potong = a.length > 48 ? `${a.slice(0, 45)}…` : a;
  return noUnit ? `${potong} No. ${noUnit}` : potong;
}

/** Kartu untuk dicetak. Membuat token bila belum ada. Tanpa NIK / nomor KK. */
export async function kartuUntukCetak(aktor: Aktor, kkIds: number[] | "semua", ganti = false): Promise<KartuCetak[]> {
  if (aktor.role !== "rt" || !aktor.rt) throw new WilayahError(403, "Cetak kartu hanya oleh Ketua RT");
  const rt = aktor.rt;
  const { rows: kkRows } = await pool.query(
    `SELECT k.id, k.alamat, k.no_unit,
            (SELECT nama_lengkap FROM warga w WHERE w.kk_id = k.id AND w.kedudukan_keluarga = 'Kepala Keluarga' ORDER BY w.id LIMIT 1) AS kepala
       FROM kartu_keluarga k
      WHERE k.rt = $1 AND ($2::int[] IS NULL OR k.id = ANY($2))
      ORDER BY k.alamat, k.no_unit, k.id`,
    [rt, kkIds === "semua" ? null : kkIds],
  );
  if (kkIds !== "semua" && kkRows.length !== kkIds.length) throw new WilayahError(404, "Sebagian KK tidak ada di wilayah RT Anda");
  if (kkRows.length > 400) throw new WilayahError(400, "Terlalu banyak kartu sekaligus (maks. 400)");

  const hasil: KartuCetak[] = [];
  for (const k of kkRows) {
    await terbitkan(aktor, k.id, rt, ganti);
    const t = (await tokenAktif(k.id))!;
    const token = turunkanToken(k.id, t.nonce);
    const url = `${situs()}/isi/${token}`;
    const qrSvg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
    hasil.push({
      kkId: k.id,
      rt,
      kepala: k.kepala || "Kepala Keluarga",
      alamatSingkat: singkatAlamat(k.alamat, k.no_unit),
      kodeKartu: t.kode_kartu,
      tokenTampil: formatToken(token),
      url,
      qrSvg,
      berlakuSampai: new Date(t.expires_at).toISOString().slice(0, 10),
    });
  }
  await catatAudit(aktor, "cetak_qr", "kk", null, rt, null, { jumlah: hasil.length });
  return hasil;
}

export async function cabutToken(aktor: Aktor, kkId: number) {
  if (aktor.role !== "rt" || !aktor.rt) throw new WilayahError(403, "Hanya Ketua RT");
  const { rowCount } = await pool.query(
    `UPDATE wil_kk_token t SET dicabut_at = now(), alasan_cabut = 'dicabut RT'
       FROM kartu_keluarga k WHERE t.kk_id = k.id AND k.rt = $2 AND t.kk_id = $1 AND t.dicabut_at IS NULL`,
    [kkId, aktor.rt],
  );
  if (!rowCount) throw new WilayahError(404, "QR aktif tidak ditemukan");
  await catatAudit(aktor, "cabut_qr", "kk", kkId, aktor.rt);
  return { ok: true };
}

// ===========================================================================
// Publik: buka form & kirim usulan
// ===========================================================================

const batas = new Map<string, { n: number; reset: number }>();
export function kenaBatas(kunci: string, maks: number, jendelaMs: number): boolean {
  const now = Date.now();
  const e = batas.get(kunci);
  if (!e || now > e.reset) {
    batas.set(kunci, { n: 1, reset: now + jendelaMs });
    return false;
  }
  e.n++;
  return e.n > maks;
}

async function cariToken(raw: string) {
  const token = normalisasiToken(raw);
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT id, kk_id, rt, dicabut_at, expires_at FROM wil_kk_token WHERE token_hash = $1`,
    [hashToken(token)],
  );
  const t = rows[0];
  if (!t) return null;
  if (t.dicabut_at) return { status: "dicabut" as const };
  if (new Date(t.expires_at) <= new Date()) return { status: "kedaluwarsa" as const };
  return { status: "aktif" as const, id: t.id as number, kkId: t.kk_id as number, rt: t.rt as number };
}

/** Hanya memberi tahu apakah kartu berlaku dan RT-nya. Tidak ada data keluarga. */
export async function bukaToken(raw: string) {
  const t = await cariToken(raw);
  if (!t) throw new WilayahError(404, "Kode kartu tidak dikenal. Periksa kembali atau hubungi Ketua RT.");
  if (t.status !== "aktif") throw new WilayahError(410, t.status === "dicabut" ? "Kartu ini sudah diganti. Minta kartu baru ke Ketua RT." : "Kartu ini sudah kedaluwarsa. Minta kartu baru ke Ketua RT.");
  return { rt: t.rt, versiForm: 1 };
}

const ytOrPilihan = (kunci: string) => z.string().refine((v) => {
  const def = FAKTA_BY_KUNCI.get(kunci);
  return !!def && validasiNilaiFakta(def, v) === null;
}, `Jawaban ${kunci} tidak valid`);

function jawabanSchema(kunciDiizinkan: readonly string[]) {
  return z.record(z.string(), z.string()).superRefine((obj, ctx) => {
    for (const [k, v] of Object.entries(obj)) {
      if (!kunciDiizinkan.includes(k)) ctx.addIssue({ code: "custom", message: `Pertanyaan ${k} tidak dikenal` });
      else if (!ytOrPilihan(k).safeParse(v).success) ctx.addIssue({ code: "custom", message: `Jawaban untuk ${k} tidak valid` });
    }
  });
}

const tanggalOpsional = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();

export const isiUsulanSchema: z.ZodType<IsiUsulan> = z.object({
  versiForm: z.literal(1),
  namaPengisi: z.string().trim().min(2).max(100),
  hubunganPengisi: z.string().trim().min(2).max(40),
  nomorHp: z.string().trim().max(20).nullable().optional(),
  rumahTangga: jawabanSchema([...FAKTA_FORM_KK, ...FAKTA_FORM_RUMAH]),
  anggota: z.array(z.object({
    nama: z.string().trim().min(2).max(100),
    hubungan: z.enum(HUBUNGAN_KELUARGA),
    jenisKelamin: z.enum(["Laki-laki", "Perempuan"]),
    tanggalLahir: tanggalOpsional,
    jawaban: jawabanSchema(FAKTA_FORM_WARGA),
    keterangan: z.enum(["tetap", "baru", "pindah", "meninggal"]).optional(),
  })).min(1, "Isi minimal satu anggota keluarga").max(20),
  usaha: z.array(z.object({
    nama: z.string().trim().min(2).max(100),
    kategori: z.enum(KATEGORI_USAHA.map((k) => k.nilai) as [string, ...string[]]).nullable(),
    pemilik: z.string().trim().min(2).max(100),
    jawaban: jawabanSchema(FAKTA_FORM_USAHA),
  })).max(5),
  catatan: z.string().trim().max(1000).nullable().optional(),
}).superRefine((v, ctx) => {
  if (v.nomorHp) {
    if (looksLikeNik(v.nomorHp)) ctx.addIssue({ code: "custom", path: ["nomorHp"], message: "Nomor HP terlihat seperti NIK" });
    else if (!normalizeNomorHp(v.nomorHp)) ctx.addIssue({ code: "custom", path: ["nomorHp"], message: "Nomor HP tidak valid" });
  }
});

export async function kirimUsulan(raw: string, body: unknown, ip: string) {
  const d = z.object({ idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/), isi: isiUsulanSchema }).parse(body);
  const t = await cariToken(raw);
  if (!t) throw new WilayahError(404, "Kode kartu tidak dikenal");
  if (t.status !== "aktif") throw new WilayahError(410, "Kartu ini sudah tidak berlaku. Minta kartu baru ke Ketua RT.");

  const { rows: ulang } = await pool.query(`SELECT kode_terima, token_id FROM wil_usulan WHERE idempotency_key = $1`, [d.idempotencyKey]);
  if (ulang[0]) {
    if (ulang[0].token_id !== t.id) throw new WilayahError(409, "Pengiriman ganda terdeteksi");
    return { kodeTerima: ulang[0].kode_terima as string, ulang: true };
  }
  if (kenaBatas(`usulan:token:${t.id}`, 5, 24 * 3600_000)) throw new WilayahError(429, "Kartu ini sudah dipakai mengirim beberapa kali hari ini. Coba besok atau hubungi Ketua RT.");

  const ipHash = crypto.createHmac("sha256", rahasia()).update(ip).digest("hex").slice(0, 32);
  const kodeTerima = acak(10);
  return denganTransaksi(async (c) => {
    await c.query(`UPDATE wil_usulan SET status = 'digantikan' WHERE kk_id = $1 AND status IN ('menunggu', 'klarifikasi')`, [t.kkId]);
    const { rows } = await c.query(
      `INSERT INTO wil_usulan (token_id, kk_id, rt, isi, idempotency_key, kode_terima, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (idempotency_key) DO NOTHING RETURNING kode_terima`,
      [t.id, t.kkId, t.rt, JSON.stringify(d.isi), d.idempotencyKey, kodeTerima, ipHash],
    );
    if (!rows[0]) {
      const { rows: ada } = await c.query(`SELECT kode_terima FROM wil_usulan WHERE idempotency_key = $1`, [d.idempotencyKey]);
      return { kodeTerima: ada[0].kode_terima as string, ulang: true };
    }
    return { kodeTerima: rows[0].kode_terima as string, ulang: false };
  });
}

/** Status pengiriman berdasarkan kode tanda terima — tanpa isi data. */
export async function statusUsulan(kode: string) {
  const k = kode.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (!/^[0-9A-Z]{10}$/.test(k)) throw new WilayahError(400, "Kode tanda terima tidak valid");
  const { rows } = await pool.query(`SELECT status, catatan_rt, created_at, diputus_at FROM wil_usulan WHERE kode_terima = $1`, [k]);
  if (!rows[0]) throw new WilayahError(404, "Kode tanda terima tidak ditemukan");
  const r = rows[0];
  return {
    status: r.status as string,
    dikirim: r.created_at,
    diputus: r.diputus_at,
    pesanRt: r.status === "klarifikasi" || r.status === "ditolak" ? r.catatan_rt : null,
  };
}

// ===========================================================================
// Ketua RT: periksa & putuskan usulan
// ===========================================================================

export async function daftarUsulan(aktor: Aktor, status = "menunggu") {
  if (aktor.role !== "rt") throw new WilayahError(403, "Hanya Ketua RT");
  const { rows } = await pool.query(
    `SELECT u.id, u.kk_id, u.status, u.created_at, u.isi->>'namaPengisi' AS pengisi,
            (SELECT nama_lengkap FROM warga w WHERE w.kk_id = u.kk_id AND w.kedudukan_keluarga = 'Kepala Keluarga' LIMIT 1) AS kepala,
            k.alamat
       FROM wil_usulan u JOIN kartu_keluarga k ON k.id = u.kk_id
      WHERE u.rt = $1 AND k.rt = $1 AND ($2 = 'semua' OR u.status = $2)
      ORDER BY u.created_at DESC LIMIT 200`,
    [aktor.rt, status],
  );
  return rows;
}

export async function detailUsulan(aktor: Aktor, id: number) {
  if (aktor.role !== "rt") throw new WilayahError(403, "Hanya Ketua RT");
  const { rows } = await pool.query(`SELECT id, kk_id, rt, isi, status, catatan_rt, created_at FROM wil_usulan WHERE id = $1`, [id]);
  const u = rows[0];
  if (!u || u.rt !== aktor.rt) throw new WilayahError(404, "Usulan tidak ditemukan");
  const resmi = await detailKeluarga(aktor, u.kk_id);
  return { usulan: { id: u.id, kkId: u.kk_id, isi: u.isi as IsiUsulan, status: u.status, catatanRt: u.catatan_rt, dibuat: u.created_at }, resmi };
}

const putusanSchema = z.discriminatedUnion("aksi", [
  z.object({ aksi: z.literal("tolak"), catatan: z.string().trim().min(3).max(500) }),
  z.object({ aksi: z.literal("klarifikasi"), catatan: z.string().trim().min(3).max(500) }),
  z.object({
    aksi: z.literal("terima"),
    catatan: z.string().trim().max(500).optional(),
    /** Jawaban yang dipilih RT untuk diterapkan (subjek & ID resmi dipilih RT, bukan dari warga). */
    fakta: z.array(z.object({
      subjek: z.enum(["warga", "kk", "rumah", "usaha"]),
      subjekId: z.number().int().positive(),
      kunci: z.string(),
      nilai: z.string(),
    })).max(300),
    tanggalLahir: z.array(z.object({ wargaId: z.number().int().positive(), tanggalLahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).max(20).default([]),
    nomorHp: z.object({ wargaId: z.number().int().positive(), nomorHp: z.string() }).optional(),
  }),
]);

export async function putuskanUsulan(aktor: Aktor, id: number, input: unknown) {
  if (aktor.role !== "rt" || !aktor.rt) throw new WilayahError(403, "Hanya Ketua RT");
  const rt = aktor.rt;
  const d = putusanSchema.parse(input);
  return denganTransaksi(async (c) => {
    const { rows } = await c.query(`SELECT id, kk_id, rt, status FROM wil_usulan WHERE id = $1 FOR UPDATE`, [id]);
    const u = rows[0];
    if (!u || u.rt !== rt) throw new WilayahError(404, "Usulan tidak ditemukan");
    if (u.status !== "menunggu" && u.status !== "klarifikasi") throw new WilayahError(409, "Usulan ini sudah diputus atau digantikan kiriman baru");
    const { rows: kk } = await c.query(`SELECT rt FROM kartu_keluarga WHERE id = $1`, [u.kk_id]);
    if (kk[0]?.rt !== rt) throw new WilayahError(409, "KK sudah tidak berada di RT Anda");

    if (d.aksi !== "terima") {
      await c.query(`UPDATE wil_usulan SET status = $2, catatan_rt = $3, diputus_at = now(), diputus_oleh = $4 WHERE id = $1`, [id, d.aksi === "tolak" ? "ditolak" : "klarifikasi", d.catatan, aktor.label]);
      await catatAudit(aktor, `usulan_${d.aksi}`, "usulan", id, rt, null, { catatan: d.catatan }, c);
      return { ok: true, diterapkan: 0 };
    }

    const { rows: anggota } = await c.query(`SELECT id FROM warga WHERE kk_id = $1`, [u.kk_id]);
    const idAnggota = new Set(anggota.map((a) => a.id));
    const { rows: rumah } = await c.query(`SELECT rumah_id FROM wil_rumah_kk WHERE kk_id = $1 AND sampai IS NULL`, [u.kk_id]);
    let n = 0;
    for (const f of d.fakta) {
      if (f.subjek === "warga" && !idAnggota.has(f.subjekId)) throw new WilayahError(400, "Jawaban hanya boleh diterapkan ke anggota KK ini");
      if (f.subjek === "kk" && f.subjekId !== u.kk_id) throw new WilayahError(400, "Jawaban rumah tangga hanya untuk KK ini");
      if (f.subjek === "rumah" && rumah[0]?.rumah_id !== f.subjekId) throw new WilayahError(400, "Hubungkan KK ke rumah terlebih dahulu");
      const r = await simpanFakta(aktor, { ...f, sumber: "usulan_warga", catatan: `Usulan warga #${id}` }, c);
      if (!r.tidakBerubah) n++;
    }
    for (const t of d.tanggalLahir) {
      if (!idAnggota.has(t.wargaId)) throw new WilayahError(400, "Anggota tidak valid");
      await c.query(`UPDATE warga SET tanggal_lahir = $2 WHERE id = $1`, [t.wargaId, t.tanggalLahir]);
      await catatAudit(aktor, "ubah", "warga", t.wargaId, rt, null, { tanggalLahir: t.tanggalLahir, sumber: `usulan #${id}` }, c);
      n++;
    }
    if (d.nomorHp) {
      if (!idAnggota.has(d.nomorHp.wargaId)) throw new WilayahError(400, "Anggota tidak valid");
      if (looksLikeNik(d.nomorHp.nomorHp)) throw new WilayahError(400, "Nomor HP terlihat seperti NIK");
      const hp = normalizeNomorHp(d.nomorHp.nomorHp);
      if (!hp) throw new WilayahError(400, "Nomor HP tidak valid");
      await c.query(`UPDATE warga SET nomor_whatsapp = $2 WHERE id = $1`, [d.nomorHp.wargaId, hp]);
      n++;
    }
    await c.query(`UPDATE wil_usulan SET status = 'diterima', catatan_rt = $2, diputus_at = now(), diputus_oleh = $3 WHERE id = $1`, [id, d.catatan ?? null, aktor.label]);
    await catatAudit(aktor, "usulan_terima", "usulan", id, rt, null, { diterapkan: n }, c);
    return { ok: true, diterapkan: n };
  });
}
