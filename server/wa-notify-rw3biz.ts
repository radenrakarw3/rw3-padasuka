import { notifyWaSafe, sendWaIfConfigured } from "./wa-notify";
import { normalizeStarSenderPhone } from "./starsender";
import type { Rw3bizPengajuan, Rw3bizOrang } from "@shared/schema";

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL?.trim() || "https://rw3padasukacimahi.org";
const SENDER_LABEL = "KPP RW 03 Padasuka";

function siteUrl(path: string): string {
  const base = PUBLIC_SITE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function salam(nama?: string | null): string {
  return nama?.trim() ? `Assalamu'alaikum, ${nama.trim()}.` : "Assalamu'alaikum.";
}

function formatTanggalId(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Kontak WA penanggung jawab pengajuan (pj_nomor_whatsapp jadi kunci). */
function pjKontak(pengajuan: Rw3bizPengajuan): { nomorWa: string; nama: string } | null {
  const nomorWa = pengajuan.pjNomorWhatsapp?.trim();
  if (!nomorWa) return null;
  return { nomorWa, nama: pengajuan.pjNama };
}

export function notifyRw3bizPengajuanBaru(
  pengajuan: Rw3bizPengajuan,
  _orang: Rw3bizOrang[],
): void {
  notifyWaSafe(async () => {
    const kontak = pjKontak(pengajuan);
    if (!kontak) return;
    const statusUrl = siteUrl("/rw3biz/status");
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `Pengajuan izin usaha RW3BIZ untuk *${pengajuan.namaUsaha}* (*${pengajuan.nomorBiz}*) sudah kami terima dan sedang *menunggu survey RW*.\n\n` +
        `Tim RW akan datang untuk verifikasi. Pantau perkembangan di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:submitted:${pengajuan.id}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "rw3biz_pengajuan",
        referenceId: pengajuan.id,
      },
    );
  });
}

export function notifyRw3bizPerpanjang(pengajuan: Rw3bizPengajuan, nomorLama: string): void {
  notifyWaSafe(async () => {
    const kontak = pjKontak(pengajuan);
    if (!kontak) return;
    const statusUrl = siteUrl("/rw3biz/status");
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `Permohonan *perpanjangan* izin usaha RW3BIZ untuk *${pengajuan.namaUsaha}* sudah kami terima.\n\n` +
        `Nomor lama: *${nomorLama}*\n` +
        `Nomor antrian baru: *${pengajuan.nomorBiz}*\n` +
        `Status: *menunggu survey RW*\n\n` +
        `Pantau perkembangan di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:perpanjang:${pengajuan.id}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "rw3biz_pengajuan",
        referenceId: pengajuan.id,
      },
    );
  });
}

export function notifyRw3bizDisetujui(pengajuan: Rw3bizPengajuan): void {
  notifyWaSafe(async () => {
    const kontak = pjKontak(pengajuan);
    if (!kontak) return;
    const berlaku = pengajuan.tanggalBerlakuSampai ? formatTanggalId(pengajuan.tanggalBerlakuSampai) : "-";
    const statusUrl = siteUrl("/rw3biz/status");
    const tipeLabel = pengajuan.tipe === "perpanjang" ? "Perpanjangan" : "Pengajuan";
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `*${tipeLabel} izin usaha RW3BIZ disetujui!*\n\n` +
        `Usaha: *${pengajuan.namaUsaha}*\n` +
        `Nomor: *${pengajuan.nomorBiz}*\n` +
        `Berlaku sampai: *${berlaku}*\n\n` +
        `Terima kasih atas kerja samanya. Cek detail di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:approved:${pengajuan.id}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "rw3biz_pengajuan",
        referenceId: pengajuan.id,
      },
    );
  });
}

export function notifyRw3bizDitolak(pengajuan: Rw3bizPengajuan, alasanTolak: string): void {
  notifyWaSafe(async () => {
    const kontak = pjKontak(pengajuan);
    if (!kontak) return;
    const statusUrl = siteUrl("/rw3biz/status");
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `Mohon maaf, pengajuan izin usaha RW3BIZ *${pengajuan.nomorBiz}* (${pengajuan.namaUsaha}) belum dapat kami setujui.\n\n` +
        `Alasan: ${alasanTolak.trim()}\n\n` +
        `Jika ada pertanyaan, silakan hubungi pengurus RW atau cek status di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:rejected:${pengajuan.id}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "rw3biz_pengajuan",
        referenceId: pengajuan.id,
      },
    );
  });
}
