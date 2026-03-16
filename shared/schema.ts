import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const kartuKeluarga = pgTable("kartu_keluarga", {
  id: serial("id").primaryKey(),
  nomorKk: text("nomor_kk").notNull().unique(),
  rt: integer("rt").notNull(),
  alamat: text("alamat").notNull(),
  statusRumah: text("status_rumah").notNull().default("Milik Sendiri"),
  jumlahPenghuni: integer("jumlah_penghuni").notNull().default(1),
  kondisiBangunan: text("kondisi_bangunan").notNull().default("Permanen"),
  sumberAir: text("sumber_air").notNull().default("PDAM"),
  sanitasiWc: text("sanitasi_wc").notNull().default("Jamban Sendiri"),
  listrik: text("listrik").notNull().default("PLN 900 VA"),
  penerimaBansos: boolean("penerima_bansos").notNull().default(false),
  jenisBansos: text("jenis_bansos"),
  linkGmaps: text("link_gmaps"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  fotoKk: text("foto_kk"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warga = pgTable("warga", {
  id: serial("id").primaryKey(),
  kkId: integer("kk_id").notNull().references(() => kartuKeluarga.id),
  namaLengkap: text("nama_lengkap").notNull(),
  nik: text("nik").notNull().unique(),
  nomorWhatsapp: text("nomor_whatsapp"),
  jenisKelamin: text("jenis_kelamin").notNull(),
  statusPerkawinan: text("status_perkawinan").notNull(),
  agama: text("agama").notNull().default("Islam"),
  kedudukanKeluarga: text("kedudukan_keluarga").notNull(),
  tanggalLahir: text("tanggal_lahir"),
  pekerjaan: text("pekerjaan"),
  pendidikan: text("pendidikan"),
  statusKependudukan: text("status_kependudukan").notNull().default("Aktif"),
  fotoKtp: text("foto_ktp"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rtData = pgTable("rt_data", {
  id: serial("id").primaryKey(),
  nomorRt: integer("nomor_rt").notNull().unique(),
  namaKetua: text("nama_ketua").notNull(),
  nomorWhatsapp: text("nomor_whatsapp"),
});

export const laporan = pgTable("laporan", {
  id: serial("id").primaryKey(),
  wargaId: integer("warga_id").references(() => warga.id),
  kkId: integer("kk_id").references(() => kartuKeluarga.id),
  wargaSinggahId: integer("warga_singgah_id"),
  jenisLaporan: text("jenis_laporan").notNull().default("umum"),
  judul: text("judul").notNull(),
  isi: text("isi").notNull(),
  status: text("status").notNull().default("pending"),
  tanggapanAdmin: text("tanggapan_admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suratWarga = pgTable("surat_warga", {
  id: serial("id").primaryKey(),
  nomorSurat: text("nomor_surat"),
  wargaId: integer("warga_id").notNull().references(() => warga.id),
  kkId: integer("kk_id").notNull().references(() => kartuKeluarga.id),
  jenisSurat: text("jenis_surat").notNull(),
  perihal: text("perihal").notNull(),
  keterangan: text("keterangan"),
  isiSurat: text("isi_surat"),
  status: text("status").notNull().default("pending"),
  metodeLayanan: text("metode_layanan").notNull().default("print_mandiri"),
  nomorRt: integer("nomor_rt").notNull(),
  pdfCode: text("pdf_code"),
  pdfPath: text("pdf_path"),
  fileSurat: text("file_surat"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suratRw = pgTable("surat_rw", {
  id: serial("id").primaryKey(),
  nomorSurat: text("nomor_surat"),
  jenisSurat: text("jenis_surat").notNull(),
  perihal: text("perihal").notNull(),
  tujuan: text("tujuan"),
  isiSurat: text("isi_surat"),
  tanggalSurat: text("tanggal_surat"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profileEditRequest = pgTable("profile_edit_request", {
  id: serial("id").primaryKey(),
  wargaId: integer("warga_id").notNull().references(() => warga.id),
  kkId: integer("kk_id").notNull().references(() => kartuKeluarga.id),
  fieldChanges: jsonb("field_changes").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminUser = pgTable("admin_user", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  namaLengkap: text("nama_lengkap").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const waBlast = pgTable("wa_blast", {
  id: serial("id").primaryKey(),
  pesan: text("pesan").notNull(),
  kategoriFilter: text("kategori_filter").notNull().default("semua"),
  filterRt: integer("filter_rt"),
  jumlahPenerima: integer("jumlah_penerima").notNull().default(0),
  jumlahBerhasil: integer("jumlah_berhasil").notNull().default(0),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pengajuanBansos = pgTable("pengajuan_bansos", {
  id: serial("id").primaryKey(),
  kkId: integer("kk_id").notNull().references(() => kartuKeluarga.id),
  jenisPengajuan: text("jenis_pengajuan").notNull(),
  jenisBansos: text("jenis_bansos").notNull(),
  alasan: text("alasan").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const donasiCampaign = pgTable("donasi_campaign", {
  id: serial("id").primaryKey(),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi").notNull(),
  targetDana: integer("target_dana"),
  status: text("status").notNull().default("aktif"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const donasi = pgTable("donasi", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => donasiCampaign.id),
  kkId: integer("kk_id").notNull().references(() => kartuKeluarga.id),
  namaDonatur: text("nama_donatur").notNull(),
  jumlah: integer("jumlah").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kasRw = pgTable("kas_rw", {
  id: serial("id").primaryKey(),
  tipe: text("tipe").notNull(),
  kategori: text("kategori").notNull(),
  jumlah: integer("jumlah").notNull(),
  keterangan: text("keterangan").notNull(),
  tanggal: text("tanggal").notNull(),
  createdBy: text("created_by").notNull(),
  campaignId: integer("campaign_id").references(() => donasiCampaign.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pemilikKost = pgTable("pemilik_kost", {
  id: serial("id").primaryKey(),
  namaKost: text("nama_kost").notNull(),
  namaPemilik: text("nama_pemilik").notNull(),
  nomorWaPemilik: text("nomor_wa_pemilik").notNull(),
  rt: integer("rt").notNull(),
  alamatLengkap: text("alamat_lengkap").notNull(),
  jumlahPintu: integer("jumlah_pintu").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wargaSinggah = pgTable("warga_singgah", {
  id: serial("id").primaryKey(),
  pemilikKostId: integer("pemilik_kost_id").notNull().references(() => pemilikKost.id),
  namaLengkap: text("nama_lengkap").notNull(),
  nik: text("nik").notNull().unique(),
  nomorWhatsapp: text("nomor_whatsapp").notNull(),
  pekerjaan: text("pekerjaan").notNull(),
  tanggalMulaiKontrak: text("tanggal_mulai_kontrak").notNull(),
  tanggalHabisKontrak: text("tanggal_habis_kontrak").notNull(),
  jumlahPenghuni: integer("jumlah_penghuni").notNull().default(1),
  keperluanTinggal: text("keperluan_tinggal").notNull(),
  status: text("status").notNull().default("aktif"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const riwayatKontrak = pgTable("riwayat_kontrak", {
  id: serial("id").primaryKey(),
  wargaSinggahId: integer("warga_singgah_id").notNull().references(() => wargaSinggah.id),
  tanggalMulaiLama: text("tanggal_mulai_lama").notNull(),
  tanggalHabisLama: text("tanggal_habis_lama").notNull(),
  tanggalMulaiBaru: text("tanggal_mulai_baru").notNull(),
  tanggalHabisBaru: text("tanggal_habis_baru").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertKkSchema = createInsertSchema(kartuKeluarga).omit({ id: true, createdAt: true });
export const insertWargaSchema = createInsertSchema(warga).omit({ id: true, createdAt: true });
export const insertRtSchema = createInsertSchema(rtData).omit({ id: true });
export const insertLaporanSchema = createInsertSchema(laporan).omit({ id: true, createdAt: true, status: true, tanggapanAdmin: true });
export const insertSuratWargaSchema = createInsertSchema(suratWarga).omit({ id: true, createdAt: true, status: true, isiSurat: true, pdfCode: true, pdfPath: true, nomorSurat: true, fileSurat: true, metodeLayanan: true });
export const insertSuratRwSchema = createInsertSchema(suratRw).omit({ id: true, createdAt: true });
export const insertProfileEditSchema = createInsertSchema(profileEditRequest).omit({ id: true, createdAt: true, status: true });
export const insertAdminSchema = createInsertSchema(adminUser).omit({ id: true, createdAt: true });
export const insertWaBlastSchema = createInsertSchema(waBlast).omit({ id: true, createdAt: true, jumlahPenerima: true, jumlahBerhasil: true, status: true });
export const insertPengajuanBansosSchema = createInsertSchema(pengajuanBansos).omit({ id: true, createdAt: true, status: true });
export const insertDonasiCampaignSchema = createInsertSchema(donasiCampaign).omit({ id: true, createdAt: true, status: true });
export const insertDonasiSchema = createInsertSchema(donasi).omit({ id: true, createdAt: true, status: true });
export const insertKasRwSchema = createInsertSchema(kasRw).omit({ id: true, createdAt: true, createdBy: true }).extend({
  tipe: z.enum(["pemasukan", "pengeluaran"]),
  jumlah: z.number().int().positive("Jumlah harus lebih dari 0"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  kategori: z.string().min(1, "Kategori harus dipilih"),
  keterangan: z.string().min(1, "Keterangan tidak boleh kosong"),
  campaignId: z.number().int().nullable().optional(),
});

export type KartuKeluarga = typeof kartuKeluarga.$inferSelect;
export type InsertKartuKeluarga = z.infer<typeof insertKkSchema>;
export type Warga = typeof warga.$inferSelect;
export type InsertWarga = z.infer<typeof insertWargaSchema>;
export type RtData = typeof rtData.$inferSelect;
export type InsertRtData = z.infer<typeof insertRtSchema>;
export type Laporan = typeof laporan.$inferSelect;
export type InsertLaporan = z.infer<typeof insertLaporanSchema>;
export type SuratWarga = typeof suratWarga.$inferSelect;
export type InsertSuratWarga = z.infer<typeof insertSuratWargaSchema>;
export type SuratRw = typeof suratRw.$inferSelect;
export type InsertSuratRw = z.infer<typeof insertSuratRwSchema>;
export type ProfileEditRequest = typeof profileEditRequest.$inferSelect;
export type InsertProfileEditRequest = z.infer<typeof insertProfileEditSchema>;
export type AdminUser = typeof adminUser.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminSchema>;
export type WaBlast = typeof waBlast.$inferSelect;
export type InsertWaBlast = z.infer<typeof insertWaBlastSchema>;
export type PengajuanBansos = typeof pengajuanBansos.$inferSelect;
export type InsertPengajuanBansos = z.infer<typeof insertPengajuanBansosSchema>;
export type DonasiCampaign = typeof donasiCampaign.$inferSelect;
export type InsertDonasiCampaign = z.infer<typeof insertDonasiCampaignSchema>;
export type Donasi = typeof donasi.$inferSelect;
export type InsertDonasi = z.infer<typeof insertDonasiSchema>;
export type KasRw = typeof kasRw.$inferSelect;
export type InsertKasRw = z.infer<typeof insertKasRwSchema>;

export const usaha = pgTable("usaha", {
  id: serial("id").primaryKey(),
  namaPemilik: text("nama_pemilik").notNull(),
  nikPemilik: text("nik_pemilik").notNull(),
  nomorWaPemilik: text("nomor_wa_pemilik").notNull(),
  alamatPemilik: text("alamat_pemilik").notNull(),
  namaUsaha: text("nama_usaha").notNull(),
  jenisUsaha: text("jenis_usaha").notNull(),
  alamatUsaha: text("alamat_usaha").notNull(),
  rt: integer("rt").notNull(),
  nib: text("nib"),
  deskripsiUsaha: text("deskripsi_usaha"),
  lamaUsaha: text("lama_usaha"),
  jamOperasionalMulai: text("jam_operasional_mulai"),
  jamOperasionalSelesai: text("jam_operasional_selesai"),
  modalUsaha: text("modal_usaha"),
  omsetBulanan: text("omset_bulanan"),
  status: text("status").notNull().default("pendaftaran"),
  nomorStiker: text("nomor_stiker"),
  tanggalStikerTerbit: text("tanggal_stiker_terbit"),
  tanggalStikerExpired: text("tanggal_stiker_expired"),
  alasanPenolakan: text("alasan_penolakan"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const karyawanUsaha = pgTable("karyawan_usaha", {
  id: serial("id").primaryKey(),
  usahaId: integer("usaha_id").notNull().references(() => usaha.id),
  namaLengkap: text("nama_lengkap").notNull(),
  nik: text("nik").notNull(),
  alamat: text("alamat").notNull(),
  nomorWhatsapp: text("nomor_whatsapp"),
  jabatan: text("jabatan").notNull(),
  tanggalMulaiKerja: text("tanggal_mulai_kerja"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const izinTetangga = pgTable("izin_tetangga", {
  id: serial("id").primaryKey(),
  usahaId: integer("usaha_id").notNull().references(() => usaha.id),
  posisi: text("posisi").notNull(),
  namaWarga: text("nama_warga").notNull(),
  nomorWhatsapp: text("nomor_whatsapp"),
  statusPersetujuan: text("status_persetujuan").notNull().default("belum"),
  alasanPenolakan: text("alasan_penolakan"),
  tanggalPersetujuan: text("tanggal_persetujuan"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const surveyUsaha = pgTable("survey_usaha", {
  id: serial("id").primaryKey(),
  usahaId: integer("usaha_id").notNull().references(() => usaha.id),
  tanggalSurvey: text("tanggal_survey").notNull(),
  petugasSurvey: text("petugas_survey").notNull(),
  kesesuaianData: text("kesesuaian_data").notNull(),
  dampakKebisingan: integer("dampak_kebisingan").notNull().default(1),
  dampakBau: integer("dampak_bau").notNull().default(1),
  dampakLimbah: integer("dampak_limbah").notNull().default(1),
  kondisiLokasi: text("kondisi_lokasi"),
  catatanSurvey: text("catatan_survey"),
  fotoLokasi: text("foto_lokasi"),
  rekomendasi: text("rekomendasi").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const riwayatStiker = pgTable("riwayat_stiker", {
  id: serial("id").primaryKey(),
  usahaId: integer("usaha_id").notNull().references(() => usaha.id),
  nomorStiker: text("nomor_stiker").notNull(),
  tanggalTerbit: text("tanggal_terbit").notNull(),
  tanggalExpired: text("tanggal_expired").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const monthlySnapshot = pgTable("monthly_snapshot", {
  id: serial("id").primaryKey(),
  month: text("month").notNull().unique(),
  totalKk: integer("total_kk").notNull().default(0),
  totalWarga: integer("total_warga").notNull().default(0),
  pengangguran: integer("pengangguran").notNull().default(0),
  waRegistered: integer("wa_registered").notNull().default(0),
  ktpUploaded: integer("ktp_uploaded").notNull().default(0),
  kkFotoUploaded: integer("kk_foto_uploaded").notNull().default(0),
  penerimaBansos: integer("penerima_bansos").notNull().default(0),
  usahaBerizin: integer("usaha_berizin").notNull().default(0),
  totalUsaha: integer("total_usaha").notNull().default(0),
  laporanSelesai: integer("laporan_selesai").notNull().default(0),
  totalLaporan: integer("total_laporan").notNull().default(0),
  suratSelesai: integer("surat_selesai").notNull().default(0),
  totalSurat: integer("total_surat").notNull().default(0),
  pemasukan: integer("pemasukan").notNull().default(0),
  pengeluaran: integer("pengeluaran_snapshot").notNull().default(0),
  saldo: integer("saldo").notNull().default(0),
  wargaSinggahAktif: integer("warga_singgah_aktif").notNull().default(0),
  indeksKemajuan: integer("indeks_kemajuan").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMonthlySnapshotSchema = createInsertSchema(monthlySnapshot).omit({ id: true, createdAt: true });
export type MonthlySnapshot = typeof monthlySnapshot.$inferSelect;
export type InsertMonthlySnapshot = z.infer<typeof insertMonthlySnapshotSchema>;

export const insertPemilikKostSchema = createInsertSchema(pemilikKost).omit({ id: true, createdAt: true });
export const insertWargaSinggahSchema = createInsertSchema(wargaSinggah).omit({ id: true, createdAt: true, status: true });
export const insertRiwayatKontrakSchema = createInsertSchema(riwayatKontrak).omit({ id: true, createdAt: true });

export const insertUsahaSchema = createInsertSchema(usaha).omit({ id: true, createdAt: true, status: true, nomorStiker: true, tanggalStikerTerbit: true, tanggalStikerExpired: true, alasanPenolakan: true });
export const insertKaryawanUsahaSchema = createInsertSchema(karyawanUsaha).omit({ id: true, createdAt: true });
export const insertIzinTetanggaSchema = createInsertSchema(izinTetangga).omit({ id: true, createdAt: true });
export const insertSurveyUsahaSchema = createInsertSchema(surveyUsaha).omit({ id: true, createdAt: true });
export const insertRiwayatStikerSchema = createInsertSchema(riwayatStiker).omit({ id: true, createdAt: true });

export type PemilikKost = typeof pemilikKost.$inferSelect;
export type InsertPemilikKost = z.infer<typeof insertPemilikKostSchema>;
export type WargaSinggah = typeof wargaSinggah.$inferSelect;
export type InsertWargaSinggah = z.infer<typeof insertWargaSinggahSchema>;
export type RiwayatKontrak = typeof riwayatKontrak.$inferSelect;
export type InsertRiwayatKontrak = z.infer<typeof insertRiwayatKontrakSchema>;

export type Usaha = typeof usaha.$inferSelect;
export type InsertUsaha = z.infer<typeof insertUsahaSchema>;
export type KaryawanUsaha = typeof karyawanUsaha.$inferSelect;
export type InsertKaryawanUsaha = z.infer<typeof insertKaryawanUsahaSchema>;
export type IzinTetangga = typeof izinTetangga.$inferSelect;
export type InsertIzinTetangga = z.infer<typeof insertIzinTetanggaSchema>;
export type SurveyUsaha = typeof surveyUsaha.$inferSelect;
export type InsertSurveyUsaha = z.infer<typeof insertSurveyUsahaSchema>;
export type RiwayatStiker = typeof riwayatStiker.$inferSelect;
export type InsertRiwayatStiker = z.infer<typeof insertRiwayatStikerSchema>;
