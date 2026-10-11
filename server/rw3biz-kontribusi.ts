import { z } from "zod";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  kartuKeluarga,
  kasRw,
  rw3bizKeberatan,
  rw3bizOrang,
  rw3bizPembayaran,
  rw3bizSettings,
  rw3bizTagihan,
  rw3bizUsaha,
  warga,
  type Rw3bizUsaha,
} from "@shared/schema";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { tandaiRaziaSelesai } from "./rw3biz-razia";
import {
  ASAL_ORANG_BIZ,
  JENIS_TEMPAT_BIZ,
  KATEGORI_KAS_DENDA_PELANGGARAN,
  KATEGORI_KAS_DENDA_RAZIA,
  KATEGORI_KAS_KONTRIBUSI,
  KATEGORI_KAS_VOUCHER,
  KERINGANAN_JENIS,
  hitungSurplusVoucher,
  OPERASIONAL_MALAM,
  PERAN_ORANG_BIZ,
  RENTANG_OMZET,
  RENTANG_OMZET_TENGAH,
  STATUS_TEMPAT_BIZ,
  alokasiKePos,
  bulanIni,
  cariFaktorTarget,
  hitungKontribusiRw3biz,
  jatuhTempo,
  nomorKwitansi,
  nominalTagihan,
  parseTarifKontribusi,
  penyesuaianPeriode,
  selisihBulan,
  tambahBulan,
  type HasilKontribusi,
  type InputKontribusi,
  type JenisTempatBiz,
  type RentangOmzet,
  type TarifKontribusi,
} from "@shared/rw3biz-kontribusi";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = typeof db | Tx;

const KEY_CONFIG = "kontribusi_config";
const PERIODE_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type RincianTersimpan = { input: InputKontribusi; hasil: HasilKontribusi };

export function parseRincianTersimpan(raw: string | null | undefined): RincianTersimpan | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as RincianTersimpan;
    return o?.input && o?.hasil ? o : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Tarif

export async function loadTarif(): Promise<TarifKontribusi> {
  const [row] = await db.select().from(rw3bizSettings).where(eq(rw3bizSettings.key, KEY_CONFIG)).limit(1);
  const tarif = parseTarifKontribusi(row?.value);
  if (!tarif.programMulai) {
    tarif.programMulai = bulanIni();
    await simpanTarifMentah(tarif);
  }
  return tarif;
}

async function simpanTarifMentah(tarif: TarifKontribusi) {
  await db
    .insert(rw3bizSettings)
    .values({
      key: KEY_CONFIG,
      value: JSON.stringify(tarif),
      label: "Tarif kontribusi & pos anggaran RW3BIZ",
      keterangan: "Dipakai rumus shared/rw3biz-kontribusi.ts",
    })
    .onConflictDoUpdate({
      target: rw3bizSettings.key,
      set: { value: JSON.stringify(tarif), updatedAt: new Date() },
    });
}

export async function simpanTarif(raw: unknown): Promise<TarifKontribusi> {
  const tarif = parseTarifKontribusi(JSON.stringify(raw ?? {}));
  if (!tarif.programMulai) tarif.programMulai = (await loadTarif()).programMulai;
  await simpanTarifMentah(tarif);
  return tarif;
}

export async function kategoriKas(): Promise<{ pemasukan: string[]; pengeluaran: string[] }> {
  const tarif = await loadTarif();
  return {
    pemasukan: [KATEGORI_KAS_KONTRIBUSI, KATEGORI_KAS_DENDA_RAZIA, KATEGORI_KAS_DENDA_PELANGGARAN, "Iuran Warga", "Donasi", "Sumbangan", "Lainnya"],
    pengeluaran: [...tarif.posAnggaran.map((p) => p.label), KATEGORI_KAS_VOUCHER, "Lainnya"],
  };
}

// ---------------------------------------------------------------- Data usaha & orang

export const dataUsahaSchema = z.object({
  jenisTempatUsaha: z.enum(JENIS_TEMPAT_BIZ),
  statusTempat: z.enum(STATUS_TEMPAT_BIZ),
  luasM2: z.number().int().min(0).max(100_000),
  hariOperasional: z.number().int().min(1).max(7),
  rentangOmzet: z.enum(RENTANG_OMZET),
  operasionalMalam: z.enum(OPERASIONAL_MALAM),
  sampahKantongHari: z.number().int().min(0).max(500),
  pakaiBahuJalan: z.boolean(),
  kendaraanMotor: z.number().int().min(0).max(200),
  kendaraanMobil: z.number().int().min(0).max(200),
  kendaraanKolbak: z.number().int().min(0).max(200).default(0),
  kendaraanTruk: z.number().int().min(0).max(200).default(0),
  kendaraanTrukBesar: z.number().int().min(0).max(200).default(0),
  kendaraanOperasional: z.array(z.string().trim().min(1).max(20)).max(400).default([]),
  charterKolbak: z.number().int().min(0).max(100).default(0),
  charterTruk: z.number().int().min(0).max(100).default(0),
  charterTrukBesar: z.number().int().min(0).max(100).default(0),
  charterPenyedia: z.string().trim().max(200).optional().nullable(),
  usahaBaru: z.boolean(),
});
export type DataUsaha = z.infer<typeof dataUsahaSchema>;

export const orangKontribusiSchema = z.object({
  peran: z.enum(PERAN_ORANG_BIZ),
  asal: z.enum(ASAL_ORANG_BIZ),
  domisili: z.string().trim().max(300).optional().nullable(),
});

export const koreksiSurveySchema = dataUsahaSchema.partial().extend({
  orang: z
    .array(z.object({ id: z.number().int(), peran: z.enum(PERAN_ORANG_BIZ).optional(), asal: z.enum(ASAL_ORANG_BIZ).optional() }))
    .optional(),
});
export type KoreksiSurvey = z.infer<typeof koreksiSurveySchema>;

export function kolomDataUsaha(d: DataUsaha) {
  return {
    statusTempat: d.statusTempat,
    luasM2: d.luasM2,
    hariOperasional: d.hariOperasional,
    rentangOmzet: d.rentangOmzet,
    operasionalMalam: d.operasionalMalam,
    sampahKantongHari: d.sampahKantongHari,
    pakaiBahuJalan: d.pakaiBahuJalan,
    kendaraanMotor: d.kendaraanMotor,
    kendaraanMobil: d.kendaraanMobil,
    kendaraanKolbak: d.kendaraanKolbak ?? 0,
    kendaraanTruk: d.kendaraanTruk ?? 0,
    kendaraanTrukBesar: d.kendaraanTrukBesar ?? 0,
    kendaraanOperasional: JSON.stringify(d.kendaraanOperasional ?? []),
    charterKolbak: d.charterKolbak ?? 0,
    charterTruk: d.charterTruk ?? 0,
    charterTrukBesar: d.charterTrukBesar ?? 0,
    charterPenyedia: d.charterPenyedia?.trim() || null,
    usahaBaru: d.usahaBaru,
  };
}

/** Bentuk kembali DataUsaha dari baris pengajuan/usaha (kolom bisa null untuk data lama). */
export function dataUsahaDariBaris(row: {
  jenisTempatUsaha: string | null;
  statusTempat: string | null;
  luasM2: number | null;
  hariOperasional: number | null;
  rentangOmzet: string | null;
  operasionalMalam: string | null;
  sampahKantongHari: number | null;
  pakaiBahuJalan: boolean;
  kendaraanMotor: number;
  kendaraanMobil: number;
  kendaraanKolbak?: number | null;
  kendaraanTruk?: number | null;
  kendaraanTrukBesar?: number | null;
  kendaraanOperasional: string | null;
  charterKolbak?: number | null;
  charterTruk?: number | null;
  charterTrukBesar?: number | null;
  charterPenyedia?: string | null;
  usahaBaru: boolean;
}): DataUsaha {
  let plat: string[] = [];
  try {
    const p = JSON.parse(row.kendaraanOperasional ?? "[]");
    if (Array.isArray(p)) plat = p.map(String);
  } catch {
    plat = [];
  }
  const pilih = <T extends string>(v: string | null, opsi: readonly T[], fallback: T): T =>
    (opsi as readonly string[]).includes(String(v)) ? (v as T) : fallback;
  return {
    jenisTempatUsaha: pilih(row.jenisTempatUsaha, JENIS_TEMPAT_BIZ, "lainnya"),
    statusTempat: pilih(row.statusTempat, STATUS_TEMPAT_BIZ, "milik"),
    luasM2: row.luasM2 ?? 0,
    hariOperasional: row.hariOperasional ?? 7,
    rentangOmzet: pilih(row.rentangOmzet, RENTANG_OMZET, "lt3"),
    operasionalMalam: pilih(row.operasionalMalam, OPERASIONAL_MALAM, "tidak"),
    sampahKantongHari: row.sampahKantongHari ?? 0,
    pakaiBahuJalan: row.pakaiBahuJalan,
    kendaraanMotor: row.kendaraanMotor,
    kendaraanMobil: row.kendaraanMobil,
    kendaraanKolbak: row.kendaraanKolbak ?? 0,
    kendaraanTruk: row.kendaraanTruk ?? 0,
    kendaraanTrukBesar: row.kendaraanTrukBesar ?? 0,
    kendaraanOperasional: plat,
    charterKolbak: row.charterKolbak ?? 0,
    charterTruk: row.charterTruk ?? 0,
    charterTrukBesar: row.charterTrukBesar ?? 0,
    charterPenyedia: row.charterPenyedia ?? null,
    usahaBaru: row.usahaBaru,
  };
}

function digitNik(nik?: string | null): string {
  return String(nik ?? "").replace(/\D/g, "");
}

export type InfoWargaRw3 = {
  wargaId: number;
  penerimaBansos: boolean;
  lansia: boolean;
  disabilitas: boolean;
};

function umurTahun(tanggalLahir: string | null | undefined): number {
  const t = Date.parse(String(tanggalLahir ?? ""));
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
}

/** Cocokkan NIK ke warga aktif RT 01–04. Kolom warga.lansia belum ada di semua database — umur dihitung dari tanggal lahir. */
export async function cocokkanWargaRw3(niks: (string | null | undefined)[], q: DbLike = db): Promise<Map<string, InfoWargaRw3>> {
  const bersih = Array.from(new Set(niks.map(digitNik).filter((n) => n.length === 16)));
  const hasil = new Map<string, InfoWargaRw3>();
  if (!bersih.length) return hasil;
  const rows = await q
    .select({
      id: warga.id,
      nik: warga.nik,
      tanggalLahir: warga.tanggalLahir,
      disabilitas: warga.statusDisabilitas,
      bansos: kartuKeluarga.penerimaBansos,
      status: warga.statusKependudukan,
      rt: kartuKeluarga.rt,
    })
    .from(warga)
    .innerJoin(kartuKeluarga, eq(warga.kkId, kartuKeluarga.id))
    .where(inArray(warga.nik, bersih));
  for (const r of rows) {
    if (r.status !== "Aktif" || !(ACTIVE_RT_NUMBERS as readonly number[]).includes(r.rt)) continue;
    hasil.set(r.nik, {
      wargaId: r.id,
      penerimaBansos: Boolean(r.bansos),
      lansia: umurTahun(r.tanggalLahir) >= 60,
      disabilitas: Boolean(r.disabilitas && r.disabilitas !== "Tidak Ada"),
    });
  }
  return hasil;
}

export function hitungRincian(
  data: DataUsaha,
  orang: { peran: string | null; asal: string | null; isAnak: boolean }[],
  tarif: TarifKontribusi,
): RincianTersimpan {
  const input: InputKontribusi = {
    jenisTempatUsaha: data.jenisTempatUsaha,
    rentangOmzet: data.rentangOmzet,
    luasM2: data.luasM2,
    operasionalMalam: data.operasionalMalam,
    sampahKantongHari: data.sampahKantongHari,
    pakaiBahuJalan: data.pakaiBahuJalan,
    kendaraanMotor: data.kendaraanMotor,
    kendaraanMobil: data.kendaraanMobil,
    kendaraanKolbak: data.kendaraanKolbak ?? 0,
    kendaraanTruk: data.kendaraanTruk ?? 0,
    kendaraanTrukBesar: data.kendaraanTrukBesar ?? 0,
    charterKolbak: data.charterKolbak ?? 0,
    charterTruk: data.charterTruk ?? 0,
    charterTrukBesar: data.charterTrukBesar ?? 0,
    orang: orang.map((o) => ({ peran: o.peran, asal: o.asal, isAnak: o.isAnak })),
  };
  return { input, hasil: hitungKontribusiRw3biz(input, tarif) };
}

export function kolomKontribusi(r: RincianTersimpan) {
  return {
    kontribusiBulanan: r.hasil.total,
    rincianKontribusi: JSON.stringify(r),
    persenPekerjaRw3: r.hasil.persenPekerjaRw3,
  };
}

export async function orangUntukPengajuan(pengajuanId: number | null | undefined, q: DbLike = db) {
  if (!pengajuanId) return [];
  return q.select().from(rw3bizOrang).where(eq(rw3bizOrang.pengajuanId, pengajuanId)).orderBy(asc(rw3bizOrang.urutan));
}

// ---------------------------------------------------------------- Tagihan

function periodeDariTanggal(tanggal: string): string {
  return tanggal.slice(0, 7);
}

export function tentukanTahapTransisi(periodeMulai: string, tarif: TarifKontribusi): string | null {
  if (!tarif.programMulai) return null;
  const ke = selisihBulan(tarif.programMulai, periodeMulai);
  return ke < tarif.transisiPersen.length ? tarif.programMulai : null;
}

function hitungTagihanUsaha(usaha: Rw3bizUsaha, periode: string, potonganTerminPersen: number, tarif: TarifKontribusi) {
  const kontribusi = usaha.kontribusiBulanan ?? 0;
  const p = penyesuaianPeriode({
    periode,
    periodeMulaiUsaha: usaha.periodeTagihanMulai ?? periode,
    usahaBaru: usaha.usahaBaru,
    tahapTransisiMulai: usaha.tahapTransisiMulai,
    keringananPersen: usaha.keringananPersen,
    keringananSampai: usaha.keringananSampai,
    tarif,
  });
  const catatan = [...p.catatan];
  if (potonganTerminPersen > 0 && p.persenBayar > 0) catatan.push(`Potongan bayar di muka ${potonganTerminPersen}%`);
  const jumlah = nominalTagihan(kontribusi, p.persenBayar, potonganTerminPersen, tarif);
  return { kontribusi, jumlah, catatan, status: jumlah === 0 ? "dibebaskan" : "belum" };
}

/** Buat/perbarui tagihan untuk periode-periode tertentu; tagihan yang sudah ada pembayaran tidak diubah. */
export async function tulisTagihan(
  q: DbLike,
  usaha: Rw3bizUsaha,
  periodeList: string[],
  potonganTerminPersen: number,
  tarif: TarifKontribusi,
) {
  for (const periode of periodeList) {
    const t = hitungTagihanUsaha(usaha, periode, potonganTerminPersen, tarif);
    await q
      .insert(rw3bizTagihan)
      .values({
        usahaId: usaha.id,
        periode,
        kontribusiBulanan: t.kontribusi,
        jumlah: t.jumlah,
        status: t.status,
        catatan: JSON.stringify(t.catatan),
      })
      .onConflictDoUpdate({
        target: [rw3bizTagihan.usahaId, rw3bizTagihan.periode],
        set: {
          kontribusiBulanan: t.kontribusi,
          jumlah: t.jumlah,
          status: t.status,
          catatan: JSON.stringify(t.catatan),
        },
        setWhere: sql`${rw3bizTagihan.terbayar} = 0 AND ${rw3bizTagihan.status} IN ('belum', 'dibebaskan')`,
      });
  }
}

/** Tagihan awal saat usaha disetujui / diperpanjang: termin bulan dari tanggal bayar. */
export async function buatTagihanTermin(q: DbLike, usaha: Rw3bizUsaha, tanggalBayar: string, terminBulan: number, tarif: TarifKontribusi) {
  const mulai = periodeDariTanggal(tanggalBayar);
  const periode = Array.from({ length: Math.max(1, terminBulan) }, (_, i) => tambahBulan(mulai, i));
  const potongan = terminBulan > 1 ? tarif.potonganTermin[String(terminBulan)] ?? 0 : 0;
  await tulisTagihan(q, usaha, periode, potongan, tarif);
}

/** Pastikan setiap usaha aktif punya tagihan untuk periode ini (idempoten). */
export async function pastikanTagihanPeriode(periode: string, tarif?: TarifKontribusi) {
  if (!PERIODE_REGEX.test(periode)) throw new Error("Periode tidak valid (YYYY-MM)");
  const t = tarif ?? (await loadTarif());
  const usahaAktif = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.status, "aktif"));
  const sudah = await db
    .select({ usahaId: rw3bizTagihan.usahaId })
    .from(rw3bizTagihan)
    .where(eq(rw3bizTagihan.periode, periode));
  const ada = new Set(sudah.map((s) => s.usahaId));
  for (const u of usahaAktif) {
    if (ada.has(u.id) || u.kontribusiBulanan == null) continue;
    if (u.periodeTagihanMulai && periode < u.periodeTagihanMulai) continue;
    await tulisTagihan(db, u, [periode], 0, t);
  }
}

export async function listTagihan(periode: string, status?: string) {
  const tarif = await loadTarif();
  if (periode <= bulanIni()) await pastikanTagihanPeriode(periode, tarif);
  const kondisi = [eq(rw3bizTagihan.periode, periode)];
  if (status && status !== "semua") kondisi.push(eq(rw3bizTagihan.status, status));
  const rows = await db
    .select({
      tagihan: rw3bizTagihan,
      usaha: {
        id: rw3bizUsaha.id,
        nomorBiz: rw3bizUsaha.nomorBiz,
        nomorInduk: rw3bizUsaha.nomorInduk,
        namaUsaha: rw3bizUsaha.namaUsaha,
        rt: rw3bizUsaha.rt,
        pjNama: rw3bizUsaha.pjNama,
        pjNomorWhatsapp: rw3bizUsaha.pjNomorWhatsapp,
        jenisTempatUsaha: rw3bizUsaha.jenisTempatUsaha,
      },
    })
    .from(rw3bizTagihan)
    .innerJoin(rw3bizUsaha, eq(rw3bizTagihan.usahaId, rw3bizUsaha.id))
    .where(and(...kondisi))
    .orderBy(asc(rw3bizUsaha.namaUsaha));
  const hariIni = new Date().toISOString().slice(0, 10);
  const tempo = jatuhTempo(periode, tarif);
  const bayar = await pembayaranUntukTagihan(rows.map((r) => r.tagihan.id));
  return rows.map((r) => ({
    ...r.tagihan,
    catatan: parseCatatan(r.tagihan.catatan),
    jatuhTempo: tempo,
    telat: (r.tagihan.status === "belum" || r.tagihan.status === "sebagian") && hariIni > tempo,
    usaha: r.usaha,
    pembayaran: bayar.get(r.tagihan.id) ?? [],
  }));
}

function parseCatatan(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export const bayarSchema = z.object({
  jumlah: z.number().int().positive("Jumlah bayar harus lebih dari 0"),
  tanggal: z.string().regex(DATE_REGEX),
});

export async function bayarTagihan(tagihanId: number, input: z.infer<typeof bayarSchema>, admin: string) {
  const { jumlah, tanggal } = bayarSchema.parse(input);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ tagihan: rw3bizTagihan, usaha: rw3bizUsaha })
      .from(rw3bizTagihan)
      .innerJoin(rw3bizUsaha, eq(rw3bizTagihan.usahaId, rw3bizUsaha.id))
      .where(eq(rw3bizTagihan.id, tagihanId))
      .for("update");
    if (!row) throw new Error("Tagihan tidak ditemukan");
    const { tagihan, usaha } = row;
    if (tagihan.status === "lunas" || tagihan.status === "dibebaskan") throw new Error("Tagihan sudah lunas / dibebaskan");
    const sisa = tagihan.jumlah - tagihan.terbayar;
    if (jumlah > sisa) throw new Error(`Jumlah melebihi sisa tagihan (Rp${sisa.toLocaleString("id-ID")})`);
    const terbayar = tagihan.terbayar + jumlah;
    const lunas = terbayar >= tagihan.jumlah;
    const [kas] = await tx
      .insert(kasRw)
      .values({
        tipe: "pemasukan",
        kategori: KATEGORI_KAS_KONTRIBUSI,
        jumlah,
        keterangan: `${usaha.nomorInduk ?? usaha.nomorBiz} ${usaha.namaUsaha} — periode ${tagihan.periode}${lunas ? "" : " (cicilan)"}`,
        tanggal,
        createdBy: "rw3biz-sistem",
      })
      .returning();
    const [bayar] = await tx
      .insert(rw3bizPembayaran)
      .values({ tagihanId, jumlah, tanggal, kasRwId: kas.id, dicatatOleh: admin })
      .returning({ id: rw3bizPembayaran.id });
    const [updated] = await tx
      .update(rw3bizTagihan)
      .set({ terbayar, status: lunas ? "lunas" : "sebagian", tanggalBayar: tanggal, dicatatOleh: admin })
      .where(eq(rw3bizTagihan.id, tagihanId))
      .returning();
    return { ...updated, pembayaranId: bayar.id, nomorKwitansi: nomorKwitansi(bayar.id, tanggal) };
  });
}

export async function batalkanPembayaran(tagihanId: number) {
  return db.transaction(async (tx) => {
    const bayar = await tx.select().from(rw3bizPembayaran).where(eq(rw3bizPembayaran.tagihanId, tagihanId));
    const kasIds = bayar.map((b) => b.kasRwId).filter((x): x is number => x != null);
    await tx.delete(rw3bizPembayaran).where(eq(rw3bizPembayaran.tagihanId, tagihanId));
    if (kasIds.length) await tx.delete(kasRw).where(inArray(kasRw.id, kasIds));
    const [t] = await tx
      .update(rw3bizTagihan)
      .set({ terbayar: 0, tanggalBayar: null, status: sql`CASE WHEN ${rw3bizTagihan.jumlah} = 0 THEN 'dibebaskan' ELSE 'belum' END` })
      .where(eq(rw3bizTagihan.id, tagihanId))
      .returning();
    if (!t) throw new Error("Tagihan tidak ditemukan");
    return t;
  });
}

export async function bebaskanTagihan(tagihanId: number, alasan: string, admin: string) {
  const [t] = await db.select().from(rw3bizTagihan).where(eq(rw3bizTagihan.id, tagihanId));
  if (!t) throw new Error("Tagihan tidak ditemukan");
  if (t.terbayar > 0) throw new Error("Tagihan sudah ada pembayaran — batalkan pembayaran dulu");
  const catatan = [...parseCatatan(t.catatan), `Dibebaskan admin: ${alasan.trim()}`];
  const [u] = await db
    .update(rw3bizTagihan)
    .set({ status: "dibebaskan", jumlah: 0, catatan: JSON.stringify(catatan), dicatatOleh: admin })
    .where(eq(rw3bizTagihan.id, tagihanId))
    .returning();
  return u;
}

// ---------------------------------------------------------------- Ubah kontribusi usaha (survey ulang / keberatan / keringanan)

export const keringananSchema = z
  .object({
    jenis: z.enum(KERINGANAN_JENIS),
    persen: z.union([z.literal(50), z.literal(100)]),
    sampai: z.string().regex(DATE_REGEX),
    alasan: z.string().trim().min(3, "Alasan keringanan wajib diisi"),
  })
  .nullable();

export const ubahUsahaSchema = z.object({
  koreksi: koreksiSurveySchema.optional(),
  keringanan: keringananSchema.optional(),
});

export async function ubahKontribusiUsaha(usahaId: number, input: z.infer<typeof ubahUsahaSchema>) {
  const parsed = ubahUsahaSchema.parse(input);
  const tarif = await loadTarif();
  return db.transaction(async (tx) => {
    const [usaha] = await tx.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, usahaId));
    if (!usaha) throw new Error("Usaha tidak ditemukan");
    const lama = parseRincianTersimpan(usaha.rincianKontribusi);
    const data = { ...dataUsahaDariBaris(usaha), ...stripUndefined(parsed.koreksi ?? {}) } as DataUsaha;
    let orangInput = lama?.input.orang.map((o) => ({ peran: String(o.peran ?? ""), asal: String(o.asal ?? ""), isAnak: Boolean(o.isAnak) })) ?? [];
    const orangRows = await orangUntukPengajuan(usaha.pengajuanId, tx);
    if (orangRows.length) {
      for (const k of parsed.koreksi?.orang ?? []) {
        const set: Record<string, string> = {};
        if (k.peran) set.peran = k.peran;
        if (k.asal) set.asal = k.asal;
        if (Object.keys(set).length) {
          await tx.update(rw3bizOrang).set(set).where(and(eq(rw3bizOrang.id, k.id), eq(rw3bizOrang.pengajuanId, usaha.pengajuanId!)));
        }
      }
      const segar = await orangUntukPengajuan(usaha.pengajuanId, tx);
      orangInput = segar.map((o) => ({ peran: o.peran, asal: o.asal, isAnak: o.isAnak })) as typeof orangInput;
    }
    const rincian = hitungRincian(data, orangInput, tarif);
    const set: Partial<typeof rw3bizUsaha.$inferInsert> = {
      jenisTempatUsaha: data.jenisTempatUsaha,
      ...kolomDataUsaha(data),
      ...kolomKontribusi(rincian),
    };
    if (parsed.keringanan !== undefined) {
      set.keringananJenis = parsed.keringanan?.jenis ?? null;
      set.keringananPersen = parsed.keringanan?.persen ?? null;
      set.keringananSampai = parsed.keringanan?.sampai ?? null;
      set.keringananAlasan = parsed.keringanan?.alasan ?? null;
    }
    const [updated] = await tx.update(rw3bizUsaha).set(set).where(eq(rw3bizUsaha.id, usahaId)).returning();
    if (parsed.koreksi) await tandaiRaziaSelesai(tx, usahaId);
    const belumDibayar = await tx
      .select({ periode: rw3bizTagihan.periode })
      .from(rw3bizTagihan)
      .where(and(eq(rw3bizTagihan.usahaId, usahaId), eq(rw3bizTagihan.terbayar, 0), sql`${rw3bizTagihan.periode} >= ${bulanIni()}`));
    await tulisTagihan(tx, updated, belumDibayar.map((b) => b.periode), 0, tarif);
    return { usaha: updated, rincian };
  });
}

function stripUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  const { orang: _o, ...rest } = o as T & { orang?: unknown };
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) as Partial<T>;
}

// ---------------------------------------------------------------- Keberatan

function digitWa(nomor?: string | null): string {
  const d = String(nomor ?? "").replace(/\D/g, "");
  return d.startsWith("62") ? `0${d.slice(2)}` : d;
}

export const keberatanPublikSchema = z.object({
  nomorBiz: z.string().trim().min(8),
  nomorWhatsapp: z.string().trim().min(8),
  alasan: z.string().trim().min(10, "Jelaskan alasan minimal 10 karakter").max(2000),
});

export async function ajukanKeberatan(input: z.infer<typeof keberatanPublikSchema>) {
  const p = keberatanPublikSchema.parse(input);
  const nomor = p.nomorBiz.toUpperCase();
  const [usaha] = await db
    .select()
    .from(rw3bizUsaha)
    .where(or(eq(rw3bizUsaha.nomorInduk, nomor), eq(rw3bizUsaha.nomorBiz, nomor)))
    .limit(1);
  if (!usaha) throw new Error("Nomor induk / nomor RW3BIZ tidak ditemukan atau belum disetujui");
  if (digitWa(usaha.pjNomorWhatsapp) !== digitWa(p.nomorWhatsapp)) {
    throw new Error("Nomor WhatsApp tidak cocok dengan penanggung jawab usaha");
  }
  const [masih] = await db
    .select({ id: rw3bizKeberatan.id })
    .from(rw3bizKeberatan)
    .where(and(eq(rw3bizKeberatan.usahaId, usaha.id), eq(rw3bizKeberatan.status, "menunggu")))
    .limit(1);
  if (masih) throw new Error("Masih ada pengajuan peninjauan yang menunggu tanggapan");
  const [row] = await db.insert(rw3bizKeberatan).values({ usahaId: usaha.id, alasan: p.alasan }).returning();
  return row;
}

export async function listKeberatan(status?: string) {
  const q = db
    .select({
      keberatan: rw3bizKeberatan,
      usaha: {
        id: rw3bizUsaha.id,
        nomorBiz: rw3bizUsaha.nomorBiz,
        namaUsaha: rw3bizUsaha.namaUsaha,
        pjNama: rw3bizUsaha.pjNama,
        pjNomorWhatsapp: rw3bizUsaha.pjNomorWhatsapp,
        kontribusiBulanan: rw3bizUsaha.kontribusiBulanan,
      },
    })
    .from(rw3bizKeberatan)
    .innerJoin(rw3bizUsaha, eq(rw3bizKeberatan.usahaId, rw3bizUsaha.id))
    .orderBy(desc(rw3bizKeberatan.createdAt));
  const rows = status && status !== "semua" ? await q.where(eq(rw3bizKeberatan.status, status)) : await q;
  return rows.map((r) => ({ ...r.keberatan, usaha: r.usaha }));
}

export const tanggapiKeberatanSchema = z.object({
  status: z.enum(["diterima", "ditolak"]),
  tanggapan: z.string().trim().min(3, "Tanggapan wajib diisi"),
});

export async function tanggapiKeberatan(id: number, input: z.infer<typeof tanggapiKeberatanSchema>, admin: string) {
  const p = tanggapiKeberatanSchema.parse(input);
  const [row] = await db
    .update(rw3bizKeberatan)
    .set({ status: p.status, tanggapanAdmin: p.tanggapan, ditinjauOleh: admin })
    .where(and(eq(rw3bizKeberatan.id, id), eq(rw3bizKeberatan.status, "menunggu")))
    .returning();
  if (!row) throw new Error("Keberatan tidak ditemukan atau sudah ditanggapi");
  return row;
}

// ---------------------------------------------------------------- RAB & transparansi

async function kasBulan(periode: string) {
  return db.select().from(kasRw).where(like(kasRw.tanggal, `${periode}%`));
}

export async function rabBulan(periode: string) {
  if (!PERIODE_REGEX.test(periode)) throw new Error("Periode tidak valid (YYYY-MM)");
  const tarif = await loadTarif();
  if (periode <= bulanIni()) await pastikanTagihanPeriode(periode, tarif);

  const usahaAktif = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.status, "aktif"));
  const terhitung = usahaAktif.filter((u) => u.kontribusiBulanan != null);
  const proyeksiPenuh = terhitung.reduce((s, u) => s + (u.kontribusiBulanan ?? 0), 0);

  const tagihan = await db.select().from(rw3bizTagihan).where(eq(rw3bizTagihan.periode, periode));
  const ditagih = tagihan.reduce((s, t) => s + t.jumlah, 0);
  const terbayarTagihan = tagihan.reduce((s, t) => s + t.terbayar, 0);

  const kas = await kasBulan(periode);
  const realisasiKontribusi = kas
    .filter((k) => k.tipe === "pemasukan" && k.kategori === KATEGORI_KAS_KONTRIBUSI)
    .reduce((s, k) => s + k.jumlah, 0);
  const pemasukanLain = kas
    .filter((k) => k.tipe === "pemasukan" && k.kategori !== KATEGORI_KAS_KONTRIBUSI)
    .reduce((s, k) => s + k.jumlah, 0);
  const voucher = ringkasVoucher(kas, tarif.targetBulanan);
  const pengeluaran = kas.filter((k) => k.tipe === "pengeluaran");
  const pos = tarif.posAnggaran.map((p) => ({
    ...p,
    realisasi: pengeluaran.filter((k) => k.kategori === p.label).reduce((s, k) => s + k.jumlah, 0),
  }));
  const labelPos = new Set(tarif.posAnggaran.map((p) => p.label));
  const pengeluaranLain = pengeluaran
    .filter((k) => !labelPos.has(k.kategori) && k.kategori !== KATEGORI_KAS_VOUCHER)
    .reduce((s, k) => s + k.jumlah, 0);

  let jumlahPekerja = 0;
  let pekerjaRw3 = 0;
  const inputs: InputKontribusi[] = [];
  const perKategori = new Map<string, { jumlah: number; total: number; min: number; max: number; beban: number }>();
  for (const u of terhitung) {
    const r = parseRincianTersimpan(u.rincianKontribusi);
    if (r) {
      jumlahPekerja += r.hasil.jumlahPekerja;
      pekerjaRw3 += r.hasil.pekerjaRw3;
      inputs.push(r.input);
    }
    const jenis = (u.jenisTempatUsaha ?? "lainnya") as JenisTempatBiz;
    const k = u.kontribusiBulanan ?? 0;
    const omzet = RENTANG_OMZET_TENGAH[(u.rentangOmzet ?? "lt3") as RentangOmzet] ?? RENTANG_OMZET_TENGAH.lt3;
    const cur = perKategori.get(jenis) ?? { jumlah: 0, total: 0, min: Infinity, max: 0, beban: 0 };
    cur.jumlah += 1;
    cur.total += k;
    cur.min = Math.min(cur.min, k);
    cur.max = Math.max(cur.max, k);
    cur.beban += (k / omzet) * 100;
    perKategori.set(jenis, cur);
  }
  const sebaran = Array.from(perKategori.entries()).map(([jenis, v]) => ({
    jenis,
    jumlah: v.jumlah,
    rataRata: Math.round(v.total / v.jumlah),
    terendah: v.min === Infinity ? 0 : v.min,
    tertinggi: v.max,
    bebanPersenOmzet: Math.round((v.beban / v.jumlah) * 100) / 100,
  }));
  const bebanUrut = sebaran.map((s) => s.bebanPersenOmzet).sort((a, b) => a - b);
  const median = bebanUrut.length ? bebanUrut[Math.floor(bebanUrut.length / 2)] : 0;
  const sebaranDenganPeringatan = sebaran.map((s) => ({
    ...s,
    terlaluBerat: median > 0 && s.bebanPersenOmzet > median * 2,
  }));

  const proyeksiBertahap = Array.from({ length: 6 }, (_, i) => {
    const p = tambahBulan(periode, i);
    const total = terhitung.reduce((s, u) => {
      if (u.periodeTagihanMulai && p < u.periodeTagihanMulai) return s;
      const adj = penyesuaianPeriode({
        periode: p,
        periodeMulaiUsaha: u.periodeTagihanMulai ?? p,
        usahaBaru: u.usahaBaru,
        tahapTransisiMulai: u.tahapTransisiMulai,
        keringananPersen: u.keringananPersen,
        keringananSampai: u.keringananSampai,
        tarif,
      });
      return s + nominalTagihan(u.kontribusiBulanan ?? 0, adj.persenBayar, 0, tarif);
    }, 0);
    return { periode: p, total };
  });

  const tunggakanRows = await db
    .select({ jumlah: rw3bizTagihan.jumlah, terbayar: rw3bizTagihan.terbayar })
    .from(rw3bizTagihan)
    .where(and(inArray(rw3bizTagihan.status, ["belum", "sebagian"]), sql`${rw3bizTagihan.periode} < ${periode}`));

  return {
    periode,
    target: tarif.targetBulanan,
    totalPos: tarif.posAnggaran.reduce((s, p) => s + p.nominal, 0),
    usahaAktif: usahaAktif.length,
    usahaBelumDihitung: usahaAktif.length - terhitung.length,
    proyeksiPenuh,
    ditagih,
    terbayarTagihan,
    realisasiKontribusi,
    pemasukanLain,
    kekurangan: Math.max(0, tarif.targetBulanan - realisasiKontribusi - voucher.denda),
    voucher,
    pos,
    pengeluaranLain,
    pekerja: {
      total: jumlahPekerja,
      rw3: pekerjaRw3,
      luar: jumlahPekerja - pekerjaRw3,
      persenRw3: jumlahPekerja ? Math.round((pekerjaRw3 / jumlahPekerja) * 100) : 0,
    },
    sebaran: sebaranDenganPeringatan,
    faktor: { sekarang: tarif.faktorPenyesuaian, ...cariFaktorTarget(inputs, tarif, tarif.targetBulanan) },
    proyeksiBertahap,
    tunggakan: {
      jumlahTagihan: tunggakanRows.length,
      nominal: tunggakanRows.reduce((s, t) => s + (t.jumlah - t.terbayar), 0),
    },
    tagihanStatus: {
      belum: tagihan.filter((t) => t.status === "belum").length,
      sebagian: tagihan.filter((t) => t.status === "sebagian").length,
      lunas: tagihan.filter((t) => t.status === "lunas").length,
      dibebaskan: tagihan.filter((t) => t.status === "dibebaskan").length,
    },
  };
}

/** Simulasi proyeksi bulanan penuh untuk tarif usulan (belum disimpan). */
export async function simulasiTarif(raw: unknown) {
  const tarif = parseTarifKontribusi(JSON.stringify(raw ?? {}));
  const usahaAktif = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.status, "aktif"));
  const inputs = usahaAktif
    .map((u) => parseRincianTersimpan(u.rincianKontribusi)?.input)
    .filter((i): i is InputKontribusi => Boolean(i));
  const totals = inputs.map((i) => hitungKontribusiRw3biz(i, tarif).total);
  return {
    jumlahUsaha: inputs.length,
    proyeksi: totals.reduce((s, t) => s + t, 0),
    terendah: totals.length ? Math.min(...totals) : 0,
    tertinggi: totals.length ? Math.max(...totals) : 0,
    rataRata: totals.length ? Math.round(totals.reduce((s, t) => s + t, 0) / totals.length) : 0,
    faktorDisarankan: cariFaktorTarget(inputs, tarif, tarif.targetBulanan),
  };
}

export async function transparansiPublik(periode: string) {
  if (!PERIODE_REGEX.test(periode)) throw new Error("Periode tidak valid (YYYY-MM)");
  const tarif = await loadTarif();
  const kas = await kasBulan(periode);
  const masuk = kas
    .filter((k) => k.tipe === "pemasukan" && k.kategori === KATEGORI_KAS_KONTRIBUSI)
    .reduce((s, k) => s + k.jumlah, 0);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rw3bizUsaha)
    .where(eq(rw3bizUsaha.status, "aktif"));
  return {
    periode,
    target: tarif.targetBulanan,
    kontribusiMasuk: masuk,
    voucher: ringkasVoucher(kas, tarif.targetBulanan),
    usahaAktif: n,
    pos: tarif.posAnggaran.map((p) => ({
      label: p.label,
      keterangan: p.keterangan ?? null,
      anggaran: p.nominal,
      realisasi: kas.filter((k) => k.tipe === "pengeluaran" && k.kategori === p.label).reduce((s, k) => s + k.jumlah, 0),
    })),
    tarif: publikTarif(tarif),
  };
}

function ringkasVoucher(kas: { tipe: string; kategori: string; jumlah: number }[], target: number) {
  const jumlah = (tipe: string, kategori: string[]) =>
    kas.filter((k) => k.tipe === tipe && kategori.includes(k.kategori)).reduce((s, k) => s + k.jumlah, 0);
  const kontribusi = jumlah("pemasukan", [KATEGORI_KAS_KONTRIBUSI]);
  const denda = jumlah("pemasukan", [KATEGORI_KAS_DENDA_RAZIA, KATEGORI_KAS_DENDA_PELANGGARAN]);
  const { terkumpul, surplus } = hitungSurplusVoucher({ kontribusi, denda, target });
  return { kontribusi, denda, terkumpul, surplus, tersalur: jumlah("pengeluaran", [KATEGORI_KAS_VOUCHER]) };
}

/** Subset tarif yang aman ditampilkan publik (rumus lengkap). */
export function publikTarif(tarif: TarifKontribusi) {
  const { programMulai: _p, ...rest } = tarif;
  return rest;
}

export async function tagihanUntukUsaha(usahaId: number) {
  const tarif = await loadTarif();
  const rows = await db
    .select()
    .from(rw3bizTagihan)
    .where(eq(rw3bizTagihan.usahaId, usahaId))
    .orderBy(desc(rw3bizTagihan.periode))
    .limit(24);
  const hariIni = new Date().toISOString().slice(0, 10);
  const bayar = await pembayaranUntukTagihan(rows.map((t) => t.id));
  return rows.map((t) => {
    const tempo = jatuhTempo(t.periode, tarif);
    return {
      id: t.id,
      periode: t.periode,
      jumlah: t.jumlah,
      terbayar: t.terbayar,
      status: t.status,
      catatan: parseCatatan(t.catatan),
      jatuhTempo: tempo,
      telat: (t.status === "belum" || t.status === "sebagian") && hariIni > tempo,
      pembayaran: bayar.get(t.id) ?? [],
    };
  });
}

/** Pembayaran per tagihan, lengkap dengan nomor kwitansi. */
async function pembayaranUntukTagihan(tagihanIds: number[]) {
  const peta = new Map<number, { id: number; jumlah: number; tanggal: string; nomorKwitansi: string }[]>();
  if (!tagihanIds.length) return peta;
  const rows = await db
    .select()
    .from(rw3bizPembayaran)
    .where(inArray(rw3bizPembayaran.tagihanId, tagihanIds))
    .orderBy(asc(rw3bizPembayaran.id));
  for (const b of rows) {
    const list = peta.get(b.tagihanId) ?? [];
    list.push({ id: b.id, jumlah: b.jumlah, tanggal: b.tanggal, nomorKwitansi: nomorKwitansi(b.id, b.tanggal) });
    peta.set(b.tagihanId, list);
  }
  return peta;
}

export function alokasiUntuk(total: number, tarif: TarifKontribusi) {
  return alokasiKePos(total, tarif.posAnggaran);
}
