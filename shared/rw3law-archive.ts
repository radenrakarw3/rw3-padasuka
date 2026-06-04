/** Penomeran, versi, dan label arsip peraturan RW3LAW. */

export type Rw3lawRevisiRingkas = {
  id: number;
  slug: string;
  judul: string;
  nomorPeraturan: number | null;
  tahunNomor: number | null;
  label: string;
};

/** Tahun penomeran: dari tanggal berlaku, atau tahun persetujuan / sekarang. */
export function resolveTahunNomor(
  tanggalBerlaku: string | null | undefined,
  disetujuiAt?: Date | string | null,
): number {
  const y = tanggalBerlaku?.trim().slice(0, 4);
  if (y && /^\d{4}$/.test(y)) return parseInt(y, 10);
  if (disetujuiAt) {
    const d = new Date(disetujuiAt);
    if (!Number.isNaN(d.getTime())) return d.getFullYear();
  }
  return new Date().getFullYear();
}

export function formatNomorPeraturan(
  nomor: number | null | undefined,
  tahun: number | null | undefined,
): string | null {
  if (nomor == null || tahun == null) return null;
  return `${nomor}/${tahun}`;
}

export function formatNomorPeraturanLengkap(
  nomor: number | null | undefined,
  tahun: number | null | undefined,
): string | null {
  if (nomor == null || tahun == null) return null;
  return `Nomor ${nomor} Tahun ${tahun}`;
}

export function defaultVersiBaru(): string {
  return "1.0";
}

/** Naikkan versi: minor 1.0→1.1, major 1.2→2.0 */
export function bumpRw3lawVersi(
  versi: string | null | undefined,
  mode: "minor" | "major" = "minor",
): string {
  const raw = (versi ?? defaultVersiBaru()).trim();
  const m = raw.match(/^(\d+)\.(\d+)$/);
  if (!m) return defaultVersiBaru();
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  if (mode === "major") return `${major + 1}.0`;
  return `${major}.${minor + 1}`;
}

export function labelRevisiDari(meta: Rw3lawRevisiRingkas | null | undefined): string | null {
  if (!meta) return null;
  return meta.label;
}

export function groupByTahunNomor<T extends { tahunNomor?: number | null }>(
  items: T[],
): { tahun: number; items: T[] }[] {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const tahun = item.tahunNomor ?? 0;
    const bucket = map.get(tahun) ?? [];
    bucket.push(item);
    map.set(tahun, bucket);
  }
  return [...map.entries()]
    .filter(([t]) => t > 0)
    .sort((a, b) => b[0] - a[0])
    .map(([tahun, bucket]) => ({
      tahun,
      items: [...bucket].sort((a, b) => {
        const na = (a as { nomorPeraturan?: number | null }).nomorPeraturan ?? 0;
        const nb = (b as { nomorPeraturan?: number | null }).nomorPeraturan ?? 0;
        return nb - na;
      }),
    }));
}
