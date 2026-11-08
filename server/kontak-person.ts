/**
 * Kontak person publik — nomor pengurus hanya dikirim lewat StarSender,
 * tidak pernah diekspos di API/HTML publik.
 */
import { z } from "zod";
import { isNomorHpValid, looksLikeNik, normalizeNomorHp } from "@shared/kontak";
import {
  KEPERLUAN_KONTAK_INFO,
  isKeperluanKontak,
  type KeperluanKontak,
} from "@shared/kontak-person";
import { isStarSenderConfigured } from "./starsender";
import { sendWaWithResult } from "./wa-notify";
import { WilayahError } from "./wilayah-auth";

type KontakPengurus = { jabatan: string; nama: string; wa: string };

/** Nomor pribadi pengurus — hanya dipakai di server. */
const KONTAK_PENGURUS: Record<Exclude<KeperluanKontak, "darurat">, KontakPengurus[]> = {
  rt_1: [{ jabatan: "Ketua RT 01", nama: "Dadan", wa: "089674688157" }],
  rt_2: [{ jabatan: "Ketua RT 02", nama: "Jajang", wa: "081910038787" }],
  rt_3: [{ jabatan: "Ketua RT 03", nama: "Iyep", wa: "085860605992" }],
  rt_4: [{ jabatan: "Ketua RT 04", nama: "EEM", wa: "083854136870" }],
  pelayanan_rw: [
    { jabatan: "Sekretaris RW 03", nama: "Pak Iwan", wa: "082129674194" },
    { jabatan: "Bendahara RW 03", nama: "Bu Tini", wa: "089635339625" },
  ],
  danru_linmas: [{ jabatan: "Danru Linmas RW 03", nama: "Danru Linmas", wa: "081321887841" }],
};

const skemaMinta = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(80, "Nama terlalu panjang"),
  nomorWa: z.string().min(9, "Nomor WhatsApp tidak valid"),
  keperluan: z.string(),
});

function bangunPesan(nama: string, keperluan: Exclude<KeperluanKontak, "darurat">): string {
  const info = KEPERLUAN_KONTAK_INFO[keperluan];
  const daftar = KONTAK_PENGURUS[keperluan];
  const baris = daftar
    .map((k) => `• ${k.jabatan} — ${k.nama}\n  WhatsApp: ${k.wa}`)
    .join("\n\n");

  return [
    `Assalamu'alaikum, ${nama}.`,
    "",
    `Berikut kontak pengurus RW 03 sesuai keperluan Anda (${info.label}):`,
    "",
    baris,
    "",
    "Silakan hubungi langsung lewat WhatsApp.",
    "Pesan ini dikirim otomatis oleh KPP RW 03 Padasuka untuk menjaga privasi nomor pengurus.",
  ].join("\n");
}

export async function mintaKontakPerson(body: unknown): Promise<{ ok: true; keperluan: string }> {
  const parsed = skemaMinta.safeParse(body);
  if (!parsed.success) {
    throw new WilayahError(400, parsed.error.issues[0]?.message || "Data tidak valid");
  }

  const { nama, nomorWa, keperluan: keperluanMentah } = parsed.data;
  if (!isKeperluanKontak(keperluanMentah) || keperluanMentah === "darurat") {
    throw new WilayahError(400, "Keperluan tidak valid");
  }

  if (looksLikeNik(nomorWa)) {
    throw new WilayahError(400, "Nomor WhatsApp tidak valid (terdeteksi seperti NIK)");
  }

  const wa = normalizeNomorHp(nomorWa);
  if (!wa || !isNomorHpValid(wa)) {
    throw new WilayahError(400, "Nomor WhatsApp tidak valid");
  }

  if (!isStarSenderConfigured()) {
    throw new WilayahError(
      503,
      "Layanan kirim WhatsApp sedang tidak aktif. Coba lagi nanti atau datang ke sekretariat RW 03.",
    );
  }

  const pesan = bangunPesan(nama, keperluanMentah);
  const hasil = await sendWaWithResult(wa, pesan, {
    eventKey: `kontak-person:${keperluanMentah}:${wa}:${Math.floor(Date.now() / 60_000)}`,
    referenceType: "kontak_person",
    dedup: true,
  });

  if (hasil.status === "sent" || hasil.status === "skipped") {
    // skipped dedup = sudah dikirim dalam menit yang sama — anggap sukses agar warga tidak bingung
    if (hasil.status === "skipped" && hasil.reason !== "dedup") {
      if (hasil.reason === "starsender_off") {
        throw new WilayahError(503, "Layanan kirim WhatsApp sedang tidak aktif. Coba lagi nanti.");
      }
      throw new WilayahError(400, "Nomor WhatsApp tidak valid");
    }
    return { ok: true, keperluan: keperluanMentah };
  }

  throw new WilayahError(502, hasil.error || "Gagal mengirim WhatsApp. Coba lagi beberapa saat.");
}
