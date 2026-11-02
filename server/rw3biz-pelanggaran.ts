import { z } from "zod";
import { and, desc, eq, gte, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "./db";
import { rw3bizPelanggaran, rw3bizUsaha } from "@shared/schema";
import {
  JENIS_PELANGGARAN,
  JENIS_PELANGGARAN_INFO,
  TINGKAT_PELANGGARAN,
  TINGKAT_PELANGGARAN_LABEL,
  type JenisPelanggaran,
  type TingkatPelanggaran,
} from "@shared/rw3biz-kontribusi";
import {
  notifyRw3bizAduanUsahaDiterima,
  notifyRw3bizPelanggaranTerbukti,
} from "./wa-notify-rw3biz";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const FOTO_REGEX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAKS_FOTO = 2_800_000;

const foto = z
  .string()
  .max(MAKS_FOTO, "Foto terlalu besar (maks. ±2 MB)")
  .regex(FOTO_REGEX, "Format foto tidak valid")
  .optional()
  .nullable();

export const nomorAduan = (id: number) => `ADU-RW3-${String(id).padStart(5, "0")}`;
const labelJenis = (j: string) => JENIS_PELANGGARAN_INFO[j as JenisPelanggaran]?.label ?? j;
const digit = (s?: string | null) => (s ?? "").replace(/\D/g, "").replace(/^62/, "0");

// ---------------------------------------------------------------- Aduan warga (publik)

export const aduanPublikSchema = z
  .object({
    nomorUsaha: z.string().trim().max(40).optional().nullable(),
    namaUsahaLain: z.string().trim().max(200).optional().nullable(),
    jenis: z.enum(JENIS_PELANGGARAN),
    tanggalKejadian: z.string().regex(DATE_REGEX, "Isi tanggal kejadian"),
    lokasi: z.string().trim().max(300).optional().nullable(),
    uraian: z.string().trim().min(15, "Ceritakan kejadiannya minimal 15 karakter").max(2000),
    pelaporNama: z.string().trim().min(2, "Isi nama pelapor").max(120),
    pelaporWa: z
      .string()
      .trim()
      .refine((v) => digit(v).length >= 9, "Isi nomor WhatsApp pelapor yang aktif"),
    pelaporRt: z.number().int().min(1).max(4).optional().nullable(),
    foto,
  })
  .refine((v) => v.nomorUsaha?.trim() || v.namaUsahaLain?.trim(), { message: "Pilih usaha yang diadukan atau tulis namanya" });

const aduanPerIp = new Map<string, number[]>();
const JENDELA_IP_MS = 60 * 60 * 1000;
const MAKS_ADUAN_PER_IP = 5;
const MAKS_ADUAN_PER_WA_HARI = 3;

function cekBatasIp(ip: string) {
  const kini = Date.now();
  const riwayat = (aduanPerIp.get(ip) ?? []).filter((t) => kini - t < JENDELA_IP_MS);
  if (riwayat.length >= MAKS_ADUAN_PER_IP) throw new Error("Terlalu banyak aduan dari perangkat ini. Coba lagi nanti.");
  riwayat.push(kini);
  aduanPerIp.set(ip, riwayat);
}

async function cariUsahaByNomor(nomor: string) {
  const n = nomor.trim().toUpperCase();
  if (!n) return null;
  const [u] = await db
    .select()
    .from(rw3bizUsaha)
    .where(or(eq(rw3bizUsaha.nomorInduk, n), eq(rw3bizUsaha.nomorBiz, n)))
    .limit(1);
  return u ?? null;
}

export async function ajukanAduan(raw: unknown, ip: string) {
  const input = aduanPublikSchema.parse(raw);
  const wa = digit(input.pelaporWa);
  const sehari = new Date(Date.now() - 86_400_000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rw3bizPelanggaran)
    .where(and(eq(rw3bizPelanggaran.pelaporWa, wa), gte(rw3bizPelanggaran.createdAt, sehari)));
  if (n >= MAKS_ADUAN_PER_WA_HARI) throw new Error(`Maksimal ${MAKS_ADUAN_PER_WA_HARI} aduan per nomor WhatsApp per hari`);
  cekBatasIp(ip);

  const usaha = input.nomorUsaha?.trim() ? await cariUsahaByNomor(input.nomorUsaha) : null;
  if (input.nomorUsaha?.trim() && !usaha && !input.namaUsahaLain?.trim()) {
    throw new Error("Nomor usaha tidak ditemukan — tulis nama usahanya saja");
  }
  const [row] = await db
    .insert(rw3bizPelanggaran)
    .values({
      usahaId: usaha?.id ?? null,
      namaUsahaLain: usaha ? null : input.namaUsahaLain?.trim() || null,
      jenis: input.jenis,
      tingkat: "sedang",
      sumber: "aduan_warga",
      tanggalKejadian: input.tanggalKejadian,
      lokasi: input.lokasi?.trim() || null,
      uraian: input.uraian,
      fotoData: input.foto || null,
      pelaporNama: input.pelaporNama,
      pelaporWa: wa,
      pelaporRt: input.pelaporRt ?? null,
      status: "menunggu_verifikasi",
    })
    .returning({ id: rw3bizPelanggaran.id });
  const namaUsaha = usaha?.namaUsaha ?? input.namaUsahaLain?.trim() ?? "usaha di RW 03";
  const nomor = nomorAduan(row.id);
  notifyRw3bizAduanUsahaDiterima({
    pelaporWa: wa,
    pelaporNama: input.pelaporNama,
    nomorAduan: nomor,
    pelanggaranId: row.id,
    namaUsaha,
  });
  return { id: row.id, nomorAduan: nomor, namaUsaha: usaha?.namaUsaha ?? input.namaUsahaLain?.trim() ?? null };
}

/** Daftar usaha aktif untuk dipilih pelapor (data yang memang tercantum di surat izin). */
export async function daftarUsahaPublik() {
  const rows = await db
    .select({ nomorInduk: rw3bizUsaha.nomorInduk, nomorBiz: rw3bizUsaha.nomorBiz, namaUsaha: rw3bizUsaha.namaUsaha, rt: rw3bizUsaha.rt })
    .from(rw3bizUsaha)
    .where(eq(rw3bizUsaha.status, "aktif"))
    .orderBy(rw3bizUsaha.namaUsaha);
  return rows.map((r) => ({ nomor: r.nomorInduk ?? r.nomorBiz, namaUsaha: r.namaUsaha, rt: r.rt }));
}

// ---------------------------------------------------------------- Verifikasi & temuan petugas

async function pelanggaranKe(usahaId: number | null, tanggal: string, kecualiId?: number) {
  if (!usahaId) return 1;
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  const sejak = d.toISOString().slice(0, 10);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rw3bizPelanggaran)
    .where(
      and(
        eq(rw3bizPelanggaran.usahaId, usahaId),
        eq(rw3bizPelanggaran.status, "terbukti"),
        gte(rw3bizPelanggaran.tanggalKejadian, sejak),
        kecualiId ? ne(rw3bizPelanggaran.id, kecualiId) : undefined,
      ),
    );
  return n + 1;
}

export const verifikasiSchema = z.object({
  terbukti: z.boolean(),
  usahaId: z.number().int().positive().optional().nullable(),
  jenis: z.enum(JENIS_PELANGGARAN).optional(),
  tingkat: z.enum(TINGKAT_PELANGGARAN).default("sedang"),
  catatan: z.string().trim().max(1000).optional().nullable(),
});

async function tetapkan(id: number, o: z.infer<typeof verifikasiSchema>, admin: string) {
  const [r] = await db.select().from(rw3bizPelanggaran).where(eq(rw3bizPelanggaran.id, id));
  if (!r) throw new Error("Pelanggaran tidak ditemukan");
  if (r.status !== "menunggu_verifikasi") throw new Error("Aduan ini sudah diverifikasi");
  if (!o.terbukti) {
    if (!o.catatan?.trim()) throw new Error("Tulis alasan aduan tidak terbukti");
    const [u] = await db
      .update(rw3bizPelanggaran)
      .set({ status: "tidak_terbukti", catatanVerifikasi: o.catatan.trim(), diverifikasiOleh: admin, diverifikasiAt: new Date() })
      .where(eq(rw3bizPelanggaran.id, id))
      .returning();
    return u;
  }
  const usahaId = o.usahaId ?? r.usahaId;
  let usahaRow: typeof rw3bizUsaha.$inferSelect | null = null;
  if (usahaId) {
    const [u] = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, usahaId));
    if (!u) throw new Error("Usaha tidak ditemukan");
    usahaRow = u;
  }
  const jenis = o.jenis ?? (r.jenis as JenisPelanggaran);
  const keBerapa = await pelanggaranKe(usahaId, r.tanggalKejadian, id);
  const [u] = await db
    .update(rw3bizPelanggaran)
    .set({
      usahaId,
      namaUsahaLain: usahaId ? null : r.namaUsahaLain,
      jenis,
      tingkat: o.tingkat,
      status: "terbukti",
      keBerapa,
      denda: 0,
      dendaRincian: null,
      dendaStatus: "tidak_ada",
      catatanVerifikasi: o.catatan?.trim() || null,
      diverifikasiOleh: admin,
      diverifikasiAt: new Date(),
    })
    .where(eq(rw3bizPelanggaran.id, id))
    .returning();
  if (usahaRow) {
    notifyRw3bizPelanggaranTerbukti(usahaRow, {
      pelanggaranId: u.id,
      nomorAduan: nomorAduan(u.id),
      jenisLabel: labelJenis(jenis),
      tingkatLabel: TINGKAT_PELANGGARAN_LABEL[o.tingkat],
      tanggalKejadian: u.tanggalKejadian,
    });
  }
  return u;
}

export async function verifikasiAduan(id: number, raw: unknown, admin: string) {
  return tetapkan(id, verifikasiSchema.parse(raw), admin);
}

export const temuanSchema = z.object({
  usahaId: z.number().int().positive().optional().nullable(),
  namaUsahaLain: z.string().trim().max(200).optional().nullable(),
  jenis: z.enum(JENIS_PELANGGARAN),
  tingkat: z.enum(TINGKAT_PELANGGARAN).default("sedang"),
  tanggalKejadian: z.string().regex(DATE_REGEX),
  lokasi: z.string().trim().max(300).optional().nullable(),
  uraian: z.string().trim().min(5, "Tulis uraian temuan").max(2000),
  foto,
  catatan: z.string().trim().max(1000).optional().nullable(),
});

/** Temuan langsung petugas: dicatat sekaligus ditetapkan terbukti. */
export async function catatTemuan(raw: unknown, admin: string) {
  const o = temuanSchema.parse(raw);
  if (!o.usahaId && !o.namaUsahaLain?.trim()) throw new Error("Pilih usaha atau tulis nama usahanya");
  const [row] = await db
    .insert(rw3bizPelanggaran)
    .values({
      usahaId: o.usahaId ?? null,
      namaUsahaLain: o.usahaId ? null : o.namaUsahaLain?.trim() || null,
      jenis: o.jenis,
      tingkat: o.tingkat,
      sumber: "temuan_petugas",
      tanggalKejadian: o.tanggalKejadian,
      lokasi: o.lokasi?.trim() || null,
      uraian: o.uraian,
      fotoData: o.foto || null,
      status: "menunggu_verifikasi",
      dicatatOleh: admin,
    })
    .returning({ id: rw3bizPelanggaran.id });
  return tetapkan(row.id, { terbukti: true, tingkat: o.tingkat, catatan: o.catatan }, admin);
}

// ---------------------------------------------------------------- Daftar

export async function listPelanggaran(filter: { status?: string; bulan?: string; q?: string }) {
  const kondisi = [];
  if (filter.status && filter.status !== "semua") kondisi.push(eq(rw3bizPelanggaran.status, filter.status));
  if (filter.bulan && /^\d{4}-\d{2}$/.test(filter.bulan)) kondisi.push(sql`${rw3bizPelanggaran.tanggalKejadian} LIKE ${`${filter.bulan}%`}`);
  if (filter.q?.trim()) {
    const q = `%${filter.q.trim()}%`;
    kondisi.push(or(ilike(rw3bizUsaha.namaUsaha, q), ilike(rw3bizPelanggaran.namaUsahaLain, q), ilike(rw3bizUsaha.nomorInduk, q)));
  }
  const rows = await db
    .select({
      p: rw3bizPelanggaran,
      usaha: {
        id: rw3bizUsaha.id,
        namaUsaha: rw3bizUsaha.namaUsaha,
        nomorInduk: rw3bizUsaha.nomorInduk,
        nomorBiz: rw3bizUsaha.nomorBiz,
        pjNama: rw3bizUsaha.pjNama,
        pjNomorWhatsapp: rw3bizUsaha.pjNomorWhatsapp,
      },
    })
    .from(rw3bizPelanggaran)
    .leftJoin(rw3bizUsaha, eq(rw3bizPelanggaran.usahaId, rw3bizUsaha.id))
    .where(kondisi.length ? and(...kondisi) : undefined)
    .orderBy(desc(rw3bizPelanggaran.createdAt), desc(rw3bizPelanggaran.id))
    .limit(500);
  return rows.map(({ p: { fotoData, ...p }, usaha }) => ({
    ...p,
    adaFoto: Boolean(fotoData),
    nomorAduan: nomorAduan(p.id),
    jenisLabel: labelJenis(p.jenis),
    usaha: usaha?.id ? usaha : null,
  }));
}

export async function fotoPelanggaran(id: number) {
  const [r] = await db.select({ f: rw3bizPelanggaran.fotoData }).from(rw3bizPelanggaran).where(eq(rw3bizPelanggaran.id, id));
  const m = r?.f?.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  return m ? { tipe: m[1], buffer: Buffer.from(m[2], "base64") } : null;
}

export async function hapusPelanggaran(id: number) {
  const [r] = await db.select().from(rw3bizPelanggaran).where(eq(rw3bizPelanggaran.id, id));
  if (!r) throw new Error("Pelanggaran tidak ditemukan");
  await db.delete(rw3bizPelanggaran).where(eq(rw3bizPelanggaran.id, id));
}

/** Ringkasan untuk status publik: hanya yang terbukti, tanpa identitas pelapor. */
export async function pelanggaranUntukUsaha(usahaId: number) {
  const rows = await db
    .select()
    .from(rw3bizPelanggaran)
    .where(and(eq(rw3bizPelanggaran.usahaId, usahaId), eq(rw3bizPelanggaran.status, "terbukti")))
    .orderBy(desc(rw3bizPelanggaran.tanggalKejadian), desc(rw3bizPelanggaran.id))
    .limit(30);
  return rows.map((r) => ({
    id: r.id,
    tanggal: r.tanggalKejadian,
    jenis: labelJenis(r.jenis),
    tingkat: TINGKAT_PELANGGARAN_LABEL[r.tingkat as TingkatPelanggaran] ?? r.tingkat,
    keBerapa: r.keBerapa,
    sumber: r.sumber === "aduan_warga" ? "Aduan warga" : "Temuan petugas",
  }));
}
