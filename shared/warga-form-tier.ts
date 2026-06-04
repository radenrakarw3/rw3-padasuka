/**
 * SSOT form warga RW 03 — inti sensus (UN) + ILO / UNESCO / Washington Group / CRVS.
 */

import {
  hasKesulitanFungsional,
  needsLiterasi,
  needsCrvsDocuments,
  needsStatusAngkatanKerja,
  needsPekerjaanDetail,
  needsWgDomainDetail,
} from "@shared/warga-international";

export const PELAJAR_PEKERJAAN_KEYWORDS = ["pelajar", "mahasiswa"];

/** Skrining disabilitas — disederhanakan dari Washington Group Short Set. */
export const KESULITAN_AKTIVITAS_OPTIONS = [
  "Tidak ada kesulitan",
  "Kesulitan ringan atau sedang",
  "Kesulitan berat",
] as const;

export type KesulitanAktivitas = (typeof KESULITAN_AKTIVITAS_OPTIONS)[number];

export function mapDisabilitasToKesulitan(status: string | null | undefined): KesulitanAktivitas {
  if (!status || status === "Tidak Ada") return "Tidak ada kesulitan";
  if (status === "Disabilitas Ganda" || status.toLowerCase().includes("berat")) return "Kesulitan berat";
  return "Kesulitan ringan atau sedang";
}

export function mapKesulitanToDisabilitas(kesulitan: string): string {
  if (kesulitan === "Tidak ada kesulitan") return "Tidak Ada";
  if (kesulitan === "Kesulitan berat") return "Disabilitas Ganda";
  return "Disabilitas Fisik";
}

export const WARGA_FORM_STEPS = [
  {
    key: "pokok",
    title: "Data pokok",
    description: "Register kependudukan (inti sensus).",
    fields: [
      "kkId",
      "namaLengkap",
      "nik",
      "jenisKelamin",
      "tanggalLahir",
      "tempatLahir",
      "kedudukanKeluarga",
      "statusKependudukan",
    ],
  },
  {
    key: "kontak",
    title: "Kontak & aktivitas",
    description: "ILO, ISCED, UNESCO, Washington Group, CRVS.",
    fields: [
      "literasi",
      "pendidikan",
      "punyaAktaLahir",
      "punyaKia",
      "statusPekerjaan",
      "pekerjaan",
      "nomorWhatsapp",
      "wgKesulitanMelihat",
      "wgKesulitanBerjalan",
    ],
  },
] as const;

type TierStr = string | null | undefined;

export type WargaTierFormSlice = {
  kkId?: TierStr;
  namaLengkap?: TierStr;
  nik?: TierStr;
  jenisKelamin?: TierStr;
  tanggalLahir?: TierStr;
  tempatLahir?: TierStr;
  kedudukanKeluarga?: TierStr;
  statusPerkawinan?: TierStr;
  agama?: TierStr;
  kewarganegaraan?: TierStr;
  statusKependudukan?: TierStr;
  literasi?: TierStr;
  nomorWhatsapp?: TierStr;
  namaKontakDarurat?: TierStr;
  nomorKontakDarurat?: TierStr;
  pendidikan?: TierStr;
  statusPekerjaan?: TierStr;
  pekerjaan?: TierStr;
  punyaAktaLahir?: boolean | null;
  punyaKia?: boolean | null;
  statusDisabilitas?: TierStr;
  wgKesulitanMelihat?: TierStr;
  wgKesulitanBerjalan?: TierStr;
  kondisiKesehatan?: TierStr;
  sedangSekolah?: boolean | null;
  sedangKuliah?: boolean | null;
  punyaSim?: boolean | null;
  jenisSim?: TierStr;
  punyaUsaha?: boolean | null;
  namaUsaha?: TierStr;
  punyaBpjsKesehatan?: boolean | null;
  nomorBpjsKesehatan?: TierStr;
  punyaPenyakitKronis?: boolean | null;
  penyakitKronis?: TierStr;
  statusBansosIndividu?: TierStr;
  jenisBansosIndividu?: TierStr;
  aktifKegiatanRw?: boolean | null;
  bidangPartisipasi?: TierStr;
  punyaKendaraan?: boolean | null;
  jenisKendaraan?: TierStr;
  jumlahKendaraan?: TierStr;
  tanggalVerifikasiData?: TierStr;
};

export function getWargaAge(tanggalLahir: string | null | undefined): number | null {
  if (!tanggalLahir?.trim()) return null;
  const birth = new Date(`${tanggalLahir}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function isPelajarPekerjaan(pekerjaan: string | null | undefined): boolean {
  const job = (pekerjaan || "").toLowerCase().trim();
  return PELAJAR_PEKERJAAN_KEYWORDS.some((k) => job.includes(k));
}

export function isKepalaKeluarga(kedudukan: string | null | undefined): boolean {
  return kedudukan === "Kepala Keluarga";
}

export function needsWhatsapp(age: number | null): boolean {
  return age !== null && age >= 16;
}

export function showWhatsappField(age: number | null): boolean {
  return age === null || age >= 7;
}

export function needsPendidikan(age: number | null): boolean {
  return age !== null && age >= 5;
}

/** @deprecated Gunakan needsStatusAngkatanKerja + needsPekerjaanDetail */
export function needsPekerjaan(age: number | null): boolean {
  return needsStatusAngkatanKerja(age);
}

export function showIbuHamil(jenisKelamin: string | null | undefined, age: number | null): boolean {
  return jenisKelamin === "Perempuan" && age !== null && age >= 15 && age <= 49;
}

export function getRequiredFieldKeysForWarga(form: WargaTierFormSlice): string[] {
  const age = getWargaAge(form.tanggalLahir);
  const kesulitan = mapDisabilitasToKesulitan(form.statusDisabilitas);
  const keys = [
    "kkId",
    "namaLengkap",
    "nik",
    "jenisKelamin",
    "tanggalLahir",
    "tempatLahir",
    "kedudukanKeluarga",
    "statusKependudukan",
  ];

  if (needsLiterasi(age)) keys.push("literasi");
  if (needsPendidikan(age)) keys.push("pendidikan");
  if (needsCrvsDocuments(age)) keys.push("punyaAktaLahir", "punyaKia");
  if (needsStatusAngkatanKerja(age)) keys.push("statusPekerjaan");
  if (needsStatusAngkatanKerja(age) && needsPekerjaanDetail(form.statusPekerjaan)) keys.push("pekerjaan");
  if (needsWhatsapp(age)) keys.push("nomorWhatsapp");
  if (isKepalaKeluarga(form.kedudukanKeluarga)) {
    keys.push("namaKontakDarurat", "nomorKontakDarurat");
  }
  if (needsWgDomainDetail(kesulitan)) {
    keys.push("wgKesulitanMelihat", "wgKesulitanBerjalan");
  }

  return keys;
}

const WA_REGEX = /^(0|62)\d{8,15}$/;

export function validateWargaFormTier(form: WargaTierFormSlice): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  const age = getWargaAge(form.tanggalLahir);
  const kesulitan = mapDisabilitasToKesulitan(form.statusDisabilitas);

  if (!form.kkId) errors.kkId = "KK wajib dipilih";
  if (!form.namaLengkap?.trim()) errors.namaLengkap = "Nama lengkap wajib diisi";
  if (!/^\d{16}$/.test(form.nik || "")) errors.nik = "NIK harus 16 digit";
  if (!form.tempatLahir?.trim()) errors.tempatLahir = "Tempat lahir wajib diisi";
  if (!form.tanggalLahir) errors.tanggalLahir = "Tanggal lahir wajib diisi";
  else if (new Date(`${form.tanggalLahir}T00:00:00`).getTime() > Date.now()) {
    errors.tanggalLahir = "Tanggal lahir tidak boleh di masa depan";
  }

  if (needsLiterasi(age) && !form.literasi) errors.literasi = "Literasi wajib diisi";
  if (needsPendidikan(age) && !form.pendidikan) errors.pendidikan = "Pendidikan wajib diisi";
  if (needsStatusAngkatanKerja(age) && !form.statusPekerjaan) {
    errors.statusPekerjaan = "Status angkatan kerja wajib diisi";
  }
  if (needsStatusAngkatanKerja(age) && needsPekerjaanDetail(form.statusPekerjaan) && !form.pekerjaan) {
    errors.pekerjaan = "Pekerjaan wajib jika status bekerja";
  }

  if (needsWhatsapp(age)) {
    if (!form.nomorWhatsapp?.trim()) errors.nomorWhatsapp = "No. WhatsApp wajib untuk usia ≥16";
    else if (!WA_REGEX.test(form.nomorWhatsapp)) errors.nomorWhatsapp = "No. WhatsApp tidak valid";
  } else if (form.nomorWhatsapp?.trim() && !WA_REGEX.test(form.nomorWhatsapp)) {
    errors.nomorWhatsapp = "No. WhatsApp tidak valid";
  }

  if (isKepalaKeluarga(form.kedudukanKeluarga)) {
    if (!form.namaKontakDarurat?.trim()) errors.namaKontakDarurat = "Kontak darurat wajib untuk kepala keluarga";
    if (!form.nomorKontakDarurat?.trim()) errors.nomorKontakDarurat = "Nomor kontak darurat wajib";
    else if (!WA_REGEX.test(form.nomorKontakDarurat)) errors.nomorKontakDarurat = "Nomor kontak darurat tidak valid";
  }

  if (needsWgDomainDetail(kesulitan)) {
    if (!form.wgKesulitanMelihat) errors.wgKesulitanMelihat = "Wajib jika ada kesulitan aktivitas";
    if (!form.wgKesulitanBerjalan) errors.wgKesulitanBerjalan = "Wajib jika ada kesulitan aktivitas";
  }

  if (form.punyaSim && !form.jenisSim) errors.jenisSim = "Jenis SIM wajib dipilih";
  if (form.punyaUsaha && !form.namaUsaha?.trim()) errors.namaUsaha = "Nama usaha wajib diisi";
  if (form.punyaBpjsKesehatan && form.nomorBpjsKesehatan?.trim() && !/^\d+$/.test(form.nomorBpjsKesehatan.replace(/\s/g, ""))) {
    errors.nomorBpjsKesehatan = "Nomor BPJS tidak valid";
  }
  if (form.punyaPenyakitKronis && !form.penyakitKronis?.trim()) errors.penyakitKronis = "Penyakit kronis wajib diisi";
  if (form.statusBansosIndividu === "Penerima" && !form.jenisBansosIndividu) {
    errors.jenisBansosIndividu = "Jenis bansos wajib dipilih";
  }
  if (form.aktifKegiatanRw && !form.bidangPartisipasi) errors.bidangPartisipasi = "Bidang partisipasi wajib dipilih";
  if (form.punyaKendaraan) {
    if (!form.jenisKendaraan) errors.jenisKendaraan = "Jenis kendaraan wajib dipilih";
    if (!form.jumlahKendaraan) errors.jumlahKendaraan = "Jumlah kendaraan wajib diisi";
    else if (Number(form.jumlahKendaraan) < 0) errors.jumlahKendaraan = "Jumlah kendaraan tidak boleh negatif";
  }
  if (form.tanggalVerifikasiData && new Date(`${form.tanggalVerifikasiData}T00:00:00`).getTime() > Date.now()) {
    errors.tanggalVerifikasiData = "Tanggal verifikasi tidak boleh di masa depan";
  }

  return errors;
}

export function applyDerivedWargaFields<T extends WargaTierFormSlice & { lansia?: boolean }>(
  form: T,
): T & { lansia: boolean } {
  const age = getWargaAge(form.tanggalLahir);
  return {
    ...form,
    lansia: age !== null && age >= 60,
  };
}

export {
  needsLiterasi,
  needsCrvsDocuments,
  needsStatusAngkatanKerja,
  needsPekerjaanDetail,
  hasKesulitanFungsional,
  needsWgDomainDetail,
} from "@shared/warga-international";
