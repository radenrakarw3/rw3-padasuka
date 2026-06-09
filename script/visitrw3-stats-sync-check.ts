/**
 * Verifikasi: tambah/hapus properti & penghuni selaras dengan statistik dashboard.
 * Jalankan: npx tsx script/visitrw3-stats-sync-check.ts
 */
import "dotenv/config";
import { db, pool } from "../server/db";
import { pemilikKost, wargaSinggah, visitrw3Pengajuan } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../server/storage";
import { getVisitrw3DashboardStats } from "../server/visitrw3";

async function countDb() {
  const [properti, penghuni, pengajuan] = await Promise.all([
    db.select({ id: pemilikKost.id }).from(pemilikKost),
    db.select({ id: wargaSinggah.id, status: wargaSinggah.status }).from(wargaSinggah),
    db.select({ id: visitrw3Pengajuan.id }).from(visitrw3Pengajuan),
  ]);
  return {
    properti: properti.length,
    penghuniAktif: penghuni.filter((p) => p.status === "aktif").length,
    pengajuan: pengajuan.length,
  };
}

function assertMatch(label: string, dbCount: number, statsCount: number) {
  const ok = dbCount === statsCount;
  console.log(`${ok ? "OK" : "GAGAL"} ${label}: DB=${dbCount}, stats=${statsCount}`);
  return ok;
}

async function main() {
  const before = await countDb();
  const statsBefore = await getVisitrw3DashboardStats();
  let ok = true;
  ok = assertMatch("properti (awal)", before.properti, statsBefore.ringkasan.totalProperti) && ok;
  ok = assertMatch("penghuni aktif (awal)", before.penghuniAktif, statsBefore.ringkasan.penghuniAktif) && ok;
  ok = assertMatch("pengajuan (awal)", before.pengajuan, statsBefore.ringkasan.totalPengajuan) && ok;

  const [kost] = await db.select().from(pemilikKost).limit(1);
  if (!kost) {
    console.log("Lewati tes hapus: tidak ada properti");
    await pool.end();
    process.exit(ok ? 0 : 1);
  }

  const pengajuanLinked = await db
    .select({ id: visitrw3Pengajuan.id })
    .from(visitrw3Pengajuan)
    .where(eq(visitrw3Pengajuan.pemilikKostId, kost.id));
  const penghuniLinked = await db
    .select({ id: wargaSinggah.id })
    .from(wargaSinggah)
    .where(eq(wargaSinggah.pemilikKostId, kost.id));

  await storage.deletePemilikKost(kost.id);

  const after = await countDb();
  const statsAfter = await getVisitrw3DashboardStats();
  ok = assertMatch("properti (setelah hapus)", after.properti, statsAfter.ringkasan.totalProperti) && ok;
  ok = assertMatch("penghuni aktif (setelah hapus)", after.penghuniAktif, statsAfter.ringkasan.penghuniAktif) && ok;
  ok =
    assertMatch(
      "pengajuan (setelah hapus)",
      after.pengajuan,
      statsAfter.ringkasan.totalPengajuan,
    ) && ok;

  const pengajuanRemoved = before.pengajuan - after.pengajuan;
  const penghuniRemoved = before.penghuniAktif - after.penghuniAktif;
  console.log(
    `\nHapus properti #${kost.id}: -1 properti, -${penghuniLinked.length} penghuni, -${pengajuanLinked.length} pengajuan (actual pengajuan -${pengajuanRemoved}, penghuni aktif -${penghuniRemoved})`,
  );

  await pool.end();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
