/**
 * Akses modul wilayah — hanya admin RW (sesi admin_user). Portal Ketua RT sudah dihapus.
 *  - RW: membaca semua RT.
 *  - Kelola RT: admin RW yang mengubah data atas nama satu RT (header X-Wilayah-Rt). Aktor ber-role "rt"
 *    agar seluruh pemeriksaan scope RT tetap berlaku; label audit tetap menyebut admin RW.
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

function aktorRw(req: Request): Aktor | null {
  if (!req.session?.isAdmin) return null;
  return { role: "rw", rt: null, label: req.session.adminNama || req.session.adminUsername || "Ketua RW" };
}

function aktorKelolaRt(req: Request): Aktor | null {
  const rw = aktorRw(req);
  const rt = Number(req.get("x-wilayah-rt"));
  if (!rw || !isWilayahRt(rt)) return null;
  return { role: "rt", rt, label: `${rw.label} (kelola RT ${String(rt).padStart(2, "0")})` };
}

/** Ubah data atas nama satu RT — wajib sesi admin RW + header X-Wilayah-Rt. */
export function requireRtWilayah(req: Request, res: Response, next: NextFunction) {
  if (!aktorRw(req)) return res.status(401).json({ message: "Akses khusus Ketua RW" });
  const a = aktorKelolaRt(req);
  if (!a) return res.status(400).json({ message: "Pilih RT terlebih dahulu" });
  req.aktor = a;
  next();
}

export function requireRwWilayah(req: Request, res: Response, next: NextFunction) {
  const a = aktorRw(req);
  if (!a) return res.status(401).json({ message: "Akses khusus Ketua RW" });
  req.aktor = a;
  next();
}

/** Baca: RW melihat semua RT; dengan header X-Wilayah-Rt dibatasi ke RT yang sedang dikelola. */
export function requireRtAtauRw(req: Request, res: Response, next: NextFunction) {
  const a = req.get("x-wilayah-peran") === "rw" ? aktorRw(req) : aktorKelolaRt(req) ?? aktorRw(req);
  if (!a) return res.status(401).json({ message: "Akses khusus Ketua RW" });
  req.aktor = a;
  next();
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
  if (/(Dokumen final|Berkas PDF final) tidak dapat diubah/.test(msg)) return res.status(409).json({ message: "Dokumen final tidak dapat diubah. Batalkan dokumen lalu buat dokumen baru (bisa disalin)." });
  if (/relation "wil_\w+" does not exist|column "?[\w.]+"? (of relation "\w+" )?does not exist/i.test(msg)) {
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
