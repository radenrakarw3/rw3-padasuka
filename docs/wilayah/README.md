# Sistem Wilayah RT/RW — ringkasan

Dokumen terkait: [indikator-119.md](indikator-119.md) · [migrasi.md](migrasi.md) · [panduan-rw.md](panduan-rw.md)

## Peran

| Peran | Akun | Boleh | Tidak boleh |
|---|---|---|---|
| RW (1) | Admin (`isAdmin`) | Baca seluruh wilayah; kelola warga/KK, isian QR, cetak QR, dan pindah RT atas nama RT yang dipilih; objek bersama RW; Surat RW | — |
| Warga | Tanpa akun, lewat QR KK | Mengirim usulan perubahan | Melihat data lama |

Portal & login PIN Ketua RT sudah dihapus. Admin RW mengelola data per RT di **Kependudukan** (`/admin/kelola-warga`); RT yang dikelola dikirim lewat header `X-Wilayah-Rt` dan hanya diterima dari sesi admin. Aktornya ber-role `rt` sehingga semua pemeriksaan scope RT tetap berlaku, dan audit mencatat nama admin. Tabel `rtjuara_rt_akun` dibiarkan (tidak di-drop).

## Audit fitur lama (checklist)

- [x] **Kependudukan**: Ringkasan warga + Kelola data warga (admin RW).
- [x] **Blusukan**: PIN hardcode dihapus. Wajib env `BLUSUKAN_PIN` (≥ 6 karakter).
- [x] **Visit RW3 / RW3BIZ**: tetap. Usaha warga untuk laporan dicatat terpisah di `wil_usaha` (bukan data hunian).
- [x] **Karang Taruna**: tetap.
- [x] **Kas RW, RW3LAW**: tetap, dibuka dari Dashboard › Modul lain. Tidak ada reset atau hapus otomatis.
- [x] **Surat RW**: 8 template dipakai ulang oleh Surat Sakti. Halaman lama ada di `/admin/surat-rw-lama`. Endpoint lama memakai penomoran atomik bila migrasi sudah jalan.
- [x] **Filter RT dan NIK di pesan/kontak**: diperbaiki (`shared/kontak.ts`, mask NIK, validasi HP).
- [x] **Data lama RT01–04**: tidak dipindah. RT05–07 mulai dari kosong, tidak ada data karangan.
- [ ] **RW3LAW**: konsistensi penomoran baru dilaporkan, belum dibenahi otomatis (sengaja tidak menghapus apa pun).

## Peta fitur baru

| Kebutuhan | Lokasi |
|---|---|
| Kelola data warga per RT (warga/KK, isian QR, cetak QR, pindah RT) | `/admin/kelola-warga/*` → `client/src/pages/admin/kelola-warga/*` |
| Form QR warga | `/isi/<token>`, `/isi/status` → `client/src/pages/public/isi.tsx` |
| Dashboard RW (5 tab) | `/admin/dashboard` → `client/src/pages/admin/rw-dashboard.tsx` |
| Data Warga seluruh RW (baca) | tab Data Warga → `client/src/pages/admin/rw-data-warga.tsx` |
| Surat Sakti | `/admin/surat-rw` → `client/src/pages/admin/surat-sakti.tsx` |
| API | `server/wilayah-routes.ts` (`/api/wilayah/*`, `/api/isi/*`) |
| Model fakta, temporal + riwayat | `server/wilayah-data.ts`, tabel `wil_fakta` |
| Mesin laporan + snapshot + ekspor | `shared/wilayah-hitung.ts`, `server/wilayah-laporan.ts`, `client/src/lib/laporan-pdf.ts` |
| Registry 119 indikator | `shared/indikator-kecamatan.ts` |
| Token QR | `server/wilayah-qr.ts` |
| Nomor surat atomik | `server/wilayah-surat.ts`, `shared/surat-nomor.ts` |

## Asumsi

1. Hanya fakta **terverifikasi** yang dihitung. Tidak ada baris berarti *belum diketahui* (sel kosong), bukan 0.
2. Data lama diimpor sebagai `perlu_cek` (nilai lama punya default seperti "PDAM"), jadi tidak dihitung sampai admin menekan "Benar" di halaman keluarga.
3. Umur dihitung dari tanggal lahir pada tanggal acuan, yaitu akhir bulan atau hari ini untuk bulan berjalan. Lansia = 60+ (khusus laporan kecamatan). Bayi = 0–11 bulan.
4. TOTAL: indikator kejadian/kehadiran dijumlah. Indikator stok/populasi **tidak** dijumlah antarbulan (kosong) sampai kecamatan mengonfirmasi (`MODE_TOTAL_STOK`).
5. Rekap RW menghitung objek unik. Fasilitas bersama RW yang melayani beberapa RT diberi status "perlu konfirmasi" di sel RT.
6. 14 indikator berstatus **needs_confirmation** (lihat matriks), misalnya definisi miskin, pengangguran, usia sekolah, stunting, dan 6 SPM posyandu. Indikator ini tidak pernah memberi angka.
7. Token QR berlaku 180 hari, satu token aktif per KK. Ganti QR mencabut yang lama.

## Pengujian

`npm run test:wilayah` menjalankan 26 uji murni. Untuk uji integrasi DB, set `WILAYAH_TEST_DATABASE_URL` ke database **uji** yang sudah dimigrasi. Cakupan uji integrasi: isolasi RT, RW hanya baca, QR tidak membocorkan data, token dicabut ditolak, usulan tidak mengubah data resmi, kirim ganda idempoten, snapshot tetap, dan nomor surat paralel unik.
