/**
 * SSOT Verifikasi Data — gabungan:
 * - isu selaras statistik (warga-data-issues)
 * - kelengkapan field wajib warga (profile-completeness / tier)
 * - field keluarga (KK) yang masih kosong
 *
 * Hanya baris yang perlu perhatian yang ditampilkan di UI verifikasi.
 */

import { computeWargaCompleteness, TIER_FIELD_LABELS } from "@shared/profile-completeness";
import type { Warga } from "@shared/schema";
import {
  detectWargaDataIssues,
  resolveWaVerifikasi,
  WARGA_DATA_ISSUE_DEFS,
  type WargaDataIssueId,
  type WargaIssueSlice,
} from "@shared/warga-data-issues";
import { unikLabel } from "@shared/wa-template-kependudukan";

export type VerifikasiKelengkapanSlice = WargaIssueSlice & {
  tempatLahir?: string | null;
  pendidikan?: string | null;
  nomorWhatsapp?: string | null;
  punyaAktaLahir?: boolean | null;
  punyaKia?: boolean | null;
  statusDisabilitas?: string | null;
  wgKesulitanMelihat?: string | null;
  wgKesulitanBerjalan?: string | null;
  statusKependudukan?: string | null;
  jenisKelamin?: string | null;
  nomorKk?: string | null;
  alamat?: string | null;
  /** Field KK — penghasilan keluarga */
  penghasilanBulanan?: string | null;
  /** 0–1 dari standar data wilayah (opsional, dari daftar KK) */
  kelengkapanStandarKk?: number | null;
  kurangStandarKeluarga?: string[];
  kurangStandarPribadi?: string[];
};

export type VerifikasiBaris = VerifikasiKelengkapanSlice & {
  issues: WargaDataIssueId[];
  /** Label data pribadi yang masih kurang / perlu dicek */
  kurangPribadi: string[];
  /** Label data keluarga yang masih kurang */
  kurangKeluarga: string[];
  /** 0–100 kelengkapan field wajib warga (tier) */
  persenPribadi: number;
  /** 0–100 kelengkapan field KK yang relevan di slice ini */
  persenKeluarga: number;
  /** 0–100 gabungan (rata-rata tertimbang sederhana) */
  persenGabungan: number;
};

export type VerifikasiFilter =
  | "semua"
  | "pribadi"
  | "keluarga"
  | "isu"
  | "tanpa_wa"
  | WargaDataIssueId;

const KK_FIELD_LABELS: Record<string, string> = {
  penghasilanBulanan: "Penghasilan bulanan keluarga",
};

function kkMissing(row: VerifikasiKelengkapanSlice): string[] {
  const out: string[] = [];
  if (!row.penghasilanBulanan?.trim()) out.push(KK_FIELD_LABELS.penghasilanBulanan);
  if (row.kurangStandarKeluarga?.length) out.push(...row.kurangStandarKeluarga);
  return unikLabel(out);
}

function toWargaLike(row: VerifikasiKelengkapanSlice): Warga {
  return {
    id: row.id,
    kkId: row.kkId,
    namaLengkap: row.namaLengkap,
    nik: row.nik,
    kedudukanKeluarga: row.kedudukanKeluarga,
    tanggalLahir: row.tanggalLahir ?? null,
    kategoriUmur: row.kategoriUmur ?? null,
    pekerjaan: row.pekerjaan ?? null,
    statusPekerjaan: row.statusPekerjaan ?? null,
    nomorWhatsapp: row.nomorWhatsapp ?? null,
    sedangKuliah: row.sedangKuliah ?? false,
    tempatLahir: row.tempatLahir ?? null,
    pendidikan: row.pendidikan ?? null,
    punyaAktaLahir: row.punyaAktaLahir ?? null,
    punyaKia: row.punyaKia ?? null,
    statusDisabilitas: row.statusDisabilitas ?? null,
    wgKesulitanMelihat: row.wgKesulitanMelihat ?? null,
    wgKesulitanBerjalan: row.wgKesulitanBerjalan ?? null,
    statusKependudukan: row.statusKependudukan ?? "Aktif",
    jenisKelamin: row.jenisKelamin ?? "Laki-laki",
  } as Warga;
}

export function buildVerifikasiBaris(row: VerifikasiKelengkapanSlice): VerifikasiBaris {
  const issues = detectWargaDataIssues(row);
  const issueLabels = issues
    .map((id) => WARGA_DATA_ISSUE_DEFS.find((d) => d.id === id)?.label)
    .filter(Boolean) as string[];

  const completeness = computeWargaCompleteness(toWargaLike(row));
  const kurangTier = completeness.missingFields.map((f) => f.label);
  const kurangStandarPribadi = row.kurangStandarPribadi ?? [];

  const kurangPribadi = unikLabel([...issueLabels, ...kurangTier, ...kurangStandarPribadi]);
  const kurangKeluarga = kkMissing(row);

  const persenPribadi = completeness.completionPercent;
  /** Standar wilayah (0–1) bila ada; jika tidak, field KK inti (penghasilan). */
  const persenKeluarga =
    row.kelengkapanStandarKk != null && Number.isFinite(row.kelengkapanStandarKk)
      ? Math.round(Math.min(1, Math.max(0, row.kelengkapanStandarKk)) * 100)
      : row.penghasilanBulanan?.trim()
        ? 100
        : 0;

  const persenGabungan = Math.round(persenPribadi * 0.7 + persenKeluarga * 0.3);

  return {
    ...row,
    issues,
    kurangPribadi,
    kurangKeluarga,
    persenPribadi,
    persenKeluarga,
    persenGabungan,
  };
}

export function perluVerifikasi(b: VerifikasiBaris): boolean {
  return b.issues.length > 0 || b.kurangPribadi.length > 0 || b.kurangKeluarga.length > 0;
}

export function buildVerifikasiReport(rows: VerifikasiKelengkapanSlice[]) {
  const all = rows.map(buildVerifikasiBaris);
  const flagged = all.filter(perluVerifikasi);
  flagged.sort((a, b) => a.persenPribadi - b.persenPribadi || a.rt - b.rt || a.namaLengkap.localeCompare(b.namaLengkap, "id"));

  const counts: Record<WargaDataIssueId, number> = {
    tanpa_tanggal_lahir: 0,
    kategori_belum_sinkron: 0,
    tanpa_status_pekerjaan: 0,
    status_pekerjaan_tidak_selaras: 0,
    tanpa_pekerjaan: 0,
    pekerjaan_tidak_standar: 0,
    pekerjaan_salah_kategori: 0,
    status_lama_naik_usia: 0,
  };
  for (const r of flagged) {
    for (const id of r.issues) counts[id]++;
  }

  const n = all.length || 1;
  const rataPribadi = Math.round(all.reduce((s, r) => s + r.persenPribadi, 0) / n);
  const rataKeluarga = Math.round(all.reduce((s, r) => s + r.persenKeluarga, 0) / n);
  const rataGabungan = Math.round(all.reduce((s, r) => s + r.persenGabungan, 0) / n);

  return {
    totalAktif: all.length,
    totalPerlu: flagged.length,
    counts,
    kurangPribadiCount: flagged.filter((r) => r.kurangPribadi.length > 0).length,
    kurangKeluargaCount: flagged.filter((r) => r.kurangKeluarga.length > 0).length,
    isuCount: flagged.filter((r) => r.issues.length > 0).length,
    rataPribadi,
    rataKeluarga,
    rataGabungan,
    rows: flagged,
  };
}

export function filterVerifikasiRows(
  rows: VerifikasiBaris[],
  filter: VerifikasiFilter,
  /** Pool warga aktif (untuk resolve WA via kepala keluarga). */
  pool?: VerifikasiKelengkapanSlice[],
): VerifikasiBaris[] {
  if (filter === "semua") return rows;
  if (filter === "pribadi") return rows.filter((r) => r.kurangPribadi.length > 0);
  if (filter === "keluarga") return rows.filter((r) => r.kurangKeluarga.length > 0);
  if (filter === "isu") return rows.filter((r) => r.issues.length > 0);
  if (filter === "tanpa_wa") {
    const sumber = pool ?? rows;
    return rows.filter((r) => resolveWaVerifikasi(r, sumber) === null);
  }
  return rows.filter((r) => r.issues.includes(filter));
}

export function ringkasKurang(b: VerifikasiBaris, maks = 4): string {
  const all = unikLabel([...b.kurangPribadi, ...b.kurangKeluarga]);
  if (!all.length) return "Perlu dicek";
  if (all.length <= maks) return all.join(" · ");
  return `${all.slice(0, maks).join(" · ")} · +${all.length - maks} lagi`;
}

export { TIER_FIELD_LABELS, WARGA_DATA_ISSUE_DEFS };
