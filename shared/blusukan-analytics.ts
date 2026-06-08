import { detectWargaDataIssues, type WargaIssueSlice } from "@shared/warga-data-issues";
import type { Warga } from "@shared/schema";

/** Petakan warga DB ke slice verifikasi data (Blusukan / admin). */
export function mapWargaToIssueSlice(w: Warga, rt: number): WargaIssueSlice {
  return {
    id: w.id,
    kkId: w.kkId,
    rt,
    namaLengkap: w.namaLengkap,
    nik: w.nik,
    kedudukanKeluarga: w.kedudukanKeluarga,
    tanggalLahir: w.tanggalLahir,
    kategoriUmur: w.kategoriUmur,
    pekerjaan: w.pekerjaan,
    statusPekerjaan: w.statusPekerjaan,
    nomorWhatsapp: w.nomorWhatsapp,
  };
}

export function countAnggotaBermasalah(anggota: Warga[], rt: number): number {
  let n = 0;
  for (const w of anggota) {
    if (detectWargaDataIssues(mapWargaToIssueSlice(w, rt)).length > 0) n++;
  }
  return n;
}

export function summarizeAnggotaIssues(anggota: Warga[], rt: number): string[] {
  const labels: string[] = [];
  for (const w of anggota) {
    const issues = detectWargaDataIssues(mapWargaToIssueSlice(w, rt));
    if (issues.length === 0) continue;
    labels.push(`${w.namaLengkap}: ${issues.length} masalah`);
  }
  return labels;
}
