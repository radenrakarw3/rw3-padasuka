# Panduan UI Govtech — RW 03 Padasuka

## Prinsip

1. **Task-first** — Judul layanan memakai kata kerja + objek (contoh: "Laporkan masalah").
2. **Bahasa sederhana** — Kalimat pendek, hindari jargon admin.
3. **Progressive disclosure** — Form panjang dipecah langkah (stepper).
4. **Kepercayaan** — Logo RW, nama kelurahan, footer konsisten di kiosk publik.
5. **Hasil terukur** — Setelah submit: nomor referensi + langkah selanjutnya (`SuccessPanel`).

## Token

Gunakan utility Tailwind dari design system, hindari `hsl(163,...)` hardcoded di halaman:

- `bg-brand`, `text-brand`, `text-brand-accent-muted`
- `surface-kiosk` (gradient hero)
- `touch-target` (min 44px)
- `prose-gov` (teks instruksi)

## Komponen (`client/src/components/gov/`)

| Komponen | Kapan dipakai |
|----------|----------------|
| `ServiceCard` | Daftar layanan di landing / hub |
| `FormStepper` | Wizard multi-langkah |
| `StatusBadge` | Status RT, pengajuan Visit RW3 |
| `EmptyState` | Daftar kosong, nomor tidak ditemukan |
| `SuccessPanel` | Konfirmasi setelah submit |
| `StatusTimeline` | Lacak status pengajuan |

## Layout kiosk

`PublicKioskLayout` — variant `hero` (beranda) atau `service` (form/layanan).
