import "dotenv/config";
import {
  isStarSenderConfigured,
  isStarSenderDisabledFlag,
  getStarSenderDeviceId,
} from "../server/starsender";
import { ensureWaNotifikasiSchema, sendWaIfConfigured, logWaStartupStatus } from "../server/wa-notify";
import { pool } from "../server/db";

const TEST_PHONE = process.argv[2] ?? "081321133823";

async function main() {
  console.log("=== Verifikasi WA Notifikasi ke Warga ===\n");
  logWaStartupStatus();

  const checks: { label: string; ok: boolean; detail?: string }[] = [];

  checks.push({
    label: "STARSENDER_API_KEY",
    ok: Boolean(process.env.STARSENDER_API_KEY?.trim()),
  });
  checks.push({
    label: "StarSender tidak dinonaktifkan",
    ok: !isStarSenderDisabledFlag(),
    detail: isStarSenderDisabledFlag() ? "STARSENDER_DISABLED=true" : undefined,
  });
  checks.push({
    label: "StarSender configured",
    ok: isStarSenderConfigured(),
    detail: isStarSenderConfigured() ? `device ${getStarSenderDeviceId() ?? "default"}` : undefined,
  });

  await ensureWaNotifikasiSchema();
  checks.push({ label: "Tabel wa_notifikasi_log", ok: true });

  console.log("\nChecklist konfigurasi:");
  for (const c of checks) {
    console.log(` ${c.ok ? "✓" : "✗"} ${c.label}${c.detail ? ` (${c.detail})` : ""}`);
  }

  if (!isStarSenderConfigured()) {
    console.error("\nStarSender belum siap — perbaiki .env lalu jalankan ulang.");
    await pool.end();
    process.exit(1);
  }

  console.log(`\nUji kirim pesan tracking → ${TEST_PHONE}`);
  const eventKey = `verify:tracking:${Date.now()}`;
  await sendWaIfConfigured(
    TEST_PHONE,
    "Assalamu'alaikum.\n\n" +
      "Verifikasi notifikasi otomatis *KPP RW 03 Padasuka*.\n\n" +
      "Jika pesan ini masuk, sistem WA tracking ke warga berjalan normal.\n\n" +
      "— Sistem RW 03 Padasuka",
    { eventKey, referenceType: "verify" },
  );

  const log = await pool.query(
    "SELECT status, error_message FROM wa_notifikasi_log WHERE event_key = $1 LIMIT 1",
    [eventKey],
  );
  const row = log.rows[0];
  if (row?.status === "sent") {
    console.log("✓ Log database: sent");
  } else {
    console.log("✗ Log database:", row?.status ?? "tidak ditemukan", row?.error_message ?? "");
  }

  const summary = await pool.query(
    "SELECT status, COUNT(*)::int AS n FROM wa_notifikasi_log GROUP BY status ORDER BY status",
  );
  console.log("\nRingkasan log notifikasi:", summary.rows.length ? summary.rows : "(kosong)");

  await pool.end();
  process.exit(row?.status === "sent" ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end().catch(() => {});
  process.exit(1);
});
