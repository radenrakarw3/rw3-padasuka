/**
 * Sinkronkan pekerjaan wajib per kategori umur:
 * 0–6 «Bimbingan Orang Tua», 7–18 «Pelajar», 65+ «Pensiunan»,
 * plus alias legacy (Mengurus RT → Ibu RT).
 * Jalankan: npx tsx script/backfill-pekerjaan-kategori-umur.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { warga } from "@shared/schema";
import {
  pekerjaanUntukUsiaAnakKecil,
  pekerjaanUntukUsiaLansia,
  pekerjaanUntukUsiaPelajar,
  resolveKategoriUmur,
} from "@shared/kategori-umur";
import { PEKERJAAN_IBU_RUMAH_TANGGA } from "@shared/pekerjaan-status";
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
  const nextPekerjaan =
    pekerjaanUntukUsiaAnakKecil(row.pekerjaan, age) ??
    pekerjaanUntukUsiaPelajar(row.pekerjaan, age) ??
    pekerjaanUntukUsiaLansia(row.pekerjaan, age) ??
    (row.pekerjaan === "Mengurus Rumah Tangga" ? PEKERJAAN_IBU_RUMAH_TANGGA : undefined);

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
