/**
 * Konstanta & aturan form warga — selaras UN / ILO / UNESCO / Washington Group / CRVS.
 */

/** @deprecated Field literasi dihapus dari form/kelengkapan; dipertahankan untuk data lama. */
export const LITERASI_OPTIONS = ["Ya", "Tidak", "Sebagian"] as const;

/** Washington Group — tingkat kesulitan per domain (Short Set disederhanakan). */
export const WG_DOMAIN_LEVEL_OPTIONS = [
  "Tidak ada kesulitan",
  "Sedikit kesulitan",
  "Banyak kesulitan",
  "Tidak dapat sama sekali",
] as const;

/** ILO — status yang memerlukan rincian pekerjaan. */
export const ILO_EMPLOYED_STATUSES = ["Bekerja", "Wiraswasta", "Pelaku Usaha", "Pekerja Lepas"] as const;

/** @deprecated Literasi tidak lagi diwajibkan / ditampilkan. */
export function needsLiterasi(_age: number | null): boolean {
  return false;
}

/** Registrasi sipil anak (SDG 16.9 / CRVS). */
export function needsCrvsDocuments(age: number | null): boolean {
  return age !== null && age < 18;
}

/** ILO — status angkatan kerja. */
export function needsStatusAngkatanKerja(age: number | null): boolean {
  return age !== null && age >= 15;
}

export function needsPekerjaanDetail(statusPekerjaan: string | null | undefined): boolean {
  return ILO_EMPLOYED_STATUSES.includes((statusPekerjaan || "") as (typeof ILO_EMPLOYED_STATUSES)[number]);
}

export function hasKesulitanFungsional(kesulitan: string): boolean {
  return kesulitan !== "Tidak ada kesulitan";
}

export function needsWgDomainDetail(kesulitan: string): boolean {
  return hasKesulitanFungsional(kesulitan);
}
