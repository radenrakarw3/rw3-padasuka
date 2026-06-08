/**
 * Backfill kategori_umur + pekerjaan «Pelajar» untuk warga usia 7–18.
 * Jalankan: npx tsx script/backfill-pelajar-7-18.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { warga } from "@shared/schema";
import {
  pekerjaanUntukUsiaPelajar,
  resolveKategoriUmur,
} from "@shared/kategori-umur";
import { getWargaAge } from "@shared/warga-form-tier";
import { eq } from "drizzle-orm";

const all = await db
  .select({
    id: warga.id,
    tanggalLahir: warga.tanggalLahir,
    kategoriUmur: warga.kategoriUmur,
    pekerjaan: warga.pekerjaan,
  })
  .from(warga);

let kategoriUpdated = 0;
let pekerjaanUpdated = 0;

for (const row of all) {
  const age = getWargaAge(row.tanggalLahir);
  const nextKategori = resolveKategoriUmur(row.tanggalLahir);
  const nextPekerjaan = pekerjaanUntukUsiaPelajar(row.pekerjaan, age);

  const patch: { kategoriUmur?: string; pekerjaan?: string } = {};
  if (row.kategoriUmur !== nextKategori) {
    patch.kategoriUmur = nextKategori;
    kategoriUpdated++;
  }
  if (nextPekerjaan && row.pekerjaan !== nextPekerjaan) {
    patch.pekerjaan = nextPekerjaan;
    pekerjaanUpdated++;
  }

  if (Object.keys(patch).length === 0) continue;
  await db.update(warga).set(patch).where(eq(warga.id, row.id));
}

console.log(
  JSON.stringify(
    {
      total: all.length,
      kategoriUpdated,
      pekerjaanUpdated,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
process.exit(0);
