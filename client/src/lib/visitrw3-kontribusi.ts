export type {
  Visitrw3Tarif,
  KontribusiRincian,
  KontribusiSettings,
  UkuranProperti,
  KontribusiSatuan,
  KontribusiSurveyRincian,
} from "@shared/visitrw3-kontribusi";

import type { KontribusiSatuan } from "@shared/visitrw3-kontribusi";
import { KONTRIBUSI_SATUAN_LABEL } from "@shared/visitrw3-kontribusi";

export {
  parseTarifFromSettings,
  parseKontribusiSettings,
  getUkuranProperti,
  labelUkuranProperti,
  diffDaysInclusive,
  hitungEstimasiPenyewa,
  hitungEstimasiPemilik,
  UKURAN_TINGGAL_VALUES,
  isUkuranTinggal,
  infoUkuranTinggal,
  labelUkuranTinggal,
  tarifTinggalPerBulan,
  hitungKontribusiTinggal,
  KONTRIBUSI_SATUAN_VALUES,
  KONTRIBUSI_SATUAN_LABEL,
  suggestedSatuanFromRincian,
  parseKontribusiSurveyRincian,
} from "@shared/visitrw3-kontribusi";

export function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Tampilan input nominal — pemisah ribuan titik (65.000). */
export function formatNominalInput(digits: string): string {
  const n = digits.replace(/\D/g, "");
  if (!n) return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(n, 10));
}

export function parseNominalInput(value: string): number {
  const n = parseInt(value.replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

export function formatTarifKontribusi(nominal: number, satuan: KontribusiSatuan): string {
  const label = KONTRIBUSI_SATUAN_LABEL[satuan].toLowerCase();
  return `${formatRupiah(nominal)} ${label}`;
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
