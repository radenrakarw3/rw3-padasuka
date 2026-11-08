-- Rating & kritik saran warga untuk RT / RW.
-- Hasil hanya untuk admin; tidak ada endpoint publik yang menampilkan isi.

CREATE TABLE IF NOT EXISTS rating_masukan (
  id serial PRIMARY KEY,
  sasaran text NOT NULL CHECK (sasaran IN ('rt', 'rw')),
  nomor_rt integer CHECK (nomor_rt IS NULL OR (nomor_rt >= 1 AND nomor_rt <= 4)),
  bintang integer NOT NULL CHECK (bintang >= 1 AND bintang <= 5),
  isi text NOT NULL,
  nomor_wa text NOT NULL,
  nomor_wa_hash text NOT NULL,
  dibaca_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rating_masukan_sasaran_idx ON rating_masukan (sasaran, created_at DESC);
CREATE INDEX IF NOT EXISTS rating_masukan_rt_idx ON rating_masukan (nomor_rt, created_at DESC);
CREATE INDEX IF NOT EXISTS rating_masukan_wa_hash_idx ON rating_masukan (nomor_wa_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS rating_masukan_dibaca_idx ON rating_masukan (dibaca_at);

-- Sasaran RT wajib punya nomor_rt; sasaran RW tidak.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rating_masukan_rt_wajib'
  ) THEN
    ALTER TABLE rating_masukan
      ADD CONSTRAINT rating_masukan_rt_wajib
      CHECK (
        (sasaran = 'rt' AND nomor_rt IS NOT NULL)
        OR (sasaran = 'rw' AND nomor_rt IS NULL)
      );
  END IF;
END $$;
