import type { JenisDokumen, Kategori, Layout, PosisiPenerima, TujuanUtama } from "./tipe";

type Def = Omit<JenisDokumen, "versi" | "lanjutan" | "butuhTindak" | "kategori" | "tujuan"> & Partial<Pick<JenisDokumen, "versi" | "lanjutan" | "butuhTindak">>;

const TUJUAN: Record<Kategori, TujuanUtama> = { A: "tugaskan", B: "masalah", C: "keputusan", D: "dukungan", E: "pantau" };

function kat(kategori: Kategori, defs: Def[]): JenisDokumen[] {
  return defs.map((d) => ({ versi: 1, lanjutan: [], butuhTindak: false, ...d, kategori, tujuan: TUJUAN[kategori] }));
}

const S = (layout: Layout = "surat") => layout;
const P = (p: PosisiPenerima) => p;

export const PENUTUP: Record<PosisiPenerima, string> = {
  pengurus: "Demikian disampaikan untuk dilaksanakan dengan penuh tanggung jawab dan hasilnya dilaporkan kepada Ketua RW 03.",
  warga: "Demikian disampaikan. Atas perhatian dan kerja sama Bapak/Ibu/Saudara, kami ucapkan terima kasih.",
  eksternal: "Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.",
  internal: "Demikian dokumen ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.",
};

export const KATALOG: JenisDokumen[] = [
  // ======================================================== A. MENGGERAKKAN PENGURUS
  ...kat("A", [
    { kode: "a_tugas", label: "Surat Tugas", labelLama: "Surat Tugas", layout: S(), posisi: P("pengurus"), nomorKode: "ST", judulCetak: "SURAT TUGAS",
      ringkas: "Menugaskan pengurus/petugas untuk pekerjaan tertentu.", kelompok: ["tugas", "konteks", "pic", "ttd"],
      pembuka: "Ketua RW 03 Kelurahan Padasuka dengan ini menugaskan nama-nama tersebut di bawah untuk melaksanakan {perihal}, dengan ketentuan sebagai berikut:",
      lanjutan: ["a_minta_laporan", "e_progres", "a_evaluasi", "a_ubah", "a_serah_tugas"], butuhTindak: true },
    { kode: "a_tim", label: "Pembentukan Tim/Panitia", layout: S("keputusan"), posisi: P("pengurus"), nomorKode: "KPTS", judulCetak: "KEPUTUSAN KETUA RW 03 KELURAHAN PADASUKA",
      ringkas: "Membentuk tim atau panitia beserta susunan dan tugasnya.", kelompok: ["tim", "konteks", "ttd"],
      pembuka: "Ketua RW 03 Kelurahan Padasuka membentuk {perihal} dengan susunan dan tugas sebagai berikut:",
      lanjutan: ["a_instruksi", "e_rencana", "a_evaluasi"], butuhTindak: true },
    { kode: "a_koordinator", label: "Penetapan Koordinator", layout: S(), posisi: P("pengurus"), nomorKode: "ST",
      ringkas: "Menetapkan koordinator bidang/wilayah.", kelompok: ["koordinator", "konteks", "ttd"],
      pembuka: "Ketua RW 03 Kelurahan Padasuka menetapkan koordinator untuk {perihal} sebagai berikut:",
      lanjutan: ["a_minta_laporan", "a_evaluasi"], butuhTindak: true },
    { kode: "a_instruksi", label: "Instruksi Pelaksanaan Program", layout: S(), posisi: P("pengurus"), nomorKode: "INS",
      ringkas: "Membagi tugas pelaksanaan program kepada pengurus sesuai perannya.", kelompok: ["penerima", "instruksi", "konteks", "permintaan", "pic", "ttd"],
      pembuka: "Dalam rangka pelaksanaan {perihal}, Ketua RW 03 meminta pengurus melaksanakan tugas sesuai perannya sebagai berikut:",
      lanjutan: ["a_minta_laporan", "e_progres"], butuhTindak: true },
    { kode: "a_minta_laporan", label: "Permintaan Laporan Pelaksanaan", layout: S(), posisi: P("pengurus"), nomorKode: "PLP",
      ringkas: "Meminta laporan pelaksanaan tugas.", kelompok: ["penerima", "mintaLaporan", "ttd"],
      pembuka: "Sehubungan dengan {perihal}, mohon Saudara menyampaikan laporan pelaksanaan dengan ketentuan berikut:",
      lanjutan: ["e_progres", "a_evaluasi"], butuhTindak: true },
    { kode: "a_evaluasi", label: "Evaluasi Penugasan", layout: S("laporan"), posisi: P("internal"), nomorKode: "EVL", judulCetak: "EVALUASI PENUGASAN",
      ringkas: "Mencatat capaian, temuan, dan rekomendasi atas penugasan.", kelompok: ["evaluasi", "konteks", "ttd"],
      pembuka: "Evaluasi atas {perihal} dengan hasil sebagai berikut:", lanjutan: ["a_ubah", "a_tugas"] },
    { kode: "a_ubah", label: "Perubahan/Akhir Penugasan", layout: S(), posisi: P("pengurus"), nomorKode: "ST",
      ringkas: "Mengubah lingkup, memperpanjang, atau mengakhiri penugasan.", kelompok: ["penerima", "ubahTugas", "ttd"],
      pembuka: "Dengan ini disampaikan perubahan atas penugasan {perihal} sebagai berikut:", lanjutan: ["a_serah_tugas"] },
    { kode: "a_serah_tugas", label: "Berita Acara Serah-Terima Tugas", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA", judulCetak: "BERITA ACARA SERAH-TERIMA TUGAS",
      ringkas: "Serah-terima tugas, dokumen, dan barang antarpengurus.", kelompok: ["serah", "serahTugas"],
      pembuka: "telah dilakukan serah-terima tugas {perihal} dengan rincian sebagai berikut:" },
  ]),

  // ======================================================== B. PENYELESAIAN MASALAH
  ...kat("B", [
    { kode: "b_klarifikasi", label: "Undangan Klarifikasi", labelLama: "Surat Undangan Klarifikasi", layout: S(), posisi: P("warga"), nomorKode: "UND-KLR",
      ringkas: "Mengundang pihak untuk memberi penjelasan. Redaksi netral, aduan belum dianggap terbukti.", kelompok: ["penerima", "acara", "klarifikasi", "konteks", "ttd"],
      pembuka: "Dalam rangka mendengar penjelasan secara langsung mengenai {perihal}, kami mengundang Bapak/Ibu/Saudara untuk hadir pada:",
      penutup: "Pertemuan ini bertujuan memperoleh keterangan yang lengkap dari semua pihak dan belum merupakan kesimpulan atas suatu hal. Atas kehadiran Bapak/Ibu/Saudara, kami ucapkan terima kasih.",
      lanjutan: ["b_ba_klarifikasi", "b_pengingat"], butuhTindak: true },
    { kode: "b_penjelasan", label: "Permintaan Penjelasan Tertulis", layout: S(), posisi: P("warga"), nomorKode: "PPT",
      ringkas: "Meminta keterangan tertulis atas suatu hal.", kelompok: ["penerima", "penjelasanTertulis", "konteks", "ttd"],
      pembuka: "Untuk melengkapi keterangan mengenai {perihal}, kami mohon Bapak/Ibu/Saudara berkenan menyampaikan penjelasan tertulis mengenai hal berikut:",
      penutup: "Permintaan ini untuk melengkapi keterangan dan belum merupakan kesimpulan atas suatu hal. Atas perhatian Bapak/Ibu/Saudara, kami ucapkan terima kasih.",
      lanjutan: ["b_klarifikasi", "b_pengingat"], butuhTindak: true },
    { kode: "b_mediasi", label: "Undangan Mediasi/Musyawarah", layout: S(), posisi: P("warga"), nomorKode: "UND",
      ringkas: "Mempertemukan para pihak untuk mencari penyelesaian bersama.", kelompok: ["penerima", "mediasi", "acara", "konteks", "ttd"],
      pembuka: "Dalam rangka mencari penyelesaian bersama atas {perihal}, kami mengundang Bapak/Ibu/Saudara untuk hadir dalam musyawarah pada:",
      lanjutan: ["b_ba_klarifikasi", "b_kesepakatan"], butuhTindak: true },
    { kode: "b_tugas_periksa", label: "Surat Tugas Pemeriksaan Lapangan", layout: S(), posisi: P("pengurus"), nomorKode: "ST",
      ringkas: "Menugaskan petugas memeriksa kondisi lapangan.", kelompok: ["tugas", "pemeriksaan", "konteks", "ttd"],
      pembuka: "Ketua RW 03 Kelurahan Padasuka menugaskan nama-nama tersebut di bawah untuk melakukan pemeriksaan lapangan terkait {perihal}:",
      lanjutan: ["b_ba_periksa"], butuhTindak: true },
    { kode: "b_ba_periksa", label: "Berita Acara Pemeriksaan", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA", judulCetak: "BERITA ACARA PEMERIKSAAN LAPANGAN",
      ringkas: "Mencatat hasil pemeriksaan lapangan.", kelompok: ["beritaAcara", "konteks"],
      pembuka: "telah dilakukan pemeriksaan lapangan terkait {perihal} dengan hasil sebagai berikut:",
      lanjutan: ["b_imbauan", "b_permohonan_instansi", "b_kesepakatan", "b_perkembangan"] },
    { kode: "b_ba_klarifikasi", label: "Berita Acara Klarifikasi/Mediasi", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA", judulCetak: "BERITA ACARA KLARIFIKASI/MEDIASI",
      ringkas: "Mencatat jalannya klarifikasi atau mediasi beserta hasilnya.", kelompok: ["beritaAcara", "konteks"],
      pembuka: "telah dilaksanakan klarifikasi/mediasi terkait {perihal} dengan hasil sebagai berikut:",
      lanjutan: ["b_kesepakatan", "b_perkembangan", "b_pengingat"] },
    { kode: "b_kesepakatan", label: "Kesepakatan Perbaikan Bersama", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "KSP", judulCetak: "SURAT KESEPAKATAN BERSAMA",
      ringkas: "Menuangkan butir yang benar-benar disetujui para pihak.", kelompok: ["kesepakatan", "konteks"], perluPersetujuanPihak: true,
      pembuka: "para pihak yang namanya tersebut di bawah ini, setelah bermusyawarah mengenai {perihal}, menyatakan sepakat atas butir-butir berikut:",
      penutup: "Kesepakatan ini dibuat atas kehendak para pihak tanpa paksaan, dibacakan, dan ditandatangani para pihak. Pelaksanaannya dipantau bersama oleh pengurus RW 03.",
      lanjutan: ["b_pengingat", "b_ba_hasil", "b_perkembangan"], butuhTindak: true },
    { kode: "b_imbauan", label: "Imbauan Perbaikan Kondisi", layout: S(), posisi: P("warga"), nomorKode: "IMB",
      ringkas: "Mengimbau perbaikan kondisi tanpa sanksi.", kelompok: ["penerima", "imbauan", "konteks", "pic", "ttd"],
      pembuka: "Sehubungan dengan {perihal}, kami menyampaikan imbauan sebagai berikut:",
      lanjutan: ["b_pengingat", "b_ba_periksa", "b_ba_hasil"], butuhTindak: true },
    { kode: "b_pengingat", label: "Pengingat Tindak Lanjut", layout: S(), posisi: P("warga"), nomorKode: "PGT",
      ringkas: "Mengingatkan tindak lanjut yang belum dilaksanakan.", kelompok: ["penerima", "rujukan", "pengingat", "permintaan", "ttd"],
      pembuka: "Menindaklanjuti surat kami sebagaimana dirujuk di bawah mengenai {perihal}, dengan hormat kami mengingatkan hal berikut:",
      lanjutan: ["b_ba_hasil", "b_perkembangan"], butuhTindak: true },
    { kode: "b_permohonan_instansi", label: "Permohonan Penanganan kepada Instansi", layout: S(), posisi: P("eksternal"), nomorKode: "PGJ",
      ringkas: "Memohon instansi berwenang menangani masalah di wilayah.", kelompok: ["penerima", "perbaikan", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, kami sampaikan bahwa di wilayah RW 03 Kelurahan Padasuka terdapat permasalahan {perihal}. Untuk itu kami memohon kiranya Bapak/Ibu berkenan memberikan penanganan sesuai kewenangan instansi.",
      lanjutan: ["d_pengingat", "b_perkembangan", "b_ba_hasil"], butuhTindak: true },
    { kode: "b_ba_hasil", label: "Berita Acara Hasil/Penyelesaian", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA", judulCetak: "BERITA ACARA HASIL PENANGANAN",
      ringkas: "Mencatat hasil akhir penanganan masalah.", kelompok: ["beritaAcara", "konteks"],
      pembuka: "telah diperiksa hasil penanganan {perihal} dengan keterangan sebagai berikut:", lanjutan: ["b_perkembangan", "d_terima_kasih"] },
    { kode: "b_perkembangan", label: "Pemberitahuan Perkembangan", layout: S(), posisi: P("warga"), nomorKode: "PBR",
      ringkas: "Memberi tahu pihak terkait perkembangan penanganan.", kelompok: ["penerima", "perkembangan", "konteks", "ttd"],
      pembuka: "Bersama ini kami sampaikan perkembangan penanganan {perihal} sebagai berikut:", lanjutan: ["b_pengingat", "b_ba_hasil"] },
  ]),

  // ======================================================== C. KEPUTUSAN DAN PENATAAN WILAYAH
  ...kat("C", [
    { kode: "c_ba_musyawarah", label: "Berita Acara Keputusan Musyawarah", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA", judulCetak: "BERITA ACARA MUSYAWARAH",
      ringkas: "Mencatat keputusan musyawarah apa adanya.", kelompok: ["beritaAcara", "konteks"],
      pembuka: "telah dilaksanakan musyawarah mengenai {perihal} dengan hasil sebagai berikut:", lanjutan: ["c_penetapan", "c_edaran", "e_notulen"] },
    { kode: "c_penetapan", label: "Penetapan Pelaksanaan Hasil Musyawarah", layout: S("keputusan"), posisi: P("internal"), nomorKode: "KPTS", judulCetak: "KEPUTUSAN KETUA RW 03 KELURAHAN PADASUKA",
      ringkas: "Menetapkan pelaksanaan hasil musyawarah. Wajib dasar yang diperiksa.", kelompok: ["keputusan", "dasarCek", "konteks"], perluDasar: true,
      lanjutan: ["c_edaran", "a_instruksi", "a_tugas", "c_ubah"], butuhTindak: true },
    { kode: "c_edaran", label: "Surat Edaran Pelaksanaan Program", labelLama: "Surat Edaran", layout: S(), posisi: P("warga"), nomorKode: "SE", judulCetak: "SURAT EDARAN",
      ringkas: "Menyampaikan informasi dan langkah yang perlu dilakukan warga.", kelompok: ["edaran", "konteks", "ttd"],
      pembuka: "Sehubungan dengan {perihal}, bersama ini disampaikan hal-hal sebagai berikut:", lanjutan: ["e_progres", "e_evaluasi"] },
    { kode: "c_undangan", label: "Undangan Rapat/Kegiatan", labelLama: "Surat Undangan", layout: S(), posisi: P("warga"), nomorKode: "UND",
      ringkas: "Mengundang pengurus/warga ke rapat atau kegiatan.", kelompok: ["penerima", "acara", "konteks", "ttd"],
      pembuka: "Dengan hormat, kami mengundang Bapak/Ibu/Saudara untuk hadir dalam {perihal} yang akan dilaksanakan pada:",
      lanjutan: ["e_daftar_hadir", "e_notulen", "c_ba_musyawarah"] },
    { kode: "c_jadwal", label: "Jadwal Ronda/Kebersihan/Kegiatan", layout: S("tabel"), posisi: P("warga"), nomorKode: "JDW", judulCetak: "JADWAL",
      ringkas: "Menyusun jadwal ronda, kebersihan, atau kegiatan.", kelompok: ["jadwal", "pic", "ttd"],
      pembuka: "Jadwal {perihal} sebagai berikut:", lanjutan: ["e_progres", "e_evaluasi", "a_minta_laporan"], butuhTindak: true },
    { kode: "c_tata_fasilitas", label: "Tata Penggunaan Fasilitas", layout: S("keputusan"), posisi: P("warga"), nomorKode: "KPTS", judulCetak: "KETENTUAN PENGGUNAAN FASILITAS",
      ringkas: "Ketentuan penggunaan fasilitas bersama berdasarkan dasar/kesepakatan yang diperiksa.", kelompok: ["tataFasilitas", "dasarCek", "konteks"], perluDasar: true,
      lanjutan: ["c_edaran", "c_ubah"] },
    { kode: "c_akses", label: "Pemberitahuan Pekerjaan/Perubahan Akses", layout: S(), posisi: P("warga"), nomorKode: "PBR",
      ringkas: "Memberi tahu warga tentang pekerjaan dan dampaknya pada akses.", kelompok: ["penerima", "aksesPekerjaan", "konteks", "ttd"],
      pembuka: "Bersama ini kami beritahukan adanya {perihal} di lingkungan RW 03 dengan keterangan sebagai berikut:", lanjutan: ["b_perkembangan", "e_selesai"] },
    { kode: "c_koordinasi", label: "Permintaan Koordinasi Usaha/Provider", layout: S(), posisi: P("eksternal"), nomorKode: "KRD",
      ringkas: "Mengajak usaha/provider berkoordinasi atas dampak kegiatannya di wilayah.", kelompok: ["penerima", "koordinasi", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, sehubungan dengan {perihal} di wilayah RW 03 Kelurahan Padasuka, kami mengharapkan kesediaan Bapak/Ibu untuk berkoordinasi dengan pengurus RW mengenai hal berikut:",
      lanjutan: ["d_peninjauan", "b_ba_periksa", "e_rencana", "d_pengingat"], butuhTindak: true },
    { kode: "c_ubah", label: "Perubahan/Pencabutan Keputusan", layout: S("keputusan"), posisi: P("internal"), nomorKode: "KPTS", judulCetak: "KEPUTUSAN KETUA RW 03 KELURAHAN PADASUKA",
      ringkas: "Mengubah atau mencabut keputusan sesuai prosesnya. Wajib dasar yang diperiksa.", kelompok: ["ubahKeputusan", "dasarCek", "konteks"], perluDasar: true,
      lanjutan: ["c_edaran"] },
  ]),

  // ======================================================== D. DUKUNGAN PIHAK LUAR
  ...kat("D", [
    { kode: "d_audiensi", label: "Permohonan Audiensi", labelLama: "Surat Permohonan Audiensi", layout: S(), posisi: P("eksternal"), nomorKode: "AUD",
      ringkas: "Memohon waktu bertemu pimpinan instansi/perusahaan.", kelompok: ["penerima", "audiensi", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, dalam rangka {perihal}, kami bermaksud memohon kesediaan Bapak/Ibu untuk menerima audiensi pengurus RW 03 Kelurahan Padasuka.",
      lanjutan: ["d_pengingat", "e_notulen", "d_terima_kasih"], butuhTindak: true },
    { kode: "d_peninjauan", label: "Permohonan Peninjauan", layout: S(), posisi: P("eksternal"), nomorKode: "PGJ",
      ringkas: "Memohon instansi meninjau kondisi lapangan.", kelompok: ["penerima", "perbaikan", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, kami memohon kesediaan Bapak/Ibu untuk melakukan peninjauan terkait {perihal} di wilayah RW 03 Kelurahan Padasuka.",
      lanjutan: ["b_ba_periksa", "d_pengingat"], butuhTindak: true },
    { kode: "d_perbaikan", label: "Permohonan Perbaikan Fasilitas", labelLama: "Surat Pengajuan Perbaikan", layout: S(), posisi: P("eksternal"), nomorKode: "PGJ-PBK",
      ringkas: "Memohon perbaikan fasilitas umum.", kelompok: ["penerima", "perbaikan", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, kami sampaikan kondisi {perihal} di wilayah RW 03 Kelurahan Padasuka dan memohon kiranya dapat dilakukan perbaikan.",
      lanjutan: ["d_pengingat", "e_ba_terima", "e_serah_aset", "d_terima_kasih"], butuhTindak: true },
    ...([
      ["d_dana", "Permohonan Bantuan Dana", "Surat Permohonan Bantuan", "Dana"],
      ["d_barang", "Permohonan Barang/Material", undefined, "Material baru"],
      ["d_material_bekas", "Permohonan Material Bekas Layak Pakai", undefined, "Material bekas layak pakai"],
      ["d_alat", "Permohonan Alat/Kendaraan/Tempat", undefined, "Alat"],
      ["d_jasa", "Permohonan Jasa/Tenaga Ahli", undefined, "Jasa/tenaga ahli"],
    ] as const).map(([kode, label, labelLama, bentuk]): Def => ({
      kode, label, labelLama, layout: "surat", posisi: "eksternal", nomorKode: "PMB", awal: { bentukBantuan: bentuk },
      ringkas: `${label}. Mencatat yang dimohonkan saja — bukan pemasukan.`, kelompok: ["penerima", "bantuan", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, dalam rangka {perihal} di wilayah RW 03 Kelurahan Padasuka, kami bermaksud memohon dukungan Bapak/Ibu dengan keterangan sebagai berikut:",
      lanjutan: ["d_pengingat", "e_ba_terima", "e_tanda_terima", "e_penggunaan", "d_terima_kasih"], butuhTindak: true,
    })),
    { kode: "d_kolaborasi", label: "Penawaran Kolaborasi/CSR", layout: S(), posisi: P("eksternal"), nomorKode: "KLB",
      ringkas: "Menawarkan kerja sama program kepada perusahaan/lembaga.", kelompok: ["penerima", "kolaborasi", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, kami bermaksud menawarkan kerja sama kepada Bapak/Ibu dalam {perihal} dengan gambaran sebagai berikut:",
      lanjutan: ["d_audiensi", "d_pengingat", "e_rencana"], butuhTindak: true },
    { kode: "d_penawaran_harga", label: "Permintaan Penawaran Harga", layout: S(), posisi: P("eksternal"), nomorKode: "PPH",
      ringkas: "Meminta penawaran harga dari penyedia.", kelompok: ["penerima", "penawaranHarga", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, dalam rangka {perihal}, kami mohon Bapak/Ibu berkenan menyampaikan penawaran harga untuk kebutuhan berikut:",
      penutup: "Permintaan ini belum merupakan pemesanan. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.", butuhTindak: true },
    { kode: "d_pengingat", label: "Pengingat atas Surat Sebelumnya", layout: S(), posisi: P("eksternal"), nomorKode: "PGT",
      ringkas: "Menanyakan tindak lanjut surat yang belum dijawab.", kelompok: ["penerima", "rujukan", "pengingat", "ttd"],
      pembuka: "Dengan hormat, menindaklanjuti surat kami sebagaimana dirujuk di bawah mengenai {perihal}, kami bermaksud menanyakan perkembangan tindak lanjutnya.",
      butuhTindak: true },
    { kode: "d_terima_kasih", label: "Ucapan Terima Kasih atas Dukungan", layout: S(), posisi: P("eksternal"), nomorKode: "UTK",
      ringkas: "Berterima kasih atas dukungan yang sudah nyata diterima.", kelompok: ["penerima", "terimaKasih", "ttd"],
      pembuka: "Dengan hormat, atas nama pengurus dan warga RW 03 Kelurahan Padasuka, kami menyampaikan terima kasih atas dukungan Bapak/Ibu dalam {perihal}.",
      penutup: "Semoga kerja sama yang baik ini dapat terus terjalin. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih." },
    { kode: "d_pengajuan", label: "Surat Pengajuan Umum", labelLama: "Surat Pengajuan", layout: S(), posisi: P("eksternal"), nomorKode: "PGJ",
      ringkas: "Pengajuan umum kepada pihak luar (jenis lama).", kelompok: ["penerima", "konteks", "permintaan", "pic", "ttd"],
      pembuka: "Dengan hormat, bersama ini kami mengajukan {perihal} dengan keterangan sebagai berikut:", lanjutan: ["d_pengingat", "d_terima_kasih"], butuhTindak: true },
  ]),

  // ======================================================== E. PELAKSANAAN DAN PERTANGGUNGJAWABAN
  ...kat("E", [
    { kode: "e_rencana", label: "Rencana Kegiatan", layout: S("laporan"), posisi: P("internal"), nomorKode: "RK", judulCetak: "RENCANA KEGIATAN",
      ringkas: "Tujuan, waktu, susunan, PIC, dan anggaran kegiatan.", kelompok: ["kegiatan", "rencana", "acara", "konteks", "ttd"],
      pembuka: "Rencana pelaksanaan {perihal} sebagai berikut:", lanjutan: ["c_undangan", "e_daftar_hadir", "e_progres", "d_dana"], butuhTindak: true },
    { kode: "e_daftar_hadir", label: "Daftar Hadir", layout: S("tabel"), posisi: P("internal"), nomorKode: "DH", judulCetak: "DAFTAR HADIR",
      ringkas: "Lembar daftar hadir kegiatan (baris kosong untuk tanda tangan).", kelompok: ["kegiatan", "acara", "daftarHadir", "ttd"], lanjutan: ["e_notulen"] },
    { kode: "e_notulen", label: "Notulen", layout: S("notulen"), posisi: P("internal"), nomorKode: "NOT", judulCetak: "NOTULEN RAPAT",
      ringkas: "Catatan rapat: pembahasan, keputusan, tindak lanjut.", kelompok: ["kegiatan", "acara", "notulen", "ttd"],
      lanjutan: ["c_ba_musyawarah", "c_penetapan", "a_instruksi"], butuhTindak: true },
    { kode: "e_progres", label: "Laporan Progres", layout: S("laporan"), posisi: P("internal"), nomorKode: "LAP", judulCetak: "LAPORAN PROGRES",
      ringkas: "Target, realisasi, kendala, bukti, dan sisa pekerjaan.", kelompok: ["progres", "konteks", "ttd"],
      pembuka: "Laporan progres {perihal} sebagai berikut:", lanjutan: ["e_progres", "e_selesai", "a_evaluasi"] },
    { kode: "e_selesai", label: "Laporan Penyelesaian", layout: S("laporan"), posisi: P("internal"), nomorKode: "LAP", judulCetak: "LAPORAN PENYELESAIAN",
      ringkas: "Hasil akhir pekerjaan beserta bukti.", kelompok: ["progres", "konteks", "ttd"],
      pembuka: "Laporan penyelesaian {perihal} sebagai berikut:", lanjutan: ["e_serah_aset", "e_penggunaan", "e_evaluasi", "d_terima_kasih"] },
    { kode: "e_ba_terima", label: "Berita Acara Penerimaan Bantuan", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA", judulCetak: "BERITA ACARA PENERIMAAN BANTUAN",
      ringkas: "Mencatat bantuan yang benar-benar diterima.", kelompok: ["serah", "konteks"],
      pembuka: "telah dilakukan serah-terima bantuan {perihal} dengan rincian sebagai berikut:", lanjutan: ["e_penggunaan", "d_terima_kasih", "a_tugas"] },
    { kode: "e_tanda_terima", label: "Tanda Terima Barang/Dokumen", layout: S("tabel"), posisi: P("internal"), nomorKode: "TT", judulCetak: "TANDA TERIMA",
      ringkas: "Bukti penerimaan barang atau dokumen.", kelompok: ["serah"], pembuka: "Telah diterima {perihal} dengan rincian sebagai berikut:" },
    { kode: "e_serah_aset", label: "Serah-Terima Aset/Hasil Pekerjaan", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA", judulCetak: "BERITA ACARA SERAH-TERIMA",
      ringkas: "Serah-terima aset atau hasil pekerjaan.", kelompok: ["serah", "konteks"],
      pembuka: "telah dilakukan serah-terima {perihal} dengan rincian sebagai berikut:", lanjutan: ["e_selesai", "e_evaluasi"] },
    { kode: "e_kembali", label: "Pengembalian Barang Pinjaman", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA", judulCetak: "BERITA ACARA PENGEMBALIAN BARANG",
      ringkas: "Mencatat pengembalian barang yang dipinjam beserta kondisinya.", kelompok: ["serah", "rujukan"],
      pembuka: "telah dilakukan pengembalian barang pinjaman {perihal} dengan rincian sebagai berikut:" },
    { kode: "e_penggunaan", label: "Laporan Penggunaan Dana/Barang", layout: S("laporan"), posisi: P("internal"), nomorKode: "LAP", judulCetak: "LAPORAN PENGGUNAAN DANA/BARANG",
      ringkas: "Pertanggungjawaban dana/barang yang diterima dan digunakan.", kelompok: ["penggunaan", "konteks", "ttd"],
      pembuka: "Laporan penggunaan {perihal} sebagai berikut:", lanjutan: ["d_terima_kasih", "e_evaluasi"] },
    { kode: "e_evaluasi", label: "Evaluasi Program", layout: S("laporan"), posisi: P("internal"), nomorKode: "EVL", judulCetak: "EVALUASI PROGRAM",
      ringkas: "Capaian, temuan, dan rekomendasi program.", kelompok: ["evaluasi", "konteks", "ttd"],
      pembuka: "Evaluasi {perihal} sebagai berikut:", lanjutan: ["e_rencana", "c_penetapan"] },
  ]),
];

export const PETA_JENIS: Record<string, JenisDokumen> = Object.fromEntries(KATALOG.map((j) => [j.kode, j]));

export function jenisDariKode(kode: string | null | undefined): JenisDokumen | undefined {
  return kode ? PETA_JENIS[kode] : undefined;
}

/** Cari jenis registry untuk label lama (8 jenis v1). */
export function jenisDariLabelLama(label: string | null | undefined): JenisDokumen | undefined {
  return label ? KATALOG.find((j) => j.labelLama === label || j.label === label) : undefined;
}

export const LABEL_TUJUAN: Record<TujuanUtama, { judul: string; ket: string }> = {
  tugaskan: { judul: "Tugaskan Seseorang", ket: "Surat tugas, tim, koordinator, instruksi, laporan, evaluasi" },
  masalah: { judul: "Tangani Masalah", ket: "Klarifikasi, mediasi, pemeriksaan, berita acara, kesepakatan, permohonan ke instansi" },
  keputusan: { judul: "Jalankan Keputusan", ket: "Berita acara musyawarah, penetapan, edaran, jadwal, tata fasilitas" },
  dukungan: { judul: "Minta Dukungan", ket: "Audiensi, peninjauan, perbaikan, bantuan, kolaborasi, pengingat, terima kasih" },
  pantau: { judul: "Pantau Tindak Lanjut", ket: "Tindak lanjut jatuh tempo, rencana, daftar hadir, notulen, laporan, serah-terima" },
};

export const LABEL_KATEGORI: Record<Kategori, string> = {
  A: "Menggerakkan pengurus", B: "Penyelesaian masalah", C: "Keputusan dan penataan wilayah", D: "Dukungan pihak luar", E: "Pelaksanaan dan pertanggungjawaban",
};

/** Paket rangkaian contoh: urutan jenis yang lazim. Tiap langkah tetap dibuat dan diperiksa satu per satu. */
export const PAKET: { kode: string; label: string; jenis: "kasus" | "program" | "fasilitas" | "kegiatan"; langkah: string[] }[] = [
  { kode: "betterblock", label: "BetterBlock (material → pengerjaan → serah-terima)", jenis: "program", langkah: ["d_barang", "e_ba_terima", "a_tugas", "e_serah_aset", "e_selesai"] },
  { kode: "drainase", label: "Drainase (pemeriksaan → dinas → tindak lanjut)", jenis: "kasus", langkah: ["b_tugas_periksa", "b_ba_periksa", "b_permohonan_instansi", "d_pengingat", "b_perkembangan"] },
  { kode: "kebisingan", label: "Kebisingan (klarifikasi → kesepakatan → pemantauan)", jenis: "kasus", langkah: ["b_klarifikasi", "b_ba_klarifikasi", "b_kesepakatan", "b_pengingat"] },
  { kode: "kabel", label: "Kabel provider (koordinasi → peninjauan → penataan)", jenis: "kasus", langkah: ["c_koordinasi", "d_peninjauan", "b_ba_periksa", "e_rencana", "d_pengingat"] },
  { kode: "ronda", label: "Ronda (penugasan → jadwal → laporan → evaluasi)", jenis: "program", langkah: ["a_tim", "c_jadwal", "e_progres", "e_evaluasi"] },
];
