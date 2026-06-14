import { isUsahaRumahan } from "./constants";

export type KeperluanPengajuanMode = "" | "tinggal" | "bisnis_dalam" | "bisnis_luar" | "usaha_rumahan";

/** Filter daftar properti aktif sesuai situasi pengajuan. */
export function filterPropertiUntukPengajuan<T extends { jenisProperti: string }>(
  list: T[],
  mode: KeperluanPengajuanMode,
): T[] {
  if (mode === "usaha_rumahan") {
    return list.filter((k) => isUsahaRumahan(k.jenisProperti));
  }
  if (mode === "tinggal" || mode === "bisnis_dalam") {
    return list.filter((k) => k.jenisProperti === "kost" || k.jenisProperti === "kontrakan");
  }
  return list;
}
