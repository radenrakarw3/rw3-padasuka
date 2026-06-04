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

CREATE TABLE IF NOT EXISTS blusukan_kunjungan (
  id serial PRIMARY KEY,
  kk_id integer NOT NULL REFERENCES kartu_keluarga(id),
  hasil text NOT NULL,
  catatan text,
  petugas_label text,
  created_at timestamp DEFAULT now()
);
`;

if (!process.env.DATABASE_URL) {
  console.error("[error] DATABASE_URL tidak ditemukan");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(sql);
  console.log("[ok] Migrasi production selesai (warga internasional + blusukan_kunjungan).");
} catch (err) {
  console.error("[error]", err);
  process.exit(1);
} finally {
  await pool.end();
}
