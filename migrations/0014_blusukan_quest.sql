CREATE TABLE IF NOT EXISTS blusukan_quest (
  id serial PRIMARY KEY,
  judul text NOT NULL,
  perihal text NOT NULL,
  target_warga_id integer REFERENCES warga(id),
  target_warga_nama text,
  target_kk_id integer REFERENCES kartu_keluarga(id),
  deadline text NOT NULL,
  progres integer NOT NULL DEFAULT 0,
  catatan text,
  status text NOT NULL DEFAULT 'aktif',
  catatan_selesai text,
  selesai_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blusukan_quest_status ON blusukan_quest(status);
CREATE INDEX IF NOT EXISTS idx_blusukan_quest_deadline ON blusukan_quest(deadline);
