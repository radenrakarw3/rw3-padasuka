/**
 * Template WA kelengkapan/verifikasi data — nada empatik.
 * Hindari kata menyalahkan; jangan kirim NIK penuh.
 * Cantumkan daftar kebutuhan: data pribadi + data keluarga.
 */

import {
  getEffectiveKategoriUmur,
  pekerjaanWajibUntukKategori,
} from "@shared/kategori-umur";
import type { WargaDataIssueId, WargaIssueSlice } from "@shared/warga-data-issues";

export const SENDER_LABEL_KEPENDUDUKAN = "KPP RW 03 Padasuka";

/** Hanya 2 nada: pesan pertama + follow-up. */
export type HubungiWargaJenis = "minta_bantuan" | "pengingat_lembut";

export const HUBUNGI_WARGA_JENIS_OPTIONS: {
  id: HubungiWargaJenis;
  label: string;
  hint: string;
}[] = [
  {
    id: "minta_bantuan",
    label: "Pesan pertama",
    hint: "Minta warga kirim poin data yang kurang — sekali balas lengkap",
  },
  {
    id: "pengingat_lembut",
    label: "Follow-up",
    hint: "Pengingat jika belum ada balasan; poin data tetap sama",
  },
];

/** Bahasa manusia untuk issue internal — tanpa kata “salah/bermasalah”. */
export const ISSUE_BAHASA_MANUSIA: Record<WargaDataIssueId, string> = {
  tanpa_tanggal_lahir: "tanggal lahir",
  kategori_belum_sinkron: "kategori umur (dari tanggal lahir)",
  tanpa_status_pekerjaan: "status pekerjaan saat ini",
  status_pekerjaan_tidak_selaras: "keselarasan status dan pekerjaan",
  tanpa_pekerjaan: "pekerjaan/jabatan",
  pekerjaan_tidak_standar: "uraian pekerjaan agar sesuai daftar RW",
  pekerjaan_salah_kategori: "pekerjaan yang sesuai usia",
  status_lama_naik_usia: "status kegiatan saat ini (setelah bertambah usia)",
};

export type HubungiWargaTemplateInput = {
  namaLengkap: string;
  kedudukanKeluarga: string;
  rt: number;
  issues?: WargaDataIssueId[];
  /** Nama kepala keluarga — dipakai jika via === kepala_keluarga */
  namaKepalaKeluarga?: string | null;
  via?: "warga" | "kepala_keluarga";
  jenis?: HubungiWargaJenis;
  /** Konteks tambahan dari grafik pekerjaan */
  chartLabel?: string | null;
  tanggalLahir?: string | null;
  kategoriUmur?: string | null;
  pekerjaan?: string | null;
  statusPekerjaan?: string | null;
  /** Label data pribadi yang masih dibutuhkan (warga bersangkutan) */
  dataPribadi?: string[];
  /** Label data keluarga (KK) yang masih dibutuhkan */
  dataKeluarga?: string[];
  /** Anggota KK lain yang masih kurang data — agar 1 pesan cukup untuk satu keluarga */
  dataAnggotaLain?: { nama: string; kedudukan: string; kurang: string[] }[];
};

function rtLabel(rt: number): string {
  return `RT ${String(rt).padStart(2, "0")}`;
}

/** Gabung label unik, jaga urutan pertama. */
export function unikLabel(labels: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const t = (raw ?? "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function labelsDariIssues(issues: WargaDataIssueId[] | undefined): string[] {
  if (!issues?.length) return [];
  return unikLabel(issues.map((id) => ISSUE_BAHASA_MANUSIA[id]));
}

/** Poin baku jika belum ada gap terdeteksi — jangan pernah kirim pesan tanpa daftar konkret. */
export const POIN_KONFIRMASI_PRIBADI = [
  "Tanggal lahir",
  "Tempat lahir",
  "Status pekerjaan / kegiatan saat ini",
  "Pekerjaan atau kegiatan sehari-hari",
  "Pendidikan terakhir",
  "Nomor WhatsApp aktif",
] as const;

export const POIN_KONFIRMASI_KELUARGA = [
  "Penghasilan bulanan keluarga",
  "Status rumah (milik sendiri / sewa / menumpang)",
  "Nomor WhatsApp yang bisa dihubungi untuk keluarga",
] as const;

/** Pastikan input selalu punya daftar poin yang bisa dibalas warga. */
export function withDaftarKonkret(input: HubungiWargaTemplateInput): HubungiWargaTemplateInput {
  const adaPribadi = (input.dataPribadi?.length ?? 0) > 0 || (input.issues?.length ?? 0) > 0;
  const adaKeluarga = (input.dataKeluarga?.length ?? 0) > 0;
  const adaAnggota = input.dataAnggotaLain?.some((a) => a.kurang.length) ?? false;
  if (adaPribadi || adaKeluarga || adaAnggota) return input;
  return {
    ...input,
    dataPribadi: [...POIN_KONFIRMASI_PRIBADI],
    dataKeluarga: [...POIN_KONFIRMASI_KELUARGA],
  };
}

export type PoinBalasan = {
  no: number;
  bagian: string;
  label: string;
  /** Cara mengisi singkat */
  instruksi: string;
  /** Pilihan jawaban (huruf a, b, c…) — warga bisa balas huruf atau teks */
  pilihan?: string[];
  /** Contoh isi untuk nomor ini */
  contohBalasan: string;
};

type BantuanIsian = {
  instruksi: string;
  pilihan?: string[];
  contohBalasan: string;
};

const PILIHAN_STATUS_PEKERJAAN = [
  "Bekerja",
  "Wiraswasta / usaha sendiri",
  "Pekerja lepas / buruh harian",
  "Ibu rumah tangga",
  "Pelajar / mahasiswa",
  "Pensiunan",
  "Mencari kerja / belum bekerja",
];

const PILIHAN_PEKERJAAN = [
  "Karyawan swasta",
  "Pegawai negeri / ASN / TNI / Polri",
  "Pedagang / wiraswasta",
  "Buruh / pekerja lepas",
  "Sopir / ojek / kurir",
  "Pelajar",
  "Mahasiswa",
  "Ibu rumah tangga",
  "Pensiunan",
  "Lainnya (tulis sendiri)",
];

const PILIHAN_PENDIDIKAN = [
  "Belum sekolah / tidak tamat SD",
  "Tamat SD / sederajat",
  "SMP / sederajat",
  "SMA / SMK / sederajat",
  "Diploma (D1–D3)",
  "Sarjana (S1) / D4",
  "S2 / S3",
];

const PILIHAN_PENGHASILAN = [
  "< Rp 500.000",
  "Rp 500.000 – Rp 1.000.000",
  "Rp 1.000.000 – Rp 2.000.000",
  "Rp 2.000.000 – Rp 3.500.000",
  "> Rp 3.500.000",
];

const PILIHAN_STATUS_RUMAH = [
  "Milik sendiri",
  "Sewa / kontrak",
  "Menumpang keluarga",
  "Lainnya (tulis sendiri)",
];

const PILIHAN_YA_TIDAK = ["Ya", "Tidak"];

const PILIHAN_LITERASI = ["Ya (lancar)", "Sebagian", "Tidak"];

const PILIHAN_KESULITAN = [
  "Tidak ada kesulitan",
  "Sedikit kesulitan",
  "Banyak kesulitan",
  "Tidak dapat sama sekali",
];

const PILIHAN_JK = ["Laki-laki", "Perempuan"];

/** Bantuan isian + pilihan jawaban per label. */
export function bantuanUntukLabel(label: string): BantuanIsian {
  const k = label.trim().toLowerCase();

  if (k.includes("tanggal lahir") || k.includes("kategori umur")) {
    return {
      instruksi: "Tulis tanggal lahir lengkap (hari/bulan/tahun).",
      contohBalasan: "12/03/1990",
    };
  }
  if (k.includes("tempat lahir")) {
    return {
      instruksi: "Tulis kota/kabupaten kelahiran.",
      contohBalasan: "Cimahi",
    };
  }
  if (k.includes("whatsapp") || k.includes("no. wa") || k.includes("nomor wa")) {
    return {
      instruksi: "Tulis nomor WhatsApp aktif (dimulai 08…).",
      contohBalasan: "081234567890",
    };
  }
  if (k.includes("status pekerjaan") || k.includes("angkat kerja") || k.includes("kegiatan saat ini") || k.includes("keselarasan") || k.includes("selaras")) {
    return {
      instruksi: "Pilih salah satu (balas huruf a/b/c… atau salin teksnya).",
      pilihan: PILIHAN_STATUS_PEKERJAAN,
      contohBalasan: "a",
    };
  }
  if (k.includes("pekerjaan") || k.includes("jabatan") || k.includes("uraian pekerjaan")) {
    return {
      instruksi: "Pilih yang paling dekat, atau tulis pekerjaan Anda sendiri.",
      pilihan: PILIHAN_PEKERJAAN,
      contohBalasan: "a",
    };
  }
  if (k.includes("pendidikan")) {
    return {
      instruksi: "Pilih pendidikan terakhir.",
      pilihan: PILIHAN_PENDIDIKAN,
      contohBalasan: "d",
    };
  }
  if (k.includes("literasi")) {
    return {
      instruksi: "Apakah bisa baca-tulis huruf Latin?",
      pilihan: PILIHAN_LITERASI,
      contohBalasan: "a",
    };
  }
  if (k.includes("penghasilan")) {
    return {
      instruksi: "Pilih rentang penghasilan bulanan keluarga.",
      pilihan: PILIHAN_PENGHASILAN,
      contohBalasan: "c",
    };
  }
  if (k.includes("status rumah") || (k.includes("rumah") && !k.includes("tangga"))) {
    return {
      instruksi: "Pilih status rumah tinggal.",
      pilihan: PILIHAN_STATUS_RUMAH,
      contohBalasan: "a",
    };
  }
  if (k.includes("nik")) {
    return {
      instruksi: "Tulis 16 digit NIK (angka saja, tanpa spasi).",
      contohBalasan: "3201010101010001",
    };
  }
  if (k.includes("jenis kelamin")) {
    return {
      instruksi: "Pilih jenis kelamin.",
      pilihan: PILIHAN_JK,
      contohBalasan: "a",
    };
  }
  if (k.includes("akta lahir")) {
    return {
      instruksi: "Apakah punya akta kelahiran?",
      pilihan: PILIHAN_YA_TIDAK,
      contohBalasan: "a",
    };
  }
  if (k.includes("kia")) {
    return {
      instruksi: "Apakah punya KIA (Kartu Identitas Anak)?",
      pilihan: PILIHAN_YA_TIDAK,
      contohBalasan: "b",
    };
  }
  if (k.includes("kesulitan melihat") || k.includes("kesulitan berjalan") || k.includes("kesulitan")) {
    return {
      instruksi: "Pilih tingkat kesulitan sehari-hari.",
      pilihan: PILIHAN_KESULITAN,
      contohBalasan: "a",
    };
  }

  return {
    instruksi: `Tulis jawaban singkat untuk «${label.trim()}».`,
    contohBalasan: "(isi di sini)",
  };
}

/** @deprecated Gunakan bantuanUntukLabel — dipertahankan untuk impor lama. */
export function instruksiUntukLabel(label: string): string {
  const b = bantuanUntukLabel(label);
  if (b.pilihan?.length) return `${b.instruksi} ${b.pilihan.join(" / ")}`;
  return `${b.instruksi} Contoh: ${b.contohBalasan}`;
}

function judulLabel(label: string): string {
  const t = label.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function hurufPilihan(i: number): string {
  return String.fromCharCode(97 + i); // a, b, c…
}

/**
 * Satu sumber poin balasan (nomor global 1…N) untuk teks WA + checklist admin.
 */
export function bangunPoinBalasan(input: HubungiWargaTemplateInput): PoinBalasan[] {
  const normal = withDaftarKonkret(input);
  const pribadi = unikLabel([
    ...labelsDariIssues(normal.issues),
    ...(normal.dataPribadi ?? []),
  ]);
  const keluarga = unikLabel(normal.dataKeluarga ?? []);
  const anggotaLain = (normal.dataAnggotaLain ?? []).filter((a) => a.kurang.length > 0);

  const out: PoinBalasan[] = [];
  let no = 1;

  const pushGrup = (bagian: string, labels: string[]) => {
    for (const raw of labels) {
      const label = judulLabel(raw);
      const b = bantuanUntukLabel(label);
      out.push({
        no: no++,
        bagian,
        label,
        instruksi: b.instruksi,
        pilihan: b.pilihan,
        contohBalasan: b.contohBalasan,
      });
    }
  };

  const nama = normal.namaLengkap.trim();
  pushGrup(`Data pribadi — ${nama}`, pribadi);
  pushGrup("Data keluarga (rumah / KK)", keluarga);
  for (const a of anggotaLain) {
    pushGrup(`Data ${a.nama} (${a.kedudukan})`, unikLabel(a.kurang));
  }

  return out;
}

/** Render baris teks WA dari poin (judul + pilihan a/b/c + contoh). */
export function formatPoinBalasanUntukPesan(poin: PoinBalasan[]): string[] {
  if (!poin.length) return [];
  const lines: string[] = [];
  let bagianTerakhir = "";
  for (const p of poin) {
    if (p.bagian !== bagianTerakhir) {
      if (lines.length) lines.push("");
      lines.push(`*${p.bagian}*`);
      bagianTerakhir = p.bagian;
    }
    lines.push(`${p.no}. *${p.label}*`);
    lines.push(`   ${p.instruksi}`);
    if (p.pilihan?.length) {
      for (let i = 0; i < p.pilihan.length; i++) {
        lines.push(`   ${hurufPilihan(i)}) ${p.pilihan[i]}`);
      }
      lines.push(`   → contoh balasan: ${p.no}. ${p.contohBalasan}   (atau tulis teks pilihannya)`);
    } else {
      lines.push(`   → contoh balasan: ${p.no}. ${p.contohBalasan}`);
    }
  }
  return lines;
}

/** Template kosong agar warga tinggal salin & isi. */
export function formatTemplateBalasanKosong(poin: PoinBalasan[]): string[] {
  if (!poin.length) return [];
  return [
    "*Salin pesan ini, lalu isi jawaban Anda:*",
    ...poin.map((p) => {
      if (p.pilihan?.length) {
        return `${p.no}. (ketik huruf ${hurufPilihan(0)}-${hurufPilihan(p.pilihan.length - 1)} atau tulis jawaban)`;
      }
      return `${p.no}. `;
    }),
  ];
}

function catatanTambahan(input: HubungiWargaTemplateInput): string[] {
  const lines: string[] = [];
  const issues = input.issues ?? [];

  if (issues.includes("pekerjaan_salah_kategori")) {
    const wajib = pekerjaanWajibUntukKategori(
      getEffectiveKategoriUmur({
        tanggalLahir: input.tanggalLahir,
        kategoriUmur: input.kategoriUmur,
      }),
    );
    if (wajib) {
      lines.push(`Untuk usia terkait, biasanya tercatat sebagai: ${wajib}.`);
    }
  }

  if (input.chartLabel?.trim()) {
    lines.push(`Konteks pencatatan: ${input.chartLabel.trim()}.`);
  }

  return lines;
}

function sapaanPenerima(input: HubungiWargaTemplateInput): string {
  if (input.via === "kepala_keluarga") {
    const namaKk = input.namaKepalaKeluarga?.trim() || "Bapak/Ibu";
    return `Assalamu'alaikum Bapak/Ibu ${namaKk},`;
  }
  return `Assalamu'alaikum Bapak/Ibu ${input.namaLengkap.trim()},`;
}

function paragrafPembuka(jenis: HubungiWargaJenis): string {
  if (jenis === "pengingat_lembut") {
    return (
      "Kami dari KPP RW 03 Padasuka. Mohon maaf mengingatkan lagi — " +
      "kami belum menerima balasan untuk kelengkapan data. " +
      "Berikut poin yang masih kami butuhkan dari Bapak/Ibu."
    );
  }
  return (
    "Perkenalkan, kami dari KPP RW 03 Padasuka. " +
    "Mohon bantuannya mengirim data berikut agar catatan kependudukan keluarga lengkap."
  );
}

function siapaTeks(input: HubungiWargaTemplateInput): string {
  return input.via === "kepala_keluarga"
    ? `anggota keluarga ${input.namaLengkap.trim()} (${input.kedudukanKeluarga}, ${rtLabel(input.rt)})`
    : `${input.namaLengkap.trim()} (${input.kedudukanKeluarga}, ${rtLabel(input.rt)})`;
}

function paragrafInti(input: HubungiWargaTemplateInput, jenis: HubungiWargaJenis, jumlahPoin: number): string {
  const siapa = siapaTeks(input);
  if (jenis === "pengingat_lembut") {
    return (
      `Untuk ${siapa}, berikut *${jumlahPoin} poin* yang mohon dilengkapi.\n` +
      `Cara balas: ketik nomor + jawaban (boleh huruf pilihan, contoh: «1. a» atau «1. 12/03/1990»).`
    );
  }
  return (
    `Untuk ${siapa}, berikut *${jumlahPoin} poin data* yang perlu dikirim ke pengurus.\n` +
    `Cara mudah: pilih huruf (a/b/c…) bila ada pilihan, atau tulis singkat. Balas semua nomor dalam *satu pesan*.`
  );
}

function paragrafTutup(jenis: HubungiWargaJenis): string {
  const sekali =
    "Mohon isi *semua nomor* (boleh salin template di atas) agar kami tidak perlu menghubungi lagi.";
  if (jenis === "pengingat_lembut") {
    return `Tidak perlu buru-buru — ${sekali} Terima kasih banyak.`;
  }
  return `${sekali} Terima kasih atas kebaikannya.`;
}

/** Bangun teks WA dari daftar poin yang sudah dihitung (satu kebenaran dengan checklist). */
export function buildHubungiWargaPesanDariPoin(
  input: HubungiWargaTemplateInput,
  poin: PoinBalasan[],
): string {
  const jenis = input.jenis ?? "minta_bantuan";
  const normal = withDaftarKonkret({ ...input, jenis });
  const tambahan = catatanTambahan(normal);
  const daftar = formatPoinBalasanUntukPesan(poin);
  const templateIsi = formatTemplateBalasanKosong(poin);

  return [
    sapaanPenerima(normal),
    "",
    paragrafPembuka(jenis),
    "",
    paragrafInti(normal, jenis, poin.length),
    "",
    ...daftar,
    ...(tambahan.length ? ["", ...tambahan] : []),
    "",
    ...templateIsi,
    "",
    paragrafTutup(jenis),
    "",
    `— ${SENDER_LABEL_KEPENDUDUKAN}`,
  ].join("\n");
}

/** Bangun teks WA empatik untuk kelengkapan/verifikasi data. */
export function buildHubungiWargaPesan(input: HubungiWargaTemplateInput): string {
  const jenis = input.jenis ?? "minta_bantuan";
  const normal = withDaftarKonkret({ ...input, jenis });
  const poin = bangunPoinBalasan(normal);
  return buildHubungiWargaPesanDariPoin(normal, poin);
}

/** Wrapper kompatibel untuk verifikasi data (default: minta_bantuan). */
export function buildVerifikasiDataWaMessageFromIssues(
  w: Pick<
    WargaIssueSlice,
    | "namaLengkap"
    | "kedudukanKeluarga"
    | "rt"
    | "tanggalLahir"
    | "kategoriUmur"
    | "statusPekerjaan"
    | "pekerjaan"
  >,
  issues: WargaDataIssueId[],
  opts?: {
    jenis?: HubungiWargaJenis;
    via?: "warga" | "kepala_keluarga";
    namaKepalaKeluarga?: string | null;
    dataPribadi?: string[];
    dataKeluarga?: string[];
    dataAnggotaLain?: HubungiWargaTemplateInput["dataAnggotaLain"];
  },
): string {
  return buildHubungiWargaPesan({
    namaLengkap: w.namaLengkap,
    kedudukanKeluarga: w.kedudukanKeluarga,
    rt: w.rt,
    issues,
    tanggalLahir: w.tanggalLahir,
    kategoriUmur: w.kategoriUmur,
    pekerjaan: w.pekerjaan,
    statusPekerjaan: w.statusPekerjaan,
    jenis: opts?.jenis ?? "minta_bantuan",
    via: opts?.via ?? "warga",
    namaKepalaKeluarga: opts?.namaKepalaKeluarga,
    dataPribadi: opts?.dataPribadi,
    dataKeluarga: opts?.dataKeluarga,
    dataAnggotaLain: opts?.dataAnggotaLain,
  });
}

/** Wrapper untuk konfirmasi dari grafik pekerjaan. */
export function buildPekerjaanChartWaMessageEmpatik(
  w: Pick<WargaIssueSlice, "namaLengkap" | "kedudukanKeluarga" | "rt" | "pekerjaan" | "statusPekerjaan">,
  chartLabel: string,
  opts?: {
    jenis?: HubungiWargaJenis;
    via?: "warga" | "kepala_keluarga";
    namaKepalaKeluarga?: string | null;
    dataPribadi?: string[];
    dataKeluarga?: string[];
    dataAnggotaLain?: HubungiWargaTemplateInput["dataAnggotaLain"];
  },
): string {
  const issues: WargaDataIssueId[] = [];
  if (!w.pekerjaan?.trim()) issues.push("tanpa_pekerjaan");
  if (!w.statusPekerjaan?.trim()) issues.push("tanpa_status_pekerjaan");
  if (issues.length === 0) {
    issues.push("status_pekerjaan_tidak_selaras");
  }

  return buildHubungiWargaPesan({
    namaLengkap: w.namaLengkap,
    kedudukanKeluarga: w.kedudukanKeluarga,
    rt: w.rt,
    issues,
    pekerjaan: w.pekerjaan,
    statusPekerjaan: w.statusPekerjaan,
    chartLabel,
    jenis: opts?.jenis ?? "minta_bantuan",
    via: opts?.via ?? "warga",
    namaKepalaKeluarga: opts?.namaKepalaKeluarga,
    dataPribadi: opts?.dataPribadi,
    dataKeluarga: opts?.dataKeluarga,
    dataAnggotaLain: opts?.dataAnggotaLain,
  });
}

/** Pesan umum bila hanya punya nama + RT (mis. daftar statistik). */
export function buildHubungiWargaPesanUmum(opts: {
  namaLengkap: string;
  rt: number;
  jenis?: HubungiWargaJenis;
  kedudukanKeluarga?: string;
  dataPribadi?: string[];
  dataKeluarga?: string[];
  dataAnggotaLain?: HubungiWargaTemplateInput["dataAnggotaLain"];
}): string {
  return buildHubungiWargaPesan({
    namaLengkap: opts.namaLengkap,
    kedudukanKeluarga: opts.kedudukanKeluarga ?? "warga",
    rt: opts.rt,
    jenis: opts.jenis ?? "minta_bantuan",
    via: "warga",
    dataPribadi: opts.dataPribadi,
    dataKeluarga: opts.dataKeluarga,
    dataAnggotaLain: opts.dataAnggotaLain,
  });
}
