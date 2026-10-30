-- Cap/stempel Ketua RW untuk dokumen resmi (Surat Sakti, RW3BIZ, dll).
-- Disimpan base64 (filesystem Railway ephemeral). Satu aktif; penggantian menonaktifkan yang lama.
-- Additive & idempoten.

CREATE TABLE IF NOT EXISTS wil_surat_cap (
  id serial PRIMARY KEY,
  mime text NOT NULL CHECK (mime IN ('image/png', 'image/jpeg')),
  data text NOT NULL,
  sha256 text NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  diunggah_oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  dinonaktifkan_at timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wil_surat_cap_aktif ON wil_surat_cap (aktif) WHERE aktif;
