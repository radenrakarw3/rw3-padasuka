-- Kontak darurat tidak lagi dipakai (sering diisi anak/tetangga, tidak membantu).
-- Arsipkan pertanyaan standar; kosongkan kolom warga yang tersimpan.

UPDATE wil_pertanyaan
SET aktif = false, diubah_oleh = 'migrasi 0036', updated_at = now()
WHERE kunci = 's_kontak_darurat' AND aktif = true;

UPDATE warga
SET
  nama_kontak_darurat = NULL,
  hubungan_kontak_darurat = NULL,
  nomor_kontak_darurat = NULL
WHERE nama_kontak_darurat IS NOT NULL
   OR hubungan_kontak_darurat IS NOT NULL
   OR nomor_kontak_darurat IS NOT NULL;
