import { KATEGORI_ADUAN, KATEGORI_ADUAN_INFO, KEWAJIBAN_SARAN, TINGKAT_TEGURAN, TINGKAT_TEGURAN_INFO } from "../aduan";
import type { Field, KelompokField, KolomTabel, Pihak } from "./tipe";

const teks = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "teks", ...o });
const uraian = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "uraian", ...o });
const tgl = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "tanggal", ...o });
const jam = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "waktu", saran: JAM, ...o });
const daftar = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "daftar", ...o });
const pihak = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "pihak", ...o });
const pilihan = (key: string, label: string, opsi: readonly string[], o: Partial<Field> = {}): Field => ({ key, label, tipe: "pilihan", opsi, ...o });
const tabel = (key: string, label: string, kolom: KolomTabel[], o: Partial<Field> = {}): Field => ({ key, label, tipe: "tabel", kolom, ...o });
const rp = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "rupiah", ...o });
const angka = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "angka", ...o });
const centang = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, tipe: "centang", internal: true, ...o });

const K = (key: string, label: string, tipe?: KolomTabel["tipe"], lebar?: number): KolomTabel => ({ key, label, tipe, lebar });

export const BENTUK_BANTUAN = [
  "Dana", "Barang", "Material baru", "Material bekas layak pakai", "Alat", "Kendaraan", "Tempat", "Jasa/tenaga ahli", "Kolaborasi/CSR",
] as const;

/** Urutan sama dengan TINGKAT_TEGURAN di shared/aduan.ts (lisan, sp1, sp2, sp3). */
export const TINGKAT_TEGURAN_CETAK = [
  "Teguran Lisan",
  "Peringatan Pertama (SP-1)",
  "Peringatan Kedua (SP-2)",
  "Peringatan Ketiga (SP-3) — peringatan terakhir",
] as const;

/** Sama dengan label kategori Aduan agar teguran dari Aduan dan dari Surat RW memakai istilah yang sama. */
export const JENIS_PELANGGARAN = KATEGORI_ADUAN.map((k) => KATEGORI_ADUAN_INFO[k].label);

export const JENIS_PERMOHONAN = [
  "Perbaikan fasilitas umum", "Peninjauan lapangan", "Penanganan permasalahan wilayah", "Penertiban/penindakan", "Data/izin/rekomendasi",
] as const;

/** Dicetak sebagai "BERITA ACARA {jenis}". */
export const JENIS_BA = [
  "Musyawarah", "Pemeriksaan Lapangan", "Klarifikasi/Mediasi", "Hasil Penanganan", "Serah-Terima", "Penerimaan Bantuan", "Kejadian",
] as const;

export const JENIS_KEPUTUSAN = [
  "Penetapan hasil musyawarah", "Pembentukan tim/panitia", "Penetapan pengurus/koordinator", "Tata penggunaan fasilitas", "Perubahan/pencabutan keputusan",
] as const;

/** Dicetak sebagai judul laporan. */
export const JENIS_LAPORAN = [
  "Laporan Progres", "Laporan Penyelesaian", "Laporan Penggunaan Dana/Barang", "Laporan Evaluasi Program",
] as const;

// ------------------------------------------------------------ pilihan cepat
const JAM = ["09:00", "13:00", "16:00", "19:30", "20:00"] as const;
const TEMPAT = ["Sekretariat RW 03, Jl. K.H. Usman Dhomiri", "Kantor Kelurahan Padasuka", "Rumah Ketua RT setempat", "Lokasi kejadian"] as const;
const LOKASI = ["Wilayah RT 01 RW 03", "Wilayah RT 02 RW 03", "Wilayah RT 03 RW 03", "Wilayah RT 04 RW 03", "Wilayah RW 03 Kelurahan Padasuka"] as const;
const TEMBUSAN = [
  "Lurah Padasuka", "Camat Cimahi Tengah", "Ketua RT 01 RW 03", "Ketua RT 02 RW 03", "Ketua RT 03 RW 03", "Ketua RT 04 RW 03",
  "Babinsa Kelurahan Padasuka", "Bhabinkamtibmas Kelurahan Padasuka", "Arsip",
] as const;
const I = (nama: string): Pihak => ({ nama, jenis: "instansi" });
export const PIHAK_INSTANSI: readonly Pihak[] = [
  I("Lurah Padasuka"), I("Camat Cimahi Tengah"), I("Kepala Dinas Pekerjaan Umum dan Penataan Ruang Kota Cimahi"),
  I("Kepala Dinas Lingkungan Hidup Kota Cimahi"), I("Kepala Satuan Polisi Pamong Praja Kota Cimahi"), I("Kepala Dinas Perhubungan Kota Cimahi"),
  I("Kepala Kepolisian Sektor Cimahi Tengah"), I("Bhabinkamtibmas Kelurahan Padasuka"), I("Babinsa Kelurahan Padasuka"),
];
const KONSEKUENSI_LAIN = [
  "Apabila tidak diindahkan, RW 03 tidak menerbitkan surat pengantar atau rekomendasi apa pun bagi yang bersangkutan sampai perbaikan dilakukan.",
  "Apabila tidak diindahkan, permasalahan ini diteruskan kepada Lurah Padasuka dan Satuan Polisi Pamong Praja Kota Cimahi untuk ditindak sesuai kewenangannya.",
];
const KONSEKUENSI: Record<string, readonly string[]> = Object.fromEntries(
  TINGKAT_TEGURAN_CETAK.map((t, i) => [t, [TINGKAT_TEGURAN_INFO[TINGKAT_TEGURAN[i]].konsekuensi, ...KONSEKUENSI_LAIN]]),
);
const KEWAJIBAN: Record<string, readonly string[]> = Object.fromEntries(KATEGORI_ADUAN.map((k) => [KATEGORI_ADUAN_INFO[k].label, KEWAJIBAN_SARAN[k]]));
const PENANGANAN: Record<(typeof JENIS_PERMOHONAN)[number], readonly string[]> = {
  "Perbaikan fasilitas umum": ["Perbaikan segera fasilitas yang rusak", "Peninjauan dan penganggaran perbaikan pada tahun berjalan"],
  "Peninjauan lapangan": ["Peninjauan lapangan bersama pengurus RW 03 pada waktu yang disepakati"],
  "Penanganan permasalahan wilayah": ["Penanganan sesuai kewenangan instansi", "Pendampingan penyelesaian bersama warga dan pengurus RW 03"],
  "Penertiban/penindakan": ["Penertiban oleh petugas berwenang", "Pemanggilan pihak terkait oleh instansi"],
  "Data/izin/rekomendasi": ["Penyampaian data yang diperlukan pengurus RW 03", "Penerbitan rekomendasi/izin sesuai ketentuan"],
};
const MENIMBANG: Record<(typeof JENIS_KEPUTUSAN)[number], readonly string[]> = {
  "Penetapan hasil musyawarah": ["bahwa hasil musyawarah warga RW 03 perlu ditetapkan agar dapat dilaksanakan bersama", "bahwa pelaksanaannya memerlukan penanggung jawab dan waktu yang jelas"],
  "Pembentukan tim/panitia": ["bahwa untuk kelancaran pelaksanaan kegiatan perlu dibentuk tim/panitia yang bertanggung jawab", "bahwa nama-nama yang tercantum dipandang mampu melaksanakan tugas tersebut"],
  "Penetapan pengurus/koordinator": ["bahwa untuk kelancaran pelayanan kepada warga perlu ditetapkan pengurus/koordinator", "bahwa nama-nama yang tercantum dipandang mampu melaksanakan tugas tersebut"],
  "Tata penggunaan fasilitas": ["bahwa fasilitas bersama perlu diatur penggunaannya agar tertib, adil, dan terawat"],
  "Perubahan/pencabutan keputusan": ["bahwa keputusan sebelumnya perlu disesuaikan dengan keadaan dan kebutuhan warga saat ini"],
};

/** Kunci yang ditangani tata letak (tidak dirender sebagai isi biasa). */
export const KUNCI_TATA_LETAK = new Set(["penerima", "tembusan", "penandatangan", "penandatanganBA", "tindakRencana"]);

export const KELOMPOK: Record<string, KelompokField> = {
  // ------------------------------------------------------------ bersama
  penerima: { id: "penerima", judul: "Penerima", fields: [
    pihak("penerima", "Kepada (penerima)", { wajib: true, preset: PIHAK_INSTANSI, bantuan: "Ketuk instansi yang sering dituju, cari dari data warga/usaha, atau tulis manual." }),
    daftar("tembusan", "Tembusan", { saran: TEMBUSAN }),
  ] },
  konteks: { id: "konteks", judul: "Fakta dan lokasi", fields: [
    teks("lokasi", "Lokasi", { saran: LOKASI }),
    uraian("fakta", "Fakta / latar belakang", { bantuan: "Tulis yang diketahui atau diamati, bukan kesimpulan atau tuduhan." }),
    teks("sumberFakta", "Sumber fakta (catatan internal, tidak dicetak)", { internal: true, bantuan: "Mis. laporan RT 02 tgl 3 Okt, pengamatan lapangan, foto. Tidak dicetak agar pelapor terlindungi." }),
  ] },
  lokasi: { id: "lokasi", judul: "Lokasi", fields: [
    teks("lokasi", "Lokasi", { saran: LOKASI }),
    teks("sumberFakta", "Sumber informasi (catatan internal, tidak dicetak)", { internal: true, bantuan: "Mis. aduan warga, laporan RT, pengamatan pengurus. Tidak dicetak agar pelapor terlindungi." }),
  ] },
  pic: { id: "pic", judul: "Penanggung jawab", fields: [
    pihak("pic", "Penanggung jawab"),
    teks("kontak", "Kontak koordinasi"),
  ] },
  rujukan: { id: "rujukan", judul: "Surat sebelumnya", fields: [
    teks("suratRujukan", "Nomor/perihal surat sebelumnya", { bantuan: "Boleh dikosongkan bila permohonan sebelumnya disampaikan lisan." }),
    tgl("tanggalRujukan", "Tanggal surat sebelumnya"),
  ] },
  ttd: { id: "ttd", judul: "Turut menandatangani (opsional)", fields: [
    pihak("penandatangan", "Turut menandatangani", { bantuan: "Biasanya dikosongkan. Ketua RW selalu menandatangani otomatis (tanda tangan + QR keaslian saat terbit). Isi hanya bila pihak lain ikut menandatangani, mis. Ketua RT terkait." }),
  ] },
  tindak: { id: "tindak", judul: "Langkah tindak lanjut", fields: [
    tabel("tindakRencana", "Rencana tindak lanjut (dicatat saat terbit)", [K("tindakan", "Tindakan"), K("pic", "PIC"), K("tenggat", "Tenggat", "tanggal")], { internal: true }),
  ] },
  acara: { id: "acara", judul: "Waktu dan tempat", fields: [
    tgl("waktuAcara", "Hari/tanggal", { wajib: true, cepat: [1, 2, 3, 7] }),
    jam("jamAcara", "Pukul", { wajib: true }),
    teks("tempatAcara", "Tempat", { wajib: true, saran: TEMPAT }),
    daftar("agenda", "Acara/agenda"),
  ] },

  // ------------------------------------------------------------ menegur
  klarifikasi: { id: "klarifikasi", judul: "Pokok klarifikasi", fields: [
    daftar("pokokPenjelasan", "Hal yang perlu dijelaskan", { wajib: true, bantuan: "Tulis netral: 'informasi mengenai …', bukan 'pelanggaran yang dilakukan'.",
      saran: ["Informasi mengenai keadaan yang disampaikan kepada pengurus RW 03", "Kronologi kejadian menurut Bapak/Ibu/Saudara", "Langkah yang sudah atau akan dilakukan"] }),
    daftar("pertanyaan", "Pertanyaan"),
    daftar("dokumenDibawa", "Dokumen yang mohon dibawa", { saran: ["KTP", "Kartu Keluarga", "Daftar penghuni kost/kontrakan", "Bukti pendaftaran usaha (RW3BIZ)", "Foto/bukti pendukung"] }),
  ] },
  teguranPihak: { id: "teguranPihak", judul: "Pihak yang ditegur", fields: [
    teks("pihakDitegur", "Pihak yang ditegur", { wajib: true }),
    teks("alamatDitegur", "Alamat"),
  ] },
  teguran: { id: "teguran", judul: "Teguran", fields: [
    pilihan("tingkatTeguran", "Tingkat teguran", TINGKAT_TEGURAN_CETAK, { wajib: true, bantuan: "Kalimat langkah lanjutan terisi otomatis sesuai tingkat." }),
    pilihan("jenisPelanggaran", "Jenis pelanggaran", JENIS_PELANGGARAN, { bantuan: "Menentukan saran \"yang wajib dilakukan\" di bawah." }),
    teks("dasarTeguran", "Dasar", { wajib: true, bantuan: "Jangan tulis nama pelapor.",
      saran: ["Hasil pemantauan langsung pengurus RW 03", "Aduan warga yang telah diperiksa pengurus RW 03", "Hasil klarifikasi di Sekretariat RW 03"] }),
    uraian("pelanggaran", "Hal yang ditegur", { wajib: true, bantuan: "Tulis perbuatan/kondisinya (apa, di mana, sejak kapan), bukan siapa yang melapor." }),
    daftar("ketentuanDilanggar", "Ketentuan yang tidak dipatuhi", { bantuan: "Hanya ketentuan yang benar-benar ada: Peraturan RW, surat edaran RW, kesepakatan yang ditandatangani, atau peraturan daerah." }),
    daftar("kewajibanPerbaikan", "Yang wajib dilakukan", { wajib: true, saran: { dari: "jenisPelanggaran", peta: KEWAJIBAN } }),
    tgl("tenggatPerbaikan", "Batas waktu perbaikan", { wajib: true, cepat: [3, 7, 14] }),
    daftar("riwayatTeguran", "Teguran sebelumnya", { bantuan: "Mis. Peringatan Pertama (SP-1) nomor … tanggal …" }),
    uraian("konsekuensi", "Langkah lanjutan", { wajib: true, saran: { dari: "tingkatTeguran", peta: KONSEKUENSI } }),
  ] },
  pekerjaanProvider: { id: "pekerjaanProvider", judul: "Pekerjaan yang ditegur", fields: [
    teks("pekerjaan", "Pekerjaan", { wajib: true, bantuan: "Menyambung kalimat \"pengurus RW 03 mendapati …\". Tambahkan lokasinya, mis. \"… di Jl. Padasuka Gg. Melati\".",
      saran: ["pekerjaan galian kabel fiber optik", "pemasangan tiang dan kabel udara", "galian pipa air bersih", "pembangunan/renovasi bangunan", "penumpukan material di badan jalan"] }),
    teks("pelaksanaPekerjaan", "Pelaksana di lapangan"),
    tgl("tanggalTemuan", "Tanggal temuan", { wajib: true, cepat: [0, -1, -2] }),
    daftar("masalahPekerjaan", "Masalah yang ditemukan", { wajib: true,
      saran: ["Tidak ada pemberitahuan kepada pengurus RW 03 maupun Ketua RT", "Galian dibiarkan terbuka tanpa rambu pengaman", "Kabel menjuntai/semrawut dan membahayakan", "Akses kendaraan dan pejalan kaki warga terhalang", "Jalan/saluran rusak akibat pekerjaan"] }),
    daftar("tuntutanPekerjaan", "Yang harus dilakukan", { wajib: true,
      saran: ["Hentikan sementara pekerjaan sampai berkoordinasi dengan pengurus RW 03", "Tutup dan rapikan galian seperti semula", "Pasang rambu pengaman selama pekerjaan berlangsung", "Rapikan kabel yang menjuntai", "Perbaiki jalan/saluran yang rusak akibat pekerjaan"] }),
    tgl("tenggatPerbaikan", "Batas waktu", { wajib: true, cepat: [3, 7, 14] }),
  ] },
  kesepakatan: { id: "kesepakatan", judul: "Pernyataan / kesepakatan", fields: [
    pihak("paraPihak", "Para pihak", { wajib: true }),
    daftar("butirSepakat", "Butir yang disanggupi/disepakati", { wajib: true }),
    tabel("kewajiban", "Kewajiban masing-masing", [K("pihak", "Pihak", undefined, 2), K("kewajiban", "Kewajiban", undefined, 5), K("batas", "Batas waktu", "tanggal", 2)], { wajib: true }),
    uraian("pemantauan", "Cara pemantauan", { wajib: true,
      saran: ["Dipantau Ketua RT setempat dan dilaporkan kepada Ketua RW 03", "Pemeriksaan lapangan oleh pengurus RW 03 pada batas waktu"] }),
    centang("konfirmasiPihak", "Para pihak sudah membaca dan menyetujui seluruh butir di hadapan RW", { wajib: true }),
  ] },

  // ------------------------------------------------------------ meminta
  jenisPermohonan: { id: "jenisPermohonan", judul: "Permohonan", fields: [
    pilihan("jenisPermohonan", "Jenis permohonan", JENIS_PERMOHONAN, { wajib: true }),
    tgl("harapanTanggapan", "Mohon tanggapan sebelum", { cepat: [7, 14, 30] }),
  ] },
  perbaikan: { id: "perbaikan", judul: "Kondisi dan penanganan", fields: [
    teks("aset", "Objek/lokasi permohonan", { wajib: true, saran: ["Jalan lingkungan", "Saluran drainase", "Penerangan jalan umum (PJU)", "Jembatan/gorong-gorong", "Fasilitas umum RW 03"] }),
    uraian("kondisi", "Kondisi/permasalahan", { wajib: true }),
    uraian("dampak", "Dampak bagi warga", { wajib: true }),
    daftar("buktiKondisi", "Bukti (foto/dokumen terlampir)", { saran: ["Foto kondisi lapangan (terlampir)", "Daftar warga terdampak (terlampir)"] }),
    daftar("langkahSebelumnya", "Langkah yang sudah dilakukan RW", { saran: ["Kerja bakti warga", "Pemberitahuan lisan kepada pihak terkait", "Pelaporan melalui Ketua RT"] }),
    uraian("penangananDimohon", "Yang dimohonkan", { wajib: true, saran: { dari: "jenisPermohonan", peta: PENANGANAN } }),
  ] },
  audiensi: { id: "audiensi", judul: "Audiensi", fields: [
    uraian("maksudAudiensi", "Maksud audiensi", { wajib: true }),
    daftar("pokokBahasan", "Pokok bahasan", { wajib: true }),
    teks("usulanWaktu", "Usulan waktu", { wajib: true, saran: ["Hari kerja, pukul 09.00–12.00 WIB", "Menyesuaikan waktu Bapak/Ibu"] }),
    tabel("delegasi", "Delegasi RW", [K("nama", "Nama", undefined, 3), K("jabatan", "Jabatan", undefined, 3)]),
  ] },
  bantuan: { id: "bantuan", judul: "Bantuan yang dimohonkan", fields: [
    pilihan("bentukBantuan", "Bentuk bantuan", BENTUK_BANTUAN, { wajib: true }),
    teks("program", "Program/kegiatan", { wajib: true }),
    uraian("manfaat", "Manfaat bagi warga", { wajib: true }),
    tabel("rincian", "Rincian (jumlah/spesifikasi/RAB)", [K("uraian", "Uraian", undefined, 4), K("spesifikasi", "Spesifikasi", undefined, 3), K("jumlah", "Jumlah", "angka", 1), K("satuan", "Satuan", undefined, 1), K("biaya", "Perkiraan biaya", "rupiah", 2)]),
    rp("nominal", "Nominal yang dimohonkan"),
    teks("jadwalPelaksanaan", "Jadwal pelaksanaan"),
    daftar("dukunganLain", "Dukungan lain yang sudah ada", { saran: ["Swadaya warga RW 03", "Kas RW 03", "Gotong royong tenaga warga"] }),
    uraian("pertanggungjawaban", "Cara pertanggungjawaban", { wajib: true,
      saran: ["Laporan penggunaan tertulis disertai foto kegiatan dan bukti belanja", "Berita acara serah-terima dan laporan penggunaan kepada pemberi bantuan", "Diumumkan terbuka kepada warga melalui laporan kas RW 03"] }),
  ] },
  pengingat: { id: "pengingat", judul: "Yang ditagih", fields: [
    uraian("halBelum", "Hal yang belum mendapat tanggapan", { wajib: true }),
    tgl("batasTanggapan", "Mohon tanggapan paling lambat", { cepat: [7, 14] }),
  ] },
  terimaKasih: { id: "terimaKasih", judul: "Dukungan yang diterima", fields: [
    uraian("bentukDukungan", "Dukungan yang sudah diterima", { wajib: true, bantuan: "Hanya dukungan nyata yang sudah diterima." }),
    tgl("tanggalDukungan", "Tanggal diterima", { wajib: true, cepat: [0, -1, -7] }),
    uraian("manfaatDirasakan", "Manfaat yang dirasakan"),
  ] },

  // ------------------------------------------------------------ menjalankan jabatan
  edaran: { id: "edaran", judul: "Isi edaran", fields: [
    pilihan("sifatEdaran", "Sifat edaran", ["Pemberitahuan", "Imbauan", "Ketentuan yang wajib dipatuhi"], { wajib: true }),
    teks("sasaran", "Ditujukan kepada", { wajib: true,
      saran: ["Seluruh warga RW 03", "Pemilik dan pengelola kost/kontrakan di RW 03", "Pelaku usaha di RW 03", "Ketua RT 01–04 dan pengurus RW 03"] }),
    daftar("dasarEdaran", "Dasar", { bantuan: "Opsional. Hanya rujukan yang ada: Peraturan RW, hasil musyawarah, surat Kelurahan.",
      saran: ["Hasil musyawarah warga RW 03", "Hasil rapat pengurus RW 03", "Surat dari Kelurahan Padasuka"] }),
    uraian("informasi", "Informasi", { wajib: true }),
    daftar("tindakanWarga", "Yang perlu dilakukan", { wajib: true }),
    teks("jadwalEdaran", "Berlaku/jadwal", { saran: ["Berlaku sejak tanggal edaran ini", "Berlaku sampai ada pemberitahuan lebih lanjut"] }),
    teks("kontak", "Kontak koordinasi", { saran: ["Sekretariat RW 03", "Ketua RT setempat"] }),
  ] },
  jenisKeputusan: { id: "jenisKeputusan", judul: "Jenis keputusan", fields: [
    pilihan("jenisKeputusan", "Jenis keputusan", JENIS_KEPUTUSAN, { wajib: true }),
    tabel("susunan", "Susunan tim/pengurus (bila ada)", [K("nama", "Nama", undefined, 3), K("peran", "Jabatan/peran", undefined, 2), K("unsur", "Unsur/RT", undefined, 2)]),
    teks("keputusanDiubah", "Keputusan yang diubah/dicabut (bila ada)"),
  ] },
  keputusan: { id: "keputusan", judul: "Keputusan", fields: [
    teks("objekKeputusan", "Objek keputusan", { wajib: true }),
    daftar("menimbang", "Menimbang", { wajib: true, saran: { dari: "jenisKeputusan", peta: MENIMBANG } }),
    daftar("butirKeputusan", "Butir keputusan", { wajib: true }),
    pihak("pelaksana", "Penanggung jawab pelaksanaan"),
    teks("masaBerlaku", "Masa berlaku", { saran: ["Sejak tanggal ditetapkan sampai ada keputusan perubahan", "Satu tahun sejak tanggal ditetapkan"] }),
    teks("evaluasiKeputusan", "Waktu/cara evaluasi", { saran: ["Dievaluasi dalam musyawarah RW berikutnya", "Dievaluasi setiap enam bulan oleh pengurus RW 03"] }),
  ] },
  dasarCek: { id: "dasarCek", judul: "Dasar (wajib diperiksa)", fields: [
    daftar("dasar", "Dasar/rujukan", { bantuan: "Hanya rujukan yang benar-benar ada: Peraturan RW (RW3LAW), notulen musyawarah atau rapat pengurus, surat instansi. Jangan mengarang dasar hukum." }),
    teks("sumberMusyawarah", "Musyawarah/rapat sumber keputusan", { bantuan: "Mis. Musyawarah RW tgl 5 Okt 2026, notulen no. …" }),
    centang("dasarDiperiksa", "Dasar sudah diperiksa Ketua RW dan dokumen rujukannya tersedia", { wajib: true }),
  ] },
  jenisBA: { id: "jenisBA", judul: "Jenis berita acara", fields: [
    pilihan("jenisBA", "Jenis berita acara", JENIS_BA, { wajib: true }),
  ] },
  beritaAcara: { id: "beritaAcara", judul: "Berita acara", fields: [
    tgl("waktuAktual", "Tanggal pelaksanaan (aktual)", { wajib: true, cepat: [0, -1, -2] }),
    jam("jamMulai", "Mulai pukul"),
    jam("jamSelesai", "Selesai pukul"),
    teks("tempatAcara", "Tempat", { wajib: true, saran: TEMPAT }),
    tabel("peserta", "Yang hadir", [K("nama", "Nama", undefined, 3), K("peran", "Peran", undefined, 2), K("unsur", "Unsur/RT", undefined, 2)], { wajib: true }),
    daftar("sumberKeterangan", "Sumber keterangan"),
    daftar("faktaPengamatan", "Fakta yang diamati/disampaikan", { wajib: true }),
    tabel("rincianBarang", "Rincian barang/dokumen (untuk serah-terima atau penerimaan bantuan)", [K("uraian", "Uraian", undefined, 4), K("jumlah", "Jumlah", "angka", 1), K("satuan", "Satuan", undefined, 1), K("kondisi", "Kondisi", undefined, 2)]),
    tabel("pendapatPihak", "Pendapat para pihak", [K("pihak", "Pihak", undefined, 2), K("pendapat", "Pendapat", undefined, 5)]),
    daftar("hasil", "Hasil", { wajib: true }),
    daftar("belumDisepakati", "Hal yang belum disepakati"),
    pihak("penandatanganBA", "Yang ikut menandatangani", { wajib: true, bantuan: "Pihak yang hadir dan ikut menandatangani. Ketua RW menandatangani otomatis sebagai \"Mengetahui\"." }),
  ] },
  kegiatan: { id: "kegiatan", judul: "Kegiatan", fields: [
    teks("namaKegiatan", "Nama kegiatan", { wajib: true, saran: ["Rapat pengurus RW 03", "Musyawarah warga RW 03", "Rapat koordinasi Ketua RT 01–04"] }),
  ] },
  notulen: { id: "notulen", judul: "Notulen", fields: [
    teks("pimpinanRapat", "Pimpinan rapat", { wajib: true, saran: ["Raden Raka A.K.S (Ketua RW 03)"] }),
    teks("notulis", "Notulis", { wajib: true, saran: ["Sekretaris RW 03"] }),
    teks("pesertaRingkas", "Peserta", { saran: ["Pengurus RW 03 dan Ketua RT 01–04", "Warga RW 03"] }),
    tabel("pembahasan", "Pembahasan", [K("agenda", "Agenda", undefined, 2), K("pembahasan", "Pembahasan", undefined, 5)], { wajib: true }),
    daftar("keputusanRapat", "Keputusan/kesimpulan"),
    tabel("tindakLanjutRapat", "Tindak lanjut", [K("tindakan", "Tindakan", undefined, 4), K("pic", "PIC", undefined, 2), K("tenggat", "Tenggat", "tanggal", 2)]),
  ] },
  laporan: { id: "laporan", judul: "Laporan", fields: [
    pilihan("jenisLaporan", "Jenis laporan", JENIS_LAPORAN, { wajib: true }),
    teks("namaPekerjaan", "Kegiatan/program", { wajib: true }),
    teks("periodeLaporan", "Periode/waktu pelaksanaan", { wajib: true }),
    daftar("target", "Target/rencana"),
    daftar("realisasi", "Hasil yang dicapai", { wajib: true }),
    angka("persentase", "Persentase capaian (%)"),
    daftar("kendala", "Kendala"),
    daftar("rekomendasi", "Rekomendasi/langkah berikutnya"),
    daftar("buktiProgres", "Bukti (terlampir)", { saran: ["Foto kegiatan (terlampir)", "Kwitansi/nota belanja (terlampir)", "Daftar hadir (terlampir)"] }),
  ] },
  penggunaan: { id: "penggunaan", judul: "Penggunaan dana/barang (isi bila ada)", fields: [
    teks("sumberDanaRujukan", "Sumber dana/barang", { saran: ["Kas RW 03", "Swadaya warga RW 03", "Bantuan CSR", "Bantuan Kelurahan Padasuka"] }),
    rp("danaDiterima", "Dana diterima"),
    tabel("penggunaanDana", "Penggunaan dana", [K("tanggal", "Tanggal", "tanggal", 2), K("uraian", "Uraian", undefined, 5), K("jumlah", "Jumlah", "rupiah", 2)]),
    tabel("penggunaanBarang", "Penggunaan barang", [K("barang", "Barang", undefined, 3), K("diterima", "Diterima", "angka", 1), K("digunakan", "Digunakan", "angka", 1), K("sisa", "Sisa", "angka", 1), K("keterangan", "Keterangan", undefined, 3)]),
  ] },

  // ------------------------------------------------------------ surat kustom
  kustom: { id: "kustom", judul: "Isi surat", fields: [
    pihak("penerima", "Kepada (opsional)", { preset: PIHAK_INSTANSI, bantuan: "Isi untuk surat ber-\"Kepada Yth.\". Kosongkan untuk dokumen berjudul (mis. surat keterangan, pengumuman)." }),
    teks("judulSurat", "Judul dokumen", { bantuan: "Dipakai bila penerima kosong. Kosongkan untuk memakai perihal.", saran: ["SURAT TUGAS", "SURAT UNDANGAN", "SURAT KETERANGAN", "PENGUMUMAN"] }),
    uraian("isiSurat", "Isi surat", { wajib: true, bantuan: "Tulis bebas. Pisahkan paragraf dengan satu baris kosong." }),
    daftar("poinSurat", "Butir/poin (opsional)", { bantuan: "Dicetak sebagai daftar bernomor sesudah isi surat." }),
    uraian("penutupSurat", "Kalimat penutup", { bantuan: "Kosongkan untuk penutup baku. Tulis \"-\" bila tanpa penutup." }),
    daftar("tembusan", "Tembusan", { saran: TEMBUSAN }),
  ] },
};

export function semuaField(kelompokIds: string[]): Field[] {
  const seen = new Set<string>();
  const out: Field[] = [];
  for (const id of kelompokIds) {
    for (const f of KELOMPOK[id]?.fields ?? []) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      out.push(f);
    }
  }
  return out;
}
