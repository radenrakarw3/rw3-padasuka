/**
 * Memastikan tabel modul wilayah ada saat server menyala.
 * 0023_wilayah.sql hanya berisi CREATE … IF NOT EXISTS / ADD COLUMN IF NOT EXISTS (tanpa UPDATE/DELETE),
 * sehingga aman dijalankan ulang. Set WILAYAH_AUTO_MIGRATE=false untuk mematikan.
 */
import fs from "fs";
import path from "path";
import { pool } from "./db";

const TABEL_WAJIB = [
  "wil_rumah", "wil_rumah_kk", "wil_fakta", "wil_usaha", "wil_usaha_pemilik", "wil_fasilitas", "wil_kelompok",
  "wil_kegiatan", "wil_kegiatan_peserta", "wil_kejadian", "wil_tindak_lanjut", "wil_usulan_koreksi", "wil_serah_terima",
  "wil_konfirmasi", "wil_laporan", "wil_kk_token", "wil_usulan", "wil_audit", "wil_surat_counter", "wil_surat_lampiran",
  "wil_surat_kirim", "wil_surat_tindak", "wil_permintaan_surat",
];

async function tabelHilang(): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT t FROM unnest($1::text[]) AS t WHERE to_regclass(t) IS NULL`,
    [TABEL_WAJIB],
  );
  return rows.map((r) => r.t as string);
}

function cariSql(): string | null {
  const kandidat = [path.join(process.cwd(), "migrations", "0023_wilayah.sql")];
  if (typeof __dirname !== "undefined") kandidat.push(path.join(__dirname, "..", "migrations", "0023_wilayah.sql"));
  for (const p of kandidat) if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  return null;
}

export async function pastikanSkemaWilayah(): Promise<void> {
  try {
    const hilang = await tabelHilang();
    if (!hilang.length) {
      console.log("[WILAYAH] Skema lengkap (23 tabel)");
      return;
    }
    if (process.env.WILAYAH_AUTO_MIGRATE === "false") {
      console.error(`[WILAYAH] ${hilang.length} tabel belum ada dan WILAYAH_AUTO_MIGRATE=false. Jalankan: npm run wilayah:migrate -- --apply`);
      return;
    }
    const sql = cariSql();
    if (!sql) {
      console.error("[WILAYAH] migrations/0023_wilayah.sql tidak ditemukan; skema tidak dapat dipasang otomatis");
      return;
    }
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query(`SELECT pg_advisory_xact_lock(hashtext('wilayah_skema_0023'))`);
      await c.query(sql);
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      c.release();
    }
    const sisa = await tabelHilang();
    if (sisa.length) console.error(`[WILAYAH] Skema masih kurang: ${sisa.join(", ")}`);
    else console.log(`[WILAYAH] Skema dipasang otomatis (${hilang.length} tabel baru)`);
  } catch (e) {
    console.error("[WILAYAH] Gagal memeriksa/memasang skema:", (e as Error).message);
  }
}
