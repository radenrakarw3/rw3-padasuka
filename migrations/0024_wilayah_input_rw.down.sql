-- Rollback 0024. Hapus dulu usulan tanpa token/KK agar NOT NULL bisa dipasang kembali.
DELETE FROM wil_usulan WHERE token_id IS NULL OR kk_id IS NULL;
ALTER TABLE wil_usulan DROP COLUMN IF EXISTS keluarga_baru;
ALTER TABLE wil_usulan DROP COLUMN IF EXISTS diinput_oleh;
ALTER TABLE wil_usulan DROP COLUMN IF EXISTS sumber;
ALTER TABLE wil_usulan ALTER COLUMN kk_id SET NOT NULL;
ALTER TABLE wil_usulan ALTER COLUMN token_id SET NOT NULL;
