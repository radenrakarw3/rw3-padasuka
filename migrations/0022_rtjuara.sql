-- RT JUARA: "RW3 Muncul, RT-nya JUARA".
-- Quest harian/mingguan/bulanan per RT, bukti berupa form + foto dokumentasi,
-- poin masuk setelah admin RW memverifikasi, juara diumumkan tiap bulan.

CREATE TABLE IF NOT EXISTS rtjuara_quest (
  id serial PRIMARY KEY,
  judul text NOT NULL,
  deskripsi text NOT NULL,
  periode text NOT NULL,
  poin integer NOT NULL DEFAULT 10,
  instruksi_bukti text,
  min_foto integer NOT NULL DEFAULT 1,
  wajib_jumlah_peserta boolean NOT NULL DEFAULT false,
  berlaku_mulai text,
  berlaku_sampai text,
  aktif boolean NOT NULL DEFAULT true,
  dibuat_oleh text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rtjuara_quest_periode ON rtjuara_quest (periode);
CREATE INDEX IF NOT EXISTS idx_rtjuara_quest_aktif ON rtjuara_quest (aktif);

CREATE TABLE IF NOT EXISTS rtjuara_submission (
  id serial PRIMARY KEY,
  quest_id integer NOT NULL REFERENCES rtjuara_quest (id) ON DELETE CASCADE,
  rt integer NOT NULL,
  periode_key text NOT NULL,
  bulan_key text NOT NULL,
  judul_kegiatan text NOT NULL,
  tanggal_kegiatan text NOT NULL,
  lokasi text NOT NULL,
  jumlah_peserta integer,
  deskripsi text NOT NULL,
  status text NOT NULL DEFAULT 'menunggu',
  poin_potensi integer NOT NULL DEFAULT 0,
  poin_diberikan integer NOT NULL DEFAULT 0,
  catatan_admin text,
  reviewed_at timestamp,
  reviewed_by text,
  dikirim_oleh text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rtjuara_submission_rt ON rtjuara_submission (rt);
CREATE INDEX IF NOT EXISTS idx_rtjuara_submission_status ON rtjuara_submission (status);
CREATE INDEX IF NOT EXISTS idx_rtjuara_submission_bulan ON rtjuara_submission (bulan_key);
CREATE INDEX IF NOT EXISTS idx_rtjuara_submission_quest ON rtjuara_submission (quest_id);

-- Satu RT hanya boleh mengklaim satu quest sekali per periode,
-- tetapi tetap boleh mengirim ulang setelah buktinya ditolak.
CREATE UNIQUE INDEX IF NOT EXISTS rtjuara_submission_klaim_unique
  ON rtjuara_submission (quest_id, rt, periode_key)
  WHERE status <> 'ditolak';

CREATE TABLE IF NOT EXISTS rtjuara_submission_foto (
  id serial PRIMARY KEY,
  submission_id integer NOT NULL REFERENCES rtjuara_submission (id) ON DELETE CASCADE,
  foto_data text NOT NULL,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rtjuara_foto_submission ON rtjuara_submission_foto (submission_id);

CREATE TABLE IF NOT EXISTS rtjuara_rt_akun (
  id serial PRIMARY KEY,
  rt integer NOT NULL UNIQUE,
  nama_ketua text NOT NULL,
  nomor_whatsapp text,
  pin_hash text NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  last_login_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rtjuara_juara (
  id serial PRIMARY KEY,
  bulan_key text NOT NULL,
  rt integer NOT NULL,
  peringkat integer NOT NULL,
  total_poin integer NOT NULL DEFAULT 0,
  jumlah_quest integer NOT NULL DEFAULT 0,
  catatan text,
  diumumkan_at timestamp DEFAULT now(),
  diumumkan_oleh text
);

CREATE UNIQUE INDEX IF NOT EXISTS rtjuara_juara_bulan_rt_unique ON rtjuara_juara (bulan_key, rt);
CREATE INDEX IF NOT EXISTS idx_rtjuara_juara_bulan ON rtjuara_juara (bulan_key);
