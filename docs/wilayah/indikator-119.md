# Matriks 119 indikator laporan RT

Dihasilkan otomatis oleh `npx tsx script/wilayah-docs.ts`. Jangan diedit manual.

Siap dihitung: **105**. Menunggu konfirmasi kecamatan (tidak pernah diberi angka): **14**.

## B. KEPENDUDUKAN (4)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | B.1 | Jumlah penduduk total (jiwa) | jiwa | stok | Master warga berstatus Aktif pada KK di RT | RT / RT | rt | siap |
| 2 | B.2 | Jumlah kepala keluarga/KK | KK | stok | Master KK di RT dengan minimal satu anggota aktif | RT / RT | rt | siap |
| 3 | B.3 | Jumlah penduduk laki-laki (jiwa) | jiwa | stok | Master warga: jenis kelamin | RT / RT | rt | siap |
| 4 | B.4 | Jumlah penduduk perempuan (jiwa) | jiwa | stok | Master warga: jenis kelamin | RT / RT | rt | siap |

## C. KESEHATAN IBU & ANAK (13)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 5 | C.1 | Ibu hamil bulan ini | jiwa | kondisi_bulan | Fakta warga: hamil | RT / RT | rt | siap |
| 6 | C.2 | Kematian ibu hamil bulan ini | kasus | kejadian | Catatan kejadian jenis "kematian_ibu_hamil" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 7 | C.3 | Ibu nifas & menyusui bulan ini | jiwa | kondisi_bulan | Fakta warga: nifas_menyusui | RT / RT | rt | siap |
| 8 | C.4 | Kematian ibu nifas bulan ini | kasus | kejadian | Catatan kejadian jenis "kematian_ibu_nifas" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 9 | C.5 | Jumlah bayi (0–11 bulan) bulan ini | jiwa | kondisi_bulan | Tanggal lahir warga aktif (umur 0–11 bulan pada tanggal acuan) | RT / RT | rt | siap |
| 10 | C.6 | Kematian bayi 0–11 bulan ini | kasus | kejadian | Catatan kejadian jenis "kematian_bayi" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 11 | C.7 | Warga mengidap Hipertensi | jiwa | stok | Fakta warga: hipertensi | RT / RT | rt | siap |
| 12 | C.8 | Warga mengidap Diabetes Melitus | jiwa | stok | Fakta warga: diabetes | RT / RT | rt | siap |
| 13 | C.9 | Warga mengidap Penyakit Jantung / Kardiovaskular | jiwa | stok | Fakta warga: jantung | RT / RT | rt | siap |
| 14 | C.10 | Warga mengidap Kanker | jiwa | stok | Fakta warga: kanker | RT / RT | rt | siap |
| 15 | C.11 | Warga mengidap PPOK / Asma | jiwa | stok | Fakta warga: ppok_asma | RT / RT | rt | siap |
| 16 | C.12 | Warga lansia (usia 60 tahun ke atas) | jiwa | stok | Tanggal lahir warga aktif (60 tahun ke atas pada tanggal acuan) | RT / RT | rt | siap |
| 17 | C.13 | Warga penyandang disabilitas | jiwa | stok | Fakta warga: disabilitas | RT / RT | rt | siap |

## D. STUNTING (4)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 18 | D.1 | Total kasus stunting bulan ini | kasus | stok | Fakta warga: stunting | RT / RT | rt | siap |
| 19 | D.2 | Jumlah kasus baru stunting bulan ini | kasus | kejadian | Fakta warga: stunting | RT / RT | rt | siap |
| 20 | D.3 | Jumlah keluarga berisiko stunting (KK) | KK | stok | Fakta KK: berisiko_stunting | RT / RT | rt | **perlu konfirmasi** — Kriteria keluarga berisiko stunting (versi BKKBN/posyandu) belum ditetapkan kecamatan. |
| 21 | D.4 | Jumlah remaja putri terpantau gizi | jiwa | kondisi_bulan | Fakta warga: remaja_putri_gizi | RT / RT | rt | **perlu konfirmasi** — Batas usia 'remaja putri' belum ditetapkan kecamatan. |

## E. SANITASI, LISTRIK & INTERNET (11)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 22 | E.1 | KK tanpa akses air bersih | KK | stok | Fakta KK: air_bersih | RT / RT | rt | siap |
| 23 | E.2 | KK rentan kekeringan | KK | stok | Fakta KK: rentan_kekeringan | RT / RT | rt | siap |
| 24 | E.3 | KK tanpa jamban | KK | stok | Fakta KK: jamban | RT / RT | rt | siap |
| 25 | E.4 | KK tanpa septictank | KK | stok | Fakta KK: septictank | RT / RT | rt | siap |
| 26 | E.5 | Rumah tanpa listrik (tidak punya meteran) | rumah | stok | Fakta rumah: listrik (lihat meteran) | RT / RT | rt | siap |
| 27 | E.6 | Rumah dengan listrik 450 VA | rumah | stok | Fakta rumah: listrik (lihat meteran) | RT / RT | rt | siap |
| 28 | E.7 | Rumah dengan listrik 900 VA | rumah | stok | Fakta rumah: listrik (lihat meteran) | RT / RT | rt | siap |
| 29 | E.8 | Rumah dengan listrik 1.300 VA | rumah | stok | Fakta rumah: listrik (lihat meteran) | RT / RT | rt | siap |
| 30 | E.9 | Rumah dengan listrik 2.200 VA | rumah | stok | Fakta rumah: listrik (lihat meteran) | RT / RT | rt | siap |
| 31 | E.10 | Rumah dengan listrik 3.500 VA ke atas | rumah | stok | Fakta rumah: listrik (lihat meteran) | RT / RT | rt | siap |
| 32 | E.11 | KK tanpa akses internet | KK | stok | Fakta KK: internet | RT / RT | rt | siap |

## F. PENDIDIKAN WARGA (18)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 33 | F.1 | Warga pendidikan terakhir SD | jiwa | stok | Fakta warga: pendidikan_terakhir | RT / RT | rt | siap |
| 34 | F.2 | Warga pendidikan terakhir SMP | jiwa | stok | Fakta warga: pendidikan_terakhir | RT / RT | rt | siap |
| 35 | F.3 | Warga pendidikan terakhir SMA | jiwa | stok | Fakta warga: pendidikan_terakhir | RT / RT | rt | siap |
| 36 | F.4 | Warga pendidikan terakhir S1 | jiwa | stok | Fakta warga: pendidikan_terakhir | RT / RT | rt | siap |
| 37 | F.5 | Warga pendidikan terakhir S2 | jiwa | stok | Fakta warga: pendidikan_terakhir | RT / RT | rt | siap |
| 38 | F.6 | Warga pendidikan terakhir S3 | jiwa | stok | Fakta warga: pendidikan_terakhir | RT / RT | rt | siap |
| 39 | F.7 | Warga buta huruf (usia ≥15 tahun) | jiwa | stok | Fakta warga: buta_huruf | RT / RT | rt | siap |
| 40 | F.8 | Anak yang mengikuti PAUD | jiwa | stok | Fakta warga: sekolah_aktif | RT / RT | rt | siap |
| 41 | F.9 | Anak yang mengikuti TK / RA | jiwa | stok | Fakta warga: sekolah_aktif | RT / RT | rt | siap |
| 42 | F.10 | Anak usia SD / MI | jiwa | stok | Tanggal lahir warga | RT / RT | rt | **perlu konfirmasi** — Batas usia jenjang sekolah belum ditetapkan kecamatan. Usulan sementara (tidak dipakai untuk angka final): SD 7–12, SMP 13–15, SMA 16–18 tahun. |
| 43 | F.11 | Anak SD/MI putus / tidak sekolah | jiwa | stok | Tanggal lahir + fakta sekolah_aktif = tidak | RT / RT | rt | **perlu konfirmasi** — Batas usia jenjang sekolah belum ditetapkan kecamatan. Usulan sementara (tidak dipakai untuk angka final): SD 7–12, SMP 13–15, SMA 16–18 tahun. |
| 44 | F.12 | Warga berprofesi pendidik / dosen | jiwa | stok | Fakta warga: profesi_pendidik | RT / RT | rt | siap |
| 45 | F.13 | Anak usia SMP / MTs | jiwa | stok | Tanggal lahir warga | RT / RT | rt | **perlu konfirmasi** — Batas usia jenjang sekolah belum ditetapkan kecamatan. Usulan sementara (tidak dipakai untuk angka final): SD 7–12, SMP 13–15, SMA 16–18 tahun. |
| 46 | F.14 | Anak SMP/MTs putus / tidak sekolah | jiwa | stok | Tanggal lahir + fakta sekolah_aktif = tidak | RT / RT | rt | **perlu konfirmasi** — Batas usia jenjang sekolah belum ditetapkan kecamatan. Usulan sementara (tidak dipakai untuk angka final): SD 7–12, SMP 13–15, SMA 16–18 tahun. |
| 47 | F.15 | Anak usia SMA / SMK / MA | jiwa | stok | Tanggal lahir warga | RT / RT | rt | **perlu konfirmasi** — Batas usia jenjang sekolah belum ditetapkan kecamatan. Usulan sementara (tidak dipakai untuk angka final): SD 7–12, SMP 13–15, SMA 16–18 tahun. |
| 48 | F.16 | Anak SMA/SMK/MA putus / tidak sekolah | jiwa | stok | Tanggal lahir + fakta sekolah_aktif = tidak | RT / RT | rt | **perlu konfirmasi** — Batas usia jenjang sekolah belum ditetapkan kecamatan. Usulan sementara (tidak dipakai untuk angka final): SD 7–12, SMP 13–15, SMA 16–18 tahun. |
| 49 | F.17 | Warga peserta Paket A / B / C | jiwa | stok | Fakta warga: sekolah_aktif | RT / RT | rt | siap |
| 50 | F.18 | Anak mengikuti SLB / layanan khusus | jiwa | stok | Fakta warga: sekolah_aktif | RT / RT | rt | siap |

## G. EKONOMI, UMKM & KEMISKINAN (24)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 51 | G.1 | KK penerima BLT | KK | stok | Fakta KK: bantuan_blt | RT / RT | rt | siap |
| 52 | G.2 | KK penerima PBI-JK (JKN/BPJS gratis) | KK | stok | Fakta KK: bantuan_pbi_jk | RT / RT | rt | siap |
| 53 | G.3 | KK penerima PKH | KK | stok | Fakta KK: bantuan_pkh | RT / RT | rt | siap |
| 54 | G.4 | KK penerima PMT | KK | stok | Fakta KK: bantuan_pmt | RT / RT | rt | siap |
| 55 | G.5 | KK penerima RASTRADA | KK | stok | Fakta KK: bantuan_rastrada | RT / RT | rt | siap |
| 56 | G.6 | KK penerima CPP | KK | stok | Fakta KK: bantuan_cpp | RT / RT | rt | siap |
| 57 | G.7 | KK penerima BPNT | KK | stok | Fakta KK: bantuan_bpnt | RT / RT | rt | siap |
| 58 | G.8 | KK kategori miskin / kurang mampu | KK | stok | Fakta KK: miskin | RT / RT | rt | **perlu konfirmasi** — Definisi miskin/kurang mampu (DTKS/DTSEN atau kriteria lokal) belum ditetapkan kecamatan. |
| 59 | G.9 | KK rawan pangan | KK | stok | Fakta KK: rawan_pangan | RT / RT | rt | **perlu konfirmasi** — Kriteria rawan pangan belum ditetapkan kecamatan. |
| 60 | G.10 | Warga pengangguran terbuka | jiwa | stok | Fakta warga status_kerja = mencari_kerja, usia kerja | RT / RT | rt | **perlu konfirmasi** — Batas usia kerja dan definisi pengangguran terbuka (BPS: 15+, mencari kerja) belum dikonfirmasi kecamatan. |
| 61 | G.11 | Jumlah total UMKM tercatat | usaha | stok | Daftar usaha aktif terverifikasi di RT | RT / RT | rt | siap |
| 62 | G.12 | UMKM milik perempuan | usaha | stok | Pemilik usaha (warga) berjenis kelamin perempuan | RT / RT | rt | siap |
| 63 | G.13 | UMKM memiliki NIB | usaha | stok | Fakta usaha: nib | RT / RT | rt | siap |
| 64 | G.14 | UMKM memiliki izin PIRT | usaha | stok | Fakta usaha: pirt | RT / RT | rt | siap |
| 65 | G.15 | UMKM memiliki HaKI | usaha | stok | Fakta usaha: haki | RT / RT | rt | siap |
| 66 | G.16 | UMKM memiliki Sertifikat Halal | usaha | stok | Fakta usaha: halal | RT / RT | rt | siap |
| 67 | G.17 | UMKM memiliki SNI | usaha | stok | Fakta usaha: sni | RT / RT | rt | siap |
| 68 | G.18 | UMKM menggunakan pemasaran digital | usaha | stok | Fakta usaha: pemasaran_digital | RT / RT | rt | siap |
| 69 | G.19 | UMKM mendapat kredit bank / non-bank | usaha | stok | Fakta usaha: kredit | RT / RT | rt | siap |
| 70 | G.20 | UMKM produk Kuliner dan Makanan Olahan | usaha | stok | Kategori usaha: kuliner | RT / RT | rt | siap |
| 71 | G.21 | UMKM produk Kerajinan Tangan | usaha | stok | Kategori usaha: kerajinan | RT / RT | rt | siap |
| 72 | G.22 | UMKM produk Fashion, Konveksi, dan Tekstil | usaha | stok | Kategori usaha: fashion | RT / RT | rt | siap |
| 73 | G.23 | UMKM produk Agribisnis dan Ketahanan Pangan Kota | usaha | stok | Kategori usaha: agribisnis | RT / RT | rt | siap |
| 74 | G.24 | UMKM produk Jasa Kreatif dan Tekno-Lokal | usaha | stok | Kategori usaha: jasa_kreatif | RT / RT | rt | siap |

## H. KEAMANAN & KETERTIBAN (12)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 75 | H.1 | Jumlah poskamling | unit | stok | Daftar fasilitas jenis "poskamling" yang aktif pada tanggal acuan | RT & RW / RW | rw_bersama | siap |
| 76 | H.2 | Jumlah siskamling per minggu | kali/minggu | frekuensi | Kegiatan siskamling tercatat dalam bulan | RT / RT | rt | **perlu konfirmasi** — Cara mengubah frekuensi mingguan menjadi angka bulanan dan TOTAL belum ditetapkan. Usulan sementara: jumlah ronda dalam bulan ÷ jumlah minggu. |
| 77 | H.3 | Warga korban narkoba | jiwa | stok | Fakta warga: korban_narkoba | RT / RT | rt | **perlu konfirmasi** — Belum jelas apakah dihitung sebagai jumlah korban saat ini (stok) atau kasus baru bulan itu. |
| 78 | H.4 | Kasus narkoba — pelaku warga | kasus | kejadian | Catatan kejadian jenis "narkoba" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 79 | H.5 | Kasus pencurian / perampokan | kasus | kejadian | Catatan kejadian jenis "pencurian" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 80 | H.6 | Kasus perjudian | kasus | kejadian | Catatan kejadian jenis "perjudian" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 81 | H.7 | Kasus prostitusi | kasus | kejadian | Catatan kejadian jenis "prostitusi" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 82 | H.8 | Kasus kekerasan terhadap anak | kasus | kejadian | Catatan kejadian jenis "kekerasan_anak" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 83 | H.9 | Kasus perkosaan | kasus | kejadian | Catatan kejadian jenis "perkosaan" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 84 | H.10 | Kasus penculikan | kasus | kejadian | Catatan kejadian jenis "penculikan" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 85 | H.11 | Konflik yang menimbulkan korban jiwa | kasus | kejadian | Catatan kejadian jenis "konflik_korban_jiwa" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |
| 86 | H.12 | Jumlah pelaku kasus pembunuhan | orang | kejadian | Catatan kejadian jenis "pembunuhan" (tanggal kejadian dalam bulan) | RT / RT | rt | siap |

## I. POSYANDU & KB (7)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 87 | H.1 | Jumlah posyandu | unit | stok | Daftar fasilitas jenis "posyandu" yang aktif pada tanggal acuan | RT & RW / RW | rw_bersama | siap |
| 88 | H.2 | Posyandu memenuhi 6 SPM | unit | stok | Fakta posyandu: memenuhi_6_spm | RT & RW / RW | rw_bersama | **perlu konfirmasi** — Daftar 6 SPM posyandu belum dirinci kecamatan. |
| 89 | H.3 | Posyandu yang punya bangunan sendiri | unit | stok | Fakta posyandu: bangunan_sendiri | RT & RW / RW | rw_bersama | siap |
| 90 | H.4 | Jumlah kader posyandu | orang | stok | Fakta posyandu: jumlah_kader | RT & RW / RW | rw_bersama | siap |
| 91 | H.5 | Kader posyandu yang sudah terlatih | orang | stok | Fakta posyandu: kader_terlatih | RT & RW / RW | rw_bersama | siap |
| 92 | H.6 | Posyandu strata purnama | unit | stok | Fakta posyandu: strata | RT & RW / RW | rw_bersama | siap |
| 93 | H.7 | Posyandu strata mandiri / multifungsi | unit | stok | Fakta posyandu: strata | RT & RW / RW | rw_bersama | siap |

## J. SAMPAH & LINGKUNGAN (3)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 94 | J.1 | Tempat pembuangan sampah (TPS) | unit | stok | Daftar fasilitas jenis "tps" yang aktif pada tanggal acuan | RT & RW / RW | rw_bersama | siap |
| 95 | J.2 | Tempat pengelolaan sampah skala RT | unit | stok | Daftar fasilitas jenis "pengelolaan_sampah" yang aktif pada tanggal acuan | RT / RT | rt | siap |
| 96 | J.3 | KK yang melakukan pemilahan sampah | KK | stok | Fakta KK: pilah_sampah | RT / RT | rt | siap |

## K. SARANA OLAHRAGA (5)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 97 | K.1 | Lapangan sepak bola / futsal / mini soccer | unit | stok | Daftar fasilitas jenis "lapangan_sepakbola" yang aktif pada tanggal acuan | RT & RW / RW | rw_bersama | siap |
| 98 | K.2 | Lapangan voli | unit | stok | Daftar fasilitas jenis "lapangan_voli" yang aktif pada tanggal acuan | RT & RW / RW | rw_bersama | siap |
| 99 | K.3 | Lapangan badminton | unit | stok | Daftar fasilitas jenis "lapangan_badminton" yang aktif pada tanggal acuan | RT & RW / RW | rw_bersama | siap |
| 100 | K.4 | Lapangan basket | unit | stok | Daftar fasilitas jenis "lapangan_basket" yang aktif pada tanggal acuan | RT & RW / RW | rw_bersama | siap |
| 101 | K.5 | Sarana olahraga lainnya | unit | stok | Daftar fasilitas jenis "olahraga_lain" yang aktif pada tanggal acuan | RT & RW / RW | rw_bersama | siap |

## L. SENI, ADAT & BUDAYA (15)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 102 | L.1 | Pelaku Seni Musik Tradisional dan Religi | orang | stok | Fakta warga: pelaku_seni_musik | RT / RT | rt | siap |
| 103 | L.2 | Pelaku Seni Tari Tradisional dan Kontemporer | orang | stok | Fakta warga: pelaku_seni_tari | RT / RT | rt | siap |
| 104 | L.3 | Pelaku Seni Pertunjukan dan Teater Rakyat | orang | stok | Fakta warga: pelaku_seni_pertunjukan | RT / RT | rt | siap |
| 105 | L.4 | Pelaku Seni Suara dan Sastra Lokal | orang | stok | Fakta warga: pelaku_seni_suara_sastra | RT / RT | rt | siap |
| 106 | L.5 | Pelaku Seni Bela Diri Tradisional | orang | stok | Fakta warga: pelaku_seni_beladiri | RT / RT | rt | siap |
| 107 | L.6 | Kegiatan Seni Musik Tradisional bulan ini | kegiatan | kejadian | Kegiatan jenis "seni_musik" bertanggal dalam bulan, dikelola atau melibatkan RT | RT & RW / RT | rt | siap |
| 108 | L.7 | Kegiatan Seni Tari bulan ini | kegiatan | kejadian | Kegiatan jenis "seni_tari" bertanggal dalam bulan, dikelola atau melibatkan RT | RT & RW / RT | rt | siap |
| 109 | L.8 | Kegiatan Seni Pertunjukan bulan ini | kegiatan | kejadian | Kegiatan jenis "seni_pertunjukan" bertanggal dalam bulan, dikelola atau melibatkan RT | RT & RW / RT | rt | siap |
| 110 | L.9 | Kegiatan Seni Suara & Sastra bulan ini | kegiatan | kejadian | Kegiatan jenis "seni_suara_sastra" bertanggal dalam bulan, dikelola atau melibatkan RT | RT & RW / RT | rt | siap |
| 111 | L.10 | Kegiatan Seni Bela Diri bulan ini | kegiatan | kejadian | Kegiatan jenis "seni_beladiri" bertanggal dalam bulan, dikelola atau melibatkan RT | RT & RW / RT | rt | siap |
| 112 | L.11 | Kelompok Seni Musik Tradisional dan Religi | kelompok | stok | Daftar kelompok jenis "seni_musik" aktif pada tanggal acuan | RT & RW / RT | rt | siap |
| 113 | L.12 | Kelompok Seni Tari Tradisional dan Kontemporer | kelompok | stok | Daftar kelompok jenis "seni_tari" aktif pada tanggal acuan | RT & RW / RT | rt | siap |
| 114 | L.13 | Kelompok Seni Pertunjukan dan Teater Rakyat | kelompok | stok | Daftar kelompok jenis "seni_pertunjukan" aktif pada tanggal acuan | RT & RW / RT | rt | siap |
| 115 | L.14 | Kelompok Seni Suara dan Sastra Lokal | kelompok | stok | Daftar kelompok jenis "seni_suara_sastra" aktif pada tanggal acuan | RT & RW / RT | rt | siap |
| 116 | L.15 | Kelompok Seni Bela Diri Tradisional | kelompok | stok | Daftar kelompok jenis "seni_beladiri" aktif pada tanggal acuan | RT & RW / RT | rt | siap |

## M. ORGANISASI & REMBUG RW (3)

| No | Kode | Indikator | Satuan | Periode | Sumber | Pengisi / Verifikasi | Scope | Status |
|---|---|---|---|---|---|---|---|---|
| 117 | M.1 | Jumlah kegiatan PKK RT bulan ini | kegiatan | kejadian | Kegiatan PKK yang dikelola RT bertanggal dalam bulan | RT / RT | rt | siap |
| 118 | M.2 | Jumlah kegiatan pemberdayaan masyarakat bulan ini | kegiatan | kejadian | Kegiatan pemberdayaan bertanggal dalam bulan (RT atau RW yang melibatkan RT) | RT & RW / RT | rt | siap |
| 119 | M.3 | Jumlah warga RT yang hadir di Rembug RW | orang | kehadiran | Kegiatan Rembug RW (dibuat RW) + jumlah hadir yang dicatat RT | RT & RW / RT | rw_bersama | siap |
