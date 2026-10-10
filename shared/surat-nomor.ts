export const JENIS_SURAT_RW = [
  "Surat Undangan",
  "Surat Undangan Klarifikasi",
  "Surat Tugas",
  "Surat Permohonan Audiensi",
  "Surat Pengajuan Perbaikan",
  "Surat Pengajuan",
  "Surat Permohonan Bantuan",
  "Surat Edaran",
] as const;

export function bulanRomawi(bulan: number): string {
  const r = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return r[Math.max(0, Math.min(11, bulan - 1))];
}

export function kodeSuratRw(jenisSurat: string): string {
  const n = jenisSurat.toLowerCase();
  if (n.includes("undangan klarifikasi")) return "UND-KLR";
  if (n.includes("undangan")) return "UND";
  if (n.includes("tugas")) return "ST";
  if (n.includes("audiensi")) return "AUD";
  if (n.includes("pengajuan perbaikan")) return "PGJ-PBK";
  if (n.includes("pengajuan")) return "PGJ";
  if (n.includes("bantuan")) return "PMB";
  if (n.includes("edaran")) return "SE";
  return "ADM";
}

export function formatNomorSuratRw(urut: number, jenisSurat: string, tanggal: Date): string {
  return formatNomorKode(urut, kodeSuratRw(jenisSurat), tanggal.getFullYear(), tanggal.getMonth() + 1);
}

/** Surat Sakti v2: kode dari registry (nomorKode). Urutan tahunan dipakai bersama semua jenis. */
export function formatNomorKode(urut: number, kode: string, tahun: number, bulan: number): string {
  const seq = String(urut).padStart(3, "0");
  return `${seq}/${kode}/RW.03/KEL.PADASUKA/KEC.CIMAHI-TENGAH/KOTA.CIMAHI/${bulanRomawi(bulan)}/${tahun}`;
}
