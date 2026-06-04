/**
 * SSOT: status kependudukan & jenis peristiwa (admin / statistik).
 * Nilai legacy "Pindah" diperlakukan sebagai pindah keluar.
 */

export const STATUS_KEPENDUDUKAN_AKTIF = "Aktif";
export const STATUS_KEPENDUDUKAN_LAHIR = "Lahir";
export const STATUS_KEPENDUDUKAN_PINDAH_MASUK = "Pindah Masuk";
export const STATUS_KEPENDUDUKAN_PINDAH_KELUAR = "Pindah Keluar";
export const STATUS_KEPENDUDUKAN_PINDAH_LEGACY = "Pindah";
export const STATUS_KEPENDUDUKAN_MENINGGAL = "Meninggal";

/** Semua nilai yang boleh disimpan di kolom status_kependudukan. */
export const STATUS_KEPENDUDUKAN_ALL = [
  STATUS_KEPENDUDUKAN_AKTIF,
  STATUS_KEPENDUDUKAN_LAHIR,
  STATUS_KEPENDUDUKAN_PINDAH_MASUK,
  STATUS_KEPENDUDUKAN_PINDAH_KELUAR,
  STATUS_KEPENDUDUKAN_PINDAH_LEGACY,
  STATUS_KEPENDUDUKAN_MENINGGAL,
] as const;

export type PeristiwaKependudukanType = "lahir" | "pindah_masuk" | "pindah_keluar" | "meninggal";

export const PERISTIWA_KEPENDUDUKAN: {
  type: PeristiwaKependudukanType;
  label: string;
  description: string;
  statusBaru: string;
}[] = [
  {
    type: "lahir",
    label: "Kelahiran",
    description: "Bayi baru lahir — tambah anggota KK (status Lahir, bisa dilengkapi ke Aktif)",
    statusBaru: STATUS_KEPENDUDUKAN_LAHIR,
  },
  {
    type: "pindah_masuk",
    label: "Pindah masuk",
    description: "Warga datang ke RW/KK ini dari domisili lain",
    statusBaru: STATUS_KEPENDUDUKAN_PINDAH_MASUK,
  },
  {
    type: "pindah_keluar",
    label: "Pindah keluar",
    description: "Warga pindah domisili keluar dari KK di RW ini",
    statusBaru: STATUS_KEPENDUDUKAN_PINDAH_KELUAR,
  },
  {
    type: "meninggal",
    label: "Meninggal",
    description: "Warga meninggal dunia — data tetap di arsip",
    statusBaru: STATUS_KEPENDUDUKAN_MENINGGAL,
  },
];

/** Normalisasi tampilan (legacy → label standar). */
export function labelStatusKependudukan(status: string | null | undefined): string {
  const s = (status || STATUS_KEPENDUDUKAN_AKTIF).trim();
  if (s === STATUS_KEPENDUDUKAN_PINDAH_LEGACY) return STATUS_KEPENDUDUKAN_PINDAH_KELUAR;
  return s || STATUS_KEPENDUDUKAN_AKTIF;
}

/** Masih dihitung domisili / kelengkapan profil KK. */
export function isWargaDomisiliAktif(status: string | null | undefined): boolean {
  const s = (status || STATUS_KEPENDUDUKAN_AKTIF).trim();
  return (
    s === STATUS_KEPENDUDUKAN_AKTIF ||
    s === STATUS_KEPENDUDUKAN_LAHIR ||
    s === STATUS_KEPENDUDUKAN_PINDAH_MASUK
  );
}

export function isPindahKeluar(status: string | null | undefined): boolean {
  const s = (status || "").trim();
  return s === STATUS_KEPENDUDUKAN_PINDAH_KELUAR || s === STATUS_KEPENDUDUKAN_PINDAH_LEGACY;
}

export type PeristiwaCounts = {
  aktif: number;
  lahir: number;
  pindahMasuk: number;
  pindahKeluar: number;
  meninggal: number;
  domisiliAktif: number;
};

export function countPeristiwaKependudukan(
  rows: { statusKependudukan?: string | null }[],
): PeristiwaCounts {
  let aktif = 0;
  let lahir = 0;
  let pindahMasuk = 0;
  let pindahKeluar = 0;
  let meninggal = 0;

  for (const w of rows) {
    const s = (w.statusKependudukan || STATUS_KEPENDUDUKAN_AKTIF).trim();
    if (s === STATUS_KEPENDUDUKAN_MENINGGAL) meninggal++;
    else if (s === STATUS_KEPENDUDUKAN_PINDAH_MASUK) pindahMasuk++;
    else if (isPindahKeluar(s)) pindahKeluar++;
    else if (s === STATUS_KEPENDUDUKAN_LAHIR) lahir++;
    else aktif++;
  }

  return {
    aktif,
    lahir,
    pindahMasuk,
    pindahKeluar,
    meninggal,
    domisiliAktif: aktif + lahir + pindahMasuk,
  };
}
