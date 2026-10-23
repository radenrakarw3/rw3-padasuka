export type TujuanUtama = "menegur" | "meminta" | "jabatan" | "kustom";
/** T = menegur, M = meminta, J = menjalankan jabatan, F = kustom. */
export type Kategori = "T" | "M" | "J" | "F";
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
  /**
   * Pilihan cepat (chip) untuk teks/uraian/waktu/daftar: diketuk untuk mengisi (daftar: menambah butir).
   * Bentuk `{ dari, peta }`: saran bergantung pada nilai field lain (mis. jenis pelanggaran → kewajiban).
   */
  saran?: readonly string[] | { dari: string; peta: Readonly<Record<string, readonly string[]>> };
  /** Tanggal: tombol "+n hari" dari hari ini. */
  cepat?: readonly number[];
  /** Pihak: penerima yang sering dipakai, tinggal diketuk. */
  preset?: readonly Pihak[];
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
  /** Judul cetak untuk layout non-surat (BERITA ACARA …); {x} diganti nilai field x. */
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
  /** Contoh perihal yang tinggal diketuk lalu disesuaikan. */
  saranPerihal?: readonly string[];
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
  | { t: "ttd"; tempatTanggal?: string; kolom: { atas: string; nama: string; jabatan?: string; ketua?: boolean }[] }
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
