import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  UPDATE propaganda_antrian
  SET status = 'dibatalkan', last_error = 'Dihentikan — modul propaganda dihapus'
  WHERE status IN ('menunggu', 'mengirim')
`);
await pool.query(`
  UPDATE propaganda_campaign
  SET status = 'dibatalkan', selesai_kirim = NOW()
  WHERE status IN ('berjalan', 'jeda', 'draft')
`);
const r = await pool.query(`SELECT status, COUNT(*)::int AS cnt FROM propaganda_antrian GROUP BY status ORDER BY status`);
console.log("Antrian propaganda:", r.rows);
await pool.end();
