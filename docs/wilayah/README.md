# Sistem Wilayah RT/RW — ringkasan

Dokumen terkait: [migrasi.md](migrasi.md) · [panduan-rw.md](panduan-rw.md)

## Peran

| Peran | Akun | Boleh | Tidak boleh |
|---|---|---|---|
| RW (1) | Admin (`isAdmin`) | Baca seluruh wilayah; kelola warga/KK, isian QR, cetak QR, dan pindah RT atas nama RT yang dipilih; atur standar data; Surat RW | — |
| Warga | Tanpa akun, lewat QR KK | Mengirim usulan perubahan | Melihat data lama |

Portal & login PIN Ketua RT sudah dihapus. Admin RW mengelola data per RT di **Kependudukan** (`/admin/kelola-warga`); RT yang dikelola dikirim lewat header `X-Wilayah-Rt` dan hanya diterima dari sesi admin. Aktornya ber-role `rt` sehingga semua pemeriksaan scope RT tetap berlaku, dan audit mencatat nama admin. Tabel `rtjuara_rt_akun` dibiarkan (tidak di-drop).

## Standar data RW 03

Data warga tidak lagi mengikuti format laporan kecamatan. Isinya mengikuti **standar data RW 03**: daftar pertanyaan yang disimpan di tabel `wil_pertanyaan` dan diatur admin di **Kependudukan › Standar data** (`/admin/standar-data`).

- Pertanyaan ditanyakan sekali per **keluarga** atau untuk **setiap anggota**, dan dikelompokkan: Tempat tinggal & kontak, Rumah & fasilitas, Ekonomi, Kesehatan, Pendidikan, Kerentanan. Admin boleh menambah kelompok baru.
- Jenis jawaban: pilih satu, pilih beberapa, ya/tidak, angka, isian singkat. Isian singkat menolak 16 digit angka (mencegah NIK masuk).
- Jawaban yang dicentang **Perlu perhatian** menandai keluarga di kartu KK, detail, dan dashboard.
- Pertanyaan anggota bisa dibatasi umur atau khusus perempuan.
- **Hapus = arsip.** Jawaban lama tetap tersimpan dan bisa dipulihkan. Kunci (`s_…`) tidak pernah berubah. Jenis jawaban dikunci setelah ada jawaban, dan pilihan yang sudah dipakai tidak bisa dihapus (hanya diganti namanya).
- Saat tabel masih kosong, server mengisi 23 pertanyaan awal (`STANDAR_AWAL` di `shared/wilayah.ts`).
- Fakta lama (kunci tanpa awalan `s_`) tetap ada di `wil_fakta`, tetapi tidak ditampilkan dan tidak dihitung.

## Audit fitur lama (checklist)

- [x] **Kependudukan**: Ringkasan warga, Kelola data warga, dan Standar data (admin RW).
- [x] **Blusukan**: PIN hardcode dihapus. Wajib env `BLUSUKAN_PIN` (≥ 6 karakter).
- [x] **Visit RW3 / RW3BIZ**: tetap.
- [x] **Laporan kecamatan (119 indikator), Data Bersama, Kegiatan & Aksi RW**: dihapus dari aplikasi. Tabel lama (`wil_fasilitas`, `wil_kegiatan`, `wil_laporan_*`, dll.) dibiarkan, tidak di-drop.
- [x] **Surat RW**: 8 template dipakai ulang oleh Surat Sakti. Halaman lama ada di `/admin/surat-rw-lama`. Endpoint lama memakai penomoran atomik bila migrasi sudah jalan.
- [x] **Filter RT dan NIK di pesan/kontak**: diperbaiki (`shared/kontak.ts`, mask NIK, validasi HP).
- [x] **Data lama RT01–04**: tidak dipindah. RT05–07 mulai dari kosong, tidak ada data karangan.

## Peta fitur

| Kebutuhan | Lokasi |
|---|---|
| Kelola data warga per RT (warga/KK, isian QR, cetak QR, pindah RT) | `/admin/kelola-warga/*` → `client/src/pages/admin/kelola-warga/*` |
| Standar data (tambah/ubah/arsip/urutkan pertanyaan) | `/admin/standar-data` → `client/src/pages/admin/standar-data.tsx`, `server/wilayah-standar.ts` |
| Form QR warga | `/isi/<token>`, `/isi/status` → `client/src/pages/public/isi.tsx` |
| Dashboard RW (Ringkasan, Data Warga) | `/admin/dashboard` → `client/src/pages/admin/rw-dashboard.tsx`, `server/wilayah-dashboard.ts` |
| Kartu KK seluruh RW | tab Data Warga → `client/src/pages/admin/rw-data-warga.tsx` |
| Surat Sakti | `/admin/surat-rw` → `client/src/pages/admin/surat-sakti.tsx` |
| API | `server/wilayah-routes.ts` (`/api/wilayah/*`, `/api/isi/*`) |
| Model fakta, temporal + riwayat | `server/wilayah-data.ts`, tabel `wil_fakta` |
| Token QR | `server/wilayah-qr.ts` |
| Nomor surat atomik | `server/wilayah-surat.ts`, `shared/surat-nomor.ts` |

## Asumsi

1. Jawaban dihitung bila berstatus **terverifikasi** atau **perlu_cek**. Tidak ada jawaban berarti *belum diisi*, bukan "tidak".
2. Kelengkapan = jawaban terisi ÷ pertanyaan yang berlaku untuk keluarga itu (pertanyaan anggota dihitung per anggota yang memenuhi syarat umur/jenis kelamin).
3. Umur dihitung dari tanggal lahir per hari ini. Balita = 0–4 tahun, anak = 5–17, lansia = 60+.
4. Token QR berlaku 180 hari, satu token aktif per KK. Ganti QR mencabut yang lama. Form QR memakai pertanyaan aktif yang ditandai "Formulir QR".

## Pengujian

`npm run test:wilayah` menjalankan uji murni. Untuk uji integrasi DB, set `WILAYAH_TEST_DATABASE_URL` ke database **uji** yang sudah dimigrasi. Cakupan uji integrasi: isolasi RT, QR tidak membocorkan data, token dicabut ditolak, usulan tidak mengubah data resmi, kirim ganda idempoten, kartu KK (kelengkapan & perhatian), siklus standar data, dan nomor surat paralel unik.
