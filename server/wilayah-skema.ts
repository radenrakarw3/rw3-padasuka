/**
 * Memastikan skema modul wilayah lengkap saat server menyala.
 * Berkas migrasi wilayah hanya berisi CREATE … IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DROP NOT NULL
 * (tanpa UPDATE/DELETE), sehingga aman dijalankan ulang. Set WILAYAH_AUTO_MIGRATE=false untuk mematikan.
 */
import fs from "fs";
import path from "path";
import { pool } from "./db";

const TABEL_0023 = [
  "wil_rumah", "wil_rumah_kk", "wil_fakta", "wil_usaha", "wil_usaha_pemilik", "wil_fasilitas", "wil_kelompok",
  "wil_kegiatan", "wil_kegiatan_peserta", "wil_kejadian", "wil_tindak_lanjut", "wil_usulan_koreksi", "wil_serah_terima",
  "wil_konfirmasi", "wil_laporan", "wil_kk_token", "wil_usulan", "wil_audit", "wil_surat_counter", "wil_surat_lampiran",
  "wil_surat_kirim", "wil_surat_tindak", "wil_permintaan_surat",
];

/** Urutan migrasi wilayah beserta pemeriksa "sudah terpasang". */
export const MIGRASI_WILAYAH: { file: string; terpasang: () => Promise<boolean> }[] = [
  {
    file: "0023_wilayah.sql",
    terpasang: async () => {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM unnest($1::text[]) AS t WHERE to_regclass(t) IS NULL`, [TABEL_0023]);
      return rows[0].n === 0;
    },
  },
  {
    file: "0024_wilayah_input_rw.sql",
    terpasang: async () => {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM information_schema.columns
          WHERE table_name = 'wil_usulan' AND column_name IN ('sumber', 'diinput_oleh', 'keluarga_baru')`,
      );
      return rows[0].n === 3;
    },
  },
  {
    file: "0026_wilayah_standar.sql",
    terpasang: async () => {
      const { rows } = await pool.query(`SELECT to_regclass('wil_pertanyaan') IS NOT NULL AS ada`);
      return rows[0].ada === true;
    },
  },
  {
    file: "0032_surat_ttd.sql",
    terpasang: async () => {
      const { rows } = await pool.query(`SELECT to_regclass('wil_surat_ttd') IS NOT NULL AS ada`);
      return rows[0].ada === true;
    },
  },
];

function bacaSql(file: string): string | null {
  const kandidat = [path.join(process.cwd(), "migrations", file)];
  if (typeof __dirname !== "undefined") kandidat.push(path.join(__dirname, "..", "migrations", file));
  for (const p of kandidat) if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  return null;
}

export async function pastikanSkemaWilayah(): Promise<void> {
  try {
    const kurang: string[] = [];
    for (const m of MIGRASI_WILAYAH) if (!(await m.terpasang())) kurang.push(m.file);
    if (!kurang.length) {
      console.log("[WILAYAH] Skema lengkap");
      return;
    }
    if (process.env.WILAYAH_AUTO_MIGRATE === "false") {
      console.error(`[WILAYAH] Migrasi belum terpasang: ${kurang.join(", ")} (WILAYAH_AUTO_MIGRATE=false). Jalankan: npm run wilayah:migrate -- --apply`);
      return;
    }
    for (const file of kurang) {
      const sql = bacaSql(file);
      if (!sql) {
        console.error(`[WILAYAH] migrations/${file} tidak ditemukan; skema tidak dapat dipasang otomatis`);
        return;
      }
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        await c.query(`SELECT pg_advisory_xact_lock(hashtext('wilayah_skema'))`);
        await c.query(sql);
        await c.query("COMMIT");
        console.log(`[WILAYAH] Migrasi ${file} dipasang otomatis`);
      } catch (e) {
        await c.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    }
  } catch (e) {
    console.error("[WILAYAH] Gagal memeriksa/memasang skema:", (e as Error).message);
  }
}
