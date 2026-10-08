import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  // Tabel modul wilayah dikelola lewat migrations/0023_wilayah.sql, bukan drizzle push.
  tablesFilter: ["!wil_*"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? "require" : false,
  },
});
