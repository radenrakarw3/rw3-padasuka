CREATE TABLE IF NOT EXISTS wa_notifikasi_log (
  id serial PRIMARY KEY,
  event_key text NOT NULL,
  nomor_whatsapp text NOT NULL,
  reference_type text,
  reference_id integer,
  status text NOT NULL,
  error_message text,
  sent_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_notifikasi_log_event_phone_idx
  ON wa_notifikasi_log (event_key, nomor_whatsapp);
