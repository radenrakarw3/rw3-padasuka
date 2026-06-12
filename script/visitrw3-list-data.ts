import "dotenv/config";
import { pool } from "../server/db";

async function main() {
  const kost = await pool.query(
    `SELECT id, nama_kost, nama_pemilik, status_properti, nomor_pendaftaran FROM pemilik_kost ORDER BY id`,
  );
  console.log("=== pemilik_kost ===");
  console.table(kost.rows);

  const pengajuan = await pool.query(
    `SELECT id, nomor_visitrw3, status, pemilik_kost_id, keperluan_pengajuan FROM visitrw3_pengajuan ORDER BY id`,
  );
  console.log("\n=== visitrw3_pengajuan ===");
  console.table(pengajuan.rows);

  const singgah = await pool.query(
    `SELECT ws.id, ws.nama_lengkap, ws.pemilik_kost_id, pk.nama_kost FROM warga_singgah ws
     JOIN pemilik_kost pk ON pk.id = ws.pemilik_kost_id ORDER BY ws.id`,
  );
  console.log("\n=== warga_singgah ===");
  console.table(singgah.rows);

  const kas = await pool.query(
    `SELECT id, keterangan, jumlah FROM kas_rw WHERE keterangan ILIKE '%Visit RW3%' OR keterangan ILIKE '%visitrw3%' ORDER BY id`,
  );
  console.log("\n=== kas_rw visitrw3 ===");
  console.table(kas.rows);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
