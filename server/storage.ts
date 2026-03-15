import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  kartuKeluarga, warga, rtData, laporan, suratWarga, suratRw,
  profileEditRequest, adminUser, waBlast, pengajuanBansos, donasiCampaign, donasi, kasRw,
  pemilikKost, wargaSinggah, riwayatKontrak,
  usaha, karyawanUsaha, izinTetangga, surveyUsaha, riwayatStiker,
  type KartuKeluarga, type InsertKartuKeluarga,
  type Warga, type InsertWarga,
  type RtData, type InsertRtData,
  type Laporan, type InsertLaporan,
  type SuratWarga, type InsertSuratWarga,
  type SuratRw, type InsertSuratRw,
  type ProfileEditRequest, type InsertProfileEditRequest,
  type AdminUser, type InsertAdminUser,
  type WaBlast, type InsertWaBlast,
  type PengajuanBansos, type InsertPengajuanBansos,
  type DonasiCampaign, type InsertDonasiCampaign,
  type Donasi, type InsertDonasi,
  type KasRw, type InsertKasRw,
  type PemilikKost, type InsertPemilikKost,
  type WargaSinggah, type InsertWargaSinggah,
  type RiwayatKontrak, type InsertRiwayatKontrak,
  type Usaha, type InsertUsaha,
  type KaryawanUsaha, type InsertKaryawanUsaha,
  type IzinTetangga, type InsertIzinTetangga,
  type SurveyUsaha, type InsertSurveyUsaha,
  type RiwayatStiker, type InsertRiwayatStiker,
} from "@shared/schema";

export interface IStorage {
  getKkByNomor(nomorKk: string): Promise<KartuKeluarga | undefined>;
  getKkById(id: number): Promise<KartuKeluarga | undefined>;
  getAllKk(): Promise<KartuKeluarga[]>;
  createKk(data: InsertKartuKeluarga): Promise<KartuKeluarga>;
  updateKk(id: number, data: Partial<InsertKartuKeluarga>): Promise<KartuKeluarga | undefined>;
  deleteKk(id: number): Promise<void>;

  getWargaByKkId(kkId: number): Promise<Warga[]>;
  getWargaById(id: number): Promise<Warga | undefined>;
  getAllWarga(): Promise<Warga[]>;
  createWarga(data: InsertWarga): Promise<Warga>;
  updateWarga(id: number, data: Partial<InsertWarga>): Promise<Warga | undefined>;
  deleteWarga(id: number): Promise<void>;

  getAllRt(): Promise<RtData[]>;
  getRtByNomor(nomor: number): Promise<RtData | undefined>;
  createRt(data: InsertRtData): Promise<RtData>;
  updateRt(id: number, data: Partial<InsertRtData>): Promise<RtData | undefined>;

  getLaporanByKkId(kkId: number): Promise<Laporan[]>;
  getAllLaporan(): Promise<Laporan[]>;
  createLaporan(data: InsertLaporan): Promise<Laporan>;
  updateLaporanStatus(id: number, status: string, tanggapan?: string): Promise<Laporan | undefined>;

  getSuratByKkId(kkId: number): Promise<SuratWarga[]>;
  getAllSuratWarga(): Promise<SuratWarga[]>;
  getSuratWargaById(id: number): Promise<SuratWarga | undefined>;
  createSuratWarga(data: InsertSuratWarga): Promise<SuratWarga>;
  updateSuratWargaStatus(id: number, status: string, isiSurat?: string): Promise<SuratWarga | undefined>;

  getAllSuratRw(): Promise<SuratRw[]>;
  getSuratRwById(id: number): Promise<SuratRw | undefined>;
  createSuratRw(data: InsertSuratRw): Promise<SuratRw>;

  getProfileEditsByKkId(kkId: number): Promise<ProfileEditRequest[]>;
  getAllProfileEdits(): Promise<ProfileEditRequest[]>;
  createProfileEdit(data: InsertProfileEditRequest): Promise<ProfileEditRequest>;
  updateProfileEditStatus(id: number, status: string): Promise<ProfileEditRequest | undefined>;

  getAllWaBlast(): Promise<WaBlast[]>;
  createWaBlast(data: InsertWaBlast): Promise<WaBlast>;
  updateWaBlastStatus(id: number, status: string, jumlahPenerima: number, jumlahBerhasil: number): Promise<WaBlast | undefined>;

  getWargaByRt(rt: number): Promise<(Warga & { nomorKk: string; rt: number })[]>;
  getAllWargaWithKk(): Promise<(Warga & { nomorKk: string; rt: number; alamat: string })[]>;

  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  getAllAdmins(): Promise<AdminUser[]>;
  createAdmin(data: InsertAdminUser): Promise<AdminUser>;

  countSuratWargaThisYear(): Promise<number>;
  countSuratRwThisYear(): Promise<number>;
  updateSuratWargaNomor(id: number, nomorSurat: string): Promise<SuratWarga | undefined>;
  updateSuratWargaPdf(id: number, pdfCode: string, pdfPath: string): Promise<SuratWarga | undefined>;
  getSuratWargaByPdfCode(code: string): Promise<SuratWarga | undefined>;
  updateSuratWargaFileSurat(id: number, fileSurat: string): Promise<SuratWarga | undefined>;
  updateSuratRwNomor(id: number, nomorSurat: string): Promise<SuratRw | undefined>;
  updateSuratRwIsi(id: number, isiSurat: string): Promise<SuratRw | undefined>;

  getBansosRecipients(): Promise<(KartuKeluarga & { kepalaKeluarga: string | null })[]>;
  getAllPengajuanBansos(): Promise<(PengajuanBansos & { nomorKk: string; rt: number; kepalaKeluarga: string | null; alamat: string })[]>;
  createPengajuanBansos(data: InsertPengajuanBansos): Promise<PengajuanBansos>;
  updatePengajuanBansosStatus(id: number, status: string): Promise<PengajuanBansos | undefined>;
  approvePengajuanBansos(id: number, kkId: number, jenisPengajuan: string, jenisBansos: string): Promise<PengajuanBansos | undefined>;
  getPengajuanBansosById(id: number): Promise<PengajuanBansos | undefined>;
  updateKkBansos(kkId: number, penerimaBansos: boolean, jenisBansos: string | null): Promise<KartuKeluarga | undefined>;

  getAllDonasiCampaigns(): Promise<DonasiCampaign[]>;
  createDonasiCampaign(data: InsertDonasiCampaign): Promise<DonasiCampaign>;
  updateDonasiCampaignStatus(id: number, status: string): Promise<DonasiCampaign | undefined>;
  getAllDonasi(): Promise<(Donasi & { judulCampaign: string })[]>;
  getDonasiByKkId(kkId: number): Promise<(Donasi & { judulCampaign: string })[]>;
  createDonasi(data: InsertDonasi): Promise<Donasi>;
  getDonasiById(id: number): Promise<Donasi | undefined>;
  updateDonasiStatus(id: number, status: string): Promise<Donasi | undefined>;
  confirmDonasiWithKas(donasiId: number, kasData: InsertKasRw): Promise<Donasi | undefined>;
  getDonasiLeaderboard(): Promise<{ namaDonatur: string; total: number; count: number }[]>;
  getDonasiTerkumpulByCampaign(): Promise<Record<number, number>>;

  getAllKasRw(): Promise<KasRw[]>;
  getKasRwById(id: number): Promise<KasRw | undefined>;
  createKasRw(data: InsertKasRw): Promise<KasRw>;
  updateKasRw(id: number, data: Partial<InsertKasRw>): Promise<KasRw | undefined>;
  deleteKasRw(id: number): Promise<void>;
  getKasRwSummary(): Promise<{ totalPemasukan: number; totalPengeluaran: number; saldo: number }>;
  getKasRwCampaignSummary(): Promise<Record<number, { pemasukan: number; pengeluaran: number; saldo: number }>>;

  getAllPemilikKost(): Promise<PemilikKost[]>;
  getPemilikKostById(id: number): Promise<PemilikKost | undefined>;
  createPemilikKost(data: InsertPemilikKost): Promise<PemilikKost>;
  updatePemilikKost(id: number, data: Partial<InsertPemilikKost>): Promise<PemilikKost | undefined>;
  deletePemilikKost(id: number): Promise<void>;

  getAllWargaSinggah(): Promise<(WargaSinggah & { namaKost: string; namaPemilik: string; rtKost: number })[]>;
  getWargaSinggahById(id: number): Promise<WargaSinggah | undefined>;
  getWargaSinggahByNik(nik: string): Promise<WargaSinggah | undefined>;
  getWargaSinggahByPemilikId(pemilikId: number): Promise<WargaSinggah[]>;
  createWargaSinggah(data: InsertWargaSinggah): Promise<WargaSinggah>;
  updateWargaSinggah(id: number, data: Partial<InsertWargaSinggah>): Promise<WargaSinggah | undefined>;
  deleteWargaSinggah(id: number): Promise<void>;
  perpanjangKontrak(id: number, tanggalMulaiBaru: string, tanggalHabisBaru: string): Promise<WargaSinggah | undefined>;
  getWargaSinggahMendekatiHabis(hari: number): Promise<(WargaSinggah & { namaKost: string; namaPemilik: string; nomorWaPemilik: string })[]>;

  getRiwayatKontrak(wargaSinggahId: number): Promise<RiwayatKontrak[]>;

  getAllUsaha(): Promise<Usaha[]>;
  getUsahaById(id: number): Promise<Usaha | undefined>;
  createUsaha(data: InsertUsaha): Promise<Usaha>;
  createUsahaWithRelations(data: InsertUsaha, karyawanData: any[], izinData: any[]): Promise<Usaha>;
  updateUsaha(id: number, data: Partial<InsertUsaha>): Promise<Usaha | undefined>;
  updateUsahaWithRelations(id: number, usahaData: any, karyawanData?: any[], izinData?: any[]): Promise<Usaha | undefined>;
  updateUsahaStatus(id: number, status: string, extra?: Partial<{ nomorStiker: string; tanggalStikerTerbit: string; tanggalStikerExpired: string; alasanPenolakan: string }>): Promise<Usaha | undefined>;
  approveUsahaWithStiker(usahaId: number): Promise<{ nomorStiker: string; tanggalTerbit: string; tanggalExpired: string }>;
  perpanjangStiker(usahaId: number, currentExpired: string | null): Promise<{ nomorStiker: string; tanggalTerbit: string; tanggalExpired: string }>;
  deleteUsaha(id: number): Promise<void>;

  getKaryawanByUsahaId(usahaId: number): Promise<KaryawanUsaha[]>;
  createKaryawanUsaha(data: InsertKaryawanUsaha): Promise<KaryawanUsaha>;
  deleteKaryawanByUsahaId(usahaId: number): Promise<void>;

  getIzinTetanggaByUsahaId(usahaId: number): Promise<IzinTetangga[]>;
  createIzinTetangga(data: InsertIzinTetangga): Promise<IzinTetangga>;
  updateIzinTetangga(id: number, data: Partial<InsertIzinTetangga>): Promise<IzinTetangga | undefined>;
  deleteIzinTetanggaByUsahaId(usahaId: number): Promise<void>;

  getSurveyByUsahaId(usahaId: number): Promise<SurveyUsaha | undefined>;
  createSurveyUsaha(data: InsertSurveyUsaha): Promise<SurveyUsaha>;

  getRiwayatStikerByUsahaId(usahaId: number): Promise<RiwayatStiker[]>;
  createRiwayatStiker(data: InsertRiwayatStiker): Promise<RiwayatStiker>;

  getUsahaMendekatiExpired(hari: number): Promise<Usaha[]>;

  getDashboardStats(): Promise<DashboardStats>;
}

export interface DashboardStats {
  totalKk: number;
  totalWarga: number;
  pendingLaporan: number;
  pendingSurat: number;
  pendingEditProfil: number;
  pendingPengajuanBansos: number;
  totalLaporan: number;
  statusLaporan: Record<string, number>;
  totalSuratWarga: number;
  statusSuratWarga: Record<string, number>;
  totalSuratRw: number;
  totalPengajuanBansos: number;
  statusPengajuanBansos: Record<string, number>;
  jenisBansos: Record<string, number>;
  jenisKelamin: Record<string, number>;
  agama: Record<string, number>;
  statusPerkawinan: Record<string, number>;
  kedudukanKeluarga: Record<string, number>;
  pekerjaan: { name: string; count: number }[];
  pendidikan: Record<string, number>;
  statusKependudukan: Record<string, number>;
  kelompokUsia: Record<string, number>;
  waOwnership: { punya: number; belum: number };
  ktpOwnership: { punya: number; belum: number };
  statusRumah: Record<string, number>;
  kondisiBangunan: Record<string, number>;
  sumberAir: Record<string, number>;
  sanitasiWc: Record<string, number>;
  listrik: Record<string, number>;
  bansos: { penerima: number; bukan: number };
  kkFotoOwnership: { punya: number; belum: number };
  perRt: { rt: number; kk: number; warga: number; bansos: number; lakiLaki: number; perempuan: number }[];
  keuangan: { totalPemasukan: number; totalPengeluaran: number; saldo: number };
  donasiSummary: { totalDonasiMasuk: number; totalDonasiPending: number; campaignAktif: number; campaignSelesai: number; totalDonatur: number };
  avgPenghuni: number;
  wargaSinggahStats: {
    totalAktif: number;
    mendekatiHabis: number;
    sudahHabis: number;
    totalPemilikKost: number;
  };
  usahaStats: {
    totalUsaha: number;
    pendaftaran: number;
    survey: number;
    disetujui: number;
    ditolak: number;
    stikerAktif: number;
    stikerMendekatiExpired: number;
  };
}

export class DatabaseStorage implements IStorage {
  async getKkByNomor(nomorKk: string): Promise<KartuKeluarga | undefined> {
    const [result] = await db.select().from(kartuKeluarga).where(eq(kartuKeluarga.nomorKk, nomorKk));
    return result;
  }

  async getKkById(id: number): Promise<KartuKeluarga | undefined> {
    const [result] = await db.select().from(kartuKeluarga).where(eq(kartuKeluarga.id, id));
    return result;
  }

  async getAllKk(): Promise<KartuKeluarga[]> {
    return db.select().from(kartuKeluarga).orderBy(kartuKeluarga.rt, kartuKeluarga.id);
  }

  async createKk(data: InsertKartuKeluarga): Promise<KartuKeluarga> {
    const [result] = await db.insert(kartuKeluarga).values(data).returning();
    return result;
  }

  async updateKk(id: number, data: Partial<InsertKartuKeluarga>): Promise<KartuKeluarga | undefined> {
    const [result] = await db.update(kartuKeluarga).set(data).where(eq(kartuKeluarga.id, id)).returning();
    return result;
  }

  async deleteKk(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const wargaList = await tx.select({ id: warga.id }).from(warga).where(eq(warga.kkId, id));
      for (const w of wargaList) {
        await tx.delete(laporan).where(eq(laporan.wargaId, w.id));
        await tx.delete(suratWarga).where(eq(suratWarga.wargaId, w.id));
        await tx.delete(profileEditRequest).where(eq(profileEditRequest.wargaId, w.id));
      }
      await tx.delete(warga).where(eq(warga.kkId, id));
      await tx.delete(donasi).where(eq(donasi.kkId, id));
      await tx.delete(pengajuanBansos).where(eq(pengajuanBansos.kkId, id));
      await tx.delete(kartuKeluarga).where(eq(kartuKeluarga.id, id));
    });
  }

  async getWargaByKkId(kkId: number): Promise<Warga[]> {
    return db.select().from(warga).where(eq(warga.kkId, kkId)).orderBy(warga.id);
  }

  async getWargaById(id: number): Promise<Warga | undefined> {
    const [result] = await db.select().from(warga).where(eq(warga.id, id));
    return result;
  }

  async getAllWarga(): Promise<Warga[]> {
    return db.select().from(warga).orderBy(warga.id);
  }

  async createWarga(data: InsertWarga): Promise<Warga> {
    const [result] = await db.insert(warga).values(data).returning();
    return result;
  }

  async updateWarga(id: number, data: Partial<InsertWarga>): Promise<Warga | undefined> {
    const [result] = await db.update(warga).set(data).where(eq(warga.id, id)).returning();
    return result;
  }

  async deleteWarga(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(laporan).where(eq(laporan.wargaId, id));
      await tx.delete(suratWarga).where(eq(suratWarga.wargaId, id));
      await tx.delete(profileEditRequest).where(eq(profileEditRequest.wargaId, id));
      await tx.delete(warga).where(eq(warga.id, id));
    });
  }

  async getAllRt(): Promise<RtData[]> {
    return db.select().from(rtData).orderBy(rtData.nomorRt);
  }

  async getRtByNomor(nomor: number): Promise<RtData | undefined> {
    const [result] = await db.select().from(rtData).where(eq(rtData.nomorRt, nomor));
    return result;
  }

  async createRt(data: InsertRtData): Promise<RtData> {
    const [result] = await db.insert(rtData).values(data).returning();
    return result;
  }

  async updateRt(id: number, data: Partial<InsertRtData>): Promise<RtData | undefined> {
    const [result] = await db.update(rtData).set(data).where(eq(rtData.id, id)).returning();
    return result;
  }

  async getLaporanByKkId(kkId: number): Promise<Laporan[]> {
    return db.select().from(laporan).where(eq(laporan.kkId, kkId)).orderBy(desc(laporan.createdAt));
  }

  async getAllLaporan(): Promise<Laporan[]> {
    return db.select().from(laporan).orderBy(desc(laporan.createdAt));
  }

  async createLaporan(data: InsertLaporan): Promise<Laporan> {
    const [result] = await db.insert(laporan).values(data).returning();
    return result;
  }

  async updateLaporanStatus(id: number, status: string, tanggapan?: string): Promise<Laporan | undefined> {
    const updateData: any = { status };
    if (tanggapan !== undefined) updateData.tanggapanAdmin = tanggapan;
    const [result] = await db.update(laporan).set(updateData).where(eq(laporan.id, id)).returning();
    return result;
  }

  async getSuratByKkId(kkId: number): Promise<SuratWarga[]> {
    return db.select().from(suratWarga).where(eq(suratWarga.kkId, kkId)).orderBy(desc(suratWarga.createdAt));
  }

  async getAllSuratWarga(): Promise<SuratWarga[]> {
    return db.select().from(suratWarga).orderBy(desc(suratWarga.createdAt));
  }

  async getSuratWargaById(id: number): Promise<SuratWarga | undefined> {
    const [result] = await db.select().from(suratWarga).where(eq(suratWarga.id, id));
    return result;
  }

  async createSuratWarga(data: InsertSuratWarga): Promise<SuratWarga> {
    const [result] = await db.insert(suratWarga).values(data).returning();
    return result;
  }

  async updateSuratWargaStatus(id: number, status: string, isiSurat?: string): Promise<SuratWarga | undefined> {
    const updateData: any = { status };
    if (isiSurat !== undefined) updateData.isiSurat = isiSurat;
    const [result] = await db.update(suratWarga).set(updateData).where(eq(suratWarga.id, id)).returning();
    return result;
  }

  async getAllSuratRw(): Promise<SuratRw[]> {
    return db.select().from(suratRw).orderBy(desc(suratRw.createdAt));
  }

  async getSuratRwById(id: number): Promise<SuratRw | undefined> {
    const [result] = await db.select().from(suratRw).where(eq(suratRw.id, id));
    return result;
  }

  async createSuratRw(data: InsertSuratRw): Promise<SuratRw> {
    const [result] = await db.insert(suratRw).values(data).returning();
    return result;
  }

  async getProfileEditsByKkId(kkId: number): Promise<ProfileEditRequest[]> {
    return db.select().from(profileEditRequest).where(eq(profileEditRequest.kkId, kkId)).orderBy(desc(profileEditRequest.createdAt));
  }

  async getAllProfileEdits(): Promise<ProfileEditRequest[]> {
    return db.select().from(profileEditRequest).orderBy(desc(profileEditRequest.createdAt));
  }

  async createProfileEdit(data: InsertProfileEditRequest): Promise<ProfileEditRequest> {
    const [result] = await db.insert(profileEditRequest).values(data).returning();
    return result;
  }

  async updateProfileEditStatus(id: number, status: string): Promise<ProfileEditRequest | undefined> {
    const [result] = await db.update(profileEditRequest).set({ status }).where(eq(profileEditRequest.id, id)).returning();
    return result;
  }

  async getAllWaBlast(): Promise<WaBlast[]> {
    return db.select().from(waBlast).orderBy(desc(waBlast.createdAt));
  }

  async createWaBlast(data: InsertWaBlast): Promise<WaBlast> {
    const [result] = await db.insert(waBlast).values(data).returning();
    return result;
  }

  async updateWaBlastStatus(id: number, status: string, jumlahPenerima: number, jumlahBerhasil: number): Promise<WaBlast | undefined> {
    const [result] = await db.update(waBlast).set({ status, jumlahPenerima, jumlahBerhasil }).where(eq(waBlast.id, id)).returning();
    return result;
  }

  async getWargaByRt(rt: number): Promise<(Warga & { nomorKk: string; rt: number })[]> {
    const results = await db.select({
      id: warga.id,
      kkId: warga.kkId,
      namaLengkap: warga.namaLengkap,
      nik: warga.nik,
      nomorWhatsapp: warga.nomorWhatsapp,
      jenisKelamin: warga.jenisKelamin,
      statusPerkawinan: warga.statusPerkawinan,
      agama: warga.agama,
      kedudukanKeluarga: warga.kedudukanKeluarga,
      tanggalLahir: warga.tanggalLahir,
      pekerjaan: warga.pekerjaan,
      pendidikan: warga.pendidikan,
      statusKependudukan: warga.statusKependudukan,
      createdAt: warga.createdAt,
      nomorKk: kartuKeluarga.nomorKk,
      rt: kartuKeluarga.rt,
    }).from(warga)
      .innerJoin(kartuKeluarga, eq(warga.kkId, kartuKeluarga.id))
      .where(eq(kartuKeluarga.rt, rt));
    return results;
  }

  async getAllWargaWithKk(): Promise<(Warga & { nomorKk: string; rt: number; alamat: string })[]> {
    const results = await db.select({
      id: warga.id,
      kkId: warga.kkId,
      namaLengkap: warga.namaLengkap,
      nik: warga.nik,
      nomorWhatsapp: warga.nomorWhatsapp,
      jenisKelamin: warga.jenisKelamin,
      statusPerkawinan: warga.statusPerkawinan,
      agama: warga.agama,
      kedudukanKeluarga: warga.kedudukanKeluarga,
      tanggalLahir: warga.tanggalLahir,
      pekerjaan: warga.pekerjaan,
      pendidikan: warga.pendidikan,
      statusKependudukan: warga.statusKependudukan,
      fotoKtp: warga.fotoKtp,
      createdAt: warga.createdAt,
      nomorKk: kartuKeluarga.nomorKk,
      rt: kartuKeluarga.rt,
      alamat: kartuKeluarga.alamat,
    }).from(warga)
      .innerJoin(kartuKeluarga, eq(warga.kkId, kartuKeluarga.id))
      .orderBy(warga.namaLengkap);
    return results;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    const [result] = await db.select().from(adminUser).where(eq(adminUser.username, username));
    return result;
  }

  async getAllAdmins(): Promise<AdminUser[]> {
    return db.select().from(adminUser).orderBy(adminUser.id);
  }

  async createAdmin(data: InsertAdminUser): Promise<AdminUser> {
    const [result] = await db.insert(adminUser).values(data).returning();
    return result;
  }

  async countSuratWargaThisYear(): Promise<number> {
    const year = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year + 1}-01-01`);
    const [result] = await db.select({ count: count() }).from(suratWarga)
      .where(and(
        sql`${suratWarga.createdAt} >= ${start}`,
        sql`${suratWarga.createdAt} < ${end}`,
        sql`${suratWarga.nomorSurat} IS NOT NULL`
      ));
    return result?.count || 0;
  }

  async countSuratRwThisYear(): Promise<number> {
    const year = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year + 1}-01-01`);
    const [result] = await db.select({ count: count() }).from(suratRw)
      .where(and(
        sql`${suratRw.createdAt} >= ${start}`,
        sql`${suratRw.createdAt} < ${end}`,
        sql`${suratRw.nomorSurat} IS NOT NULL`
      ));
    return result?.count || 0;
  }

  async updateSuratWargaNomor(id: number, nomorSurat: string): Promise<SuratWarga | undefined> {
    const [result] = await db.update(suratWarga).set({ nomorSurat }).where(eq(suratWarga.id, id)).returning();
    return result;
  }

  async updateSuratWargaPdf(id: number, pdfCode: string, pdfPath: string): Promise<SuratWarga | undefined> {
    const [result] = await db.update(suratWarga).set({ pdfCode, pdfPath }).where(eq(suratWarga.id, id)).returning();
    return result;
  }

  async getSuratWargaByPdfCode(code: string): Promise<SuratWarga | undefined> {
    const [result] = await db.select().from(suratWarga).where(eq(suratWarga.pdfCode, code));
    return result;
  }

  async updateSuratWargaFileSurat(id: number, fileSurat: string): Promise<SuratWarga | undefined> {
    const [result] = await db.update(suratWarga).set({ fileSurat }).where(eq(suratWarga.id, id)).returning();
    return result;
  }

  async updateSuratRwNomor(id: number, nomorSurat: string): Promise<SuratRw | undefined> {
    const [result] = await db.update(suratRw).set({ nomorSurat }).where(eq(suratRw.id, id)).returning();
    return result;
  }

  async updateSuratRwIsi(id: number, isiSurat: string): Promise<SuratRw | undefined> {
    const [result] = await db.update(suratRw).set({ isiSurat }).where(eq(suratRw.id, id)).returning();
    return result;
  }

  async getBansosRecipients(): Promise<(KartuKeluarga & { kepalaKeluarga: string | null })[]> {
    const allKk = await db.select().from(kartuKeluarga).where(eq(kartuKeluarga.penerimaBansos, true));
    const allWarga = await db.select().from(warga);
    const kepalaMap: Record<number, string> = {};
    allWarga.forEach(w => {
      if (w.kedudukanKeluarga === "Kepala Keluarga") kepalaMap[w.kkId] = w.namaLengkap;
    });
    return allKk.map(kk => ({ ...kk, kepalaKeluarga: kepalaMap[kk.id] || null }));
  }

  async getAllPengajuanBansos(): Promise<(PengajuanBansos & { nomorKk: string; rt: number; kepalaKeluarga: string | null; alamat: string })[]> {
    const allPengajuan = await db.select().from(pengajuanBansos).orderBy(desc(pengajuanBansos.createdAt));
    const kkIds = [...new Set(allPengajuan.map(p => p.kkId))];
    const allKk = await db.select().from(kartuKeluarga);
    const allWarga = await db.select().from(warga);
    const kkMap: Record<number, KartuKeluarga> = {};
    allKk.forEach(k => { kkMap[k.id] = k; });
    const kepalaMap: Record<number, string> = {};
    allWarga.forEach(w => {
      if (w.kedudukanKeluarga === "Kepala Keluarga") kepalaMap[w.kkId] = w.namaLengkap;
    });
    return allPengajuan.map(p => ({
      ...p,
      nomorKk: kkMap[p.kkId]?.nomorKk || "-",
      rt: kkMap[p.kkId]?.rt || 0,
      kepalaKeluarga: kepalaMap[p.kkId] || null,
      alamat: kkMap[p.kkId]?.alamat || "-",
    }));
  }

  async createPengajuanBansos(data: InsertPengajuanBansos): Promise<PengajuanBansos> {
    const [result] = await db.insert(pengajuanBansos).values(data).returning();
    return result;
  }

  async updatePengajuanBansosStatus(id: number, status: string): Promise<PengajuanBansos | undefined> {
    const [result] = await db.update(pengajuanBansos).set({ status }).where(eq(pengajuanBansos.id, id)).returning();
    return result;
  }

  async approvePengajuanBansos(id: number, kkId: number, jenisPengajuan: string, jenisBansos: string): Promise<PengajuanBansos | undefined> {
    return await db.transaction(async (tx) => {
      const [result] = await tx.update(pengajuanBansos).set({ status: "disetujui" }).where(eq(pengajuanBansos.id, id)).returning();
      if (!result) return undefined;
      if (jenisPengajuan === "rekomendasi_coret") {
        await tx.update(kartuKeluarga).set({ penerimaBansos: false, jenisBansos: null }).where(eq(kartuKeluarga.id, kkId));
      } else if (jenisPengajuan === "rekomendasi_penerima") {
        await tx.update(kartuKeluarga).set({ penerimaBansos: true, jenisBansos }).where(eq(kartuKeluarga.id, kkId));
      }
      return result;
    });
  }

  async getPengajuanBansosById(id: number): Promise<PengajuanBansos | undefined> {
    const [result] = await db.select().from(pengajuanBansos).where(eq(pengajuanBansos.id, id));
    return result;
  }

  async updateKkBansos(kkId: number, penerimaBansos: boolean, jenisBansos: string | null): Promise<KartuKeluarga | undefined> {
    const [result] = await db.update(kartuKeluarga).set({ penerimaBansos, jenisBansos }).where(eq(kartuKeluarga.id, kkId)).returning();
    return result;
  }

  async getAllDonasiCampaigns(): Promise<DonasiCampaign[]> {
    return db.select().from(donasiCampaign).orderBy(desc(donasiCampaign.createdAt));
  }

  async createDonasiCampaign(data: InsertDonasiCampaign): Promise<DonasiCampaign> {
    const [result] = await db.insert(donasiCampaign).values(data).returning();
    return result;
  }

  async updateDonasiCampaignStatus(id: number, status: string): Promise<DonasiCampaign | undefined> {
    const [result] = await db.update(donasiCampaign).set({ status }).where(eq(donasiCampaign.id, id)).returning();
    return result;
  }

  async getAllDonasi(): Promise<(Donasi & { judulCampaign: string })[]> {
    const allDonasi = await db.select().from(donasi).orderBy(desc(donasi.createdAt));
    const campaigns = await db.select().from(donasiCampaign);
    const campMap: Record<number, string> = {};
    campaigns.forEach(c => { campMap[c.id] = c.judul; });
    return allDonasi.map(d => ({ ...d, judulCampaign: campMap[d.campaignId] || "-" }));
  }

  async getDonasiByKkId(kkId: number): Promise<(Donasi & { judulCampaign: string })[]> {
    const allDonasi = await db.select().from(donasi).where(eq(donasi.kkId, kkId)).orderBy(desc(donasi.createdAt));
    const campaigns = await db.select().from(donasiCampaign);
    const campMap: Record<number, string> = {};
    campaigns.forEach(c => { campMap[c.id] = c.judul; });
    return allDonasi.map(d => ({ ...d, judulCampaign: campMap[d.campaignId] || "-" }));
  }

  async createDonasi(data: InsertDonasi): Promise<Donasi> {
    const [result] = await db.insert(donasi).values(data).returning();
    return result;
  }

  async getDonasiById(id: number): Promise<Donasi | undefined> {
    const [result] = await db.select().from(donasi).where(eq(donasi.id, id));
    return result;
  }

  async updateDonasiStatus(id: number, status: string): Promise<Donasi | undefined> {
    const [result] = await db.update(donasi).set({ status }).where(eq(donasi.id, id)).returning();
    return result;
  }

  async confirmDonasiWithKas(donasiId: number, kasData: InsertKasRw): Promise<Donasi | undefined> {
    return await db.transaction(async (tx) => {
      const [result] = await tx.update(donasi).set({ status: "dikonfirmasi" }).where(eq(donasi.id, donasiId)).returning();
      if (!result) return undefined;
      await tx.insert(kasRw).values(kasData);
      return result;
    });
  }

  async getDonasiLeaderboard(): Promise<{ namaDonatur: string; total: number; count: number }[]> {
    const confirmed = await db.select().from(donasi).where(eq(donasi.status, "dikonfirmasi"));
    const map: Record<string, { total: number; count: number }> = {};
    confirmed.forEach(d => {
      if (!map[d.namaDonatur]) map[d.namaDonatur] = { total: 0, count: 0 };
      map[d.namaDonatur].total += Number(d.jumlah);
      map[d.namaDonatur].count += 1;
    });
    return Object.entries(map)
      .map(([namaDonatur, v]) => ({ namaDonatur, ...v }))
      .sort((a, b) => b.total - a.total);
  }

  async getDonasiTerkumpulByCampaign(): Promise<Record<number, number>> {
    const confirmed = await db.select().from(donasi).where(eq(donasi.status, "dikonfirmasi"));
    const result: Record<number, number> = {};
    confirmed.forEach(d => {
      result[d.campaignId] = (result[d.campaignId] || 0) + Number(d.jumlah);
    });
    return result;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allKk = await db.select().from(kartuKeluarga);
    const allWarga = await db.select().from(warga);
    const allLaporan = await db.select().from(laporan);
    const allSuratWarga = await db.select().from(suratWarga);
    const allSuratRw = await db.select().from(suratRw);
    const allProfileEdits = await db.select().from(profileEditRequest);
    const allPengajuanBansos = await db.select().from(pengajuanBansos);
    const allKasRw = await db.select().from(kasRw);
    const allDonasi = await db.select().from(donasi);
    const allCampaigns = await db.select().from(donasiCampaign);

    const totalKk = allKk.length;
    const totalWarga = allWarga.length;
    const pendingLaporan = allLaporan.filter(l => l.status === "pending").length;
    const pendingSurat = allSuratWarga.filter(s => s.status === "pending").length;
    const pendingEditProfil = allProfileEdits.filter(p => p.status === "pending").length;
    const pendingPengajuanBansos = allPengajuanBansos.filter(p => p.status === "pending").length;

    const totalLaporan = allLaporan.length;
    const statusLaporan: Record<string, number> = {};
    for (const l of allLaporan) {
      const s = l.status || "pending";
      statusLaporan[s] = (statusLaporan[s] || 0) + 1;
    }

    const totalSuratWarga = allSuratWarga.length;
    const statusSuratWarga: Record<string, number> = {};
    for (const s of allSuratWarga) {
      const st = s.status || "pending";
      statusSuratWarga[st] = (statusSuratWarga[st] || 0) + 1;
    }

    const totalSuratRw = allSuratRw.length;

    const totalPengajuanBansosCount = allPengajuanBansos.length;
    const statusPengajuanBansos: Record<string, number> = {};
    for (const p of allPengajuanBansos) {
      const s = p.status || "pending";
      statusPengajuanBansos[s] = (statusPengajuanBansos[s] || 0) + 1;
    }

    const jenisBansos: Record<string, number> = {};
    for (const k of allKk) {
      if (k.penerimaBansos && k.jenisBansos) {
        const types = k.jenisBansos.split(",").map(t => t.trim()).filter(t => t);
        for (const t of types) {
          jenisBansos[t] = (jenisBansos[t] || 0) + 1;
        }
      }
    }

    const countByField = (items: any[], field: string): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const item of items) {
        const val = item[field] || "Tidak Diketahui";
        map[val] = (map[val] || 0) + 1;
      }
      return map;
    };

    const jenisKelamin = countByField(allWarga, "jenisKelamin");
    const agama = countByField(allWarga, "agama");
    const statusPerkawinan = countByField(allWarga, "statusPerkawinan");
    const kedudukanKeluarga = countByField(allWarga, "kedudukanKeluarga");
    const statusKependudukan = countByField(allWarga, "statusKependudukan");
    const pendidikan = countByField(allWarga, "pendidikan");

    const pekerjaanMap = countByField(allWarga, "pekerjaan");
    const pekerjaanSorted = Object.entries(pekerjaanMap)
      .map(([name, c]) => ({ name, count: c }))
      .sort((a, b) => b.count - a.count);
    const pekerjaan = pekerjaanSorted.length > 10
      ? [
          ...pekerjaanSorted.slice(0, 10),
          { name: "Lainnya", count: pekerjaanSorted.slice(10).reduce((s, p) => s + p.count, 0) },
        ]
      : pekerjaanSorted;

    const today = new Date();
    const kelompokUsia: Record<string, number> = {
      "0-5": 0, "6-17": 0, "18-25": 0, "26-40": 0, "41-55": 0, "56-64": 0, "65+": 0, "Tidak Diketahui": 0,
    };
    for (const w of allWarga) {
      if (!w.tanggalLahir) {
        kelompokUsia["Tidak Diketahui"]++;
        continue;
      }
      const birth = new Date(w.tanggalLahir);
      if (isNaN(birth.getTime())) {
        kelompokUsia["Tidak Diketahui"]++;
        continue;
      }
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age <= 5) kelompokUsia["0-5"]++;
      else if (age <= 17) kelompokUsia["6-17"]++;
      else if (age <= 25) kelompokUsia["18-25"]++;
      else if (age <= 40) kelompokUsia["26-40"]++;
      else if (age <= 55) kelompokUsia["41-55"]++;
      else if (age < 65) kelompokUsia["56-64"]++;
      else kelompokUsia["65+"]++;
    }
    if (kelompokUsia["Tidak Diketahui"] === 0) delete kelompokUsia["Tidak Diketahui"];

    const waOwnership = {
      punya: allWarga.filter(w => w.nomorWhatsapp).length,
      belum: allWarga.filter(w => !w.nomorWhatsapp).length,
    };
    const ktpOwnership = {
      punya: allWarga.filter(w => w.fotoKtp).length,
      belum: allWarga.filter(w => !w.fotoKtp).length,
    };

    const statusRumah = countByField(allKk, "statusRumah");
    const kondisiBangunan = countByField(allKk, "kondisiBangunan");
    const sumberAir = countByField(allKk, "sumberAir");
    const sanitasiWc = countByField(allKk, "sanitasiWc");
    const listrik = countByField(allKk, "listrik");

    const bansos = {
      penerima: allKk.filter(k => k.penerimaBansos).length,
      bukan: allKk.filter(k => !k.penerimaBansos).length,
    };
    const kkFotoOwnership = {
      punya: allKk.filter(k => k.fotoKk).length,
      belum: allKk.filter(k => !k.fotoKk).length,
    };

    const kkRtMap = new Map(allKk.map(k => [k.id, k.rt]));
    const allRt = await db.select().from(rtData).orderBy(rtData.nomorRt);
    const rtSet = allRt.map(r => r.nomorRt);
    const perRt = rtSet.map(rt => {
      const kkInRt = allKk.filter(k => k.rt === rt);
      const wargaInRt = allWarga.filter(w => kkRtMap.get(w.kkId) === rt);
      return {
        rt,
        kk: kkInRt.length,
        warga: wargaInRt.length,
        bansos: kkInRt.filter(k => k.penerimaBansos).length,
        lakiLaki: wargaInRt.filter(w => w.jenisKelamin === "Laki-laki").length,
        perempuan: wargaInRt.filter(w => w.jenisKelamin === "Perempuan").length,
      };
    });

    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    for (const item of allKasRw) {
      if (item.tipe === "pemasukan") totalPemasukan += Number(item.jumlah);
      else totalPengeluaran += Number(item.jumlah);
    }
    const keuangan = { totalPemasukan, totalPengeluaran, saldo: totalPemasukan - totalPengeluaran };

    const totalDonasiMasuk = allDonasi.filter(d => d.status === "dikonfirmasi").reduce((s, d) => s + Number(d.jumlah), 0);
    const totalDonasiPending = allDonasi.filter(d => d.status === "pending").length;
    const campaignAktif = allCampaigns.filter(c => c.status === "aktif").length;
    const campaignSelesai = allCampaigns.filter(c => c.status === "selesai").length;
    const donasiSummary = { totalDonasiMasuk, totalDonasiPending, campaignAktif, campaignSelesai, totalDonatur: allDonasi.filter(d => d.status === "dikonfirmasi").length };

    const totalPenghuni = allKk.reduce((s, k) => s + (k.jumlahPenghuni || 0), 0);
    const avgPenghuni = allKk.length > 0 ? Math.round((totalPenghuni / allKk.length) * 10) / 10 : 0;

    return {
      totalKk, totalWarga, pendingLaporan, pendingSurat,
      pendingEditProfil, pendingPengajuanBansos,
      totalLaporan, statusLaporan,
      totalSuratWarga, statusSuratWarga,
      totalSuratRw,
      totalPengajuanBansos: totalPengajuanBansosCount, statusPengajuanBansos,
      jenisBansos,
      jenisKelamin, agama, statusPerkawinan, kedudukanKeluarga,
      pekerjaan, pendidikan, statusKependudukan, kelompokUsia,
      waOwnership, ktpOwnership,
      statusRumah, kondisiBangunan, sumberAir, sanitasiWc, listrik,
      bansos, kkFotoOwnership, perRt,
      keuangan, donasiSummary, avgPenghuni,
      wargaSinggahStats: await (async () => {
        const allWargaSinggahData = await db.select().from(wargaSinggah);
        const allPemilikKostData = await db.select().from(pemilikKost);
        const todayStr2 = today.toISOString().split("T")[0];
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const sevenDaysStr = sevenDaysLater.toISOString().split("T")[0];
        return {
          totalAktif: allWargaSinggahData.filter(ws => ws.status === "aktif").length,
          mendekatiHabis: allWargaSinggahData.filter(ws => ws.status === "aktif" && ws.tanggalHabisKontrak >= todayStr2 && ws.tanggalHabisKontrak <= sevenDaysStr).length,
          sudahHabis: allWargaSinggahData.filter(ws => ws.status === "aktif" && ws.tanggalHabisKontrak < todayStr2).length,
          totalPemilikKost: allPemilikKostData.length,
        };
      })(),
      usahaStats: await (async () => {
        const allUsahaData = await db.select().from(usaha);
        const todayStr3 = today.toISOString().split("T")[0];
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        const thirtyDaysStr = thirtyDaysLater.toISOString().split("T")[0];
        return {
          totalUsaha: allUsahaData.length,
          pendaftaran: allUsahaData.filter(u => u.status === "pendaftaran").length,
          survey: allUsahaData.filter(u => u.status === "survey").length,
          disetujui: allUsahaData.filter(u => u.status === "disetujui").length,
          ditolak: allUsahaData.filter(u => u.status === "ditolak").length,
          stikerAktif: allUsahaData.filter(u => u.status === "disetujui" && u.tanggalStikerExpired && u.tanggalStikerExpired >= todayStr3).length,
          stikerMendekatiExpired: allUsahaData.filter(u => u.status === "disetujui" && u.tanggalStikerExpired && u.tanggalStikerExpired >= todayStr3 && u.tanggalStikerExpired <= thirtyDaysStr).length,
        };
      })(),
    };
  }

  async getAllKasRw(): Promise<KasRw[]> {
    return db.select().from(kasRw).orderBy(desc(kasRw.tanggal), desc(kasRw.createdAt));
  }

  async getKasRwById(id: number): Promise<KasRw | undefined> {
    const [result] = await db.select().from(kasRw).where(eq(kasRw.id, id));
    return result;
  }

  async createKasRw(data: InsertKasRw): Promise<KasRw> {
    const [result] = await db.insert(kasRw).values(data).returning();
    return result;
  }

  async updateKasRw(id: number, data: Partial<InsertKasRw>): Promise<KasRw | undefined> {
    const [result] = await db.update(kasRw).set(data).where(eq(kasRw.id, id)).returning();
    return result;
  }

  async deleteKasRw(id: number): Promise<void> {
    await db.delete(kasRw).where(eq(kasRw.id, id));
  }

  async getKasRwSummary(): Promise<{ totalPemasukan: number; totalPengeluaran: number; saldo: number }> {
    const all = await db.select().from(kasRw);
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    for (const item of all) {
      if (item.tipe === "pemasukan") totalPemasukan += Number(item.jumlah);
      else totalPengeluaran += Number(item.jumlah);
    }
    return { totalPemasukan, totalPengeluaran, saldo: totalPemasukan - totalPengeluaran };
  }

  async getKasRwCampaignSummary(): Promise<Record<number, { pemasukan: number; pengeluaran: number; saldo: number }>> {
    const all = await db.select().from(kasRw);
    const result: Record<number, { pemasukan: number; pengeluaran: number; saldo: number }> = {};
    for (const item of all) {
      if (item.campaignId == null) continue;
      if (!result[item.campaignId]) {
        result[item.campaignId] = { pemasukan: 0, pengeluaran: 0, saldo: 0 };
      }
      if (item.tipe === "pemasukan") {
        result[item.campaignId].pemasukan += Number(item.jumlah);
      } else {
        result[item.campaignId].pengeluaran += Number(item.jumlah);
      }
      result[item.campaignId].saldo = result[item.campaignId].pemasukan - result[item.campaignId].pengeluaran;
    }
    return result;
  }
  async getAllPemilikKost(): Promise<PemilikKost[]> {
    return db.select().from(pemilikKost).orderBy(pemilikKost.rt, pemilikKost.id);
  }

  async getPemilikKostById(id: number): Promise<PemilikKost | undefined> {
    const [result] = await db.select().from(pemilikKost).where(eq(pemilikKost.id, id));
    return result;
  }

  async createPemilikKost(data: InsertPemilikKost): Promise<PemilikKost> {
    const [result] = await db.insert(pemilikKost).values(data).returning();
    return result;
  }

  async updatePemilikKost(id: number, data: Partial<InsertPemilikKost>): Promise<PemilikKost | undefined> {
    const [result] = await db.update(pemilikKost).set(data).where(eq(pemilikKost.id, id)).returning();
    return result;
  }

  async deletePemilikKost(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const wsList = await tx.select({ id: wargaSinggah.id }).from(wargaSinggah).where(eq(wargaSinggah.pemilikKostId, id));
      for (const ws of wsList) {
        await tx.delete(riwayatKontrak).where(eq(riwayatKontrak.wargaSinggahId, ws.id));
      }
      await tx.delete(wargaSinggah).where(eq(wargaSinggah.pemilikKostId, id));
      await tx.delete(pemilikKost).where(eq(pemilikKost.id, id));
    });
  }

  async getAllWargaSinggah(): Promise<(WargaSinggah & { namaKost: string; namaPemilik: string; rtKost: number })[]> {
    const results = await db.select({
      id: wargaSinggah.id,
      pemilikKostId: wargaSinggah.pemilikKostId,
      namaLengkap: wargaSinggah.namaLengkap,
      nik: wargaSinggah.nik,
      nomorWhatsapp: wargaSinggah.nomorWhatsapp,
      pekerjaan: wargaSinggah.pekerjaan,
      tanggalMulaiKontrak: wargaSinggah.tanggalMulaiKontrak,
      tanggalHabisKontrak: wargaSinggah.tanggalHabisKontrak,
      jumlahPenghuni: wargaSinggah.jumlahPenghuni,
      keperluanTinggal: wargaSinggah.keperluanTinggal,
      status: wargaSinggah.status,
      createdAt: wargaSinggah.createdAt,
      namaKost: pemilikKost.namaKost,
      namaPemilik: pemilikKost.namaPemilik,
      rtKost: pemilikKost.rt,
    })
      .from(wargaSinggah)
      .innerJoin(pemilikKost, eq(wargaSinggah.pemilikKostId, pemilikKost.id))
      .orderBy(desc(wargaSinggah.createdAt));
    return results;
  }

  async getWargaSinggahById(id: number): Promise<WargaSinggah | undefined> {
    const [result] = await db.select().from(wargaSinggah).where(eq(wargaSinggah.id, id));
    return result;
  }

  async getWargaSinggahByNik(nik: string): Promise<WargaSinggah | undefined> {
    const [result] = await db.select().from(wargaSinggah).where(eq(wargaSinggah.nik, nik));
    return result;
  }

  async getWargaSinggahByPemilikId(pemilikId: number): Promise<WargaSinggah[]> {
    return db.select().from(wargaSinggah).where(eq(wargaSinggah.pemilikKostId, pemilikId)).orderBy(wargaSinggah.id);
  }

  async createWargaSinggah(data: InsertWargaSinggah): Promise<WargaSinggah> {
    const [result] = await db.insert(wargaSinggah).values(data).returning();
    return result;
  }

  async updateWargaSinggah(id: number, data: Partial<InsertWargaSinggah>): Promise<WargaSinggah | undefined> {
    const [result] = await db.update(wargaSinggah).set(data).where(eq(wargaSinggah.id, id)).returning();
    return result;
  }

  async deleteWargaSinggah(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(riwayatKontrak).where(eq(riwayatKontrak.wargaSinggahId, id));
      await tx.delete(wargaSinggah).where(eq(wargaSinggah.id, id));
    });
  }

  async perpanjangKontrak(id: number, tanggalMulaiBaru: string, tanggalHabisBaru: string): Promise<WargaSinggah | undefined> {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(wargaSinggah).where(eq(wargaSinggah.id, id));
      if (!existing) return undefined;

      await tx.insert(riwayatKontrak).values({
        wargaSinggahId: id,
        tanggalMulaiLama: existing.tanggalMulaiKontrak,
        tanggalHabisLama: existing.tanggalHabisKontrak,
        tanggalMulaiBaru,
        tanggalHabisBaru,
      });

      const [updated] = await tx.update(wargaSinggah).set({
        tanggalMulaiKontrak: tanggalMulaiBaru,
        tanggalHabisKontrak: tanggalHabisBaru,
        status: "aktif",
      }).where(eq(wargaSinggah.id, id)).returning();

      return updated;
    });
  }

  async getWargaSinggahMendekatiHabis(hari: number): Promise<(WargaSinggah & { namaKost: string; namaPemilik: string; nomorWaPemilik: string })[]> {
    const today = new Date();
    const target = new Date(today);
    target.setDate(target.getDate() + hari);
    const targetStr = target.toISOString().split("T")[0];

    const results = await db.select({
      id: wargaSinggah.id,
      pemilikKostId: wargaSinggah.pemilikKostId,
      namaLengkap: wargaSinggah.namaLengkap,
      nik: wargaSinggah.nik,
      nomorWhatsapp: wargaSinggah.nomorWhatsapp,
      pekerjaan: wargaSinggah.pekerjaan,
      tanggalMulaiKontrak: wargaSinggah.tanggalMulaiKontrak,
      tanggalHabisKontrak: wargaSinggah.tanggalHabisKontrak,
      jumlahPenghuni: wargaSinggah.jumlahPenghuni,
      keperluanTinggal: wargaSinggah.keperluanTinggal,
      status: wargaSinggah.status,
      createdAt: wargaSinggah.createdAt,
      namaKost: pemilikKost.namaKost,
      namaPemilik: pemilikKost.namaPemilik,
      nomorWaPemilik: pemilikKost.nomorWaPemilik,
    })
      .from(wargaSinggah)
      .innerJoin(pemilikKost, eq(wargaSinggah.pemilikKostId, pemilikKost.id))
      .where(and(
        eq(wargaSinggah.status, "aktif"),
        eq(wargaSinggah.tanggalHabisKontrak, targetStr)
      ));

    return results;
  }

  async getRiwayatKontrak(wargaSinggahId: number): Promise<RiwayatKontrak[]> {
    return db.select().from(riwayatKontrak).where(eq(riwayatKontrak.wargaSinggahId, wargaSinggahId)).orderBy(desc(riwayatKontrak.createdAt));
  }

  async getAllUsaha(): Promise<Usaha[]> {
    return db.select().from(usaha).orderBy(desc(usaha.createdAt));
  }

  async getUsahaById(id: number): Promise<Usaha | undefined> {
    const [result] = await db.select().from(usaha).where(eq(usaha.id, id));
    return result;
  }

  async createUsaha(data: InsertUsaha): Promise<Usaha> {
    const [result] = await db.insert(usaha).values(data).returning();
    return result;
  }

  async createUsahaWithRelations(data: InsertUsaha, karyawanData: any[], izinData: any[]): Promise<Usaha> {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(usaha).values(data).returning();
      if (karyawanData && karyawanData.length > 0) {
        for (const k of karyawanData) {
          await tx.insert(karyawanUsaha).values({ ...k, usahaId: created.id });
        }
      }
      for (const izin of izinData) {
        await tx.insert(izinTetangga).values({ ...izin, usahaId: created.id });
      }
      return created;
    });
  }

  async updateUsaha(id: number, data: Partial<InsertUsaha>): Promise<Usaha | undefined> {
    const [result] = await db.update(usaha).set(data).where(eq(usaha.id, id)).returning();
    return result;
  }

  async updateUsahaWithRelations(id: number, usahaData: any, karyawanData?: any[], izinData?: any[]): Promise<Usaha | undefined> {
    return db.transaction(async (tx) => {
      const [updated] = await tx.update(usaha).set(usahaData).where(eq(usaha.id, id)).returning();
      if (karyawanData && Array.isArray(karyawanData)) {
        await tx.delete(karyawanUsaha).where(eq(karyawanUsaha.usahaId, id));
        for (const k of karyawanData) {
          await tx.insert(karyawanUsaha).values({ ...k, usahaId: id });
        }
      }
      if (izinData && Array.isArray(izinData)) {
        await tx.delete(izinTetangga).where(eq(izinTetangga.usahaId, id));
        for (const izin of izinData) {
          await tx.insert(izinTetangga).values({ ...izin, usahaId: id });
        }
      }
      return updated;
    });
  }

  async updateUsahaStatus(id: number, status: string, extra?: Partial<{ nomorStiker: string; tanggalStikerTerbit: string; tanggalStikerExpired: string; alasanPenolakan: string }>): Promise<Usaha | undefined> {
    const [result] = await db.update(usaha).set({ status, ...extra }).where(eq(usaha.id, id)).returning();
    return result;
  }

  async approveUsahaWithStiker(usahaId: number): Promise<{ nomorStiker: string; tanggalTerbit: string; tanggalExpired: string }> {
    return db.transaction(async (tx) => {
      const today = new Date();
      const expired = new Date(today);
      expired.setMonth(expired.getMonth() + 6);
      const tanggalTerbit = today.toISOString().split("T")[0];
      const tanggalExpired = expired.toISOString().split("T")[0];
      const [countResult] = await tx.select({ cnt: count() }).from(riwayatStiker);
      const stikerNum = (countResult?.cnt || 0) + 1;
      const nomorStiker = `STK-RW03/${String(stikerNum).padStart(4, "0")}/${today.getFullYear()}`;
      await tx.update(usaha).set({
        status: "disetujui",
        nomorStiker,
        tanggalStikerTerbit: tanggalTerbit,
        tanggalStikerExpired: tanggalExpired,
      }).where(eq(usaha.id, usahaId));
      await tx.insert(riwayatStiker).values({
        usahaId,
        nomorStiker,
        tanggalTerbit,
        tanggalExpired,
      });
      return { nomorStiker, tanggalTerbit, tanggalExpired };
    });
  }

  async perpanjangStiker(usahaId: number, currentExpired: string | null): Promise<{ nomorStiker: string; tanggalTerbit: string; tanggalExpired: string }> {
    return db.transaction(async (tx) => {
      const today = new Date();
      const expiredDate = currentExpired ? new Date(currentExpired) : today;
      const startFrom = expiredDate > today ? expiredDate : today;
      const newExpired = new Date(startFrom);
      newExpired.setMonth(newExpired.getMonth() + 6);
      const tanggalTerbit = startFrom.toISOString().split("T")[0];
      const tanggalExpired = newExpired.toISOString().split("T")[0];
      const [countResult] = await tx.select({ cnt: count() }).from(riwayatStiker);
      const stikerNum = (countResult?.cnt || 0) + 1;
      const nomorStiker = `STK-RW03/${String(stikerNum).padStart(4, "0")}/${today.getFullYear()}`;
      await tx.update(usaha).set({
        nomorStiker,
        tanggalStikerTerbit: tanggalTerbit,
        tanggalStikerExpired: tanggalExpired,
      }).where(eq(usaha.id, usahaId));
      await tx.insert(riwayatStiker).values({
        usahaId,
        nomorStiker,
        tanggalTerbit,
        tanggalExpired,
      });
      return { nomorStiker, tanggalTerbit, tanggalExpired };
    });
  }

  async deleteUsaha(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(riwayatStiker).where(eq(riwayatStiker.usahaId, id));
      await tx.delete(surveyUsaha).where(eq(surveyUsaha.usahaId, id));
      await tx.delete(izinTetangga).where(eq(izinTetangga.usahaId, id));
      await tx.delete(karyawanUsaha).where(eq(karyawanUsaha.usahaId, id));
      await tx.delete(usaha).where(eq(usaha.id, id));
    });
  }

  async getKaryawanByUsahaId(usahaId: number): Promise<KaryawanUsaha[]> {
    return db.select().from(karyawanUsaha).where(eq(karyawanUsaha.usahaId, usahaId)).orderBy(karyawanUsaha.id);
  }

  async createKaryawanUsaha(data: InsertKaryawanUsaha): Promise<KaryawanUsaha> {
    const [result] = await db.insert(karyawanUsaha).values(data).returning();
    return result;
  }

  async deleteKaryawanByUsahaId(usahaId: number): Promise<void> {
    await db.delete(karyawanUsaha).where(eq(karyawanUsaha.usahaId, usahaId));
  }

  async getIzinTetanggaByUsahaId(usahaId: number): Promise<IzinTetangga[]> {
    return db.select().from(izinTetangga).where(eq(izinTetangga.usahaId, usahaId)).orderBy(izinTetangga.id);
  }

  async createIzinTetangga(data: InsertIzinTetangga): Promise<IzinTetangga> {
    const [result] = await db.insert(izinTetangga).values(data).returning();
    return result;
  }

  async updateIzinTetangga(id: number, data: Partial<InsertIzinTetangga>): Promise<IzinTetangga | undefined> {
    const [result] = await db.update(izinTetangga).set(data).where(eq(izinTetangga.id, id)).returning();
    return result;
  }

  async deleteIzinTetanggaByUsahaId(usahaId: number): Promise<void> {
    await db.delete(izinTetangga).where(eq(izinTetangga.usahaId, usahaId));
  }

  async getSurveyByUsahaId(usahaId: number): Promise<SurveyUsaha | undefined> {
    const [result] = await db.select().from(surveyUsaha).where(eq(surveyUsaha.usahaId, usahaId));
    return result;
  }

  async createSurveyUsaha(data: InsertSurveyUsaha): Promise<SurveyUsaha> {
    const [result] = await db.insert(surveyUsaha).values(data).returning();
    return result;
  }

  async getRiwayatStikerByUsahaId(usahaId: number): Promise<RiwayatStiker[]> {
    return db.select().from(riwayatStiker).where(eq(riwayatStiker.usahaId, usahaId)).orderBy(desc(riwayatStiker.createdAt));
  }

  async createRiwayatStiker(data: InsertRiwayatStiker): Promise<RiwayatStiker> {
    const [result] = await db.insert(riwayatStiker).values(data).returning();
    return result;
  }

  async getUsahaMendekatiExpired(hari: number): Promise<Usaha[]> {
    const today = new Date();
    const target = new Date(today);
    target.setDate(target.getDate() + hari);
    const targetStr = target.toISOString().split("T")[0];
    const allUsahaData = await db.select().from(usaha).where(eq(usaha.status, "disetujui"));
    return allUsahaData.filter(u => u.tanggalStikerExpired === targetStr);
  }
}

export const storage = new DatabaseStorage();
