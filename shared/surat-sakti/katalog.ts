import type { DataDokumen, JenisDokumen, Kategori, Layout, PosisiPenerima, TujuanUtama } from "./tipe";

type Def = Omit<JenisDokumen, "versi" | "butuhTindak" | "kategori" | "tujuan"> & Partial<Pick<JenisDokumen, "versi" | "butuhTindak">>;

const TUJUAN: Record<Kategori, TujuanUtama> = { T: "menegur", M: "meminta", J: "jabatan", F: "kustom" };

function kat(kategori: Kategori, defs: Def[]): JenisDokumen[] {
  return defs.map((d) => ({ versi: 1, butuhTindak: false, ...d, kategori, tujuan: TUJUAN[kategori] }));
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
  // ======================================================== MENEGUR
  ...kat("T", [
    { saranPerihal: ["Klarifikasi mengenai aduan warga", "Klarifikasi mengenai penghuni kost/kontrakan", "Klarifikasi mengenai kegiatan usaha"], kode: "b_klarifikasi", label: "Panggilan Klarifikasi", labelLama: "Surat Undangan Klarifikasi", layout: S(), posisi: P("warga"), nomorKode: "UND-KLR",
      ringkas: "Memanggil pihak yang diadukan atau diduga melanggar untuk memberi keterangan langsung. Belum merupakan kesimpulan.",
      kelompok: ["penerima", "acara", "klarifikasi", "lokasi", "ttd"],
      pembuka: "Sehubungan dengan {perihal}, kami meminta Bapak/Ibu/Saudara hadir untuk memberikan keterangan secara langsung kepada pengurus RW 03 Kelurahan Padasuka pada:",
      penutup: "Pemanggilan ini untuk mendengar keterangan dari semua pihak dan belum merupakan kesimpulan atas suatu hal. Apabila berhalangan hadir, mohon memberi kabar kepada pengurus RW 03 paling lambat satu hari sebelumnya. Ketidakhadiran tanpa kabar akan kami catat, dan penanganan dilanjutkan berdasarkan keterangan yang ada.",
      butuhTindak: true },
    { saranPerihal: ["Teguran lisan atas gangguan ketertiban", "Teguran lisan atas kebersihan lingkungan"], kode: "b_teguran_lisan", label: "Berita Acara Teguran Lisan", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA-TGR", judulCetak: "BERITA ACARA TEGURAN LISAN",
      ringkas: "Mencatat teguran lisan yang sudah disampaikan langsung. Menjadi dasar bila perlu naik ke SP-1. Nama pelapor tidak dicetak.",
      kelompok: ["teguranPihak", "teguran", "lokasi"],
      pembuka: "pengurus RW 03 Kelurahan Padasuka telah menyampaikan teguran secara lisan kepada pihak tersebut di bawah, dengan keterangan sebagai berikut:",
      butuhTindak: true },
    { saranPerihal: ["Peringatan Pertama (SP-1)", "Peringatan Kedua (SP-2)", "Peringatan Ketiga (SP-3)"], kode: "b_sp", label: "Surat Peringatan (SP-1/SP-2/SP-3)", layout: S(), posisi: P("warga"), nomorKode: "SP",
      ringkas: "Peringatan resmi bertingkat kepada warga, pemilik kost/kontrakan, atau pelaku usaha: pelanggaran, kewajiban, batas waktu, dan langkah lanjutan.",
      kelompok: ["penerima", "teguran", "lokasi", "ttd"],
      pembuka: "Berdasarkan hasil pemeriksaan pengurus RW 03 Kelurahan Padasuka, dengan ini Ketua RW 03 menyampaikan peringatan resmi kepada Bapak/Ibu/Saudara dengan rincian sebagai berikut:",
      penutup: "Peringatan ini disampaikan demi menjaga ketertiban dan kenyamanan bersama di lingkungan RW 03. Kami meminta Bapak/Ibu/Saudara melakukan perbaikan sebelum batas waktu tersebut. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.",
      butuhTindak: true },
    { saranPerihal: ["Teguran atas pekerjaan tanpa koordinasi", "Teguran atas galian yang tidak dipulihkan", "Teguran atas kabel/tiang yang membahayakan"], kode: "tg_pekerjaan", label: "Teguran kepada Provider/Kontraktor", layout: S(), posisi: P("eksternal"), nomorKode: "TGR",
      ringkas: "Menegur pekerjaan galian, kabel, tiang, atau proyek yang tanpa koordinasi atau merugikan warga: hentikan, koordinasi, pulihkan.",
      kelompok: ["penerima", "pekerjaanProvider", "lokasi", "pic", "ttd"],
      awal: { tembusan: ["Lurah Padasuka", "Camat Cimahi Tengah", "Dinas terkait di lingkungan Pemerintah Kota Cimahi", "Arsip"] },
      pembuka: "Dengan hormat, pengurus RW 03 Kelurahan Padasuka mendapati {pekerjaan} di wilayah RW 03 yang menimbulkan gangguan bagi warga dan/atau dilaksanakan tanpa koordinasi dengan pengurus RW. Dengan surat ini kami menyampaikan teguran resmi dan meminta Bapak/Ibu menindaklanjuti hal-hal berikut:",
      penutup: "Wilayah RW 03 terbuka bagi pekerjaan yang bermanfaat, sepanjang dilaksanakan dengan koordinasi dan tidak merugikan warga. Apabila sampai batas waktu tersebut belum ada tindak lanjut, permasalahan ini akan kami teruskan kepada Kelurahan Padasuka dan dinas terkait untuk ditangani sesuai kewenangannya. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.",
      butuhTindak: true },
    { saranPerihal: ["Pernyataan kesanggupan perbaikan", "Kesepakatan penyelesaian perselisihan"], kode: "b_kesepakatan", label: "Pernyataan Kesanggupan / Kesepakatan", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "KSP", judulCetak: "SURAT PERNYATAAN KESANGGUPAN DAN KESEPAKATAN",
      ringkas: "Pihak yang ditegur menyatakan sanggup memperbaiki: kewajiban, batas waktu, dan cara pemantauan, ditandatangani para pihak.",
      kelompok: ["kesepakatan", "konteks"], perluPersetujuanPihak: true,
      pembuka: "para pihak yang namanya tersebut di bawah ini, setelah bermusyawarah mengenai {perihal}, menyatakan sanggup dan sepakat atas butir-butir berikut:",
      penutup: "Pernyataan ini dibuat dengan sadar tanpa paksaan, dibacakan, dan ditandatangani para pihak. Apabila butir di atas tidak dilaksanakan, pengurus RW 03 berhak melanjutkan penanganan sesuai tahapan teguran yang berlaku.",
      butuhTindak: true },
  ]),

  // ======================================================== MEMINTA
  ...kat("M", [
    { saranPerihal: ["Permohonan perbaikan jalan lingkungan", "Permohonan perbaikan saluran drainase", "Permohonan penertiban", "Permohonan peninjauan lapangan"], kode: "mt_instansi", label: "Permohonan kepada Instansi", labelLama: "Surat Pengajuan Perbaikan", layout: S(), posisi: P("eksternal"), nomorKode: "PGJ",
      ringkas: "Kepada Kelurahan, Kecamatan, atau Dinas: perbaikan fasilitas, peninjauan, penanganan masalah, penertiban, atau data/izin.",
      kelompok: ["penerima", "jenisPermohonan", "perbaikan", "konteks", "pic", "ttd"],
      awal: { tembusan: ["Lurah Padasuka", "Arsip"] },
      pembuka: "Dengan hormat, sehubungan dengan {perihal} di wilayah RW 03 Kelurahan Padasuka, bersama ini kami mengajukan permohonan kepada Bapak/Ibu dengan keterangan sebagai berikut:",
      penutup: "Besar harapan kami permohonan ini dapat segera ditindaklanjuti. Pengurus RW 03 siap mendampingi peninjauan dan menyampaikan data tambahan yang diperlukan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.",
      butuhTindak: true },
    { saranPerihal: ["Permohonan audiensi pengurus RW 03"], kode: "d_audiensi", label: "Permohonan Audiensi", labelLama: "Surat Permohonan Audiensi", layout: S(), posisi: P("eksternal"), nomorKode: "AUD",
      ringkas: "Memohon waktu bertemu pimpinan instansi atau perusahaan.", kelompok: ["penerima", "audiensi", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, dalam rangka {perihal}, kami bermaksud memohon kesediaan Bapak/Ibu untuk menerima audiensi pengurus RW 03 Kelurahan Padasuka.",
      butuhTindak: true },
    { saranPerihal: ["Permohonan bantuan material", "Permohonan bantuan dana kegiatan", "Permohonan dukungan program CSR"], kode: "mt_bantuan", label: "Permohonan Bantuan / CSR", labelLama: "Surat Permohonan Bantuan", layout: S(), posisi: P("eksternal"), nomorKode: "PMB",
      ringkas: "Kepada perusahaan, donatur, atau program CSR: dana, barang, material (baru/bekas), alat, jasa, atau kolaborasi. Yang dimohonkan bukan pemasukan.",
      kelompok: ["penerima", "bantuan", "konteks", "pic", "ttd"],
      pembuka: "Dengan hormat, dalam rangka {perihal} di wilayah RW 03 Kelurahan Padasuka, kami bermaksud memohon dukungan Bapak/Ibu dengan keterangan sebagai berikut:",
      butuhTindak: true },
    { saranPerihal: ["Susulan permohonan perbaikan", "Susulan permohonan tanggapan"], kode: "mt_susulan", label: "Surat Susulan (Menagih Tanggapan)", layout: S(), posisi: P("eksternal"), nomorKode: "PGT",
      ringkas: "Menagih tanggapan atas surat atau permohonan sebelumnya yang belum dijawab, dengan batas waktu.",
      kelompok: ["penerima", "rujukan", "pengingat", "ttd"],
      pembuka: "Dengan hormat, menindaklanjuti surat kami sebagaimana dirujuk di bawah mengenai {perihal}, sampai saat ini kami belum menerima tanggapan. Dengan ini kami kembali menyampaikan permohonan tersebut dan mohon kepastian tindak lanjutnya.",
      penutup: "Mengingat hal ini menyangkut kepentingan warga, kami mohon tanggapan dapat disampaikan sebelum batas waktu tersebut. Apabila belum ada tanggapan, kami akan menyampaikan permasalahan ini kepada pimpinan yang lebih tinggi. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.",
      butuhTindak: true },
    { saranPerihal: ["Ucapan terima kasih atas bantuan", "Ucapan terima kasih atas dukungan kegiatan"], kode: "d_terima_kasih", label: "Ucapan Terima Kasih atas Dukungan", layout: S(), posisi: P("eksternal"), nomorKode: "UTK",
      ringkas: "Berterima kasih atas dukungan yang sudah nyata diterima, menjaga hubungan untuk permohonan berikutnya.", kelompok: ["penerima", "terimaKasih", "ttd"],
      pembuka: "Dengan hormat, atas nama pengurus dan warga RW 03 Kelurahan Padasuka, kami menyampaikan terima kasih atas dukungan Bapak/Ibu dalam {perihal}.",
      penutup: "Semoga kerja sama yang baik ini dapat terus terjalin. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih." },
  ]),

  // ======================================================== MENJALANKAN JABATAN
  ...kat("J", [
    { saranPerihal: ["Wajib lapor penghuni kost/kontrakan melalui Visit RW3", "Pendaftaran usaha melalui RW3BIZ", "Jadwal kerja bakti warga", "Ketertiban dan keamanan lingkungan"], kode: "c_edaran", label: "Surat Edaran / Pengumuman", labelLama: "Surat Edaran", layout: S(), posisi: P("warga"), nomorKode: "SE", judulCetak: "SURAT EDARAN",
      ringkas: "Pemberitahuan, imbauan, atau ketentuan yang wajib diperhatikan warga, pemilik kost, dan pelaku usaha.", kelompok: ["edaran", "konteks", "ttd"],
      pembuka: "Sehubungan dengan {perihal}, bersama ini Ketua RW 03 Kelurahan Padasuka menyampaikan hal-hal sebagai berikut:",
      penutup: "Demikian edaran ini disampaikan untuk diperhatikan dan dilaksanakan bersama. Atas perhatian dan kerja sama Bapak/Ibu/Saudara, kami ucapkan terima kasih." },
    { saranPerihal: ["Pembentukan panitia kegiatan", "Penetapan hasil musyawarah warga", "Tata penggunaan fasilitas bersama"], kode: "jb_keputusan", label: "Keputusan Ketua RW", layout: S("keputusan"), posisi: P("internal"), nomorKode: "KPTS", judulCetak: "KEPUTUSAN KETUA RW 03 KELURAHAN PADASUKA",
      ringkas: "Penetapan hasil musyawarah, pembentukan tim/panitia, penetapan pengurus, tata fasilitas, atau perubahan keputusan. Wajib dasar yang diperiksa.",
      kelompok: ["jenisKeputusan", "keputusan", "dasarCek", "konteks"], perluDasar: true,
      butuhTindak: true },
    { saranPerihal: ["Musyawarah warga RW 03", "Serah-terima bantuan", "Pemeriksaan lapangan"], kode: "jb_berita_acara", label: "Berita Acara", layout: S("berita_acara"), posisi: P("internal"), nomorKode: "BA", judulCetak: "BERITA ACARA {jenisBA}",
      ringkas: "Satu format untuk musyawarah, pemeriksaan lapangan, klarifikasi/mediasi, hasil penanganan, serah-terima, penerimaan bantuan, atau kejadian.",
      kelompok: ["jenisBA", "beritaAcara", "konteks"],
      pembuka: "telah dilaksanakan kegiatan sebagaimana tersebut di bawah terkait {perihal}, dengan hasil sebagai berikut:" },
    { saranPerihal: ["Rapat pengurus RW 03", "Musyawarah warga RW 03"], kode: "e_notulen", label: "Notulen Rapat", layout: S("notulen"), posisi: P("internal"), nomorKode: "NOT", judulCetak: "NOTULEN RAPAT",
      ringkas: "Catatan rapat: pembahasan, keputusan, dan tindak lanjut beserta PIC.", kelompok: ["kegiatan", "acara", "notulen", "ttd"],
      butuhTindak: true },
    { saranPerihal: ["kegiatan kerja bakti", "penggunaan bantuan", "program RW 03"], kode: "jb_laporan", label: "Laporan Kegiatan / Pertanggungjawaban", layout: S("laporan"), posisi: P("internal"), nomorKode: "LAP", judulCetak: "{jenisLaporan}",
      ringkas: "Laporan progres, penyelesaian, penggunaan dana/barang, atau evaluasi program — bahan pertanggungjawaban kepada warga dan pemberi bantuan.",
      kelompok: ["laporan", "penggunaan", "konteks", "ttd"],
      pembuka: "Laporan {perihal} sebagai berikut:" },
  ]),

  // ======================================================== KUSTOM
  ...kat("F", [
    { saranPerihal: ["Surat tugas", "Undangan rapat pengurus", "Surat keterangan"], kode: "f_kustom", label: "Surat Kustom (isi bebas)", layout: S("kustom"), posisi: P("warga"), nomorKode: "SRT",
      ringkas: "Tulis sendiri isinya, mis. surat tugas, undangan rapat, atau surat keterangan. Bisa ber-\"Kepada Yth.\" atau dokumen berjudul.", kelompok: ["kustom", "ttd"] },
  ]),
];

export const PETA_JENIS: Record<string, JenisDokumen> = Object.fromEntries(KATALOG.map((j) => [j.kode, j]));

export function jenisDariKode(kode: string | null | undefined): JenisDokumen | undefined {
  return kode ? PETA_JENIS[kode] : undefined;
}

/** Cari jenis untuk label lama (8 jenis v1). Label tanpa padanan diarahkan ke Surat Kustom. */
export function jenisDariLabelLama(label: string | null | undefined): JenisDokumen | undefined {
  if (!label) return undefined;
  return KATALOG.find((j) => j.labelLama === label || j.label === label) ?? PETA_JENIS.f_kustom;
}

/** Kode jenis sebelum rombak → jenis pengganti. Kode yang tidak tercantum diarahkan ke Surat Kustom. */
export const KODE_LAMA: Record<string, { kode: string; awal?: DataDokumen }> = {
  c_ba_musyawarah: { kode: "jb_berita_acara", awal: { jenisBA: "Musyawarah" } },
  b_ba_periksa: { kode: "jb_berita_acara", awal: { jenisBA: "Pemeriksaan Lapangan" } },
  b_ba_klarifikasi: { kode: "jb_berita_acara", awal: { jenisBA: "Klarifikasi/Mediasi" } },
  b_ba_hasil: { kode: "jb_berita_acara", awal: { jenisBA: "Hasil Penanganan" } },
  b_permohonan_instansi: { kode: "mt_instansi", awal: { jenisPermohonan: "Penanganan permasalahan wilayah" } },
  d_peninjauan: { kode: "mt_instansi", awal: { jenisPermohonan: "Peninjauan lapangan" } },
  d_perbaikan: { kode: "mt_instansi", awal: { jenisPermohonan: "Perbaikan fasilitas umum" } },
  d_dana: { kode: "mt_bantuan" },
  d_barang: { kode: "mt_bantuan" },
  d_material_bekas: { kode: "mt_bantuan" },
  d_alat: { kode: "mt_bantuan" },
  d_jasa: { kode: "mt_bantuan" },
  d_kolaborasi: { kode: "mt_bantuan", awal: { bentukBantuan: "Kolaborasi/CSR" } },
  b_pengingat: { kode: "mt_susulan" },
  d_pengingat: { kode: "mt_susulan" },
  b_imbauan: { kode: "c_edaran" },
  c_akses: { kode: "c_edaran" },
  a_tim: { kode: "jb_keputusan", awal: { jenisKeputusan: "Pembentukan tim/panitia" } },
  a_koordinator: { kode: "jb_keputusan", awal: { jenisKeputusan: "Penetapan pengurus/koordinator" } },
  c_penetapan: { kode: "jb_keputusan", awal: { jenisKeputusan: "Penetapan hasil musyawarah" } },
  c_tata_fasilitas: { kode: "jb_keputusan", awal: { jenisKeputusan: "Tata penggunaan fasilitas" } },
  c_ubah: { kode: "jb_keputusan", awal: { jenisKeputusan: "Perubahan/pencabutan keputusan" } },
  e_progres: { kode: "jb_laporan", awal: { jenisLaporan: "Laporan Progres" } },
  e_selesai: { kode: "jb_laporan", awal: { jenisLaporan: "Laporan Penyelesaian" } },
  e_penggunaan: { kode: "jb_laporan", awal: { jenisLaporan: "Laporan Penggunaan Dana/Barang" } },
  e_evaluasi: { kode: "jb_laporan", awal: { jenisLaporan: "Laporan Evaluasi Program" } },
  a_evaluasi: { kode: "jb_laporan", awal: { jenisLaporan: "Laporan Evaluasi Program" } },
};

/**
 * Jenis + isian pengganti untuk dokumen berkode lama (draft atau salinan arsip).
 * `isiTeks` dipakai sebagai isi Surat Kustom bila kode lama tidak punya padanan.
 */
export function petakanKodeLama(kode: string, data: DataDokumen, isiTeks: string): { kode: string; data: DataDokumen } {
  if (PETA_JENIS[kode]) return { kode, data };
  const peta = KODE_LAMA[kode];
  if (peta) return { kode: peta.kode, data: { ...(PETA_JENIS[peta.kode].awal ?? {}), ...data, ...(peta.awal ?? {}) } };
  const kustom: DataDokumen = { isiSurat: isiTeks };
  for (const k of ["penerima", "tembusan", "penandatangan"]) if (data[k] !== undefined) kustom[k] = data[k];
  return { kode: "f_kustom", data: kustom };
}

export const LABEL_TUJUAN: Record<TujuanUtama, { judul: string; ket: string }> = {
  menegur: { judul: "Menegur", ket: "Panggilan klarifikasi, teguran lisan, SP-1 sampai SP-3, teguran provider/kontraktor, pernyataan kesanggupan" },
  meminta: { judul: "Meminta", ket: "Permohonan ke Kelurahan/Kecamatan/Dinas, audiensi, bantuan/CSR, surat susulan, terima kasih" },
  jabatan: { judul: "Jalankan Jabatan", ket: "Surat edaran, keputusan Ketua RW, berita acara, notulen, laporan pertanggungjawaban" },
  kustom: { judul: "Surat Kustom", ket: "Tulis isi surat sendiri tanpa format baku (surat tugas, undangan, keterangan)" },
};

export const LABEL_KATEGORI: Record<Kategori, string> = {
  T: "Menegur", M: "Meminta", J: "Menjalankan jabatan", F: "Surat kustom",
};
