/**
 * SSOT: bagian form Data Warga + agregasi dashboard kependudukan.
 * Selaras shared/warga-form-tier.ts & shared/warga-international.ts.
 */

import {
  getWargaAge,
  isKepalaKeluarga,
  mapDisabilitasToKesulitan,
  needsPendidikan,
  needsWhatsapp,
} from "@shared/warga-form-tier";
import {
  needsLiterasi,
  needsCrvsDocuments,
  needsStatusAngkatanKerja,
  needsPekerjaanDetail,
  needsWgDomainDetail,
} from "@shared/warga-international";

export type WargaAnalyticsSlice = {
  tanggalLahir?: string | null;
  statusPekerjaan?: string | null;
  statusDisabilitas?: string | null;
  kedudukanKeluarga?: string | null;
};

/** Populasi yang relevan per field (sesuai form internasional). */
export function isWargaEligibleForAnalyticsField(
  w: WargaAnalyticsSlice,
  field: string,
): boolean {
  const age = getWargaAge(w.tanggalLahir);
  switch (field) {
    case "literasi":
      return needsLiterasi(age);
    case "pendidikan":
      return needsPendidikan(age);
    case "punyaAktaLahir":
    case "punyaKia":
      return needsCrvsDocuments(age);
    case "statusPekerjaan":
      return needsStatusAngkatanKerja(age);
    case "pekerjaan":
      return needsStatusAngkatanKerja(age) && needsPekerjaanDetail(w.statusPekerjaan);
    case "nomorWhatsapp":
      return needsWhatsapp(age);
    case "namaKontakDarurat":
    case "nomorKontakDarurat":
      return isKepalaKeluarga(w.kedudukanKeluarga);
    case "wgKesulitanMelihat":
    case "wgKesulitanBerjalan":
      return needsWgDomainDetail(mapDisabilitasToKesulitan(w.statusDisabilitas));
    default:
      return true;
  }
}


export type AggregationType = "categorical" | "boolean" | "fillRate" | "skip";



export type WargaAnalyticsField = {

  key: string;

  label: string;

  type: AggregationType;

};



export type WargaFormSectionDef = {

  key: string;

  title: string;

  description: string;

  fields: WargaAnalyticsField[];

};



const SKIP_KEYS = new Set(["kkId", "namaLengkap", "nik", "noKkDiKtp", "namaAlias"]);



function cat(key: string, label: string): WargaAnalyticsField {

  return { key, label, type: "categorical" };

}

function bool(key: string, label: string): WargaAnalyticsField {

  return { key, label, type: "boolean" };

}

function fill(key: string, label: string): WargaAnalyticsField {

  return { key, label, type: "fillRate" };

}

function skip(key: string, label: string): WargaAnalyticsField {

  return { key, label, type: "skip" };

}



/** Inti form lapangan + opsional — selaras shared/warga-form-tier.ts */

export const WARGA_FORM_SECTIONS: WargaFormSectionDef[] = [

  {

    key: "pokok",

    title: "Data pokok",

    description: "Inti register kependudukan (standar sensus).",

    fields: [

      skip("kkId", "Kartu Keluarga"),

      skip("namaLengkap", "Nama Lengkap"),

      skip("nik", "NIK"),

      cat("jenisKelamin", "Jenis Kelamin"),

      cat("kedudukanKeluarga", "Kedudukan Keluarga"),

      fill("tempatLahir", "Tempat Lahir"),

      fill("tanggalLahir", "Tanggal Lahir"),

      cat("statusKependudukan", "Status Kependudukan"),

      cat("statusPerkawinan", "Status Perkawinan"),

      cat("agama", "Agama"),

      cat("kewarganegaraan", "Kewarganegaraan"),

    ],

  },

  {

    key: "kontak",

    title: "Kontak & aktivitas",

    description: "Kontak, pendidikan, pekerjaan, skrining fungsional.",

    fields: [

      cat("literasi", "Literasi"),

      cat("pendidikan", "Pendidikan (ISCED)"),

      bool("punyaAktaLahir", "Punya Akta Lahir"),

      bool("punyaKia", "Punya KIA"),

      cat("statusPekerjaan", "Status Angkatan Kerja (ILO)"),

      cat("pekerjaan", "Pekerjaan"),

      fill("nomorWhatsapp", "No. WhatsApp"),

      fill("namaKontakDarurat", "Nama Kontak Darurat"),

      fill("nomorKontakDarurat", "No. Kontak Darurat"),

      cat("statusDisabilitas", "Kesulitan aktivitas (WG)"),

      cat("wgKesulitanMelihat", "WG — Melihat"),

      cat("wgKesulitanBerjalan", "WG — Berjalan"),

    ],

  },

  {

    key: "tambahan",

    title: "Data tambahan",

    description: "Dokumen, detail sekolah/kerja, program RW — opsional.",

    fields: [

      fill("nomorWhatsappAlternatif", "No. WhatsApp Alternatif"),

      fill("email", "Email"),

      cat("statusEktp", "Status e-KTP"),

      bool("punyaBpjsKesehatan", "Punya BPJS Kesehatan"),

      bool("sedangSekolah", "Sedang Sekolah"),

      bool("sedangKuliah", "Sedang Kuliah"),

      bool("punyaUsaha", "Punya Usaha"),

      cat("statusBansosIndividu", "Status Bansos Individu"),

      bool("aktifKegiatanRw", "Partisipasi Kegiatan RW"),

      bool("punyaKendaraan", "Punya Kendaraan"),

    ],

  },

];



export const KK_ANALYTICS_FIELDS: WargaAnalyticsField[] = [

  cat("statusRumah", "Status Rumah"),

  cat("kondisiBangunan", "Kondisi Bangunan"),

  cat("sumberAir", "Sumber Air"),

  cat("sanitasiWc", "Sanitasi/WC"),

  cat("listrik", "Listrik"),

  bool("penerimaBansos", "Penerima Bansos"),

  cat("penghasilanBulanan", "Penghasilan Bulanan"),

  bool("layakBansos", "Layak Bansos"),

  cat("kategoriEkonomi", "Kategori Ekonomi"),

  fill("linkGmaps", "Link Google Maps"),

];



export function isFieldFilled(value: unknown): boolean {

  if (value === null || value === undefined) return false;

  if (typeof value === "boolean") return true;

  if (typeof value === "number") return !Number.isNaN(value);

  if (typeof value === "string") return value.trim() !== "";

  return true;

}



export function shouldSkipAnalyticsField(key: string): boolean {

  return SKIP_KEYS.has(key);

}



export function wargaFormSectionFieldKeys(): Record<string, string[]> {

  const out: Record<string, string[]> = {};

  for (const s of WARGA_FORM_SECTIONS) {

    out[s.key] = s.fields.map((f) => f.key);

  }

  return out;

}



export const PENGANGGURAN_DEFINISI =
  "Warga usia ≥18 dengan status ILO «Mencari Kerja» atau «Belum Bekerja»; pelajar/mahasiswa & pensiun dikecualikan. Jika status kosong, dipetakan dari teks pekerjaan (legacy).";


