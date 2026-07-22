-- RW3BIZ: basis data terpisah untuk izin usaha / jualan.
-- Visit RW3 (visitrw3_*) hanya menyimpan kontrak/kost; usaha pindah ke rw3biz_*.
-- Tujuan: fondasi WA blast ke penanggung jawab / pemilik usaha.
--
-- Catatan migrasi data: JANGAN salin otomatis baris jualan lama dari visitrw3_*.
-- Arsip historis Visit RW3 tetap ditinggal apa adanya.

CREATE TABLE IF NOT EXISTS rw3biz_usaha (
  id serial PRIMARY KEY,
  nomor_biz text NOT NULL UNIQUE,
  rt integer NOT NULL,
  alamat text NOT NULL,
  nomor_lokasi text,
  nama_usaha text NOT NULL,
  jenis_tempat_usaha text,
  jenis_tempat_usaha_lain text,
  kategori_usaha text,
  jam_buka text,
  jam_tutup text,
  alamat_usaha text,
  pj_nama text NOT NULL,
  pj_nik text,
  pj_nomor_whatsapp text NOT NULL,
  pj_setuju_notifikasi boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'aktif',
  tanggal_mulai text NOT NULL,
  tanggal_habis text NOT NULL,
  termin_bulan integer,
  pengajuan_id integer,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rw3biz_pengajuan (
  id serial PRIMARY KEY,
  nomor_biz text NOT NULL UNIQUE,
  tipe text NOT NULL,
  status text NOT NULL DEFAULT 'menunggu_survey',
  rt integer NOT NULL,
  alamat text NOT NULL,
  nomor_lokasi text,
  nama_usaha text NOT NULL,
  jenis_tempat_usaha text,
  jenis_tempat_usaha_lain text,
  kategori_usaha text,
  jam_buka text,
  jam_tutup text,
  alamat_usaha text,
  pj_nama text NOT NULL,
  pj_nik text,
  pj_nomor_whatsapp text NOT NULL,
  pj_setuju_notifikasi boolean NOT NULL DEFAULT true,
  jumlah_orang integer NOT NULL,
  tanggal_bayar text NOT NULL,
  termin_bulan integer NOT NULL,
  tanggal_berlaku_sampai text NOT NULL,
  usaha_id integer REFERENCES rw3biz_usaha(id),
  catatan_pemohon text,
  catatan_survey text,
  alasan_tolak text,
  reviewed_at timestamp,
  reviewed_by text,
  setuju_tata_tertib boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rw3biz_orang (
  id serial PRIMARY KEY,
  pengajuan_id integer NOT NULL REFERENCES rw3biz_pengajuan(id) ON DELETE CASCADE,
  nama_lengkap text NOT NULL,
  tanggal_lahir text NOT NULL,
  is_anak boolean NOT NULL DEFAULT false,
  is_penanggung_jawab boolean NOT NULL DEFAULT false,
  nik text,
  nomor_whatsapp text,
  jenis_kelamin text,
  pekerjaan text,
  nama_tempat_kerja text,
  nama_sekolah text,
  punya_kendaraan boolean NOT NULL DEFAULT false,
  jenis_kendaraan text,
  plat_nomor text,
  foto_ktp_path text,
  foto_ktp_data text,
  urutan integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rw3biz_settings (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  label text NOT NULL,
  keterangan text,
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rw3biz_usaha_nomor_biz_idx ON rw3biz_usaha (nomor_biz);
CREATE INDEX IF NOT EXISTS rw3biz_usaha_status_idx ON rw3biz_usaha (status);
CREATE INDEX IF NOT EXISTS rw3biz_usaha_pj_wa_idx ON rw3biz_usaha (pj_nomor_whatsapp);
CREATE INDEX IF NOT EXISTS rw3biz_pengajuan_nomor_biz_idx ON rw3biz_pengajuan (nomor_biz);
CREATE INDEX IF NOT EXISTS rw3biz_pengajuan_status_idx ON rw3biz_pengajuan (status);
CREATE INDEX IF NOT EXISTS rw3biz_pengajuan_pj_wa_idx ON rw3biz_pengajuan (pj_nomor_whatsapp);
CREATE INDEX IF NOT EXISTS rw3biz_orang_pengajuan_idx ON rw3biz_orang (pengajuan_id);
