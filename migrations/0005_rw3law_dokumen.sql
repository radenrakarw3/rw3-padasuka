-- RW3LAW: peraturan / ordinansi tingkat RW
CREATE TABLE IF NOT EXISTS rw3law_dokumen (
  id serial PRIMARY KEY,
  judul text NOT NULL,
  slug text NOT NULL UNIQUE,
  isi text NOT NULL,
  kategori text NOT NULL DEFAULT 'umum',
  status text NOT NULL DEFAULT 'draft',
  rt_asal integer,
  versi text,
  tanggal_berlaku text,
  urutan integer NOT NULL DEFAULT 0,
  catatan_internal text,
  created_by text,
  disetujui_oleh text,
  disetujui_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rw3law_dokumen_status_idx ON rw3law_dokumen (status);
