import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const lap = await pool.query("SELECT COUNT(*)::int AS c FROM laporan");
  const quest = await pool.query(
    "SELECT to_regclass('public.blusukan_quest') AS t",
  );
  const sample = await pool.query(
    "SELECT id, judul, status FROM laporan ORDER BY id DESC LIMIT 3",
  );
  console.log("laporan count:", lap.rows[0].c);
  console.log("blusukan_quest table:", quest.rows[0].t);
  console.log("sample laporan:", sample.rows);
} finally {
  await pool.end();
}
