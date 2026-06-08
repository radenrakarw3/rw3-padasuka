import type { ProgramRw } from "./schema";
import {
  calcProgressPercent,
  type PilarProgram,
  pilarProgramLabels,
  SUB_PROGRAM_DEFS,
} from "./program-kerja";

export type ProgramPublicItem = {
  id: number;
  namaProgram: string;
  deskripsi: string | null;
  pilar: string;
  subProgram: string | null;
  status: string;
  targetNilai: number | null;
  capaianNilai: number | null;
  satuanTarget: string | null;
  progressPercent: number;
  tanggalPelaksanaan: string;
};

export type PilarSummary = {
  pilar: PilarProgram;
  label: string;
  totalProgram: number;
  berjalan: number;
  selesai: number;
  avgProgress: number;
  programs: ProgramPublicItem[];
};

export function toProgramPublicItem(p: ProgramRw): ProgramPublicItem {
  return {
    id: p.id,
    namaProgram: p.namaProgram,
    deskripsi: p.deskripsi,
    pilar: p.pilar,
    subProgram: p.subProgram,
    status: p.status,
    targetNilai: p.targetNilai,
    capaianNilai: p.capaianNilai,
    satuanTarget: p.satuanTarget,
    progressPercent: calcProgressPercent(p.targetNilai, p.capaianNilai),
    tanggalPelaksanaan: p.tanggalPelaksanaan,
  };
}

export function groupProgramsByPilar(programs: ProgramRw[]): PilarSummary[] {
  const pilars: PilarProgram[] = ["infrastruktur", "digitalisasi", "ekonomi"];
  return pilars.map((pilar) => {
    const items = programs.filter((p) => p.pilar === pilar).map(toProgramPublicItem);
    const progressVals = items
      .filter((i) => i.targetNilai && i.targetNilai > 0)
      .map((i) => i.progressPercent);
    const avgProgress = progressVals.length
      ? Math.round(progressVals.reduce((a, b) => a + b, 0) / progressVals.length)
      : 0;
    return {
      pilar,
      label: pilarProgramLabels[pilar],
      totalProgram: items.length,
      berjalan: items.filter((i) => i.status === "berjalan").length,
      selesai: items.filter((i) => i.status === "selesai").length,
      avgProgress,
      programs: items,
    };
  });
}

export type ProgramKerjaDashboardStats = {
  indeksKemajuan: number;
  laporan: { total: number; pending: number; selesai: number; rateSelesai: number };
  program: { total: number; berjalan: number; selesai: number };
  pilar: PilarSummary[];
  subProgramCoverage: { slug: string; hasProgram: boolean; nama: string }[];
};

export function buildSubProgramCoverage(programs: ProgramRw[]) {
  const slugs = new Set(programs.map((p) => p.subProgram).filter(Boolean));
  return SUB_PROGRAM_DEFS.map((def) => ({
    slug: def.slug,
    nama: def.nama,
    hasProgram: slugs.has(def.slug),
  }));
}

export function buildProgramKerjaDashboard(
  programs: ProgramRw[],
  laporanStats: { total: number; pending: number; selesai: number },
  indeksKemajuan: number,
): ProgramKerjaDashboardStats {
  const rateSelesai =
    laporanStats.total > 0
      ? Math.round((laporanStats.selesai / laporanStats.total) * 100)
      : 0;
  return {
    indeksKemajuan,
    laporan: { ...laporanStats, rateSelesai },
    program: {
      total: programs.length,
      berjalan: programs.filter((p) => p.status === "berjalan").length,
      selesai: programs.filter((p) => p.status === "selesai").length,
    },
    pilar: groupProgramsByPilar(programs),
    subProgramCoverage: buildSubProgramCoverage(programs),
  };
}

export type TransparansiPublik = {
  laporanRateSelesai: number;
  totalLaporan: number;
  propertiVisitRw3: number;
  penghuniAktif: number;
  sensusKelengkapan: number;
  totalKk: number;
  programBerjalan: number;
};
