/**
 * Registry resmi 119 indikator — "FORMAT LAPORAN RT TAHUN 2026" (Kecamatan Cimahi Tengah).
 * Sumber: docs/wilayah/sumber/format-laporan-rt-2026.pdf (halaman 1–4; halaman 5 kosong).
 *
 * ID internal (ind-001..ind-119) mengikuti nomor baris dan selalu unik.
 * Kode ekspor mengikuti template — bagian I (Posyandu) memakai ulang kode H.1–H.7.
 */

export type BagianIndikator = "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M";

export const BAGIAN_INDIKATOR: { kode: BagianIndikator; judul: string; jumlah: number }[] = [
  { kode: "B", judul: "KEPENDUDUKAN", jumlah: 4 },
  { kode: "C", judul: "KESEHATAN IBU & ANAK", jumlah: 13 },
  { kode: "D", judul: "STUNTING", jumlah: 4 },
  { kode: "E", judul: "SANITASI, LISTRIK & INTERNET", jumlah: 11 },
  { kode: "F", judul: "PENDIDIKAN WARGA", jumlah: 18 },
  { kode: "G", judul: "EKONOMI, UMKM & KEMISKINAN", jumlah: 24 },
  { kode: "H", judul: "KEAMANAN & KETERTIBAN", jumlah: 12 },
  { kode: "I", judul: "POSYANDU & KB", jumlah: 7 },
  { kode: "J", judul: "SAMPAH & LINGKUNGAN", jumlah: 3 },
  { kode: "K", judul: "SARANA OLAHRAGA", jumlah: 5 },
  { kode: "L", judul: "SENI, ADAT & BUDAYA", jumlah: 15 },
  { kode: "M", judul: "ORGANISASI & REMBUG RW", jumlah: 3 },
];

/**
 * Jenis periode:
 * - stok: kondisi pada tanggal acuan (akhir bulan)
 * - kondisi_bulan: berlaku kapan pun dalam bulan itu ("bulan ini", bukan kejadian baru)
 * - kejadian: peristiwa yang terjadi dalam bulan itu
 * - kehadiran: jumlah hadir pada kegiatan bersama RW
 * - frekuensi: kekerapan (per minggu)
 */
export type JenisPeriode = "stok" | "kondisi_bulan" | "kejadian" | "kehadiran" | "frekuensi";

export type StatusDefinisi = "siap" | "needs_confirmation";

export type Rumus =
  | { t: "warga_aktif"; jk?: "L" | "P" }
  | { t: "kk_aktif" }
  | { t: "umur"; minBulan?: number; maxBulan?: number }
  | { t: "fakta_warga"; kunci: string; nilai: string[]; minUmurTahun?: number; jk?: "P"; periode?: "acuan" | "bulan" | "mulai_dalam_bulan" }
  | { t: "fakta_kk"; kunci: string; nilai: string[] }
  | { t: "fakta_rumah"; kunci: string; nilai: string[] }
  | { t: "usaha"; kunci?: string; kategori?: string; pemilikPerempuan?: boolean }
  | { t: "fasilitas"; jenis: string; kunci?: string; nilai?: string[]; jumlahkan?: string }
  | { t: "kelompok"; jenis: string }
  | { t: "kegiatan"; jenis: string; pengelola?: "rt" | "rw" }
  | { t: "kejadian"; jenis: string; ukur: "kasus" | "pelaku" }
  | { t: "kehadiran"; jenis: string }
  | { t: "usia_sekolah"; jenjang: "sd" | "smp" | "sma"; tidakSekolah?: boolean }
  | { t: "pengangguran" }
  | { t: "frekuensi_mingguan"; jenis: string };

export type EntitasIndikator = "warga" | "kk" | "rumah" | "usaha" | "fasilitas" | "kelompok" | "kegiatan" | "kejadian";

export interface IndikatorKecamatan {
  id: string;
  no: number;
  bagian: BagianIndikator;
  /** Kode ekspor sesuai template (bisa berulang antar-bagian). */
  kode: string;
  label: string;
  entitas: EntitasIndikator;
  satuan: string;
  periode: JenisPeriode;
  rumus: Rumus;
  /** Pertanyaan/field sumber di form RT atau warga. */
  sumber: string;
  pilihan?: string;
  pengisi: "RT" | "RW" | "RT & RW";
  pemverifikasi: "RT" | "RW";
  /** rt = dihitung dari data wilayah RT; rw_bersama = bisa dikelola RW dan melayani beberapa RT. */
  scope: "rt" | "rw_bersama";
  dedup: string;
  kelengkapan: string;
  status: StatusDefinisi;
  catatan?: string;
}

type Def = Omit<IndikatorKecamatan, "id" | "no" | "bagian"> & { bagian?: BagianIndikator };

const YT = "Ya / Tidak / Belum diketahui";

const PER_WARGA = "Satu warga dihitung sekali (ID warga internal)";
const PER_KK = "Satu KK dihitung sekali (ID KK internal)";
const PER_RUMAH = "Satu rumah dihitung sekali walau dihuni beberapa KK";
const PER_USAHA = "Satu usaha dihitung sekali (ID usaha internal)";
const PER_FASILITAS = "Objek unik; dihitung di RT lokasi, rekap RW menghitung objek sekali";
const PER_KEJADIAN = "Satu kejadian satu catatan induk; tidak digabung otomatis";
const PER_KEGIATAN = "Kegiatan bersama satu catatan induk; RT terlibat tidak menggandakan";

const K_WARGA = "Warga aktif dengan jawaban diketahui ÷ seluruh warga aktif";
const K_KK = "KK dengan jawaban diketahui ÷ seluruh KK";
const K_KONFIRMASI = "Bulan dikonfirmasi lengkap oleh pengelola; tanpa konfirmasi dan tanpa catatan = belum diketahui";

function fw(kode: string, label: string, kunci: string, nilai: string[], extra: Partial<Def> = {}): Def {
  return {
    kode, label, entitas: "warga", satuan: "jiwa", periode: "stok",
    rumus: { t: "fakta_warga", kunci, nilai },
    sumber: `Fakta warga: ${kunci}`, pilihan: YT,
    pengisi: "RT", pemverifikasi: "RT", scope: "rt",
    dedup: PER_WARGA, kelengkapan: K_WARGA, status: "siap",
    ...extra,
  };
}

function fk(kode: string, label: string, kunci: string, nilai: string[], extra: Partial<Def> = {}): Def {
  return {
    kode, label, entitas: "kk", satuan: "KK", periode: "stok",
    rumus: { t: "fakta_kk", kunci, nilai },
    sumber: `Fakta KK: ${kunci}`, pilihan: YT,
    pengisi: "RT", pemverifikasi: "RT", scope: "rt",
    dedup: PER_KK, kelengkapan: K_KK, status: "siap",
    ...extra,
  };
}

function listrik(kode: string, label: string, nilai: string): Def {
  return {
    kode, label, entitas: "rumah", satuan: "rumah", periode: "stok",
    rumus: { t: "fakta_rumah", kunci: "listrik", nilai: [nilai] },
    sumber: "Fakta rumah: listrik (lihat meteran)", pilihan: "Tanpa meteran / 450 / 900 / 1.300 / 2.200 / 3.500+",
    pengisi: "RT", pemverifikasi: "RT", scope: "rt",
    dedup: PER_RUMAH, kelengkapan: "Rumah dengan daya listrik diketahui ÷ seluruh rumah tercatat", status: "siap",
  };
}

function usaha(kode: string, label: string, r: Extract<Rumus, { t: "usaha" }>, sumber: string): Def {
  return {
    kode, label, entitas: "usaha", satuan: "usaha", periode: "stok", rumus: r, sumber,
    pilihan: r.kunci ? YT : undefined,
    pengisi: "RT", pemverifikasi: "RT", scope: "rt",
    dedup: PER_USAHA, kelengkapan: r.kunci ? "Usaha dengan jawaban diketahui ÷ seluruh usaha aktif" : "Usaha aktif terverifikasi", status: "siap",
  };
}

function kejadian(kode: string, label: string, jenis: string, ukur: "kasus" | "pelaku" = "kasus", bagianKonf = "kejadian_keamanan"): Def {
  return {
    kode, label, entitas: "kejadian", satuan: ukur === "pelaku" ? "orang" : "kasus", periode: "kejadian",
    rumus: { t: "kejadian", jenis, ukur },
    sumber: `Catatan kejadian jenis "${jenis}" (tanggal kejadian dalam bulan)`,
    pengisi: "RT", pemverifikasi: "RT", scope: "rt",
    dedup: PER_KEJADIAN, kelengkapan: `${K_KONFIRMASI} (bagian ${bagianKonf})`, status: "siap",
  };
}

function fasilitas(kode: string, label: string, jenis: string, extra: Partial<Def> = {}): Def {
  return {
    kode, label, entitas: "fasilitas", satuan: "unit", periode: "stok",
    rumus: { t: "fasilitas", jenis },
    sumber: `Daftar fasilitas jenis "${jenis}" yang aktif pada tanggal acuan`,
    pengisi: "RT & RW", pemverifikasi: "RW", scope: "rw_bersama",
    dedup: PER_FASILITAS, kelengkapan: "Daftar fasilitas dikonfirmasi lengkap (RT untuk milik RT, RW untuk fasilitas bersama)", status: "siap",
    catatan: "Fasilitas bersama RW yang melayani beberapa RT: alokasi ke sel RT menunggu konfirmasi kecamatan; rekap RW tetap dihitung.",
    ...extra,
  };
}

function seniPelaku(kode: string, label: string, kunci: string): Def {
  return fw(kode, label, kunci, ["ya"], { satuan: "orang" });
}

function seniKegiatan(kode: string, label: string, jenis: string): Def {
  return {
    kode, label, entitas: "kegiatan", satuan: "kegiatan", periode: "kejadian",
    rumus: { t: "kegiatan", jenis },
    sumber: `Kegiatan jenis "${jenis}" bertanggal dalam bulan, dikelola atau melibatkan RT`,
    pengisi: "RT & RW", pemverifikasi: "RT", scope: "rt",
    dedup: PER_KEGIATAN, kelengkapan: `${K_KONFIRMASI} (bagian kegiatan_rt / kegiatan_rw)`, status: "siap",
  };
}

function seniKelompok(kode: string, label: string, jenis: string): Def {
  return {
    kode, label, entitas: "kelompok", satuan: "kelompok", periode: "stok",
    rumus: { t: "kelompok", jenis },
    sumber: `Daftar kelompok jenis "${jenis}" aktif pada tanggal acuan`,
    pengisi: "RT & RW", pemverifikasi: "RT", scope: "rt",
    dedup: "Satu kelompok satu catatan induk; dihitung di RT basis, rekap RW objek sekali",
    kelengkapan: "Daftar kelompok dikonfirmasi lengkap (bagian kelompok_rt)", status: "siap",
  };
}

function usiaSekolah(kode: string, label: string, jenjang: "sd" | "smp" | "sma", tidakSekolah: boolean): Def {
  return {
    kode, label, entitas: "warga", satuan: "jiwa", periode: "stok",
    rumus: { t: "usia_sekolah", jenjang, tidakSekolah },
    sumber: tidakSekolah ? "Tanggal lahir + fakta sekolah_aktif = tidak" : "Tanggal lahir warga",
    pengisi: "RT", pemverifikasi: "RT", scope: "rt",
    dedup: PER_WARGA, kelengkapan: K_WARGA, status: "needs_confirmation",
    catatan: "Batas usia jenjang sekolah belum ditetapkan kecamatan. Usulan sementara (tidak dipakai untuk angka final): SD 7–12, SMP 13–15, SMA 16–18 tahun.",
  };
}

const DEFS: Def[] = [
  // B — Kependudukan
  { bagian: "B", kode: "B.1", label: "Jumlah penduduk total (jiwa)", entitas: "warga", satuan: "jiwa", periode: "stok", rumus: { t: "warga_aktif" }, sumber: "Master warga berstatus Aktif pada KK di RT", pengisi: "RT", pemverifikasi: "RT", scope: "rt", dedup: PER_WARGA, kelengkapan: "Master warga RT", status: "siap" },
  { bagian: "B", kode: "B.2", label: "Jumlah kepala keluarga/KK", entitas: "kk", satuan: "KK", periode: "stok", rumus: { t: "kk_aktif" }, sumber: "Master KK di RT dengan minimal satu anggota aktif", pengisi: "RT", pemverifikasi: "RT", scope: "rt", dedup: PER_KK, kelengkapan: "Master KK RT", status: "siap" },
  { bagian: "B", kode: "B.3", label: "Jumlah penduduk laki-laki (jiwa)", entitas: "warga", satuan: "jiwa", periode: "stok", rumus: { t: "warga_aktif", jk: "L" }, sumber: "Master warga: jenis kelamin", pengisi: "RT", pemverifikasi: "RT", scope: "rt", dedup: PER_WARGA, kelengkapan: "Warga dengan jenis kelamin terisi", status: "siap" },
  { bagian: "B", kode: "B.4", label: "Jumlah penduduk perempuan (jiwa)", entitas: "warga", satuan: "jiwa", periode: "stok", rumus: { t: "warga_aktif", jk: "P" }, sumber: "Master warga: jenis kelamin", pengisi: "RT", pemverifikasi: "RT", scope: "rt", dedup: PER_WARGA, kelengkapan: "Warga dengan jenis kelamin terisi", status: "siap" },

  // C — Kesehatan ibu & anak
  fw("C.1", "Ibu hamil bulan ini", "hamil", ["ya"], { bagian: "C", periode: "kondisi_bulan", rumus: { t: "fakta_warga", kunci: "hamil", nilai: ["ya"], jk: "P", periode: "bulan" } }),
  kejadian("C.2", "Kematian ibu hamil bulan ini", "kematian_ibu_hamil", "kasus", "kejadian_kesehatan"),
  fw("C.3", "Ibu nifas & menyusui bulan ini", "nifas_menyusui", ["ya"], { periode: "kondisi_bulan", rumus: { t: "fakta_warga", kunci: "nifas_menyusui", nilai: ["ya"], jk: "P", periode: "bulan" } }),
  kejadian("C.4", "Kematian ibu nifas bulan ini", "kematian_ibu_nifas", "kasus", "kejadian_kesehatan"),
  { kode: "C.5", label: "Jumlah bayi (0–11 bulan) bulan ini", entitas: "warga", satuan: "jiwa", periode: "kondisi_bulan", rumus: { t: "umur", minBulan: 0, maxBulan: 11 }, sumber: "Tanggal lahir warga aktif (umur 0–11 bulan pada tanggal acuan)", pengisi: "RT", pemverifikasi: "RT", scope: "rt", dedup: PER_WARGA, kelengkapan: "Warga aktif dengan tanggal lahir terisi", status: "siap" },
  kejadian("C.6", "Kematian bayi 0–11 bulan ini", "kematian_bayi", "kasus", "kejadian_kesehatan"),
  fw("C.7", "Warga mengidap Hipertensi", "hipertensi", ["ya"]),
  fw("C.8", "Warga mengidap Diabetes Melitus", "diabetes", ["ya"]),
  fw("C.9", "Warga mengidap Penyakit Jantung / Kardiovaskular", "jantung", ["ya"]),
  fw("C.10", "Warga mengidap Kanker", "kanker", ["ya"]),
  fw("C.11", "Warga mengidap PPOK / Asma", "ppok_asma", ["ya"]),
  { kode: "C.12", label: "Warga lansia (usia 60 tahun ke atas)", entitas: "warga", satuan: "jiwa", periode: "stok", rumus: { t: "umur", minBulan: 60 * 12 }, sumber: "Tanggal lahir warga aktif (60 tahun ke atas pada tanggal acuan)", pengisi: "RT", pemverifikasi: "RT", scope: "rt", dedup: PER_WARGA, kelengkapan: "Warga aktif dengan tanggal lahir terisi", status: "siap", catatan: "Batas 60+ khusus laporan kecamatan; tidak mengubah status pekerjaan." },
  fw("C.13", "Warga penyandang disabilitas", "disabilitas", ["ya"]),

  // D — Stunting
  fw("D.1", "Total kasus stunting bulan ini", "stunting", ["ya"], { bagian: "D", satuan: "kasus", rumus: { t: "fakta_warga", kunci: "stunting", nilai: ["ya"], periode: "acuan" } }),
  fw("D.2", "Jumlah kasus baru stunting bulan ini", "stunting", ["ya"], { satuan: "kasus", periode: "kejadian", rumus: { t: "fakta_warga", kunci: "stunting", nilai: ["ya"], periode: "mulai_dalam_bulan" }, kelengkapan: "Kasus baru = fakta stunting yang mulai berlaku dalam bulan itu" }),
  fk("D.3", "Jumlah keluarga berisiko stunting (KK)", "berisiko_stunting", ["ya"], { status: "needs_confirmation", catatan: "Kriteria keluarga berisiko stunting (versi BKKBN/posyandu) belum ditetapkan kecamatan." }),
  fw("D.4", "Jumlah remaja putri terpantau gizi", "remaja_putri_gizi", ["ya"], { periode: "kondisi_bulan", rumus: { t: "fakta_warga", kunci: "remaja_putri_gizi", nilai: ["ya"], jk: "P", periode: "bulan" }, status: "needs_confirmation", catatan: "Batas usia 'remaja putri' belum ditetapkan kecamatan." }),

  // E — Sanitasi, listrik & internet
  fk("E.1", "KK tanpa akses air bersih", "air_bersih", ["tidak"], { bagian: "E" }),
  fk("E.2", "KK rentan kekeringan", "rentan_kekeringan", ["ya"]),
  fk("E.3", "KK tanpa jamban", "jamban", ["tidak"]),
  fk("E.4", "KK tanpa septictank", "septictank", ["tidak"]),
  listrik("E.5", "Rumah tanpa listrik (tidak punya meteran)", "tanpa_meteran"),
  listrik("E.6", "Rumah dengan listrik 450 VA", "450"),
  listrik("E.7", "Rumah dengan listrik 900 VA", "900"),
  listrik("E.8", "Rumah dengan listrik 1.300 VA", "1300"),
  listrik("E.9", "Rumah dengan listrik 2.200 VA", "2200"),
  listrik("E.10", "Rumah dengan listrik 3.500 VA ke atas", "3500_plus"),
  fk("E.11", "KK tanpa akses internet", "internet", ["tidak"]),

  // F — Pendidikan warga
  fw("F.1", "Warga pendidikan terakhir SD", "pendidikan_terakhir", ["sd"], { bagian: "F", pilihan: "Daftar pendidikan terakhir" }),
  fw("F.2", "Warga pendidikan terakhir SMP", "pendidikan_terakhir", ["smp"], { pilihan: "Daftar pendidikan terakhir" }),
  fw("F.3", "Warga pendidikan terakhir SMA", "pendidikan_terakhir", ["sma"], { pilihan: "Daftar pendidikan terakhir" }),
  fw("F.4", "Warga pendidikan terakhir S1", "pendidikan_terakhir", ["s1"], { pilihan: "Daftar pendidikan terakhir" }),
  fw("F.5", "Warga pendidikan terakhir S2", "pendidikan_terakhir", ["s2"], { pilihan: "Daftar pendidikan terakhir" }),
  fw("F.6", "Warga pendidikan terakhir S3", "pendidikan_terakhir", ["s3"], { pilihan: "Daftar pendidikan terakhir" }),
  fw("F.7", "Warga buta huruf (usia ≥15 tahun)", "buta_huruf", ["ya"], { rumus: { t: "fakta_warga", kunci: "buta_huruf", nilai: ["ya"], minUmurTahun: 15 }, kelengkapan: "Warga 15+ dengan jawaban diketahui ÷ warga 15+" }),
  fw("F.8", "Anak yang mengikuti PAUD", "sekolah_aktif", ["paud"], { pilihan: "Daftar sekolah saat ini" }),
  fw("F.9", "Anak yang mengikuti TK / RA", "sekolah_aktif", ["tk_ra"], { pilihan: "Daftar sekolah saat ini" }),
  usiaSekolah("F.10", "Anak usia SD / MI", "sd", false),
  usiaSekolah("F.11", "Anak SD/MI putus / tidak sekolah", "sd", true),
  fw("F.12", "Warga berprofesi pendidik / dosen", "profesi_pendidik", ["ya"]),
  usiaSekolah("F.13", "Anak usia SMP / MTs", "smp", false),
  usiaSekolah("F.14", "Anak SMP/MTs putus / tidak sekolah", "smp", true),
  usiaSekolah("F.15", "Anak usia SMA / SMK / MA", "sma", false),
  usiaSekolah("F.16", "Anak SMA/SMK/MA putus / tidak sekolah", "sma", true),
  fw("F.17", "Warga peserta Paket A / B / C", "sekolah_aktif", ["paket_abc"], { pilihan: "Daftar sekolah saat ini" }),
  fw("F.18", "Anak mengikuti SLB / layanan khusus", "sekolah_aktif", ["slb"], { pilihan: "Daftar sekolah saat ini" }),

  // G — Ekonomi, UMKM & kemiskinan
  fk("G.1", "KK penerima BLT", "bantuan_blt", ["ya"], { bagian: "G" }),
  fk("G.2", "KK penerima PBI-JK (JKN/BPJS gratis)", "bantuan_pbi_jk", ["ya"]),
  fk("G.3", "KK penerima PKH", "bantuan_pkh", ["ya"]),
  fk("G.4", "KK penerima PMT", "bantuan_pmt", ["ya"]),
  fk("G.5", "KK penerima RASTRADA", "bantuan_rastrada", ["ya"], { catatan: "Teks PDF memuat artefak ']' sebelum label; label resmi tanpa tanda itu." }),
  fk("G.6", "KK penerima CPP", "bantuan_cpp", ["ya"]),
  fk("G.7", "KK penerima BPNT", "bantuan_bpnt", ["ya"]),
  fk("G.8", "KK kategori miskin / kurang mampu", "miskin", ["ya"], { status: "needs_confirmation", catatan: "Definisi miskin/kurang mampu (DTKS/DTSEN atau kriteria lokal) belum ditetapkan kecamatan." }),
  fk("G.9", "KK rawan pangan", "rawan_pangan", ["ya"], { status: "needs_confirmation", catatan: "Kriteria rawan pangan belum ditetapkan kecamatan." }),
  { kode: "G.10", label: "Warga pengangguran terbuka", entitas: "warga", satuan: "jiwa", periode: "stok", rumus: { t: "pengangguran" }, sumber: "Fakta warga status_kerja = mencari_kerja, usia kerja", pilihan: "Daftar kegiatan utama", pengisi: "RT", pemverifikasi: "RT", scope: "rt", dedup: PER_WARGA, kelengkapan: "Warga usia kerja dengan kegiatan utama diketahui", status: "needs_confirmation", catatan: "Batas usia kerja dan definisi pengangguran terbuka (BPS: 15+, mencari kerja) belum dikonfirmasi kecamatan." },
  usaha("G.11", "Jumlah total UMKM tercatat", { t: "usaha" }, "Daftar usaha aktif terverifikasi di RT"),
  usaha("G.12", "UMKM milik perempuan", { t: "usaha", pemilikPerempuan: true }, "Pemilik usaha (warga) berjenis kelamin perempuan"),
  usaha("G.13", "UMKM memiliki NIB", { t: "usaha", kunci: "nib" }, "Fakta usaha: nib"),
  usaha("G.14", "UMKM memiliki izin PIRT", { t: "usaha", kunci: "pirt" }, "Fakta usaha: pirt"),
  usaha("G.15", "UMKM memiliki HaKI", { t: "usaha", kunci: "haki" }, "Fakta usaha: haki"),
  usaha("G.16", "UMKM memiliki Sertifikat Halal", { t: "usaha", kunci: "halal" }, "Fakta usaha: halal"),
  usaha("G.17", "UMKM memiliki SNI", { t: "usaha", kunci: "sni" }, "Fakta usaha: sni"),
  usaha("G.18", "UMKM menggunakan pemasaran digital", { t: "usaha", kunci: "pemasaran_digital" }, "Fakta usaha: pemasaran_digital"),
  usaha("G.19", "UMKM mendapat kredit bank / non-bank", { t: "usaha", kunci: "kredit" }, "Fakta usaha: kredit"),
  usaha("G.20", "UMKM produk Kuliner dan Makanan Olahan", { t: "usaha", kategori: "kuliner" }, "Kategori usaha: kuliner"),
  usaha("G.21", "UMKM produk Kerajinan Tangan", { t: "usaha", kategori: "kerajinan" }, "Kategori usaha: kerajinan"),
  usaha("G.22", "UMKM produk Fashion, Konveksi, dan Tekstil", { t: "usaha", kategori: "fashion" }, "Kategori usaha: fashion"),
  usaha("G.23", "UMKM produk Agribisnis dan Ketahanan Pangan Kota", { t: "usaha", kategori: "agribisnis" }, "Kategori usaha: agribisnis"),
  usaha("G.24", "UMKM produk Jasa Kreatif dan Tekno-Lokal", { t: "usaha", kategori: "jasa_kreatif" }, "Kategori usaha: jasa_kreatif"),

  // H — Keamanan & ketertiban
  fasilitas("H.1", "Jumlah poskamling", "poskamling", { bagian: "H" }),
  { kode: "H.2", label: "Jumlah siskamling per minggu", entitas: "kegiatan", satuan: "kali/minggu", periode: "frekuensi", rumus: { t: "frekuensi_mingguan", jenis: "siskamling" }, sumber: "Kegiatan siskamling tercatat dalam bulan", pengisi: "RT", pemverifikasi: "RT", scope: "rt", dedup: PER_KEGIATAN, kelengkapan: K_KONFIRMASI, status: "needs_confirmation", catatan: "Cara mengubah frekuensi mingguan menjadi angka bulanan dan TOTAL belum ditetapkan. Usulan sementara: jumlah ronda dalam bulan ÷ jumlah minggu." },
  fw("H.3", "Warga korban narkoba", "korban_narkoba", ["ya"], { status: "needs_confirmation", catatan: "Belum jelas apakah dihitung sebagai jumlah korban saat ini (stok) atau kasus baru bulan itu." }),
  kejadian("H.4", "Kasus narkoba — pelaku warga", "narkoba"),
  kejadian("H.5", "Kasus pencurian / perampokan", "pencurian"),
  kejadian("H.6", "Kasus perjudian", "perjudian"),
  kejadian("H.7", "Kasus prostitusi", "prostitusi"),
  kejadian("H.8", "Kasus kekerasan terhadap anak", "kekerasan_anak"),
  kejadian("H.9", "Kasus perkosaan", "perkosaan"),
  kejadian("H.10", "Kasus penculikan", "penculikan"),
  kejadian("H.11", "Konflik yang menimbulkan korban jiwa", "konflik_korban_jiwa"),
  kejadian("H.12", "Jumlah pelaku kasus pembunuhan", "pembunuhan", "pelaku"),

  // I — Posyandu & KB (kode ekspor H.1–H.7 sesuai template)
  fasilitas("H.1", "Jumlah posyandu", "posyandu", { bagian: "I" }),
  fasilitas("H.2", "Posyandu memenuhi 6 SPM", "posyandu", { rumus: { t: "fasilitas", jenis: "posyandu", kunci: "memenuhi_6_spm", nilai: ["ya"] }, sumber: "Fakta posyandu: memenuhi_6_spm", status: "needs_confirmation", catatan: "Daftar 6 SPM posyandu belum dirinci kecamatan." }),
  fasilitas("H.3", "Posyandu yang punya bangunan sendiri", "posyandu", { rumus: { t: "fasilitas", jenis: "posyandu", kunci: "bangunan_sendiri", nilai: ["ya"] }, sumber: "Fakta posyandu: bangunan_sendiri" }),
  fasilitas("H.4", "Jumlah kader posyandu", "posyandu", { satuan: "orang", rumus: { t: "fasilitas", jenis: "posyandu", jumlahkan: "jumlah_kader" }, sumber: "Fakta posyandu: jumlah_kader" }),
  fasilitas("H.5", "Kader posyandu yang sudah terlatih", "posyandu", { satuan: "orang", rumus: { t: "fasilitas", jenis: "posyandu", jumlahkan: "kader_terlatih" }, sumber: "Fakta posyandu: kader_terlatih" }),
  fasilitas("H.6", "Posyandu strata purnama", "posyandu", { rumus: { t: "fasilitas", jenis: "posyandu", kunci: "strata", nilai: ["purnama"] }, sumber: "Fakta posyandu: strata" }),
  fasilitas("H.7", "Posyandu strata mandiri / multifungsi", "posyandu", { rumus: { t: "fasilitas", jenis: "posyandu", kunci: "strata", nilai: ["mandiri"] }, sumber: "Fakta posyandu: strata" }),

  // J — Sampah & lingkungan
  fasilitas("J.1", "Tempat pembuangan sampah (TPS)", "tps", { bagian: "J" }),
  fasilitas("J.2", "Tempat pengelolaan sampah skala RT", "pengelolaan_sampah", { pengisi: "RT", pemverifikasi: "RT", scope: "rt" }),
  fk("J.3", "KK yang melakukan pemilahan sampah", "pilah_sampah", ["ya"]),

  // K — Sarana olahraga
  fasilitas("K.1", "Lapangan sepak bola / futsal / mini soccer", "lapangan_sepakbola", { bagian: "K" }),
  fasilitas("K.2", "Lapangan voli", "lapangan_voli"),
  fasilitas("K.3", "Lapangan badminton", "lapangan_badminton"),
  fasilitas("K.4", "Lapangan basket", "lapangan_basket"),
  fasilitas("K.5", "Sarana olahraga lainnya", "olahraga_lain"),

  // L — Seni, adat & budaya
  { ...seniPelaku("L.1", "Pelaku Seni Musik Tradisional dan Religi", "pelaku_seni_musik"), bagian: "L" },
  seniPelaku("L.2", "Pelaku Seni Tari Tradisional dan Kontemporer", "pelaku_seni_tari"),
  seniPelaku("L.3", "Pelaku Seni Pertunjukan dan Teater Rakyat", "pelaku_seni_pertunjukan"),
  seniPelaku("L.4", "Pelaku Seni Suara dan Sastra Lokal", "pelaku_seni_suara_sastra"),
  seniPelaku("L.5", "Pelaku Seni Bela Diri Tradisional", "pelaku_seni_beladiri"),
  seniKegiatan("L.6", "Kegiatan Seni Musik Tradisional bulan ini", "seni_musik"),
  seniKegiatan("L.7", "Kegiatan Seni Tari bulan ini", "seni_tari"),
  seniKegiatan("L.8", "Kegiatan Seni Pertunjukan bulan ini", "seni_pertunjukan"),
  seniKegiatan("L.9", "Kegiatan Seni Suara & Sastra bulan ini", "seni_suara_sastra"),
  seniKegiatan("L.10", "Kegiatan Seni Bela Diri bulan ini", "seni_beladiri"),
  seniKelompok("L.11", "Kelompok Seni Musik Tradisional dan Religi", "seni_musik"),
  seniKelompok("L.12", "Kelompok Seni Tari Tradisional dan Kontemporer", "seni_tari"),
  seniKelompok("L.13", "Kelompok Seni Pertunjukan dan Teater Rakyat", "seni_pertunjukan"),
  seniKelompok("L.14", "Kelompok Seni Suara dan Sastra Lokal", "seni_suara_sastra"),
  seniKelompok("L.15", "Kelompok Seni Bela Diri Tradisional", "seni_beladiri"),

  // M — Organisasi & rembug RW
  { bagian: "M", kode: "M.1", label: "Jumlah kegiatan PKK RT bulan ini", entitas: "kegiatan", satuan: "kegiatan", periode: "kejadian", rumus: { t: "kegiatan", jenis: "pkk", pengelola: "rt" }, sumber: "Kegiatan PKK yang dikelola RT bertanggal dalam bulan", pengisi: "RT", pemverifikasi: "RT", scope: "rt", dedup: PER_KEGIATAN, kelengkapan: `${K_KONFIRMASI} (bagian kegiatan_rt)`, status: "siap" },
  { kode: "M.2", label: "Jumlah kegiatan pemberdayaan masyarakat bulan ini", entitas: "kegiatan", satuan: "kegiatan", periode: "kejadian", rumus: { t: "kegiatan", jenis: "pemberdayaan" }, sumber: "Kegiatan pemberdayaan bertanggal dalam bulan (RT atau RW yang melibatkan RT)", pengisi: "RT & RW", pemverifikasi: "RT", scope: "rt", dedup: PER_KEGIATAN, kelengkapan: `${K_KONFIRMASI} (bagian kegiatan_rt / kegiatan_rw)`, status: "siap" },
  { kode: "M.3", label: "Jumlah warga RT yang hadir di Rembug RW", entitas: "kegiatan", satuan: "orang", periode: "kehadiran", rumus: { t: "kehadiran", jenis: "rembug_rw" }, sumber: "Kegiatan Rembug RW (dibuat RW) + jumlah hadir yang dicatat RT", pengisi: "RT & RW", pemverifikasi: "RT", scope: "rw_bersama", dedup: "Satu catatan hadir per RT per kegiatan", kelengkapan: "Rembug RW dicatat RW (kegiatan_rw) dan jumlah hadir diisi RT", status: "siap" },
];

function bangunRegistry(): IndikatorKecamatan[] {
  let bagian: BagianIndikator = "B";
  return DEFS.map((d, i) => {
    if (d.bagian) bagian = d.bagian;
    const { bagian: _ignored, ...rest } = d;
    return { ...rest, id: `ind-${String(i + 1).padStart(3, "0")}`, no: i + 1, bagian };
  });
}

export const INDIKATOR_KECAMATAN: IndikatorKecamatan[] = bangunRegistry();

export const JUMLAH_INDIKATOR_RESMI = 119;

/** Validasi struktur registry — dipanggil oleh uji dan saat server start. */
export function validasiRegistry(list: IndikatorKecamatan[] = INDIKATOR_KECAMATAN): string[] {
  const err: string[] = [];
  if (list.length !== JUMLAH_INDIKATOR_RESMI) err.push(`Jumlah indikator ${list.length}, seharusnya ${JUMLAH_INDIKATOR_RESMI}`);
  const ids = new Set<string>();
  const kodePerBagian = new Set<string>();
  for (const ind of list) {
    if (ids.has(ind.id)) err.push(`ID ganda ${ind.id}`);
    ids.add(ind.id);
    const k = `${ind.bagian}:${ind.kode}`;
    if (kodePerBagian.has(k)) err.push(`Kode ganda dalam bagian ${k}`);
    kodePerBagian.add(k);
    if (!ind.label.trim() || !ind.sumber.trim()) err.push(`${ind.id} tanpa label/sumber`);
  }
  for (const b of BAGIAN_INDIKATOR) {
    const n = list.filter((i) => i.bagian === b.kode).length;
    if (n !== b.jumlah) err.push(`Bagian ${b.kode}: ${n}, seharusnya ${b.jumlah}`);
  }
  return err;
}
