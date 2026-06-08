CREATE TABLE IF NOT EXISTS proyek_infrastruktur (
  id serial PRIMARY KEY,
  nama text NOT NULL,
  pilar text NOT NULL DEFAULT 'infrastruktur',
  sub_program text NOT NULL,
  rt integer,
  lokasi text,
  latitude text,
  longitude text,
  status text NOT NULL DEFAULT 'inventaris',
  prioritas integer NOT NULL DEFAULT 2,
  estimasi_biaya integer,
  sumber_dana text,
  foto_sebelum text,
  foto_sesudah text,
  catatan text,
  publik boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proyek_infra_rt ON proyek_infrastruktur(rt);
CREATE INDEX IF NOT EXISTS idx_proyek_infra_status ON proyek_infrastruktur(status);
CREATE INDEX IF NOT EXISTS idx_proyek_infra_sub ON proyek_infrastruktur(sub_program);

ALTER TABLE laporan ADD COLUMN IF NOT EXISTS proyek_id integer REFERENCES proyek_infrastruktur(id);
ALTER TABLE laporan ADD COLUMN IF NOT EXISTS foto_laporan text;
ALTER TABLE laporan ADD COLUMN IF NOT EXISTS sub_jenis text;
