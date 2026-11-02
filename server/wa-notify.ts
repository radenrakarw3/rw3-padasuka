import { db, pool } from "./db";
import { waNotifikasiLog } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import {
  isStarSenderConfigured,
  isStarSenderDisabledFlag,
  getStarSenderDeviceId,
  sendStarSenderMessage,
  normalizeStarSenderPhone,
} from "./starsender";
import { storage } from "./storage";
import { HARI_BATAS_PERPANJANG } from "./visitrw3-surat";
import { isNomorHpValid, looksLikeNik } from "@shared/kontak";
import { KONTRIBUSI_TINGGAL_PER_BULAN } from "@shared/visitrw3-kontribusi";
import type { Visitrw3Penghuni, Visitrw3Pengajuan, PemilikKost, Usaha } from "@shared/schema";

const RP_TINGGAL = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(KONTRIBUSI_TINGGAL_PER_BULAN);

const PUBLIC_SITE_URL =
  process.env.PUBLIC_SITE_URL?.trim() || "https://rw3padasukacimahi.org";

const SENDER_LABEL = "KPP RW 03 Padasuka";

const WA_SEND_GAP_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function logWaStartupStatus(): void {
  if (isStarSenderConfigured()) {
    const device = getStarSenderDeviceId();
    console.log(
      `[wa-notify] StarSender aktif${device != null ? ` (device ${device})` : ""} — notifikasi otomatis ke warga enabled`,
    );
  } else if (isStarSenderDisabledFlag()) {
    console.log("[wa-notify] StarSender DINONAKTIFKAN (STARSENDER_DISABLED) — tidak ada WA yang dikirim");
  } else {
    console.log("[wa-notify] STARSENDER_API_KEY belum diset — notifikasi WA dilewati");
  }
}

function siteUrl(path: string): string {
  const base = PUBLIC_SITE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
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

function salam(nama?: string): string {
  return nama?.trim() ? `Assalamu'alaikum, ${nama.trim()}.` : "Assalamu'alaikum.";
}

type WaRecipient = { to: string; nama?: string };

export function notifyWaSafe(task: () => void | Promise<void>): void {
  void Promise.resolve()
    .then(task)
    .catch((err) => console.error("[wa-notify]", err));
}

export async function ensureWaNotifikasiSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wa_notifikasi_log (
      id serial PRIMARY KEY,
      event_key text NOT NULL,
      nomor_whatsapp text NOT NULL,
      reference_type text,
      reference_id integer,
      status text NOT NULL,
      error_message text,
      sent_at timestamp DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS wa_notifikasi_log_event_phone_idx
      ON wa_notifikasi_log (event_key, nomor_whatsapp);
  `);
}

async function claimEventKey(
  eventKey: string,
  phone: string,
  referenceType?: string,
  referenceId?: number,
): Promise<boolean> {
  const normalized = normalizeStarSenderPhone(phone);
  if (!normalized || !isNomorHpValid(normalized) || looksLikeNik(phone)) return false;

  try {
    await db.insert(waNotifikasiLog).values({
      eventKey,
      nomorWhatsapp: normalized,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      status: "pending",
    });
    return true;
  } catch (err: any) {
    if (err?.code === "23505") {
      const [existing] = await db
        .select({ status: waNotifikasiLog.status })
        .from(waNotifikasiLog)
        .where(
          and(eq(waNotifikasiLog.eventKey, eventKey), eq(waNotifikasiLog.nomorWhatsapp, normalized)),
        )
        .limit(1);
      if (existing?.status === "failed") {
        await db
          .update(waNotifikasiLog)
          .set({ status: "pending", errorMessage: null, sentAt: new Date() })
          .where(
            and(eq(waNotifikasiLog.eventKey, eventKey), eq(waNotifikasiLog.nomorWhatsapp, normalized)),
          );
        return true;
      }
      return false;
    }
    throw err;
  }
}

async function finalizeLog(
  eventKey: string,
  phone: string,
  status: "sent" | "failed" | "skipped",
  errorMessage?: string,
): Promise<void> {
  const normalized = normalizeStarSenderPhone(phone);
  await db
    .update(waNotifikasiLog)
    .set({ status, errorMessage: errorMessage ?? null, sentAt: new Date() })
    .where(and(eq(waNotifikasiLog.eventKey, eventKey), eq(waNotifikasiLog.nomorWhatsapp, normalized)));
}

export type SendWaResult =
  | { status: "sent"; phone: string; eventKey: string }
  | { status: "skipped"; reason: "invalid_phone" | "starsender_off" | "dedup"; phone?: string; eventKey?: string }
  | { status: "failed"; phone: string; eventKey: string; error: string };

/** Kirim WA dan kembalikan status terstruktur (untuk aksi admin 1-per-1). */
export async function sendWaWithResult(
  to: string,
  body: string,
  opts?: {
    eventKey?: string;
    referenceType?: string;
    referenceId?: number;
    dedup?: boolean;
  },
): Promise<SendWaResult> {
  const normalized = normalizeStarSenderPhone(to);
  if (!normalized || normalized.replace(/\D/g, "").length < 9) {
    if (opts?.eventKey) {
      console.warn(`[wa-notify] nomor tidak valid, dilewati: ${opts.eventKey} → ${to}`);
    }
    return { status: "skipped", reason: "invalid_phone" };
  }

  if (!isStarSenderConfigured()) {
    if (opts?.eventKey) {
      console.log(`[wa-notify] skipped (StarSender off): ${opts.eventKey} → ${normalized}`);
    }
    return { status: "skipped", reason: "starsender_off", phone: normalized, eventKey: opts?.eventKey };
  }

  const eventKey = opts?.eventKey ?? `adhoc:${Date.now()}:${normalized}`;
  const useDedup = opts?.dedup ?? Boolean(opts?.eventKey && !eventKey.startsWith("adhoc:"));

  if (useDedup) {
    const claimed = await claimEventKey(eventKey, normalized, opts?.referenceType, opts?.referenceId);
    if (!claimed) {
      console.log(`[wa-notify] sudah terkirim, dilewati: ${eventKey}`);
      return { status: "skipped", reason: "dedup", phone: normalized, eventKey };
    }
  }

  const result = await sendStarSenderMessage({ to: normalized, body });

  if (useDedup) {
    await finalizeLog(
      eventKey,
      normalized,
      result.ok ? "sent" : "failed",
      result.ok ? undefined : result.error || result.message,
    );
  }

  if (result.ok) {
    console.log(`[wa-notify] terkirim: ${eventKey} → ${normalized}`);
    return { status: "sent", phone: normalized, eventKey };
  }

  const error = result.error || result.message || "Gagal mengirim WhatsApp";
  console.error(`[wa-notify] gagal kirim ${eventKey}:`, error);
  return { status: "failed", phone: normalized, eventKey, error };
}

export async function sendWaIfConfigured(
  to: string,
  body: string,
  opts?: {
    eventKey?: string;
    referenceType?: string;
    referenceId?: number;
    dedup?: boolean;
  },
): Promise<void> {
  await sendWaWithResult(to, body, opts);
}

async function sendToRecipients(
  recipients: WaRecipient[],
  buildBody: (nama?: string) => string,
  opts: {
    eventKeyPrefix: string;
    referenceType?: string;
    referenceId?: number;
    dedup?: boolean;
  },
): Promise<void> {
  const seen = new Set<string>();
  let sentCount = 0;
  for (const r of recipients) {
    if (!r.to?.trim()) continue;
    const phone = normalizeStarSenderPhone(r.to);
    if (!phone || phone.replace(/\D/g, "").length < 9 || seen.has(phone)) continue;
    if (sentCount > 0) await sleep(WA_SEND_GAP_MS);
    seen.add(phone);
    sentCount++;
    await sendWaIfConfigured(phone, buildBody(r.nama), {
      eventKey: `${opts.eventKeyPrefix}:${phone}`,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
      dedup: opts.dedup,
    });
  }
}

function dewasaPenghuniRecipients(penghuni: Visitrw3Penghuni[]): WaRecipient[] {
  return penghuni
    .filter((p) => !p.isAnak && p.nomorWhatsapp?.trim())
    .map((p) => ({ to: p.nomorWhatsapp!, nama: p.namaLengkap }));
}

// --- Visit RW3 ---

export function notifyVisitrw3PengajuanBaru(
  pengajuan: Visitrw3Pengajuan,
  penghuni: Visitrw3Penghuni[],
): void {
  notifyWaSafe(async () => {
    const recipients = dewasaPenghuniRecipients(penghuni);
    if (!recipients.length) return;

    const statusUrl = siteUrl("/visitrw3/status");
    await sendToRecipients(
      recipients,
      (nama) =>
        `${salam(nama)}\n\n` +
        `Data Visit RW3 Anda (*${pengajuan.nomorVisitrw3}*) sudah kami terima dan sedang *menunggu verifikasi* pengurus RW.\n\n` +
        `Kontribusi periode ini: *${RP_TINGGAL}* (1 bulan).\n` +
        `Pantau status di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKeyPrefix: `visitrw3:submitted:${pengajuan.id}`,
        referenceType: "visitrw3_pengajuan",
        referenceId: pengajuan.id,
      },
    );
  });
}

export function notifyVisitrw3Perpanjang(
  pengajuan: Visitrw3Pengajuan,
  nomorLama: string,
  nomorWa: string,
  nama?: string,
): void {
  notifyWaSafe(async () => {
    if (!nomorWa?.trim()) return;
    const statusUrl = siteUrl("/visitrw3/status");
    await sendWaIfConfigured(
      nomorWa,
      `${salam(nama)}\n\n` +
        `Permohonan *perpanjangan* izin tinggal Visit RW3 sudah kami terima.\n\n` +
        `Nomor lama: *${nomorLama}*\n` +
        `Nomor antrian baru: *${pengajuan.nomorVisitrw3}*\n` +
        `Status: *menunggu verifikasi*\n` +
        `Tagihan perpanjang: *${RP_TINGGAL}* (1 bulan)\n\n` +
        `Pantau perkembangan di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `visitrw3:perpanjang:${pengajuan.id}:${normalizeStarSenderPhone(nomorWa)}`,
        referenceType: "visitrw3_pengajuan",
        referenceId: pengajuan.id,
      },
    );
  });
}

export function notifyVisitrw3Disetujui(
  pengajuan: Visitrw3Pengajuan,
  penghuni: Visitrw3Penghuni[],
  _kost: PemilikKost | null,
): void {
  notifyWaSafe(async () => {
    const recipients = dewasaPenghuniRecipients(penghuni);

    const berlaku = pengajuan.tanggalBerlakuSampai
      ? formatTanggalId(pengajuan.tanggalBerlakuSampai)
      : "-";
    const statusUrl = siteUrl(`/visitrw3/status?nomor=${encodeURIComponent(pengajuan.nomorVisitrw3)}`);
    const tipeLabel = pengajuan.tipe === "perpanjang" ? "Perpanjangan" : "Izin tinggal";
    const batasPerpanjang = pengajuan.tanggalBerlakuSampai
      ? formatTanggalId(
          new Date(Date.parse(`${pengajuan.tanggalBerlakuSampai}T00:00:00Z`) - HARI_BATAS_PERPANJANG * 86_400_000)
            .toISOString()
            .slice(0, 10),
        )
      : "-";
    const bayar = pengajuan.tanggalBayar ? formatTanggalId(pengajuan.tanggalBayar) : null;
    const nominal =
      typeof pengajuan.estimasiKontribusi === "number" && pengajuan.estimasiKontribusi > 0
        ? new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(pengajuan.estimasiKontribusi)
        : RP_TINGGAL;

    await sendToRecipients(
      recipients,
      (nama) =>
        `${salam(nama)}\n\n` +
        `*${tipeLabel} Visit RW3 AKTIF*\n\n` +
        `Nomor VRW3: *${pengajuan.nomorVisitrw3}*\n` +
        `Berlaku sampai: *${berlaku}*\n` +
        `Kontribusi periode ini: *${nominal}*${bayar ? ` (diterima ${bayar})` : ""}\n` +
        `Urus perizinan tinggal lagi paling lambat: *${batasPerpanjang}*\n\n` +
        `Surat Izin Tinggal Sementara sudah terbit. Lihat & unduh di:\n${statusUrl}\n` +
        `Surat asli bertanda tangan Ketua RW dapat diambil di sekretariat RW 03.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKeyPrefix: `visitrw3:approved:${pengajuan.id}`,
        referenceType: "visitrw3_pengajuan",
        referenceId: pengajuan.id,
      },
    );
  });
}

export function notifyVisitrw3Ditolak(
  pengajuan: Visitrw3Pengajuan,
  penghuni: Visitrw3Penghuni[],
  alasanTolak: string,
): void {
  notifyWaSafe(async () => {
    const recipients = dewasaPenghuniRecipients(penghuni);
    if (!recipients.length) return;

    const statusUrl = siteUrl("/visitrw3/status");
    const formulirUrl = siteUrl("/visitrw3/formulir");
    await sendToRecipients(
      recipients,
      (nama) =>
        `${salam(nama)}\n\n` +
        `Mohon maaf, pengajuan Visit RW3 *${pengajuan.nomorVisitrw3}* belum dapat kami setujui.\n\n` +
        `Alasan: ${alasanTolak.trim()}\n\n` +
        `Anda dapat mengisi ulang formulir atau menghubungi pengurus RW.\n` +
        `Formulir: ${formulirUrl}\n` +
        `Status: ${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKeyPrefix: `visitrw3:rejected:${pengajuan.id}`,
        referenceType: "visitrw3_pengajuan",
        referenceId: pengajuan.id,
      },
    );
  });
}

/** @deprecated Alur pemilik properti dihapus. */
export function notifyVisitrw3PropertiDidaftar(_properti: PemilikKost): void {}

/** @deprecated Alur pemilik properti dihapus. */
export function notifyVisitrw3PropertiDisetujui(_properti: PemilikKost): void {}

// --- Pendataan usaha ---

export function notifyUsahaDidaftar(row: Usaha): void {
  notifyWaSafe(async () => {
    if (!row.nomorWaPemilik?.trim()) return;

    await sendWaIfConfigured(
      row.nomorWaPemilik,
      `${salam(row.namaPemilik)}\n\n` +
        `*Pendaftaran usaha diterima*\n\n` +
        `Usaha: *${row.namaUsaha}*\n` +
        `Status: *menunggu survey* lapangan pengurus RW\n` +
        `RT ${String(row.rt).padStart(2, "0")} · ${row.jenisUsaha}\n\n` +
        `Tim RW akan menghubungi Anda untuk survey. Simpan pesan ini sebagai bukti pendaftaran.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `usaha:submitted:${row.id}:${normalizeStarSenderPhone(row.nomorWaPemilik)}`,
        referenceType: "usaha",
        referenceId: row.id,
      },
    );
  });
}

export function notifyUsahaSurveySelesai(row: Usaha): void {
  notifyWaSafe(async () => {
    if (!row.nomorWaPemilik?.trim()) return;

    await sendWaIfConfigured(
      row.nomorWaPemilik,
      `${salam(row.namaPemilik)}\n\n` +
        `*Survey usaha selesai*\n\n` +
        `Usaha: *${row.namaUsaha}*\n` +
        `Status: *menunggu verifikasi* pengurus RW\n\n` +
        `Hasil keputusan (disetujui / ditolak) akan dikirim ke nomor ini.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `usaha:survey:${row.id}:${normalizeStarSenderPhone(row.nomorWaPemilik)}`,
        referenceType: "usaha",
        referenceId: row.id,
      },
    );
  });
}

export function notifyUsahaDisetujui(
  row: Usaha,
  stiker: { nomorStiker: string; tanggalTerbit: string; tanggalExpired: string },
): void {
  notifyWaSafe(async () => {
    if (!row.nomorWaPemilik?.trim()) return;
    const berlaku = formatTanggalId(stiker.tanggalExpired);

    await sendWaIfConfigured(
      row.nomorWaPemilik,
      `${salam(row.namaPemilik)}\n\n` +
        `*Usaha disetujui!*\n\n` +
        `Nama usaha: *${row.namaUsaha}*\n` +
        `Nomor stiker: *${stiker.nomorStiker}*\n` +
        `Berlaku sampai: *${berlaku}*\n\n` +
        `Stiker wajib dipasang di lokasi usaha. Terima kasih atas kerja samanya.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `usaha:approved:${row.id}:${normalizeStarSenderPhone(row.nomorWaPemilik)}`,
        referenceType: "usaha",
        referenceId: row.id,
      },
    );
  });
}

export function notifyUsahaDitolak(row: Usaha, alasan: string): void {
  notifyWaSafe(async () => {
    if (!row.nomorWaPemilik?.trim()) return;

    await sendWaIfConfigured(
      row.nomorWaPemilik,
      `${salam(row.namaPemilik)}\n\n` +
        `Mohon maaf, pendaftaran usaha *${row.namaUsaha}* belum dapat kami setujui.\n\n` +
        `Alasan: ${alasan.trim()}\n\n` +
        `Silakan hubungi pengurus RW jika ada pertanyaan.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `usaha:rejected:${row.id}:${normalizeStarSenderPhone(row.nomorWaPemilik)}`,
        referenceType: "usaha",
        referenceId: row.id,
      },
    );
  });
}

export function notifyUsahaStikerPerpanjang(
  row: Usaha,
  stiker: { nomorStiker: string; tanggalExpired: string },
): void {
  notifyWaSafe(async () => {
    if (!row.nomorWaPemilik?.trim()) return;
    const berlaku = formatTanggalId(stiker.tanggalExpired);

    await sendWaIfConfigured(
      row.nomorWaPemilik,
      `${salam(row.namaPemilik)}\n\n` +
        `Stiker usaha *${row.namaUsaha}* berhasil *diperpanjang*.\n\n` +
        `Nomor stiker baru: *${stiker.nomorStiker}*\n` +
        `Berlaku sampai: *${berlaku}*\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `usaha:stiker:${stiker.nomorStiker}:${normalizeStarSenderPhone(row.nomorWaPemilik)}`,
        referenceType: "usaha",
        referenceId: row.id,
      },
    );
  });
}

// --- Scheduler kontrak Visit RW3 ---

type KontrakReminderRow = Awaited<ReturnType<typeof storage.getWargaSinggahKontrakPadaTanggal>>[number];

async function notifyKontrakReminder(
  row: KontrakReminderRow,
  kind: "h7" | "h1" | "expired",
): Promise<void> {
  const berlaku = formatTanggalId(row.tanggalHabisKontrak);
  const perpanjangUrl = siteUrl("/visitrw3/perpanjang");
  const nomor = row.nomorVisitrw3 ?? "-";

  let bodyPenghuni: string;
  if (kind === "h7") {
    bodyPenghuni =
      `${salam(row.namaLengkap)}\n\n` +
      `*Tagihan & pengingat perizinan tinggal*\n\n` +
      `Izin Visit RW3 (*${nomor}*) berakhir dalam *7 hari* (${berlaku}).\n\n` +
      `Siapkan kontribusi *${RP_TINGGAL}*, lalu urus perpanjangan di:\n${perpanjangUrl}\n` +
      `atau ambil formulir ke pengurus RW.\n\n` +
      `— ${SENDER_LABEL}`;
  } else if (kind === "h1") {
    bodyPenghuni =
      `${salam(row.namaLengkap)}\n\n` +
      `Penting: izin tinggal Visit RW3 (*${nomor}*) *besok berakhir* (${berlaku}).\n\n` +
      `Segera urus perizinan tinggal lagi + kontribusi *${RP_TINGGAL}*:\n${perpanjangUrl}\n\n` +
      `— ${SENDER_LABEL}`;
  } else {
    bodyPenghuni =
      `${salam(row.namaLengkap)}\n\n` +
      `Izin tinggal Visit RW3 (*${nomor}*) *berakhir hari ini* (${berlaku}).\n\n` +
      `Segera perpanjang agar status tetap aktif (kontribusi *${RP_TINGGAL}*):\n${perpanjangUrl}\n\n` +
      `— ${SENDER_LABEL}`;
  }

  const eventPrefix = `visitrw3:reminder:${kind}:ws:${row.id}`;

  if (row.nomorWhatsapp?.trim()) {
    await sendWaIfConfigured(row.nomorWhatsapp, bodyPenghuni, {
      eventKey: `${eventPrefix}:penghuni:${normalizeStarSenderPhone(row.nomorWhatsapp)}`,
      referenceType: "warga_singgah",
      referenceId: row.id,
      dedup: true,
    });
  }

  if (row.nomorWaPemilik?.trim()) {
    const bodyPemilik =
      `${salam(row.namaPemilik || undefined)}\n\n` +
      (kind === "h7"
        ? `Pengingat: kontrak penghuni *${row.namaLengkap}* (Visit RW3 *${nomor}*) akan berakhir dalam 7 hari (${berlaku}).\n\n`
        : kind === "h1"
          ? `Penting: kontrak penghuni *${row.namaLengkap}* (Visit RW3 *${nomor}*) besok berakhir (${berlaku}).\n\n`
          : `Kontrak penghuni *${row.namaLengkap}* (Visit RW3 *${nomor}*) berakhir hari ini (${berlaku}).\n\n`) +
      `Mohon informasikan agar segera perpanjang di:\n${perpanjangUrl}\n\n` +
      `— ${SENDER_LABEL}`;
    await sendWaIfConfigured(row.nomorWaPemilik, bodyPemilik, {
      eventKey: `${eventPrefix}:pemilik:${normalizeStarSenderPhone(row.nomorWaPemilik)}`,
      referenceType: "warga_singgah",
      referenceId: row.id,
      dedup: true,
    });
  }
}

/** Perpanjangan kontrak warga singgah oleh admin (bukan alur form publik). */
export function notifyVisitrw3KontrakDiperpanjangAdmin(
  ws: {
    id: number;
    namaLengkap: string;
    nomorWhatsapp?: string | null;
    nomorVisitrw3?: string | null;
    tanggalHabisKontrak: string;
  },
): void {
  notifyWaSafe(async () => {
    if (!ws.nomorWhatsapp?.trim()) return;
    const berlaku = formatTanggalId(ws.tanggalHabisKontrak);
    const nomor = ws.nomorVisitrw3 ?? "-";
    const statusUrl = siteUrl("/visitrw3/status");
    await sendWaIfConfigured(
      ws.nomorWhatsapp,
      `${salam(ws.namaLengkap)}\n\n` +
        `*Izin tinggal Visit RW3 diperpanjang — AKTIF*\n\n` +
        `Nomor: *${nomor}*\n` +
        `Berlaku sampai: *${berlaku}*\n` +
        `Kontribusi periode ini: *${RP_TINGGAL}*\n\n` +
        `Cek status di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `visitrw3:admin-perpanjang:${ws.id}:${ws.tanggalHabisKontrak}:${normalizeStarSenderPhone(ws.nomorWhatsapp)}`,
        referenceType: "warga_singgah",
        referenceId: ws.id,
      },
    );
  });
}

export async function runVisitrw3KontrakReminders(): Promise<void> {
  if (!isStarSenderConfigured()) return;

  const offsets: { hari: number; kind: "h7" | "h1" | "expired" }[] = [
    { hari: 7, kind: "h7" },
    { hari: 1, kind: "h1" },
    { hari: 0, kind: "expired" },
  ];

  for (const { hari, kind } of offsets) {
    const rows = await storage.getWargaSinggahKontrakPadaTanggal(hari);
    for (const row of rows) {
      await notifyKontrakReminder(row, kind);
    }
  }
}

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startVisitrw3ReminderScheduler(): void {
  const run = () => {
    void runVisitrw3KontrakReminders().catch((err) =>
      console.error("[wa-notify] scheduler kontrak:", err),
    );
  };

  setTimeout(run, 60_000);
  setInterval(run, REMINDER_INTERVAL_MS);
}
