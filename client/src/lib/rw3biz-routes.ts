/** Rute publik & admin RW3BIZ — izin usaha / jualan di RW 03 (terpisah dari Visit RW3). */

export const RW3BIZ_ROUTES = {
  hub: "/rw3biz",
  panduan: "/rw3biz/panduan",
  pengajuan: "/rw3biz/pengajuan",
  perpanjang: "/rw3biz/perpanjang",
  status: "/rw3biz/status",
  admin: {
    landing: "/admin/rw3biz",
    antrianSurvey: "/admin/rw3biz/antrian?view=belum",
    antrianSudah: "/admin/rw3biz/antrian?view=sudah",
    blast: "/admin/rw3biz/blast",
    dashboard: "/admin/rw3biz/dashboard",
    pengaturan: "/admin/rw3biz/pengaturan",
  },
} as const;
