-- Visit RW3: tabel pengajuan, penghuni form, pengaturan + kolom tambahan properti/penghuni

CREATE TABLE IF NOT EXISTS visitrw3_pengajuan (
  id serial PRIMARY KEY,
  nomor_visitrw3 text NOT NULL UNIQUE,
  tipe text NOT NULL,
  status text NOT NULL DEFAULT 'menunggu_survey',
  keperluan_pengajuan text NOT NULL,
  pemilik_kost_id integer REFERENCES pemilik_kost(id),
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

ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS izin_tinggal boolean NOT NULL DEFAULT true;
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS izin_bisnis boolean NOT NULL DEFAULT false;
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS jenis_properti text NOT NULL DEFAULT 'kost';
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS nomor_pendaftaran text UNIQUE;
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS status_properti text NOT NULL DEFAULT 'aktif';
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS catatan_pemohon text;
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS nama_penanggung_jawab text;
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS nomor_wa_penanggung_jawab text;
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS setuju_tata_tertib boolean NOT NULL DEFAULT false;
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS settings_versi text;
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS estimasi_kontribusi integer;
ALTER TABLE pemilik_kost ADD COLUMN IF NOT EXISTS kas_rw_id integer;

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
ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS setuju_tata_tertib boolean NOT NULL DEFAULT false;
ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS settings_versi text;
ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS estimasi_kontribusi integer;
ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS rincian_kontribusi text;
ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS kas_rw_id integer;
ALTER TABLE visitrw3_pengajuan ALTER COLUMN pemilik_kost_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visitrw3_pengajuan_status ON visitrw3_pengajuan(status);
CREATE INDEX IF NOT EXISTS idx_visitrw3_pengajuan_rt ON visitrw3_pengajuan(rt);
CREATE INDEX IF NOT EXISTS idx_visitrw3_penghuni_pengajuan ON visitrw3_penghuni(pengajuan_id);
