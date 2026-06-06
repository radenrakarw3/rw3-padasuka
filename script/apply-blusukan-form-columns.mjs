/**
 * Kolom form Blusukan RW (KK + warga) — idempotent.
 * Jalankan: npx tsx script/apply-blusukan-form-columns.mjs
 */
import "dotenv/config";
import pg from "pg";

const sql = `
ALTER TABLE kartu_keluarga ADD COLUMN IF NOT EXISTS no_unit text;
ALTER TABLE kartu_keluarga ADD COLUMN IF NOT EXISTS label_rw text;

ALTER TABLE warga ADD COLUMN IF NOT EXISTS tanggal_terbit_akta_lahir text;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS tempat_terbit_akta_lahir text;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS nama_ibu_akta_lahir text;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS nama_ayah_akta_lahir text;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS punya_usaha_luar_rw3 boolean NOT NULL DEFAULT false;
ALTER TABLE warga ADD COLUMN IF NOT EXISTS nama_usaha_luar_rw3 text;

ALTER TABLE kartu_keluarga ADD COLUMN IF NOT EXISTS kendaraan_data text;
`;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(sql);
  console.log("[ok] Kolom form Blusukan RW siap.");
} finally {
  await pool.end();
}
