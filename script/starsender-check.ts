import "dotenv/config";
import { isStarSenderConfigured, getStarSenderDeviceId, sendStarSenderMessage } from "../server/starsender";
import { ensureWaNotifikasiSchema } from "../server/wa-notify";
import { pool } from "../server/db";

async function main() {
  console.log("=== StarSender Diagnostic ===");
  console.log("Configured:", isStarSenderConfigured());
  console.log("Device ID:", getStarSenderDeviceId() ?? "(tidak diset)");

  const result = await sendStarSenderMessage({
    to: "08123456789",
    body: "[TEST RW3] Cek koneksi StarSender — abaikan pesan ini",
  });
  console.log("API response ok:", result.ok);
  console.log("API message:", result.message || result.error || "(kosong)");
  if (result.data) console.log("API data:", JSON.stringify(result.data).slice(0, 300));

  let table = await pool.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wa_notifikasi_log') AS exists",
  );
  if (!table.rows[0]?.exists) {
    console.log("\nTabel wa_notifikasi_log belum ada — membuat...");
    await ensureWaNotifikasiSchema();
    table = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wa_notifikasi_log') AS exists",
    );
  }
  console.log("\nTabel wa_notifikasi_log:", table.rows[0]?.exists ? "ADA" : "BELUM ADA");

  try {
    const logs = await pool.query(
      "SELECT status, COUNT(*)::int AS n FROM wa_notifikasi_log GROUP BY status ORDER BY status",
    );
    console.log("Log notifikasi:", logs.rows.length ? logs.rows : "(belum ada kiriman)");
    const recent = await pool.query(
      "SELECT event_key, nomor_whatsapp, status, error_message, sent_at FROM wa_notifikasi_log ORDER BY sent_at DESC NULLS LAST LIMIT 5",
    );
    if (recent.rows.length) {
      console.log("5 log terakhir:");
      for (const r of recent.rows) {
        const phone = String(r.nomor_whatsapp).replace(/(\d{4})\d+(\d{3})/, "$1****$2");
        console.log(" -", r.status, String(r.event_key).slice(0, 50), phone, r.error_message || "");
      }
    }
  } catch (e: any) {
    console.log("Query log gagal:", e?.message);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
