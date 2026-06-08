-- Index untuk query statistik kependudukan (filter RT, join warga–KK, status domisili)
CREATE INDEX IF NOT EXISTS idx_kartu_keluarga_rt ON kartu_keluarga (rt);
CREATE INDEX IF NOT EXISTS idx_warga_kk_id ON warga (kk_id);
CREATE INDEX IF NOT EXISTS idx_warga_status_kependudukan ON warga (status_kependudukan);
