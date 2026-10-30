/**
 * Verifikasi template notifikasi StarSender untuk VisitRW3, RW3BIZ, dan Aduan.
 * Usage: npx tsx script/wa-notify-verify-modul.ts [nomorWA]
 */
import { config } from "dotenv";
config({ override: true });

const TEST_PHONE = process.argv[2] ?? "081321133823";
const stamp = Date.now();

async function main() {
  const { isStarSenderConfigured, isStarSenderDisabledFlag, getStarSenderDeviceId } =
    await import("../server/starsender");
  const { ensureWaNotifikasiSchema, sendWaIfConfigured, logWaStartupStatus } =
    await import("../server/wa-notify");
  const { pool } = await import("../server/db");

  const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL?.trim() || "https://rw3padasukacimahi.org";

  console.log("=== Verifikasi WA: VisitRW3 · RW3BIZ · Aduan ===\n");
  logWaStartupStatus();

  const okEnv =
    Boolean(process.env.STARSENDER_API_KEY?.trim()) &&
    !isStarSenderDisabledFlag() &&
    isStarSenderConfigured();

  console.log(`API key: ${okEnv ? "OK" : "BELUM SIAP"}`);
  console.log(`Device: ${getStarSenderDeviceId() ?? "default"}`);
  console.log(`Tujuan uji: ${TEST_PHONE}\n`);

  if (!okEnv) {
    console.error("StarSender belum siap — perbaiki .env");
    await pool.end();
    process.exit(1);
  }

  await ensureWaNotifikasiSchema();

  const samples: { modul: string; eventKey: string; body: string }[] = [
    {
      modul: "VisitRW3",
      eventKey: `verify:visitrw3:${stamp}`,
      body:
        `Assalamu'alaikum.\n\n` +
        `*[UJI] Visit RW3*\n\n` +
        `Ini contoh notifikasi pengajuan/status Visit RW3 dari *KPP RW 03 Padasuka*.\n` +
        `Pantau status: ${PUBLIC_SITE_URL}/visitrw3/status\n\n` +
        `— Sistem RW 03 Padasuka`,
    },
    {
      modul: "RW3BIZ",
      eventKey: `verify:rw3biz:${stamp}`,
      body:
        `Assalamu'alaikum.\n\n` +
        `*[UJI] RW3BIZ*\n\n` +
        `Ini contoh notifikasi pengajuan/izin usaha RW3BIZ dari *KPP RW 03 Padasuka*.\n` +
        `Pantau status: ${PUBLIC_SITE_URL}/rw3biz/status\n\n` +
        `— Sistem RW 03 Padasuka`,
    },
    {
      modul: "Aduan",
      eventKey: `verify:aduan:${stamp}`,
      body:
        `Assalamu'alaikum.\n\n` +
        `*[UJI] Aduan Warga*\n\n` +
        `Ini contoh notifikasi aduan warga (diterima / update status) dari *KPP RW 03 Padasuka*.\n` +
        `Lacak aduan: ${PUBLIC_SITE_URL}/aduan/lacak\n\n` +
        `— Sistem RW 03 Padasuka`,
    },
  ];

  let gagal = 0;
  for (const s of samples) {
    console.log(`Kirim uji ${s.modul}…`);
    await sendWaIfConfigured(TEST_PHONE, s.body, {
      eventKey: s.eventKey,
      referenceType: "verify",
    });
    const log = await pool.query(
      "SELECT status, error_message FROM wa_notifikasi_log WHERE event_key = $1 LIMIT 1",
      [s.eventKey],
    );
    const row = log.rows[0];
    if (row?.status === "sent") {
      console.log(`  ✓ ${s.modul}: sent`);
    } else {
      gagal++;
      console.log(`  ✗ ${s.modul}:`, row?.status ?? "tidak ada log", row?.error_message ?? "");
    }
    await new Promise((r) => setTimeout(r, 1300));
  }

  console.log(gagal === 0 ? "\nSemua modul OK." : `\n${gagal} modul gagal.`);
  await pool.end();
  process.exit(gagal === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try {
    const { pool } = await import("../server/db");
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
