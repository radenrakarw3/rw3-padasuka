/**
 * Registri kategori Rekap Warga — dasar matriks kondisi wilayah dan daftar cetak verifikasi RT.
 * Satu fungsi `cocok` per kategori dipakai untuk jumlah DAN daftar, jadi angkanya selalu sama.
 * Data masuk sudah berupa nilai efektif (shared/warga-efektif.ts); umur dihitung per hari ini.
 */
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { maskNik, isNomorHpValid } from "@shared/kontak";
import { getEffectiveKategoriUmur } from "@shared/kategori-umur";
import { isWargaPengangguran } from "@shared/pekerjaan-labor";
import { getWargaAge } from "@shared/warga-form-tier";
import { penghasilanKeStandar } from "@shared/wilayah-induk";
import { STANDAR_AWAL, labelNilaiFakta } from "@shared/wilayah";
import { teksSumber } from "@shared/warga-efektif";
import { detectWargaDataIssues, summarizeWargaIssues } from "@shared/warga-data-issues";
import {
  isWargaTerhitung,
  kegiatanWarga,
  kelompokUmurRingkas,
  pendidikanWarga,
  type KategoriDaftar,
  type StatistikKkSlice,
  type StatistikWargaSlice,
} from "@shared/statistik-warga";

export const KELOMPOK_REKAP = ["Ekonomi", "Umur", "Pendidikan", "Kesehatan", "Kerentanan", "Kualitas data"] as const;
export type KelompokRekap = (typeof KELOMPOK_REKAP)[number];

export type KkRekap = StatistikKkSlice & { penghasilanBulanan?: string | null };

export interface KonteksWarga {
  umur: number | null;
  kk: KkRekap;
}

export interface KonteksKk {
  anggota: StatistikWargaSlice[];
}

type DasarKategori = {
  id: string;
  kelompok: KelompokRekap;
  judul: string;
  /** Dicetak di lembar agar RT tahu aturan yang dipakai. */
  definisi: string;
  /** Judul kolom nilai di tabel cetak. */
  labelNilai: string;
};

/** `cocok` mengembalikan teks nilai bila masuk kategori, atau null bila tidak. */
export type KategoriRekap = DasarKategori &
  (
    | { satuan: "orang"; cocok: (w: StatistikWargaSlice, c: KonteksWarga) => string | null }
    | { satuan: "KK"; cocok: (k: KkRekap, c: KonteksKk) => string | null }
  );

const defStandar = new Map(STANDAR_AWAL.map((d) => [d.kunci, d]));
const fakta = (x: { fakta?: Record<string, { nilai: string }> }, kunci: string) => x.fakta?.[kunci]?.nilai ?? null;
const labelFakta = (kunci: string, nilai: string | null) => labelNilaiFakta(defStandar.get(kunci), nilai);
const banyak = (nilai: string | null) => (nilai ? nilai.split(",").map((s) => s.trim()).filter(Boolean) : []);

const LABEL_BANSOS: Record<string, string> = { pkh: "PKH", bpnt: "BPNT/Sembako", blt: "BLT", pbi: "BPJS PBI", pip: "PIP/KIP", lainnya: "Bantuan lain" };

function statusKerjaTeks(w: StatistikWargaSlice): string {
  const s = w.statusPekerjaan?.trim();
  if (s === "Mencari Kerja") return "Mencari kerja";
  const p = w.pekerjaan?.trim();
  if (s === "Belum Bekerja" || p === "Belum/Tidak Bekerja") return "Belum / tidak bekerja";
  return p ? `Belum/tidak bekerja (${p})` : "Pekerjaan belum diisi";
}

export const KATEGORI_REKAP: KategoriRekap[] = [
  // --- Ekonomi ---
  {
    id: "pengangguran", kelompok: "Ekonomi", judul: "Pengangguran (usia 19–64)", satuan: "orang", labelNilai: "Status",
    definisi: "Usia 19–64 berstatus mencari kerja atau belum/tidak bekerja. Pelajar, ibu rumah tangga, dan pensiunan tidak termasuk. Usia belum diisi ikut dihitung.",
    cocok: (w) => (isWargaPengangguran(w) ? `${statusKerjaTeks(w)} · ${teksSumber(w.sumber?.pekerjaan)}` : null),
  },
  {
    id: "bekerja", kelompok: "Ekonomi", judul: "Warga bekerja", satuan: "orang", labelNilai: "Pekerjaan",
    definisi: "Kegiatan utama bekerja (karyawan, wiraswasta, buruh, dll.).",
    cocok: (w) => (kegiatanWarga(w) === "Bekerja" ? w.pekerjaan?.trim() || "Jenis belum diisi" : null),
  },
  {
    id: "irt", kelompok: "Ekonomi", judul: "Ibu rumah tangga", satuan: "orang", labelNilai: "Kegiatan",
    definisi: "Kegiatan utama mengurus rumah tangga.",
    cocok: (w) => (kegiatanWarga(w) === "Ibu Rumah Tangga" ? "Mengurus rumah tangga" : null),
  },
  {
    id: "pensiun", kelompok: "Ekonomi", judul: "Pensiunan", satuan: "orang", labelNilai: "Kegiatan",
    definisi: "Kegiatan utama pensiun.",
    cocok: (w) => (kegiatanWarga(w) === "Pensiun" ? "Pensiun" : null),
  },
  {
    id: "penghasilan_rendah", kelompok: "Ekonomi", judul: "KK penghasilan < Rp1 juta / tidak tentu", satuan: "KK", labelNilai: "Penghasilan",
    definisi: "Penghasilan keluarga per bulan kurang dari Rp1 juta atau tidak tentu (serabutan).",
    cocok: (k) => {
      const v = fakta(k, "s_penghasilan") ?? penghasilanKeStandar(k.penghasilanBulanan);
      return v === "kurang_1jt" || v === "tidak_tentu" ? labelFakta("s_penghasilan", v) : null;
    },
  },
  {
    id: "kk_bansos", kelompok: "Ekonomi", judul: "KK penerima bansos", satuan: "KK", labelNilai: "Jenis bantuan",
    definisi: "Keluarga yang sedang menerima bantuan sosial (PKH, BPNT, BLT, PBI, PIP, dll.).",
    cocok: (k) => (k.penerimaBansos ? (k.bansos ?? []).map((b) => LABEL_BANSOS[b] ?? b).join(", ") || "Jenis belum diisi" : null),
  },
  {
    id: "layak_belum_bansos", kelompok: "Ekonomi", judul: "KK layak bansos, belum menerima", satuan: "KK", labelNilai: "Keterangan",
    definisi: "Ditandai layak bansos oleh pengurus, tetapi belum tercatat menerima bantuan.",
    cocok: (k) => (k.layakBansos && !k.penerimaBansos ? "Layak, belum menerima" : null),
  },

  // --- Umur ---
  {
    id: "balita", kelompok: "Umur", judul: "Balita (0–5)", satuan: "orang", labelNilai: "Umur",
    definisi: "Umur 0–5 tahun per tanggal cetak. Sasaran posyandu.",
    cocok: (w, c) => (kelompokUmurRingkas(getEffectiveKategoriUmur(w)) === "balita" ? `${c.umur} th` : null),
  },
  {
    id: "anak_sekolah", kelompok: "Umur", judul: "Anak usia sekolah (7–18)", satuan: "orang", labelNilai: "Status sekolah",
    definisi: "Umur 7–18 tahun per tanggal cetak.",
    cocok: (w, c) => (c.umur !== null && c.umur >= 7 && c.umur <= 18 ? (fakta(w, "s_status_sekolah") ? labelFakta("s_status_sekolah", fakta(w, "s_status_sekolah")) : "Belum diketahui") : null),
  },
  {
    id: "lansia", kelompok: "Umur", judul: "Lansia (60+)", satuan: "orang", labelNilai: "Umur",
    definisi: "Umur 60 tahun ke atas per tanggal cetak (UU 13/1998). Sasaran posyandu lansia.",
    cocok: (w, c) => (kelompokUmurRingkas(getEffectiveKategoriUmur(w)) === "lansia" ? `${c.umur} th` : null),
  },
  {
    id: "lansia_sendiri", kelompok: "Umur", judul: "Lansia tinggal sendiri", satuan: "KK", labelNilai: "Umur",
    definisi: "KK dengan satu anggota aktif berumur 60+.",
    cocok: (_k, c) => {
      if (c.anggota.length !== 1 || kelompokUmurRingkas(getEffectiveKategoriUmur(c.anggota[0])) !== "lansia") return null;
      return `${getWargaAge(c.anggota[0].tanggalLahir)} th`;
    },
  },
  {
    id: "wajib_ektp", kelompok: "Umur", judul: "Baru berumur 17 (wajib e-KTP)", satuan: "orang", labelNilai: "Status e-KTP",
    definisi: "Umur tepat 17 tahun per tanggal cetak — wajib rekam e-KTP.",
    cocok: (w, c) => (c.umur === 17 ? w.statusEktp?.trim() || "Belum tercatat" : null),
  },

  // --- Pendidikan ---
  {
    id: "tidak_sekolah", kelompok: "Pendidikan", judul: "Anak 7–18 tidak sekolah", satuan: "orang", labelNilai: "Pendidikan terakhir",
    definisi: "Umur 7–18 tahun yang tercatat tidak sekolah di Standar data.",
    cocok: (w, c) => (c.umur !== null && c.umur >= 7 && c.umur <= 18 && fakta(w, "s_status_sekolah") === "tidak_sekolah" ? w.pendidikan?.trim() || "Belum diisi" : null),
  },
  {
    id: "pendidikan_rendah", kelompok: "Pendidikan", judul: "Pendidikan SD ke bawah (19+)", satuan: "orang", labelNilai: "Pendidikan terakhir",
    definisi: "Umur 19+ dengan pendidikan terakhir tamat SD, tidak tamat SD, atau belum sekolah.",
    cocok: (w, c) => {
      const p = pendidikanWarga(w, c.umur);
      return p === "Belum Sekolah" || p === "Tidak/Belum Tamat SD" || p === "Tamat SD/Sederajat" ? p : null;
    },
  },
  {
    id: "pendidikan", kelompok: "Pendidikan", judul: "Pendidikan terakhir (19+)", satuan: "orang", labelNilai: "Pendidikan terakhir",
    definisi: "Semua warga 19+ beserta pendidikan terakhirnya. Saring per jenjang sebelum mencetak.",
    cocok: (w, c) => pendidikanWarga(w, c.umur),
  },

  // --- Kesehatan ---
  {
    id: "disabilitas", kelompok: "Kesehatan", judul: "Penyandang disabilitas", satuan: "orang", labelNilai: "Jenis",
    definisi: "Tercatat memiliki disabilitas (Standar data, atau data lama bila belum ada jawaban).",
    cocok: (w) => {
      const s = w.statusDisabilitas?.trim();
      return s && s !== "Tidak Ada" ? s : null;
    },
  },
  {
    id: "penyakit", kelompok: "Kesehatan", judul: "Penyakit menahun", satuan: "orang", labelNilai: "Penyakit",
    definisi: "Sakit menahun yang sudah dinyatakan dokter/puskesmas.",
    cocok: (w) => {
      const v = fakta(w, "s_penyakit");
      if (v) return banyak(v).includes("tidak_ada") ? null : labelFakta("s_penyakit", v);
      return w.punyaPenyakitKronis ? w.penyakitKronis?.trim() || "Ada (jenis belum diisi)" : null;
    },
  },
  {
    id: "hamil", kelompok: "Kesehatan", judul: "Ibu hamil", satuan: "orang", labelNilai: "Umur",
    definisi: "Perempuan yang tercatat sedang hamil. Cek ulang bila catatan sudah lebih dari 9 bulan.",
    cocok: (w, c) => {
      const v = fakta(w, "s_hamil");
      const hamil = v ? v === "ya" : !!w.ibuHamil;
      if (!hamil) return null;
      const sejak = w.fakta?.s_hamil?.mulai;
      return [c.umur != null ? `${c.umur} th` : null, sejak ? `dicatat ${sejak}` : null].filter(Boolean).join(" · ") || "Hamil";
    },
  },
  {
    id: "tanpa_jaminan", kelompok: "Kesehatan", judul: "Tanpa jaminan kesehatan", satuan: "orang", labelNilai: "Jaminan",
    definisi: "Tercatat tidak punya BPJS/asuransi di Standar data.",
    cocok: (w) => (fakta(w, "s_jaminan_kesehatan") === "tidak_punya" ? "Tidak punya" : null),
  },

  // --- Kerentanan ---
  {
    id: "yatim", kelompok: "Kerentanan", judul: "Anak yatim / piatu", satuan: "orang", labelNilai: "Status",
    definisi: "Anak umur 18 ke bawah yang yatim, piatu, atau yatim piatu.",
    cocok: (w, c) => {
      if (c.umur !== null && c.umur > 18) return null;
      const v = fakta(w, "s_yatim");
      if (v) return v === "tidak" ? null : labelFakta("s_yatim", v);
      return w.anakYatimPiatu ? "Yatim/piatu" : null;
    },
  },
  {
    id: "rawan_pangan", kelompok: "Kerentanan", judul: "KK pernah kekurangan makan", satuan: "KK", labelNilai: "Keterangan",
    definisi: "Dalam 3 bulan terakhir pernah kekurangan makan (Standar data).",
    cocok: (k) => (fakta(k, "s_rawan_pangan") === "ya" ? "Pernah kekurangan makan" : null),
  },
  {
    id: "rumah_rusak", kelompok: "Kerentanan", judul: "Rumah rusak berat", satuan: "KK", labelNilai: "Kondisi",
    definisi: "Kondisi rumah rusak berat / tidak layak huni (Standar data).",
    cocok: (k) => (fakta(k, "s_kondisi_rumah") === "rusak_berat" ? labelFakta("s_kondisi_rumah", "rusak_berat") : null),
  },
  {
    id: "jamban_tidak_layak", kelompok: "Kerentanan", judul: "Jamban tidak layak", satuan: "KK", labelNilai: "Jamban",
    definisi: "WC tanpa septic tank atau tidak punya WC (Standar data).",
    cocok: (k) => {
      const v = fakta(k, "s_jamban");
      return v === "sendiri_tanpa" || v === "tidak_ada" ? labelFakta("s_jamban", v) : null;
    },
  },

  // --- Kualitas data ---
  {
    id: "tanpa_tanggal_lahir", kelompok: "Kualitas data", judul: "Tanggal lahir kosong", satuan: "orang", labelNilai: "Tercatat",
    definisi: "Tanggal lahir kosong atau tidak valid — umur, lansia, dan pengangguran tidak bisa dihitung tepat.",
    cocok: (w, c) => (c.umur === null ? w.tanggalLahir?.trim() || "Kosong" : null),
  },
  {
    id: "nik_tidak_valid", kelompok: "Kualitas data", judul: "NIK tidak 16 digit", satuan: "orang", labelNilai: "NIK tercatat",
    definisi: "NIK kosong atau bukan 16 angka.",
    cocok: (w) => (/^\d{16}$/.test((w.nik ?? "").trim()) ? null : `${(w.nik ?? "").replace(/\D/g, "").length} digit`),
  },
  {
    id: "status_kerja_kosong", kelompok: "Kualitas data", judul: "Status pekerjaan kosong (15+)", satuan: "orang", labelNilai: "Pekerjaan tercatat",
    definisi: "Umur 15+ (atau umur kosong) yang kegiatan utamanya belum diisi.",
    cocok: (w, c) => ((c.umur === null || c.umur >= 15) && kegiatanWarga(w) === "Belum diisi" ? w.pekerjaan?.trim() || "Kosong" : null),
  },
  {
    id: "status_tidak_sesuai_umur", kelompok: "Kualitas data", judul: "Status pekerjaan tidak sesuai umur", satuan: "orang", labelNilai: "Masalah",
    definisi: "Pekerjaan tidak cocok dengan umur sekarang, mis. sudah 19+ tapi masih «Pelajar», atau 7+ masih «Bimbingan Orang Tua».",
    cocok: (w, c) => {
      const isu = detectWargaDataIssues({ ...w, id: w.id ?? 0, rt: c.kk.rt, namaLengkap: w.namaLengkap ?? "", nik: w.nik ?? "", kedudukanKeluarga: w.kedudukanKeluarga ?? "" })
        .filter((i) => i === "pekerjaan_salah_kategori" || i === "status_lama_naik_usia");
      return isu.length ? `${summarizeWargaIssues(isu)} (${w.pekerjaan?.trim() || "kosong"})` : null;
    },
  },
  {
    id: "menunggu_cek", kelompok: "Kualitas data", judul: "KK dengan isian menunggu dicek", satuan: "KK", labelNilai: "Isian",
    definisi: "Ada jawaban dari warga/QR yang belum diterima atau ditolak RT.",
    cocok: (k, c) => {
      const n = (k.perluCek?.length ?? 0) + c.anggota.reduce((s, a) => s + (a.perluCek?.length ?? 0), 0);
      return n ? `${n} isian` : null;
    },
  },
  {
    id: "kk_tanpa_wa", kelompok: "Kualitas data", judul: "KK tanpa WhatsApp", satuan: "KK", labelNilai: "Anggota",
    definisi: "Tidak ada satu pun anggota aktif dengan nomor WhatsApp valid.",
    cocok: (_k, c) => (c.anggota.length > 0 && !c.anggota.some((a) => isNomorHpValid(a.nomorWhatsapp)) ? `${c.anggota.length} anggota` : null),
  },
];

const BY_ID = new Map(KATEGORI_REKAP.map((k) => [k.id, k]));
export const getKategoriRekap = (id: string | null | undefined) => (id ? BY_ID.get(id) : undefined);

/** Kartu/dialog Dashboard yang punya padanan langsung di Rekap (untuk tombol «Cetak daftar ini»). */
export const KATEGORI_DAFTAR_KE_REKAP: Partial<Record<KategoriDaftar, string>> = {
  pengangguran: "pengangguran",
  balita: "balita",
  lansia: "lansia",
  lansiaSendiri: "lansia_sendiri",
  tanpaWa: "kk_tanpa_wa",
  bansos: "kk_bansos",
  belum: "tanpa_tanggal_lahir",
};

export interface BarisRekap {
  /** id warga, atau id KK untuk kategori ber-satuan KK. */
  id: number;
  kkId: number;
  rt: number;
  nama: string;
  nikSamar: string | null;
  jenisKelamin: string | null;
  tanggalLahir: string | null;
  umur: number | null;
  kedudukan: string | null;
  alamat: string | null;
  kkSamar: string | null;
  /** Untuk satuan KK. */
  anggota: number | null;
  nilai: string;
}

export interface JumlahRekap {
  id: string;
  kelompok: KelompokRekap;
  judul: string;
  satuan: "orang" | "KK";
  total: number;
  perRt: Record<number, number>;
}

export interface RingkasanRekap {
  dibuat: string;
  rt: number[];
  totalWarga: { total: number; perRt: Record<number, number> };
  totalKk: { total: number; perRt: Record<number, number> };
  kategori: JumlahRekap[];
}

export interface DaftarRekap {
  kategori: { id: string; judul: string; kelompok: KelompokRekap; satuan: "orang" | "KK"; definisi: string; labelNilai: string };
  rt: number | null;
  dibuat: string;
  baris: BarisRekap[];
}

function siapkan(semuaKk: KkRekap[], semuaWarga: StatistikWargaSlice[]) {
  const rtList: number[] = [...ACTIVE_RT_NUMBERS];
  const kkList = semuaKk.filter((k) => rtList.includes(k.rt));
  const kkById = new Map(kkList.map((k) => [k.id, k]));
  const anggota = new Map<number, StatistikWargaSlice[]>();
  for (const w of semuaWarga) {
    if (!kkById.has(w.kkId) || !isWargaTerhitung(w)) continue;
    anggota.set(w.kkId, [...(anggota.get(w.kkId) ?? []), w]);
  }
  return { rtList, kkList, kkById, anggota };
}

function kepalaKk(anggota: StatistikWargaSlice[]) {
  return anggota.find((a) => a.kedudukanKeluarga === "Kepala Keluarga") ?? anggota[0];
}

const alamatKk = (k: KkRekap) => [k.alamat, k.noUnit ? `No. ${k.noUnit}` : null].filter(Boolean).join(" ") || null;

/** Semua baris yang cocok untuk satu kategori; `rt` kosong = seluruh RT 01–04. */
export function daftarRekap(kategori: KategoriRekap, semuaKk: KkRekap[], semuaWarga: StatistikWargaSlice[], rt?: number | null): BarisRekap[] {
  const { kkList, anggota } = siapkan(semuaKk, semuaWarga);
  const hasil: BarisRekap[] = [];
  for (const k of kkList) {
    if (rt != null && k.rt !== rt) continue;
    const orang = anggota.get(k.id) ?? [];
    if (kategori.satuan === "KK") {
      const nilai = kategori.cocok(k, { anggota: orang });
      if (nilai == null) continue;
      const kepala = kepalaKk(orang);
      hasil.push({
        id: k.id, kkId: k.id, rt: k.rt, nama: kepala?.namaLengkap ?? "KK tanpa anggota aktif", nikSamar: kepala?.nik ? maskNik(kepala.nik) : null,
        jenisKelamin: kepala?.jenisKelamin ?? null, tanggalLahir: kepala?.tanggalLahir ?? null, umur: kepala ? getWargaAge(kepala.tanggalLahir) : null,
        kedudukan: kepala?.kedudukanKeluarga ?? null, alamat: alamatKk(k), kkSamar: k.nomorKk ? maskNik(k.nomorKk) : null, anggota: orang.length, nilai,
      });
      continue;
    }
    for (const w of orang) {
      const umur = getWargaAge(w.tanggalLahir);
      const nilai = kategori.cocok(w, { umur, kk: k });
      if (nilai == null) continue;
      hasil.push({
        id: w.id ?? 0, kkId: k.id, rt: k.rt, nama: w.namaLengkap ?? "—", nikSamar: w.nik ? maskNik(w.nik) : null,
        jenisKelamin: w.jenisKelamin ?? null, tanggalLahir: w.tanggalLahir ?? null, umur, kedudukan: w.kedudukanKeluarga ?? null,
        alamat: alamatKk(k), kkSamar: k.nomorKk ? maskNik(k.nomorKk) : null, anggota: null, nilai,
      });
    }
  }
  return hasil.sort((a, b) => a.rt - b.rt || (a.alamat ?? "").localeCompare(b.alamat ?? "", "id") || a.kkId - b.kkId || a.nama.localeCompare(b.nama, "id"));
}

/** Matriks kategori × RT. Jumlah = panjang `daftarRekap` untuk kategori & RT yang sama. */
export function ringkasanRekap(semuaKk: KkRekap[], semuaWarga: StatistikWargaSlice[]): RingkasanRekap {
  const { rtList, kkList, anggota } = siapkan(semuaKk, semuaWarga);
  const nol = () => Object.fromEntries(rtList.map((rt) => [rt, 0])) as Record<number, number>;
  const totalWarga = { total: 0, perRt: nol() };
  const totalKk = { total: 0, perRt: nol() };
  const kategori: JumlahRekap[] = KATEGORI_REKAP.map((k) => ({ id: k.id, kelompok: k.kelompok, judul: k.judul, satuan: k.satuan, total: 0, perRt: nol() }));
  const tambah = (j: JumlahRekap, rt: number) => { j.total++; j.perRt[rt]++; };

  for (const k of kkList) {
    const orang = anggota.get(k.id) ?? [];
    totalKk.perRt[k.rt]++; totalKk.total++;
    totalWarga.perRt[k.rt] += orang.length; totalWarga.total += orang.length;
    KATEGORI_REKAP.forEach((def, i) => {
      if (def.satuan === "KK") {
        if (def.cocok(k, { anggota: orang }) != null) tambah(kategori[i], k.rt);
        return;
      }
      for (const w of orang) if (def.cocok(w, { umur: getWargaAge(w.tanggalLahir), kk: k }) != null) tambah(kategori[i], k.rt);
    });
  }
  return { dibuat: new Date().toISOString(), rt: rtList, totalWarga, totalKk, kategori };
}
