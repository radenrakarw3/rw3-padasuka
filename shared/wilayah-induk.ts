/**
 * Jawaban standar yang bisa diturunkan dari data induk (kolom lama tabel warga / kartu_keluarga).
 * Dipakai sebagai cadangan bila belum ada fakta: kelengkapan tidak 0%, formulir tidak menanyakan ulang,
 * dan formulir cetak sudah tercentang. Fakta yang dicatat selalu didahulukan.
 * Kolom berdefault (status_rumah, sumber_air, listrik, dst.) sengaja tidak dipakai karena belum tentu diisi warga.
 */
import { resolvePekerjaanCanon } from "./pekerjaan-status";

const ada = (teks: string, ...kata: string[]) => kata.some((k) => teks.includes(k));

export function pekerjaanKeStandar(pekerjaan: string | null | undefined): string | null {
  const t = resolvePekerjaanCanon(pekerjaan).toLowerCase();
  if (!t || t === "bimbingan orang tua") return null;
  if (ada(t, "pelajar", "mahasiswa")) return "pelajar";
  if (ada(t, "ibu rumah tangga", "mengurus rumah tangga")) return "irt";
  if (ada(t, "pensiun")) return "pensiun";
  if (ada(t, "belum/tidak bekerja", "tidak bekerja", "belum bekerja")) return "tidak_bekerja";
  if (ada(t, "(pns)", "pegawai negeri", "pppk", "asn", "tni", "polri", "kepolisian", "bumn", "bumd")) return "asn";
  if (ada(t, "buruh", "pekerja lepas", "harian lepas")) return "buruh";
  if (ada(t, "sopir", "driver", "ojek", "kurir", "pengemudi")) return "driver";
  if (ada(t, "wiraswasta", "pedagang", "pengusaha", "pemilik", "umkm", "reseller", "perdagangan")) return "wiraswasta";
  if (ada(t, "karyawan", "pegawai", "staff", "kasir", "operator")) return "karyawan";
  return "lainnya";
}

export function pendidikanKeStandar(pendidikan: string | null | undefined): string | null {
  const t = (pendidikan ?? "").trim().toLowerCase();
  if (!t) return null;
  if (ada(t, "belum sekolah", "tidak sekolah", "belum tamat sd", "tidak/belum tamat")) return "belum_sekolah";
  if (ada(t, "diploma iv", "strata", "sarjana", "s1", "s2", "s3")) return "sarjana";
  if (ada(t, "diploma", "akademi", "d3", "d1", "d2")) return "diploma";
  if (ada(t, "slta", "sma", "smk")) return "sma";
  if (ada(t, "sltp", "smp")) return "smp";
  if (ada(t, "sd")) return "sd";
  return null;
}

export function penghasilanKeStandar(penghasilan: string | null | undefined): string | null {
  const t = (penghasilan ?? "").replace(/\s+/g, " ").trim();
  if (t === "< Rp 500.000" || t === "Rp 500.000 - Rp 1.000.000") return "kurang_1jt";
  if (t === "Rp 1.000.000 - Rp 2.000.000") return "1_2_5jt";
  return null;
}

export function jawabanIndukWarga(w: { pekerjaan?: string | null; pendidikan?: string | null }): Record<string, string> {
  const out: Record<string, string> = {};
  const kerja = pekerjaanKeStandar(w.pekerjaan);
  if (kerja) out.s_pekerjaan = kerja;
  const didik = pendidikanKeStandar(w.pendidikan);
  if (didik) out.s_pendidikan = didik;
  return out;
}

export function jawabanIndukKk(k: { penghasilan_bulanan?: string | null }): Record<string, string> {
  const out: Record<string, string> = {};
  const hasil = penghasilanKeStandar(k.penghasilan_bulanan);
  if (hasil) out.s_penghasilan = hasil;
  return out;
}
