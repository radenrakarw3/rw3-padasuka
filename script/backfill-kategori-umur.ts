/**
 * Backfill kategori_umur untuk semua warga dari tanggal_lahir.
 * Jalankan: npx tsx script/backfill-kategori-umur.ts
 */
import "dotenv/config";
import fs from "fs";
import pg from "pg";
import { db } from "../server/db";
import { warga } from "@shared/schema";
import { resolveKategoriUmur } from "@shared/kategori-umur";
import { eq } from "drizzle-orm";

const migSql = fs.readFileSync("migrations/0007_kategori_umur.sql", "utf8");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});
await pool.query(migSql);
await pool.end();

const all = await db
  .select({ id: warga.id, tanggalLahir: warga.tanggalLahir, kategoriUmur: warga.kategoriUmur })
  .from(warga);

let updated = 0;
for (const row of all) {
  const next = resolveKategoriUmur(row.tanggalLahir);
  if (row.kategoriUmur === next) continue;
  await db.update(warga).set({ kategoriUmur: next }).where(eq(warga.id, row.id));
  updated++;
}

console.log(JSON.stringify({ total: all.length, updated, generatedAt: new Date().toISOString() }, null, 2));
process.exit(0);
