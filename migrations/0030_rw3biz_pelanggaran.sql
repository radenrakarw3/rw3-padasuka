-- RW3BIZ: pelanggaran usaha dari aduan warga / temuan petugas (sampah tercecer, ketertiban, limbah, dll) beserta dendanya.

CREATE TABLE IF NOT EXISTS rw3biz_pelanggaran (
  id serial PRIMARY KEY,
  usaha_id integer REFERENCES rw3biz_usaha(id) ON DELETE SET NULL,
  nama_usaha_lain text,
  jenis text NOT NULL,
  tingkat text NOT NULL DEFAULT 'sedang',
  sumber text NOT NULL,
  tanggal_kejadian text NOT NULL,
  lokasi text,
  uraian text NOT NULL,
  foto_data text,
  pelapor_nama text,
  pelapor_wa text,
  pelapor_rt integer,
  status text NOT NULL DEFAULT 'menunggu_verifikasi',
  ke_berapa integer NOT NULL DEFAULT 1,
  denda integer NOT NULL DEFAULT 0,
  denda_rincian text,
  denda_status text NOT NULL DEFAULT 'tidak_ada',
  tanggal_bayar text,
  pembayar_nama text,
  kas_rw_id integer REFERENCES kas_rw(id) ON DELETE SET NULL,
  alasan_bebas text,
  catatan_verifikasi text,
  diverifikasi_oleh text,
  diverifikasi_at timestamp,
  dicatat_oleh text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rw3biz_pelanggaran_usaha_idx ON rw3biz_pelanggaran (usaha_id);
CREATE INDEX IF NOT EXISTS rw3biz_pelanggaran_status_idx ON rw3biz_pelanggaran (status);
CREATE INDEX IF NOT EXISTS rw3biz_pelanggaran_tanggal_idx ON rw3biz_pelanggaran (tanggal_kejadian);
