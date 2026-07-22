import { z } from "zod";
import crypto from "crypto";
import { db, pool } from "./db";
import { eq, and, desc, ilike, or, type SQL } from "drizzle-orm";
import { karangtarunaAnggota, type KarangtarunaAnggota } from "@shared/schema";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { parseKarangtarunaTags, stringifyKarangtarunaTags } from "@shared/karangtaruna";
import { notifyKarangtarunaDaftarBaru } from "./wa-notify-karangtaruna";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isMissingKarangtarunaTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /does not exist|relation.*karangtaruna|undefined_table/i.test(msg);
}

export async function generateNomorAnggota(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `KT-${year}-`;
  for (let attempt = 0; attempt < 20; attempt++) {
    const seq = crypto.randomInt(0, 10000);
    const nomor = `${prefix}${String(seq).padStart(4, "0")}`;
    const [existing] = await db
      .select({ id: karangtarunaAnggota.id })
      .from(karangtarunaAnggota)
      .where(eq(karangtarunaAnggota.nomorAnggota, nomor))
      .limit(1);
    if (!existing) return nomor;
  }
  throw new Error("Gagal membuat nomor anggota Karang Taruna");
}

export const daftarAnggotaSchema = z.object({
  namaLengkap: z.string().min(2, "Nama lengkap wajib diisi"),
  nik: z.string().optional().nullable(),
  rt: z.number().int().refine((n) => (ACTIVE_RT_NUMBERS as readonly number[]).includes(n), "RT tidak valid"),
  alamat: z.string().min(5, "Alamat lengkap wajib diisi"),
  nomorWhatsapp: z.string().min(8, "Nomor WhatsApp aktif wajib diisi"),
  jenisKelamin: z.string().optional().nullable(),
  tanggalLahir: z.string().regex(DATE_REGEX, "Tanggal lahir wajib diisi"),
  pendidikanTerakhir: z.string().optional().nullable(),
  statusAktivitas: z.string().optional().nullable(),
  pekerjaan: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  bidangKeahlian: z.array(z.string().min(1).max(80)).min(1, "Pilih minimal satu bidang keahlian").max(20),
  ceritaSkill: z.string().min(10, "Ceritakan skill/potensi kamu minimal 10 karakter"),
  pengalamanOrganisasi: z.string().optional().nullable(),
  prestasi: z.string().optional().nullable(),
  bidangMinat: z.array(z.string().min(1).max(80)).min(1, "Pilih minimal satu bidang minat").max(20),
  harapanFasilitasi: z.string().min(10, "Ceritakan harapan difasilitasi RW minimal 10 karakter"),
  ketersediaanWaktu: z.string().optional().nullable(),
  bersediaAktif: z.boolean().default(true),
  setuju: z.literal(true, { errorMap: () => ({ message: "Persetujuan data wajib dicentang" }) }),
});

export type KarangtarunaAnggotaView = Omit<
  KarangtarunaAnggota,
  "bidangKeahlian" | "bidangMinat"
> & {
  bidangKeahlian: string[];
  bidangMinat: string[];
};

function toView(row: KarangtarunaAnggota): KarangtarunaAnggotaView {
  return {
    ...row,
    bidangKeahlian: parseKarangtarunaTags(row.bidangKeahlian),
    bidangMinat: parseKarangtarunaTags(row.bidangMinat),
  };
}

export async function createAnggota(input: z.infer<typeof daftarAnggotaSchema>) {
  const parsed = daftarAnggotaSchema.parse(input);
  const nomorAnggota = await generateNomorAnggota();

  const [row] = await db
    .insert(karangtarunaAnggota)
    .values({
      nomorAnggota,
      namaLengkap: parsed.namaLengkap.trim(),
      nik: parsed.nik?.trim() || null,
      rt: parsed.rt,
      alamat: parsed.alamat.trim(),
      nomorWhatsapp: parsed.nomorWhatsapp.trim(),
      jenisKelamin: parsed.jenisKelamin?.trim() || null,
      tanggalLahir: parsed.tanggalLahir,
      pendidikanTerakhir: parsed.pendidikanTerakhir?.trim() || null,
      statusAktivitas: parsed.statusAktivitas?.trim() || null,
      pekerjaan: parsed.pekerjaan?.trim() || null,
      instagram: parsed.instagram?.trim() || null,
      bidangKeahlian: stringifyKarangtarunaTags(parsed.bidangKeahlian),
      ceritaSkill: parsed.ceritaSkill.trim(),
      pengalamanOrganisasi: parsed.pengalamanOrganisasi?.trim() || null,
      prestasi: parsed.prestasi?.trim() || null,
      bidangMinat: stringifyKarangtarunaTags(parsed.bidangMinat),
      harapanFasilitasi: parsed.harapanFasilitasi.trim(),
      ketersediaanWaktu: parsed.ketersediaanWaktu?.trim() || null,
      bersediaAktif: parsed.bersediaAktif,
      statusKeanggotaan: "baru",
    })
    .returning();

  notifyKarangtarunaDaftarBaru(row);
  return row;
}

export async function getStatusByNomor(nomorRaw: string): Promise<KarangtarunaAnggotaView | null> {
  const nomor = nomorRaw.trim().toUpperCase();
  const [row] = await db
    .select()
    .from(karangtarunaAnggota)
    .where(eq(karangtarunaAnggota.nomorAnggota, nomor))
    .limit(1);
  return row ? toView(row) : null;
}

export async function listAnggotaAdmin(opts?: {
  status?: string | null;
  rt?: number | null;
  search?: string | null;
}): Promise<KarangtarunaAnggotaView[]> {
  const conditions: SQL[] = [];
  if (opts?.status && opts.status !== "semua") {
    conditions.push(eq(karangtarunaAnggota.statusKeanggotaan, opts.status));
  }
  if (opts?.rt != null && Number.isFinite(opts.rt)) {
    conditions.push(eq(karangtarunaAnggota.rt, opts.rt));
  }
  const term = opts?.search?.trim();
  if (term) {
    const like = `%${term}%`;
    conditions.push(
      or(
        ilike(karangtarunaAnggota.namaLengkap, like),
        ilike(karangtarunaAnggota.nomorAnggota, like),
        ilike(karangtarunaAnggota.nomorWhatsapp, like),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(karangtarunaAnggota)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(karangtarunaAnggota.createdAt));
  return rows.map(toView);
}

export async function getAnggotaDetail(id: number): Promise<KarangtarunaAnggotaView | null> {
  const [row] = await db.select().from(karangtarunaAnggota).where(eq(karangtarunaAnggota.id, id)).limit(1);
  return row ? toView(row) : null;
}

const updateAnggotaSchema = z.object({
  statusKeanggotaan: z.enum(["baru", "aktif", "arsip"]).optional(),
  potensiUnggulan: z.string().optional().nullable(),
  catatanAdmin: z.string().optional().nullable(),
});

export async function updateAnggotaAdmin(
  id: number,
  adminUsername: string,
  input: z.infer<typeof updateAnggotaSchema>,
) {
  const parsed = updateAnggotaSchema.parse(input);
  const [existing] = await db.select().from(karangtarunaAnggota).where(eq(karangtarunaAnggota.id, id)).limit(1);
  if (!existing) throw new Error("Anggota tidak ditemukan");

  const [updated] = await db
    .update(karangtarunaAnggota)
    .set({
      statusKeanggotaan: parsed.statusKeanggotaan ?? existing.statusKeanggotaan,
      potensiUnggulan:
        parsed.potensiUnggulan !== undefined ? parsed.potensiUnggulan?.trim() || null : existing.potensiUnggulan,
      catatanAdmin:
        parsed.catatanAdmin !== undefined ? parsed.catatanAdmin?.trim() || null : existing.catatanAdmin,
      reviewedAt: new Date(),
      reviewedBy: adminUsername,
    })
    .where(eq(karangtarunaAnggota.id, id))
    .returning();
  return toView(updated);
}

export async function deleteAnggotaAdmin(id: number) {
  await db.delete(karangtarunaAnggota).where(eq(karangtarunaAnggota.id, id));
}

export type KarangtarunaStats = {
  total: number;
  baru: number;
  aktif: number;
  arsip: number;
  perRt: { rt: number; jumlah: number }[];
  topKeahlian: { nama: string; jumlah: number }[];
  topMinat: { nama: string; jumlah: number }[];
  bersediaAktif: number;
};

export async function getStats(): Promise<KarangtarunaStats> {
  const rows = await db.select().from(karangtarunaAnggota);

  const perRtMap = new Map<number, number>();
  const keahlianMap = new Map<string, number>();
  const minatMap = new Map<string, number>();
  let baru = 0;
  let aktif = 0;
  let arsip = 0;
  let bersediaAktif = 0;

  for (const r of rows) {
    if (r.statusKeanggotaan === "baru") baru++;
    else if (r.statusKeanggotaan === "aktif") aktif++;
    else if (r.statusKeanggotaan === "arsip") arsip++;
    if (r.bersediaAktif) bersediaAktif++;

    perRtMap.set(r.rt, (perRtMap.get(r.rt) ?? 0) + 1);
    for (const k of parseKarangtarunaTags(r.bidangKeahlian)) {
      keahlianMap.set(k, (keahlianMap.get(k) ?? 0) + 1);
    }
    for (const m of parseKarangtarunaTags(r.bidangMinat)) {
      minatMap.set(m, (minatMap.get(m) ?? 0) + 1);
    }
  }

  const sortDesc = (a: { jumlah: number }, b: { jumlah: number }) => b.jumlah - a.jumlah;

  return {
    total: rows.length,
    baru,
    aktif,
    arsip,
    bersediaAktif,
    perRt: Array.from(perRtMap.entries())
      .map(([rt, jumlah]) => ({ rt, jumlah }))
      .sort((a, b) => a.rt - b.rt),
    topKeahlian: Array.from(keahlianMap.entries())
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort(sortDesc)
      .slice(0, 8),
    topMinat: Array.from(minatMap.entries())
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort(sortDesc)
      .slice(0, 8),
  };
}

export async function ensureKarangtarunaSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS karangtaruna_anggota (
      id serial PRIMARY KEY,
      nomor_anggota text NOT NULL UNIQUE,
      nama_lengkap text NOT NULL,
      nik text,
      rt integer NOT NULL,
      alamat text NOT NULL,
      nomor_whatsapp text NOT NULL,
      jenis_kelamin text,
      tanggal_lahir text NOT NULL,
      pendidikan_terakhir text,
      status_aktivitas text,
      pekerjaan text,
      instagram text,
      bidang_keahlian text,
      cerita_skill text NOT NULL,
      pengalaman_organisasi text,
      prestasi text,
      bidang_minat text,
      harapan_fasilitasi text NOT NULL,
      ketersediaan_waktu text,
      bersedia_aktif boolean NOT NULL DEFAULT true,
      status_keanggotaan text NOT NULL DEFAULT 'baru',
      potensi_unggulan text,
      catatan_admin text,
      reviewed_at timestamp,
      reviewed_by text,
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_karangtaruna_anggota_rt ON karangtaruna_anggota (rt);
    CREATE INDEX IF NOT EXISTS idx_karangtaruna_anggota_status ON karangtaruna_anggota (status_keanggotaan);
    CREATE INDEX IF NOT EXISTS idx_karangtaruna_anggota_nomor ON karangtaruna_anggota (nomor_anggota);
  `);
}
