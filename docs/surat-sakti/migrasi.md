# Surat Sakti — Migrasi

Migrasi `migrations/0025_surat_sakti.sql` bersifat **tambahan** (additive, idempotent): hanya `ADD COLUMN IF NOT EXISTS`, tabel baru, indeks, dan trigger. Tidak ada data yang dihapus, tidak ada nomor lama yang diubah.

Prasyarat: `0023_wilayah.sql` dan `0024_wilayah_input_rw.sql` sudah diterapkan.

## Isi

- `surat_rw`: kolom `kode_jenis`, `template_versi`, `rangkaian_id`, `induk_id`, `akses`, `rt_terkait`, `snapshot`, `verifikasi_token`, `perlu_pemeriksaan`, `idempotency_key` + trigger `trg_surat_rw_kunci_final` (menolak perubahan isi/nomor setelah snapshot final ada).
- Tabel baru: `wil_surat_rangkaian`, `wil_surat_berkas` (PDF final, trigger menolak ubah/hapus), `wil_surat_tindak_update`, `wil_surat_masuk`, `wil_surat_bantuan`, `wil_surat_fakta`.
- `wil_surat_kirim`: `status`, `diterima_pada`, `catatan`; `bukti` boleh kosong hanya untuk status gagal (dicek di server).
- `wil_surat_tindak`: `tindakan`, `pic_*`, `progres`, `bukti`, `evaluasi`, `updated_at`.
- `wil_permintaan_surat`: `kode_jenis`, `rangkaian_id`.
- Catatan: fitur permintaan surat RT, rangkaian, surat masuk, fakta, lanjutan, dan pengganti sudah dihapus dari aplikasi. Tabel/kolomnya tetap ada (tidak di-drop) agar data lama aman, tetapi tidak dipakai lagi.

Arsip lama (tanpa `snapshot`) tetap bisa dibaca dan diunduh; trigger final tidak berlaku untuknya. Draft lama tanpa `kode_jenis` harus dibuka lalu dipilih jenisnya sebelum terbit.

## Langkah (dijalankan Ketua RW/pengelola, bukan otomatis)

1. Cadangkan database.
2. Pratinjau (tidak mengubah apa pun):
   ```
   npm run wilayah:migrate
   ```
3. Terapkan ke database **uji** dulu, lalu jalankan uji integrasi:
   ```
   DATABASE_URL=<db-uji> npm run wilayah:migrate -- --apply
   WILAYAH_TEST_DATABASE_URL=<db-uji> npm run test:surat
   WILAYAH_TEST_DATABASE_URL=<db-uji> npm run test:wilayah
   ```
   Uji integrasi membuat dokumen "Uji SS …" lalu menghapusnya (termasuk mematikan sementara trigger berkas — **jangan** arahkan ke produksi).
4. Bila lulus, terapkan ke produksi dengan perintah `--apply` yang sama, lalu deploy aplikasi.

## Rollback

`migrations/0025_surat_sakti.down.sql` menghapus kolom/tabel/trigger tambahan. **Menghapus PDF final, rangkaian, fakta, dan catatan tindak lanjut v2.** Hanya dipakai bila migrasi gagal sebelum ada dokumen v2 yang terbit; cadangkan dulu.

## Variabel lingkungan

- `PUBLIC_SITE_URL` (opsional) — dasar tautan verifikasi di PDF dan teks WA. Default `https://rw3padasukacimahi.org`.
- Tidak ada pengiriman otomatis; tidak memakai StarSender.
