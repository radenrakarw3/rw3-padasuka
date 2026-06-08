/** Label status pekerjaan RW — tanpa dependensi lain (hindari circular import di client). */
export const PEKERJAAN_BIMBINGAN_ORANG_TUA = "Bimbingan Orang Tua";
export const PEKERJAAN_PELAJAR = "Pelajar";
export const PEKERJAAN_IBU_RUMAH_TANGGA = "Ibu Rumah Tangga";
export const PEKERJAAN_PENSIUNAN = "Pensiunan";

/** Nilai lama yang disatukan ke label kanonik. */
const PEKERJAAN_LEGACY_ALIASES: Record<string, string> = {
  "Mengurus Rumah Tangga": PEKERJAAN_IBU_RUMAH_TANGGA,
  "Pelajar/Mahasiswa": PEKERJAAN_PELAJAR,
};

/** Normalisasi label pekerjaan saat simpan / statistik. */
export function resolvePekerjaanCanon(pekerjaan: string | null | undefined): string {
  const raw = (pekerjaan || "").trim();
  if (!raw) return "";
  return PEKERJAAN_LEGACY_ALIASES[raw] ?? raw;
}
