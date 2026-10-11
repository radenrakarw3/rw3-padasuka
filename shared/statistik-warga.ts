/**
 * Statistik warga satu pintu — dipakai Dashboard RW dan Kependudukan agar angkanya sama.
 * Aturan: KK RT 01–04, warga berstatus «Aktif», kelompok umur dari kategori-umur.
 */
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { getEffectiveKategoriUmur, isKategoriEligiblePengangguran, type KategoriUmurId } from "@shared/kategori-umur";
import { isWargaPengangguran } from "@shared/pekerjaan-labor";
import { isNomorHpValid } from "@shared/kontak";

export const STATUS_WARGA_TERHITUNG = "Aktif";

export function isWargaTerhitung(w: { statusKependudukan?: string | null }): boolean {
  return (w.statusKependudukan ?? STATUS_WARGA_TERHITUNG) === STATUS_WARGA_TERHITUNG;
}

export const KELOMPOK_UMUR_RINGKAS = [
  { id: "balita", label: "Balita", keterangan: "0–5 th", kategori: ["0-5"] },
  { id: "anak", label: "Anak & pelajar", keterangan: "6–18 th", kategori: ["6", "7-18"] },
  { id: "produktif", label: "Usia produktif", keterangan: "19–64 th", kategori: ["19-25", "26-40", "41-55", "56-64"] },
  { id: "lansia", label: "Lansia", keterangan: "65+ th", kategori: ["65+"] },
  { id: "belum", label: "Usia belum diisi", keterangan: "tanggal lahir kosong", kategori: ["belum_diisi"] },
] as const satisfies readonly { id: string; label: string; keterangan: string; kategori: readonly KategoriUmurId[] }[];

export type KelompokUmurRingkasId = (typeof KELOMPOK_UMUR_RINGKAS)[number]["id"];

export function kelompokUmurRingkas(kategori: KategoriUmurId): KelompokUmurRingkasId {
  return KELOMPOK_UMUR_RINGKAS.find((k) => (k.kategori as readonly string[]).includes(kategori))!.id;
}

export type StatistikKkSlice = {
  id: number;
  rt: number;
  penerimaBansos?: boolean | null;
};

export type StatistikWargaSlice = {
  kkId: number;
  statusKependudukan?: string | null;
  jenisKelamin?: string | null;
  tanggalLahir?: string | null;
  kategoriUmur?: string | null;
  pekerjaan?: string | null;
  statusPekerjaan?: string | null;
  nomorWhatsapp?: string | null;
  kedudukanKeluarga?: string | null;
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
    const lansiaSendiri = anggota.length === 1 && getEffectiveKategoriUmur(anggota[0]) === "65+";
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
    aturan: { rt: rtList, status: STATUS_WARGA_TERHITUNG, umur: "kategori umur RW 03 (balita 0–5, lansia 65+)" },
    total,
    perRt: daftarRt,
    kategoriUmur,
    sorotan: buatSorotan(total, daftarRt),
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
