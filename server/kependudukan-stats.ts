import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import {
  buildPekerjaanRingkasan,
  countPengangguranRows,
  isWargaPengangguran,
  normalizePekerjaanLabel,
  type PekerjaanRingkasan,
  type WargaPengangguranSlice,
} from "@shared/pekerjaan-labor";
import { buildKelompokUsiaMap, type WargaKategoriSlice } from "@shared/kategori-umur";
import type { KartuKeluarga, Warga } from "@shared/schema";

export type KependudukanStats = {
  generatedAt: string;
  rtFilter?: number;
  totalWarga: number;
  totalKk: number;
  rataRataAnggotaPerKk: number;
  kelompokUsia: Record<string, number>;
  perRt: { rt: number; warga: number; kk: number }[];
  pengangguran: {
    total: number;
    ratePercent: number;
  };
  pekerjaan: {
    distribusi: Record<string, number>;
    ringkasan: PekerjaanRingkasan;
  };
};

/** Pengangguran — status ILO utama + fallback pekerjaan legacy, filter usia eligible. */
export function isPengangguran(w: Warga): boolean {
  return isWargaPengangguran(w as WargaPengangguranSlice);
}

function buildPengangguran(allWarga: Warga[]): KependudukanStats["pengangguran"] {
  const { total, eligible } = countPengangguranRows(allWarga as WargaPengangguranSlice[]);
  return {
    total,
    ratePercent: eligible > 0 ? Math.round((total / eligible) * 100) : 0,
  };
}

function buildPekerjaanDistribusi(allWarga: Warga[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const w of allWarga) {
    const label = normalizePekerjaanLabel(w.pekerjaan);
    map[label] = (map[label] || 0) + 1;
  }
  return map;
}

export function buildKependudukanStats(
  allKk: KartuKeluarga[],
  allWarga: Warga[],
  allKkForRt: KartuKeluarga[],
  rtFilter?: number,
): KependudukanStats {
  const kkRtMap = new Map(allKkForRt.map((k) => [k.id, k.rt]));
  const perRt = [...ACTIVE_RT_NUMBERS].map((rt) => ({
    rt,
    warga: allWarga.filter((w) => kkRtMap.get(w.kkId) === rt).length,
    kk: allKkForRt.filter((k) => k.rt === rt).length,
  }));

  const pekerjaanDistribusi = buildPekerjaanDistribusi(allWarga);
  const pekerjaanRingkasan = buildPekerjaanRingkasan(allWarga as WargaPengangguranSlice[]);
  const totalKk = allKk.length;
  const rataRataAnggotaPerKk =
    totalKk > 0 ? Math.round((allWarga.length / totalKk) * 10) / 10 : 0;

  return {
    generatedAt: new Date().toISOString(),
    rtFilter,
    totalWarga: allWarga.length,
    totalKk,
    rataRataAnggotaPerKk,
    kelompokUsia: buildKelompokUsiaMap(allWarga as WargaKategoriSlice[]),
    perRt,
    pengangguran: buildPengangguran(allWarga),
    pekerjaan: { distribusi: pekerjaanDistribusi, ringkasan: pekerjaanRingkasan },
  };
}
