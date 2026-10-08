/**
 * Akses modul wilayah — hanya dua role:
 *  - RT: sesi Ketua RT (akun rtjuara_rt_akun, PIN ter-hash, RT 01–07). Scope RT SELALU dari sesi.
 *  - RW: sesi admin RW (admin_user).
 */
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db";
import { isWilayahRt, type WilayahRole } from "@shared/wilayah";

export interface Aktor {
  role: WilayahRole;
  /** Nomor RT dari sesi (hanya role rt). */
  rt: number | null;
  label: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      aktor?: Aktor;
    }
  }
}

export const PESAN_RW_TIDAK_UBAH_MASTER =
  "Data warga, KK, rumah, dan usaha dikelola Ketua RT masing-masing. RW hanya dapat melihat.";

function aktorRt(req: Request): Aktor | null {
  const rt = req.session?.rtjuaraRt;
  if (!isWilayahRt(rt)) return null;
  return { role: "rt", rt, label: `Ketua RT ${String(rt).padStart(2, "0")}${req.session.rtjuaraNama ? ` (${req.session.rtjuaraNama})` : ""}` };
}

function aktorRw(req: Request): Aktor | null {
  if (!req.session?.isAdmin) return null;
  return { role: "rw", rt: null, label: req.session.adminNama || req.session.adminUsername || "Ketua RW" };
}

export function requireRtWilayah(req: Request, res: Response, next: NextFunction) {
  const a = aktorRt(req);
  if (!a) return res.status(401).json({ message: "Sesi Ketua RT tidak valid. Silakan masuk lagi." });
  req.aktor = a;
  next();
}

export function requireRwWilayah(req: Request, res: Response, next: NextFunction) {
  const a = aktorRw(req);
  if (!a) return res.status(401).json({ message: "Akses khusus Ketua RW" });
  req.aktor = a;
  next();
}

/** RT atau RW — handler wajib memeriksa scope dengan aktor.rt. */
export function requireRtAtauRw(req: Request, res: Response, next: NextFunction) {
  // Bila browser memegang dua sesi sah sekaligus, klien boleh memilih sesi mana yang dipakai (tidak menambah hak).
  const a = req.get("x-wilayah-peran") === "rw" ? aktorRw(req) ?? aktorRt(req) : aktorRt(req) ?? aktorRw(req);
  if (!a) return res.status(401).json({ message: "Silakan masuk sebagai Ketua RT atau Ketua RW" });
  req.aktor = a;
  next();
}

/** Penjaga endpoint lama yang mengubah master warga/KK: RW tidak menjadi operator edit master. */
export function tolakUbahMasterOlehRw(_req: Request, res: Response) {
  return res.status(403).json({ message: PESAN_RW_TIDAK_UBAH_MASTER });
}

export async function catatAudit(
  aktor: Aktor,
  aksi: string,
  entitas: string,
  entitasId: number | null,
  rt: number | null,
  sebelum?: unknown,
  sesudah?: unknown,
  client: { query: typeof pool.query } = pool,
) {
  await client.query(
    `INSERT INTO wil_audit (aktor_role, aktor_rt, aktor, aksi, entitas, entitas_id, rt, sebelum, sesudah)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [aktor.role, aktor.rt, aktor.label, aksi, entitas, entitasId, rt, sebelum == null ? null : JSON.stringify(sebelum), sesudah == null ? null : JSON.stringify(sesudah)],
  );
}

export class WilayahError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function kirimError(res: Response, error: unknown, fallback: string) {
  if (error instanceof WilayahError) return res.status(error.status).json({ message: error.message });
  const msg = error instanceof Error ? error.message : String(error);
  if (/relation "wil_\w+" does not exist/i.test(msg)) {
    console.error(`[wilayah] ${fallback}: skema belum terpasang —`, msg);
    return res.status(503).json({ message: "Modul wilayah sedang disiapkan. Muat ulang halaman sebentar lagi; bila tetap muncul, hubungi pengelola sistem." });
  }
  if (/ZodError|invalid_type|too_small|too_big/i.test(msg) || (error as { name?: string })?.name === "ZodError") {
    const issues = (error as { issues?: { message: string; path: (string | number)[] }[] }).issues;
    return res.status(400).json({ message: issues?.[0] ? `${issues[0].path.join(".")}: ${issues[0].message}` : "Isian tidak valid" });
  }
  console.error(`[wilayah] ${fallback}:`, msg);
  return res.status(500).json({ message: fallback });
}
