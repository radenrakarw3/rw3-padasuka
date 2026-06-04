/**
 * Isi / lengkapi peraturan dasar RW3LAW di database (idempoten per slug).
 *
 * Dev:  npx tsx script/seed-rw3law-peraturan.ts
 * Prod: SEED_RW3LAW_ALLOW_PRODUCTION=1 npx tsx script/seed-rw3law-peraturan.ts
 */
import "dotenv/config";
import { initRw3law } from "../server/rw3law-routes";
import { seedRw3lawPeraturanDasar, listRw3lawPublic } from "../server/rw3law";

async function main() {
  await initRw3law();
  const allowProduction = process.env.SEED_RW3LAW_ALLOW_PRODUCTION === "1";
  const result = await seedRw3lawPeraturanDasar({
    allowProduction,
    includeDraftSample: process.env.SEED_RW3LAW_DRAFT_SAMPLE === "1",
  });

  if (result.skippedProduction) {
    console.log("Lewati production. Set SEED_RW3LAW_ALLOW_PRODUCTION=1 untuk menjalankan di production.");
    process.exit(0);
  }

  const publicList = await listRw3lawPublic();
  console.log("Hasil seed:", result);
  console.log("Publik (disetujui):", publicList.length, "dokumen");
  publicList.forEach((d) => console.log(`  - [${d.kategori}] ${d.judul}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
