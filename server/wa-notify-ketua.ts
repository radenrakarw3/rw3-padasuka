/**
 * Notifikasi WhatsApp ke Ketua RW saat warga mengirim aduan / Visit RW3 / rating / RW3BIZ.
 */
import { notifyWaSafe, sendWaIfConfigured } from "./wa-notify";
import { normalizeStarSenderPhone } from "./starsender";

const SENDER_LABEL = "KPP RW 03 Padasuka";
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL?.trim() || "https://rw3padasukacimahi.org";

/** Nomor Ketua RW — bisa diganti via env KETUA_RW_WA. */
export const KETUA_RW_WA = process.env.KETUA_RW_WA?.trim() || "081321133823";

function siteUrl(path: string): string {
  const base = PUBLIC_SITE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function notifyKetuaRw(
  body: string,
  opts: { eventKey: string; referenceType?: string; referenceId?: number },
): void {
  notifyWaSafe(async () => {
    await sendWaIfConfigured(KETUA_RW_WA, body, {
      eventKey: opts.eventKey,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
      dedup: true,
    });
  });
}

export function notifyKetuaRwAduanBaru(opts: {
  id: number;
  nomor: string;
  kategori: string;
  judul: string;
  rtLokasi?: number | null;
  mode: string;
}): void {
  const rt = opts.rtLokasi ? `RT ${String(opts.rtLokasi).padStart(2, "0")}` : "RT belum dipilih";
  notifyKetuaRw(
    [
      "Assalamu'alaikum, Ketua RW 03.",
      "",
      "*Aduan warga baru masuk*",
      `Nomor: *${opts.nomor}*`,
      `Kategori: ${opts.kategori}`,
      `Judul: ${opts.judul}`,
      `Lokasi: ${rt}`,
      `Mode identitas: ${opts.mode}`,
      "",
      `Periksa di admin:\n${siteUrl(`/admin/aduan/${opts.id}`)}`,
      "",
      `— ${SENDER_LABEL}`,
    ].join("\n"),
    {
      eventKey: `ketua:aduan:${opts.id}:${normalizeStarSenderPhone(KETUA_RW_WA)}`,
      referenceType: "aduan",
      referenceId: opts.id,
    },
  );
}

export function notifyKetuaRwVisitrw3Baru(opts: {
  id: number;
  nomor: string;
  rt: number;
  tipe?: string;
}): void {
  const tipe = opts.tipe === "perpanjang" ? "Perpanjangan" : "Pengajuan baru";
  notifyKetuaRw(
    [
      "Assalamu'alaikum, Ketua RW 03.",
      "",
      `*Visit RW3 — ${tipe}*`,
      `Nomor: *${opts.nomor}*`,
      `RT: ${String(opts.rt).padStart(2, "0")}`,
      "",
      `Periksa antrian:\n${siteUrl("/admin/visitrw3/antrian")}`,
      "",
      `— ${SENDER_LABEL}`,
    ].join("\n"),
    {
      eventKey: `ketua:visitrw3:${opts.id}:${normalizeStarSenderPhone(KETUA_RW_WA)}`,
      referenceType: "visitrw3_pengajuan",
      referenceId: opts.id,
    },
  );
}

export function notifyKetuaRwRatingBaru(opts: {
  sasaranLabel: string;
  bintang: number;
  cuplikan: string;
}): void {
  const cuplikan = opts.cuplikan.length > 180 ? `${opts.cuplikan.slice(0, 177)}…` : opts.cuplikan;
  notifyKetuaRw(
    [
      "Assalamu'alaikum, Ketua RW 03.",
      "",
      "*Rating & masukan warga baru*",
      `Sasaran: ${opts.sasaranLabel}`,
      `Nilai: ${"★".repeat(opts.bintang)}${"☆".repeat(5 - opts.bintang)}`,
      "",
      cuplikan,
      "",
      `Baca di admin:\n${siteUrl("/admin/rating")}`,
      "",
      `— ${SENDER_LABEL}`,
    ].join("\n"),
    {
      eventKey: `ketua:rating:${Date.now()}:${normalizeStarSenderPhone(KETUA_RW_WA)}`,
      referenceType: "rating_masukan",
    },
  );
}

export function notifyKetuaRwRw3bizBaru(opts: {
  id: number;
  nomor: string;
  namaUsaha: string;
  rt: number;
  tipe?: string;
}): void {
  const tipe = opts.tipe === "perpanjang" ? "Perpanjangan" : "Pengajuan baru";
  notifyKetuaRw(
    [
      "Assalamu'alaikum, Ketua RW 03.",
      "",
      `*RW3BIZ — ${tipe}*`,
      `Usaha: *${opts.namaUsaha}*`,
      `Nomor: *${opts.nomor}*`,
      `RT: ${String(opts.rt).padStart(2, "0")}`,
      "",
      `Periksa antrian:\n${siteUrl("/admin/rw3biz/antrian")}`,
      "",
      `— ${SENDER_LABEL}`,
    ].join("\n"),
    {
      eventKey: `ketua:rw3biz:${opts.id}:${normalizeStarSenderPhone(KETUA_RW_WA)}`,
      referenceType: "rw3biz_pengajuan",
      referenceId: opts.id,
    },
  );
}
