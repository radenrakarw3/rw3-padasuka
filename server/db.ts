import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const dbUrl = process.env.DATABASE_URL || "";
const sslConfig = dbUrl.includes("sslmode=")
  ? undefined
  : process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined;

export const pool = new pg.Pool({
  connectionString: dbUrl,
  ...(sslConfig !== undefined && { ssl: sslConfig }),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Cegah crash saat koneksi idle timeout diputus oleh server DB
pool.on("error", (err) => {
  console.error("[db] pool error (non-fatal):", err.message);
});

export const db = drizzle(pool, { schema });
