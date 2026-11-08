-- Rating masukan: izinkan nomor_rt 1–7 (seluruh wilayah RW 03).

ALTER TABLE rating_masukan DROP CONSTRAINT IF EXISTS rating_masukan_nomor_rt_check;
ALTER TABLE rating_masukan DROP CONSTRAINT IF EXISTS rating_masukan_rt_wajib;

ALTER TABLE rating_masukan
  ADD CONSTRAINT rating_masukan_nomor_rt_check
  CHECK (nomor_rt IS NULL OR (nomor_rt >= 1 AND nomor_rt <= 7));

ALTER TABLE rating_masukan
  ADD CONSTRAINT rating_masukan_rt_wajib
  CHECK (
    (sasaran = 'rt' AND nomor_rt IS NOT NULL)
    OR (sasaran = 'rw' AND nomor_rt IS NULL)
  );
