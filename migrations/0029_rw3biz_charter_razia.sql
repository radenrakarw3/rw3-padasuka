-- RW3BIZ: kendaraan berat charter (kedatangan per minggu) dan catatan razia kendaraan.

ALTER TABLE rw3biz_pengajuan
  ADD COLUMN IF NOT EXISTS charter_kolbak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charter_truk integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charter_truk_besar integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charter_penyedia text;

ALTER TABLE rw3biz_usaha
  ADD COLUMN IF NOT EXISTS charter_kolbak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charter_truk integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charter_truk_besar integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charter_penyedia text;

CREATE TABLE IF NOT EXISTS rw3biz_razia (
  id serial PRIMARY KEY,
  tanggal text NOT NULL,
  jam text,
  lokasi text NOT NULL,
  plat text NOT NULL,
  plat_normal text NOT NULL,
  jenis text NOT NULL,
  kepemilikan text NOT NULL DEFAULT 'tidak_tahu',
  usaha_id integer REFERENCES rw3biz_usaha(id) ON DELETE SET NULL,
  tujuan_lain text,
  nama_sopir text,
  hasil text NOT NULL,
  keterangan_hasil text,
  denda integer NOT NULL DEFAULT 0,
  denda_status text NOT NULL DEFAULT 'tidak_ada',
  tanggal_bayar text,
  pembayar_nama text,
  kas_rw_id integer REFERENCES kas_rw(id) ON DELETE SET NULL,
  alasan_bebas text,
  selesai boolean NOT NULL DEFAULT false,
  catatan text,
  dicatat_oleh text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rw3biz_razia_tanggal_idx ON rw3biz_razia (tanggal);
CREATE INDEX IF NOT EXISTS rw3biz_razia_plat_idx ON rw3biz_razia (plat_normal);
CREATE INDEX IF NOT EXISTS rw3biz_razia_usaha_idx ON rw3biz_razia (usaha_id);
