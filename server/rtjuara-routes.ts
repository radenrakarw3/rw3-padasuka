import type { Express, Request, Response, NextFunction } from "express";
import { RTJUARA_API, RTJUARA_ROLE } from "@shared/rtjuara-api";
import { isRtjuaraRt } from "@shared/rtjuara";
import { rtjuaraLoginSchema } from "@shared/schema";
import { visitrw3ApiErrorMessage } from "./visitrw3-api-error";
import { saveSession } from "./session-save";
import {
  ensureRtjuaraSchema,
  hapusAkun,
  listAkun,
  listRtLogin,
  upsertAkun,
  verifikasiLogin,
} from "./rtjuara";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  return req.ip || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function requireRt(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.rtjuaraRt) {
    return res.status(401).json({ message: "Sesi ketua RT tidak valid. Silakan login ulang." });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdmin) return res.status(401).json({ message: "Akses admin diperlukan" });
  next();
}

function parseRtQuery(raw: unknown): number | null {
  if (raw == null || raw === "" || raw === "semua") return null;
  const n = Number(raw);
  return Number.isFinite(n) && isRtjuaraRt(n) ? n : null;
}

/** Login Ketua RT (portal /rt) dan pengelolaan akun/PIN oleh admin RW. */
export async function registerRtjuaraRoutes(app: Express) {
  await ensureRtjuaraSchema().catch((error) => {
    console.error("[AKUN RT] Schema init error:", error);
  });

  app.get(RTJUARA_API.ping, (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // ===================== AUTH KETUA RT =====================

  app.get(RTJUARA_API.auth.rtList, async (_req, res) => {
    try {
      res.json(await listRtLogin());
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat daftar RT") });
    }
  });

  app.post(RTJUARA_API.auth.login, async (req, res) => {
    try {
      if (!checkRateLimit(getClientIp(req))) {
        return res.status(429).json({ message: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
      }
      const { rt, pin } = rtjuaraLoginSchema.parse(req.body);
      const akun = await verifikasiLogin(rt, pin);
      if (!akun) {
        return res.status(401).json({ message: "RT atau PIN salah, atau akun belum diaktifkan admin RW" });
      }
      req.session.rtjuaraRt = akun.rt;
      req.session.rtjuaraNama = akun.namaKetua;
      req.session.rtjuaraLoginAt = Date.now();
      await saveSession(req);
      res.json({ ok: true, rt: akun.rt, namaKetua: akun.namaKetua, role: RTJUARA_ROLE });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Login gagal") });
    }
  });

  app.post(RTJUARA_API.auth.logout, async (req, res) => {
    req.session.rtjuaraRt = undefined;
    req.session.rtjuaraNama = undefined;
    req.session.rtjuaraLoginAt = undefined;
    try {
      await saveSession(req);
    } catch {
      /* tetap keluar di sisi client */
    }
    res.json({ ok: true });
  });

  app.get(RTJUARA_API.auth.me, requireRt, (req, res) => {
    res.json({
      ok: true,
      role: RTJUARA_ROLE,
      rt: req.session.rtjuaraRt,
      namaKetua: req.session.rtjuaraNama ?? null,
    });
  });

  // ===================== AKUN KETUA RT (ADMIN RW) =====================

  app.get(RTJUARA_API.admin.akun, requireAdmin, async (_req, res) => {
    try {
      res.json(await listAkun());
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat akun ketua RT") });
    }
  });

  app.post(RTJUARA_API.admin.akun, requireAdmin, async (req, res) => {
    try {
      res.json(await upsertAkun(req.body));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menyimpan akun ketua RT") });
    }
  });

  app.delete("/api/admin/rtjuara/akun/:rt", requireAdmin, async (req, res) => {
    try {
      const rt = parseRtQuery(req.params.rt);
      if (!rt) return res.status(400).json({ message: "RT tidak valid" });
      const ok = await hapusAkun(rt);
      if (!ok) return res.status(404).json({ message: "Akun RT tidak ditemukan" });
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menghapus akun ketua RT") });
    }
  });
}

export { ensureRtjuaraSchema };
