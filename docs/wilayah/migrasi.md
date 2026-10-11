# Migrasi & rollback

Migrasi `migrations/0023_wilayah.sql` bersifat **additive dan idempoten**: hanya membuat tabel `wil_*` dan menambah kolom pada `surat_rw` (nullable, atau `status` dengan default `'terbit'` agar surat lama tetap terbit). Data lama tidak dihapus atau diubah. Drizzle `db:push` mengabaikan `wil_*` (`tablesFilter`).

`migrations/0024_wilayah_input_rw.sql` (formulir dari RW) juga additive: `wil_usulan.token_id`/`kk_id` boleh kosong, dan ditambah kolom `sumber`, `diinput_oleh`, `keluarga_baru`. Saat server menyala, `server/wilayah-skema.ts` memasang migrasi wilayah yang belum ada secara otomatis (dengan advisory lock). Matikan dengan `WILAYAH_AUTO_MIGRATE=false`.

`migrations/0026_wilayah_standar.sql` (standar data RW 03) juga additive: hanya membuat tabel `wil_pertanyaan`. Saat tabel kosong, server mengisi pertanyaan awal. Jawaban lama di `wil_fakta` tidak diubah; kunci lama hanya tidak ditampilkan. Rollback: `psql "$DATABASE_URL" -f migrations/0026_wilayah_standar.down.sql` (menghapus daftar pertanyaan saja, jawaban tetap ada).

## Langkah (hanya atas instruksi Ketua RW)

1. **Backup**: `pg_dump "$DATABASE_URL" -Fc -f backup-sebelum-wilayah.dump`
2. **Dry-run**: `npm run wilayah:migrate`. SQL dijalankan dalam transaksi lalu di-ROLLBACK, dan laporan rekonsiliasi dicetak.
3. **Terapkan**: `npm run wilayah:migrate -- --apply`
4. **Impor data lama sebagai `perlu_cek`** (opsional): `npm run wilayah:migrate -- --import-lama` (dry-run), lalu `--import-lama --apply`. Pemetaan ID tetap memakai `kartu_keluarga.id` dan `warga.id` yang sudah ada.
5. **Rekonsiliasi**: pastikan jumlah KK/warga lama sama sebelum dan sesudah, dan jumlah fakta `perlu_cek` sesuai laporan dry-run.
6. Set env: `QR_TOKEN_SECRET` (≥ 32 karakter acak), `BLUSUKAN_PIN` (≥ 6 karakter).

## Rollback

- Kode: rollback deploy ke commit sebelumnya. Endpoint lama tetap jalan tanpa tabel `wil_*` (nomor surat kembali ke cara lama).
- Skema: `psql "$DATABASE_URL" -f migrations/0024_wilayah_input_rw.down.sql`, lalu `psql "$DATABASE_URL" -f migrations/0023_wilayah.down.sql`. Ini menghapus tabel `wil_*` dan kolom tambahan, jadi data wilayah baru ikut hilang.
- Darurat penuh: `pg_restore --clean -d "$DATABASE_URL" backup-sebelum-wilayah.dump`.
