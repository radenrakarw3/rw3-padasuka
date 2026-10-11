/**
 * Jawaban standar yang bisa diturunkan dari data induk (kolom lama tabel warga / kartu_keluarga).
 * Dipakai sebagai cadangan bila belum ada fakta: kelengkapan tidak 0%, formulir tidak menanyakan ulang,
 * dan formulir cetak sudah tercentang. Fakta yang dicatat selalu didahulukan.
 * Kolom berdefault (status_rumah, sumber_air, listrik, dst.) hanya dipakai bila baris KK tidak persis sama dengan
 * nilai default skema — baris yang seluruhnya default belum tentu pernah diisi.
 * Nilai lama yang tidak bisa dipetakan tanpa menebak (mis. "Jamban Sendiri" tanpa info septic tank) dibiarkan kosong.
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

export interface KkInduk {
  penghasilan_bulanan?: string | null;
  status_rumah?: string | null;
  kondisi_bangunan?: string | null;
  sumber_air?: string | null;
  sanitasi_wc?: string | null;
  listrik?: string | null;
  penerima_bansos?: boolean | null;
  jenis_bansos?: string | null;
}

const DEFAULT_KK = { status_rumah: "Milik Sendiri", kondisi_bangunan: "Permanen", sumber_air: "PDAM", sanitasi_wc: "Jamban Sendiri", listrik: "PLN 900 VA" } as const;

export function kkMasihDefault(k: KkInduk): boolean {
  return (Object.keys(DEFAULT_KK) as (keyof typeof DEFAULT_KK)[]).every((c) => (k[c] ?? DEFAULT_KK[c]) === DEFAULT_KK[c]);
}

const STATUS_RUMAH: Record<string, string> = { "Milik Sendiri": "milik_sendiri", "Kontrak/Sewa": "sewa", Menumpang: "milik_keluarga" };
const STATUS_TINGGAL: Record<string, string> = { "Milik Sendiri": "tetap_ktp", "Kontrak/Sewa": "kontrak", Menumpang: "menumpang" };
const SUMBER_AIR: Record<string, string> = { PDAM: "pdam", "Sumur Bor": "sumur_pompa", "Sumur Gali": "sumur_gali", Lainnya: "lainnya" };
const LISTRIK: Record<string, string> = { "PLN 450 VA": "450", "PLN 900 VA": "900", "PLN 1300 VA": "1300", "PLN 2200 VA": "2200_plus", "PLN > 2200 VA": "2200_plus", "Tidak Ada": "numpang" };
const BANSOS: [string, string][] = [["pkh", "pkh"], ["bpnt", "bpnt"], ["sembako", "bpnt"], ["blt", "blt"], ["bst", "blt"], ["pbi", "pbi"], ["pip", "pip"], ["kip", "pip"], ["lainnya", "lainnya"]];

export function bansosKeStandar(jenis: string | null | undefined): string | null {
  const t = (jenis ?? "").toLowerCase();
  if (!t.trim()) return null;
  const hasil = BANSOS.filter(([kata]) => t.includes(kata)).map(([, nilai]) => nilai);
  const unik = Array.from(new Set(hasil.length ? hasil : ["lainnya"]));
  return unik.join(",");
}

export function jawabanIndukKk(k: KkInduk): Record<string, string> {
  const out: Record<string, string> = {};
  const hasil = penghasilanKeStandar(k.penghasilan_bulanan);
  if (hasil) out.s_penghasilan = hasil;
  const bansos = bansosKeStandar(k.jenis_bansos);
  if (bansos) out.s_bansos = bansos;
  if (kkMasihDefault(k)) return out;

  const isi = (kunci: string, peta: Record<string, string>, v: string | null | undefined) => {
    const n = v ? peta[v.trim()] : undefined;
    if (n) out[kunci] = n;
  };
  isi("s_status_rumah", STATUS_RUMAH, k.status_rumah);
  isi("s_status_tinggal", STATUS_TINGGAL, k.status_rumah);
  isi("s_sumber_air", SUMBER_AIR, k.sumber_air);
  isi("s_listrik", LISTRIK, k.listrik);
  if (k.sanitasi_wc?.trim() === "Jamban Bersama") out.s_jamban = "bersama";
  if (k.kondisi_bangunan?.trim() === "Permanen") out.s_kondisi_rumah = "layak";
  if (!bansos && k.penerima_bansos === false) out.s_bansos = "tidak_ada";
  return out;
}
