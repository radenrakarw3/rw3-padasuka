/**
 * Modul Wilayah RW 03 — konstanta & helper murni (dipakai server, client, dan uji).
 * Data warga per RT dikelola admin RW (aktor ber-role "rt" atas nama RT yang dipilih).
 */

export const WILAYAH_RT_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;
export type WilayahRt = (typeof WILAYAH_RT_NUMBERS)[number];

export function isWilayahRt(v: unknown): v is WilayahRt {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && (WILAYAH_RT_NUMBERS as readonly number[]).includes(n);
}

export function labelRt(rt: number | null | undefined): string {
  return rt ? `RT ${String(rt).padStart(2, "0")}` : "RW 03";
}

export type WilayahRole = "rt" | "rw";
export type Pengelola = "rt" | "rw";

/** Status verifikasi untuk semua objek wilayah. */
export const STATUS_VERIFIKASI = ["terverifikasi", "perlu_cek", "ditolak"] as const;
export type StatusVerifikasi = (typeof STATUS_VERIFIKASI)[number];

// ---------------------------------------------------------------------------
// Standar data RW 03: pertanyaan untuk keluarga (kk) dan anggota (warga).
// Daftar pertanyaan disimpan di tabel wil_pertanyaan dan dapat diatur admin RW.
// Jawaban disimpan sebagai fakta berwaktu (wil_fakta). Tidak ada fakta = belum diketahui.
// ---------------------------------------------------------------------------

export type SubjekFakta = "warga" | "kk" | "rumah" | "usaha" | "fasilitas";
export const SUBJEK_STANDAR = ["kk", "warga"] as const;
export type SubjekStandar = (typeof SUBJEK_STANDAR)[number];

export const TIPE_FAKTA = ["pilihan", "banyak", "yatidak", "angka", "teks"] as const;
export type TipeFakta = (typeof TIPE_FAKTA)[number];
export const LABEL_TIPE: Record<TipeFakta, string> = {
  pilihan: "Pilih satu",
  banyak: "Pilih beberapa",
  yatidak: "Ya / Tidak",
  angka: "Angka",
  teks: "Isian singkat",
};

export interface DefinisiFakta {
  id?: number;
  kunci: string;
  subjek: SubjekFakta;
  kelompok: string;
  label: string;
  /** Pertanyaan sederhana untuk warga / pengurus. */
  pertanyaan: string;
  bantuan?: string | null;
  tipe: TipeFakta;
  pilihan?: { nilai: string; label: string }[];
  /** Jawaban yang menandai keluarga/warga perlu perhatian pengurus RW. */
  perhatian?: string[];
  /** Ditanyakan di formulir QR warga. */
  diQr?: boolean;
  /** Hanya ditanyakan ke perempuan. */
  khususPerempuan?: boolean;
  usiaMin?: number | null;
  usiaMax?: number | null;
  urutan?: number;
  aktif?: boolean;
}

export const KELOMPOK_STANDAR = ["Tempat tinggal & kontak", "Rumah & fasilitas", "Ekonomi", "Kesehatan", "Pendidikan", "Kerentanan"] as const;

const p = (pasangan: [string, string][]) => pasangan.map(([nilai, label]) => ({ nilai, label }));

/** Aturan pendataan penyewa: KTP RW 03 → data warga; KTP luar → Visit RW3. */
export const BANTUAN_STATUS_TINGGAL =
  "Kost/kontrak dengan KTP RW 03 tetap didata di sini. Kost/kontrak dengan KTP luar daerah mendaftar lewat Visit RW3.";

const AWAL: DefinisiFakta[] = [
  // --- Keluarga ---
  {
    kunci: "s_status_tinggal", subjek: "kk", kelompok: "Tempat tinggal & kontak", label: "Status tinggal", tipe: "pilihan",
    pertanyaan: "Keluarga ini tinggal di RW 03 sebagai…",
    bantuan: BANTUAN_STATUS_TINGGAL,
    pilihan: p([["tetap_ktp", "Warga tetap (KTP RW 03)"], ["tetap_luar", "Tinggal tetap, KTP luar RW 03"], ["kontrak", "Kontrak / sewa rumah"], ["kost", "Kost"], ["menumpang", "Menumpang di rumah keluarga"]]),
  },
  {
    kunci: "s_lama_tinggal", subjek: "kk", kelompok: "Tempat tinggal & kontak", label: "Lama tinggal", tipe: "pilihan",
    pertanyaan: "Sudah berapa lama tinggal di alamat ini?",
    pilihan: p([["kurang_1", "Kurang dari 1 tahun"], ["1_5", "1–5 tahun"], ["lebih_5", "Lebih dari 5 tahun"]]),
  },
  {
    kunci: "s_kontak_darurat", subjek: "kk", kelompok: "Tempat tinggal & kontak", label: "Kontak darurat", tipe: "teks",
    pertanyaan: "Nomor HP kerabat yang bisa dihubungi saat darurat", bantuan: "Boleh kosong. Jangan isi NIK.",
  },
  {
    kunci: "s_status_rumah", subjek: "kk", kelompok: "Rumah & fasilitas", label: "Status rumah", tipe: "pilihan",
    pertanyaan: "Rumah yang ditempati milik siapa?",
    pilihan: p([["milik_sendiri", "Milik sendiri"], ["milik_keluarga", "Milik orang tua / keluarga"], ["sewa", "Sewa / kontrak"], ["lainnya", "Rumah dinas / lainnya"]]),
  },
  {
    kunci: "s_kondisi_rumah", subjek: "kk", kelompok: "Rumah & fasilitas", label: "Kondisi rumah", tipe: "pilihan",
    pertanyaan: "Bagaimana kondisi rumah saat ini?",
    pilihan: p([["layak", "Layak huni"], ["rusak_ringan", "Perlu perbaikan ringan (atap bocor, dinding retak)"], ["rusak_berat", "Rusak berat / tidak layak huni"]]),
    perhatian: ["rusak_berat"],
  },
  {
    kunci: "s_sumber_air", subjek: "kk", kelompok: "Rumah & fasilitas", label: "Sumber air", tipe: "pilihan",
    pertanyaan: "Air untuk minum dan masak berasal dari mana?",
    pilihan: p([["pdam", "PDAM"], ["sumur_pompa", "Sumur bor / pompa"], ["sumur_gali", "Sumur gali"], ["isi_ulang", "Air isi ulang / beli"], ["lainnya", "Lainnya"]]),
  },
  {
    kunci: "s_air_cukup", subjek: "kk", kelompok: "Rumah & fasilitas", label: "Air cukup sepanjang tahun", tipe: "yatidak",
    pertanyaan: "Apakah air cukup sepanjang tahun (tidak kering saat kemarau)?", perhatian: ["tidak"],
  },
  {
    kunci: "s_jamban", subjek: "kk", kelompok: "Rumah & fasilitas", label: "Jamban / WC", tipe: "pilihan",
    pertanyaan: "Keluarga memakai WC yang mana?",
    pilihan: p([["sendiri_septik", "WC sendiri dengan septic tank"], ["sendiri_tanpa", "WC sendiri tanpa septic tank"], ["bersama", "WC bersama / umum"], ["tidak_ada", "Tidak punya WC"]]),
    perhatian: ["sendiri_tanpa", "tidak_ada"],
  },
  {
    kunci: "s_listrik", subjek: "kk", kelompok: "Rumah & fasilitas", label: "Daya listrik", tipe: "pilihan",
    pertanyaan: "Daya listrik rumah (lihat meteran)?",
    pilihan: p([["numpang", "Menumpang / tanpa meteran sendiri"], ["450", "450 VA"], ["900", "900 VA"], ["1300", "1.300 VA"], ["2200_plus", "2.200 VA ke atas"]]),
    perhatian: ["numpang"],
  },
  {
    kunci: "s_internet", subjek: "kk", kelompok: "Rumah & fasilitas", label: "Akses internet", tipe: "yatidak",
    pertanyaan: "Keluarga bisa memakai internet di rumah (HP / wifi)?",
  },
  {
    kunci: "s_penghasilan", subjek: "kk", kelompok: "Ekonomi", label: "Penghasilan keluarga per bulan", tipe: "pilihan",
    pertanyaan: "Kira-kira total penghasilan keluarga per bulan?", bantuan: "Gabungan semua anggota yang bekerja. Tidak perlu angka pasti.",
    pilihan: p([["kurang_1jt", "Kurang dari Rp1 juta"], ["1_2_5jt", "Rp1 juta – Rp2,5 juta"], ["2_5_5jt", "Rp2,5 juta – Rp5 juta"], ["lebih_5jt", "Lebih dari Rp5 juta"], ["tidak_tentu", "Tidak tentu / serabutan"]]),
    perhatian: ["kurang_1jt", "tidak_tentu"],
  },
  {
    kunci: "s_bansos", subjek: "kk", kelompok: "Ekonomi", label: "Bantuan sosial", tipe: "banyak",
    pertanyaan: "Bantuan apa saja yang sedang diterima keluarga?", bantuan: "Pilih semua yang sesuai.",
    pilihan: p([["pkh", "PKH"], ["bpnt", "BPNT / Sembako"], ["blt", "BLT"], ["pbi", "BPJS gratis (PBI)"], ["pip", "PIP / KIP sekolah"], ["lainnya", "Bantuan lain"], ["tidak_ada", "Tidak menerima bantuan"]]),
  },
  {
    kunci: "s_rawan_pangan", subjek: "kk", kelompok: "Kerentanan", label: "Pernah kekurangan makan", tipe: "yatidak",
    pertanyaan: "Dalam 3 bulan terakhir, apakah keluarga pernah kekurangan makan?", perhatian: ["ya"],
  },
  {
    kunci: "s_lansia_sendiri", subjek: "kk", kelompok: "Kerentanan", label: "Lansia tanpa pendamping", tipe: "yatidak",
    pertanyaan: "Ada lansia (60 tahun ke atas) yang tinggal sendiri atau tanpa pendamping?", perhatian: ["ya"],
  },
  {
    kunci: "s_kebutuhan", subjek: "kk", kelompok: "Kerentanan", label: "Kebutuhan paling mendesak", tipe: "pilihan",
    pertanyaan: "Saat ini keluarga paling membutuhkan apa?",
    pilihan: p([["pekerjaan", "Pekerjaan"], ["modal_usaha", "Modal usaha"], ["perbaikan_rumah", "Perbaikan rumah"], ["biaya_sekolah", "Biaya sekolah"], ["biaya_berobat", "Biaya berobat"], ["sembako", "Sembako"], ["tidak_ada", "Tidak ada yang mendesak"]]),
  },

  // --- Anggota keluarga ---
  {
    kunci: "s_pekerjaan", subjek: "warga", kelompok: "Ekonomi", label: "Pekerjaan utama", tipe: "pilihan", usiaMin: 15,
    pertanyaan: "Pekerjaan utama sehari-hari?",
    pilihan: p([["karyawan", "Karyawan / pegawai swasta"], ["asn", "PNS / TNI / Polri / BUMN"], ["wiraswasta", "Wiraswasta / pedagang"], ["buruh", "Buruh harian / lepas"],
      ["driver", "Ojek / sopir / driver online"], ["irt", "Mengurus rumah tangga"], ["pelajar", "Pelajar / mahasiswa"], ["pensiun", "Pensiunan"],
      ["mencari_kerja", "Sedang mencari kerja"], ["tidak_bekerja", "Tidak bekerja / tidak mampu bekerja"], ["lainnya", "Lainnya"]]),
    perhatian: ["mencari_kerja"],
  },
  {
    kunci: "s_jaminan_kesehatan", subjek: "warga", kelompok: "Kesehatan", label: "Jaminan kesehatan", tipe: "pilihan",
    pertanyaan: "Punya jaminan kesehatan apa?",
    pilihan: p([["bpjs_pbi", "BPJS gratis (PBI)"], ["bpjs_mandiri", "BPJS mandiri / dari kantor"], ["asuransi_lain", "Asuransi lain"], ["tidak_punya", "Tidak punya"]]),
    perhatian: ["tidak_punya"],
  },
  {
    kunci: "s_penyakit", subjek: "warga", kelompok: "Kesehatan", label: "Penyakit menahun", tipe: "banyak",
    pertanyaan: "Sakit menahun yang sudah dinyatakan dokter / puskesmas?", bantuan: "Pilih semua yang sesuai.",
    pilihan: p([["hipertensi", "Darah tinggi"], ["diabetes", "Diabetes (gula)"], ["jantung", "Jantung"], ["stroke", "Stroke"], ["tbc", "TBC"], ["asma", "Asma / PPOK"], ["ginjal", "Gagal ginjal"], ["lainnya", "Lainnya"], ["tidak_ada", "Tidak ada"]]),
    perhatian: ["hipertensi", "diabetes", "jantung", "stroke", "tbc", "asma", "ginjal", "lainnya"],
  },
  {
    kunci: "s_disabilitas", subjek: "warga", kelompok: "Kesehatan", label: "Disabilitas", tipe: "pilihan",
    pertanyaan: "Apakah memiliki disabilitas?",
    pilihan: p([["tidak", "Tidak"], ["fisik", "Fisik / gerak"], ["netra", "Netra (penglihatan)"], ["rungu_wicara", "Rungu / wicara"], ["mental", "Mental / intelektual"], ["ganda", "Ganda"]]),
    perhatian: ["fisik", "netra", "rungu_wicara", "mental", "ganda"],
  },
  {
    kunci: "s_hamil", subjek: "warga", kelompok: "Kesehatan", label: "Sedang hamil", tipe: "yatidak", khususPerempuan: true, usiaMin: 12, usiaMax: 55,
    pertanyaan: "Sedang hamil?", perhatian: ["ya"],
  },
  {
    kunci: "s_pendidikan", subjek: "warga", kelompok: "Pendidikan", label: "Pendidikan terakhir", tipe: "pilihan", usiaMin: 5,
    pertanyaan: "Pendidikan terakhir yang sudah tamat?",
    pilihan: p([["belum_sekolah", "Belum / tidak sekolah"], ["sd", "SD / sederajat"], ["smp", "SMP / sederajat"], ["sma", "SMA / SMK / sederajat"], ["diploma", "Diploma (D1–D3)"], ["sarjana", "S1 ke atas"]]),
  },
  {
    kunci: "s_status_sekolah", subjek: "warga", kelompok: "Pendidikan", label: "Status sekolah", tipe: "pilihan", usiaMin: 3, usiaMax: 24,
    pertanyaan: "Saat ini sekolah di mana?",
    pilihan: p([["paud", "PAUD / TK"], ["sd", "SD"], ["smp", "SMP"], ["sma", "SMA / SMK"], ["kuliah", "Kuliah"], ["tidak_sekolah", "Tidak sekolah"]]),
    perhatian: ["tidak_sekolah"],
  },
  {
    kunci: "s_yatim", subjek: "warga", kelompok: "Kerentanan", label: "Yatim / piatu", tipe: "pilihan", usiaMax: 18,
    pertanyaan: "Apakah anak ini yatim, piatu, atau yatim piatu?",
    pilihan: p([["tidak", "Tidak"], ["yatim", "Yatim (ayah meninggal)"], ["piatu", "Piatu (ibu meninggal)"], ["yatim_piatu", "Yatim piatu"]]),
    perhatian: ["yatim", "piatu", "yatim_piatu"],
  },
];

/** Isi awal tabel wil_pertanyaan. Setelah terpasang, admin RW dapat mengubahnya dari halaman Standar data. */
export const STANDAR_AWAL: DefinisiFakta[] = AWAL.map((d, i) => ({ diQr: true, urutan: (i + 1) * 10, aktif: true, ...d }));

export function nilaiBanyak(nilai: string | null | undefined): string[] {
  return nilai ? nilai.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

const MIRIP_NIK = /\d{16}/;

export function validasiNilaiFakta(def: DefinisiFakta, nilai: string): string | null {
  if (def.tipe === "yatidak") return nilai === "ya" || nilai === "tidak" ? null : "Pilih Ya atau Tidak";
  if (def.tipe === "pilihan") return def.pilihan?.some((x) => x.nilai === nilai) ? null : "Pilihan tidak dikenal";
  if (def.tipe === "banyak") {
    const v = nilaiBanyak(nilai);
    if (!v.length) return "Pilih minimal satu";
    if (new Set(v).size !== v.length) return "Pilihan ganda";
    return v.every((x) => def.pilihan?.some((q) => q.nilai === x)) ? null : "Pilihan tidak dikenal";
  }
  if (def.tipe === "teks") {
    const t = nilai.trim();
    if (!t || t.length > 200) return "Isi 1–200 karakter";
    return MIRIP_NIK.test(t.replace(/\s/g, "")) ? "Jangan isi dengan NIK" : null;
  }
  const n = Number(nilai);
  return Number.isInteger(n) && n >= 0 ? null : "Isi dengan angka 0 atau lebih";
}

export function labelNilaiFakta(def: DefinisiFakta | undefined, nilai: string | null | undefined): string {
  if (nilai == null) return "Belum diketahui";
  if (!def) return nilai;
  if (def.tipe === "yatidak") return nilai === "ya" ? "Ya" : "Tidak";
  if (def.tipe === "pilihan") return def.pilihan?.find((x) => x.nilai === nilai)?.label ?? nilai;
  if (def.tipe === "banyak") return nilaiBanyak(nilai).map((v) => def.pilihan?.find((x) => x.nilai === v)?.label ?? v).join(", ");
  return nilai;
}

/** Jawaban termasuk kategori "perlu perhatian" yang ditetapkan admin. */
export function kenaPerhatian(def: DefinisiFakta | undefined, nilai: string | null | undefined): boolean {
  if (!def?.perhatian?.length || nilai == null) return false;
  const v = def.tipe === "banyak" ? nilaiBanyak(nilai) : [nilai];
  return v.some((x) => def.perhatian!.includes(x));
}

/** Pertanyaan anggota hanya ditampilkan bila sesuai jenis kelamin dan usia (usia tidak diketahui = tetap tampil). */
export function berlakuUntukWarga(def: DefinisiFakta, w: { jenisKelamin?: string | null; umur?: number | null }): boolean {
  if (def.khususPerempuan && w.jenisKelamin && w.jenisKelamin !== "Perempuan") return false;
  if (w.umur == null) return true;
  if (def.usiaMin != null && w.umur < def.usiaMin) return false;
  if (def.usiaMax != null && w.umur > def.usiaMax) return false;
  return true;
}

/** Kelompokkan pertanyaan sesuai urutan kelompok standar (kelompok baru buatan admin di akhir). */
export function kelompokkan(defs: DefinisiFakta[]): { kelompok: string; daftar: DefinisiFakta[] }[] {
  const urut = [...KELOMPOK_STANDAR as readonly string[]];
  for (const d of defs) if (!urut.includes(d.kelompok)) urut.push(d.kelompok);
  return urut
    .map((kelompok) => ({ kelompok, daftar: defs.filter((d) => d.kelompok === kelompok).sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0)) }))
    .filter((g) => g.daftar.length);
}

// ---------------------------------------------------------------------------
// Tanggal & umur
// ---------------------------------------------------------------------------

export const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function isoTanggal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseTanggal(v: string | null | undefined): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Umur dalam bulan penuh pada tanggal acuan; null bila tanggal lahir tidak diketahui. */
export function umurBulan(tanggalLahir: string | null | undefined, acuan: string): number | null {
  const lahir = parseTanggal(tanggalLahir);
  const a = parseTanggal(acuan);
  if (!lahir || !a || lahir > a) return null;
  let bulan = (a.getFullYear() - lahir.getFullYear()) * 12 + (a.getMonth() - lahir.getMonth());
  if (a.getDate() < lahir.getDate()) bulan -= 1;
  return bulan;
}

export function umurTahun(tanggalLahir: string | null | undefined, acuan: string): number | null {
  const b = umurBulan(tanggalLahir, acuan);
  return b == null ? null : Math.floor(b / 12);
}

// ---------------------------------------------------------------------------
// Form isian warga (QR)
// ---------------------------------------------------------------------------

export const HUBUNGAN_KELUARGA = ["Kepala Keluarga", "Istri", "Suami", "Anak", "Menantu", "Cucu", "Orang Tua", "Mertua", "Famili Lain", "Lainnya"] as const;

export interface UsulanAnggota {
  nama: string;
  hubungan: string;
  jenisKelamin: "Laki-laki" | "Perempuan";
  tanggalLahir?: string | null;
  /** Kunci pertanyaan anggota → nilai. Tidak diisi = belum diketahui. */
  jawaban: Record<string, string>;
  /** Anggota baru / pindah keluar / meninggal — diperiksa pengurus. */
  keterangan?: "tetap" | "baru" | "pindah" | "meninggal";
}

/** Isian lama (sebelum standar RW 03) masih bisa memuat usaha. */
export interface UsulanUsaha {
  nama: string;
  kategori: string | null;
  pemilik: string;
  jawaban: Record<string, string>;
}

export interface IsiUsulan {
  versiForm: 1;
  namaPengisi: string;
  hubunganPengisi: string;
  nomorHp?: string | null;
  /** Kunci pertanyaan keluarga → nilai. */
  rumahTangga: Record<string, string>;
  anggota: UsulanAnggota[];
  usaha?: UsulanUsaha[];
  catatan?: string | null;
}
