# Setup Lokal (VSCode) & Deploy ke cPanel

## PENTING: Edit package.json Terlebih Dahulu

Setelah download/clone proyek, buka `package.json` dan ubah bagian `scripts` menjadi:

```json
"scripts": {
  "dev": "cross-env NODE_ENV=development tsx server/index.ts",
  "dev:client": "vite --config vite.config.ts",
  "build": "tsx script/build.ts",
  "start": "cross-env NODE_ENV=production node dist/index.cjs",
  "check": "tsc",
  "db:push": "drizzle-kit push",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

Dan hapus devDependencies khusus Replit (opsional, tidak wajib):
```
"@replit/vite-plugin-cartographer"
"@replit/vite-plugin-dev-banner"
"@replit/vite-plugin-runtime-error-modal"
```

---

## A. PERSIAPAN

### Prasyarat
- **Node.js** v18+ (disarankan v20 LTS) → https://nodejs.org
- **PostgreSQL** v14+ → https://www.postgresql.org/download/
- **Git** → https://git-scm.com
- **VSCode** → https://code.visualstudio.com

### 1. Clone / Download Proyek
```bash
git clone <url-repo-anda> rw03-padasuka
cd rw03-padasuka
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database PostgreSQL
Buat database di PostgreSQL lokal:
```sql
CREATE DATABASE rw03_padasuka;
```

### 4. Konfigurasi Environment Variables
Salin file contoh lalu sesuaikan:
```bash
cp .env.example .env
```

Edit file `.env`:
```
DATABASE_URL=postgresql://postgres:password_anda@localhost:5432/rw03_padasuka
GEMINI_API_KEY=api_key_gemini_anda
STARSENDER_API_KEY=api_key_starsender_anda
STARSENDER_DEVICE_ID=device_id_starsender_anda
SESSION_SECRET=random_string_panjang_32_karakter
PORT=5000
NODE_ENV=development
```

### 5. Import Data Production ke Database Lokal
File `database-production.sql` sudah berisi semua data terbaru dari production (291 KK, 927 warga, admin users, dll).

```bash
psql -U postgres -d rw03_padasuka -f database-production.sql
```

Atau jika pakai user/password tertentu:
```bash
psql "postgresql://username:password@localhost:5432/rw03_padasuka" -f database-production.sql
```

> **Catatan**: File ini sudah berisi schema + data lengkap. Tidak perlu jalankan `drizzle-kit push` lagi jika sudah import file ini.

### 6. Jalankan Development Server
```bash
npm run dev
```
Buka browser di `http://localhost:5000`

---

## B. DEVELOPMENT DI VSCODE

### Struktur Penting
```
├── client/          → Frontend (React + Vite)
├── server/          → Backend (Express.js)
├── shared/          → Schema database (Drizzle ORM)
├── attached_assets/ → Logo dan file statis
├── uploads/         → Upload file (KK, KTP, Surat)
├── .env             → Environment variables (JANGAN commit!)
└── dist/            → Hasil build produksi
```

### Script yang Tersedia
| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Jalankan server development (backend + frontend) |
| `npm run build` | Build untuk produksi |
| `npm run start` | Jalankan hasil build produksi |
| `npm run check` | Cek TypeScript errors |
| `npm run db:push` | Push schema ke database |

### Tips VSCode
- Install extension: **ESLint**, **Tailwind CSS IntelliSense**, **Prettier**
- Buka terminal terintegrasi (Ctrl+`) untuk jalankan perintah
- File `.env` otomatis dibaca oleh server saat development

### Catatan Penting untuk Development Lokal
- Pastikan PostgreSQL sudah berjalan sebelum `npm run dev`
- Server berjalan di port 5000 (backend + frontend sekaligus)
- Upload file tersimpan di folder `uploads/`
- Untuk Windows, gunakan `cross-env` sebelum `NODE_ENV`:
  ```bash
  npm install -g cross-env
  ```
  Lalu edit script `dev` di `package.json`:
  ```json
  "dev": "cross-env NODE_ENV=development tsx server/index.ts"
  ```

---

## C. DEPLOY KE CPANEL

### Prasyarat cPanel
- cPanel dengan fitur **Setup Node.js App** (tanyakan ke provider hosting)
- Akses **PostgreSQL** di cPanel (atau gunakan database eksternal)
- Node.js v18+ tersedia di cPanel

### Langkah Deploy

#### 1. Build Proyek di Lokal
```bash
npm run build
```
Hasil build ada di folder `dist/`:
- `dist/index.cjs` → Server backend
- `dist/public/` → Frontend statis

#### 2. File yang Perlu Diupload ke cPanel

Upload file-file berikut ke folder aplikasi di cPanel (misal: `~/rw03-padasuka/`):

```
dist/
  ├── index.cjs            → Server utama
  ├── public/               → Frontend (HTML, CSS, JS)
  │   └── .htaccess         → Routing SPA (otomatis dari build)
  └── attached_assets/      → Asset gambar/logo
node_modules/               → Dependencies (atau install di server)
package.json                → Daftar dependencies
package-lock.json           → Lock file
shared/                     → Schema (diperlukan untuk drizzle-kit push)
drizzle.config.ts           → Config Drizzle
.env                        → Environment variables (buat manual di server)
```

#### 3. Install Dependencies di cPanel
Melalui SSH atau Terminal cPanel:
```bash
cd ~/rw03-padasuka
npm install --production
```

#### 4. Setup Database di cPanel
- Buat database PostgreSQL via cPanel → **PostgreSQL Databases**
- Buat user database dan assign ke database
- Update `.env` dengan kredensial database cPanel:
  ```
  DATABASE_URL=postgresql://user:password@localhost:5432/nama_database
  ```

#### 5. Push Schema Database
```bash
cd ~/rw03-padasuka
npx drizzle-kit push
```

#### 6. Setup Node.js App di cPanel
1. Buka **Setup Node.js App** di cPanel
2. Klik **Create Application**
3. Isi:
   - **Node.js version**: 18 atau 20
   - **Application mode**: Production
   - **Application root**: `rw03-padasuka` (folder di cPanel)
   - **Application URL**: domain atau subdomain Anda
   - **Application startup file**: `dist/index.cjs`
4. Klik **Create**
5. Set environment variables via cPanel UI atau file `.env`

#### 7. Buat Folder Uploads
```bash
mkdir -p ~/rw03-padasuka/uploads/kk
mkdir -p ~/rw03-padasuka/uploads/ktp
mkdir -p ~/rw03-padasuka/uploads/surat
```

#### 8. Restart Aplikasi
Melalui cPanel → Setup Node.js App → Klik **Restart**

---

## D. ALTERNATIF: DEPLOY FRONTEND SAJA KE CPANEL (Tanpa Node.js)

Jika cPanel tidak mendukung Node.js, Anda bisa deploy frontend saja:

### 1. Build Frontend
```bash
npm run build
```

### 2. Upload `dist/public/` ke `public_html`
Upload semua isi folder `dist/public/` ke `public_html` di cPanel.

### 3. Upload `.htaccess`
Pastikan file `.htaccess` ada di `public_html` (sudah termasuk di `dist/public/`).

### 4. Backend Terpisah
Untuk backend, Anda perlu hosting Node.js terpisah (Railway, Render, VPS, dll).
Update `client/src/lib/queryClient.ts` agar fetch ke URL backend:
```typescript
const API_BASE = import.meta.env.VITE_API_URL || '';
// Lalu prefix semua API call dengan API_BASE
```

---

## E. TROUBLESHOOTING

### Error: DATABASE_URL must be set
→ Pastikan file `.env` sudah ada dan berisi `DATABASE_URL` yang benar.

### Error: Cannot find module 'bcrypt'
→ Jalankan `npm install` ulang. Di beberapa OS perlu install build tools:
- **Windows**: `npm install -g windows-build-tools`
- **macOS**: `xcode-select --install`
- **Linux**: `sudo apt install build-essential python3`

### Port 5000 sudah terpakai
→ Ganti PORT di `.env` ke port lain, misal `3000`.

### Upload file tidak berfungsi
→ Pastikan folder `uploads/` dan sub-foldernya sudah dibuat dan punya izin write.

### CORS error saat frontend dan backend beda domain
→ Tambahkan konfigurasi CORS di `server/index.ts`:
```typescript
import cors from 'cors';
app.use(cors({ origin: 'https://domain-frontend-anda.com', credentials: true }));
```
