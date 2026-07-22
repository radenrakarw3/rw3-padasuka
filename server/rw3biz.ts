import { z } from "zod";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db, pool } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  rw3bizUsaha,
  rw3bizPengajuan,
  rw3bizOrang,
  type Rw3bizPengajuan,
  type Rw3bizOrang,
} from "@shared/schema";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { hitungTanggalBerlaku } from "@shared/visitrw3-kontribusi";
import { stringifyKategoriUsaha } from "@shared/visitrw3-kategori-usaha";
import {
  notifyRw3bizPengajuanBaru,
  notifyRw3bizPerpanjang,
  notifyRw3bizDisetujui,
  notifyRw3bizDitolak,
} from "./wa-notify-rw3biz";

export { hitungTanggalBerlaku } from "@shared/visitrw3-kontribusi";

const KTP_UPLOAD_DIR = path.join(process.cwd(), "uploads", "rw3biz-ktp");

/** Baca file KTP lokal RW3BIZ → data URL, atau teruskan jika sudah data:/base64. */
export function resolveFotoKtpData(fotoKtpPath?: string | null): string | null {
  const raw = fotoKtpPath?.trim();
  if (!raw) return null;
  if (raw.startsWith("data:image/")) return raw;
  let fileName = raw;
  if (raw.includes("/")) fileName = path.basename(raw);
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe) return null;
  const filePath = path.join(KTP_UPLOAD_DIR, safe);
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(safe).toLowerCase();
    const mime =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function getOrangKtpPayload(orangId: number): Promise<{
  dataUrl: string;
  mime: string;
  buffer: Buffer;
} | null> {
  const [row] = await db
    .select({ fotoKtpPath: rw3bizOrang.fotoKtpPath, fotoKtpData: rw3bizOrang.fotoKtpData })
    .from(rw3bizOrang)
    .where(eq(rw3bizOrang.id, orangId))
    .limit(1);
  if (!row) return null;

  const dataUrl = row.fotoKtpData?.trim() || resolveFotoKtpData(row.fotoKtpPath);
  if (!dataUrl?.startsWith("data:")) return null;

  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const header = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = /^data:([^;]+)/.exec(header)?.[1] || "image/jpeg";
  try {
    return { dataUrl, mime, buffer: Buffer.from(b64, "base64") };
  } catch {
    return null;
  }
}

export function isMissingRw3bizTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /does not exist|relation.*rw3biz|undefined_table/i.test(msg);
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const TERMIN_VALUES = [1, 3, 6, 12] as const;

export async function generateNomorBiz(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BIZ-${year}-`;
  for (let attempt = 0; attempt < 20; attempt++) {
    const seq = crypto.randomInt(0, 10000);
    const nomor = `${prefix}${String(seq).padStart(4, "0")}`;
    const [existing] = await db
      .select({ id: rw3bizPengajuan.id })
      .from(rw3bizPengajuan)
      .where(eq(rw3bizPengajuan.nomorBiz, nomor))
      .limit(1);
    const [existingUsaha] = await db
      .select({ id: rw3bizUsaha.id })
      .from(rw3bizUsaha)
      .where(eq(rw3bizUsaha.nomorBiz, nomor))
      .limit(1);
    if (!existing && !existingUsaha) return nomor;
  }
  throw new Error("Gagal membuat nomor RW3BIZ");
}

const orangInputSchema = z.object({
  namaLengkap: z.string().min(2),
  tanggalLahir: z.string().regex(DATE_REGEX),
  isAnak: z.boolean().default(false),
  isPenanggungJawab: z.boolean().default(false),
  nik: z.string().optional().nullable(),
  nomorWhatsapp: z.string().optional().nullable(),
  jenisKelamin: z.string().optional().nullable(),
  pekerjaan: z.string().optional().nullable(),
  namaTempatKerja: z.string().optional().nullable(),
  namaSekolah: z.string().optional().nullable(),
  punyaKendaraan: z.boolean().default(false),
  jenisKendaraan: z.string().optional().nullable(),
  platNomor: z.string().optional().nullable(),
  fotoKtpPath: z.string().optional().nullable(),
});

export const pengajuanBaruSchema = z.object({
  rt: z.number().int().refine((n) => (ACTIVE_RT_NUMBERS as readonly number[]).includes(n), "RT tidak valid"),
  alamat: z.string().min(5, "Alamat lengkap wajib diisi"),
  nomorLokasi: z.string().optional().nullable(),
  namaUsaha: z.string().min(2, "Nama usaha wajib diisi"),
  jenisTempatUsaha: z.enum(["lapak", "kiosk", "usaha_rumahan", "lainnya"]).optional().nullable(),
  jenisTempatUsahaLain: z.string().optional().nullable(),
  kategoriUsaha: z.array(z.string().min(1).max(120)).max(12).optional().nullable(),
  jamBuka: z.string().regex(TIME_REGEX, "Jam buka wajib diisi (format HH:MM)"),
  jamTutup: z.string().regex(TIME_REGEX, "Jam tutup wajib diisi (format HH:MM)"),
  alamatUsaha: z.string().optional().nullable(),
  pjSetujuNotifikasi: z.boolean().default(true),
  jumlahOrang: z.number().int().min(1).max(20),
  tanggalBayar: z.string().regex(DATE_REGEX),
  terminBulan: z.number().refine((n): n is (typeof TERMIN_VALUES)[number] => TERMIN_VALUES.includes(n as (typeof TERMIN_VALUES)[number]), "Termin tidak valid"),
  catatanPemohon: z.string().optional().nullable(),
  orang: z.array(orangInputSchema).min(1, "Minimal satu orang penanggung jawab"),
  setujuTataTertib: z.literal(true, { errorMap: () => ({ message: "Persetujuan tata tertib wajib" }) }),
});

export const perpanjangSchema = z.object({
  nomorBiz: z.string().min(8),
  tanggalBayar: z.string().regex(DATE_REGEX),
  terminBulan: z.number().refine((n): n is (typeof TERMIN_VALUES)[number] => TERMIN_VALUES.includes(n as (typeof TERMIN_VALUES)[number]), "Termin tidak valid"),
  catatanPemohon: z.string().optional().nullable(),
  setujuTataTertib: z.literal(true, { errorMap: () => ({ message: "Persetujuan tata tertib wajib" }) }),
});

type OrangInput = z.infer<typeof orangInputSchema>;

/** Tentukan penanggung jawab: flag isPenanggungJawab dulu, lalu dewasa pertama ber-WA. */
function pickPenanggungJawab(orang: OrangInput[]): OrangInput {
  const flagged = orang.find((o) => o.isPenanggungJawab && !o.isAnak);
  if (flagged) return flagged;
  const dewasaWa = orang.find((o) => !o.isAnak && o.nomorWhatsapp?.trim());
  if (dewasaWa) return dewasaWa;
  const dewasa = orang.find((o) => !o.isAnak);
  if (dewasa) return dewasa;
  return orang[0];
}

/** Nomor WA PJ untuk blast: dari PJ, atau dewasa pertama yang punya WA. */
function pickPjNomorWhatsapp(orang: OrangInput[], pj: OrangInput): string {
  if (pj.nomorWhatsapp?.trim()) return pj.nomorWhatsapp.trim();
  const dewasaWa = orang.find((o) => !o.isAnak && o.nomorWhatsapp?.trim());
  return dewasaWa?.nomorWhatsapp?.trim() ?? "";
}

export async function createPengajuanBaru(input: z.infer<typeof pengajuanBaruSchema>) {
  const parsed = pengajuanBaruSchema.parse(input);

  if (parsed.orang.length !== parsed.jumlahOrang) {
    throw new Error("Jumlah data orang tidak sesuai");
  }
  if (!parsed.jenisTempatUsaha) {
    throw new Error("Jenis tempat usaha wajib dipilih");
  }
  if (parsed.jenisTempatUsaha === "lainnya" && !parsed.jenisTempatUsahaLain?.trim()) {
    throw new Error("Jelaskan jenis tempat usaha lainnya");
  }

  const pj = pickPenanggungJawab(parsed.orang);
  const pjNomorWhatsapp = pickPjNomorWhatsapp(parsed.orang, pj);
  if (!pjNomorWhatsapp) {
    throw new Error("Minimal satu penanggung jawab dewasa dengan nomor WhatsApp wajib diisi");
  }

  const tanggalBerlakuSampai = hitungTanggalBerlaku(parsed.tanggalBayar, parsed.terminBulan);
  const nomorBiz = await generateNomorBiz();
  const alamat = parsed.alamat.trim();

  const pengajuan = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(rw3bizPengajuan)
      .values({
        nomorBiz,
        tipe: "pengajuan_baru",
        status: "menunggu_survey",
        rt: parsed.rt,
        alamat,
        nomorLokasi: parsed.nomorLokasi?.trim() || null,
        namaUsaha: parsed.namaUsaha.trim(),
        jenisTempatUsaha: parsed.jenisTempatUsaha || null,
        jenisTempatUsahaLain: parsed.jenisTempatUsahaLain?.trim() || null,
        kategoriUsaha: stringifyKategoriUsaha(parsed.kategoriUsaha ?? []),
        jamBuka: parsed.jamBuka,
        jamTutup: parsed.jamTutup,
        alamatUsaha: parsed.alamatUsaha?.trim() || alamat,
        pjNama: pj.namaLengkap,
        pjNik: pj.nik?.trim() || null,
        pjNomorWhatsapp,
        pjSetujuNotifikasi: parsed.pjSetujuNotifikasi,
        jumlahOrang: parsed.jumlahOrang,
        tanggalBayar: parsed.tanggalBayar,
        terminBulan: parsed.terminBulan,
        tanggalBerlakuSampai,
        catatanPemohon: parsed.catatanPemohon?.trim() || null,
        setujuTataTertib: true,
      })
      .returning();

    for (let i = 0; i < parsed.orang.length; i++) {
      const o = parsed.orang[i];
      const isPj = o === pj;
      const fotoKtpPath = o.isAnak ? null : o.fotoKtpPath || null;
      const fotoKtpData = o.isAnak ? null : resolveFotoKtpData(fotoKtpPath);
      await tx.insert(rw3bizOrang).values({
        pengajuanId: row.id,
        namaLengkap: o.namaLengkap,
        tanggalLahir: o.tanggalLahir,
        isAnak: o.isAnak,
        isPenanggungJawab: isPj,
        nik: o.isAnak ? null : o.nik?.trim() || null,
        nomorWhatsapp: o.nomorWhatsapp?.trim() || null,
        jenisKelamin: o.jenisKelamin?.trim() || null,
        pekerjaan: o.pekerjaan?.trim() || null,
        namaTempatKerja: o.namaTempatKerja?.trim() || null,
        namaSekolah: o.namaSekolah?.trim() || null,
        punyaKendaraan: o.punyaKendaraan,
        jenisKendaraan: o.jenisKendaraan?.trim() || null,
        platNomor: o.platNomor?.trim() || null,
        fotoKtpPath,
        fotoKtpData,
        urutan: i,
      });
    }

    return row;
  });

  const orang = await db
    .select()
    .from(rw3bizOrang)
    .where(eq(rw3bizOrang.pengajuanId, pengajuan.id))
    .orderBy(rw3bizOrang.urutan);
  notifyRw3bizPengajuanBaru(pengajuan, orang);
  return pengajuan;
}

export async function createPerpanjang(input: z.infer<typeof perpanjangSchema>) {
  const parsed = perpanjangSchema.parse(input);
  const nomor = parsed.nomorBiz.trim().toUpperCase();

  const [pending] = await db
    .select()
    .from(rw3bizPengajuan)
    .where(and(eq(rw3bizPengajuan.nomorBiz, nomor), eq(rw3bizPengajuan.status, "menunggu_survey")))
    .limit(1);
  if (pending) throw new Error("Masih ada pengajuan menunggu survey untuk nomor ini");

  const [usaha] = await db
    .select()
    .from(rw3bizUsaha)
    .where(eq(rw3bizUsaha.nomorBiz, nomor))
    .orderBy(desc(rw3bizUsaha.createdAt))
    .limit(1);
  if (!usaha) throw new Error("Nomor RW3BIZ tidak ditemukan atau belum disetujui");

  const tanggalBerlakuSampai = hitungTanggalBerlaku(parsed.tanggalBayar, parsed.terminBulan);
  const nomorBaru = await generateNomorBiz();

  const [pengajuan] = await db
    .insert(rw3bizPengajuan)
    .values({
      nomorBiz: nomorBaru,
      tipe: "perpanjang",
      status: "menunggu_survey",
      rt: usaha.rt,
      alamat: usaha.alamat,
      nomorLokasi: usaha.nomorLokasi,
      namaUsaha: usaha.namaUsaha,
      jenisTempatUsaha: usaha.jenisTempatUsaha,
      jenisTempatUsahaLain: usaha.jenisTempatUsahaLain,
      kategoriUsaha: usaha.kategoriUsaha,
      jamBuka: usaha.jamBuka,
      jamTutup: usaha.jamTutup,
      alamatUsaha: usaha.alamatUsaha,
      pjNama: usaha.pjNama,
      pjNik: usaha.pjNik,
      pjNomorWhatsapp: usaha.pjNomorWhatsapp,
      pjSetujuNotifikasi: usaha.pjSetujuNotifikasi,
      jumlahOrang: 1,
      tanggalBayar: parsed.tanggalBayar,
      terminBulan: parsed.terminBulan,
      tanggalBerlakuSampai,
      usahaId: usaha.id,
      catatanPemohon: parsed.catatanPemohon?.trim() || null,
      setujuTataTertib: true,
    })
    .returning();

  notifyRw3bizPerpanjang(pengajuan, nomor);
  return { pengajuan, nomorLama: nomor, nomorBaru };
}

export async function getStatusByNomor(nomorRaw: string) {
  const nomor = nomorRaw.trim().toUpperCase();
  const list = await db
    .select()
    .from(rw3bizPengajuan)
    .where(eq(rw3bizPengajuan.nomorBiz, nomor))
    .orderBy(desc(rw3bizPengajuan.createdAt));

  // Perpanjang membuat nomor baru; cari juga lewat usahaId → nomor lama.
  if (!list.length) {
    const [usaha] = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.nomorBiz, nomor)).limit(1);
    if (!usaha) return null;
    return { pengajuan: null as Rw3bizPengajuan | null, riwayat: [], usaha, orang: [] as Rw3bizOrang[] };
  }

  const latest = list[0];
  const orang = await db
    .select()
    .from(rw3bizOrang)
    .where(eq(rw3bizOrang.pengajuanId, latest.id))
    .orderBy(rw3bizOrang.urutan);

  let usaha = null;
  if (latest.usahaId) {
    [usaha] = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, latest.usahaId)).limit(1);
  } else {
    [usaha] = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.nomorBiz, nomor)).limit(1);
  }

  return { pengajuan: latest, riwayat: list, usaha: usaha ?? null, orang };
}

export async function listPengajuanAdmin(status?: string) {
  if (status && status !== "semua") {
    return db
      .select()
      .from(rw3bizPengajuan)
      .where(eq(rw3bizPengajuan.status, status))
      .orderBy(desc(rw3bizPengajuan.createdAt));
  }
  return db.select().from(rw3bizPengajuan).orderBy(desc(rw3bizPengajuan.createdAt));
}

export async function getPengajuanDetailAdmin(id: number) {
  const [pengajuan] = await db.select().from(rw3bizPengajuan).where(eq(rw3bizPengajuan.id, id));
  if (!pengajuan) return null;
  const orangRows = await db
    .select()
    .from(rw3bizOrang)
    .where(eq(rw3bizOrang.pengajuanId, id))
    .orderBy(rw3bizOrang.urutan);
  // Jangan kirim base64 KTP ke client — pakai endpoint /orang/:id/ktp
  const orang = orangRows.map(({ fotoKtpData, ...rest }) => ({
    ...rest,
    fotoKtpData: null as string | null,
    hasFotoKtp: Boolean(rest.fotoKtpPath || fotoKtpData),
  }));
  const usaha = pengajuan.usahaId
    ? (await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, pengajuan.usahaId)).limit(1))[0] ?? null
    : null;
  return { pengajuan, orang, usaha };
}

export async function approvePengajuan(id: number, adminUsername: string, catatanSurvey?: string | null) {
  const [pengajuan] = await db.select().from(rw3bizPengajuan).where(eq(rw3bizPengajuan.id, id));
  if (!pengajuan) throw new Error("Pengajuan tidak ditemukan");
  if (pengajuan.status !== "menunggu_survey") throw new Error("Pengajuan sudah diproses");

  const baseUpdate = {
    status: "disetujui" as const,
    catatanSurvey: catatanSurvey?.trim() || null,
    reviewedAt: new Date(),
    reviewedBy: adminUsername,
  };

  let usahaId = pengajuan.usahaId ?? null;

  if (pengajuan.tipe === "perpanjang" && pengajuan.usahaId) {
    // Perpanjang: update usaha yang sudah ada.
    await db
      .update(rw3bizUsaha)
      .set({
        status: "aktif",
        tanggalMulai: pengajuan.tanggalBayar,
        tanggalHabis: pengajuan.tanggalBerlakuSampai,
        terminBulan: pengajuan.terminBulan,
        nomorBiz: pengajuan.nomorBiz,
        pengajuanId: pengajuan.id,
      })
      .where(eq(rw3bizUsaha.id, pengajuan.usahaId));
    usahaId = pengajuan.usahaId;
  } else {
    // Pengajuan baru: buat usaha aktif.
    const [usaha] = await db
      .insert(rw3bizUsaha)
      .values({
        nomorBiz: pengajuan.nomorBiz,
        rt: pengajuan.rt,
        alamat: pengajuan.alamat,
        nomorLokasi: pengajuan.nomorLokasi,
        namaUsaha: pengajuan.namaUsaha,
        jenisTempatUsaha: pengajuan.jenisTempatUsaha,
        jenisTempatUsahaLain: pengajuan.jenisTempatUsahaLain,
        kategoriUsaha: pengajuan.kategoriUsaha,
        jamBuka: pengajuan.jamBuka,
        jamTutup: pengajuan.jamTutup,
        alamatUsaha: pengajuan.alamatUsaha,
        pjNama: pengajuan.pjNama,
        pjNik: pengajuan.pjNik,
        pjNomorWhatsapp: pengajuan.pjNomorWhatsapp,
        pjSetujuNotifikasi: pengajuan.pjSetujuNotifikasi,
        status: "aktif",
        tanggalMulai: pengajuan.tanggalBayar,
        tanggalHabis: pengajuan.tanggalBerlakuSampai,
        terminBulan: pengajuan.terminBulan,
        pengajuanId: pengajuan.id,
      })
      .returning();
    usahaId = usaha.id;
  }

  const [updated] = await db
    .update(rw3bizPengajuan)
    .set({ ...baseUpdate, usahaId })
    .where(eq(rw3bizPengajuan.id, id))
    .returning();

  notifyRw3bizDisetujui(updated);
  const [usaha] = usahaId
    ? await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, usahaId)).limit(1)
    : [null];
  return { pengajuan: updated, usaha: usaha ?? null };
}

export async function rejectPengajuan(id: number, adminUsername: string, alasanTolak: string) {
  const [pengajuan] = await db.select().from(rw3bizPengajuan).where(eq(rw3bizPengajuan.id, id));
  if (!pengajuan) throw new Error("Pengajuan tidak ditemukan");
  if (pengajuan.status !== "menunggu_survey") throw new Error("Pengajuan sudah diproses");
  const [updated] = await db
    .update(rw3bizPengajuan)
    .set({
      status: "ditolak",
      alasanTolak: alasanTolak.trim(),
      reviewedAt: new Date(),
      reviewedBy: adminUsername,
    })
    .where(eq(rw3bizPengajuan.id, id))
    .returning();
  if (updated) notifyRw3bizDitolak(updated, alasanTolak.trim());
  return updated;
}

export async function listUsahaAktif() {
  return db
    .select()
    .from(rw3bizUsaha)
    .where(eq(rw3bizUsaha.status, "aktif"))
    .orderBy(desc(rw3bizUsaha.createdAt));
}

export type Rw3bizBlastRecipient = {
  usahaId: number;
  nomorBiz: string;
  namaUsaha: string;
  pjNama: string;
  pjNomorWhatsapp: string;
  rt: number;
};

/** PJ usaha aktif yang setuju menerima notifikasi (sumber WA blast RW3BIZ). */
export async function getPjBlastRecipients(opts?: {
  rt?: number | null;
}): Promise<Rw3bizBlastRecipient[]> {
  const conditions = [eq(rw3bizUsaha.status, "aktif"), eq(rw3bizUsaha.pjSetujuNotifikasi, true)];
  if (opts?.rt != null && Number.isFinite(opts.rt)) {
    conditions.push(eq(rw3bizUsaha.rt, opts.rt));
  }
  const rows = await db
    .select({
      usahaId: rw3bizUsaha.id,
      nomorBiz: rw3bizUsaha.nomorBiz,
      namaUsaha: rw3bizUsaha.namaUsaha,
      pjNama: rw3bizUsaha.pjNama,
      pjNomorWhatsapp: rw3bizUsaha.pjNomorWhatsapp,
      rt: rw3bizUsaha.rt,
    })
    .from(rw3bizUsaha)
    .where(and(...conditions))
    .orderBy(rw3bizUsaha.rt, rw3bizUsaha.namaUsaha);
  return rows.filter((r) => r.pjNomorWhatsapp?.trim());
}

export async function ensureRw3bizSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rw3biz_usaha (
      id serial PRIMARY KEY,
      nomor_biz text NOT NULL UNIQUE,
      rt integer NOT NULL,
      alamat text NOT NULL,
      nomor_lokasi text,
      nama_usaha text NOT NULL,
      jenis_tempat_usaha text,
      jenis_tempat_usaha_lain text,
      kategori_usaha text,
      jam_buka text,
      jam_tutup text,
      alamat_usaha text,
      pj_nama text NOT NULL,
      pj_nik text,
      pj_nomor_whatsapp text NOT NULL,
      pj_setuju_notifikasi boolean NOT NULL DEFAULT true,
      status text NOT NULL DEFAULT 'aktif',
      tanggal_mulai text NOT NULL,
      tanggal_habis text NOT NULL,
      termin_bulan integer,
      pengajuan_id integer,
      created_at timestamp DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS rw3biz_pengajuan (
      id serial PRIMARY KEY,
      nomor_biz text NOT NULL UNIQUE,
      tipe text NOT NULL,
      status text NOT NULL DEFAULT 'menunggu_survey',
      rt integer NOT NULL,
      alamat text NOT NULL,
      nomor_lokasi text,
      nama_usaha text NOT NULL,
      jenis_tempat_usaha text,
      jenis_tempat_usaha_lain text,
      kategori_usaha text,
      jam_buka text,
      jam_tutup text,
      alamat_usaha text,
      pj_nama text NOT NULL,
      pj_nik text,
      pj_nomor_whatsapp text NOT NULL,
      pj_setuju_notifikasi boolean NOT NULL DEFAULT true,
      jumlah_orang integer NOT NULL,
      tanggal_bayar text NOT NULL,
      termin_bulan integer NOT NULL,
      tanggal_berlaku_sampai text NOT NULL,
      usaha_id integer REFERENCES rw3biz_usaha(id),
      catatan_pemohon text,
      catatan_survey text,
      alasan_tolak text,
      reviewed_at timestamp,
      reviewed_by text,
      setuju_tata_tertib boolean NOT NULL DEFAULT false,
      created_at timestamp DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS rw3biz_orang (
      id serial PRIMARY KEY,
      pengajuan_id integer NOT NULL REFERENCES rw3biz_pengajuan(id) ON DELETE CASCADE,
      nama_lengkap text NOT NULL,
      tanggal_lahir text NOT NULL,
      is_anak boolean NOT NULL DEFAULT false,
      is_penanggung_jawab boolean NOT NULL DEFAULT false,
      nik text,
      nomor_whatsapp text,
      jenis_kelamin text,
      pekerjaan text,
      nama_tempat_kerja text,
      nama_sekolah text,
      punya_kendaraan boolean NOT NULL DEFAULT false,
      jenis_kendaraan text,
      plat_nomor text,
      foto_ktp_path text,
      foto_ktp_data text,
      urutan integer NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS rw3biz_settings (
      id serial PRIMARY KEY,
      key text NOT NULL UNIQUE,
      value text NOT NULL,
      label text NOT NULL,
      keterangan text,
      updated_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS rw3biz_usaha_nomor_biz_idx ON rw3biz_usaha (nomor_biz);
    CREATE INDEX IF NOT EXISTS rw3biz_usaha_status_idx ON rw3biz_usaha (status);
    CREATE INDEX IF NOT EXISTS rw3biz_usaha_pj_wa_idx ON rw3biz_usaha (pj_nomor_whatsapp);
    CREATE INDEX IF NOT EXISTS rw3biz_pengajuan_nomor_biz_idx ON rw3biz_pengajuan (nomor_biz);
    CREATE INDEX IF NOT EXISTS rw3biz_pengajuan_status_idx ON rw3biz_pengajuan (status);
    CREATE INDEX IF NOT EXISTS rw3biz_pengajuan_pj_wa_idx ON rw3biz_pengajuan (pj_nomor_whatsapp);
    CREATE INDEX IF NOT EXISTS rw3biz_orang_pengajuan_idx ON rw3biz_orang (pengajuan_id);
  `);
}
