import { notifyWaSafe, sendWaIfConfigured } from "./wa-notify";
import { normalizeStarSenderPhone } from "./starsender";
import type { Rw3bizPengajuan, Rw3bizOrang, Rw3bizUsaha } from "@shared/schema";
import { teksCaraSetor } from "@shared/rw3biz-pernyataan";

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
        `Pengajuan izin usaha RW3BIZ untuk *${pengajuan.namaUsaha}* (*${pengajuan.nomorBiz}*) sudah kami terima dan sedang *menunggu persetujuan Ketua RW 03*.\n\n` +
        `Pantau perkembangan di:\n${statusUrl}\n\n` +
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
        `Status: *menunggu persetujuan Ketua RW 03*\n\n` +
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

export function notifyRw3bizDisetujui(pengajuan: Rw3bizPengajuan, usaha?: Rw3bizUsaha | null): void {
  notifyWaSafe(async () => {
    const kontak = pjKontak(pengajuan);
    if (!kontak) return;
    const berlaku = pengajuan.tanggalBerlakuSampai ? formatTanggalId(pengajuan.tanggalBerlakuSampai) : "-";
    const niu = usaha?.nomorInduk?.trim() || null;
    const cekNomor = niu ?? pengajuan.nomorBiz;
    const statusUrl = siteUrl(`/rw3biz/status?nomor=${encodeURIComponent(cekNomor)}`);
    const tipeLabel = pengajuan.tipe === "perpanjang" ? "perpanjangan" : "pendaftaran";
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `*Terima kasih — usaha Anda resmi menjadi bagian dari RW3BIZ!*\n\n` +
        `${tipeLabel === "perpanjangan" ? "Perpanjangan" : "Pendaftaran"} *${pengajuan.namaUsaha}* telah disetujui Ketua RW 03.\n\n` +
        (niu ? `Nomor Induk Usaha: *${niu}*\n` : "") +
        `Nomor surat: *${pengajuan.nomorBiz}*\n` +
        `Berlaku sampai: *${berlaku}*\n\n` +
        `Kartu anggota & kwitansi setiap setoran ada di halaman status:\n${statusUrl}\n\n` +
        `${teksCaraSetor(0)}\n\n` +
        `Selamat bergabung di komunitas usaha RW 03. Semoga usaha makin berkah.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:approved:${pengajuan.id}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "rw3biz_pengajuan",
        referenceId: pengajuan.id,
      },
    );
  });
}

/** WA setelah setoran dicatat admin — tautan kwitansi. */
export function notifyRw3bizSetoran(
  usaha: Pick<Rw3bizUsaha, "id" | "namaUsaha" | "nomorInduk" | "nomorBiz" | "pjNomorWhatsapp" | "pjNama">,
  opsi: { jumlah: number; periode: string; pembayaranId: number; nomorKwitansi: string; tanggal: string },
): void {
  notifyWaSafe(async () => {
    const nomorWa = usaha.pjNomorWhatsapp?.trim();
    if (!nomorWa) return;
    const cekNomor = usaha.nomorInduk ?? usaha.nomorBiz;
    const statusUrl = siteUrl(`/rw3biz/status?nomor=${encodeURIComponent(cekNomor)}`);
    const kwUrl = siteUrl(`/api/public/rw3biz/kwitansi/${opsi.pembayaranId}?nomor=${encodeURIComponent(cekNomor)}`);
    const rp = `Rp${opsi.jumlah.toLocaleString("id-ID")}`;
    await sendWaIfConfigured(
      nomorWa,
      `${salam(usaha.pjNama)}\n\n` +
        `Setoran RW3BIZ *${usaha.namaUsaha}* sudah dicatat.\n\n` +
        `Jumlah: *${rp}*\n` +
        `Periode: *${opsi.periode}*\n` +
        `Tanggal: *${formatTanggalId(opsi.tanggal)}*\n` +
        `Kwitansi: *${opsi.nomorKwitansi}*\n\n` +
        `Unduh kwitansi:\n${kwUrl}\n\n` +
        `Semua kwitansi juga ada di kartu anggota:\n${statusUrl}\n\n` +
        `Terima kasih sudah menjadi bagian dari RW3BIZ.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:setoran:${opsi.pembayaranId}:${normalizeStarSenderPhone(nomorWa)}`,
        referenceType: "rw3biz_pembayaran",
        referenceId: opsi.pembayaranId,
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
