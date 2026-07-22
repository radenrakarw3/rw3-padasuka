/** Peran / jalur publik Visit RW3 — warga singgah langsung. */
import type { JenisWarga } from "@shared/visitrw3-jenis-warga";
import { isJenisWarga } from "@shared/visitrw3-jenis-warga";

export type Visitrw3PeranPublik = JenisWarga;

export const VISITRW3_ROUTES = {
  hub: "/visitrw3",
  panduan: "/visitrw3/panduan",
  pengajuan: "/visitrw3/pengajuan",
  perpanjang: "/visitrw3/perpanjang",
  status: "/visitrw3/status",
  kontrak: {
    hub: "/visitrw3?fokus=kontrak",
    pengajuan: "/visitrw3/pengajuan?jenis=kontrak",
  },
  kost: {
    hub: "/visitrw3?fokus=kost",
    pengajuan: "/visitrw3/pengajuan?jenis=kost",
  },
  /** @deprecated Jualan pindah ke RW3BIZ */
  jualan: {
    hub: "/rw3biz",
    pengajuan: "/rw3biz/pengajuan",
  },
  admin: {
    landing: "/admin/visitrw3",
    antrianSurvey: "/admin/visitrw3/antrian?view=belum",
    antrianSudahLolos: "/admin/visitrw3/antrian?view=sudah",
    penghuni: "/admin/visitrw3/penghuni",
    kalender: "/admin/visitrw3/kalender",
    dashboard: "/admin/visitrw3/dashboard",
    pengaturan: "/admin/visitrw3/pengaturan",
  },
} as const;

export function pengajuanPublicHref(jenis?: string | null): string {
  if (jenis === "jualan") return "/rw3biz/pengajuan";
  if (jenis && isJenisWarga(jenis) && jenis !== "jualan") {
    return `/visitrw3/pengajuan?jenis=${jenis}`;
  }
  return VISITRW3_ROUTES.pengajuan;
}

export function parseJenisWargaFromSearch(search: string): JenisWarga | "" {
  const jenis = new URLSearchParams(search).get("jenis");
  return jenis && isJenisWarga(jenis) ? jenis : "";
}

/** @deprecated */
export function parsePengajuanMode(_search: string): "" {
  return "";
}

/** @deprecated */
export function daftarPropertiPublicHref(): string {
  return VISITRW3_ROUTES.hub;
}

/** @deprecated */
export function hubForPeran(jenis: JenisWarga): string {
  return pengajuanPublicHref(jenis);
}
