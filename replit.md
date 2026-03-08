# RW 03 Padasuka - Sistem Informasi Warga Digital

## Overview
A mobile-first digital community management web app for RW 03 Padasuka, Cimahi. Enables digitization of resident data, reporting, letter services (AI-generated), and mass WhatsApp messaging.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui (mobile-first)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Google Gemini API (gemini-2.5-flash) for letter generation
- **Messaging**: Star Sender API for WhatsApp blast

## Color Palette
- Primary Green: hsl(163, 55%, 22%) - Dark green from logo
- Accent Gold: hsl(40, 45%, 55%) - Gold from logo
- Supporting: White, Black, Dark Red, Dark Blue

## Auth System
- **Warga Login**: 3-step OTP via WhatsApp (Star Sender)
  1. Warga enters nomor KK → picks WA contact from family members
  2. System sends 2-digit OTP to selected WhatsApp number
  3. Warga enters OTP code → verified and logged in
  - OTP expires after 5 minutes, 60-second resend cooldown, max 5 attempts
  - In-memory OTP store (Map) on server
- **Admin Login**: Multi-admin from `admin_user` table with bcrypt-hashed passwords
  - Admins: arnia23, emulawarman, radenraka, rezel123
  - Loaded from CSV (attached_assets/admin_1772993517793.csv)
- Session-based auth with express-session
- Access control: warga can only access their own KK data, admin sees all

## Key Features
1. **Warga Pages**: Beranda, Profil (view/edit request), Laporan, Pelayanan Surat
2. **Admin Pages**: Dashboard (comprehensive statistics), Kelola KK, Kelola Warga, Kelola Laporan, Kelola Surat, Surat RW (Surat Sakti), Arsip Surat, Edit Profil approval, WA Blast
3. **Gemini AI**: Auto-generates surat keterangan and official RW letters
4. **Star Sender**: WA Blast with category filters (semua, per RT, kepala keluarga, penerima bansos), preview recipient count, confirmation dialog, message templates, AI message generation, expandable history with sent/failed counts
   - **AI Message Generation**: Admin inputs a topic → Gemini generates personalized message as Ketua RW (Raden Raka, 23yo, friendly tone)
   - **Auto Placeholders**: `{gender}` (Bapak/Ibu), `{warga}` (nama lengkap), `{rtxx}` (RT number) — replaced per-recipient on send
   - Server validates AI output contains placeholders; injects header if missing
5. **Auto WA Notifications**: Every status change (laporan, surat, profile edit) sends contextual WhatsApp notification to warga via Star Sender with domain link (rw3padasukacimahi.org)
6. **Shared Constants**: All dropdown options (pekerjaan, agama, jenis kelamin, status kawin, kedudukan, etc.) centralized in `client/src/lib/constants.ts`

## Letter System
- **Surat Warga Flow**: Warga submits request → Admin clicks "Generate" (Gemini AI) → Admin reviews → Approve/Reject → Nomor surat auto-assigned on approval (format: XXX/SK-W/RW-03/MM/YYYY)
- **Surat RW Flow**: Admin creates surat → Gemini AI generates → Nomor surat auto-assigned on creation (format: XXX/SK-RW/RW-03/MM/YYYY)
- **PDF Download**: A4 format with KOP surat (logo + RW03 letterhead), generated client-side using jsPDF (`client/src/lib/pdf-surat.ts`)
- **Arsip Surat**: Admin archive page listing all approved surat warga + surat RW with nomor surat, searchable and filterable

## File Upload System
- **Backend**: Multer middleware, files stored in `uploads/kk/` and `uploads/ktp/` directories
- **Static serving**: `/uploads` path serves uploaded files via Express static middleware
- **Endpoints**: `POST /api/upload/kk/:kkId` and `POST /api/upload/ktp/:wargaId`
- **Limits**: 5MB max, accepts JPG/JPEG/PNG/PDF
- **Access control**: Warga can only upload for their own KK/KTP, admin can upload for any
- **Old file cleanup**: Previous file is deleted when replaced
- **DB columns**: `kartu_keluarga.foto_kk` and `warga.foto_ktp` store file paths
- **Upload sources**: Admin KK form, Admin Warga form, Warga profile page
- **Download**: Admin KK cards show download buttons for KK and KTP kepala keluarga when files exist

## KK Verification System
- **Verified** = foto KK uploaded + kepala keluarga has KTP uploaded + kepala keluarga has WA number + WA number not duplicated across warga
- **Unverified** = missing any of the above criteria; each missing item shown as reason
- **WA normalization**: strips non-digits, converts leading 0 to 62, ensures 62 prefix — consistent across duplicate detection and display
- **QR Code**: verified families get QR code button → opens dialog with downloadable QR (links to rw3padasukacimahi.org) for sticker use
- **Filter cards**: clickable stat cards at top to filter verified/unverified KK
- **Visual**: verified cards have green border + shield icon, unverified have amber border + warning reasons displayed

## Admin Dashboard Statistics
- **API**: `GET /api/stats/dashboard` (admin-only) — server-side aggregation of all stats
- **Summary cards**: Total KK, Total Warga, Pending Laporan, Pending Surat
- **Warga demographics**: Jenis Kelamin (donut), Agama (bar), Status Perkawinan (donut), Kelompok Usia (bar), Pekerjaan top 10 (bar), Kedudukan Keluarga (bar), Status Kependudukan (badges)
- **Ownership stats**: WhatsApp, Foto KTP, Foto KK (pair stat bars)
- **KK/Rumah data**: Status Rumah (donut), Listrik (donut), Kondisi Bangunan (bar), Sumber Air (bar), Sanitasi (bar), Penerima Bansos (pair stat)
- **Per RT**: Enhanced breakdown with KK count, Warga count, Bansos count per RT
- **Charts**: CSS-based (conic-gradient donuts, progress bar charts) — no external chart library

## Data Model (shared/schema.ts)
- `kartu_keluarga`: KK data with RT assignment, foto_kk for uploaded KK scan
- `warga`: Resident data linked to KK, foto_ktp for uploaded KTP scan
- `rt_data`: RT 01-07 with ketua names
- `laporan`: Reports from residents
- `surat_warga`: Letter requests (AI-generated)
- `surat_rw`: Official RW letters (Surat Sakti)
- `profile_edit_request`: Profile edit approval workflow
- `admin_user`: Admin accounts with bcrypt password hashes
- `wa_blast`: WA blast message history

## RT Data
7 RT units with real ketua names from CSV:
- RT 01: Dadan Setiawan, RT 02: Jajang Kusmana, RT 03: Iyep Supriatna
- RT 04: Eem Sulaeman, RT 05: Dadan Sobandi, RT 06: Dicky Irawan, RT 07: Abdul Muin

## Logo
- Green logo: `@assets/RW3-Cimahi-Logo-Green@16x_1772999415502.png` (on white/light backgrounds)
- Gold logo: `@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png` (on green/dark backgrounds)
- Rules: green bg → gold logo, gold bg → green logo, white bg → green logo, black bg → gold logo
- Used in: login page (gold), warga header (gold), admin header (gold), KOP surat (green), PDF surat (green)
- KOP surat component: `client/src/components/kop-surat.tsx`
- Gemini AI prompts exclude KOP header (added visually by frontend)

## Seeded Data
- 291 KK records from CSV
- 927 warga records from CSV
- 7 RT data records (real names)
- 4 admin users from CSV (bcrypt-hashed passwords)

## Environment Variables
- DATABASE_URL: PostgreSQL connection
- GEMINI_API_KEY: Google Gemini API
- STARSENDER_API_KEY: Star Sender API
- STARSENDER_DEVICE_ID: Star Sender device ID
- SESSION_SECRET: Express session secret
