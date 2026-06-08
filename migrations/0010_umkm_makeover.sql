CREATE TABLE IF NOT EXISTS umkm_makeover (
  id serial PRIMARY KEY,
  usaha_id integer REFERENCES usaha(id),
  nama_unit text NOT NULL,
  jenis_usaha text NOT NULL,
  alamat text NOT NULL,
  rt integer NOT NULL,
  status_makeover text NOT NULL DEFAULT 'belum_dinilai',
  skor_fasad integer,
  skor_interior integer,
  skor_etalase integer,
  catatan_makeover text,
  rencana_kerja text,
  foto_sebelum text,
  foto_sesudah text,
  publik boolean NOT NULL DEFAULT false,
  tanggal_target text,
  tanggal_selesai text,
  rantai_pasok text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_umkm_makeover_rt ON umkm_makeover(rt);
CREATE INDEX IF NOT EXISTS idx_umkm_makeover_status ON umkm_makeover(status_makeover);
CREATE INDEX IF NOT EXISTS idx_umkm_makeover_publik ON umkm_makeover(publik);
