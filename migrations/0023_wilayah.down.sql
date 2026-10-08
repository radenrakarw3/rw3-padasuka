-- Rollback 0023_wilayah. Menghapus tabel modul wilayah dan kolom tambahan surat_rw.
-- PERINGATAN: data yang dicatat lewat modul wilayah ikut terhapus. Ambil backup dulu:
--   pg_dump "$DATABASE_URL" -t 'wil_*' -t surat_rw -Fc -f backup-wilayah.dump
-- Tabel lama (kartu_keluarga, warga, kas, rw3law, karang taruna, dll.) tidak disentuh.

BEGIN;
DROP TABLE IF EXISTS wil_permintaan_surat;
DROP TABLE IF EXISTS wil_surat_tindak;
DROP TABLE IF EXISTS wil_surat_kirim;
DROP TABLE IF EXISTS wil_surat_lampiran;
DROP TABLE IF EXISTS wil_surat_counter;
DROP INDEX IF EXISTS uq_surat_rw_nomor_urut;
ALTER TABLE surat_rw
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS data_form,
  DROP COLUMN IF EXISTS dibuat_oleh,
  DROP COLUMN IF EXISTS diterbitkan_at,
  DROP COLUMN IF EXISTS dibatalkan_at,
  DROP COLUMN IF EXISTS alasan_batal,
  DROP COLUMN IF EXISTS mengganti_id,
  DROP COLUMN IF EXISTS kejadian_id,
  DROP COLUMN IF EXISTS kegiatan_id,
  DROP COLUMN IF EXISTS permintaan_id,
  DROP COLUMN IF EXISTS nomor_urut,
  DROP COLUMN IF EXISTS tahun_nomor,
  DROP COLUMN IF EXISTS updated_at;
DROP TABLE IF EXISTS wil_audit;
DROP TABLE IF EXISTS wil_usulan;
DROP TABLE IF EXISTS wil_kk_token;
DROP TABLE IF EXISTS wil_laporan;
DROP TABLE IF EXISTS wil_konfirmasi;
DROP TABLE IF EXISTS wil_serah_terima;
DROP TABLE IF EXISTS wil_usulan_koreksi;
DROP TABLE IF EXISTS wil_tindak_lanjut;
DROP TABLE IF EXISTS wil_kejadian;
DROP TABLE IF EXISTS wil_kegiatan_peserta;
DROP TABLE IF EXISTS wil_kegiatan;
DROP TABLE IF EXISTS wil_kelompok;
DROP TABLE IF EXISTS wil_fasilitas;
DROP TABLE IF EXISTS wil_usaha_pemilik;
DROP TABLE IF EXISTS wil_usaha;
DROP TABLE IF EXISTS wil_fakta;
DROP TABLE IF EXISTS wil_rumah_kk;
DROP TABLE IF EXISTS wil_rumah;
COMMIT;
