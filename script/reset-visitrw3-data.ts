/**
 * Reset data operasional Visit RW3: properti, penghuni, pengajuan.
 * Kas RW (kontribusi) tidak dihapus — hanya master data Visit RW3.
 *
 * Jalankan: npx tsx -r dotenv/config script/reset-visitrw3-data.ts
 */
import "dotenv/config";
import { storage } from "../server/storage";

async function main() {
  const before = await storage.getAllPemilikKost();
  console.log(`Properti saat ini: ${before.length}`);
  before.forEach((p) => {
    console.log(`  - [${p.id}] ${p.namaKost} (${p.statusProperti}) RT ${p.rt}`);
  });

  if (before.length === 0) {
    console.log("\nTidak ada properti. Database Visit RW3 master data sudah kosong.");
    return;
  }

  const result = await storage.resetVisitrw3MasterData();
  console.log("\nBerhasil dihapus:");
  console.log(`  Properti (pemilik_kost): ${result.pemilikKost}`);
  console.log(`  Penghuni (warga_singgah): ${result.wargaSinggah}`);
  console.log(`  Riwayat kontrak: ${result.riwayatKontrak}`);
  console.log(`  Pengajuan Visit RW3: ${result.pengajuan}`);

  const after = await storage.getAllPemilikKost();
  console.log(`\nProperti tersisa: ${after.length}`);
}

main().catch((e) => {
  console.error("Gagal:", e.message || e);
  process.exit(1);
});
