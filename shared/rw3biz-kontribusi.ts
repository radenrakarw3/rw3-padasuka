/**
 * Kontribusi bulanan RW3BIZ — rumus tunggal untuk pratinjau form (client) dan
 * penetapan tarif (server). Semua angka default dapat diubah admin lewat
 * rw3biz_settings key "kontribusi_config".
 */

export const JENIS_TEMPAT_BIZ = [
  "keliling",
  "lapak",
  "kiosk",
  "usaha_rumahan",
  "toko",
  "gudang",
  "lainnya",
] as const;
export type JenisTempatBiz = (typeof JENIS_TEMPAT_BIZ)[number];

export const JENIS_TEMPAT_BIZ_LABEL: Record<JenisTempatBiz, string> = {
  keliling: "Pedagang keliling",
  lapak: "Lapak / gerobak tetap",
  kiosk: "Kios",
  usaha_rumahan: "Usaha rumahan (warung, jasa di rumah)",
  toko: "Toko / ruko",
  gudang: "Gudang / kantor / bengkel",
  lainnya: "Lainnya",
};

export const RENTANG_OMZET = ["lt3", "3_10", "10_30", "30_100", "gt100"] as const;
export type RentangOmzet = (typeof RENTANG_OMZET)[number];

export const RENTANG_OMZET_LABEL: Record<RentangOmzet, string> = {
  lt3: "Di bawah Rp3 juta / bulan",
  "3_10": "Rp3 – 10 juta / bulan",
  "10_30": "Rp10 – 30 juta / bulan",
  "30_100": "Rp30 – 100 juta / bulan",
  gt100: "Di atas Rp100 juta / bulan",
};

/** Batas bawah rentang omzet (Rupiah) — dasar batas atas kontribusi. */
export const RENTANG_OMZET_BAWAH: Record<RentangOmzet, number> = {
  lt3: 0,
  "3_10": 3_000_000,
  "10_30": 10_000_000,
  "30_100": 30_000_000,
  gt100: 100_000_000,
};

/** Titik tengah rentang omzet — hanya untuk statistik beban relatif antar kategori. */
export const RENTANG_OMZET_TENGAH: Record<RentangOmzet, number> = {
  lt3: 1_500_000,
  "3_10": 6_500_000,
  "10_30": 20_000_000,
  "30_100": 65_000_000,
  gt100: 150_000_000,
};

export const STATUS_TEMPAT_BIZ = ["milik", "sewa", "numpang"] as const;
export type StatusTempatBiz = (typeof STATUS_TEMPAT_BIZ)[number];
export const STATUS_TEMPAT_BIZ_LABEL: Record<StatusTempatBiz, string> = {
  milik: "Milik sendiri",
  sewa: "Sewa / kontrak",
  numpang: "Numpang / pinjam pakai",
};

export const OPERASIONAL_MALAM = ["tidak", "malam", "24jam"] as const;
export type OperasionalMalam = (typeof OPERASIONAL_MALAM)[number];
export const OPERASIONAL_MALAM_LABEL: Record<OperasionalMalam, string> = {
  tidak: "Tutup sebelum pukul 21.00",
  malam: "Buka lewat pukul 21.00",
  "24jam": "Buka 24 jam",
};

export const PERAN_ORANG_BIZ = ["pemilik", "penanggung_jawab", "pekerja_tetap", "pekerja_harian"] as const;
export type PeranOrangBiz = (typeof PERAN_ORANG_BIZ)[number];
export const PERAN_ORANG_BIZ_LABEL: Record<PeranOrangBiz, string> = {
  pemilik: "Pemilik",
  penanggung_jawab: "Penanggung jawab",
  pekerja_tetap: "Pekerja tetap",
  pekerja_harian: "Pekerja harian",
};

export const ASAL_ORANG_BIZ = ["rw3", "luar"] as const;
export type AsalOrangBiz = (typeof ASAL_ORANG_BIZ)[number];
export const ASAL_ORANG_BIZ_LABEL: Record<AsalOrangBiz, string> = {
  rw3: "Warga RW 03",
  luar: "Luar RW 03",
};

export const KERINGANAN_JENIS = ["lansia", "disabilitas", "tunggal", "bansos", "sepi", "lainnya"] as const;
export type KeringananJenis = (typeof KERINGANAN_JENIS)[number];
export const KERINGANAN_JENIS_LABEL: Record<KeringananJenis, string> = {
  lansia: "Pengusaha lansia",
  disabilitas: "Pengusaha disabilitas",
  tunggal: "Janda/duda penanggung keluarga",
  bansos: "Keluarga penerima bansos",
  sepi: "Usaha sedang sepi",
  lainnya: "Alasan lain",
};

export const KATEGORI_KAS_KONTRIBUSI = "Kontribusi RW3BIZ";

export type KodeKendaraanBiz = "kendaraanMotor" | "kendaraanMobil" | "kendaraanKolbak" | "kendaraanTruk" | "kendaraanTrukBesar";

/**
 * Kendaraan operasional usaha. `beratJalan` = membebani jalan lingkungan; biayanya
 * tidak ikut batas omzet (tetap ditagih walau omzet kecil), hanya dibatasi maksimal.
 */
export const KENDARAAN_BIZ: { kode: KodeKendaraanBiz; label: string; contoh: string; beratJalan: boolean }[] = [
  { kode: "kendaraanMotor", label: "Motor", contoh: "motor antar, motor roda tiga", beratJalan: false },
  { kode: "kendaraanMobil", label: "Mobil / minibus / box kecil", contoh: "Avanza, APV, Gran Max box", beratJalan: false },
  { kode: "kendaraanKolbak", label: "Kolbak / pick-up", contoh: "L300, Carry pick-up, Gran Max PU", beratJalan: true },
  { kode: "kendaraanTruk", label: "Truk engkel / sedang", contoh: "Colt Diesel, Elf, truk 4 roda", beratJalan: true },
  { kode: "kendaraanTrukBesar", label: "Truk besar", contoh: "Fuso, tronton, truk 6 roda ke atas", beratJalan: true },
];

export type KodeCharterBiz = "charterKolbak" | "charterTruk" | "charterTrukBesar";
export type TarifCharterKode = "charterKolbakPerDatang" | "charterTrukPerDatang" | "charterTrukBesarPerDatang";

/**
 * Kendaraan berat charter/sewaan yang datang ke lokasi usaha (bukan milik usaha).
 * Isian = rata-rata kedatangan per minggu; tetap lewat jalan RW 03 sehingga dihitung beban jalan.
 */
export const CHARTER_BIZ: { kode: KodeCharterBiz; kendaraan: KodeKendaraanBiz; tarif: TarifCharterKode; label: string }[] = [
  { kode: "charterKolbak", kendaraan: "kendaraanKolbak", tarif: "charterKolbakPerDatang", label: "Kolbak / pick-up charter" },
  { kode: "charterTruk", kendaraan: "kendaraanTruk", tarif: "charterTrukPerDatang", label: "Truk engkel / sedang charter" },
  { kode: "charterTrukBesar", kendaraan: "kendaraanTrukBesar", tarif: "charterTrukBesarPerDatang", label: "Truk besar charter" },
];

export const MINGGU_PER_BULAN = 4;

/** Charter dihitung per kedatangan; tiap 7 kedatangan/minggu setara satu unit milik sendiri (batas atasnya). */
export function hitungCharter(kedatanganPerMinggu: number, c: (typeof CHARTER_BIZ)[number], tarif: TarifKontribusi): number {
  const n = Math.max(0, Math.floor(kedatanganPerMinggu));
  if (!n) return 0;
  const perDatang = n * MINGGU_PER_BULAN * tarif[c.tarif];
  const batas = tarif[c.kendaraan] * Math.ceil(n / 7);
  return Math.min(perDatang, batas);
}

/**
 * Denda kendaraan tidak terdaftar saat razia = N × tarif bulanan unit jenis tersebut × pengali pengulangan
 * (pelanggaran razia ke-n dalam 12 bulan, minimal 1×).
 */
export function dendaRazia(jenis: KodeKendaraanBiz, tarif: TarifKontribusi, keBerapa = 1): number {
  const ulang = Math.max(1, pengaliPengulangan(keBerapa, tarif));
  return Math.min(tarif.dendaMaks, Math.round(tarif[jenis] * tarif.dendaRaziaKali * ulang));
}

export const KATEGORI_KAS_DENDA_RAZIA = "Denda razia kendaraan";

export const HASIL_RAZIA = ["terdaftar_milik", "terdaftar_charter", "tidak_terdaftar", "usaha_tidak_terdaftar", "lewat"] as const;
export type HasilRazia = (typeof HASIL_RAZIA)[number];
export const HASIL_RAZIA_LABEL: Record<HasilRazia, string> = {
  terdaftar_milik: "Terdaftar (milik usaha)",
  terdaftar_charter: "Terdaftar (charter usaha)",
  tidak_terdaftar: "Tidak terdaftar di data usaha",
  usaha_tidak_terdaftar: "Usaha tujuan belum terdaftar RW3BIZ",
  lewat: "Hanya melintas",
};

/** Nomor kwitansi denda razia: KW/RW03/RZ/2026/00012. */
export function nomorKwitansiRazia(raziaId: number, tanggal: string): string {
  return `KW/RW03/RZ/${tanggal.slice(0, 4)}/${String(raziaId).padStart(5, "0")}`;
}

// ---------------------------------------------------------------- Pelanggaran usaha (aduan & temuan)

export const JENIS_PELANGGARAN = [
  "ketertiban",
  "sampah_tercecer",
  "parkir_menghalangi",
  "fasum_tanpa_izin",
  "limbah_bau",
  "jam_operasional",
  "kerusakan_fasum",
  "data_tidak_sesuai",
  "lainnya",
] as const;
export type JenisPelanggaran = (typeof JENIS_PELANGGARAN)[number];

export const JENIS_PELANGGARAN_INFO: Record<JenisPelanggaran, { label: string; contoh: string }> = {
  ketertiban: { label: "Kebisingan / ketertiban", contoh: "musik keras, keributan, mengganggu istirahat warga" },
  sampah_tercecer: { label: "Sampah tercecer", contoh: "sampah usaha dibuang sembarangan / berceceran di jalan atau selokan" },
  parkir_menghalangi: { label: "Parkir / bongkar muat menghalangi jalan", contoh: "kendaraan usaha atau pembeli menutup jalan / akses rumah" },
  fasum_tanpa_izin: { label: "Memakai bahu jalan / fasum tanpa izin", contoh: "lapak, barang, atau tenda di trotoar / bahu jalan" },
  limbah_bau: { label: "Limbah, bau, atau asap", contoh: "air limbah ke jalan, selokan tersumbat, bau / asap menyengat" },
  jam_operasional: { label: "Melanggar jam operasional", contoh: "buka di luar jam yang didaftarkan" },
  kerusakan_fasum: { label: "Merusak jalan / fasilitas umum", contoh: "jalan rusak, portal, lampu, selokan rusak akibat kegiatan usaha" },
  data_tidak_sesuai: { label: "Data usaha tidak sesuai", contoh: "kendaraan operasional / data usaha tidak dilaporkan" },
  lainnya: { label: "Lainnya", contoh: "pelanggaran lain terhadap tata tertib RW 03" },
};

export const TINGKAT_PELANGGARAN = ["ringan", "sedang", "berat"] as const;
export type TingkatPelanggaran = (typeof TINGKAT_PELANGGARAN)[number];
export const TINGKAT_PELANGGARAN_LABEL: Record<TingkatPelanggaran, string> = {
  ringan: "Ringan",
  sedang: "Sedang",
  berat: "Berat",
};

export const SUMBER_PELANGGARAN = ["aduan_warga", "temuan_petugas"] as const;
export type SumberPelanggaran = (typeof SUMBER_PELANGGARAN)[number];

export const KATEGORI_KAS_DENDA_PELANGGARAN = "Denda pelanggaran usaha";
export const KATEGORI_KAS_VOUCHER = "Voucher belanja warga";

/** Nomor kwitansi denda pelanggaran: KW/RW03/PL/2026/00012. */
export function nomorKwitansiPelanggaran(id: number, tanggal: string): string {
  return `KW/RW03/PL/${tanggal.slice(0, 4)}/${String(id).padStart(5, "0")}`;
}

/** Pengali pelanggaran ke-n dalam 12 bulan (indeks 0 = pertama); lewat ujung daftar memakai nilai terakhir. */
export function pengaliPengulangan(keBerapa: number, tarif: TarifKontribusi): number {
  const daftar = tarif.dendaPengulangan.length ? tarif.dendaPengulangan : [1];
  return daftar[Math.min(Math.max(1, keBerapa), daftar.length) - 1];
}

export type HasilDendaPelanggaran = {
  denda: number;
  teguran: boolean;
  dasar: number;
  pengaliTingkat: number;
  pengaliUlang: number;
  rincian: string;
};

/**
 * Denda = dasar jenis × tingkat × pengulangan (12 bulan terakhir), dibulatkan, maks. `dendaMaks`.
 * Pelanggaran pertama ringan/sedang cukup teguran tertulis bila pengali pertama 0; pelanggaran berat selalu didenda.
 */
export function hitungDendaPelanggaran(
  o: { jenis: JenisPelanggaran; tingkat: TingkatPelanggaran; keBerapa: number; dasarManual?: number | null },
  tarif: TarifKontribusi,
): HasilDendaPelanggaran {
  const dasar = o.jenis === "lainnya" ? Math.max(0, o.dasarManual ?? 0) : tarif.dendaPelanggaran[o.jenis];
  const pengaliTingkat = tarif.dendaTingkat[o.tingkat];
  let pengaliUlang = pengaliPengulangan(o.keBerapa, tarif);
  if (pengaliUlang === 0 && o.tingkat === "berat") pengaliUlang = 1;
  const mentah = dasar * pengaliTingkat * pengaliUlang;
  const denda = Math.min(tarif.dendaMaks, Math.round(mentah / tarif.pembulatan) * tarif.pembulatan);
  const teguran = denda === 0;
  const rincian = teguran
    ? `Pelanggaran ke-${o.keBerapa} (${TINGKAT_PELANGGARAN_LABEL[o.tingkat].toLowerCase()}): teguran tertulis, tanpa denda`
    : `Rp${dasar.toLocaleString("id-ID")} × ${pengaliTingkat} (${TINGKAT_PELANGGARAN_LABEL[o.tingkat].toLowerCase()}) × ${pengaliUlang} (pelanggaran ke-${o.keBerapa})` +
      (mentah > tarif.dendaMaks ? ` — dibatasi maks. Rp${tarif.dendaMaks.toLocaleString("id-ID")}` : "");
  return { denda, teguran, dasar, pengaliTingkat, pengaliUlang, rincian };
}

/** Kelebihan kontribusi + denda di atas target RAB bulan itu dijadikan voucher belanja warga. */
export function hitungSurplusVoucher(o: { kontribusi: number; denda: number; target: number }) {
  const terkumpul = o.kontribusi + o.denda;
  return { terkumpul, surplus: Math.max(0, terkumpul - o.target) };
}

export type PosAnggaran = {
  id: string;
  label: string;
  nominal: number;
  keterangan?: string;
};

export type TarifKontribusi = {
  targetBulanan: number;
  tarifDasar: Record<JenisTempatBiz, number>;
  tambahanOmzet: Record<RentangOmzet, number>;
  luasBatasM2: number;
  luasPerM2: number;
  luasMaks: number;
  tambahanMalam: number;
  tambahan24Jam: number;
  sampahPerKantong: number;
  tambahanBahuJalan: number;
  kendaraanMotor: number;
  kendaraanMobil: number;
  kendaraanKolbak: number;
  kendaraanTruk: number;
  kendaraanTrukBesar: number;
  charterKolbakPerDatang: number;
  charterTrukPerDatang: number;
  charterTrukBesarPerDatang: number;
  /** Denda razia = kali ini × tarif bulanan jenis kendaraan. */
  dendaRaziaKali: number;
  /** Denda dasar per jenis pelanggaran (lainnya = diisi petugas). */
  dendaPelanggaran: Record<Exclude<JenisPelanggaran, "lainnya">, number>;
  dendaTingkat: Record<TingkatPelanggaran, number>;
  /** Pengali pelanggaran ke-1, ke-2, ... dalam 12 bulan; 0 = teguran tertulis. Juga dipakai razia (min. 1). */
  dendaPengulangan: number[];
  dendaMaks: number;
  /** Per pegawai (semua orang selain pemilik). */
  pegawaiPerOrang: number;
  /** Tambahan per pegawai dari luar RW 03. */
  pekerjaLuar: number;
  diskonLokalSebagian: number;
  diskonLokalPenuh: number;
  minimal: number;
  maksimal: number;
  batasPersenOmzet: number;
  batasOmzetKecil: number;
  pembulatan: number;
  faktorPenyesuaian: number;
  /** Bulan program kontribusi dimulai (YYYY-MM) — acuan masa transisi. */
  programMulai: string;
  /** Persen yang dibayar pada bulan transisi ke-1, ke-2, dst. Setelahnya 100%. */
  transisiPersen: number[];
  bulanGratisUsahaBaru: number;
  potonganTermin: Record<string, number>;
  tenggangHari: number;
  posAnggaran: PosAnggaran[];
  /** Versi RAB bawaan yang terakhir diterapkan (lihat RAB_VERSI). */
  rabVersi: number;
};

/** RAB RW 03 (Anggaran Penerimaan dan Pengeluaran RW, Perwal Cimahi 53/2021 Pasal 114 ayat 4). */
export const POS_ANGGARAN_DEFAULT: PosAnggaran[] = [
  { id: "insentif_pelayanan", label: "Insentif kinerja pelayanan", nominal: 1_500_000, keterangan: "Pelayanan surat, izin, dan pendataan oleh Ketua RW 03" },
  { id: "linmas_keamanan", label: "Linmas & keamanan", nominal: 3_000_000, keterangan: "Ronda malam, insentif Linmas, pos ronda, portal, CCTV" },
  { id: "kebersihan", label: "Kebersihan lingkungan (petugas sapu RW)", nominal: 2_000_000, keterangan: "Petugas sapu, angkut sampah, alat kebersihan" },
  { id: "operasional_rt", label: "Operasional 7 RT", nominal: 1_400_000, keterangan: "Rp200.000 per RT per bulan" },
  { id: "infrastruktur", label: "Infrastruktur & maintenance kecil", nominal: 2_500_000, keterangan: "Lampu jalan, selokan, tambal jalan, perbaikan fasilitas umum" },
  { id: "sosial_darurat", label: "Sosial & respons darurat", nominal: 1_500_000, keterangan: "Santunan duka, warga sakit, banjir, kebakaran" },
  { id: "administrasi_digital", label: "Administrasi, data & digital", nominal: 600_000, keterangan: "ATK, cetak surat, WA, sistem rw3padasukacimahi.org" },
  { id: "kegiatan_warga", label: "Kegiatan warga/kader/pemuda", nominal: 1_000_000, keterangan: "17-an, posyandu, kader, karang taruna" },
  { id: "dana_pembangunan", label: "Dana pembangunan", nominal: 2_500_000, keterangan: "Tabungan pembangunan sarana & prasarana lingkungan" },
  { id: "dana_cadangan", label: "Dana cadangan", nominal: 2_000_000, keterangan: "Kebutuhan mendesak di luar rencana" },
];

/** Naikkan bila POS_ANGGARAN_DEFAULT diganti: konfigurasi tersimpan versi lama ikut diperbarui sekali. */
export const RAB_VERSI = 3;

// ---------------------------------------------------------------- Sumbangsih program RW 03

/**
 * Kontribusi usaha tidak dihitung rumus: pengusaha menyanggupkan sendiri nominal per bulan
 * untuk program RW 03 (= pos anggaran). Label disalin agar tetap terbaca bila pos diganti nama.
 */
export type SumbangsihProgram = { posId: string; label: string; nominal: number };

export const SUMBANGSIH_MAKS_PER_PROGRAM = 10_000_000;

export function totalSumbangsih(list: { nominal: number }[]): number {
  return list.reduce((s, x) => s + Math.max(0, Math.round(Number(x.nominal) || 0)), 0);
}

/** Cocokkan isian ke program yang berlaku; program tak dikenal & nominal 0 dibuang, urutan ikut daftar program. */
export function rapikanSumbangsih(isian: { posId: string; nominal: number }[], program: PosAnggaran[]): SumbangsihProgram[] {
  const nominal = new Map<string, number>();
  for (const x of isian) {
    const n = Math.min(SUMBANGSIH_MAKS_PER_PROGRAM, Math.max(0, Math.round(Number(x.nominal) || 0)));
    nominal.set(x.posId, (nominal.get(x.posId) ?? 0) + n);
  }
  return program
    .map((p) => ({ posId: p.id, label: p.label, nominal: Math.min(SUMBANGSIH_MAKS_PER_PROGRAM, nominal.get(p.id) ?? 0) }))
    .filter((s) => s.nominal > 0);
}

/** null = usaha lama yang kontribusinya masih dari rumus. */
export function parseSumbangsih(raw: string | null | undefined): SumbangsihProgram[] | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    return v
      .filter((s) => s && typeof s.posId === "string" && typeof s.label === "string")
      .map((s) => ({ posId: s.posId, label: s.label, nominal: Math.max(0, Math.round(Number(s.nominal) || 0)) }));
  } catch {
    return null;
  }
}

/** Nomor kwitansi tetap dari id pembayaran: KW/RW03/BIZ/2026/00012. */
export function nomorKwitansi(pembayaranId: number, tanggal: string): string {
  return `KW/RW03/BIZ/${tanggal.slice(0, 4)}/${String(pembayaranId).padStart(5, "0")}`;
}

const NAMA_BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "2026-10" → "Oktober 2026". */
export function labelPeriode(periode: string): string {
  const [y, m] = periode.split("-").map(Number);
  return NAMA_BULAN_ID[m - 1] ? `${NAMA_BULAN_ID[m - 1]} ${y}` : periode;
}

export function bulanIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const TARIF_DEFAULT: TarifKontribusi = {
  targetBulanan: 18_000_000,
  tarifDasar: {
    keliling: 10_000,
    lapak: 20_000,
    kiosk: 35_000,
    usaha_rumahan: 20_000,
    toko: 60_000,
    gudang: 90_000,
    lainnya: 35_000,
  },
  tambahanOmzet: { lt3: 0, "3_10": 15_000, "10_30": 45_000, "30_100": 120_000, gt100: 250_000 },
  luasBatasM2: 20,
  luasPerM2: 1_000,
  luasMaks: 50_000,
  tambahanMalam: 10_000,
  tambahan24Jam: 20_000,
  sampahPerKantong: 5_000,
  tambahanBahuJalan: 15_000,
  kendaraanMotor: 5_000,
  kendaraanMobil: 15_000,
  kendaraanKolbak: 25_000,
  kendaraanTruk: 50_000,
  kendaraanTrukBesar: 100_000,
  charterKolbakPerDatang: 1_500,
  charterTrukPerDatang: 3_000,
  charterTrukBesarPerDatang: 6_000,
  dendaRaziaKali: 1,
  dendaPelanggaran: {
    ketertiban: 50_000,
    sampah_tercecer: 50_000,
    parkir_menghalangi: 50_000,
    fasum_tanpa_izin: 50_000,
    limbah_bau: 100_000,
    jam_operasional: 50_000,
    kerusakan_fasum: 150_000,
    data_tidak_sesuai: 100_000,
  },
  dendaTingkat: { ringan: 0.5, sedang: 1, berat: 2 },
  dendaPengulangan: [0, 1, 2, 3],
  dendaMaks: 1_000_000,
  pegawaiPerOrang: 2_000,
  pekerjaLuar: 5_000,
  diskonLokalSebagian: 15,
  diskonLokalPenuh: 25,
  minimal: 10_000,
  maksimal: 500_000,
  batasPersenOmzet: 1,
  batasOmzetKecil: 20_000,
  pembulatan: 1_000,
  faktorPenyesuaian: 1,
  programMulai: "",
  transisiPersen: [50, 50, 75],
  bulanGratisUsahaBaru: 1,
  potonganTermin: { "1": 0, "3": 5, "6": 7, "12": 10 },
  tenggangHari: 0,
  posAnggaran: POS_ANGGARAN_DEFAULT,
  rabVersi: RAB_VERSI,
};

function angka(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Gabungkan konfigurasi tersimpan (JSON parsial) dengan default — tahan data lama/rusak. */
export function parseTarifKontribusi(raw: string | null | undefined): TarifKontribusi {
  let o: Partial<TarifKontribusi> = {};
  if (raw?.trim()) {
    try {
      o = JSON.parse(raw) as Partial<TarifKontribusi>;
    } catch {
      o = {};
    }
  }
  const d = TARIF_DEFAULT;
  const tarifDasar = { ...d.tarifDasar };
  for (const k of JENIS_TEMPAT_BIZ) tarifDasar[k] = angka(o.tarifDasar?.[k], d.tarifDasar[k]);
  const tambahanOmzet = { ...d.tambahanOmzet };
  for (const k of RENTANG_OMZET) tambahanOmzet[k] = angka(o.tambahanOmzet?.[k], d.tambahanOmzet[k]);
  const potonganTermin: Record<string, number> = { ...d.potonganTermin };
  for (const k of Object.keys(d.potonganTermin)) {
    potonganTermin[k] = Math.min(50, angka(o.potonganTermin?.[k], d.potonganTermin[k]));
  }
  const rabLama = angka(o.rabVersi, 0) < RAB_VERSI;
  const posAnggaran = !rabLama && Array.isArray(o.posAnggaran) && o.posAnggaran.length
    ? o.posAnggaran
        .filter((p) => p && typeof p.label === "string" && p.label.trim())
        .map((p, i) => ({
          id: String(p.id || `pos_${i}`),
          label: p.label.trim(),
          nominal: angka(p.nominal, 0),
          keterangan: p.keterangan?.trim() || undefined,
        }))
    : d.posAnggaran;
  const transisiPersen = Array.isArray(o.transisiPersen)
    ? o.transisiPersen.map((p) => Math.min(100, angka(p, 100))).slice(0, 12)
    : d.transisiPersen;
  const minimal = angka(o.minimal, d.minimal);
  const dendaPelanggaran = { ...d.dendaPelanggaran };
  for (const k of Object.keys(dendaPelanggaran) as (keyof typeof dendaPelanggaran)[]) {
    dendaPelanggaran[k] = angka(o.dendaPelanggaran?.[k], d.dendaPelanggaran[k]);
  }
  const dendaTingkat = { ...d.dendaTingkat };
  for (const k of TINGKAT_PELANGGARAN) dendaTingkat[k] = Math.min(10, angka(o.dendaTingkat?.[k], d.dendaTingkat[k]));
  const dendaPengulangan =
    Array.isArray(o.dendaPengulangan) && o.dendaPengulangan.length
      ? o.dendaPengulangan.map((p) => Math.min(10, angka(p, 1))).slice(0, 10)
      : d.dendaPengulangan;
  return {
    targetBulanan: rabLama ? d.targetBulanan : angka(o.targetBulanan, d.targetBulanan),
    tarifDasar,
    tambahanOmzet,
    luasBatasM2: angka(o.luasBatasM2, d.luasBatasM2),
    luasPerM2: angka(o.luasPerM2, d.luasPerM2),
    luasMaks: angka(o.luasMaks, d.luasMaks),
    tambahanMalam: angka(o.tambahanMalam, d.tambahanMalam),
    tambahan24Jam: angka(o.tambahan24Jam, d.tambahan24Jam),
    sampahPerKantong: angka(o.sampahPerKantong, d.sampahPerKantong),
    tambahanBahuJalan: angka(o.tambahanBahuJalan, d.tambahanBahuJalan),
    kendaraanMotor: angka(o.kendaraanMotor, d.kendaraanMotor),
    kendaraanMobil: angka(o.kendaraanMobil, d.kendaraanMobil),
    kendaraanKolbak: angka(o.kendaraanKolbak, d.kendaraanKolbak),
    kendaraanTruk: angka(o.kendaraanTruk, d.kendaraanTruk),
    kendaraanTrukBesar: angka(o.kendaraanTrukBesar, d.kendaraanTrukBesar),
    charterKolbakPerDatang: angka(o.charterKolbakPerDatang, d.charterKolbakPerDatang),
    charterTrukPerDatang: angka(o.charterTrukPerDatang, d.charterTrukPerDatang),
    charterTrukBesarPerDatang: angka(o.charterTrukBesarPerDatang, d.charterTrukBesarPerDatang),
    dendaRaziaKali: Math.min(10, angka(o.dendaRaziaKali, d.dendaRaziaKali)),
    dendaPelanggaran,
    dendaTingkat,
    dendaPengulangan,
    dendaMaks: Math.max(1_000, angka(o.dendaMaks, d.dendaMaks)),
    pegawaiPerOrang: angka(o.pegawaiPerOrang, d.pegawaiPerOrang),
    pekerjaLuar: angka(o.pekerjaLuar, d.pekerjaLuar),
    diskonLokalSebagian: Math.min(100, angka(o.diskonLokalSebagian, d.diskonLokalSebagian)),
    diskonLokalPenuh: Math.min(100, angka(o.diskonLokalPenuh, d.diskonLokalPenuh)),
    minimal,
    maksimal: Math.max(minimal, angka(o.maksimal, d.maksimal)),
    batasPersenOmzet: angka(o.batasPersenOmzet, d.batasPersenOmzet),
    batasOmzetKecil: Math.max(minimal, angka(o.batasOmzetKecil, d.batasOmzetKecil)),
    pembulatan: Math.max(1, angka(o.pembulatan, d.pembulatan)),
    faktorPenyesuaian: Math.min(10, Math.max(0.1, angka(o.faktorPenyesuaian, d.faktorPenyesuaian))),
    programMulai: /^\d{4}-\d{2}$/.test(String(o.programMulai ?? "")) ? String(o.programMulai) : d.programMulai,
    transisiPersen,
    bulanGratisUsahaBaru: Math.min(12, Math.floor(angka(o.bulanGratisUsahaBaru, d.bulanGratisUsahaBaru))),
    potonganTermin,
    // RAB_VERSI naik: setor default tanggal 1 (tenggang 0). Setelah itu admin boleh ubah.
    tenggangHari: rabLama ? d.tenggangHari : Math.min(28, Math.floor(angka(o.tenggangHari, d.tenggangHari))),
    posAnggaran,
    rabVersi: RAB_VERSI,
  };
}

export type OrangKontribusi = {
  peran: PeranOrangBiz | string | null | undefined;
  asal: AsalOrangBiz | string | null | undefined;
  isAnak?: boolean;
};

export type InputKontribusi = {
  jenisTempatUsaha: JenisTempatBiz | string | null | undefined;
  rentangOmzet: RentangOmzet | string | null | undefined;
  luasM2?: number | null;
  operasionalMalam?: OperasionalMalam | string | null;
  sampahKantongHari?: number | null;
  pakaiBahuJalan?: boolean | null;
  kendaraanMotor?: number | null;
  kendaraanMobil?: number | null;
  kendaraanKolbak?: number | null;
  kendaraanTruk?: number | null;
  kendaraanTrukBesar?: number | null;
  /** Rata-rata kedatangan per minggu kendaraan charter. */
  charterKolbak?: number | null;
  charterTruk?: number | null;
  charterTrukBesar?: number | null;
  orang: OrangKontribusi[];
};

export type KomponenKontribusi = {
  kode: string;
  label: string;
  nominal: number;
  /** Beban jalan: tidak kena diskon lokal, faktor, maupun batas omzet. */
  diLuarBatas?: boolean;
};

export type HasilKontribusi = {
  komponen: KomponenKontribusi[];
  subtotal: number;
  /** Jumlah komponen beban jalan (kolbak/truk) — sudah termasuk di subtotal. */
  bebanJalan?: number;
  /** Orang selain pemilik (anak tidak dihitung). */
  jumlahPegawai?: number;
  jumlahPekerja: number;
  pekerjaRw3: number;
  pekerjaLuar: number;
  persenPekerjaRw3: number;
  diskonLokalPersen: number;
  diskonLokal: number;
  faktorPenyesuaian: number;
  setelahFaktor: number;
  batasAtas: number;
  batasAtasAlasan: string;
  terkenaBatasAtas: boolean;
  total: number;
};

function jenisValid(j: unknown): JenisTempatBiz {
  return (JENIS_TEMPAT_BIZ as readonly string[]).includes(String(j)) ? (j as JenisTempatBiz) : "lainnya";
}

function omzetValid(r: unknown): RentangOmzet {
  return (RENTANG_OMZET as readonly string[]).includes(String(r)) ? (r as RentangOmzet) : "lt3";
}

function bulat(n: number, kelipatan: number): number {
  return Math.round(n / kelipatan) * kelipatan;
}

function bulatBawah(n: number, kelipatan: number): number {
  return Math.floor(n / kelipatan) * kelipatan;
}

export function formatRp(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

/** Batas atas kontribusi berdasarkan omzet: x% dari batas bawah rentang, minimal batasOmzetKecil. */
export function batasAtasOmzet(rentang: RentangOmzet, tarif: TarifKontribusi): number {
  const bawah = RENTANG_OMZET_BAWAH[rentang];
  const dariOmzet = bawah > 0 ? (bawah * tarif.batasPersenOmzet) / 100 : tarif.batasOmzetKecil;
  return Math.max(tarif.minimal, Math.min(tarif.maksimal, Math.max(tarif.batasOmzetKecil, dariOmzet)));
}

/** Turunkan kategori operasional malam dari jam buka/tutup (HH:MM). */
export function turunkanOperasionalMalam(jamBuka?: string | null, jamTutup?: string | null): OperasionalMalam {
  const m = (s?: string | null) => {
    const r = /^(\d{2}):(\d{2})$/.exec(String(s ?? ""));
    return r ? Number(r[1]) * 60 + Number(r[2]) : null;
  };
  const buka = m(jamBuka);
  const tutup = m(jamTutup);
  if (buka == null || tutup == null) return "tidak";
  if (buka === tutup || (buka === 0 && tutup >= 23 * 60 + 59)) return "24jam";
  if (tutup < buka || tutup > 21 * 60) return "malam";
  return "tidak";
}

export function hitungKontribusiRw3biz(input: InputKontribusi, tarif: TarifKontribusi): HasilKontribusi {
  const jenis = jenisValid(input.jenisTempatUsaha);
  const omzet = omzetValid(input.rentangOmzet);
  const komponen: KomponenKontribusi[] = [];
  const tambah = (kode: string, label: string, nominal: number, diLuarBatas = false) => {
    if (nominal > 0) komponen.push({ kode, label, nominal: Math.round(nominal), ...(diLuarBatas ? { diLuarBatas } : {}) });
  };

  tambah("dasar", `Tarif dasar — ${JENIS_TEMPAT_BIZ_LABEL[jenis]}`, tarif.tarifDasar[jenis]);
  tambah("omzet", `Omzet ${RENTANG_OMZET_LABEL[omzet]}`, tarif.tambahanOmzet[omzet]);

  const luas = Math.max(0, Number(input.luasM2) || 0);
  if (luas > tarif.luasBatasM2) {
    const lebih = Math.ceil(luas - tarif.luasBatasM2);
    tambah("luas", `Luas ${luas} m² (lebih ${lebih} m² dari ${tarif.luasBatasM2} m²)`, Math.min(tarif.luasMaks, lebih * tarif.luasPerM2));
  }

  if (input.operasionalMalam === "24jam") tambah("malam", "Buka 24 jam (porsi Linmas)", tarif.tambahan24Jam);
  else if (input.operasionalMalam === "malam") tambah("malam", "Buka lewat pukul 21.00 (porsi Linmas)", tarif.tambahanMalam);

  const kantong = Math.max(0, Math.floor(Number(input.sampahKantongHari) || 0));
  if (kantong > 1) tambah("sampah", `Sampah ${kantong} kantong/hari (kebersihan)`, (kantong - 1) * tarif.sampahPerKantong);

  if (input.pakaiBahuJalan) tambah("bahu_jalan", "Memakai bahu jalan / parkir pelanggan", tarif.tambahanBahuJalan);

  for (const k of KENDARAAN_BIZ) {
    const n = Math.max(0, Math.floor(Number(input[k.kode]) || 0));
    if (n > 0) {
      tambah(
        k.kode,
        `Kendaraan operasional: ${n} ${k.label.toLowerCase()}${k.beratJalan ? " (beban jalan)" : ""}`,
        n * tarif[k.kode],
        k.beratJalan,
      );
    }
  }

  for (const c of CHARTER_BIZ) {
    const n = Math.max(0, Math.floor(Number(input[c.kode]) || 0));
    const nominal = hitungCharter(n, c, tarif);
    if (nominal > 0) {
      const penuh = nominal < n * MINGGU_PER_BULAN * tarif[c.tarif];
      tambah(
        c.kode,
        `${c.label}: ${n}× datang/minggu (beban jalan${penuh ? ", maks. setara unit sendiri" : ""})`,
        nominal,
        true,
      );
    }
  }

  const pekerja = input.orang.filter((o) => !o.isAnak);
  const pekerjaRw3 = pekerja.filter((o) => o.asal === "rw3").length;
  const pegawai = pekerja.filter((o) => o.peran !== "pemilik");
  const pekerjaLuarNonPemilik = pegawai.filter((o) => o.asal !== "rw3").length;
  const pekerjaLuar = pekerja.length - pekerjaRw3;
  if (pegawai.length > 0) {
    tambah("pegawai", `${pegawai.length} pegawai × ${formatRp(tarif.pegawaiPerOrang)}`, pegawai.length * tarif.pegawaiPerOrang);
  }
  if (pekerjaLuarNonPemilik > 0) {
    tambah("pekerja_luar", `${pekerjaLuarNonPemilik} pegawai dari luar RW 03`, pekerjaLuarNonPemilik * tarif.pekerjaLuar);
  }

  const subtotal = komponen.reduce((s, k) => s + k.nominal, 0);
  const bebanJalan = komponen.filter((k) => k.diLuarBatas).reduce((s, k) => s + k.nominal, 0);
  const subtotalDasar = subtotal - bebanJalan;
  const persenPekerjaRw3 = pekerja.length ? Math.round((pekerjaRw3 / pekerja.length) * 100) : 0;
  let diskonLokalPersen = 0;
  if (pekerja.length && pekerjaRw3 === pekerja.length) diskonLokalPersen = tarif.diskonLokalPenuh;
  else if (pekerja.length && pekerjaRw3 * 2 >= pekerja.length) diskonLokalPersen = tarif.diskonLokalSebagian;
  const diskonLokal = Math.round((subtotalDasar * diskonLokalPersen) / 100);

  const setelahFaktor = (subtotalDasar - diskonLokal) * tarif.faktorPenyesuaian;
  const batasOmzet = batasAtasOmzet(omzet, tarif);
  const batasAtas = Math.min(tarif.maksimal, batasOmzet);
  let batasAtasAlasan =
    batasOmzet < tarif.maksimal
      ? omzet === "lt3"
        ? `Batas usaha omzet kecil ${formatRp(batasAtas)}`
        : `Batas ${tarif.batasPersenOmzet}% dari omzet minimal rentang (${formatRp(batasAtas)})`
      : `Batas maksimal ${formatRp(tarif.maksimal)}`;
  if (bebanJalan > 0) batasAtasAlasan += " — beban jalan kendaraan berat ditambahkan di luar batas ini";

  let dasar = bulat(setelahFaktor, tarif.pembulatan);
  let terkenaBatasAtas = dasar > batasAtas;
  if (terkenaBatasAtas) dasar = bulatBawah(batasAtas, tarif.pembulatan);
  let total = dasar + bulat(bebanJalan, tarif.pembulatan);
  if (total > tarif.maksimal) {
    total = bulatBawah(tarif.maksimal, tarif.pembulatan);
    terkenaBatasAtas = true;
    batasAtasAlasan = `Batas maksimal ${formatRp(tarif.maksimal)} per bulan`;
  }
  total = Math.max(tarif.minimal, total);

  return {
    komponen,
    subtotal,
    bebanJalan,
    jumlahPegawai: pegawai.length,
    jumlahPekerja: pekerja.length,
    pekerjaRw3,
    pekerjaLuar,
    persenPekerjaRw3,
    diskonLokalPersen,
    diskonLokal,
    faktorPenyesuaian: tarif.faktorPenyesuaian,
    setelahFaktor: Math.round(setelahFaktor),
    batasAtas,
    batasAtasAlasan,
    terkenaBatasAtas,
    total,
  };
}

/** Bagi nominal kontribusi ke pos anggaran secara proporsional terhadap nominal pos. */
export function alokasiKePos(total: number, pos: PosAnggaran[]): { id: string; label: string; nominal: number }[] {
  const jumlahPos = pos.reduce((s, p) => s + p.nominal, 0);
  if (!jumlahPos || total <= 0) return pos.map((p) => ({ id: p.id, label: p.label, nominal: 0 }));
  const hasil = pos.map((p) => ({ id: p.id, label: p.label, nominal: Math.floor((total * p.nominal) / jumlahPos) }));
  let sisa = total - hasil.reduce((s, h) => s + h.nominal, 0);
  for (let i = 0; sisa > 0 && hasil.length; i = (i + 1) % hasil.length, sisa--) hasil[i].nominal += 1;
  return hasil;
}

export function tambahBulan(periode: string, n: number): string {
  const [y, m] = periode.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function selisihBulan(dari: string, ke: string): number {
  const [y1, m1] = dari.split("-").map(Number);
  const [y2, m2] = ke.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

export type PenyesuaianTagihan = {
  persenBayar: number;
  catatan: string[];
};

/**
 * Persen yang ditagih untuk satu periode setelah masa gratis usaha baru,
 * masa transisi program, dan keringanan. Potongan termin dihitung terpisah.
 */
export function penyesuaianPeriode(params: {
  periode: string;
  periodeMulaiUsaha: string;
  usahaBaru: boolean;
  tahapTransisiMulai?: string | null;
  keringananPersen?: number | null;
  keringananSampai?: string | null;
  tarif: TarifKontribusi;
}): PenyesuaianTagihan {
  const { periode, periodeMulaiUsaha, usahaBaru, tahapTransisiMulai, keringananPersen, keringananSampai, tarif } = params;
  const catatan: string[] = [];
  const keUsaha = selisihBulan(periodeMulaiUsaha, periode);
  if (usahaBaru && keUsaha >= 0 && keUsaha < tarif.bulanGratisUsahaBaru) {
    return { persenBayar: 0, catatan: ["Bulan pertama usaha baru (gratis)"] };
  }
  let persen = 100;
  if (tahapTransisiMulai && /^\d{4}-\d{2}$/.test(tahapTransisiMulai)) {
    const ke = selisihBulan(tahapTransisiMulai, periode);
    if (ke >= 0 && ke < tarif.transisiPersen.length) {
      persen = tarif.transisiPersen[ke];
      catatan.push(`Masa transisi bulan ke-${ke + 1} (${persen}%)`);
    }
  }
  if (keringananPersen && keringananPersen > 0 && keringananSampai && periode <= keringananSampai.slice(0, 7)) {
    persen = Math.round((persen * (100 - Math.min(100, keringananPersen))) / 100);
    catatan.push(keringananPersen >= 100 ? "Dibebaskan sementara (keringanan)" : `Keringanan ${keringananPersen}%`);
  }
  return { persenBayar: persen, catatan };
}

export function nominalTagihan(kontribusiBulanan: number, persenBayar: number, potonganTerminPersen: number, tarif: TarifKontribusi): number {
  const kotor = (kontribusiBulanan * persenBayar) / 100;
  const bersih = kotor * (1 - potonganTerminPersen / 100);
  return Math.max(0, bulat(bersih, tarif.pembulatan));
}

/** Tanggal jatuh tempo (YYYY-MM-DD) suatu periode: tanggal 1 + tenggang hari. */
export function jatuhTempo(periode: string, tarif: TarifKontribusi): string {
  const hari = Math.max(1, Math.min(28, 1 + tarif.tenggangHari));
  return `${periode}-${String(hari).padStart(2, "0")}`;
}

/** Cari faktor penyesuaian global agar total proyeksi mendekati target (pencarian biner). */
export function cariFaktorTarget(inputs: InputKontribusi[], tarif: TarifKontribusi, target: number): {
  faktor: number;
  proyeksi: number;
  tercapai: boolean;
} {
  const totalDengan = (f: number) =>
    inputs.reduce((s, i) => s + hitungKontribusiRw3biz(i, { ...tarif, faktorPenyesuaian: f }).total, 0);
  if (!inputs.length) return { faktor: tarif.faktorPenyesuaian, proyeksi: 0, tercapai: false };
  let lo = 0.1;
  let hi = 10;
  const maks = totalDengan(hi);
  if (maks < target) return { faktor: hi, proyeksi: maks, tercapai: false };
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (totalDengan(mid) >= target) hi = mid;
    else lo = mid;
  }
  const faktor = Math.ceil(hi * 100) / 100;
  return { faktor, proyeksi: totalDengan(faktor), tercapai: true };
}
