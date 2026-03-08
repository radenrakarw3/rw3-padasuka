import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  kartuKeluarga, warga, rtData, laporan, suratWarga, suratRw,
  profileEditRequest, adminUser, waBlast,
  type KartuKeluarga, type InsertKartuKeluarga,
  type Warga, type InsertWarga,
  type RtData, type InsertRtData,
  type Laporan, type InsertLaporan,
  type SuratWarga, type InsertSuratWarga,
  type SuratRw, type InsertSuratRw,
  type ProfileEditRequest, type InsertProfileEditRequest,
  type AdminUser, type InsertAdminUser,
  type WaBlast, type InsertWaBlast,
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
  updateWaBlastStatus(id: number, status: string, jumlah: number): Promise<WaBlast | undefined>;

  getWargaByRt(rt: number): Promise<(Warga & { nomorKk: string; rt: number })[]>;
  getAllWargaWithKk(): Promise<(Warga & { nomorKk: string; rt: number; alamat: string })[]>;

  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  getAllAdmins(): Promise<AdminUser[]>;
  createAdmin(data: InsertAdminUser): Promise<AdminUser>;

  countSuratWargaThisYear(): Promise<number>;
  countSuratRwThisYear(): Promise<number>;
  updateSuratWargaNomor(id: number, nomorSurat: string): Promise<SuratWarga | undefined>;
  updateSuratRwNomor(id: number, nomorSurat: string): Promise<SuratRw | undefined>;
  updateSuratRwIsi(id: number, isiSurat: string): Promise<SuratRw | undefined>;

  getDashboardStats(): Promise<DashboardStats>;
}

export interface DashboardStats {
  totalKk: number;
  totalWarga: number;
  pendingLaporan: number;
  pendingSurat: number;
  jenisKelamin: Record<string, number>;
  agama: Record<string, number>;
  statusPerkawinan: Record<string, number>;
  kedudukanKeluarga: Record<string, number>;
  pekerjaan: { name: string; count: number }[];
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
  perRt: { rt: number; kk: number; warga: number; bansos: number }[];
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
    await db.delete(kartuKeluarga).where(eq(kartuKeluarga.id, id));
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
    await db.delete(warga).where(eq(warga.id, id));
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

  async updateWaBlastStatus(id: number, status: string, jumlah: number): Promise<WaBlast | undefined> {
    const [result] = await db.update(waBlast).set({ status, jumlahPenerima: jumlah }).where(eq(waBlast.id, id)).returning();
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

  async updateSuratRwNomor(id: number, nomorSurat: string): Promise<SuratRw | undefined> {
    const [result] = await db.update(suratRw).set({ nomorSurat }).where(eq(suratRw.id, id)).returning();
    return result;
  }

  async updateSuratRwIsi(id: number, isiSurat: string): Promise<SuratRw | undefined> {
    const [result] = await db.update(suratRw).set({ isiSurat }).where(eq(suratRw.id, id)).returning();
    return result;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allKk = await db.select().from(kartuKeluarga);
    const allWarga = await db.select().from(warga);
    const pendingLaporanResult = await db.select({ c: count() }).from(laporan).where(eq(laporan.status, "pending"));
    const pendingSuratResult = await db.select({ c: count() }).from(suratWarga).where(eq(suratWarga.status, "pending"));

    const totalKk = allKk.length;
    const totalWarga = allWarga.length;
    const pendingLaporan = pendingLaporanResult[0]?.c || 0;
    const pendingSurat = pendingSuratResult[0]?.c || 0;

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
      "0-5": 0, "6-17": 0, "18-25": 0, "26-40": 0, "41-55": 0, "56-65": 0, "65+": 0, "Tidak Diketahui": 0,
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
      else if (age <= 65) kelompokUsia["56-65"]++;
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
      return {
        rt,
        kk: kkInRt.length,
        warga: allWarga.filter(w => kkRtMap.get(w.kkId) === rt).length,
        bansos: kkInRt.filter(k => k.penerimaBansos).length,
      };
    });

    return {
      totalKk, totalWarga, pendingLaporan, pendingSurat,
      jenisKelamin, agama, statusPerkawinan, kedudukanKeluarga,
      pekerjaan, statusKependudukan, kelompokUsia,
      waOwnership, ktpOwnership,
      statusRumah, kondisiBangunan, sumberAir, sanitasiWc, listrik,
      bansos, kkFotoOwnership, perRt,
    };
  }
}

export const storage = new DatabaseStorage();
