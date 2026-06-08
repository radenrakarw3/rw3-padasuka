-- Kategori umur master warga (SSOT shared/kategori-umur.ts)
ALTER TABLE warga ADD COLUMN IF NOT EXISTS kategori_umur text;

CREATE INDEX IF NOT EXISTS idx_warga_kategori_umur ON warga (kategori_umur);
