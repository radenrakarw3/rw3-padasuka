import { notifyWaSafe, sendWaIfConfigured } from "./wa-notify";
import {
  isStarSenderConfigured,
  isStarSenderDisabledFlag,
  normalizeStarSenderPhone,
  getStarSenderDeviceId,
  sendStarSenderMessage,
} from "./starsender";
import { storage } from "./storage";
import { pool } from "./db";
import type { Rw3bizPengajuan, Rw3bizOrang, WaBlast } from "@shared/schema";
import { getPjBlastRecipients, type Rw3bizBlastRecipient } from "./rw3biz";

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL?.trim() || "https://rw3padasukacimahi.org";
const SENDER_LABEL = "KPP RW 03 Padasuka";
const WA_SEND_GAP_MS = 1200;
const RW3BIZ_BLAST_KATEGORI = "rw3biz";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

/** Status koneksi StarSender untuk UI admin. */
export function getRw3bizBlastChannelStatus() {
  const configured = isStarSenderConfigured();
  const disabled = isStarSenderDisabledFlag();
  return {
    configured,
    disabled,
    deviceId: getStarSenderDeviceId() ?? null,
    ready: configured && !disabled,
    label: disabled
      ? "StarSender dimatikan (STARSENDER_DISABLED)"
      : configured
        ? "StarSender siap kirim"
        : "STARSENDER_API_KEY belum dikonfigurasi",
  };
}

export function personalizeRw3bizBlastMessage(
  template: string,
  r: Pick<Rw3bizBlastRecipient, "pjNama" | "namaUsaha" | "nomorBiz" | "rt">,
): string {
  return template
    .replaceAll("{{nama}}", r.pjNama || "Bapak/Ibu")
    .replaceAll("{{usaha}}", r.namaUsaha || "-")
    .replaceAll("{{nomor}}", r.nomorBiz || "-")
    .replaceAll("{{rt}}", String(r.rt ?? "-"));
}

export async function listRw3bizBlasts(): Promise<WaBlast[]> {
  const all = await storage.getAllWaBlast();
  return all.filter(
    (b) => b.kategoriFilter === RW3BIZ_BLAST_KATEGORI || b.kategoriFilter.startsWith("rw3biz"),
  );
}

export async function getRw3bizBlastDetail(blastId: number) {
  const blast = await storage.getWaBlastById(blastId);
  if (!blast) return null;
  if (blast.kategoriFilter !== RW3BIZ_BLAST_KATEGORI && !blast.kategoriFilter.startsWith("rw3biz")) {
    return null;
  }
  const recipients = await storage.getWaBlastRecipients(blastId);
  return { blast, recipients };
}

async function processRw3bizBlastQueue(blastId: number): Promise<void> {
  const current = await storage.getWaBlastById(blastId);
  await storage.updateWaBlastStatus(
    blastId,
    "berjalan",
    current?.jumlahPenerima ?? 0,
    current?.jumlahBerhasil ?? 0,
    { startedAt: current?.startedAt ?? new Date(), lastError: null },
  );

  let sentInSession = 0;
  while (true) {
    const next = await storage.getNextWaBlastRecipient(blastId);
    if (!next) break;

    await storage.updateWaBlastRecipient(next.id, {
      status: "sending",
      attemptCount: (next.attemptCount ?? 0) + 1,
      updatedAt: new Date(),
    });

    if (sentInSession > 0) await sleep(WA_SEND_GAP_MS);
    sentInSession++;

    if (!isStarSenderConfigured()) {
      await storage.updateWaBlastRecipient(next.id, {
        status: "failed",
        lastError: "StarSender tidak dikonfigurasi / dimatikan",
        updatedAt: new Date(),
      });
      continue;
    }

    const phone = normalizeStarSenderPhone(next.nomorWhatsapp);
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      await storage.updateWaBlastRecipient(next.id, {
        status: "skipped",
        lastError: "Nomor WhatsApp tidak valid",
        updatedAt: new Date(),
      });
      continue;
    }

    const result = await sendStarSenderMessage({ to: phone, body: next.pesanPersonal });
    if (result.ok) {
      await storage.updateWaBlastRecipient(next.id, {
        status: "sent",
        lastError: null,
        sentAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`[rw3biz-blast] terkirim blast #${blastId} → ${phone}`);
    } else {
      await storage.updateWaBlastRecipient(next.id, {
        status: "failed",
        lastError: result.error || result.message || "Gagal kirim StarSender",
        updatedAt: new Date(),
      });
      console.error(`[rw3biz-blast] gagal #${blastId} → ${phone}:`, result.error || result.message);
    }

    await storage.refreshWaBlastSummary(blastId, "berjalan");
  }

  const summary = await storage.refreshWaBlastSummary(blastId);
  const failed = summary?.jumlahGagal ?? 0;
  const sent = summary?.jumlahBerhasil ?? 0;
  const finalStatus =
    failed === 0 && sent > 0
      ? "selesai"
      : sent === 0 && failed > 0
        ? "gagal"
        : sent > 0 && failed > 0
          ? "sebagian_gagal"
          : "selesai";
  await storage.refreshWaBlastSummary(blastId, finalStatus);
}

const runningBlasts = new Set<number>();

function startBlastBackground(blastId: number) {
  if (runningBlasts.has(blastId)) return;
  runningBlasts.add(blastId);
  void processRw3bizBlastQueue(blastId)
    .catch(async (err) => {
      console.error(`[rw3biz-blast] gagal memproses #${blastId}:`, err);
      await storage.refreshWaBlastSummary(
        blastId,
        "gagal",
        err instanceof Error ? err.message : "Gagal memproses blast",
      );
    })
    .finally(() => {
      runningBlasts.delete(blastId);
    });
}

/**
 * Buat blast WA ke PJ usaha aktif lalu kirim via StarSender (antrian di background).
 */
export async function createRw3bizBlast(input: {
  pesan: string;
  rt?: number | null;
  usahaIds?: number[] | null;
}): Promise<WaBlast> {
  const pesan = input.pesan?.trim();
  if (!pesan || pesan.length < 10) {
    throw new Error("Pesan blast minimal 10 karakter");
  }
  if (pesan.length > 4000) {
    throw new Error("Pesan blast maksimal 4000 karakter");
  }

  let recipients = await getPjBlastRecipients({
    rt: input.rt != null ? Number(input.rt) : null,
  });

  if (input.usahaIds?.length) {
    const allow = new Set(input.usahaIds);
    recipients = recipients.filter((r) => allow.has(r.usahaId));
  }

  const seenPhone = new Set<string>();
  const unique: Rw3bizBlastRecipient[] = [];
  for (const r of recipients) {
    const phone = normalizeStarSenderPhone(r.pjNomorWhatsapp);
    if (!phone || seenPhone.has(phone)) continue;
    seenPhone.add(phone);
    unique.push(r);
  }

  if (unique.length === 0) {
    throw new Error("Tidak ada penerima WA (PJ usaha aktif dengan nomor valid)");
  }

  if (!isStarSenderConfigured()) {
    throw new Error(
      isStarSenderDisabledFlag()
        ? "StarSender dimatikan (STARSENDER_DISABLED). Nyalakan dulu sebelum blast."
        : "STARSENDER_API_KEY belum dikonfigurasi di server.",
    );
  }

  const kategoriFilter =
    input.rt != null && Number.isFinite(Number(input.rt))
      ? `rw3biz:rt:${Number(input.rt)}`
      : RW3BIZ_BLAST_KATEGORI;

  const blast = await storage.createWaBlastWithRecipients(
    {
      pesan,
      kategoriFilter,
      filterRt: input.rt != null && Number.isFinite(Number(input.rt)) ? Number(input.rt) : null,
    },
    unique.map((r) => ({
      recipientType: "rw3biz_pj",
      recipientId: r.usahaId,
      nama: `${r.pjNama} · ${r.namaUsaha}`,
      nomorWhatsapp: normalizeStarSenderPhone(r.pjNomorWhatsapp),
      rt: r.rt,
      pesanPersonal: personalizeRw3bizBlastMessage(pesan, r),
      status: "pending",
    })),
  );

  startBlastBackground(blast.id);
  return blast;
}

export async function retryRw3bizBlast(blastId: number): Promise<WaBlast> {
  const detail = await getRw3bizBlastDetail(blastId);
  if (!detail) throw new Error("Blast tidak ditemukan");
  if (!isStarSenderConfigured()) {
    throw new Error("StarSender belum siap — cek STARSENDER_API_KEY");
  }

  for (const r of detail.recipients) {
    if (r.status === "failed" || r.status === "skipped") {
      await storage.updateWaBlastRecipient(r.id, {
        status: "retry",
        lastError: null,
        updatedAt: new Date(),
      });
    }
  }
  await storage.resetWaBlastRetryableRecipients(blastId);
  await storage.refreshWaBlastSummary(blastId, "berjalan", null);
  startBlastBackground(blastId);
  const updated = await storage.getWaBlastById(blastId);
  if (!updated) throw new Error("Blast tidak ditemukan");
  return updated;
}

/** Daftar penerima (alias). */
export async function getRw3bizPjRecipients(
  opts?: { rt?: number | null },
): Promise<Rw3bizBlastRecipient[]> {
  return getPjBlastRecipients(opts);
}

/** Pastikan tabel wa_blast ada. */
export async function ensureRw3bizBlastTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wa_blast (
      id serial PRIMARY KEY,
      pesan text NOT NULL,
      kategori_filter text NOT NULL DEFAULT 'semua',
      filter_rt integer,
      jumlah_penerima integer NOT NULL DEFAULT 0,
      jumlah_berhasil integer NOT NULL DEFAULT 0,
      jumlah_pending integer NOT NULL DEFAULT 0,
      jumlah_gagal integer NOT NULL DEFAULT 0,
      jumlah_dilewati integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'pending',
      last_error text,
      started_at timestamp,
      finished_at timestamp,
      created_at timestamp DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS wa_blast_recipient (
      id serial PRIMARY KEY,
      blast_id integer NOT NULL REFERENCES wa_blast(id),
      recipient_type text NOT NULL DEFAULT 'warga',
      recipient_id integer,
      nama text NOT NULL,
      nomor_whatsapp text NOT NULL,
      rt integer,
      pesan_personal text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      attempt_count integer NOT NULL DEFAULT 0,
      last_error text,
      sent_at timestamp,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
  `);
}
