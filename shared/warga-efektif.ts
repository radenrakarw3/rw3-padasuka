/**
 * Nilai efektif warga & KK — satu aturan untuk statistik, daftar, dan cetak rekap.
 * Jawaban Standar data (wil_fakta terverifikasi yang masih berlaku) didahulukan;
 * kolom lama tabel warga / kartu_keluarga hanya cadangan bila belum ada jawaban.
 * Fakta berstatus «perlu_cek» tidak dihitung, hanya ditandai.
 */
import { bansosKeStandar, pekerjaanKeStandar, pendidikanKeStandar } from "./wilayah-induk";

export type FaktaBerlaku = { nilai: string; mulai: string };

export interface FaktaSubjek {
  /** kunci standar → jawaban terverifikasi yang berlaku. */
  terverifikasi: Record<string, FaktaBerlaku>;
  /** kunci standar yang punya usulan menunggu dicek RT. */
  perluCek: string[];
}

export type SumberData = { asal: "standar"; mulai: string } | { asal: "lama" };

export const LABEL_SUMBER = { standar: "Standar data", lama: "Data lama" } as const;

export function teksSumber(s: SumberData | undefined): string {
  if (!s || s.asal === "lama") return LABEL_SUMBER.lama;
  return `${LABEL_SUMBER.standar} (${s.mulai})`;
}

export function faktaKosong(): FaktaSubjek {
  return { terverifikasi: {}, perluCek: [] };
}

/** Status ILO + jabatan pengganti untuk tiap kode `s_pekerjaan`. */
const PEKERJAAN_DARI_STANDAR: Record<string, { status: string; pekerjaan: string }> = {
  karyawan: { status: "Bekerja", pekerjaan: "Karyawan Swasta" },
  asn: { status: "Bekerja", pekerjaan: "Pegawai Negeri Sipil (PNS)" },
  wiraswasta: { status: "Wiraswasta", pekerjaan: "Wiraswasta" },
  buruh: { status: "Pekerja Lepas", pekerjaan: "Buruh Harian Lepas" },
  driver: { status: "Bekerja", pekerjaan: "Sopir" },
  irt: { status: "Ibu Rumah Tangga", pekerjaan: "Ibu Rumah Tangga" },
  pelajar: { status: "Pelajar", pekerjaan: "Pelajar" },
  pensiun: { status: "Pensiun", pekerjaan: "Pensiunan" },
  mencari_kerja: { status: "Mencari Kerja", pekerjaan: "Belum/Tidak Bekerja" },
  tidak_bekerja: { status: "Belum Bekerja", pekerjaan: "Belum/Tidak Bekerja" },
  lainnya: { status: "Bekerja", pekerjaan: "Lainnya" },
};

const PENDIDIKAN_DARI_STANDAR: Record<string, string> = {
  belum_sekolah: "Tidak/Belum Tamat SD",
  sd: "Tamat SD/Sederajat",
  smp: "SLTP/Sederajat",
  sma: "SLTA/Sederajat",
  diploma: "Akademi/Diploma III",
  sarjana: "Diploma IV/Strata I",
};

const DISABILITAS_DARI_STANDAR: Record<string, string> = {
  tidak: "Tidak Ada",
  fisik: "Fisik / gerak",
  netra: "Netra (penglihatan)",
  rungu_wicara: "Rungu / wicara",
  mental: "Mental / intelektual",
  ganda: "Ganda",
};

export type WargaLama = {
  id?: number;
  pekerjaan?: string | null;
  statusPekerjaan?: string | null;
  pendidikan?: string | null;
  statusDisabilitas?: string | null;
};

export type WargaEfektif = {
  fakta?: Record<string, FaktaBerlaku>;
  perluCek?: string[];
  sumber?: Partial<Record<"pekerjaan" | "pendidikan" | "disabilitas", SumberData>>;
};

/** Timpa kolom lama dengan jawaban Standar data yang berlaku. Jabatan lama dipertahankan bila kodenya sama. */
export function terapkanFaktaWarga<T extends WargaLama>(w: T, f: FaktaSubjek | undefined): T & WargaEfektif {
  const fakta = f?.terverifikasi ?? {};
  const hasil: T & WargaEfektif = { ...w, fakta, perluCek: f?.perluCek ?? [], sumber: { pekerjaan: { asal: "lama" }, pendidikan: { asal: "lama" }, disabilitas: { asal: "lama" } } };

  const kerja = fakta.s_pekerjaan;
  const peta = kerja ? PEKERJAAN_DARI_STANDAR[kerja.nilai] : undefined;
  if (kerja && peta) {
    const sama = pekerjaanKeStandar(w.pekerjaan) === kerja.nilai;
    hasil.statusPekerjaan = peta.status;
    hasil.pekerjaan = sama ? w.pekerjaan : peta.pekerjaan;
    hasil.sumber!.pekerjaan = { asal: "standar", mulai: kerja.mulai };
  }

  const didik = fakta.s_pendidikan;
  const labelDidik = didik ? PENDIDIKAN_DARI_STANDAR[didik.nilai] : undefined;
  if (didik && labelDidik) {
    hasil.pendidikan = pendidikanKeStandar(w.pendidikan) === didik.nilai ? w.pendidikan : labelDidik;
    hasil.sumber!.pendidikan = { asal: "standar", mulai: didik.mulai };
  }

  const dis = fakta.s_disabilitas;
  const labelDis = dis ? DISABILITAS_DARI_STANDAR[dis.nilai] : undefined;
  if (dis && labelDis) {
    hasil.statusDisabilitas = labelDis;
    hasil.sumber!.disabilitas = { asal: "standar", mulai: dis.mulai };
  }
  return hasil;
}

export type KkLama = {
  id: number;
  penerimaBansos?: boolean | null;
  jenisBansos?: string | null;
};

export type KkEfektif = {
  fakta?: Record<string, FaktaBerlaku>;
  perluCek?: string[];
  /** Kode bansos standar (pkh, bpnt, …); kosong = tidak menerima / belum diketahui. */
  bansos?: string[];
  sumber?: Partial<Record<"bansos", SumberData>>;
};

export function terapkanFaktaKk<T extends KkLama>(k: T, f: FaktaSubjek | undefined): T & KkEfektif {
  const fakta = f?.terverifikasi ?? {};
  const hasil: T & KkEfektif = { ...k, fakta, perluCek: f?.perluCek ?? [], sumber: { bansos: { asal: "lama" } } };
  const bansos = fakta.s_bansos;
  if (bansos) {
    const kode = bansos.nilai.split(",").map((s) => s.trim()).filter((s) => s && s !== "tidak_ada");
    hasil.bansos = kode;
    hasil.penerimaBansos = kode.length > 0;
    hasil.sumber!.bansos = { asal: "standar", mulai: bansos.mulai };
  } else {
    const kode = k.penerimaBansos ? (bansosKeStandar(k.jenisBansos) ?? "lainnya").split(",") : [];
    hasil.bansos = kode.filter((s) => s && s !== "tidak_ada");
  }
  return hasil;
}
