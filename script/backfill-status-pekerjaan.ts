/**
 * Backfill status_pekerjaan dari kolom pekerjaan (data lama tanpa status ILO).
 * Jalankan: npx tsx script/backfill-status-pekerjaan.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { warga } from "@shared/schema";
import { inferStatusPekerjaanFromLegacyPekerjaan } from "@shared/pekerjaan-labor";
import { eq } from "drizzle-orm";

const all = await db
  .select({
    id: warga.id,
    pekerjaan: warga.pekerjaan,
    statusPekerjaan: warga.statusPekerjaan,
  })
  .from(warga);

let updated = 0;
let skippedHasStatus = 0;
let skippedNoInfer = 0;

for (const row of all) {
  if (row.statusPekerjaan?.trim()) {
    skippedHasStatus++;
    continue;
  }
  const inferred = inferStatusPekerjaanFromLegacyPekerjaan(row.pekerjaan);
  if (!inferred) {
    skippedNoInfer++;
    continue;
  }
  await db.update(warga).set({ statusPekerjaan: inferred }).where(eq(warga.id, row.id));
  updated++;
}

console.log(
  JSON.stringify(
    {
      total: all.length,
      updated,
      skippedHasStatus,
      skippedNoInfer,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
process.exit(0);
