/**
 * Statistik warga satu pintu — dipakai Dashboard RW dan Kependudukan agar angkanya sama.
 * Aturan: KK RT 01–04, warga berstatus «Aktif», kelompok umur dari kategori-umur.
 */
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { getEffectiveKategoriUmur, isKategoriEligiblePengangguran, type KategoriUmurId } from "@shared/kategori-umur";
import {
  inferStatusPekerjaanFromLegacyPekerjaan,
  isWargaPengangguran,
  normalizePekerjaanLabelForStats,
} from "@shared/pekerjaan-labor";
import { isNomorHpValid, normalizeNomorHp } from "@shared/kontak";
import { getWargaAge } from "@shared/warga-form-tier";
import type { KkEfektif, WargaEfektif } from "@shared/warga-efektif";

export const STATUS_WARGA_TERHITUNG = "Aktif";

export function isWargaTerhitung(w: { statusKependudukan?: string | null }): boolean {
  return (w.statusKependudukan ?? STATUS_WARGA_TERHITUNG) === STATUS_WARGA_TERHITUNG;
}

export const KELOMPOK_UMUR_RINGKAS = [
  { id: "balita", label: "Balita", keterangan: "0–5 th", kategori: ["0-5"] },
  { id: "anak", label: "Anak & pelajar", keterangan: "6–18 th", kategori: ["6", "7-18"] },
  { id: "produktif", label: "Usia produktif", keterangan: "19–59 th", kategori: ["19-25", "26-40", "41-55", "56-59"] },
  { id: "lansia", label: "Lansia", keterangan: "60+ th", kategori: ["60-64", "65+"] },
  { id: "belum", label: "Usia belum diisi", keterangan: "tanggal lahir kosong", kategori: ["belum_diisi"] },
] as const satisfies readonly { id: string; label: string; keterangan: string; kategori: readonly KategoriUmurId[] }[];

export type KelompokUmurRingkasId = (typeof KELOMPOK_UMUR_RINGKAS)[number]["id"];

export function kelompokUmurRingkas(kategori: KategoriUmurId): KelompokUmurRingkasId {
  return KELOMPOK_UMUR_RINGKAS.find((k) => (k.kategori as readonly string[]).includes(kategori))!.id;
}

export type StatistikKkSlice = KkEfektif & {
  id: number;
  rt: number;
  penerimaBansos?: boolean | null;
  layakBansos?: boolean | null;
  jenisBansos?: string | null;
  alamat?: string | null;
  noUnit?: string | null;
  nomorKk?: string | null;
};

export type StatistikWargaSlice = WargaEfektif & {
  statusDisabilitas?: string | null;
  statusEktp?: string | null;
  ibuHamil?: boolean | null;
  punyaBpjsKesehatan?: boolean | null;
  punyaPenyakitKronis?: boolean | null;
  penyakitKronis?: string | null;
  anakYatimPiatu?: boolean | null;
  sedangKuliah?: boolean | null;
  id?: number;
  namaLengkap?: string | null;
  kkId: number;
  statusKependudukan?: string | null;
  jenisKelamin?: string | null;
  tanggalLahir?: string | null;
  kategoriUmur?: string | null;
  pekerjaan?: string | null;
  statusPekerjaan?: string | null;
  nomorWhatsapp?: string | null;
  kedudukanKeluarga?: string | null;
  pendidikan?: string | null;
  nik?: string | null;
};

export type SinggahPerRt = { rt: number; orang: number; izin: number; segeraHabis: number };

export interface AngkaWarga {
  kk: number;
  warga: number;
  lakiLaki: number;
  perempuan: number;
  rataAnggota: number;
  umur: Record<KelompokUmurRingkasId, number>;
  pengangguran: number;
  angkatanKerjaEligible: number;
  tingkatPengangguran: number;
  pindah: number;
  meninggal: number;
  kkTanpaAnggotaAktif: number;
  kkTanpaWa: number;
  kkLansiaSendiri: number;
  kkBansos: number;
  singgah: number;
  izinSinggah: number;
  izinSegeraHabis: number;
}

export interface StatistikWarga {
  generatedAt: string;
  aturan: { rt: number[]; status: string; umur: string };
  total: AngkaWarga;
  perRt: (AngkaWarga & { rt: number })[];
  kategoriUmur: Record<KategoriUmurId, number>;
  sorotan: { tingkat: "tinggi" | "sedang" | "info"; teks: string; rt?: number }[];
  /** Grafik & indeks untuk seluruh RW; `perRt` berisi rincian yang sama per RT. */
  rincian: { total: RincianWarga; perRt: Record<number, RincianWarga> };
}

export type Jumlah = { label: string; jumlah: number };

export interface RincianWarga {
  /** Piramida penduduk per 5 tahun (0–4 … 75+). */
  piramida: { label: string; laki: number; perempuan: number }[];
  /** Kegiatan utama — satu warga satu kategori, total = jumlah warga. */
  kegiatan: Jumlah[];
  /** Jenis pekerjaan warga berstatus Bekerja (8 terbanyak + Lainnya). */
  jenisPekerjaan: Jumlah[];
  /** Pendidikan terakhir warga usia 19+. */
  pendidikan: Jumlah[];
  indeks: {
    /** (usia 0–14 + 65+) per 100 usia 15–64. */
    rasioKetergantungan: number | null;
    /** Usia 65+ per 100 anak 0–14. */
    indeksPenuaan: number | null;
    /** Laki-laki per 100 perempuan. */
    rasioJenisKelamin: number | null;
    medianUmur: number | null;
  };
  /** Persentase kolom penting yang sudah terisi. */
  kelengkapan: { label: string; terisi: number; total: number }[];
}

const PITA_UMUR = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75] as const;

export const URUTAN_KEGIATAN = [
  "Bekerja",
  "Ibu Rumah Tangga",
  "Pelajar/Mahasiswa",
  "Bimbingan Orang Tua",
  "Pensiun",
  "Belum/Tidak bekerja",
  "Belum diisi",
] as const;

export const URUTAN_PENDIDIKAN = [
  "Belum Sekolah",
  "Tidak/Belum Tamat SD",
  "Tamat SD/Sederajat",
  "SLTP/Sederajat",
  "SLTA/Sederajat",
  "Diploma I/II",
  "Akademi/Diploma III",
  "Diploma IV/Strata I",
  "Strata II",
  "Strata III",
  "Belum diisi",
] as const;

const ALIAS_PENDIDIKAN: Record<string, string> = { SD: "Tamat SD/Sederajat", SMP: "SLTP/Sederajat", SMA: "SLTA/Sederajat" };

export function kegiatanWarga(w: Pick<StatistikWargaSlice, "statusPekerjaan" | "pekerjaan">): (typeof URUTAN_KEGIATAN)[number] {
  const s = (w.statusPekerjaan ?? "").trim() || inferStatusPekerjaanFromLegacyPekerjaan(w.pekerjaan) || "";
  if (!s) return "Belum diisi";
  const k = s.toLowerCase();
  if (k.includes("pelajar") || k.includes("mahasiswa")) return "Pelajar/Mahasiswa";
  if (k.includes("bimbingan")) return "Bimbingan Orang Tua";
  if (k.includes("rumah tangga")) return "Ibu Rumah Tangga";
  if (k.includes("pensiun")) return "Pensiun";
  if (s === "Mencari Kerja" || s === "Belum Bekerja" || k.includes("tidak bekerja")) return "Belum/Tidak bekerja";
  return "Bekerja";
}

function urutkan(hitung: Map<string, number>, urutan: readonly string[]): Jumlah[] {
  const tetap = urutan.filter((l) => hitung.get(l)).map((label) => ({ label, jumlah: hitung.get(label)! }));
  const lain = Array.from(hitung.entries())
    .filter(([l]) => !urutan.includes(l))
    .map(([label, jumlah]) => ({ label, jumlah }));
  return [...tetap, ...lain];
}

const tambah = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const rasio = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

/** Label pita piramida, mis. "15–19" atau "75+". */
export function pitaUmur(umur: number): string {
  const awal = PITA_UMUR[Math.min(Math.floor(umur / 5), PITA_UMUR.length - 1)];
  return awal === PITA_UMUR[PITA_UMUR.length - 1] ? `${awal}+` : `${awal}–${awal + 4}`;
}

/** Jenis pekerjaan untuk warga berstatus Bekerja; null bila bukan Bekerja. */
export function jenisPekerjaanWarga(w: Pick<StatistikWargaSlice, "statusPekerjaan" | "pekerjaan">): string | null {
  if (kegiatanWarga(w) !== "Bekerja") return null;
  const label = normalizePekerjaanLabelForStats(w.pekerjaan);
  return label === "Belum diisi" || label === "Belum/Tidak Bekerja" ? "Jenis belum diisi" : label;
}

/** Pendidikan terakhir untuk warga 19+ (atau umur tak diketahui); null bila di bawah 19. */
export function pendidikanWarga(w: Pick<StatistikWargaSlice, "pendidikan">, umur: number | null): string | null {
  if (umur !== null && umur < 19) return null;
  const raw = (w.pendidikan ?? "").trim();
  return raw ? ALIAS_PENDIDIKAN[raw] ?? raw : "Belum diisi";
}

/** Kolom penting untuk indeks kelengkapan; `berlaku` false = tidak dihitung untuk warga ini. */
export const KOLOM_KELENGKAPAN: {
  label: string;
  berlaku: (w: StatistikWargaSlice, umur: number | null) => boolean;
  terisi: (w: StatistikWargaSlice, umur: number | null) => boolean;
}[] = [
  { label: "Tanggal lahir", berlaku: () => true, terisi: (_w, umur) => umur !== null },
  { label: "NIK 16 digit", berlaku: () => true, terisi: (w) => /^\d{16}$/.test((w.nik ?? "").trim()) },
  { label: "Status pekerjaan", berlaku: () => true, terisi: (w) => kegiatanWarga(w) !== "Belum diisi" },
  { label: "Pendidikan (19+)", berlaku: (_w, umur) => umur === null || umur >= 19, terisi: (w) => !!(w.pendidikan ?? "").trim() },
  { label: "WhatsApp (17+)", berlaku: (_w, umur) => umur !== null && umur >= 17, terisi: (w) => isNomorHpValid(w.nomorWhatsapp) },
];

export function hitungRincianWarga(aktif: StatistikWargaSlice[]): RincianWarga {
  const piramida = PITA_UMUR.map((awal, i) => ({
    label: i === PITA_UMUR.length - 1 ? `${awal}+` : `${awal}–${awal + 4}`,
    laki: 0,
    perempuan: 0,
  }));
  const kegiatan = new Map<string, number>();
  const jenis = new Map<string, number>();
  const pendidikan = new Map<string, number>();
  const umurList: number[] = [];
  let anak = 0, produktif = 0, lansia = 0, laki = 0, perempuan = 0;
  const kelengkapan = KOLOM_KELENGKAPAN.map((k) => ({ label: k.label, terisi: 0, total: 0 }));

  for (const w of aktif) {
    const umur = getWargaAge(w.tanggalLahir);
    if (w.jenisKelamin === "Laki-laki") laki++;
    else if (w.jenisKelamin === "Perempuan") perempuan++;
    if (umur !== null) {
      umurList.push(umur);
      const pita = piramida.find((p) => p.label === pitaUmur(umur))!;
      if (w.jenisKelamin === "Laki-laki") pita.laki++;
      else if (w.jenisKelamin === "Perempuan") pita.perempuan++;
      if (umur < 15) anak++;
      else if (umur < 65) produktif++;
      else lansia++;
    }
    tambah(kegiatan, kegiatanWarga(w));
    const j = jenisPekerjaanWarga(w);
    if (j) tambah(jenis, j);
    const p = pendidikanWarga(w, umur);
    if (p) tambah(pendidikan, p);
    KOLOM_KELENGKAPAN.forEach((k, i) => {
      if (!k.berlaku(w, umur)) return;
      kelengkapan[i].total++;
      if (k.terisi(w, umur)) kelengkapan[i].terisi++;
    });
  }

  const jenisUrut = Array.from(jenis.entries())
    .filter(([label]) => label !== "Lainnya")
    .map(([label, jumlah]) => ({ label, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
  const sisa = (jenis.get("Lainnya") ?? 0) + jenisUrut.slice(8).reduce((s, j) => s + j.jumlah, 0);
  const jenisPekerjaan = sisa ? [...jenisUrut.slice(0, 8), { label: "Lainnya", jumlah: sisa }] : jenisUrut;

  umurList.sort((a, b) => a - b);
  const tengah = umurList.length >> 1;
  const medianUmur = !umurList.length
    ? null
    : umurList.length % 2
      ? umurList[tengah]
      : Math.round(((umurList[tengah - 1] + umurList[tengah]) / 2) * 10) / 10;

  return {
    piramida,
    kegiatan: urutkan(kegiatan, URUTAN_KEGIATAN),
    jenisPekerjaan,
    pendidikan: urutkan(pendidikan, URUTAN_PENDIDIKAN),
    indeks: {
      rasioKetergantungan: rasio(anak + lansia, produktif),
      indeksPenuaan: rasio(lansia, anak),
      rasioJenisKelamin: rasio(laki, perempuan),
      medianUmur,
    },
    kelengkapan,
  };
}

function angkaKosong(): AngkaWarga {
  return {
    kk: 0, warga: 0, lakiLaki: 0, perempuan: 0, rataAnggota: 0,
    umur: { balita: 0, anak: 0, produktif: 0, lansia: 0, belum: 0 },
    pengangguran: 0, angkatanKerjaEligible: 0, tingkatPengangguran: 0,
    pindah: 0, meninggal: 0,
    kkTanpaAnggotaAktif: 0, kkTanpaWa: 0, kkLansiaSendiri: 0, kkBansos: 0,
    singgah: 0, izinSinggah: 0, izinSegeraHabis: 0,
  };
}

const persen = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function hitungStatistikWarga(
  semuaKk: StatistikKkSlice[],
  semuaWarga: StatistikWargaSlice[],
  singgah: SinggahPerRt[] = [],
): StatistikWarga {
  const rtList: number[] = [...ACTIVE_RT_NUMBERS];
  const kkList = semuaKk.filter((k) => rtList.includes(k.rt));
  const rtKk = new Map(kkList.map((k) => [k.id, k.rt]));
  const perRt = new Map<number, AngkaWarga>(rtList.map((rt) => [rt, angkaKosong()]));
  const total = angkaKosong();
  const kategoriUmur = {} as Record<KategoriUmurId, number>;
  const anggotaAktif = new Map<number, StatistikWargaSlice[]>();
  const aktifPerRt = new Map<number, StatistikWargaSlice[]>(rtList.map((rt) => [rt, []]));

  for (const w of semuaWarga) {
    const rt = rtKk.get(w.kkId);
    if (rt == null) continue;
    const target = [total, perRt.get(rt)!];
    if (!isWargaTerhitung(w)) {
      const kunci = w.statusKependudukan === "Meninggal" ? "meninggal" : w.statusKependudukan === "Pindah" ? "pindah" : null;
      if (kunci) for (const t of target) t[kunci]++;
      continue;
    }
    anggotaAktif.set(w.kkId, [...(anggotaAktif.get(w.kkId) ?? []), w]);
    aktifPerRt.get(rt)!.push(w);
    const kategori = getEffectiveKategoriUmur(w);
    kategoriUmur[kategori] = (kategoriUmur[kategori] ?? 0) + 1;
    const kelompok = kelompokUmurRingkas(kategori);
    const eligible = isKategoriEligiblePengangguran(w);
    const nganggur = isWargaPengangguran(w);
    for (const t of target) {
      t.warga++;
      if (w.jenisKelamin === "Laki-laki") t.lakiLaki++;
      else if (w.jenisKelamin === "Perempuan") t.perempuan++;
      t.umur[kelompok]++;
      if (eligible) t.angkatanKerjaEligible++;
      if (nganggur) t.pengangguran++;
    }
  }

  for (const k of kkList) {
    const target = [total, perRt.get(k.rt)!];
    const anggota = anggotaAktif.get(k.id) ?? [];
    const lansiaSendiri = anggota.length === 1 && kelompokUmurRingkas(getEffectiveKategoriUmur(anggota[0])) === "lansia";
    const tanpaWa = anggota.length > 0 && !anggota.some((a) => isNomorHpValid(a.nomorWhatsapp));
    for (const t of target) {
      t.kk++;
      if (!anggota.length) t.kkTanpaAnggotaAktif++;
      if (tanpaWa) t.kkTanpaWa++;
      if (lansiaSendiri) t.kkLansiaSendiri++;
      if (k.penerimaBansos) t.kkBansos++;
    }
  }

  for (const s of singgah) {
    const t = perRt.get(s.rt);
    if (!t) continue;
    for (const x of [total, t]) {
      x.singgah += s.orang;
      x.izinSinggah += s.izin;
      x.izinSegeraHabis += s.segeraHabis;
    }
  }

  for (const t of [total, ...Array.from(perRt.values())]) {
    t.rataAnggota = t.kk > 0 ? Math.round((t.warga / t.kk) * 10) / 10 : 0;
    t.tingkatPengangguran = persen(t.pengangguran, t.angkatanKerjaEligible);
  }

  const daftarRt = rtList.map((rt) => ({ rt, ...perRt.get(rt)! }));
  return {
    generatedAt: new Date().toISOString(),
    aturan: { rt: rtList, status: STATUS_WARGA_TERHITUNG, umur: "kategori umur RW 03 (balita 0–5, lansia 60+)" },
    total,
    perRt: daftarRt,
    kategoriUmur,
    sorotan: buatSorotan(total, daftarRt),
    rincian: {
      total: hitungRincianWarga(Array.from(aktifPerRt.values()).flat()),
      perRt: Object.fromEntries(rtList.map((rt) => [rt, hitungRincianWarga(aktifPerRt.get(rt)!)])),
    },
  };
}

const rt2 = (rt: number) => `RT ${String(rt).padStart(2, "0")}`;

function buatSorotan(total: AngkaWarga, perRt: (AngkaWarga & { rt: number })[]): StatistikWarga["sorotan"] {
  const hasil: StatistikWarga["sorotan"] = [];
  const isi = perRt.filter((r) => r.warga > 0);

  const nganggur = [...isi].sort((a, b) => b.tingkatPengangguran - a.tingkatPengangguran)[0];
  if (nganggur && nganggur.pengangguran > 0 && nganggur.tingkatPengangguran > total.tingkatPengangguran) {
    hasil.push({
      tingkat: nganggur.tingkatPengangguran >= 15 ? "tinggi" : "sedang",
      rt: nganggur.rt,
      teks: `Pengangguran tertinggi di ${rt2(nganggur.rt)}: ${nganggur.pengangguran} orang (${nganggur.tingkatPengangguran}%, rata-rata RW ${total.tingkatPengangguran}%). Prioritas info loker/pelatihan.`,
    });
  }
  if (total.kkLansiaSendiri > 0) {
    const rt = isi.filter((r) => r.kkLansiaSendiri > 0).map((r) => `${rt2(r.rt)} (${r.kkLansiaSendiri})`).join(", ");
    hasil.push({ tingkat: "tinggi", teks: `${total.kkLansiaSendiri} lansia tinggal sendiri — ${rt}. Perlu kunjungan rutin.` });
  }
  const lansia = [...isi].sort((a, b) => persen(b.umur.lansia, b.warga) - persen(a.umur.lansia, a.warga))[0];
  if (lansia && lansia.umur.lansia > 0) {
    hasil.push({ tingkat: "info", rt: lansia.rt, teks: `Proporsi lansia terbesar di ${rt2(lansia.rt)}: ${lansia.umur.lansia} orang (${persen(lansia.umur.lansia, lansia.warga)}%). Sasaran posbindu/kesehatan lansia.` });
  }
  const balita = [...isi].sort((a, b) => b.umur.balita - a.umur.balita)[0];
  if (balita && balita.umur.balita > 0) {
    hasil.push({ tingkat: "info", rt: balita.rt, teks: `Balita terbanyak di ${rt2(balita.rt)}: ${balita.umur.balita} anak. Sasaran posyandu.` });
  }
  if (total.umur.belum > 0) {
    hasil.push({ tingkat: "sedang", teks: `${total.umur.belum} warga belum punya tanggal lahir — kelompok umur & pengangguran belum akurat.` });
  }
  if (total.kkTanpaWa > 0) {
    hasil.push({ tingkat: "sedang", teks: `${total.kkTanpaWa} KK tanpa nomor WhatsApp satu pun — tidak terjangkau pengumuman.` });
  }
  if (total.kkTanpaAnggotaAktif > 0) {
    hasil.push({ tingkat: "sedang", teks: `${total.kkTanpaAnggotaAktif} KK tidak punya anggota aktif (semua pindah/meninggal/kosong) — perlu dirapikan.` });
  }
  if (total.izinSegeraHabis > 0) {
    hasil.push({ tingkat: "sedang", teks: `${total.izinSegeraHabis} izin Visit RW3 habis dalam 30 hari — ingatkan perpanjangan.` });
  }
  return hasil;
}

// ---------------------------------------------------------------------------
// Daftar orang/KK di balik setiap kartu angka — aturan sama dengan hitungStatistikWarga.
// ---------------------------------------------------------------------------

export const KATEGORI_DAFTAR = {
  warga: { judul: "Warga aktif", satuan: "orang" },
  kk: { judul: "Kartu keluarga", satuan: "KK" },
  pengangguran: { judul: "Pengangguran", satuan: "orang" },
  balita: { judul: "Balita (0–5)", satuan: "orang" },
  anak: { judul: "Anak & pelajar (6–18)", satuan: "orang" },
  produktif: { judul: "Usia produktif (19–59)", satuan: "orang" },
  lansia: { judul: "Lansia (60+)", satuan: "orang" },
  belum: { judul: "Usia belum diisi", satuan: "orang" },
  lansiaSendiri: { judul: "Lansia tinggal sendiri", satuan: "KK" },
  tanpaWa: { judul: "KK tanpa WhatsApp", satuan: "KK" },
  bansos: { judul: "KK penerima bansos", satuan: "KK" },
  keluar: { judul: "Pindah / meninggal", satuan: "orang" },
  singgah: { judul: "Warga singgah (Visit RW3)", satuan: "orang" },
  belumDiisi: { judul: "Keluarga belum diisi standar data", satuan: "KK" },
  perhatian: { judul: "KK perlu perhatian", satuan: "KK" },
  kelengkapan: { judul: "KK yang datanya belum lengkap", satuan: "KK" },
  kegiatan: { judul: "Kegiatan utama", satuan: "orang" },
  pekerjaan: { judul: "Jenis pekerjaan", satuan: "orang" },
  pendidikan: { judul: "Pendidikan terakhir", satuan: "orang" },
  kolomKosong: { judul: "Belum diisi", satuan: "orang" },
  pita: { judul: "Kelompok umur", satuan: "orang" },
} as const;

export type KategoriDaftar = keyof typeof KATEGORI_DAFTAR;

/** Kategori yang memerlukan `nilai` (label batang grafik yang diklik). */
export const KATEGORI_BERNILAI = ["kegiatan", "pekerjaan", "pendidikan", "kolomKosong", "pita"] as const;
export type KategoriBernilai = (typeof KATEGORI_BERNILAI)[number];
export const perluNilai = (k: KategoriDaftar): k is KategoriBernilai => (KATEGORI_BERNILAI as readonly string[]).includes(k);

/** Yang dibuka dari dashboard: kategori kartu, plus nilai bila dari batang grafik. */
export type PilihanDaftar = { kategori: KategoriDaftar; nilai?: string };

/** Judul daftar, mis. "Pendidikan terakhir: SLTA/Sederajat". */
export function judulDaftar(kategori: KategoriDaftar, nilai?: string | null): string {
  const dasar = KATEGORI_DAFTAR[kategori].judul;
  if (!nilai) return dasar;
  if (kategori === "kolomKosong") return `${nilai} belum diisi`;
  if (kategori === "pita") {
    const [pita, jk] = nilai.split("|");
    return `Umur ${pita} th${jk ? ` · ${jk}` : ""}`;
  }
  return `${dasar}: ${nilai}`;
}

export function isKategoriDaftar(v: unknown): v is KategoriDaftar {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(KATEGORI_DAFTAR, v);
}

export interface OrangDaftar {
  /** id warga, atau id KK untuk kategori ber-satuan KK. */
  id: number;
  kkId: number | null;
  rt: number;
  nama: string;
  keterangan: string;
  alamat: string | null;
  /** Nomor 08… yang bisa dihubungi; null bila tidak ada di keluarga. */
  wa: string | null;
  /** Diisi bila nomor milik anggota keluarga lain, mis. "WA keluarga: Siti". */
  waMilik: string | null;
}

export interface DaftarKategori {
  kategori: KategoriDaftar;
  nilai: string | null;
  judul: string;
  satuan: "orang" | "KK";
  rt: number | null;
  daftar: OrangDaftar[];
}

const PRIORITAS_KONTAK = ["Kepala Keluarga", "Istri", "Suami"];

function kontakKeluarga(anggota: StatistikWargaSlice[], kecuali?: StatistikWargaSlice) {
  const urut = [...anggota].sort((a, b) => {
    const pa = PRIORITAS_KONTAK.indexOf(a.kedudukanKeluarga ?? "");
    const pb = PRIORITAS_KONTAK.indexOf(b.kedudukanKeluarga ?? "");
    return (pa < 0 ? 9 : pa) - (pb < 0 ? 9 : pb);
  });
  const ada = urut.find((a) => a !== kecuali && isNomorHpValid(a.nomorWhatsapp));
  return ada ? { wa: normalizeNomorHp(ada.nomorWhatsapp), nama: ada.namaLengkap ?? "anggota keluarga" } : null;
}

function keteranganOrang(w: StatistikWargaSlice, tambahan?: string | null): string {
  const umur = getWargaAge(w.tanggalLahir);
  return [w.kedudukanKeluarga, w.jenisKelamin, umur != null ? `${umur} th` : "umur belum diisi", tambahan].filter(Boolean).join(" · ");
}

/**
 * Orang/KK yang dihitung pada kartu `kategori` (kecuali singgah & standar data, yang diambil server dari tabel lain).
 * `rt` kosong = seluruh RT aktif.
 */
export function daftarKategoriWarga(
  kategori: Exclude<KategoriDaftar, "singgah" | "belumDiisi" | "perhatian" | "kelengkapan">,
  semuaKk: StatistikKkSlice[],
  semuaWarga: StatistikWargaSlice[],
  rt?: number | null,
  nilai?: string | null,
): OrangDaftar[] {
  const rtList: number[] = [...ACTIVE_RT_NUMBERS];
  const kkList = semuaKk.filter((k) => rtList.includes(k.rt) && (rt == null || k.rt === rt));
  const kkById = new Map(kkList.map((k) => [k.id, k]));
  const anggotaAktif = new Map<number, StatistikWargaSlice[]>();
  for (const w of semuaWarga) {
    if (!kkById.has(w.kkId) || !isWargaTerhitung(w)) continue;
    anggotaAktif.set(w.kkId, [...(anggotaAktif.get(w.kkId) ?? []), w]);
  }

  const orang = (w: StatistikWargaSlice, tambahan?: string | null): OrangDaftar => {
    const kk = kkById.get(w.kkId)!;
    const sendiri = isNomorHpValid(w.nomorWhatsapp) ? normalizeNomorHp(w.nomorWhatsapp) : null;
    const keluarga = sendiri ? null : kontakKeluarga(anggotaAktif.get(w.kkId) ?? [], w);
    return {
      id: w.id ?? 0, kkId: w.kkId, rt: kk.rt, nama: w.namaLengkap ?? "—", keterangan: keteranganOrang(w, tambahan),
      alamat: kk.alamat ?? null, wa: sendiri ?? keluarga?.wa ?? null, waMilik: keluarga ? `WA keluarga: ${keluarga.nama}` : null,
    };
  };

  const keluarga = (k: StatistikKkSlice, tambahan?: string): OrangDaftar => {
    const anggota = anggotaAktif.get(k.id) ?? [];
    const kepala = anggota.find((a) => a.kedudukanKeluarga === "Kepala Keluarga") ?? anggota[0];
    const kontak = kontakKeluarga(anggota);
    const milikKepala = kontak && kepala && kontak.nama === kepala.namaLengkap;
    return {
      id: k.id, kkId: k.id, rt: k.rt, nama: kepala?.namaLengkap ?? "KK tanpa anggota aktif",
      keterangan: [`${anggota.length} anggota aktif`, tambahan].filter(Boolean).join(" · "),
      alamat: k.alamat ?? null, wa: kontak?.wa ?? null, waMilik: kontak && !milikKepala ? `WA: ${kontak.nama}` : null,
    };
  };

  let hasil: OrangDaftar[];
  if (kategori === "kk" || kategori === "lansiaSendiri" || kategori === "tanpaWa" || kategori === "bansos") {
    hasil = kkList
      .filter((k) => {
        const anggota = anggotaAktif.get(k.id) ?? [];
        if (kategori === "lansiaSendiri") return anggota.length === 1 && kelompokUmurRingkas(getEffectiveKategoriUmur(anggota[0])) === "lansia";
        if (kategori === "tanpaWa") return anggota.length > 0 && !anggota.some((a) => isNomorHpValid(a.nomorWhatsapp));
        if (kategori === "bansos") return !!k.penerimaBansos;
        return true;
      })
      .map((k) => keluarga(k));
  } else if (kategori === "keluar") {
    hasil = semuaWarga
      .filter((w) => kkById.has(w.kkId) && (w.statusKependudukan === "Pindah" || w.statusKependudukan === "Meninggal"))
      .map((w) => orang(w, w.statusKependudukan));
  } else if (perluNilai(kategori)) {
    const aktif = Array.from(anggotaAktif.values()).flat();
    const umurDari = (w: StatistikWargaSlice) => getWargaAge(w.tanggalLahir);
    let cocok: (w: StatistikWargaSlice) => boolean;
    let tambahan: (w: StatistikWargaSlice) => string | null = () => null;
    if (kategori === "kegiatan") {
      cocok = (w) => kegiatanWarga(w) === nilai;
      tambahan = (w) => w.pekerjaan || w.statusPekerjaan || null;
    } else if (kategori === "pekerjaan") {
      // Grafik menampilkan 8 jenis terbanyak; sisanya digabung ke "Lainnya".
      const hitung = new Map<string, number>();
      for (const w of aktif) { const j = jenisPekerjaanWarga(w); if (j) tambah(hitung, j); }
      const teratas = new Set(Array.from(hitung.entries()).filter(([l]) => l !== "Lainnya").sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l]) => l));
      cocok = (w) => {
        const j = jenisPekerjaanWarga(w);
        if (!j) return false;
        return nilai === "Lainnya" ? !teratas.has(j) : j === nilai;
      };
      tambahan = (w) => w.pekerjaan || null;
    } else if (kategori === "pendidikan") {
      cocok = (w) => pendidikanWarga(w, umurDari(w)) === nilai;
      tambahan = (w) => w.pendidikan || null;
    } else if (kategori === "kolomKosong") {
      const kolom = KOLOM_KELENGKAPAN.find((k) => k.label === nilai);
      cocok = (w) => !!kolom && kolom.berlaku(w, umurDari(w)) && !kolom.terisi(w, umurDari(w));
    } else {
      const [pita, jk] = (nilai ?? "").split("|");
      cocok = (w) => {
        const u = umurDari(w);
        return u !== null && pitaUmur(u) === pita && (!jk || w.jenisKelamin === jk);
      };
    }
    hasil = aktif.filter(cocok).map((w) => orang(w, tambahan(w)));
  } else {
    hasil = Array.from(anggotaAktif.values()).flat()
      .filter((w) => {
        if (kategori === "warga") return true;
        if (kategori === "pengangguran") return isWargaPengangguran(w);
        return kelompokUmurRingkas(getEffectiveKategoriUmur(w)) === kategori;
      })
      .map((w) => orang(w, kategori === "pengangguran" ? (w.statusPekerjaan || w.pekerjaan || null) : null));
  }
  return hasil.sort((a, b) => a.rt - b.rt || a.nama.localeCompare(b.nama, "id"));
}
