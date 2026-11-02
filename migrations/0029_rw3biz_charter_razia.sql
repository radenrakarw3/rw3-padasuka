-- RW3BIZ: kendaraan berat charter (kedatangan per minggu).

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
