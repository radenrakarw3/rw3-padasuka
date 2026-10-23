-- Tanda tangan Ketua RW untuk Surat Sakti. Gambar disimpan base64 (filesystem Railway ephemeral).
-- Riwayat tidak dihapus: tanda tangan lama dinonaktifkan agar jejak dokumen terbit tetap dapat ditelusuri lewat sha256.
-- Additive & idempoten.

CREATE TABLE IF NOT EXISTS wil_surat_ttd (
  id serial PRIMARY KEY,
  mime text NOT NULL CHECK (mime IN ('image/png', 'image/jpeg')),
  data text NOT NULL,
  sha256 text NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  diunggah_oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  dinonaktifkan_at timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wil_surat_ttd_aktif ON wil_surat_ttd (aktif) WHERE aktif;
