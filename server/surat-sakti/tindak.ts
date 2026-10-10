/**
 * Rangkaian dokumen, surat masuk/balasan, distribusi, tindak lanjut, bantuan bertahap, fakta RT, ringkasan.
 * Tidak ada pengiriman otomatis: distribusi hanya dicatat dari tindakan nyata pengguna.
 */
import { z } from "zod";
import { pool } from "../db";
import { catatAudit, WilayahError, type Aktor } from "../wilayah-auth";
import { denganTransaksi } from "../wilayah-data";
import { isoHariIni, statusDistribusi, statusPekerjaan, terlambat } from "@shared/surat-sakti";
import { hanyaRw, kondisiBacaRt, pastikanBoleh } from "./akses";

const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const berkas = z.string().regex(/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/, "Berkas harus foto (PNG/JPG/WEBP) atau PDF").max(4_000_000);
/** Bukti boleh keterangan teks atau berkas. */
const bukti = z.union([berkas, z.string().trim().min(3).max(1000).refine((s) => !s.startsWith("data:"), "Format berkas tidak didukung")]);

// ================================================================== rangkaian
const rangkaianSchema = z.object({
  judul: z.string().trim().min(3).max(200),
  jenis: z.enum(["kasus", "program", "keputusan", "fasilitas", "kegiatan", "lainnya"]),
  paket: z.string().max(40).nullable().optional(),
  kejadianId: z.number().int().positive().nullable().optional(),
  kegiatanId: z.number().int().positive().nullable().optional(),
  fasilitasId: z.number().int().positive().nullable().optional(),
  programId: z.number().int().positive().nullable().optional(),
  rw3lawId: z.number().int().positive().nullable().optional(),
  rtTerkait: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  catatan: z.string().max(2000).nullable().optional(),
});

export async function buatRangkaian(aktor: Aktor, input: unknown) {
  hanyaRw(aktor);
  const d = rangkaianSchema.parse(input);
  const { rows } = await pool.query(
    `INSERT INTO wil_surat_rangkaian (judul, jenis, paket, kejadian_id, kegiatan_id, fasilitas_id, program_id, rw3law_id, rt_terkait, catatan, dibuat_oleh)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [d.judul, d.jenis, d.paket ?? null, d.kejadianId ?? null, d.kegiatanId ?? null, d.fasilitasId ?? null, d.programId ?? null, d.rw3lawId ?? null, d.rtTerkait, d.catatan ?? null, aktor.label],
  );
  await catatAudit(aktor, "buat_rangkaian", "rangkaian", rows[0].id, null, null, { judul: d.judul, jenis: d.jenis });
  return { id: rows[0].id };
}

export async function daftarRangkaian(aktor: Aktor, status = "aktif") {
  const rt = aktor.role === "rt" ? aktor.rt : null;
  const { rows } = await pool.query(
    `SELECT r.id, r.judul, r.jenis, r.paket, r.status, r.rt_terkait, r.kejadian_id, r.kegiatan_id, r.fasilitas_id, r.program_id, r.rw3law_id,
            r.created_at, r.ditutup_at,
            (SELECT COUNT(*)::int FROM surat_rw s WHERE s.rangkaian_id = r.id AND s.status <> 'draft') AS jumlah_terbit,
            (SELECT COUNT(*)::int FROM surat_rw s WHERE s.rangkaian_id = r.id AND s.status = 'draft') AS jumlah_draft,
            (SELECT COUNT(*)::int FROM wil_surat_tindak t JOIN surat_rw s ON s.id = t.surat_id
              WHERE s.rangkaian_id = r.id AND t.status IN ('menunggu', 'berjalan')) AS tindak_terbuka,
            (SELECT MAX(COALESCE(s.diterbitkan_at, s.updated_at)) FROM surat_rw s WHERE s.rangkaian_id = r.id) AS aktivitas_terakhir
       FROM wil_surat_rangkaian r
      WHERE ($1::text = 'semua' OR r.status = $1) AND ($2::int IS NULL OR $2 = ANY(r.rt_terkait))
      ORDER BY (r.status = 'aktif') DESC, r.created_at DESC LIMIT 200`,
    [status, rt],
  );
  return rows;
}

export async function detailRangkaian(aktor: Aktor, id: number) {
  const { rows } = await pool.query(`SELECT * FROM wil_surat_rangkaian WHERE id = $1`, [id]);
  const r = rows[0];
  if (!r || (aktor.role === "rt" && !(r.rt_terkait ?? []).includes(aktor.rt))) throw new WilayahError(404, "Rangkaian tidak ditemukan");
  const rt = aktor.role === "rt" ? aktor.rt : null;
  const [surat, masuk, bantuan, fakta] = await Promise.all([
    pool.query(
      `SELECT s.id, s.nomor_surat, s.kode_jenis, s.jenis_surat, s.perihal, s.status, s.tanggal_surat, s.induk_id, s.mengganti_id, s.diterbitkan_at, s.created_at,
              (SELECT COALESCE(json_agg(json_build_object('status', k.status)), '[]') FROM wil_surat_kirim k WHERE k.surat_id = s.id) AS kirim_status,
              (SELECT COALESCE(json_agg(json_build_object('id', t.id, 'tindakan', COALESCE(t.tindakan, t.catatan), 'status', t.status, 'progres', t.progres,
                       'pic', t.pic_nama, 'tenggat', to_char(t.tenggat, 'YYYY-MM-DD')) ORDER BY t.id), '[]') FROM wil_surat_tindak t WHERE t.surat_id = s.id) AS tindak
         FROM surat_rw s
        WHERE s.rangkaian_id = $1 AND ($2::int IS NULL OR ${kondisiBacaRt("$2::int")})
        ORDER BY COALESCE(s.diterbitkan_at, s.created_at)`,
      [id, rt],
    ),
    rt ? { rows: [] } : pool.query(`SELECT id, membalas_id, pengirim, nomor, to_char(tanggal, 'YYYY-MM-DD') AS tanggal, perihal, ringkasan, berkas_nama, created_at FROM wil_surat_masuk WHERE rangkaian_id = $1 ORDER BY tanggal`, [id]),
    rt ? { rows: [] } : pool.query(`SELECT id, surat_id, tahap, uraian, jumlah, satuan, nominal, pemberi, to_char(tanggal, 'YYYY-MM-DD') AS tanggal FROM wil_surat_bantuan WHERE rangkaian_id = $1 OR surat_id IN (SELECT id FROM surat_rw WHERE rangkaian_id = $1) ORDER BY tanggal, id`, [id]),
    pool.query(`SELECT id, rt, isi, sumber, (bukti IS NOT NULL) AS ada_bukti, bukti_nama, oleh, created_at FROM wil_surat_fakta WHERE rangkaian_id = $1 AND ($2::int IS NULL OR rt = $2) ORDER BY id`, [id, rt]),
  ]);
  const hariIni = isoHariIni();
  const dokumen = surat.rows.map((s) => ({
    ...s,
    statusDistribusi: statusDistribusi(s.kirim_status),
    statusPekerjaan: statusPekerjaan(s.tindak),
    terlambat: s.tindak.filter((t: any) => terlambat(t, hariIni)).length,
  }));
  // Ringkasan bantuan per tahap — tahap dipisah, tidak dijumlah menjadi satu "pemasukan".
  const bantuanPerTahap: Record<string, number> = { dimohonkan: 0, dijanjikan: 0, diterima: 0, digunakan: 0 };
  for (const b of bantuan.rows) bantuanPerTahap[b.tahap] += Number(b.nominal ?? 0);
  return { ...r, dokumen, masuk: masuk.rows, bantuan: bantuan.rows, bantuanPerTahap, fakta: fakta.rows };
}

export async function tutupRangkaian(aktor: Aktor, id: number, evaluasi: string) {
  hanyaRw(aktor);
  if (!evaluasi?.trim() || evaluasi.trim().length < 5) throw new WilayahError(400, "Tulis evaluasi singkat sebelum menutup rangkaian");
  const { rows: terbuka } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM wil_surat_tindak t JOIN surat_rw s ON s.id = t.surat_id WHERE s.rangkaian_id = $1 AND t.status IN ('menunggu', 'berjalan')`, [id]);
  if (terbuka[0].n) throw new WilayahError(409, `Masih ada ${terbuka[0].n} tindak lanjut terbuka. Selesaikan atau tandai tidak diperlukan dahulu.`);
  const { rowCount } = await pool.query(`UPDATE wil_surat_rangkaian SET status = 'ditutup', evaluasi = $2, ditutup_at = now() WHERE id = $1 AND status = 'aktif'`, [id, evaluasi.trim()]);
  if (!rowCount) throw new WilayahError(409, "Rangkaian sudah ditutup");
  await catatAudit(aktor, "tutup_rangkaian", "rangkaian", id, null, null, { evaluasi });
  return { ok: true };
}

export async function hubungkanRangkaian(aktor: Aktor, suratId: number, rangkaianId: number | null) {
  hanyaRw(aktor);
  await pool.query(`UPDATE surat_rw SET rangkaian_id = $2 WHERE id = $1`, [suratId, rangkaianId]);
  return { ok: true };
}

// ================================================================== surat masuk / balasan
const masukSchema = z.object({
  rangkaianId: z.number().int().positive().nullable().optional(),
  membalasId: z.number().int().positive().nullable().optional(),
  pengirim: z.string().trim().min(2).max(200),
  nomor: z.string().trim().max(200).nullable().optional(),
  tanggal,
  perihal: z.string().trim().min(3).max(300),
  ringkasan: z.string().trim().max(3000).nullable().optional(),
  berkas: berkas.nullable().optional(),
  berkasNama: z.string().max(200).nullable().optional(),
});

export async function catatSuratMasuk(aktor: Aktor, input: unknown) {
  hanyaRw(aktor);
  const d = masukSchema.parse(input);
  let rangkaianId = d.rangkaianId ?? null;
  if (d.membalasId) {
    const { rows } = await pool.query(`SELECT rangkaian_id, status FROM surat_rw WHERE id = $1`, [d.membalasId]);
    if (!rows[0] || rows[0].status === "draft") throw new WilayahError(400, "Surat yang dibalas tidak ditemukan atau masih draft");
    rangkaianId = rangkaianId ?? rows[0].rangkaian_id;
  }
  const { rows } = await pool.query(
    `INSERT INTO wil_surat_masuk (rangkaian_id, membalas_id, pengirim, nomor, tanggal, perihal, ringkasan, berkas, berkas_nama, dicatat_oleh)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [rangkaianId, d.membalasId ?? null, d.pengirim, d.nomor ?? null, d.tanggal, d.perihal, d.ringkasan ?? null, d.berkas ?? null, d.berkasNama ?? null, aktor.label],
  );
  await catatAudit(aktor, "catat_surat_masuk", "surat_masuk", rows[0].id, null, null, { membalas: d.membalasId, pengirim: d.pengirim });
  return { id: rows[0].id };
}

// ================================================================== distribusi
const kirimSchema = z.object({
  kanal: z.enum(["Diantar langsung", "WhatsApp", "Email", "Pos", "Lainnya"]),
  penerima: z.string().trim().min(2).max(200),
  status: z.enum(["diserahkan", "gagal", "diterima"]).default("diserahkan"),
  bukti: bukti.nullable().optional(),
  catatan: z.string().trim().max(1000).nullable().optional(),
  dikirimPada: z.string().min(10),
});

export async function catatKirim(aktor: Aktor, id: number, input: unknown) {
  hanyaRw(aktor);
  const d = kirimSchema.parse(input);
  const waktu = new Date(d.dikirimPada);
  if (Number.isNaN(waktu.getTime()) || waktu > new Date(Date.now() + 5 * 60_000)) throw new WilayahError(400, "Waktu pengiriman tidak valid");
  if (d.status !== "gagal" && !d.bukti) throw new WilayahError(400, "Penyerahan hanya tercatat bila ada bukti (tanda terima, foto, tangkapan layar, atau keterangan penerima)");
  if (d.status === "gagal" && !d.catatan) throw new WilayahError(400, "Tulis penyebab gagal kirim");
  const { rows: s } = await pool.query(`SELECT status, tujuan, akses FROM surat_rw WHERE id = $1`, [id]);
  if (s[0]?.status !== "terbit") throw new WilayahError(409, "Hanya dokumen terbit (tidak dibatalkan) yang dapat didistribusikan");
  const { rows } = await pool.query(
    `INSERT INTO wil_surat_kirim (surat_id, kanal, penerima, status, bukti, catatan, dikirim_pada, diterima_pada, dicatat_oleh)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [id, d.kanal, d.penerima, d.status, d.bukti ?? null, d.catatan ?? null, waktu, d.status === "diterima" ? waktu : null, aktor.label],
  );
  await catatAudit(aktor, "kirim_surat", "surat", id, null, null, { kanal: d.kanal, penerima: d.penerima, status: d.status });
  return { id: rows[0].id };
}

export async function konfirmasiTerima(aktor: Aktor, kirimId: number, input: unknown) {
  hanyaRw(aktor);
  const d = z.object({ diterimaPada: z.string().min(10), bukti }).parse(input);
  const waktu = new Date(d.diterimaPada);
  if (Number.isNaN(waktu.getTime()) || waktu > new Date(Date.now() + 5 * 60_000)) throw new WilayahError(400, "Waktu penerimaan tidak valid");
  const { rows } = await pool.query(
    `UPDATE wil_surat_kirim SET status = 'diterima', diterima_pada = $2, catatan = TRIM(COALESCE(catatan, '') || ' Konfirmasi: ' || CASE WHEN $3 LIKE 'data:%' THEN 'berkas terlampir' ELSE $3 END)
      WHERE id = $1 AND status = 'diserahkan' RETURNING surat_id`,
    [kirimId, waktu, d.bukti],
  );
  if (!rows[0]) throw new WilayahError(409, "Hanya penyerahan yang sudah tercatat yang dapat dikonfirmasi");
  if (d.bukti.startsWith("data:")) await pool.query(`UPDATE wil_surat_kirim SET bukti = $2 WHERE id = $1`, [kirimId, d.bukti]);
  await catatAudit(aktor, "konfirmasi_terima_surat", "surat", rows[0].surat_id, null, null, { kirimId });
  return { ok: true };
}

export async function ambilBuktiKirim(aktor: Aktor, kirimId: number) {
  hanyaRw(aktor);
  const { rows } = await pool.query(`SELECT bukti FROM wil_surat_kirim WHERE id = $1`, [kirimId]);
  return berkasDari(rows[0]?.bukti, `bukti-kirim-${kirimId}`);
}

export function berkasDari(data: string | null | undefined, nama: string) {
  if (!data?.startsWith("data:")) throw new WilayahError(404, "Berkas tidak tersedia");
  const mime = data.slice(5, data.indexOf(";"));
  return { buffer: Buffer.from(data.slice(data.indexOf(",") + 1), "base64"), mime, nama: `${nama}.${mime.includes("pdf") ? "pdf" : mime.split("/")[1]}` };
}

// ================================================================== tindak lanjut
const tindakSchema = z.object({
  tindakan: z.string().trim().min(3).max(1000),
  picNama: z.string().trim().min(2).max(200),
  picJenis: z.string().max(30).nullable().optional(),
  picRt: z.number().int().min(1).max(7).nullable().optional(),
  tenggat: tanggal.nullable().optional(),
});

export async function tambahTindak(aktor: Aktor, suratId: number, input: unknown) {
  hanyaRw(aktor);
  const d = tindakSchema.parse(input);
  const { rows } = await pool.query(
    `INSERT INTO wil_surat_tindak (surat_id, catatan, tindakan, pic_nama, pic_jenis, pic_rt, tenggat, oleh, status, updated_at)
     SELECT id, $2, $2, $3, $4, $5, $6, $7, 'menunggu', now() FROM surat_rw WHERE id = $1 AND status = 'terbit' RETURNING id`,
    [suratId, d.tindakan, d.picNama, d.picJenis ?? null, d.picRt ?? null, d.tenggat ?? null, aktor.label],
  );
  if (!rows[0]) throw new WilayahError(409, "Tindak lanjut hanya untuk dokumen terbit");
  await catatAudit(aktor, "tambah_tindak", "surat", suratId, d.picRt ?? null, null, d);
  return { id: rows[0].id };
}

const updateSchema = z.object({
  status: z.enum(["menunggu", "berjalan", "selesai", "tidak_diperlukan"]).optional(),
  progres: z.number().int().min(0).max(100).optional(),
  catatan: z.string().trim().min(3).max(2000),
  bukti: bukti.nullable().optional(),
  /** RW dapat mencatat laporan dari pihak luar/pengurus tanpa akun. */
  dariPihakLuar: z.boolean().optional(),
});

export async function perbaruiTindak(aktor: Aktor, tindakId: number, input: unknown) {
  const d = updateSchema.parse(input);
  return denganTransaksi(async (c) => {
    const { rows } = await c.query(`SELECT t.*, s.status AS status_surat FROM wil_surat_tindak t JOIN surat_rw s ON s.id = t.surat_id WHERE t.id = $1 FOR UPDATE OF t`, [tindakId]);
    const t = rows[0];
    if (!t || (aktor.role === "rt" && t.pic_rt !== aktor.rt)) throw new WilayahError(404, "Tindak lanjut tidak ditemukan");
    if (aktor.role === "rt" && d.status === "tidak_diperlukan") throw new WilayahError(403, "Hanya Ketua RW yang dapat menyatakan tindak lanjut tidak diperlukan");
    if (d.status === "selesai" && !d.bukti && !t.bukti) throw new WilayahError(400, "Tindak lanjut selesai wajib disertai bukti (foto, dokumen, atau keterangan)");
    const sumber = aktor.role === "rt" ? "rt" : d.dariPihakLuar ? "pihak_luar_dicatat" : "rw";
    const status = d.status ?? (d.progres && d.progres > 0 && t.status === "menunggu" ? "berjalan" : t.status);
    const progres = d.progres ?? (status === "selesai" ? 100 : t.progres);
    await c.query(
      `INSERT INTO wil_surat_tindak_update (tindak_id, progres, status, catatan, bukti, sumber, oleh) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tindakId, progres, status, d.catatan, d.bukti ?? null, sumber, aktor.label],
    );
    await c.query(
      `UPDATE wil_surat_tindak SET status = $2, progres = $3, bukti = COALESCE($4, bukti), updated_at = now() WHERE id = $1`,
      [tindakId, status, progres, d.bukti ?? null],
    );
    await catatAudit(aktor, "perbarui_tindak", "surat_tindak", tindakId, t.pic_rt, { status: t.status, progres: t.progres }, { status, progres, sumber }, c);
    return { ok: true, status, progres };
  });
}

export async function evaluasiTindak(aktor: Aktor, tindakId: number, evaluasi: string) {
  hanyaRw(aktor);
  if (!evaluasi?.trim() || evaluasi.trim().length < 3) throw new WilayahError(400, "Tulis evaluasi");
  const { rowCount } = await pool.query(`UPDATE wil_surat_tindak SET evaluasi = $2, updated_at = now() WHERE id = $1`, [tindakId, evaluasi.trim()]);
  if (!rowCount) throw new WilayahError(404, "Tindak lanjut tidak ditemukan");
  await catatAudit(aktor, "evaluasi_tindak", "surat_tindak", tindakId, null, null, { evaluasi });
  return { ok: true };
}

export async function ambilBuktiTindak(aktor: Aktor, updateId: number) {
  const { rows } = await pool.query(`SELECT u.bukti, t.pic_rt FROM wil_surat_tindak_update u JOIN wil_surat_tindak t ON t.id = u.tindak_id WHERE u.id = $1`, [updateId]);
  if (!rows[0] || (aktor.role === "rt" && rows[0].pic_rt !== aktor.rt)) throw new WilayahError(404, "Berkas tidak ditemukan");
  return berkasDari(rows[0].bukti, `bukti-tindak-${updateId}`);
}

/** Daftar tindak lanjut untuk "Pantau Tindak Lanjut". RT: hanya yang PIC-nya RT tersebut. */
export async function daftarTindak(aktor: Aktor, filter = "terbuka") {
  const rt = aktor.role === "rt" ? aktor.rt : null;
  const kondisi: Record<string, string> = {
    terbuka: `t.status IN ('menunggu', 'berjalan')`,
    jatuh_tempo: `t.status IN ('menunggu', 'berjalan') AND t.tenggat IS NOT NULL AND t.tenggat <= current_date + 3`,
    selesai: `t.status = 'selesai'`,
    semua: `TRUE`,
  };
  const { rows } = await pool.query(
    `SELECT t.id, t.surat_id, COALESCE(t.tindakan, t.catatan) AS tindakan, t.status, t.progres, t.pic_nama, t.pic_rt, to_char(t.tenggat, 'YYYY-MM-DD') AS tenggat,
            t.evaluasi, t.updated_at, s.nomor_surat, s.perihal, s.kode_jenis, s.rangkaian_id,
            (SELECT u.catatan FROM wil_surat_tindak_update u WHERE u.tindak_id = t.id ORDER BY u.id DESC LIMIT 1) AS catatan_terakhir
       FROM wil_surat_tindak t JOIN surat_rw s ON s.id = t.surat_id
      WHERE ${kondisi[filter] ?? kondisi.terbuka} AND ($1::int IS NULL OR t.pic_rt = $1)
      ORDER BY t.tenggat NULLS LAST, t.id LIMIT 300`,
    [rt],
  );
  const hariIni = isoHariIni();
  return rows.map((t) => ({ ...t, terlambat: terlambat(t, hariIni) }));
}

// ================================================================== bantuan bertahap
const bantuanSchema = z.object({
  suratId: z.number().int().positive().nullable().optional(),
  rangkaianId: z.number().int().positive().nullable().optional(),
  tahap: z.enum(["dimohonkan", "dijanjikan", "diterima", "digunakan"]),
  uraian: z.string().trim().min(3).max(500),
  jumlah: z.number().nonnegative().nullable().optional(),
  satuan: z.string().max(40).nullable().optional(),
  nominal: z.number().int().nonnegative().nullable().optional(),
  pemberi: z.string().max(200).nullable().optional(),
  tanggal,
  bukti: bukti.nullable().optional(),
});

export async function catatBantuan(aktor: Aktor, input: unknown) {
  hanyaRw(aktor);
  const d = bantuanSchema.parse(input);
  if (!d.suratId && !d.rangkaianId) throw new WilayahError(400, "Pilih dokumen atau rangkaian terkait");
  if ((d.tahap === "diterima" || d.tahap === "digunakan") && !d.bukti) throw new WilayahError(400, "Bantuan diterima/digunakan wajib disertai bukti (berita acara, tanda terima, nota, foto)");
  const { rows } = await pool.query(
    `INSERT INTO wil_surat_bantuan (surat_id, rangkaian_id, tahap, uraian, jumlah, satuan, nominal, pemberi, tanggal, bukti, dicatat_oleh)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [d.suratId ?? null, d.rangkaianId ?? null, d.tahap, d.uraian, d.jumlah ?? null, d.satuan ?? null, d.nominal ?? null, d.pemberi ?? null, d.tanggal, d.bukti ?? null, aktor.label],
  );
  await catatAudit(aktor, "catat_bantuan", "bantuan", rows[0].id, null, null, { tahap: d.tahap, nominal: d.nominal });
  return { id: rows[0].id };
}

// ================================================================== fakta dari RT
const faktaSchema = z.object({
  permintaanId: z.number().int().positive().nullable().optional(),
  rangkaianId: z.number().int().positive().nullable().optional(),
  isi: z.string().trim().min(5).max(3000),
  sumber: z.string().trim().max(300).nullable().optional(),
  bukti: berkas.nullable().optional(),
  buktiNama: z.string().max(200).nullable().optional(),
});

export async function tambahFakta(aktor: Aktor, input: unknown) {
  const d = faktaSchema.parse(input);
  if (!d.permintaanId && !d.rangkaianId) throw new WilayahError(400, "Pilih permintaan atau rangkaian");
  let rt: number | null = aktor.rt;
  if (aktor.role === "rt") {
    if (d.permintaanId) {
      const { rows } = await pool.query(`SELECT rt FROM wil_permintaan_surat WHERE id = $1`, [d.permintaanId]);
      if (rows[0]?.rt !== aktor.rt) throw new WilayahError(404, "Permintaan tidak ditemukan di RT Anda");
    }
    if (d.rangkaianId) {
      const { rows } = await pool.query(`SELECT rt_terkait FROM wil_surat_rangkaian WHERE id = $1`, [d.rangkaianId]);
      if (!(rows[0]?.rt_terkait ?? []).includes(aktor.rt)) throw new WilayahError(404, "Rangkaian tidak ditemukan untuk RT Anda");
    }
  } else rt = null;
  const { rows } = await pool.query(
    `INSERT INTO wil_surat_fakta (permintaan_id, rangkaian_id, rt, isi, sumber, bukti, bukti_nama, oleh) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [d.permintaanId ?? null, d.rangkaianId ?? null, rt, d.isi, d.sumber ?? null, d.bukti ?? null, d.buktiNama ?? null, aktor.label],
  );
  await catatAudit(aktor, "tambah_fakta_surat", "surat_fakta", rows[0].id, rt);
  return { id: rows[0].id };
}

export async function daftarFaktaPermintaan(aktor: Aktor, permintaanId: number) {
  const { rows: p } = await pool.query(`SELECT rt FROM wil_permintaan_surat WHERE id = $1`, [permintaanId]);
  if (!p[0] || (aktor.role === "rt" && p[0].rt !== aktor.rt)) throw new WilayahError(404, "Permintaan tidak ditemukan");
  const { rows } = await pool.query(`SELECT id, isi, sumber, bukti_nama, (bukti IS NOT NULL) AS ada_bukti, oleh, created_at FROM wil_surat_fakta WHERE permintaan_id = $1 ORDER BY id`, [permintaanId]);
  return rows;
}

export async function ambilBuktiFakta(aktor: Aktor, faktaId: number) {
  const { rows } = await pool.query(`SELECT bukti, rt FROM wil_surat_fakta WHERE id = $1`, [faktaId]);
  if (!rows[0] || (aktor.role === "rt" && rows[0].rt !== aktor.rt)) throw new WilayahError(404, "Berkas tidak ditemukan");
  return berkasDari(rows[0].bukti, `bukti-fakta-${faktaId}`);
}

export async function ambilBerkasMasuk(aktor: Aktor, id: number) {
  hanyaRw(aktor);
  const { rows } = await pool.query(`SELECT berkas FROM wil_surat_masuk WHERE id = $1`, [id]);
  return berkasDari(rows[0]?.berkas, `surat-masuk-${id}`);
}

export async function ambilLampiranAman(aktor: Aktor, lampiranId: number) {
  const { rows } = await pool.query(`SELECT surat_id, nama, mime, data FROM wil_surat_lampiran WHERE id = $1`, [lampiranId]);
  if (!rows[0]) throw new WilayahError(404, "Lampiran tidak ditemukan");
  await pastikanBoleh(aktor, rows[0].surat_id);
  return rows[0] as { nama: string; mime: string; data: string };
}

// ================================================================== ringkasan dashboard RW
/** Jenis yang menunggu respons pihak luar. */
const KODE_PERMOHONAN = `(s.kode_jenis LIKE 'd\\_%' AND s.kode_jenis NOT IN ('d_terima_kasih')) OR s.kode_jenis IN ('b_permohonan_instansi', 'c_koordinasi')
  OR (s.kode_jenis IS NULL AND (s.jenis_surat ILIKE '%permohonan%' OR s.jenis_surat ILIKE '%pengajuan%'))`;

export async function ringkasan(aktor: Aktor) {
  hanyaRw(aktor);
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM wil_permintaan_surat WHERE status = 'baru') AS permintaan_rt,
      (SELECT COUNT(*)::int FROM surat_rw WHERE status = 'draft') AS draft,
      (SELECT COUNT(*)::int FROM surat_rw WHERE status = 'draft' AND perlu_pemeriksaan) AS perlu_pemeriksaan,
      (SELECT COUNT(*)::int FROM surat_rw s WHERE s.status = 'terbit' AND s.snapshot IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM wil_surat_kirim k WHERE k.surat_id = s.id AND k.status IN ('diserahkan', 'diterima'))) AS belum_distribusi,
      (SELECT COUNT(*)::int FROM wil_surat_tindak t JOIN surat_rw s ON s.id = t.surat_id
          WHERE s.status = 'terbit' AND t.status IN ('menunggu', 'berjalan') AND t.tenggat IS NOT NULL AND t.tenggat < current_date) AS tindak_terlambat,
      (SELECT COUNT(*)::int FROM wil_surat_tindak t JOIN surat_rw s ON s.id = t.surat_id
          WHERE s.status = 'terbit' AND t.status IN ('menunggu', 'berjalan') AND t.tenggat IS NOT NULL AND t.tenggat BETWEEN current_date AND current_date + 3) AS tindak_jatuh_tempo,
      (SELECT COUNT(*)::int FROM surat_rw s WHERE s.status = 'terbit' AND (${KODE_PERMOHONAN})
          AND NOT EXISTS (SELECT 1 FROM wil_surat_masuk m WHERE m.membalas_id = s.id)) AS permohonan_tanpa_respons,
      (SELECT COUNT(*)::int FROM wil_surat_tindak WHERE status = 'selesai' AND updated_at > now() - interval '30 days') AS pekerjaan_selesai_30h,
      (SELECT COUNT(*)::int FROM wil_surat_rangkaian WHERE status = 'aktif') AS rangkaian_aktif`);
  const { rows: permohonan } = await pool.query(
    `SELECT s.id, s.nomor_surat, s.perihal, s.tujuan, s.diterbitkan_at, (current_date - s.diterbitkan_at::date) AS umur_hari
       FROM surat_rw s
      WHERE s.status = 'terbit' AND (${KODE_PERMOHONAN}) AND NOT EXISTS (SELECT 1 FROM wil_surat_masuk m WHERE m.membalas_id = s.id)
      ORDER BY s.diterbitkan_at NULLS LAST LIMIT 20`);
  return { ...rows[0], permohonan };
}

// ================================================================== pilihan data yang sudah ada
export async function cariPihak(aktor: Aktor, q: string) {
  const s = q.trim().toLowerCase();
  const like = `%${s}%`;
  const rt = aktor.role === "rt" ? aktor.rt : null;
  const hasil: { nama: string; peran?: string; jenis: string; rt?: number | null; sumber: string; sumberId?: number }[] = [];
  const aman = async (sql: string, p: unknown[], map: (r: any) => (typeof hasil)[number]) => {
    try {
      const { rows } = await pool.query(sql, p);
      hasil.push(...rows.map(map));
    } catch {
      /* tabel opsional belum ada */
    }
  };
  await aman(`SELECT rt, nama_ketua FROM rtjuara_rt_akun WHERE aktif AND ($1 = '%%' OR lower(nama_ketua) LIKE $1 OR ('rt ' || rt) LIKE $1 OR ('rt 0' || rt) LIKE $1) ORDER BY rt`, [like],
    (r) => ({ nama: r.nama_ketua, peran: `Ketua RT ${String(r.rt).padStart(2, "0")}`, jenis: "rt", rt: r.rt, sumber: "akun_rt" }));
  await aman(`SELECT id, nama, jenis, ketua, rt_basis FROM wil_kelompok WHERE ketua IS NOT NULL AND sampai IS NULL AND ($1 = '%%' OR lower(ketua) LIKE $1 OR lower(nama) LIKE $1) LIMIT 15`, [like],
    (r) => ({ nama: r.ketua, peran: `Ketua ${r.nama}`, jenis: "pengurus", rt: r.rt_basis, sumber: "kelompok", sumberId: r.id }));
  if (s.length >= 2) {
    await aman(`SELECT w.id, w.nama_lengkap, k.rt FROM warga w JOIN kartu_keluarga k ON k.id = w.kk_id
                 WHERE lower(w.nama_lengkap) LIKE $1 AND ($2::int IS NULL OR k.rt = $2) ORDER BY w.nama_lengkap LIMIT 15`, [like, rt],
      (r) => ({ nama: r.nama_lengkap, jenis: "warga", rt: r.rt, sumber: "warga", sumberId: r.id }));
    await aman(`SELECT id, nama, rt FROM wil_usaha WHERE lower(nama) LIKE $1 AND ($2::int IS NULL OR rt = $2) LIMIT 10`, [like, rt],
      (r) => ({ nama: r.nama, jenis: "usaha", rt: r.rt, sumber: "usaha", sumberId: r.id }));
    if (!rt) {
      await aman(`SELECT id, nama_usaha FROM mitra WHERE is_active AND lower(nama_usaha) LIKE $1 LIMIT 10`, [like],
        (r) => ({ nama: r.nama_usaha, jenis: "usaha", sumber: "mitra", sumberId: r.id }));
    }
  }
  return hasil.slice(0, 50);
}

export async function referensi(aktor: Aktor) {
  hanyaRw(aktor);
  const aman = async (sql: string) => {
    try {
      return (await pool.query(sql)).rows;
    } catch {
      return [];
    }
  };
  const [kejadian, kegiatan, fasilitas, program, rw3law, rangkaian] = await Promise.all([
    aman(`SELECT id, judul, jenis, rt, status, to_char(tanggal, 'YYYY-MM-DD') AS tanggal, lokasi FROM wil_kejadian ORDER BY (status <> 'selesai') DESC, tanggal DESC LIMIT 200`),
    aman(`SELECT id, judul, jenis, to_char(tanggal, 'YYYY-MM-DD') AS tanggal, lokasi, rt_terlibat FROM wil_kegiatan ORDER BY tanggal DESC LIMIT 200`),
    aman(`SELECT id, nama, jenis, lokasi, rt_lokasi FROM wil_fasilitas ORDER BY nama LIMIT 300`),
    aman(`SELECT id, nama_program AS nama, status, pic FROM program_rw ORDER BY created_at DESC LIMIT 200`),
    aman(`SELECT id, judul, kategori, nomor_peraturan, tahun_nomor, status FROM rw3law_dokumen WHERE status = 'disetujui' AND dicabut_at IS NULL ORDER BY tahun_nomor DESC NULLS LAST, nomor_peraturan LIMIT 200`),
    aman(`SELECT id, judul, jenis, status, rt_terkait FROM wil_surat_rangkaian WHERE status = 'aktif' ORDER BY created_at DESC LIMIT 200`),
  ]);
  return { kejadian, kegiatan, fasilitas, program, rw3law, rangkaian };
}

// ================================================================== verifikasi publik (minimum)
export async function verifikasi(by: { token?: string; id?: number }) {
  const { rows } = by.token
    ? await pool.query(`SELECT nomor_surat, tanggal_surat, status, jenis_surat FROM surat_rw WHERE verifikasi_token = $1 AND status <> 'draft'`, [by.token])
    : await pool.query(`SELECT nomor_surat, tanggal_surat, status, jenis_surat FROM surat_rw WHERE id = $1 AND status <> 'draft' AND nomor_surat IS NOT NULL`, [by.id]);
  return rows[0] as { nomor_surat: string; tanggal_surat: string; status: string; jenis_surat: string } | undefined;
}
