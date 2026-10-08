/**
 * Surat Sakti: tujuan → form → draft → pratinjau → terbit → pengiriman tercatat → tindak lanjut.
 * Nomor dialokasikan atomik saat terbit; surat terbit tidak dapat diubah (koreksi = surat pengganti).
 */
import type { PoolClient } from "pg";
import { z } from "zod";
import { pool } from "./db";
import { catatAudit, WilayahError, type Aktor } from "./wilayah-auth";
import { denganTransaksi } from "./wilayah-data";
import { formatNomorSuratRw, JENIS_SURAT_RW } from "@shared/surat-nomor";

function situs(): string {
  return (process.env.PUBLIC_SITE_URL || "https://rw3padasukacimahi.org").replace(/\/+$/, "");
}

/** Alokasi nomor urut tahunan dengan row lock. Inisialisasi dari nomor yang sudah ada. */
export async function alokasiNomorUrut(c: PoolClient, tahun: number): Promise<number> {
  const { rows: maks } = await c.query(
    `SELECT COALESCE(MAX(GREATEST(COALESCE(nomor_urut, 0),
              CASE WHEN nomor_surat ~ '^[0-9]+/' THEN split_part(nomor_surat, '/', 1)::int ELSE 0 END)), 0)::int AS m
       FROM surat_rw WHERE nomor_surat LIKE '%/' || $1::int::text OR tahun_nomor = $1::int`,
    [tahun],
  );
  await c.query(`INSERT INTO wil_surat_counter (tahun, terakhir) VALUES ($1, $2) ON CONFLICT (tahun) DO NOTHING`, [tahun, maks[0].m]);
  const { rows } = await c.query(
    `UPDATE wil_surat_counter SET terakhir = GREATEST(terakhir, $2) + 1 WHERE tahun = $1 RETURNING terakhir`,
    [tahun, maks[0].m],
  );
  return rows[0].terakhir as number;
}

/** Dipakai endpoint lama POST /api/surat-rw. Mengembalikan null bila migrasi wilayah belum dijalankan. */
export async function nomoriSuratLama(suratId: number, jenisSurat: string, tanggal: Date): Promise<string | null> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const urut = await alokasiNomorUrut(c, tanggal.getFullYear());
    const nomor = formatNomorSuratRw(urut, jenisSurat, tanggal);
    await c.query(`UPDATE surat_rw SET nomor_surat = $2, nomor_urut = $3, tahun_nomor = $4, diterbitkan_at = now() WHERE id = $1`, [suratId, nomor, urut, tanggal.getFullYear()]);
    await c.query("COMMIT");
    return nomor;
  } catch (e: any) {
    await c.query("ROLLBACK").catch(() => {});
    if (e?.code === "42P01" || e?.code === "42703") return null;
    throw e;
  } finally {
    c.release();
  }
}

const KOLOM = `id, nomor_surat, jenis_surat, perihal, tujuan, isi_surat, tanggal_surat, status, data_form,
  dibuat_oleh, diterbitkan_at, dibatalkan_at, alasan_batal, mengganti_id, kejadian_id, kegiatan_id, permintaan_id, created_at, updated_at`;

function petakan(r: any) {
  return {
    id: r.id, nomorSurat: r.nomor_surat, jenisSurat: r.jenis_surat, perihal: r.perihal, tujuan: r.tujuan,
    isiSurat: r.isi_surat, tanggalSurat: r.tanggal_surat, status: r.status, dataForm: r.data_form,
    dibuatOleh: r.dibuat_oleh, diterbitkanAt: r.diterbitkan_at, dibatalkanAt: r.dibatalkan_at, alasanBatal: r.alasan_batal,
    menggantiId: r.mengganti_id, kejadianId: r.kejadian_id, kegiatanId: r.kegiatan_id, permintaanId: r.permintaan_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
    jumlahKirim: r.jumlah_kirim != null ? Number(r.jumlah_kirim) : undefined,
    tindakTerbuka: r.tindak_terbuka != null ? Number(r.tindak_terbuka) : undefined,
  };
}

export async function daftarSurat(bagian: string, cari?: string) {
  const q = cari?.trim() ? `%${cari.trim()}%` : null;
  const kondisi: Record<string, string> = {
    draft: `s.status = 'draft'`,
    tindak: `s.status = 'terbit' AND s.dibatalkan_at IS NULL AND (
               NOT EXISTS (SELECT 1 FROM wil_surat_kirim k WHERE k.surat_id = s.id)
               OR EXISTS (SELECT 1 FROM wil_surat_tindak t WHERE t.surat_id = s.id AND t.status = 'menunggu'))`,
    arsip: `s.status IN ('terbit', 'dibatalkan')`,
  };
  const where = kondisi[bagian] ?? kondisi.arsip;
  const { rows } = await pool.query(
    `SELECT ${KOLOM.split(",").map((k) => `s.${k.trim()}`).join(", ")},
            (SELECT COUNT(*) FROM wil_surat_kirim k WHERE k.surat_id = s.id) AS jumlah_kirim,
            (SELECT COUNT(*) FROM wil_surat_tindak t WHERE t.surat_id = s.id AND t.status = 'menunggu') AS tindak_terbuka
       FROM surat_rw s
      WHERE ${where} AND ($1::text IS NULL OR s.perihal ILIKE $1 OR s.nomor_surat ILIKE $1 OR s.tujuan ILIKE $1 OR s.jenis_surat ILIKE $1)
      ORDER BY COALESCE(s.diterbitkan_at, s.created_at) DESC LIMIT 300`,
    [q],
  );
  return rows.map(petakan);
}

export async function detailSurat(id: number) {
  const { rows } = await pool.query(`SELECT ${KOLOM} FROM surat_rw WHERE id = $1`, [id]);
  if (!rows[0]) throw new WilayahError(404, "Surat tidak ditemukan");
  const [lampiran, kirim, tindak, pengganti] = await Promise.all([
    pool.query(`SELECT id, nama, mime, length(data) AS ukuran, created_at FROM wil_surat_lampiran WHERE surat_id = $1 ORDER BY id`, [id]),
    pool.query(`SELECT id, kanal, penerima, bukti, dikirim_pada, dicatat_oleh FROM wil_surat_kirim WHERE surat_id = $1 ORDER BY dikirim_pada`, [id]),
    pool.query(`SELECT id, catatan, status, to_char(tenggat, 'YYYY-MM-DD') AS tenggat, oleh, created_at FROM wil_surat_tindak WHERE surat_id = $1 ORDER BY id`, [id]),
    pool.query(`SELECT id, nomor_surat, status FROM surat_rw WHERE mengganti_id = $1`, [id]),
  ]);
  return { ...petakan(rows[0]), lampiran: lampiran.rows, kirim: kirim.rows, tindak: tindak.rows, pengganti: pengganti.rows };
}

const draftSchema = z.object({
  jenisSurat: z.enum(JENIS_SURAT_RW),
  perihal: z.string().trim().min(3).max(300),
  tujuan: z.string().trim().max(500).nullable().optional(),
  tanggalSurat: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isiSurat: z.string().max(50000).nullable().optional(),
  dataForm: z.record(z.string(), z.unknown()).nullable().optional(),
  kejadianId: z.number().int().positive().nullable().optional(),
  kegiatanId: z.number().int().positive().nullable().optional(),
  permintaanId: z.number().int().positive().nullable().optional(),
});

function hanyaRw(aktor: Aktor) {
  if (aktor.role !== "rw") throw new WilayahError(403, "Surat RW hanya dikelola Ketua RW");
}

export async function simpanDraft(aktor: Aktor, input: unknown, id?: number) {
  hanyaRw(aktor);
  const d = draftSchema.parse(input);
  if (id) {
    const { rows } = await pool.query(
      `UPDATE surat_rw SET jenis_surat = $2, perihal = $3, tujuan = $4, tanggal_surat = $5, isi_surat = $6, data_form = $7,
              kejadian_id = $8, kegiatan_id = $9, permintaan_id = $10, updated_at = now()
        WHERE id = $1 AND status = 'draft' RETURNING ${KOLOM}`,
      [id, d.jenisSurat, d.perihal, d.tujuan ?? null, d.tanggalSurat, d.isiSurat ?? null, d.dataForm ? JSON.stringify(d.dataForm) : null,
        d.kejadianId ?? null, d.kegiatanId ?? null, d.permintaanId ?? null],
    );
    if (!rows[0]) throw new WilayahError(409, "Hanya draft yang dapat diubah. Surat terbit bersifat tetap.");
    return petakan(rows[0]);
  }
  const { rows } = await pool.query(
    `INSERT INTO surat_rw (jenis_surat, perihal, tujuan, tanggal_surat, isi_surat, data_form, status, dibuat_oleh, kejadian_id, kegiatan_id, permintaan_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, now()) RETURNING ${KOLOM}`,
    [d.jenisSurat, d.perihal, d.tujuan ?? null, d.tanggalSurat, d.isiSurat ?? null, d.dataForm ? JSON.stringify(d.dataForm) : null,
      aktor.label, d.kejadianId ?? null, d.kegiatanId ?? null, d.permintaanId ?? null],
  );
  if (d.permintaanId) await pool.query(`UPDATE wil_permintaan_surat SET status = 'diproses', surat_id = $2, updated_at = now() WHERE id = $1 AND status = 'baru'`, [d.permintaanId, rows[0].id]);
  return petakan(rows[0]);
}

export async function hapusDraft(aktor: Aktor, id: number) {
  hanyaRw(aktor);
  const { rowCount } = await pool.query(`DELETE FROM surat_rw WHERE id = $1 AND status = 'draft'`, [id]);
  if (!rowCount) throw new WilayahError(409, "Hanya draft yang dapat dihapus");
  return { ok: true };
}

export async function terbitkanSurat(aktor: Aktor, id: number) {
  hanyaRw(aktor);
  return denganTransaksi(async (c) => {
    const { rows } = await c.query(`SELECT ${KOLOM} FROM surat_rw WHERE id = $1 FOR UPDATE`, [id]);
    const s = rows[0];
    if (!s) throw new WilayahError(404, "Surat tidak ditemukan");
    if (s.status !== "draft") throw new WilayahError(409, "Surat sudah terbit");
    if (!s.isi_surat || s.isi_surat.length < 100) throw new WilayahError(400, "Isi surat belum lengkap");
    const tanggal = new Date(`${s.tanggal_surat}T00:00:00`);
    if (Number.isNaN(tanggal.getTime())) throw new WilayahError(400, "Tanggal surat tidak valid");
    const urut = await alokasiNomorUrut(c, tanggal.getFullYear());
    const nomor = formatNomorSuratRw(urut, s.jenis_surat, tanggal);
    await c.query(
      `UPDATE surat_rw SET status = 'terbit', nomor_surat = $2, nomor_urut = $3, tahun_nomor = $4, diterbitkan_at = now(), updated_at = now() WHERE id = $1`,
      [id, nomor, urut, tanggal.getFullYear()],
    );
    if (s.mengganti_id) {
      await c.query(
        `UPDATE surat_rw SET status = 'dibatalkan', dibatalkan_at = now(), alasan_batal = COALESCE(alasan_batal, '') || $2, updated_at = now()
          WHERE id = $1 AND status = 'terbit'`,
        [s.mengganti_id, ` Diganti oleh surat ${nomor}.`],
      );
    }
    if (s.permintaan_id) await c.query(`UPDATE wil_permintaan_surat SET status = 'selesai', surat_id = $2, updated_at = now() WHERE id = $1`, [s.permintaan_id, id]);
    await catatAudit(aktor, "terbit_surat", "surat", id, null, null, { nomor }, c);
    return { id, nomorSurat: nomor };
  });
}

export async function batalkanSurat(aktor: Aktor, id: number, alasan: string) {
  hanyaRw(aktor);
  if (!alasan?.trim() || alasan.trim().length < 5) throw new WilayahError(400, "Tulis alasan pembatalan");
  const { rows } = await pool.query(
    `UPDATE surat_rw SET status = 'dibatalkan', dibatalkan_at = now(), alasan_batal = $2, updated_at = now() WHERE id = $1 AND status = 'terbit' RETURNING id`,
    [id, alasan.trim()],
  );
  if (!rows[0]) throw new WilayahError(409, "Hanya surat terbit yang dapat dibatalkan");
  await catatAudit(aktor, "batal_surat", "surat", id, null, null, { alasan });
  return { ok: true };
}

/** Koreksi: draft baru yang menyalin isi; surat lama tetap tersimpan dan dibatalkan saat pengganti terbit. */
export async function buatPengganti(aktor: Aktor, id: number) {
  hanyaRw(aktor);
  const { rows } = await pool.query(
    `INSERT INTO surat_rw (jenis_surat, perihal, tujuan, tanggal_surat, isi_surat, data_form, status, dibuat_oleh, mengganti_id, kejadian_id, kegiatan_id, updated_at)
     SELECT jenis_surat, perihal, tujuan, to_char(current_date, 'YYYY-MM-DD'), isi_surat, data_form, 'draft', $2, id, kejadian_id, kegiatan_id, now()
       FROM surat_rw WHERE id = $1 AND status = 'terbit' RETURNING ${KOLOM}`,
    [id, aktor.label],
  );
  if (!rows[0]) throw new WilayahError(409, "Hanya surat terbit yang dapat dikoreksi");
  return petakan(rows[0]);
}

const kirimSchema = z.object({
  kanal: z.enum(["Diantar langsung", "WhatsApp", "Email", "Pos", "Lainnya"]),
  penerima: z.string().trim().min(2).max(200),
  bukti: z.string().trim().min(3).max(3_000_000),
  dikirimPada: z.string().min(10),
});

export async function catatKirim(aktor: Aktor, id: number, input: unknown) {
  hanyaRw(aktor);
  const d = kirimSchema.parse(input);
  const waktu = new Date(d.dikirimPada);
  if (Number.isNaN(waktu.getTime()) || waktu > new Date(Date.now() + 5 * 60_000)) throw new WilayahError(400, "Waktu pengiriman tidak valid");
  if (d.bukti.startsWith("data:") && !/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/.test(d.bukti)) throw new WilayahError(400, "Bukti harus foto atau PDF");
  const { rows: s } = await pool.query(`SELECT status FROM surat_rw WHERE id = $1`, [id]);
  if (s[0]?.status !== "terbit") throw new WilayahError(409, "Hanya surat terbit yang dapat dicatat pengirimannya");
  const { rows } = await pool.query(
    `INSERT INTO wil_surat_kirim (surat_id, kanal, penerima, bukti, dikirim_pada, dicatat_oleh) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [id, d.kanal, d.penerima, d.bukti, waktu, aktor.label],
  );
  await catatAudit(aktor, "kirim_surat", "surat", id, null, null, { kanal: d.kanal, penerima: d.penerima });
  return { id: rows[0].id };
}

export async function tambahTindak(aktor: Aktor, id: number, input: unknown) {
  hanyaRw(aktor);
  const d = z.object({ catatan: z.string().trim().min(3).max(1000), tenggat: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() }).parse(input);
  const { rows } = await pool.query(
    `INSERT INTO wil_surat_tindak (surat_id, catatan, tenggat, oleh) SELECT id, $2, $3, $4 FROM surat_rw WHERE id = $1 AND status = 'terbit' RETURNING id`,
    [id, d.catatan, d.tenggat ?? null, aktor.label],
  );
  if (!rows[0]) throw new WilayahError(409, "Tindak lanjut hanya untuk surat terbit");
  return { id: rows[0].id };
}

export async function selesaikanTindak(aktor: Aktor, tindakId: number) {
  hanyaRw(aktor);
  await pool.query(`UPDATE wil_surat_tindak SET status = 'selesai' WHERE id = $1`, [tindakId]);
  return { ok: true };
}

export async function tambahLampiran(aktor: Aktor, id: number, input: unknown) {
  hanyaRw(aktor);
  const d = z.object({
    nama: z.string().trim().min(1).max(200),
    data: z.string().regex(/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/).max(4_000_000),
  }).parse(input);
  const mime = d.data.slice(5, d.data.indexOf(";"));
  const { rows } = await pool.query(
    `INSERT INTO wil_surat_lampiran (surat_id, nama, mime, data) SELECT id, $2, $3, $4 FROM surat_rw WHERE id = $1 AND status = 'draft' RETURNING id`,
    [id, d.nama, mime, d.data],
  );
  if (!rows[0]) throw new WilayahError(409, "Lampiran hanya dapat ditambah saat draft");
  return { id: rows[0].id };
}

export async function ambilLampiran(lampiranId: number) {
  const { rows } = await pool.query(`SELECT nama, mime, data FROM wil_surat_lampiran WHERE id = $1`, [lampiranId]);
  if (!rows[0]) throw new WilayahError(404, "Lampiran tidak ditemukan");
  return rows[0] as { nama: string; mime: string; data: string };
}

export async function hapusLampiran(aktor: Aktor, lampiranId: number) {
  hanyaRw(aktor);
  const { rowCount } = await pool.query(
    `DELETE FROM wil_surat_lampiran l USING surat_rw s WHERE l.id = $1 AND s.id = l.surat_id AND s.status = 'draft'`,
    [lampiranId],
  );
  if (!rowCount) throw new WilayahError(409, "Lampiran surat terbit tidak dapat dihapus");
  return { ok: true };
}

export async function ringkasanWa(id: number): Promise<string> {
  const s = await detailSurat(id);
  if (s.status !== "terbit") throw new WilayahError(409, "Ringkasan WA hanya untuk surat terbit");
  const isi = (s.isiSurat ?? "").replace(/\s+/g, " ").trim();
  const potong = isi.length > 400 ? `${isi.slice(0, 400)}…` : isi;
  return [
    `*${s.jenisSurat} — RW 03 Kel. Padasuka*`,
    `Nomor: ${s.nomorSurat}`,
    `Perihal: ${s.perihal}`,
    s.tujuan ? `Kepada: ${s.tujuan}` : null,
    `Tanggal: ${s.tanggalSurat}`,
    "",
    potong,
    "",
    `Cek keaslian: ${situs()}/verify/surat-rw/${s.id}`,
  ].filter((x) => x !== null).join("\n");
}

// ===========================================================================
// Permintaan surat dari RT
// ===========================================================================

export async function ajukanPermintaan(aktor: Aktor, input: unknown) {
  if (aktor.role !== "rt" || !aktor.rt) throw new WilayahError(403, "Hanya Ketua RT");
  const d = z.object({
    jenisSurat: z.enum(JENIS_SURAT_RW),
    perihal: z.string().trim().min(3).max(300),
    uraian: z.string().trim().min(10).max(3000),
    kejadianId: z.number().int().positive().nullable().optional(),
    kegiatanId: z.number().int().positive().nullable().optional(),
    idempotencyKey: z.string().min(16).max(64),
  }).parse(input);
  if (d.kejadianId) {
    const { rows } = await pool.query(`SELECT rt FROM wil_kejadian WHERE id = $1`, [d.kejadianId]);
    if (rows[0]?.rt !== aktor.rt) throw new WilayahError(404, "Masalah tidak ditemukan di RT Anda");
  }
  const { rows } = await pool.query(
    `INSERT INTO wil_permintaan_surat (rt, jenis_surat, perihal, uraian, kejadian_id, kegiatan_id, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = wil_permintaan_surat.updated_at
     RETURNING id, rt`,
    [aktor.rt, d.jenisSurat, d.perihal, d.uraian, d.kejadianId ?? null, d.kegiatanId ?? null, d.idempotencyKey],
  );
  if (rows[0].rt !== aktor.rt) throw new WilayahError(409, "Pengiriman ganda terdeteksi");
  await catatAudit(aktor, "minta_surat", "permintaan_surat", rows[0].id, aktor.rt);
  return { id: rows[0].id };
}

export async function daftarPermintaan(aktor: Aktor) {
  const { rows } = await pool.query(
    `SELECT p.id, p.rt, p.jenis_surat, p.perihal, p.uraian, p.kejadian_id, p.kegiatan_id, p.status, p.surat_id, p.jawaban, p.created_at,
            s.nomor_surat
       FROM wil_permintaan_surat p LEFT JOIN surat_rw s ON s.id = p.surat_id
      WHERE ($1::int IS NULL OR p.rt = $1)
      ORDER BY (p.status = 'baru') DESC, p.created_at DESC LIMIT 200`,
    [aktor.role === "rt" ? aktor.rt : null],
  );
  return rows;
}

export async function tolakPermintaan(aktor: Aktor, id: number, jawaban: string) {
  hanyaRw(aktor);
  if (!jawaban?.trim()) throw new WilayahError(400, "Tulis alasan untuk Ketua RT");
  const { rowCount } = await pool.query(
    `UPDATE wil_permintaan_surat SET status = 'ditolak', jawaban = $2, updated_at = now() WHERE id = $1 AND status IN ('baru', 'diproses')`,
    [id, jawaban.trim()],
  );
  if (!rowCount) throw new WilayahError(409, "Permintaan sudah selesai");
  return { ok: true };
}
