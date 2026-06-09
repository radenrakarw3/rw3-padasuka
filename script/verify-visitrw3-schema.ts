/**
 * Verifikasi tabel & kolom Visit RW3 di PostgreSQL.
 * Jalankan: npx tsx script/verify-visitrw3-schema.ts
 */
import "dotenv/config";
import { pool } from "../server/db";
import { ensureVisitrw3Schema } from "../server/visitrw3";

const TABLES = [
  "pemilik_kost",
  "warga_singgah",
  "visitrw3_pengajuan",
  "visitrw3_penghuni",
  "visitrw3_settings",
  "riwayat_kontrak",
] as const;

const REQUIRED_COLS: Record<string, string[]> = {
  pemilik_kost: [
    "nomor_pendaftaran",
    "izin_tinggal",
    "izin_bisnis",
    "jenis_properti",
    "status_properti",
    "nama_penanggung_jawab",
    "setuju_tata_tertib",
    "estimasi_kontribusi",
    "kas_rw_id",
  ],
  warga_singgah: ["nomor_visitrw3", "pengajuan_id", "termin_bulan"],
  visitrw3_pengajuan: [
    "nomor_unit",
    "jenis_tempat_usaha",
    "tinggal_di_wilayah_rw3",
    "setuju_tata_tertib",
    "estimasi_kontribusi",
    "kas_rw_id",
    "persetujuan_tetangga",
  ],
  visitrw3_penghuni: ["foto_ktp_path", "urutan", "is_anak"],
  visitrw3_settings: ["key", "value", "label"],
};

async function verifyTables() {
  const issues: string[] = [];

  for (const t of TABLES) {
    const r = await pool.query(`SELECT to_regclass($1) AS exists`, [`public.${t}`]);
    if (!r.rows[0]?.exists) {
      issues.push(`TABLE MISSING: ${t}`);
      continue;
    }

    const cols = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [t],
    );
    const names = new Set(cols.rows.map((x) => x.column_name));

    for (const c of REQUIRED_COLS[t] ?? []) {
      if (!names.has(c)) issues.push(`COLUMN MISSING: ${t}.${c}`);
    }

    console.log(`OK ${t} (${names.size} kolom)`);
  }

  return issues;
}

async function main() {
  console.log("=== Verifikasi schema Visit RW3 ===\n");

  // Pastikan schema init berjalan tanpa error
  await ensureVisitrw3Schema();
  console.log("ensureVisitrw3Schema: OK\n");

  const issues = await verifyTables();

  // Cek koneksi dasar
  const ping = await pool.query("SELECT 1 AS ok");
  console.log(`\nKoneksi DB: ${ping.rows[0]?.ok === 1 ? "OK" : "GAGAL"}`);

  if (issues.length) {
    console.error("\nMasalah ditemukan:");
    for (const i of issues) console.error(`  - ${i}`);
    process.exit(1);
  }

  console.log("\nSemua tabel & kolom Visit RW3 lengkap.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
