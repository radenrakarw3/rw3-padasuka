/**
 * Audit mendalam data warga RW 03 — pemahaman pola pekerjaan, usia, RT.
 * Jalankan: npx tsx script/audit-data-warga.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { kartuKeluarga, warga } from "@shared/schema";
import { filterKkByActiveRt, ACTIVE_RT_NUMBERS } from "@shared/rt";
import {
  countPengangguranRows,
  isLegacyPekerjaanPengangguranLabel,
  isWargaPengangguran,
  normalizePekerjaanLabel,
  PENGANGGURAN_KETERANGAN,
  PENGANGGURAN_STATUS_ILO,
  PEKERJAAN_KATEGORI_PENGANGGURAN_LEGACY,
} from "../shared/pekerjaan-labor";
import { buildKependudukanStats } from "../server/kependudukan-stats";
import { sql, inArray, eq } from "drizzle-orm";

function calcAge(tanggalLahir: string | null | undefined): number | null {
  if (!tanggalLahir?.trim()) return null;
  const birth = new Date(tanggalLahir);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const allKk = await db.select().from(kartuKeluarga);
const allWarga = await db.select().from(warga);
const kkPemukiman = filterKkByActiveRt(allKk);
const kkIdsPemukiman = new Set(kkPemukiman.map((k) => k.id));
const wargaPemukiman = allWarga.filter((w) => kkIdsPemukiman.has(w.kkId));
const kkRtMap = new Map(kkPemukiman.map((k) => [k.id, k.rt]));

const stats = buildKependudukanStats(kkPemukiman, wargaPemukiman, kkPemukiman);
const dist = stats.pekerjaan.distribusi;

// --- Pekerjaan: semua nilai unik (raw vs normalisasi) ---
const rawPekerjaan = new Map<string, number>();
const normPekerjaan = new Map<string, number>();
for (const w of wargaPemukiman) {
  const raw = w.pekerjaan ?? "";
  rawPekerjaan.set(raw, (rawPekerjaan.get(raw) ?? 0) + 1);
  const norm = normalizePekerjaanLabel(w.pekerjaan);
  normPekerjaan.set(norm, (normPekerjaan.get(norm) ?? 0) + 1);
}

const pekerjaanSorted = [...normPekerjaan.entries()].sort((a, b) => b[1] - a[1]);

// --- Kategori pengangguran per RT ---
const pengPerRt: Record<number, Record<string, number>> = {};
for (const rt of ACTIVE_RT_NUMBERS) pengPerRt[rt] = {};
for (const w of wargaPemukiman) {
  const rt = kkRtMap.get(w.kkId);
  if (!rt || !isWargaPengangguran(w)) continue;
  const label = w.statusPekerjaan?.trim() || normalizePekerjaanLabel(w.pekerjaan);
  pengPerRt[rt][label] = (pengPerRt[rt][label] ?? 0) + 1;
}

// --- Pekerjaan vs usia (kategori pengangguran) ---
const pengByUsia = { "0-17": 0, "18-64": 0, "65+": 0, "tanpa_usia": 0 };
for (const w of wargaPemukiman) {
  if (!isWargaPengangguran(w)) continue;
  const age = calcAge(w.tanggalLahir);
  if (age === null) pengByUsia.tanpa_usia++;
  else if (age <= 17) pengByUsia["0-17"]++;
  else if (age < 65) pengByUsia["18-64"]++;
  else pengByUsia["65+"]++;
}

// --- statusPekerjaan vs pekerjaan ---
const statusPekerjaanDist = new Map<string, number>();
const statusVsPekerjaan: Record<string, Record<string, number>> = {};
for (const w of wargaPemukiman) {
  const status = w.statusPekerjaan?.trim() || "(kosong)";
  statusPekerjaanDist.set(status, (statusPekerjaanDist.get(status) ?? 0) + 1);
  const pek = normalizePekerjaanLabel(w.pekerjaan);
  if (!statusVsPekerjaan[status]) statusVsPekerjaan[status] = {};
  statusVsPekerjaan[status][pek] = (statusVsPekerjaan[status][pek] ?? 0) + 1;
}

// --- Nilai raw yang TIDAK ada di dropdown tapi mirip pengangguran ---
const dropdownCheck = await db.execute(sql`
  SELECT pekerjaan, count(*)::int AS n
  FROM warga w
  INNER JOIN kartu_keluarga kk ON w.kk_id = kk.id
  WHERE kk.rt IN (1, 2, 3, 4)
  GROUP BY pekerjaan
  ORDER BY n DESC
`);

// --- RT di luar 01-04 ---
const rtLain = allKk.filter((k) => !(ACTIVE_RT_NUMBERS as readonly number[]).includes(k.rt));
const wargaRtLain = allWarga.filter((w) => rtLain.some((k) => k.id === w.kkId));

// --- Kedudukan keluarga x pekerjaan kosong ---
const kosongByKedudukan = new Map<string, number>();
for (const w of wargaPemukiman) {
  if (normalizePekerjaanLabel(w.pekerjaan) !== "Belum diisi") continue;
  kosongByKedudukan.set(w.kedudukanKeluarga, (kosongByKedudukan.get(w.kedudukanKeluarga) ?? 0) + 1);
}

const report = {
  generatedAt: new Date().toISOString(),
  cakupan: {
    totalKkSemuaRt: allKk.length,
    totalWargaSemuaRt: allWarga.length,
    kkPemukimanRt01_04: kkPemukiman.length,
    wargaPemukimanRt01_04: wargaPemukiman.length,
    kkRtLain: rtLain.length,
    wargaRtLain: wargaRtLain.length,
    rtLainBreakdown: rtLain.reduce(
      (acc, k) => {
        acc[k.rt] = (acc[k.rt] ?? 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    ),
  },
  perRt: stats.perRt,
  kelompokUsia: stats.kelompokUsia,
  pekerjaan: {
    totalKategoriUnik: pekerjaanSorted.length,
    top20: pekerjaanSorted.slice(0, 20),
    definisi: PENGANGGURAN_KETERANGAN,
    statusIlo: PENGANGGURAN_STATUS_ILO.map((k) => ({
      label: k,
      jumlah: wargaPemukiman.filter((w) => w.statusPekerjaan?.trim() === k).length,
    })),
    legacyPekerjaan: PEKERJAAN_KATEGORI_PENGANGGURAN_LEGACY.map((k) => ({
      label: k,
      jumlah: dist[k] ?? 0,
    })),
    totalPengangguran: countPengangguranRows(wargaPemukiman).total,
    persenPengangguran: stats.pengangguran.ratePercent,
    pengangguranPerRt: Object.fromEntries(
      ACTIVE_RT_NUMBERS.map((rt) => [
        rt,
        Object.values(pengPerRt[rt] ?? {}).reduce((s, n) => s + n, 0),
      ]),
    ),
    pengangguranPerUsia: pengByUsia,
    pekerjaanKosongByKedudukan: [...kosongByKedudukan.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({ kedudukan: k, jumlah: n })),
  },
  statusPekerjaan: {
    distribusi: [...statusPekerjaanDist.entries()].sort((a, b) => b[1] - a[1]),
    topPekerjaanPerStatus: Object.fromEntries(
      Object.entries(statusVsPekerjaan).map(([status, pekMap]) => [
        status,
        [...Object.entries(pekMap)].sort((a, b) => b[1] - a[1]).slice(0, 5),
      ]),
    ),
  },
  kualitas: {
    tanpaTglLahir: wargaPemukiman.filter((w) => !w.tanggalLahir?.trim()).length,
    tanpaPekerjaan: wargaPemukiman.filter((w) => !w.pekerjaan?.trim()).length,
    tanpaStatusPekerjaan: wargaPemukiman.filter((w) => !w.statusPekerjaan?.trim()).length,
    tanpaPendidikan: wargaPemukiman.filter((w) => !w.pendidikan?.trim()).length,
    tanpaWa: wargaPemukiman.filter((w) => !w.nomorWhatsapp?.trim()).length,
  },
  rawPekerjaanSemua: (dropdownCheck.rows as { pekerjaan: string | null; n: number }[]).map((r) => ({
    pekerjaan: r.pekerjaan ?? "(null)",
    jumlah: r.n,
  })),
};

console.log(JSON.stringify(report, null, 2));
