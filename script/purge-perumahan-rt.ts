/**
 * Hapus permanen semua data RT 05–07 (perumahan) dari database.
 * Jalankan: npx tsx script/purge-perumahan-rt.ts
 * Dry-run: npx tsx script/purge-perumahan-rt.ts --dry-run
 */
import "dotenv/config";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../server/db";
import { storage } from "../server/storage";
/** RT perumahan yang dihapus dari sistem (tidak lagi dikelola). */
const PERUMAHAN_RT_NUMBERS = [5, 6, 7] as const;
import {
  kartuKeluarga,
  warga,
  laporan,
  suratWarga,
  profileEditRequest,
  donasi,
  pengajuanBansos,
  blusukanKunjungan,
  iuranKk,
  pesertaProgram,
  pemilikKost,
  wargaSinggah,
  visitrw3Pengajuan,
  usaha,
  rwcoinPendingTransaksi,
  rwcoinOtp,
  rwcoinTransaksi,
  rwcoinWallet,
  rwcoinTopupRequest,
  curhatWarga,
  wargaSavedLogin,
  tripayTransaction,
  programRw,
} from "@shared/schema";

const dryRun = process.argv.includes("--dry-run");
const RT_LIST: number[] = [...PERUMAHAN_RT_NUMBERS];

async function deleteWargaDeps(tx: typeof db, wargaIds: number[]) {
  if (wargaIds.length === 0) return;

  await tx.delete(rwcoinPendingTransaksi).where(inArray(rwcoinPendingTransaksi.wargaId, wargaIds));
  await tx.delete(rwcoinOtp).where(inArray(rwcoinOtp.wargaId, wargaIds));
  await tx.delete(tripayTransaction).where(inArray(tripayTransaction.wargaId, wargaIds));
  await tx
    .delete(rwcoinTransaksi)
    .where(
      or(
        inArray(rwcoinTransaksi.wargaId, wargaIds),
        inArray(rwcoinTransaksi.tujuanWargaId, wargaIds),
      ),
    );
  await tx.delete(rwcoinWallet).where(inArray(rwcoinWallet.wargaId, wargaIds));
  await tx.delete(rwcoinTopupRequest).where(inArray(rwcoinTopupRequest.wargaId, wargaIds));
  await tx.delete(curhatWarga).where(inArray(curhatWarga.wargaId, wargaIds));
  await tx.delete(wargaSavedLogin).where(inArray(wargaSavedLogin.wargaId, wargaIds));
  await tx.delete(laporan).where(inArray(laporan.wargaId, wargaIds));
  await tx.delete(suratWarga).where(inArray(suratWarga.wargaId, wargaIds));
  await tx.delete(profileEditRequest).where(inArray(profileEditRequest.wargaId, wargaIds));
}

async function purge() {
  const counts: Record<string, number> = {};

  const kkRows = await db
    .select({ id: kartuKeluarga.id, rt: kartuKeluarga.rt })
    .from(kartuKeluarga)
    .where(inArray(kartuKeluarga.rt, RT_LIST));
  const kkIds = kkRows.map((k) => k.id);

  const wargaRows =
    kkIds.length > 0
      ? await db.select({ id: warga.id }).from(warga).where(inArray(warga.kkId, kkIds))
      : [];
  const wargaIds = wargaRows.map((w) => w.id);

  const kostRows = await db
    .select({ id: pemilikKost.id })
    .from(pemilikKost)
    .where(inArray(pemilikKost.rt, RT_LIST));

  const usahaRows = await db
    .select({ id: usaha.id })
    .from(usaha)
    .where(inArray(usaha.rt, RT_LIST));

  const pengajuanRtRows = await db
    .select({ id: visitrw3Pengajuan.id })
    .from(visitrw3Pengajuan)
    .where(inArray(visitrw3Pengajuan.rt, RT_LIST));

  console.log(
    JSON.stringify(
      {
        dryRun,
        rt: RT_LIST,
        akanDihapus: {
          kk: kkIds.length,
          warga: wargaIds.length,
          pemilikKost: kostRows.length,
          usaha: usahaRows.length,
          visitrw3Pengajuan: pengajuanRtRows.length,
        },
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log("Dry-run selesai — tidak ada perubahan database.");
    return;
  }

  // Usaha di RT perumahan
  for (const u of usahaRows) {
    await storage.deleteUsaha(u.id);
    counts.usaha = (counts.usaha ?? 0) + 1;
  }

  // Properti / VisitRW3
  for (const k of kostRows) {
    await storage.deletePemilikKost(k.id);
    counts.pemilikKost = (counts.pemilikKost ?? 0) + 1;
  }

  // Pengajuan VisitRW3 yang tersisa (rt 5–7, tanpa properti)
  const remainingPengajuan = await db
    .select({ id: visitrw3Pengajuan.id })
    .from(visitrw3Pengajuan)
    .where(inArray(visitrw3Pengajuan.rt, RT_LIST));

  if (remainingPengajuan.length > 0) {
    const pIds = remainingPengajuan.map((p) => p.id);
    await db.transaction(async (tx) => {
      await tx
        .update(wargaSinggah)
        .set({ pengajuanId: null })
        .where(inArray(wargaSinggah.pengajuanId, pIds));
      await tx.delete(visitrw3Pengajuan).where(inArray(visitrw3Pengajuan.id, pIds));
    });
    counts.visitrw3Pengajuan = pIds.length;
  }

  // KK & warga
  for (const kkId of kkIds) {
    await db.transaction(async (tx) => {
      const wList = await tx.select({ id: warga.id }).from(warga).where(eq(warga.kkId, kkId));
      const ids = wList.map((w) => w.id);
      await deleteWargaDeps(tx, ids);
      await tx.delete(laporan).where(eq(laporan.kkId, kkId));
      await tx.delete(blusukanKunjungan).where(eq(blusukanKunjungan.kkId, kkId));
      await tx.delete(iuranKk).where(eq(iuranKk.kkId, kkId));
      await tx.delete(pesertaProgram).where(eq(pesertaProgram.kkId, kkId));
      await tx.delete(donasi).where(eq(donasi.kkId, kkId));
      await tx.delete(pengajuanBansos).where(eq(pengajuanBansos.kkId, kkId));
      await tx.delete(warga).where(eq(warga.kkId, kkId));
      await tx.delete(kartuKeluarga).where(eq(kartuKeluarga.id, kkId));
    });
    counts.kk = (counts.kk ?? 0) + 1;
  }

  // Metadata RT perumahan
  for (const rt of RT_LIST) {
    await storage.deleteRtByNomor(rt);
    counts.rtData = (counts.rtData ?? 0) + 1;
  }

  // Program RW yang menarget RT perumahan
  const progUpdated = await db
    .update(programRw)
    .set({ targetRt: null })
    .where(inArray(programRw.targetRt, RT_LIST))
    .returning({ id: programRw.id });
  counts.programRwCleared = progUpdated.length;

  // RW3Law: rt_asal perumahan → null (jika ada)
  try {
    const law = await db.execute(sql`
      UPDATE rw3law_dokumen SET rt_asal = NULL WHERE rt_asal IN (5, 6, 7)
    `);
    counts.rw3lawRtAsalCleared = Number(law.rowCount ?? 0);
  } catch {
    counts.rw3lawRtAsalCleared = 0;
  }

  const verify = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM kartu_keluarga WHERE rt IN (5,6,7)) AS kk,
      (SELECT count(*)::int FROM pemilik_kost WHERE rt IN (5,6,7)) AS kost,
      (SELECT count(*)::int FROM usaha WHERE rt IN (5,6,7)) AS usaha
  `);

  console.log(
    JSON.stringify(
      { selesai: true, dihapus: counts, verifikasi: verify.rows[0] },
      null,
      2,
    ),
  );
}

purge().catch((e) => {
  console.error(e);
  process.exit(1);
});
