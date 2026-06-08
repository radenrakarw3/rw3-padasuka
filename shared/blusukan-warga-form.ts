/**
 * SSOT form warga Blusukan RW — disederhanakan untuk sensus lapangan RW 03.
 */

import {
  applyKategoriUmurDefaults,
  isPekerjaanSalahUntukKategori,
  pekerjaanWajibUntukKategori,
  resolveKategoriUmur,
} from "@shared/kategori-umur";
import { getWargaAge, needsWhatsapp, showWhatsappField } from "@shared/warga-form-tier";
import { inferStatusPekerjaanFromLegacyPekerjaan } from "@shared/pekerjaan-labor";
import { needsPekerjaanDetail, needsStatusAngkatanKerja } from "@shared/warga-international";
import type { Warga } from "@shared/schema";

const WA_REGEX = /^(0|62)\d{8,15}$/;

export type BlusukanWargaFormValues = {
  kkId: string;
  namaLengkap: string;
  nik: string;
  jenisKelamin: string;
  kedudukanKeluarga: string;
  statusPerkawinan: string;
  agama: string;
  tempatLahir: string;
  tanggalLahir: string;
  nomorWhatsapp: string;
  punyaAktaLahir: boolean;
  noAktaLahir: string;
  tanggalTerbitAktaLahir: string;
  tempatTerbitAktaLahir: string;
  namaIbuAktaLahir: string;
  namaAyahAktaLahir: string;
  punyaKia: boolean;
  sedangSekolah: boolean;
  jenjangSekolah: string;
  namaSekolah: string;
  kelas: string;
  sedangKuliah: boolean;
  namaKampus: string;
  semester: string;
  jurusan: string;
  statusPekerjaan: string;
  pekerjaan: string;
  namaTempatKerja: string;
  alamatTempatKerja: string;
  punyaUsahaLuarRw3: boolean;
  namaUsahaLuarRw3: string;
  punyaPenyakitKronis: boolean;
  penyakitKronis: string;
  statusBansosIndividu: string;
  jenisBansosIndividu: string;
  statusVerifikasiData: string;
  tanggalVerifikasiData: string;
  catatanVerifikasi: string;
};

export const defaultBlusukanWargaForm: BlusukanWargaFormValues = {
  kkId: "",
  namaLengkap: "",
  nik: "",
  jenisKelamin: "Laki-laki",
  kedudukanKeluarga: "Anak",
  statusPerkawinan: "Belum Kawin",
  agama: "Islam",
  tempatLahir: "",
  tanggalLahir: "",
  nomorWhatsapp: "",
  punyaAktaLahir: false,
  noAktaLahir: "",
  tanggalTerbitAktaLahir: "",
  tempatTerbitAktaLahir: "",
  namaIbuAktaLahir: "",
  namaAyahAktaLahir: "",
  punyaKia: false,
  sedangSekolah: false,
  jenjangSekolah: "",
  namaSekolah: "",
  kelas: "",
  sedangKuliah: false,
  namaKampus: "",
  semester: "",
  jurusan: "",
  statusPekerjaan: "",
  pekerjaan: "",
  namaTempatKerja: "",
  alamatTempatKerja: "",
  punyaUsahaLuarRw3: false,
  namaUsahaLuarRw3: "",
  punyaPenyakitKronis: false,
  penyakitKronis: "",
  statusBansosIndividu: "Bukan Penerima",
  jenisBansosIndividu: "",
  statusVerifikasiData: "Belum Diverifikasi",
  tanggalVerifikasiData: "",
  catatanVerifikasi: "",
};

export function mapWargaToBlusukanForm(w: Warga): BlusukanWargaFormValues {
  return {
    kkId: String(w.kkId),
    namaLengkap: w.namaLengkap || "",
    nik: w.nik || "",
    jenisKelamin: w.jenisKelamin || "Laki-laki",
    kedudukanKeluarga: w.kedudukanKeluarga || "Anak",
    statusPerkawinan: w.statusPerkawinan || "Belum Kawin",
    agama: w.agama || "Islam",
    tempatLahir: w.tempatLahir || "",
    tanggalLahir: w.tanggalLahir || "",
    nomorWhatsapp: w.nomorWhatsapp || "",
    punyaAktaLahir: w.punyaAktaLahir || false,
    noAktaLahir: w.noAktaLahir || "",
    tanggalTerbitAktaLahir: w.tanggalTerbitAktaLahir || "",
    tempatTerbitAktaLahir: w.tempatTerbitAktaLahir || "",
    namaIbuAktaLahir: w.namaIbuAktaLahir || "",
    namaAyahAktaLahir: w.namaAyahAktaLahir || "",
    punyaKia: w.punyaKia || false,
    sedangSekolah: w.sedangSekolah || false,
    jenjangSekolah: w.jenjangSekolah || "",
    namaSekolah: w.namaSekolah || "",
    kelas: w.kelas || "",
    sedangKuliah: w.sedangKuliah || false,
    namaKampus: w.namaKampus || "",
    semester: w.semester || "",
    jurusan: w.jurusan || "",
    statusPekerjaan:
      w.statusPekerjaan?.trim() ||
      inferStatusPekerjaanFromLegacyPekerjaan(w.pekerjaan) ||
      "",
    pekerjaan: w.pekerjaan || "",
    namaTempatKerja: w.namaTempatKerja || "",
    alamatTempatKerja: w.alamatTempatKerja || "",
    punyaUsahaLuarRw3: w.punyaUsahaLuarRw3 || false,
    namaUsahaLuarRw3: w.namaUsahaLuarRw3 || "",
    punyaPenyakitKronis: w.punyaPenyakitKronis || false,
    penyakitKronis: w.penyakitKronis || "",
    statusBansosIndividu: w.statusBansosIndividu || "Bukan Penerima",
    jenisBansosIndividu: w.jenisBansosIndividu || "",
    statusVerifikasiData: w.statusVerifikasiData || "Belum Diverifikasi",
    tanggalVerifikasiData: w.tanggalVerifikasiData || "",
    catatanVerifikasi: w.catatanVerifikasi || "",
  };
}

export function applyBlusukanKategoriDefaults(
  form: BlusukanWargaFormValues,
): BlusukanWargaFormValues {
  const kategoriId = resolveKategoriUmur(form.tanggalLahir);
  const defaults = applyKategoriUmurDefaults(kategoriId, form);
  return {
    ...form,
    ...(defaults.pekerjaan ? { pekerjaan: defaults.pekerjaan } : {}),
  };
}

export function toBlusukanWargaPayload(form: BlusukanWargaFormValues) {
  const age = getWargaAge(form.tanggalLahir);
  const kategoriUmur = resolveKategoriUmur(form.tanggalLahir);
  const withDefaults = applyBlusukanKategoriDefaults(form);
  const lansia = age !== null && age >= 60;
  const pekerjaanWajib = pekerjaanWajibUntukKategori(kategoriUmur);
  const pekerjaan =
    needsPekerjaanDetail(withDefaults.statusPekerjaan)
      ? withDefaults.pekerjaan || null
      : pekerjaanWajib
        ? withDefaults.pekerjaan || pekerjaanWajib
        : withDefaults.pekerjaan || null;

  return {
    kkId: parseInt(form.kkId, 10),
    namaLengkap: form.namaLengkap,
    nik: form.nik,
    jenisKelamin: form.jenisKelamin,
    kedudukanKeluarga: form.kedudukanKeluarga,
    statusPerkawinan: form.statusPerkawinan,
    agama: form.agama,
    tempatLahir: form.tempatLahir || null,
    tanggalLahir: form.tanggalLahir || null,
    nomorWhatsapp: form.nomorWhatsapp || null,
    statusKependudukan: "Aktif",
    punyaAktaLahir: form.punyaAktaLahir,
    noAktaLahir: form.punyaAktaLahir ? form.noAktaLahir || null : null,
    tanggalTerbitAktaLahir: form.punyaAktaLahir ? form.tanggalTerbitAktaLahir || null : null,
    tempatTerbitAktaLahir: form.punyaAktaLahir ? form.tempatTerbitAktaLahir || null : null,
    namaIbuAktaLahir: form.punyaAktaLahir ? form.namaIbuAktaLahir || null : null,
    namaAyahAktaLahir: form.punyaAktaLahir ? form.namaAyahAktaLahir || null : null,
    punyaKia: form.punyaKia,
    sedangSekolah: form.sedangSekolah,
    jenjangSekolah: form.sedangSekolah ? form.jenjangSekolah || null : null,
    namaSekolah: form.sedangSekolah ? form.namaSekolah || null : null,
    kelas: form.sedangSekolah ? form.kelas || null : null,
    jurusan: form.sedangSekolah ? form.jurusan || null : null,
    sedangKuliah: form.sedangKuliah,
    namaKampus: form.sedangKuliah ? form.namaKampus || null : null,
    semester: form.sedangKuliah ? form.semester || null : null,
    kategoriUmur,
    statusPekerjaan: withDefaults.statusPekerjaan || null,
    pekerjaan,
    namaTempatKerja: needsPekerjaanDetail(withDefaults.statusPekerjaan)
      ? withDefaults.namaTempatKerja || null
      : null,
    alamatTempatKerja: needsPekerjaanDetail(withDefaults.statusPekerjaan)
      ? withDefaults.alamatTempatKerja || null
      : null,
    punyaUsahaLuarRw3: form.punyaUsahaLuarRw3,
    namaUsahaLuarRw3: form.punyaUsahaLuarRw3 ? form.namaUsahaLuarRw3 || null : null,
    punyaPenyakitKronis: form.punyaPenyakitKronis,
    penyakitKronis: form.punyaPenyakitKronis ? form.penyakitKronis || null : null,
    statusBansosIndividu: form.statusBansosIndividu || null,
    jenisBansosIndividu: form.statusBansosIndividu === "Penerima" ? form.jenisBansosIndividu || null : null,
    lansia,
    statusVerifikasiData: form.statusVerifikasiData,
    tanggalVerifikasiData: form.tanggalVerifikasiData || null,
    catatanVerifikasi: form.catatanVerifikasi || null,
  };
}

export type BlusukanWargaFormErrors = Partial<Record<keyof BlusukanWargaFormValues, string>>;

export function validateBlusukanWargaForm(form: BlusukanWargaFormValues): BlusukanWargaFormErrors {
  const errors: BlusukanWargaFormErrors = {};
  const age = getWargaAge(form.tanggalLahir);

  if (!form.kkId) errors.kkId = "KK wajib dipilih";
  if (!form.namaLengkap.trim()) errors.namaLengkap = "Nama lengkap wajib diisi";
  if (!/^\d{16}$/.test(form.nik)) errors.nik = "NIK harus 16 digit";
  if (!form.tempatLahir.trim()) errors.tempatLahir = "Tempat lahir wajib diisi";
  if (!form.tanggalLahir) errors.tanggalLahir = "Tanggal lahir wajib diisi";
  else if (new Date(`${form.tanggalLahir}T00:00:00`).getTime() > Date.now()) {
    errors.tanggalLahir = "Tanggal lahir tidak boleh di masa depan";
  }

  if (showWhatsappField(age)) {
    if (needsWhatsapp(age)) {
      if (!form.nomorWhatsapp.trim()) errors.nomorWhatsapp = "No. WhatsApp wajib untuk usia ≥16";
      else if (!WA_REGEX.test(form.nomorWhatsapp)) errors.nomorWhatsapp = "No. WhatsApp tidak valid";
    } else if (form.nomorWhatsapp.trim() && !WA_REGEX.test(form.nomorWhatsapp)) {
      errors.nomorWhatsapp = "No. WhatsApp tidak valid";
    }
  }

  if (form.punyaAktaLahir) {
    if (!form.noAktaLahir.trim()) errors.noAktaLahir = "Nomor akta kelahiran wajib diisi";
    if (!form.tanggalTerbitAktaLahir) errors.tanggalTerbitAktaLahir = "Tanggal terbit akta wajib diisi";
    if (!form.tempatTerbitAktaLahir.trim()) errors.tempatTerbitAktaLahir = "Tempat terbit akta wajib diisi";
    if (!form.namaIbuAktaLahir.trim()) errors.namaIbuAktaLahir = "Nama ibu (sesuai akta) wajib diisi";
  }

  if (form.sedangSekolah) {
    if (!form.jenjangSekolah) errors.jenjangSekolah = "Jenjang sekolah wajib dipilih";
    if (!form.namaSekolah.trim()) errors.namaSekolah = "Nama sekolah wajib diisi";
  }
  if (form.sedangKuliah) {
    if (!form.namaKampus.trim()) errors.namaKampus = "Nama kampus wajib diisi";
    if (!form.semester) errors.semester = "Semester wajib dipilih";
  }

  const kategoriUmur = resolveKategoriUmur(form.tanggalLahir);
  const pekerjaanWajib = pekerjaanWajibUntukKategori(kategoriUmur);

  if (needsStatusAngkatanKerja(age)) {
    if (!form.statusPekerjaan) errors.statusPekerjaan = "Status pekerjaan wajib diisi";
    if (needsPekerjaanDetail(form.statusPekerjaan)) {
      if (!form.pekerjaan) errors.pekerjaan = "Pekerjaan wajib diisi";
      if (!form.namaTempatKerja.trim()) errors.namaTempatKerja = "Nama tempat kerja wajib diisi";
      if (!form.alamatTempatKerja.trim()) errors.alamatTempatKerja = "Alamat tempat kerja wajib diisi";
    }
  }

  if (pekerjaanWajib) {
    if (!form.pekerjaan?.trim()) {
      errors.pekerjaan = `Pekerjaan wajib: ${pekerjaanWajib}`;
    } else if (isPekerjaanSalahUntukKategori(form.pekerjaan, kategoriUmur)) {
      errors.pekerjaan = `Usia ini wajib pekerjaan «${pekerjaanWajib}»`;
    }
  }

  if (form.punyaUsahaLuarRw3 && !form.namaUsahaLuarRw3.trim()) {
    errors.namaUsahaLuarRw3 = "Nama usaha di luar RW 03 wajib diisi";
  }

  if (form.punyaPenyakitKronis && !form.penyakitKronis.trim()) {
    errors.penyakitKronis = "Sebutkan penyakit kronis";
  }

  if (!form.statusBansosIndividu) {
    errors.statusBansosIndividu = "Status bansos wajib diisi";
  } else if (form.statusBansosIndividu === "Penerima" && !form.jenisBansosIndividu) {
    errors.jenisBansosIndividu = "Jenis bansos wajib dipilih";
  }

  return errors;
}

export function getBlusukanRequiredFieldKeys(form: BlusukanWargaFormValues): string[] {
  const age = getWargaAge(form.tanggalLahir);
  const keys = [
    "namaLengkap",
    "nik",
    "jenisKelamin",
    "tanggalLahir",
    "tempatLahir",
    "kedudukanKeluarga",
    "punyaAktaLahir",
    "punyaPenyakitKronis",
    "statusBansosIndividu",
  ];
  if (needsWhatsapp(age)) keys.push("nomorWhatsapp");
  const kategoriUmur = resolveKategoriUmur(form.tanggalLahir);
  const pekerjaanWajib = pekerjaanWajibUntukKategori(kategoriUmur);
  if (pekerjaanWajib) keys.push("pekerjaan");
  if (needsStatusAngkatanKerja(age)) {
    keys.push("statusPekerjaan");
    if (needsPekerjaanDetail(form.statusPekerjaan)) {
      keys.push("pekerjaan", "namaTempatKerja", "alamatTempatKerja");
    }
  }
  if (form.punyaAktaLahir) {
    keys.push("noAktaLahir", "tanggalTerbitAktaLahir", "tempatTerbitAktaLahir", "namaIbuAktaLahir");
  }
  if (form.sedangSekolah) keys.push("jenjangSekolah", "namaSekolah");
  if (form.sedangKuliah) keys.push("namaKampus", "semester");
  if (form.punyaUsahaLuarRw3) keys.push("namaUsahaLuarRw3");
  if (form.punyaPenyakitKronis) keys.push("penyakitKronis");
  if (form.statusBansosIndividu === "Penerima") keys.push("jenisBansosIndividu");
  return keys;
}

export { getWargaAge, needsWhatsapp, showWhatsappField };
