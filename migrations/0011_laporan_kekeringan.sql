CREATE TABLE IF NOT EXISTS laporan_kekeringan (
  id serial PRIMARY KEY,
  nomor_antrian text NOT NULL UNIQUE,
  nomor_tiket text UNIQUE,
  nama_pelapor text NOT NULL,
  nomor_rt integer NOT NULL,
  nomor_wa text NOT NULL,
  alamat text NOT NULL,
  jumlah_penghuni integer NOT NULL,
  keterangan text,
  status text NOT NULL DEFAULT 'menunggu_survey',
  catatan_survey text,
  tanggal_survey text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laporan_kekeringan_status ON laporan_kekeringan(status);
CREATE INDEX IF NOT EXISTS idx_laporan_kekeringan_jumlah ON laporan_kekeringan(jumlah_penghuni);
CREATE INDEX IF NOT EXISTS idx_laporan_kekeringan_rt ON laporan_kekeringan(nomor_rt);
