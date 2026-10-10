-- Surat Sakti v2: registry template, rangkaian dokumen, status distribusi/pekerjaan terpisah,
-- snapshot + PDF final tersimpan, verifikasi token acak.
-- Additive & idempoten. Tidak mengubah nomor atau isi surat lama.

CREATE TABLE IF NOT EXISTS wil_surat_rangkaian (
  id serial PRIMARY KEY,
  judul text NOT NULL,
  jenis text NOT NULL CHECK (jenis IN ('kasus', 'program', 'keputusan', 'fasilitas', 'kegiatan', 'lainnya')),
  paket text,
  kejadian_id integer REFERENCES wil_kejadian (id),
  kegiatan_id integer REFERENCES wil_kegiatan (id),
  fasilitas_id integer REFERENCES wil_fasilitas (id),
  program_id integer,
  rw3law_id integer,
  rt_terkait integer[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'ditutup')),
  catatan text,
  evaluasi text,
  dibuat_oleh text,
  created_at timestamp NOT NULL DEFAULT now(),
  ditutup_at timestamp
);

ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS kode_jenis text;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS template_versi integer;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS rangkaian_id integer REFERENCES wil_surat_rangkaian (id);
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS induk_id integer REFERENCES surat_rw (id);
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS akses text NOT NULL DEFAULT 'internal';
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS rt_terkait integer[] NOT NULL DEFAULT '{}';
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS snapshot jsonb;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS verifikasi_token text;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS perlu_pemeriksaan boolean NOT NULL DEFAULT false;
ALTER TABLE surat_rw ADD COLUMN IF NOT EXISTS idempotency_key text;
DO $$ BEGIN
  ALTER TABLE surat_rw ADD CONSTRAINT surat_rw_akses_chk CHECK (akses IN ('internal', 'rt_terkait', 'terbatas'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_surat_rw_verifikasi_token ON surat_rw (verifikasi_token) WHERE verifikasi_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_surat_rw_idempotency ON surat_rw (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_surat_rw_rangkaian ON surat_rw (rangkaian_id);
CREATE INDEX IF NOT EXISTS idx_surat_rw_induk ON surat_rw (induk_id);

-- Dokumen final tidak dapat diubah isinya; hanya status/pembatalan yang boleh berubah.
CREATE OR REPLACE FUNCTION wil_surat_kunci_final() RETURNS trigger AS $$
BEGIN
  IF OLD.snapshot IS NOT NULL AND (
       NEW.snapshot IS DISTINCT FROM OLD.snapshot
    OR NEW.nomor_surat IS DISTINCT FROM OLD.nomor_surat
    OR NEW.isi_surat IS DISTINCT FROM OLD.isi_surat
    OR NEW.data_form IS DISTINCT FROM OLD.data_form
    OR NEW.perihal IS DISTINCT FROM OLD.perihal
    OR NEW.tanggal_surat IS DISTINCT FROM OLD.tanggal_surat
    OR NEW.kode_jenis IS DISTINCT FROM OLD.kode_jenis
    OR NEW.verifikasi_token IS DISTINCT FROM OLD.verifikasi_token) THEN
    RAISE EXCEPTION 'Dokumen final tidak dapat diubah (surat_rw.id=%)', OLD.id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_surat_rw_kunci_final ON surat_rw;
CREATE TRIGGER trg_surat_rw_kunci_final BEFORE UPDATE ON surat_rw FOR EACH ROW EXECUTE FUNCTION wil_surat_kunci_final();

-- Berkas PDF final (dipisah agar daftar surat tetap ringan).
CREATE TABLE IF NOT EXISTS wil_surat_berkas (
  surat_id integer PRIMARY KEY REFERENCES surat_rw (id),
  pdf_data text NOT NULL,
  sha256 text NOT NULL,
  halaman integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION wil_surat_berkas_tetap() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Berkas PDF final tidak dapat diubah atau dihapus' USING ERRCODE = 'check_violation';
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_wil_surat_berkas_tetap ON wil_surat_berkas;
CREATE TRIGGER trg_wil_surat_berkas_tetap BEFORE UPDATE OR DELETE ON wil_surat_berkas FOR EACH ROW EXECUTE FUNCTION wil_surat_berkas_tetap();

-- Distribusi: status per catatan (diserahkan/gagal/diterima).
ALTER TABLE wil_surat_kirim ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'diserahkan';
ALTER TABLE wil_surat_kirim ADD COLUMN IF NOT EXISTS diterima_pada timestamp;
ALTER TABLE wil_surat_kirim ADD COLUMN IF NOT EXISTS catatan text;
ALTER TABLE wil_surat_kirim ALTER COLUMN bukti DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE wil_surat_kirim ADD CONSTRAINT wil_surat_kirim_status_chk CHECK (status IN ('diserahkan', 'gagal', 'diterima'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tindak lanjut: PIC, progres, bukti, evaluasi.
ALTER TABLE wil_surat_tindak ADD COLUMN IF NOT EXISTS tindakan text;
ALTER TABLE wil_surat_tindak ADD COLUMN IF NOT EXISTS pic_nama text;
ALTER TABLE wil_surat_tindak ADD COLUMN IF NOT EXISTS pic_jenis text;
ALTER TABLE wil_surat_tindak ADD COLUMN IF NOT EXISTS pic_rt integer;
ALTER TABLE wil_surat_tindak ADD COLUMN IF NOT EXISTS progres integer NOT NULL DEFAULT 0;
ALTER TABLE wil_surat_tindak ADD COLUMN IF NOT EXISTS bukti text;
ALTER TABLE wil_surat_tindak ADD COLUMN IF NOT EXISTS evaluasi text;
ALTER TABLE wil_surat_tindak ADD COLUMN IF NOT EXISTS updated_at timestamp;
DO $$ BEGIN
  ALTER TABLE wil_surat_tindak ADD CONSTRAINT wil_surat_tindak_status_chk CHECK (status IN ('menunggu', 'berjalan', 'selesai', 'tidak_diperlukan'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_wil_surat_tindak_tenggat ON wil_surat_tindak (tenggat) WHERE status IN ('menunggu', 'berjalan');

CREATE TABLE IF NOT EXISTS wil_surat_tindak_update (
  id serial PRIMARY KEY,
  tindak_id integer NOT NULL REFERENCES wil_surat_tindak (id) ON DELETE CASCADE,
  progres integer CHECK (progres IS NULL OR progres BETWEEN 0 AND 100),
  status text CHECK (status IS NULL OR status IN ('menunggu', 'berjalan', 'selesai', 'tidak_diperlukan')),
  catatan text NOT NULL,
  bukti text,
  sumber text NOT NULL CHECK (sumber IN ('rt', 'rw', 'pihak_luar_dicatat')),
  oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wil_surat_masuk (
  id serial PRIMARY KEY,
  rangkaian_id integer REFERENCES wil_surat_rangkaian (id),
  membalas_id integer REFERENCES surat_rw (id),
  pengirim text NOT NULL,
  nomor text,
  tanggal date NOT NULL,
  perihal text NOT NULL,
  ringkasan text,
  berkas text,
  berkas_nama text,
  dicatat_oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wil_surat_masuk_membalas ON wil_surat_masuk (membalas_id);

-- Dukungan pihak luar: dimohonkan ≠ dijanjikan ≠ diterima ≠ digunakan. Tidak menulis ke kas.
CREATE TABLE IF NOT EXISTS wil_surat_bantuan (
  id serial PRIMARY KEY,
  surat_id integer REFERENCES surat_rw (id),
  rangkaian_id integer REFERENCES wil_surat_rangkaian (id),
  tahap text NOT NULL CHECK (tahap IN ('dimohonkan', 'dijanjikan', 'diterima', 'digunakan')),
  uraian text NOT NULL,
  jumlah numeric,
  satuan text,
  nominal bigint CHECK (nominal IS NULL OR nominal >= 0),
  pemberi text,
  tanggal date NOT NULL,
  bukti text,
  dicatat_oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Fakta/bukti tambahan dari RT untuk permintaan atau rangkaian.
CREATE TABLE IF NOT EXISTS wil_surat_fakta (
  id serial PRIMARY KEY,
  permintaan_id integer REFERENCES wil_permintaan_surat (id),
  rangkaian_id integer REFERENCES wil_surat_rangkaian (id),
  rt integer,
  isi text NOT NULL,
  sumber text,
  bukti text,
  bukti_nama text,
  oleh text,
  created_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE wil_permintaan_surat ADD COLUMN IF NOT EXISTS kode_jenis text;
ALTER TABLE wil_permintaan_surat ADD COLUMN IF NOT EXISTS rangkaian_id integer REFERENCES wil_surat_rangkaian (id);
