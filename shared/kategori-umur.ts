/**
 * SSOT kategori umur warga RW 03 — master data yang mengindukkan aturan pekerjaan & statistik.
 * Disimpan di kolom warga.kategori_umur, dihitung ulang dari tanggal_lahir setiap simpan.
 */

import { getWargaAge } from "@shared/warga-form-tier";
export {
  PEKERJAAN_BIMBINGAN_ORANG_TUA,
  PEKERJAAN_PELAJAR,
  PEKERJAAN_PENSIUNAN,
} from "@shared/pekerjaan-status";
import {
  PEKERJAAN_BIMBINGAN_ORANG_TUA,
  PEKERJAAN_PELAJAR,
  PEKERJAAN_PENSIUNAN,
  resolvePekerjaanCanon,
} from "@shared/pekerjaan-status";

export const KATEGORI_UMUR_IDS = [
  "0-5",
  "6",
  "7-18",
  "19-25",
  "26-40",
  "41-55",
  "56-64",
  "65+",
  "belum_diisi",
] as const;

export type KategoriUmurId = (typeof KATEGORI_UMUR_IDS)[number];

/** ID kategori deprecated — masih bisa ada di DB lama. */
const LEGACY_KATEGORI_ALIASES: Record<string, KategoriUmurId> = {
  "6-17": "7-18",
  "18-25": "19-25",
};

export type KategoriUmurDef = {
  id: KategoriUmurId;
  label: string;
  shortLabel: string;
  minAge: number | null;
  maxAge: number | null;
  defaultPekerjaan: string | null;
  pekerjaanDisarankan: readonly string[];
  hitungPengangguran: boolean;
  isAnakRemaja: boolean;
  /** Usia 0–6 wajib pekerjaan «Bimbingan Orang Tua». */
  isBimbinganOrangTua: boolean;
  /** Usia 7–18 wajib pekerjaan «Pelajar». */
  isPelajar: boolean;
  /** Usia 65+ (lansia) wajib pekerjaan «Pensiunan», bukan pengangguran. */
  isPensiunan: boolean;
};

/** Usia 0–6 tahun — wajib tercatat sebagai bimbingan orang tua. */
export function isAnakKecilUsia(age: number | null): boolean {
  return age !== null && age >= 0 && age <= 6;
}

/** Normalisasi pekerjaan untuk balita & anak usia 6 (0–6). */
export function pekerjaanUntukUsiaAnakKecil(
  pekerjaan: string | null | undefined,
  age: number | null,
): string | undefined {
  if (!isAnakKecilUsia(age)) return undefined;
  const raw = (pekerjaan || "").trim();
  if (!raw || raw === "Belum/Tidak Bekerja" || raw !== PEKERJAAN_BIMBINGAN_ORANG_TUA) {
    return PEKERJAAN_BIMBINGAN_ORANG_TUA;
  }
  return undefined;
}

/** Usia 7–18 tahun — wajib tercatat sebagai pelajar. */
export function isPelajarUsia(age: number | null): boolean {
  return age !== null && age >= 7 && age <= 18;
}

/** Normalisasi pekerjaan untuk usia pelajar (7–18). */
export function pekerjaanUntukUsiaPelajar(
  pekerjaan: string | null | undefined,
  age: number | null,
): string | undefined {
  if (!isPelajarUsia(age)) return undefined;
  const raw = (pekerjaan || "").trim();
  if (!raw || raw === "Belum/Tidak Bekerja" || raw !== PEKERJAAN_PELAJAR) {
    return PEKERJAAN_PELAJAR;
  }
  return undefined;
}

/** Usia 65+ tahun (kategori Lansia) — wajib tercatat sebagai pensiunan. */
export function isLansiaUsia(age: number | null): boolean {
  return age !== null && age >= 65;
}

/** Normalisasi pekerjaan untuk lansia (65+). */
export function pekerjaanUntukUsiaLansia(
  pekerjaan: string | null | undefined,
  age: number | null,
): string | undefined {
  if (!isLansiaUsia(age)) return undefined;
  const raw = (pekerjaan || "").trim();
  if (!raw || raw === "Belum/Tidak Bekerja" || raw !== PEKERJAAN_PENSIUNAN) {
    return PEKERJAAN_PENSIUNAN;
  }
  return undefined;
}

export const KATEGORI_UMUR_MASTER: readonly KategoriUmurDef[] = [
  {
    id: "0-5",
    label: "Balita",
    shortLabel: "0–5 th",
    minAge: 0,
    maxAge: 5,
    defaultPekerjaan: PEKERJAAN_BIMBINGAN_ORANG_TUA,
    pekerjaanDisarankan: [PEKERJAAN_BIMBINGAN_ORANG_TUA],
    hitungPengangguran: false,
    isAnakRemaja: true,
    isBimbinganOrangTua: true,
    isPelajar: false,
    isPensiunan: false,
  },
  {
    id: "6",
    label: "Anak usia 6",
    shortLabel: "6 th",
    minAge: 6,
    maxAge: 6,
    defaultPekerjaan: PEKERJAAN_BIMBINGAN_ORANG_TUA,
    pekerjaanDisarankan: [PEKERJAAN_BIMBINGAN_ORANG_TUA],
    hitungPengangguran: false,
    isAnakRemaja: true,
    isBimbinganOrangTua: true,
    isPelajar: false,
    isPensiunan: false,
  },
  {
    id: "7-18",
    label: "Pelajar",
    shortLabel: "7–18 th",
    minAge: 7,
    maxAge: 18,
    defaultPekerjaan: PEKERJAAN_PELAJAR,
    pekerjaanDisarankan: [PEKERJAAN_PELAJAR],
    hitungPengangguran: false,
    isAnakRemaja: true,
    isBimbinganOrangTua: false,
    isPelajar: true,
    isPensiunan: false,
  },
  {
    id: "19-25",
    label: "Dewasa Muda",
    shortLabel: "19–25 th",
    minAge: 19,
    maxAge: 25,
    defaultPekerjaan: null,
    pekerjaanDisarankan: [],
    hitungPengangguran: true,
    isAnakRemaja: false,
    isBimbinganOrangTua: false,
    isPelajar: false,
    isPensiunan: false,
  },
  {
    id: "26-40",
    label: "Dewasa Produktif",
    shortLabel: "26–40 th",
    minAge: 26,
    maxAge: 40,
    defaultPekerjaan: null,
    pekerjaanDisarankan: [],
    hitungPengangguran: true,
    isAnakRemaja: false,
    isBimbinganOrangTua: false,
    isPelajar: false,
    isPensiunan: false,
  },
  {
    id: "41-55",
    label: "Dewasa Matang",
    shortLabel: "41–55 th",
    minAge: 41,
    maxAge: 55,
    defaultPekerjaan: null,
    pekerjaanDisarankan: [],
    hitungPengangguran: true,
    isAnakRemaja: false,
    isBimbinganOrangTua: false,
    isPelajar: false,
    isPensiunan: false,
  },
  {
    id: "56-64",
    label: "Pra-Lansia",
    shortLabel: "56–64 th",
    minAge: 56,
    maxAge: 64,
    defaultPekerjaan: null,
    pekerjaanDisarankan: ["Pensiunan"],
    hitungPengangguran: true,
    isAnakRemaja: false,
    isBimbinganOrangTua: false,
    isPelajar: false,
    isPensiunan: false,
  },
  {
    id: "65+",
    label: "Lansia",
    shortLabel: "65+ th",
    minAge: 65,
    maxAge: null,
    defaultPekerjaan: PEKERJAAN_PENSIUNAN,
    pekerjaanDisarankan: [PEKERJAAN_PENSIUNAN],
    hitungPengangguran: false,
    isAnakRemaja: false,
    isBimbinganOrangTua: false,
    isPelajar: false,
    isPensiunan: true,
  },
  {
    id: "belum_diisi",
    label: "Usia belum diisi",
    shortLabel: "Belum diisi",
    minAge: null,
    maxAge: null,
    defaultPekerjaan: null,
    pekerjaanDisarankan: [],
    hitungPengangguran: true,
    isAnakRemaja: false,
    isBimbinganOrangTua: false,
    isPelajar: false,
    isPensiunan: false,
  },
];

const BY_ID = new Map<KategoriUmurId, KategoriUmurDef>(
  KATEGORI_UMUR_MASTER.map((d) => [d.id, d]),
);

export function normalizeKategoriUmurId(id: string | null | undefined): KategoriUmurId {
  const key = (id || "belum_diisi").trim();
  if (BY_ID.has(key as KategoriUmurId)) return key as KategoriUmurId;
  return LEGACY_KATEGORI_ALIASES[key] ?? "belum_diisi";
}

export function getKategoriUmurDef(id: string | null | undefined): KategoriUmurDef {
  return BY_ID.get(normalizeKategoriUmurId(id)) ?? BY_ID.get("belum_diisi")!;
}

export const KATEGORI_UMUR_ORDER: readonly KategoriUmurId[] = KATEGORI_UMUR_IDS;

export function resolveKategoriUmurFromAge(age: number | null): KategoriUmurId {
  if (age === null) return "belum_diisi";
  if (age <= 5) return "0-5";
  if (age === 6) return "6";
  if (age <= 18) return "7-18";
  if (age <= 25) return "19-25";
  if (age <= 40) return "26-40";
  if (age <= 55) return "41-55";
  if (age < 65) return "56-64";
  return "65+";
}

export function resolveKategoriUmur(tanggalLahir: string | null | undefined): KategoriUmurId {
  return resolveKategoriUmurFromAge(getWargaAge(tanggalLahir));
}

export type WargaKategoriSlice = {
  kategoriUmur?: string | null;
  tanggalLahir?: string | null;
};

export function getEffectiveKategoriUmur(w: WargaKategoriSlice): KategoriUmurId {
  const fromTl = resolveKategoriUmur(w.tanggalLahir);
  const stored = normalizeKategoriUmurId(w.kategoriUmur);
  if (fromTl !== "belum_diisi" && stored !== fromTl) return fromTl;
  return stored;
}

export function buildKelompokUsiaMap(
  rows: WargaKategoriSlice[],
): Record<string, number> {
  const map: Record<string, number> = Object.fromEntries(
    KATEGORI_UMUR_ORDER.map((id) => [id, 0]),
  );
  for (const w of rows) {
    const id = getEffectiveKategoriUmur(w);
    map[id] = (map[id] ?? 0) + 1;
  }
  return map;
}

export type KategoriUmurDisplayItem = {
  id: KategoriUmurId;
  label: string;
  shortLabel: string;
  count: number;
  isPelajar: boolean;
  chartLabel: string;
  description: string;
};

/** Data tampilan dashboard — selalu dari tanggal lahir efektif, bukan cache API lama. */
export function buildKategoriUmurDisplayItems(
  rows: WargaKategoriSlice[],
): KategoriUmurDisplayItem[] {
  const map = buildKelompokUsiaMap(rows);
  return KATEGORI_UMUR_ORDER.filter(
    (id) => id !== "belum_diisi" || (map[id] ?? 0) > 0,
  ).map((id) => {
    const def = getKategoriUmurDef(id);
    const count = map[id] ?? 0;
    let description = def.shortLabel;
    if (def.isPelajar) {
      description = `Wajib pekerjaan ${PEKERJAAN_PELAJAR}`;
    } else if (def.isBimbinganOrangTua) {
      description = `Wajib pekerjaan ${PEKERJAAN_BIMBINGAN_ORANG_TUA}`;
    } else if (def.isPensiunan) {
      description = `Wajib pekerjaan ${PEKERJAAN_PENSIUNAN}`;
    } else if (def.defaultPekerjaan) {
      description = `${def.shortLabel} · ${def.defaultPekerjaan}`;
    }
    return {
      id,
      label: def.label,
      shortLabel: def.shortLabel,
      count,
      isPelajar: def.isPelajar,
      chartLabel: def.isPelajar ? `Pelajar (${def.shortLabel})` : `${def.label}`,
      description,
    };
  });
}

export function isKategoriEligiblePengangguran(w: WargaKategoriSlice): boolean {
  return getKategoriUmurDef(getEffectiveKategoriUmur(w)).hitungPengangguran;
}

export function applyKategoriUmurDefaults(
  kategoriId: KategoriUmurId,
  current: { pekerjaan?: string | null; pendidikan?: string | null },
): { pekerjaan?: string; pendidikan?: string } {
  const def = getKategoriUmurDef(kategoriId);
  const out: { pekerjaan?: string; pendidikan?: string } = {};

  if (def.isPelajar) {
    const fix = pekerjaanUntukUsiaPelajar(current.pekerjaan, 7);
    if (fix) out.pekerjaan = fix;
  } else if (def.isBimbinganOrangTua) {
    const fix = pekerjaanUntukUsiaAnakKecil(current.pekerjaan, def.maxAge ?? 0);
    if (fix) out.pekerjaan = fix;
  } else if (def.isPensiunan) {
    const fix = pekerjaanUntukUsiaLansia(current.pekerjaan, 65);
    if (fix) out.pekerjaan = fix;
  } else if (!current.pekerjaan?.trim() && def.defaultPekerjaan) {
    out.pekerjaan = def.defaultPekerjaan;
  }

  if (kategoriId === "0-5" && !current.pendidikan?.trim()) {
    out.pendidikan = "Belum Sekolah";
  }
  if (kategoriId === "6" && !current.pendidikan?.trim()) {
    out.pendidikan = "Belum Sekolah";
  }
  if (kategoriId === "7-18" && !current.pendidikan?.trim()) {
    out.pendidikan = "SD";
  }

  return out;
}

/** Pekerjaan wajib untuk kategori umur (null jika bebas). */
export function pekerjaanWajibUntukKategori(kategoriId: KategoriUmurId): string | null {
  const def = getKategoriUmurDef(kategoriId);
  if (def.isPelajar) return PEKERJAAN_PELAJAR;
  if (def.isBimbinganOrangTua) return PEKERJAAN_BIMBINGAN_ORANG_TUA;
  if (def.isPensiunan) return PEKERJAAN_PENSIUNAN;
  return null;
}

function normalizePekerjaanUntukValidasiKategori(pekerjaan: string): string {
  const canon = resolvePekerjaanCanon(pekerjaan);
  if (canon !== pekerjaan) return canon;
  const job = pekerjaan.toLowerCase();
  if (job === "pelajar/mahasiswa" || job.includes("mahasiswa")) return PEKERJAAN_PELAJAR;
  return pekerjaan;
}

export function isPekerjaanSalahUntukKategori(
  pekerjaan: string | null | undefined,
  kategoriId: KategoriUmurId,
): boolean {
  const wajib = pekerjaanWajibUntukKategori(kategoriId);
  if (!wajib) return false;
  const raw = (pekerjaan || "").trim();
  if (!raw) return false;
  return normalizePekerjaanUntukValidasiKategori(raw) !== wajib;
}
