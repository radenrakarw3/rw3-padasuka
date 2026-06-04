import "dotenv/config";
import { initRw3law } from "../server/rw3law-routes";
import { checkRw3lawConnection } from "../server/rw3law";

async function main() {
  await initRw3law().catch((e) => console.warn("init warning:", e));
  const conn = await checkRw3lawConnection();
  console.log("DB connection:", conn);

  const base = process.env.API_BASE || "http://localhost:5000";
  for (const path of ["/api/public/rw3law/health", "/api/public/rw3law"]) {
    const url = `${base}${path}`;
    console.log("\nGET", url);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      const text = await res.text();
      console.log("status", res.status, text.slice(0, 300));
    } catch (e) {
      console.error("fetch failed:", e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
