-- 0026: Standar data RW 03 (pertanyaan keluarga & anggota yang dapat diatur admin RW).
-- Additive saja. Isi awal dimasukkan server saat tabel masih kosong (lihat server/wilayah-standar.ts).
CREATE TABLE IF NOT EXISTS wil_pertanyaan (
  id serial PRIMARY KEY,
  kunci text NOT NULL UNIQUE,
  subjek text NOT NULL CHECK (subjek IN ('kk', 'warga')),
  kelompok text NOT NULL,
  label text NOT NULL,
  pertanyaan text NOT NULL,
  bantuan text,
  tipe text NOT NULL CHECK (tipe IN ('pilihan', 'banyak', 'yatidak', 'angka', 'teks')),
  pilihan jsonb NOT NULL DEFAULT '[]'::jsonb,
  perhatian jsonb NOT NULL DEFAULT '[]'::jsonb,
  di_qr boolean NOT NULL DEFAULT true,
  khusus_perempuan boolean NOT NULL DEFAULT false,
  usia_min integer,
  usia_max integer,
  urutan integer NOT NULL DEFAULT 0,
  aktif boolean NOT NULL DEFAULT true,
  diubah_oleh text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wil_pertanyaan_urutan_idx ON wil_pertanyaan (subjek, aktif, urutan);
