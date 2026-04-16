/**
 * useProfileCompleteness — hook reusable untuk cek kelengkapan profil warga.
 *
 * Cara tambah field baru yang wajib diisi:
 *   1. Tambah entry di REQUIRED_WARGA_FIELDS atau REQUIRED_KK_FIELDS
 *   2. Pastikan field tersebut ada di schema warga/kartu_keluarga
 *   3. Selesai — lock otomatis berlaku di semua tempat yang pakai hook ini
 */

import type { Warga, KartuKeluarga } from "@shared/schema";

export interface RequiredField {
  key: string;
  label: string;
  section?: string;
  /** Fungsi cek custom. Default: nilai tidak kosong dan bukan string kosong */
  check?: (value: unknown) => boolean;
}

/**
 * Field wajib per anggota KK.
 * Khusus Kepala Keluarga — semua field di bawah wajib terisi.
 * Anggota lain: hanya nomorWhatsapp & tanggalLahir yang wajib (jika usia >= 16).
 */
export const REQUIRED_WARGA_FIELDS: RequiredField[] = [
  { key: "nomorWhatsapp", label: "No. WhatsApp", section: "kontak" },
  { key: "nomorWhatsappAlternatif", label: "No. WhatsApp Alternatif", section: "kontak" },
  { key: "tanggalLahir", label: "Tanggal Lahir", section: "identitas" },
  { key: "golonganDarah", label: "Golongan Darah", section: "identitas" },
  { key: "kewarganegaraan", label: "Kewarganegaraan", section: "identitas" },
  { key: "statusEktp", label: "Status e-KTP", section: "dokumen" },
  { key: "alamatDomisili", label: "Alamat Domisili", section: "domisili" },
  { key: "statusTinggalIndividu", label: "Status Tinggal", section: "domisili" },
  { key: "namaKontakDarurat", label: "Nama Kontak Darurat", section: "kontak" },
  { key: "nomorKontakDarurat", label: "No. Kontak Darurat", section: "kontak" },
  { key: "pekerjaan", label: "Pekerjaan", section: "pekerjaan" },
  { key: "statusPekerjaan", label: "Status Pekerjaan", section: "pekerjaan" },
  { key: "pendidikan", label: "Pendidikan Terakhir", section: "pendidikan" },
  { key: "keahlian", label: "Keahlian", section: "pendidikan" },
  { key: "kondisiKesehatan", label: "Kondisi Kesehatan", section: "kesehatan", check: (v) => !!v && v !== "" },
  { key: "statusDisabilitas", label: "Status Disabilitas", section: "kesehatan", check: (v) => !!v && v !== "" },
  { key: "punyaBpjsKesehatan", label: "Status BPJS Kesehatan", section: "kesehatan", check: () => true },
  { key: "statusBansosIndividu", label: "Status Bansos Individu", section: "sosial" },
  { key: "aktifKegiatanRw", label: "Partisipasi Kegiatan RW", section: "partisipasi", check: () => true },
  // Tambah field wajib baru di sini — cukup satu baris:
  // { key: "namaFieldBaru", label: "Label yang tampil ke warga" },
];

/** Field wajib di level KK (bisa diisi warga via upload/form ekonomi) */
export const REQUIRED_KK_FIELDS: RequiredField[] = [
  { key: "fotoKk", label: "Scan/Foto KK (PDF)", section: "dokumen" },
  { key: "penghasilanBulanan", label: "Penghasilan Bulanan Keluarga", section: "ekonomi" },
];

export interface MissingField {
  key: string;
  label: string;
  wargaNama?: string; // siapa yang belum isi (untuk field warga)
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
  if (typeof value === "boolean") return true; // boolean selalu dianggap terisi
  return true;
}

function isFieldFilled(obj: Record<string, unknown>, field: RequiredField): boolean {
  const value = obj[field.key];
  const checker = field.check ?? defaultCheck;
  return checker(value);
}

function getAgeFromTanggalLahir(tanggalLahir: string | null | undefined): number | null {
  if (!tanggalLahir) return null;
  try {
    const birth = new Date(tanggalLahir);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  } catch {
    return null;
  }
}

export function useProfileCompleteness(
  anggota: Warga[] | undefined,
  kk: KartuKeluarga | undefined,
): ProfileCompleteness {
  if (!anggota || !kk) {
    return { isComplete: false, completionPercent: 0, missingFields: [], totalRequired: 0, totalFilled: 0 };
  }

  const missing: MissingField[] = [];
  let totalRequired = 0;
  let totalFilled = 0;

  // Cek field KK
  for (const field of REQUIRED_KK_FIELDS) {
    totalRequired++;
    if (isFieldFilled(kk as unknown as Record<string, unknown>, field)) {
      totalFilled++;
    } else {
      missing.push({ key: field.key, label: field.label });
    }
  }

  // Kepala keluarga: cek semua REQUIRED_WARGA_FIELDS
  const kepala = anggota.find(w => w.kedudukanKeluarga === "Kepala Keluarga");
  if (kepala) {
    for (const field of REQUIRED_WARGA_FIELDS) {
      totalRequired++;
      if (isFieldFilled(kepala as unknown as Record<string, unknown>, field)) {
        totalFilled++;
      } else {
        missing.push({ key: field.key, label: field.label, wargaNama: kepala.namaLengkap });
      }
    }
  }

  // Anggota lain (bukan KK): cek nomorWhatsapp & tanggalLahir jika usia >= 16
  const anggotaLain = anggota.filter(w => w.kedudukanKeluarga !== "Kepala Keluarga" && w.statusKependudukan === "Aktif");
  const fieldAnggota = REQUIRED_WARGA_FIELDS.filter(f => f.key === "nomorWhatsapp" || f.key === "tanggalLahir");

  for (const w of anggotaLain) {
    const age = getAgeFromTanggalLahir(w.tanggalLahir);
    if (age !== null && age < 16) continue; // anak < 16 tidak wajib punya WA

    for (const field of fieldAnggota) {
      totalRequired++;
      if (isFieldFilled(w as unknown as Record<string, unknown>, field)) {
        totalFilled++;
      } else {
        missing.push({ key: field.key, label: field.label, wargaNama: w.namaLengkap });
      }
    }
  }

  const completionPercent = totalRequired === 0 ? 100 : Math.round((totalFilled / totalRequired) * 100);
  const isComplete = missing.length === 0;

  return { isComplete, completionPercent, missingFields: missing, totalRequired, totalFilled };
}
