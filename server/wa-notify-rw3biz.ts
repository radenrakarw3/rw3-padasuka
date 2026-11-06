import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { rw3bizUsaha } from "@shared/schema";
import type { Rw3bizPengajuan, Rw3bizOrang, Rw3bizUsaha } from "@shared/schema";
import { teksCaraSetor } from "@shared/rw3biz-pernyataan";
import { isStarSenderConfigured, normalizeStarSenderPhone } from "./starsender";
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

function formatRp(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

/** Kontak WA penanggung jawab pengajuan (pj_nomor_whatsapp jadi kunci). */
function pjKontak(pengajuan: Rw3bizPengajuan): { nomorWa: string; nama: string } | null {
  const nomorWa = pengajuan.pjNomorWhatsapp?.trim();
  if (!nomorWa) return null;
  return { nomorWa, nama: pengajuan.pjNama };
}

function usahaKontak(
  usaha: Pick<Rw3bizUsaha, "pjNomorWhatsapp" | "pjNama">,
): { nomorWa: string; nama: string } | null {
  const nomorWa = usaha.pjNomorWhatsapp?.trim();
  if (!nomorWa) return null;
  return { nomorWa, nama: usaha.pjNama };
}

export function notifyRw3bizPengajuanBaru(
  pengajuan: Rw3bizPengajuan,
  _orang: Rw3bizOrang[],
): void {
  notifyWaSafe(async () => {
    const kontak = pjKontak(pengajuan);
    if (!kontak) return;
    const statusUrl = siteUrl(`/rw3biz/status?nomor=${encodeURIComponent(pengajuan.nomorBiz)}`);
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `*Pengajuan RW3BIZ diterima*\n\n` +
        `Usaha: *${pengajuan.namaUsaha}*\n` +
        `Nomor antrian: *${pengajuan.nomorBiz}*\n` +
        `Status: *menunggu persetujuan Ketua RW 03*\n\n` +
        `Simpan pesan ini sebagai bukti pendaftaran. Pantau perkembangan di:\n${statusUrl}\n\n` +
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
    const statusUrl = siteUrl(`/rw3biz/status?nomor=${encodeURIComponent(pengajuan.nomorBiz)}`);
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `*Permohonan perpanjangan RW3BIZ diterima*\n\n` +
        `Usaha: *${pengajuan.namaUsaha}*\n` +
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
    const kontak = usahaKontak(usaha);
    if (!kontak) return;
    const cekNomor = usaha.nomorInduk ?? usaha.nomorBiz;
    const statusUrl = siteUrl(`/rw3biz/status?nomor=${encodeURIComponent(cekNomor)}`);
    const kwUrl = siteUrl(`/api/public/rw3biz/kwitansi/${opsi.pembayaranId}?nomor=${encodeURIComponent(cekNomor)}`);
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `*Setoran RW3BIZ dicatat*\n\n` +
        `Usaha: *${usaha.namaUsaha}*\n` +
        `Jumlah: *${formatRp(opsi.jumlah)}*\n` +
        `Periode: *${opsi.periode}*\n` +
        `Tanggal: *${formatTanggalId(opsi.tanggal)}*\n` +
        `Kwitansi: *${opsi.nomorKwitansi}*\n\n` +
        `Unduh kwitansi:\n${kwUrl}\n\n` +
        `Semua kwitansi juga ada di kartu anggota:\n${statusUrl}\n\n` +
        `Terima kasih sudah menjadi bagian dari RW3BIZ.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:setoran:${opsi.pembayaranId}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
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

export function notifyRw3bizKeberatanDiajukan(
  usaha: Pick<Rw3bizUsaha, "id" | "namaUsaha" | "nomorInduk" | "nomorBiz" | "pjNomorWhatsapp" | "pjNama">,
  keberatanId: number,
): void {
  notifyWaSafe(async () => {
    const kontak = usahaKontak(usaha);
    if (!kontak) return;
    const cekNomor = usaha.nomorInduk ?? usaha.nomorBiz;
    const statusUrl = siteUrl(`/rw3biz/status?nomor=${encodeURIComponent(cekNomor)}`);
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `*Permintaan ubah sumbangsih RW3BIZ diterima*\n\n` +
        `Usaha: *${usaha.namaUsaha}*\n` +
        `Status: *menunggu tanggapan pengurus RW*\n\n` +
        `Pantau hasilnya di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:keberatan:ajukan:${keberatanId}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "rw3biz_keberatan",
        referenceId: keberatanId,
      },
    );
  });
}

export function notifyRw3bizKeberatanDitanggapi(
  usaha: Pick<Rw3bizUsaha, "id" | "namaUsaha" | "nomorInduk" | "nomorBiz" | "pjNomorWhatsapp" | "pjNama">,
  opsi: { keberatanId: number; status: "diterima" | "ditolak"; tanggapan: string },
): void {
  notifyWaSafe(async () => {
    const kontak = usahaKontak(usaha);
    if (!kontak) return;
    const cekNomor = usaha.nomorInduk ?? usaha.nomorBiz;
    const statusUrl = siteUrl(`/rw3biz/status?nomor=${encodeURIComponent(cekNomor)}`);
    const hasil = opsi.status === "diterima" ? "diterima" : "belum dapat diterima";
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `*Hasil perubahan sumbangsih RW3BIZ*\n\n` +
        `Usaha: *${usaha.namaUsaha}*\n` +
        `Keputusan: *${hasil}*\n` +
        `Tanggapan: ${opsi.tanggapan.trim()}\n\n` +
        `Detail di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:keberatan:hasil:${opsi.keberatanId}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "rw3biz_keberatan",
        referenceId: opsi.keberatanId,
      },
    );
  });
}

export function notifyRw3bizPelanggaranTerbukti(
  usaha: Pick<Rw3bizUsaha, "id" | "namaUsaha" | "nomorInduk" | "nomorBiz" | "pjNomorWhatsapp" | "pjNama">,
  opsi: {
    pelanggaranId: number;
    nomorAduan: string;
    jenisLabel: string;
    tingkatLabel: string;
    tanggalKejadian: string;
  },
): void {
  notifyWaSafe(async () => {
    const kontak = usahaKontak(usaha);
    if (!kontak) return;
    const cekNomor = usaha.nomorInduk ?? usaha.nomorBiz;
    const statusUrl = siteUrl(`/rw3biz/status?nomor=${encodeURIComponent(cekNomor)}`);
    await sendWaIfConfigured(
      kontak.nomorWa,
      `${salam(kontak.nama)}\n\n` +
        `*Pemberitahuan pelanggaran RW3BIZ*\n\n` +
        `Usaha: *${usaha.namaUsaha}*\n` +
        `Nomor: *${opsi.nomorAduan}*\n` +
        `Jenis: *${opsi.jenisLabel}* (${opsi.tingkatLabel})\n` +
        `Tanggal kejadian: *${formatTanggalId(opsi.tanggalKejadian)}*\n\n` +
        `Penanganan dilanjutkan melalui teguran resmi RW 03 (bukan denda).\n` +
        `Detail di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:pelanggaran:terbukti:${opsi.pelanggaranId}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
        referenceType: "rw3biz_pelanggaran",
        referenceId: opsi.pelanggaranId,
      },
    );
  });
}

/** WA ke pelapor aduan usaha (modul RW3BIZ pelanggaran), bukan modul Aduan Warga. */
export function notifyRw3bizAduanUsahaDiterima(opts: {
  pelaporWa: string;
  pelaporNama: string;
  nomorAduan: string;
  pelanggaranId: number;
  namaUsaha: string;
}): void {
  notifyWaSafe(async () => {
    if (!opts.pelaporWa?.trim()) return;
    await sendWaIfConfigured(
      opts.pelaporWa,
      `${salam(opts.pelaporNama)}\n\n` +
        `*Aduan usaha diterima*\n\n` +
        `Nomor aduan: *${opts.nomorAduan}*\n` +
        `Usaha yang diadukan: *${opts.namaUsaha}*\n\n` +
        `Tim RW akan menindaklanjuti. Terima kasih atas kepeduliannya.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `rw3biz:aduan:diterima:${opts.pelanggaranId}:${normalizeStarSenderPhone(opts.pelaporWa)}`,
        referenceType: "rw3biz_pelanggaran",
        referenceId: opts.pelanggaranId,
      },
    );
  });
}

async function notifyRw3bizHabisReminder(
  usaha: typeof rw3bizUsaha.$inferSelect,
  kind: "h7" | "h1" | "expired",
): Promise<void> {
  const kontak = usahaKontak(usaha);
  if (!kontak) return;
  const berlaku = formatTanggalId(usaha.tanggalHabis);
  const perpanjangUrl = siteUrl("/rw3biz/perpanjang");
  const nomor = usaha.nomorInduk ?? usaha.nomorBiz;

  let body: string;
  if (kind === "h7") {
    body =
      `${salam(kontak.nama)}\n\n` +
      `Pengingat: izin RW3BIZ *${usaha.namaUsaha}* (*${nomor}*) akan *berakhir dalam 7 hari* (${berlaku}).\n\n` +
      `Segera ajukan perpanjangan di:\n${perpanjangUrl}\n\n` +
      `— ${SENDER_LABEL}`;
  } else if (kind === "h1") {
    body =
      `${salam(kontak.nama)}\n\n` +
      `Penting: izin RW3BIZ *${usaha.namaUsaha}* (*${nomor}*) *besok berakhir* (${berlaku}).\n\n` +
      `Ajukan perpanjangan hari ini di:\n${perpanjangUrl}\n\n` +
      `— ${SENDER_LABEL}`;
  } else {
    body =
      `${salam(kontak.nama)}\n\n` +
      `Izin RW3BIZ *${usaha.namaUsaha}* (*${nomor}*) *berakhir hari ini* (${berlaku}).\n\n` +
      `Segera ajukan perpanjangan agar status tetap aktif:\n${perpanjangUrl}\n\n` +
      `— ${SENDER_LABEL}`;
  }

  await sendWaIfConfigured(kontak.nomorWa, body, {
    eventKey: `rw3biz:reminder:${kind}:usaha:${usaha.id}:${normalizeStarSenderPhone(kontak.nomorWa)}`,
    referenceType: "rw3biz_usaha",
    referenceId: usaha.id,
    dedup: true,
  });
}

export async function runRw3bizHabisReminders(): Promise<void> {
  if (!isStarSenderConfigured()) return;

  const offsets: { hari: number; kind: "h7" | "h1" | "expired" }[] = [
    { hari: 7, kind: "h7" },
    { hari: 1, kind: "h1" },
    { hari: 0, kind: "expired" },
  ];

  for (const { hari, kind } of offsets) {
    const target = new Date();
    target.setDate(target.getDate() + hari);
    const targetStr = target.toISOString().split("T")[0];
    const rows = await db
      .select()
      .from(rw3bizUsaha)
      .where(and(eq(rw3bizUsaha.status, "aktif"), eq(rw3bizUsaha.tanggalHabis, targetStr)));
    for (const row of rows) {
      await notifyRw3bizHabisReminder(row, kind);
    }
  }
}

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startRw3bizReminderScheduler(): void {
  const run = () => {
    void runRw3bizHabisReminders().catch((err) =>
      console.error("[wa-notify] scheduler RW3BIZ habis:", err),
    );
  };
  setTimeout(run, 90_000);
  setInterval(run, REMINDER_INTERVAL_MS);
}
