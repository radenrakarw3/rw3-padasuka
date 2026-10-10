/**
 * Akses dokumen Surat Sakti. RW: semua. RT: hanya dokumen terbit yang relevan dengan wilayahnya.
 *  - akses 'rt_terkait': RT yang tercantum di rt_terkait, RT pemohon, atau RT penanggung jawab tindak lanjut.
 *  - akses 'internal'  : hanya RT pemohon atau RT penanggung jawab tindak lanjut.
 *  - akses 'terbatas'  : hanya RW.
 */
import { pool } from "../db";
import { WilayahError, type Aktor } from "../wilayah-auth";

/** Kondisi SQL untuk RT (alias tabel surat = s, parameter RT = $n). */
export function kondisiBacaRt(param: string): string {
  return `(s.status <> 'draft' AND s.akses <> 'terbatas' AND (
      (s.akses = 'rt_terkait' AND ${param} = ANY(s.rt_terkait))
      OR EXISTS (SELECT 1 FROM wil_permintaan_surat p WHERE p.surat_id = s.id AND p.rt = ${param})
      OR EXISTS (SELECT 1 FROM wil_surat_tindak t WHERE t.surat_id = s.id AND t.pic_rt = ${param})))`;
}

export function hanyaRw(aktor: Aktor) {
  if (aktor.role !== "rw") throw new WilayahError(403, "Hanya Ketua RW yang dapat menerbitkan atau mengubah dokumen RW");
}

export async function pastikanBoleh(aktor: Aktor, suratId: number): Promise<void> {
  if (aktor.role === "rw") return;
  if (!aktor.rt) throw new WilayahError(403, "Sesi RT tidak valid");
  const { rows } = await pool.query(`SELECT 1 FROM surat_rw s WHERE s.id = $1 AND ${kondisiBacaRt("$2::int")}`, [suratId, aktor.rt]);
  // 404 agar keberadaan dokumen wilayah lain tidak terungkap.
  if (!rows[0]) throw new WilayahError(404, "Dokumen tidak ditemukan");
}
