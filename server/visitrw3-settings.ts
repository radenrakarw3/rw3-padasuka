import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import { visitrw3Settings } from "@shared/schema";
import {
  parseKontribusiSettings,
  hitungEstimasiPenyewa,
  hitungEstimasiPemilik,
  type KontribusiRincian,
} from "@shared/visitrw3-kontribusi";
import { hitungTanggalBerlaku } from "@shared/visitrw3-kontribusi";

export const VISITRW3_SETTING_KEYS = [
  "tier_pintu_sedang_min",
  "tier_pintu_besar_min",
  "fee_bisnis_lapak_per_hari",
  "fee_bisnis_kiosk_per_hari",
  "fee_bisnis_lain_per_hari",
  "fee_bisnis_per_hari",
  "fee_kost_kecil_per_unit_bulan",
  "fee_kost_sedang_per_unit_bulan",
  "fee_kost_besar_per_unit_bulan",
  "fee_kost_per_unit_bulan",
  "fee_kontrakan_kecil_per_unit_bulan",
  "fee_kontrakan_sedang_per_unit_bulan",
  "fee_kontrakan_besar_per_unit_bulan",
  "fee_kontrakan_per_unit_bulan",
  "fee_pemilik_lapak_per_bulan",
  "fee_pemilik_kiosk_per_bulan",
  "fee_pemilik_kost_kecil_per_bulan",
  "fee_pemilik_kost_sedang_per_bulan",
  "fee_pemilik_kost_besar_per_bulan",
  "fee_pemilik_kontrakan_kecil_per_bulan",
  "fee_pemilik_kontrakan_sedang_per_bulan",
  "fee_pemilik_kontrakan_besar_per_bulan",
  "fee_pemilik_per_bulan",
  "tata_tertib_penyewa",
  "tata_tertib_pemilik",
  "tata_tertib_masyarakat",
] as const;

export type Visitrw3SettingKey = (typeof VISITRW3_SETTING_KEYS)[number];

const FEE_KEYS = new Set(
  VISITRW3_SETTING_KEYS.filter((k) => k.startsWith("fee_") || k.startsWith("tier_pintu")),
);

const DEFAULT_TATA_MASYARAKAT = `Ketentuan bermasyarakat di lingkungan RW:

1. Warga wajib menjaga ketertiban, kebersihan lingkungan, dan sikap toleransi antarwarga.
2. Kontribusi lingkungan (jika ada) mengikuti ketentuan RW dan ditetapkan setelah penyesuaian/survey apabila diperlukan.
3. Apabila terdapat laporan dari warga, Ketua RW berhak menegur, memanggil pihak terkait, dan menyelesaikan perselisihan melalui musyawarah sesuai peraturan RW.`;

const DEFAULT_TATA_PENYEWA = `Syarat dan tata tertib penyewa / pengguna layanan Visit RW3:

1. Data yang diajukan harus benar dan dapat dipertanggungjawabkan.
2. Penyewa wajib mematuhi peraturan properti dan lingkungan RW.
3. Besaran kontribusi ditetapkan pengurus RW setelah survey, mengacu tarif jenis usaha (lapak/kiosk/lain) atau ukuran properti (pintu: kecil/sedang/besar).
4. Satu pengajuan = satu unit (kamar/lokasi); tarif tinggal mengacu pada skala properti tempat Anda mengajukan.`;

const DEFAULT_TATA_PEMILIK = `Syarat pendaftaran properti (pemilik):

1. Pemilik atau penanggung jawab wajib memberikan data properti yang akurat (termasuk jumlah pintu/unit).
2. Properti yang terdaftar dapat diverifikasi oleh pengurus RW.
3. Besaran kontribusi ditetapkan pengurus RW setelah verifikasi/survey, mengacu jenis properti dan skala jumlah pintu.`;

const SEED_DEFAULTS: { key: Visitrw3SettingKey; value: string; label: string; keterangan?: string }[] = [
  { key: "tier_pintu_sedang_min", value: "6", label: "Batas pintu — ukuran sedang", keterangan: "Mulai ukuran sedang (pintu ≥ nilai ini)" },
  { key: "tier_pintu_besar_min", value: "16", label: "Batas pintu — ukuran besar", keterangan: "Mulai ukuran besar (pintu ≥ nilai ini)" },
  { key: "fee_bisnis_lapak_per_hari", value: "3000", label: "Bisnis lapak — per hari" },
  { key: "fee_bisnis_kiosk_per_hari", value: "5000", label: "Bisnis kiosk — per hari" },
  { key: "fee_bisnis_lain_per_hari", value: "8000", label: "Bisnis lainnya — per hari" },
  { key: "fee_bisnis_per_hari", value: "5000", label: "(Legacy) Bisnis per hari", keterangan: "Cadangan jika tarif tier belum diisi" },
  { key: "fee_kost_kecil_per_unit_bulan", value: "8000", label: "Kost kecil — per unit/bulan" },
  { key: "fee_kost_sedang_per_unit_bulan", value: "10000", label: "Kost sedang — per unit/bulan" },
  { key: "fee_kost_besar_per_unit_bulan", value: "12000", label: "Kost besar — per unit/bulan" },
  { key: "fee_kost_per_unit_bulan", value: "10000", label: "(Legacy) Kost per unit/bulan" },
  { key: "fee_kontrakan_kecil_per_unit_bulan", value: "12000", label: "Kontrakan kecil — per unit/bulan" },
  { key: "fee_kontrakan_sedang_per_unit_bulan", value: "15000", label: "Kontrakan sedang — per unit/bulan" },
  { key: "fee_kontrakan_besar_per_unit_bulan", value: "18000", label: "Kontrakan besar — per unit/bulan" },
  { key: "fee_kontrakan_per_unit_bulan", value: "15000", label: "(Legacy) Kontrakan per unit/bulan" },
  { key: "fee_pemilik_lapak_per_bulan", value: "30000", label: "Pemilik lapak — per bulan" },
  { key: "fee_pemilik_kiosk_per_bulan", value: "35000", label: "Pemilik kiosk — per bulan" },
  { key: "fee_pemilik_kost_kecil_per_bulan", value: "40000", label: "Pemilik kost kecil — per bulan" },
  { key: "fee_pemilik_kost_sedang_per_bulan", value: "50000", label: "Pemilik kost sedang — per bulan" },
  { key: "fee_pemilik_kost_besar_per_bulan", value: "65000", label: "Pemilik kost besar — per bulan" },
  { key: "fee_pemilik_kontrakan_kecil_per_bulan", value: "50000", label: "Pemilik kontrakan kecil — per bulan" },
  { key: "fee_pemilik_kontrakan_sedang_per_bulan", value: "65000", label: "Pemilik kontrakan sedang — per bulan" },
  { key: "fee_pemilik_kontrakan_besar_per_bulan", value: "80000", label: "Pemilik kontrakan besar — per bulan" },
  { key: "fee_pemilik_per_bulan", value: "50000", label: "(Legacy) Pemilik per bulan" },
  { key: "tata_tertib_masyarakat", value: DEFAULT_TATA_MASYARAKAT, label: "Tata tertib masyarakat" },
  { key: "tata_tertib_penyewa", value: DEFAULT_TATA_PENYEWA, label: "Tata tertib penyewa" },
  { key: "tata_tertib_pemilik", value: DEFAULT_TATA_PEMILIK, label: "Tata tertib pemilik properti" },
];

export async function seedVisitrw3Settings() {
  for (const s of SEED_DEFAULTS) {
    await pool.query(
      `INSERT INTO visitrw3_settings (key, value, label, keterangan)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO NOTHING`,
      [s.key, s.value, s.label, s.keterangan ?? null],
    );
  }
}

/** Hanya tabel pengaturan — jangan panggil ensureVisitrw3Schema penuh saat load settings (bisa hang). */
export async function ensureVisitrw3SettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitrw3_settings (
      id serial PRIMARY KEY,
      key text NOT NULL UNIQUE,
      value text NOT NULL,
      label text NOT NULL,
      keterangan text,
      updated_at timestamp DEFAULT now()
    );
  `);
  await seedVisitrw3Settings();
}

export async function getVisitrw3Settings() {
  const result = await pool.query<{
    id: number;
    key: string;
    value: string;
    label: string;
    keterangan: string | null;
    updated_at: Date | null;
  }>(`SELECT id, key, value, label, keterangan, updated_at FROM visitrw3_settings ORDER BY key`);
  return result.rows.map((r) => ({
    id: r.id,
    key: r.key,
    value: r.value,
    label: r.label,
    keterangan: r.keterangan,
    updatedAt: r.updated_at,
  }));
}

export type Visitrw3SettingRow = Awaited<ReturnType<typeof getVisitrw3Settings>>[number];

/** Muat pengaturan; recovery ringan jika tabel belum ada. */
export async function loadVisitrw3SettingsRows(): Promise<Visitrw3SettingRow[]> {
  try {
    let rows = await getVisitrw3Settings();
    if (rows.length === 0) {
      await seedVisitrw3Settings();
      rows = await getVisitrw3Settings();
    }
    return rows;
  } catch {
    await ensureVisitrw3SettingsTable();
    let rows = await getVisitrw3Settings();
    if (rows.length === 0) {
      await seedVisitrw3Settings();
      rows = await getVisitrw3Settings();
    }
    return rows;
  }
}

export async function getSettingsVersi(): Promise<string> {
  const rows = await getVisitrw3Settings();
  let max = "";
  for (const r of rows) {
    if (!r.updatedAt) continue;
    const iso = r.updatedAt.toISOString();
    if (iso > max) max = iso;
  }
  return max || new Date().toISOString();
}

export async function getKontribusiSettings() {
  const rows = await getVisitrw3Settings();
  return parseKontribusiSettings(rows.map((r) => ({ key: r.key, value: r.value })));
}

export function validateSettingValue(key: string, value: string) {
  if (!VISITRW3_SETTING_KEYS.includes(key as Visitrw3SettingKey)) {
    throw new Error("Pengaturan tidak dikenal");
  }
  if (FEE_KEYS.has(key as Visitrw3SettingKey)) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) throw new Error("Tarif harus bilangan bulat ≥ 0");
    if (key === "tier_pintu_sedang_min" && n < 2) throw new Error("Batas sedang minimal 2");
    if (key === "tier_pintu_besar_min" && n < 3) throw new Error("Batas besar minimal 3");
    return String(n);
  }
  if (value.length > 20000) throw new Error("Teks terlalu panjang (maks. 20.000 karakter)");
  return value;
}

export async function upsertVisitrw3Setting(key: string, value: string) {
  const clean = validateSettingValue(key, value);
  const existing = await db.select().from(visitrw3Settings).where(eq(visitrw3Settings.key, key)).limit(1);
  if (existing[0]) {
    const [row] = await db
      .update(visitrw3Settings)
      .set({ value: clean, updatedAt: new Date() })
      .where(eq(visitrw3Settings.key, key))
      .returning();
    return row;
  }
  const seed = SEED_DEFAULTS.find((s) => s.key === key);
  const [row] = await db
    .insert(visitrw3Settings)
    .values({
      key,
      value: clean,
      label: seed?.label ?? key,
      keterangan: seed?.keterangan ?? null,
    })
    .returning();
  return row;
}

export async function assertKontribusiPengajuan(input: {
  setujuTataTertib: boolean;
  settingsVersi: string;
  estimasiKontribusi: number;
  keperluanPengajuan: "tinggal" | "bisnis";
  jenisProperti?: string | null;
  jenisTempatUsaha?: string | null;
  jumlahPintu?: number | null;
  tanggalBayar: string;
  terminBulan: number;
}) {
  if (!input.setujuTataTertib) throw new Error("Anda harus menyetujui syarat dan tata tertib");
  const currentVersi = await getSettingsVersi();
  if (input.settingsVersi !== currentVersi) {
    throw new Error("Pengaturan kontribusi telah diperbarui. Muat ulang halaman dan setujui kembali.");
  }
  const settings = await getKontribusiSettings();
  const tanggalBerlakuSampai = hitungTanggalBerlaku(input.tanggalBayar, input.terminBulan);
  const rincian = hitungEstimasiPenyewa({
    keperluan: input.keperluanPengajuan,
    jenisProperti: input.jenisProperti,
    jenisTempatUsaha: input.jenisTempatUsaha,
    jumlahPintu: input.jumlahPintu,
    tanggalBayar: input.tanggalBayar,
    tanggalBerlakuSampai,
    terminBulan: input.terminBulan,
    settings,
  });
  if (!rincian) {
    throw new Error("Data kontribusi tidak lengkap (jenis usaha atau properti)");
  }
  if (input.estimasiKontribusi !== rincian.total) {
    throw new Error("Estimasi kontribusi tidak sesuai. Muat ulang halaman.");
  }
  return { rincian, settingsVersi: currentVersi };
}

export async function assertKontribusiPemilik(input: {
  setujuTataTertib: boolean;
  settingsVersi: string;
  estimasiKontribusi: number;
  jenisProperti: string;
  jumlahPintu: number;
}) {
  if (!input.setujuTataTertib) throw new Error("Anda harus menyetujui syarat dan tata tertib");
  const currentVersi = await getSettingsVersi();
  if (input.settingsVersi !== currentVersi) {
    throw new Error("Pengaturan kontribusi telah diperbarui. Muat ulang halaman dan setujui kembali.");
  }
  const settings = await getKontribusiSettings();
  const rincian = hitungEstimasiPemilik({
    jenisProperti: input.jenisProperti,
    jumlahPintu: input.jumlahPintu,
    settings,
  });
  if (input.estimasiKontribusi !== rincian.total) {
    throw new Error("Estimasi kontribusi tidak sesuai. Muat ulang halaman.");
  }
  return { rincian, settingsVersi: currentVersi };
}

export function serializeRincian(r: KontribusiRincian) {
  return JSON.stringify(r);
}
