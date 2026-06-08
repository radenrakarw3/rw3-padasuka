import { ACTIVE_RT_NUMBERS } from "@shared/rt";

export type Visitrw3StatsRow = { label: string; count: number };

export type Visitrw3DashboardStats = {
  ringkasan: {
    totalPengajuan: number;
    menungguSurvey: number;
    disetujui: number;
    ditolak: number;
    totalProperti: number;
    propertiMenunggu: number;
    penghuniAktif: number;
    totalKontribusiKasRw: number;
  };
  pengajuan: {
    byKeperluan: Record<string, number>;
    byTipe: Record<string, number>;
    byStatus: Record<string, number>;
    byRt: { rt: number; count: number }[];
    byTerminBulan: { termin: number; count: number }[];
    byJumlahPenghuni: Visitrw3StatsRow[];
    bisnisDiRw3: number;
    bisnisLuar: number;
    byJenisTempatUsaha: Visitrw3StatsRow[];
    setujuTataTertib: { ya: number; tidak: number };
    denganNomorUnit: number;
    tanpaNomorUnit: number;
    denganCatatanPemohon: number;
    denganProperti: number;
    tanpaProperti: number;
  };
  penghuni: {
    totalBaris: number;
    anakVsDewasa: { anak: number; dewasa: number };
    byJenisKelamin: Visitrw3StatsRow[];
    byKelompokUsia: Visitrw3StatsRow[];
    byKeperluanTinggal: Visitrw3StatsRow[];
    byJenjangAnak: Visitrw3StatsRow[];
    topPekerjaan: Visitrw3StatsRow[];
    denganKendaraan: number;
    tanpaKendaraan: number;
    byJenisKendaraan: Visitrw3StatsRow[];
    withFotoKtp: number;
    withoutFotoKtp: number;
    topTempatKerja: Visitrw3StatsRow[];
  };
  properti: {
    byJenisProperti: Visitrw3StatsRow[];
    byStatusProperti: Visitrw3StatsRow[];
    byRt: { rt: number; count: number }[];
    izinTinggal: number;
    izinBisnis: number;
    byIzinKombinasi: Visitrw3StatsRow[];
    byJumlahPintu: Visitrw3StatsRow[];
    denganPenanggungJawab: number;
    tanpaPenanggungJawab: number;
    setujuTataTertib: { ya: number; tidak: number };
    denganCatatanPemohon: number;
  };
  trenBulan: { bulan: string; count: number }[];
  pengajuanTerbaru: {
    id: number;
    nomorVisitrw3: string;
    keperluanPengajuan: string;
    status: string;
    rt: number;
    createdAt: string | null;
  }[];
  rtList: number[];
};

export const visitrw3StatusLabels: Record<string, string> = {
  menunggu_survey: "Menunggu survey",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const visitrw3KeperluanLabels: Record<string, string> = {
  tinggal: "Tinggal",
  bisnis: "Bisnis",
};

export const visitrw3TipeLabels: Record<string, string> = {
  pengajuan_baru: "Pengajuan baru",
  perpanjang: "Perpanjang",
};

export const visitrw3PropertiStatusLabels: Record<string, string> = {
  menunggu_verifikasi: "Menunggu verifikasi",
  aktif: "Aktif",
};

export const visitrw3JenisPropertiLabels: Record<string, string> = {
  kost: "Kost",
  kontrakan: "Kontrakan",
  kiosk: "Kiosk",
  lapak: "Lapak",
};

export function labelJumlahPenghuniPengajuan(n: number): string {
  if (n <= 1) return "1 orang";
  if (n === 2) return "2 orang";
  if (n <= 5) return "3–5 orang";
  return "6+ orang";
}

export function ageFromYmd(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((ymd || "").trim());
  if (!m) return null;
  const birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function kelompokUsiaLabel(age: number): string {
  if (age < 18) return "Anak (<18 th)";
  if (age < 25) return "Remaja (18–24 th)";
  if (age < 60) return "Dewasa (25–59 th)";
  return "Lansia (60+ th)";
}

export function labelIzinProperti(izinTinggal: boolean, izinBisnis: boolean): string {
  if (izinTinggal && izinBisnis) return "Tinggal & bisnis";
  if (izinTinggal) return "Tinggal saja";
  if (izinBisnis) return "Bisnis saja";
  return "Tanpa izin";
}

export function labelJumlahPintuTier(n: number): string {
  if (n <= 3) return "Kecil (1–3 pintu)";
  if (n <= 8) return "Sedang (4–8 pintu)";
  return "Besar (9+ pintu)";
}

export function emptyVisitrw3DashboardStats(): Visitrw3DashboardStats {
  return {
    ringkasan: {
      totalPengajuan: 0,
      menungguSurvey: 0,
      disetujui: 0,
      ditolak: 0,
      totalProperti: 0,
      propertiMenunggu: 0,
      penghuniAktif: 0,
      totalKontribusiKasRw: 0,
    },
    pengajuan: {
      byKeperluan: {},
      byTipe: {},
      byStatus: {},
      byRt: [],
      byTerminBulan: [],
      byJumlahPenghuni: [],
      bisnisDiRw3: 0,
      bisnisLuar: 0,
      byJenisTempatUsaha: [],
      setujuTataTertib: { ya: 0, tidak: 0 },
      denganNomorUnit: 0,
      tanpaNomorUnit: 0,
      denganCatatanPemohon: 0,
      denganProperti: 0,
      tanpaProperti: 0,
    },
    penghuni: {
      totalBaris: 0,
      anakVsDewasa: { anak: 0, dewasa: 0 },
      byJenisKelamin: [],
      byKelompokUsia: [],
      byKeperluanTinggal: [],
      byJenjangAnak: [],
      topPekerjaan: [],
      denganKendaraan: 0,
      tanpaKendaraan: 0,
      byJenisKendaraan: [],
      withFotoKtp: 0,
      withoutFotoKtp: 0,
      topTempatKerja: [],
    },
    properti: {
      byJenisProperti: [],
      byStatusProperti: [],
      byRt: [],
      izinTinggal: 0,
      izinBisnis: 0,
      byIzinKombinasi: [],
      byJumlahPintu: [],
      denganPenanggungJawab: 0,
      tanpaPenanggungJawab: 0,
      setujuTataTertib: { ya: 0, tidak: 0 },
      denganCatatanPemohon: 0,
    },
    trenBulan: [],
    pengajuanTerbaru: [],
    rtList: [...ACTIVE_RT_NUMBERS],
  };
}

function statsRowsFromLegacy(
  value: Visitrw3StatsRow[] | Record<string, number> | undefined | null,
): Visitrw3StatsRow[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return Object.entries(value)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function boolPair(
  value: { ya: number; tidak: number } | undefined | null,
  fallback: { ya: number; tidak: number },
): { ya: number; tidak: number } {
  return {
    ya: value?.ya ?? fallback.ya,
    tidak: value?.tidak ?? fallback.tidak,
  };
}

/** Mengisi field yang hilang — kompatibel respons API lama / cache React Query. */
export function normalizeVisitrw3DashboardStats(
  raw: Partial<Visitrw3DashboardStats> | null | undefined,
): Visitrw3DashboardStats {
  const base = emptyVisitrw3DashboardStats();
  if (!raw) return base;

  const p = raw.pengajuan;
  const n = raw.penghuni;
  const pr = raw.properti;

  return {
    ringkasan: { ...base.ringkasan, ...raw.ringkasan },
    pengajuan: {
      ...base.pengajuan,
      ...p,
      byKeperluan: p?.byKeperluan ?? base.pengajuan.byKeperluan,
      byTipe: p?.byTipe ?? base.pengajuan.byTipe,
      byStatus: p?.byStatus ?? base.pengajuan.byStatus,
      byRt: p?.byRt ?? base.pengajuan.byRt,
      byTerminBulan: p?.byTerminBulan ?? base.pengajuan.byTerminBulan,
      byJumlahPenghuni: p?.byJumlahPenghuni ?? base.pengajuan.byJumlahPenghuni,
      bisnisDiRw3: p?.bisnisDiRw3 ?? base.pengajuan.bisnisDiRw3,
      bisnisLuar: p?.bisnisLuar ?? base.pengajuan.bisnisLuar,
      byJenisTempatUsaha: statsRowsFromLegacy(p?.byJenisTempatUsaha as Visitrw3StatsRow[] | Record<string, number>),
      setujuTataTertib: boolPair(p?.setujuTataTertib, base.pengajuan.setujuTataTertib),
      denganNomorUnit: p?.denganNomorUnit ?? base.pengajuan.denganNomorUnit,
      tanpaNomorUnit: p?.tanpaNomorUnit ?? base.pengajuan.tanpaNomorUnit,
      denganCatatanPemohon: p?.denganCatatanPemohon ?? base.pengajuan.denganCatatanPemohon,
      denganProperti: p?.denganProperti ?? base.pengajuan.denganProperti,
      tanpaProperti: p?.tanpaProperti ?? base.pengajuan.tanpaProperti,
    },
    penghuni: {
      ...base.penghuni,
      ...n,
      totalBaris: n?.totalBaris ?? base.penghuni.totalBaris,
      anakVsDewasa: {
        anak: n?.anakVsDewasa?.anak ?? base.penghuni.anakVsDewasa.anak,
        dewasa: n?.anakVsDewasa?.dewasa ?? base.penghuni.anakVsDewasa.dewasa,
      },
      byJenisKelamin: statsRowsFromLegacy(
        n?.byJenisKelamin as Visitrw3StatsRow[] | Record<string, number> | undefined,
      ),
      byKelompokUsia: n?.byKelompokUsia ?? base.penghuni.byKelompokUsia,
      byKeperluanTinggal: n?.byKeperluanTinggal ?? base.penghuni.byKeperluanTinggal,
      byJenjangAnak: n?.byJenjangAnak ?? base.penghuni.byJenjangAnak,
      topPekerjaan: statsRowsFromLegacy(n?.topPekerjaan as Visitrw3StatsRow[] | Record<string, number>),
      denganKendaraan: n?.denganKendaraan ?? base.penghuni.denganKendaraan,
      tanpaKendaraan: n?.tanpaKendaraan ?? base.penghuni.tanpaKendaraan,
      byJenisKendaraan: statsRowsFromLegacy(n?.byJenisKendaraan as Visitrw3StatsRow[] | Record<string, number>),
      withFotoKtp: n?.withFotoKtp ?? base.penghuni.withFotoKtp,
      withoutFotoKtp: n?.withoutFotoKtp ?? base.penghuni.withoutFotoKtp,
      topTempatKerja: n?.topTempatKerja ?? base.penghuni.topTempatKerja,
    },
    properti: {
      ...base.properti,
      ...pr,
      byJenisProperti: statsRowsFromLegacy(pr?.byJenisProperti as Visitrw3StatsRow[] | Record<string, number>),
      byStatusProperti: statsRowsFromLegacy(pr?.byStatusProperti as Visitrw3StatsRow[] | Record<string, number>),
      byRt: pr?.byRt ?? base.properti.byRt,
      izinTinggal: pr?.izinTinggal ?? base.properti.izinTinggal,
      izinBisnis: pr?.izinBisnis ?? base.properti.izinBisnis,
      byIzinKombinasi: pr?.byIzinKombinasi ?? base.properti.byIzinKombinasi,
      byJumlahPintu: statsRowsFromLegacy(pr?.byJumlahPintu as Visitrw3StatsRow[] | Record<string, number>),
      denganPenanggungJawab: pr?.denganPenanggungJawab ?? base.properti.denganPenanggungJawab,
      tanpaPenanggungJawab: pr?.tanpaPenanggungJawab ?? base.properti.tanpaPenanggungJawab,
      setujuTataTertib: boolPair(pr?.setujuTataTertib, base.properti.setujuTataTertib),
      denganCatatanPemohon: pr?.denganCatatanPemohon ?? base.properti.denganCatatanPemohon,
    },
    trenBulan: raw.trenBulan ?? base.trenBulan,
    pengajuanTerbaru: raw.pengajuanTerbaru ?? base.pengajuanTerbaru,
    rtList: raw.rtList?.length ? raw.rtList : base.rtList,
  };
}
