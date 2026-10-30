/**
 * Notifikasi WhatsApp Aduan Warga via StarSender.
 * Hanya ke pelapor yang menyertakan nomor WA (mode rahasia/terbuka). Anonim dilewati.
 */
import { notifyWaSafe, sendWaIfConfigured } from "./wa-notify";
import { normalizeStarSenderPhone } from "./starsender";
import { dekripsi } from "./aduan-kripto";
import { STATUS_ADUAN_INFO, type StatusAduan } from "@shared/aduan";

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL?.trim() || "https://rw3padasukacimahi.org";
const SENDER_LABEL = "KPP RW 03 Padasuka";

function siteUrl(path: string): string {
  const base = PUBLIC_SITE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function salam(nama?: string | null): string {
  return nama?.trim() ? `Assalamu'alaikum, ${nama.trim()}.` : "Assalamu'alaikum.";
}

type AduanRow = {
  id: number;
  nomor: string | null;
  kode_lacak: string;
  mode_identitas: string;
  pelapor_nama_enc: string | null;
  pelapor_wa_enc: string | null;
};

function kontakPelapor(a: AduanRow): { nomorWa: string; nama: string | null } | null {
  if (a.mode_identitas === "anonim") return null;
  const nomorWa = dekripsi(a.pelapor_wa_enc)?.trim() || null;
  if (!nomorWa) return null;
  return { nomorWa, nama: dekripsi(a.pelapor_nama_enc) };
}

export function notifyAduanDiterima(opts: {
  id: number;
  nomor: string;
  kodeLacak: string;
  pin: string;
  nomorWa: string | null | undefined;
  nama?: string | null;
}): void {
  notifyWaSafe(async () => {
    const nomorWa = opts.nomorWa?.trim();
    if (!nomorWa) return;
    const lacakUrl = siteUrl(`/aduan/lacak?kode=${encodeURIComponent(opts.kodeLacak)}`);
    await sendWaIfConfigured(
      nomorWa,
      `${salam(opts.nama)}\n\n` +
        `Aduan Anda *${opts.nomor}* sudah kami terima.\n\n` +
        `Kode lacak: *${opts.kodeLacak}*\n` +
        `PIN: *${opts.pin}*\n\n` +
        `Pantau perkembangan di:\n${lacakUrl}\n\n` +
        `Jaga kerahasiaan kode & PIN. Jangan bagikan ke pihak yang diadukan.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `aduan:submitted:${opts.id}:${normalizeStarSenderPhone(nomorWa)}`,
        referenceType: "aduan",
        referenceId: opts.id,
      },
    );
  });
}

export function notifyAduanStatus(
  aduan: AduanRow,
  status: StatusAduan,
  pesanPublik?: string | null,
): void {
  notifyWaSafe(async () => {
    const kontak = kontakPelapor(aduan);
    if (!kontak) return;
    const info = STATUS_ADUAN_INFO[status];
    const lacakUrl = siteUrl(`/aduan/lacak?kode=${encodeURIComponent(aduan.kode_lacak)}`);
    const ekstra = pesanPublik?.trim()
      ? `\nPesan pengurus:\n${pesanPublik.trim()}\n`
      : "";
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `Update aduan *${aduan.nomor ?? "-"}*:\n` +
        `*${info.label}* — ${info.publik}\n` +
        ekstra +
        `\nCek detail:\n${lacakUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `aduan:status:${aduan.id}:${status}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "aduan",
        referenceId: aduan.id,
      },
    );
  });
}

export function notifyAduanPesanPublik(aduan: AduanRow, pesan: string): void {
  notifyWaSafe(async () => {
    const kontak = kontakPelapor(aduan);
    if (!kontak) return;
    const teks = pesan.trim();
    if (!teks) return;
    const lacakUrl = siteUrl(`/aduan/lacak?kode=${encodeURIComponent(aduan.kode_lacak)}`);
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `Pesan dari pengurus RW untuk aduan *${aduan.nomor ?? "-"}*:\n\n` +
        `${teks}\n\n` +
        `Balas / pantau di:\n${lacakUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `aduan:pesan:${aduan.id}:${Date.now()}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "aduan",
        referenceId: aduan.id,
      },
    );
  });
}

export function notifyAduanTeguranTerbit(
  aduan: AduanRow,
  opts: { labelTeguran: string; tenggat: string; nomorSurat: string },
): void {
  notifyWaSafe(async () => {
    const kontak = kontakPelapor(aduan);
    if (!kontak) return;
    const lacakUrl = siteUrl(`/aduan/lacak?kode=${encodeURIComponent(aduan.kode_lacak)}`);
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `Update aduan *${aduan.nomor ?? "-"}*:\n` +
        `*${opts.labelTeguran}* telah diterbitkan kepada pihak terkait` +
        (opts.nomorSurat ? ` (surat *${opts.nomorSurat}*)` : "") +
        `.\n` +
        `Batas perbaikan: *${opts.tenggat}*\n\n` +
        `Detail:\n${lacakUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `aduan:teguran:${aduan.id}:${opts.nomorSurat}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "aduan",
        referenceId: aduan.id,
      },
    );
  });
}
