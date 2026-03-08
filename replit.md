# RW 03 Padasuka - Sistem Informasi Warga Digital

## Overview
A mobile-first digital community management web app for RW 03 Padasuka, Cimahi. Enables digitization of resident data, reporting, letter services (AI-generated), and mass WhatsApp messaging.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui (mobile-first)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Google Gemini API for letter generation
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
2. **Admin Pages**: Dashboard, Kelola KK, Kelola Warga, Kelola Laporan, Kelola Surat, Surat RW (Surat Sakti), Edit Profil approval, WA Blast
3. **Gemini AI**: Auto-generates surat keterangan and official RW letters
4. **Star Sender**: WA Blast with category filters (semua, per RT, kepala keluarga, penerima bansos)

## Data Model (shared/schema.ts)
- `kartu_keluarga`: KK data with RT assignment
- `warga`: Resident data linked to KK
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
- Official RW3 logo: `attached_assets/Untitled_design_(24)_1772993886433.png`
- Used in: login page, warga header, admin header, KOP surat letterhead
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
