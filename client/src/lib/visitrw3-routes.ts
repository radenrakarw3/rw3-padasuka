/** Peran publik Visit RW3 — menentukan menu & alur formulir. */
export type Visitrw3PeranPublik = "usaha_rumahan" | "pemilik_disewa" | "penyewa";

export const VISITRW3_ROUTES = {
  hub: "/visitrw3",
  panduan: "/visitrw3/panduan",
  usahaRumahan: {
    hub: "/visitrw3/usaha-rumahan",
    daftarProperti: "/visitrw3/daftar-properti?jenis=usaha_rumahan",
    pengajuan: "/visitrw3/pengajuan?mode=usaha_rumahan",
    statusProperti: "/visitrw3/status-properti",
    statusPengajuan: "/visitrw3/status",
    perpanjang: "/visitrw3/perpanjang",
  },
  pemilikDisewa: {
    hub: "/visitrw3/pemilik",
    daftarProperti: "/visitrw3/daftar-properti",
    statusProperti: "/visitrw3/status-properti",
  },
  penyewa: {
    hub: "/visitrw3/penyewa",
    pengajuan: "/visitrw3/pengajuan",
    perpanjang: "/visitrw3/perpanjang",
    status: "/visitrw3/status",
  },
  admin: {
    landing: "/admin/visitrw3",
    properti: "/admin/visitrw3/properti",
    antrianProperti: "/admin/visitrw3/antrian?tab=properti&view=belum",
    antrianSurvey: "/admin/visitrw3/antrian?tab=pengajuan&view=belum",
    antrianSudahLolos: "/admin/visitrw3/antrian?view=sudah",
    penghuni: "/admin/visitrw3/penghuni",
    kalender: "/admin/visitrw3/kalender",
    dashboard: "/admin/visitrw3/dashboard",
    pengaturan: "/admin/visitrw3/pengaturan",
  },
} as const;

export const VISITRW3_PERAN_LABEL: Record<Visitrw3PeranPublik, string> = {
  usaha_rumahan: "Usaha di rumah sendiri",
  pemilik_disewa: "Pemilik properti (disewakan)",
  penyewa: "Penyewa / penghuni",
};

export function pengajuanPublicHref(mode?: string | null, propNomor?: string | null): string {
  if (mode === "usaha_rumahan") {
    const base = VISITRW3_ROUTES.usahaRumahan.pengajuan;
    if (propNomor?.trim()) {
      return `${base}&prop=${encodeURIComponent(propNomor.trim().toUpperCase())}`;
    }
    return base;
  }
  return VISITRW3_ROUTES.penyewa.pengajuan;
}

export function daftarPropertiPublicHref(jenis?: string | null): string {
  if (jenis === "usaha_rumahan") return VISITRW3_ROUTES.usahaRumahan.daftarProperti;
  return VISITRW3_ROUTES.pemilikDisewa.daftarProperti;
}

export function hubForPeran(peran: Visitrw3PeranPublik): string {
  if (peran === "usaha_rumahan") return VISITRW3_ROUTES.usahaRumahan.hub;
  if (peran === "pemilik_disewa") return VISITRW3_ROUTES.pemilikDisewa.hub;
  return VISITRW3_ROUTES.penyewa.hub;
}

export function parsePengajuanMode(search: string): "" | "usaha_rumahan" {
  const mode = new URLSearchParams(search).get("mode");
  return mode === "usaha_rumahan" ? "usaha_rumahan" : "";
}

export function parseDaftarJenis(search: string): string {
  return new URLSearchParams(search).get("jenis") ?? "";
}

/** Setelah properti aktif — kemana warga publik diarahkan. */
export function hintSetelahPropertiAktif(jenisProperti?: string | null): string {
  if (jenisProperti === "usaha_rumahan") {
    return "Pemilik ajukan Visit RW3 (tahap 2) lewat menu Usaha di rumah sendiri dengan nomor PROP.";
  }
  return "Penyewa/penghuni bisa memilih properti ini saat pengajuan Visit RW3.";
}
