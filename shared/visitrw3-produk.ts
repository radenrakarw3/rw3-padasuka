import type { JenisWarga } from "./schema";
import { JENIS_WARGA_VALUES, isJenisWarga } from "./visitrw3-jenis-warga";

/**
 * Jenis yang dilayani Visit RW3 (warga singgah tinggal): kontrak & kost.
 *
 * CATATAN DATA: Visit RW3 (tabel visitrw3_*) HANYA menyimpan kontrak/kost.
 * Data jualan/usaha kini hidup di basis data terpisah RW3BIZ (tabel rw3biz_*):
 * rw3biz_usaha, rw3biz_pengajuan, rw3biz_orang, rw3biz_settings — bukan di visitrw3_*.
 * Baris jualan lama di visitrw3_* dibiarkan sebagai arsip historis (tidak disalin).
 */
export const VISIT_RW3_JENIS = ["kontrak", "kost"] as const satisfies readonly JenisWarga[];
export type VisitRw3Jenis = (typeof VISIT_RW3_JENIS)[number];

/**
 * Jenis yang dilayani RW3BIZ (izin usaha / jualan).
 * Alur & penyimpanannya terpisah di tabel rw3biz_* (lihat server/rw3biz.ts).
 */
export const RW3BIZ_JENIS = ["jualan"] as const satisfies readonly JenisWarga[];
export type Rw3bizJenis = (typeof RW3BIZ_JENIS)[number];

export function isVisitRw3Jenis(v: unknown): v is VisitRw3Jenis {
  return typeof v === "string" && (VISIT_RW3_JENIS as readonly string[]).includes(v);
}

export function isRw3bizJenis(v: unknown): v is Rw3bizJenis {
  return typeof v === "string" && (RW3BIZ_JENIS as readonly string[]).includes(v);
}

export function isPengajuanRw3biz(row: {
  jenisWarga?: string | null;
  keperluanPengajuan?: string | null;
}): boolean {
  if (row.jenisWarga && isJenisWarga(row.jenisWarga)) {
    return isRw3bizJenis(row.jenisWarga);
  }
  return row.keperluanPengajuan === "bisnis";
}

export function isPengajuanVisitRw3(row: {
  jenisWarga?: string | null;
  keperluanPengajuan?: string | null;
}): boolean {
  return !isPengajuanRw3biz(row);
}

export { JENIS_WARGA_VALUES };
