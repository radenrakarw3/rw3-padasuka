/**
 * Aduan Warga RW 03 — penerimaan aduan publik, pelacakan pelapor, dan penanganan oleh Ketua RW.
 * Teguran resmi & tindak lanjut ada di aduan-teguran.ts.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { pool } from "./db";
import { WilayahError, type Aktor } from "./wilayah-auth";
import { denganTransaksi } from "./wilayah-data";
import { parseGambar } from "./visitrw3-dokumen";
import { cariUsahaByNomor } from "./rw3biz";
import { daftarUsahaPublik } from "./rw3biz-pelanggaran";
import { cekWarga } from "./cek-warga";
import {
  buatKodeLacak, buatPin, cocokPin, dekripsi, enkripsi, hashPin, normalKodeLacak, samarNama, samarWa, sidikWa,
} from "./aduan-kripto";
import { isNomorHpValid, normalizeNomorHp } from "@shared/kontak";
import {
  DAMPAK_ADUAN, FREKUENSI_ADUAN, JENIS_TERADU, KATEGORI_ADUAN, KATEGORI_ADUAN_INFO, MAKS_FOTO_ADUAN, MASA_HITUNG_TEGURAN_BULAN,
  MODE_IDENTITAS, PRIORITAS_ADUAN, STATUS_ADUAN, STATUS_ADUAN_INFO, TINGKAT_TEGURAN, hitungPrioritas, kunciTeradu, nomorAduan,
  saranTingkatTeguran, type StatusAduan, type TingkatTeguran,
} from "@shared/aduan";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAKS_ADUAN_PER_WA_HARI = 3;
const MAKS_BYTES_FOTO = 1_500_000;

// ---------------------------------------------------------------- Skema DB
export async function ensureAduanSchema() {
  const file = "0031_aduan.sql";
  const kandidat = [path.join(process.cwd(), "migrations", file)];
  if (typeof __dirname !== "undefined") kandidat.push(path.join(__dirname, "..", "migrations", file));
  const lokasi = kandidat.find((p) => fs.existsSync(p));
  if (!lokasi) {
    console.error(`[Aduan] migrations/${file} tidak ditemukan; tabel aduan tidak dipasang otomatis`);
    return;
  }
  await pool.query(fs.readFileSync(lokasi, "utf8"));
}

// ---------------------------------------------------------------- Bantuan
function fotoSchema() {
  return z.array(z.string().max(2_200_000)).max(MAKS_FOTO_ADUAN, `Maksimal ${MAKS_FOTO_ADUAN} foto`).default([]);
}

function parseFoto(daftar: string[]) {
  return daftar.map((f, i) => parseGambar(f, `Foto bukti ${i + 1}`, MAKS_BYTES_FOTO));
}

type Klien = { query: typeof pool.query };

async function catatTimeline(c: Klien, aduanId: number, jenis: string, isi: string, publik: boolean, oleh: string | null) {
  await c.query(
    `INSERT INTO aduan_timeline (aduan_id, jenis, isi, publik, oleh) VALUES ($1, $2, $3, $4, $5)`,
    [aduanId, jenis, isi, publik, oleh],
  );
}

async function simpanBukti(c: Klien, aduanId: number, foto: ReturnType<typeof parseFoto>, sumber: "pelapor" | "petugas") {
  for (const g of foto) {
    await c.query(
      `INSERT INTO aduan_bukti (aduan_id, sumber, mime, ukuran, sha256, data) VALUES ($1, $2, $3, $4, $5, $6)`,
      [aduanId, sumber, g.mime, g.buffer.length, g.sha256, g.buffer],
    );
  }
}

const hariIniWib = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

// ---------------------------------------------------------------- Publik: kirim aduan
const kirimSchema = z
  .object({
    kategori: z.enum(KATEGORI_ADUAN),
    judul: z.string().trim().min(5, "Judul minimal 5 huruf").max(120),
    uraian: z.string().trim().min(15, "Ceritakan kejadiannya minimal 15 huruf").max(3000),
    lokasi: z.string().trim().max(300).optional().nullable(),
    rtLokasi: z.number().int().min(1).max(4).optional().nullable(),
    tanggalKejadian: z.string().regex(DATE_REGEX).optional().nullable(),
    frekuensi: z.enum(FREKUENSI_ADUAN).default("sekali"),
    dampak: z.enum(DAMPAK_ADUAN).default("mengganggu"),
    teraduJenis: z.enum(JENIS_TERADU).default("tidak_tahu"),
    teraduNama: z.string().trim().max(150).optional().nullable(),
    teraduAlamat: z.string().trim().max(300).optional().nullable(),
    nomorUsaha: z.string().trim().max(40).optional().nullable(),
    mode: z.enum(MODE_IDENTITAS),
    pelaporNama: z.string().trim().max(120).optional().nullable(),
    pelaporWa: z.string().trim().max(30).optional().nullable(),
    pelaporRt: z.number().int().min(1).max(4).optional().nullable(),
    foto: fotoSchema(),
    setuju: z.literal(true, { errorMap: () => ({ message: "Centang pernyataan bahwa aduan ini benar" }) }),
    /** Honeypot: diisi bot, dibiarkan kosong oleh manusia. */
    website: z.string().max(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "anonim") return;
    if (!v.pelaporNama || v.pelaporNama.length < 2) ctx.addIssue({ code: "custom", path: ["pelaporNama"], message: "Isi nama Anda (dirahasiakan)" });
    if (!v.pelaporWa || !isNomorHpValid(v.pelaporWa)) ctx.addIssue({ code: "custom", path: ["pelaporWa"], message: "Isi nomor WhatsApp yang valid" });
  });

export async function kirimAduan(raw: unknown) {
  const v = kirimSchema.parse(raw);
  const anonim = v.mode === "anonim";
  const wa = anonim ? null : normalizeNomorHp(v.pelaporWa ?? "") ?? null;
  const waHash = sidikWa(wa);
  if (waHash) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM aduan WHERE pelapor_wa_hash = $1 AND created_at > now() - interval '1 day'`,
      [waHash],
    );
    if (rows[0].n >= MAKS_ADUAN_PER_WA_HARI) {
      throw new WilayahError(429, `Maksimal ${MAKS_ADUAN_PER_WA_HARI} aduan per nomor WhatsApp per hari`);
    }
  }
  const foto = parseFoto(v.foto);

  const usaha = v.nomorUsaha ? await cariUsahaByNomor(v.nomorUsaha) : null;
  const teraduJenis = usaha ? "usaha" : v.teraduJenis;
  const teraduNama = usaha?.namaUsaha ?? (v.teraduNama || null);
  const teraduAlamat = usaha ? usaha.alamatUsaha || usaha.alamat : v.teraduAlamat || null;
  const prioritas = hitungPrioritas(v.kategori, v.frekuensi, v.dampak);
  const kodeLacak = await kodeLacakUnik();
  const pin = buatPin();

  const id = await denganTransaksi(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO aduan (kode_lacak, pin_hash, mode_identitas, pelapor_nama_enc, pelapor_wa_enc, pelapor_wa_hash, pelapor_rt,
                          kategori, judul, uraian, lokasi, rt_lokasi, tanggal_kejadian, frekuensi, dampak, prioritas,
                          teradu_jenis, teradu_nama, teradu_alamat, teradu_kunci, usaha_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING id, created_at`,
      [
        kodeLacak, hashPin(pin), v.mode,
        anonim ? null : enkripsi(v.pelaporNama), anonim ? null : enkripsi(wa), waHash, anonim ? null : v.pelaporRt ?? null,
        v.kategori, v.judul, v.uraian, v.lokasi || null, v.rtLokasi ?? null, v.tanggalKejadian || null, v.frekuensi, v.dampak, prioritas,
        teraduJenis, teraduNama, teraduAlamat, kunciTeradu(teraduJenis, usaha?.id ?? null, teraduNama), usaha?.id ?? null,
      ],
    );
    const baru = rows[0] as { id: number; created_at: Date };
    await c.query(`UPDATE aduan SET nomor = $2 WHERE id = $1`, [baru.id, nomorAduan(baru.id, new Date(baru.created_at).getFullYear())]);
    await simpanBukti(c, baru.id, foto, "pelapor");
    await catatTimeline(c, baru.id, "masuk", "Aduan diterima sistem dan menunggu diperiksa pengurus RW 03.", true, null);
    return baru.id;
  });
  const { rows } = await pool.query(`SELECT nomor FROM aduan WHERE id = $1`, [id]);
  return { nomor: rows[0].nomor as string, kodeLacak, pin, prioritas };
}

async function kodeLacakUnik(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const k = buatKodeLacak();
    const { rows } = await pool.query(`SELECT 1 FROM aduan WHERE kode_lacak = $1`, [k]);
    if (!rows[0]) return k;
  }
  throw new Error("Gagal membuat kode lacak, coba lagi");
}

// ---------------------------------------------------------------- Publik: lacak
const lacakSchema = z.object({ kode: z.string().min(6).max(20), pin: z.string().regex(/^\d{6}$/, "PIN 6 angka") });

async function aduanDariKode(raw: unknown) {
  const { kode, pin } = lacakSchema.parse(raw);
  const { rows } = await pool.query(`SELECT * FROM aduan WHERE kode_lacak = $1`, [normalKodeLacak(kode)]);
  const a = rows[0];
  if (!a || !cocokPin(pin, a.pin_hash)) throw new WilayahError(404, "Kode lacak atau PIN tidak cocok");
  return a;
}

export async function lacakAduan(raw: unknown) {
  const a = await aduanDariKode(raw);
  const [timeline, teguran] = await Promise.all([
    pool.query(`SELECT jenis, isi, created_at FROM aduan_timeline WHERE aduan_id = $1 AND publik ORDER BY created_at, id`, [a.id]),
    pool.query(`SELECT count(*)::int AS n FROM aduan_teguran WHERE aduan_id = $1 AND status <> 'dicabut'`, [a.id]),
  ]);
  const status = a.status as StatusAduan;
  return {
    nomor: a.nomor,
    kategori: a.kategori,
    judul: a.judul,
    status,
    statusLabel: STATUS_ADUAN_INFO[status]?.label ?? status,
    statusPublik: STATUS_ADUAN_INFO[status]?.publik ?? "",
    tutup: STATUS_ADUAN_INFO[status]?.tutup ?? false,
    mode: a.mode_identitas,
    pesanPublik: a.pesan_publik,
    jumlahTeguran: teguran.rows[0].n,
    dibuat: a.created_at,
    timeline: timeline.rows.map((t) => ({ jenis: t.jenis, isi: t.isi, waktu: t.created_at })),
  };
}

const tambahSchema = z.object({
  isi: z.string().trim().min(5, "Tulis keterangan minimal 5 huruf").max(2000),
  foto: fotoSchema(),
});

export async function tambahKeteranganPelapor(raw: unknown) {
  const a = await aduanDariKode(raw);
  if (STATUS_ADUAN_INFO[a.status as StatusAduan]?.tutup) throw new WilayahError(409, "Aduan ini sudah ditutup");
  const v = tambahSchema.parse(raw);
  const foto = parseFoto(v.foto);
  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM aduan_bukti WHERE aduan_id = $1`, [a.id]);
  if (rows[0].n + foto.length > MAKS_FOTO_ADUAN * 2) throw new WilayahError(400, "Jumlah foto bukti sudah maksimal");
  await denganTransaksi(async (c) => {
    await simpanBukti(c, a.id, foto, "pelapor");
    await catatTimeline(c, a.id, "tambahan_pelapor", `Pelapor menambahkan keterangan: ${v.isi}${foto.length ? ` (+${foto.length} foto)` : ""}`, true, "Pelapor");
    await c.query(`UPDATE aduan SET updated_at = now(), dibaca_at = NULL WHERE id = $1`, [a.id]);
  });
  return { ok: true };
}

export async function opsiPublik() {
  return { usaha: await daftarUsahaPublik() };
}

// ---------------------------------------------------------------- Admin: daftar & ringkasan
const URUT_PRIORITAS = `CASE a.prioritas WHEN 'darurat' THEN 0 WHEN 'tinggi' THEN 1 WHEN 'sedang' THEN 2 ELSE 3 END`;
const STATUS_TUTUP = STATUS_ADUAN.filter((s) => STATUS_ADUAN_INFO[s].tutup);

export async function daftarAduan(q: { status?: string; kategori?: string; rt?: string; cari?: string }) {
  const syarat: string[] = [];
  const param: unknown[] = [];
  const tambah = (sql: string, v: unknown) => {
    param.push(v);
    syarat.push(sql.replace("?", `$${param.length}`));
  };
  const status = q.status || "aktif";
  if (status === "aktif") tambah(`NOT (a.status = ANY(?))`, STATUS_TUTUP);
  else if (status === "darurat") {
    tambah(`NOT (a.status = ANY(?))`, STATUS_TUTUP);
    syarat.push(`a.prioritas IN ('darurat', 'tinggi')`);
  } else if (status !== "semua") tambah(`a.status = ?`, status);
  if (q.kategori && (KATEGORI_ADUAN as readonly string[]).includes(q.kategori)) tambah(`a.kategori = ?`, q.kategori);
  if (q.rt && Number(q.rt)) tambah(`a.rt_lokasi = ?`, Number(q.rt));
  if (q.cari?.trim()) {
    param.push(`%${q.cari.trim()}%`);
    const p = `$${param.length}`;
    syarat.push(`(a.nomor ILIKE ${p} OR a.judul ILIKE ${p} OR a.uraian ILIKE ${p} OR a.teradu_nama ILIKE ${p} OR a.lokasi ILIKE ${p})`);
  }
  const { rows } = await pool.query(
    `SELECT a.id, a.nomor, a.kategori, a.judul, a.lokasi, a.rt_lokasi, a.prioritas, a.status, a.mode_identitas, a.frekuensi, a.dampak,
            a.teradu_jenis, a.teradu_nama, a.created_at, a.updated_at, a.dibaca_at, a.tanggal_kejadian,
            (SELECT count(*)::int FROM aduan_bukti b WHERE b.aduan_id = a.id) AS jumlah_foto,
            (SELECT count(*)::int FROM aduan_teguran t WHERE t.aduan_id = a.id AND t.status <> 'dicabut') AS jumlah_teguran
       FROM aduan a
      ${syarat.length ? `WHERE ${syarat.join(" AND ")}` : ""}
      ORDER BY ${status === "semua" || STATUS_TUTUP.includes(status as StatusAduan) ? "a.created_at DESC" : `${URUT_PRIORITAS}, a.created_at DESC`}
      LIMIT 300`,
    param,
  );
  return rows.map((r) => ({
    id: r.id, nomor: r.nomor, kategori: r.kategori, judul: r.judul, lokasi: r.lokasi, rtLokasi: r.rt_lokasi, prioritas: r.prioritas,
    status: r.status, mode: r.mode_identitas, frekuensi: r.frekuensi, dampak: r.dampak, teraduJenis: r.teradu_jenis, teraduNama: r.teradu_nama,
    dibuat: r.created_at, diperbarui: r.updated_at, belumDibaca: !r.dibaca_at, tanggalKejadian: r.tanggal_kejadian,
    jumlahFoto: r.jumlah_foto, jumlahTeguran: r.jumlah_teguran,
  }));
}

export async function ringkasanAduan() {
  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE status = 'masuk')::int AS baru,
       count(*) FILTER (WHERE dibaca_at IS NULL AND NOT (status = ANY($1)))::int AS belum_dibaca,
       count(*) FILTER (WHERE prioritas IN ('darurat') AND NOT (status = ANY($1)))::int AS darurat,
       count(*) FILTER (WHERE status IN ('masuk', 'diproses', 'klarifikasi'))::int AS menunggu,
       count(*) FILTER (WHERE NOT (status = ANY($1)))::int AS aktif,
       count(*) FILTER (WHERE status = 'selesai' AND selesai_at >= date_trunc('month', now()))::int AS selesai_bulan_ini,
       count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS masuk_bulan_ini
     FROM aduan`,
    [STATUS_TUTUP],
  );
  const { rows: t } = await pool.query(
    `SELECT count(*) FILTER (WHERE status = 'aktif')::int AS aktif,
            count(*) FILTER (WHERE status = 'aktif' AND tenggat IS NOT NULL AND tenggat < $1)::int AS lewat
       FROM aduan_teguran`,
    [hariIniWib()],
  );
  const { rows: kat } = await pool.query(
    `SELECT kategori, count(*)::int AS n FROM aduan WHERE created_at > now() - interval '90 days' GROUP BY kategori ORDER BY n DESC`,
  );
  const r = rows[0];
  return {
    baru: r.baru, belumDibaca: r.belum_dibaca, darurat: r.darurat, menunggu: r.menunggu, aktif: r.aktif,
    selesaiBulanIni: r.selesai_bulan_ini, masukBulanIni: r.masuk_bulan_ini,
    teguranAktif: t[0].aktif, tenggatLewat: t[0].lewat,
    perKategori: kat.map((k) => ({ kategori: k.kategori, n: k.n })),
  };
}

// ---------------------------------------------------------------- Admin: detail
async function ambilAduan(id: number) {
  const { rows } = await pool.query(`SELECT * FROM aduan WHERE id = $1`, [id]);
  if (!rows[0]) throw new WilayahError(404, "Aduan tidak ditemukan");
  return rows[0];
}

function identitasUntukAdmin(a: any) {
  if (a.mode_identitas === "anonim") return { mode: "anonim", tersedia: false, nama: null, wa: null, rt: null };
  const nama = dekripsi(a.pelapor_nama_enc);
  const wa = dekripsi(a.pelapor_wa_enc);
  if (a.mode_identitas === "terbuka") return { mode: "terbuka", tersedia: true, nama, wa, rt: a.pelapor_rt };
  return { mode: "rahasia", tersedia: true, nama: samarNama(nama), wa: samarWa(wa), rt: null, tersamar: true };
}

export async function riwayatTeguran(kunci: string | null) {
  if (!kunci) return [];
  const { rows } = await pool.query(
    `SELECT id, aduan_id, tingkat, pelanggaran, tenggat, status, nomor_surat, surat_id, created_at
       FROM aduan_teguran WHERE teradu_kunci = $1 ORDER BY created_at DESC`,
    [kunci],
  );
  return rows.map((r) => ({
    id: r.id, aduanId: r.aduan_id, tingkat: r.tingkat, pelanggaran: r.pelanggaran, tenggat: r.tenggat, status: r.status,
    nomorSurat: r.nomor_surat, suratId: r.surat_id, dibuat: r.created_at,
  }));
}

/** Saran tingkat dari teguran (belum dicabut) dalam masa hitung. */
export function saranDariRiwayat(riwayat: { tingkat: string; status: string; dibuat: Date | string }[]) {
  const batas = new Date();
  batas.setMonth(batas.getMonth() - MASA_HITUNG_TEGURAN_BULAN);
  const berlaku = riwayat
    .filter((r) => r.status !== "dicabut" && new Date(r.dibuat) >= batas)
    .map((r) => r.tingkat)
    .filter((t): t is TingkatTeguran => (TINGKAT_TEGURAN as readonly string[]).includes(t));
  return saranTingkatTeguran(berlaku);
}

export async function detailAduan(aktor: Aktor, id: number) {
  const a = await ambilAduan(id);
  if (!a.dibaca_at) {
    await pool.query(`UPDATE aduan SET dibaca_at = now(), ditangani_oleh = COALESCE(ditangani_oleh, $2) WHERE id = $1`, [id, aktor.label]);
  }
  const [bukti, timeline, teguran, akses, aduanLain, riwayat] = await Promise.all([
    pool.query(`SELECT id, sumber, mime, ukuran, created_at FROM aduan_bukti WHERE aduan_id = $1 ORDER BY id`, [id]),
    pool.query(`SELECT id, jenis, isi, publik, oleh, created_at FROM aduan_timeline WHERE aduan_id = $1 ORDER BY created_at, id`, [id]),
    pool.query(`SELECT * FROM aduan_teguran WHERE aduan_id = $1 ORDER BY created_at`, [id]),
    pool.query(`SELECT oleh, alasan, created_at FROM aduan_akses WHERE aduan_id = $1 ORDER BY created_at DESC`, [id]),
    a.teradu_kunci
      ? pool.query(`SELECT id, nomor, judul, status, created_at FROM aduan WHERE teradu_kunci = $1 AND id <> $2 ORDER BY created_at DESC LIMIT 20`, [a.teradu_kunci, id])
      : Promise.resolve({ rows: [] as any[] }),
    riwayatTeguran(a.teradu_kunci),
  ]);
  return {
    id: a.id, nomor: a.nomor, kategori: a.kategori, judul: a.judul, uraian: a.uraian, lokasi: a.lokasi, rtLokasi: a.rt_lokasi,
    tanggalKejadian: a.tanggal_kejadian, frekuensi: a.frekuensi, dampak: a.dampak, prioritas: a.prioritas, status: a.status,
    teradu: {
      jenis: a.teradu_jenis, refId: a.teradu_ref_id, nama: a.teradu_nama, alamat: a.teradu_alamat, kunci: a.teradu_kunci, usahaId: a.usaha_id,
    },
    pelapor: identitasUntukAdmin(a),
    pesanPublik: a.pesan_publik, catatanInternal: a.catatan_internal, ditanganiOleh: a.ditangani_oleh,
    duplikatDari: a.duplikat_dari, rw3bizPelanggaranId: a.rw3biz_pelanggaran_id,
    dibuat: a.created_at, diperbarui: a.updated_at, selesai: a.selesai_at,
    bukti: bukti.rows.map((b) => ({ id: b.id, sumber: b.sumber, ukuran: b.ukuran, dibuat: b.created_at })),
    timeline: timeline.rows.map((t) => ({ id: t.id, jenis: t.jenis, isi: t.isi, publik: t.publik, oleh: t.oleh, waktu: t.created_at })),
    teguran: teguran.rows.map(petakanTeguran),
    aksesIdentitas: akses.rows.map((x) => ({ oleh: x.oleh, alasan: x.alasan, waktu: x.created_at })),
    aduanLainTeradu: aduanLain.rows.map((x) => ({ id: x.id, nomor: x.nomor, judul: x.judul, status: x.status, dibuat: x.created_at })),
    riwayatTeguran: riwayat,
    saranTingkat: saranDariRiwayat(riwayat),
  };
}

export function petakanTeguran(r: any) {
  return {
    id: r.id, aduanId: r.aduan_id, teraduKunci: r.teradu_kunci, teraduJenis: r.teradu_jenis, teraduNama: r.teradu_nama,
    teraduAlamat: r.teradu_alamat, tingkat: r.tingkat, pelanggaran: r.pelanggaran, kewajiban: r.kewajiban, tenggat: r.tenggat,
    suratId: r.surat_id, nomorSurat: r.nomor_surat, status: r.status, caraSerah: r.cara_serah, diserahkanAt: r.diserahkan_at,
    catatan: r.catatan, oleh: r.oleh, dibuat: r.created_at, diperbarui: r.updated_at,
  };
}

export async function fotoBukti(id: number) {
  const { rows } = await pool.query(`SELECT mime, data FROM aduan_bukti WHERE id = $1`, [id]);
  if (!rows[0]) throw new WilayahError(404, "Foto tidak ditemukan");
  return { buffer: rows[0].data as Buffer, mime: rows[0].mime as string, nama: `bukti-${id}` };
}

// ---------------------------------------------------------------- Admin: identitas pelapor
export async function bukaIdentitas(aktor: Aktor, id: number, alasan: string) {
  const a = await ambilAduan(id);
  if (a.mode_identitas === "anonim") throw new WilayahError(400, "Aduan anonim tidak menyimpan identitas pelapor");
  const teks = alasan?.trim() ?? "";
  if (teks.length < 5) throw new WilayahError(400, "Tulis alasan membuka identitas (minimal 5 huruf)");
  await denganTransaksi(async (c) => {
    await c.query(`INSERT INTO aduan_akses (aduan_id, oleh, alasan) VALUES ($1, $2, $3)`, [id, aktor.label, teks]);
    await catatTimeline(c, id, "akses_identitas", `Identitas pelapor dibuka oleh ${aktor.label}. Alasan: ${teks}`, false, aktor.label);
  });
  return { nama: dekripsi(a.pelapor_nama_enc), wa: dekripsi(a.pelapor_wa_enc), rt: a.pelapor_rt };
}

// ---------------------------------------------------------------- Admin: ubah aduan
const ubahSchema = z.object({
  status: z.enum(STATUS_ADUAN).optional(),
  prioritas: z.enum(PRIORITAS_ADUAN).optional(),
  kategori: z.enum(KATEGORI_ADUAN).optional(),
  pesanPublik: z.string().trim().max(1000).optional().nullable(),
  catatanInternal: z.string().trim().max(3000).optional().nullable(),
});

export async function ubahAduan(aktor: Aktor, id: number, raw: unknown) {
  const v = ubahSchema.parse(raw);
  const a = await ambilAduan(id);
  if (v.status === "tidak_terbukti" && !v.pesanPublik?.trim()) {
    throw new WilayahError(400, "Tulis penjelasan singkat untuk pelapor mengapa aduan belum dapat dibuktikan");
  }
  await denganTransaksi(async (c) => {
    const set: string[] = ["updated_at = now()"];
    const param: unknown[] = [id];
    const kol = (k: string, nilai: unknown) => {
      param.push(nilai);
      set.push(`${k} = $${param.length}`);
    };
    if (v.prioritas && v.prioritas !== a.prioritas) {
      kol("prioritas", v.prioritas);
      await catatTimeline(c, id, "prioritas", `Prioritas diubah menjadi ${v.prioritas}`, false, aktor.label);
    }
    if (v.kategori && v.kategori !== a.kategori) {
      kol("kategori", v.kategori);
      await catatTimeline(c, id, "kategori", `Kategori diubah menjadi ${KATEGORI_ADUAN_INFO[v.kategori].label}`, false, aktor.label);
    }
    if (v.catatanInternal !== undefined) kol("catatan_internal", v.catatanInternal || null);
    if (v.pesanPublik !== undefined && (v.pesanPublik || null) !== a.pesan_publik) {
      kol("pesan_publik", v.pesanPublik || null);
      if (v.pesanPublik) await catatTimeline(c, id, "pesan", `Pesan dari pengurus RW: ${v.pesanPublik}`, true, aktor.label);
    }
    if (v.status && v.status !== a.status) {
      kol("status", v.status);
      kol("ditangani_oleh", aktor.label);
      if (STATUS_ADUAN_INFO[v.status].tutup) set.push("selesai_at = now()");
      else set.push("selesai_at = NULL");
      await catatTimeline(c, id, "status", STATUS_ADUAN_INFO[v.status].publik, true, aktor.label);
    }
    await c.query(`UPDATE aduan SET ${set.join(", ")} WHERE id = $1`, param);
  });
  return detailAduan(aktor, id);
}

const teraduSchema = z.object({
  jenis: z.enum(JENIS_TERADU),
  refId: z.number().int().positive().optional().nullable(),
  usahaId: z.number().int().positive().optional().nullable(),
  nama: z.string().trim().max(150).optional().nullable(),
  alamat: z.string().trim().max(300).optional().nullable(),
});

export async function aturTeradu(aktor: Aktor, id: number, raw: unknown) {
  const v = teraduSchema.parse(raw);
  await ambilAduan(id);
  const refId = v.jenis === "usaha" ? v.usahaId ?? v.refId ?? null : v.refId ?? null;
  const kunci = kunciTeradu(v.jenis, refId, v.nama);
  await denganTransaksi(async (c) => {
    await c.query(
      `UPDATE aduan SET teradu_jenis = $2, teradu_ref_id = $3, teradu_nama = $4, teradu_alamat = $5, teradu_kunci = $6,
              usaha_id = $7, updated_at = now() WHERE id = $1`,
      [id, v.jenis, v.jenis === "usaha" ? null : refId, v.nama || null, v.alamat || null, kunci, v.jenis === "usaha" ? refId : null],
    );
    await catatTimeline(c, id, "teradu", `Pihak teradu ditetapkan: ${v.nama || "-"}`, false, aktor.label);
  });
  return detailAduan(aktor, id);
}

const catatanSchema = z.object({
  isi: z.string().trim().min(3).max(3000),
  publik: z.boolean().default(false),
  foto: fotoSchema(),
});

export async function tambahCatatan(aktor: Aktor, id: number, raw: unknown) {
  const v = catatanSchema.parse(raw);
  await ambilAduan(id);
  const foto = parseFoto(v.foto);
  await denganTransaksi(async (c) => {
    await simpanBukti(c, id, foto, "petugas");
    await catatTimeline(c, id, v.publik ? "pesan" : "catatan", v.publik ? `Pesan dari pengurus RW: ${v.isi}` : v.isi, v.publik, aktor.label);
    await c.query(`UPDATE aduan SET updated_at = now() WHERE id = $1`, [id]);
  });
  return detailAduan(aktor, id);
}

export async function gabungkanAduan(aktor: Aktor, id: number, keNomor: string) {
  const a = await ambilAduan(id);
  const { rows } = await pool.query(`SELECT id, nomor FROM aduan WHERE nomor = $1`, [keNomor.trim().toUpperCase()]);
  const induk = rows[0];
  if (!induk) throw new WilayahError(404, "Nomor aduan induk tidak ditemukan");
  if (induk.id === a.id) throw new WilayahError(400, "Tidak bisa menggabungkan aduan dengan dirinya sendiri");
  await denganTransaksi(async (c) => {
    await c.query(`UPDATE aduan SET status = 'digabung', duplikat_dari = $2, selesai_at = now(), updated_at = now() WHERE id = $1`, [id, induk.id]);
    await catatTimeline(c, id, "status", `${STATUS_ADUAN_INFO.digabung.publik} (${induk.nomor}). Penanganan dilanjutkan pada aduan tersebut.`, true, aktor.label);
    await catatTimeline(c, induk.id, "gabung", `Aduan ${a.nomor} tentang hal yang sama digabungkan ke aduan ini.`, false, aktor.label);
  });
  return detailAduan(aktor, id);
}

// ---------------------------------------------------------------- Admin: cari teradu
export async function cariTeradu(q: string) {
  const kata = q.trim();
  if (kata.length < 3) return [];
  const h = await cekWarga(kata);
  const out: { jenis: string; refId: number; nama: string; alamat: string | null; rt: number | null; keterangan: string }[] = [];
  for (const kk of h.warga) {
    for (const ang of kk.anggota) {
      if (!ang.cocok && h.mode === "nama") continue;
      out.push({ jenis: "warga", refId: ang.id, nama: ang.nama, alamat: kk.alamat, rt: kk.rt, keterangan: `${ang.kedudukan} · KK ${kk.nomorKk.slice(-4)}` });
    }
  }
  for (const v of h.visit) {
    for (const p of v.penghuni) {
      if (p.isAnak || !v.wargaSinggahId) continue;
      out.push({ jenis: "warga_singgah", refId: v.wargaSinggahId, nama: p.nama, alamat: [v.alamat, v.nomorUnit].filter(Boolean).join(", ") || null, rt: v.rt, keterangan: `${v.jenisWarga ?? "Visit RW3"} · ${v.nomorVisitrw3 ?? ""}` });
    }
  }
  for (const b of h.biz) {
    if (!b.usahaId) continue;
    out.push({ jenis: "usaha", refId: b.usahaId, nama: b.namaUsaha, alamat: b.alamat, rt: b.rt, keterangan: `${b.nomorInduk ?? b.nomorBiz} · ${b.statusUsaha ?? b.statusPengajuan}` });
  }
  const unik = new Map(out.map((o) => [`${o.jenis}:${o.refId}`, o]));
  return [...unik.values()].slice(0, 30);
}

// ---------------------------------------------------------------- Admin: rapor teradu
export async function raporTeradu(kunci: string) {
  const { rows: ad } = await pool.query(
    `SELECT id, nomor, kategori, judul, status, prioritas, teradu_nama, teradu_jenis, teradu_alamat, created_at
       FROM aduan WHERE teradu_kunci = $1 ORDER BY created_at DESC`,
    [kunci],
  );
  const riwayat = await riwayatTeguran(kunci);
  const { rows: tg } = await pool.query(`SELECT * FROM aduan_teguran WHERE teradu_kunci = $1 ORDER BY created_at DESC`, [kunci]);
  const nama = ad[0]?.teradu_nama ?? tg[0]?.teradu_nama ?? null;
  if (!nama) throw new WilayahError(404, "Riwayat pihak ini tidak ditemukan");
  return {
    kunci,
    nama,
    jenis: ad[0]?.teradu_jenis ?? tg[0]?.teradu_jenis,
    alamat: ad[0]?.teradu_alamat ?? tg[0]?.teradu_alamat ?? null,
    aduan: ad.map((r) => ({ id: r.id, nomor: r.nomor, kategori: r.kategori, judul: r.judul, status: r.status, prioritas: r.prioritas, dibuat: r.created_at })),
    teguran: tg.map(petakanTeguran),
    saranTingkat: saranDariRiwayat(riwayat),
  };
}

export { ambilAduan, catatTimeline };
