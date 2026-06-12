-- Modul Propaganda — distribusi informasi WA (sistem baru, terpisah dari wa_blast)

CREATE TABLE IF NOT EXISTS propaganda_campaign (
  id serial PRIMARY KEY,
  judul text NOT NULL,
  pesan_template text NOT NULL,
  filter_json text NOT NULL DEFAULT '{}',
  profil_distribusi text NOT NULL DEFAULT 'standar',
  abaikan_cooldown boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  jumlah_target integer NOT NULL DEFAULT 0,
  jumlah_terkirim integer NOT NULL DEFAULT 0,
  jumlah_gagal integer NOT NULL DEFAULT 0,
  jumlah_dilewati integer NOT NULL DEFAULT 0,
  jumlah_menunggu integer NOT NULL DEFAULT 0,
  mulai_kirim timestamp,
  selesai_kirim timestamp,
  created_by text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS propaganda_antrian (
  id serial PRIMARY KEY,
  campaign_id integer NOT NULL REFERENCES propaganda_campaign(id) ON DELETE CASCADE,
  warga_id integer,
  kk_id integer,
  nama text NOT NULL,
  nomor_whatsapp text NOT NULL,
  rt integer,
  pesan text NOT NULL,
  jadwal_kirim timestamp NOT NULL,
  status text NOT NULL DEFAULT 'menunggu',
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_propaganda_antrian_dispatch
  ON propaganda_antrian (status, jadwal_kirim);

CREATE INDEX IF NOT EXISTS idx_propaganda_antrian_campaign
  ON propaganda_antrian (campaign_id);

CREATE TABLE IF NOT EXISTS propaganda_cooldown (
  nomor_whatsapp text PRIMARY KEY,
  last_campaign_id integer REFERENCES propaganda_campaign(id) ON DELETE SET NULL,
  last_sent_at timestamp NOT NULL DEFAULT now()
);
