/** Rating & kritik saran warga untuk RT / RW — rahasia, tidak ditampilkan publik.
 * Kompetisi dihitung per bulan (WIB); setiap bulan ranking dimulai ulang. Data lama tetap tersimpan untuk laporan reward.
 */

export const SASARAN_RATING = ["rt", "rw"] as const;
export type SasaranRating = (typeof SASARAN_RATING)[number];

export const SASARAN_RATING_INFO: Record<
  SasaranRating,
  { label: string; deskripsi: string }
> = {
  rt: {
    label: "Rating RT",
    deskripsi: "Nilai kinerja dan pelayanan ketua RT di wilayah Anda (periode bulan berjalan).",
  },
  rw: {
    label: "Rating RW",
    deskripsi: "Nilai kinerja dan pelayanan pengurus RW 03 (periode bulan berjalan).",
  },
};

/** Periode kompetisi: YYYY-MM (zona Asia/Jakarta). */
export function bulanRatingSekarang(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 7);
}

export function isBulanRating(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function labelBulanRating(bulan: string): string {
  if (!isBulanRating(bulan)) return bulan;
  const [y, m] = bulan.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Batas tanggal inklusif/eksklusif untuk filter SQL (WIB). */
export function rentangBulanRating(bulan: string): { mulai: string; selesai: string; label: string } {
  if (!isBulanRating(bulan)) {
    const sekarang = bulanRatingSekarang();
    return rentangBulanRating(sekarang);
  }
  const [y, m] = bulan.split("-").map(Number);
  const mulai = `${bulan}-01`;
  const selesai =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { mulai, selesai, label: labelBulanRating(bulan) };
}

/** true jika bulan sudah lewat (bukan bulan berjalan) — cocok untuk laporan reward. */
export function bulanRatingSelesai(bulan: string, now = new Date()): boolean {
  if (!isBulanRating(bulan)) return false;
  return bulan < bulanRatingSekarang(now);
}

export const BINTANG_RATING = [1, 2, 3, 4, 5] as const;
export type BintangRating = (typeof BINTANG_RATING)[number];

export const BINTANG_RATING_LABEL: Record<BintangRating, string> = {
  1: "Sangat kurang",
  2: "Kurang",
  3: "Cukup",
  4: "Baik",
  5: "Sangat baik",
};

export const MAKS_ISI_RATING = 1000;
export const MIN_ISI_RATING = 5;

export function isSasaranRating(v: unknown): v is SasaranRating {
  return typeof v === "string" && (SASARAN_RATING as readonly string[]).includes(v);
}

export function isBintangRating(v: unknown): v is BintangRating {
  return typeof v === "number" && (BINTANG_RATING as readonly number[]).includes(v);
}
