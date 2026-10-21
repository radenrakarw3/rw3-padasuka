/** Rute publik & admin RW3BIZ — izin usaha / jualan di RW 03 (terpisah dari Visit RW3). */

export const RW3BIZ_ROUTES = {
  hub: "/rw3biz",
  panduan: "/rw3biz/panduan",
  pengajuan: "/rw3biz/pengajuan",
  perpanjang: "/rw3biz/perpanjang",
  status: "/rw3biz/status",
  /** Aduan usaha masuk lewat Aduan Warga satu pintu. */
  aduan: "/aduan/buat?kategori=usaha",
  admin: {
    landing: "/admin/rw3biz",
    antrianSurvey: "/admin/rw3biz/antrian?view=belum",
    antrianSudah: "/admin/rw3biz/antrian?view=sudah",
    dashboard: "/admin/rw3biz/dashboard",
    tagihan: "/admin/rw3biz/tagihan",
    tarif: "/admin/rw3biz/tarif",
    razia: "/admin/rw3biz/razia",
    pelanggaran: "/admin/rw3biz/pelanggaran",
  },
  kas: "/admin/keuangan",
} as const;
