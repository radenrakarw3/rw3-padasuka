# Surat Sakti — Spesifikasi Template

Sumber kebenaran: `shared/surat-sakti/` (registry). Dokumen ini ringkasan untuk pemeriksaan isi; bila berbeda, registry yang berlaku.

## Alur

Setiap surat berdiri sendiri: RW langsung membuat dokumen (format baku atau Surat Kustom), tanpa permintaan RT dan tanpa rangkaian/surat induk. Rujukan surat sebelumnya bersifat opsional (teks bebas).
Terbit ≠ terkirim ≠ selesai. Tiga status berdiri sendiri:

| Status | Nilai | Sumber |
|---|---|---|
| Dokumen | draft, terbit, dibatalkan, digantikan | `surat_rw.status` |
| Distribusi | belum, diserahkan, gagal, diterima | turunan dari `wil_surat_kirim` (harus berbukti, kecuali gagal) |
| Pekerjaan | tidak diperlukan, menunggu, berjalan, selesai | turunan dari `wil_surat_tindak`; "terlambat" dihitung dari tenggat |

## Peran

- **RT**: membaca dokumen terbit yang relevan (akses `rt_terkait` dengan RT-nya atau RT yang menjadi PIC), melaporkan progres tugas miliknya. RT tidak dapat meminta atau menerbitkan surat.
- **RW**: membuat, menerbitkan, membatalkan, menyalin jadi draft baru, menunjuk PIC, mencatat distribusi, bantuan bertahap, evaluasi.
- Pihak luar hanya penerima/PIC (dicatat RW sebagai `pihak_luar_dicatat`), tidak punya login.

Akses dokumen: `internal` (RT pemohon/PIC saja), `rt_terkait` (RT terpilih), `terbatas` (hanya RW). Semua dicek di server (`server/surat-sakti/akses.ts`).

## Katalog (15 jenis + Surat Kustom)

Disusun menurut tiga kewenangan Ketua RW: **menegur**, **meminta**, dan **menjalankan jabatan**. Kolom: kode registry · kode nomor · tata letak · catatan.

**T. Menegur** (warga, pemilik kost/kontrakan, pelaku usaha, provider/kontraktor)
- b_klarifikasi (UND-KLR, surat, ex "Surat Undangan Klarifikasi") — panggilan memberi keterangan; ketidakhadiran tanpa kabar dicatat. Dipakai modul Aduan.
- b_teguran_lisan (BA-TGR, berita acara) — catatan teguran lisan. Dipakai modul Aduan.
- b_sp (SP, surat) — SP-1/SP-2/SP-3. Dasar ditulis bebas (aduan, pemantauan pengurus, Peraturan RW); tidak harus berasal dari Aduan. Wajib: hal yang ditegur, kewajiban, batas waktu, langkah lanjutan (terisi otomatis sesuai tingkat di wizard).
- tg_pekerjaan (TGR, surat) — teguran kepada provider/kontraktor: masalah, yang harus dilakukan, batas waktu; tembusan bawaan Lurah, Camat, dinas terkait.
- b_kesepakatan (KSP, berita acara) — pernyataan kesanggupan/kesepakatan, wajib ≥2 pihak dan konfirmasi.

**M. Meminta** (Kelurahan/Kecamatan/Dinas, perusahaan/CSR)
- mt_instansi (PGJ, ex "Surat Pengajuan Perbaikan") — jenis: perbaikan fasilitas, peninjauan, penanganan masalah, penertiban/penindakan, data/izin/rekomendasi.
- d_audiensi (AUD, ex "Surat Permohonan Audiensi").
- mt_bantuan (PMB, ex "Surat Permohonan Bantuan") — dana, barang, material, alat, jasa, kolaborasi/CSR. Tercatat sebagai "dimohonkan", bukan pemasukan.
- mt_susulan (PGT) — menagih tanggapan surat sebelumnya, dengan batas waktu.
- d_terima_kasih (UTK).

**J. Menjalankan jabatan**
- c_edaran (SE, ex "Surat Edaran") — pemberitahuan, imbauan, ketentuan; dasar opsional.
- jb_keputusan (KPTS, keputusan, wajib dasar) — penetapan hasil musyawarah, pembentukan tim/panitia, penetapan pengurus, tata fasilitas, perubahan/pencabutan.
- jb_berita_acara (BA) — judul cetak "BERITA ACARA {jenis}": musyawarah, pemeriksaan lapangan, klarifikasi/mediasi, hasil penanganan, serah-terima, penerimaan bantuan, kejadian.
- e_notulen (NOT, notulen).
- jb_laporan (LAP, laporan) — judul cetak mengikuti jenis: progres, penyelesaian, penggunaan dana/barang, evaluasi program.

**F. Surat kustom** — f_kustom (SRT): isi ditulis bebas (juga untuk surat tugas, undangan rapat, surat keterangan). Bila penerima diisi berbentuk surat ber-"Kepada Yth."; bila kosong berbentuk dokumen berjudul. Paragraf dipisah baris kosong, poin opsional, penutup kosong = penutup standar, "-" = tanpa penutup.

Jenis sebelum rombak (54 jenis) tidak lagi bisa dipilih. `KODE_LAMA` di `katalog.ts` memetakannya ke jenis pengganti; yang tidak berpadanan menjadi Surat Kustom. Lihat `migrasi.md`.

## Field

Field bersama (`KELOMPOK` di `field.ts`): penerima + tembusan, fakta & lokasi (+ sumber fakta internal, tidak dicetak), PIC, rujukan surat sebelumnya, penandatangan, rencana tindak lanjut (internal; menjadi catatan tindak lanjut saat terbit). Tiap jenis menambah kelompok khusus (teguran, pekerjaanProvider, jenisPermohonan, bantuan, jenisKeputusan, jenisBA, laporan, dst.). Field yang sudah tercetak di judul atau kalimat pembuka (`{x}`) tidak dicetak ulang.

Form memakai pilihan cepat: `pilihan` (dropdown), `saran` (chip yang diketuk; bisa bergantung field lain, mis. jenis pelanggaran → kewajiban, tingkat SP → langkah lanjutan, jenis permohonan → yang dimohonkan), `cepat` (tanggal +n hari), `preset` (penerima instansi), dan `saranPerihal` per jenis. Uji memastikan saran tidak memuat placeholder atau kata sensitif.

Pihak dipilih dari data yang sudah ada (akun RT, ketua kelompok aktif, warga, usaha RT, mitra) atau ditulis manual; disimpan sebagai salinan di dokumen, bukan master baru.

## Batas redaksi (divalidasi `validasi.ts`)

- Tidak mengarang dasar hukum, kewenangan, tuduhan, persetujuan, nominal, atau sanksi.
- Jenis "wajib dasar" tidak dapat terbit tanpa dasar (RW3LAW yang disetujui / notulen musyawarah) **dan** centang "dasar sudah diperiksa".
- Kesepakatan tidak dapat terbit tanpa ≥2 pihak dan konfirmasi persetujuan.
- Batas waktu (perbaikan, tanggapan) tidak boleh sebelum tanggal dokumen.
- Teguran tegas tapi sah: konsekuensi berupa jalur lanjut yang dimiliki RW (SP berikutnya, diteruskan ke Kelurahan/Satpol PP/dinas, RW tidak menerbitkan surat pengantar/rekomendasi), bukan sanksi yang ditetapkan sendiri.
- Placeholder (`{x}`, `[isi …]`, `XXX`, titik-titik) menggagalkan terbit.
- Peringatan (tidak memblokir): kata sensitif (denda, sanksi, pungutan wajib, izin, penyegelan, pengusiran), nada perintah kepada pihak luar, nominal bantuan (bukan pemasukan).
- Template berjalan tanpa AI.

## PDF

- A4, kop RW 03 dari `identitas.ts`, logo `server/assets/logo-kop-rw03.png`.
- Draf: watermark "DRAF - BELUM BERLAKU", tanpa nomor.
- Terbit (satu transaksi): nomor atomik → snapshot (data, blok, versi template) → PDF → SHA-256 → `wil_surat_berkas`. Trigger DB menolak perubahan isi/nomor/PDF final.
- Tanda tangan: Ketua RW (`identitas.ts`: Raden Raka A.K.S, Ketua Rukun Warga 03 Padasuka Cimahi) selalu menandatangani, kolom paling kanan. Gambar tanda tangan diunggah sekali di halaman Surat RW (tabel `wil_surat_ttd`, base64, migrasi `0032_surat_ttd.sql`) dan dibubuhkan otomatis **hanya saat terbit**; draf menampilkan "(tanda tangan & QR dibubuhkan saat terbit)". Surat tidak dapat terbit bila belum ada tanda tangan aktif. Kolom pihak lain tetap kosong untuk tanda tangan basah. Snapshot menyimpan `penandatangan` (nama, jabatan, id & sha256 tanda tangan).
- QR keaslian di samping tanda tangan Ketua RW (surat satu penandatangan) atau di bawah dokumen (beberapa penandatangan). `/verify/surat/<token>` menampilkan nomor, tanggal, jenis, penerbit, penandatangan, status.
- Koreksi = batalkan dokumen lama lalu "Salin jadi draft baru" (nomor baru, tidak tertaut ke dokumen lama); pembatalan tercatat beralasan. Arsip lama tidak dinomori ulang; PDF arsip lama dibentuk dari teks tersimpan.

## Perlu konfirmasi Ketua RW

1. Identitas kop (`shared/surat-sakti/identitas.ts`): alamat sekretariat, nama "Raden Raka A.K.S", jabatan "Ketua Rukun Warga 03 Padasuka Cimahi".
2. Kode nomor per jenis (tabel di atas). Format: `NNN/KODE/RW.03/KEL.PADASUKA/KEC.CIMAHI-TENGAH/KOTA.CIMAHI/<bulan romawi>/<tahun>`; urut tahunan bersama semua jenis.
3. Redaksi pembuka/penutup tiap jenis (`katalog.ts`), terutama pilar Menegur (klarifikasi, SP, teguran provider) dan keputusan.
4. Akses bawaan: pilar Menegur (kategori T) default "internal".
5. PIC RT pada rencana tindak lanjut dikenali dari teks "RT 0x" di kolom PIC (untuk tindak lanjut yang ditambah manual tersedia pilihan RT).
