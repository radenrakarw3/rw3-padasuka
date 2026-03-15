# RW 03 Padasuka - Sistem Informasi Warga Digital

## Overview
A mobile-first digital community management web app for RW 03 Padasuka, Cimahi. Enables digitization of resident data, reporting, letter services, financial management, and mass WhatsApp messaging.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui (mobile-first)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Google Gemini API (gemini-2.5-flash) for Surat RW (Surat Sakti), WA Blast message generation, and Dashboard AI Insight recommendations
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
- **Warga Singgah Login**: NIK-based OTP via WhatsApp
  1. Warga singgah enters 16-digit NIK → system validates against warga_singgah table (must be aktif)
  2. System sends 2-digit OTP to registered WhatsApp number
  3. Warga singgah enters OTP → verified and logged in as type "warga_singgah"
  - Separate OTP store (singgahOtpStore) and session fields (wargaSinggahId, wargaSinggahNik, isWargaSinggah)
  - Routes: `/singgah` (beranda with countdown), `/singgah/laporan`
- **Admin Login**: Multi-admin from `admin_user` table with bcrypt-hashed passwords
  - Admins: arnia23, emulawarman, radenraka, rezel123
  - Loaded from CSV (attached_assets/admin_1772993517793.csv)
- **Login Page**: 3-tab selector (Warga / Singgah / Admin)
- Session-based auth with express-session
- Access control: warga can only access their own KK data, warga singgah only their own data, admin sees all

## Key Features
1. **Warga Pages**: Beranda, Profil (view/edit request), Layanan (merged: Surat + Laporan + Donasi tabs), Keuangan (laporan kas RW)
2. **Warga Singgah Pages**: Beranda (contract countdown, personal info, kost info), Laporan (submit reports to admin)
3. **Admin Pages**: Dashboard (interactive with RT filter, Recharts visualizations: radar, treemap, stacked bar, gauge, pie; popup detail with AI insight; pengangguran tracking; angka capaian; highlight konten), Kelola KK, Kelola Warga, Kelola Laporan, Kelola Surat, Surat RW (Surat Sakti), Arsip Surat, Edit Profil approval, Bansos Management, Donasi, Keuangan (Kas RW), WA Blast, Kelola Pemilik Kost, Kelola Warga Singgah, Kelola Usaha
3. **Gemini AI**: Auto-generates official RW letters (Surat Sakti) and WA Blast messages only. Surat warga is fully manual.
4. **Star Sender**: WA Blast with category filters (semua, per RT, kepala keluarga, penerima bansos), preview recipient count, confirmation dialog, message templates, AI message generation, expandable history with sent/failed counts. Blast runs in background (no timeout) with auto-polling status updates.
   - **AI Message Generation**: Admin inputs a topic → Gemini generates personalized message as Ketua RW (Raden Raka, 23yo, friendly tone)
   - **Auto Placeholders**: `{gender}` (Bapak/Ibu), `{warga}` (nama lengkap), `{rtxx}` (RT number) — replaced per-recipient on send
   - Server validates AI output contains placeholders; injects header if missing
5. **Auto WA Notifications**: Every status change (laporan, surat, profile edit) sends contextual WhatsApp notification to warga via Star Sender with domain link (rw3padasukacimahi.org)
   - **Admin Notification**: New laporan, surat, and donasi from warga triggers WA notification to admin (085860604142) with detailed info (nama, NIK, alamat, RT, jenis surat, perihal, keterangan)
6. **Shared Constants**: All dropdown options (pekerjaan, pendidikan, agama, jenis kelamin, status kawin, kedudukan, etc.) centralized in `client/src/lib/constants.ts`
7. **Donasi**: Crowdfunding feature for RW activities
   - Admin creates donation campaigns (judul, deskripsi, target dana optional)
   - Warga donates via Bank Transfer BCA (1390997490 a.n. Raden Raka Abdul Kamal Syafaat), then reports donation (campaign, nama, jumlah)
   - Admin verifies payment and confirms/rejects
   - Confirmed donations automatically create kas RW pemasukan entry (kategori "Donasi", keterangan = campaign title, createdBy "sistem", campaignId linked) — no donor name in keuangan
   - Each campaign has its own kas: pemasukan from donations, pengeluaran can be recorded by admin per campaign
   - `kas_rw.campaignId` (nullable) links transactions to specific campaigns; null = kas umum RW
   - Financial integrity: sistem-created kas entries (from donasi) cannot be edited/deleted; confirmed donations cannot be reverted; duplicate kas prevention via status transition checks
   - Confirmed donations appear on public leaderboard (aggregated by donatur name, sorted by total)
   - Tables: `donasi_campaign`, `donasi`

## Pendataan Usaha (Business Registration)
- **Tables**: `usaha`, `karyawan_usaha`, `izin_tetangga`, `survey_usaha`, `riwayat_stiker`
- **Workflow**: Pendaftaran → Survey → Verifikasi → Disetujui/Ditolak
- **Multi-step registration form**: Data Pemilik → Data Usaha → Data Karyawan → Izin Tetangga (4 posisi wajib: kiri, kanan, depan, belakang)
- **Survey lapangan**: Admin records field survey (dampak lingkungan, kondisi, foto, rekomendasi layak/tidak layak)
- **Stiker management**: Auto-generated stiker number format `STK-RW03/XXXX/YYYY`, valid 6 months, renewable
- **Stiker numbering**: Collision-safe via DB transaction counting `riwayat_stiker` records
- **WA notifications**: Approval/rejection/renewal notifications sent to business owner
- **Stiker expiry scheduler**: H-30 and H-7 notifications for expiring stickers
- **Dashboard stats**: Total usaha, stiker aktif, stiker mendekati expired, status breakdown
- **All DB writes transactional**: Create/update usaha with karyawan and izin tetangga wrapped in transactions
- **Admin only**: All endpoints protected by `requireAdmin` middleware
- **File**: `client/src/pages/admin/kelola-usaha.tsx`
- **Constants**: `jenisUsahaOptions`, `modalUsahaOptions`, `omsetBulananOptions`, `lamaUsahaOptions`, `posisiTetanggaOptions`, `jabatanKaryawanOptions` in `constants.ts`

## Letter System
- **Surat Warga Flow (Manual)**: Warga fills detail form (jenis surat, perihal, keterangan detail) → WA notification to admin with full details → Admin processes surat manually → Admin inputs nomor surat manually → Approve/Reject → Admin uploads scanned surat file as arsip → Warga contacts admin via WA (085860604142) for pickup/info
  - No AI generation for surat warga — fully manual process
  - `surat_warga.fileSurat` stores uploaded scanned surat file path
  - Nomor surat entered manually by admin (no auto-numbering for surat warga)
  - Warga page shows "Hubungi Admin via WhatsApp" button instead of PDF download
- **Surat RW Flow**: Admin creates surat → Gemini AI generates → Nomor surat auto-assigned on creation (format: XXX/SK-RW/RW-03/MM/YYYY)
- **PDF for Surat RW**: Client-side PDF generation (`client/src/lib/pdf-surat.ts`) using jsPDF, used only for Surat RW and Bansos rekomendasi
- **Arsip Surat**: Admin archive showing approved surat warga (with scan file indicator) + surat RW, searchable and filterable
- **Upload Scan**: Admin uploads scanned surat file (JPG/PNG/PDF, max 10MB) stored in `uploads/surat/`

## File Upload System
- **Backend**: Multer middleware, files stored in `uploads/kk/`, `uploads/ktp/`, and `uploads/surat/` directories
- **Static serving**: `/uploads` path serves uploaded files via Express static middleware
- **Endpoints**: `POST /api/upload/kk/:kkId` and `POST /api/upload/ktp/:wargaId`
- **Limits**: 5MB max, accepts JPG/JPEG/PNG/PDF
- **Access control**: Warga can only upload for their own KK/KTP, admin can upload for any
- **Old file cleanup**: Previous file is deleted when replaced
- **DB columns**: `kartu_keluarga.foto_kk` and `warga.foto_ktp` store file paths
- **Upload sources**: Admin KK form, Admin Warga form, Warga profile page
- **Download**: Admin KK cards show download buttons for KK and KTP kepala keluarga when files exist

## Delete KK/Warga System
- **Delete KK**: Cascading transactional delete — removes all warga members, their laporan, surat_warga, profile_edit_requests, plus KK's donasi and pengajuan_bansos, all within a single DB transaction
- **Delete Warga**: Cascading transactional delete — removes laporan, surat_warga, profile_edit_requests for that warga
- **UI**: Red trash icon buttons on KK cards and warga cards, with AlertDialog confirmation showing detailed cascade warnings
- **Safety**: Full cascade info displayed, explicit "cannot be undone" warning

## Bansos Penerima Management
- **Add Penerima**: Direct from bansos page via "Tambah Penerima Bansos" button, select non-penerima KK + jenis bansos
- **Remove Penerima**: Per-card "Hapus" button with confirmation dialog, resets penerimaBansos to false and clears jenisBansos
- **Edit Jenis**: Inline edit on penerima cards to update jenis bansos types
- **Routes**: `POST /api/bansos/penerima/tambah`, `POST /api/bansos/penerima/hapus`, `PATCH /api/bansos/penerima/:kkId/jenis`

## KK Verification System
- **Verified** = foto KK uploaded + kepala keluarga has KTP uploaded + kepala keluarga has WA number + WA number not duplicated across warga
- **Unverified** = missing any of the above criteria; each missing item shown as reason
- **WA normalization**: strips non-digits, converts leading 0 to 62, ensures 62 prefix — consistent across duplicate detection and display
- **QR Code**: verified families get QR code button → opens dialog with downloadable QR (links to rw3padasukacimahi.org) for sticker use
- **Filter cards**: clickable stat cards at top to filter verified/unverified KK
- **Visual**: verified cards have green border + shield icon, unverified have amber border + warning reasons displayed

## Admin Dashboard Statistics
- **API**: `GET /api/stats/dashboard` (admin-only) — server-side aggregation of all stats
- **Summary cards**: Total KK, Total Warga, Pending Laporan, Pending Surat, Edit Profil Pending, Pengajuan Bansos
- **Ringkasan Keuangan**: Pemasukan, Pengeluaran, Saldo kas RW + Donasi summary (total masuk, donatur, campaign aktif, pending)
- **Ringkasan Layanan**: Status bars for Laporan, Surat Warga, Surat RW, Pengajuan Bansos
- **Warga demographics**: Jenis Kelamin (donut), Agama (bar), Status Perkawinan (donut), Kelompok Usia with descriptive labels (bar), Pendidikan (bar), Pekerjaan top 10 (bar), Kedudukan Keluarga (bar), Status Kependudukan (badges)
- **Data Keluarga**: Rata-rata anggota per KK, Kedudukan Keluarga, WhatsApp ownership, KTP ownership
- **Ownership stats**: WhatsApp, Foto KTP, Foto KK (pair stat bars)
- **KK/Rumah data**: Status Rumah (donut), Listrik (donut), Kondisi Bangunan (bar), Sumber Air (bar), Sanitasi (bar), Penerima Bansos (pair stat)
- **Per RT**: Enhanced breakdown with KK count, Warga count, Bansos count, gender ratio (L/P with percentage) per RT
- **Charts**: CSS-based (conic-gradient donuts, progress bar charts) — no external chart library

## Data Model (shared/schema.ts)
- `kartu_keluarga`: KK data with RT assignment, foto_kk for uploaded KK scan
- `warga`: Resident data linked to KK, foto_ktp for uploaded KTP scan, pendidikan (education level)
- `rt_data`: RT 01-07 with ketua names
- `laporan`: Reports from residents
- `surat_warga`: Letter requests (AI-generated)
- `surat_rw`: Official RW letters (Surat Sakti)
- `profile_edit_request`: Profile edit approval workflow
- `admin_user`: Admin accounts with bcrypt password hashes
- `wa_blast`: WA blast message history
- `pengajuan_bansos`: Bansos recommendation requests (rekomendasi penerima / rekomendasi coret)
- `donasi_campaign`: Donation campaigns created by admin (judul, deskripsi, targetDana, status aktif/selesai)
- `donasi`: Donation records from warga (campaignId, kkId, namaDonatur, jumlah, status pending/dikonfirmasi/ditolak)
- `kas_rw`: Financial transactions (tipe pemasukan/pengeluaran, kategori, jumlah, keterangan, tanggal, createdBy)
- `pemilik_kost`: Boarding house owners (nama_kost, nama_pemilik, nomor_wa_pemilik, rt, alamat_lengkap, jumlah_pintu)
- `warga_singgah`: Temporary residents (linked to pemilik_kost, nik unique, nomor_whatsapp, pekerjaan, tanggal_mulai/habis_kontrak, jumlah_penghuni, keperluan_tinggal, status aktif/nonaktif)
- `riwayat_kontrak`: Contract extension history (old/new start/end dates per warga_singgah)

## Warga Singgah System
- **Admin**: Kelola Pemilik Kost (CRUD boarding house owners), Kelola Warga Singgah (CRUD temporary residents with contract management)
  - Perpanjang kontrak: extend contract dates with history logging
  - Riwayat kontrak: view all contract extensions per resident
  - Search/filter by name, status
- **H-7 Notification**: Daily scheduler checks contracts expiring within 7 days, sends WhatsApp to penghuni + pemilik + admin (085860604142) asking about renewal
- **Warga Singgah Portal**: Beranda with contract countdown (days remaining, start/end dates, status badge green/amber/red), personal info, kost info; Laporan page for submitting reports
- **Keperluan Tinggal Options**: Kerja, Kuliah, Usaha, Lainnya
- **Dashboard Stats**: totalAktif, mendekatiHabis, sudahHabis, totalPemilikKost

## Keuangan Kas RW
- **Admin**: Full CRUD management of kas RW transactions at `/admin/keuangan`
  - Summary cards: Total Pemasukan, Total Pengeluaran, Saldo
  - Form input with tipe toggle (pemasukan/pengeluaran), kategori dropdown, jumlah, keterangan, tanggal
  - Kategori Pemasukan: Iuran Warga, Donasi, Infaq Surat, Sumbangan, Lainnya
  - Kategori Pengeluaran: Kegiatan RT/RW, Kebersihan, Keamanan, Pembangunan, Sosial, Operasional, Lainnya
  - Edit & delete with confirmation
  - Filter by tipe and kategori
- **Warga**: Read-only financial report at `/warga/keuangan`
  - Summary cards, filter by bulan/kategori
  - Ringkasan per kategori with progress bars
  - Riwayat transaksi list
- **API Routes**:
  - `GET /api/kas-rw` (admin-only) - all transactions
  - `POST /api/kas-rw` (admin-only) - create transaction
  - `PUT /api/kas-rw/:id` (admin-only) - update transaction
  - `DELETE /api/kas-rw/:id` (admin-only) - delete transaction
  - `GET /api/kas-rw/summary` (auth) - financial summary
  - `GET /api/kas-rw/laporan` (auth) - full report for warga

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
