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

## Environment Variables Opsional (WhatsApp / StarSender)

```
STARSENDER_API_KEY      # Wajib untuk kirim WA otomatis
STARSENDER_DEVICE_ID    # Opsional — ID device StarSender
PUBLIC_SITE_URL         # Default: https://rw3padasukacimahi.org (link di pesan WA)
```

Notifikasi otomatis via StarSender: Visit RW3 (pengajuan, approve/reject, pengingat kontrak H-7/H-1/habis), laporan masalah, laporan kekeringan. Modul: `server/wa-notify.ts`, `server/starsender.ts`.

## Modul Propaganda (distribusi informasi WA)

Halaman rahasia: `/admin/propaganda` (tidak di sidebar). Akses: login admin + PIN `1977` (`PROPAGANDA_PIN`).

Sistem **Formula HELIX v2** (`shared/propaganda-helix.ts`) — gelombang mikro, interleave RT, seed deterministik, skor kemerataan. Tabel: `propaganda_campaign`, `propaganda_gelombang`, `propaganda_antrian`, `propaganda_log_kirim`, `propaganda_cooldown`. Dispatcher: klaim atomik `FOR UPDATE SKIP LOCKED`, audit log tiap kirim.

```
PROPAGANDA_PIN=1977
PROPAGANDA_MIN_GAP_MS=15000
PROPAGANDA_COOLDOWN_DAYS=7
PROPAGANDA_MAX_PER_HOUR=40
PROPAGANDA_MAX_PER_RT_HOUR=12
PROPAGANDA_WAVE_MIN=15
PROPAGANDA_WAVE_MAX=30
PROPAGANDA_WAVE_REST_MS=600000
PROPAGANDA_MAX_PER_BLAST=200
```

---

## Catatan Penting

- RT yang dikelola di sistem: **01–04** (pemukiman RW 03)
