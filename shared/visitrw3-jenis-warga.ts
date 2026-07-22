import { JENIS_WARGA_VALUES, type JenisWarga } from "./schema";

export { JENIS_WARGA_VALUES, type JenisWarga };

export const JENIS_WARGA_LABEL: Record<JenisWarga, string> = {
  kontrak: "Ngontrak",
  kost: "Ngekost",
  jualan: "Jualan",
};

export const JENIS_WARGA_DESKRIPSI: Record<JenisWarga, string> = {
  kontrak: "Sewa rumah/kontrakan — data keluarga yang tinggal bersama",
  kost: "Sewa kamar kost — fokus nomor kamar & data penghuni",
  jualan: "Izin berjualan / usaha di wilayah RW 03 (lewat RW3BIZ)",
};


export function isJenisWarga(v: unknown): v is JenisWarga {
  return typeof v === "string" && (JENIS_WARGA_VALUES as readonly string[]).includes(v);
}

export function keperluanFromJenisWarga(jenis: JenisWarga): "tinggal" | "bisnis" {
  return jenis === "jualan" ? "bisnis" : "tinggal";
}

export function labelJenisWarga(jenis: string | null | undefined): string {
  if (jenis && isJenisWarga(jenis)) return JENIS_WARGA_LABEL[jenis];
  return jenis?.trim() || "—";
}
