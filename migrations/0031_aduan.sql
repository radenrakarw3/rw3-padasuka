-- Aduan Warga RW 03: aduan satu pintu, bukti foto, timeline, teguran bertingkat, dan log akses identitas pelapor.
-- Identitas pelapor (nama/WA) disimpan terenkripsi AES-256-GCM oleh server; mode anonim tidak menyimpannya sama sekali.

CREATE TABLE IF NOT EXISTS aduan (
  id serial PRIMARY KEY,
  nomor text UNIQUE,
  kode_lacak text NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  mode_identitas text NOT NULL,
  pelapor_nama_enc text,
  pelapor_wa_enc text,
  pelapor_wa_hash text,
  pelapor_rt integer,
  kategori text NOT NULL,
  judul text NOT NULL,
  uraian text NOT NULL,
  lokasi text,
  rt_lokasi integer,
  tanggal_kejadian text,
  frekuensi text NOT NULL DEFAULT 'sekali',
  dampak text NOT NULL DEFAULT 'mengganggu',
  prioritas text NOT NULL DEFAULT 'sedang',
  teradu_jenis text NOT NULL DEFAULT 'tidak_tahu',
  teradu_ref_id integer,
  teradu_nama text,
  teradu_alamat text,
  teradu_kunci text,
  usaha_id integer REFERENCES rw3biz_usaha(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'masuk',
  duplikat_dari integer REFERENCES aduan(id) ON DELETE SET NULL,
  rw3biz_pelanggaran_id integer REFERENCES rw3biz_pelanggaran(id) ON DELETE SET NULL,
  pesan_publik text,
  catatan_internal text,
  ditangani_oleh text,
  dibaca_at timestamp,
  selesai_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aduan_status_idx ON aduan (status);
CREATE INDEX IF NOT EXISTS aduan_prioritas_idx ON aduan (prioritas);
CREATE INDEX IF NOT EXISTS aduan_teradu_kunci_idx ON aduan (teradu_kunci);
CREATE INDEX IF NOT EXISTS aduan_wa_hash_idx ON aduan (pelapor_wa_hash, created_at);
CREATE INDEX IF NOT EXISTS aduan_created_idx ON aduan (created_at);

CREATE TABLE IF NOT EXISTS aduan_bukti (
  id serial PRIMARY KEY,
  aduan_id integer NOT NULL REFERENCES aduan(id) ON DELETE CASCADE,
  sumber text NOT NULL DEFAULT 'pelapor',
  mime text NOT NULL,
  ukuran integer NOT NULL,
  sha256 text NOT NULL,
  data bytea NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aduan_bukti_aduan_idx ON aduan_bukti (aduan_id);
ALTER TABLE aduan_bukti ALTER COLUMN data SET STORAGE EXTERNAL;

CREATE TABLE IF NOT EXISTS aduan_timeline (
  id serial PRIMARY KEY,
  aduan_id integer NOT NULL REFERENCES aduan(id) ON DELETE CASCADE,
  jenis text NOT NULL,
  isi text NOT NULL,
  publik boolean NOT NULL DEFAULT false,
  oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aduan_timeline_aduan_idx ON aduan_timeline (aduan_id, created_at);

CREATE TABLE IF NOT EXISTS aduan_teguran (
  id serial PRIMARY KEY,
  aduan_id integer REFERENCES aduan(id) ON DELETE SET NULL,
  teradu_kunci text NOT NULL,
  teradu_jenis text NOT NULL,
  teradu_nama text NOT NULL,
  teradu_alamat text,
  tingkat text NOT NULL,
  pelanggaran text NOT NULL,
  kewajiban text NOT NULL,
  tenggat text,
  surat_id integer,
  nomor_surat text,
  status text NOT NULL DEFAULT 'aktif',
  cara_serah text,
  diserahkan_at timestamp,
  catatan text,
  oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aduan_teguran_kunci_idx ON aduan_teguran (teradu_kunci, created_at);
CREATE INDEX IF NOT EXISTS aduan_teguran_status_idx ON aduan_teguran (status, tenggat);
CREATE INDEX IF NOT EXISTS aduan_teguran_aduan_idx ON aduan_teguran (aduan_id);

CREATE TABLE IF NOT EXISTS aduan_akses (
  id serial PRIMARY KEY,
  aduan_id integer NOT NULL REFERENCES aduan(id) ON DELETE CASCADE,
  oleh text NOT NULL,
  alasan text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aduan_akses_aduan_idx ON aduan_akses (aduan_id);
