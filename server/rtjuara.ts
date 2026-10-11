/**
 * Akun & PIN Ketua RT untuk login portal /rt. Nama tabel `rtjuara_rt_akun` dipertahankan agar data lama tetap dipakai.
 */
import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { rtjuaraRtAkun, upsertRtjuaraAkunSchema } from "@shared/schema";
import { RTJUARA_RT_NUMBERS } from "@shared/rtjuara";

const BCRYPT_ROUNDS = 10;

export async function ensureRtjuaraSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rtjuara_rt_akun (
      id serial PRIMARY KEY,
      rt integer NOT NULL UNIQUE,
      nama_ketua text NOT NULL,
      nomor_whatsapp text,
      pin_hash text NOT NULL,
      aktif boolean NOT NULL DEFAULT true,
      last_login_at timestamp,
      created_at timestamp DEFAULT now()
    );
  `);
}

// ===================== AKUN KETUA RT =====================

export type AkunView = {
  rt: number;
  namaKetua: string;
  nomorWhatsapp: string | null;
  aktif: boolean;
  lastLoginAt: Date | null;
  sudahDiatur: boolean;
};

export async function listAkun(): Promise<AkunView[]> {
  const rows = await db.select().from(rtjuaraRtAkun).orderBy(asc(rtjuaraRtAkun.rt));
  const byRt = new Map(rows.map((r) => [r.rt, r]));
  return RTJUARA_RT_NUMBERS.map((rt) => {
    const row = byRt.get(rt);
    return {
      rt: rt as number,
      namaKetua: row?.namaKetua ?? "",
      nomorWhatsapp: row?.nomorWhatsapp ?? null,
      aktif: row?.aktif ?? false,
      lastLoginAt: row?.lastLoginAt ?? null,
      sudahDiatur: !!row,
    };
  });
}

export async function upsertAkun(input: unknown): Promise<AkunView> {
  const parsed = upsertRtjuaraAkunSchema.parse(input);
  const [existing] = await db.select().from(rtjuaraRtAkun).where(eq(rtjuaraRtAkun.rt, parsed.rt));

  if (!existing && !parsed.pin) {
    throw new Error("PIN 6 digit wajib diisi saat membuat akun ketua RT baru");
  }

  const pinHash = parsed.pin ? await bcrypt.hash(parsed.pin, BCRYPT_ROUNDS) : existing!.pinHash;

  if (existing) {
    await db
      .update(rtjuaraRtAkun)
      .set({
        namaKetua: parsed.namaKetua.trim(),
        nomorWhatsapp: parsed.nomorWhatsapp?.trim() || null,
        pinHash,
        aktif: parsed.aktif ?? existing.aktif,
      })
      .where(eq(rtjuaraRtAkun.rt, parsed.rt));
  } else {
    await db.insert(rtjuaraRtAkun).values({
      rt: parsed.rt,
      namaKetua: parsed.namaKetua.trim(),
      nomorWhatsapp: parsed.nomorWhatsapp?.trim() || null,
      pinHash,
      aktif: parsed.aktif ?? true,
    });
  }

  const semua = await listAkun();
  return semua.find((a) => a.rt === parsed.rt)!;
}

export async function hapusAkun(rt: number): Promise<boolean> {
  const deleted = await db
    .delete(rtjuaraRtAkun)
    .where(eq(rtjuaraRtAkun.rt, rt))
    .returning({ id: rtjuaraRtAkun.id });
  return deleted.length > 0;
}

/** Verifikasi PIN ketua RT. Mengembalikan null bila RT/PIN salah atau akun nonaktif. */
export async function verifikasiLogin(rt: number, pin: string): Promise<{ rt: number; namaKetua: string } | null> {
  const [akun] = await db.select().from(rtjuaraRtAkun).where(eq(rtjuaraRtAkun.rt, rt));
  if (!akun || !akun.aktif) return null;
  const cocok = await bcrypt.compare(pin, akun.pinHash);
  if (!cocok) return null;
  await db.update(rtjuaraRtAkun).set({ lastLoginAt: new Date() }).where(eq(rtjuaraRtAkun.rt, rt));
  return { rt: akun.rt, namaKetua: akun.namaKetua };
}

export async function getAkunRingkas(rt: number): Promise<{ rt: number; namaKetua: string } | null> {
  const [akun] = await db
    .select({ rt: rtjuaraRtAkun.rt, namaKetua: rtjuaraRtAkun.namaKetua, aktif: rtjuaraRtAkun.aktif })
    .from(rtjuaraRtAkun)
    .where(eq(rtjuaraRtAkun.rt, rt));
  if (!akun || !akun.aktif) return null;
  return { rt: akun.rt, namaKetua: akun.namaKetua };
}

/** Daftar RT yang sudah punya akun aktif — dipakai halaman login (tanpa membocorkan PIN). */
export async function listRtLogin(): Promise<{ rt: number; namaKetua: string }[]> {
  const rows = await db
    .select({ rt: rtjuaraRtAkun.rt, namaKetua: rtjuaraRtAkun.namaKetua })
    .from(rtjuaraRtAkun)
    .where(eq(rtjuaraRtAkun.aktif, true))
    .orderBy(asc(rtjuaraRtAkun.rt));
  return rows;
}
