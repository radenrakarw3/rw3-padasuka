/**
 * Konstanta & helper Karang Taruna RW 03 Padasuka.
 * Dipakai bersama oleh form publik (client) dan validasi/label (server + admin).
 */

/** RT yang boleh mendaftar Karang Taruna — seluruh RW 03 (01–07). */
export const KARANGTARUNA_RT_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;

export type KarangtarunaRtNumber = (typeof KARANGTARUNA_RT_NUMBERS)[number];

export function isKarangtarunaRt(rt: unknown): rt is KarangtarunaRtNumber {
  const n = typeof rt === "number" ? rt : parseInt(String(rt ?? ""), 10);
  return Number.isFinite(n) && (KARANGTARUNA_RT_NUMBERS as readonly number[]).includes(n);
}

/** Pilihan bidang keahlian / skill yang bisa diceritakan anggota. */
export const KARANGTARUNA_BIDANG_KEAHLIAN = [
  "Teknologi & IT",
  "Desain grafis",
  "Fotografi & videografi",
  "Musik & seni",
  "Olahraga",
  "Public speaking / MC",
  "Menulis & konten kreator",
  "Wirausaha & jualan",
  "Memasak & kuliner",
  "Keagamaan / dakwah",
  "Kesehatan & P3K",
  "Otomotif & mesin",
  "Pertukangan & bangunan",
  "Organisasi & kepemimpinan",
  "Mengajar / bimbingan belajar",
] as const;

/** Pilihan bidang kegiatan yang diminati untuk difasilitasi RW 03. */
export const KARANGTARUNA_BIDANG_MINAT = [
  "Olahraga",
  "Seni & budaya",
  "Keagamaan",
  "Sosial & kemanusiaan",
  "Digital & teknologi",
  "Wirausaha muda",
  "Lingkungan hidup",
  "Pendidikan & bimbel",
  "Kesehatan masyarakat",
] as const;

export const KARANGTARUNA_PENDIDIKAN = [
  "SD",
  "SMP",
  "SMA / SMK",
  "D1 / D2 / D3",
  "S1",
  "S2",
  "Lainnya",
] as const;

export const KARANGTARUNA_STATUS_AKTIVITAS = [
  { value: "pelajar", label: "Pelajar (SD/SMP/SMA)" },
  { value: "mahasiswa", label: "Mahasiswa" },
  { value: "bekerja", label: "Sudah bekerja" },
  { value: "wirausaha", label: "Wirausaha" },
  { value: "mencari_kerja", label: "Sedang mencari kerja" },
  { value: "lainnya", label: "Lainnya" },
] as const;

export const KARANGTARUNA_KETERSEDIAAN = [
  { value: "fleksibel", label: "Fleksibel / kapan saja" },
  { value: "akhir_pekan", label: "Akhir pekan" },
  { value: "hari_kerja_sore", label: "Hari kerja (sore / malam)" },
  { value: "kondisional", label: "Kondisional" },
] as const;

/** Status keanggotaan yang dikelola admin. */
export const KARANGTARUNA_STATUS_KEANGGOTAAN = ["baru", "aktif", "arsip"] as const;
export type KarangtarunaStatusKeanggotaan = (typeof KARANGTARUNA_STATUS_KEANGGOTAAN)[number];

export function karangtarunaStatusLabel(status: string): string {
  switch (status) {
    case "baru":
      return "Baru — belum diverifikasi";
    case "aktif":
      return "Anggota aktif";
    case "arsip":
      return "Arsip / nonaktif";
    default:
      return status;
  }
}

export function karangtarunaStatusAktivitasLabel(value?: string | null): string {
  if (!value) return "-";
  return KARANGTARUNA_STATUS_AKTIVITAS.find((s) => s.value === value)?.label ?? value;
}

export function karangtarunaKetersediaanLabel(value?: string | null): string {
  if (!value) return "-";
  return KARANGTARUNA_KETERSEDIAAN.find((s) => s.value === value)?.label ?? value;
}

/** Parse kolom JSON array (bidang keahlian / minat) menjadi array string. */
export function parseKarangtarunaTags(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x)).filter((x) => x.trim().length > 0);
    }
  } catch {
    // fallback: pemisah koma
    return trimmed
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

/** Serialisasi array tag menjadi JSON string untuk disimpan di kolom text. */
export function stringifyKarangtarunaTags(tags?: string[] | null): string {
  const clean = (tags ?? [])
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0)
    .slice(0, 20);
  return JSON.stringify(clean);
}
