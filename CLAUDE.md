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
| AI | Google Gemini 2.5 Flash (env: `GEMINI_API_KEY`) |

---

## Struktur Direktori

```
/client/src/
  pages/admin/        ← Halaman admin (laporan, warga, dll)
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
- `nomor_whatsapp` — **nullable**, sering kosong
- `jenis_kelamin`, `kedudukan_keluarga` (Kepala Keluarga / Istri / Anak / dst)
- `tanggal_lahir`

### `warga_singgah`, `pemilik_kost`, `rt_data`

---

## Fitur Utama

## Konvensi Kode

- Semua label/teks UI memakai **Bahasa Indonesia**
- Warna brand: `hsl(163,55%,22%)` (hijau tua) dan `hsl(40,45%,55%)` (emas)
- Railway: filesystem bersifat ephemeral → simpan file/foto ke PostgreSQL (base64 `_data` fields)

---

## Environment Variables Wajib

```
DATABASE_URL
SESSION_SECRET
GEMINI_API_KEY
```

---

## Catatan Penting

- RT yang dikelola di sistem: **01–04** (pemukiman RW 03)
