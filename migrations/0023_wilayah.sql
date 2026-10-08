-- Modul Wilayah RW 03 (RT 01–07): data terstruktur, QR pendataan, laporan kecamatan, Surat Sakti.
-- Additive & idempotent: hanya CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- Jalankan lewat: npm run wilayah:migrate            (dry-run, di-ROLLBACK)
--                 npm run wilayah:migrate -- --apply (commit)
-- Rollback: migrations/0023_wilayah.down.sql

CREATE TABLE IF NOT EXISTS wil_rumah (
  id serial PRIMARY KEY,
  rt integer NOT NULL CHECK (rt BETWEEN 1 AND 7),
  alamat text NOT NULL,
  no_unit text,
  catatan text,
  status_verifikasi text NOT NULL DEFAULT 'terverifikasi',
  dibuat_oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wil_rumah_rt ON wil_rumah (rt);

CREATE TABLE IF NOT EXISTS wil_rumah_kk (
  id serial PRIMARY KEY,
  rumah_id integer NOT NULL REFERENCES wil_rumah (id),
  kk_id integer NOT NULL REFERENCES kartu_keluarga (id),
  mulai date NOT NULL DEFAULT current_date,
  sampai date,
  dicatat_oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wil_rumah_kk_aktif ON wil_rumah_kk (kk_id) WHERE sampai IS NULL;
CREATE INDEX IF NOT EXISTS idx_wil_rumah_kk_rumah ON wil_rumah_kk (rumah_id);

-- Fakta berwaktu. Tidak ada baris = belum diketahui.
CREATE TABLE IF NOT EXISTS wil_fakta (
  id serial PRIMARY KEY,
  subjek text NOT NULL CHECK (subjek IN ('warga', 'kk', 'rumah', 'usaha', 'fasilitas')),
  subjek_id integer NOT NULL,
  kunci text NOT NULL,
  nilai text NOT NULL,
  mulai date NOT NULL,
  sampai date,
  sumber text NOT NULL,
  catatan text,
  rt integer,
  status_verifikasi text NOT NULL DEFAULT 'terverifikasi',
  dicatat_role text NOT NULL,
  dicatat_oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wil_fakta_subjek ON wil_fakta (subjek, subjek_id, kunci);
CREATE INDEX IF NOT EXISTS idx_wil_fakta_rt ON wil_fakta (rt);

CREATE TABLE IF NOT EXISTS wil_usaha (
  id serial PRIMARY KEY,
  rt integer NOT NULL CHECK (rt BETWEEN 1 AND 7),
  nama text NOT NULL,
  kategori text,
  rumah_id integer REFERENCES wil_rumah (id),
  alamat text,
  mulai date,
  sampai date,
  rw3biz_usaha_id integer,
  status_verifikasi text NOT NULL DEFAULT 'terverifikasi',
  dibuat_oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wil_usaha_rt ON wil_usaha (rt);

CREATE TABLE IF NOT EXISTS wil_usaha_pemilik (
  id serial PRIMARY KEY,
  usaha_id integer NOT NULL REFERENCES wil_usaha (id) ON DELETE CASCADE,
  warga_id integer NOT NULL REFERENCES warga (id),
  peran text NOT NULL DEFAULT 'pemilik'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wil_usaha_pemilik ON wil_usaha_pemilik (usaha_id, warga_id);

-- Objek bersama: satu catatan induk, satu pengelola.
CREATE TABLE IF NOT EXISTS wil_fasilitas (
  id serial PRIMARY KEY,
  jenis text NOT NULL,
  nama text NOT NULL,
  pengelola text NOT NULL CHECK (pengelola IN ('rt', 'rw')),
  rt_pengelola integer,
  rt_lokasi integer,
  rt_layanan integer[] NOT NULL DEFAULT '{}',
  lokasi text,
  mulai date,
  sampai date,
  status_verifikasi text NOT NULL DEFAULT 'terverifikasi',
  dibuat_oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (pengelola = 'rw' OR rt_pengelola IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_wil_fasilitas_jenis ON wil_fasilitas (jenis);

CREATE TABLE IF NOT EXISTS wil_kelompok (
  id serial PRIMARY KEY,
  jenis text NOT NULL,
  nama text NOT NULL,
  pengelola text NOT NULL CHECK (pengelola IN ('rt', 'rw')),
  rt_pengelola integer,
  rt_basis integer,
  rt_terlibat integer[] NOT NULL DEFAULT '{}',
  ketua text,
  mulai date,
  sampai date,
  status_verifikasi text NOT NULL DEFAULT 'terverifikasi',
  dibuat_oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (pengelola = 'rw' OR rt_pengelola IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS wil_kegiatan (
  id serial PRIMARY KEY,
  jenis text NOT NULL,
  judul text NOT NULL,
  tanggal date NOT NULL,
  pengelola text NOT NULL CHECK (pengelola IN ('rt', 'rw')),
  rt_pengelola integer,
  rt_terlibat integer[] NOT NULL DEFAULT '{}',
  lokasi text,
  uraian text,
  status_verifikasi text NOT NULL DEFAULT 'terverifikasi',
  idempotency_key text UNIQUE,
  dibuat_oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  CHECK (pengelola = 'rw' OR rt_pengelola IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_wil_kegiatan_tanggal ON wil_kegiatan (tanggal);

CREATE TABLE IF NOT EXISTS wil_kegiatan_peserta (
  id serial PRIMARY KEY,
  kegiatan_id integer NOT NULL REFERENCES wil_kegiatan (id) ON DELETE CASCADE,
  rt integer NOT NULL CHECK (rt BETWEEN 1 AND 7),
  jumlah_hadir integer NOT NULL CHECK (jumlah_hadir >= 0),
  dicatat_oleh text,
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wil_kegiatan_peserta ON wil_kegiatan_peserta (kegiatan_id, rt);

CREATE TABLE IF NOT EXISTS wil_kejadian (
  id serial PRIMARY KEY,
  jenis text NOT NULL,
  judul text NOT NULL,
  uraian text,
  tanggal date NOT NULL,
  rt integer,
  pengelola text NOT NULL CHECK (pengelola IN ('rt', 'rw')),
  lokasi text,
  jumlah_pelaku integer CHECK (jumlah_pelaku IS NULL OR jumlah_pelaku >= 0),
  jumlah_korban integer CHECK (jumlah_korban IS NULL OR jumlah_korban >= 0),
  status text NOT NULL DEFAULT 'baru',
  status_verifikasi text NOT NULL DEFAULT 'terverifikasi',
  idempotency_key text UNIQUE,
  dibuat_oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wil_kejadian_rt_tanggal ON wil_kejadian (rt, tanggal);

CREATE TABLE IF NOT EXISTS wil_tindak_lanjut (
  id serial PRIMARY KEY,
  kejadian_id integer NOT NULL REFERENCES wil_kejadian (id) ON DELETE CASCADE,
  catatan text NOT NULL,
  status_baru text,
  oleh_role text NOT NULL,
  oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wil_usulan_koreksi (
  id serial PRIMARY KEY,
  objek text NOT NULL,
  objek_id integer NOT NULL,
  rt_pengusul integer NOT NULL,
  uraian text NOT NULL,
  status text NOT NULL DEFAULT 'baru',
  jawaban text,
  created_at timestamp NOT NULL DEFAULT now(),
  diputus_at timestamp
);

-- Serah-terima pindah RT (atomik, tercatat).
CREATE TABLE IF NOT EXISTS wil_serah_terima (
  id serial PRIMARY KEY,
  jenis text NOT NULL CHECK (jenis IN ('kk', 'warga')),
  kk_id integer NOT NULL REFERENCES kartu_keluarga (id),
  warga_id integer REFERENCES warga (id),
  kk_tujuan_id integer REFERENCES kartu_keluarga (id),
  rt_asal integer NOT NULL,
  rt_tujuan integer NOT NULL,
  alasan text,
  status text NOT NULL DEFAULT 'diajukan',
  diajukan_oleh text,
  diputus_oleh text,
  catatan_putusan text,
  created_at timestamp NOT NULL DEFAULT now(),
  diputus_at timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wil_serah_terima_aktif
  ON wil_serah_terima (kk_id, COALESCE(warga_id, 0)) WHERE status = 'diajukan';

CREATE TABLE IF NOT EXISTS wil_konfirmasi (
  id serial PRIMARY KEY,
  rt integer,
  tahun integer NOT NULL,
  bulan integer NOT NULL,
  bagian text NOT NULL,
  oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wil_konfirmasi ON wil_konfirmasi (COALESCE(rt, 0), tahun, bulan, bagian);

-- Laporan final: snapshot beku; koreksi = versi baru.
CREATE TABLE IF NOT EXISTS wil_laporan (
  id serial PRIMARY KEY,
  rt integer,
  tahun integer NOT NULL,
  bulan integer NOT NULL,
  versi integer NOT NULL,
  acuan date NOT NULL,
  hasil jsonb NOT NULL,
  sumber jsonb NOT NULL,
  alasan_koreksi text,
  dibuat_oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wil_laporan_versi ON wil_laporan (COALESCE(rt, 0), tahun, bulan, versi);

-- Token QR per KK: hanya hash yang disimpan.
CREATE TABLE IF NOT EXISTS wil_kk_token (
  id serial PRIMARY KEY,
  kk_id integer NOT NULL REFERENCES kartu_keluarga (id),
  rt integer NOT NULL,
  nonce text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  kode_kartu text NOT NULL UNIQUE,
  dibuat_oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL,
  dicabut_at timestamp,
  alasan_cabut text
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wil_kk_token_aktif ON wil_kk_token (kk_id) WHERE dicabut_at IS NULL;

CREATE TABLE IF NOT EXISTS wil_usulan (
  id serial PRIMARY KEY,
  token_id integer NOT NULL REFERENCES wil_kk_token (id),
  kk_id integer NOT NULL REFERENCES kartu_keluarga (id),
  rt integer NOT NULL,
  isi jsonb NOT NULL,
  status text NOT NULL DEFAULT 'menunggu',
  idempotency_key text NOT NULL UNIQUE,
  kode_terima text NOT NULL UNIQUE,
  catatan_rt text,
  ip_hash text,
  created_at timestamp NOT NULL DEFAULT now(),
  diputus_at timestamp,
  diputus_oleh text
);
CREATE INDEX IF NOT EXISTS idx_wil_usulan_rt_status ON wil_usulan (rt, status);

CREATE TABLE IF NOT EXISTS wil_audit (
  id serial PRIMARY KEY,
  aktor_role text NOT NULL,
  aktor_rt integer,
  aktor text,
  aksi text NOT NULL,
  entitas text NOT NULL,
  entitas_id integer,
  rt integer,
  sebelum jsonb,
  sesudah jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wil_audit_rt_waktu ON wil_audit (rt, created_at);

-- Surat Sakti: perluasan surat_rw (baris lama tetap 'terbit').
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'terbit';
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS data_form jsonb;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS dibuat_oleh text;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS diterbitkan_at timestamp;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS dibatalkan_at timestamp;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS alasan_batal text;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS mengganti_id integer;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS kejadian_id integer;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS kegiatan_id integer;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS permintaan_id integer;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS nomor_urut integer;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS tahun_nomor integer;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS updated_at timestamp;
CREATE UNIQUE INDEX IF NOT EXISTS uq_surat_rw_nomor_urut ON surat_rw (tahun_nomor, nomor_urut) WHERE nomor_urut IS NOT NULL;

CREATE TABLE IF NOT EXISTS wil_surat_counter (
  tahun integer PRIMARY KEY,
  terakhir integer NOT NULL
);

CREATE TABLE IF NOT EXISTS wil_surat_lampiran (
  id serial PRIMARY KEY,
  surat_id integer NOT NULL REFERENCES surat_rw (id) ON DELETE CASCADE,
  nama text NOT NULL,
  mime text NOT NULL,
  data text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wil_surat_kirim (
  id serial PRIMARY KEY,
  surat_id integer NOT NULL REFERENCES surat_rw (id) ON DELETE CASCADE,
  kanal text NOT NULL,
  penerima text NOT NULL,
  bukti text NOT NULL,
  dikirim_pada timestamp NOT NULL,
  dicatat_oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wil_surat_tindak (
  id serial PRIMARY KEY,
  surat_id integer NOT NULL REFERENCES surat_rw (id) ON DELETE CASCADE,
  catatan text NOT NULL,
  status text NOT NULL DEFAULT 'menunggu',
  tenggat date,
  oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wil_permintaan_surat (
  id serial PRIMARY KEY,
  rt integer NOT NULL CHECK (rt BETWEEN 1 AND 7),
  jenis_surat text NOT NULL,
  perihal text NOT NULL,
  uraian text NOT NULL,
  kejadian_id integer REFERENCES wil_kejadian (id),
  kegiatan_id integer REFERENCES wil_kegiatan (id),
  status text NOT NULL DEFAULT 'baru',
  surat_id integer REFERENCES surat_rw (id),
  jawaban text,
  idempotency_key text UNIQUE,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
