/** Bentuk respons GET /api/admin/cek-warga (server/cek-warga.ts). */

export type VonisCek = "warga_rw3" | "warga_singgah_aktif" | "visit_kedaluwarsa" | "pj_usaha" | "pekerja_usaha";

export interface HasilCekWarga {
  q: string;
  mode: "nama" | "nik" | "pendek";
  vonis: VonisCek[];
  peringatan: string[];
  warga: KkCek[];
  wargaTerpotong: boolean;
  visit: VisitCek[];
  biz: BizCek[];
}

export interface KkCek {
  kkId: number;
  nomorKk: string;
  rt: number;
  alamat: string;
  noUnit: string | null;
  /** 0–100 */
  kelengkapan: number;
  kurangKeluarga: string[];
  anggota: {
    id: number;
    nama: string;
    nik: string;
    jenisKelamin: string | null;
    umur: number | null;
    kedudukan: string;
    status: string;
    pekerjaan: string | null;
    punyaWa: boolean;
    nomorWa: string | null;
    cocok: boolean;
    kurang: string[];
  }[];
}

export interface OrangCek {
  nama: string;
  nik: string | null;
  isAnak: boolean;
  pekerjaan: string | null;
  nomorWa: string | null;
  kendaraan: string | null;
  cocok: boolean;
}

export interface VisitCek {
  pengajuanId: number | null;
  wargaSinggahId: number | null;
  nomorVisitrw3: string | null;
  tipe: string | null;
  jenisWarga: string | null;
  rt: number | null;
  alamat: string | null;
  nomorUnit: string | null;
  status: string;
  statusHunian: string | null;
  tanggalMulai: string | null;
  tanggalHabis: string | null;
  /** Negatif = sudah lewat. */
  sisaHari: number | null;
  keperluan: string | null;
  alasanTolak: string | null;
  penghuni: (OrangCek & { keperluan: string | null })[];
}

export interface BizCek {
  pengajuanId: number;
  usahaId: number | null;
  namaUsaha: string;
  nomorInduk: string | null;
  nomorBiz: string;
  rt: number;
  alamat: string;
  statusPengajuan: string;
  statusUsaha: string | null;
  tanggalMulai: string | null;
  tanggalHabis: string | null;
  sisaHari: number | null;
  pjNama: string;
  pjNomorWa: string | null;
  tagihanBelumLunas: number;
  /** Orang hanya tercatat di pengajuan lama, bukan izin yang berlaku sekarang. */
  dataLama: boolean;
  orang: (OrangCek & { peran: string | null; asal: string | null; domisili: string | null; isPj: boolean })[];
}
