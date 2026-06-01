export type {
  Visitrw3Tarif,
  KontribusiRincian,
  KontribusiSettings,
  UkuranProperti,
} from "@shared/visitrw3-kontribusi";

export {
  parseTarifFromSettings,
  parseKontribusiSettings,
  getUkuranProperti,
  labelUkuranProperti,
  diffDaysInclusive,
  hitungEstimasiPenyewa,
  hitungEstimasiPemilik,
} from "@shared/visitrw3-kontribusi";

export function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export type Visitrw3SettingsMap = Record<string, string>;

export function settingsRowsToMap(rows: { key: string; value: string }[]): Visitrw3SettingsMap {
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function getSettingsVersiFromRows(rows: { updatedAt?: Date | string | null }[]): string {
  let max = "";
  for (const r of rows) {
    if (!r.updatedAt) continue;
    const iso = r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt);
    if (iso > max) max = iso;
  }
  return max || new Date().toISOString();
}
