-- RW3BIZ: Nomor Induk Usaha (tetap walau perpanjang) dan jenis kendaraan berat (beban jalan).

ALTER TABLE rw3biz_pengajuan
  ADD COLUMN IF NOT EXISTS kendaraan_kolbak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kendaraan_truk integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kendaraan_truk_besar integer NOT NULL DEFAULT 0;

ALTER TABLE rw3biz_usaha
  ADD COLUMN IF NOT EXISTS kendaraan_kolbak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kendaraan_truk integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kendaraan_truk_besar integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nomor_induk text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rw3biz_usaha_nomor_induk_unique') THEN
    ALTER TABLE rw3biz_usaha ADD CONSTRAINT rw3biz_usaha_nomor_induk_unique UNIQUE (nomor_induk);
  END IF;
END $$;

-- Usaha lama tanpa NIU diberi nomor urut sesuai urutan terdaftar.
WITH awal AS (
  SELECT COALESCE(MAX(substring(nomor_induk from '(\d+)$')::int), 0) AS n
  FROM rw3biz_usaha
  WHERE nomor_induk ~ '^NIU-RW3-\d+$'
),
urut AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM rw3biz_usaha
  WHERE nomor_induk IS NULL
)
UPDATE rw3biz_usaha u
SET nomor_induk = 'NIU-RW3-' || lpad((awal.n + urut.rn)::text, 4, '0')
FROM urut, awal
WHERE u.id = urut.id;
