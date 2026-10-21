import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, uniqueIndex, index, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { isActiveRt } from "./rt";
import { RTJUARA_MAX_FOTO, RTJUARA_PERIODE, isRtjuaraRt } from "./rtjuara";
import { parseKkKendaraanData, validateKkKendaraanList } from "./kk-kendaraan";

export const kartuKeluarga = pgTable("kartu_keluarga", {
  id: serial("id").primaryKey(),
  nomorKk: text("nomor_kk").notNull().unique(),
  rt: integer("rt").notNull(),
  /** Nomor unit/rumah di RT. */
  noUnit: text("no_unit"),
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
  /** Label internal ketua RW (JSON array) — tidak tampil ke warga. */
  labelRw: text("label_rw"),
  /** Daftar kendaraan KK — JSON [{ jenis, platNomor }]. */
  kendaraanData: text("kendaraan_data"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_kartu_keluarga_rt").on(table.rt),
]);

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
  /** Kategori umur master — dihitung dari tanggal_lahir (SSOT shared/kategori-umur.ts). */
  kategoriUmur: text("kategori_umur"),
  golonganDarah: text("golongan_darah"),
  kewarganegaraan: text("kewarganegaraan").notNull().default("WNI"),
  suku: text("suku"),
  pekerjaan: text("pekerjaan"),
  pendidikan: text("pendidikan"),
  statusKependudukan: text("status_kependudukan").notNull().default("Aktif"),
  statusEktp: text("status_ektp"),
  noAktaLahir: text("no_akta_lahir"),
  punyaAktaLahir: boolean("punya_akta_lahir").notNull().default(false),
  tanggalTerbitAktaLahir: text("tanggal_terbit_akta_lahir"),
  tempatTerbitAktaLahir: text("tempat_terbit_akta_lahir"),
  namaIbuAktaLahir: text("nama_ibu_akta_lahir"),
  namaAyahAktaLahir: text("nama_ayah_akta_lahir"),
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
  punyaUsahaLuarRw3: boolean("punya_usaha_luar_rw3").notNull().default(false),
  namaUsahaLuarRw3: text("nama_usaha_luar_rw3"),
  // Data kesehatan & kondisi khusus
  statusDisabilitas: text("status_disabilitas").notNull().default("Tidak Ada"),
  /** UNESCO — literasi baca-tulis. */
  literasi: text("literasi"),
  /** Washington Group Short Set (domain disederhanakan). */
  wgKesulitanMelihat: text("wg_kesulitan_melihat"),
  wgKesulitanBerjalan: text("wg_kesulitan_berjalan"),
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
}, (table) => [
  index("idx_warga_kk_id").on(table.kkId),
  index("idx_warga_status_kependudukan").on(table.statusKependudukan),
  index("idx_warga_kategori_umur").on(table.kategoriUmur),
]);

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
  subJenis: text("sub_jenis"),
  judul: text("judul").notNull(),
  isi: text("isi").notNull(),
  fotoLaporan: text("foto_laporan"),
  proyekId: integer("proyek_id"),
  status: text("status").notNull().default("pending"),
  tanggapanAdmin: text("tanggapan_admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Antrian bantuan air saat kekeringan — tiket dikeluarkan setelah survey RW. */
export const laporanKekeringan = pgTable("laporan_kekeringan", {
  id: serial("id").primaryKey(),
  nomorAntrian: text("nomor_antrian").notNull().unique(),
  nomorTiket: text("nomor_tiket").unique(),
  namaPelapor: text("nama_pelapor").notNull(),
  nomorRt: integer("nomor_rt").notNull(),
  nomorWa: text("nomor_wa").notNull(),
  alamat: text("alamat").notNull(),
  jumlahPenghuni: integer("jumlah_penghuni").notNull(),
  keterangan: text("keterangan"),
  status: text("status").notNull().default("menunggu_survey"),
  catatanSurvey: text("catatan_survey"),
  tanggalSurvey: text("tanggal_survey"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_laporan_kekeringan_status").on(table.status),
  index("idx_laporan_kekeringan_jumlah").on(table.jumlahPenghuni),
  index("idx_laporan_kekeringan_rt").on(table.nomorRt),
]);

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
  // Surat Sakti (migrations/0023_wilayah.sql)
  status: text("status").notNull().default("terbit"),
  dataForm: jsonb("data_form"),
  dibuatOleh: text("dibuat_oleh"),
  diterbitkanAt: timestamp("diterbitkan_at"),
  dibatalkanAt: timestamp("dibatalkan_at"),
  alasanBatal: text("alasan_batal"),
  menggantiId: integer("mengganti_id"),
  kejadianId: integer("kejadian_id"),
  kegiatanId: integer("kegiatan_id"),
  permintaanId: integer("permintaan_id"),
  nomorUrut: integer("nomor_urut"),
  tahunNomor: integer("tahun_nomor"),
  updatedAt: timestamp("updated_at"),
  // Surat Sakti v2 (migrations/0025_surat_sakti.sql)
  kodeJenis: text("kode_jenis"),
  templateVersi: integer("template_versi"),
  rangkaianId: integer("rangkaian_id"),
  indukId: integer("induk_id"),
  akses: text("akses").notNull().default("internal"),
  rtTerkait: integer("rt_terkait").array().notNull().default(sql`'{}'::integer[]`),
  snapshot: jsonb("snapshot"),
  verifikasiToken: text("verifikasi_token"),
  perluPemeriksaan: boolean("perlu_pemeriksaan").notNull().default(false),
  idempotencyKey: text("idempotency_key"),
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
  jumlahPending: integer("jumlah_pending").notNull().default(0),
  jumlahGagal: integer("jumlah_gagal").notNull().default(0),
  jumlahDilewati: integer("jumlah_dilewati").notNull().default(0),
  status: text("status").notNull().default("pending"),
  lastError: text("last_error"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const waBlastRecipient = pgTable("wa_blast_recipient", {
  id: serial("id").primaryKey(),
  blastId: integer("blast_id").notNull().references(() => waBlast.id),
  recipientType: text("recipient_type").notNull().default("warga"),
  recipientId: integer("recipient_id"),
  nama: text("nama").notNull(),
  nomorWhatsapp: text("nomor_whatsapp").notNull(),
  rt: integer("rt"),
  pesanPersonal: text("pesan_personal").notNull(),
  status: text("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const waNotifikasiLog = pgTable(
  "wa_notifikasi_log",
  {
    id: serial("id").primaryKey(),
    eventKey: text("event_key").notNull(),
    nomorWhatsapp: text("nomor_whatsapp").notNull(),
    referenceType: text("reference_type"),
    referenceId: integer("reference_id"),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at").defaultNow(),
  },
  (table) => ({
    eventPhoneIdx: uniqueIndex("wa_notifikasi_log_event_phone_idx").on(table.eventKey, table.nomorWhatsapp),
  }),
);

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
  nomorPendaftaran: text("nomor_pendaftaran").unique(),
  namaKost: text("nama_kost").notNull(),
  namaPemilik: text("nama_pemilik").notNull(),
  nomorWaPemilik: text("nomor_wa_pemilik").notNull(),
  namaPenanggungJawab: text("nama_penanggung_jawab"),
  nomorWaPenanggungJawab: text("nomor_wa_penanggung_jawab"),
  rt: integer("rt").notNull(),
  alamatLengkap: text("alamat_lengkap").notNull(),
  jumlahPintu: integer("jumlah_pintu").notNull().default(1),
  izinTinggal: boolean("izin_tinggal").notNull().default(true),
  izinBisnis: boolean("izin_bisnis").notNull().default(false),
  jenisProperti: text("jenis_properti").notNull().default("kost"),
  statusProperti: text("status_properti").notNull().default("menunggu_verifikasi"),
  catatanPemohon: text("catatan_pemohon"),
  setujuTataTertib: boolean("setuju_tata_tertib").notNull().default(false),
  settingsVersi: text("settings_versi"),
  estimasiKontribusi: integer("estimasi_kontribusi"),
  rincianKontribusi: text("rincian_kontribusi"),
  kasRwId: integer("kas_rw_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Jenis warga singgah Visit RW3 (tanpa perantara pemilik properti). */
export const JENIS_WARGA_VALUES = ["kontrak", "kost", "jualan"] as const;
export type JenisWarga = (typeof JENIS_WARGA_VALUES)[number];

export const wargaSinggah = pgTable("warga_singgah", {
  id: serial("id").primaryKey(),
  /** Legacy — tidak dipakai di alur baru; boleh null. */
  pemilikKostId: integer("pemilik_kost_id").references(() => pemilikKost.id),
  jenisWarga: text("jenis_warga"),
  rt: integer("rt"),
  alamat: text("alamat"),
  namaLengkap: text("nama_lengkap").notNull(),
  nik: text("nik").notNull().unique(),
  nomorWhatsapp: text("nomor_whatsapp").notNull(),
  pekerjaan: text("pekerjaan").notNull(),
  tanggalMulaiKontrak: text("tanggal_mulai_kontrak").notNull(),
  tanggalHabisKontrak: text("tanggal_habis_kontrak").notNull(),
  jumlahPenghuni: integer("jumlah_penghuni").notNull().default(1),
  keperluanTinggal: text("keperluan_tinggal").notNull(),
  status: text("status").notNull().default("aktif"),
  nomorVisitrw3: text("nomor_visitrw3"),
  pengajuanId: integer("pengajuan_id"),
  terminBulan: integer("termin_bulan"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visitrw3Pengajuan = pgTable("visitrw3_pengajuan", {
  id: serial("id").primaryKey(),
  nomorVisitrw3: text("nomor_visitrw3").notNull().unique(),
  tipe: text("tipe").notNull(),
  status: text("status").notNull().default("menunggu_survey"),
  keperluanPengajuan: text("keperluan_pengajuan").notNull(),
  /** kontrak | kost | jualan */
  jenisWarga: text("jenis_warga"),
  /** Legacy — tidak dipakai di alur baru. */
  pemilikKostId: integer("pemilik_kost_id").references(() => pemilikKost.id),
  rt: integer("rt").notNull(),
  /** Alamat tinggal / lokasi usaha di wilayah RW 03. */
  alamat: text("alamat"),
  namaUsaha: text("nama_usaha"),
  jenisUsaha: text("jenis_usaha"),
  jenisTempatUsaha: text("jenis_tempat_usaha"),
  jenisTempatUsahaLain: text("jenis_tempat_usaha_lain"),
  /** JSON array — kategori/jenis usaha (bisa lebih dari satu, mis. warung + pertamini). */
  kategoriUsaha: text("kategori_usaha"),
  tinggalDiWilayahRw3: boolean("tinggal_di_wilayah_rw3"),
  jamBuka: text("jam_buka"),
  jamTutup: text("jam_tutup"),
  alamatUsaha: text("alamat_usaha"),
  persetujuanTetangga: text("persetujuan_tetangga"),
  penanggungJawab: text("penanggung_jawab"),
  nomorUnit: text("nomor_unit"),
  /** kecil | sedang | besar — ukuran kamar kost / jumlah kamar tidur kontrakan (dasar kontribusi penghuni). */
  ukuranTinggal: text("ukuran_tinggal"),
  jumlahPenghuni: integer("jumlah_penghuni").notNull(),
  tanggalBayar: text("tanggal_bayar").notNull(),
  terminBulan: integer("termin_bulan").notNull(),
  tanggalBerlakuSampai: text("tanggal_berlaku_sampai").notNull(),
  wargaSinggahId: integer("warga_singgah_id").references(() => wargaSinggah.id),
  catatanPemohon: text("catatan_pemohon"),
  catatanSurvey: text("catatan_survey"),
  alasanTolak: text("alasan_tolak"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  setujuTataTertib: boolean("setuju_tata_tertib").notNull().default(false),
  settingsVersi: text("settings_versi"),
  estimasiKontribusi: integer("estimasi_kontribusi"),
  rincianKontribusi: text("rincian_kontribusi"),
  kasRwId: integer("kas_rw_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visitrw3Settings = pgTable("visitrw3_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  keterangan: text("keterangan"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rw3lawDokumen = pgTable("rw3law_dokumen", {
  id: serial("id").primaryKey(),
  judul: text("judul").notNull(),
  slug: text("slug").notNull().unique(),
  isi: text("isi").notNull(),
  kategori: text("kategori").notNull().default("umum"),
  status: text("status").notNull().default("draft"),
  rtAsal: integer("rt_asal"),
  versi: text("versi"),
  tanggalBerlaku: text("tanggal_berlaku"),
  nomorPeraturan: integer("nomor_peraturan"),
  tahunNomor: integer("tahun_nomor"),
  revisiDariId: integer("revisi_dari_id"),
  dicabutAt: timestamp("dicabut_at"),
  urutan: integer("urutan").notNull().default(0),
  catatanInternal: text("catatan_internal"),
  createdBy: text("created_by"),
  disetujuiOleh: text("disetujui_oleh"),
  disetujuiAt: timestamp("disetujui_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visitrw3Penghuni = pgTable("visitrw3_penghuni", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id").notNull().references(() => visitrw3Pengajuan.id, { onDelete: "cascade" }),
  namaLengkap: text("nama_lengkap").notNull(),
  tanggalLahir: text("tanggal_lahir").notNull(),
  isAnak: boolean("is_anak").notNull().default(false),
  nik: text("nik"),
  nomorWhatsapp: text("nomor_whatsapp"),
  jenisKelamin: text("jenis_kelamin"),
  pekerjaan: text("pekerjaan"),
  keperluanTinggal: text("keperluan_tinggal"),
  /** JSON DetailKeperluan (shared/visitrw3-keperluan.ts). */
  detailKeperluan: text("detail_keperluan"),
  namaTempatKerja: text("nama_tempat_kerja"),
  namaSekolah: text("nama_sekolah"),
  punyaKendaraan: boolean("punya_kendaraan").notNull().default(false),
  jenisKendaraan: text("jenis_kendaraan"),
  platNomor: text("plat_nomor"),
  /** Path legacy disk atau token; untuk tampilan admin gunakan endpoint by id. */
  fotoKtpPath: text("foto_ktp_path"),
  /** data:image/...;base64,... — disimpan di DB (Railway ephemeral FS). */
  fotoKtpData: text("foto_ktp_data"),
  urutan: integer("urutan").notNull().default(0),
});

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * Foto dokumen Visit RW3 (KTP per penghuni, KK per pengajuan) sebagai biner, bukan base64:
 * ±25% lebih hemat dan tidak ikut terbaca saat query daftar/detail.
 */
export const visitrw3Dokumen = pgTable(
  "visitrw3_dokumen",
  {
    id: serial("id").primaryKey(),
    pengajuanId: integer("pengajuan_id").notNull().references(() => visitrw3Pengajuan.id, { onDelete: "cascade" }),
    penghuniId: integer("penghuni_id").references(() => visitrw3Penghuni.id, { onDelete: "cascade" }),
    /** ktp | kk */
    jenis: text("jenis").notNull(),
    mime: text("mime").notNull(),
    ukuran: integer("ukuran").notNull(),
    sha256: text("sha256").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("visitrw3_dokumen_pengajuan_idx").on(t.pengajuanId, t.jenis),
    index("visitrw3_dokumen_penghuni_idx").on(t.penghuniId),
  ],
);

// ===================== RW3BIZ (izin usaha / jualan) =====================
// Basis data terpisah dari Visit RW3. Visit RW3 hanya melayani kontrak/kost;
// data jualan/usaha hidup di tabel rw3biz_* agar bisa dipakai WA blast ke PJ/pemilik usaha.

/** Data penentu kontribusi bulanan — sama di pengajuan & usaha (lihat shared/rw3biz-kontribusi.ts). */
function rw3bizKontribusiKolom() {
  return {
    statusTempat: text("status_tempat"),
    luasM2: integer("luas_m2"),
    hariOperasional: integer("hari_operasional"),
    rentangOmzet: text("rentang_omzet"),
    /** tidak | malam | 24jam */
    operasionalMalam: text("operasional_malam"),
    sampahKantongHari: integer("sampah_kantong_hari"),
    pakaiBahuJalan: boolean("pakai_bahu_jalan").notNull().default(false),
    kendaraanMotor: integer("kendaraan_motor").notNull().default(0),
    kendaraanMobil: integer("kendaraan_mobil").notNull().default(0),
    kendaraanKolbak: integer("kendaraan_kolbak").notNull().default(0),
    kendaraanTruk: integer("kendaraan_truk").notNull().default(0),
    kendaraanTrukBesar: integer("kendaraan_truk_besar").notNull().default(0),
    /** Kendaraan berat charter: rata-rata kedatangan per minggu. */
    charterKolbak: integer("charter_kolbak").notNull().default(0),
    charterTruk: integer("charter_truk").notNull().default(0),
    charterTrukBesar: integer("charter_truk_besar").notNull().default(0),
    /** Nama penyedia/rental charter (opsional). */
    charterPenyedia: text("charter_penyedia"),
    /** JSON array plat nomor kendaraan operasional. */
    kendaraanOperasional: text("kendaraan_operasional"),
    /** Usaha baru buka (< 3 bulan) — dapat bulan pertama gratis. */
    usahaBaru: boolean("usaha_baru").notNull().default(false),
    kontribusiBulanan: integer("kontribusi_bulanan"),
    /** JSON { input, hasil } — hasil hitungKontribusiRw3biz saat ditetapkan. */
    rincianKontribusi: text("rincian_kontribusi"),
    persenPekerjaRw3: integer("persen_pekerja_rw3"),
  };
}

/** Usaha aktif RW3BIZ (dibuat setelah pengajuan disetujui). */
export const rw3bizUsaha = pgTable("rw3biz_usaha", {
  id: serial("id").primaryKey(),
  /** Format BIZ-YYYY-#### — berganti setiap perpanjang. */
  nomorBiz: text("nomor_biz").notNull().unique(),
  /** Nomor Induk Usaha RW3 (NIU-RW3-####) — tetap seumur usaha, dipakai cek status. */
  nomorInduk: text("nomor_induk").unique(),
  rt: integer("rt").notNull(),
  alamat: text("alamat").notNull(),
  nomorLokasi: text("nomor_lokasi"),
  namaUsaha: text("nama_usaha").notNull(),
  jenisTempatUsaha: text("jenis_tempat_usaha"),
  jenisTempatUsahaLain: text("jenis_tempat_usaha_lain"),
  /** JSON array kategori/jenis usaha. */
  kategoriUsaha: text("kategori_usaha"),
  jamBuka: text("jam_buka"),
  jamTutup: text("jam_tutup"),
  alamatUsaha: text("alamat_usaha"),
  pjNama: text("pj_nama").notNull(),
  pjNik: text("pj_nik"),
  /** Nomor WA penanggung jawab — kunci untuk WA blast RW3BIZ. */
  pjNomorWhatsapp: text("pj_nomor_whatsapp").notNull(),
  pjSetujuNotifikasi: boolean("pj_setuju_notifikasi").notNull().default(true),
  status: text("status").notNull().default("aktif"),
  tanggalMulai: text("tanggal_mulai").notNull(),
  tanggalHabis: text("tanggal_habis").notNull(),
  terminBulan: integer("termin_bulan"),
  pengajuanId: integer("pengajuan_id"),
  ...rw3bizKontribusiKolom(),
  /** Periode (YYYY-MM) tagihan pertama. */
  periodeTagihanMulai: text("periode_tagihan_mulai"),
  /** Periode acuan masa transisi (YYYY-MM); null = tanpa transisi. */
  tahapTransisiMulai: text("tahap_transisi_mulai"),
  keringananJenis: text("keringanan_jenis"),
  keringananPersen: integer("keringanan_persen"),
  /** YYYY-MM-DD — keringanan berlaku sampai periode yang memuat tanggal ini. */
  keringananSampai: text("keringanan_sampai"),
  keringananAlasan: text("keringanan_alasan"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Pengajuan izin usaha RW3BIZ (baru / perpanjang). */
export const rw3bizPengajuan = pgTable("rw3biz_pengajuan", {
  id: serial("id").primaryKey(),
  nomorBiz: text("nomor_biz").notNull().unique(),
  /** pengajuan_baru | perpanjang */
  tipe: text("tipe").notNull(),
  status: text("status").notNull().default("menunggu_survey"),
  rt: integer("rt").notNull(),
  alamat: text("alamat").notNull(),
  nomorLokasi: text("nomor_lokasi"),
  namaUsaha: text("nama_usaha").notNull(),
  jenisTempatUsaha: text("jenis_tempat_usaha"),
  jenisTempatUsahaLain: text("jenis_tempat_usaha_lain"),
  kategoriUsaha: text("kategori_usaha"),
  jamBuka: text("jam_buka"),
  jamTutup: text("jam_tutup"),
  alamatUsaha: text("alamat_usaha"),
  pjNama: text("pj_nama").notNull(),
  pjNik: text("pj_nik"),
  pjNomorWhatsapp: text("pj_nomor_whatsapp").notNull(),
  pjSetujuNotifikasi: boolean("pj_setuju_notifikasi").notNull().default(true),
  jumlahOrang: integer("jumlah_orang").notNull(),
  tanggalBayar: text("tanggal_bayar").notNull(),
  terminBulan: integer("termin_bulan").notNull(),
  tanggalBerlakuSampai: text("tanggal_berlaku_sampai").notNull(),
  usahaId: integer("usaha_id").references(() => rw3bizUsaha.id),
  catatanPemohon: text("catatan_pemohon"),
  catatanSurvey: text("catatan_survey"),
  alasanTolak: text("alasan_tolak"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  setujuTataTertib: boolean("setuju_tata_tertib").notNull().default(false),
  ...rw3bizKontribusiKolom(),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Orang yang tercatat di pengajuan RW3BIZ: penanggung jawab + pekerja. */
export const rw3bizOrang = pgTable("rw3biz_orang", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id").notNull().references(() => rw3bizPengajuan.id, { onDelete: "cascade" }),
  namaLengkap: text("nama_lengkap").notNull(),
  tanggalLahir: text("tanggal_lahir").notNull(),
  isAnak: boolean("is_anak").notNull().default(false),
  isPenanggungJawab: boolean("is_penanggung_jawab").notNull().default(false),
  nik: text("nik"),
  nomorWhatsapp: text("nomor_whatsapp"),
  jenisKelamin: text("jenis_kelamin"),
  pekerjaan: text("pekerjaan"),
  namaTempatKerja: text("nama_tempat_kerja"),
  namaSekolah: text("nama_sekolah"),
  punyaKendaraan: boolean("punya_kendaraan").notNull().default(false),
  jenisKendaraan: text("jenis_kendaraan"),
  platNomor: text("plat_nomor"),
  fotoKtpPath: text("foto_ktp_path"),
  fotoKtpData: text("foto_ktp_data"),
  urutan: integer("urutan").notNull().default(0),
  /** pemilik | penanggung_jawab | pekerja_tetap | pekerja_harian */
  peran: text("peran"),
  /** rw3 | luar */
  asal: text("asal"),
  domisili: text("domisili"),
  /** Hasil pencocokan NIK ke tabel warga (RT aktif). */
  wargaId: integer("warga_id"),
});

/** Tagihan kontribusi bulanan per usaha. */
export const rw3bizTagihan = pgTable(
  "rw3biz_tagihan",
  {
    id: serial("id").primaryKey(),
    usahaId: integer("usaha_id").notNull().references(() => rw3bizUsaha.id, { onDelete: "cascade" }),
    /** YYYY-MM */
    periode: text("periode").notNull(),
    kontribusiBulanan: integer("kontribusi_bulanan").notNull(),
    jumlah: integer("jumlah").notNull(),
    terbayar: integer("terbayar").notNull().default(0),
    /** belum | sebagian | lunas | dibebaskan */
    status: text("status").notNull().default("belum"),
    /** JSON string[] — penjelasan potongan (transisi, keringanan, termin). */
    catatan: text("catatan"),
    tanggalBayar: text("tanggal_bayar"),
    dicatatOleh: text("dicatat_oleh"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("rw3biz_tagihan_usaha_periode_idx").on(t.usahaId, t.periode),
    index("rw3biz_tagihan_periode_idx").on(t.periode),
  ],
);

/** Setiap pembayaran (termasuk cicilan) = satu baris kas_rw. */
export const rw3bizPembayaran = pgTable(
  "rw3biz_pembayaran",
  {
    id: serial("id").primaryKey(),
    tagihanId: integer("tagihan_id").notNull().references(() => rw3bizTagihan.id, { onDelete: "cascade" }),
    jumlah: integer("jumlah").notNull(),
    tanggal: text("tanggal").notNull(),
    kasRwId: integer("kas_rw_id").references(() => kasRw.id, { onDelete: "set null" }),
    dicatatOleh: text("dicatat_oleh").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("rw3biz_pembayaran_tagihan_idx").on(t.tagihanId)],
);

/** Pengajuan peninjauan tarif oleh pengusaha. */
export const rw3bizKeberatan = pgTable("rw3biz_keberatan", {
  id: serial("id").primaryKey(),
  usahaId: integer("usaha_id").notNull().references(() => rw3bizUsaha.id, { onDelete: "cascade" }),
  alasan: text("alasan").notNull(),
  /** menunggu | diterima | ditolak */
  status: text("status").notNull().default("menunggu"),
  tanggapanAdmin: text("tanggapan_admin"),
  ditinjauOleh: text("ditinjau_oleh"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Temuan razia kendaraan di wilayah RW 03 — dicocokkan dengan kendaraan/charter terdaftar. */
export const rw3bizRazia = pgTable(
  "rw3biz_razia",
  {
    id: serial("id").primaryKey(),
    tanggal: text("tanggal").notNull(),
    jam: text("jam"),
    lokasi: text("lokasi").notNull(),
    plat: text("plat").notNull(),
    /** Plat huruf besar tanpa spasi/tanda baca — kunci pencocokan. */
    platNormal: text("plat_normal").notNull(),
    /** KodeKendaraanBiz */
    jenis: text("jenis").notNull(),
    /** milik | charter | tidak_tahu */
    kepemilikan: text("kepemilikan").notNull().default("tidak_tahu"),
    usahaId: integer("usaha_id").references(() => rw3bizUsaha.id, { onDelete: "set null" }),
    /** Tujuan bila bukan usaha terdaftar RW3BIZ. */
    tujuanLain: text("tujuan_lain"),
    namaSopir: text("nama_sopir"),
    /** HasilRazia */
    hasil: text("hasil").notNull(),
    keteranganHasil: text("keterangan_hasil"),
    denda: integer("denda").notNull().default(0),
    /** tidak_ada | belum | lunas | dibebaskan */
    dendaStatus: text("denda_status").notNull().default("tidak_ada"),
    tanggalBayar: text("tanggal_bayar"),
    pembayarNama: text("pembayar_nama"),
    kasRwId: integer("kas_rw_id").references(() => kasRw.id, { onDelete: "set null" }),
    alasanBebas: text("alasan_bebas"),
    /** Usaha sudah memperbarui data kendaraan setelah temuan ini. */
    selesai: boolean("selesai").notNull().default(false),
    catatan: text("catatan"),
    dicatatOleh: text("dicatat_oleh").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("rw3biz_razia_tanggal_idx").on(t.tanggal),
    index("rw3biz_razia_plat_idx").on(t.platNormal),
    index("rw3biz_razia_usaha_idx").on(t.usahaId),
  ],
);
export type Rw3bizRazia = typeof rw3bizRazia.$inferSelect;

export const rw3bizPelanggaran = pgTable(
  "rw3biz_pelanggaran",
  {
    id: serial("id").primaryKey(),
    usahaId: integer("usaha_id").references(() => rw3bizUsaha.id, { onDelete: "set null" }),
    /** Nama usaha yang diadukan bila belum terdaftar RW3BIZ / tidak dipilih pelapor. */
    namaUsahaLain: text("nama_usaha_lain"),
    /** JenisPelanggaran */
    jenis: text("jenis").notNull(),
    /** TingkatPelanggaran */
    tingkat: text("tingkat").notNull().default("sedang"),
    /** aduan_warga | temuan_petugas */
    sumber: text("sumber").notNull(),
    tanggalKejadian: text("tanggal_kejadian").notNull(),
    lokasi: text("lokasi"),
    uraian: text("uraian").notNull(),
    fotoData: text("foto_data"),
    pelaporNama: text("pelapor_nama"),
    pelaporWa: text("pelapor_wa"),
    pelaporRt: integer("pelapor_rt"),
    /** menunggu_verifikasi | terbukti | tidak_terbukti */
    status: text("status").notNull().default("menunggu_verifikasi"),
    /** Pelanggaran ke-n usaha ini dalam 12 bulan (saat diverifikasi). */
    keBerapa: integer("ke_berapa").notNull().default(1),
    denda: integer("denda").notNull().default(0),
    dendaRincian: text("denda_rincian"),
    /** tidak_ada | belum | lunas | dibebaskan */
    dendaStatus: text("denda_status").notNull().default("tidak_ada"),
    tanggalBayar: text("tanggal_bayar"),
    pembayarNama: text("pembayar_nama"),
    kasRwId: integer("kas_rw_id").references(() => kasRw.id, { onDelete: "set null" }),
    alasanBebas: text("alasan_bebas"),
    catatanVerifikasi: text("catatan_verifikasi"),
    diverifikasiOleh: text("diverifikasi_oleh"),
    diverifikasiAt: timestamp("diverifikasi_at"),
    dicatatOleh: text("dicatat_oleh"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("rw3biz_pelanggaran_usaha_idx").on(t.usahaId),
    index("rw3biz_pelanggaran_status_idx").on(t.status),
    index("rw3biz_pelanggaran_tanggal_idx").on(t.tanggalKejadian),
  ],
);
export type Rw3bizPelanggaran = typeof rw3bizPelanggaran.$inferSelect;

// ===================== Aduan Warga (satu pintu) =====================
// Konstanta & aturan: shared/aduan.ts. Identitas pelapor terenkripsi (server/aduan-kripto.ts).

export const aduan = pgTable(
  "aduan",
  {
    id: serial("id").primaryKey(),
    /** ADU-2026-0001 */
    nomor: text("nomor").unique(),
    kodeLacak: text("kode_lacak").notNull().unique(),
    pinHash: text("pin_hash").notNull(),
    /** ModeIdentitas: rahasia | anonim | terbuka */
    modeIdentitas: text("mode_identitas").notNull(),
    pelaporNamaEnc: text("pelapor_nama_enc"),
    pelaporWaEnc: text("pelapor_wa_enc"),
    /** HMAC nomor WA — untuk batas kirim tanpa membuka enkripsi. */
    pelaporWaHash: text("pelapor_wa_hash"),
    pelaporRt: integer("pelapor_rt"),
    kategori: text("kategori").notNull(),
    judul: text("judul").notNull(),
    uraian: text("uraian").notNull(),
    lokasi: text("lokasi"),
    rtLokasi: integer("rt_lokasi"),
    tanggalKejadian: text("tanggal_kejadian"),
    frekuensi: text("frekuensi").notNull().default("sekali"),
    dampak: text("dampak").notNull().default("mengganggu"),
    prioritas: text("prioritas").notNull().default("sedang"),
    teraduJenis: text("teradu_jenis").notNull().default("tidak_tahu"),
    teraduRefId: integer("teradu_ref_id"),
    teraduNama: text("teradu_nama"),
    teraduAlamat: text("teradu_alamat"),
    teraduKunci: text("teradu_kunci"),
    usahaId: integer("usaha_id").references(() => rw3bizUsaha.id, { onDelete: "set null" }),
    status: text("status").notNull().default("masuk"),
    duplikatDari: integer("duplikat_dari"),
    rw3bizPelanggaranId: integer("rw3biz_pelanggaran_id").references(() => rw3bizPelanggaran.id, { onDelete: "set null" }),
    /** Pesan pengurus yang tampil di halaman lacak pelapor. */
    pesanPublik: text("pesan_publik"),
    catatanInternal: text("catatan_internal"),
    ditanganiOleh: text("ditangani_oleh"),
    dibacaAt: timestamp("dibaca_at"),
    selesaiAt: timestamp("selesai_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("aduan_status_idx").on(t.status),
    index("aduan_prioritas_idx").on(t.prioritas),
    index("aduan_teradu_kunci_idx").on(t.teraduKunci),
    index("aduan_wa_hash_idx").on(t.pelaporWaHash, t.createdAt),
    index("aduan_created_idx").on(t.createdAt),
  ],
);
export type Aduan = typeof aduan.$inferSelect;

export const aduanBukti = pgTable(
  "aduan_bukti",
  {
    id: serial("id").primaryKey(),
    aduanId: integer("aduan_id").notNull().references(() => aduan.id, { onDelete: "cascade" }),
    /** pelapor | petugas */
    sumber: text("sumber").notNull().default("pelapor"),
    mime: text("mime").notNull(),
    ukuran: integer("ukuran").notNull(),
    sha256: text("sha256").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("aduan_bukti_aduan_idx").on(t.aduanId)],
);

export const aduanTimeline = pgTable(
  "aduan_timeline",
  {
    id: serial("id").primaryKey(),
    aduanId: integer("aduan_id").notNull().references(() => aduan.id, { onDelete: "cascade" }),
    jenis: text("jenis").notNull(),
    isi: text("isi").notNull(),
    /** true = tampil di halaman lacak pelapor. */
    publik: boolean("publik").notNull().default(false),
    oleh: text("oleh"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("aduan_timeline_aduan_idx").on(t.aduanId, t.createdAt)],
);
export type AduanTimeline = typeof aduanTimeline.$inferSelect;

export const aduanTeguran = pgTable(
  "aduan_teguran",
  {
    id: serial("id").primaryKey(),
    aduanId: integer("aduan_id").references(() => aduan.id, { onDelete: "set null" }),
    teraduKunci: text("teradu_kunci").notNull(),
    teraduJenis: text("teradu_jenis").notNull(),
    teraduNama: text("teradu_nama").notNull(),
    teraduAlamat: text("teradu_alamat"),
    /** TingkatTeguran: lisan | sp1 | sp2 | sp3 */
    tingkat: text("tingkat").notNull(),
    pelanggaran: text("pelanggaran").notNull(),
    kewajiban: text("kewajiban").notNull(),
    tenggat: text("tenggat"),
    /** Dokumen Surat Sakti (surat_rw.id). */
    suratId: integer("surat_id"),
    nomorSurat: text("nomor_surat"),
    /** StatusTeguran: aktif | dipatuhi | tidak_dipatuhi | dicabut */
    status: text("status").notNull().default("aktif"),
    caraSerah: text("cara_serah"),
    diserahkanAt: timestamp("diserahkan_at"),
    catatan: text("catatan"),
    oleh: text("oleh"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("aduan_teguran_kunci_idx").on(t.teraduKunci, t.createdAt),
    index("aduan_teguran_status_idx").on(t.status, t.tenggat),
    index("aduan_teguran_aduan_idx").on(t.aduanId),
  ],
);
export type AduanTeguran = typeof aduanTeguran.$inferSelect;

export const aduanAkses = pgTable(
  "aduan_akses",
  {
    id: serial("id").primaryKey(),
    aduanId: integer("aduan_id").notNull().references(() => aduan.id, { onDelete: "cascade" }),
    oleh: text("oleh").notNull(),
    alasan: text("alasan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("aduan_akses_aduan_idx").on(t.aduanId)],
);

export type Rw3bizTagihan = typeof rw3bizTagihan.$inferSelect;
export type Rw3bizPembayaran = typeof rw3bizPembayaran.$inferSelect;
export type Rw3bizKeberatan = typeof rw3bizKeberatan.$inferSelect;

/** Pengaturan key/value RW3BIZ (setara visitrw3_settings). */
export const rw3bizSettings = pgTable("rw3biz_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  keterangan: text("keterangan"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
// ===================== END RW3BIZ =====================

// ===================== KARANG TARUNA (pendataan anggota) =====================
// Basis data pemuda RW 03: identitas real + skill/potensi + harapan difasilitasi RW.
// Tabel tunggal & self-contained (tidak lewat storage.ts), mirip pola rw3biz_*.

export const karangtarunaAnggota = pgTable("karangtaruna_anggota", {
  id: serial("id").primaryKey(),
  /** Format KT-YYYY-#### */
  nomorAnggota: text("nomor_anggota").notNull().unique(),
  // --- Identitas ---
  namaLengkap: text("nama_lengkap").notNull(),
  nik: text("nik"),
  rt: integer("rt").notNull(),
  alamat: text("alamat").notNull(),
  nomorWhatsapp: text("nomor_whatsapp").notNull(),
  jenisKelamin: text("jenis_kelamin"),
  tanggalLahir: text("tanggal_lahir").notNull(),
  pendidikanTerakhir: text("pendidikan_terakhir"),
  statusAktivitas: text("status_aktivitas"),
  pekerjaan: text("pekerjaan"),
  instagram: text("instagram"),
  // --- Skill & potensi (cerita nyata anggota) ---
  bidangKeahlian: text("bidang_keahlian"), // JSON array string
  ceritaSkill: text("cerita_skill").notNull(),
  pengalamanOrganisasi: text("pengalaman_organisasi"),
  prestasi: text("prestasi"),
  // --- Minat & fasilitasi RW ---
  bidangMinat: text("bidang_minat"), // JSON array string
  harapanFasilitasi: text("harapan_fasilitasi").notNull(),
  ketersediaanWaktu: text("ketersediaan_waktu"),
  bersediaAktif: boolean("bersedia_aktif").notNull().default(true),
  // --- Kelola admin ---
  statusKeanggotaan: text("status_keanggotaan").notNull().default("baru"),
  potensiUnggulan: text("potensi_unggulan"),
  catatanAdmin: text("catatan_admin"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_karangtaruna_anggota_rt").on(table.rt),
  index("idx_karangtaruna_anggota_status").on(table.statusKeanggotaan),
]);
// ===================== END KARANG TARUNA =====================

export const riwayatKontrak = pgTable("riwayat_kontrak", {
  id: serial("id").primaryKey(),
  wargaSinggahId: integer("warga_singgah_id").notNull().references(() => wargaSinggah.id),
  tanggalMulaiLama: text("tanggal_mulai_lama").notNull(),
  tanggalHabisLama: text("tanggal_habis_lama").notNull(),
  tanggalMulaiBaru: text("tanggal_mulai_baru").notNull(),
  tanggalHabisBaru: text("tanggal_habis_baru").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

const insertKkBaseSchema = createInsertSchema(kartuKeluarga).omit({ id: true, createdAt: true });

function refineKkRtPemukiman(data: { rt?: unknown }, ctx: z.RefinementCtx, required: boolean) {
  if (required ? !isActiveRt(data.rt) : data.rt !== undefined && !isActiveRt(data.rt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rt"],
      message: "RT hanya 01–04.",
    });
  }
}

function refineKkKendaraan(data: { kendaraanData?: string | null }, ctx: z.RefinementCtx) {
  if (data.kendaraanData == null || data.kendaraanData === "") return;
  const items = parseKkKendaraanData(data.kendaraanData);
  const err = validateKkKendaraanList(items);
  if (err) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["kendaraanData"], message: err });
  }
}

export const insertKkSchema = insertKkBaseSchema.superRefine((data, ctx) => {
  refineKkRtPemukiman(data, ctx, true);
  refineKkKendaraan(data, ctx);
});

/** PATCH KK — RT opsional; jika diisi harus 01–04. */
export const patchKkSchema = insertKkBaseSchema.partial().superRefine((data, ctx) => {
  refineKkRtPemukiman(data, ctx, false);
  refineKkKendaraan(data, ctx);
});
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
  if (data.punyaUsahaLuarRw3 && !data.namaUsahaLuarRw3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["namaUsahaLuarRw3"], message: "Nama usaha di luar RW 03 wajib diisi" });
  }
  if (data.punyaAktaLahir) {
    if (!data.noAktaLahir?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["noAktaLahir"], message: "Nomor akta kelahiran wajib diisi" });
    }
    if (!data.tanggalTerbitAktaLahir) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tanggalTerbitAktaLahir"], message: "Tanggal terbit akta wajib diisi" });
    }
    if (!data.tempatTerbitAktaLahir?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tempatTerbitAktaLahir"], message: "Tempat terbit akta wajib diisi" });
    }
    if (!data.namaIbuAktaLahir?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["namaIbuAktaLahir"], message: "Nama ibu (sesuai akta) wajib diisi" });
    }
  }
  if (isWorkingStatus(data.statusPekerjaan) && !data.alamatTempatKerja?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["alamatTempatKerja"], message: "Alamat tempat kerja wajib diisi" });
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
export const insertLaporanKekeringanSchema = createInsertSchema(laporanKekeringan).omit({
  id: true,
  createdAt: true,
  nomorAntrian: true,
  nomorTiket: true,
  status: true,
  catatanSurvey: true,
  tanggalSurvey: true,
});
export const insertSuratWargaSchema = createInsertSchema(suratWarga).omit({ id: true, createdAt: true, status: true, isiSurat: true, pdfCode: true, pdfPath: true, nomorSurat: true, fileSurat: true, metodeLayanan: true });
export const insertSuratRwSchema = createInsertSchema(suratRw).omit({ id: true, createdAt: true });
export const insertProfileEditSchema = createInsertSchema(profileEditRequest).omit({ id: true, createdAt: true, status: true });
export const insertAdminSchema = createInsertSchema(adminUser).omit({ id: true, createdAt: true });
export const insertWaBlastSchema = createInsertSchema(waBlast).omit({
  id: true,
  createdAt: true,
  jumlahPenerima: true,
  jumlahBerhasil: true,
  jumlahPending: true,
  jumlahGagal: true,
  jumlahDilewati: true,
  status: true,
  lastError: true,
  startedAt: true,
  finishedAt: true,
});
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

export const RW3LAW_KATEGORI = ["ketertiban", "lingkungan", "keamanan", "umum"] as const;
export const RW3LAW_STATUS = ["draft", "disetujui", "dicabut"] as const;

export const insertRw3lawDokumenSchema = createInsertSchema(rw3lawDokumen)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    status: true,
    disetujuiOleh: true,
    disetujuiAt: true,
    slug: true,
  })
  .extend({
    judul: z.string().min(3, "Judul minimal 3 karakter"),
    isi: z.string().min(20, "Isi peraturan minimal 20 karakter"),
    kategori: z.enum(RW3LAW_KATEGORI),
    rtAsal: z.number().int().min(1).max(4).nullable().optional(),
    versi: z.string().optional().nullable(),
    tanggalBerlaku: z.string().optional().nullable(),
    revisiDariId: z.number().int().positive().optional().nullable(),
    urutan: z.number().int().min(0).optional(),
    catatanInternal: z.string().optional().nullable(),
    createdBy: z.string().optional().nullable(),
  });

export const updateRw3lawDokumenSchema = insertRw3lawDokumenSchema.partial();

export type KartuKeluarga = typeof kartuKeluarga.$inferSelect;
export type InsertKartuKeluarga = z.infer<typeof insertKkSchema>;
export type Warga = typeof warga.$inferSelect;
export type InsertWarga = z.infer<typeof insertWargaSchema>;
export type RtData = typeof rtData.$inferSelect;
export type InsertRtData = z.infer<typeof insertRtSchema>;
export type Laporan = typeof laporan.$inferSelect;
export type InsertLaporan = z.infer<typeof insertLaporanSchema>;
export type LaporanKekeringan = typeof laporanKekeringan.$inferSelect;
export type InsertLaporanKekeringan = z.infer<typeof insertLaporanKekeringanSchema>;
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
export type WaBlastRecipient = typeof waBlastRecipient.$inferSelect;
export type InsertWaBlastRecipient = typeof waBlastRecipient.$inferInsert;
export type WaNotifikasiLog = typeof waNotifikasiLog.$inferSelect;
export type InsertWaNotifikasiLog = typeof waNotifikasiLog.$inferInsert;
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
  pilar: text("pilar").notNull().default("digitalisasi"),
  subProgram: text("sub_program"),
  targetNilai: integer("target_nilai"),
  capaianNilai: integer("capaian_nilai").default(0),
  satuanTarget: text("satuan_target"),
  publik: boolean("publik").notNull().default(false),
  prioritas: integer("prioritas").notNull().default(2),
  pic: text("pic"),
  anggaran: integer("anggaran"),
  sumberDana: text("sumber_dana"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proyekInfrastruktur = pgTable("proyek_infrastruktur", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  pilar: text("pilar").notNull().default("infrastruktur"),
  subProgram: text("sub_program").notNull(),
  rt: integer("rt"),
  lokasi: text("lokasi"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  status: text("status").notNull().default("inventaris"),
  prioritas: integer("prioritas").notNull().default(2),
  estimasiBiaya: integer("estimasi_biaya"),
  sumberDana: text("sumber_dana"),
  fotoSebelum: text("foto_sebelum"),
  fotoSesudah: text("foto_sesudah"),
  catatan: text("catatan"),
  publik: boolean("publik").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const umkmMakeover = pgTable("umkm_makeover", {
  id: serial("id").primaryKey(),
  usahaId: integer("usaha_id").references(() => usaha.id),
  namaUnit: text("nama_unit").notNull(),
  jenisUsaha: text("jenis_usaha").notNull(),
  alamat: text("alamat").notNull(),
  rt: integer("rt").notNull(),
  statusMakeover: text("status_makeover").notNull().default("belum_dinilai"),
  skorFasad: integer("skor_fasad"),
  skorInterior: integer("skor_interior"),
  skorEtalase: integer("skor_etalase"),
  catatanMakeover: text("catatan_makeover"),
  rencanaKerja: text("rencana_kerja"),
  fotoSebelum: text("foto_sebelum"),
  fotoSesudah: text("foto_sesudah"),
  publik: boolean("publik").notNull().default(false),
  tanggalTarget: text("tanggal_target"),
  tanggalSelesai: text("tanggal_selesai"),
  rantaiPasok: text("rantai_pasok"),
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
export const insertProyekInfrastrukturSchema = createInsertSchema(proyekInfrastruktur).omit({ id: true, createdAt: true });
export const insertUmkmMakeoverSchema = createInsertSchema(umkmMakeover).omit({ id: true, createdAt: true });

export type ProgramRw = typeof programRw.$inferSelect;
export type InsertProgramRw = z.infer<typeof insertProgramRwSchema>;
export type PesertaProgram = typeof pesertaProgram.$inferSelect;
export type InsertPesertaProgram = z.infer<typeof insertPesertaProgramSchema>;
export type ProyekInfrastruktur = typeof proyekInfrastruktur.$inferSelect;
export type InsertProyekInfrastruktur = z.infer<typeof insertProyekInfrastrukturSchema>;
export type UmkmMakeover = typeof umkmMakeover.$inferSelect;
export type InsertUmkmMakeover = z.infer<typeof insertUmkmMakeoverSchema>;

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
export const insertVisitrw3PengajuanSchema = createInsertSchema(visitrw3Pengajuan).omit({
  id: true,
  createdAt: true,
  status: true,
  reviewedAt: true,
  reviewedBy: true,
  alasanTolak: true,
  catatanSurvey: true,
});
export const insertVisitrw3PenghuniSchema = createInsertSchema(visitrw3Penghuni).omit({ id: true });

export const insertRw3bizUsahaSchema = createInsertSchema(rw3bizUsaha).omit({ id: true, createdAt: true });
export const insertRw3bizPengajuanSchema = createInsertSchema(rw3bizPengajuan).omit({
  id: true,
  createdAt: true,
  status: true,
  reviewedAt: true,
  reviewedBy: true,
  alasanTolak: true,
  catatanSurvey: true,
});
export const insertRw3bizOrangSchema = createInsertSchema(rw3bizOrang).omit({ id: true });
export const insertRw3bizSettingsSchema = createInsertSchema(rw3bizSettings).omit({ id: true, updatedAt: true });

export const insertKarangtarunaAnggotaSchema = createInsertSchema(karangtarunaAnggota).omit({
  id: true,
  createdAt: true,
  nomorAnggota: true,
  statusKeanggotaan: true,
  potensiUnggulan: true,
  catatanAdmin: true,
  reviewedAt: true,
  reviewedBy: true,
});

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
export type Visitrw3Pengajuan = typeof visitrw3Pengajuan.$inferSelect;
export type Visitrw3Settings = typeof visitrw3Settings.$inferSelect;
export type Visitrw3Penghuni = typeof visitrw3Penghuni.$inferSelect;
export type Rw3lawDokumen = typeof rw3lawDokumen.$inferSelect;
export type InsertRw3lawDokumen = z.infer<typeof insertRw3lawDokumenSchema>;
export type InsertVisitrw3Pengajuan = z.infer<typeof insertVisitrw3PengajuanSchema>;
export type InsertVisitrw3Penghuni = z.infer<typeof insertVisitrw3PenghuniSchema>;

export type Rw3bizUsaha = typeof rw3bizUsaha.$inferSelect;
export type InsertRw3bizUsaha = z.infer<typeof insertRw3bizUsahaSchema>;
export type Rw3bizPengajuan = typeof rw3bizPengajuan.$inferSelect;
export type InsertRw3bizPengajuan = z.infer<typeof insertRw3bizPengajuanSchema>;
export type Rw3bizOrang = typeof rw3bizOrang.$inferSelect;
export type InsertRw3bizOrang = z.infer<typeof insertRw3bizOrangSchema>;
export type Rw3bizSettings = typeof rw3bizSettings.$inferSelect;
export type InsertRw3bizSettings = z.infer<typeof insertRw3bizSettingsSchema>;

export type KarangtarunaAnggota = typeof karangtarunaAnggota.$inferSelect;
export type InsertKarangtarunaAnggota = z.infer<typeof insertKarangtarunaAnggotaSchema>;

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

// ===================== RT JUARA — "RW3 Muncul, RT-nya JUARA" =====================

/** Master quest yang dibuat admin RW; bobot poin tetap per quest. */
export const rtjuaraQuest = pgTable("rtjuara_quest", {
  id: serial("id").primaryKey(),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi").notNull(),
  periode: text("periode").notNull(),
  poin: integer("poin").notNull().default(10),
  instruksiBukti: text("instruksi_bukti"),
  minFoto: integer("min_foto").notNull().default(1),
  wajibJumlahPeserta: boolean("wajib_jumlah_peserta").notNull().default(false),
  berlakuMulai: text("berlaku_mulai"),
  berlakuSampai: text("berlaku_sampai"),
  aktif: boolean("aktif").notNull().default(true),
  dibuatOleh: text("dibuat_oleh"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rtjuara_quest_periode").on(table.periode),
  index("idx_rtjuara_quest_aktif").on(table.aktif),
]);

/** Bukti pengerjaan quest yang dikirim ketua RT (form + dokumentasi foto). */
export const rtjuaraSubmission = pgTable("rtjuara_submission", {
  id: serial("id").primaryKey(),
  questId: integer("quest_id").notNull().references(() => rtjuaraQuest.id, { onDelete: "cascade" }),
  rt: integer("rt").notNull(),
  periodeKey: text("periode_key").notNull(),
  bulanKey: text("bulan_key").notNull(),
  judulKegiatan: text("judul_kegiatan").notNull(),
  tanggalKegiatan: text("tanggal_kegiatan").notNull(),
  lokasi: text("lokasi").notNull(),
  jumlahPeserta: integer("jumlah_peserta"),
  deskripsi: text("deskripsi").notNull(),
  status: text("status").notNull().default("menunggu"),
  /** Snapshot bobot quest saat bukti dikirim — poin tidak berubah kalau quest diedit. */
  poinPotensi: integer("poin_potensi").notNull().default(0),
  poinDiberikan: integer("poin_diberikan").notNull().default(0),
  catatanAdmin: text("catatan_admin"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  dikirimOleh: text("dikirim_oleh"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rtjuara_submission_rt").on(table.rt),
  index("idx_rtjuara_submission_status").on(table.status),
  index("idx_rtjuara_submission_bulan").on(table.bulanKey),
  index("idx_rtjuara_submission_quest").on(table.questId),
]);

/** Foto dokumentasi disimpan terpisah supaya query list tidak menyeret base64. */
export const rtjuaraSubmissionFoto = pgTable("rtjuara_submission_foto", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => rtjuaraSubmission.id, { onDelete: "cascade" }),
  /** data:image/...;base64,... — disimpan di DB (Railway ephemeral FS). */
  fotoData: text("foto_data").notNull(),
  urutan: integer("urutan").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rtjuara_foto_submission").on(table.submissionId),
]);

/** Akun login ketua RT (PIN 6 digit, disimpan sebagai hash bcrypt). */
export const rtjuaraRtAkun = pgTable("rtjuara_rt_akun", {
  id: serial("id").primaryKey(),
  rt: integer("rt").notNull().unique(),
  namaKetua: text("nama_ketua").notNull(),
  nomorWhatsapp: text("nomor_whatsapp"),
  pinHash: text("pin_hash").notNull(),
  aktif: boolean("aktif").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Snapshot beku pengumuman RT Juara bulanan. */
export const rtjuaraJuara = pgTable("rtjuara_juara", {
  id: serial("id").primaryKey(),
  bulanKey: text("bulan_key").notNull(),
  rt: integer("rt").notNull(),
  peringkat: integer("peringkat").notNull(),
  totalPoin: integer("total_poin").notNull().default(0),
  jumlahQuest: integer("jumlah_quest").notNull().default(0),
  catatan: text("catatan"),
  diumumkanAt: timestamp("diumumkan_at").defaultNow(),
  diumumkanOleh: text("diumumkan_oleh"),
}, (table) => [
  uniqueIndex("rtjuara_juara_bulan_rt_unique").on(table.bulanKey, table.rt),
  index("idx_rtjuara_juara_bulan").on(table.bulanKey),
]);

export const insertRtjuaraQuestSchema = createInsertSchema(rtjuaraQuest).omit({
  id: true,
  createdAt: true,
  dibuatOleh: true,
}).extend({
  judul: z.string().min(3, "Judul quest minimal 3 karakter").max(120, "Judul quest terlalu panjang"),
  deskripsi: z.string().min(10, "Deskripsi quest minimal 10 karakter"),
  periode: z.enum(RTJUARA_PERIODE, { errorMap: () => ({ message: "Periode harus harian, mingguan, atau bulanan" }) }),
  poin: z.coerce.number().int().min(1, "Poin minimal 1").max(1000, "Poin maksimal 1000"),
  instruksiBukti: z.string().nullable().optional(),
  minFoto: z.coerce.number().int().min(1, "Minimal 1 foto dokumentasi").max(RTJUARA_MAX_FOTO, `Maksimal ${RTJUARA_MAX_FOTO} foto`).optional(),
  wajibJumlahPeserta: z.boolean().optional(),
  berlakuMulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").nullable().optional(),
  berlakuSampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").nullable().optional(),
  aktif: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.berlakuMulai && data.berlakuSampai && data.berlakuSampai < data.berlakuMulai) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["berlakuSampai"],
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    });
  }
});

export const patchRtjuaraQuestSchema = createInsertSchema(rtjuaraQuest).omit({
  id: true,
  createdAt: true,
  dibuatOleh: true,
}).partial().extend({
  judul: z.string().min(3, "Judul quest minimal 3 karakter").max(120).optional(),
  deskripsi: z.string().min(10, "Deskripsi quest minimal 10 karakter").optional(),
  periode: z.enum(RTJUARA_PERIODE).optional(),
  poin: z.coerce.number().int().min(1).max(1000).optional(),
  minFoto: z.coerce.number().int().min(1).max(RTJUARA_MAX_FOTO).optional(),
  berlakuMulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").nullable().optional(),
  berlakuSampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").nullable().optional(),
});

/** Payload kirim bukti dari portal RT — `rt` diambil dari sesi, bukan dari body. */
export const insertRtjuaraSubmissionSchema = z.object({
  questId: z.coerce.number().int().positive("Quest tidak valid"),
  judulKegiatan: z.string().min(3, "Judul kegiatan minimal 3 karakter").max(150, "Judul kegiatan terlalu panjang"),
  tanggalKegiatan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal kegiatan: YYYY-MM-DD"),
  lokasi: z.string().min(3, "Lokasi kegiatan wajib diisi"),
  jumlahPeserta: z.coerce.number().int().min(0, "Jumlah peserta tidak boleh negatif").max(100000).nullable().optional(),
  deskripsi: z.string().min(10, "Ceritakan kegiatannya minimal 10 karakter"),
  dikirimOleh: z.string().max(100).nullable().optional(),
  foto: z
    .array(z.string().startsWith("data:image/", "Format foto tidak valid"))
    .min(1, "Wajib melampirkan minimal 1 foto dokumentasi")
    .max(RTJUARA_MAX_FOTO, `Maksimal ${RTJUARA_MAX_FOTO} foto dokumentasi`),
});

export const reviewRtjuaraSubmissionSchema = z.object({
  status: z.enum(["disetujui", "ditolak"], {
    errorMap: () => ({ message: "Status verifikasi harus disetujui atau ditolak" }),
  }),
  catatanAdmin: z.string().max(500).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.status === "ditolak" && !data.catatanAdmin?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["catatanAdmin"],
      message: "Alasan penolakan wajib diisi",
    });
  }
});

export const upsertRtjuaraAkunSchema = z.object({
  rt: z.coerce.number().int().refine((n) => isRtjuaraRt(n), "RT tidak valid (01–07)"),
  namaKetua: z.string().min(2, "Nama ketua RT wajib diisi").max(100),
  nomorWhatsapp: z.string().max(30).nullable().optional(),
  pin: z.string().regex(/^\d{6}$/, "PIN harus 6 digit angka").optional(),
  aktif: z.boolean().optional(),
});

export const rtjuaraLoginSchema = z.object({
  rt: z.coerce.number().int().refine((n) => isRtjuaraRt(n), "Pilih RT terlebih dahulu"),
  pin: z.string().regex(/^\d{6}$/, "PIN harus 6 digit angka"),
});

export type RtjuaraQuest = typeof rtjuaraQuest.$inferSelect;
export type InsertRtjuaraQuest = z.infer<typeof insertRtjuaraQuestSchema>;
export type RtjuaraSubmission = typeof rtjuaraSubmission.$inferSelect;
export type InsertRtjuaraSubmission = z.infer<typeof insertRtjuaraSubmissionSchema>;
export type RtjuaraSubmissionFoto = typeof rtjuaraSubmissionFoto.$inferSelect;
export type RtjuaraRtAkun = typeof rtjuaraRtAkun.$inferSelect;
export type RtjuaraJuara = typeof rtjuaraJuara.$inferSelect;

// ===================== END RT JUARA =====================
