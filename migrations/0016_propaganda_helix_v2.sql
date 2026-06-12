-- Propaganda HELIX v2: gelombang, audit log, metadata kampanye

ALTER TABLE propaganda_campaign ADD COLUMN IF NOT EXISTS formula_versi text NOT NULL DEFAULT 'helix-v2';
ALTER TABLE propaganda_campaign ADD COLUMN IF NOT EXISTS distribusi_plan_json text;
ALTER TABLE propaganda_campaign ADD COLUMN IF NOT EXISTS helix_seed text;
ALTER TABLE propaganda_campaign ADD COLUMN IF NOT EXISTS fairness_score integer;
ALTER TABLE propaganda_campaign ADD COLUMN IF NOT EXISTS jumlah_gelombang integer NOT NULL DEFAULT 0;
ALTER TABLE propaganda_campaign ADD COLUMN IF NOT EXISTS estimasi_selesai timestamp;

CREATE TABLE IF NOT EXISTS propaganda_gelombang (
  id serial PRIMARY KEY,
  campaign_id integer NOT NULL REFERENCES propaganda_campaign(id) ON DELETE CASCADE,
  nomor_gelombang integer NOT NULL,
  jumlah_slot integer NOT NULL DEFAULT 0,
  jumlah_terkirim integer NOT NULL DEFAULT 0,
  jumlah_gagal integer NOT NULL DEFAULT 0,
  jadwal_mulai timestamp NOT NULL,
  jadwal_selesai timestamp NOT NULL,
  istirahat_sesudah_ms integer NOT NULL DEFAULT 0,
  per_rt_json text NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'menunggu',
  created_at timestamp DEFAULT now(),
  UNIQUE (campaign_id, nomor_gelombang)
);

ALTER TABLE propaganda_antrian ADD COLUMN IF NOT EXISTS gelombang_id integer REFERENCES propaganda_gelombang(id) ON DELETE SET NULL;
ALTER TABLE propaganda_antrian ADD COLUMN IF NOT EXISTS urutan_global integer NOT NULL DEFAULT 0;
ALTER TABLE propaganda_antrian ADD COLUMN IF NOT EXISTS urutan_dalam_gelombang integer NOT NULL DEFAULT 0;
ALTER TABLE propaganda_antrian ADD COLUMN IF NOT EXISTS claimed_at timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS propaganda_antrian_campaign_phone_idx
  ON propaganda_antrian (campaign_id, nomor_whatsapp);

CREATE INDEX IF NOT EXISTS idx_propaganda_antrian_gelombang
  ON propaganda_antrian (gelombang_id, status);

CREATE TABLE IF NOT EXISTS propaganda_log_kirim (
  id serial PRIMARY KEY,
  antrian_id integer REFERENCES propaganda_antrian(id) ON DELETE SET NULL,
  campaign_id integer NOT NULL REFERENCES propaganda_campaign(id) ON DELETE CASCADE,
  gelombang_id integer REFERENCES propaganda_gelombang(id) ON DELETE SET NULL,
  nomor_whatsapp text NOT NULL,
  status text NOT NULL,
  response_json text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_propaganda_log_campaign ON propaganda_log_kirim (campaign_id, created_at DESC);

ALTER TABLE propaganda_cooldown ADD COLUMN IF NOT EXISTS total_terkirim integer NOT NULL DEFAULT 1;
