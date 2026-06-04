import { pool } from "./db";
import { storage } from "./storage";
import { ACTIVE_RT_NUMBERS, isActiveRt, assertKkInPemukimanScope } from "@shared/rt";
import {
  computeKkCompleteness,
  countBelumDiverifikasi,
} from "@shared/profile-completeness";
import type { BlusukanKunjungan, KartuKeluarga, Warga } from "@shared/schema";

export async function ensureBlusukanSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blusukan_kunjungan (
      id serial PRIMARY KEY,
      kk_id integer NOT NULL REFERENCES kartu_keluarga(id),
      hasil text NOT NULL,
      catatan text,
      petugas_label text,
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_blusukan_kunjungan_kk_id ON blusukan_kunjungan(kk_id);
    CREATE INDEX IF NOT EXISTS idx_blusukan_kunjungan_created_at ON blusukan_kunjungan(created_at DESC);
  `);
}

type LatestKunjungan = Pick<BlusukanKunjungan, "kkId" | "hasil" | "catatan" | "createdAt">;

function needsVisit(latest: LatestKunjungan | undefined): boolean {
  if (!latest) return true;
  if (latest.hasil === "perlu_ulang") return true;
  if (latest.hasil === "selesai") return false;
  return true;
}

function kunjunganPriority(
  latest: LatestKunjungan | undefined,
  completionPercent: number,
  belumVerifikasi: number,
): number {
  let score = 0;
  if (needsVisit(latest)) score += 1000;
  score += 100 - completionPercent;
  score += belumVerifikasi * 10;
  return score;
}

/** Muat KK & warga hanya RT 01–04 (query DB + validasi). */
async function loadPemukimanScope(rtFilter?: number) {
  const allKk = await storage.getAllKkPemukiman();
  const kkList =
    rtFilter != null ? allKk.filter((k) => k.rt === rtFilter && isActiveRt(k.rt)) : allKk;
  const kkIds = new Set(kkList.map((k) => k.id));
  const allWarga = (await storage.getAllWargaPemukiman()).filter((w) => kkIds.has(w.kkId));
  return { kkList, allWarga, kkIds };
}

export async function getBlusukanDashboard(rtFilter?: number) {
  const { kkList, allWarga } = await loadPemukimanScope(rtFilter);
  const kkIds = kkList.map((k) => k.id);
  const latestMap = await storage.getLatestKunjunganByKkIds(kkIds);

  let lengkap = 0;
  let diverifikasi = 0;
  let kunjunganSelesai = 0;
  let perluKunjungan = 0;

  const byRt: Record<number, { kk: number; warga: number; perluKunjungan: number }> = {};
  for (const rt of ACTIVE_RT_NUMBERS) {
    byRt[rt] = { kk: 0, warga: 0, perluKunjungan: 0 };
  }

  for (const kk of kkList) {
    if (!isActiveRt(kk.rt)) continue;

    const anggota = allWarga.filter((w) => w.kkId === kk.id);
    const comp = computeKkCompleteness(anggota, kk);
    if (comp.isComplete) lengkap++;
    if (anggota.every((w) => w.statusVerifikasiData === "Sudah Diverifikasi")) diverifikasi++;

    const latest = latestMap.get(kk.id);
    if (latest?.hasil === "selesai") kunjunganSelesai++;
    if (needsVisit(latest)) perluKunjungan++;

    if (byRt[kk.rt]) {
      byRt[kk.rt].kk++;
      byRt[kk.rt].warga += anggota.length;
      if (needsVisit(latest)) byRt[kk.rt].perluKunjungan++;
    }
  }

  const totalKk = kkList.length;
  const totalWarga = allWarga.length;

  return {
    totalKk,
    totalWarga,
    percentLengkap: totalKk ? Math.round((lengkap / totalKk) * 100) : 0,
    percentDiverifikasi: totalKk ? Math.round((diverifikasi / totalKk) * 100) : 0,
    percentKunjunganSelesai: totalKk ? Math.round((kunjunganSelesai / totalKk) * 100) : 0,
    perluKunjungan,
    perRt: ACTIVE_RT_NUMBERS.map((rt) => ({
      rt,
      ...byRt[rt],
    })),
  };
}

export type BlusukanKeluargaRow = {
  kkId: number;
  nomorKk: string;
  rt: number;
  alamat: string;
  kepalaKeluarga: string | null;
  jumlahAnggota: number;
  completionPercent: number;
  belumVerifikasi: number;
  kunjunganTerakhir: { hasil: string; createdAt: string | null } | null;
  perluKunjungan: boolean;
};

export const BLUSUKAN_KELUARGA_DEFAULT_LIMIT = 15;
export const BLUSUKAN_KELUARGA_MAX_LIMIT = 50;

export type BlusukanKeluargaPage = {
  rows: BlusukanKeluargaRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function listBlusukanKeluarga(
  rtFilter?: number,
  q?: string,
  page = 1,
  limit = BLUSUKAN_KELUARGA_DEFAULT_LIMIT,
): Promise<BlusukanKeluargaPage> {
  const { kkList, allWarga } = await loadPemukimanScope(rtFilter);
  const kkIds = kkList.map((k) => k.id);
  const latestMap = await storage.getLatestKunjunganByKkIds(kkIds);

  const query = (q || "").trim().toLowerCase();

  const rows: (BlusukanKeluargaRow & { _priority: number })[] = [];

  for (const kk of kkList) {
    if (!isActiveRt(kk.rt)) continue;

    const anggota = allWarga.filter((w) => w.kkId === kk.id);
    const kepala = anggota.find((w) => w.kedudukanKeluarga === "Kepala Keluarga");
    const comp = computeKkCompleteness(anggota, kk);
    const belumVerifikasi = countBelumDiverifikasi(anggota);
    const latest = latestMap.get(kk.id);

    if (query) {
      const match =
        kk.nomorKk.includes(query) ||
        kk.alamat.toLowerCase().includes(query) ||
        kepala?.namaLengkap.toLowerCase().includes(query) ||
        anggota.some(
          (w) =>
            w.namaLengkap.toLowerCase().includes(query) ||
            w.nik.includes(query),
        );
      if (!match) continue;
    }

    rows.push({
      kkId: kk.id,
      nomorKk: kk.nomorKk,
      rt: kk.rt,
      alamat: kk.alamat,
      kepalaKeluarga: kepala?.namaLengkap ?? null,
      jumlahAnggota: anggota.length,
      completionPercent: comp.completionPercent,
      belumVerifikasi,
      kunjunganTerakhir: latest
        ? {
            hasil: latest.hasil,
            createdAt: latest.createdAt?.toISOString() ?? null,
          }
        : null,
      perluKunjungan: needsVisit(latest),
      _priority: kunjunganPriority(latest, comp.completionPercent, belumVerifikasi),
    });
  }

  const sorted = rows
    .sort((a, b) => b._priority - a._priority)
    .map(({ _priority: _, ...row }) => row);

  const safeLimit = Math.min(
    BLUSUKAN_KELUARGA_MAX_LIMIT,
    Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : BLUSUKAN_KELUARGA_DEFAULT_LIMIT),
  );
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1), totalPages);
  const offset = (safePage - 1) * safeLimit;

  return {
    rows: sorted.slice(offset, offset + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}

export type BlusukanCariRow = {
  wargaId: number;
  namaLengkap: string;
  nik: string;
  kedudukanKeluarga: string;
  nomorWhatsapp: string | null;
  kkId: number;
  nomorKk: string;
  rt: number;
  alamat: string;
};

export async function searchBlusukanWarga(q: string): Promise<BlusukanCariRow[]> {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];

  const all = await storage.getAllWargaWithKkPemukiman();

  return all
    .filter(
      (w) =>
        isActiveRt(w.rt) &&
        (w.namaLengkap.toLowerCase().includes(query) ||
          w.nik.includes(query) ||
          w.nomorKk.includes(query) ||
          w.alamat.toLowerCase().includes(query)),
    )
    .slice(0, 50)
    .map((w) => ({
      wargaId: w.id,
      namaLengkap: w.namaLengkap,
      nik: w.nik,
      kedudukanKeluarga: w.kedudukanKeluarga,
      nomorWhatsapp: w.nomorWhatsapp,
      kkId: w.kkId,
      nomorKk: w.nomorKk,
      rt: w.rt,
      alamat: w.alamat,
    }));
}

export async function getBlusukanKkDetail(kkId: number) {
  const kk = await storage.getKkById(kkId);
  if (!kk || !isActiveRt(kk.rt)) return null;

  const anggota = await storage.getWargaByKkId(kkId);
  const completeness = computeKkCompleteness(anggota, kk);
  const latestMap = await storage.getLatestKunjunganByKkIds([kkId]);
  const latest = latestMap.get(kkId);
  const riwayat = await storage.getBlusukanKunjunganByKkId(kkId, 5);

  return {
    kk,
    anggota,
    completeness,
    belumVerifikasi: countBelumDiverifikasi(anggota),
    kunjunganTerakhir: latest
      ? {
          hasil: latest.hasil,
          catatan: latest.catatan,
          createdAt: latest.createdAt?.toISOString() ?? null,
        }
      : null,
    riwayatKunjungan: riwayat.map((r) => ({
      id: r.id,
      hasil: r.hasil,
      catatan: r.catatan,
      petugasLabel: r.petugasLabel,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
  };
}

export function assertKkInBlusukanScope(kk: KartuKeluarga | undefined): kk is KartuKeluarga {
  return assertKkInPemukimanScope(kk);
}
