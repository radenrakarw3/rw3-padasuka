/**
 * Backfill pekerjaan «Pensiunan» untuk warga usia 65+ (lansia).
 * Jalankan: npx tsx script/backfill-pensiunan-lansia.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { warga } from "@shared/schema";
import { pekerjaanUntukUsiaLansia } from "@shared/kategori-umur";
import { getWargaAge } from "@shared/warga-form-tier";
import { eq } from "drizzle-orm";

const all = await db
  .select({
    id: warga.id,
    tanggalLahir: warga.tanggalLahir,
    pekerjaan: warga.pekerjaan,
  })
  .from(warga);

let updated = 0;

for (const row of all) {
  const age = getWargaAge(row.tanggalLahir);
  const nextPekerjaan = pekerjaanUntukUsiaLansia(row.pekerjaan, age);
  if (!nextPekerjaan || row.pekerjaan === nextPekerjaan) continue;
  await db.update(warga).set({ pekerjaan: nextPekerjaan }).where(eq(warga.id, row.id));
  updated++;
}

console.log(
  JSON.stringify({ total: all.length, updated, generatedAt: new Date().toISOString() }, null, 2),
);
process.exit(0);
