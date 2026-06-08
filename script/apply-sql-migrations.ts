/**
 * Jalankan file SQL di migrations/ (idempotent).
 * Usage: npx tsx script/apply-sql-migrations.ts [0006 ... 0010]
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

const files =
  process.argv.length > 2
    ? process.argv.slice(2).map((f) => (f.endsWith(".sql") ? f : `${f}.sql`))
    : [
        "0006_kependudukan_indexes.sql",
        "0007_kategori_umur.sql",
        "0008_program_strategis.sql",
        "0009_infrastruktur.sql",
        "0010_umkm_makeover.sql",
      ];

if (!process.env.DATABASE_URL) {
  console.error("[error] DATABASE_URL tidak ditemukan");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

for (const file of files) {
  const full = path.join("migrations", file);
  const sql = fs.readFileSync(full, "utf8");
  await pool.query(sql);
  console.log(`[ok] ${file}`);
}

await pool.end();
console.log(JSON.stringify({ applied: files, at: new Date().toISOString() }, null, 2));
process.exit(0);
