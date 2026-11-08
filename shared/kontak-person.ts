/** Opsi keperluan kontak person — data publik (tanpa nomor pengurus). */

export const KEPERLUAN_KONTAK = [
  "rt_1",
  "rt_2",
  "rt_3",
  "rt_4",
  "pelayanan_rw",
  "danru_linmas",
  "darurat",
] as const;

export type KeperluanKontak = (typeof KEPERLUAN_KONTAK)[number];

export const KEPERLUAN_KONTAK_INFO: Record<
  KeperluanKontak,
  { label: string; deskripsi: string; mode: "wa" | "langsung" }
> = {
  rt_1: {
    label: "Ketua RT 01",
    deskripsi: "Urusan warga RT 01 — koordinasi lingkungan atau pelayanan tingkat RT.",
    mode: "wa",
  },
  rt_2: {
    label: "Ketua RT 02",
    deskripsi: "Urusan warga RT 02 — koordinasi lingkungan atau pelayanan tingkat RT.",
    mode: "wa",
  },
  rt_3: {
    label: "Ketua RT 03",
    deskripsi: "Urusan warga RT 03 — koordinasi lingkungan atau pelayanan tingkat RT.",
    mode: "wa",
  },
  rt_4: {
    label: "Ketua RT 04",
    deskripsi: "Urusan warga RT 04 — koordinasi lingkungan atau pelayanan tingkat RT.",
    mode: "wa",
  },
  pelayanan_rw: {
    label: "Pelayanan RW (tanda tangan / cap)",
    deskripsi: "Pengurusan surat, tanda tangan, atau cap RW 03.",
    mode: "wa",
  },
  danru_linmas: {
    label: "Danru Linmas",
    deskripsi: "Keamanan lingkungan, ronda, atau gangguan ketertiban di wilayah RW 03.",
    mode: "wa",
  },
  darurat: {
    label: "Nomor darurat",
    deskripsi: "Kebakaran, bencana, polisi, medis, listrik, dan layanan darurat Cimahi.",
    mode: "langsung",
  },
};

/** Nomor darurat boleh ditampilkan di situs (bukan nomor pribadi pengurus). */
export const NOMOR_DARURAT = [
  { nama: "Call Center Darurat Cimahi (Campernik)", nomor: "112", catatan: "Semua keadaan darurat" },
  { nama: "BPBD Kota Cimahi", nomor: "02220661899", catatan: null },
  { nama: "Call Center Polisi", nomor: "110", catatan: null },
  { nama: "Polsek Cimahi", nomor: "0226634997", catatan: null },
  { nama: "PSC Medis Cimahi", nomor: "119", catatan: null },
  { nama: "PMI Kota Cimahi", nomor: "0226654203", catatan: null },
  { nama: "SAR / Basarnas Kota Cimahi", nomor: "115", catatan: null },
  { nama: "PLN Kota Cimahi", nomor: "022123", catatan: null },
] as const;

export function isKeperluanKontak(v: unknown): v is KeperluanKontak {
  return typeof v === "string" && (KEPERLUAN_KONTAK as readonly string[]).includes(v);
}
