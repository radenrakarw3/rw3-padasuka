/** Kertas cetak RW 03: F4 (215 x 330 mm, 80 gsm) di printer Epson L3210 (tidak bisa cetak sampai tepi). */
export const F4 = { w: 215, h: 330, margin: 10 } as const;

/**
 * A4 standar (210 × 297 mm). Cocok kertas 75 gsm di Epson L3210.
 * Margin default 12 mm — aman dari area non-cetak printer inkjet.
 */
export const A4 = { w: 210, h: 297, margin: 12 } as const;

export type UkuranKertas = { w: number; h: number; margin: number };

export const SITUS_PENDEK = "rw3padasukacimahi.org";
