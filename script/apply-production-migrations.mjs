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

CREATE TABLE IF NOT EXISTS blusukan_quest (
  id serial PRIMARY KEY,
  judul text NOT NULL,
  perihal text NOT NULL,
  target_warga_id integer REFERENCES warga(id),
  target_warga_nama text,
  target_kk_id integer REFERENCES kartu_keluarga(id),
  deadline text NOT NULL,
  progres integer NOT NULL DEFAULT 0,
  catatan text,
  status text NOT NULL DEFAULT 'aktif',
  catatan_selesai text,
  selesai_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blusukan_quest_status ON blusukan_quest(status);
CREATE INDEX IF NOT EXISTS idx_blusukan_quest_deadline ON blusukan_quest(deadline);
`;

if (!process.env.DATABASE_URL) {
  console.error("[error] DATABASE_URL tidak ditemukan");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(sql);
  console.log("[ok] Migrasi production selesai (warga internasional, blusukan_kunjungan, blusukan_quest).");
} catch (err) {
  console.error("[error]", err);
  process.exit(1);
} finally {
  await pool.end();
}

