import { visitrw3JenjangAnakOptions } from "./constants";
import type { KeperluanPengajuanMode } from "./visitrw3-properti";
import { validateKendaraanRow, type KendaraanRow } from "./visitrw3-kendaraan";
import { validateDetailKeperluan, type DetailKeperluan } from "@shared/visitrw3-keperluan";
import { buildKategoriUsahaPayload } from "@shared/visitrw3-kategori-usaha";
import { isNomorHpValid } from "@shared/kontak";

export type PenghuniDraft = {
  namaLengkap: string;
  tanggalLahir: string;
  isAnak: boolean;
  nik: string;
  nomorWhatsapp: string;
  jenisKelamin: string;
  pekerjaan: string;
  keperluanTinggal: string;
  detailKeperluan: DetailKeperluan;
  namaTempatKerja: string;
  namaSekolah: string;
  /** Jawaban wajib: "" = belum dijawab. */
  punyaKendaraan: "" | "ya" | "tidak";
  kendaraanList: KendaraanRow[];
  fotoKtpPath: string;
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateKategoriUsaha(selected: string[], lainnya: string): string | null {
  const payload = buildKategoriUsahaPayload(selected, lainnya);
  if (payload.length === 0) return "Pilih minimal 1 kategori usaha";
  if (payload.length > 12) return "Maksimal 12 kategori usaha";
  if (selected.includes("Lainnya") && !lainnya.trim()) {
    return "Jelaskan kategori usaha lainnya";
  }
  return null;
}

function umur(tgl: string) {
  if (!tgl) return 99;
  const b = new Date(`${tgl}T00:00:00`);
  const today = new Date();
  let a = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) a--;
  return a;
}

export function validateStepKeperluan(keperluan: string) {
  if (!keperluan) return "Pilih keperluan pengajuan (tinggal atau bisnis)";
  return null;
}

export type BisnisLokasiInput = {
  tinggalDiWilayahRw3: boolean | null;
  rt: string;
  pemilikKostId: string;
  namaUsaha: string;
  jenisTempatUsaha: string;
  jenisTempatUsahaLain: string;
  kategoriUsaha: string[];
  kategoriUsahaLain: string;
  penanggungJawab: string;
  jamBuka: string;
  jamTutup: string;
  alamatUsaha: string;
  pjNik: string;
  pjNomorWhatsapp: string;
  pjTanggalLahir: string;
  pjFotoKtpPath: string;
};

export function validateStepLokasi(
  rt: string,
  pemilikKostId: string,
  keperluan: string,
  namaUsaha: string,
  jenisUsaha: string,
  penanggungJawab: string,
) {
  if (!rt) return "Pilih RT";
  if (keperluan !== "bisnis" && !pemilikKostId) return "Pilih kost/kontrakan";
  if (keperluan === "bisnis") {
    return validateStepLokasiBisnis({
      tinggalDiWilayahRw3: null,
      rt,
      pemilikKostId,
      namaUsaha,
      jenisTempatUsaha: jenisUsaha,
      jenisTempatUsahaLain: "",
      kategoriUsaha: [],
      kategoriUsahaLain: "",
      penanggungJawab,
      jamBuka: "",
      jamTutup: "",
      alamatUsaha: "",
      pjNik: "",
      pjNomorWhatsapp: "",
      pjTanggalLahir: "",
      pjFotoKtpPath: "",
    });
  }
  return null;
}

export function validateStepLokasiBisnis(
  input: BisnisLokasiInput,
  mode: KeperluanPengajuanMode = "",
): string | null {
  const usahaRumahan = mode === "usaha_rumahan";
  if (input.tinggalDiWilayahRw3 === null) {
    return "Pilih apakah Anda tinggal di wilayah RW 03 atau di luar wilayah RW 03";
  }
  if (!input.rt) return "Pilih RT lokasi usaha";
  if (!input.namaUsaha.trim()) return "Nama usaha wajib diisi";
  if (!input.penanggungJawab.trim()) return "Penanggung jawab wajib diisi";
  const kategoriErr = validateKategoriUsaha(input.kategoriUsaha, input.kategoriUsahaLain);
  if (kategoriErr) return kategoriErr;
  if (!usahaRumahan) {
    if (!input.jenisTempatUsaha) return "Pilih jenis tempat usaha (lapak, kiosk, atau lainnya)";
    if (input.jenisTempatUsaha === "lainnya" && !input.jenisTempatUsahaLain.trim()) {
      return "Jelaskan jenis usaha lainnya";
    }
  }
  if (input.tinggalDiWilayahRw3) {
    if (!input.pemilikKostId) {
      return usahaRumahan
        ? "Pilih usaha rumahan yang sudah didaftarkan"
        : "Pilih kost/kontrakan tempat tinggal di wilayah RW 03";
    }
  } else {
    if (!input.jamBuka.trim() || !TIME_REGEX.test(input.jamBuka)) {
      return "Jam buka wajib diisi (format 24 jam, contoh 08:00)";
    }
    if (!input.jamTutup.trim() || !TIME_REGEX.test(input.jamTutup)) {
      return "Jam tutup wajib diisi (format 24 jam, contoh 21:00)";
    }
    if (!input.alamatUsaha.trim()) return "Alamat usaha wajib diisi";
    if (!input.pjNik || input.pjNik.length !== 16) return "NIK penanggung jawab 16 digit wajib";
    if (!input.pjNomorWhatsapp.trim()) return "WhatsApp penanggung jawab wajib";
    if (!input.pjTanggalLahir) return "Tanggal lahir penanggung jawab wajib";
    if (!input.pjFotoKtpPath) return "Foto KTP penanggung jawab wajib diunggah";
  }
  return null;
}

export function validateStepJumlah(jumlahDewasa: number) {
  if (jumlahDewasa < 1) return "Minimal 1 penghuni dewasa";
  return null;
}

export type ValidatePenghuniOptions = {
  /** tinggal = kontrak/kost; bisnis = jualan */
  keperluan: "tinggal" | "bisnis";
  requireKeperluanTinggal?: boolean;
  requirePekerjaan?: boolean;
  requireTempatKerja?: boolean;
  tempatKerjaLabel?: string;
  /** RW3BIZ: kendaraan dicatat per usaha, bukan per orang; sekolah tidak ditanyakan. */
  dataUsaha?: boolean;
  /** RW3BIZ pegawai biasa: WhatsApp & foto KTP boleh kosong. */
  pegawaiRingan?: boolean;
};

export function validateSinglePenghuni(
  p: PenghuniDraft,
  keperluanOrOpts: "tinggal" | "bisnis" | ValidatePenghuniOptions,
): string | null {
  const opts: ValidatePenghuniOptions =
    typeof keperluanOrOpts === "string"
      ? {
          keperluan: keperluanOrOpts,
          requireKeperluanTinggal: keperluanOrOpts === "tinggal",
          requireTempatKerja: true,
        }
      : keperluanOrOpts;
  const requireKeperluan =
    opts.requireKeperluanTinggal ?? opts.keperluan === "tinggal";
  const requirePekerjaan =
    opts.requirePekerjaan ?? opts.keperluan !== "bisnis";
  const requireTempat = opts.requireTempatKerja !== false;
  const tempatLabel = opts.tempatKerjaLabel ?? "tempat kerja";

  if (p.namaLengkap.trim().length < 2) return "Isi nama lengkap (minimal 2 huruf)";
  if (!p.tanggalLahir) return "Pilih tanggal lahir";
  const usia = umur(p.tanggalLahir);
  if (Number.isNaN(usia) || usia < 0 || usia > 120) return "Tanggal lahir tidak valid";

  if (p.isAnak) {
    if (!p.namaSekolah.trim()) return "Pilih jenjang pendidikan anak";
    if (!(visitrw3JenjangAnakOptions as readonly string[]).includes(p.namaSekolah)) {
      return "Pilih jenjang pendidikan yang valid";
    }
    return null;
  }

  if (!p.nik || p.nik.length !== 16) return "NIK harus 16 digit";
  if (!p.nomorWhatsapp.trim()) {
    if (!opts.pegawaiRingan) return "Isi nomor WhatsApp";
  } else if (!isNomorHpValid(p.nomorWhatsapp)) {
    return "Nomor WhatsApp tidak valid (contoh 081234567890)";
  }
  if (!p.jenisKelamin) return "Pilih jenis kelamin";
  if (requirePekerjaan && !p.pekerjaan) return "Pilih pekerjaan";
  if (requireKeperluan) {
    if (!p.keperluanTinggal) return "Pilih keperluan tinggal";
    const errKeperluan = validateDetailKeperluan(p.keperluanTinggal, p.namaTempatKerja, p.detailKeperluan);
    if (errKeperluan) return errKeperluan;
  } else if (requireTempat && !p.namaTempatKerja.trim()) {
    return `Isi ${tempatLabel.toLowerCase()}`;
  }
  if (opts.dataUsaha) {
    if (!p.fotoKtpPath && !opts.pegawaiRingan) return "Unggah foto KTP";
    return null;
  }

  const u = umur(p.tanggalLahir);
  if (u < 21 && !p.namaSekolah.trim()) return "Isi nama sekolah (usia di bawah 21 tahun)";

  if (!p.punyaKendaraan) return "Jawab dulu: punya kendaraan atau tidak";
  if (p.punyaKendaraan === "ya") {
    if (p.kendaraanList.length === 0) return "Isi minimal satu kendaraan";
    for (let ki = 0; ki < p.kendaraanList.length; ki++) {
      const err = validateKendaraanRow(p.kendaraanList[ki], ki + 1);
      if (err) return err;
    }
  }
  if (!p.fotoKtpPath) return "Unggah foto KTP";
  return null;
}

export function validatePenghuniList(
  penghuni: PenghuniDraft[],
  keperluanOrOpts: "tinggal" | "bisnis" | ValidatePenghuniOptions,
): string | null {
  for (let i = 0; i < penghuni.length; i++) {
    const err = validateSinglePenghuni(penghuni[i], keperluanOrOpts);
    if (err) {
      const p = penghuni[i];
      const who = p.namaLengkap.trim() || (p.isAnak ? `Anak ${i + 1}` : `Dewasa ${i + 1}`);
      return `${who}: ${err}`;
    }
  }
  return null;
}

export function validateLokasiSubTinggal(sub: "rt" | "kost", rt: string, pemilikKostId: string): string | null {
  if (sub === "rt" && !rt) return "Pilih RT tempat tinggal";
  if (sub === "kost" && !pemilikKostId) return "Pilih kost atau kontrakan";
  return null;
}

export function validateLokasiSubBisnis(
  sub: "wilayah" | "usaha" | "operasional" | "pj" | "rt" | "kost" | "prop",
  input: BisnisLokasiInput,
  mode: KeperluanPengajuanMode = "",
): string | null {
  const usahaRumahan = mode === "usaha_rumahan";
  if (sub === "wilayah" && input.tinggalDiWilayahRw3 === null) {
    return "Pilih apakah Anda tinggal di wilayah RW 03";
  }
  if (sub === "usaha") {
    if (!input.namaUsaha.trim()) return "Isi nama usaha";
    if (!input.penanggungJawab.trim()) return "Isi nama penanggung jawab";
    const kategoriErr = validateKategoriUsaha(input.kategoriUsaha, input.kategoriUsahaLain);
    if (kategoriErr) return kategoriErr;
    if (!usahaRumahan) {
      if (!input.jenisTempatUsaha) return "Pilih jenis tempat usaha";
      if (input.jenisTempatUsaha === "lainnya" && !input.jenisTempatUsahaLain.trim()) {
        return "Jelaskan jenis usaha Anda";
      }
    }
    return null;
  }
  if (sub === "operasional") {
    if (!input.jamBuka.trim() || !TIME_REGEX.test(input.jamBuka)) return "Isi jam buka (format 24 jam, contoh 08:00)";
    if (!input.jamTutup.trim() || !TIME_REGEX.test(input.jamTutup)) return "Isi jam tutup (format 24 jam, contoh 21:00)";
    if (!input.alamatUsaha.trim()) return "Isi alamat usaha di RW 03";
    return null;
  }
  if (sub === "pj") {
    if (!input.pjNik || input.pjNik.length !== 16) return "NIK penanggung jawab harus 16 digit";
    if (!input.pjNomorWhatsapp.trim()) return "Isi WhatsApp penanggung jawab";
    if (!input.pjTanggalLahir) return "Pilih tanggal lahir penanggung jawab";
    if (!input.pjFotoKtpPath) return "Unggah foto KTP penanggung jawab";
    return null;
  }
  if (sub === "rt" && !input.rt) return "Pilih RT lokasi usaha";
  if (sub === "prop" && !input.pemilikKostId) {
    return "Verifikasi nomor PROP usaha rumahan Anda terlebih dahulu";
  }
  if (sub === "kost" && !input.pemilikKostId) {
    return usahaRumahan
      ? "Pilih usaha rumahan yang sudah didaftarkan"
      : "Pilih kost/kontrakan tempat tinggal";
  }
  return null;
}

export function validateStepSyarat(setuju: boolean) {
  if (!setuju) return "Anda harus menyetujui syarat dan tata tertib";
  return null;
}

export function validateLokasiWargaSinggah(input: {
  rt: string;
  alamat: string;
  jenisWarga: string;
  nomorUnit?: string;
  ukuranTinggal?: string;
}): string | null {
  if (!input.rt) return "Pilih RT";
  if (!input.alamat.trim() || input.alamat.trim().length < 5) {
    return input.jenisWarga === "jualan"
      ? "Alamat lokasi usaha minimal 5 karakter"
      : input.jenisWarga === "kost"
        ? "Alamat kost minimal 5 karakter"
        : "Alamat kontrakan minimal 5 karakter";
  }
  if (input.jenisWarga === "kost" && !input.nomorUnit?.trim()) {
    return "Nomor kamar/unit wajib diisi";
  }
  if ((input.jenisWarga === "kost" || input.jenisWarga === "kontrak") && !input.ukuranTinggal) {
    return input.jenisWarga === "kost" ? "Pilih ukuran kamar kost" : "Pilih jumlah kamar tidur kontrakan";
  }
  return null;
}

export function validateJumlahByJenis(
  jumlahDewasa: number,
  jumlahAnak: number,
  profile: { maxDewasa: number; maxAnak: number; maxTotal: number; showAnak: boolean },
): string | null {
  if (jumlahDewasa < 1) return "Minimal 1 orang dewasa";
  if (jumlahDewasa > profile.maxDewasa) {
    return `Maksimal ${profile.maxDewasa} orang dewasa untuk jenis ini`;
  }
  if (!profile.showAnak && jumlahAnak > 0) {
    return "Jenis ngekost tidak mencatat anak — gunakan ngontrak jika keluarga";
  }
  if (jumlahAnak > profile.maxAnak) {
    return `Maksimal ${profile.maxAnak} anak untuk jenis ini`;
  }
  if (jumlahDewasa + jumlahAnak > profile.maxTotal) {
    return `Total maksimal ${profile.maxTotal} orang untuk jenis ini`;
  }
  return null;
}

export function validateJualanFields(input: {
  namaUsaha: string;
  jenisTempatUsaha: string;
  jenisTempatUsahaLain: string;
  kategoriUsaha: string[];
  kategoriUsahaLain: string;
  penanggungJawab: string;
  jamBuka?: string;
  jamTutup?: string;
  alamatUsaha?: string;
  requireJamOperasional?: boolean;
}): string | null {
  if (!input.namaUsaha.trim()) return "Nama usaha wajib diisi";
  if (!input.penanggungJawab.trim()) return "Penanggung jawab wajib diisi";
  const kategoriErr = validateKategoriUsaha(input.kategoriUsaha, input.kategoriUsahaLain);
  if (kategoriErr) return kategoriErr;
  if (!input.jenisTempatUsaha) return "Pilih jenis tempat usaha (lapak, kiosk, atau lainnya)";
  if (input.jenisTempatUsaha === "lainnya" && !input.jenisTempatUsahaLain.trim()) {
    return "Jelaskan jenis usaha lainnya";
  }
  const requireJam = input.requireJamOperasional !== false;
  if (requireJam) {
    if (!input.jamBuka?.trim() || !TIME_REGEX.test(input.jamBuka)) {
      return "Jam buka wajib diisi (format 24 jam, contoh 08:00)";
    }
    if (!input.jamTutup?.trim() || !TIME_REGEX.test(input.jamTutup)) {
      return "Jam tutup wajib diisi (format 24 jam, contoh 21:00)";
    }
  } else {
    if (input.jamBuka?.trim() && !TIME_REGEX.test(input.jamBuka)) {
      return "Jam buka tidak valid (format 24 jam, contoh 08:00)";
    }
    if (input.jamTutup?.trim() && !TIME_REGEX.test(input.jamTutup)) {
      return "Jam tutup tidak valid (format 24 jam, contoh 21:00)";
    }
  }
  return null;
}

export function validateStepBayar(
  tanggalBayar: string,
  terminBulan: string,
  _nomorUnit?: string,
  _catatan?: string,
  _keperluan?: string,
  setujuTataTertib?: boolean,
) {
  if (!setujuTataTertib) return "Lengkapi langkah syarat terlebih dahulu";
  if (!tanggalBayar || !/^\d{4}-\d{2}-\d{2}$/.test(tanggalBayar)) return "Tanggal bayar wajib diisi";
  if (!terminBulan) return "Termin pembayaran wajib dipilih";
  return null;
}
