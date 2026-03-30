import { eq, and, or, desc, sql, count, gte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import {
  kartuKeluarga, warga, rtData, laporan, suratWarga, suratRw,
  profileEditRequest, adminUser, waBlast, pengajuanBansos, donasiCampaign, donasi, kasRw,
  pemilikKost, wargaSinggah, riwayatKontrak,
  usaha, karyawanUsaha, izinTetangga, surveyUsaha, riwayatStiker, monthlySnapshot,
  programRw, pesertaProgram,
  mitra, rwcoinWallet, rwcoinTransaksi, mitraVoucher, mitraDiskon, rwcoinWithdraw, rwcoinOtp, rwcoinPendingTransaksi, kasRwcoin, rwcoinTopupRequest, wargaSavedLogin, curhatWarga,
  iuranKk, iuranSetting, rwcoinSettings,
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
  type MonthlySnapshot, type InsertMonthlySnapshot,
  type ProgramRw, type InsertProgramRw,
  type PesertaProgram, type InsertPesertaProgram,
  type Mitra, type RwcoinWallet, type RwcoinTransaksi, type KasRwcoin,
  type MitraVoucher, type MitraDiskon, type RwcoinWithdraw, type RwcoinOtp, type RwcoinPendingTransaksi,
  type RwcoinTopupRequest, type CurhatWarga,
  type IuranKk, type IuranSetting, type RwcoinSettings,
} from "@shared/schema";

export interface IStorage {
  getKkByNomor(nomorKk: string): Promise<KartuKeluarga | undefined>;
  getKkById(id: number): Promise<KartuKeluarga | undefined>;
  getKkFotoData(id: number): Promise<string | null>;
  getWargaFotoKtpData(id: number): Promise<string | null>;
  getAllKk(): Promise<KartuKeluarga[]>;
  createKk(data: InsertKartuKeluarga): Promise<KartuKeluarga>;
  updateKk(id: number, data: Partial<InsertKartuKeluarga>): Promise<KartuKeluarga | undefined>;
  deleteKk(id: number): Promise<void>;

  getWargaByKkId(kkId: number): Promise<Warga[]>;
  getWargaById(id: number): Promise<Warga | undefined>;
  getWargaByNomorWa(nomorWa: string): Promise<(Pick<Warga, "id" | "kkId" | "namaLengkap" | "kedudukanKeluarga"> & { nomorKk: string; rt: number })[]>;
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
  updateSuratWargaFileSurat(id: number, fileSurat: string, fileSuratData?: string): Promise<SuratWarga | undefined>;
  getSuratWargaFileData(id: number): Promise<string | null>;
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
  updateDonasiCampaign(id: number, data: Partial<InsertDonasiCampaign>): Promise<DonasiCampaign | undefined>;
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

  // === IURAN PER KK ===
  getIuranSetting(): Promise<IuranSetting | undefined>;
  upsertIuranSetting(jumlah: number, updatedBy: string): Promise<IuranSetting>;
  getIuranByBulan(bulanTahun: string, filterRt?: number): Promise<(IuranKk & { nomorKk: string; rt: number; alamat: string; kepalaKeluarga: string | null })[]>;
  generateIuranBulan(bulanTahun: string, jumlahDefault: number): Promise<{ created: number; skipped: number }>;
  markIuranLunas(iuranId: number, tanggalBayar: string, adminNama: string): Promise<IuranKk | undefined>;
  batalIuranLunas(iuranId: number): Promise<IuranKk | undefined>;
  updateJumlahIuran(iuranId: number, jumlah: number): Promise<IuranKk | undefined>;
  getIuranRekap(tahun: string): Promise<{ bulan: string; totalKk: number; sudahBayar: number; belumBayar: number; totalNominal: number }[]>;
  getIuranByKkId(kkId: number): Promise<IuranKk[]>;

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

  getDashboardStats(rtFilter?: number): Promise<DashboardStats>;
  getMonthlySnapshots(): Promise<MonthlySnapshot[]>;
  upsertMonthlySnapshot(data: InsertMonthlySnapshot): Promise<MonthlySnapshot>;
  captureCurrentSnapshot(): Promise<MonthlySnapshot>;

  getAllProgramRw(): Promise<ProgramRw[]>;
  getProgramRwById(id: number): Promise<ProgramRw | undefined>;
  createProgramRw(data: InsertProgramRw): Promise<ProgramRw>;
  updateProgramRw(id: number, data: Partial<InsertProgramRw>): Promise<ProgramRw | undefined>;
  deleteProgramRw(id: number): Promise<void>;

  getPesertaByProgramId(programId: number): Promise<(PesertaProgram & { nomorKk: string | null; alamat: string | null; kepalaKeluarga: string | null })[]>;
  addPesertaProgram(data: InsertPesertaProgram): Promise<PesertaProgram>;
  updateKehadiranPeserta(id: number, kehadiran: string, catatan?: string): Promise<PesertaProgram | undefined>;
  deletePesertaProgram(id: number): Promise<void>;

  // ============ RWCOIN ============
  getAllMitra(): Promise<Mitra[]>;
  getMitraById(id: number): Promise<Mitra | undefined>;
  getMitraByWaKasir(nomorWa: string): Promise<Mitra | undefined>;
  createMitra(data: Omit<Mitra, "id" | "createdAt">): Promise<Mitra>;
  updateMitra(id: number, data: Partial<Mitra>): Promise<Mitra | undefined>;
  deleteMitra(id: number): Promise<void>;

  getOrCreateWargaWallet(wargaId: number): Promise<RwcoinWallet>;
  getOrCreateMitraWallet(mitraId: number): Promise<RwcoinWallet>;
  getWalletByKode(kodeWallet: string): Promise<RwcoinWallet | undefined>;
  getWargaWalletPreview(kodeWallet: string): Promise<{ kodeWallet: string; namaWarga: string; rt: number } | null>;
  getWalletByWargaId(wargaId: number): Promise<RwcoinWallet | undefined>;
  getWalletByMitraId(mitraId: number): Promise<RwcoinWallet | undefined>;

  createTopupRequest(data: { wargaId: number; namaWarga: string; noWa?: string; jumlah: number; metode: string; rekening: string; atasnama: string; totalTransfer: number }): Promise<RwcoinTopupRequest>;
  getTopupRequests(status?: string): Promise<RwcoinTopupRequest[]>;
  accTopupRequest(id: number): Promise<{ request: RwcoinTopupRequest; transaksi: RwcoinTransaksi }>;
  tolakTopupRequest(id: number, catatan?: string): Promise<RwcoinTopupRequest | undefined>;

  topupWargaWallet(wargaId: number, jumlah: number, keterangan: string): Promise<RwcoinTransaksi>;
  processBelanjaTransaksi(kodeWallet: string, mitraId: number, jumlahBruto: number, voucherKode?: string, keterangan?: string): Promise<{ transaksi: RwcoinTransaksi; diskon: number; namaWarga: string }>;
  processTransferAntar(pengirimWargaId: number, tujuanKodeWallet: string, jumlah: number, keterangan?: string): Promise<{ transaksi: RwcoinTransaksi; namaPenerima: string; namaWarga: string; saldoBaruPenerima: number }>;
  processWithdrawRequest(mitraId: number, jumlahCoin: number, nomorRekening: string, namaBank: string, atasNama: string, catatan?: string): Promise<RwcoinWithdraw>;
  approveWithdraw(withdrawId: number, adminNama: string): Promise<RwcoinWithdraw | undefined>;
  markWithdrawDibayar(withdrawId: number): Promise<RwcoinWithdraw | undefined>;
  rejectWithdraw(withdrawId: number, catatan: string): Promise<RwcoinWithdraw | undefined>;

  getAllWithdrawRequests(): Promise<(RwcoinWithdraw & { namaUsaha: string; nomorWaKasir: string })[]>;
  getWithdrawByMitraId(mitraId: number): Promise<RwcoinWithdraw[]>;

  getAllRwcoinTransaksi(): Promise<(RwcoinTransaksi & { namaWarga: string | null; namaUsaha: string | null })[]>;
  getRwcoinTransaksiByWargaId(wargaId: number): Promise<(RwcoinTransaksi & { namaUsaha: string | null })[]>;
  getRwcoinTransaksiByMitraId(mitraId: number): Promise<(RwcoinTransaksi & { namaWarga: string | null })[]>;

  getAllVoucher(): Promise<MitraVoucher[]>;
  getVoucherByKode(kode: string): Promise<MitraVoucher | undefined>;
  createVoucher(data: Omit<MitraVoucher, "id" | "createdAt" | "terpakai">): Promise<MitraVoucher>;
  updateVoucher(id: number, data: Partial<MitraVoucher>): Promise<MitraVoucher | undefined>;
  deleteVoucher(id: number): Promise<void>;

  getDiskonByMitraId(mitraId: number): Promise<MitraDiskon[]>;
  getAllDiskon(): Promise<MitraDiskon[]>;
  createDiskon(data: Omit<MitraDiskon, "id" | "createdAt">): Promise<MitraDiskon>;
  updateDiskon(id: number, data: Partial<MitraDiskon>): Promise<MitraDiskon | undefined>;
  deleteDiskon(id: number): Promise<void>;

  getRwcoinStats(): Promise<{ totalWallet: number; totalSaldo: number; totalTransaksi: number; totalTopup: number; totalBelanja: number; totalWithdrawPending: number }>;
  getRwcoinDashboard(): Promise<{ transaksiTerbaru: any[]; topupTerbaru: any[]; leaderboardMitra: { mitraId: number; namaUsaha: string; totalBelanja: number; jumlahTx: number }[]; perputaran: { totalDiWarga: number; totalDiMitra: number; totalWithdrawn: number; totalBeredar: number }; ekonomi: { velocity: number; retention: number; totalPernahTopup: number; activeWarga: number; activeMitra: number; budgetSubsidi: number; topSpenders: { wargaId: number; namaWarga: string; totalBelanja: number; jumlahTx: number }[] } }>;

  getKasRwcoin(): Promise<{ list: KasRwcoin[]; saldo: number }>;
  injectKas(data: { tipe: string; jumlah: number; keterangan: string }): Promise<KasRwcoin>;

  getRwcoinSettings(): Promise<RwcoinSettings[]>;
  getRwcoinSettingValue(key: string, defaultValue: number): Promise<number>;
  upsertRwcoinSetting(key: string, value: string): Promise<RwcoinSettings>;

  getSavedLoginsByDevice(deviceId: string): Promise<{ wargaId: number; kkId: number; nomorKk: string; nama: string; kedudukan: string; rt: number }[]>;
  getSavedLoginByWargaDevice(wargaId: number, deviceId: string): Promise<{ id: number; pinHash: string } | undefined>;
  upsertSavedLogin(wargaId: number, kkId: number, nomorKk: string, deviceId: string, pinHash: string): Promise<void>;
  updateSavedLoginLastUsed(wargaId: number, deviceId: string): Promise<void>;
  deleteSavedLogin(wargaId: number, deviceId: string): Promise<void>;

  getCurhatCoinHariIni(wargaId: number): Promise<number>;
  getCurhatHariIni(wargaId: number): Promise<CurhatWarga | null>;
  createCurhat(data: { wargaId: number; isi: string; coinDiberikan: number; balasanGemini: string }): Promise<CurhatWarga>;
  getRiwayatCurhat(wargaId: number, limit?: number): Promise<CurhatWarga[]>;
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
  pengangguran: {
    total: number;
    perUsia: Record<string, number>;
    daftarNama: { nama: string; usia: number | null; rt: number | null }[];
  };
  capaian: {
    waPercent: number;
    ktpPercent: number;
    kkFotoPercent: number;
    bansosPercent: number;
    usahaBerizinPercent: number;
    totalUsahaTarget: number;
    totalUsahaBerizin: number;
  };
  rtList: number[];
  kondisiKesehatan: Record<string, number>;
  totalDisabilitas: number;
  totalIbuHamil: number;
  kategoriEkonomi: Record<string, number>;
  totalLayakBansos: number;
  kkEkonomiTerisi: number;
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

  async getKkFotoData(id: number): Promise<string | null> {
    const [result] = await db.select({ fotoKkData: kartuKeluarga.fotoKkData }).from(kartuKeluarga).where(eq(kartuKeluarga.id, id));
    return result?.fotoKkData ?? null;
  }

  async getWargaFotoKtpData(id: number): Promise<string | null> {
    const [result] = await db.select({ fotoKtpData: warga.fotoKtpData }).from(warga).where(eq(warga.id, id));
    return result?.fotoKtpData ?? null;
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

  async getWargaByNomorWa(nomorWa: string): Promise<(Pick<Warga, "id" | "kkId" | "namaLengkap" | "kedudukanKeluarga"> & { nomorKk: string; rt: number })[]> {
    const results = await db.select({
      id: warga.id,
      kkId: warga.kkId,
      namaLengkap: warga.namaLengkap,
      kedudukanKeluarga: warga.kedudukanKeluarga,
      nomorKk: kartuKeluarga.nomorKk,
      rt: kartuKeluarga.rt,
    }).from(warga)
      .innerJoin(kartuKeluarga, eq(warga.kkId, kartuKeluarga.id))
      .where(eq(warga.nomorWhatsapp, nomorWa));
    return results;
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
      fotoKtp: warga.fotoKtp,
      fotoKtpData: warga.fotoKtpData,
      statusDisabilitas: warga.statusDisabilitas,
      kondisiKesehatan: warga.kondisiKesehatan,
      ibuHamil: warga.ibuHamil,
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
      fotoKtpData: warga.fotoKtpData,
      statusDisabilitas: warga.statusDisabilitas,
      kondisiKesehatan: warga.kondisiKesehatan,
      ibuHamil: warga.ibuHamil,
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

  async updateSuratWargaFileSurat(id: number, fileSurat: string, fileSuratData?: string): Promise<SuratWarga | undefined> {
    const updateData: { fileSurat: string; fileSuratData?: string } = { fileSurat };
    if (fileSuratData !== undefined) updateData.fileSuratData = fileSuratData;
    const [result] = await db.update(suratWarga).set(updateData).where(eq(suratWarga.id, id)).returning();
    return result;
  }

  async getSuratWargaFileData(id: number): Promise<string | null> {
    const [result] = await db.select({ fileSuratData: suratWarga.fileSuratData }).from(suratWarga).where(eq(suratWarga.id, id));
    return result?.fileSuratData ?? null;
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
    const kkIds = Array.from(new Set(allPengajuan.map(p => p.kkId)));
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

  async updateDonasiCampaign(id: number, data: Partial<InsertDonasiCampaign>): Promise<DonasiCampaign | undefined> {
    const [result] = await db.update(donasiCampaign).set(data).where(eq(donasiCampaign.id, id)).returning();
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

  async getDashboardStats(rtFilter?: number): Promise<DashboardStats> {
    const allKkRaw = await db.select().from(kartuKeluarga);
    const allWargaRaw = await db.select().from(warga);
    const allRtData = await db.select().from(rtData).orderBy(rtData.nomorRt);
    const rtList = allRtData.map(r => r.nomorRt);

    const allKk = rtFilter ? allKkRaw.filter(k => k.rt === rtFilter) : allKkRaw;
    const kkIds = new Set(allKk.map(k => k.id));
    const allWarga = rtFilter ? allWargaRaw.filter(w => kkIds.has(w.kkId)) : allWargaRaw;

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

    const kkRtMapAll = new Map(allKkRaw.map(k => [k.id, k.rt]));
    const perRtSource = rtFilter ? rtList.filter(r => r === rtFilter) : rtList;
    const perRt = perRtSource.map(rt => {
      const kkInRt = allKk.filter(k => k.rt === rt);
      const wargaInRt = allWarga.filter(w => {
        const wRt = kkRtMapAll.get(w.kkId);
        return wRt === rt;
      });
      return {
        rt,
        kk: kkInRt.length,
        warga: wargaInRt.length,
        bansos: kkInRt.filter(k => k.penerimaBansos).length,
        lakiLaki: wargaInRt.filter(w => w.jenisKelamin === "Laki-laki").length,
        perempuan: wargaInRt.filter(w => w.jenisKelamin === "Perempuan").length,
      };
    });

    const PENGANGGURAN_KEYWORDS = ["tidak bekerja", "belum bekerja", "pengangguran", "belum/tidak bekerja", "tidak diketahui", ""];
    const PELAJAR_KEYWORDS = ["pelajar", "mahasiswa", "pelajar/mahasiswa"];
    const kkRtMap = new Map(allKk.map(k => [k.id, k.rt]));

    function calcAge(tanggalLahir: string | null): number | null {
      if (!tanggalLahir) return null;
      const birth = new Date(tanggalLahir);
      if (isNaN(birth.getTime())) return null;
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    }

    const pengangguranWarga = allWarga.filter(w => {
      const job = (w.pekerjaan || "").toLowerCase().trim();
      const isPelajar = PELAJAR_KEYWORDS.some(k => job.includes(k));
      const isUnemployed = !job || PENGANGGURAN_KEYWORDS.some(k => job === k);
      if (!isUnemployed) return false;
      const age = calcAge(w.tanggalLahir);
      if (age !== null && age < 18) return false;
      if (isPelajar) return false;
      return true;
    });
    const pengangguranPerUsia: Record<string, number> = {};
    const pengangguranDaftar: { nama: string; usia: number | null; rt: number | null }[] = [];
    for (const w of pengangguranWarga) {
      const age = calcAge(w.tanggalLahir);
      let ageGroup = "Tidak Diketahui";
      if (age !== null) {
        if (age <= 25) ageGroup = "18-25";
        else if (age <= 40) ageGroup = "26-40";
        else if (age <= 55) ageGroup = "41-55";
        else ageGroup = "56+";
      }
      pengangguranPerUsia[ageGroup] = (pengangguranPerUsia[ageGroup] || 0) + 1;
      pengangguranDaftar.push({ nama: w.namaLengkap, usia: age, rt: kkRtMap.get(w.kkId) || null });
    }

    const allUsahaForCapaian = await db.select().from(usaha);
    const filteredUsaha = rtFilter ? allUsahaForCapaian.filter(u => u.rt === rtFilter) : allUsahaForCapaian;
    const totalUsahaBerizin = filteredUsaha.filter(u => u.status === "disetujui").length;
    const capaian = {
      waPercent: totalWarga > 0 ? Math.round((waOwnership.punya / totalWarga) * 100) : 0,
      ktpPercent: totalWarga > 0 ? Math.round((ktpOwnership.punya / totalWarga) * 100) : 0,
      kkFotoPercent: allKk.length > 0 ? Math.round((kkFotoOwnership.punya / allKk.length) * 100) : 0,
      bansosPercent: allKk.length > 0 ? Math.round((bansos.penerima / allKk.length) * 100) : 0,
      usahaBerizinPercent: filteredUsaha.length > 0 ? Math.round((totalUsahaBerizin / filteredUsaha.length) * 100) : 0,
      totalUsahaTarget: filteredUsaha.length,
      totalUsahaBerizin,
    };

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

    const kondisiKesehatan = countByField(allWarga.filter(w => w.kondisiKesehatan && w.kondisiKesehatan !== ""), "kondisiKesehatan");
    const totalDisabilitas = allWarga.filter(w => w.statusDisabilitas && w.statusDisabilitas !== "Tidak Ada" && w.statusDisabilitas !== "").length;
    const totalIbuHamil = allWarga.filter(w => w.ibuHamil === true).length;
    const kategoriEkonomi = countByField(allKk.filter(k => k.kategoriEkonomi && k.kategoriEkonomi !== ""), "kategoriEkonomi");
    const totalLayakBansos = allKk.filter(k => k.layakBansos === true).length;
    const kkEkonomiTerisi = allKk.filter(k => k.penghasilanBulanan && k.penghasilanBulanan !== "").length;

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
      pengangguran: { total: pengangguranWarga.length, perUsia: pengangguranPerUsia, daftarNama: pengangguranDaftar },
      capaian, rtList,
      kondisiKesehatan, totalDisabilitas, totalIbuHamil,
      kategoriEkonomi, totalLayakBansos, kkEkonomiTerisi,
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
  // === IURAN PER KK ===

  async getIuranSetting(): Promise<IuranSetting | undefined> {
    const [row] = await db.select().from(iuranSetting).limit(1);
    return row;
  }

  async upsertIuranSetting(jumlah: number, updatedBy: string): Promise<IuranSetting> {
    const existing = await this.getIuranSetting();
    if (existing) {
      const [row] = await db.update(iuranSetting).set({ jumlahDefault: jumlah, updatedBy, updatedAt: new Date() }).where(eq(iuranSetting.id, existing.id)).returning();
      return row;
    }
    const [row] = await db.insert(iuranSetting).values({ jumlahDefault: jumlah, updatedBy }).returning();
    return row;
  }

  async getIuranByBulan(bulanTahun: string, filterRt?: number): Promise<(IuranKk & { nomorKk: string; rt: number; alamat: string; kepalaKeluarga: string | null })[]> {
    const rows = await db
      .select({
        iuran: iuranKk,
        nomorKk: kartuKeluarga.nomorKk,
        rt: kartuKeluarga.rt,
        alamat: kartuKeluarga.alamat,
        kepalaKeluarga: sql<string | null>`(SELECT nama_lengkap FROM warga WHERE kk_id = ${kartuKeluarga.id} AND kedudukan_keluarga = 'Kepala Keluarga' LIMIT 1)`,
      })
      .from(iuranKk)
      .innerJoin(kartuKeluarga, eq(iuranKk.kkId, kartuKeluarga.id))
      .where(
        and(
          eq(iuranKk.bulanTahun, bulanTahun),
          filterRt !== undefined ? eq(kartuKeluarga.rt, filterRt) : sql`TRUE`
        )
      )
      .orderBy(kartuKeluarga.rt, kartuKeluarga.id);
    return rows.map(r => ({ ...r.iuran, nomorKk: r.nomorKk, rt: r.rt, alamat: r.alamat, kepalaKeluarga: r.kepalaKeluarga }));
  }

  async generateIuranBulan(bulanTahun: string, jumlahDefault: number): Promise<{ created: number; skipped: number }> {
    const kkList = await db.select({ id: kartuKeluarga.id }).from(kartuKeluarga).where(and(gte(kartuKeluarga.rt, 1), sql`${kartuKeluarga.rt} <= 4`));
    let created = 0;
    let skipped = 0;
    for (const kk of kkList) {
      const existing = await db.select({ id: iuranKk.id }).from(iuranKk).where(and(eq(iuranKk.kkId, kk.id), eq(iuranKk.bulanTahun, bulanTahun))).limit(1);
      if (existing.length > 0) { skipped++; continue; }
      await db.insert(iuranKk).values({ kkId: kk.id, bulanTahun, jumlah: jumlahDefault });
      created++;
    }
    return { created, skipped };
  }

  async markIuranLunas(iuranId: number, tanggalBayar: string, adminNama: string): Promise<IuranKk | undefined> {
    return await db.transaction(async (tx) => {
      const [iuran] = await tx.select().from(iuranKk).where(eq(iuranKk.id, iuranId));
      if (!iuran || iuran.status === "lunas") return undefined;

      const [kk] = await tx.select({ nomorKk: kartuKeluarga.nomorKk }).from(kartuKeluarga).where(eq(kartuKeluarga.id, iuran.kkId));
      const [kepala] = await tx.select({ namaLengkap: warga.namaLengkap }).from(warga).where(and(eq(warga.kkId, iuran.kkId), eq(warga.kedudukanKeluarga, "Kepala Keluarga"))).limit(1);

      const [tahunStr, bulanStr] = iuran.bulanTahun.split("-").map(Number);
      const namaBulan = new Date(tahunStr, bulanStr - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      const keterangan = `Iuran ${namaBulan} - KK ${kk?.nomorKk ?? iuran.kkId} - ${kepala?.namaLengkap ?? "Kepala KK"}`;

      const [kasEntry] = await tx.insert(kasRw).values({
        tipe: "pemasukan",
        kategori: "Iuran Warga",
        jumlah: iuran.jumlah,
        keterangan,
        tanggal: tanggalBayar,
        createdBy: "iuran-sistem",
      }).returning();

      const [updated] = await tx.update(iuranKk).set({ status: "lunas", tanggalBayar, kasRwId: kasEntry.id, updatedAt: new Date() }).where(eq(iuranKk.id, iuranId)).returning();
      return updated;
    });
  }

  async batalIuranLunas(iuranId: number): Promise<IuranKk | undefined> {
    return await db.transaction(async (tx) => {
      const [iuran] = await tx.select().from(iuranKk).where(eq(iuranKk.id, iuranId));
      if (!iuran || iuran.status !== "lunas") return undefined;
      if (iuran.kasRwId) {
        await tx.delete(kasRw).where(eq(kasRw.id, iuran.kasRwId));
      }
      const [updated] = await tx.update(iuranKk).set({ status: "belum", tanggalBayar: null, kasRwId: null, updatedAt: new Date() }).where(eq(iuranKk.id, iuranId)).returning();
      return updated;
    });
  }

  async updateJumlahIuran(iuranId: number, jumlah: number): Promise<IuranKk | undefined> {
    const [existing] = await db.select().from(iuranKk).where(eq(iuranKk.id, iuranId));
    if (!existing || existing.status === "lunas") return undefined;
    const [result] = await db.update(iuranKk).set({ jumlah, updatedAt: new Date() }).where(eq(iuranKk.id, iuranId)).returning();
    return result;
  }

  async getIuranRekap(tahun: string): Promise<{ bulan: string; totalKk: number; sudahBayar: number; belumBayar: number; totalNominal: number }[]> {
    const all = await db.select({ bulanTahun: iuranKk.bulanTahun, status: iuranKk.status, jumlah: iuranKk.jumlah }).from(iuranKk).where(sql`${iuranKk.bulanTahun} LIKE ${tahun + "-%"}`);
    const byBulan: Record<string, { totalKk: number; sudahBayar: number; belumBayar: number; totalNominal: number }> = {};
    for (const row of all) {
      if (!byBulan[row.bulanTahun]) byBulan[row.bulanTahun] = { totalKk: 0, sudahBayar: 0, belumBayar: 0, totalNominal: 0 };
      byBulan[row.bulanTahun].totalKk++;
      if (row.status === "lunas") { byBulan[row.bulanTahun].sudahBayar++; byBulan[row.bulanTahun].totalNominal += Number(row.jumlah); }
      else byBulan[row.bulanTahun].belumBayar++;
    }
    return Object.entries(byBulan).sort(([a], [b]) => a.localeCompare(b)).map(([bulan, v]) => ({ bulan, ...v }));
  }

  async getIuranByKkId(kkId: number): Promise<IuranKk[]> {
    return db.select().from(iuranKk).where(eq(iuranKk.kkId, kkId)).orderBy(desc(iuranKk.bulanTahun));
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
    const lower = new Date(today);
    lower.setDate(lower.getDate() + hari - 1);
    const upper = new Date(today);
    upper.setDate(upper.getDate() + hari);
    const lowerStr = lower.toISOString().split("T")[0];
    const upperStr = upper.toISOString().split("T")[0];

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
        or(
          eq(wargaSinggah.tanggalHabisKontrak, upperStr),
          eq(wargaSinggah.tanggalHabisKontrak, lowerStr)
        )
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
    const lower = new Date(today);
    lower.setDate(lower.getDate() + hari - 1);
    const upper = new Date(today);
    upper.setDate(upper.getDate() + hari);
    const lowerStr = lower.toISOString().split("T")[0];
    const upperStr = upper.toISOString().split("T")[0];
    const allUsahaData = await db.select().from(usaha).where(eq(usaha.status, "disetujui"));
    return allUsahaData.filter(u => u.tanggalStikerExpired === upperStr || u.tanggalStikerExpired === lowerStr);
  }

  async getMonthlySnapshots(): Promise<MonthlySnapshot[]> {
    return db.select().from(monthlySnapshot).orderBy(monthlySnapshot.month);
  }

  async upsertMonthlySnapshot(data: InsertMonthlySnapshot): Promise<MonthlySnapshot> {
    const existing = await db.select().from(monthlySnapshot).where(eq(monthlySnapshot.month, data.month));
    if (existing.length > 0) {
      const [result] = await db.update(monthlySnapshot).set(data).where(eq(monthlySnapshot.month, data.month)).returning();
      return result;
    }
    const [result] = await db.insert(monthlySnapshot).values(data).returning();
    return result;
  }

  async captureCurrentSnapshot(): Promise<MonthlySnapshot> {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const allKk = await db.select().from(kartuKeluarga);
    const allWarga = await db.select().from(warga);
    const allLaporanData = await db.select().from(laporan);
    const allSuratData = await db.select().from(suratWarga);
    const allUsahaData = await db.select().from(usaha);
    const allSinggah = await db.select().from(wargaSinggah);

    const PENGANGGURAN_KEYWORDS = ["tidak bekerja", "belum bekerja", "pengangguran", "belum/tidak bekerja", "tidak diketahui", ""];
    const pengangguranCount = allWarga.filter(w => {
      const job = (w.pekerjaan || "").toLowerCase().trim();
      const isUnemployed = !job || PENGANGGURAN_KEYWORDS.some(k => job === k);
      if (!isUnemployed) return false;
      if (w.tanggalLahir) {
        const birth = new Date(w.tanggalLahir);
        if (!isNaN(birth.getTime())) {
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
          if (age < 18) return false;
        }
      }
      return true;
    }).length;

    const waRegistered = allWarga.filter(w => w.nomorWhatsapp && w.nomorWhatsapp.trim() !== "").length;
    const ktpUploaded = allWarga.filter(w => w.fotoKtp && w.fotoKtp.trim() !== "").length;
    const kkFotoUploaded = allKk.filter(k => k.fotoKk && k.fotoKk.trim() !== "").length;
    const penerimaBansos = allKk.filter(k => k.penerimaBansos).length;
    const usahaBerizin = allUsahaData.filter(u => u.status === "disetujui").length;
    const laporanSelesai = allLaporanData.filter(l => l.status === "selesai").length;
    const suratSelesai = allSuratData.filter(s => s.status === "selesai" || s.status === "disetujui").length;
    const singgahAktif = allSinggah.filter(s => s.status === "aktif").length;

    const kasData = await db.select().from(kasRw);
    const pemasukan = kasData.filter(k => k.tipe === "pemasukan").reduce((s, k) => s + k.jumlah, 0);
    const pengeluaranVal = kasData.filter(k => k.tipe === "pengeluaran").reduce((s, k) => s + k.jumlah, 0);

    const totalW = allWarga.length || 1;
    const totalK = allKk.length || 1;
    const waP = Math.round((waRegistered / totalW) * 100);
    const ktpP = Math.round((ktpUploaded / totalW) * 100);
    const kkP = Math.round((kkFotoUploaded / totalK) * 100);
    const bansosP = Math.round((penerimaBansos / totalK) * 100);
    const usahaP = allUsahaData.length > 0 ? Math.round((usahaBerizin / allUsahaData.length) * 100) : 0;
    const pengangguranP = Math.max(0, 100 - Math.round((pengangguranCount / totalW) * 100));
    const laporanP = allLaporanData.length > 0 ? Math.round((laporanSelesai / allLaporanData.length) * 100) : 100;

    const indeks = Math.round((waP + ktpP + kkP + bansosP + usahaP + pengangguranP + laporanP) / 7);

    const snapshotData: InsertMonthlySnapshot = {
      month: currentMonth,
      totalKk: allKk.length,
      totalWarga: allWarga.length,
      pengangguran: pengangguranCount,
      waRegistered,
      ktpUploaded,
      kkFotoUploaded,
      penerimaBansos,
      usahaBerizin,
      totalUsaha: allUsahaData.length,
      laporanSelesai,
      totalLaporan: allLaporanData.length,
      suratSelesai,
      totalSurat: allSuratData.length,
      pemasukan,
      pengeluaran: pengeluaranVal,
      saldo: pemasukan - pengeluaranVal,
      wargaSinggahAktif: singgahAktif,
      indeksKemajuan: indeks,
    };

    return this.upsertMonthlySnapshot(snapshotData);
  }

  async getAllProgramRw(): Promise<ProgramRw[]> {
    return db.select().from(programRw).orderBy(desc(programRw.tanggalPelaksanaan));
  }

  async getProgramRwById(id: number): Promise<ProgramRw | undefined> {
    const [result] = await db.select().from(programRw).where(eq(programRw.id, id));
    return result;
  }

  async createProgramRw(data: InsertProgramRw): Promise<ProgramRw> {
    const [result] = await db.insert(programRw).values(data).returning();
    return result;
  }

  async updateProgramRw(id: number, data: Partial<InsertProgramRw>): Promise<ProgramRw | undefined> {
    const [result] = await db.update(programRw).set(data).where(eq(programRw.id, id)).returning();
    return result;
  }

  async deleteProgramRw(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(pesertaProgram).where(eq(pesertaProgram.programId, id));
      await tx.delete(programRw).where(eq(programRw.id, id));
    });
  }

  async getPesertaByProgramId(programId: number): Promise<(PesertaProgram & { nomorKk: string | null; alamat: string | null; kepalaKeluarga: string | null })[]> {
    const results = await db.select({
      id: pesertaProgram.id,
      programId: pesertaProgram.programId,
      kkId: pesertaProgram.kkId,
      namaManual: pesertaProgram.namaManual,
      kehadiran: pesertaProgram.kehadiran,
      catatan: pesertaProgram.catatan,
      createdAt: pesertaProgram.createdAt,
      nomorKk: kartuKeluarga.nomorKk,
      alamat: kartuKeluarga.alamat,
      kepalaKeluarga: sql<string | null>`(
        SELECT nama_lengkap FROM warga
        WHERE kk_id = ${pesertaProgram.kkId}
        AND kedudukan_keluarga = 'Kepala Keluarga'
        LIMIT 1
      )`,
    })
      .from(pesertaProgram)
      .leftJoin(kartuKeluarga, eq(pesertaProgram.kkId, kartuKeluarga.id))
      .where(eq(pesertaProgram.programId, programId))
      .orderBy(pesertaProgram.createdAt);
    return results;
  }

  async addPesertaProgram(data: InsertPesertaProgram): Promise<PesertaProgram> {
    const [result] = await db.insert(pesertaProgram).values(data).returning();
    return result;
  }

  async updateKehadiranPeserta(id: number, kehadiran: string, catatan?: string): Promise<PesertaProgram | undefined> {
    const updateData: Partial<PesertaProgram> = { kehadiran };
    if (catatan !== undefined) updateData.catatan = catatan;
    const [result] = await db.update(pesertaProgram).set(updateData).where(eq(pesertaProgram.id, id)).returning();
    return result;
  }

  async deletePesertaProgram(id: number): Promise<void> {
    await db.delete(pesertaProgram).where(eq(pesertaProgram.id, id));
  }

  // ============ RWCOIN ============

  async getAllMitra(): Promise<Mitra[]> {
    return db.select().from(mitra).orderBy(mitra.namaUsaha);
  }

  async getMitraById(id: number): Promise<Mitra | undefined> {
    const [result] = await db.select().from(mitra).where(eq(mitra.id, id));
    return result;
  }

  async getMitraByWaKasir(nomorWa: string): Promise<Mitra | undefined> {
    const [result] = await db.select().from(mitra).where(eq(mitra.nomorWaKasir, nomorWa));
    return result;
  }

  async createMitra(data: Omit<Mitra, "id" | "createdAt">): Promise<Mitra> {
    const [result] = await db.insert(mitra).values(data).returning();
    // Auto-create wallet for mitra
    const kodeWallet = "MT" + String(result.id).padStart(4, "0");
    await db.insert(rwcoinWallet).values({ ownerType: "mitra", mitraId: result.id, kodeWallet }).onConflictDoNothing();
    return result;
  }

  async updateMitra(id: number, data: Partial<Mitra>): Promise<Mitra | undefined> {
    const [result] = await db.update(mitra).set(data).where(eq(mitra.id, id)).returning();
    return result;
  }

  async deleteMitra(id: number): Promise<void> {
    // Hapus semua data terkait terlebih dahulu (foreign key constraints)
    await db.delete(rwcoinPendingTransaksi).where(eq(rwcoinPendingTransaksi.mitraId, id));
    await db.delete(rwcoinWithdraw).where(eq(rwcoinWithdraw.mitraId, id));
    await db.delete(mitraDiskon).where(eq(mitraDiskon.mitraId, id));
    await db.delete(mitraVoucher).where(eq(mitraVoucher.mitraId, id));
    await db.delete(rwcoinTransaksi).where(eq(rwcoinTransaksi.mitraId, id));
    await db.delete(rwcoinWallet).where(eq(rwcoinWallet.mitraId, id));
    await db.delete(mitra).where(eq(mitra.id, id));
  }

  async getOrCreateWargaWallet(wargaId: number): Promise<RwcoinWallet> {
    const existing = await db.select().from(rwcoinWallet).where(and(eq(rwcoinWallet.ownerType, "warga"), eq(rwcoinWallet.wargaId, wargaId)));
    if (existing[0]) return existing[0];
    const kodeWallet = "WG" + String(wargaId).padStart(4, "0");
    const [result] = await db.insert(rwcoinWallet).values({ ownerType: "warga", wargaId, kodeWallet }).returning();
    return result;
  }

  async getOrCreateMitraWallet(mitraId: number): Promise<RwcoinWallet> {
    const existing = await db.select().from(rwcoinWallet).where(and(eq(rwcoinWallet.ownerType, "mitra"), eq(rwcoinWallet.mitraId, mitraId)));
    if (existing[0]) return existing[0];
    const kodeWallet = "MT" + String(mitraId).padStart(4, "0");
    const [result] = await db.insert(rwcoinWallet).values({ ownerType: "mitra", mitraId, kodeWallet }).returning();
    return result;
  }

  async getWalletByKode(kodeWallet: string): Promise<RwcoinWallet | undefined> {
    const [result] = await db.select().from(rwcoinWallet).where(eq(rwcoinWallet.kodeWallet, kodeWallet));
    return result;
  }

  async getWargaWalletPreview(kodeWallet: string): Promise<{ kodeWallet: string; namaWarga: string; rt: number } | null> {
    const kode = kodeWallet.trim().toUpperCase();
    const [w] = await db.select({
      kodeWallet: rwcoinWallet.kodeWallet,
      ownerType: rwcoinWallet.ownerType,
      wargaId: rwcoinWallet.wargaId,
    }).from(rwcoinWallet).where(eq(rwcoinWallet.kodeWallet, kode));
    if (!w || w.ownerType !== "warga" || !w.wargaId) return null;
    const [wargaData] = await db.select({
      namaLengkap: warga.namaLengkap,
      rt: kartuKeluarga.rt,
    }).from(warga)
      .leftJoin(kartuKeluarga, eq(warga.kkId, kartuKeluarga.id))
      .where(eq(warga.id, w.wargaId));
    if (!wargaData) return null;
    return { kodeWallet: kode, namaWarga: wargaData.namaLengkap, rt: wargaData.rt ?? 0 };
  }

  async getWalletByWargaId(wargaId: number): Promise<RwcoinWallet | undefined> {
    const [result] = await db.select().from(rwcoinWallet).where(and(eq(rwcoinWallet.ownerType, "warga"), eq(rwcoinWallet.wargaId, wargaId)));
    return result;
  }

  async getWalletByMitraId(mitraId: number): Promise<RwcoinWallet | undefined> {
    const [result] = await db.select().from(rwcoinWallet).where(and(eq(rwcoinWallet.ownerType, "mitra"), eq(rwcoinWallet.mitraId, mitraId)));
    return result;
  }

  async createTopupRequest(data: { wargaId: number; namaWarga: string; noWa?: string; jumlah: number; metode: string; rekening: string; atasnama: string; totalTransfer: number }): Promise<RwcoinTopupRequest> {
    const [result] = await db.insert(rwcoinTopupRequest).values({
      wargaId: data.wargaId,
      namaWarga: data.namaWarga,
      noWa: data.noWa ?? null,
      jumlah: data.jumlah,
      metode: data.metode,
      rekening: data.rekening,
      atasnama: data.atasnama,
      totalTransfer: data.totalTransfer,
    }).returning();
    return result;
  }

  async getTopupRequests(status?: string): Promise<RwcoinTopupRequest[]> {
    if (status) {
      return await db.select().from(rwcoinTopupRequest).where(eq(rwcoinTopupRequest.status, status)).orderBy(desc(rwcoinTopupRequest.createdAt));
    }
    return await db.select().from(rwcoinTopupRequest).orderBy(desc(rwcoinTopupRequest.createdAt));
  }

  async accTopupRequest(id: number): Promise<{ request: RwcoinTopupRequest; transaksi: RwcoinTransaksi }> {
    const [req] = await db.select().from(rwcoinTopupRequest).where(eq(rwcoinTopupRequest.id, id));
    if (!req || req.status !== "pending") throw new Error("Request tidak ditemukan atau sudah diproses");
    const transaksi = await this.topupWargaWallet(req.wargaId, req.jumlah, `Topup via ${req.metode}`);
    // Catat admin fee ke kas (selisih totalTransfer - jumlah topup)
    const adminFee = req.totalTransfer - req.jumlah;
    if (adminFee > 0) {
      await db.insert(kasRwcoin).values({
        tipe: "pemasukan", tipeDetail: "admin_fee", jumlah: adminFee,
        referensiId: String(id),
        keterangan: `Admin fee topup #${id} (${req.namaWarga}) via ${req.metode}`,
      });
    }
    const [updated] = await db.update(rwcoinTopupRequest).set({ status: "approved", updatedAt: new Date() }).where(eq(rwcoinTopupRequest.id, id)).returning();
    return { request: updated, transaksi };
  }

  async tolakTopupRequest(id: number, catatan?: string): Promise<RwcoinTopupRequest | undefined> {
    const [updated] = await db.update(rwcoinTopupRequest).set({ status: "rejected", catatan: catatan ?? null, updatedAt: new Date() }).where(eq(rwcoinTopupRequest.id, id)).returning();
    return updated;
  }

  async topupWargaWallet(wargaId: number, jumlah: number, keterangan: string): Promise<RwcoinTransaksi> {
    const wallet = await this.getOrCreateWargaWallet(wargaId);
    const kode = "TP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    await db.update(rwcoinWallet).set({
      saldo: wallet.saldo + jumlah,
      totalTopup: wallet.totalTopup + jumlah,
      updatedAt: new Date(),
    }).where(eq(rwcoinWallet.id, wallet.id));
    const [transaksi] = await db.insert(rwcoinTransaksi).values({
      kodeTransaksi: kode, tipe: "topup", wargaId,
      jumlahBruto: jumlah, jumlahBayar: jumlah, keterangan,
    }).returning();
    // Catat ke kas RWcoin
    await db.insert(kasRwcoin).values({
      tipe: "pemasukan", tipeDetail: "topup_coin", jumlah, referensiId: kode,
      keterangan: `Topup warga (${kode}): ${keterangan}`,
    });
    return transaksi;
  }

  // Helper internal: eksekusi belanja dengan nilai pre-calculated (tanpa hitung ulang diskon)
  private async _executeBelanja(
    walletWarga: RwcoinWallet,
    mitraId: number,
    jumlahBruto: number,
    jumlahDiskon: number,
    jumlahBayar: number,
    voucherKode?: string,
    keterangan?: string,
    voucherSubsidiAdmin?: boolean, // true = admin nanggung diskon, mitra dapat full
  ): Promise<{ transaksi: RwcoinTransaksi; diskon: number; namaWarga: string }> {
    if (walletWarga.saldo < jumlahBayar) throw new Error("Saldo tidak cukup");

    await db.update(rwcoinWallet).set({
      saldo: walletWarga.saldo - jumlahBayar,
      totalBelanja: walletWarga.totalBelanja + jumlahBayar,
      updatedAt: new Date(),
    }).where(eq(rwcoinWallet.id, walletWarga.id));

    // Mitra dapat: full (jumlahBruto) jika voucher admin subsidi, atau hanya jumlahBayar jika mitra nanggung sendiri
    const jumlahKeMitra = voucherSubsidiAdmin && jumlahDiskon > 0 ? jumlahBruto : jumlahBayar;
    const walletMitra = await this.getOrCreateMitraWallet(mitraId);
    await db.update(rwcoinWallet).set({
      saldo: walletMitra.saldo + jumlahKeMitra,
      updatedAt: new Date(),
    }).where(eq(rwcoinWallet.id, walletMitra.id));

    // Catat pengeluaran kas jika admin subsidi voucher
    if (voucherSubsidiAdmin && jumlahDiskon > 0) {
      await db.insert(kasRwcoin).values({
        tipe: "pengeluaran", tipeDetail: "subsidi_voucher", jumlah: jumlahDiskon,
        referensiId: voucherKode ?? null,
        keterangan: `Subsidi voucher ${voucherKode ?? ""} — admin bayar ${jumlahDiskon} coin ke mitra`,
      });
    }

    // Increment terpakai voucher jika ada
    if (voucherKode) {
      const [v] = await db.select().from(mitraVoucher).where(eq(mitraVoucher.kode, voucherKode));
      if (v) await db.update(mitraVoucher).set({ terpakai: v.terpakai + 1 }).where(eq(mitraVoucher.id, v.id));
    }

    const kode = "BL" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    const [transaksi] = await db.insert(rwcoinTransaksi).values({
      kodeTransaksi: kode, tipe: "belanja",
      wargaId: walletWarga.wargaId, mitraId,
      jumlahBruto, jumlahDiskon, jumlahBayar,
      voucherKode: voucherKode ?? null, keterangan: keterangan ?? null,
    }).returning();

    const wargaData = await db.select({ nama: warga.namaLengkap }).from(warga).where(eq(warga.id, walletWarga.wargaId!));
    return { transaksi, diskon: jumlahDiskon, namaWarga: wargaData[0]?.nama ?? "Warga" };
  }

  async processBelanjaTransaksi(kodeWalletStr: string, mitraId: number, jumlahBruto: number, voucherKode?: string, keterangan?: string): Promise<{ transaksi: RwcoinTransaksi; diskon: number; namaWarga: string }> {
    const walletWarga = await this.getWalletByKode(kodeWalletStr);
    if (!walletWarga || walletWarga.ownerType !== "warga" || !walletWarga.wargaId) throw new Error("Kode wallet tidak ditemukan");

    let jumlahDiskon = 0;
    const today = new Date().toISOString().split("T")[0];

    // Cek diskon aktif mitra
    const diskonAktif = await db.select().from(mitraDiskon).where(
      and(eq(mitraDiskon.mitraId, mitraId), eq(mitraDiskon.isActive, true))
    );
    for (const d of diskonAktif) {
      if (d.berlakuMulai && today < d.berlakuMulai) continue;
      if (d.berlakuHingga && today > d.berlakuHingga) continue;
      const potongan = d.tipe === "persen" ? Math.floor(jumlahBruto * d.nilai / 100) : Math.min(d.nilai, jumlahBruto);
      jumlahDiskon = Math.max(jumlahDiskon, potongan);
    }

    // Cek voucher
    let voucherUsed: string | undefined;
    let voucherSubsidiAdmin = false;
    if (voucherKode) {
      const [v] = await db.select().from(mitraVoucher).where(and(eq(mitraVoucher.kode, voucherKode), eq(mitraVoucher.isActive, true)));
      if (v) {
        const valid = (!v.berlakuHingga || today <= v.berlakuHingga) &&
          (!v.kuota || v.terpakai < v.kuota) &&
          jumlahBruto >= v.minTransaksi &&
          (!v.mitraId || v.mitraId === mitraId);
        if (valid) {
          const addDiskon = v.tipe === "persen" ? Math.floor(jumlahBruto * v.nilai / 100) : v.nilai;
          jumlahDiskon = Math.min(jumlahDiskon + addDiskon, jumlahBruto);
          voucherUsed = voucherKode;
          voucherSubsidiAdmin = v.subsidiAdmin ?? false;
        }
      }
    }

    const jumlahBayar = jumlahBruto - jumlahDiskon;
    return this._executeBelanja(walletWarga, mitraId, jumlahBruto, jumlahDiskon, jumlahBayar, voucherUsed, keterangan, voucherSubsidiAdmin);
  }

  async processTransferAntar(
    pengirimWargaId: number,
    tujuanKodeWallet: string,
    jumlah: number,
    keterangan?: string,
  ): Promise<{ transaksi: RwcoinTransaksi; namaPenerima: string; namaWarga: string; saldoBaruPenerima: number }> {
    if (jumlah <= 0) throw new Error("Jumlah transfer harus lebih dari 0");
    if (jumlah < 100) throw new Error("Minimal transfer 100 coin");

    const kode = tujuanKodeWallet.trim().toUpperCase();
    const walletTujuan = await this.getWalletByKode(kode);
    if (!walletTujuan) throw new Error("Kode wallet tujuan tidak ditemukan");
    if (walletTujuan.ownerType !== "warga" || !walletTujuan.wargaId) throw new Error("Tujuan harus wallet warga, bukan mitra");
    if (walletTujuan.wargaId === pengirimWargaId) throw new Error("Tidak bisa transfer ke diri sendiri");

    const walletPengirim = await this.getOrCreateWargaWallet(pengirimWargaId);
    if (walletPengirim.saldo < jumlah) throw new Error(`Saldo tidak cukup. Saldo Anda: ${walletPengirim.saldo.toLocaleString("id")} coin`);

    const kodeTransaksi = "TR" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

    // Atomic: debit pengirim, credit penerima, insert transaksi
    const [transaksi] = await db.transaction(async (tx) => {
      await tx.update(rwcoinWallet).set({
        saldo: walletPengirim.saldo - jumlah,
        updatedAt: new Date(),
      }).where(eq(rwcoinWallet.id, walletPengirim.id));

      await tx.update(rwcoinWallet).set({
        saldo: walletTujuan.saldo + jumlah,
        updatedAt: new Date(),
      }).where(eq(rwcoinWallet.id, walletTujuan.id));

      return tx.insert(rwcoinTransaksi).values({
        kodeTransaksi,
        tipe: "transfer",
        wargaId: pengirimWargaId,
        tujuanWargaId: walletTujuan.wargaId,
        jumlahBruto: jumlah,
        jumlahBayar: jumlah,
        keterangan: keterangan ?? null,
      }).returning();
    });

    const [pengirimData] = await db.select({ nama: warga.namaLengkap }).from(warga).where(eq(warga.id, pengirimWargaId));
    const [penerimaData] = await db.select({ nama: warga.namaLengkap, noWa: warga.nomorWhatsapp }).from(warga).where(eq(warga.id, walletTujuan.wargaId));

    return {
      transaksi,
      namaPenerima: penerimaData?.nama ?? "Penerima",
      namaWarga: pengirimData?.nama ?? "Pengirim",
      saldoBaruPenerima: walletTujuan.saldo + jumlah,
    };
  }

  async processWithdrawRequest(mitraId: number, jumlahCoin: number, nomorRekening: string, namaBank: string, atasNama: string, catatan?: string): Promise<RwcoinWithdraw> {
    const wallet = await this.getOrCreateMitraWallet(mitraId);
    if (wallet.saldo < jumlahCoin) throw new Error("Saldo coin tidak cukup untuk withdraw");
    await db.update(rwcoinWallet).set({
      saldo: wallet.saldo - jumlahCoin,
      totalWithdraw: wallet.totalWithdraw + jumlahCoin,
      updatedAt: new Date(),
    }).where(eq(rwcoinWallet.id, wallet.id));
    const [result] = await db.insert(rwcoinWithdraw).values({ mitraId, jumlahCoin, nomorRekening, namaBank, atasNama, catatan }).returning();
    return result;
  }

  async approveWithdraw(withdrawId: number, adminNama: string): Promise<RwcoinWithdraw | undefined> {
    const [result] = await db.update(rwcoinWithdraw).set({ status: "disetujui", disetujuiOleh: adminNama, disetujuiAt: new Date() }).where(eq(rwcoinWithdraw.id, withdrawId)).returning();
    return result;
  }

  async markWithdrawDibayar(withdrawId: number): Promise<RwcoinWithdraw | undefined> {
    const [result] = await db.update(rwcoinWithdraw).set({ status: "dibayar", dibayarAt: new Date() }).where(eq(rwcoinWithdraw.id, withdrawId)).returning();
    if (result) {
      // Catat pengeluaran ke kas RWcoin
      await db.insert(kasRwcoin).values({
        tipe: "pengeluaran", tipeDetail: "withdraw_mitra", jumlah: result.jumlahCoin, referensiId: String(result.id),
        keterangan: `Withdraw mitra #${result.mitraId} ke ${result.namaBank} ${result.nomorRekening}`,
      });
    }
    return result;
  }

  async rejectWithdraw(withdrawId: number, catatan: string): Promise<RwcoinWithdraw | undefined> {
    // Kembalikan coin ke mitra
    const [wd] = await db.select().from(rwcoinWithdraw).where(eq(rwcoinWithdraw.id, withdrawId));
    if (wd && wd.status === "pending") {
      const wallet = await this.getOrCreateMitraWallet(wd.mitraId);
      await db.update(rwcoinWallet).set({
        saldo: wallet.saldo + wd.jumlahCoin,
        totalWithdraw: Math.max(0, wallet.totalWithdraw - wd.jumlahCoin),
        updatedAt: new Date(),
      }).where(eq(rwcoinWallet.id, wallet.id));
    }
    const [result] = await db.update(rwcoinWithdraw).set({ status: "ditolak", catatan }).where(eq(rwcoinWithdraw.id, withdrawId)).returning();
    return result;
  }

  async getAllWithdrawRequests(): Promise<(RwcoinWithdraw & { namaUsaha: string; nomorWaKasir: string })[]> {
    const results = await db.select({
      id: rwcoinWithdraw.id, mitraId: rwcoinWithdraw.mitraId, jumlahCoin: rwcoinWithdraw.jumlahCoin,
      status: rwcoinWithdraw.status, catatan: rwcoinWithdraw.catatan,
      nomorRekening: rwcoinWithdraw.nomorRekening, namaBank: rwcoinWithdraw.namaBank, atasNama: rwcoinWithdraw.atasNama,
      disetujuiOleh: rwcoinWithdraw.disetujuiOleh, disetujuiAt: rwcoinWithdraw.disetujuiAt,
      dibayarAt: rwcoinWithdraw.dibayarAt, createdAt: rwcoinWithdraw.createdAt,
      namaUsaha: mitra.namaUsaha, nomorWaKasir: mitra.nomorWaKasir,
    }).from(rwcoinWithdraw).leftJoin(mitra, eq(rwcoinWithdraw.mitraId, mitra.id)).orderBy(desc(rwcoinWithdraw.createdAt));
    return results.map(r => ({ ...r, namaUsaha: r.namaUsaha ?? "", nomorWaKasir: r.nomorWaKasir ?? "" }));
  }

  async getWithdrawByMitraId(mitraId: number): Promise<RwcoinWithdraw[]> {
    return db.select().from(rwcoinWithdraw).where(eq(rwcoinWithdraw.mitraId, mitraId)).orderBy(desc(rwcoinWithdraw.createdAt));
  }

  async getAllRwcoinTransaksi(): Promise<(RwcoinTransaksi & { namaWarga: string | null; namaUsaha: string | null })[]> {
    const results = await db.select({
      id: rwcoinTransaksi.id, kodeTransaksi: rwcoinTransaksi.kodeTransaksi, tipe: rwcoinTransaksi.tipe,
      wargaId: rwcoinTransaksi.wargaId, mitraId: rwcoinTransaksi.mitraId,
      tujuanWargaId: rwcoinTransaksi.tujuanWargaId,
      jumlahBruto: rwcoinTransaksi.jumlahBruto, jumlahDiskon: rwcoinTransaksi.jumlahDiskon, jumlahBayar: rwcoinTransaksi.jumlahBayar,
      voucherKode: rwcoinTransaksi.voucherKode, keterangan: rwcoinTransaksi.keterangan, createdAt: rwcoinTransaksi.createdAt,
      namaWarga: warga.namaLengkap, namaUsaha: mitra.namaUsaha,
    }).from(rwcoinTransaksi)
      .leftJoin(warga, eq(rwcoinTransaksi.wargaId, warga.id))
      .leftJoin(mitra, eq(rwcoinTransaksi.mitraId, mitra.id))
      .orderBy(desc(rwcoinTransaksi.createdAt));
    return results;
  }

  async getRwcoinTransaksiByWargaId(wargaId: number): Promise<(RwcoinTransaksi & { namaUsaha: string | null; namaPengirim: string | null; namaPenerima: string | null })[]> {
    const wargaPengirim = alias(warga, "warga_pengirim");
    const wargaPenerima = alias(warga, "warga_penerima");
    const results = await db.select({
      id: rwcoinTransaksi.id, kodeTransaksi: rwcoinTransaksi.kodeTransaksi, tipe: rwcoinTransaksi.tipe,
      wargaId: rwcoinTransaksi.wargaId, mitraId: rwcoinTransaksi.mitraId,
      tujuanWargaId: rwcoinTransaksi.tujuanWargaId,
      jumlahBruto: rwcoinTransaksi.jumlahBruto, jumlahDiskon: rwcoinTransaksi.jumlahDiskon, jumlahBayar: rwcoinTransaksi.jumlahBayar,
      voucherKode: rwcoinTransaksi.voucherKode, keterangan: rwcoinTransaksi.keterangan, createdAt: rwcoinTransaksi.createdAt,
      namaUsaha: mitra.namaUsaha,
      namaPengirim: wargaPengirim.namaLengkap,
      namaPenerima: wargaPenerima.namaLengkap,
    }).from(rwcoinTransaksi)
      .leftJoin(mitra, eq(rwcoinTransaksi.mitraId, mitra.id))
      .leftJoin(wargaPengirim, eq(rwcoinTransaksi.wargaId, wargaPengirim.id))
      .leftJoin(wargaPenerima, eq(rwcoinTransaksi.tujuanWargaId, wargaPenerima.id))
      .where(or(
        eq(rwcoinTransaksi.wargaId, wargaId),
        eq(rwcoinTransaksi.tujuanWargaId, wargaId),
      ))
      .orderBy(desc(rwcoinTransaksi.createdAt));
    return results as any;
  }

  async getRwcoinTransaksiByMitraId(mitraId: number): Promise<(RwcoinTransaksi & { namaWarga: string | null })[]> {
    const results = await db.select({
      id: rwcoinTransaksi.id, kodeTransaksi: rwcoinTransaksi.kodeTransaksi, tipe: rwcoinTransaksi.tipe,
      wargaId: rwcoinTransaksi.wargaId, mitraId: rwcoinTransaksi.mitraId,
      tujuanWargaId: rwcoinTransaksi.tujuanWargaId,
      jumlahBruto: rwcoinTransaksi.jumlahBruto, jumlahDiskon: rwcoinTransaksi.jumlahDiskon, jumlahBayar: rwcoinTransaksi.jumlahBayar,
      voucherKode: rwcoinTransaksi.voucherKode, keterangan: rwcoinTransaksi.keterangan, createdAt: rwcoinTransaksi.createdAt,
      namaWarga: warga.namaLengkap,
    }).from(rwcoinTransaksi)
      .leftJoin(warga, eq(rwcoinTransaksi.wargaId, warga.id))
      .where(eq(rwcoinTransaksi.mitraId, mitraId))
      .orderBy(desc(rwcoinTransaksi.createdAt));
    return results;
  }

  async getAllVoucher(): Promise<MitraVoucher[]> {
    return db.select().from(mitraVoucher).orderBy(desc(mitraVoucher.createdAt));
  }

  async getVoucherByKode(kode: string): Promise<MitraVoucher | undefined> {
    const [result] = await db.select().from(mitraVoucher).where(eq(mitraVoucher.kode, kode.toUpperCase()));
    return result;
  }

  async createVoucher(data: Omit<MitraVoucher, "id" | "createdAt" | "terpakai">): Promise<MitraVoucher> {
    const [result] = await db.insert(mitraVoucher).values({ ...data, kode: data.kode.toUpperCase() }).returning();
    return result;
  }

  async updateVoucher(id: number, data: Partial<MitraVoucher>): Promise<MitraVoucher | undefined> {
    const [result] = await db.update(mitraVoucher).set(data).where(eq(mitraVoucher.id, id)).returning();
    return result;
  }

  async deleteVoucher(id: number): Promise<void> {
    await db.delete(mitraVoucher).where(eq(mitraVoucher.id, id));
  }

  async getDiskonByMitraId(mitraId: number): Promise<MitraDiskon[]> {
    return db.select().from(mitraDiskon).where(eq(mitraDiskon.mitraId, mitraId)).orderBy(desc(mitraDiskon.createdAt));
  }

  async getAllDiskon(): Promise<MitraDiskon[]> {
    return db.select().from(mitraDiskon).orderBy(desc(mitraDiskon.createdAt));
  }

  async createDiskon(data: Omit<MitraDiskon, "id" | "createdAt">): Promise<MitraDiskon> {
    const [result] = await db.insert(mitraDiskon).values(data).returning();
    return result;
  }

  async updateDiskon(id: number, data: Partial<MitraDiskon>): Promise<MitraDiskon | undefined> {
    const [result] = await db.update(mitraDiskon).set(data).where(eq(mitraDiskon.id, id)).returning();
    return result;
  }

  async deleteDiskon(id: number): Promise<void> {
    await db.delete(mitraDiskon).where(eq(mitraDiskon.id, id));
  }

  async getRwcoinStats(): Promise<{ totalWallet: number; totalSaldo: number; totalTransaksi: number; totalTopup: number; totalBelanja: number; totalWithdrawPending: number }> {
    const [walletStats] = await db.select({
      totalWallet: count(rwcoinWallet.id),
      totalSaldo: sql<number>`COALESCE(SUM(CASE WHEN ${rwcoinWallet.ownerType} = 'warga' THEN ${rwcoinWallet.saldo} ELSE 0 END), 0)`,
    }).from(rwcoinWallet);
    const [txStats] = await db.select({
      totalTransaksi: count(rwcoinTransaksi.id),
      totalTopup: sql<number>`COALESCE(SUM(CASE WHEN ${rwcoinTransaksi.tipe} = 'topup' THEN ${rwcoinTransaksi.jumlahBayar} ELSE 0 END), 0)`,
      totalBelanja: sql<number>`COALESCE(SUM(CASE WHEN ${rwcoinTransaksi.tipe} = 'belanja' THEN ${rwcoinTransaksi.jumlahBayar} ELSE 0 END), 0)`,
    }).from(rwcoinTransaksi);
    const [wdStats] = await db.select({ totalWithdrawPending: count(rwcoinWithdraw.id) }).from(rwcoinWithdraw).where(eq(rwcoinWithdraw.status, "pending"));
    return {
      totalWallet: walletStats.totalWallet,
      totalSaldo: Number(walletStats.totalSaldo),
      totalTransaksi: txStats.totalTransaksi,
      totalTopup: Number(txStats.totalTopup),
      totalBelanja: Number(txStats.totalBelanja),
      totalWithdrawPending: wdStats.totalWithdrawPending,
    };
  }

  async getKasRwcoin(): Promise<{ list: KasRwcoin[]; saldo: number }> {
    const list = await db.select().from(kasRwcoin).orderBy(desc(kasRwcoin.createdAt));
    const saldo = list.reduce((acc, r) => r.tipe === "pemasukan" ? acc + r.jumlah : acc - r.jumlah, 0);
    return { list, saldo };
  }

  async injectKas(data: { tipe: string; jumlah: number; keterangan: string }): Promise<KasRwcoin> {
    const [row] = await db.insert(kasRwcoin).values({
      tipe: data.tipe as any,
      tipeDetail: "inject_admin",
      jumlah: data.jumlah,
      keterangan: data.keterangan,
    }).returning();
    return row;
  }

  // Defaults: topup_fee=2500, withdraw_fee=5000, min_topup=10000, min_withdraw=10000
  private readonly SETTING_DEFAULTS: Record<string, { value: string; label: string; keterangan: string }> = {
    topup_fee: { value: "2500", label: "Biaya Admin Topup", keterangan: "Biaya yang dikenakan ke warga setiap kali request topup coin (Rp)" },
    withdraw_fee: { value: "5000", label: "Potongan Admin Withdraw", keterangan: "Potongan dari jumlah withdraw mitra sebelum ditransfer ke rekening (Rp)" },
    min_topup: { value: "10000", label: "Minimal Topup", keterangan: "Nominal minimum topup coin per request (Rp)" },
    min_withdraw: { value: "10000", label: "Minimal Withdraw", keterangan: "Jumlah coin minimum yang bisa di-withdraw oleh mitra" },
  };

  async getRwcoinSettings(): Promise<RwcoinSettings[]> {
    const existing = await db.select().from(rwcoinSettings).orderBy(desc(rwcoinSettings.id));
    // Deduplikasi: ambil baris terbaru (id terbesar) per key — antisipasi duplikat tanpa unique constraint
    const latest = new Map<string, RwcoinSettings>();
    for (const row of existing) {
      if (!latest.has(row.key)) latest.set(row.key, row);
    }
    // Seed defaults yang belum ada
    const toInsert = Object.entries(this.SETTING_DEFAULTS)
      .filter(([key]) => !latest.has(key))
      .map(([key, def]) => ({ key, value: def.value, label: def.label, keterangan: def.keterangan }));
    if (toInsert.length > 0) {
      const inserted = await db.insert(rwcoinSettings).values(toInsert).returning();
      for (const row of inserted) latest.set(row.key, row);
    }
    return Array.from(latest.values()).sort((a, b) => a.key.localeCompare(b.key));
  }

  async getRwcoinSettingValue(key: string, defaultValue: number): Promise<number> {
    const rows = await db.select({ value: rwcoinSettings.value }).from(rwcoinSettings).where(eq(rwcoinSettings.key, key));
    return rows[0] ? parseInt(rows[0].value) || defaultValue : defaultValue;
  }

  async upsertRwcoinSetting(key: string, value: string): Promise<RwcoinSettings> {
    const def = this.SETTING_DEFAULTS[key];
    const [updated] = await db.update(rwcoinSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(rwcoinSettings.key, key))
      .returning();
    if (updated) return updated;
    const [inserted] = await db.insert(rwcoinSettings)
      .values({ key, value, label: def?.label ?? key, keterangan: def?.keterangan ?? null })
      .returning();
    return inserted;
  }

  async getRwcoinDashboard(): Promise<{
    transaksiTerbaru: any[];
    topupTerbaru: any[];
    leaderboardMitra: { mitraId: number; namaUsaha: string; totalBelanja: number; jumlahTx: number }[];
    perputaran: { totalDiWarga: number; totalDiMitra: number; totalWithdrawn: number; totalBeredar: number };
    ekonomi: { velocity: number; retention: number; totalPernahTopup: number; activeWarga: number; activeMitra: number; budgetSubsidi: number; topSpenders: { wargaId: number; namaWarga: string; totalBelanja: number; jumlahTx: number }[] };
  }> {
    // 5 transaksi terakhir (semua tipe)
    const transaksiTerbaru = await db.select({
      id: rwcoinTransaksi.id,
      kodeTransaksi: rwcoinTransaksi.kodeTransaksi,
      tipe: rwcoinTransaksi.tipe,
      wargaId: rwcoinTransaksi.wargaId,
      mitraId: rwcoinTransaksi.mitraId,
      jumlahBruto: rwcoinTransaksi.jumlahBruto,
      jumlahDiskon: rwcoinTransaksi.jumlahDiskon,
      jumlahBayar: rwcoinTransaksi.jumlahBayar,
      voucherKode: rwcoinTransaksi.voucherKode,
      keterangan: rwcoinTransaksi.keterangan,
      createdAt: rwcoinTransaksi.createdAt,
      namaWarga: warga.namaLengkap,
      namaUsaha: mitra.namaUsaha,
    }).from(rwcoinTransaksi)
      .leftJoin(warga, eq(rwcoinTransaksi.wargaId, warga.id))
      .leftJoin(mitra, eq(rwcoinTransaksi.mitraId, mitra.id))
      .orderBy(desc(rwcoinTransaksi.createdAt))
      .limit(5);

    // 5 topup terakhir
    const topupTerbaru = await db.select({
      id: rwcoinTransaksi.id,
      kodeTransaksi: rwcoinTransaksi.kodeTransaksi,
      tipe: rwcoinTransaksi.tipe,
      wargaId: rwcoinTransaksi.wargaId,
      jumlahBayar: rwcoinTransaksi.jumlahBayar,
      keterangan: rwcoinTransaksi.keterangan,
      createdAt: rwcoinTransaksi.createdAt,
      namaWarga: warga.namaLengkap,
    }).from(rwcoinTransaksi)
      .leftJoin(warga, eq(rwcoinTransaksi.wargaId, warga.id))
      .where(eq(rwcoinTransaksi.tipe, "topup"))
      .orderBy(desc(rwcoinTransaksi.createdAt))
      .limit(5);

    // Leaderboard mitra — ambil semua belanja, agregasi di JS
    const semuaBelanja = await db.select({
      mitraId: rwcoinTransaksi.mitraId,
      jumlahBruto: rwcoinTransaksi.jumlahBruto,
      namaUsaha: mitra.namaUsaha,
    }).from(rwcoinTransaksi)
      .leftJoin(mitra, eq(rwcoinTransaksi.mitraId, mitra.id))
      .where(eq(rwcoinTransaksi.tipe, "belanja"));

    const mitraMap = new Map<number, { namaUsaha: string; totalBelanja: number; jumlahTx: number }>();
    for (const row of semuaBelanja) {
      if (!row.mitraId) continue;
      const existing = mitraMap.get(row.mitraId);
      if (existing) {
        existing.totalBelanja += row.jumlahBruto;
        existing.jumlahTx += 1;
      } else {
        mitraMap.set(row.mitraId, { namaUsaha: row.namaUsaha ?? "Mitra", totalBelanja: row.jumlahBruto, jumlahTx: 1 });
      }
    }
    const leaderboardMitra = Array.from(mitraMap.entries())
      .map(([mitraId, data]) => ({ mitraId, ...data }))
      .sort((a, b) => b.totalBelanja - a.totalBelanja)
      .slice(0, 5);

    // Perputaran coin — dari wallet
    const allWallets = await db.select({ ownerType: rwcoinWallet.ownerType, saldo: rwcoinWallet.saldo }).from(rwcoinWallet);
    const totalDiWarga = allWallets.filter(w => w.ownerType === "warga").reduce((s, w) => s + w.saldo, 0);
    const totalDiMitra = allWallets.filter(w => w.ownerType === "mitra").reduce((s, w) => s + w.saldo, 0);

    const withdrawList = await db.select({ jumlahCoin: rwcoinWithdraw.jumlahCoin }).from(rwcoinWithdraw).where(eq(rwcoinWithdraw.status, "dibayar"));
    const totalWithdrawn = withdrawList.reduce((s, w) => s + w.jumlahCoin, 0);

    // === INDIKATOR EKONOMI ===
    // Total yang pernah ditopup (semua waktu)
    const [topupStats] = await db.select({
      totalPernahTopup: sql<number>`COALESCE(SUM(${rwcoinTransaksi.jumlahBayar}), 0)`,
      totalBelanja: sql<number>`COALESCE(SUM(CASE WHEN ${rwcoinTransaksi.tipe} = 'belanja' THEN ${rwcoinTransaksi.jumlahBruto} ELSE 0 END), 0)`,
    }).from(rwcoinTransaksi).where(eq(rwcoinTransaksi.tipe, "topup"));

    const [belanjaStats] = await db.select({
      totalBelanja: sql<number>`COALESCE(SUM(${rwcoinTransaksi.jumlahBruto}), 0)`,
    }).from(rwcoinTransaksi).where(eq(rwcoinTransaksi.tipe, "belanja"));

    const totalPernahTopup = Number(topupStats?.totalPernahTopup ?? 0);
    const totalVolumeBelanja = Number(belanjaStats?.totalBelanja ?? 0);

    // Velocity: seberapa banyak coin berputar (total belanja / total topup)
    const velocity = totalPernahTopup > 0 ? Math.round(totalVolumeBelanja / totalPernahTopup * 100) / 100 : 0;

    // Retensi: % coin yang masih di ekosistem
    const retention = totalPernahTopup > 0
      ? Math.round((totalDiWarga + totalDiMitra) / totalPernahTopup * 100)
      : 100;

    // Warga aktif (punya wallet)
    const [activeWargaRow] = await db.select({ count: count(rwcoinWallet.id) }).from(rwcoinWallet).where(eq(rwcoinWallet.ownerType, "warga"));
    const activeWarga = activeWargaRow?.count ?? 0;

    // Mitra aktif
    const [activeMitraRow] = await db.select({ count: count(mitra.id) }).from(mitra).where(eq(mitra.isActive, true));
    const activeMitra = activeMitraRow?.count ?? 0;

    // Budget subsidi tersisa = saldo kas (sudah net: admin_fee - subsidi - withdraw + inject)
    const kasRows = await db.select({ tipe: kasRwcoin.tipe, jumlah: kasRwcoin.jumlah }).from(kasRwcoin);
    const budgetSubsidi = kasRows.reduce((acc, r) => r.tipe === "pemasukan" ? acc + r.jumlah : acc - r.jumlah, 0);

    // Top 5 spender warga
    const semuaBelanjaWarga = await db.select({
      wargaId: rwcoinTransaksi.wargaId,
      jumlahBruto: rwcoinTransaksi.jumlahBruto,
      namaWarga: warga.namaLengkap,
    }).from(rwcoinTransaksi)
      .leftJoin(warga, eq(rwcoinTransaksi.wargaId, warga.id))
      .where(eq(rwcoinTransaksi.tipe, "belanja"));

    const spenderMap = new Map<number, { namaWarga: string; totalBelanja: number; jumlahTx: number }>();
    for (const row of semuaBelanjaWarga) {
      if (!row.wargaId) continue;
      const existing = spenderMap.get(row.wargaId);
      if (existing) {
        existing.totalBelanja += row.jumlahBruto;
        existing.jumlahTx += 1;
      } else {
        spenderMap.set(row.wargaId, { namaWarga: row.namaWarga ?? "Warga", totalBelanja: row.jumlahBruto, jumlahTx: 1 });
      }
    }
    const topSpenders = Array.from(spenderMap.entries())
      .map(([wargaId, data]) => ({ wargaId, ...data }))
      .sort((a, b) => b.totalBelanja - a.totalBelanja)
      .slice(0, 5);

    return {
      transaksiTerbaru,
      topupTerbaru,
      leaderboardMitra,
      perputaran: { totalDiWarga, totalDiMitra, totalWithdrawn, totalBeredar: totalDiWarga + totalDiMitra },
      ekonomi: { velocity, retention, totalPernahTopup, activeWarga, activeMitra, budgetSubsidi, topSpenders },
    };
  }

  async getSavedLoginsByDevice(deviceId: string) {
    return await db
      .select({
        wargaId: wargaSavedLogin.wargaId,
        kkId: wargaSavedLogin.kkId,
        nomorKk: wargaSavedLogin.nomorKk,
        nama: warga.namaLengkap,
        kedudukan: warga.kedudukanKeluarga,
        rt: kartuKeluarga.rt,
      })
      .from(wargaSavedLogin)
      .innerJoin(warga, eq(warga.id, wargaSavedLogin.wargaId))
      .innerJoin(kartuKeluarga, eq(kartuKeluarga.id, wargaSavedLogin.kkId))
      .where(eq(wargaSavedLogin.deviceId, deviceId))
      .orderBy(desc(wargaSavedLogin.lastUsedAt));
  }

  async getSavedLoginByWargaDevice(wargaId: number, deviceId: string) {
    const rows = await db
      .select({ id: wargaSavedLogin.id, pinHash: wargaSavedLogin.pinHash })
      .from(wargaSavedLogin)
      .where(and(eq(wargaSavedLogin.wargaId, wargaId), eq(wargaSavedLogin.deviceId, deviceId)));
    return rows[0];
  }

  async upsertSavedLogin(wargaId: number, kkId: number, nomorKk: string, deviceId: string, pinHash: string) {
    await db.insert(wargaSavedLogin)
      .values({ wargaId, kkId, nomorKk, deviceId, pinHash })
      .onConflictDoUpdate({
        target: [wargaSavedLogin.wargaId, wargaSavedLogin.deviceId],
        set: { pinHash, lastUsedAt: sql`now()` },
      });
  }

  async updateSavedLoginLastUsed(wargaId: number, deviceId: string) {
    await db.update(wargaSavedLogin)
      .set({ lastUsedAt: sql`now()` })
      .where(and(eq(wargaSavedLogin.wargaId, wargaId), eq(wargaSavedLogin.deviceId, deviceId)));
  }

  async deleteSavedLogin(wargaId: number, deviceId: string) {
    await db.delete(wargaSavedLogin)
      .where(and(eq(wargaSavedLogin.wargaId, wargaId), eq(wargaSavedLogin.deviceId, deviceId)));
  }

  async getCurhatCoinHariIni(wargaId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await db.select({ total: sql<number>`coalesce(sum(${curhatWarga.coinDiberikan}), 0)` })
      .from(curhatWarga)
      .where(and(
        eq(curhatWarga.wargaId, wargaId),
        gte(curhatWarga.createdAt, today),
      ));
    return Number(rows[0]?.total ?? 0);
  }

  async getCurhatHariIni(wargaId: number): Promise<CurhatWarga | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await db.select().from(curhatWarga)
      .where(and(eq(curhatWarga.wargaId, wargaId), gte(curhatWarga.createdAt, today)))
      .orderBy(desc(curhatWarga.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async createCurhat(data: { wargaId: number; isi: string; coinDiberikan: number; balasanGemini: string }): Promise<CurhatWarga> {
    const [row] = await db.insert(curhatWarga).values(data).returning();
    return row;
  }

  async getRiwayatCurhat(wargaId: number, limit = 5): Promise<CurhatWarga[]> {
    return db.select().from(curhatWarga)
      .where(eq(curhatWarga.wargaId, wargaId))
      .orderBy(desc(curhatWarga.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
