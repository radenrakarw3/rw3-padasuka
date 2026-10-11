/**
 * Migrasi idempotent untuk production (Railway PostgreSQL).
 * Jalankan: node script/apply-production-migrations.mjs
 */
import "dotenv/config";
import pg from "pg";

const sql = `
ALTER TABLE warga ADD COLUMN IF NOT EXISTS literasi text;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS wg_kesulitan_melihat text;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS wg_kesulitan_berjalan text;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS status_pekerjaan text;

DROP TABLE IF EXISTS blusukan_quest, blusukan_kunjungan;
`;

if (!process.env.DATABASE_URL) {
  console.error("[error] DATABASE_URL tidak ditemukan");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(sql);
  console.log("[ok] Migrasi production selesai (kolom warga, hapus tabel Blusukan).");
} catch (err) {
  console.error("[error]", err);
  process.exit(1);
} finally {
  await pool.end();
}

