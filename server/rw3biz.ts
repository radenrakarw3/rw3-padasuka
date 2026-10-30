import { z } from "zod";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  rw3bizUsaha,
  rw3bizPengajuan,
  rw3bizOrang,
  type Rw3bizPengajuan,
  type Rw3bizOrang,
  type Rw3bizUsaha,
} from "@shared/schema";
import { RW3BIZ_RT_NUMBERS } from "@shared/rt";
import { hariIniWib, hitungTanggalBerlaku } from "@shared/visitrw3-kontribusi";
import { stringifyKategoriUsaha } from "@shared/visitrw3-kategori-usaha";
import {
  notifyRw3bizPengajuanBaru,
  notifyRw3bizPerpanjang,
  notifyRw3bizDisetujui,
  notifyRw3bizDitolak,
} from "./wa-notify-rw3biz";
import { JENIS_TEMPAT_BIZ, parseSumbangsih, turunkanOperasionalMalam } from "@shared/rw3biz-kontribusi";
import { PERNYATAAN_VERSI } from "@shared/rw3biz-pernyataan";
import { tandaiRaziaSelesai } from "./rw3biz-razia";
import {
  buatTagihanTermin,
  cocokkanWargaRw3,
  dataUsahaDariBaris,
  dataUsahaSchema,
  hitungRincian,
  kolomDataUsaha,
  kolomKontribusi,
  kolomSumbangsih,
  koreksiSurveySchema,
  loadTarif,
  orangKontribusiSchema,
  orangUntukPengajuan,
  sumbangsihFinal,
  sumbangsihSchema,
  tentukanTahapTransisi,
  type DataUsaha,
  type KoreksiSurvey,
} from "./rw3biz-kontribusi";

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
}).merge(orangKontribusiSchema);

/** Pemohon cukup mengisi jenis tempat & jam; luas, sampah, kendaraan, dll. dapat dilengkapi Ketua RW saat menyetujui. */
const dataUsahaPengajuanSchema = dataUsahaSchema
  .omit({ jenisTempatUsaha: true, operasionalMalam: true })
  .partial({
    statusTempat: true,
    luasM2: true,
    hariOperasional: true,
    sampahKantongHari: true,
    pakaiBahuJalan: true,
    kendaraanMotor: true,
    kendaraanMobil: true,
    usahaBaru: true,
  })
  .extend({ operasionalMalam: dataUsahaSchema.shape.operasionalMalam.optional().nullable() });

const PERAN_PEMOHON = new Set(["pemilik", "penanggung_jawab"]);

const setujuPernyataanSchema = z.literal(true, {
  errorMap: () => ({ message: "Setujui seluruh poin Surat Pernyataan Sumbangsih terlebih dahulu" }),
});

const persetujuanPernyataan = () => ({ pernyataanVersi: PERNYATAAN_VERSI, pernyataanDisetujuiAt: new Date() });

export const pengajuanBaruSchema = dataUsahaPengajuanSchema.extend({
  rt: z.number().int().refine((n) => (RW3BIZ_RT_NUMBERS as readonly number[]).includes(n), "RT tidak valid (RT 01–07)"),
  alamat: z.string().min(5, "Alamat lengkap wajib diisi"),
  nomorLokasi: z.string().optional().nullable(),
  namaUsaha: z.string().min(2, "Nama usaha wajib diisi"),
  jenisTempatUsaha: z.enum(JENIS_TEMPAT_BIZ).optional().nullable(),
  jenisTempatUsahaLain: z.string().optional().nullable(),
  kategoriUsaha: z.array(z.string().min(1).max(120)).max(12).optional().nullable(),
  jamBuka: z.string().regex(TIME_REGEX, "Jam buka wajib diisi (format HH:MM)"),
  jamTutup: z.string().regex(TIME_REGEX, "Jam tutup wajib diisi (format HH:MM)"),
  alamatUsaha: z.string().optional().nullable(),
  pjSetujuNotifikasi: z.boolean().default(true),
  jumlahOrang: z.literal(1, { errorMap: () => ({ message: "Cukup data satu orang: pemilik atau penanggung jawab usaha" }) }),
  /** Perkiraan mulai berlaku; tanggal bayar sebenarnya dicatat admin saat menyetujui. */
  tanggalBayar: z.string().regex(DATE_REGEX).optional().default(() => hariIniWib()),
  terminBulan: z.number().refine((n): n is (typeof TERMIN_VALUES)[number] => TERMIN_VALUES.includes(n as (typeof TERMIN_VALUES)[number]), "Termin tidak valid"),
  catatanPemohon: z.string().optional().nullable(),
  orang: z.array(orangInputSchema).length(1, "Cukup data satu orang: pemilik atau penanggung jawab usaha"),
  sumbangsih: sumbangsihSchema,
  setujuTataTertib: z.literal(true, { errorMap: () => ({ message: "Persetujuan tata tertib wajib" }) }),
  setujuPernyataan: setujuPernyataanSchema,
});

export const perpanjangSchema = z.object({
  /** NIU-RW3-#### atau nomor BIZ terakhir. */
  nomorBiz: z.string().min(8),
  /** Verifikasi: harus sama dengan WA penanggung jawab terdaftar. */
  nomorWhatsapp: z.string().trim().min(8, "Isi nomor WhatsApp penanggung jawab"),
  tanggalBayar: z.string().regex(DATE_REGEX).optional().default(() => hariIniWib()),
  terminBulan: z.number().refine((n): n is (typeof TERMIN_VALUES)[number] => TERMIN_VALUES.includes(n as (typeof TERMIN_VALUES)[number]), "Termin tidak valid"),
  catatanPemohon: z.string().optional().nullable(),
  setujuTataTertib: z.literal(true, { errorMap: () => ({ message: "Persetujuan tata tertib wajib" }) }),
  /** Data usaha terbaru; kosong = sama dengan periode lalu. */
  dataUsaha: dataUsahaSchema.optional(),
  jamBuka: z.string().regex(TIME_REGEX).optional(),
  jamTutup: z.string().regex(TIME_REGEX).optional(),
  sumbangsih: sumbangsihSchema,
  setujuPernyataan: setujuPernyataanSchema,
});

function digitWa(nomor?: string | null): string {
  const d = String(nomor ?? "").replace(/\D/g, "");
  return d.startsWith("62") ? `0${d.slice(2)}` : d;
}

type OrangInput = z.infer<typeof orangInputSchema>;

function nilaiOrangBaru(
  o: OrangInput & { wargaId: number | null },
  pengajuanId: number,
  urutan: number,
  isPenanggungJawab: boolean,
): typeof rw3bizOrang.$inferInsert {
  const fotoKtpPath = o.isAnak ? null : o.fotoKtpPath || null;
  return {
    pengajuanId,
    namaLengkap: o.namaLengkap,
    tanggalLahir: o.tanggalLahir,
    isAnak: o.isAnak,
    isPenanggungJawab,
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
    fotoKtpData: o.isAnak ? null : resolveFotoKtpData(fotoKtpPath),
    urutan,
    peran: o.peran,
    asal: o.asal,
    domisili: o.domisili?.trim() || null,
    wargaId: o.wargaId,
  };
}

async function cocokkanOrangInput(orang: OrangInput[]) {
  const wargaCocok = await cocokkanWargaRw3(orang.map((o) => o.nik));
  return orang.map((o) => {
    const info = o.isAnak ? undefined : wargaCocok.get(String(o.nik ?? "").replace(/\D/g, ""));
    return { ...o, asal: info ? ("rw3" as const) : o.asal, wargaId: info?.wargaId ?? null };
  });
}

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

  const pemohon = parsed.orang[0];
  if (pemohon.isAnak || !PERAN_PEMOHON.has(pemohon.peran)) {
    throw new Error("Data yang diisi harus pemilik atau penanggung jawab usaha");
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

  const dataUsaha: DataUsaha = {
    ...parsed,
    jenisTempatUsaha: parsed.jenisTempatUsaha,
    statusTempat: parsed.statusTempat ?? "sewa",
    luasM2: parsed.luasM2 ?? 0,
    hariOperasional: parsed.hariOperasional ?? 7,
    sampahKantongHari: parsed.sampahKantongHari ?? 0,
    pakaiBahuJalan: parsed.pakaiBahuJalan ?? false,
    kendaraanMotor: parsed.kendaraanMotor ?? 0,
    kendaraanMobil: parsed.kendaraanMobil ?? 0,
    usahaBaru: parsed.usahaBaru ?? false,
    operasionalMalam: parsed.operasionalMalam ?? turunkanOperasionalMalam(parsed.jamBuka, parsed.jamTutup),
  };
  /** Kolom yang belum diisi pemohon tetap null sampai dilengkapi saat persetujuan. */
  const belumSurvey = parsed.statusTempat
    ? {}
    : { statusTempat: null, luasM2: null, hariOperasional: null, sampahKantongHari: null };
  const orangFinal = await cocokkanOrangInput(parsed.orang);
  const sumbangsih = sumbangsihFinal(parsed.sumbangsih, await loadTarif());

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
        ...persetujuanPernyataan(),
        ...kolomDataUsaha(dataUsaha),
        ...belumSurvey,
        ...kolomSumbangsih(sumbangsih),
      })
      .returning();

    for (let i = 0; i < orangFinal.length; i++) {
      await tx.insert(rw3bizOrang).values(nilaiOrangBaru(orangFinal[i], row.id, i, parsed.orang[i] === pj));
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

/** Data periode lalu untuk form perpanjang — hanya setelah WA penanggung jawab cocok. */
export async function dataUntukPerpanjang(input: unknown) {
  const { nomor, nomorWhatsapp } = z.object({ nomor: z.string().min(8), nomorWhatsapp: z.string().min(8) }).parse(input);
  const usaha = await cariUsahaByNomor(nomor);
  if (!usaha) throw new Error("Nomor induk / nomor RW3BIZ tidak ditemukan atau belum disetujui");
  if (digitWa(usaha.pjNomorWhatsapp) !== digitWa(nomorWhatsapp)) {
    throw new Error("Nomor WhatsApp tidak cocok dengan penanggung jawab usaha terdaftar");
  }
  return {
    nomorInduk: usaha.nomorInduk,
    nomorBiz: usaha.nomorBiz,
    namaUsaha: usaha.namaUsaha,
    rt: usaha.rt,
    alamat: usaha.alamatUsaha || usaha.alamat,
    tanggalHabis: usaha.tanggalHabis,
    terminBulan: usaha.terminBulan,
    jamBuka: usaha.jamBuka,
    jamTutup: usaha.jamTutup,
    pjNama: usaha.pjNama,
    kontribusiBulanan: usaha.kontribusiBulanan,
    sumbangsih: parseSumbangsih(usaha.sumbangsih),
    dataUsaha: dataUsahaDariBaris(usaha),
  };
}

/** Pembaruan izin hanya membawa pemilik / penanggung jawab; data pegawai tidak lagi dicatat. */
function pilihPjLama(rows: Rw3bizOrang[]): Rw3bizOrang | null {
  const dewasa = rows.filter((o) => !o.isAnak);
  return (
    dewasa.find((o) => o.isPenanggungJawab) ??
    dewasa.find((o) => o.peran && PERAN_PEMOHON.has(o.peran) && o.nomorWhatsapp?.trim()) ??
    dewasa.find((o) => o.nomorWhatsapp?.trim()) ??
    dewasa[0] ??
    null
  );
}

export async function createPerpanjang(input: z.infer<typeof perpanjangSchema>) {
  const parsed = perpanjangSchema.parse(input);

  const usaha = await cariUsahaByNomor(parsed.nomorBiz);
  if (!usaha) throw new Error("Nomor induk / nomor RW3BIZ tidak ditemukan atau belum disetujui");
  if (digitWa(usaha.pjNomorWhatsapp) !== digitWa(parsed.nomorWhatsapp)) {
    throw new Error("Nomor WhatsApp tidak cocok dengan penanggung jawab usaha terdaftar");
  }
  const nomor = usaha.nomorBiz;

  const [pending] = await db
    .select({ nomorBiz: rw3bizPengajuan.nomorBiz })
    .from(rw3bizPengajuan)
    .where(and(eq(rw3bizPengajuan.usahaId, usaha.id), eq(rw3bizPengajuan.status, "menunggu_survey")))
    .limit(1);
  if (pending) throw new Error(`Masih ada pengajuan ${pending.nomorBiz} yang menunggu persetujuan untuk usaha ini`);

  const tanggalBerlakuSampai = hitungTanggalBerlaku(parsed.tanggalBayar, parsed.terminBulan);
  const nomorBaru = await generateNomorBiz();
  const dataUsaha: DataUsaha = parsed.dataUsaha ?? dataUsahaDariBaris(usaha);
  const sumbangsih = sumbangsihFinal(parsed.sumbangsih, await loadTarif());

  const pjLama = pilihPjLama(await orangUntukPengajuan(usaha.pengajuanId));
  const pjWa = pjLama?.nomorWhatsapp?.trim() || usaha.pjNomorWhatsapp;
  const pj = pjLama
    ? (({ id: _id, pengajuanId: _p, ...salin }) => ({
        ...salin,
        isPenanggungJawab: true,
        peran: salin.peran && PERAN_PEMOHON.has(salin.peran) ? salin.peran : "pemilik",
      }))(pjLama)
    : null;

  const pengajuan = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(rw3bizPengajuan)
      .values({
        nomorBiz: nomorBaru,
        tipe: "perpanjang",
        status: "menunggu_survey",
        rt: usaha.rt,
        alamat: usaha.alamat,
        nomorLokasi: usaha.nomorLokasi,
        namaUsaha: usaha.namaUsaha,
        jenisTempatUsaha: parsed.dataUsaha?.jenisTempatUsaha ?? usaha.jenisTempatUsaha,
        jenisTempatUsahaLain: usaha.jenisTempatUsahaLain,
        kategoriUsaha: usaha.kategoriUsaha,
        jamBuka: parsed.jamBuka ?? usaha.jamBuka,
        jamTutup: parsed.jamTutup ?? usaha.jamTutup,
        alamatUsaha: usaha.alamatUsaha,
        pjNama: pj?.namaLengkap ?? usaha.pjNama,
        pjNik: pj?.nik ?? usaha.pjNik,
        pjNomorWhatsapp: pjWa,
        pjSetujuNotifikasi: usaha.pjSetujuNotifikasi,
        jumlahOrang: 1,
        tanggalBayar: parsed.tanggalBayar,
        terminBulan: parsed.terminBulan,
        tanggalBerlakuSampai,
        usahaId: usaha.id,
        catatanPemohon: parsed.catatanPemohon?.trim() || null,
        setujuTataTertib: true,
        ...persetujuanPernyataan(),
        ...kolomDataUsaha(dataUsaha),
        ...kolomSumbangsih(sumbangsih),
      })
      .returning();
    if (pj) await tx.insert(rw3bizOrang).values({ ...pj, pengajuanId: row.id, urutan: 0 });
    return row;
  });

  notifyRw3bizPerpanjang(pengajuan, nomor);
  return { pengajuan, nomorLama: nomor, nomorBaru, nomorInduk: usaha.nomorInduk };
}

const NIU_REGEX = /^NIU-RW3-\d+$/;

/** Nomor Induk Usaha berikutnya; panggil di dalam transaksi (dikunci advisory lock). */
async function nomorIndukBaru(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]): Promise<string> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('rw3biz_nomor_induk'))`);
  const hasil = await tx.execute<{ n: number }>(sql`
    SELECT COALESCE(MAX(substring(nomor_induk from '(\\d+)$')::int), 0) + 1 AS n
    FROM rw3biz_usaha WHERE nomor_induk ~ '^NIU-RW3-\\d+$'
  `);
  const n = Number(hasil.rows[0]?.n ?? 1);
  return `NIU-RW3-${String(n).padStart(4, "0")}`;
}

/** Usaha berdasarkan NIU (tetap) atau nomor BIZ (berganti tiap perpanjang). */
export async function cariUsahaByNomor(nomorRaw: string) {
  const nomor = nomorRaw.trim().toUpperCase();
  const kolom = NIU_REGEX.test(nomor) ? rw3bizUsaha.nomorInduk : rw3bizUsaha.nomorBiz;
  const [usaha] = await db.select().from(rw3bizUsaha).where(eq(kolom, nomor)).limit(1);
  if (usaha || NIU_REGEX.test(nomor)) return usaha ?? null;
  const [p] = await db
    .select({ usahaId: rw3bizPengajuan.usahaId })
    .from(rw3bizPengajuan)
    .where(eq(rw3bizPengajuan.nomorBiz, nomor))
    .limit(1);
  if (!p?.usahaId) return null;
  const [u] = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, p.usahaId)).limit(1);
  return u ?? null;
}

export async function getStatusByNomor(nomorRaw: string) {
  const nomor = nomorRaw.trim().toUpperCase();
  let usaha: Rw3bizUsaha | null = null;
  let dicari: Rw3bizPengajuan | null = null;
  if (NIU_REGEX.test(nomor)) {
    usaha = await cariUsahaByNomor(nomor);
    if (!usaha) return null;
  } else {
    [dicari] = await db.select().from(rw3bizPengajuan).where(eq(rw3bizPengajuan.nomorBiz, nomor)).limit(1);
    if (dicari?.usahaId) {
      [usaha] = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, dicari.usahaId)).limit(1);
    } else if (!dicari) {
      usaha = await cariUsahaByNomor(nomor);
      if (!usaha) return null;
    }
  }

  const riwayat = usaha
    ? await db
        .select()
        .from(rw3bizPengajuan)
        .where(eq(rw3bizPengajuan.usahaId, usaha.id))
        .orderBy(desc(rw3bizPengajuan.createdAt))
    : dicari
      ? [dicari]
      : [];
  // Cari pakai NIU → tampilkan pengajuan terbaru (bisa perpanjang yang masih menunggu).
  const pengajuan = dicari ?? riwayat[0] ?? null;
  const orangDari = pengajuan?.id ?? usaha?.pengajuanId;
  const orang = orangDari
    ? await db.select().from(rw3bizOrang).where(eq(rw3bizOrang.pengajuanId, orangDari)).orderBy(rw3bizOrang.urutan)
    : [];

  return { pengajuan, riwayat, usaha: usaha ?? null, orang };
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

export const approveSchema = z.object({
  catatanSurvey: z.string().optional().nullable(),
  koreksi: koreksiSurveySchema.optional(),
  /** Sumbangsih yang disepakati ulang saat menyetujui; kosong = sesuai isian pemohon. */
  sumbangsih: sumbangsihSchema.optional(),
  /** Tanggal uang kontribusi diterima; masa berlaku & tagihan dihitung ulang dari tanggal ini. */
  tanggalBayar: z.string().regex(DATE_REGEX, "Tanggal bayar tidak valid").optional().nullable(),
});

/** Terapkan verifikasi/koreksi ke pengajuan; kontribusi final = sumbangsih (atau rumus untuk pengajuan lama). */
async function terapkanKoreksiSurvey(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  pengajuan: Rw3bizPengajuan,
  koreksi: KoreksiSurvey | undefined,
  sumbangsihBaru: z.infer<typeof sumbangsihSchema> | undefined,
) {
  const { orang: _o, ...koreksiUsaha } = koreksi ?? {};
  const data: DataUsaha = { ...dataUsahaDariBaris(pengajuan) };
  for (const [k, v] of Object.entries(koreksiUsaha)) {
    if (v !== undefined) (data as Record<string, unknown>)[k] = v;
  }
  const tarif = await loadTarif();
  const sumbangsih = sumbangsihBaru?.length ? sumbangsihFinal(sumbangsihBaru, tarif) : parseSumbangsih(pengajuan.sumbangsih);
  const kontribusi = sumbangsih?.length
    ? kolomSumbangsih(sumbangsih)
    : kolomKontribusi(hitungRincian(data, await orangUntukPengajuan(pengajuan.id, tx), tarif));
  const belumSurvey = !pengajuan.statusTempat && !koreksi?.statusTempat;
  const kolom = {
    jenisTempatUsaha: data.jenisTempatUsaha,
    ...kolomDataUsaha(data),
    ...(belumSurvey ? { statusTempat: null, luasM2: null, hariOperasional: null, sampahKantongHari: null } : {}),
    ...kontribusi,
  };
  await tx.update(rw3bizPengajuan).set(kolom).where(eq(rw3bizPengajuan.id, pengajuan.id));
  return kolom;
}

export async function approvePengajuan(id: number, adminUsername: string, input?: z.infer<typeof approveSchema>) {
  const { catatanSurvey, koreksi, sumbangsih, tanggalBayar } = approveSchema.parse(input ?? {});
  const tarif = await loadTarif();

  const { updated, usaha } = await db.transaction(async (tx) => {
    const [awal] = await tx.select().from(rw3bizPengajuan).where(eq(rw3bizPengajuan.id, id)).for("update");
    if (!awal) throw new Error("Pengajuan tidak ditemukan");
    if (awal.status !== "menunggu_survey") throw new Error("Pengajuan sudah diproses");
    const sukarela = Boolean(sumbangsih?.length) || parseSumbangsih(awal.sumbangsih) != null;
    if (!sukarela && !awal.statusTempat && !koreksi?.statusTempat) {
      throw new Error("Pengajuan lama: isi sumbangsih atau lengkapi data usaha sebelum menyetujui");
    }
    const masaBerlaku = tanggalBayar
      ? { tanggalBayar, tanggalBerlakuSampai: hitungTanggalBerlaku(tanggalBayar, awal.terminBulan) }
      : null;
    if (masaBerlaku) await tx.update(rw3bizPengajuan).set(masaBerlaku).where(eq(rw3bizPengajuan.id, id));
    const pengajuan = { ...awal, ...masaBerlaku };

    const kolom = await terapkanKoreksiSurvey(tx, pengajuan, koreksi, sumbangsih);
    const periodeMulai = pengajuan.tanggalBayar.slice(0, 7);

    let usahaRow;
    if (pengajuan.tipe === "perpanjang" && pengajuan.usahaId) {
      const [lama] = await tx
        .select({ nomorInduk: rw3bizUsaha.nomorInduk })
        .from(rw3bizUsaha)
        .where(eq(rw3bizUsaha.id, pengajuan.usahaId));
      [usahaRow] = await tx
        .update(rw3bizUsaha)
        .set({
          nomorInduk: lama?.nomorInduk ?? (await nomorIndukBaru(tx)),
          status: "aktif",
          namaUsaha: pengajuan.namaUsaha,
          jamBuka: pengajuan.jamBuka,
          jamTutup: pengajuan.jamTutup,
          kategoriUsaha: pengajuan.kategoriUsaha,
          pjNama: pengajuan.pjNama,
          pjNik: pengajuan.pjNik,
          pjNomorWhatsapp: pengajuan.pjNomorWhatsapp,
          tanggalMulai: pengajuan.tanggalBayar,
          tanggalHabis: pengajuan.tanggalBerlakuSampai,
          terminBulan: pengajuan.terminBulan,
          nomorBiz: pengajuan.nomorBiz,
          pengajuanId: pengajuan.id,
          ...kolom,
          periodeTagihanMulai: sql`COALESCE(${rw3bizUsaha.periodeTagihanMulai}, ${periodeMulai})`,
        })
        .where(eq(rw3bizUsaha.id, pengajuan.usahaId))
        .returning();
      await tandaiRaziaSelesai(tx, pengajuan.usahaId);
    } else {
      [usahaRow] = await tx
        .insert(rw3bizUsaha)
        .values({
          nomorBiz: pengajuan.nomorBiz,
          nomorInduk: await nomorIndukBaru(tx),
          rt: pengajuan.rt,
          alamat: pengajuan.alamat,
          nomorLokasi: pengajuan.nomorLokasi,
          namaUsaha: pengajuan.namaUsaha,
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
          ...kolom,
          periodeTagihanMulai: periodeMulai,
          tahapTransisiMulai: sukarela ? null : tentukanTahapTransisi(periodeMulai, tarif),
        })
        .returning();
    }
    if (!usahaRow) throw new Error("Usaha untuk pengajuan ini tidak ditemukan");

    await buatTagihanTermin(tx, usahaRow, pengajuan.tanggalBayar, pengajuan.terminBulan, tarif);

    const [p] = await tx
      .update(rw3bizPengajuan)
      .set({
        status: "disetujui",
        catatanSurvey: catatanSurvey?.trim() || null,
        reviewedAt: new Date(),
        reviewedBy: adminUsername,
        usahaId: usahaRow.id,
      })
      .where(eq(rw3bizPengajuan.id, id))
      .returning();
    return { updated: p, usaha: usahaRow };
  });

  notifyRw3bizDisetujui(updated, usaha);
  return { pengajuan: updated, usaha };
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
  for (const file of ["0027_rw3biz_kontribusi.sql", "0028_rw3biz_niu_kendaraan.sql", "0029_rw3biz_charter_razia.sql", "0030_rw3biz_pelanggaran.sql", "0033_rw3biz_sumbangsih.sql"]) {
    const kandidat = [path.join(process.cwd(), "migrations", file)];
    if (typeof __dirname !== "undefined") kandidat.push(path.join(__dirname, "..", "migrations", file));
    const lokasi = kandidat.find((p) => fs.existsSync(p));
    if (!lokasi) {
      console.error(`[RW3BIZ] migrations/${file} tidak ditemukan; kolom tidak dipasang otomatis`);
      return;
    }
    await pool.query(fs.readFileSync(lokasi, "utf8"));
  }
}
