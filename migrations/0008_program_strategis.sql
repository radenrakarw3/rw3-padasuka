ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS pilar text NOT NULL DEFAULT 'digitalisasi';
ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS sub_program text;
ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS target_nilai integer;
ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS capaian_nilai integer DEFAULT 0;
ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS satuan_target text;
ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS publik boolean NOT NULL DEFAULT false;
ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS prioritas integer NOT NULL DEFAULT 2;
ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS pic text;
ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS anggaran integer;
ALTER TABLE program_rw ADD COLUMN IF NOT EXISTS sumber_dana text;

CREATE INDEX IF NOT EXISTS idx_program_rw_pilar ON program_rw(pilar);
CREATE INDEX IF NOT EXISTS idx_program_rw_publik ON program_rw(publik);
