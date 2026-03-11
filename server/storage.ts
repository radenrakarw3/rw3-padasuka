import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  kartuKeluarga, warga, rtData, laporan, suratWarga, suratRw,
  profileEditRequest, adminUser, waBlast, pengajuanBansos, donasiCampaign, donasi, kasRw,
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
  getDonasiLeaderboard(): Promise<{ namaDonatur: string; total: number; count: number }[]>;
  getDonasiTerkumpulByCampaign(): Promise<Record<number, number>>;

  getAllKasRw(): Promise<KasRw[]>;
  getKasRwById(id: number): Promise<KasRw | undefined>;
  createKasRw(data: InsertKasRw): Promise<KasRw>;
  updateKasRw(id: number, data: Partial<InsertKasRw>): Promise<KasRw | undefined>;
  deleteKasRw(id: number): Promise<void>;
  getKasRwSummary(): Promise<{ totalPemasukan: number; totalPengeluaran: number; saldo: number }>;
  getKasRwCampaignSummary(): Promise<Record<number, { pemasukan: number; pengeluaran: number; saldo: number }>>;

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
    const rtSet = [1, 2, 3, 4, 5, 6, 7];
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
}

export const storage = new DatabaseStorage();
