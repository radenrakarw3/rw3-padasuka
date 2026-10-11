/**
 * SSOT kelengkapan profil KK/warga — Tier 0/1 (shared/warga-form-tier.ts).
 */

import type { Warga, KartuKeluarga } from "@shared/schema";
import { isWargaDomisiliAktif } from "@shared/kependudukan-peristiwa";
import {
  getRequiredFieldKeysForWarga,
  getWargaAge,
  type WargaTierFormSlice,
} from "@shared/warga-form-tier";

function wargaToTierSlice(w: Warga, kkId?: number): WargaTierFormSlice {
  return {
    kkId: kkId?.toString() ?? String(w.kkId),
    tanggalLahir: w.tanggalLahir,
    kedudukanKeluarga: w.kedudukanKeluarga,
    literasi: w.literasi,
    pendidikan: w.pendidikan,
    statusPekerjaan: w.statusPekerjaan,
    pekerjaan: w.pekerjaan,
    punyaAktaLahir: w.punyaAktaLahir,
    punyaKia: w.punyaKia,
    statusDisabilitas: w.statusDisabilitas,
    wgKesulitanMelihat: w.wgKesulitanMelihat,
    wgKesulitanBerjalan: w.wgKesulitanBerjalan,
    nomorWhatsapp: w.nomorWhatsapp,
    namaKontakDarurat: w.namaKontakDarurat,
    nomorKontakDarurat: w.nomorKontakDarurat,
  };
}

export interface RequiredField {
  key: string;
  label: string;
  section?: string;
  check?: (value: unknown) => boolean;
}

/** Label untuk field wajib Tier — dipakai laporan kelengkapan. */
export const TIER_FIELD_LABELS: Record<string, string> = {
  kkId: "Kartu Keluarga",
  namaLengkap: "Nama Lengkap",
  nik: "NIK",
  jenisKelamin: "Jenis Kelamin",
  tanggalLahir: "Tanggal Lahir",
  tempatLahir: "Tempat Lahir",
  kedudukanKeluarga: "Kedudukan Keluarga",
  statusKependudukan: "Status Kependudukan",
  literasi: "Literasi baca-tulis",
  nomorWhatsapp: "No. WhatsApp",
  namaKontakDarurat: "Nama Kontak Darurat",
  nomorKontakDarurat: "No. Kontak Darurat",
  pendidikan: "Pendidikan (ISCED)",
  statusPekerjaan: "Status angkatan kerja (ILO)",
  pekerjaan: "Pekerjaan",
  punyaAktaLahir: "Punya akta lahir",
  punyaKia: "Punya KIA",
  wgKesulitanMelihat: "Kesulitan melihat",
  wgKesulitanBerjalan: "Kesulitan berjalan",
};

/** @deprecated Gunakan getRequiredFieldKeysForWarga — dipertahankan untuk impor lama. */
export const REQUIRED_WARGA_FIELDS: RequiredField[] = Object.entries(TIER_FIELD_LABELS).map(
  ([key, label]) => ({ key, label }),
);

export const REQUIRED_KK_FIELDS: RequiredField[] = [
  { key: "penghasilanBulanan", label: "Penghasilan Bulanan Keluarga", section: "ekonomi" },
];

export interface MissingField {
  key: string;
  label: string;
  wargaNama?: string;
}

export interface ProfileCompleteness {
  isComplete: boolean;
  completionPercent: number;
  missingFields: MissingField[];
  totalRequired: number;
  totalFilled: number;
}

function defaultCheck(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "boolean") return true;
  return true;
}

function isFieldFilled(obj: Record<string, unknown>, key: string): boolean {
  if (key === "kkId") return !!obj[key] && String(obj[key]).trim() !== "";
  if (key === "punyaAktaLahir" || key === "punyaKia") return typeof obj[key] === "boolean";
  return defaultCheck(obj[key]);
}

function missingForWarga(w: Warga, kkId?: number): MissingField[] {
  const keys = getRequiredFieldKeysForWarga(wargaToTierSlice(w, kkId));
  const missing: MissingField[] = [];
  const rec = w as unknown as Record<string, unknown>;
  for (const key of keys) {
    if (!isFieldFilled(rec, key)) {
      missing.push({
        key,
        label: TIER_FIELD_LABELS[key] ?? key,
        wargaNama: w.namaLengkap,
      });
    }
  }
  return missing;
}

export function computeKkCompleteness(
  anggota: Warga[],
  kk: KartuKeluarga,
): ProfileCompleteness {
  const missing: MissingField[] = [];
  let totalRequired = 0;
  let totalFilled = 0;

  const kkRec = kk as unknown as Record<string, unknown>;
  for (const field of REQUIRED_KK_FIELDS) {
    totalRequired++;
    if (isFieldFilled(kkRec, field.key)) totalFilled++;
    else missing.push({ key: field.key, label: field.label });
  }

  const aktif = anggota.filter((w) => isWargaDomisiliAktif(w.statusKependudukan));
  for (const w of aktif) {
    const keys = getRequiredFieldKeysForWarga(wargaToTierSlice(w, kk.id));
    const rec = w as unknown as Record<string, unknown>;
    for (const key of keys) {
      totalRequired++;
      if (isFieldFilled(rec, key)) totalFilled++;
      else {
        missing.push({
          key,
          label: TIER_FIELD_LABELS[key] ?? key,
          wargaNama: w.namaLengkap,
        });
      }
    }
  }

  const completionPercent =
    totalRequired === 0 ? 100 : Math.round((totalFilled / totalRequired) * 100);
  return {
    isComplete: missing.length === 0,
    completionPercent,
    missingFields: missing,
    totalRequired,
    totalFilled,
  };
}

export function computeWargaCompleteness(w: Warga): ProfileCompleteness {
  const missing = missingForWarga(w, w.kkId);
  const keys = getRequiredFieldKeysForWarga(wargaToTierSlice(w, w.kkId));
  const rec = w as unknown as Record<string, unknown>;
  const totalRequired = keys.length;
  const totalFilled = keys.filter((k) => isFieldFilled(rec, k)).length;
  const completionPercent =
    totalRequired === 0 ? 100 : Math.round((totalFilled / totalRequired) * 100);
  return {
    isComplete: missing.length === 0,
    completionPercent,
    missingFields: missing,
    totalRequired,
    totalFilled,
  };
}

export function countBelumDiverifikasi(anggota: Warga[]): number {
  return anggota.filter((w) => w.statusVerifikasiData !== "Sudah Diverifikasi").length;
}

export { getWargaAge };
