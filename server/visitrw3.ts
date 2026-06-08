import { z } from "zod";
import crypto from "crypto";
import { db, pool } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  pemilikKost,
  visitrw3Pengajuan,
  visitrw3Penghuni,
  wargaSinggah,
  type Visitrw3Pengajuan,
  type Visitrw3Penghuni,
} from "@shared/schema";
import { storage } from "./storage";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { hitungTanggalBerlaku } from "@shared/visitrw3-kontribusi";
import {
  type Visitrw3DashboardStats,
  emptyVisitrw3DashboardStats,
  kelompokUsiaLabel,
  labelIzinProperti,
  labelJumlahPenghuniPengajuan,
  labelJumlahPintuTier,
} from "@shared/visitrw3-analytics";

export { emptyVisitrw3DashboardStats } from "@shared/visitrw3-analytics";
import { seedVisitrw3Settings } from "./visitrw3-settings";

export type { Visitrw3DashboardStats } from "@shared/visitrw3-analytics";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TERMIN_VALUES = [1, 3, 6, 12] as const;

export { hitungTanggalBerlaku } from "@shared/visitrw3-kontribusi";

function hitungUmur(tanggalLahir: string): number {
  const birth = new Date(`${tanggalLahir}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

async function generateNomorVisitrw3(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
    const nomor = `VRW3-${date}-${rand}`;
    const [existing] = await db.select({ id: visitrw3Pengajuan.id }).from(visitrw3Pengajuan).where(eq(visitrw3Pengajuan.nomorVisitrw3, nomor));
    if (!existing) return nomor;
  }
  throw new Error("Gagal membuat nomor Visit RW3");
}

const penghuniInputSchema = z.object({
  namaLengkap: z.string().min(2),
  tanggalLahir: z.string().regex(DATE_REGEX),
  isAnak: z.boolean(),
  nik: z.string().optional().nullable(),
  nomorWhatsapp: z.string().optional().nullable(),
  jenisKelamin: z.string().optional().nullable(),
  pekerjaan: z.string().optional().nullable(),
  keperluanTinggal: z.string().optional().nullable(),
  namaTempatKerja: z.string().optional().nullable(),
  namaSekolah: z.string().optional().nullable(),
  punyaKendaraan: z.boolean().default(false),
  jenisKendaraan: z.string().optional().nullable(),
  platNomor: z.string().optional().nullable(),
  fotoKtpPath: z.string().optional().nullable(),
});

const persetujuanTetanggaSchema = z.object({
  posisi: z.enum(["kanan", "kiri", "depan", "belakang"]),
  slot: z.union([z.literal(1), z.literal(2)]),
  namaWarga: z.string().min(1),
  nomorWhatsapp: z.string().min(8),
});

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const pengajuanBaruSchema = z.object({
  keperluanPengajuan: z.enum(["tinggal", "bisnis"]),
  rt: z.number().int().refine((n) => (ACTIVE_RT_NUMBERS as readonly number[]).includes(n)),
  pemilikKostId: z.number().int().optional().nullable(),
  tinggalDiWilayahRw3: z.boolean().optional().nullable(),
  namaUsaha: z.string().optional().nullable(),
  jenisUsaha: z.string().optional().nullable(),
  jenisTempatUsaha: z.enum(["lapak", "kiosk", "lainnya"]).optional().nullable(),
  jenisTempatUsahaLain: z.string().optional().nullable(),
  jamBuka: z.string().optional().nullable(),
  jamTutup: z.string().optional().nullable(),
  alamatUsaha: z.string().optional().nullable(),
  persetujuanTetangga: z.array(persetujuanTetanggaSchema).optional().nullable(),
  penanggungJawab: z.string().optional().nullable(),
  nomorUnit: z.string().min(1, "Nomor unit/kamar wajib diisi"),
  jumlahPenghuni: z.number().int().min(1).max(20),
  tanggalBayar: z.string().regex(DATE_REGEX),
  terminBulan: z.number().refine((n): n is (typeof TERMIN_VALUES)[number] => TERMIN_VALUES.includes(n as (typeof TERMIN_VALUES)[number])),
  catatanPemohon: z.string().optional().nullable(),
  penghuni: z.array(penghuniInputSchema).min(1),
  setujuTataTertib: z.literal(true, { errorMap: () => ({ message: "Persetujuan syarat wajib" }) }),
});

function validatePersetujuanTetangga(list: z.infer<typeof persetujuanTetanggaSchema>[] | null | undefined) {
  const required = [
    { posisi: "kanan", slot: 1 },
    { posisi: "kanan", slot: 2 },
    { posisi: "kiri", slot: 1 },
    { posisi: "kiri", slot: 2 },
    { posisi: "depan", slot: 1 },
    { posisi: "depan", slot: 2 },
    { posisi: "belakang", slot: 1 },
    { posisi: "belakang", slot: 2 },
  ] as const;
  if (!list || list.length < 8) {
    throw new Error("Persetujuan tetangga wajib: 2 warga kanan, 2 kiri, 2 depan, 2 belakang");
  }
  for (const req of required) {
    const row = list.find((r) => r.posisi === req.posisi && r.slot === req.slot);
    if (!row?.namaWarga?.trim() || !row.nomorWhatsapp?.trim()) {
      throw new Error(`Data warga tetangga ${req.posisi} #${req.slot} wajib diisi`);
    }
  }
}

function validateBisnisFields(parsed: z.infer<typeof pengajuanBaruSchema>) {
  if (!parsed.namaUsaha?.trim()) throw new Error("Nama usaha wajib diisi");
  if (!parsed.penanggungJawab?.trim()) throw new Error("Penanggung jawab wajib diisi");
  if (!parsed.jenisTempatUsaha) throw new Error("Jenis tempat usaha wajib dipilih (lapak, kiosk, atau lainnya)");
  if (parsed.jenisTempatUsaha === "lainnya" && !parsed.jenisTempatUsahaLain?.trim()) {
    throw new Error("Jelaskan jenis usaha lainnya");
  }
  if (parsed.tinggalDiWilayahRw3 === undefined || parsed.tinggalDiWilayahRw3 === null) {
    throw new Error("Pilih apakah tinggal di wilayah RW 03 atau di luar wilayah");
  }
  validatePersetujuanTetangga(parsed.persetujuanTetangga ?? undefined);
  if (parsed.tinggalDiWilayahRw3) {
    if (!parsed.pemilikKostId) throw new Error("Pilih kost/kontrakan tempat tinggal");
  } else {
    if (!parsed.jamBuka?.trim() || !TIME_REGEX.test(parsed.jamBuka)) {
      throw new Error("Jam buka wajib diisi (format HH:MM)");
    }
    if (!parsed.jamTutup?.trim() || !TIME_REGEX.test(parsed.jamTutup)) {
      throw new Error("Jam tutup wajib diisi (format HH:MM)");
    }
    if (!parsed.alamatUsaha?.trim()) throw new Error("Alamat usaha wajib diisi");
  }
}

export const perpanjangSchema = z.object({
  nomorVisitrw3: z.string().min(8),
  tanggalBayar: z.string().regex(DATE_REGEX),
  terminBulan: z.number().refine((n): n is (typeof TERMIN_VALUES)[number] => TERMIN_VALUES.includes(n as (typeof TERMIN_VALUES)[number])),
  catatanPemohon: z.string().optional().nullable(),
  setujuTataTertib: z.literal(true, { errorMap: () => ({ message: "Persetujuan syarat wajib" }) }),
});

export const approveVisitrw3SurveySchema = z.object({
  catatanSurvey: z.string().optional().nullable(),
  kontribusiJumlah: z.number().int().min(0, "Kontribusi wajib diisi (boleh 0 jika gratis)"),
  tanggalKas: z.string().regex(DATE_REGEX, "Tanggal masuk kas wajib"),
  keteranganKas: z.string().optional().nullable(),
});

async function catatKontribusiKeKasRw(params: {
  kontribusiJumlah: number;
  tanggalKas: string;
  keteranganKas: string;
  adminUsername: string;
}) {
  if (params.kontribusiJumlah <= 0) return null;
  const kas = await storage.createKasRw({
    tipe: "pemasukan",
    kategori: "Visit RW3",
    jumlah: params.kontribusiJumlah,
    keterangan: params.keteranganKas,
    tanggal: params.tanggalKas,
    createdBy: params.adminUsername,
  });
  return kas.id;
}

function parseKendaraanFromPenghuni(jenisKendaraan?: string | null, platNomor?: string | null) {
  if (!jenisKendaraan?.trim()) return [];
  try {
    const parsed = JSON.parse(jenisKendaraan) as { jenis?: string; platNomor?: string | null }[];
    if (Array.isArray(parsed)) {
      return parsed.filter((k) => k.jenis?.trim());
    }
  } catch {
    /* satu kendaraan — teks biasa */
  }
  return [{ jenis: jenisKendaraan.trim(), platNomor: platNomor?.trim() || null }];
}

function validatePenghuni(
  penghuni: z.infer<typeof penghuniInputSchema>[],
  keperluan: "tinggal" | "bisnis",
  bisnisLuarWilayah = false,
) {
  if (bisnisLuarWilayah) {
    const dewasa = penghuni.filter((p) => !p.isAnak);
    if (!dewasa.length) throw new Error("Data penanggung jawab wajib diisi");
    const p = dewasa[0];
    if (!p.nik || p.nik.length !== 16) throw new Error("NIK penanggung jawab 16 digit wajib");
    if (!p.nomorWhatsapp?.trim()) throw new Error("Nomor WhatsApp penanggung jawab wajib");
    if (!p.fotoKtpPath?.trim()) throw new Error("Foto KTP penanggung jawab wajib diunggah");
    return;
  }
  if (penghuni.some((p) => !p.isAnak && (!p.nik || p.nik.length !== 16))) {
    throw new Error("NIK 16 digit wajib untuk penghuni dewasa");
  }
  for (const p of penghuni) {
    if (p.isAnak) {
      if (!p.namaSekolah?.trim()) {
        throw new Error(`Anak ${p.namaLengkap}: jenjang pendidikan wajib dipilih`);
      }
      continue;
    }
    if (!p.nomorWhatsapp?.trim()) throw new Error(`Penghuni ${p.namaLengkap}: nomor WhatsApp wajib`);
    if (!p.jenisKelamin?.trim()) throw new Error(`Penghuni ${p.namaLengkap}: jenis kelamin wajib`);
    if (!p.pekerjaan?.trim()) throw new Error(`Penghuni ${p.namaLengkap}: pekerjaan wajib`);
    if (keperluan === "tinggal" && !p.keperluanTinggal?.trim()) {
      throw new Error(`Penghuni ${p.namaLengkap}: keperluan tinggal wajib`);
    }
    if (!p.namaTempatKerja?.trim()) {
      throw new Error(`Penghuni ${p.namaLengkap}: tempat kerja wajib diisi`);
    }
    const umur = hitungUmur(p.tanggalLahir);
    if (umur < 21 && !p.namaSekolah?.trim()) {
      throw new Error(`Penghuni ${p.namaLengkap}: nama sekolah wajib diisi (usia di bawah 21 tahun)`);
    }
    if (!p.fotoKtpPath?.trim()) throw new Error(`Penghuni ${p.namaLengkap}: foto KTP wajib diunggah`);
    if (p.punyaKendaraan) {
      const kendaraan = parseKendaraanFromPenghuni(p.jenisKendaraan, p.platNomor);
      if (kendaraan.length === 0) {
        throw new Error(`Penghuni ${p.namaLengkap}: isi minimal satu kendaraan`);
      }
      for (let i = 0; i < kendaraan.length; i++) {
        if (!kendaraan[i].jenis?.trim()) {
          throw new Error(`Penghuni ${p.namaLengkap}: jenis kendaraan #${i + 1} wajib diisi`);
        }
        const plat = kendaraan[i].platNomor?.trim();
        if (!plat) {
          throw new Error(`Penghuni ${p.namaLengkap}: plat nomor kendaraan #${i + 1} wajib lengkap`);
        }
        const seg = plat.split(/\s+/);
        if (seg.length < 3) {
          throw new Error(`Penghuni ${p.namaLengkap}: plat nomor #${i + 1} harus kode daerah, nomor, dan akhiran`);
        }
      }
    }
  }
}

async function assertKostAllowed(pemilikKostId: number, rt: number, keperluan: "tinggal" | "bisnis") {
  const kost = await storage.getPemilikKostById(pemilikKostId);
  if (!kost || kost.rt !== rt) throw new Error("Kost/kontrakan tidak ditemukan untuk RT ini");
  if (keperluan === "tinggal" && !kost.izinTinggal) throw new Error("Properti ini tidak menerima pengajuan tinggal");
  if (keperluan === "bisnis" && !kost.izinBisnis) throw new Error("Properti ini tidak menerima pengajuan bisnis");
  return kost;
}

async function assertNoPendingForNomor(nomor: string) {
  const [pending] = await db
    .select()
    .from(visitrw3Pengajuan)
    .where(and(eq(visitrw3Pengajuan.nomorVisitrw3, nomor), eq(visitrw3Pengajuan.status, "menunggu_survey")));
  if (pending) throw new Error("Masih ada pengajuan menunggu survey untuk nomor ini");
}

async function assertNikAvailable(nik: string) {
  const [ws] = await db.select({ id: wargaSinggah.id }).from(wargaSinggah).where(eq(wargaSinggah.nik, nik));
  if (ws) throw new Error(`NIK ${nik} sudah terdaftar sebagai warga singgah`);
  const [pending] = await db
    .select({ id: visitrw3Penghuni.id })
    .from(visitrw3Penghuni)
    .innerJoin(visitrw3Pengajuan, eq(visitrw3Penghuni.pengajuanId, visitrw3Pengajuan.id))
    .where(and(eq(visitrw3Penghuni.nik, nik), eq(visitrw3Pengajuan.status, "menunggu_survey")));
  if (pending) throw new Error(`NIK ${nik} sedang dalam pengajuan lain`);
}

export async function getPemilikKostPublic(rt: number, keperluan: "tinggal" | "bisnis") {
  if (!(ACTIVE_RT_NUMBERS as readonly number[]).includes(rt)) return [];
  const all = await db.select().from(pemilikKost).where(eq(pemilikKost.rt, rt)).orderBy(pemilikKost.namaKost);
  return all.filter((k) => {
    const aktif = (k.statusProperti ?? "aktif") === "aktif";
    const izin = keperluan === "tinggal" ? k.izinTinggal : k.izinBisnis;
    return aktif && izin;
  });
}

export const daftarPropertiSchema = z
  .object({
    namaKost: z.string().min(2, "Nama properti wajib diisi"),
    namaPemilik: z.string().min(2, "Nama pemilik wajib diisi"),
    nomorWaPemilik: z.string().min(10, "Nomor WhatsApp wajib diisi"),
    namaPenanggungJawab: z.string().min(2, "Nama penanggung jawab pengelola wajib diisi"),
    nomorWaPenanggungJawab: z.string().min(10, "WhatsApp penanggung jawab wajib diisi"),
    rt: z.number().int().refine((n) => (ACTIVE_RT_NUMBERS as readonly number[]).includes(n)),
    alamatLengkap: z.string().min(5, "Alamat lengkap wajib diisi"),
    jumlahPintu: z.number().int().min(1).max(50),
    jenisProperti: z.enum(["kost", "kontrakan", "kiosk", "lapak"]),
    izinTinggal: z.boolean(),
    izinBisnis: z.boolean(),
    catatanPemohon: z.string().optional().nullable(),
    setujuTataTertib: z.literal(true, { errorMap: () => ({ message: "Persetujuan syarat wajib" }) }),
  })
  .refine((d) => d.izinTinggal || d.izinBisnis, {
    message: "Centang minimal satu: izin pengajuan tinggal atau bisnis",
  });

async function generateNomorPendaftaranProperti(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
    const nomor = `PROP-${date}-${rand}`;
    const [existing] = await db
      .select({ id: pemilikKost.id })
      .from(pemilikKost)
      .where(eq(pemilikKost.nomorPendaftaran, nomor));
    if (!existing) return nomor;
  }
  throw new Error("Gagal membuat nomor pendaftaran properti");
}

export async function createPendaftaranProperti(input: z.infer<typeof daftarPropertiSchema>) {
  const parsed = daftarPropertiSchema.parse(input);
  const nomorPendaftaran = await generateNomorPendaftaranProperti();
  const [row] = await db
    .insert(pemilikKost)
    .values({
      nomorPendaftaran,
      namaKost: parsed.namaKost.trim(),
      namaPemilik: parsed.namaPemilik.trim(),
      nomorWaPemilik: parsed.nomorWaPemilik.trim(),
      namaPenanggungJawab: parsed.namaPenanggungJawab.trim(),
      nomorWaPenanggungJawab: parsed.nomorWaPenanggungJawab.trim(),
      rt: parsed.rt,
      alamatLengkap: parsed.alamatLengkap.trim(),
      jumlahPintu: parsed.jumlahPintu,
      jenisProperti: parsed.jenisProperti,
      izinTinggal: parsed.izinTinggal,
      izinBisnis: parsed.izinBisnis,
      statusProperti: "menunggu_verifikasi",
      catatanPemohon: parsed.catatanPemohon?.trim() || null,
      setujuTataTertib: true,
    })
    .returning();
  return row;
}

export async function getPropertiByNomorPendaftaran(nomorRaw: string) {
  const nomor = nomorRaw.trim().toUpperCase();
  const [row] = await db
    .select()
    .from(pemilikKost)
    .where(eq(pemilikKost.nomorPendaftaran, nomor));
  return row ?? null;
}

export async function approveProperti(
  id: number,
  adminUsername: string,
  survey: z.infer<typeof approveVisitrw3SurveySchema>,
) {
  const parsed = approveVisitrw3SurveySchema.parse(survey);
  const existing = await storage.getPemilikKostById(id);
  if (!existing) throw new Error("Properti tidak ditemukan");
  if (existing.statusProperti === "aktif") throw new Error("Properti sudah aktif");

  const keterangan =
    parsed.keteranganKas?.trim() ||
    `Pendaftaran properti Visit RW3 — ${existing.nomorPendaftaran ?? id} — ${existing.namaKost}`;

  const kasRwId = await catatKontribusiKeKasRw({
    kontribusiJumlah: parsed.kontribusiJumlah,
    tanggalKas: parsed.tanggalKas,
    keteranganKas: keterangan,
    adminUsername,
  });

  const [updated] = await db
    .update(pemilikKost)
    .set({
      statusProperti: "aktif",
      estimasiKontribusi: parsed.kontribusiJumlah,
      kasRwId,
    })
    .where(eq(pemilikKost.id, id))
    .returning();
  return updated;
}

export async function createPengajuanBaru(input: z.infer<typeof pengajuanBaruSchema>) {
  const parsed = pengajuanBaruSchema.parse(input);
  if (parsed.penghuni.length !== parsed.jumlahPenghuni) {
    throw new Error("Jumlah data penghuni tidak sesuai");
  }
  const bisnisLuar = parsed.keperluanPengajuan === "bisnis" && parsed.tinggalDiWilayahRw3 === false;
  if (parsed.keperluanPengajuan === "bisnis") {
    validateBisnisFields(parsed);
  } else if (!parsed.pemilikKostId) {
    throw new Error("Pilih kost/kontrakan");
  }
  validatePenghuni(parsed.penghuni, parsed.keperluanPengajuan, bisnisLuar);
  if (parsed.pemilikKostId) {
    await assertKostAllowed(parsed.pemilikKostId, parsed.rt, parsed.keperluanPengajuan);
  }
  for (const p of parsed.penghuni) {
    if (!p.isAnak && p.nik) await assertNikAvailable(p.nik);
  }

  const tanggalBerlakuSampai = hitungTanggalBerlaku(parsed.tanggalBayar, parsed.terminBulan);
  const nomorVisitrw3 = await generateNomorVisitrw3();

  return db.transaction(async (tx) => {
    const [pengajuan] = await tx
      .insert(visitrw3Pengajuan)
      .values({
        nomorVisitrw3,
        tipe: "pengajuan_baru",
        status: "menunggu_survey",
        keperluanPengajuan: parsed.keperluanPengajuan,
        pemilikKostId: parsed.pemilikKostId ?? null,
        rt: parsed.rt,
        namaUsaha: parsed.namaUsaha || null,
        jenisUsaha:
          parsed.jenisTempatUsaha === "lainnya"
            ? parsed.jenisTempatUsahaLain || null
            : parsed.jenisTempatUsaha || parsed.jenisUsaha || null,
        jenisTempatUsaha: parsed.jenisTempatUsaha || null,
        jenisTempatUsahaLain: parsed.jenisTempatUsahaLain || null,
        tinggalDiWilayahRw3: parsed.tinggalDiWilayahRw3 ?? null,
        jamBuka: parsed.jamBuka || null,
        jamTutup: parsed.jamTutup || null,
        alamatUsaha: parsed.alamatUsaha || null,
        persetujuanTetangga: parsed.persetujuanTetangga?.length
          ? JSON.stringify(parsed.persetujuanTetangga)
          : null,
        penanggungJawab: parsed.penanggungJawab || null,
        nomorUnit: parsed.nomorUnit.trim(),
        jumlahPenghuni: parsed.jumlahPenghuni,
        tanggalBayar: parsed.tanggalBayar,
        terminBulan: parsed.terminBulan,
        tanggalBerlakuSampai,
        catatanPemohon: parsed.catatanPemohon || null,
        setujuTataTertib: true,
      })
      .returning();

    for (let i = 0; i < parsed.penghuni.length; i++) {
      const p = parsed.penghuni[i];
      await tx.insert(visitrw3Penghuni).values({
        pengajuanId: pengajuan.id,
        namaLengkap: p.namaLengkap,
        tanggalLahir: p.tanggalLahir,
        isAnak: p.isAnak,
        nik: p.isAnak ? null : p.nik || null,
        nomorWhatsapp: p.nomorWhatsapp || null,
        jenisKelamin: p.jenisKelamin || null,
        pekerjaan: p.pekerjaan || null,
        keperluanTinggal: p.keperluanTinggal || null,
        namaTempatKerja: p.namaTempatKerja || null,
        namaSekolah: p.namaSekolah || null,
        punyaKendaraan: p.punyaKendaraan,
        jenisKendaraan: p.jenisKendaraan || null,
        platNomor: p.platNomor || null,
        fotoKtpPath: p.fotoKtpPath || null,
        urutan: i,
      });
    }

    return pengajuan;
  });
}

export async function createPerpanjang(input: z.infer<typeof perpanjangSchema>) {
  const parsed = perpanjangSchema.parse(input);
  const nomor = parsed.nomorVisitrw3.trim().toUpperCase();
  await assertNoPendingForNomor(nomor);

  let approved = (
    await db
      .select()
      .from(visitrw3Pengajuan)
      .where(and(eq(visitrw3Pengajuan.nomorVisitrw3, nomor), eq(visitrw3Pengajuan.status, "disetujui")))
      .orderBy(desc(visitrw3Pengajuan.createdAt))
      .limit(1)
  )[0];

  if (!approved) {
    const [ws] = await db.select().from(wargaSinggah).where(eq(wargaSinggah.nomorVisitrw3, nomor)).limit(1);
    if (ws?.pengajuanId) {
      const [p] = await db.select().from(visitrw3Pengajuan).where(eq(visitrw3Pengajuan.id, ws.pengajuanId));
      if (p?.status === "disetujui") approved = p;
    }
  }
  if (!approved) throw new Error("Nomor Visit RW3 tidak ditemukan atau belum disetujui");

  const wsId =
    approved.wargaSinggahId ||
    (await db.select({ id: wargaSinggah.id }).from(wargaSinggah).where(eq(wargaSinggah.nomorVisitrw3, nomor)).limit(1))[0]?.id;

  const tanggalBerlakuSampai = hitungTanggalBerlaku(parsed.tanggalBayar, parsed.terminBulan);
  const nomorBaru = await generateNomorVisitrw3();

  const [pengajuan] = await db
    .insert(visitrw3Pengajuan)
    .values({
      nomorVisitrw3: nomorBaru,
      tipe: "perpanjang",
      status: "menunggu_survey",
      keperluanPengajuan: approved.keperluanPengajuan,
      pemilikKostId: approved.pemilikKostId,
      rt: approved.rt,
      namaUsaha: approved.namaUsaha,
      jenisUsaha: approved.jenisUsaha,
      penanggungJawab: approved.penanggungJawab,
      jumlahPenghuni: approved.jumlahPenghuni,
      tanggalBayar: parsed.tanggalBayar,
      terminBulan: parsed.terminBulan,
      tanggalBerlakuSampai,
      wargaSinggahId: wsId || approved.wargaSinggahId,
      catatanPemohon: parsed.catatanPemohon || null,
      setujuTataTertib: true,
    })
    .returning();

  return { pengajuan, nomorLama: nomor, nomorBaru };
}

export async function getStatusByNomor(nomorRaw: string) {
  const nomor = nomorRaw.trim().toUpperCase();
  const list = await db
    .select()
    .from(visitrw3Pengajuan)
    .where(eq(visitrw3Pengajuan.nomorVisitrw3, nomor))
    .orderBy(desc(visitrw3Pengajuan.createdAt));

  if (!list.length) return null;

  const latest = list[0];
  const kost = latest.pemilikKostId ? await storage.getPemilikKostById(latest.pemilikKostId) : null;
  const penghuni = await db.select().from(visitrw3Penghuni).where(eq(visitrw3Penghuni.pengajuanId, latest.id)).orderBy(visitrw3Penghuni.urutan);

  let wargaSinggahRow = null;
  if (latest.wargaSinggahId) {
    wargaSinggahRow = await storage.getWargaSinggahById(latest.wargaSinggahId);
  } else if (latest.status === "disetujui") {
    const [ws] = await db.select().from(wargaSinggah).where(eq(wargaSinggah.nomorVisitrw3, nomor)).limit(1);
    wargaSinggahRow = ws;
  }

  return {
    pengajuan: latest,
    riwayat: list,
    kost,
    penghuni,
    kontrakAktif: wargaSinggahRow,
  };
}

export async function listPengajuanAdmin(status?: string) {
  if (status && status !== "semua") {
    return db.select().from(visitrw3Pengajuan).where(eq(visitrw3Pengajuan.status, status)).orderBy(desc(visitrw3Pengajuan.createdAt));
  }
  return db.select().from(visitrw3Pengajuan).orderBy(desc(visitrw3Pengajuan.createdAt));
}

export type Visitrw3KalenderPenghuni = {
  id: number;
  namaLengkap: string;
  nik: string;
  nomorWhatsapp: string;
  tanggalMulaiKontrak: string;
  tanggalHabisKontrak: string;
  status: string;
  nomorVisitrw3: string | null;
  pengajuanId: number | null;
  namaKost: string;
  namaPemilik: string;
  rtKost: number;
};

export type Visitrw3KalenderAntrianPerpanjang = {
  id: number;
  nomorVisitrw3: string;
  tipe: string;
  status: string;
  rt: number;
  tanggalBerlakuSampai: string;
  tanggalBayar: string;
  wargaSinggahId: number | null;
  namaPenghuni: string | null;
  namaKost: string | null;
  createdAt: string | null;
};

export type Visitrw3KalenderResponse = {
  penghuni: Visitrw3KalenderPenghuni[];
  antrianPerpanjang: Visitrw3KalenderAntrianPerpanjang[];
  ringkasan: {
    sudahHabis: number;
    hariIni: number;
    dalam7Hari: number;
    dalam30Hari: number;
    antrianPerpanjang: number;
  };
};

function kontrakDaysRemaining(tanggalHabis: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const habis = new Date(`${tanggalHabis}T00:00:00`);
  return Math.ceil((habis.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function emptyVisitrw3Kalender(): Visitrw3KalenderResponse {
  return {
    penghuni: [],
    antrianPerpanjang: [],
    ringkasan: {
      sudahHabis: 0,
      hariIni: 0,
      dalam7Hari: 0,
      dalam30Hari: 0,
      antrianPerpanjang: 0,
    },
  };
}

/** Penghuni yang ditampilkan di kalender (sama seperti halaman Penghuni: bukan nonaktif). */
function isPenghuniKalenderAktif(status: string): boolean {
  const s = (status || "").trim().toLowerCase();
  return s !== "nonaktif" && s !== "non_aktif" && s !== "berhenti" && s !== "hapus";
}

/** Data kalender kontrak: penghuni (warga_singgah) + antrian perpanjang (visitrw3_pengajuan). */
export async function getVisitrw3Kalender(rtFilter?: number): Promise<Visitrw3KalenderResponse> {
  const allWs = await storage.getAllWargaSinggah();
  let penghuniRows = allWs.filter((w) => isPenghuniKalenderAktif(w.status));
  if (rtFilter != null) {
    penghuniRows = penghuniRows.filter((w) => w.rtKost === rtFilter);
  }

  const penghuni: Visitrw3KalenderPenghuni[] = penghuniRows.map((w) => ({
    id: w.id,
    namaLengkap: w.namaLengkap,
    nik: w.nik,
    nomorWhatsapp: w.nomorWhatsapp,
    tanggalMulaiKontrak: w.tanggalMulaiKontrak,
    tanggalHabisKontrak: w.tanggalHabisKontrak,
    status: w.status,
    nomorVisitrw3: w.nomorVisitrw3 ?? null,
    pengajuanId: w.pengajuanId ?? null,
    namaKost: w.namaKost,
    namaPemilik: w.namaPemilik,
    rtKost: w.rtKost,
  }));

  let antrianPerpanjang: Visitrw3KalenderAntrianPerpanjang[] = [];
  try {
    const antrianConditions = [
      eq(visitrw3Pengajuan.tipe, "perpanjang"),
      eq(visitrw3Pengajuan.status, "menunggu_survey"),
    ];
    if (rtFilter != null) {
      antrianConditions.push(eq(visitrw3Pengajuan.rt, rtFilter));
    }

    const antrianRows = await db
      .select({
        id: visitrw3Pengajuan.id,
        nomorVisitrw3: visitrw3Pengajuan.nomorVisitrw3,
        tipe: visitrw3Pengajuan.tipe,
        status: visitrw3Pengajuan.status,
        rt: visitrw3Pengajuan.rt,
        tanggalBerlakuSampai: visitrw3Pengajuan.tanggalBerlakuSampai,
        tanggalBayar: visitrw3Pengajuan.tanggalBayar,
        wargaSinggahId: visitrw3Pengajuan.wargaSinggahId,
        namaPenghuni: wargaSinggah.namaLengkap,
        namaKost: pemilikKost.namaKost,
        createdAt: visitrw3Pengajuan.createdAt,
      })
      .from(visitrw3Pengajuan)
      .leftJoin(wargaSinggah, eq(visitrw3Pengajuan.wargaSinggahId, wargaSinggah.id))
      .leftJoin(pemilikKost, eq(visitrw3Pengajuan.pemilikKostId, pemilikKost.id))
      .where(and(...antrianConditions))
      .orderBy(visitrw3Pengajuan.tanggalBerlakuSampai);

    antrianPerpanjang = antrianRows.map((r) => ({
    id: r.id,
    nomorVisitrw3: r.nomorVisitrw3,
    tipe: r.tipe,
    status: r.status,
    rt: r.rt,
    tanggalBerlakuSampai: r.tanggalBerlakuSampai,
    tanggalBayar: r.tanggalBayar,
    wargaSinggahId: r.wargaSinggahId,
    namaPenghuni: r.namaPenghuni,
    namaKost: r.namaKost,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    }));
  } catch (antrianErr: unknown) {
    if (!isMissingVisitrw3TableError(antrianErr)) {
      throw antrianErr;
    }
  }

  let sudahHabis = 0;
  let hariIni = 0;
  let dalam7Hari = 0;
  let dalam30Hari = 0;
  for (const w of penghuni) {
    const d = kontrakDaysRemaining(w.tanggalHabisKontrak);
    if (d < 0) sudahHabis++;
    else if (d === 0) hariIni++;
    else if (d <= 7) dalam7Hari++;
    else if (d <= 30) dalam30Hari++;
  }

  return {
    penghuni,
    antrianPerpanjang,
    ringkasan: {
      sudahHabis,
      hariIni,
      dalam7Hari,
      dalam30Hari,
      antrianPerpanjang: antrianPerpanjang.length,
    },
  };
}

export async function getPengajuanDetailAdmin(id: number) {
  const [p] = await db.select().from(visitrw3Pengajuan).where(eq(visitrw3Pengajuan.id, id));
  if (!p) return null;
  const penghuni = await db.select().from(visitrw3Penghuni).where(eq(visitrw3Penghuni.pengajuanId, id)).orderBy(visitrw3Penghuni.urutan);
  const kost = p.pemilikKostId ? await storage.getPemilikKostById(p.pemilikKostId) : null;
  return { pengajuan: p, penghuni, kost };
}

export async function approvePengajuan(
  id: number,
  adminUsername: string,
  survey: z.infer<typeof approveVisitrw3SurveySchema>,
) {
  const parsedSurvey = approveVisitrw3SurveySchema.parse(survey);
  const detail = await getPengajuanDetailAdmin(id);
  if (!detail) throw new Error("Pengajuan tidak ditemukan");
  const { pengajuan, penghuni } = detail;
  if (pengajuan.status !== "menunggu_survey") throw new Error("Pengajuan sudah diproses");

  const keteranganKas =
    parsedSurvey.keteranganKas?.trim() ||
    `Kontribusi Visit RW3 — ${pengajuan.nomorVisitrw3} (${pengajuan.keperluanPengajuan})`;

  const kasRwId = await catatKontribusiKeKasRw({
    kontribusiJumlah: parsedSurvey.kontribusiJumlah,
    tanggalKas: parsedSurvey.tanggalKas,
    keteranganKas,
    adminUsername,
  });

  const baseUpdate = {
    status: "disetujui" as const,
    catatanSurvey: parsedSurvey.catatanSurvey || null,
    reviewedAt: new Date(),
    reviewedBy: adminUsername,
    estimasiKontribusi: parsedSurvey.kontribusiJumlah,
    kasRwId,
  };

  if (pengajuan.tipe === "perpanjang") {
    const wsId = pengajuan.wargaSinggahId;
    if (!wsId) throw new Error("Data warga singgah tidak ditemukan untuk perpanjang");
    const updated = await storage.perpanjangKontrak(wsId, pengajuan.tanggalBayar, pengajuan.tanggalBerlakuSampai);
    if (!updated) throw new Error("Gagal memperpanjang kontrak");
    await db
      .update(wargaSinggah)
      .set({ terminBulan: pengajuan.terminBulan, nomorVisitrw3: pengajuan.nomorVisitrw3 })
      .where(eq(wargaSinggah.id, wsId));
    await db
      .update(visitrw3Pengajuan)
      .set({ ...baseUpdate, wargaSinggahId: wsId })
      .where(eq(visitrw3Pengajuan.id, id));
    return { pengajuan: { ...pengajuan, status: "disetujui" }, wargaSinggah: updated, kasRwId };
  }

  const bisnisLuar =
    pengajuan.keperluanPengajuan === "bisnis" && pengajuan.tinggalDiWilayahRw3 === false;

  if (bisnisLuar) {
    await db.update(visitrw3Pengajuan).set(baseUpdate).where(eq(visitrw3Pengajuan.id, id));
    return { pengajuan: { ...pengajuan, status: "disetujui" }, wargaSinggah: null, kasRwId };
  }

  const dewasa = penghuni.filter((p) => !p.isAnak);
  if (!dewasa.length) throw new Error("Minimal satu penghuni dewasa");
  if (!pengajuan.pemilikKostId) throw new Error("Data kost/kontrakan tidak ditemukan");

  const utama = dewasa[0];
  const keperluanLabel = pengajuan.keperluanPengajuan === "bisnis" ? "Usaha" : utama.keperluanTinggal || "Tinggal";

  const ws = await storage.createWargaSinggah({
    pemilikKostId: pengajuan.pemilikKostId,
    namaLengkap: utama.namaLengkap,
    nik: utama.nik!,
    nomorWhatsapp: utama.nomorWhatsapp || "",
    pekerjaan: utama.pekerjaan || (pengajuan.keperluanPengajuan === "bisnis" ? pengajuan.jenisUsaha || "Usaha" : "-"),
    tanggalMulaiKontrak: pengajuan.tanggalBayar,
    tanggalHabisKontrak: pengajuan.tanggalBerlakuSampai,
    jumlahPenghuni: pengajuan.jumlahPenghuni,
    keperluanTinggal: keperluanLabel,
    nomorVisitrw3: pengajuan.nomorVisitrw3,
    pengajuanId: pengajuan.id,
    terminBulan: pengajuan.terminBulan,
  });

  for (let i = 1; i < dewasa.length; i++) {
    const p = dewasa[i];
    await storage.createWargaSinggah({
      pemilikKostId: pengajuan.pemilikKostId,
      namaLengkap: p.namaLengkap,
      nik: p.nik!,
      nomorWhatsapp: p.nomorWhatsapp || utama.nomorWhatsapp || "",
      pekerjaan: p.pekerjaan || "-",
      tanggalMulaiKontrak: pengajuan.tanggalBayar,
      tanggalHabisKontrak: pengajuan.tanggalBerlakuSampai,
      jumlahPenghuni: 1,
      keperluanTinggal: keperluanLabel,
      nomorVisitrw3: pengajuan.nomorVisitrw3,
      pengajuanId: pengajuan.id,
      terminBulan: pengajuan.terminBulan,
    });
  }

  await db
    .update(visitrw3Pengajuan)
    .set({ ...baseUpdate, wargaSinggahId: ws.id })
    .where(eq(visitrw3Pengajuan.id, id));

  return { pengajuan: { ...pengajuan, status: "disetujui" }, wargaSinggah: ws, kasRwId };
}

function incCount(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function mapToSortedRows(map: Record<string, number>, limit?: number): { label: string; count: number }[] {
  const rows = Object.entries(map)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
  return limit && rows.length > limit ? rows.slice(0, limit) : rows;
}

function rtRows(map: Record<number, number>): { rt: number; count: number }[] {
  return Object.entries(map)
    .map(([rt, count]) => ({ rt: Number(rt), count }))
    .sort((a, b) => a.rt - b.rt);
}

function labelJenisTempatUsaha(p: Visitrw3Pengajuan): string | null {
  if (p.keperluanPengajuan !== "bisnis") return null;
  if (p.jenisTempatUsaha === "lainnya") {
    return p.jenisTempatUsahaLain?.trim() || p.jenisUsaha?.trim() || "Lainnya";
  }
  return p.jenisTempatUsaha?.trim() || p.jenisUsaha?.trim() || null;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function isMissingVisitrw3TableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /does not exist|relation.*visitrw3|undefined_table/i.test(msg);
}

export async function getVisitrw3DashboardStats(rtFilter?: number): Promise<Visitrw3DashboardStats> {
  const pengajuanList = await db
    .select()
    .from(visitrw3Pengajuan)
    .where(rtFilter != null ? eq(visitrw3Pengajuan.rt, rtFilter) : undefined)
    .orderBy(desc(visitrw3Pengajuan.createdAt));

  const pengajuanIds = pengajuanList.map((p) => p.id);
  const penghuniList =
    pengajuanIds.length > 0
      ? await db
          .select()
          .from(visitrw3Penghuni)
          .where(inArray(visitrw3Penghuni.pengajuanId, pengajuanIds))
      : [];

  const propertiList = await db
    .select()
    .from(pemilikKost)
    .where(rtFilter != null ? eq(pemilikKost.rt, rtFilter) : undefined);

  const wargaAktifRows = await db
    .select({ id: wargaSinggah.id })
    .from(wargaSinggah)
    .innerJoin(pemilikKost, eq(wargaSinggah.pemilikKostId, pemilikKost.id))
    .where(
      rtFilter != null
        ? and(eq(wargaSinggah.status, "aktif"), eq(pemilikKost.rt, rtFilter))
        : eq(wargaSinggah.status, "aktif"),
    );

  const byKeperluan: Record<string, number> = {};
  const byTipe: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byRtPengajuan: Record<number, number> = {};
  const byTermin: Record<number, number> = {};
  const byJenisTempat: Record<string, number> = {};
  const byJumlahPenghuni: Record<string, number> = {};
  let bisnisDiRw3 = 0;
  let bisnisLuar = 0;
  let totalKontribusiKasRw = 0;
  let menungguSurvey = 0;
  let disetujui = 0;
  let ditolak = 0;
  let setujuTataTertibYa = 0;
  let setujuTataTertibTidak = 0;
  let denganNomorUnit = 0;
  let tanpaNomorUnit = 0;
  let denganCatatanPemohon = 0;
  let denganProperti = 0;
  let tanpaProperti = 0;
  const trenMap: Record<string, number> = {};

  for (const p of pengajuanList) {
    incCount(byKeperluan, p.keperluanPengajuan);
    incCount(byTipe, p.tipe);
    incCount(byStatus, p.status);
    byRtPengajuan[p.rt] = (byRtPengajuan[p.rt] ?? 0) + 1;
    byTermin[p.terminBulan] = (byTermin[p.terminBulan] ?? 0) + 1;
    incCount(byJumlahPenghuni, labelJumlahPenghuniPengajuan(p.jumlahPenghuni));

    if (p.status === "menunggu_survey") menungguSurvey++;
    else if (p.status === "disetujui") disetujui++;
    else if (p.status === "ditolak") ditolak++;

    if (p.setujuTataTertib) setujuTataTertibYa++;
    else setujuTataTertibTidak++;

    if (p.nomorUnit?.trim()) denganNomorUnit++;
    else tanpaNomorUnit++;

    if (p.catatanPemohon?.trim()) denganCatatanPemohon++;

    if (p.pemilikKostId != null) denganProperti++;
    else tanpaProperti++;

    if (p.kasRwId != null && p.estimasiKontribusi != null) {
      totalKontribusiKasRw += p.estimasiKontribusi;
    }

    if (p.keperluanPengajuan === "bisnis") {
      if (p.tinggalDiWilayahRw3 === true) bisnisDiRw3++;
      else if (p.tinggalDiWilayahRw3 === false) bisnisLuar++;
    }

    const jenisLabel = labelJenisTempatUsaha(p);
    if (jenisLabel) incCount(byJenisTempat, jenisLabel);

    if (p.createdAt) {
      const mk = monthKey(new Date(p.createdAt));
      trenMap[mk] = (trenMap[mk] ?? 0) + 1;
    }
  }

  const trenBulan = Object.entries(trenMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([bulan, count]) => ({ bulan, count }));

  const anakVsDewasa = { anak: 0, dewasa: 0 };
  const byJenisKelamin: Record<string, number> = {};
  const byKelompokUsia: Record<string, number> = {};
  const byKeperluanTinggal: Record<string, number> = {};
  const byJenjangAnak: Record<string, number> = {};
  const byTempatKerja: Record<string, number> = {};
  const byPekerjaan: Record<string, number> = {};
  const byJenisKendaraan: Record<string, number> = {};
  let denganKendaraan = 0;
  let tanpaKendaraan = 0;
  let withFotoKtp = 0;
  let withoutFotoKtp = 0;

  for (const pn of penghuniList) {
    if (pn.isAnak) anakVsDewasa.anak++;
    else anakVsDewasa.dewasa++;

    if (pn.jenisKelamin?.trim()) incCount(byJenisKelamin, pn.jenisKelamin.trim());

    const umur = hitungUmur(pn.tanggalLahir);
    if (umur >= 0) incCount(byKelompokUsia, kelompokUsiaLabel(umur));

    if (pn.keperluanTinggal?.trim()) incCount(byKeperluanTinggal, pn.keperluanTinggal.trim());

    if (pn.isAnak && pn.namaSekolah?.trim()) incCount(byJenjangAnak, pn.namaSekolah.trim());

    if (pn.pekerjaan?.trim()) incCount(byPekerjaan, pn.pekerjaan.trim());

    if (!pn.isAnak && pn.namaTempatKerja?.trim()) incCount(byTempatKerja, pn.namaTempatKerja.trim());

    if (pn.fotoKtpPath?.trim()) withFotoKtp++;
    else withoutFotoKtp++;

    if (pn.punyaKendaraan) {
      denganKendaraan++;
      const kendaraan = parseKendaraanFromPenghuni(pn.jenisKendaraan, pn.platNomor);
      for (const k of kendaraan) {
        if (k.jenis?.trim()) incCount(byJenisKendaraan, k.jenis.trim());
      }
    } else {
      tanpaKendaraan++;
    }
  }

  const byJenisProperti: Record<string, number> = {};
  const byStatusProperti: Record<string, number> = {};
  const byRtProperti: Record<number, number> = {};
  const byJumlahPintu: Record<string, number> = {};
  const byIzinKombinasi: Record<string, number> = {};
  let izinTinggal = 0;
  let izinBisnis = 0;
  let propertiMenunggu = 0;
  let denganPenanggungJawab = 0;
  let tanpaPenanggungJawab = 0;
  let propertiSetujuTataTertibYa = 0;
  let propertiSetujuTataTertibTidak = 0;
  let propertiDenganCatatan = 0;

  for (const pk of propertiList) {
    incCount(byJenisProperti, pk.jenisProperti || "kost");
    incCount(byStatusProperti, pk.statusProperti || "aktif");
    byRtProperti[pk.rt] = (byRtProperti[pk.rt] ?? 0) + 1;
    incCount(byJumlahPintu, labelJumlahPintuTier(pk.jumlahPintu ?? 1));
    incCount(byIzinKombinasi, labelIzinProperti(Boolean(pk.izinTinggal), Boolean(pk.izinBisnis)));
    if (pk.izinTinggal) izinTinggal++;
    if (pk.izinBisnis) izinBisnis++;
    if (pk.statusProperti === "menunggu_verifikasi") propertiMenunggu++;
    if (pk.namaPenanggungJawab?.trim()) denganPenanggungJawab++;
    else tanpaPenanggungJawab++;
    if (pk.setujuTataTertib) propertiSetujuTataTertibYa++;
    else propertiSetujuTataTertibTidak++;
    if (pk.catatanPemohon?.trim()) propertiDenganCatatan++;
  }

  const rtSet = new Set<number>([...ACTIVE_RT_NUMBERS]);
  for (const p of pengajuanList) rtSet.add(p.rt);
  for (const pk of propertiList) rtSet.add(pk.rt);

  return {
    ringkasan: {
      totalPengajuan: pengajuanList.length,
      menungguSurvey,
      disetujui,
      ditolak,
      totalProperti: propertiList.length,
      propertiMenunggu,
      penghuniAktif: wargaAktifRows.length,
      totalKontribusiKasRw,
    },
    pengajuan: {
      byKeperluan,
      byTipe,
      byStatus,
      byRt: rtRows(byRtPengajuan),
      byTerminBulan: Object.entries(byTermin)
        .map(([termin, count]) => ({ termin: Number(termin), count }))
        .sort((a, b) => a.termin - b.termin),
      byJumlahPenghuni: mapToSortedRows(byJumlahPenghuni),
      bisnisDiRw3,
      bisnisLuar,
      byJenisTempatUsaha: mapToSortedRows(byJenisTempat),
      setujuTataTertib: { ya: setujuTataTertibYa, tidak: setujuTataTertibTidak },
      denganNomorUnit,
      tanpaNomorUnit,
      denganCatatanPemohon,
      denganProperti,
      tanpaProperti,
    },
    penghuni: {
      totalBaris: penghuniList.length,
      anakVsDewasa,
      byJenisKelamin: mapToSortedRows(byJenisKelamin),
      byKelompokUsia: mapToSortedRows(byKelompokUsia),
      byKeperluanTinggal: mapToSortedRows(byKeperluanTinggal),
      byJenjangAnak: mapToSortedRows(byJenjangAnak),
      topPekerjaan: mapToSortedRows(byPekerjaan, 8),
      denganKendaraan,
      tanpaKendaraan,
      byJenisKendaraan: mapToSortedRows(byJenisKendaraan),
      withFotoKtp,
      withoutFotoKtp,
      topTempatKerja: mapToSortedRows(byTempatKerja, 8),
    },
    properti: {
      byJenisProperti: mapToSortedRows(byJenisProperti),
      byStatusProperti: mapToSortedRows(byStatusProperti),
      byRt: rtRows(byRtProperti),
      izinTinggal,
      izinBisnis,
      byIzinKombinasi: mapToSortedRows(byIzinKombinasi),
      byJumlahPintu: mapToSortedRows(byJumlahPintu),
      denganPenanggungJawab,
      tanpaPenanggungJawab,
      setujuTataTertib: { ya: propertiSetujuTataTertibYa, tidak: propertiSetujuTataTertibTidak },
      denganCatatanPemohon: propertiDenganCatatan,
    },
    trenBulan,
    pengajuanTerbaru: pengajuanList.slice(0, 5).map((p) => ({
      id: p.id,
      nomorVisitrw3: p.nomorVisitrw3,
      keperluanPengajuan: p.keperluanPengajuan,
      status: p.status,
      rt: p.rt,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    })),
    rtList: [...rtSet].sort((a, b) => a - b),
  };
}

export async function rejectPengajuan(id: number, adminUsername: string, alasanTolak: string) {
  const [p] = await db.select().from(visitrw3Pengajuan).where(eq(visitrw3Pengajuan.id, id));
  if (!p) throw new Error("Pengajuan tidak ditemukan");
  if (p.status !== "menunggu_survey") throw new Error("Pengajuan sudah diproses");
  const [updated] = await db
    .update(visitrw3Pengajuan)
    .set({
      status: "ditolak",
      alasanTolak,
      reviewedAt: new Date(),
      reviewedBy: adminUsername,
    })
    .where(eq(visitrw3Pengajuan.id, id))
    .returning();
  return updated;
}

export async function ensureVisitrw3Schema() {
  try {
  await pool.query(`
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS izin_tinggal boolean NOT NULL DEFAULT true;
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS izin_bisnis boolean NOT NULL DEFAULT false;
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS jenis_properti text NOT NULL DEFAULT 'kost';
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS nomor_pendaftaran text UNIQUE;
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS status_properti text NOT NULL DEFAULT 'aktif';
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS catatan_pemohon text;
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS nama_penanggung_jawab text;
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS nomor_wa_penanggung_jawab text;
    ALTER TABLE warga_singgah ADD COLUMN IF NOT EXISTS nomor_visitrw3 text;
    ALTER TABLE warga_singgah ADD COLUMN IF NOT EXISTS pengajuan_id integer;
    ALTER TABLE warga_singgah ADD COLUMN IF NOT EXISTS termin_bulan integer;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS nomor_unit text;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS jenis_tempat_usaha text;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS jenis_tempat_usaha_lain text;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS tinggal_di_wilayah_rw3 boolean;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS jam_buka text;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS jam_tutup text;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS alamat_usaha text;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS persetujuan_tetangga text;
    ALTER TABLE visitrw3_pengajuan ALTER COLUMN pemilik_kost_id DROP NOT NULL;
    CREATE TABLE IF NOT EXISTS visitrw3_pengajuan (
      id serial PRIMARY KEY,
      nomor_visitrw3 text NOT NULL UNIQUE,
      tipe text NOT NULL,
      status text NOT NULL DEFAULT 'menunggu_survey',
      keperluan_pengajuan text NOT NULL,
      pemilik_kost_id integer NOT NULL REFERENCES pemilik_kost(id),
      rt integer NOT NULL,
      nama_usaha text,
      jenis_usaha text,
      penanggung_jawab text,
      nomor_unit text,
      jumlah_penghuni integer NOT NULL,
      tanggal_bayar text NOT NULL,
      termin_bulan integer NOT NULL,
      tanggal_berlaku_sampai text NOT NULL,
      warga_singgah_id integer REFERENCES warga_singgah(id),
      catatan_pemohon text,
      catatan_survey text,
      alasan_tolak text,
      reviewed_at timestamp,
      reviewed_by text,
      created_at timestamp DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS visitrw3_penghuni (
      id serial PRIMARY KEY,
      pengajuan_id integer NOT NULL REFERENCES visitrw3_pengajuan(id) ON DELETE CASCADE,
      nama_lengkap text NOT NULL,
      tanggal_lahir text NOT NULL,
      is_anak boolean NOT NULL DEFAULT false,
      nik text,
      nomor_whatsapp text,
      jenis_kelamin text,
      pekerjaan text,
      keperluan_tinggal text,
      nama_tempat_kerja text,
      nama_sekolah text,
      punya_kendaraan boolean NOT NULL DEFAULT false,
      jenis_kendaraan text,
      plat_nomor text,
      foto_ktp_path text,
      urutan integer NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS visitrw3_settings (
      id serial PRIMARY KEY,
      key text NOT NULL UNIQUE,
      value text NOT NULL,
      label text NOT NULL,
      keterangan text,
      updated_at timestamp DEFAULT now()
    );
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS setuju_tata_tertib boolean NOT NULL DEFAULT false;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS settings_versi text;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS estimasi_kontribusi integer;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS rincian_kontribusi text;
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS setuju_tata_tertib boolean NOT NULL DEFAULT false;
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS settings_versi text;
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS estimasi_kontribusi integer;
    ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS kas_rw_id integer;
    ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS kas_rw_id integer;
  `);
  await seedVisitrw3Settings();
  await seedVisitrw3DevPropertiIfNeeded();
  } catch (e) {
    throw e;
  }
}

/** Development: seed contoh properti hanya saat tabel pemilik_kost masih kosong (setup awal localhost). */
export async function seedVisitrw3DevPropertiIfNeeded() {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.SEED_VISITRW3_DEMO === "0") return;

  const all = await db.select({ id: pemilikKost.id }).from(pemilikKost);
  // Hanya seed saat tabel benar-benar kosong (setup awal dev).
  // Jangan buat ulang demo setelah admin menghapus properti.
  if (all.length > 0) return;

  const demoRows = [
    {
      nomorPendaftaran: "PROP-DEV-KOST-RT01",
      namaKost: "Kost Contoh (Dev) RT01",
      namaPemilik: "Pemilik Contoh Dev",
      nomorWaPemilik: "081234567800",
      namaPenanggungJawab: "PJ Kost Dev",
      nomorWaPenanggungJawab: "081234567801",
      rt: 1,
      alamatLengkap: "Jl. Contoh Dev No. 1, RT 01",
      jumlahPintu: 8,
      jenisProperti: "kost",
      izinTinggal: true,
      izinBisnis: false,
      statusProperti: "aktif",
      setujuTataTertib: true,
      catatanPemohon: "Data demo pengembangan lokal — boleh dihapus dari admin",
    },
    {
      nomorPendaftaran: "PROP-DEV-KIOSK-RT01",
      namaKost: "Kiosk Contoh (Dev) RT01",
      namaPemilik: "Pemilik Kiosk Dev",
      nomorWaPemilik: "081234567802",
      namaPenanggungJawab: "PJ Kiosk Dev",
      nomorWaPenanggungJawab: "081234567803",
      rt: 1,
      alamatLengkap: "Jl. Contoh Dev No. 2, RT 01",
      jumlahPintu: 1,
      jenisProperti: "kiosk",
      izinTinggal: false,
      izinBisnis: true,
      statusProperti: "aktif",
      setujuTataTertib: true,
      catatanPemohon: "Data demo pengembangan lokal — boleh dihapus dari admin",
    },
  ] as const;

  for (const row of demoRows) {
    const [existing] = await db
      .select({ id: pemilikKost.id })
      .from(pemilikKost)
      .where(eq(pemilikKost.nomorPendaftaran, row.nomorPendaftaran))
      .limit(1);
    if (!existing) await db.insert(pemilikKost).values({ ...row });
  }
  console.log("[Visit RW3] Properti demo dev disiapkan (RT 01)");
}
