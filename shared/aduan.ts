/**
 * Aduan Warga RW 03 — satu pintu untuk semua aduan (warga, kost/kontrakan, usaha, lingkungan).
 * Teguran resmi bertingkat diterbitkan lewat Surat Sakti (nomor resmi + QR verifikasi).
 */

// ---------------------------------------------------------------- Kategori
export const KATEGORI_ADUAN = [
  "sampah",
  "kebisingan",
  "keamanan",
  "parkir",
  "usaha",
  "kost",
  "bangunan",
  "ketertiban",
  "hewan",
  "lainnya",
] as const;
export type KategoriAduan = (typeof KATEGORI_ADUAN)[number];

export const KATEGORI_ADUAN_INFO: Record<KategoriAduan, { label: string; contoh: string; bobot: number }> = {
  sampah: { label: "Sampah & kebersihan", contoh: "buang sampah sembarangan, selokan mampet, bakar sampah", bobot: 1 },
  kebisingan: { label: "Kebisingan", contoh: "musik keras malam hari, knalpot bising, keributan", bobot: 1 },
  keamanan: { label: "Keamanan", contoh: "orang mencurigakan, pencurian, mabuk-mabukan, narkoba", bobot: 3 },
  parkir: { label: "Parkir & akses jalan", contoh: "kendaraan menutup jalan/gang, parkir di depan rumah orang", bobot: 1 },
  usaha: { label: "Usaha mengganggu", contoh: "warung/lapak mengganggu, limbah usaha, bongkar muat", bobot: 2 },
  kost: { label: "Kost / kontrakan", contoh: "penghuni tidak lapor, ramai tengah malam, tamu menginap", bobot: 2 },
  bangunan: { label: "Bangunan & lingkungan", contoh: "bangunan membahayakan, renovasi mengganggu, pohon rawan tumbang", bobot: 2 },
  ketertiban: { label: "Ketertiban & sosial", contoh: "perselisihan tetangga, pelanggaran aturan RW, perilaku tidak pantas", bobot: 2 },
  hewan: { label: "Hewan peliharaan", contoh: "kotoran hewan, hewan lepas, gonggongan terus-menerus", bobot: 1 },
  lainnya: { label: "Lainnya", contoh: "hal lain yang mengganggu kenyamanan warga RW 03", bobot: 1 },
};

/** Saran "yang wajib dilakukan" pada teguran/SP per kategori. */
export const KEWAJIBAN_SARAN: Record<KategoriAduan, string[]> = {
  sampah: ["Tidak membuang sampah sembarangan", "Membersihkan sampah di lokasi paling lambat batas waktu", "Membuang sampah sesuai jadwal pengangkutan RW 03"],
  kebisingan: ["Tidak menimbulkan suara keras di atas pukul 22.00", "Menghormati waktu istirahat tetangga"],
  keamanan: ["Menghentikan kegiatan yang meresahkan warga", "Melapor kepada pengurus RW bila menerima tamu menginap"],
  parkir: ["Tidak memarkir kendaraan menutup jalan/gang", "Memastikan akses rumah warga tidak terhalang"],
  usaha: ["Menjaga kebersihan dan ketertiban lokasi usaha", "Mengatur parkir pembeli agar tidak menghalangi jalan", "Mendaftarkan usaha melalui RW3BIZ (rw3padasukacimahi.org)"],
  kost: ["Melaporkan seluruh penghuni melalui Visit RW3 (rw3padasukacimahi.org)", "Menyerahkan salinan KTP penghuni kepada Ketua RT setempat", "Menjaga ketenangan lingkungan setelah pukul 22.00"],
  bangunan: ["Mengamankan bangunan/material agar tidak membahayakan warga", "Memperbaiki kerusakan yang ditimbulkan", "Tidak menempatkan material di badan jalan atau saluran"],
  ketertiban: ["Menjaga ketertiban dan menghormati tetangga", "Menyelesaikan perselisihan melalui musyawarah RW"],
  hewan: ["Menjaga hewan peliharaan agar tidak berkeliaran", "Membersihkan kotoran hewan di area umum"],
  lainnya: [],
};

/** Kategori aduan → jenis pelanggaran RW3BIZ saat aduan usaha diteruskan ke sistem denda. */
export const KATEGORI_KE_PELANGGARAN_BIZ: Record<KategoriAduan, string> = {
  sampah: "sampah_tercecer",
  kebisingan: "ketertiban",
  keamanan: "ketertiban",
  parkir: "parkir_menghalangi",
  usaha: "lainnya",
  kost: "lainnya",
  bangunan: "kerusakan_fasum",
  ketertiban: "ketertiban",
  hewan: "lainnya",
  lainnya: "lainnya",
};

// ---------------------------------------------------------------- Kerahasiaan pelapor
export const MODE_IDENTITAS = ["rahasia", "anonim", "terbuka"] as const;
export type ModeIdentitas = (typeof MODE_IDENTITAS)[number];

export const MODE_IDENTITAS_INFO: Record<ModeIdentitas, { label: string; singkat: string; poin: string[] }> = {
  rahasia: {
    label: "Rahasia",
    singkat: "Hanya Ketua RW yang tahu siapa Anda",
    poin: [
      "Nama dan WhatsApp disimpan terenkripsi, tidak bisa dibaca siapa pun selain Ketua RW.",
      "Tidak pernah diberitahukan kepada pihak yang diadukan, dan tidak dicetak di surat teguran.",
      "Setiap kali identitas Anda dibuka, tercatat siapa yang membuka dan kapan.",
      "RW bisa menghubungi Anda bila perlu keterangan tambahan.",
    ],
  },
  anonim: {
    label: "Anonim",
    singkat: "Tanpa nama, tanpa nomor — sama sekali tidak tercatat",
    poin: [
      "Nama dan WhatsApp tidak diminta dan tidak disimpan.",
      "Pantau aduan hanya dengan kode lacak + PIN yang muncul setelah kirim.",
      "RW tidak bisa menghubungi Anda, jadi sertakan foto dan cerita sejelas mungkin.",
    ],
  },
  terbuka: {
    label: "Terbuka",
    singkat: "Saya bersedia diketahui dan siap menjadi saksi",
    poin: [
      "Nama Anda boleh disampaikan kepada pihak yang diadukan.",
      "Anda bisa diundang saat klarifikasi atau musyawarah penyelesaian.",
      "Aduan terbuka biasanya lebih cepat ditindaklanjuti karena ada saksi.",
    ],
  },
};

// ---------------------------------------------------------------- Teradu, frekuensi, dampak
export const JENIS_TERADU = ["warga", "warga_singgah", "usaha", "pihak_lain", "tidak_tahu"] as const;
export type JenisTeradu = (typeof JENIS_TERADU)[number];
export const JENIS_TERADU_LABEL: Record<JenisTeradu, string> = {
  warga: "Warga RW 03",
  warga_singgah: "Penghuni kost / kontrakan",
  usaha: "Usaha / warung / lapak",
  pihak_lain: "Pihak lain",
  tidak_tahu: "Belum tahu / tidak jelas",
};

export const FREKUENSI_ADUAN = ["sekali", "berulang", "setiap_hari"] as const;
export type FrekuensiAduan = (typeof FREKUENSI_ADUAN)[number];
export const FREKUENSI_ADUAN_LABEL: Record<FrekuensiAduan, string> = {
  sekali: "Baru sekali",
  berulang: "Sudah berulang",
  setiap_hari: "Hampir setiap hari",
};

export const DAMPAK_ADUAN = ["mengganggu", "merugikan", "membahayakan"] as const;
export type DampakAduan = (typeof DAMPAK_ADUAN)[number];
export const DAMPAK_ADUAN_LABEL: Record<DampakAduan, string> = {
  mengganggu: "Mengganggu kenyamanan",
  merugikan: "Merugikan warga",
  membahayakan: "Membahayakan keselamatan",
};

// ---------------------------------------------------------------- Prioritas
export const PRIORITAS_ADUAN = ["darurat", "tinggi", "sedang", "rendah"] as const;
export type PrioritasAduan = (typeof PRIORITAS_ADUAN)[number];
export const PRIORITAS_ADUAN_LABEL: Record<PrioritasAduan, string> = {
  darurat: "Darurat",
  tinggi: "Tinggi",
  sedang: "Sedang",
  rendah: "Rendah",
};

/** Skor = bobot kategori + frekuensi + dampak. Membahayakan + keamanan selalu darurat. */
export function hitungPrioritas(kategori: KategoriAduan, frekuensi: FrekuensiAduan, dampak: DampakAduan): PrioritasAduan {
  if (dampak === "membahayakan" && kategori === "keamanan") return "darurat";
  const skor =
    KATEGORI_ADUAN_INFO[kategori].bobot +
    FREKUENSI_ADUAN.indexOf(frekuensi) +
    DAMPAK_ADUAN.indexOf(dampak) * 2;
  if (skor >= 6) return "darurat";
  if (skor >= 4) return "tinggi";
  if (skor >= 2) return "sedang";
  return "rendah";
}

// ---------------------------------------------------------------- Status aduan
export const STATUS_ADUAN = [
  "masuk",
  "diproses",
  "klarifikasi",
  "terbukti",
  "teguran",
  "selesai",
  "tidak_terbukti",
  "digabung",
] as const;
export type StatusAduan = (typeof STATUS_ADUAN)[number];

export const STATUS_ADUAN_INFO: Record<StatusAduan, { label: string; publik: string; tutup: boolean }> = {
  masuk: { label: "Baru masuk", publik: "Aduan diterima, menunggu diperiksa pengurus RW", tutup: false },
  diproses: { label: "Diproses", publik: "Sedang diperiksa pengurus RW", tutup: false },
  klarifikasi: { label: "Klarifikasi", publik: "Pihak terkait sedang dimintai keterangan", tutup: false },
  terbukti: { label: "Terbukti", publik: "Aduan terbukti, tindakan sedang disiapkan", tutup: false },
  teguran: { label: "Teguran diberikan", publik: "Teguran resmi sudah diberikan kepada pihak terkait", tutup: false },
  selesai: { label: "Selesai", publik: "Aduan selesai ditangani", tutup: true },
  tidak_terbukti: { label: "Tidak terbukti", publik: "Setelah diperiksa, aduan belum dapat dibuktikan", tutup: true },
  digabung: { label: "Digabung", publik: "Digabung dengan aduan lain tentang hal yang sama", tutup: true },
};

// ---------------------------------------------------------------- Teguran bertingkat
export const TINGKAT_TEGURAN = ["lisan", "sp1", "sp2", "sp3"] as const;
export type TingkatTeguran = (typeof TINGKAT_TEGURAN)[number];

export const TINGKAT_TEGURAN_INFO: Record<TingkatTeguran, { label: string; judul: string; tenggatHari: number; konsekuensi: string }> = {
  lisan: {
    label: "Teguran Lisan",
    judul: "BERITA ACARA TEGURAN LISAN",
    tenggatHari: 7,
    konsekuensi: "Apabila tidak diperbaiki, RW 03 akan menerbitkan Surat Peringatan Pertama (SP-1).",
  },
  sp1: {
    label: "Surat Peringatan 1",
    judul: "SURAT PERINGATAN PERTAMA (SP-1)",
    tenggatHari: 7,
    konsekuensi: "Apabila tidak diindahkan sampai tenggat, RW 03 akan menerbitkan Surat Peringatan Kedua (SP-2).",
  },
  sp2: {
    label: "Surat Peringatan 2",
    judul: "SURAT PERINGATAN KEDUA (SP-2)",
    tenggatHari: 5,
    konsekuensi: "Apabila tidak diindahkan sampai tenggat, RW 03 akan menerbitkan Surat Peringatan Ketiga (SP-3) yang merupakan peringatan terakhir.",
  },
  sp3: {
    label: "Surat Peringatan 3",
    judul: "SURAT PERINGATAN KETIGA (SP-3) — TERAKHIR",
    tenggatHari: 3,
    konsekuensi: "Ini adalah peringatan terakhir. Apabila tidak diindahkan, RW 03 akan meneruskan permasalahan ini kepada Kelurahan Padasuka dan pihak berwenang untuk ditindak sesuai ketentuan yang berlaku.",
  },
};

export const STATUS_TEGURAN = ["aktif", "dipatuhi", "tidak_dipatuhi", "dicabut"] as const;
export type StatusTeguran = (typeof STATUS_TEGURAN)[number];
export const STATUS_TEGURAN_LABEL: Record<StatusTeguran, string> = {
  aktif: "Menunggu perbaikan",
  dipatuhi: "Sudah dipatuhi",
  tidak_dipatuhi: "Tidak dipatuhi",
  dicabut: "Dicabut",
};

export const CARA_SERAH_TEGURAN = ["langsung", "titip_rt", "ditempel", "lisan"] as const;
export type CaraSerahTeguran = (typeof CARA_SERAH_TEGURAN)[number];
export const CARA_SERAH_TEGURAN_LABEL: Record<CaraSerahTeguran, string> = {
  langsung: "Diserahkan langsung",
  titip_rt: "Dititipkan lewat Ketua RT",
  ditempel: "Ditempel di lokasi",
  lisan: "Disampaikan lisan di tempat",
};

/** Teguran yang masih diperhitungkan untuk eskalasi (bulan). */
export const MASA_HITUNG_TEGURAN_BULAN = 12;

/**
 * Tingkat berikutnya dari riwayat teguran teradu dalam masa hitung (yang belum dicabut).
 * `null` = sudah SP-3: langkah berikutnya diteruskan ke Kelurahan.
 */
export function saranTingkatTeguran(riwayat: TingkatTeguran[]): TingkatTeguran | null {
  if (riwayat.length === 0) return "lisan";
  const tertinggi = Math.max(...riwayat.map((t) => TINGKAT_TEGURAN.indexOf(t)));
  return TINGKAT_TEGURAN[tertinggi + 1] ?? null;
}

// ---------------------------------------------------------------- Kunci teradu & nomor
/** Kunci stabil untuk merangkum riwayat satu pihak: data terhubung memakai id, selain itu nama. */
export function kunciTeradu(jenis: string, refId: number | null | undefined, nama: string | null | undefined): string | null {
  if (refId && jenis !== "pihak_lain" && jenis !== "tidak_tahu") return `${jenis}:${refId}`;
  const n = (nama ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return n.length >= 3 ? `nama:${n}` : null;
}

export function nomorAduan(id: number, tahun: number): string {
  return `ADU-${tahun}-${String(id).padStart(4, "0")}`;
}

export const MAKS_FOTO_ADUAN = 3;
