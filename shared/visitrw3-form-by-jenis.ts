import type { JenisWarga } from "./schema";

/**
 * Profil field & salinan form pengajuan Visit RW3 per karakter jenis warga.
 * Kontrak = rumah tangga sewa · Kost = kamar individu · Jualan = usaha di lokasi.
 */
export type Visitrw3FormProfile = {
  lokasiTitle: string;
  lokasiHint: string;
  alamatLabel: string;
  alamatPlaceholder: string;
  nomorUnitMode: "required" | "optional" | "hidden";
  nomorUnitLabel: string;
  nomorUnitHint: string;
  nomorUnitPlaceholder: string;
  /** Tampilkan stepper anak (kontrak/jualan keluarga). */
  showAnak: boolean;
  maxDewasa: number;
  maxAnak: number;
  maxTotal: number;
  jumlahTitle: string;
  jumlahHint: string;
  dewasaLabel: string;
  dewasaHint: string;
  anakHint: string;
  /** Wajib keperluan tinggal (kerja/kuliah/…) — hanya kontrak & kost. */
  requireKeperluanTinggal: boolean;
  /** Opsi keperluan tinggal (jika beda per jenis). */
  keperluanTinggalOptions: readonly string[];
  /** Field pekerjaan (PNS/wiraswasta/…) — tidak relevan untuk form usaha. */
  requirePekerjaan: boolean;
  tempatKerjaLabel: string;
  tempatKerjaPlaceholder: string;
  /** Tempat kerja/sekolah masih relevan. */
  requireTempatKerja: boolean;
  /** Jam buka–tutup wajib (jualan). */
  requireJamOperasional: boolean;
  defaultTerminBulan: string;
  bayarHint: string;
  explainSebelum: string;
  orangLabel: string;
};

const KEPERLUAN_TINGGAL = ["Kerja", "Kuliah", "Usaha", "Lainnya"] as const;
const KEPERLUAN_KOST = ["Kerja", "Kuliah", "Lainnya"] as const;

export const VISITRW3_FORM_BY_JENIS: Record<JenisWarga, Visitrw3FormProfile> = {
  kontrak: {
    lokasiTitle: "Lokasi kontrakan",
    lokasiHint: "Alamat unit/rumah yang Anda sewa di wilayah RW 03.",
    alamatLabel: "Alamat kontrakan / rumah sewa *",
    alamatPlaceholder: "Jl., gang, nomor rumah, patokan tetangga",
    nomorUnitMode: "optional",
    nomorUnitLabel: "Nomor rumah / unit (opsional)",
    nomorUnitHint: "Bantu petugas survey menemukan unit Anda.",
    nomorUnitPlaceholder: "Contoh: Unit 12, Rumah depan gang",
    showAnak: true,
    maxDewasa: 12,
    maxAnak: 12,
    maxTotal: 20,
    jumlahTitle: "Berapa orang yang tinggal di kontrakan?",
    jumlahHint: "Isi seluruh keluarga/teman serumah yang ikut tinggal.",
    dewasaLabel: "Dewasa",
    dewasaHint: "Termasuk suami/istri dan anggota dewasa lain",
    anakHint: "Anak di bawah umur — tidak perlu NIK",
    requireKeperluanTinggal: true,
    keperluanTinggalOptions: KEPERLUAN_TINGGAL,
    requirePekerjaan: true,
    tempatKerjaLabel: "Tempat kerja / aktivitas utama",
    tempatKerjaPlaceholder: "Nama perusahaan, kampus, atau usaha",
    requireTempatKerja: true,
    requireJamOperasional: false,
    defaultTerminBulan: "3",
    bayarHint: "Masa berlaku izin tinggal di kontrakan RW 03.",
    explainSebelum:
      "Anda mendaftar sebagai warga ngontrak. Siapkan data seluruh penghuni yang tinggal di unit yang sama.",
    orangLabel: "penghuni",
  },
  kost: {
    lokasiTitle: "Lokasi kost",
    lokasiHint: "Alamat bangunan kost dan nomor kamar Anda.",
    alamatLabel: "Alamat kost *",
    alamatPlaceholder: "Nama/alamat kost, gang, patokan",
    nomorUnitMode: "required",
    nomorUnitLabel: "Nomor kamar / unit *",
    nomorUnitHint: "Wajib agar petugas mudah menemukan kamar saat survey.",
    nomorUnitPlaceholder: "Contoh: Kamar 3B, Lantai 2 depan",
    showAnak: false,
    maxDewasa: 2,
    maxAnak: 0,
    maxTotal: 2,
    jumlahTitle: "Berapa orang di kamar kost?",
    jumlahHint: "Ngekost biasanya 1 orang. Maksimal 2 jika berbagi kamar.",
    dewasaLabel: "Penghuni kamar",
    dewasaHint: "Minimal 1, maksimal 2 orang",
    anakHint: "",
    requireKeperluanTinggal: true,
    keperluanTinggalOptions: KEPERLUAN_KOST,
    requirePekerjaan: true,
    tempatKerjaLabel: "Tempat kerja / kampus",
    tempatKerjaPlaceholder: "Nama kantor, kampus, atau tempat praktik",
    requireTempatKerja: true,
    requireJamOperasional: false,
    defaultTerminBulan: "1",
    bayarHint: "Masa berlaku izin tinggal di kost RW 03.",
    explainSebelum:
      "Anda mendaftar sebagai warga ngekost. Fokus data diri + nomor kamar — biasanya satu penghuni per kamar.",
    orangLabel: "penghuni",
  },
  jualan: {
    lokasiTitle: "Lokasi usaha",
    lokasiHint: "Titik lokasi jualan / usaha di wilayah RW 03.",
    alamatLabel: "Alamat lokasi usaha *",
    alamatPlaceholder: "Jl., gang, depan warung/masjid, patokan jelas",
    nomorUnitMode: "optional",
    nomorUnitLabel: "Identitas lapak / kiosk (opsional)",
    nomorUnitHint: "Misalnya nomor lapak atau posisi gerobak.",
    nomorUnitPlaceholder: "Contoh: Lapak 4, depan Alfamart",
    showAnak: false,
    maxDewasa: 1,
    maxAnak: 0,
    maxTotal: 1,
    jumlahTitle: "Pemilik / penanggung jawab usaha",
    jumlahHint: "Cukup satu orang: pemilik atau penanggung jawab. Data pegawai tidak dicatat.",
    dewasaLabel: "Pemilik / PJ",
    dewasaHint: "Orang yang bertanggung jawab atas usaha",
    anakHint: "",
    requireKeperluanTinggal: false,
    keperluanTinggalOptions: [],
    requirePekerjaan: false,
    tempatKerjaLabel: "Nama usaha / tempat kerja",
    tempatKerjaPlaceholder: "Samakan dengan nama usaha jika memungkinkan",
    requireTempatKerja: false,
    requireJamOperasional: true,
    defaultTerminBulan: "3",
    bayarHint: "Masa berlaku izin berjualan / usaha di RW 03.",
    explainSebelum:
      "Anda mendaftar untuk berjualan di RW 03. Siapkan data usaha (nama, jenis tempat, jam buka) dan penanggung jawab.",
    orangLabel: "orang",
  },
};

export function getVisitrw3FormProfile(jenis: JenisWarga): Visitrw3FormProfile {
  return VISITRW3_FORM_BY_JENIS[jenis];
}

/** Foto KK hanya diminta untuk ngontrak; wajib bila ada anak (pasti satu keluarga). */
export function aturanFotoKk(jenis: JenisWarga | "", jumlahAnak: number): "tidak" | "opsional" | "wajib" {
  if (jenis !== "kontrak") return "tidak";
  return jumlahAnak > 0 ? "wajib" : "opsional";
}
