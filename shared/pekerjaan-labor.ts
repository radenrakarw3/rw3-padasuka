import {
  getEffectiveKategoriUmur,
  isKategoriEligiblePengangguran,
  type WargaKategoriSlice,
} from "@shared/kategori-umur";
import {
  PEKERJAAN_BIMBINGAN_ORANG_TUA,
  PEKERJAAN_IBU_RUMAH_TANGGA,
  PEKERJAAN_PELAJAR,
  PEKERJAAN_PENSIUNAN,
  resolvePekerjaanCanon,
} from "@shared/pekerjaan-status";

/**
 * SSOT status pekerjaan vs jabatan — selaras ILO/BPS.
 * Status angkatan kerja (statusPekerjaan) ≠ pekerjaan/jabatan detail.
 */

/** Nilai lama di dropdown pekerjaan yang sebenarnya status, bukan jabatan. */
export const PEKERJAAN_LEGACY_STATUS_VALUES = [
  "Belum/Tidak Bekerja",
  "Bimbingan Orang Tua",
  PEKERJAAN_IBU_RUMAH_TANGGA,
  "Pelajar",
  PEKERJAAN_PENSIUNAN,
] as const;

export type PekerjaanLegacyStatus = (typeof PEKERJAAN_LEGACY_STATUS_VALUES)[number];

/** Status ILO yang dihitung pengangguran (sumber utama). */
export const PENGANGGURAN_STATUS_ILO = ["Mencari Kerja", "Belum Bekerja"] as const;

/** Fallback data lama — kolom pekerjaan ketika status_pekerjaan kosong. */
export const PEKERJAAN_KATEGORI_PENGANGGURAN_LEGACY = [
  "Belum/Tidak Bekerja",
  "Belum diisi",
] as const;

/** @deprecated Gunakan PENGANGGURAN_KETERANGAN */
export const PEKERJAAN_KATEGORI_PENGANGGURAN = PENGANGGURAN_STATUS_ILO;

export const PENGANGGURAN_KETERANGAN =
  "Status ILO «Mencari Kerja»/«Belum Bekerja» (usia 19–64); fallback data lama: pekerjaan kosong atau «Belum/Tidak Bekerja»";

const LEGACY_PENGANGGURAN_LABELS = new Set(
  PEKERJAAN_KATEGORI_PENGANGGURAN_LEGACY.map((k) => k.toLowerCase()),
);

/** Urutan tampilan status pekerjaan di dashboard kependudukan. */
export const PEKERJAAN_STATUS_CHART_ORDER = [
  PEKERJAAN_BIMBINGAN_ORANG_TUA,
  PEKERJAAN_PELAJAR,
  PEKERJAAN_IBU_RUMAH_TANGGA,
  PEKERJAAN_PENSIUNAN,
  "Mencari Kerja",
  "Belum Bekerja",
  "Belum/Tidak Bekerja",
  "Belum diisi",
] as const;

const STATUS_LABELS = new Set<string>(PEKERJAAN_STATUS_CHART_ORDER);

/** Normalisasi label pekerjaan untuk agregasi statistik. */
export function normalizePekerjaanLabel(pekerjaan: string | null | undefined): string {
  return normalizePekerjaanLabelForStats(pekerjaan);
}

/** Normalisasi label — termasuk alias legacy (IRT, Pelajar/Mahasiswa). */
export function normalizePekerjaanLabelForStats(pekerjaan: string | null | undefined): string {
  const raw = (pekerjaan || "").trim();
  if (!raw) return "Belum diisi";
  const canon = resolvePekerjaanCanon(raw);
  if (canon) return canon;
  const job = raw.toLowerCase();
  if (job.includes("mahasiswa")) return PEKERJAAN_PELAJAR;
  return raw;
}

export type PekerjaanRingkasanSlice = { pekerjaan?: string | null };

export type PekerjaanRingkasanInput = PekerjaanRingkasanSlice &
  WargaKategoriSlice & {
    statusPekerjaan?: string | null;
  };

export type PekerjaanRingkasan = {
  total: number;
  summary: {
    bimbinganOrangTua: number;
    pelajar: number;
    irt: number;
    pensiun: number;
    pengangguran: number;
    jabatan: number;
    belumDiisi: number;
  };
  statusChart: { label: string; count: number }[];
  jabatanChart: { label: string; count: number }[];
};

export type WargaPengangguranSlice = WargaKategoriSlice & {
  pekerjaan?: string | null;
  statusPekerjaan?: string | null;
};

function isPekerjaanStatusLabel(label: string): boolean {
  return STATUS_LABELS.has(label);
}

export function isStatusPekerjaanPengangguran(
  statusPekerjaan: string | null | undefined,
): boolean {
  const status = (statusPekerjaan || "").trim();
  return (PENGANGGURAN_STATUS_ILO as readonly string[]).includes(status);
}

/** Fallback legacy — pekerjaan kosong atau «Belum/Tidak Bekerja» (bukan «Lainnya»). */
export function isLegacyPekerjaanPengangguranLabel(
  pekerjaan: string | null | undefined,
): boolean {
  return LEGACY_PENGANGGURAN_LABELS.has(
    normalizePekerjaanLabelForStats(pekerjaan).toLowerCase(),
  );
}

/** @deprecated Gunakan isLegacyPekerjaanPengangguranLabel */
export function isPekerjaanPengangguran(pekerjaan: string | null | undefined): boolean {
  return isLegacyPekerjaanPengangguranLabel(pekerjaan);
}

/**
 * SSOT pengangguran warga — statusPekerjaan utama, pekerjaan fallback data lama.
 * Hanya warga usia eligible (19–64, bukan pelajar/lansia).
 */
export function isWargaPengangguran(w: WargaPengangguranSlice): boolean {
  if (!isKategoriEligiblePengangguran(w)) return false;
  const status = w.statusPekerjaan?.trim();
  if (status) return isStatusPekerjaanPengangguran(status);
  return isLegacyPekerjaanPengangguranLabel(w.pekerjaan);
}

export function countPengangguranRows(
  rows: WargaPengangguranSlice[],
): { total: number; eligible: number } {
  let total = 0;
  let eligible = 0;
  for (const w of rows) {
    if (isKategoriEligiblePengangguran(w)) {
      eligible++;
      if (isWargaPengangguran(w)) total++;
    }
  }
  return { total, eligible };
}

function countKategoriAligned(rows: PekerjaanRingkasanInput[]) {
  let bimbinganOrangTua = 0;
  let pelajar = 0;
  let pensiun = 0;
  for (const row of rows) {
    const kat = getEffectiveKategoriUmur(row);
    if (kat === "0-5" || kat === "6") bimbinganOrangTua++;
    else if (kat === "7-18") pelajar++;
    else if (kat === "65+") pensiun++;
  }
  return { bimbinganOrangTua, pelajar, pensiun };
}

function buildStatusChartCounts(rows: PekerjaanRingkasanInput[]): Record<string, number> {
  const counts = Object.fromEntries(
    PEKERJAAN_STATUS_CHART_ORDER.map((label) => [label, 0]),
  ) as Record<string, number>;

  const aligned = countKategoriAligned(rows);
  counts[PEKERJAAN_BIMBINGAN_ORANG_TUA] = aligned.bimbinganOrangTua;
  counts[PEKERJAAN_PELAJAR] = aligned.pelajar;
  counts[PEKERJAAN_PENSIUNAN] = aligned.pensiun;

  for (const row of rows) {
    const pekerjaanLabel = normalizePekerjaanLabelForStats(row.pekerjaan);
    if (pekerjaanLabel === PEKERJAAN_IBU_RUMAH_TANGGA) {
      counts[PEKERJAAN_IBU_RUMAH_TANGGA]++;
    }
    if (pekerjaanLabel === "Belum diisi") {
      counts["Belum diisi"]++;
    }
    if (!isKategoriEligiblePengangguran(row)) continue;

    const status = row.statusPekerjaan?.trim();
    if (status === "Mencari Kerja") counts["Mencari Kerja"]++;
    else if (status === "Belum Bekerja") counts["Belum Bekerja"]++;
    else if (!status && pekerjaanLabel === "Belum/Tidak Bekerja") {
      counts["Belum/Tidak Bekerja"]++;
    }
  }

  return counts;
}

export function buildPekerjaanRingkasan(rows: PekerjaanRingkasanInput[]): PekerjaanRingkasan {
  const distribusi: Record<string, number> = {};
  for (const row of rows) {
    const label = normalizePekerjaanLabelForStats(row.pekerjaan);
    distribusi[label] = (distribusi[label] || 0) + 1;
  }

  const aligned = countKategoriAligned(rows);
  const { total: pengangguran } = countPengangguranRows(rows);
  const belumDiisi = distribusi["Belum diisi"] ?? 0;

  let jabatan = 0;
  for (const [label, count] of Object.entries(distribusi)) {
    if (!isPekerjaanStatusLabel(label) && !isLegacyPekerjaanPengangguranLabel(label)) {
      jabatan += count;
    }
  }

  const statusCounts = buildStatusChartCounts(rows);
  const statusChart = PEKERJAAN_STATUS_CHART_ORDER.map((label) => ({
    label,
    count: statusCounts[label] ?? 0,
  })).filter((item) => item.count > 0);

  const jabatanSorted = Object.entries(distribusi)
    .filter(
      ([label]) => !isPekerjaanStatusLabel(label) && !isLegacyPekerjaanPengangguranLabel(label),
    )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: rows.length,
    summary: {
      bimbinganOrangTua: aligned.bimbinganOrangTua,
      pelajar: aligned.pelajar,
      irt: distribusi[PEKERJAAN_IBU_RUMAH_TANGGA] ?? 0,
      pensiun: aligned.pensiun,
      pengangguran,
      jabatan,
      belumDiisi,
    },
    statusChart,
    jabatanChart: jabatanSorted,
  };
}

export type WargaPekerjaanFilterSlice = PekerjaanRingkasanInput;

/** Cocokkan warga ke label bar chart pekerjaan (selaras agregat dashboard). */
export function matchesPekerjaanChartLabel(
  w: WargaPekerjaanFilterSlice,
  chartLabel: string,
): boolean {
  const kat = getEffectiveKategoriUmur(w);
  if (chartLabel === PEKERJAAN_BIMBINGAN_ORANG_TUA) {
    return kat === "0-5" || kat === "6";
  }
  if (chartLabel === PEKERJAAN_PELAJAR) {
    return kat === "7-18";
  }
  if (chartLabel === PEKERJAAN_PENSIUNAN) {
    return kat === "65+";
  }
  if (chartLabel === "Mencari Kerja") {
    return isKategoriEligiblePengangguran(w) && w.statusPekerjaan?.trim() === "Mencari Kerja";
  }
  if (chartLabel === "Belum Bekerja") {
    return isKategoriEligiblePengangguran(w) && w.statusPekerjaan?.trim() === "Belum Bekerja";
  }
  if (chartLabel === "Belum/Tidak Bekerja") {
    return (
      isKategoriEligiblePengangguran(w) &&
      !w.statusPekerjaan?.trim() &&
      normalizePekerjaanLabelForStats(w.pekerjaan) === "Belum/Tidak Bekerja"
    );
  }

  return normalizePekerjaanLabelForStats(w.pekerjaan) === chartLabel;
}

export function filterWargaByPekerjaanChartLabel<T extends WargaPekerjaanFilterSlice>(
  rows: T[],
  chartLabel: string,
): T[] {
  return rows.filter((w) => matchesPekerjaanChartLabel(w, chartLabel));
}

/** Jumlah pengangguran dari agregat distribusi pekerjaan (hanya label legacy). */
export function countPengangguranFromDistribusi(distribusi: Record<string, number>): number {
  let total = 0;
  for (const [label, count] of Object.entries(distribusi)) {
    if (isLegacyPekerjaanPengangguranLabel(label)) total += count;
  }
  return total;
}

const PENGANGGURAN_LEGACY_EXACT = new Set(
  ["belum/tidak bekerja", "tidak bekerja", "belum bekerja", "pengangguran", "tidak diketahui", ""],
);

/** Teks pekerjaan legacy yang dianggap pengangguran (bukan IRT/pelajar/pensiun). */
export function isLegacyPekerjaanPengangguran(pekerjaan: string | null | undefined): boolean {
  const job = (pekerjaan || "").toLowerCase().trim();
  if (isLegacyPekerjaanDiLuarAngkatanKerja(pekerjaan)) return false;
  return PENGANGGURAN_LEGACY_EXACT.has(job);
}

/** IRT, pelajar, pensiun, balita — bukan pengangguran menurut ILO. */
export function isLegacyPekerjaanDiLuarAngkatanKerja(pekerjaan: string | null | undefined): boolean {
  const job = (pekerjaan || "").toLowerCase().trim();
  if (!job) return false;
  if (job.includes("bimbingan orang tua")) return true;
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
  if (job.includes("bimbingan orang tua") || raw === "Bimbingan Orang Tua") {
    return "Bimbingan Orang Tua";
  }
  if (job.includes("pelajar") || job.includes("mahasiswa") || raw === "Pelajar") {
    return "Pelajar";
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
  return "Bekerja";
}

export function filterPekerjaanBekerjaOptions(allOptions: readonly string[]): string[] {
  const legacy = new Set<string>(PEKERJAAN_LEGACY_STATUS_VALUES);
  return allOptions.filter((o) => !legacy.has(o));
}
