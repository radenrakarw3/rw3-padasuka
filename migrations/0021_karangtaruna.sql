-- KARANG TARUNA: pendataan anggota pemuda RW 03 Padasuka.
-- Tabel tunggal & self-contained (skill/potensi + harapan difasilitasi RW).

CREATE TABLE IF NOT EXISTS karangtaruna_anggota (
  id serial PRIMARY KEY,
  nomor_anggota text NOT NULL UNIQUE,
  nama_lengkap text NOT NULL,
  nik text,
  rt integer NOT NULL,
  alamat text NOT NULL,
  nomor_whatsapp text NOT NULL,
  jenis_kelamin text,
  tanggal_lahir text NOT NULL,
  pendidikan_terakhir text,
  status_aktivitas text,
  pekerjaan text,
  instagram text,
  bidang_keahlian text,
  cerita_skill text NOT NULL,
  pengalaman_organisasi text,
  prestasi text,
  bidang_minat text,
  harapan_fasilitasi text NOT NULL,
  ketersediaan_waktu text,
  bersedia_aktif boolean NOT NULL DEFAULT true,
  status_keanggotaan text NOT NULL DEFAULT 'baru',
  potensi_unggulan text,
  catatan_admin text,
  reviewed_at timestamp,
  reviewed_by text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_karangtaruna_anggota_rt ON karangtaruna_anggota (rt);
CREATE INDEX IF NOT EXISTS idx_karangtaruna_anggota_status ON karangtaruna_anggota (status_keanggotaan);
CREATE INDEX IF NOT EXISTS idx_karangtaruna_anggota_nomor ON karangtaruna_anggota (nomor_anggota);
