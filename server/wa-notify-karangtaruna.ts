import { notifyWaSafe, sendWaIfConfigured } from "./wa-notify";
import { normalizeStarSenderPhone } from "./starsender";
import type { KarangtarunaAnggota } from "@shared/schema";

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL?.trim() || "https://rw3padasukacimahi.org";
const SENDER_LABEL = "KPP RW 03 Padasuka";

function siteUrl(path: string): string {
  const base = PUBLIC_SITE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function salam(nama?: string | null): string {
  return nama?.trim() ? `Assalamu'alaikum, ${nama.trim()}.` : "Assalamu'alaikum.";
}

/** Konfirmasi WA ke pemuda yang baru mendaftar Karang Taruna. */
export function notifyKarangtarunaDaftarBaru(anggota: KarangtarunaAnggota): void {
  notifyWaSafe(async () => {
    const nomorWa = anggota.nomorWhatsapp?.trim();
    if (!nomorWa) return;
    const statusUrl = siteUrl("/karangtaruna/status");
    await sendWaIfConfigured(
      nomorWa,
      `${salam(anggota.namaLengkap)}\n\n` +
        `Terima kasih sudah mendaftar *Karang Taruna RW 03 Padasuka*! 🎉\n\n` +
        `Nomor anggota kamu: *${anggota.nomorAnggota}*\n` +
        `Data skill & potensimu sudah kami terima dan akan ditinjau pengurus RW untuk difasilitasi.\n\n` +
        `Simpan nomor ini untuk cek status di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `karangtaruna:daftar:${anggota.id}:${normalizeStarSenderPhone(nomorWa)}`,
        referenceType: "karangtaruna_anggota",
        referenceId: anggota.id,
      },
    );
  });
}
