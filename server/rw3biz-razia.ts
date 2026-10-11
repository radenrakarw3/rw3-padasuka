import { z } from "zod";
import { and, desc, eq, gte, inArray, like, sql } from "drizzle-orm";
import { db } from "./db";
import { kasRw, rw3bizRazia, rw3bizUsaha, type Rw3bizUsaha } from "@shared/schema";
import {
  CHARTER_BIZ,
  HASIL_RAZIA_LABEL,
  KATEGORI_KAS_DENDA_RAZIA,
  KENDARAAN_BIZ,
  dendaRazia,
  nomorKwitansiRazia,
  type HasilRazia,
  type KodeKendaraanBiz,
} from "@shared/rw3biz-kontribusi";
import { dataUsahaDariBaris, loadTarif } from "./rw3biz-kontribusi";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const KODE_KENDARAAN = KENDARAAN_BIZ.map((k) => k.kode) as [KodeKendaraanBiz, ...KodeKendaraanBiz[]];

export function normalPlat(plat: string): string {
  return plat.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const labelJenis = (jenis: string) => KENDARAAN_BIZ.find((k) => k.kode === jenis)?.label ?? jenis;

export const raziaSchema = z.object({
  tanggal: z.string().regex(DATE_REGEX),
  jam: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  lokasi: z.string().trim().min(2, "Isi lokasi razia").max(200),
  plat: z
    .string()
    .trim()
    .min(3, "Isi plat nomor")
    .max(20)
    .refine((p) => normalPlat(p).length >= 3, "Plat nomor tidak valid"),
  jenis: z.enum(KODE_KENDARAAN),
  kepemilikan: z.enum(["milik", "charter", "tidak_tahu"]).default("tidak_tahu"),
  usahaId: z.number().int().positive().optional().nullable(),
  tujuanLain: z.string().trim().max(200).optional().nullable(),
  namaSopir: z.string().trim().max(120).optional().nullable(),
  catatan: z.string().trim().max(1000).optional().nullable(),
  /** Kosong = denda otomatis dari tarif. */
  denda: z.number().int().min(0).max(10_000_000).optional().nullable(),
});
export type RaziaInput = z.infer<typeof raziaSchema>;

type HasilCocok = { hasil: HasilRazia; usahaId: number | null; keterangan: string; dendaUsulan: number; temuanSebelumnya: number };

function platUsaha(u: Rw3bizUsaha): string[] {
  return dataUsahaDariBaris(u).kendaraanOperasional.map(normalPlat);
}

/** Cocokkan temuan razia dengan kendaraan milik / charter yang didaftarkan usaha aktif. */
export async function cocokkanRazia(raw: unknown): Promise<HasilCocok> {
  const input = raziaSchema.parse(raw);
  const tarif = await loadTarif();
  const plat = normalPlat(input.plat);
  const aktif = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.status, "aktif"));
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rw3bizRazia)
    .where(eq(rw3bizRazia.platNormal, plat));
  const jenisLabel = labelJenis(input.jenis).toLowerCase();
  const c = cocokkanDasar(input, plat, aktif, jenisLabel);
  let dendaUsulan = 0;
  let keterangan = c.keterangan;
  if (c.kenaDenda) {
    const sejak = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    const [{ m }] = await db
      .select({ m: sql<number>`count(*)::int` })
      .from(rw3bizRazia)
      .where(
        and(
          inArray(rw3bizRazia.hasil, HASIL_RAZIA_MELANGGAR),
          gte(rw3bizRazia.tanggal, sejak),
          c.usahaId ? eq(rw3bizRazia.usahaId, c.usahaId) : eq(rw3bizRazia.platNormal, plat),
        ),
      );
    const keBerapa = m + 1;
    dendaUsulan = dendaRazia(input.jenis, tarif, keBerapa);
    if (keBerapa > 1) keterangan += ` · pelanggaran razia ke-${keBerapa} dalam 12 bulan`;
  }
  return { hasil: c.h, usahaId: c.usahaId, keterangan, dendaUsulan, temuanSebelumnya: n };
}

const HASIL_RAZIA_MELANGGAR: HasilRazia[] = ["tidak_terdaftar", "usaha_tidak_terdaftar"];

function cocokkanDasar(input: RaziaInput, plat: string, aktif: Rw3bizUsaha[], jenisLabel: string) {
  const hasil = (h: HasilRazia, usahaId: number | null, keterangan: string, kenaDenda: boolean) => ({ h, usahaId, keterangan, kenaDenda });
  const pemilik = aktif.find((u) => platUsaha(u).includes(plat));
  if (pemilik) {
    if ((pemilik[input.jenis] ?? 0) > 0) {
      return hasil("terdaftar_milik", pemilik.id, `Plat terdaftar sebagai kendaraan ${pemilik.namaUsaha}`, false);
    }
    return hasil(
      "tidak_terdaftar",
      pemilik.id,
      `Plat tercatat di ${pemilik.namaUsaha}, tetapi ${jenisLabel} tidak didaftarkan — data kendaraan wajib diperbarui`,
      true,
    );
  }
  if (input.usahaId) {
    const u = aktif.find((x) => x.id === input.usahaId);
    if (!u) throw new Error("Usaha tujuan tidak aktif / tidak ditemukan");
    const charter = CHARTER_BIZ.find((c) => c.kendaraan === input.jenis);
    if (charter && (u[charter.kode] ?? 0) > 0) {
      return hasil("terdaftar_charter", u.id, `${u.namaUsaha} mendaftarkan ${jenisLabel} charter ${u[charter.kode]}×/minggu`, false);
    }
    return hasil(
      "tidak_terdaftar",
      u.id,
      `${u.namaUsaha} tidak mendaftarkan ${jenisLabel} ini (milik maupun charter) — data kendaraan wajib diperbarui`,
      true,
    );
  }
  if (input.tujuanLain?.trim()) {
    return hasil("usaha_tidak_terdaftar", null, `Tujuan "${input.tujuanLain.trim()}" belum terdaftar RW3BIZ — ajak mendaftar`, true);
  }
  return hasil("lewat", null, "Hanya melintas, tidak menuju usaha di RW 03", false);
}

export async function catatRazia(raw: unknown, admin: string) {
  const input = raziaSchema.parse(raw);
  const cocok = await cocokkanRazia(input);
  const denda = input.denda ?? cocok.dendaUsulan;
  const [row] = await db
    .insert(rw3bizRazia)
    .values({
      tanggal: input.tanggal,
      jam: input.jam || null,
      lokasi: input.lokasi,
      plat: input.plat.toUpperCase().trim(),
      platNormal: normalPlat(input.plat),
      jenis: input.jenis,
      kepemilikan: input.kepemilikan,
      usahaId: cocok.usahaId,
      tujuanLain: cocok.usahaId ? null : input.tujuanLain?.trim() || null,
      namaSopir: input.namaSopir?.trim() || null,
      hasil: cocok.hasil,
      keteranganHasil: cocok.keterangan,
      denda,
      dendaStatus: denda > 0 ? "belum" : "tidak_ada",
      selesai: cocok.hasil !== "tidak_terdaftar",
      catatan: input.catatan?.trim() || null,
      dicatatOleh: admin,
    })
    .returning();
  return { ...row, temuanSebelumnya: cocok.temuanSebelumnya };
}

export async function listRazia(filter: { bulan?: string; hasil?: string; denda?: string; q?: string }) {
  const kondisi = [];
  if (filter.bulan && /^\d{4}-\d{2}$/.test(filter.bulan)) kondisi.push(like(rw3bizRazia.tanggal, `${filter.bulan}%`));
  if (filter.hasil && filter.hasil !== "semua") kondisi.push(eq(rw3bizRazia.hasil, filter.hasil));
  if (filter.denda && filter.denda !== "semua") kondisi.push(eq(rw3bizRazia.dendaStatus, filter.denda));
  if (filter.q?.trim()) kondisi.push(like(rw3bizRazia.platNormal, `%${normalPlat(filter.q)}%`));
  const rows = await db
    .select({ razia: rw3bizRazia, usaha: { id: rw3bizUsaha.id, namaUsaha: rw3bizUsaha.namaUsaha, nomorInduk: rw3bizUsaha.nomorInduk, nomorBiz: rw3bizUsaha.nomorBiz, pjNama: rw3bizUsaha.pjNama, pjNomorWhatsapp: rw3bizUsaha.pjNomorWhatsapp } })
    .from(rw3bizRazia)
    .leftJoin(rw3bizUsaha, eq(rw3bizRazia.usahaId, rw3bizUsaha.id))
    .where(kondisi.length ? and(...kondisi) : undefined)
    .orderBy(desc(rw3bizRazia.tanggal), desc(rw3bizRazia.id))
    .limit(500);
  const plat = Array.from(new Set(rows.map((r) => r.razia.platNormal)));
  const jumlah = plat.length
    ? await db
        .select({ plat: rw3bizRazia.platNormal, n: sql<number>`count(*)::int` })
        .from(rw3bizRazia)
        .where(inArray(rw3bizRazia.platNormal, plat))
        .groupBy(rw3bizRazia.platNormal)
    : [];
  const peta = new Map(jumlah.map((j) => [j.plat, j.n]));
  return rows.map((r) => ({
    ...r.razia,
    usaha: r.usaha?.id ? r.usaha : null,
    totalTemuanPlat: peta.get(r.razia.platNormal) ?? 1,
    nomorKwitansi: r.razia.dendaStatus === "lunas" && r.razia.tanggalBayar ? nomorKwitansiRazia(r.razia.id, r.razia.tanggalBayar) : null,
  }));
}

export const bayarDendaSchema = z.object({
  tanggal: z.string().regex(DATE_REGEX),
  pembayarNama: z.string().trim().max(120).optional().nullable(),
});

export async function bayarDenda(id: number, raw: unknown, admin: string) {
  const { tanggal, pembayarNama } = bayarDendaSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(rw3bizRazia).where(eq(rw3bizRazia.id, id)).for("update");
    if (!r) throw new Error("Temuan razia tidak ditemukan");
    if (r.dendaStatus !== "belum") throw new Error("Denda tidak dalam status belum dibayar");
    const usaha = r.usahaId ? (await tx.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, r.usahaId)))[0] : null;
    const pembayar = pembayarNama?.trim() || (usaha ? `${usaha.pjNama} - ${usaha.namaUsaha}` : r.namaSopir || "-");
    const [kas] = await tx
      .insert(kasRw)
      .values({
        tipe: "pemasukan",
        kategori: KATEGORI_KAS_DENDA_RAZIA,
        jumlah: r.denda,
        keterangan: `Denda razia ${r.plat} (${labelJenis(r.jenis).toLowerCase()}) ${r.tanggal}${usaha ? ` — ${usaha.nomorInduk ?? usaha.nomorBiz} ${usaha.namaUsaha}` : ""}`,
        tanggal,
        createdBy: "rw3biz-sistem",
      })
      .returning();
    const [u] = await tx
      .update(rw3bizRazia)
      .set({ dendaStatus: "lunas", tanggalBayar: tanggal, pembayarNama: pembayar, kasRwId: kas.id })
      .where(eq(rw3bizRazia.id, id))
      .returning();
    return { ...u, nomorKwitansi: nomorKwitansiRazia(u.id, tanggal) };
  });
}

export async function batalBayarDenda(id: number) {
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(rw3bizRazia).where(eq(rw3bizRazia.id, id)).for("update");
    if (!r) throw new Error("Temuan razia tidak ditemukan");
    if (r.dendaStatus !== "lunas") throw new Error("Denda belum dibayar");
    if (r.kasRwId) await tx.delete(kasRw).where(eq(kasRw.id, r.kasRwId));
    const [u] = await tx
      .update(rw3bizRazia)
      .set({ dendaStatus: "belum", tanggalBayar: null, pembayarNama: null, kasRwId: null })
      .where(eq(rw3bizRazia.id, id))
      .returning();
    return u;
  });
}

export async function bebaskanDenda(id: number, alasan: string, admin: string) {
  if (alasan.trim().length < 3) throw new Error("Alasan pembebasan wajib diisi");
  const [r] = await db.select().from(rw3bizRazia).where(eq(rw3bizRazia.id, id));
  if (!r) throw new Error("Temuan razia tidak ditemukan");
  if (r.dendaStatus === "lunas") throw new Error("Denda sudah dibayar — batalkan pembayaran dulu");
  const [u] = await db
    .update(rw3bizRazia)
    .set({ dendaStatus: "dibebaskan", alasanBebas: `${alasan.trim()} (${admin})` })
    .where(eq(rw3bizRazia.id, id))
    .returning();
  return u;
}

export async function hapusRazia(id: number) {
  const [r] = await db.select().from(rw3bizRazia).where(eq(rw3bizRazia.id, id));
  if (!r) throw new Error("Temuan razia tidak ditemukan");
  if (r.dendaStatus === "lunas") throw new Error("Denda sudah dibayar — batalkan pembayaran dulu");
  await db.delete(rw3bizRazia).where(eq(rw3bizRazia.id, id));
}

/** Setelah perpanjang/perbarui data disetujui, temuan "tidak terdaftar" usaha itu dianggap ditindaklanjuti. */
export async function tandaiRaziaSelesai(tx: Tx, usahaId: number) {
  await tx
    .update(rw3bizRazia)
    .set({ selesai: true })
    .where(and(eq(rw3bizRazia.usahaId, usahaId), eq(rw3bizRazia.selesai, false)));
}

/** Ringkasan temuan untuk halaman status publik. */
export async function raziaUntukUsaha(usahaId: number) {
  const rows = await db
    .select()
    .from(rw3bizRazia)
    .where(eq(rw3bizRazia.usahaId, usahaId))
    .orderBy(desc(rw3bizRazia.tanggal), desc(rw3bizRazia.id))
    .limit(30);
  return rows.map((r) => ({
    id: r.id,
    tanggal: r.tanggal,
    plat: r.plat,
    jenis: labelJenis(r.jenis),
    hasil: r.hasil,
    hasilLabel: HASIL_RAZIA_LABEL[r.hasil as HasilRazia] ?? r.hasil,
    keterangan: r.keteranganHasil,
    denda: r.denda,
    dendaStatus: r.dendaStatus,
    selesai: r.selesai,
    nomorKwitansi: r.dendaStatus === "lunas" && r.tanggalBayar ? nomorKwitansiRazia(r.id, r.tanggalBayar) : null,
  }));
}

export async function getDataKwitansiRazia(id: number) {
  const [row] = await db
    .select({ razia: rw3bizRazia, usaha: rw3bizUsaha })
    .from(rw3bizRazia)
    .leftJoin(rw3bizUsaha, eq(rw3bizRazia.usahaId, rw3bizUsaha.id))
    .where(eq(rw3bizRazia.id, id))
    .limit(1);
  if (!row || row.razia.dendaStatus !== "lunas" || !row.razia.tanggalBayar) return null;
  return row;
}
