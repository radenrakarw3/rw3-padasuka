import "dotenv/config";
import { storage } from "../server/storage.ts";

const t = Date.now();
const q = await storage.getBlusukanQuests("aktif");
console.log("quest", q.length, Date.now() - t, "ms");
const l = await storage.getAllLaporan();
console.log("laporan", l.length, Date.now() - t, "ms");
process.exit(0);
