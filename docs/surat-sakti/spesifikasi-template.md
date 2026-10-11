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

## Katalog (54 jenis)

Kolom: kode registry · kode nomor · tata letak · catatan.

**A. Menggerakkan pengurus** — a_tugas (ST, surat, ex "Surat Tugas") · a_tim (KPTS, keputusan) · a_koordinator (ST) · a_instruksi (INS) · a_minta_laporan (PLP) · a_evaluasi (EVL, laporan) · a_ubah (ST) · a_serah_tugas (BA, berita acara)

**B. Penyelesaian masalah** — b_klarifikasi (UND-KLR, ex "Surat Undangan Klarifikasi") · b_penjelasan (PPT) · b_mediasi (UND) · b_tugas_periksa (ST) · b_ba_periksa (BA) · b_ba_klarifikasi (BA) · b_kesepakatan (KSP, wajib konfirmasi para pihak) · b_imbauan (IMB) · b_pengingat (PGT) · b_permohonan_instansi (PGJ) · b_ba_hasil (BA) · b_perkembangan (PBR)

**C. Keputusan dan penataan** — c_ba_musyawarah (BA) · c_penetapan (KPTS, wajib dasar) · c_edaran (SE, ex "Surat Edaran") · c_undangan (UND, ex "Surat Undangan") · c_jadwal (JDW, tabel) · c_tata_fasilitas (KPTS, wajib dasar) · c_akses (PBR) · c_koordinasi (KRD) · c_ubah (KPTS, wajib dasar)

**D. Dukungan pihak luar** — d_audiensi (AUD, ex "Surat Permohonan Audiensi") · d_peninjauan (PGJ) · d_perbaikan (PGJ-PBK, ex "Surat Pengajuan Perbaikan") · d_dana (PMB, ex "Surat Permohonan Bantuan") · d_barang · d_material_bekas · d_alat · d_jasa (PMB) · d_kolaborasi (KLB) · d_penawaran_harga (PPH) · d_pengingat (PGT) · d_terima_kasih (UTK) · d_pengajuan (PGJ, ex "Surat Pengajuan")

**E. Pelaksanaan dan pertanggungjawaban** — e_rencana (RK) · e_daftar_hadir (DH, tabel + baris kosong tanda tangan) · e_notulen (NOT) · e_progres / e_selesai / e_penggunaan (LAP) · e_ba_terima / e_serah_aset / e_kembali (BA) · e_tanda_terima (TT, tabel) · e_evaluasi (EVL)

**F. Surat kustom** — f_kustom (SRT): isi ditulis bebas. Bila penerima diisi berbentuk surat ber-"Kepada Yth."; bila kosong berbentuk dokumen berjudul. Paragraf dipisah baris kosong, poin opsional, penutup kosong = penutup standar, "-" = tanpa penutup.

## Field

Field bersama (`KELOMPOK` di `field.ts`): penerima + tembusan, fakta & lokasi (+ sumber fakta internal, tidak dicetak), tindakan diminta, PIC, rujukan surat sebelumnya, penandatangan, rencana tindak lanjut (internal; menjadi catatan tindak lanjut saat terbit). Tiap jenis menambah kelompok khusus (tugas, tim, pemeriksaan, kesepakatan, dasar, bantuan, notulen, dst.).

Pihak dipilih dari data yang sudah ada (akun RT, ketua kelompok aktif, warga, usaha RT, mitra) atau ditulis manual; disimpan sebagai salinan di dokumen, bukan master baru.

## Batas redaksi (divalidasi `validasi.ts`)

- Tidak mengarang dasar hukum, kewenangan, tuduhan, persetujuan, nominal, atau sanksi.
- Jenis "wajib dasar" tidak dapat terbit tanpa dasar (RW3LAW yang disetujui / notulen musyawarah) **dan** centang "dasar sudah diperiksa".
- Kesepakatan tidak dapat terbit tanpa ≥2 pihak dan konfirmasi persetujuan.
- Placeholder (`{x}`, `[isi …]`, `XXX`, titik-titik) menggagalkan terbit.
- Peringatan (tidak memblokir): kata sensitif (denda, sanksi, pungutan wajib, izin, penyegelan, pengusiran), nada perintah kepada pihak luar, nominal bantuan (bukan pemasukan).
- Template berjalan tanpa AI.

## PDF

- A4, kop RW 03 dari `identitas.ts`, logo `server/assets/logo-kop-rw03.png`.
- Draf: watermark "DRAF - BELUM BERLAKU", tanpa nomor.
- Terbit (satu transaksi): nomor atomik → snapshot (data, blok, versi template) → PDF → SHA-256 → `wil_surat_berkas`. Trigger DB menolak perubahan isi/nomor/PDF final.
- Tanda tangan: ruang kosong untuk tanda tangan basah + nama/jabatan. Tidak ada gambar tanda tangan.
- QR/tautan `/verify/surat/<token>` hanya menampilkan nomor, tanggal, jenis, penerbit, status. Ditulis jelas: bukan tanda tangan elektronik tersertifikasi.
- Koreksi = batalkan dokumen lama lalu "Salin jadi draft baru" (nomor baru, tidak tertaut ke dokumen lama); pembatalan tercatat beralasan. Arsip lama tidak dinomori ulang; PDF arsip lama dibentuk dari teks tersimpan.

## Perlu konfirmasi Ketua RW

1. Identitas kop (`shared/surat-sakti/identitas.ts`): alamat sekretariat, nama "Raden Raka", jabatan "Ketua RW 03".
2. Kode nomor per jenis (tabel di atas). Format: `NNN/KODE/RW.03/KEL.PADASUKA/KEC.CIMAHI-TENGAH/KOTA.CIMAHI/<bulan romawi>/<tahun>`; urut tahunan bersama semua jenis.
3. Redaksi pembuka/penutup tiap jenis (`katalog.ts`), terutama B (klarifikasi, imbauan) dan C (penetapan, tata fasilitas).
4. Akses bawaan: kategori B default "internal".
5. PIC RT pada rencana tindak lanjut dikenali dari teks "RT 0x" di kolom PIC (untuk tindak lanjut yang ditambah manual tersedia pilihan RT).
