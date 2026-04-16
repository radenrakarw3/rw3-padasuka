import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
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
  // Data ekonomi keluarga
  penghasilanBulanan: text("penghasilan_bulanan"),
  layakBansos: boolean("layak_bansos").notNull().default(false),
  kategoriEkonomi: text("kategori_ekonomi"),
  linkGmaps: text("link_gmaps"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warga = pgTable("warga", {
  id: serial("id").primaryKey(),
  kkId: integer("kk_id").notNull().references(() => kartuKeluarga.id),
  namaLengkap: text("nama_lengkap").notNull(),
  nik: text("nik").notNull().unique(),
  noKkDiKtp: text("no_kk_di_ktp"),
  namaAlias: text("nama_alias"),
  nomorWhatsapp: text("nomor_whatsapp"),
  nomorWhatsappAlternatif: text("nomor_whatsapp_alternatif"),
  email: text("email"),
  jenisKelamin: text("jenis_kelamin").notNull(),
  statusPerkawinan: text("status_perkawinan").notNull(),
  agama: text("agama").notNull().default("Islam"),
  kedudukanKeluarga: text("kedudukan_keluarga").notNull(),
  tempatLahir: text("tempat_lahir"),
  tanggalLahir: text("tanggal_lahir"),
  golonganDarah: text("golongan_darah"),
  kewarganegaraan: text("kewarganegaraan").notNull().default("WNI"),
  suku: text("suku"),
  pekerjaan: text("pekerjaan"),
  pendidikan: text("pendidikan"),
  statusKependudukan: text("status_kependudukan").notNull().default("Aktif"),
  statusEktp: text("status_ektp"),
  noAktaLahir: text("no_akta_lahir"),
  punyaAktaLahir: boolean("punya_akta_lahir").notNull().default(false),
  punyaKia: boolean("punya_kia").notNull().default(false),
  punyaNpwp: boolean("punya_npwp").notNull().default(false),
  punyaSim: boolean("punya_sim").notNull().default(false),
  jenisSim: text("jenis_sim"),
  punyaPaspor: boolean("punya_paspor").notNull().default(false),
  alamatDomisili: text("alamat_domisili"),
  lamaTinggalTahun: integer("lama_tinggal_tahun"),
  statusTinggalIndividu: text("status_tinggal_individu"),
  hubunganDenganPemilikRumah: text("hubungan_dengan_pemilik_rumah"),
  namaKontakDarurat: text("nama_kontak_darurat"),
  hubunganKontakDarurat: text("hubungan_kontak_darurat"),
  nomorKontakDarurat: text("nomor_kontak_darurat"),
  sedangSekolah: boolean("sedang_sekolah").notNull().default(false),
  namaSekolah: text("nama_sekolah"),
  jenjangSekolah: text("jenjang_sekolah"),
  kelas: text("kelas"),
  jurusan: text("jurusan"),
  sedangKuliah: boolean("sedang_kuliah").notNull().default(false),
  namaKampus: text("nama_kampus"),
  semester: text("semester"),
  keahlian: text("keahlian"),
  statusPekerjaan: text("status_pekerjaan"),
  namaTempatKerja: text("nama_tempat_kerja"),
  alamatTempatKerja: text("alamat_tempat_kerja"),
  penghasilanPribadi: text("penghasilan_pribadi"),
  sumberPenghasilan: text("sumber_penghasilan"),
  punyaUsaha: boolean("punya_usaha").notNull().default(false),
  namaUsaha: text("nama_usaha"),
  // Data kesehatan & kondisi khusus
  statusDisabilitas: text("status_disabilitas").notNull().default("Tidak Ada"),
  kondisiKesehatan: text("kondisi_kesehatan").notNull().default("Sehat"),
  ibuHamil: boolean("ibu_hamil").notNull().default(false),
  punyaBpjsKesehatan: boolean("punya_bpjs_kesehatan").notNull().default(false),
  nomorBpjsKesehatan: text("nomor_bpjs_kesehatan"),
  punyaPenyakitKronis: boolean("punya_penyakit_kronis").notNull().default(false),
  penyakitKronis: text("penyakit_kronis"),
  alergi: text("alergi"),
  riwayatRawatInap: text("riwayat_rawat_inap"),
  butuhPendampinganKesehatan: boolean("butuh_pendampingan_kesehatan").notNull().default(false),
  statusBansosIndividu: text("status_bansos_individu"),
  jenisBansosIndividu: text("jenis_bansos_individu"),
  lansia: boolean("lansia").notNull().default(false),
  anakYatimPiatu: boolean("anak_yatim_piatu").notNull().default(false),
  perluBantuanKhusus: boolean("perlu_bantuan_khusus").notNull().default(false),
  catatanKerentanan: text("catatan_kerentanan"),
  aktifKegiatanRw: boolean("aktif_kegiatan_rw").notNull().default(false),
  bidangPartisipasi: text("bidang_partisipasi"),
  jabatanKomunitas: text("jabatan_komunitas"),
  punyaKendaraan: boolean("punya_kendaraan").notNull().default(false),
  jenisKendaraan: text("jenis_kendaraan"),
  jumlahKendaraan: integer("jumlah_kendaraan"),
  statusVerifikasiData: text("status_verifikasi_data").notNull().default("Belum Diverifikasi"),
  tanggalVerifikasiData: text("tanggal_verifikasi_data"),
  catatanVerifikasi: text("catatan_verifikasi"),
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
  fileSuratData: text("file_surat_data"),
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
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DIGIT_ONLY_REGEX = /^\d+$/;
const OPTIONAL_EMAIL_SCHEMA = z.union([z.literal(""), z.string().email("Format email tidak valid")]).nullable().optional();

function isFutureDate(value?: string | null) {
  if (!value || !DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
}

function isWorkingStatus(value?: string | null) {
  if (!value) return false;
  return ["Bekerja", "Wiraswasta", "Pelaku Usaha", "Pekerja Lepas"].includes(value);
}

export const insertWargaSchema = createInsertSchema(warga).omit({ id: true, createdAt: true }).extend({
  email: OPTIONAL_EMAIL_SCHEMA,
  nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit"),
  nomorWhatsapp: z.union([z.literal(""), z.string().regex(/^(0|62)\d{8,15}$/, "No. WhatsApp tidak valid")]).nullable().optional(),
  nomorWhatsappAlternatif: z.union([z.literal(""), z.string().regex(/^(0|62)\d{8,15}$/, "No. WhatsApp alternatif tidak valid")]).nullable().optional(),
  nomorKontakDarurat: z.union([z.literal(""), z.string().regex(/^(0|62)\d{8,15}$/, "No. kontak darurat tidak valid")]).nullable().optional(),
  nomorBpjsKesehatan: z.union([z.literal(""), z.string().regex(DIGIT_ONLY_REGEX, "No. BPJS harus berupa digit")]).nullable().optional(),
  jumlahKendaraan: z.union([z.number().int().min(0), z.null()]).optional(),
  lamaTinggalTahun: z.union([z.number().int().min(0), z.null()]).optional(),
  tanggalLahir: z.union([z.literal(""), z.string().regex(DATE_REGEX, "Format tanggal lahir harus YYYY-MM-DD")]).nullable().optional(),
  tanggalVerifikasiData: z.union([z.literal(""), z.string().regex(DATE_REGEX, "Format tanggal verifikasi harus YYYY-MM-DD")]).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.punyaSim && !data.jenisSim) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["jenisSim"], message: "Jenis SIM wajib diisi jika punya SIM" });
  }
  if (data.punyaBpjsKesehatan && !data.nomorBpjsKesehatan) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nomorBpjsKesehatan"], message: "Nomor BPJS wajib diisi" });
  }
  if (data.punyaPenyakitKronis && !data.penyakitKronis) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["penyakitKronis"], message: "Penyakit kronis wajib diisi" });
  }
  if (data.sedangSekolah) {
    if (!data.namaSekolah) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["namaSekolah"], message: "Nama sekolah wajib diisi" });
    }
    if (!data.jenjangSekolah) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["jenjangSekolah"], message: "Jenjang sekolah wajib diisi" });
    }
  }
  if (data.sedangKuliah) {
    if (!data.namaKampus) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["namaKampus"], message: "Nama kampus wajib diisi" });
    }
    if (!data.semester) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["semester"], message: "Semester wajib diisi" });
    }
  }
  if (isWorkingStatus(data.statusPekerjaan) && !data.namaTempatKerja) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["namaTempatKerja"], message: "Nama tempat kerja wajib diisi" });
  }
  if (data.punyaUsaha && !data.namaUsaha) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["namaUsaha"], message: "Nama usaha wajib diisi" });
  }
  if (data.statusBansosIndividu === "Penerima" && !data.jenisBansosIndividu) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["jenisBansosIndividu"], message: "Jenis bansos individu wajib diisi" });
  }
  if (data.namaKontakDarurat && !data.nomorKontakDarurat) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nomorKontakDarurat"], message: "Nomor kontak darurat wajib diisi" });
  }
  if (isFutureDate(data.tanggalLahir)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tanggalLahir"], message: "Tanggal lahir tidak boleh di masa depan" });
  }
  if (isFutureDate(data.tanggalVerifikasiData)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tanggalVerifikasiData"], message: "Tanggal verifikasi tidak boleh di masa depan" });
  }
});
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
export type InsertKasRw = typeof kasRw.$inferInsert;

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

export const programRw = pgTable("program_rw", {
  id: serial("id").primaryKey(),
  namaProgram: text("nama_program").notNull(),
  deskripsi: text("deskripsi"),
  tanggalPelaksanaan: text("tanggal_pelaksanaan").notNull(),
  kategoriSasaran: text("kategori_sasaran").notNull().default("semua"),
  targetRt: integer("target_rt"),
  status: text("status").notNull().default("rencana"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pesertaProgram = pgTable("peserta_program", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programRw.id),
  kkId: integer("kk_id").references(() => kartuKeluarga.id),
  namaManual: text("nama_manual"),
  kehadiran: text("kehadiran").notNull().default("belum"),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProgramRwSchema = createInsertSchema(programRw).omit({ id: true, createdAt: true });
export const insertPesertaProgramSchema = createInsertSchema(pesertaProgram).omit({ id: true, createdAt: true });

export type ProgramRw = typeof programRw.$inferSelect;
export type InsertProgramRw = z.infer<typeof insertProgramRwSchema>;
export type PesertaProgram = typeof pesertaProgram.$inferSelect;
export type InsertPesertaProgram = z.infer<typeof insertPesertaProgramSchema>;

export const denahLatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const denahBasemapSchema = z.enum(["osm"]);

export const denahAssetTypeSchema = z.enum([
  "pju",
  "pjg",
  "pjl",
  "cctv",
  "tiang_wifi",
]);

export const denahLineTypeSchema = z.enum([
  "sungai",
  "drainase",
  "jalan_batas",
]);

export const denahLineConditionSchema = z.enum([
  "baik",
  "butuh_perhatian",
  "rusak",
]);

export const denahHazardTypeSchema = z.enum([
  "jalan_buruk",
  "drainase_buruk",
  "titik_bahaya",
]);

export const denahHazardSeveritySchema = z.enum([
  "rendah",
  "sedang",
  "tinggi",
]);

export const denahMetaSchema = z.object({
  version: z.literal(2).default(2),
  basemap: denahBasemapSchema.default("osm"),
  center: denahLatLngSchema.default({ lat: -6.8736, lng: 107.5548 }),
  zoom: z.number().min(3).max(23).default(19),
});

export const denahBuildingTypeSchema = z.enum([
  "rumah",
  "usaha",
  "kost",
  "kontrakan",
]);

export const denahHouseFeatureSchema = z.object({
  id: z.string().min(1),
  type: denahBuildingTypeSchema.default("rumah"),
  name: z.string().optional().default(""),
  rt: z.number().int().nullable().optional(),
  kkIds: z.array(z.number().int()).default([]),
  coordinates: z.array(denahLatLngSchema).min(3),
  notes: z.string().optional().default(""),
});

export const denahAssetFeatureSchema = z.object({
  id: z.string().min(1),
  type: denahAssetTypeSchema,
  label: z.string().optional().default(""),
  rt: z.number().int().nullable().optional(),
  coordinates: denahLatLngSchema,
  notes: z.string().optional().default(""),
});

export const denahLineFeatureSchema = z.object({
  id: z.string().min(1),
  type: denahLineTypeSchema,
  label: z.string().optional().default(""),
  coordinates: z.array(denahLatLngSchema).min(2),
  condition: denahLineConditionSchema.default("baik"),
  notes: z.string().optional().default(""),
});

export const denahHazardFeatureSchema = z.object({
  id: z.string().min(1),
  type: denahHazardTypeSchema,
  severity: denahHazardSeveritySchema.default("sedang"),
  label: z.string().optional().default(""),
  rt: z.number().int().nullable().optional(),
  coordinates: denahLatLngSchema,
  notes: z.string().optional().default(""),
});

export const denahWilayahDataSchema = z.object({
  meta: denahMetaSchema.default({
    version: 2,
    basemap: "osm",
    center: { lat: -6.8736, lng: 107.5548 },
    zoom: 19,
  }),
  houses: z.array(denahHouseFeatureSchema).default([]),
  assets: z.array(denahAssetFeatureSchema).default([]),
  lines: z.array(denahLineFeatureSchema).default([]),
  hazards: z.array(denahHazardFeatureSchema).default([]),
});

export const denahWilayah = pgTable("denah_wilayah", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull().default("Denah RW 03"),
  data: jsonb("data").$type<z.infer<typeof denahWilayahDataSchema>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDenahWilayahSchema = z.object({
  nama: z.string().min(1).max(120).default("Denah RW 03"),
  data: denahWilayahDataSchema,
});

export type DenahLatLng = z.infer<typeof denahLatLngSchema>;
export type DenahBasemap = z.infer<typeof denahBasemapSchema>;
export type DenahBuildingType = z.infer<typeof denahBuildingTypeSchema>;
export type DenahAssetType = z.infer<typeof denahAssetTypeSchema>;
export type DenahLineType = z.infer<typeof denahLineTypeSchema>;
export type DenahLineCondition = z.infer<typeof denahLineConditionSchema>;
export type DenahHazardType = z.infer<typeof denahHazardTypeSchema>;
export type DenahHazardSeverity = z.infer<typeof denahHazardSeveritySchema>;
export type DenahMeta = z.infer<typeof denahMetaSchema>;
export type DenahHouseFeature = z.infer<typeof denahHouseFeatureSchema>;
export type DenahAssetFeature = z.infer<typeof denahAssetFeatureSchema>;
export type DenahLineFeature = z.infer<typeof denahLineFeatureSchema>;
export type DenahHazardFeature = z.infer<typeof denahHazardFeatureSchema>;
export type DenahWilayahData = z.infer<typeof denahWilayahDataSchema>;
export type DenahWilayah = typeof denahWilayah.$inferSelect;
export type InsertDenahWilayah = z.infer<typeof insertDenahWilayahSchema>;

// ===================== RWCOIN ECOSYSTEM =====================

export const mitra = pgTable("mitra", {
  id: serial("id").primaryKey(),
  usahaId: integer("usaha_id").references(() => usaha.id),
  namaUsaha: text("nama_usaha").notNull(),
  kategori: text("kategori").notNull().default("Umum"),
  rt: integer("rt").notNull(),
  alamat: text("alamat").notNull(),
  nomorWaKasir: text("nomor_wa_kasir").notNull(),
  namaKasir: text("nama_kasir").notNull(),
  nomorWaKasirTambahan: text("nomor_wa_kasir_tambahan"), // JSON array of extra kasir WA numbers
  namaOwner: text("nama_owner"),
  nomorWaOwner: text("nomor_wa_owner"), // JSON array of owner WA numbers
  pinHash: text("pin_hash").notNull(),
  deskripsi: text("deskripsi"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rwcoinWallet = pgTable("rwcoin_wallet", {
  id: serial("id").primaryKey(),
  ownerType: text("owner_type").notNull(), // 'warga' | 'mitra'
  wargaId: integer("warga_id").references(() => warga.id),
  mitraId: integer("mitra_id").references(() => mitra.id),
  kodeWallet: text("kode_wallet").notNull().unique(),
  saldo: integer("saldo").notNull().default(0),
  totalTopup: integer("total_topup").notNull().default(0),
  totalBelanja: integer("total_belanja").notNull().default(0),
  totalWithdraw: integer("total_withdraw").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqRwcoinWalletWarga: uniqueIndex("rwcoin_wallet_warga_unique").on(table.wargaId),
  uniqRwcoinWalletMitra: uniqueIndex("rwcoin_wallet_mitra_unique").on(table.mitraId),
}));

export const rwcoinTransaksi = pgTable("rwcoin_transaksi", {
  id: serial("id").primaryKey(),
  kodeTransaksi: text("kode_transaksi").notNull().unique(),
  tipe: text("tipe").notNull(), // 'topup' | 'belanja' | 'withdraw' | 'refund' | 'transfer'
  wargaId: integer("warga_id").references(() => warga.id),
  mitraId: integer("mitra_id").references(() => mitra.id),
  tujuanWargaId: integer("tujuan_warga_id").references(() => warga.id), // untuk transfer antar warga
  jumlahBruto: integer("jumlah_bruto").notNull(),
  jumlahDiskon: integer("jumlah_diskon").notNull().default(0),
  jumlahBayar: integer("jumlah_bayar").notNull(),
  voucherKode: text("voucher_kode"),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mitraVoucher = pgTable("mitra_voucher", {
  id: serial("id").primaryKey(),
  kode: text("kode").notNull().unique(),
  nama: text("nama").notNull(),
  tipe: text("tipe").notNull(), // 'persen' | 'rupiah'
  nilai: integer("nilai").notNull(),
  mitraId: integer("mitra_id").references(() => mitra.id),
  minTransaksi: integer("min_transaksi").notNull().default(0),
  kuota: integer("kuota"),
  terpakai: integer("terpakai").notNull().default(0),
  berlakuHingga: text("berlaku_hingga"),
  khususWargaRw3: boolean("khusus_warga_rw3").notNull().default(true),
  subsidiAdmin: boolean("subsidi_admin").notNull().default(false), // true = admin nanggung diskon, mitra tetap dapat full
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mitraDiskon = pgTable("mitra_diskon", {
  id: serial("id").primaryKey(),
  mitraId: integer("mitra_id").notNull().references(() => mitra.id),
  namaDiskon: text("nama_diskon").notNull(),
  tipe: text("tipe").notNull(), // 'persen' | 'rupiah'
  nilai: integer("nilai").notNull(),
  berlakuMulai: text("berlaku_mulai"),
  berlakuHingga: text("berlaku_hingga"),
  khususWargaRw3: boolean("khusus_warga_rw3").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rwcoinWithdraw = pgTable("rwcoin_withdraw", {
  id: serial("id").primaryKey(),
  mitraId: integer("mitra_id").notNull().references(() => mitra.id),
  jumlahCoin: integer("jumlah_coin").notNull(),
  status: text("status").notNull().default("pending"), // pending | disetujui | dibayar | ditolak
  catatan: text("catatan"),
  nomorRekening: text("nomor_rekening"),
  namaBank: text("nama_bank"),
  atasNama: text("atas_nama"),
  disetujuiOleh: text("disetujui_oleh"),
  disetujuiAt: timestamp("disetujui_at"),
  dibayarAt: timestamp("dibayar_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rwcoinPendingTransaksi = pgTable("rwcoin_pending_transaksi", {
  id: serial("id").primaryKey(),
  wargaId: integer("warga_id").notNull().references(() => warga.id),
  mitraId: integer("mitra_id").notNull().references(() => mitra.id),
  jumlahBruto: integer("jumlah_bruto").notNull(),
  jumlahDiskon: integer("jumlah_diskon").notNull().default(0),
  jumlahBayar: integer("jumlah_bayar").notNull(),
  voucherKode: text("voucher_kode"),
  keterangan: text("keterangan"),
  otpKode: text("otp_kode").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isConfirmed: boolean("is_confirmed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export type RwcoinPendingTransaksi = typeof rwcoinPendingTransaksi.$inferSelect;

export const rwcoinOtp = pgTable("rwcoin_otp", {
  id: serial("id").primaryKey(),
  wargaId: integer("warga_id").notNull().references(() => warga.id),
  kode: text("kode").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type RwcoinOtp = typeof rwcoinOtp.$inferSelect;

export const rwcoinTopupRequest = pgTable("rwcoin_topup_request", {
  id: serial("id").primaryKey(),
  wargaId: integer("warga_id").notNull().references(() => warga.id),
  namaWarga: text("nama_warga").notNull(),
  noWa: text("no_wa"),
  jumlah: integer("jumlah").notNull(),
  metode: text("metode").notNull(),
  rekening: text("rekening").notNull(),
  atasnama: text("atasnama").notNull(),
  totalTransfer: integer("total_transfer").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type RwcoinTopupRequest = typeof rwcoinTopupRequest.$inferSelect;

export const insertMitraSchema = createInsertSchema(mitra).omit({ id: true, createdAt: true, pinHash: true }).extend({
  pin: z.string().length(6, "PIN harus 6 digit").regex(/^\d+$/, "PIN harus angka"),
});
export const insertMitraVoucherSchema = createInsertSchema(mitraVoucher).omit({ id: true, createdAt: true, terpakai: true });
export const insertMitraDiskonSchema = createInsertSchema(mitraDiskon).omit({ id: true, createdAt: true });
export const insertRwcoinWithdrawSchema = createInsertSchema(rwcoinWithdraw).omit({ id: true, createdAt: true, status: true, disetujuiOleh: true, disetujuiAt: true, dibayarAt: true });

export type Mitra = typeof mitra.$inferSelect;
export type InsertMitra = z.infer<typeof insertMitraSchema>;
export type RwcoinWallet = typeof rwcoinWallet.$inferSelect;
export type RwcoinTransaksi = typeof rwcoinTransaksi.$inferSelect;
export type MitraVoucher = typeof mitraVoucher.$inferSelect;
export type InsertMitraVoucher = z.infer<typeof insertMitraVoucherSchema>;
export type MitraDiskon = typeof mitraDiskon.$inferSelect;
export type InsertMitraDiskon = z.infer<typeof insertMitraDiskonSchema>;
export type RwcoinWithdraw = typeof rwcoinWithdraw.$inferSelect;
export type InsertRwcoinWithdraw = z.infer<typeof insertRwcoinWithdrawSchema>;

export const tripayCategory = pgTable("tripay_category", {
  id: serial("id").primaryKey(),
  tripayCategoryId: integer("tripay_category_id").notNull().unique(),
  name: text("name").notNull(),
  type: text("type"),
  isActive: boolean("is_active").notNull().default(true),
  isVisibleToWarga: boolean("is_visible_to_warga").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  iconKey: text("icon_key"),
  adminLabel: text("admin_label"),
  syncedAt: timestamp("synced_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tripayOperator = pgTable("tripay_operator", {
  id: serial("id").primaryKey(),
  tripayOperatorId: integer("tripay_operator_id").notNull().unique(),
  tripayCategoryId: integer("tripay_category_id"),
  categoryRefId: integer("category_ref_id").references(() => tripayCategory.id),
  name: text("name").notNull(),
  normalizedName: text("normalized_name"),
  isActive: boolean("is_active").notNull().default(true),
  isVisibleToWarga: boolean("is_visible_to_warga").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  syncedAt: timestamp("synced_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tripayProduct = pgTable("tripay_product", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // 'pulsa' | 'data' | 'electricity'
  categoryId: integer("category_id"),
  categoryName: text("category_name"),
  categoryType: text("category_type"),
  categoryRefId: integer("category_ref_id").references(() => tripayCategory.id),
  operatorId: integer("operator_id"),
  operatorName: text("operator_name"),
  operatorRefId: integer("operator_ref_id").references(() => tripayOperator.id),
  operatorNormalized: text("operator_normalized"),
  productGroup: text("product_group").notNull().default("other"),
  productCode: text("product_code").notNull().unique(),
  productName: text("product_name").notNull(),
  hargaModal: integer("harga_modal").notNull(),
  marginFlat: integer("margin_flat").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isVisibleToWarga: boolean("is_visible_to_warga").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isRecommended: boolean("is_recommended").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  salesCount: integer("sales_count").notNull().default(0),
  lastSoldAt: timestamp("last_sold_at"),
  hiddenReason: text("hidden_reason"),
  adminNote: text("admin_note"),
  tripayStatus: integer("tripay_status").notNull().default(1),
  rawData: jsonb("raw_data"),
  syncedAt: timestamp("synced_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tripayTransaction = pgTable("tripay_transaction", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(), // api_trxid kita
  tripayTrxId: integer("tripay_trx_id"),
  wargaId: integer("warga_id").notNull().references(() => warga.id),
  rwcoinTransaksiId: integer("rwcoin_transaksi_id").notNull().references(() => rwcoinTransaksi.id),
  refundedRwcoinTransaksiId: integer("refunded_rwcoin_transaksi_id").references(() => rwcoinTransaksi.id),
  productId: integer("product_id").references(() => tripayProduct.id),
  kind: text("kind").notNull(), // 'pulsa' | 'data' | 'electricity'
  categoryRefId: integer("category_ref_id").references(() => tripayCategory.id),
  categoryNameSnapshot: text("category_name_snapshot"),
  categoryTypeSnapshot: text("category_type_snapshot"),
  operatorRefId: integer("operator_ref_id").references(() => tripayOperator.id),
  operatorNameSnapshot: text("operator_name_snapshot"),
  operatorNormalizedSnapshot: text("operator_normalized_snapshot"),
  productGroupSnapshot: text("product_group_snapshot"),
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  target: text("target").notNull(),
  noMeterPln: text("no_meter_pln"),
  hargaModal: integer("harga_modal").notNull(),
  marginFlat: integer("margin_flat").notNull().default(0),
  hargaJual: integer("harga_jual").notNull(),
  status: text("status").notNull().default("pending"), // pending | success | failed | refunded
  statusDetail: text("status_detail").default("queued"),
  tripayStatus: integer("tripay_status").notNull().default(0),
  note: text("note"),
  failureReason: text("failure_reason"),
  adminNote: text("admin_note"),
  sourceChannel: text("source_channel").notNull().default("warga_web"),
  reconcileCount: integer("reconcile_count").notNull().default(0),
  lastReconcileAt: timestamp("last_reconcile_at"),
  finalizedAt: timestamp("finalized_at"),
  serialNumber: text("serial_number"),
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  callbackPayload: jsonb("callback_payload"),
  successAt: timestamp("success_at"),
  failedAt: timestamp("failed_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TripayProduct = typeof tripayProduct.$inferSelect;
export type TripayTransaction = typeof tripayTransaction.$inferSelect;
export type TripayCategory = typeof tripayCategory.$inferSelect;
export type TripayOperator = typeof tripayOperator.$inferSelect;

export const kasRwcoin = pgTable("kas_rwcoin", {
  id: serial("id").primaryKey(),
  tipe: text("tipe").notNull(), // 'pemasukan' | 'pengeluaran'
  tipeDetail: text("tipe_detail"), // 'topup_coin' | 'admin_fee' | 'withdraw_mitra' | 'subsidi_voucher'
  jumlah: integer("jumlah").notNull(),
  keterangan: text("keterangan").notNull(),
  referensiId: text("referensi_id"), // kodeTransaksi / withdrawId
  createdAt: timestamp("created_at").defaultNow(),
});

export type KasRwcoin = typeof kasRwcoin.$inferSelect;

export const rwcoinSettings = pgTable("rwcoin_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  keterangan: text("keterangan"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type RwcoinSettings = typeof rwcoinSettings.$inferSelect;

// ===================== END RWCOIN =====================

export const wargaSavedLogin = pgTable("warga_saved_login", {
  id: serial("id").primaryKey(),
  wargaId: integer("warga_id").notNull().references(() => warga.id),
  kkId: integer("kk_id").notNull().references(() => kartuKeluarga.id),
  nomorKk: text("nomor_kk").notNull(),
  deviceId: text("device_id").notNull(),
  pinHash: text("pin_hash").notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqWargaDevice: uniqueIndex("wsl_warga_device_unique").on(t.wargaId, t.deviceId),
}));

export type WargaSavedLogin = typeof wargaSavedLogin.$inferSelect;

// ===================== CURHAT WARGA =====================
export const curhatWarga = pgTable("curhat_warga", {
  id: serial("id").primaryKey(),
  wargaId: integer("warga_id").notNull().references(() => warga.id),
  isi: text("isi").notNull(),
  coinDiberikan: integer("coin_diberikan").notNull().default(0),
  balasanGemini: text("balasan_gemini").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type CurhatWarga = typeof curhatWarga.$inferSelect;
// ===================== END CURHAT WARGA =====================

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

// ===================== IURAN PER KK =====================

export const iuranSetting = pgTable("iuran_setting", {
  id: serial("id").primaryKey(),
  jumlahDefault: integer("jumlah_default").notNull().default(30000),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: text("updated_by").notNull().default("admin"),
});

export const iuranKk = pgTable("iuran_kk", {
  id: serial("id").primaryKey(),
  kkId: integer("kk_id").notNull().references(() => kartuKeluarga.id),
  bulanTahun: text("bulan_tahun").notNull(),
  jumlah: integer("jumlah").notNull(),
  status: text("status").notNull().default("belum"),
  tanggalBayar: text("tanggal_bayar"),
  kasRwId: integer("kas_rw_id").references(() => kasRw.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  kkBulanUnique: uniqueIndex("iuran_kk_kk_bulan_unique").on(table.kkId, table.bulanTahun),
}));

export const insertIuranKkSchema = createInsertSchema(iuranKk).omit({ id: true, createdAt: true, updatedAt: true, status: true, tanggalBayar: true, kasRwId: true });

export type IuranSetting = typeof iuranSetting.$inferSelect;
export type IuranKk = typeof iuranKk.$inferSelect;
export type InsertIuranKk = z.infer<typeof insertIuranKkSchema>;

// ===================== END IURAN PER KK =====================
