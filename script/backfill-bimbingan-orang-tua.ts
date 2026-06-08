/**
 * Backfill pekerjaan «Bimbingan Orang Tua» untuk warga usia 0–6.
 * Jalankan: npx tsx script/backfill-bimbingan-orang-tua.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { warga } from "@shared/schema";
import { pekerjaanUntukUsiaAnakKecil } from "@shared/kategori-umur";
import { getWargaAge } from "@shared/warga-form-tier";
import { eq } from "drizzle-orm";

const all = await db
  .select({
    id: warga.id,
    tanggalLahir: warga.tanggalLahir,
    pekerjaan: warga.pekerjaan,
  })
  .from(warga);

let pekerjaanUpdated = 0;

for (const row of all) {
  const age = getWargaAge(row.tanggalLahir);
  const nextPekerjaan = pekerjaanUntukUsiaAnakKecil(row.pekerjaan, age);
  if (!nextPekerjaan || row.pekerjaan === nextPekerjaan) continue;
  await db.update(warga).set({ pekerjaan: nextPekerjaan }).where(eq(warga.id, row.id));
  pekerjaanUpdated++;
}

console.log(
  JSON.stringify(
    {
      total: all.length,
      pekerjaanUpdated,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
process.exit(0);
