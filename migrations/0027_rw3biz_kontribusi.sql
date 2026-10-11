-- RW3BIZ: kontribusi bulanan usaha, tagihan, pembayaran (masuk kas_rw), dan keberatan tarif.
-- Data penentu kontribusi disimpan di pengajuan (isian pemohon) dan usaha (hasil survey).

ALTER TABLE rw3biz_pengajuan
  ADD COLUMN IF NOT EXISTS status_tempat text,
  ADD COLUMN IF NOT EXISTS luas_m2 integer,
  ADD COLUMN IF NOT EXISTS hari_operasional integer,
  ADD COLUMN IF NOT EXISTS rentang_omzet text,
  ADD COLUMN IF NOT EXISTS operasional_malam text,
  ADD COLUMN IF NOT EXISTS sampah_kantong_hari integer,
  ADD COLUMN IF NOT EXISTS pakai_bahu_jalan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kendaraan_motor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kendaraan_mobil integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kendaraan_operasional text,
  ADD COLUMN IF NOT EXISTS usaha_baru boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kontribusi_bulanan integer,
  ADD COLUMN IF NOT EXISTS rincian_kontribusi text,
  ADD COLUMN IF NOT EXISTS persen_pekerja_rw3 integer;

ALTER TABLE rw3biz_usaha
  ADD COLUMN IF NOT EXISTS status_tempat text,
  ADD COLUMN IF NOT EXISTS luas_m2 integer,
  ADD COLUMN IF NOT EXISTS hari_operasional integer,
  ADD COLUMN IF NOT EXISTS rentang_omzet text,
  ADD COLUMN IF NOT EXISTS operasional_malam text,
  ADD COLUMN IF NOT EXISTS sampah_kantong_hari integer,
  ADD COLUMN IF NOT EXISTS pakai_bahu_jalan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kendaraan_motor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kendaraan_mobil integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kendaraan_operasional text,
  ADD COLUMN IF NOT EXISTS usaha_baru boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kontribusi_bulanan integer,
  ADD COLUMN IF NOT EXISTS rincian_kontribusi text,
  ADD COLUMN IF NOT EXISTS persen_pekerja_rw3 integer,
  ADD COLUMN IF NOT EXISTS periode_tagihan_mulai text,
  ADD COLUMN IF NOT EXISTS tahap_transisi_mulai text,
  ADD COLUMN IF NOT EXISTS keringanan_jenis text,
  ADD COLUMN IF NOT EXISTS keringanan_persen integer,
  ADD COLUMN IF NOT EXISTS keringanan_sampai text,
  ADD COLUMN IF NOT EXISTS keringanan_alasan text;

ALTER TABLE rw3biz_orang
  ADD COLUMN IF NOT EXISTS peran text,
  ADD COLUMN IF NOT EXISTS asal text,
  ADD COLUMN IF NOT EXISTS domisili text,
  ADD COLUMN IF NOT EXISTS warga_id integer;

CREATE TABLE IF NOT EXISTS rw3biz_tagihan (
  id serial PRIMARY KEY,
  usaha_id integer NOT NULL REFERENCES rw3biz_usaha(id) ON DELETE CASCADE,
  periode text NOT NULL,
  kontribusi_bulanan integer NOT NULL,
  jumlah integer NOT NULL,
  terbayar integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'belum',
  catatan text,
  tanggal_bayar text,
  dicatat_oleh text,
  created_at timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rw3biz_tagihan_usaha_periode_idx ON rw3biz_tagihan (usaha_id, periode);
CREATE INDEX IF NOT EXISTS rw3biz_tagihan_periode_idx ON rw3biz_tagihan (periode);

CREATE TABLE IF NOT EXISTS rw3biz_pembayaran (
  id serial PRIMARY KEY,
  tagihan_id integer NOT NULL REFERENCES rw3biz_tagihan(id) ON DELETE CASCADE,
  jumlah integer NOT NULL,
  tanggal text NOT NULL,
  kas_rw_id integer REFERENCES kas_rw(id) ON DELETE SET NULL,
  dicatat_oleh text NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rw3biz_pembayaran_tagihan_idx ON rw3biz_pembayaran (tagihan_id);

CREATE TABLE IF NOT EXISTS rw3biz_keberatan (
  id serial PRIMARY KEY,
  usaha_id integer NOT NULL REFERENCES rw3biz_usaha(id) ON DELETE CASCADE,
  alasan text NOT NULL,
  status text NOT NULL DEFAULT 'menunggu',
  tanggapan_admin text,
  ditinjau_oleh text,
  created_at timestamp DEFAULT now()
);
