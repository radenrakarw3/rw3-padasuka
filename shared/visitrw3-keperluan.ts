/**
 * Rincian keperluan tinggal penghuni dewasa Visit RW3 (ngontrak/ngekost):
 * untuk apa tinggal di RW 03, di mana aktivitasnya, dan sampai kapan.
 * Disimpan sebagai JSON di kolom `detail_keperluan`; nama tempat tetap di `nama_tempat_kerja`.
 */
import { bulanIni, formatBulanTahun } from "./visitrw3-kendaraan";

export type KeperluanTinggal = "Kerja" | "Kuliah" | "Usaha" | "Lainnya";

export type DetailKeperluan = {
  /** Alamat kantor / kampus / lokasi usaha / tempat kegiatan. */
  alamat?: string | null;
  /** Jabatan/bagian · fakultas/jurusan · jenis usaha. */
  peran?: string | null;
  /** Status kerja (tetap/kontrak/…) atau semester. */
  status?: string | null;
  /** Rencana sampai kapan, format YYYY-MM. */
  sampai?: string | null;
  /** Tidak ada batas waktu (mis. karyawan tetap / usaha menetap). */
  tidakTentu?: boolean;
  /** Penjelasan untuk apa tinggal di RW 03. */
  uraian?: string | null;
};

type FieldTeks = { label: string; placeholder: string; wajib: boolean };

export type AturanKeperluan = {
  tempat: FieldTeks;
  alamat: FieldTeks;
  peran: FieldTeks | null;
  status: { label: string; opsi: readonly string[] } | null;
  sampaiLabel: string;
  /** Teks pilihan "tanpa batas waktu"; null = tanggal wajib. */
  tidakTentuLabel: string | null;
  uraian: FieldTeks;
};

export const STATUS_KERJA = ["Karyawan tetap", "Karyawan kontrak", "Harian lepas / freelance", "Magang / PKL", "Penempatan proyek"] as const;
export const SEMESTER_KULIAH = [
  "Semester 1–2",
  "Semester 3–4",
  "Semester 5–6",
  "Semester 7–8",
  "Semester 9 ke atas",
  "Pascasarjana",
  "Profesi / koas",
  "Kursus / pelatihan",
] as const;

export const ATURAN_KEPERLUAN: Record<KeperluanTinggal, AturanKeperluan> = {
  Kerja: {
    tempat: { label: "Nama perusahaan / tempat kerja", placeholder: "Contoh: PT Sinar Jaya, RS Mitra Cimahi", wajib: true },
    alamat: { label: "Alamat tempat kerja", placeholder: "Jalan, kelurahan, kota", wajib: true },
    peran: { label: "Jabatan / bagian", placeholder: "Contoh: Operator produksi, perawat", wajib: true },
    status: { label: "Status kerja", opsi: STATUS_KERJA },
    sampaiLabel: "Kontrak kerja / penempatan sampai",
    tidakTentuLabel: "Tidak ada batas (karyawan tetap)",
    uraian: { label: "Keterangan tambahan (opsional)", placeholder: "Mis. dimutasi dari Bandung, shift malam", wajib: false },
  },
  Kuliah: {
    tempat: { label: "Nama kampus / sekolah", placeholder: "Contoh: Universitas Jenderal Achmad Yani", wajib: true },
    alamat: { label: "Alamat kampus", placeholder: "Jalan, kelurahan, kota", wajib: true },
    peran: { label: "Fakultas / jurusan", placeholder: "Contoh: Teknik Informatika", wajib: true },
    status: { label: "Semester / tingkat", opsi: SEMESTER_KULIAH },
    sampaiLabel: "Perkiraan lulus / selesai",
    tidakTentuLabel: null,
    uraian: { label: "Keterangan tambahan (opsional)", placeholder: "Mis. sedang skripsi, program beasiswa", wajib: false },
  },
  Usaha: {
    tempat: { label: "Nama usaha", placeholder: "Contoh: Warung Bu Siti", wajib: true },
    alamat: { label: "Lokasi usaha", placeholder: "Alamat tempat usaha", wajib: true },
    peran: { label: "Jenis usaha / barang / jasa", placeholder: "Contoh: Jual makanan, servis HP", wajib: true },
    status: null,
    sampaiLabel: "Rencana usaha di sini sampai",
    tidakTentuLabel: "Belum ditentukan (usaha menetap)",
    uraian: { label: "Keterangan tambahan (opsional)", placeholder: "Mis. buka cabang, usaha musiman", wajib: false },
  },
  Lainnya: {
    tempat: { label: "Instansi / tempat kegiatan (opsional)", placeholder: "Bila ada, contoh: RS Dustira", wajib: false },
    alamat: { label: "Alamat kegiatan (opsional)", placeholder: "Bila ada", wajib: false },
    peran: null,
    status: null,
    sampaiLabel: "Rencana tinggal sampai",
    tidakTentuLabel: null,
    uraian: {
      label: "Jelaskan keperluan tinggal",
      placeholder: "Mis. menemani keluarga dirawat, mencari kerja, pelatihan 3 bulan",
      wajib: true,
    },
  },
};

export function aturanKeperluan(keperluan?: string | null): AturanKeperluan | null {
  return keperluan && keperluan in ATURAN_KEPERLUAN ? ATURAN_KEPERLUAN[keperluan as KeperluanTinggal] : null;
}

function teks(v: unknown, max = 200): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

export function normalisasiDetailKeperluan(raw: unknown): DetailKeperluan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sampai = teks(r.sampai, 7);
  const d: DetailKeperluan = {
    alamat: teks(r.alamat),
    peran: teks(r.peran),
    status: teks(r.status, 60),
    sampai: sampai && /^\d{4}-\d{2}$/.test(sampai) ? sampai : null,
    tidakTentu: r.tidakTentu === true,
    uraian: teks(r.uraian, 500),
  };
  return Object.values(d).some((v) => v) ? d : null;
}

export function parseDetailKeperluan(json?: string | null): DetailKeperluan | null {
  if (!json?.trim()) return null;
  try {
    return normalisasiDetailKeperluan(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Validasi rincian keperluan; pesan tanpa nama penghuni. */
export function validateDetailKeperluan(
  keperluan: string | null | undefined,
  namaTempat: string | null | undefined,
  detail: DetailKeperluan | null | undefined,
  now = new Date(),
): string | null {
  const aturan = aturanKeperluan(keperluan);
  if (!aturan) return "Pilih keperluan tinggal";
  const d = detail ?? {};
  if (aturan.tempat.wajib && !namaTempat?.trim()) return `Isi ${aturan.tempat.label.toLowerCase()}`;
  if (aturan.alamat.wajib && (!d.alamat?.trim() || d.alamat.trim().length < 5)) {
    return `Isi ${aturan.alamat.label.toLowerCase()} (minimal 5 karakter)`;
  }
  if (aturan.peran?.wajib && !d.peran?.trim()) return `Isi ${aturan.peran.label.toLowerCase()}`;
  if (aturan.status && !d.status?.trim()) return `Pilih ${aturan.status.label.toLowerCase()}`;
  if (aturan.uraian.wajib && (!d.uraian?.trim() || d.uraian.trim().length < 10)) {
    return `${aturan.uraian.label} (minimal 10 karakter)`;
  }
  if (aturan.tidakTentuLabel && d.tidakTentu) return null;
  if (!d.sampai || !/^\d{4}-\d{2}$/.test(d.sampai)) return `Isi ${aturan.sampaiLabel.toLowerCase()} (bulan & tahun)`;
  if (d.sampai < bulanIni(now)) return `${aturan.sampaiLabel} tidak boleh bulan yang sudah lewat`;
  return null;
}

/** Baris label–nilai untuk ringkasan form, admin, dan surat cetak (urutan sama di semua tempat). */
export function barisKeperluan(
  keperluan: string | null | undefined,
  namaTempat: string | null | undefined,
  detail: DetailKeperluan | null | undefined,
): [string, string][] {
  const aturan = aturanKeperluan(keperluan);
  if (!keperluan?.trim()) return [];
  const out: [string, string][] = [["Keperluan", keperluan.trim()]];
  if (!aturan) {
    if (namaTempat?.trim()) out.push(["Tempat", namaTempat.trim()]);
    return out;
  }
  const d = detail ?? {};
  const label = (f: FieldTeks) => f.label.replace(/\s*\(opsional\)$/i, "");
  if (namaTempat?.trim()) out.push([label(aturan.tempat), namaTempat.trim()]);
  if (d.alamat) out.push([label(aturan.alamat), d.alamat]);
  if (aturan.peran && d.peran) out.push([label(aturan.peran), d.peran]);
  if (aturan.status && d.status) out.push([aturan.status.label, d.status]);
  if (aturan.tidakTentuLabel && d.tidakTentu) out.push([aturan.sampaiLabel, aturan.tidakTentuLabel]);
  else if (d.sampai) out.push([aturan.sampaiLabel, formatBulanTahun(d.sampai)]);
  if (d.uraian) out.push([aturan.uraian.wajib ? "Untuk" : "Keterangan", d.uraian]);
  return out;
}
