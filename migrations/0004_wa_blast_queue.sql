ALTER TABLE wa_blast
  ADD COLUMN IF NOT EXISTS jumlah_pending integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jumlah_gagal integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jumlah_dilewati integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS started_at timestamp,
  ADD COLUMN IF NOT EXISTS finished_at timestamp;

CREATE TABLE IF NOT EXISTS wa_blast_recipient (
  id serial PRIMARY KEY,
  blast_id integer NOT NULL REFERENCES wa_blast(id),
  recipient_type text NOT NULL DEFAULT 'warga',
  recipient_id integer,
  nama text NOT NULL,
  nomor_whatsapp text NOT NULL,
  rt integer,
  pesan_personal text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_blast_recipient_blast_status_idx
  ON wa_blast_recipient (blast_id, status);
