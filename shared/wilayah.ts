/**
 * Modul Wilayah RW 03 — konstanta & helper murni (dipakai server, client, dan uji).
 * Role hanya dua: "rt" (Ketua RT 01–07) dan "rw" (Ketua RW).
 */

export const WILAYAH_RT_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;
export type WilayahRt = (typeof WILAYAH_RT_NUMBERS)[number];

export function isWilayahRt(v: unknown): v is WilayahRt {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && (WILAYAH_RT_NUMBERS as readonly number[]).includes(n);
}

export function labelRt(rt: number | null | undefined): string {
  return rt ? `RT ${String(rt).padStart(2, "0")}` : "RW 03";
}

export type WilayahRole = "rt" | "rw";
export type Pengelola = "rt" | "rw";

/** Status verifikasi untuk semua objek wilayah. */
export const STATUS_VERIFIKASI = ["terverifikasi", "perlu_cek", "ditolak"] as const;
export type StatusVerifikasi = (typeof STATUS_VERIFIKASI)[number];

// ---------------------------------------------------------------------------
// Fakta berwaktu: atribut subjek (warga/kk/rumah/usaha/fasilitas) dengan riwayat.
// Tidak ada fakta = belum diketahui. "tidak" dan "0" adalah jawaban yang diketahui.
// ---------------------------------------------------------------------------

export type SubjekFakta = "warga" | "kk" | "rumah" | "usaha" | "fasilitas";

export type TipeFakta = "yatidak" | "pilihan" | "angka";

export interface DefinisiFakta {
  kunci: string;
  subjek: SubjekFakta;
  label: string;
  /** Pertanyaan sederhana untuk Ketua RT / warga. */
  pertanyaan: string;
  tipe: TipeFakta;
  pilihan?: { nilai: string; label: string }[];
  /** Fakta kesehatan wajib menyebut sumber informasi terkonfirmasi. */
  wajibSumber?: boolean;
  /** Hanya relevan untuk perempuan. */
  khususPerempuan?: boolean;
  /** Kondisi yang berlaku sementara (hamil, nifas) — perlu tanggal mulai. */
  sementara?: boolean;
  kelompok: string;
}

export const SUMBER_INFORMASI = [
  { nilai: "keterangan_keluarga", label: "Keterangan keluarga" },
  { nilai: "kunjungan_rt", label: "Dilihat langsung Ketua RT" },
  { nilai: "kader_posyandu", label: "Kader posyandu" },
  { nilai: "puskesmas", label: "Puskesmas / tenaga kesehatan" },
  { nilai: "dokumen", label: "Dokumen resmi (kartu, surat)" },
  { nilai: "usulan_warga", label: "Isian warga lewat QR" },
  { nilai: "data_lama", label: "Data lama sistem (perlu dicek)" },
] as const;

export const FAKTA: DefinisiFakta[] = [
  // --- Warga: kesehatan (terkonfirmasi, bukan diagnosis otomatis) ---
  { kunci: "hamil", subjek: "warga", kelompok: "Kesehatan", label: "Sedang hamil", pertanyaan: "Apakah sedang hamil?", tipe: "yatidak", wajibSumber: true, khususPerempuan: true, sementara: true },
  { kunci: "nifas_menyusui", subjek: "warga", kelompok: "Kesehatan", label: "Nifas / menyusui", pertanyaan: "Apakah sedang masa nifas atau menyusui?", tipe: "yatidak", wajibSumber: true, khususPerempuan: true, sementara: true },
  { kunci: "hipertensi", subjek: "warga", kelompok: "Kesehatan", label: "Hipertensi", pertanyaan: "Sudah dinyatakan tenaga kesehatan mengidap darah tinggi (hipertensi)?", tipe: "yatidak", wajibSumber: true },
  { kunci: "diabetes", subjek: "warga", kelompok: "Kesehatan", label: "Diabetes melitus", pertanyaan: "Sudah dinyatakan tenaga kesehatan mengidap diabetes (gula)?", tipe: "yatidak", wajibSumber: true },
  { kunci: "jantung", subjek: "warga", kelompok: "Kesehatan", label: "Penyakit jantung", pertanyaan: "Sudah dinyatakan tenaga kesehatan mengidap penyakit jantung?", tipe: "yatidak", wajibSumber: true },
  { kunci: "kanker", subjek: "warga", kelompok: "Kesehatan", label: "Kanker", pertanyaan: "Sudah dinyatakan tenaga kesehatan mengidap kanker?", tipe: "yatidak", wajibSumber: true },
  { kunci: "ppok_asma", subjek: "warga", kelompok: "Kesehatan", label: "PPOK / asma", pertanyaan: "Sudah dinyatakan tenaga kesehatan mengidap PPOK atau asma?", tipe: "yatidak", wajibSumber: true },
  { kunci: "disabilitas", subjek: "warga", kelompok: "Kesehatan", label: "Penyandang disabilitas", pertanyaan: "Apakah penyandang disabilitas?", tipe: "yatidak", wajibSumber: true },
  { kunci: "stunting", subjek: "warga", kelompok: "Kesehatan", label: "Stunting", pertanyaan: "Sudah dinyatakan stunting oleh posyandu/puskesmas?", tipe: "yatidak", wajibSumber: true },
  { kunci: "remaja_putri_gizi", subjek: "warga", kelompok: "Kesehatan", label: "Remaja putri terpantau gizi", pertanyaan: "Remaja putri ini sudah dipantau gizinya (posyandu remaja/sekolah)?", tipe: "yatidak", wajibSumber: true, khususPerempuan: true },
  { kunci: "korban_narkoba", subjek: "warga", kelompok: "Kesehatan", label: "Korban narkoba", pertanyaan: "Terkonfirmasi sebagai korban penyalahgunaan narkoba?", tipe: "yatidak", wajibSumber: true },

  // --- Warga: pendidikan & pekerjaan ---
  {
    kunci: "pendidikan_terakhir", subjek: "warga", kelompok: "Pendidikan", label: "Pendidikan terakhir (tamat)", pertanyaan: "Pendidikan terakhir yang sudah tamat?", tipe: "pilihan",
    pilihan: [
      { nilai: "tidak_sekolah", label: "Tidak/belum sekolah" },
      { nilai: "belum_tamat_sd", label: "Belum tamat SD" },
      { nilai: "sd", label: "SD/MI" },
      { nilai: "smp", label: "SMP/MTs" },
      { nilai: "sma", label: "SMA/SMK/MA" },
      { nilai: "diploma", label: "Diploma (D1–D3)" },
      { nilai: "s1", label: "S1/D4" },
      { nilai: "s2", label: "S2" },
      { nilai: "s3", label: "S3" },
    ],
  },
  {
    kunci: "sekolah_aktif", subjek: "warga", kelompok: "Pendidikan", label: "Sekolah saat ini", pertanyaan: "Saat ini sedang sekolah di mana?", tipe: "pilihan",
    pilihan: [
      { nilai: "tidak", label: "Tidak sedang sekolah" },
      { nilai: "paud", label: "PAUD / KB" },
      { nilai: "tk_ra", label: "TK / RA" },
      { nilai: "sd_mi", label: "SD / MI" },
      { nilai: "smp_mts", label: "SMP / MTs" },
      { nilai: "sma_smk_ma", label: "SMA / SMK / MA" },
      { nilai: "perguruan_tinggi", label: "Kuliah" },
      { nilai: "slb", label: "SLB / layanan khusus" },
      { nilai: "paket_abc", label: "Paket A / B / C" },
    ],
  },
  { kunci: "buta_huruf", subjek: "warga", kelompok: "Pendidikan", label: "Belum bisa baca-tulis", pertanyaan: "Belum bisa membaca dan menulis?", tipe: "yatidak" },
  { kunci: "profesi_pendidik", subjek: "warga", kelompok: "Pendidikan", label: "Pendidik / dosen", pertanyaan: "Bekerja sebagai guru, pendidik, atau dosen?", tipe: "yatidak" },
  {
    kunci: "status_kerja", subjek: "warga", kelompok: "Pekerjaan", label: "Kegiatan utama", pertanyaan: "Kegiatan utama sehari-hari?", tipe: "pilihan",
    pilihan: [
      { nilai: "bekerja", label: "Bekerja / berusaha" },
      { nilai: "mencari_kerja", label: "Sedang mencari kerja" },
      { nilai: "sekolah", label: "Sekolah / kuliah" },
      { nilai: "mengurus_rumah", label: "Mengurus rumah tangga" },
      { nilai: "pensiun", label: "Pensiun" },
      { nilai: "tidak_mampu_bekerja", label: "Tidak mampu bekerja" },
      { nilai: "lainnya", label: "Lainnya" },
    ],
  },

  // --- Warga: seni ---
  { kunci: "pelaku_seni_musik", subjek: "warga", kelompok: "Seni", label: "Pelaku seni musik tradisional/religi", pertanyaan: "Aktif sebagai pelaku seni musik tradisional atau religi?", tipe: "yatidak" },
  { kunci: "pelaku_seni_tari", subjek: "warga", kelompok: "Seni", label: "Pelaku seni tari", pertanyaan: "Aktif sebagai pelaku seni tari?", tipe: "yatidak" },
  { kunci: "pelaku_seni_pertunjukan", subjek: "warga", kelompok: "Seni", label: "Pelaku seni pertunjukan/teater", pertanyaan: "Aktif sebagai pelaku seni pertunjukan atau teater rakyat?", tipe: "yatidak" },
  { kunci: "pelaku_seni_suara_sastra", subjek: "warga", kelompok: "Seni", label: "Pelaku seni suara/sastra", pertanyaan: "Aktif sebagai pelaku seni suara atau sastra lokal?", tipe: "yatidak" },
  { kunci: "pelaku_seni_beladiri", subjek: "warga", kelompok: "Seni", label: "Pelaku bela diri tradisional", pertanyaan: "Aktif sebagai pelaku bela diri tradisional?", tipe: "yatidak" },

  // --- KK: rumah tangga, sanitasi, bantuan ---
  { kunci: "air_bersih", subjek: "kk", kelompok: "Air & sanitasi", label: "Punya akses air bersih", pertanyaan: "Keluarga punya akses air bersih untuk minum dan masak?", tipe: "yatidak" },
  { kunci: "rentan_kekeringan", subjek: "kk", kelompok: "Air & sanitasi", label: "Rentan kekeringan", pertanyaan: "Air sering habis/kering saat kemarau?", tipe: "yatidak" },
  { kunci: "jamban", subjek: "kk", kelompok: "Air & sanitasi", label: "Punya jamban", pertanyaan: "Keluarga punya jamban/WC sendiri atau bersama yang layak?", tipe: "yatidak" },
  { kunci: "septictank", subjek: "kk", kelompok: "Air & sanitasi", label: "Punya septictank", pertanyaan: "Pembuangan WC ke septictank?", tipe: "yatidak" },
  { kunci: "internet", subjek: "kk", kelompok: "Air & sanitasi", label: "Punya akses internet", pertanyaan: "Keluarga bisa memakai internet (HP/wifi)?", tipe: "yatidak" },
  { kunci: "pilah_sampah", subjek: "kk", kelompok: "Air & sanitasi", label: "Memilah sampah", pertanyaan: "Keluarga memilah sampah (organik/anorganik)?", tipe: "yatidak" },
  { kunci: "bantuan_blt", subjek: "kk", kelompok: "Bantuan", label: "Penerima BLT", pertanyaan: "Menerima BLT?", tipe: "yatidak" },
  { kunci: "bantuan_pbi_jk", subjek: "kk", kelompok: "Bantuan", label: "Penerima PBI-JK (BPJS gratis)", pertanyaan: "Menerima BPJS Kesehatan gratis (PBI-JK)?", tipe: "yatidak" },
  { kunci: "bantuan_pkh", subjek: "kk", kelompok: "Bantuan", label: "Penerima PKH", pertanyaan: "Menerima PKH?", tipe: "yatidak" },
  { kunci: "bantuan_pmt", subjek: "kk", kelompok: "Bantuan", label: "Penerima PMT", pertanyaan: "Menerima PMT (makanan tambahan)?", tipe: "yatidak" },
  { kunci: "bantuan_rastrada", subjek: "kk", kelompok: "Bantuan", label: "Penerima RASTRADA", pertanyaan: "Menerima RASTRADA?", tipe: "yatidak" },
  { kunci: "bantuan_cpp", subjek: "kk", kelompok: "Bantuan", label: "Penerima CPP", pertanyaan: "Menerima CPP?", tipe: "yatidak" },
  { kunci: "bantuan_bpnt", subjek: "kk", kelompok: "Bantuan", label: "Penerima BPNT", pertanyaan: "Menerima BPNT (sembako)?", tipe: "yatidak" },
  { kunci: "miskin", subjek: "kk", kelompok: "Ekonomi", label: "Kategori miskin/kurang mampu", pertanyaan: "Termasuk keluarga miskin/kurang mampu (menurut data resmi)?", tipe: "yatidak" },
  { kunci: "rawan_pangan", subjek: "kk", kelompok: "Ekonomi", label: "Rawan pangan", pertanyaan: "Keluarga sering kekurangan makanan?", tipe: "yatidak" },
  { kunci: "berisiko_stunting", subjek: "kk", kelompok: "Kesehatan", label: "Keluarga berisiko stunting", pertanyaan: "Tercatat sebagai keluarga berisiko stunting (data posyandu/BKKBN)?", tipe: "yatidak", wajibSumber: true },

  // --- Rumah ---
  {
    kunci: "listrik", subjek: "rumah", kelompok: "Rumah", label: "Daya listrik", pertanyaan: "Daya listrik rumah (lihat meteran)?", tipe: "pilihan",
    pilihan: [
      { nilai: "tanpa_meteran", label: "Tidak punya meteran" },
      { nilai: "450", label: "450 VA" },
      { nilai: "900", label: "900 VA" },
      { nilai: "1300", label: "1.300 VA" },
      { nilai: "2200", label: "2.200 VA" },
      { nilai: "3500_plus", label: "3.500 VA ke atas" },
    ],
  },

  // --- Usaha ---
  { kunci: "nib", subjek: "usaha", kelompok: "Usaha", label: "Punya NIB", pertanyaan: "Usaha sudah punya NIB?", tipe: "yatidak" },
  { kunci: "pirt", subjek: "usaha", kelompok: "Usaha", label: "Punya izin PIRT", pertanyaan: "Punya izin PIRT?", tipe: "yatidak" },
  { kunci: "haki", subjek: "usaha", kelompok: "Usaha", label: "Punya HaKI", pertanyaan: "Punya HaKI / merek terdaftar?", tipe: "yatidak" },
  { kunci: "halal", subjek: "usaha", kelompok: "Usaha", label: "Sertifikat halal", pertanyaan: "Punya sertifikat halal?", tipe: "yatidak" },
  { kunci: "sni", subjek: "usaha", kelompok: "Usaha", label: "Sertifikat SNI", pertanyaan: "Punya sertifikat SNI?", tipe: "yatidak" },
  { kunci: "pemasaran_digital", subjek: "usaha", kelompok: "Usaha", label: "Pemasaran digital", pertanyaan: "Berjualan lewat online/media sosial?", tipe: "yatidak" },
  { kunci: "kredit", subjek: "usaha", kelompok: "Usaha", label: "Dapat kredit", pertanyaan: "Pernah/sedang mendapat kredit bank atau non-bank?", tipe: "yatidak" },

  // --- Fasilitas (posyandu) ---
  { kunci: "memenuhi_6_spm", subjek: "fasilitas", kelompok: "Posyandu", label: "Memenuhi 6 SPM", pertanyaan: "Posyandu memenuhi 6 SPM?", tipe: "yatidak" },
  { kunci: "bangunan_sendiri", subjek: "fasilitas", kelompok: "Posyandu", label: "Punya bangunan sendiri", pertanyaan: "Posyandu punya bangunan sendiri?", tipe: "yatidak" },
  {
    kunci: "strata", subjek: "fasilitas", kelompok: "Posyandu", label: "Strata posyandu", pertanyaan: "Strata posyandu?", tipe: "pilihan",
    pilihan: [
      { nilai: "pratama", label: "Pratama" },
      { nilai: "madya", label: "Madya" },
      { nilai: "purnama", label: "Purnama" },
      { nilai: "mandiri", label: "Mandiri / multifungsi" },
    ],
  },
  { kunci: "jumlah_kader", subjek: "fasilitas", kelompok: "Posyandu", label: "Jumlah kader", pertanyaan: "Jumlah kader aktif?", tipe: "angka" },
  { kunci: "kader_terlatih", subjek: "fasilitas", kelompok: "Posyandu", label: "Kader terlatih", pertanyaan: "Jumlah kader yang sudah dilatih?", tipe: "angka" },
];

export const FAKTA_BY_KUNCI = new Map(FAKTA.map((f) => [f.kunci, f]));

export function faktaUntuk(subjek: SubjekFakta): DefinisiFakta[] {
  return FAKTA.filter((f) => f.subjek === subjek);
}

export function validasiNilaiFakta(def: DefinisiFakta, nilai: string): string | null {
  if (def.tipe === "yatidak") return nilai === "ya" || nilai === "tidak" ? null : "Pilih Ya atau Tidak";
  if (def.tipe === "pilihan") return def.pilihan?.some((p) => p.nilai === nilai) ? null : "Pilihan tidak dikenal";
  const n = Number(nilai);
  return Number.isInteger(n) && n >= 0 ? null : "Isi dengan angka 0 atau lebih";
}

export function labelNilaiFakta(def: DefinisiFakta | undefined, nilai: string | null | undefined): string {
  if (nilai == null) return "Belum diketahui";
  if (!def) return nilai;
  if (def.tipe === "yatidak") return nilai === "ya" ? "Ya" : "Tidak";
  if (def.tipe === "pilihan") return def.pilihan?.find((p) => p.nilai === nilai)?.label ?? nilai;
  return nilai;
}

// ---------------------------------------------------------------------------
// Objek bersama: fasilitas, kelompok, kegiatan, kejadian
// ---------------------------------------------------------------------------

export const JENIS_FASILITAS = [
  { nilai: "poskamling", label: "Poskamling" },
  { nilai: "posyandu", label: "Posyandu" },
  { nilai: "tps", label: "Tempat pembuangan sampah (TPS)" },
  { nilai: "pengelolaan_sampah", label: "Tempat pengelolaan sampah skala RT" },
  { nilai: "lapangan_sepakbola", label: "Lapangan sepak bola / futsal / mini soccer" },
  { nilai: "lapangan_voli", label: "Lapangan voli" },
  { nilai: "lapangan_badminton", label: "Lapangan badminton" },
  { nilai: "lapangan_basket", label: "Lapangan basket" },
  { nilai: "olahraga_lain", label: "Sarana olahraga lainnya" },
  { nilai: "lainnya", label: "Fasilitas lainnya" },
] as const;

export const JENIS_SENI = [
  { nilai: "seni_musik", label: "Musik tradisional & religi" },
  { nilai: "seni_tari", label: "Tari tradisional & kontemporer" },
  { nilai: "seni_pertunjukan", label: "Pertunjukan & teater rakyat" },
  { nilai: "seni_suara_sastra", label: "Seni suara & sastra lokal" },
  { nilai: "seni_beladiri", label: "Bela diri tradisional" },
] as const;

export const JENIS_KELOMPOK = [
  ...JENIS_SENI,
  { nilai: "pkk", label: "PKK" },
  { nilai: "karang_taruna", label: "Karang Taruna" },
  { nilai: "majelis_taklim", label: "Majelis taklim" },
  { nilai: "lainnya", label: "Kelompok lainnya" },
] as const;

export const JENIS_KEGIATAN = [
  ...JENIS_SENI,
  { nilai: "pkk", label: "Kegiatan PKK RT" },
  { nilai: "pemberdayaan", label: "Pemberdayaan masyarakat" },
  { nilai: "rembug_rw", label: "Rembug RW" },
  { nilai: "siskamling", label: "Ronda / siskamling" },
  { nilai: "posyandu", label: "Kegiatan posyandu" },
  { nilai: "kerja_bakti", label: "Kerja bakti" },
  { nilai: "lainnya", label: "Kegiatan lainnya" },
] as const;

export const JENIS_KEJADIAN = [
  { nilai: "kematian_ibu_hamil", label: "Kematian ibu hamil", bagian: "kesehatan" },
  { nilai: "kematian_ibu_nifas", label: "Kematian ibu nifas", bagian: "kesehatan" },
  { nilai: "kematian_bayi", label: "Kematian bayi (0–11 bulan)", bagian: "kesehatan" },
  { nilai: "narkoba", label: "Kasus narkoba (pelaku warga)", bagian: "keamanan" },
  { nilai: "pencurian", label: "Pencurian / perampokan", bagian: "keamanan" },
  { nilai: "perjudian", label: "Perjudian", bagian: "keamanan" },
  { nilai: "prostitusi", label: "Prostitusi", bagian: "keamanan" },
  { nilai: "kekerasan_anak", label: "Kekerasan terhadap anak", bagian: "keamanan" },
  { nilai: "perkosaan", label: "Perkosaan", bagian: "keamanan" },
  { nilai: "penculikan", label: "Penculikan", bagian: "keamanan" },
  { nilai: "konflik_korban_jiwa", label: "Konflik dengan korban jiwa", bagian: "keamanan" },
  { nilai: "pembunuhan", label: "Pembunuhan", bagian: "keamanan" },
  { nilai: "infrastruktur", label: "Kerusakan jalan / saluran / fasilitas", bagian: "lingkungan" },
  { nilai: "kebersihan", label: "Sampah / kebersihan", bagian: "lingkungan" },
  { nilai: "bencana", label: "Banjir / longsor / kebakaran", bagian: "lingkungan" },
  { nilai: "sosial", label: "Masalah sosial / perselisihan warga", bagian: "sosial" },
  { nilai: "lainnya", label: "Masalah lainnya", bagian: "sosial" },
] as const;

export const STATUS_KEJADIAN = [
  { nilai: "baru", label: "Baru dicatat" },
  { nilai: "ditangani", label: "Sedang ditangani" },
  { nilai: "perlu_rw", label: "Perlu keputusan RW" },
  { nilai: "selesai", label: "Selesai" },
] as const;

/** Bagian yang harus dikonfirmasi RT tiap bulan agar "tidak ada kejadian" terbaca 0, bukan belum diketahui. */
export const BAGIAN_KONFIRMASI = [
  { nilai: "kejadian_kesehatan", label: "Kematian ibu & bayi bulan ini sudah dicatat semua", scope: "rt" },
  { nilai: "kejadian_keamanan", label: "Kejadian keamanan bulan ini sudah dicatat semua", scope: "rt" },
  { nilai: "kegiatan_rt", label: "Kegiatan PKK, pemberdayaan, dan seni bulan ini sudah dicatat semua", scope: "rt" },
  { nilai: "fasilitas_rt", label: "Daftar fasilitas di wilayah RT sudah lengkap", scope: "rt" },
  { nilai: "kelompok_rt", label: "Daftar kelompok seni di wilayah RT sudah lengkap", scope: "rt" },
  { nilai: "fasilitas_rw", label: "Daftar fasilitas bersama tingkat RW sudah lengkap", scope: "rw" },
  { nilai: "kegiatan_rw", label: "Kegiatan bersama tingkat RW bulan ini sudah dicatat semua", scope: "rw" },
  { nilai: "posyandu_rw", label: "Data posyandu bulan ini sudah lengkap", scope: "rw" },
] as const;
export type BagianKonfirmasi = (typeof BAGIAN_KONFIRMASI)[number]["nilai"];

export const KATEGORI_USAHA = [
  { nilai: "kuliner", label: "Kuliner & makanan olahan" },
  { nilai: "kerajinan", label: "Kerajinan tangan" },
  { nilai: "fashion", label: "Fashion, konveksi, tekstil" },
  { nilai: "agribisnis", label: "Agribisnis & ketahanan pangan" },
  { nilai: "jasa_kreatif", label: "Jasa kreatif & tekno-lokal" },
  { nilai: "lainnya", label: "Lainnya" },
] as const;

// ---------------------------------------------------------------------------
// Tanggal & umur
// ---------------------------------------------------------------------------

export const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const SINGKAT_BULAN = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEPT", "OKT", "NOV", "DES"];

export function isoTanggal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function awalBulan(tahun: number, bulan: number): string {
  return `${tahun}-${String(bulan).padStart(2, "0")}-01`;
}

export function akhirBulan(tahun: number, bulan: number): string {
  return isoTanggal(new Date(tahun, bulan, 0));
}

/** Tanggal acuan laporan: akhir bulan, atau hari ini bila bulan berjalan. */
export function tanggalAcuan(tahun: number, bulan: number, hariIni: Date = new Date()): string {
  const akhir = akhirBulan(tahun, bulan);
  const sekarang = isoTanggal(hariIni);
  return sekarang < akhir ? sekarang : akhir;
}

export function parseTanggal(v: string | null | undefined): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Umur dalam bulan penuh pada tanggal acuan; null bila tanggal lahir tidak diketahui. */
export function umurBulan(tanggalLahir: string | null | undefined, acuan: string): number | null {
  const lahir = parseTanggal(tanggalLahir);
  const a = parseTanggal(acuan);
  if (!lahir || !a || lahir > a) return null;
  let bulan = (a.getFullYear() - lahir.getFullYear()) * 12 + (a.getMonth() - lahir.getMonth());
  if (a.getDate() < lahir.getDate()) bulan -= 1;
  return bulan;
}

export function umurTahun(tanggalLahir: string | null | undefined, acuan: string): number | null {
  const b = umurBulan(tanggalLahir, acuan);
  return b == null ? null : Math.floor(b / 12);
}

/** Usia lansia untuk laporan kecamatan. */
export const USIA_LANSIA_KECAMATAN = 60;

export function bulanSebelumnya(tahun: number, bulan: number): { tahun: number; bulan: number } {
  return bulan === 1 ? { tahun: tahun - 1, bulan: 12 } : { tahun, bulan: bulan - 1 };
}

export function isBulanValid(tahun: unknown, bulan: unknown): boolean {
  const t = Number(tahun);
  const b = Number(bulan);
  return Number.isInteger(t) && t >= 2024 && t <= 2100 && Number.isInteger(b) && b >= 1 && b <= 12;
}

/** Bulan yang tampil di ekspor: template 2026 = Sept–Des; tahun lain default Jan–Des. */
export function bulanPeriodeEkspor(tahun: number, dari?: number, sampai?: number): number[] {
  const mulai = dari ?? (tahun === 2026 ? 9 : 1);
  const akhir = sampai ?? 12;
  const out: number[] = [];
  for (let b = Math.max(1, mulai); b <= Math.min(12, akhir); b++) out.push(b);
  return out;
}

// ---------------------------------------------------------------------------
// Form usulan warga (QR) — pertanyaan yang boleh dijawab sendiri oleh keluarga.
// Status yang perlu konfirmasi petugas (stunting, narkoba, miskin, berisiko stunting) tidak ditanyakan.
// ---------------------------------------------------------------------------

export const FAKTA_FORM_KK = ["air_bersih", "rentan_kekeringan", "jamban", "septictank", "internet", "pilah_sampah", "rawan_pangan",
  "bantuan_blt", "bantuan_pbi_jk", "bantuan_pkh", "bantuan_pmt", "bantuan_rastrada", "bantuan_cpp", "bantuan_bpnt"] as const;
export const FAKTA_FORM_RUMAH = ["listrik"] as const;
export const FAKTA_FORM_WARGA = ["pendidikan_terakhir", "sekolah_aktif", "status_kerja", "profesi_pendidik", "buta_huruf",
  "hamil", "nifas_menyusui", "hipertensi", "diabetes", "jantung", "kanker", "ppok_asma", "disabilitas",
  "pelaku_seni_musik", "pelaku_seni_tari", "pelaku_seni_pertunjukan", "pelaku_seni_suara_sastra", "pelaku_seni_beladiri"] as const;

export const FAKTA_FORM_USAHA = ["nib", "pirt", "haki", "halal", "sni", "pemasaran_digital", "kredit"] as const;

export const HUBUNGAN_KELUARGA = ["Kepala Keluarga", "Istri", "Suami", "Anak", "Menantu", "Cucu", "Orang Tua", "Mertua", "Famili Lain", "Lainnya"] as const;

export interface UsulanAnggota {
  nama: string;
  hubungan: string;
  jenisKelamin: "Laki-laki" | "Perempuan";
  tanggalLahir?: string | null;
  /** Kunci FAKTA_FORM_WARGA → nilai. Tidak diisi = belum diketahui. */
  jawaban: Record<string, string>;
  /** Anggota baru / pindah keluar / meninggal — diperiksa RT. */
  keterangan?: "tetap" | "baru" | "pindah" | "meninggal";
}

export interface UsulanUsaha {
  nama: string;
  kategori: string | null;
  pemilik: string;
  jawaban: Record<string, string>;
}

export interface IsiUsulan {
  versiForm: 1;
  namaPengisi: string;
  hubunganPengisi: string;
  nomorHp?: string | null;
  rumahTangga: Record<string, string>;
  anggota: UsulanAnggota[];
  usaha: UsulanUsaha[];
  catatan?: string | null;
}

// ---------------------------------------------------------------------------
// Kelengkapan keluarga (dipakai daftar kontak RT)
// ---------------------------------------------------------------------------

/** Fakta inti keluarga yang dipakai laporan kecamatan. */
export const FAKTA_INTI_KK = ["air_bersih", "jamban", "septictank", "internet", "pilah_sampah"] as const;
export const FAKTA_INTI_WARGA = ["pendidikan_terakhir", "sekolah_aktif", "status_kerja"] as const;
