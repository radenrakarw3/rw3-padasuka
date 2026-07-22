/** Rute publik & admin Karang Taruna RW 03 — pendataan anggota pemuda. */

export const KARANGTARUNA_ROUTES = {
  hub: "/karangtaruna",
  daftar: "/karangtaruna/daftar",
  status: "/karangtaruna/status",
  admin: {
    landing: "/admin/karangtaruna",
    anggota: "/admin/karangtaruna/anggota",
    anggotaBaru: "/admin/karangtaruna/anggota?status=baru",
    dashboard: "/admin/karangtaruna/dashboard",
  },
} as const;
