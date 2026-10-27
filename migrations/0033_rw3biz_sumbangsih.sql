-- RW3BIZ: kontribusi tidak lagi dihitung rumus; pengusaha menyanggupkan sumbangsih per program RW 03
-- dan menyetujui Surat Pernyataan Sumbangsih (versi & waktu persetujuan dicatat).

ALTER TABLE rw3biz_pengajuan ADD COLUMN IF NOT EXISTS sumbangsih text;
ALTER TABLE rw3biz_usaha ADD COLUMN IF NOT EXISTS sumbangsih text;
ALTER TABLE rw3biz_pengajuan ADD COLUMN IF NOT EXISTS pernyataan_versi text;
ALTER TABLE rw3biz_pengajuan ADD COLUMN IF NOT EXISTS pernyataan_disetujui_at timestamp;
