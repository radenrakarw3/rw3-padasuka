export { pekerjaanOptions, pekerjaanLegacyOptions } from "@shared/pekerjaan-options";

/** Tingkat pendidikan — selaras ISCED 2011 / klasifikasi BPS. */
export const pendidikanOptions = [
  "Belum Sekolah",
  "Tidak/Belum Tamat SD",
  "Tamat SD/Sederajat",
  "SLTP/Sederajat",
  "SLTA/Sederajat",
  "Diploma I/II",
  "Akademi/Diploma III",
  "Diploma IV/Strata I",
  "Strata II",
  "Strata III",
];

export const agamaOptions = [
  "Islam",
  "Kristen",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
];

export const jenisKelaminOptions = [
  "Laki-laki",
  "Perempuan",
];

export const statusPerkawinanOptions = [
  "Belum Kawin",
  "Kawin",
  "Cerai Hidup",
  "Cerai Mati",
];

export const kedudukanKeluargaOptions = [
  "Kepala Keluarga",
  "Istri",
  "Anak",
  "Menantu",
  "Cucu",
  "Orang Tua",
  "Mertua",
  "Famili Lain",
  "Pembantu",
  "Lainnya",
];

export const statusKependudukanOptions = [
  "Aktif",
  "Lahir",
  "Pindah Masuk",
  "Pindah Keluar",
  "Pindah",
  "Meninggal",
];

export const statusRumahOptions = [
  "Milik Sendiri",
  "Kontrak/Sewa",
  "Menumpang",
];

export const kondisiBangunanOptions = [
  "Permanen",
  "Semi Permanen",
  "Non Permanen",
];

export const sumberAirOptions = [
  "PDAM",
  "Sumur Gali",
  "Sumur Bor",
  "Lainnya",
];

export const sanitasiWcOptions = [
  "Jamban Sendiri",
  "Jamban Bersama",
];

export const listrikOptions = [
  "PLN 450 VA",
  "PLN 900 VA",
  "PLN 1300 VA",
  "PLN 2200 VA",
  "PLN > 2200 VA",
  "Tidak Ada",
];

export const rtOptions = [1, 2, 3, 4];

export const jenisBansosOptions = [
  "PKH",
  "BPNT/Sembako",
  "BLT Dana Desa",
  "BST",
  "PBI-JKN",
  "PIP",
  "RUTILAHU",
  "Lainnya",
];

export const keperluanTinggalOptions = [
  "Kerja",
  "Kuliah",
  "Usaha",
  "Lainnya",
];

export const jumlahPintuOptions = Array.from({ length: 50 }, (_, i) => i + 1);

export const jenisUsahaOptions = [
  "Warung/Toko Kelontong",
  "Rumah Makan/Restoran",
  "Cafe/Kedai Kopi",
  "Bengkel",
  "Laundry",
  "Salon/Barbershop",
  "Konveksi/Jahit",
  "Percetakan",
  "Fotokopi",
  "Apotek/Toko Obat",
  "Toko Bangunan",
  "Toko Elektronik",
  "Toko Pakaian",
  "Kios/Gerobak",
  "Catering",
  "Jasa Servis",
  "Kontrakan/Kost",
  "Usaha Online/E-Commerce",
  "Peternakan",
  "Pertanian",
  "Industri Rumahan",
  "Pendidikan/Kursus",
  "Kesehatan/Klinik",
  "Lainnya",
];

export const modalUsahaOptions = [
  "< Rp 1.000.000",
  "Rp 1.000.000 - Rp 5.000.000",
  "Rp 5.000.000 - Rp 10.000.000",
  "Rp 10.000.000 - Rp 50.000.000",
  "Rp 50.000.000 - Rp 100.000.000",
  "> Rp 100.000.000",
];

export const omsetBulananOptions = [
  "< Rp 1.000.000",
  "Rp 1.000.000 - Rp 5.000.000",
  "Rp 5.000.000 - Rp 10.000.000",
  "Rp 10.000.000 - Rp 25.000.000",
  "Rp 25.000.000 - Rp 50.000.000",
  "> Rp 50.000.000",
];

export const lamaUsahaOptions = [
  "< 6 bulan",
  "6 bulan - 1 tahun",
  "1 - 2 tahun",
  "2 - 5 tahun",
  "5 - 10 tahun",
  "> 10 tahun",
];

export const posisiTetanggaOptions = [
  "Kiri",
  "Kanan",
  "Depan",
  "Belakang",
];

export const visitrw3JenisTempatUsahaOptions = [
  { value: "lapak", label: "Lapak" },
  { value: "kiosk", label: "Kiosk" },
  { value: "usaha_rumahan", label: "Usaha rumahan" },
  { value: "lainnya", label: "Lainnya" },
] as const;

/** Kategori/jenis usaha — multi-pilihan form RW3BIZ / usaha. */
export const visitrw3KategoriUsahaOptions = [
  // Makanan & minuman
  "Warung/Toko Kelontong",
  "Warung nasi/masakan rumahan",
  "Rumah Makan/Restoran",
  "Cafe/Kedai Kopi",
  "Kedai minuman/es/juice",
  "Bakso/Mie/Sate",
  "Gorengan/jajanan pasar",
  "Roti/kue/bakery",
  "Catering",
  "Pecel lele/ayam goreng",
  // Jasa harian
  "Laundry",
  "Salon/Barbershop",
  "Jasa cuci/motor kendaraan",
  "Jasa servis HP/elektronik",
  "Jasa servis AC/kulkas",
  "Jasa servis umum",
  "Jahit/Konveksi",
  "Fotokopi/print",
  "Percetakan",
  "Fotografi/studio",
  // Dagang & toko
  "Kios/Gerobak",
  "Toko Pakaian",
  "Toko Sepatu/Tas",
  "Toko Elektronik",
  "Toko Bangunan",
  "Toko Sembako/grosir kecil",
  "Toko buah/sayur",
  "Toko pulsa/kuota/token",
  "Apotek/Toko Obat",
  "Toko kosmetik",
  // Transport & energi
  "Pertamini/Bensin ecer",
  "Bengkel motor",
  "Bengkel mobil",
  "Tambal ban",
  "Ojek/antar barang (pangkalan)",
  // Produksi & online
  "Usaha Online/E-Commerce",
  "Industri Rumahan",
  "Kerajinan/handmade",
  "Frozen food/olahan",
  // Pertanian & hewan
  "Pertanian",
  "Peternakan",
  "Penjualan ikan/ayam hidup",
  // Sosial & jasa lain
  "Pendidikan/Kursus/les",
  "Kesehatan/Klinik/praktek",
  "Penjahit/bordir",
  "Rental PS/game",
  "Rental alat/barang",
  "Titip jual/agen",
  "Lainnya",
] as const;

/** Opsi jam 24 jam (tanpa AM/PM) — interval 30 menit + 23:59. */
export const JAM_24H_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  out.push("23:59");
  return out;
})();


export const jenisPropertiOptions = [
  { value: "kost", label: "Kost" },
  { value: "kontrakan", label: "Kontrakan" },
  { value: "kiosk", label: "Kiosk" },
  { value: "lapak", label: "Lapak" },
  { value: "usaha_rumahan", label: "Usaha rumahan" },
] as const;

export const JENIS_USAHA_RUMAHAN = "usaha_rumahan" as const;

export function isUsahaRumahan(jenis?: string | null): boolean {
  return jenis === JENIS_USAHA_RUMAHAN;
}

export function labelJenisProperti(value?: string | null): string {
  return jenisPropertiOptions.find((o) => o.value === value)?.label ?? value ?? "—";
}

export const rw3lawKategoriOptions = [
  { value: "ketertiban", label: "Ketertiban" },
  { value: "lingkungan", label: "Lingkungan" },
  { value: "keamanan", label: "Keamanan" },
  { value: "umum", label: "Umum" },
] as const;

export const rw3lawKategoriLabels: Record<string, string> = Object.fromEntries(
  rw3lawKategoriOptions.map((o) => [o.value, o.label]),
);

export const rw3lawStatusLabels: Record<string, string> = {
  draft: "Draft",
  disetujui: "Berlaku",
  dicabut: "Dicabut",
};

/** Jenjang pendidikan anak pada formulir Visit RW3 pengajuan */
export const visitrw3JenjangAnakOptions = [
  "Belum sekolah",
  "PAUD",
  "TK",
  "SD",
  "SMP",
  "SMA",
  "Kuliah",
] as const;

export const jabatanKaryawanOptions = [
  "Pemilik",
  "Manager",
  "Kasir",
  "Karyawan",
  "Sopir",
  "Kurir",
  "Tukang Masak",
  "Pramusaji",
  "Satpam",
  "Cleaning Service",
  "Teknisi",
  "Lainnya",
];

export const penghasilanBulananOptions = [
  "< Rp 500.000",
  "Rp 500.000 - Rp 1.000.000",
  "Rp 1.000.000 - Rp 2.000.000",
  "Rp 2.000.000 - Rp 3.500.000",
  "> Rp 3.500.000",
];

export const kategoriEkonomiOptions = [
  "Sangat Miskin",
  "Miskin",
  "Hampir Miskin",
  "Tidak Miskin",
];

export const statusDisabilitasOptions = [
  "Tidak Ada",
  "Disabilitas Fisik",
  "Disabilitas Mental",
  "Disabilitas Sensorik (Tuna Rungu/Netra)",
  "Disabilitas Ganda",
];

export const kondisiKesehatanOptions = [
  "Sehat",
  "Penyakit Kronis",
  "Membutuhkan Perawatan Rutin",
];

export const statusEktpOptions = [
  "Sudah Rekam",
  "Belum Rekam",
  "Belum Wajib",
];

export const kewarganegaraanOptions = [
  "WNI",
  "WNA",
];

export const golonganDarahOptions = [
  "A",
  "B",
  "AB",
  "O",
  "Tidak Tahu",
];

export const statusTinggalIndividuOptions = [
  "Tinggal dengan Orang Tua",
  "Tinggal dengan Keluarga",
  "Kontrak/Sewa",
  "Menumpang",
  "Asrama",
  "Kost",
  "Lainnya",
];

export const hubunganKontakDaruratOptions = [
  "Orang Tua",
  "Pasangan",
  "Saudara Kandung",
  "Anak",
  "Tetangga",
  "Kerabat",
  "Lainnya",
];

/** Status angkatan kerja — kerangka ILO (disederhanakan). */
export const statusPekerjaanOptions = [
  "Bekerja",
  "Wiraswasta",
  "Pelaku Usaha",
  "Pekerja Lepas",
  "Ibu Rumah Tangga",
  "Pelajar",
  "Pensiun",
  "Mencari Kerja",
  "Belum Bekerja",
];

export const penghasilanPribadiOptions = [
  "Tidak Ada",
  "< Rp 500.000",
  "Rp 500.000 - Rp 1.500.000",
  "Rp 1.500.000 - Rp 3.000.000",
  "Rp 3.000.000 - Rp 5.000.000",
  "> Rp 5.000.000",
];

export const jenisSimOptions = [
  "SIM A",
  "SIM B1",
  "SIM B2",
  "SIM C",
  "SIM D",
];

export const jenjangSekolahOptions = [
  "PAUD/TK",
  "SD/Sederajat",
  "SMP/Sederajat",
  "SMA/SMK/Sederajat",
  "Perguruan Tinggi",
];

export const semesterOptions = Array.from({ length: 14 }, (_, i) => `Semester ${i + 1}`);

export const statusVerifikasiDataOptions = [
  "Belum Diverifikasi",
  "Sudah Diverifikasi",
  "Perlu Tinjau Ulang",
];

export const statusBansosIndividuOptions = [
  "Bukan Penerima",
  "Penerima",
  "Diusulkan",
];

export const jenisBansosIndividuOptions = [
  "PKH",
  "BPNT/Sembako",
  "PBI-JKN",
  "PIP",
  "BST",
  "BLT",
  "Lainnya",
];

export const bidangPartisipasiOptions = [
  "Keamanan",
  "Kebersihan",
  "Sosial",
  "Keagamaan",
  "Kepemudaan",
  "Pendidikan",
  "Kesehatan",
  "UMKM",
  "Lainnya",
];

export const jenisKendaraanOptions = [
  "Sepeda",
  "Motor",
  "Mobil",
  "Angkutan Usaha",
  "Lainnya",
];

export const kategoriProgramOptions = [
  "semua",
  "pemukiman",
  "lansia",
  "balita",
  "remaja",
  "ibu hamil",
  "penerima bansos",
  "disabilitas",
];

export const statusProgramOptions = [
  "rencana",
  "berjalan",
  "selesai",
  "dibatalkan",
];

/** Label internal KK — hanya petugas/ketua RW (Blusukan). */
export const kkLabelRwSuggestions = [
  "Prioritas bansos",
  "Perlu kunjungan ulang",
  "Keluarga rentan",
  "Usaha informal",
  "Butuh bantuan kesehatan",
  "Data belum lengkap",
];
