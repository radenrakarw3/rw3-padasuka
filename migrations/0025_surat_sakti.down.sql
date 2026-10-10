-- Rollback 0025. Menghapus data rangkaian/bantuan/surat masuk/berkas PDF v2 — cadangkan dulu.
DROP TRIGGER IF EXISTS trg_surat_rw_kunci_final ON surat_rw;
DROP FUNCTION IF EXISTS wil_surat_kunci_final();
DROP TRIGGER IF EXISTS trg_wil_surat_berkas_tetap ON wil_surat_berkas;
DROP FUNCTION IF EXISTS wil_surat_berkas_tetap();
ALTER TABLE wil_permintaan_surat DROP COLUMN IF EXISTS rangkaian_id;
ALTER TABLE wil_permintaan_surat DROP COLUMN IF EXISTS kode_jenis;
DROP TABLE IF EXISTS wil_surat_fakta;
DROP TABLE IF EXISTS wil_surat_bantuan;
DROP TABLE IF EXISTS wil_surat_masuk;
DROP TABLE IF EXISTS wil_surat_tindak_update;
ALTER TABLE wil_surat_tindak DROP CONSTRAINT IF EXISTS wil_surat_tindak_status_chk;
ALTER TABLE wil_surat_tindak DROP COLUMN IF EXISTS tindakan, DROP COLUMN IF EXISTS pic_nama, DROP COLUMN IF EXISTS pic_jenis,
  DROP COLUMN IF EXISTS pic_rt, DROP COLUMN IF EXISTS progres, DROP COLUMN IF EXISTS bukti, DROP COLUMN IF EXISTS evaluasi, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE wil_surat_kirim DROP CONSTRAINT IF EXISTS wil_surat_kirim_status_chk;
ALTER TABLE wil_surat_kirim DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS diterima_pada, DROP COLUMN IF EXISTS catatan;
DROP TABLE IF EXISTS wil_surat_berkas;
ALTER TABLE surat_rw DROP CONSTRAINT IF EXISTS surat_rw_akses_chk;
ALTER TABLE surat_rw DROP COLUMN IF EXISTS kode_jenis, DROP COLUMN IF EXISTS template_versi, DROP COLUMN IF EXISTS rangkaian_id,
  DROP COLUMN IF EXISTS induk_id, DROP COLUMN IF EXISTS akses, DROP COLUMN IF EXISTS rt_terkait, DROP COLUMN IF EXISTS snapshot,
  DROP COLUMN IF EXISTS verifikasi_token, DROP COLUMN IF EXISTS perlu_pemeriksaan, DROP COLUMN IF EXISTS idempotency_key;
DROP TABLE IF EXISTS wil_surat_rangkaian;
