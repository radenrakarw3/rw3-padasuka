import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { invalidateKk, invalidateWarga } from "./cache";
import {
  insertKkSchema,
  patchKkSchema,
  insertWargaSchema,
  insertBlusukanKunjunganSchema,
  BLUSUKAN_HASIL,
} from "@shared/schema";
import { BLUSUKAN_API, BLUSUKAN_ROLE } from "@shared/blusukan-api";
import { isActiveRt } from "@shared/rt";
import {
  ensureBlusukanSchema,
  getBlusukanDashboard,
  listBlusukanKeluarga,
  searchBlusukanWarga,
  getBlusukanKkDetail,
  assertKkInBlusukanScope,
  BLUSUKAN_KELUARGA_DEFAULT_LIMIT,
  BLUSUKAN_KELUARGA_MAX_LIMIT,
} from "./blusukan";
import { saveSession } from "./session-save";

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

function getExpectedPin(): string {
  return process.env.BLUSUKAN_PIN || "664599";
}

function verifyPin(pin: string): boolean {
  const expected = getExpectedPin();
  if (pin.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
  } catch {
    return false;
  }
}

function requireBlusukan(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.blusukanAuth) {
    return res.status(401).json({ message: "Sesi Blusukan RW tidak valid" });
  }
  next();
}

function parseRtFilter(raw: unknown): number | undefined {
  if (raw == null || String(raw).trim() === "" || String(raw) === "semua") return undefined;
  const rt = parseInt(String(raw), 10);
  return isActiveRt(rt) ? rt : undefined;
}

function parsePageQuery(raw: unknown): number {
  const page = parseInt(String(raw ?? "1"), 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

function parseLimitQuery(raw: unknown): number {
  const limit = parseInt(String(raw ?? BLUSUKAN_KELUARGA_DEFAULT_LIMIT), 10);
  if (!Number.isFinite(limit) || limit < 1) return BLUSUKAN_KELUARGA_DEFAULT_LIMIT;
  return Math.min(limit, BLUSUKAN_KELUARGA_MAX_LIMIT);
}

function applyWargaVerifikasiAutoDate(before: { statusVerifikasiData: string | null }, body: Record<string, unknown>) {
  const next = { ...body };
  if (
    next.statusVerifikasiData === "Sudah Diverifikasi" &&
    before.statusVerifikasiData !== "Sudah Diverifikasi" &&
    !next.tanggalVerifikasiData
  ) {
    next.tanggalVerifikasiData = new Date().toISOString().slice(0, 10);
  }
  return next;
}

const loginSchema = z.object({
  pin: z.string().length(6, "PIN harus 6 digit").regex(/^\d+$/, "PIN harus angka"),
});

const kunjunganSchema = insertBlusukanKunjunganSchema;

export async function registerBlusukanRoutes(app: Express) {
  void ensureBlusukanSchema().catch((err) => {
    console.error("[Blusukan] Schema init error:", err);
  });

  app.post(BLUSUKAN_API.auth.login, async (req, res) => {
    try {
      const ip = getClientIp(req);
      if (!checkRateLimit(ip)) {
        return res.status(429).json({ message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." });
      }
      const { pin } = loginSchema.parse(req.body);
      if (!verifyPin(pin)) {
        return res.status(401).json({ message: "PIN salah" });
      }
      if (!req.session) {
        return res.status(500).json({ message: "Sesi server belum siap. Muat ulang halaman." });
      }
      req.session.blusukanAuth = true;
      req.session.blusukanLoginAt = Date.now();
      await saveSession(req);
      res.json({ ok: true, role: BLUSUKAN_ROLE, masterData: true, authenticated: true });
    } catch (error: unknown) {
      const message = error instanceof z.ZodError ? error.errors[0]?.message : "Login gagal";
      res.status(400).json({ message });
    }
  });

  app.post(BLUSUKAN_API.auth.logout, async (req, res) => {
    try {
      if (req.session) {
        req.session.blusukanAuth = false;
        req.session.blusukanLoginAt = undefined;
        await saveSession(req);
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Gagal logout" });
    }
  });

  app.get(BLUSUKAN_API.auth.me, (req, res) => {
    if (!req.session?.blusukanAuth) {
      return res.status(401).json({ message: "Belum login" });
    }
    return res.json({
      ok: true,
      role: BLUSUKAN_ROLE,
      masterData: true,
      scope: "RT 01–04 (pemukiman)",
    });
  });

  app.get(BLUSUKAN_API.dashboard, requireBlusukan, async (req, res) => {
    try {
      const rtFilter = parseRtFilter(req.query.rt);
      const data = await getBlusukanDashboard(rtFilter);
      res.json(data);
    } catch {
      res.status(500).json({ message: "Gagal memuat dashboard" });
    }
  });

  app.get(BLUSUKAN_API.keluarga, requireBlusukan, async (req, res) => {
    try {
      const rtFilter = parseRtFilter(req.query.rt);
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const page = parsePageQuery(req.query.page);
      const limit = parseLimitQuery(req.query.limit);
      const result = await listBlusukanKeluarga(rtFilter, q, page, limit);
      res.json(result);
    } catch {
      res.status(500).json({ message: "Gagal memuat daftar keluarga" });
    }
  });

  app.get(BLUSUKAN_API.cari, requireBlusukan, async (req, res) => {
    try {
      const q = String(req.query.q || "");
      const rows = await searchBlusukanWarga(q);
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Gagal mencari warga" });
    }
  });

  /** Master data: daftar KK pemukiman. */
  app.get(BLUSUKAN_API.kkList, requireBlusukan, async (_req, res) => {
    try {
      const data = await storage.getAllKkPemukiman();
      res.json(data);
    } catch {
      res.status(500).json({ message: "Gagal memuat daftar KK" });
    }
  });

  app.post(BLUSUKAN_API.kkList, requireBlusukan, async (req, res) => {
    try {
      const parsed = insertKkSchema.parse(req.body);
      const data = await storage.createKk(parsed);
      invalidateKk();
      invalidateWarga();
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal menambah KK";
      res.status(400).json({ message });
    }
  });

  app.get(BLUSUKAN_API.kk(":id"), requireBlusukan, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });
      const detail = await getBlusukanKkDetail(id);
      if (!detail) return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });
      res.json(detail);
    } catch {
      res.status(500).json({ message: "Gagal memuat detail KK" });
    }
  });

  app.patch(BLUSUKAN_API.kk(":id"), requireBlusukan, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const kk = await storage.getKkById(id);
      if (!assertKkInBlusukanScope(kk)) {
        return res.status(404).json({ message: "KK tidak ditemukan" });
      }
      const parsed = patchKkSchema.parse(req.body);
      const data = await storage.updateKk(id, parsed);
      invalidateKk();
      invalidateWarga();
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal memperbarui KK";
      res.status(400).json({ message });
    }
  });

  app.delete(BLUSUKAN_API.kk(":id"), requireBlusukan, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const kk = await storage.getKkById(id);
      if (!assertKkInBlusukanScope(kk)) {
        return res.status(404).json({ message: "KK tidak ditemukan" });
      }
      await storage.deleteKk(id);
      invalidateKk();
      invalidateWarga();
      res.json({ message: "KK dan semua data terkait berhasil dihapus" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal menghapus KK";
      res.status(500).json({ message });
    }
  });

  app.get(BLUSUKAN_API.wargaByKk(":kkId"), requireBlusukan, async (req, res) => {
    try {
      const kkId = parseInt(req.params.kkId as string, 10);
      const kk = await storage.getKkById(kkId);
      if (!assertKkInBlusukanScope(kk)) {
        return res.status(404).json({ message: "KK tidak ditemukan" });
      }
      const data = await storage.getWargaByKkId(kkId);
      res.json(data);
    } catch {
      res.status(500).json({ message: "Gagal memuat warga" });
    }
  });

  app.post(BLUSUKAN_API.wargaCreate, requireBlusukan, async (req, res) => {
    try {
      const targetKk = await storage.getKkById(Number(req.body.kkId));
      if (!assertKkInBlusukanScope(targetKk)) {
        return res.status(400).json({ message: "KK harus di RT 01–04" });
      }
      const parsed = insertWargaSchema.parse(req.body);
      const data = await storage.createWarga(parsed);
      invalidateWarga();
      invalidateKk();
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal menambah warga";
      res.status(400).json({ message });
    }
  });

  app.patch(BLUSUKAN_API.warga(":id"), requireBlusukan, async (req, res) => {
    try {
      const wargaId = parseInt(req.params.id as string, 10);
      const before = await storage.getWargaById(wargaId);
      if (!before) return res.status(404).json({ message: "Warga tidak ditemukan" });

      const sourceKk = await storage.getKkById(before.kkId);
      if (!assertKkInBlusukanScope(sourceKk)) {
        return res.status(403).json({ message: "Warga di luar wilayah RT 01–04" });
      }

      const body = applyWargaVerifikasiAutoDate(before, req.body as Record<string, unknown>);
      const targetKkId = body.kkId != null ? Number(body.kkId) : before.kkId;
      if (targetKkId !== before.kkId) {
        const targetKk = await storage.getKkById(targetKkId);
        if (!assertKkInBlusukanScope(targetKk)) {
          return res.status(400).json({ message: "KK tujuan harus di RT 01–04" });
        }
      }

      const parsed = insertWargaSchema.parse({
        ...before,
        ...body,
        kkId: targetKkId,
        id: undefined,
        createdAt: undefined,
      });
      const data = await storage.updateWarga(wargaId, parsed);
      invalidateWarga();
      invalidateKk();
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal memperbarui warga";
      res.status(400).json({ message });
    }
  });

  app.delete(BLUSUKAN_API.warga(":id"), requireBlusukan, async (req, res) => {
    try {
      const wargaId = parseInt(req.params.id as string, 10);
      const w = await storage.getWargaById(wargaId);
      if (!w) return res.status(404).json({ message: "Warga tidak ditemukan" });
      const kk = await storage.getKkById(w.kkId);
      if (!assertKkInBlusukanScope(kk)) {
        return res.status(404).json({ message: "Warga tidak ditemukan" });
      }
      await storage.deleteWarga(wargaId);
      invalidateWarga();
      invalidateKk();
      res.json({ message: "Warga dan semua data terkait berhasil dihapus" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal menghapus warga";
      res.status(500).json({ message });
    }
  });

  app.post(BLUSUKAN_API.kunjungan, requireBlusukan, async (req, res) => {
    try {
      const parsed = kunjunganSchema.parse(req.body);
      const kk = await storage.getKkById(parsed.kkId);
      if (!assertKkInBlusukanScope(kk)) {
        return res.status(404).json({ message: "KK tidak ditemukan" });
      }
      if (!BLUSUKAN_HASIL.includes(parsed.hasil as (typeof BLUSUKAN_HASIL)[number])) {
        return res.status(400).json({ message: "Hasil kunjungan tidak valid" });
      }
      const row = await storage.createBlusukanKunjungan(parsed);
      invalidateKk();
      res.json(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal mencatat kunjungan";
      res.status(400).json({ message });
    }
  });
}

export { ensureBlusukanSchema };
