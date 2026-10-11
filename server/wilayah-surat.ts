/**
 * Bagian bersama Surat RW: penomoran atomik, dan lampiran draft.
 * Alur dokumen Surat Sakti v2 ada di server/surat-sakti/ (registry, snapshot, PDF, tindak lanjut).
 */
import type { PoolClient } from "pg";
import { z } from "zod";
import { pool } from "./db";
import { catatAudit, WilayahError, type Aktor } from "./wilayah-auth";
import { formatNomorSuratRw } from "@shared/surat-nomor";

/** Alokasi nomor urut tahunan dengan row lock. Inisialisasi dari nomor yang sudah ada; arsip lama tidak dinomori ulang. */
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

function hanyaRw(aktor: Aktor) {
  if (aktor.role !== "rw") throw new WilayahError(403, "Surat RW hanya dikelola Ketua RW");
}

// ===========================================================================
// Lampiran (hanya saat draft)
// ===========================================================================

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

export async function hapusLampiran(aktor: Aktor, lampiranId: number) {
  hanyaRw(aktor);
  const { rowCount } = await pool.query(
    `DELETE FROM wil_surat_lampiran l USING surat_rw s WHERE l.id = $1 AND s.id = l.surat_id AND s.status = 'draft'`,
    [lampiranId],
  );
  if (!rowCount) throw new WilayahError(409, "Lampiran dokumen terbit tidak dapat dihapus");
  return { ok: true };
}
