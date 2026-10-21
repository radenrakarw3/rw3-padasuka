export type SurveyChecklistKategori =
  | "administrasi"
  | "lingkungan"
  | "ketertiban"
  | "usaha";

export type SurveyChecklistItem = {
  id: string;
  label: string;
  hint?: string;
  /** Satu atau beberapa SDG terkait (3, 6, 11, 12, 16, …). */
  sdg?: number | number[];
  kategori?: SurveyChecklistKategori;
};

export const SDG_SINGKAT: Record<number, string> = {
  3: "SDG 3 · Sehat",
  6: "SDG 6 · Air & sanitasi",
  11: "SDG 11 · Kota layak huni",
  12: "SDG 12 · Limbah & konsumsi",
  16: "SDG 16 · Ketertiban & partisipasi",
};

export const KATEGORI_CHECKLIST_LABEL: Record<SurveyChecklistKategori, string> = {
  administrasi: "Verifikasi data & lokasi",
  lingkungan: "Lingkungan, limbah & SDGs — wajib ditanyakan",
  ketertiban: "Ketertiban, tetangga & kewajiban RW",
  usaha: "Khusus usaha / bisnis",
};

const URUTAN_KATEGORI: SurveyChecklistKategori[] = ["administrasi", "lingkungan", "ketertiban", "usaha"];

function item(
  partial: SurveyChecklistItem & { id: string; label: string },
): SurveyChecklistItem {
  return partial;
}

const PROPERTI_ADMINISTRASI: SurveyChecklistItem[] = [
  item({
    id: "alamat_sesuai",
    kategori: "administrasi",
    label: "Alamat properti sesuai lokasi fisik saat survey",
    hint: "Cocokkan titik di peta / lapangan dengan alamat pendaftaran.",
  }),
  item({
    id: "pemilik_terkonfirmasi",
    kategori: "administrasi",
    sdg: 16,
    label: "Identitas pemilik, WA, dan penanggung jawab sudah benar",
    hint: "Nama, nomor, dan orang yang dihubungi saat survey sama dengan pendaftaran.",
  }),
  item({
    id: "jumlah_unit_sesuai",
    kategori: "administrasi",
    label: "Jumlah unit / pintu / lokasi usaha sesuai kondisi lapangan",
  }),
  item({
    id: "status_hunian_jelas",
    kategori: "administrasi",
    sdg: 11,
    label: "Status hunian / kepemilikan dapat dijelaskan pemilik",
    hint: "Milik sendiri, kontrak, atau disewakan — tidak ada informasi yang disembunyikan.",
  }),
];

const PROPERTI_LINGKUNGAN: SurveyChecklistItem[] = [
  item({
    id: "limbah_sampah",
    kategori: "lingkungan",
    sdg: [12, 11],
    label: "Pengelolaan sampah organik & anorganik tidak sembarangan",
    hint: "Tanyakan: tempat sampah, jadwal angkut, tidak dibuang ke selokan / sembarang titik.",
  }),
  item({
    id: "limbah_cair",
    kategori: "lingkungan",
    sdg: [6, 12],
    label: "Air limbah / cucian tidak mencemari selokan atau lingkungan",
    hint: "Khusus usaha makanan/cuci — limbah cair tidak langsung ke got tanpa filter.",
  }),
  item({
    id: "sanitasi_wc",
    kategori: "lingkungan",
    sdg: 6,
    label: "Sanitasi (WC/jamban) memadai & tidak menimbulkan bau / penyakit",
    hint: "Kost/kontrakan: jumlah WC cukup penghuni; usaha: WC pelanggan/karyawan layak.",
  }),
  item({
    id: "drainase_genangan",
    kategori: "lingkungan",
    sdg: 11,
    label: "Tidak menambah genangan air atau menyumbat saluran drainase",
    hint: "Selokan depan properti bersih; air hujan tidak menggenangi tetangga.",
  }),
  item({
    id: "kebisingan_dipahami",
    kategori: "lingkungan",
    sdg: 11,
    label: "Pemilik paham batas kebisingan & jam tenang lingkungan",
    hint: "Musik keras, mesin, atau aktivitas malam tidak mengganggu warga.",
  }),
  item({
    id: "asap_bau_polusi",
    kategori: "lingkungan",
    sdg: [3, 11],
    label: "Tidak ada asap, bau menyengat, atau polusi udara berlebihan",
    hint: "Dapur usaha, bakar sampah, atau knalpot yang mengganggu tetangga.",
  }),
  item({
    id: "kondisi_bangunan_aman",
    kategori: "lingkungan",
    sdg: 11,
    label: "Bangunan & listrik aman — tidak rawan kebakaran / runtuh",
    hint: "Instalasi listrik tidak sembarangan; akses darurat penghuni jelas.",
  }),
];

const PROPERTI_KETERTIBAN: SurveyChecklistItem[] = [
  item({
    id: "tata_tertib_disampaikan",
    kategori: "ketertiban",
    sdg: 16,
    label: "Tata tertib Visit RW3 & RW 03 sudah disampaikan & dipahami",
  }),
  item({
    id: "hak_tetangga",
    kategori: "ketertiban",
    sdg: [16, 11],
    label: "Pemilik paham warga sekitar berhak lapor jika ada gangguan",
    hint: "Siap berdialog dengan RT/RW bila ada keluhan limbah, bising, atau parkir.",
  }),
  item({
    id: "partisipasi_rw",
    kategori: "ketertiban",
    sdg: 16,
    label: "Bersedia ikut program RW (kerja bakti, blusukan, sosialisasi bila perlu)",
  }),
];

const PROPERTI_USAHA_BISNIS: SurveyChecklistItem[] = [
  item({
    id: "limbah_usaha_dikelola",
    kategori: "usaha",
    sdg: 12,
    label: "Limbah usaha (kemasan, sisa makanan, minyak) dikelola, tidak menumpuk",
  }),
  item({
    id: "parkir_tidak_ganggu",
    kategori: "usaha",
    sdg: 11,
    label: "Parkir kendaraan operasional tidak menghalangi jalan / tetangga",
  }),
  item({
    id: "jam_operasional_lingkungan",
    kategori: "usaha",
    sdg: 11,
    label: "Jam operasional disepakati & tidak mengganggu istirahat warga",
  }),
];

export function getChecklistSurveyProperti(jenisProperti?: string | null): SurveyChecklistItem[] {
  const items = [...PROPERTI_ADMINISTRASI, ...PROPERTI_LINGKUNGAN, ...PROPERTI_KETERTIBAN];

  if (jenisProperti === "usaha_rumahan") {
    items.push(
      item({
        id: "rumah_milik_sendiri",
        kategori: "usaha",
        label: "Usaha benar-benar di rumah milik pemilik (bukan sewa/kost)",
        hint: "Pemilik sekaligus pengaju VRW3 tahap 2.",
      }),
      ...PROPERTI_USAHA_BISNIS,
    );
  } else if (jenisProperti === "kiosk" || jenisProperti === "lapak") {
    items.push(
      item({
        id: "izin_usaha_jelas",
        kategori: "usaha",
        label: "Pemilik paham pengusaha yang akan ajukan VRW3 terpisah",
      }),
      ...PROPERTI_USAHA_BISNIS,
    );
  } else {
    items.push(
      item({
        id: "alur_penyewa_jelas",
        kategori: "administrasi",
        label: "Pemilik paham alur: daftar properti dulu, penyewa ajukan VRW3 sendiri",
      }),
    );
    if (jenisProperti === "kontrakan") {
      items.push(
        item({
          id: "opsi_bisnis_dipahami",
          kategori: "usaha",
          label: "Opsi usaha di kontrakan (warung depan, dll.) & dampak lingkungannya dijelaskan",
          hint: "Sesuai centang izin bisnis — termasuk limbah & kebisingan.",
        }),
      );
    }
    if (jenisProperti === "kost") {
      items.push(
        item({
          id: "kapasitas_penghuni_lingkungan",
          kategori: "lingkungan",
          sdg: [11, 6],
          label: "Kapasitas penghuni realistis — WC, sampah, & parkir sanggup ditampung",
        }),
      );
    }
  }

  return items;
}

const PENGAJUAN_ADMIN: SurveyChecklistItem[] = [
  item({
    id: "data_penghuni_sesuai",
    kategori: "administrasi",
    sdg: 16,
    label: "Data penghuni / penanggung jawab & KTP sesuai dokumen",
  }),
  item({
    id: "keperluan_jelas",
    kategori: "administrasi",
    label: "Keperluan pengajuan (tinggal / bisnis) sudah jelas & jujur",
    hint: "Cocokkan tempat kerja/kampus, untuk apa, dan rencana tinggal sampai kapan dengan isian form.",
  }),
];

const PENGAJUAN_LINGKUNGAN: SurveyChecklistItem[] = [
  item({
    id: "limbah_penghuni",
    kategori: "lingkungan",
    sdg: [12, 11],
    label: "Pemohon paham larangan buang sampah sembarangan di lingkungan RW",
    hint: "Ikut aturan RT, tempat sampah, dan hari angkut sampah.",
  }),
  item({
    id: "sanitasi_lokasi",
    kategori: "lingkungan",
    sdg: 6,
    label: "Sanitasi di lokasi tinggal/usaha layak (WC bersih, tidak bau)",
  }),
  item({
    id: "air_bersih",
    kategori: "lingkungan",
    sdg: 6,
    label: "Akses air bersih tersedia & tidak mencemari lingkungan",
  }),
  item({
    id: "kebisingan_asap",
    kategori: "lingkungan",
    sdg: [11, 3],
    label: "Tidak rencanakan kebisingan/asap/bau yang mengganggu tetangga",
  }),
  item({
    id: "kondisi_lokasi_layak",
    kategori: "lingkungan",
    sdg: 11,
    label: "Lokasi tinggal/usaha layak huni & aman secara struktur",
  }),
];

const PENGAJUAN_KETERTIBAN: SurveyChecklistItem[] = [
  item({
    id: "tata_tertib_disampaikan",
    kategori: "ketertiban",
    sdg: 16,
    label: "Syarat, tata tertib & sanksi pelanggaran sudah disampaikan",
  }),
  item({
    id: "responsif_laporan_warga",
    kategori: "ketertiban",
    sdg: 16,
    label: "Pemohon bersedia diajak mediasi RT/RW jika ada laporan warga",
  }),
  item({
    id: "partisipasi_program_rw",
    kategori: "ketertiban",
    sdg: 16,
    label: "Pemohon paham kewajiban ikut program RW (kerja bakti, blusukan, sosialisasi)",
  }),
];

export function getChecklistSurveyPengajuan(
  keperluan: "tinggal" | "bisnis",
  tinggalDiWilayah?: boolean | null,
): SurveyChecklistItem[] {
  const items = [...PENGAJUAN_ADMIN, ...PENGAJUAN_LINGKUNGAN, ...PENGAJUAN_KETERTIBAN];

  if (keperluan === "bisnis") {
    items.push(
      item({
        id: "limbah_cair_usaha",
        kategori: "lingkungan",
        sdg: [6, 12],
        label: "Limbah cair usaha (cuci, dapur) tidak dibuang ke selokan sembarangan",
      }),
      item({
        id: "jam_operasional",
        kategori: "usaha",
        sdg: 11,
        label: "Jam operasional, parkir, & dampak lingkungan sudah ditanyakan",
      }),
      item({
        id: "limbah_kemasan_usaha",
        kategori: "usaha",
        sdg: 12,
        label: "Limbah kemasan / sisa produksi usaha rencananya dikelola dengan benar",
      }),
    );
    if (tinggalDiWilayah === true) {
      items.push(
        item({
          id: "tetangga_usaha",
          kategori: "ketertiban",
          sdg: [16, 11],
          label: "Pemohon paham tetangga sekitar dapat keberatan jika ada gangguan",
          hint: "Siap atur volume suara, bau, dan sampah dari operasional usaha.",
        }),
      );
    }
  }

  if (keperluan === "tinggal") {
    items.push(
      item({
        id: "kendaraan_parkir",
        kategori: "lingkungan",
        sdg: 11,
        label: "Kendaraan penghuni tidak menghalangi jalan / gang / tetangga",
      }),
      item({
        id: "kendaraan_stnk_cocok",
        kategori: "administrasi",
        sdg: 16,
        label: "STNK tiap kendaraan dicocokkan: plat, merek, warna, nama pemilik, dan status lunas/cicilan",
        hint: "Pemohon hanya mengisi jenis & plat — sisanya dicek dari STNK. Milik orang lain/cicilan: tanyakan bukti (izin pemilik, kartu angsuran). Tidak punya kendaraan: langsung centang.",
      }),
    );
  }

  return items;
}

export function groupChecklistByKategori(
  items: SurveyChecklistItem[],
): { kategori: SurveyChecklistKategori; label: string; items: SurveyChecklistItem[] }[] {
  const groups = new Map<SurveyChecklistKategori, SurveyChecklistItem[]>();
  for (const it of items) {
    const k = it.kategori ?? "administrasi";
    const list = groups.get(k) ?? [];
    list.push(it);
    groups.set(k, list);
  }
  return URUTAN_KATEGORI.filter((k) => groups.has(k)).map((k) => ({
    kategori: k,
    label: KATEGORI_CHECKLIST_LABEL[k],
    items: groups.get(k)!,
  }));
}

export function sdgBadges(item: SurveyChecklistItem): number[] {
  if (!item.sdg) return [];
  return Array.isArray(item.sdg) ? item.sdg : [item.sdg];
}

export function initChecklistState(items: SurveyChecklistItem[]): Record<string, boolean> {
  return Object.fromEntries(items.map((i) => [i.id, false]));
}

export function validateSurveyChecklist(
  items: SurveyChecklistItem[],
  checked: Record<string, boolean> | undefined,
): string | null {
  if (!items.length) return null;
  for (const item of items) {
    if (!checked?.[item.id]) {
      return `Checklist survey: centang "${item.label}"`;
    }
  }
  return null;
}

export function countChecklistDone(items: SurveyChecklistItem[], checked: Record<string, boolean>): number {
  return items.filter((i) => checked[i.id]).length;
}
