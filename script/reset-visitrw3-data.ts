/**
 * Reset data operasional Visit RW3: properti, penghuni, pengajuan.
 * Kas RW (kontribusi) tidak dihapus — hanya master data Visit RW3.
 *
 * Jalankan: npx tsx -r dotenv/config script/reset-visitrw3-data.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { storage } from "../server/storage";

async function countTable(table: string) {
  const rows = await db.execute<{ n: number }>(sql.raw(`SELECT COUNT(*)::int AS n FROM ${table}`));
  const row = Array.isArray(rows) ? rows[0] : (rows as { rows?: { n: number }[] }).rows?.[0];
  return row?.n ?? 0;
}

async function main() {
  const propertiBefore = await countTable("pemilik_kost");
  const pengajuanBefore = await countTable("visitrw3_pengajuan");
  const penghuniFormBefore = await countTable("visitrw3_penghuni");
  const penghuniBefore = await countTable("warga_singgah");

  console.log("Sebelum reset:");
  console.log(`  Properti (pemilik_kost): ${propertiBefore}`);
  console.log(`  Pengajuan Visit RW3: ${pengajuanBefore}`);
  console.log(`  Baris form penghuni (visitrw3_penghuni): ${penghuniFormBefore}`);
  console.log(`  Penghuni aktif (warga_singgah): ${penghuniBefore}`);

  if (propertiBefore === 0 && pengajuanBefore === 0 && penghuniBefore === 0) {
    console.log("\nDatabase Visit RW3 master data sudah kosong.");
    return;
  }

  const result = await storage.resetVisitrw3MasterData();
  console.log("\nBerhasil dihapus:");
  console.log(`  Properti (pemilik_kost): ${result.pemilikKost}`);
  console.log(`  Penghuni (warga_singgah): ${result.wargaSinggah}`);
  console.log(`  Riwayat kontrak: ${result.riwayatKontrak}`);
  console.log(`  Pengajuan Visit RW3: ${result.pengajuan} (visitrw3_penghuni ikut terhapus via cascade)`);

  const propertiAfter = await countTable("pemilik_kost");
  const pengajuanAfter = await countTable("visitrw3_pengajuan");
  console.log(`\nSetelah reset — properti: ${propertiAfter}, pengajuan: ${pengajuanAfter}`);
}

main().catch((e) => {
  console.error("Gagal:", e.message || e);
  process.exit(1);
});
