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
import { formatLaporanRef } from "@shared/program-kerja";
import { formatKekeringanAntrian, formatKekeringanTiket } from "@shared/laporan-kekeringan";
import {
  formatLaporanJudulDisplay,
  formatRtLabel,
  isLaporanPelaporAnonim,
  parseLaporanPelaporMeta,
  sanitizeLaporanIsiInput,
  stripLaporanMetaPrefix,
} from "@shared/laporan-pelapor";
import { jenisLaporanMasalahLabel } from "@shared/laporan-public-form";
import type { Visitrw3Penghuni, Visitrw3Pengajuan, PemilikKost, Laporan, LaporanKekeringan, Usaha } from "@shared/schema";

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
  if (!normalized || normalized.replace(/\D/g, "").length < 9) return false;

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
  const normalized = normalizeStarSenderPhone(to);
  if (!normalized || normalized.replace(/\D/g, "").length < 9) {
    if (opts?.eventKey) {
      console.warn(`[wa-notify] nomor tidak valid, dilewati: ${opts.eventKey} → ${to}`);
    }
    return;
  }

  if (!isStarSenderConfigured()) {
    if (opts?.eventKey) {
      console.log(`[wa-notify] skipped (StarSender off): ${opts.eventKey} → ${normalized}`);
    }
    return;
  }

  const eventKey = opts?.eventKey ?? `adhoc:${Date.now()}:${normalized}`;
  const useDedup = opts?.dedup ?? Boolean(opts?.eventKey && !eventKey.startsWith("adhoc:"));

  if (useDedup) {
    const claimed = await claimEventKey(eventKey, normalized, opts?.referenceType, opts?.referenceId);
    if (!claimed) {
      console.log(`[wa-notify] sudah terkirim, dilewati: ${eventKey}`);
      return;
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
  } else {
    console.error(`[wa-notify] gagal kirim ${eventKey}:`, result.error || result.message);
  }
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
        `Pengajuan Visit RW3 Anda (*${pengajuan.nomorVisitrw3}*) sudah kami terima dan sedang *menunggu survey RT*.\n\n` +
        `Tim RW akan datang untuk verifikasi. Pantau perkembangan di:\n${statusUrl}\n\n` +
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
        `Permohonan *perpanjangan* Visit RW3 Anda sudah kami terima.\n\n` +
        `Nomor lama: *${nomorLama}*\n` +
        `Nomor antrian baru: *${pengajuan.nomorVisitrw3}*\n` +
        `Status: *menunggu survey RT*\n\n` +
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
    const statusUrl = siteUrl("/visitrw3/status");
    const tipeLabel = pengajuan.tipe === "perpanjang" ? "Perpanjangan" : "Pengajuan";

    await sendToRecipients(
      recipients,
      (nama) =>
        `${salam(nama)}\n\n` +
        `*${tipeLabel} Visit RW3 disetujui!*\n\n` +
        `Nomor: *${pengajuan.nomorVisitrw3}*\n` +
        `Berlaku sampai: *${berlaku}*\n\n` +
        `Terima kasih atas kedisiplinan Anda. Cek detail di:\n${statusUrl}\n\n` +
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
    await sendToRecipients(
      recipients,
      (nama) =>
        `${salam(nama)}\n\n` +
        `Mohon maaf, pengajuan Visit RW3 *${pengajuan.nomorVisitrw3}* belum dapat kami setujui.\n\n` +
        `Alasan: ${alasanTolak.trim()}\n\n` +
        `Jika ada pertanyaan, silakan hubungi pengurus RW atau cek status di:\n${statusUrl}\n\n` +
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

// --- Laporan masalah ---

const LAPORAN_STATUS_WA = ["diproses", "selesai", "ditolak"] as const;
type LaporanStatusWa = (typeof LAPORAN_STATUS_WA)[number];

function laporanJudulUntukWa(laporan: Laporan): string {
  return formatLaporanJudulDisplay(laporan.judul, "Laporan warga");
}

/** Nomor WA + nama pelapor dari warga terdaftar atau metadata kiosk. */
export async function resolveLaporanPelaporContact(
  laporan: Laporan,
): Promise<{ nomorWa: string | null; nama?: string }> {
  if (laporan.wargaId) {
    const w = await storage.getWargaById(laporan.wargaId);
    const wa = w?.nomorWhatsapp?.trim();
    if (wa) {
      const nama = w?.namaLengkap ? sanitizeLaporanIsiInput(w.namaLengkap) || w.namaLengkap : undefined;
      return { nomorWa: wa, nama };
    }
  }
  if (isLaporanPelaporAnonim(laporan.isi)) {
    return { nomorWa: null };
  }
  const meta = parseLaporanPelaporMeta(laporan.isi);
  if (meta.nomorWa?.trim()) {
    return { nomorWa: meta.nomorWa.trim(), nama: meta.nama };
  }
  return { nomorWa: null };
}

/** Notifikasi laporan baru ke Ketua RT wilayah terkait. */
export function notifyLaporanBaruKeKetuaRt(
  laporan: Laporan,
  nomorRt: number,
  opts: {
    anonim: boolean;
    namaPelapor?: string;
    nomorWaPelapor?: string;
    jenisLabel?: string;
    subJenisLabel?: string;
  },
): void {
  notifyWaSafe(async () => {
    const rt = await storage.getRtByNomor(nomorRt);
    const waKetua = rt?.nomorWhatsapp?.trim();
    if (!waKetua) return;

    const ref = formatLaporanRef(laporan.id);
    const jenis =
      opts.jenisLabel ??
      jenisLaporanMasalahLabel(laporan.jenisLaporan ?? "umum");
    const judul = laporanJudulUntukWa(laporan);
    const isiRingkas = stripLaporanMetaPrefix(laporan.isi).slice(0, 500);

    let body =
      `${salam(rt?.namaKetua)}\n\n` +
      `*Laporan masalah baru* untuk ${formatRtLabel(nomorRt)}.\n\n` +
      `Ref: *${ref}*\n` +
      `Jenis: ${jenis}`;

    if (opts.subJenisLabel) {
      body += `\nSub-jenis: ${opts.subJenisLabel}`;
    }

    body += `\nJudul: ${judul}\n`;

    if (opts.anonim) {
      body += `Pelapor: *Anonim*\n`;
    } else {
      body += `Pelapor: ${opts.namaPelapor?.trim() || "—"}\n`;
      if (opts.nomorWaPelapor?.trim()) {
        body += `WA pelapor: ${opts.nomorWaPelapor.trim()}\n`;
      }
    }

    body +=
      `\nIsi:\n${isiRingkas}\n\n` +
      `Tindaklanjuti via Blusukan RW atau panel admin.\n\n` +
      `— ${SENDER_LABEL}`;

    await sendWaIfConfigured(waKetua, body, {
      eventKey: `laporan:new:ketua:${laporan.id}:${nomorRt}`,
      referenceType: "laporan",
      referenceId: laporan.id,
    });
  });
}

/** Kirim WA status laporan — cari nomor otomatis (admin & Blusukan RW). */
export function notifyLaporanStatusForRecord(laporan: Laporan, status: string): void {
  if (!LAPORAN_STATUS_WA.includes(status as LaporanStatusWa)) return;
  notifyWaSafe(async () => {
    const { nomorWa, nama } = await resolveLaporanPelaporContact(laporan);
    if (!nomorWa) return;
    await deliverLaporanStatusWa(laporan, nomorWa, status as LaporanStatusWa, nama);
  });
}

async function deliverLaporanStatusWa(
  laporan: Laporan,
  nomorWa: string,
  status: LaporanStatusWa,
  namaPelapor?: string,
): Promise<void> {
  if (!nomorWa?.trim()) return;
  const ref = formatLaporanRef(laporan.id);
  const statusUrl = siteUrl("/lapor/status");
  const tanggapan = laporan.tanggapanAdmin?.trim();
  const judul = laporanJudulUntukWa(laporan);

  let pesanStatus: string;
  if (status === "diproses") {
    pesanStatus =
      `Laporan *${ref}* sedang *ditangani* oleh pengurus RW.\n\n` + `Judul: ${judul}`;
  } else if (status === "selesai") {
    pesanStatus =
      `Kabar baik — laporan *${ref}* sudah *selesai* ditindaklanjuti.\n\n` +
      `Judul: ${judul}` +
      (tanggapan ? `\n\nTanggapan RW: ${tanggapan}` : "") +
      `\n\nTerima kasih atas laporan Anda. Suara warga sangat berarti bagi kami.`;
  } else {
    pesanStatus =
      `Mohon maaf, laporan *${ref}* tidak dapat kami lanjutkan.\n\n` +
      `Judul: ${judul}` +
      (tanggapan ? `\n\nKeterangan: ${tanggapan}` : "");
  }

  await sendWaIfConfigured(
    nomorWa,
    `${salam(namaPelapor)}\n\n${pesanStatus}\n\nCek detail di:\n${statusUrl}\n(masukkan nomor *${ref}*)\n\n— ${SENDER_LABEL}`,
    {
      eventKey: `laporan:${status}:${laporan.id}:${normalizeStarSenderPhone(nomorWa)}`,
      referenceType: "laporan",
      referenceId: laporan.id,
    },
  );
}

export function notifyLaporanDiterima(laporan: Laporan, nomorWa: string, namaPelapor?: string): void {
  notifyWaSafe(async () => {
    if (!nomorWa?.trim()) return;
    const ref = formatLaporanRef(laporan.id);
    const statusUrl = siteUrl("/lapor/status");

    await sendWaIfConfigured(
      nomorWa,
      `${salam(namaPelapor)}\n\n` +
        `Laporan Anda (*${ref}*) sudah kami terima dan sedang *ditinjau* oleh pengurus RW.\n\n` +
        `Judul: ${laporanJudulUntukWa(laporan)}\n\n` +
        `Kami akan segera menindaklanjuti. Cek status di:\n${statusUrl}\n` +
        `(masukkan nomor *${ref}*)\n\n` +
        `Terima kasih sudah peduli lingkungan RW.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `laporan:submitted:${laporan.id}:${normalizeStarSenderPhone(nomorWa)}`,
        referenceType: "laporan",
        referenceId: laporan.id,
      },
    );
  });
}

export function notifyLaporanStatus(
  laporan: Laporan,
  nomorWa: string,
  status: LaporanStatusWa,
  namaPelapor?: string,
): void {
  notifyWaSafe(async () => {
    await deliverLaporanStatusWa(laporan, nomorWa, status, namaPelapor);
  });
}

// --- Laporan kekeringan ---

export function notifyKekeringanDiterima(row: LaporanKekeringan): void {
  notifyWaSafe(async () => {
    if (!row.nomorWa?.trim()) return;
    const ref = row.nomorAntrian ?? formatKekeringanAntrian(row.id);
    const statusUrl = siteUrl("/lapor/kekeringan/status");

    await sendWaIfConfigured(
      row.nomorWa,
      `${salam(row.namaPelapor)}\n\n` +
        `Laporan kekeringan air (*${ref}*) sudah kami terima.\n\n` +
        `Status: *menunggu survey RW*\n` +
        `RT ${String(row.nomorRt).padStart(2, "0")} · ${row.jumlahPenghuni} penghuni\n\n` +
        `Tim akan datang untuk verifikasi. Cek status di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `kekeringan:submitted:${row.id}:${normalizeStarSenderPhone(row.nomorWa)}`,
        referenceType: "laporan_kekeringan",
        referenceId: row.id,
      },
    );
  });
}

export function notifyKekeringanTiketKeluar(row: LaporanKekeringan): void {
  notifyWaSafe(async () => {
    if (!row.nomorWa?.trim()) return;
    const tiket = row.nomorTiket ?? formatKekeringanTiket(row.id);
    const statusUrl = siteUrl("/lapor/kekeringan/status");

    await sendWaIfConfigured(
      row.nomorWa,
      `${salam(row.namaPelapor)}\n\n` +
        `Survey kekeringan air untuk antrian *${row.nomorAntrian}* sudah selesai.\n\n` +
        `Tiket distribusi: *${tiket}*\n` +
        `Simpan nomor tiket ini untuk pengambilan bantuan air.\n\n` +
        `Cek status di:\n${statusUrl}\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `kekeringan:tiket:${row.id}:${normalizeStarSenderPhone(row.nomorWa)}`,
        referenceType: "laporan_kekeringan",
        referenceId: row.id,
      },
    );
  });
}

export function notifyKekeringanSelesai(row: LaporanKekeringan): void {
  notifyWaSafe(async () => {
    if (!row.nomorWa?.trim()) return;
    const tiket = row.nomorTiket ?? formatKekeringanTiket(row.id);

    await sendWaIfConfigured(
      row.nomorWa,
      `${salam(row.namaPelapor)}\n\n` +
        `Distribusi bantuan air untuk tiket *${tiket}* sudah *selesai*.\n\n` +
        `Terima kasih atas kesabaran Anda. Semoga kebutuhan air keluarga terpenuhi.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `kekeringan:selesai:${row.id}:${normalizeStarSenderPhone(row.nomorWa)}`,
        referenceType: "laporan_kekeringan",
        referenceId: row.id,
      },
    );
  });
}

export function notifyKekeringanDitolak(row: LaporanKekeringan, alasan: string): void {
  notifyWaSafe(async () => {
    if (!row.nomorWa?.trim()) return;
    const ref = row.nomorAntrian ?? formatKekeringanAntrian(row.id);

    await sendWaIfConfigured(
      row.nomorWa,
      `${salam(row.namaPelapor)}\n\n` +
        `Mohon maaf, laporan kekeringan *${ref}* tidak dapat kami lanjutkan.\n\n` +
        `Alasan: ${alasan.trim()}\n\n` +
        `Silakan hubungi pengurus RW jika ada pertanyaan.\n\n` +
        `— ${SENDER_LABEL}`,
      {
        eventKey: `kekeringan:rejected:${row.id}:${normalizeStarSenderPhone(row.nomorWa)}`,
        referenceType: "laporan_kekeringan",
        referenceId: row.id,
      },
    );
  });
}

// --- Pendataan usaha ---

export function notifyUsahaDidaftar(row: Usaha): void {
  notifyWaSafe(async () => {
    if (!row.nomorWaPemilik?.trim()) return;

    await sendWaIfConfigured(
      row.nomorWaPemilik,
      `${salam(row.namaPemilik)}\n\n` +
        `Pendaftaran usaha *${row.namaUsaha}* sudah kami terima.\n\n` +
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
      `Pengingat: izin Visit RW3 (*${nomor}*) akan *berakhir dalam 7 hari* (${berlaku}).\n\n` +
      `Segera ajukan perpanjangan di:\n${perpanjangUrl}\n\n` +
      `— ${SENDER_LABEL}`;
  } else if (kind === "h1") {
    bodyPenghuni =
      `${salam(row.namaLengkap)}\n\n` +
      `Penting: izin Visit RW3 (*${nomor}*) *besok berakhir* (${berlaku}).\n\n` +
      `Ajukan perpanjangan hari ini di:\n${perpanjangUrl}\n\n` +
      `— ${SENDER_LABEL}`;
  } else {
    bodyPenghuni =
      `${salam(row.namaLengkap)}\n\n` +
      `Izin Visit RW3 (*${nomor}*) *berakhir hari ini* (${berlaku}).\n\n` +
      `Segera ajukan perpanjangan agar status tetap aktif:\n${perpanjangUrl}\n\n` +
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
