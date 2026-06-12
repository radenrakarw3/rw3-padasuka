/**
 * Hapus data Visit RW3 selain Kontrakan Pak Hatiwa (pemilik_kost id atau nama).
 * Jalankan: npx tsx script/visitrw3-cleanup.ts
 */
import "dotenv/config";
import { pool } from "../server/db";

const KEEP_KOST_NAME = "Kontrakan Pak Hatiwa";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const keep = await client.query(
      `SELECT id, nama_kost, nomor_pendaftaran FROM pemilik_kost WHERE nama_kost = $1`,
      [KEEP_KOST_NAME],
    );
    if (keep.rows.length !== 1) {
      throw new Error(
        `Harus ada tepat 1 properti "${KEEP_KOST_NAME}", ditemukan: ${keep.rows.length}`,
      );
    }
    const keepId = keep.rows[0].id as number;
    console.log("Pertahankan:", keep.rows[0]);

    const pengajuanDel = await client.query(
      `DELETE FROM visitrw3_pengajuan
       WHERE pemilik_kost_id IS NULL OR pemilik_kost_id <> $1`,
      [keepId],
    );
    console.log("Hapus visitrw3_pengajuan:", pengajuanDel.rowCount);

    const singgahDel = await client.query(
      `DELETE FROM warga_singgah WHERE pemilik_kost_id <> $1`,
      [keepId],
    );
    console.log("Hapus warga_singgah:", singgahDel.rowCount);

    const kostDel = await client.query(
      `DELETE FROM pemilik_kost WHERE id <> $1`,
      [keepId],
    );
    console.log("Hapus pemilik_kost:", kostDel.rowCount);

    const waLog = await client.query(
      `DELETE FROM wa_notifikasi_log
       WHERE event_key LIKE 'visitrw3:%'
          OR event_key LIKE 'laporan:%'
          OR event_key LIKE 'kekeringan:%'
          OR reference_type IN ('visitrw3_pengajuan', 'warga_singgah')
          OR (reference_type = 'pemilik_kost' AND reference_id <> $1)`,
      [keepId],
    );
    console.log("Hapus wa_notifikasi_log terkait:", waLog.rowCount);

    await client.query("COMMIT");

    const verify = await client.query(`
      SELECT (SELECT COUNT(*)::int FROM pemilik_kost) AS kost,
             (SELECT COUNT(*)::int FROM visitrw3_pengajuan) AS pengajuan,
             (SELECT COUNT(*)::int FROM warga_singgah) AS singgah,
             (SELECT COUNT(*)::int FROM visitrw3_penghuni) AS penghuni
    `);
    console.log("\nVerifikasi:", verify.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
