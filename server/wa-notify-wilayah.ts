import { normalizeStarSenderPhone } from "./starsender";
import { notifyWaSafe, sendWaIfConfigured } from "./wa-notify";

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL?.trim() || "https://rw3padasukacimahi.org";
const SENDER_LABEL = "KPP RW 03 Padasuka";

function siteUrl(path: string): string {
  const base = PUBLIC_SITE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function salam(nama?: string | null): string {
  return nama?.trim() ? `Assalamu'alaikum, ${nama.trim()}.` : "Assalamu'alaikum.";
}

export function notifyUsulanDikirim(opts: {
  nomorHp: string;
  namaPengisi: string;
  kodeTerima: string;
  usulanId?: number;
}): void {
  notifyWaSafe(async () => {
    if (!opts.nomorHp?.trim()) return;
    const lacakUrl = siteUrl("/isi/status");
    await sendWaIfConfigured(
      opts.nomorHp,
      `${salam(opts.namaPengisi)}\n\n` +
        `*Usulan data keluarga diterima*\n\n` +
        `Kode tanda terima: *${opts.kodeTerima}*\n` +
        `Status: *menunggu pemeriksaan pengurus*\n\n` +
        `Simpan kode ini. Cek status di:\n${lacakUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `wilayah:usulan:kirim:${opts.kodeTerima}:${normalizeStarSenderPhone(opts.nomorHp)}`,
        referenceType: "wil_usulan",
        referenceId: opts.usulanId,
      },
    );
  });
}

export function notifyUsulanDiputuskan(opts: {
  nomorHp: string;
  namaPengisi?: string | null;
  kodeTerima: string;
  usulanId: number;
  aksi: "terima" | "tolak" | "klarifikasi";
  catatan?: string | null;
}): void {
  notifyWaSafe(async () => {
    if (!opts.nomorHp?.trim()) return;
    const lacakUrl = siteUrl("/isi/status");
    const label =
      opts.aksi === "terima" ? "diterima" : opts.aksi === "tolak" ? "ditolak" : "perlu klarifikasi";
    const catatanBaris = opts.catatan?.trim() ? `\nCatatan: ${opts.catatan.trim()}\n` : "\n";
    await sendWaIfConfigured(
      opts.nomorHp,
      `${salam(opts.namaPengisi)}\n\n` +
        `*Hasil usulan data keluarga*\n\n` +
        `Kode: *${opts.kodeTerima}*\n` +
        `Keputusan: *${label}*` +
        catatanBaris +
        `\nDetail di:\n${lacakUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `wilayah:usulan:putusan:${opts.usulanId}:${opts.aksi}:${normalizeStarSenderPhone(opts.nomorHp)}`,
        referenceType: "wil_usulan",
        referenceId: opts.usulanId,
      },
    );
  });
}
