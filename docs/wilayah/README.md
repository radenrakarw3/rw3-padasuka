# Sistem Wilayah RT/RW — ringkasan

Dokumen terkait: [indikator-119.md](indikator-119.md) · [migrasi.md](migrasi.md) · [panduan-rt.md](panduan-rt.md) · [panduan-rw.md](panduan-rw.md)

## Peran

| Peran | Akun | Boleh | Tidak boleh |
|---|---|---|---|
| RT (7) | PIN per RT (`rtjuara_rt_akun`, bcrypt) | Kelola & verifikasi data RT sendiri, laporan bulanan RT, QR, usulan, minta surat | Melihat/mengubah RT lain |
| RW (1) | Admin (`isAdmin`) | Baca seluruh wilayah, putuskan koreksi/kejadian, kelola objek bersama RW, Surat RW, Kas, RW3LAW | Mengubah master warga/KK RT |
| Warga | Tanpa akun, lewat QR KK | Mengirim usulan perubahan | Melihat data lama |

Scope RT selalu dari sesi (`req.session.rtjuaraRt`). Tidak ada peran ketiga.

## Audit fitur lama (checklist)

- [x] **Laporan masalah**: tetap. Kejadian baru dicatat lewat `/rt/masalah`.
- [x] **Kependudukan**: tetap sebagai modul baca RW. Penulisan master warga oleh RW diblokir (`tolakUbahMasterOlehRw`), kecuali env `IZINKAN_RW_EDIT_MASTER=true`.
- [x] **Blusukan**: PIN hardcode dihapus. Wajib env `BLUSUKAN_PIN` (≥ 6 karakter). Tulis master oleh RW diblokir.
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
| Portal RT mobile (Beranda / Warga / Laporan) | `/rt` → `client/src/pages/rt/*` |
| Form QR warga | `/isi/<token>`, `/isi/status` → `client/src/pages/public/isi.tsx` |
| Dashboard RW (5 tab) | `/admin/dashboard` → `client/src/pages/admin/rw-dashboard.tsx` |
| Data Warga + formulir dari RW | tab Data Warga → `client/src/pages/admin/rw-data-warga.tsx`, `POST/GET /api/wilayah/rw/usulan` |
| Surat Sakti | `/admin/surat-rw` → `client/src/pages/admin/surat-sakti.tsx` |
| API | `server/wilayah-routes.ts` (`/api/wilayah/*`, `/api/isi/*`) |
| Model fakta, temporal + riwayat | `server/wilayah-data.ts`, tabel `wil_fakta` |
| Mesin laporan + snapshot + ekspor | `shared/wilayah-hitung.ts`, `server/wilayah-laporan.ts`, `client/src/lib/laporan-pdf.ts` |
| Registry 119 indikator | `shared/indikator-kecamatan.ts` |
| Token QR | `server/wilayah-qr.ts` |
| Nomor surat atomik | `server/wilayah-surat.ts`, `shared/surat-nomor.ts` |

## Asumsi

1. Hanya fakta **terverifikasi** yang dihitung. Tidak ada baris berarti *belum diketahui* (sel kosong), bukan 0.
2. Data lama diimpor sebagai `perlu_cek` (nilai lama punya default seperti "PDAM"), jadi tidak dihitung sampai RT menekan "Benar".
3. Umur dihitung dari tanggal lahir pada tanggal acuan, yaitu akhir bulan atau hari ini untuk bulan berjalan. Lansia = 60+ (khusus laporan kecamatan). Bayi = 0–11 bulan.
4. TOTAL: indikator kejadian/kehadiran dijumlah. Indikator stok/populasi **tidak** dijumlah antarbulan (kosong) sampai kecamatan mengonfirmasi (`MODE_TOTAL_STOK`).
5. Rekap RW menghitung objek unik. Fasilitas bersama RW yang melayani beberapa RT diberi status "perlu konfirmasi" di sel RT.
6. 14 indikator berstatus **needs_confirmation** (lihat matriks), misalnya definisi miskin, pengangguran, usia sekolah, stunting, dan 6 SPM posyandu. Indikator ini tidak pernah memberi angka.
7. Token QR berlaku 180 hari, satu token aktif per KK. Ganti QR mencabut yang lama.

## Pengujian

`npm run test:wilayah` menjalankan 26 uji murni. Untuk uji integrasi DB, set `WILAYAH_TEST_DATABASE_URL` ke database **uji** yang sudah dimigrasi. Cakupan uji integrasi: isolasi RT, RW hanya baca, QR tidak membocorkan data, token dicabut ditolak, usulan tidak mengubah data resmi, kirim ganda idempoten, snapshot tetap, dan nomor surat paralel unik.
