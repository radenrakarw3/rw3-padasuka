# KPP RW 03 Padasuka — CLAUDE.md

## Gambaran Project

Sistem informasi warga RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi.
Dikelola oleh Raden Raka selaku Ketua RW 03 (23 tahun).

Website publik: **rw3padasukacimahi.org**

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18.3 + TypeScript + Vite + Tailwind CSS + Radix UI (shadcn/ui) |
| Backend | Express 5 + TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Railway) |
| Auth | Passport.js + express-session |
| WA API | StarSender (env: `STARSENDER_API_KEY`, `STARSENDER_DEVICE_ID`) |
| AI | Google Gemini 2.5 Flash (env: `GEMINI_API_KEY`) |

---

## Struktur Direktori

```
/client/src/
  pages/admin/        ← Halaman admin (wa-blast, warga, dll)
  pages/public/       ← Halaman publik
  components/ui/      ← Komponen shadcn/ui
  lib/                ← queryClient, constants, utils

/server/
  routes.ts           ← Semua API endpoint Express
  storage.ts          ← Semua query database (Drizzle)
  index.ts            ← Entry point server

/shared/
  schema.ts           ← Drizzle schema + Zod insert schemas
```

---

## Database Schema Utama

### `kartu_keluarga`
- `id`, `nomor_kk`, `rt` (1–7), `alamat`, `status_rumah`
- `penerima_bansos` (boolean), `jenis_bansos`
- `link_gmaps`, `latitude`, `longitude`

### `warga`
- `id`, `kk_id` (FK ke kartu_keluarga)
- `nama_lengkap`, `nik` (unique)
- `nomor_whatsapp` — **nullable**, sering kosong, penting untuk WA Blast
- `jenis_kelamin`, `kedudukan_keluarga` (Kepala Keluarga / Istri / Anak / dst)
- `tanggal_lahir` — digunakan untuk filter umur di WA Blast

### `wa_blast`
- `id`, `pesan`, `kategori_filter`, `filter_rt`
- `jumlah_penerima`, `jumlah_berhasil`, `status`

### `warga_singgah`, `pemilik_kost`, `rt_data`

---

## Fitur Utama

### WA Blast (`/admin/wa-blast`)
- Kirim pesan massal WhatsApp ke warga berdasarkan kategori
- Kategori: semua, per RT, pemukiman (RT 01–04), perumahan (RT 05–07), kepala keluarga, penerima bansos, pemilik kost, warga singgah, kategori umur
- Generate pesan otomatis via Gemini AI
- Personalisasi pesan: `{gender}` = Bapak/Ibu, `{warga}` = nama, `{rtxx}` = RT
- **Panel Laporan Nomor WA Kosong**: menampilkan warga tanpa nomor WA, beserta tombol WA ke kepala keluarga untuk meminta update nomor

### Aturan Kategori Umur di WA Blast
- Anak: < 18 tahun (di WA Blast sebelumnya); di panel laporan nomor kosong, anak **< 16 tahun** otomatis ditandai "Tidak punya WA"
- Remaja: 18–29 tahun
- Dewasa: 30–60 tahun
- Lansia: > 60 tahun

---

## Konvensi Kode

- Semua label/teks UI memakai **Bahasa Indonesia**
- Warna brand: `hsl(163,55%,22%)` (hijau tua) dan `hsl(40,45%,55%)` (emas)
- Format nomor WA: `0812xxxx` disimpan → dikonversi ke `62812xxxx` saat kirim ke StarSender
- Pesan WhatsApp tidak boleh memakai markdown (tanpa `*bold*`), teks biasa saja
- Railway: filesystem bersifat ephemeral → simpan file/foto ke PostgreSQL (base64 `_data` fields)

---

## Environment Variables Wajib

```
DATABASE_URL
SESSION_SECRET
STARSENDER_API_KEY
STARSENDER_DEVICE_ID
GEMINI_API_KEY
```

---

## Catatan Penting

- RT 01–04 = **Pemukiman**, RT 05–07 = **Perumahan**
- Nomor WA warga sering tidak diisi → gunakan panel laporan untuk melacak dan menghubungi kepala keluarga
- Anak di bawah 16 tahun dianggap **tidak memiliki WA** (diisi otomatis di laporan)
- Blast ke kategori "anak" (< 18 thn) tetap valid jika ada nomor WA yang terdaftar (misal WA orang tua)
