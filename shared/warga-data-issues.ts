import { isFieldFilled } from "@shared/kependudukan-analytics";
import {
  getEffectiveKategoriUmur,
  isKategoriEligiblePengangguran,
  isPekerjaanSalahUntukKategori,
  pekerjaanWajibUntukKategori,
  resolveKategoriUmur,
  type KategoriUmurId,
} from "@shared/kategori-umur";
import { isPekerjaanStandar } from "@shared/pekerjaan-options";
import {
  countPengangguranRows,
  isLegacyPekerjaanPengangguranLabel,
  isStatusPekerjaanPengangguran,
  normalizePekerjaanLabelForStats,
  PENGANGGURAN_STATUS_ILO,
} from "@shared/pekerjaan-labor";
import {
  PEKERJAAN_BIMBINGAN_ORANG_TUA,
  PEKERJAAN_IBU_RUMAH_TANGGA,
  PEKERJAAN_PELAJAR,
  PEKERJAAN_PENSIUNAN,
} from "@shared/pekerjaan-status";
import { getWargaAge } from "@shared/warga-form-tier";
import {
  needsPekerjaanDetail,
  needsStatusAngkatanKerja,
} from "@shared/warga-international";

export type WargaDataIssueId =
  | "tanpa_tanggal_lahir"
  | "kategori_belum_sinkron"
  | "tanpa_pekerjaan"
  | "pekerjaan_tidak_standar"
  | "pekerjaan_salah_kategori"
  | "tanpa_status_pekerjaan"
  | "status_pekerjaan_tidak_selaras";

export type WargaDataIssueDef = {
  id: WargaDataIssueId;
  label: string;
  hint: string;
};

/** Masalah data yang memengaruhi statistik kependudukan. */
export const WARGA_DATA_ISSUE_DEFS: WargaDataIssueDef[] = [
  {
    id: "tanpa_tanggal_lahir",
    label: "Tanggal lahir kosong/tidak valid",
    hint: "Kategori umur tidak bisa ditentukan",
  },
  {
    id: "kategori_belum_sinkron",
    label: "Kategori umur belum sinkron",
    hint: "Kolom kategori_umur tidak sesuai tanggal lahir",
  },
  {
    id: "tanpa_status_pekerjaan",
    label: "Status pekerjaan belum diisi",
    hint: "Wajib untuk usia ≥15 (status angkatan kerja ILO)",
  },
  {
    id: "status_pekerjaan_tidak_selaras",
    label: "Status vs pekerjaan tidak selaras",
    hint: "Status ILO tidak cocok dengan kolom pekerjaan/jabatan",
  },
  {
    id: "tanpa_pekerjaan",
    label: "Pekerjaan belum diisi",
    hint: "Terhitung «Belum diisi» di statistik",
  },
  {
    id: "pekerjaan_tidak_standar",
    label: "Pekerjaan di luar daftar",
    hint: "Nilai tidak ada di dropdown BPS/RW",
  },
  {
    id: "pekerjaan_salah_kategori",
    label: "Pekerjaan tidak sesuai kategori umur",
    hint: "Usia 0–6 «Bimbingan Orang Tua»; 7–18 «Pelajar»; 65+ «Pensiunan»",
  },
];

export type WargaIssueSlice = {
  id: number;
  kkId: number;
  rt: number;
  namaLengkap: string;
  nik: string;
  kedudukanKeluarga: string;
  tanggalLahir?: string | null;
  kategoriUmur?: string | null;
  pekerjaan?: string | null;
  statusPekerjaan?: string | null;
  nomorWhatsapp?: string | null;
};

const ISSUE_LABEL_SHORT: Record<WargaDataIssueId, string> = {
  tanpa_tanggal_lahir: "Tanggal lahir",
  kategori_belum_sinkron: "Kategori umur",
  tanpa_status_pekerjaan: "Status pekerjaan",
  status_pekerjaan_tidak_selaras: "Status vs pekerjaan",
  tanpa_pekerjaan: "Pekerjaan kosong",
  pekerjaan_tidak_standar: "Pekerjaan non-standar",
  pekerjaan_salah_kategori: "Pekerjaan tidak sesuai usia",
};

export type WargaWithIssues = WargaIssueSlice & {
  issues: WargaDataIssueId[];
  kategoriEfektif: KategoriUmurId;
};

function hasInvalidTanggalLahir(tanggalLahir: string | null | undefined): boolean {
  if (!isFieldFilled(tanggalLahir)) return true;
  return getWargaAge(tanggalLahir) === null;
}

function isStatusPekerjaanSelaras(w: WargaIssueSlice): boolean {
  const age = getWargaAge(w.tanggalLahir);
  if (!needsStatusAngkatanKerja(age)) return true;

  const status = w.statusPekerjaan?.trim() ?? "";
  if (!status) return true;

  const pekerjaanNorm = normalizePekerjaanLabelForStats(w.pekerjaan);

  if (isStatusPekerjaanPengangguran(status)) {
    return isLegacyPekerjaanPengangguranLabel(w.pekerjaan);
  }

  if (needsPekerjaanDetail(status)) {
    return (
      pekerjaanNorm !== "Belum diisi" &&
      pekerjaanNorm !== "Belum/Tidak Bekerja" &&
      pekerjaanNorm !== PEKERJAAN_PELAJAR &&
      pekerjaanNorm !== PEKERJAAN_PENSIUNAN &&
      pekerjaanNorm !== PEKERJAAN_IBU_RUMAH_TANGGA &&
      pekerjaanNorm !== PEKERJAAN_BIMBINGAN_ORANG_TUA
    );
  }

  if (status === "Ibu Rumah Tangga") {
    return pekerjaanNorm === PEKERJAAN_IBU_RUMAH_TANGGA || pekerjaanNorm === "Belum diisi";
  }
  if (status === "Pelajar") {
    return pekerjaanNorm === PEKERJAAN_PELAJAR || pekerjaanNorm === "Belum diisi";
  }
  if (status === "Pensiun") {
    return pekerjaanNorm === PEKERJAAN_PENSIUNAN || pekerjaanNorm === "Belum diisi";
  }

  return true;
}

export function detectWargaDataIssues(w: WargaIssueSlice): WargaDataIssueId[] {
  const issues: WargaDataIssueId[] = [];
  const pekerjaan = w.pekerjaan?.trim() ?? "";
  const kategoriEfektif = getEffectiveKategoriUmur(w);
  const age = getWargaAge(w.tanggalLahir);

  if (hasInvalidTanggalLahir(w.tanggalLahir)) {
    issues.push("tanpa_tanggal_lahir");
  } else {
    const fromTl = resolveKategoriUmur(w.tanggalLahir);
    const stored = w.kategoriUmur?.trim();
    if (stored && stored !== fromTl) {
      issues.push("kategori_belum_sinkron");
    }
  }

  if (needsStatusAngkatanKerja(age) && !w.statusPekerjaan?.trim()) {
    issues.push("tanpa_status_pekerjaan");
  } else if (w.statusPekerjaan?.trim() && !isStatusPekerjaanSelaras(w)) {
    issues.push("status_pekerjaan_tidak_selaras");
  }

  const pekerjaanWajib = pekerjaanWajibUntukKategori(kategoriEfektif);

  if (!pekerjaan) {
    issues.push("tanpa_pekerjaan");
    if (pekerjaanWajib) issues.push("pekerjaan_salah_kategori");
  } else {
    if (!isPekerjaanStandar(pekerjaan)) {
      issues.push("pekerjaan_tidak_standar");
    }
    if (isPekerjaanSalahUntukKategori(pekerjaan, kategoriEfektif)) {
      issues.push("pekerjaan_salah_kategori");
    }
  }

  return issues;
}

export function buildWargaDataIssueReport(rows: WargaIssueSlice[]) {
  const counts: Record<WargaDataIssueId, number> = {
    tanpa_tanggal_lahir: 0,
    kategori_belum_sinkron: 0,
    tanpa_status_pekerjaan: 0,
    status_pekerjaan_tidak_selaras: 0,
    tanpa_pekerjaan: 0,
    pekerjaan_tidak_standar: 0,
    pekerjaan_salah_kategori: 0,
  };
  const perKategori: Record<KategoriUmurId, number> = {
    "0-5": 0,
    "6": 0,
    "7-18": 0,
    "19-25": 0,
    "26-40": 0,
    "41-55": 0,
    "56-64": 0,
    "65+": 0,
    belum_diisi: 0,
  };

  const flagged: WargaWithIssues[] = [];
  for (const row of rows) {
    const kategoriEfektif = getEffectiveKategoriUmur(row);
    const rowIssues = detectWargaDataIssues(row);
    if (rowIssues.length === 0) continue;
    for (const id of rowIssues) counts[id]++;
    perKategori[kategoriEfektif]++;
    flagged.push({ ...row, issues: rowIssues, kategoriEfektif });
  }

  flagged.sort((a, b) => a.rt - b.rt || a.namaLengkap.localeCompare(b.namaLengkap, "id"));

  return {
    totalBermasalah: flagged.length,
    counts,
    perKategori,
    rows: flagged,
  };
}

export function summarizeWargaIssues(issues: WargaDataIssueId[]): string {
  return issues.map((id) => ISSUE_LABEL_SHORT[id]).join(" · ");
}

export function buildPekerjaanChartWaMessage(
  w: Pick<WargaIssueSlice, "namaLengkap" | "nik" | "kedudukanKeluarga" | "pekerjaan" | "statusPekerjaan">,
  chartLabel: string,
): string {
  const pekerjaanTercatat = w.pekerjaan?.trim() || "belum diisi";
  const statusTercatat = w.statusPekerjaan?.trim() || "belum diisi";
  return [
    `Assalamu'alaikum Bapak/Ibu ${w.namaLengkap},`,
    "",
    "Saya dari pengurus data kependudukan RW 03 Padasuka. Mohon konfirmasi data pekerjaan berikut:",
    "",
    `• Nama: ${w.namaLengkap}`,
    `• NIK: ${w.nik}`,
    `• Kedudukan: ${w.kedudukanKeluarga}`,
    `• Status pekerjaan: ${statusTercatat}`,
    `• Pekerjaan/jabatan: ${pekerjaanTercatat}`,
    `• Kategori statistik: ${chartLabel}`,
    "",
    "Mohon kirim koreksi jika ada yang perlu diperbaiki.",
    "",
    "Terima kasih.",
    "RW 03 Padasuka",
  ].join("\n");
}

export function buildVerifikasiDataWaMessage(
  w: Pick<
    WargaIssueSlice,
    "namaLengkap" | "nik" | "kedudukanKeluarga" | "tanggalLahir" | "kategoriUmur" | "statusPekerjaan" | "pekerjaan"
  >,
  issues: WargaDataIssueId[],
): string {
  const masalah = issues
    .map((id) => WARGA_DATA_ISSUE_DEFS.find((d) => d.id === id)?.label)
    .filter(Boolean)
    .join("; ");

  const pekerjaanWajib = pekerjaanWajibUntukKategori(getEffectiveKategoriUmur(w));
  const pekerjaanNote =
    issues.includes("pekerjaan_salah_kategori") && pekerjaanWajib
      ? `• Pekerjaan seharusnya: ${pekerjaanWajib}`
      : null;

  const statusNote = issues.includes("status_pekerjaan_tidak_selaras")
    ? `• Status pekerjaan saat ini: ${w.statusPekerjaan?.trim() || "kosong"} · Pekerjaan: ${w.pekerjaan?.trim() || "kosong"}`
    : null;

  return [
    `Assalamu'alaikum Bapak/Ibu ${w.namaLengkap},`,
    "",
    "Saya dari pengurus data kependudukan RW 03 Padasuka. Mohon bantu konfirmasi data warga berikut:",
    "",
    `• Nama: ${w.namaLengkap}`,
    `• NIK: ${w.nik}`,
    `• Kedudukan: ${w.kedudukanKeluarga}`,
    `• Perlu dicek: ${masalah}`,
    ...(pekerjaanNote ? ["", pekerjaanNote] : []),
    ...(statusNote ? ["", statusNote] : []),
    "",
    "Mohon kirim data terbaru (tanggal lahir, status & pekerjaan, pendidikan) bila ada yang perlu diperbaiki.",
    "",
    "Terima kasih.",
    "RW 03 Padasuka",
  ].join("\n");
}

function normalizeWaDigits(phone: string | null | undefined): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits;
}

/** Nomor WA untuk verifikasi — warga sendiri, atau fallback kepala keluarga di KK yang sama. */
export function resolveWaVerifikasi(
  row: WargaIssueSlice,
  allInRt: WargaIssueSlice[],
): { phone: string; via: "warga" | "kepala_keluarga" } | null {
  const own = normalizeWaDigits(row.nomorWhatsapp);
  if (own) return { phone: own, via: "warga" };

  const kk = row.kkId;
  const kepala = allInRt.find(
    (w) =>
      w.kkId === kk &&
      w.id !== row.id &&
      w.kedudukanKeluarga === "Kepala Keluarga" &&
      normalizeWaDigits(w.nomorWhatsapp),
  );
  const kkWa = normalizeWaDigits(kepala?.nomorWhatsapp);
  if (kkWa) return { phone: kkWa, via: "kepala_keluarga" };
  return null;
}

export function countPengangguranWarga(
  rows: Array<WargaIssueSlice & { pekerjaan?: string | null; statusPekerjaan?: string | null }>,
): { total: number; eligible: number } {
  return countPengangguranRows(rows);
}

export { PENGANGGURAN_STATUS_ILO, isKategoriEligiblePengangguran };
