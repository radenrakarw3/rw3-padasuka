-- Visit RW3: warga singgah langsung (kontrak / kost / jualan), tanpa wajib pemilik properti

ALTER TABLE warga_singgah ALTER COLUMN pemilik_kost_id DROP NOT NULL;
ALTER TABLE warga_singgah ADD COLUMN IF NOT EXISTS jenis_warga text;
ALTER TABLE warga_singgah ADD COLUMN IF NOT EXISTS rt integer;
ALTER TABLE warga_singgah ADD COLUMN IF NOT EXISTS alamat text;

ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS jenis_warga text;
ALTER TABLE visitrw3_pengajuan ADD COLUMN IF NOT EXISTS alamat text;
