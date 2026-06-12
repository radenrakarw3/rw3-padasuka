import "dotenv/config";
import { isStarSenderConfigured, sendStarSenderMessage } from "../server/starsender";

const to = process.argv[2] ?? "081321133823";

async function main() {
  if (!isStarSenderConfigured()) {
    console.error("STARSENDER_API_KEY belum diset di .env");
    process.exit(1);
  }

  const body =
    "Assalamu'alaikum.\n\n" +
    "Ini pesan uji coba notifikasi otomatis dari *KPP RW 03 Padasuka* (Visit RW3).\n\n" +
    "Jika Anda menerima pesan ini, integrasi StarSender sudah berjalan.\n\n" +
    "— Sistem RW 03 Padasuka";

  console.log("Mengirim ke:", to);
  const result = await sendStarSenderMessage({ to, body });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
