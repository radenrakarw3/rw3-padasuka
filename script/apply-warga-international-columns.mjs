/**
 * Tambah kolom standar internasional pada tabel warga (idempotent).
 * Jalankan: npx tsx script/apply-warga-international-columns.mjs
 */
import "dotenv/config";
import pg from "pg";

const sql = `
ALTER TABLE warga ADD COLUMN IF NOT EXISTS literasi text;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS wg_kesulitan_melihat text;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS wg_kesulitan_berjalan text;
`;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(sql);
  console.log("[ok] Kolom literasi, wg_kesulitan_melihat, wg_kesulitan_berjalan siap.");
} finally {
  await pool.end();
}
