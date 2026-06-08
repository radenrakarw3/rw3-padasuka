/**
 * Satukan «Mengurus Rumah Tangga» → «Ibu Rumah Tangga».
 * Jalankan: npx tsx script/backfill-ibu-rumah-tangga.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { warga } from "@shared/schema";
import { PEKERJAAN_IBU_RUMAH_TANGGA } from "@shared/pekerjaan-status";
import { eq } from "drizzle-orm";

const all = await db
  .select({ id: warga.id, pekerjaan: warga.pekerjaan })
  .from(warga);

let updated = 0;
for (const row of all) {
  if (row.pekerjaan !== "Mengurus Rumah Tangga") continue;
  await db
    .update(warga)
    .set({ pekerjaan: PEKERJAAN_IBU_RUMAH_TANGGA })
    .where(eq(warga.id, row.id));
  updated++;
}

console.log(JSON.stringify({ total: all.length, updated, generatedAt: new Date().toISOString() }, null, 2));
process.exit(0);
