/**
 * SSOT: bagian form Data Warga + agregasi dashboard kependudukan.
 * Selaras shared/warga-form-tier.ts & shared/warga-international.ts.
 */

import {
  getWargaAge,
  mapDisabilitasToKesulitan,
  needsPendidikan,
  needsWhatsapp,
  showIbuHamil,
} from "@shared/warga-form-tier";
import {
  needsCrvsDocuments,
  needsStatusAngkatanKerja,
  needsPekerjaanDetail,
  needsWgDomainDetail,
} from "@shared/warga-international";

export type WargaAnalyticsSlice = {
  tanggalLahir?: string | null;
  jenisKelamin?: string | null;
  statusPekerjaan?: string | null;
  statusDisabilitas?: string | null;
  kedudukanKeluarga?: string | null;
  punyaKendaraan?: boolean | null;
  aktifKegiatanRw?: boolean | null;
  statusBansosIndividu?: string | null;
  punyaSim?: boolean | null;
  [key: string]: unknown;
};

/** Populasi yang relevan per field (sesuai form internasional). */
export function isWargaEligibleForAnalyticsField(
  w: WargaAnalyticsSlice,
  field: string,
): boolean {
  const age = getWargaAge(w.tanggalLahir);
  switch (field) {
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
    case "wgKesulitanMelihat":
    case "wgKesulitanBerjalan":
      return needsWgDomainDetail(mapDisabilitasToKesulitan(w.statusDisabilitas));
    case "ibuHamil":
      return showIbuHamil(w.jenisKelamin, age);
    case "jenisKendaraan":
    case "jumlahKendaraan":
      return !!w.punyaKendaraan;
    case "bidangPartisipasi":
      return !!w.aktifKegiatanRw;
    case "jenisBansosIndividu":
      return w.statusBansosIndividu === "Penerima";
    case "jenisSim":
      return !!w.punyaSim;
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

const SKIP_KEYS = new Set(["kkId", "namaLengkap", "nik", "noKkDiKtp", "namaAlias", "kewarganegaraan"]);

/** Field yang tidak ditampilkan di kartu distribusi dashboard (meski ada di respons cache lama). */
export const ANALYTICS_HIDDEN_DISTRIBUTIONS = new Set(["kewarganegaraan"]);

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

/** Inti form lapangan + opsional — selaras form warga. */
export const WARGA_FORM_SECTIONS: WargaFormSectionDef[] = [
  {
    key: "pokok",
    title: "Data pokok",
    description: "Register kependudukan (standar sensus).",
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
      cat("golonganDarah", "Golongan Darah"),
      cat("statusTinggalIndividu", "Status Tinggal Individu"),
    ],
  },
  {
    key: "kontak",
    title: "Kontak & aktivitas",
    description: "Kontak, pendidikan, pekerjaan, kesehatan, skrining fungsional.",
    fields: [
      cat("pendidikan", "Pendidikan (ISCED)"),
      bool("punyaAktaLahir", "Punya Akta Lahir"),
      bool("punyaKia", "Punya KIA"),
      cat("statusPekerjaan", "Status Angkatan Kerja (ILO)"),
      cat("pekerjaan", "Pekerjaan"),
      fill("nomorWhatsapp", "No. WhatsApp"),
      cat("statusDisabilitas", "Kesulitan aktivitas (WG)"),
      cat("wgKesulitanMelihat", "WG — Melihat"),
      cat("wgKesulitanBerjalan", "WG — Berjalan"),
      cat("kondisiKesehatan", "Kondisi Kesehatan"),
      bool("ibuHamil", "Ibu Hamil"),
      bool("punyaBpjsKesehatan", "Punya BPJS Kesehatan"),
      bool("punyaPenyakitKronis", "Punya Penyakit Kronis"),
    ],
  },
  {
    key: "tambahan",
    title: "Data tambahan",
    description: "Dokumen, sekolah/kerja, kerentanan, partisipasi RW — opsional.",
    fields: [
      fill("nomorWhatsappAlternatif", "No. WhatsApp Alternatif"),
      fill("email", "Email"),
      cat("statusEktp", "Status e-KTP"),
      bool("punyaNpwp", "Punya NPWP"),
      bool("punyaSim", "Punya SIM"),
      cat("jenisSim", "Jenis SIM"),
      bool("punyaPaspor", "Punya Paspor"),
      bool("sedangSekolah", "Sedang Sekolah"),
      bool("sedangKuliah", "Sedang Kuliah"),
      bool("punyaUsaha", "Punya Usaha"),
      cat("penghasilanPribadi", "Penghasilan Pribadi"),
      cat("statusBansosIndividu", "Status Bansos Individu"),
      cat("jenisBansosIndividu", "Jenis Bansos Individu"),
      bool("anakYatimPiatu", "Anak Yatim/Piatu"),
      bool("perluBantuanKhusus", "Perlu Bantuan Khusus"),
      bool("aktifKegiatanRw", "Partisipasi Kegiatan RW"),
      cat("bidangPartisipasi", "Bidang Partisipasi"),
      bool("punyaKendaraan", "Punya Kendaraan"),
      cat("jenisKendaraan", "Jenis Kendaraan"),
      cat("statusVerifikasiData", "Status Verifikasi Data"),
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
  return SKIP_KEYS.has(key) || ANALYTICS_HIDDEN_DISTRIBUTIONS.has(key);
}

export function wargaFormSectionFieldKeys(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const s of WARGA_FORM_SECTIONS) {
    out[s.key] = s.fields.map((f) => f.key);
  }
  return out;
}

export type BucketJumlah = { label: string; count: number };

export type FieldDistribution = {
  key: string;
  label: string;
  type: AggregationType;
  eligible: number;
  filled: number;
  fillPercent: number;
  buckets: BucketJumlah[];
};

export type SectionDistribution = {
  key: string;
  title: string;
  description: string;
  fields: FieldDistribution[];
};

const BELUM = "Belum diisi";
const TOP_N = 10;

function labelBoolean(v: unknown): string {
  if (v === true) return "Ya";
  if (v === false) return "Tidak";
  return BELUM;
}

function labelCategorical(v: unknown): string {
  if (v === null || v === undefined) return BELUM;
  if (typeof v === "boolean") return labelBoolean(v);
  const s = String(v).trim();
  return s || BELUM;
}

function sortBuckets(buckets: BucketJumlah[]): BucketJumlah[] {
  return [...buckets].sort((a, b) => {
    if (a.label === BELUM) return 1;
    if (b.label === BELUM) return -1;
    return b.count - a.count;
  });
}

function trimBuckets(buckets: BucketJumlah[]): BucketJumlah[] {
  const sorted = sortBuckets(buckets);
  if (sorted.length <= TOP_N) return sorted;
  const head = sorted.filter((b) => b.label !== BELUM).slice(0, TOP_N - 1);
  const headKeys = new Set(head.map((b) => b.label));
  const sisa = sorted.filter((b) => b.label !== BELUM && !headKeys.has(b.label)).reduce((s, b) => s + b.count, 0);
  const belum = sorted.find((b) => b.label === BELUM);
  const out = [...head];
  if (sisa > 0) out.push({ label: "Lainnya", count: sisa });
  if (belum) out.push(belum);
  return out;
}

export function aggregateAnalyticsField(
  rows: WargaAnalyticsSlice[],
  field: WargaAnalyticsField,
): FieldDistribution | null {
  if (field.type === "skip" || shouldSkipAnalyticsField(field.key)) return null;

  let eligible = 0;
  let filled = 0;
  const map = new Map<string, number>();

  for (const row of rows) {
    if (!isWargaEligibleForAnalyticsField(row, field.key)) continue;
    eligible++;
    const raw = row[field.key];
    const filledNow = isFieldFilled(raw);
    if (filledNow) filled++;

    if (field.type === "fillRate") continue;

    const label =
      field.type === "boolean" ? labelBoolean(raw) : labelCategorical(raw);
    map.set(label, (map.get(label) ?? 0) + 1);
  }

  if (eligible === 0) {
    return {
      key: field.key,
      label: field.label,
      type: field.type,
      eligible: 0,
      filled: 0,
      fillPercent: 0,
      buckets: [],
    };
  }

  const buckets =
    field.type === "fillRate"
      ? [
          { label: "Terisi", count: filled },
          { label: BELUM, count: eligible - filled },
        ]
      : trimBuckets(Array.from(map.entries()).map(([label, count]) => ({ label, count })));

  return {
    key: field.key,
    label: field.label,
    type: field.type,
    eligible,
    filled,
    fillPercent: Math.round((filled / eligible) * 100),
    buckets,
  };
}

export function buildWargaMetadataSections(
  rows: WargaAnalyticsSlice[],
): SectionDistribution[] {
  return WARGA_FORM_SECTIONS.map((section) => ({
    key: section.key,
    title: section.title,
    description: section.description,
    fields: section.fields
      .map((f) => aggregateAnalyticsField(rows, f))
      .filter((x): x is FieldDistribution => x != null),
  })).filter((s) => s.fields.length > 0);
}

export function buildKkMetadataFields(
  rows: WargaAnalyticsSlice[],
): FieldDistribution[] {
  return KK_ANALYTICS_FIELDS.map((f) => aggregateAnalyticsField(rows, f)).filter(
    (x): x is FieldDistribution => x != null,
  );
}

export const PENGANGGURAN_DEFINISI =
  "Warga usia 19–64 dengan status ILO «Mencari Kerja» atau «Belum Bekerja». Pelajar, lansia 65+, dan ibu rumah tangga bukan pengangguran. Data lama tanpa status_pekerjaan: pekerjaan kosong atau «Belum/Tidak Bekerja». «Lainnya» = jabatan BPS, bukan pengangguran.";
