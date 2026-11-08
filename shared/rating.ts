/** Rating & kritik saran warga untuk RT / RW — rahasia, tidak ditampilkan publik. */

export const SASARAN_RATING = ["rt", "rw"] as const;
export type SasaranRating = (typeof SASARAN_RATING)[number];

export const SASARAN_RATING_INFO: Record<
  SasaranRating,
  { label: string; deskripsi: string }
> = {
  rt: {
    label: "Rating RT",
    deskripsi: "Nilai kinerja dan pelayanan ketua RT di wilayah Anda.",
  },
  rw: {
    label: "Rating RW",
    deskripsi: "Nilai kinerja dan pelayanan pengurus RW 03.",
  },
};

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
