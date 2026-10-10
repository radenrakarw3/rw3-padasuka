-- Usulan pendataan yang diinput admin RW untuk warga yang datang langsung ke RW.
-- Additive & idempoten: hanya melonggarkan NOT NULL dan menambah kolom.
ALTER TABLE wil_usulan ALTER COLUMN token_id DROP NOT NULL;
ALTER TABLE wil_usulan ALTER COLUMN kk_id DROP NOT NULL;
ALTER TABLE wil_usulan ADD COLUMN IF NOT EXISTS sumber text NOT NULL DEFAULT 'qr';
ALTER TABLE wil_usulan ADD COLUMN IF NOT EXISTS diinput_oleh text;
-- Keluarga yang belum terdaftar: { alamat, noUnit } — RT mendaftarkan KK lalu menerapkan usulan.
ALTER TABLE wil_usulan ADD COLUMN IF NOT EXISTS keluarga_baru jsonb;
