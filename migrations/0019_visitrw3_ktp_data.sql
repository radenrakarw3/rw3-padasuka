-- Visit RW3: simpan foto KTP di PostgreSQL (aman di Railway ephemeral FS)
ALTER TABLE visitrw3_penghuni ADD COLUMN IF NOT EXISTS foto_ktp_data text;
