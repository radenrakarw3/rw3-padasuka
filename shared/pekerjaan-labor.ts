/**
 * SSOT status pekerjaan vs jabatan — selaras ILO/BPS.
 * Status angkatan kerja (statusPekerjaan) ≠ pekerjaan/jabatan detail.
 */

/** Nilai lama di dropdown pekerjaan yang sebenarnya status, bukan jabatan. */
export const PEKERJAAN_LEGACY_STATUS_VALUES = [
  "Belum/Tidak Bekerja",
  "Mengurus Rumah Tangga",
  "Ibu Rumah Tangga",
  "Pelajar/Mahasiswa",
  "Pensiunan",
] as const;

export type PekerjaanLegacyStatus = (typeof PEKERJAAN_LEGACY_STATUS_VALUES)[number];

const PENGANGGURAN_LEGACY_EXACT = new Set(
  ["belum/tidak bekerja", "tidak bekerja", "belum bekerja", "pengangguran", "tidak diketahui", ""],
);

/** Teks pekerjaan legacy yang dianggap pengangguran (bukan IRT/pelajar/pensiun). */
export function isLegacyPekerjaanPengangguran(pekerjaan: string | null | undefined): boolean {
  const job = (pekerjaan || "").toLowerCase().trim();
  if (isLegacyPekerjaanDiLuarAngkatanKerja(pekerjaan)) return false;
  return PENGANGGURAN_LEGACY_EXACT.has(job);
}

/** IRT, pelajar, pensiun — bukan pengangguran menurut ILO. */
export function isLegacyPekerjaanDiLuarAngkatanKerja(pekerjaan: string | null | undefined): boolean {
  const job = (pekerjaan || "").toLowerCase().trim();
  if (!job) return false;
  if (job.includes("pelajar") || job.includes("mahasiswa")) return true;
  if (job.includes("ibu rumah tangga") || job.includes("mengurus rumah tangga")) return true;
  if (job.includes("pensiun")) return true;
  return false;
}

/** Petakan teks pekerjaan lama ke status ILO jika statusPekerjaan kosong. */
export function inferStatusPekerjaanFromLegacyPekerjaan(
  pekerjaan: string | null | undefined,
): string | null {
  const raw = (pekerjaan || "").trim();
  if (!raw) return null;

  const job = raw.toLowerCase();
  if (job.includes("pelajar") || job.includes("mahasiswa") || raw === "Pelajar/Mahasiswa") {
    return "Pelajar/Mahasiswa";
  }
  if (job.includes("ibu rumah tangga") || job.includes("mengurus rumah tangga")) {
    return "Ibu Rumah Tangga";
  }
  if (job.includes("pensiun") || raw === "Pensiunan") {
    return "Pensiun";
  }
  if (isLegacyPekerjaanPengangguran(raw)) {
    return "Belum Bekerja";
  }
  if (PEKERJAAN_LEGACY_STATUS_VALUES.includes(raw as PekerjaanLegacyStatus)) {
    return null;
  }
  // Jabatan terisi → diasumsikan bekerja (petugas bisa koreksi status).
  return "Bekerja";
}

export function filterPekerjaanBekerjaOptions(allOptions: readonly string[]): string[] {
  const legacy = new Set<string>(PEKERJAAN_LEGACY_STATUS_VALUES);
  return allOptions.filter((o) => !legacy.has(o));
}
