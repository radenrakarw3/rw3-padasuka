/**
 * Laporan analitik KK & warga — sekali jalan untuk audit data.
 * Jalankan: npx tsx script/analisis-kependudukan.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { kartuKeluarga, warga } from "@shared/schema";
import { buildKependudukanStats } from "../server/kependudukan-stats";
import { filterKkByActiveRt, ACTIVE_RT_NUMBERS } from "@shared/rt";
import { sql } from "drizzle-orm";
import { computeKkCompleteness, TIER_FIELD_LABELS } from "@shared/profile-completeness";
import { getRequiredFieldKeysForWarga } from "@shared/warga-form-tier";
import { isFieldFilled, isWargaEligibleForAnalyticsField } from "@shared/kependudukan-analytics";

const allKk = await db.select().from(kartuKeluarga);
const allWarga = await db.select().from(warga);

const kkPemukiman = filterKkByActiveRt(allKk);
const kkIdsPemukiman = new Set(kkPemukiman.map((k) => k.id));
const wargaPemukiman = allWarga.filter((w) => kkIdsPemukiman.has(w.kkId));

const statsAll = buildKependudukanStats(allKk, allWarga, allKk);
const statsPemukiman = buildKependudukanStats(kkPemukiman, wargaPemukiman, allKk);

// KK tanpa warga / warga tanpa KK valid
const wargaPerKk = new Map<number, number>();
for (const w of allWarga) wargaPerKk.set(w.kkId, (wargaPerKk.get(w.kkId) ?? 0) + 1);
const kkKosong = allKk.filter((k) => (wargaPerKk.get(k.id) ?? 0) === 0);
const kkSatuOrang = allKk.filter((k) => (wargaPerKk.get(k.id) ?? 0) === 1);
const kkBesar = allKk.filter((k) => (wargaPerKk.get(k.id) ?? 0) >= 7);

// Per RT (01–04)
const perRtAll: Record<number, { kk: number; warga: number; avgPenghuni: number; bansos: number; gmaps: number }> = {};
for (const rt of ACTIVE_RT_NUMBERS) {
  const kkRt = allKk.filter((k) => k.rt === rt);
  const wRt = allWarga.filter((w) => kkRt.some((k) => k.id === w.kkId));
  const penghuni = wRt.length;
  perRtAll[rt] = {
    kk: kkRt.length,
    warga: penghuni,
    avgPenghuni: kkRt.length ? Math.round((penghuni / kkRt.length) * 10) / 10 : 0,
    bansos: kkRt.filter((k) => k.penerimaBansos).length,
    gmaps: kkRt.filter((k) => k.latitude && k.longitude).length,
  };
}

// Field warga paling sering kosong
const tierKeys = [
  ...new Set(
    allWarga.flatMap((w) =>
      getRequiredFieldKeysForWarga({
        kkId: String(w.kkId),
        tanggalLahir: w.tanggalLahir,
        kedudukanKeluarga: w.kedudukanKeluarga,
        statusPekerjaan: w.statusPekerjaan,
        statusDisabilitas: w.statusDisabilitas,
      }),
    ),
  ),
];
const topMissing = tierKeys
  .map((key) => {
    const eligible = allWarga.filter((w) => isWargaEligibleForAnalyticsField(w, key));
    const empty = eligible.filter((w) => !isFieldFilled((w as Record<string, unknown>)[key])).length;
    return {
      key,
      label: TIER_FIELD_LABELS[key] ?? key,
      count: empty,
      eligible: eligible.length,
      pct: eligible.length ? Math.round((empty / eligible.length) * 100) : 0,
    };
  })
  .sort((a, b) => b.count - a.count)
  .slice(0, 10);

// Kelengkapan KK (kepala + anggota, SSOT Blusukan)
let kkComplete = 0;
const wargaByKkId = new Map<number, typeof allWarga>();
for (const w of allWarga) {
  const arr = wargaByKkId.get(w.kkId) ?? [];
  arr.push(w);
  wargaByKkId.set(w.kkId, arr);
}
for (const k of allKk) {
  const anggota = wargaByKkId.get(k.id) ?? [];
  if (computeKkCompleteness(anggota, k).isComplete) kkComplete++;
}

// Tanggal lahir invalid / tanpa
let tanpaTglLahir = 0;
let invalidTglLahir = 0;
for (const w of allWarga) {
  if (!w.tanggalLahir?.trim()) tanpaTglLahir++;
  else if (isNaN(new Date(w.tanggalLahir).getTime())) invalidTglLahir++;
}

// Status kependudukan
const statusKep = await db.execute(sql`
  SELECT status_kependudukan AS status, count(*)::int AS n
  FROM warga GROUP BY status_kependudukan ORDER BY n DESC
`);

// Ratio gender overall
const laki = allWarga.filter((w) => w.jenisKelamin === "Laki-laki").length;
const perempuan = allWarga.filter((w) => w.jenisKelamin === "Perempuan").length;

const report = {
  generatedAt: new Date().toISOString(),
  ringkasan: {
    totalKk: allKk.length,
    totalWarga: allWarga.length,
    rataPenghuniPerKk: Math.round((allWarga.length / allKk.length) * 100) / 100,
    kkPemukiman01_04: kkPemukiman.length,
    wargaPemukiman: wargaPemukiman.length,
    rasioGender: { laki, perempuan, perempuanPct: Math.round((perempuan / allWarga.length) * 100) },
  },
  perRtAll,
  pemukiman: {
    legacy: statsPemukiman.legacy,
    kk: statsPemukiman.kk,
    qualityBySection: statsPemukiman.qualityBySection,
  },
  seluruhRw: {
    bansos: statsAll.legacy.bansos,
    layakBansos: statsAll.legacy.totalLayakBansos,
    kategoriEkonomi: statsAll.legacy.kategoriEkonomi,
    kelompokUsia: statsAll.legacy.kelompokUsia,
    topPekerjaan: statsAll.legacy.pekerjaan.slice(0, 8),
    pengangguran: statsAll.legacy.pengangguran.total,
    disabilitas: statsAll.legacy.totalDisabilitas,
    ibuHamil: statsAll.legacy.totalIbuHamil,
    capaianWa: statsAll.legacy.capaian.waPercent,
    penghuniMismatch: statsAll.kk.penghuniMismatch,
  },
  kualitasData: {
    kkKosong: kkKosong.length,
    kkSatuOrang: kkSatuOrang.length,
    kkBesar7Plus: kkBesar.length,
    tanpaTglLahir,
    invalidTglLahir,
    kkProfilLengkap: kkComplete,
    kkProfilLengkapPct: Math.round((kkComplete / allKk.length) * 100),
    topFieldKosong: topMissing,
    statusKependudukan: statusKep.rows,
  },
  insightFlags: {
    bansosTanpaEkonomi: allKk.filter((k) => k.penerimaBansos && !k.penghasilanBulanan?.trim()).length,
    layakBelumTerima: allKk.filter((k) => k.layakBansos && !k.penerimaBansos).length,
    waKosong: allWarga.filter((w) => !w.nomorWhatsapp?.trim()).length,
    bpjsYa: allWarga.filter((w) => w.punyaBpjsKesehatan).length,
    lansia: allWarga.filter((w) => w.lansia).length,
  },
};

console.log(JSON.stringify(report, null, 2));
