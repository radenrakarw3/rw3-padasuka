import { joinPlatNomor, parsePlatNomor, type PlatParts } from "./visitrw3-plat";
import {
  formatKendaraanBaris,
  kendaraanBerplat,
  parseKendaraan,
  serializeKendaraan,
  validateKendaraan,
  type KendaraanData,
  type StatusKendaraan,
} from "@shared/visitrw3-kendaraan";

export type KendaraanRow = {
  jenis: string;
  plat: string;
  platParts: PlatParts;
  merek: string;
  warna: string;
  status: StatusKendaraan | "";
  atasNama: string;
  leasing: string;
  lunasPada: string;
};

export function emptyKendaraanRow(atasNama = ""): KendaraanRow {
  const platParts = { daerah: "", angka: "", belakang: "" };
  return { jenis: "", plat: "", platParts, merek: "", warna: "", status: "", atasNama, leasing: "", lunasPada: "" };
}

export function kendaraanWithPlatParts(row: Partial<KendaraanRow> & { jenis?: string; plat?: string }): KendaraanRow {
  const platParts = row.platParts ?? parsePlatNomor(row.plat);
  const plat = joinPlatNomor(platParts) || row.plat || "";
  return { ...emptyKendaraanRow(), ...row, jenis: row.jenis || "", plat, platParts };
}

export function kendaraanRowKeData(k: KendaraanRow): KendaraanData {
  return {
    jenis: k.jenis.trim(),
    platNomor: kendaraanBerplat(k.jenis) ? (joinPlatNomor(k.platParts) || k.plat).trim() || null : null,
    merek: k.merek,
    warna: k.warna,
    status: k.status || null,
    atasNama: k.atasNama,
    leasing: k.leasing,
    lunasPada: k.lunasPada,
  };
}

export function validateKendaraanRow(k: KendaraanRow, no: number): string | null {
  return validateKendaraan(kendaraanRowKeData(k), no);
}

/** Untuk kirim ke API; `punya` = jawaban eksplisit penghuni. */
export function serializeKendaraanForApi(list: KendaraanRow[], punya = list.length > 0) {
  const data = punya ? list.map(kendaraanRowKeData).filter((k) => k.jenis) : [];
  return {
    punyaKendaraan: punya,
    jenisKendaraan: serializeKendaraan(data),
    platNomor: data.map((k) => k.platNomor).filter(Boolean).join("; ") || null,
  };
}

/** Tampilan admin / status. */
export function formatKendaraanDisplay(jenisKendaraan?: string | null, platNomor?: string | null): string | null {
  const list = parseKendaraan(jenisKendaraan, platNomor);
  if (!list.length) return null;
  if (list.length === 1) return formatKendaraanBaris(list[0]);
  return list.map((k, i) => `${i + 1}. ${formatKendaraanBaris(k)}`).join(" · ");
}
