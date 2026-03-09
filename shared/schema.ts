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
  wargaId: integer("warga_id").notNull().references(() => warga.id),
  kkId: integer("kk_id").notNull().references(() => kartuKeluarga.id),
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

export const insertKkSchema = createInsertSchema(kartuKeluarga).omit({ id: true, createdAt: true });
export const insertWargaSchema = createInsertSchema(warga).omit({ id: true, createdAt: true });
export const insertRtSchema = createInsertSchema(rtData).omit({ id: true });
export const insertLaporanSchema = createInsertSchema(laporan).omit({ id: true, createdAt: true, status: true, tanggapanAdmin: true });
export const insertSuratWargaSchema = createInsertSchema(suratWarga).omit({ id: true, createdAt: true, status: true, isiSurat: true }).extend({
  metodeLayanan: z.enum(["print_mandiri", "tau_beres"]).default("print_mandiri"),
});
export const insertSuratRwSchema = createInsertSchema(suratRw).omit({ id: true, createdAt: true });
export const insertProfileEditSchema = createInsertSchema(profileEditRequest).omit({ id: true, createdAt: true, status: true });
export const insertAdminSchema = createInsertSchema(adminUser).omit({ id: true, createdAt: true });
export const insertWaBlastSchema = createInsertSchema(waBlast).omit({ id: true, createdAt: true, jumlahPenerima: true, jumlahBerhasil: true, status: true });
export const insertPengajuanBansosSchema = createInsertSchema(pengajuanBansos).omit({ id: true, createdAt: true, status: true });

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
