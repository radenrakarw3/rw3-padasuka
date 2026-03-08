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
- **Warga Login**: Username = Nomor KK, Password = last 4 digits of KK number
- **Admin Login**: Username = "admin", Password = "admin2026"
- Session-based auth with express-session

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
- `wa_blast`: WA blast message history

## RT Data
7 RT units (RT 01 - RT 07), names configurable via admin

## Seeded Data
- 291 KK records from CSV
- 927 warga records from CSV
- 7 RT data records

## Environment Variables
- DATABASE_URL: PostgreSQL connection
- GEMINI_API_KEY: Google Gemini API
- STARSENDER_API_KEY: Star Sender API
- STARSENDER_DEVICE_ID: Star Sender device ID
- SESSION_SECRET: Express session secret
