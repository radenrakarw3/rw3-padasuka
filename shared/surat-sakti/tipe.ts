export type TujuanUtama = "tugaskan" | "masalah" | "keputusan" | "dukungan" | "pantau" | "kustom";
export type Kategori = "A" | "B" | "C" | "D" | "E" | "F";
export type Layout = "surat" | "keputusan" | "berita_acara" | "tabel" | "notulen" | "laporan" | "kustom";
export type PosisiPenerima = "pengurus" | "warga" | "eksternal" | "internal";
export type Akses = "internal" | "rt_terkait" | "terbatas";

export type JenisPihak = "pengurus" | "rt" | "warga" | "usaha" | "instansi" | "eksternal";
export const LABEL_JENIS_PIHAK: Record<JenisPihak, string> = {
  pengurus: "Pengurus RW", rt: "Ketua RT", warga: "Warga", usaha: "Usaha/Provider", instansi: "Instansi", eksternal: "Pihak luar lain",
};

/** Snapshot pihak saat dokumen dibuat — bukan master data baru. */
export interface Pihak {
  nama: string;
  peran?: string;
  jenis: JenisPihak;
  rt?: number | null;
  kontak?: string;
  sumber?: string;
  sumberId?: number;
}

export type TipeField = "teks" | "uraian" | "tanggal" | "waktu" | "angka" | "rupiah" | "pilihan" | "pihak" | "centang" | "tabel" | "daftar";

export interface KolomTabel {
  key: string;
  label: string;
  tipe?: "teks" | "angka" | "rupiah" | "tanggal";
  lebar?: number;
}

export interface Field {
  key: string;
  label: string;
  tipe: TipeField;
  wajib?: boolean;
  opsi?: readonly string[];
  kolom?: KolomTabel[];
  bantuan?: string;
  /** pihak: boleh lebih dari satu (default true). */
  tunggal?: boolean;
  /** Tidak dicetak (mis. centang konfirmasi internal). */
  internal?: boolean;
  /** Jumlah baris kosong tambahan saat dicetak (daftar hadir). */
  barisKosong?: number;
}

export interface KelompokField {
  id: string;
  judul: string;
  fields: Field[];
}

export interface JenisDokumen {
  kode: string;
  label: string;
  kategori: Kategori;
  tujuan: TujuanUtama;
  layout: Layout;
  posisi: PosisiPenerima;
  /** Kode pada nomor surat (mis. ST, UND, BA). */
  nomorKode: string;
  versi: number;
  /** Judul cetak untuk layout non-surat (BERITA ACARA …). */
  judulCetak?: string;
  ringkas: string;
  kelompok: string[];
  /** Kalimat pembuka baku; {x} diganti nilai field x. */
  pembuka?: string;
  /** Kalimat penutup baku. */
  penutup?: string;
  /** Saat terbit, sarankan tindak lanjut. */
  butuhTindak: boolean;
  /** Label lama (8 jenis surat v1) untuk kompatibilitas arsip. */
  labelLama?: string;
  /** Wajib ada dasar yang diperiksa sebelum terbit. */
  perluDasar?: boolean;
  /** Kesepakatan: wajib konfirmasi para pihak. */
  perluPersetujuanPihak?: boolean;
  /** Nilai awal form. */
  awal?: Record<string, unknown>;
}

export type DataDokumen = Record<string, unknown>;

export type Blok =
  | { t: "judul"; teks: string; sub?: string[] }
  | { t: "kepala"; baris: [string, string][]; tempatTanggal?: string }
  | { t: "alamat"; baris: string[] }
  | { t: "sub"; teks: string }
  | { t: "paragraf"; teks: string }
  | { t: "label"; baris: [string, string][] }
  | { t: "daftar"; item: string[]; bernomor?: boolean }
  | { t: "tabel"; kolom: string[]; lebar?: number[]; baris: string[][]; total?: string[] }
  | { t: "ttd"; tempatTanggal?: string; kolom: { atas: string; nama: string; jabatan?: string }[] }
  | { t: "tembusan"; item: string[] }
  | { t: "catatan"; teks: string };

export interface MetaRender {
  nomor: string | null;
  tanggal: string;
  perihal: string;
  draft: boolean;
  jumlahLampiran?: number;
}

export interface HasilValidasi {
  galat: string[];
  peringatan: string[];
  perluPemeriksaan: boolean;
}
