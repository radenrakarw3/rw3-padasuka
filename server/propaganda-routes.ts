import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { z } from "zod";
import { PROPAGANDA_PROFIL } from "@shared/schema";
import { propagandaFilterSchema } from "@shared/propaganda-filters";
import { saveSession } from "./session-save";
import { generateWithGemini } from "./gemini";
import {
  buildPropagandaPreview,
  createPropagandaCampaignWithAntrian,
  getPropagandaFilterOptions,
} from "./propaganda-engine";
import {
  cancelPendingAntrian,
  ensurePropagandaSchema,
  getCampaignStats,
  getPerRtCounts,
  getPropagandaCampaign,
  listGelombang,
  listPropagandaAntrian,
  listPropagandaCampaigns,
  refreshPropagandaCampaignCounts,
  rescheduleFailedAntrian,
  updatePropagandaCampaign,
} from "./propaganda-storage";
import { getPropagandaDispatcherHealth } from "./propaganda-dispatcher";

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
  return process.env.PROPAGANDA_PIN || "1977";
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

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdmin) {
    return res.status(403).json({ message: "Akses khusus admin" });
  }
  next();
}

function requirePropaganda(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdmin) {
    return res.status(403).json({ message: "Akses khusus admin" });
  }
  if (!req.session.propagandaAuth) {
    return res.status(401).json({ message: "PIN Propaganda diperlukan" });
  }
  next();
}

function parseIdParam(raw: string | string[]): number {
  const id = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
  if (!Number.isFinite(id)) throw new Error("ID tidak valid");
  return id;
}

function mapCampaignSummary(c: Awaited<ReturnType<typeof getPropagandaCampaign>>) {
  if (!c) return null;
  return {
    id: c.id,
    judul: c.judul,
    status: c.status,
    profilDistribusi: c.profilDistribusi,
    formulaVersi: c.formulaVersi,
    fairnessScore: c.fairnessScore,
    jumlahGelombang: c.jumlahGelombang,
    jumlahTarget: c.jumlahTarget,
    jumlahTerkirim: c.jumlahTerkirim,
    jumlahGagal: c.jumlahGagal,
    jumlahDilewati: c.jumlahDilewati,
    jumlahMenunggu: c.jumlahMenunggu,
    mulaiKirim: c.mulaiKirim?.toISOString() ?? null,
    estimasiSelesai: c.estimasiSelesai?.toISOString() ?? null,
    selesaiKirim: c.selesaiKirim?.toISOString() ?? null,
    createdAt: c.createdAt?.toISOString() ?? null,
    createdBy: c.createdBy,
  };
}

export async function registerPropagandaRoutes(app: Express): Promise<void> {
  await ensurePropagandaSchema().catch((err) => {
    console.error("[propaganda] schema init error:", err);
  });

  app.post("/api/propaganda/auth/login", requireAdmin, async (req, res) => {
    try {
      const ip = getClientIp(req);
      if (!checkRateLimit(ip)) {
        return res.status(429).json({ message: "Terlalu banyak percobaan PIN. Coba lagi dalam 15 menit." });
      }
      const { pin } = z.object({ pin: z.string().min(4).max(8) }).parse(req.body);
      if (!verifyPin(pin)) {
        return res.status(401).json({ message: "PIN salah" });
      }
      req.session.propagandaAuth = true;
      req.session.propagandaLoginAt = Date.now();
      await saveSession(req);
      res.json({ ok: true, authenticated: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Permintaan tidak valid" });
    }
  });

  app.post("/api/propaganda/auth/logout", requireAdmin, async (req, res) => {
    req.session.propagandaAuth = false;
    await saveSession(req);
    res.json({ ok: true });
  });

  app.get("/api/propaganda/auth/me", requireAdmin, (req, res) => {
    res.json({ authenticated: Boolean(req.session.propagandaAuth) });
  });

  app.get("/api/propaganda/health", requirePropaganda, (_req, res) => {
    res.json(getPropagandaDispatcherHealth());
  });

  app.get("/api/propaganda/filter-options", requirePropaganda, async (_req, res) => {
    try {
      const options = await getPropagandaFilterOptions();
      res.json(options);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal memuat opsi filter" });
    }
  });

  app.post("/api/propaganda/preview", requirePropaganda, async (req, res) => {
    try {
      const body = z
        .object({
          filter: propagandaFilterSchema,
          profilDistribusi: z.enum(PROPAGANDA_PROFIL),
          abaikanCooldown: z.boolean().optional(),
        })
        .parse(req.body);
      const preview = await buildPropagandaPreview(
        body.filter,
        body.profilDistribusi,
        body.abaikanCooldown ?? false,
      );
      res.json(preview);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Preview gagal" });
    }
  });

  app.post("/api/propaganda/campaign", requirePropaganda, async (req, res) => {
    try {
      const body = z
        .object({
          judul: z.string().min(3).max(120),
          pesanTemplate: z.string().min(20).max(4000),
          filter: propagandaFilterSchema,
          profilDistribusi: z.enum(PROPAGANDA_PROFIL),
          abaikanCooldown: z.boolean().optional(),
          konfirmasiBesar: z.boolean().optional(),
        })
        .parse(req.body);

      const result = await createPropagandaCampaignWithAntrian({
        judul: body.judul,
        pesanTemplate: body.pesanTemplate,
        filterInput: body.filter,
        profil: body.profilDistribusi,
        abaikanCooldown: body.abaikanCooldown ?? false,
        konfirmasiBesar: body.konfirmasiBesar ?? false,
        createdBy: req.session.adminUsername ?? "admin",
      });

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membuat kampanye" });
    }
  });

  app.get("/api/propaganda/campaign", requirePropaganda, async (_req, res) => {
    try {
      const rows = await listPropagandaCampaigns();
      res.json(rows.map((c) => mapCampaignSummary(c)));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal memuat kampanye" });
    }
  });

  app.get("/api/propaganda/campaign/:id", requirePropaganda, async (req, res) => {
    try {
      const id = parseIdParam(req.params.id);
      const campaign = await getPropagandaCampaign(id);
      if (!campaign) return res.status(404).json({ message: "Kampanye tidak ditemukan" });
      const perRt = await getPerRtCounts(id);
      res.json({
        ...mapCampaignSummary(campaign),
        pesanTemplate: campaign.pesanTemplate,
        filterJson: campaign.filterJson,
        abaikanCooldown: campaign.abaikanCooldown,
        perRt,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal memuat detail" });
    }
  });

  app.get("/api/propaganda/campaign/:id/gelombang", requirePropaganda, async (req, res) => {
    try {
      const id = parseIdParam(req.params.id);
      const rows = await listGelombang(id);
      res.json(
        rows.map((g) => ({
          id: g.id,
          nomor: g.nomorGelombang,
          jumlahSlot: g.jumlahSlot,
          jumlahTerkirim: g.jumlahTerkirim,
          jumlahGagal: g.jumlahGagal,
          status: g.status,
          jadwalMulai: g.jadwalMulai.toISOString(),
          jadwalSelesai: g.jadwalSelesai.toISOString(),
          istirahatMenit: Math.round(g.istirahatSesudahMs / 60_000),
          perRt: JSON.parse(g.perRtJson || "{}") as Record<string, number>,
        })),
      );
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal memuat gelombang" });
    }
  });

  app.get("/api/propaganda/campaign/:id/stats", requirePropaganda, async (req, res) => {
    try {
      const id = parseIdParam(req.params.id);
      const stats = await getCampaignStats(id);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal memuat statistik" });
    }
  });

  app.get("/api/propaganda/campaign/:id/antrian", requirePropaganda, async (req, res) => {
    try {
      const id = parseIdParam(req.params.id);
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(100, Math.max(10, parseInt(String(req.query.limit || "50"), 10) || 50));
      const rows = await listPropagandaAntrian(id, limit, (page - 1) * limit);
      res.json(
        rows.map((r) => ({
          id: r.id,
          nama: r.nama,
          nomorWhatsapp: r.nomorWhatsapp.replace(/(\d{4})\d+(\d{2})/, "$1****$2"),
          rt: r.rt,
          status: r.status,
          jadwalKirim: r.jadwalKirim.toISOString(),
          sentAt: r.sentAt?.toISOString() ?? null,
          lastError: r.lastError,
        })),
      );
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal memuat antrian" });
    }
  });

  app.post("/api/propaganda/campaign/:id/jeda", requirePropaganda, async (req, res) => {
    try {
      const id = parseIdParam(req.params.id);
      await updatePropagandaCampaign(id, { status: "jeda" });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/propaganda/campaign/:id/lanjut", requirePropaganda, async (req, res) => {
    try {
      const id = parseIdParam(req.params.id);
      await updatePropagandaCampaign(id, { status: "berjalan" });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/propaganda/campaign/:id/batalkan", requirePropaganda, async (req, res) => {
    try {
      const id = parseIdParam(req.params.id);
      await cancelPendingAntrian(id);
      await updatePropagandaCampaign(id, { status: "dibatalkan", selesaiKirim: new Date() });
      await refreshPropagandaCampaignCounts(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/propaganda/campaign/:id/ulang-gagal", requirePropaganda, async (req, res) => {
    try {
      const id = parseIdParam(req.params.id);
      const count = await rescheduleFailedAntrian(id, 30);
      await updatePropagandaCampaign(id, { status: "berjalan" });
      await refreshPropagandaCampaignCounts(id);
      res.json({ ok: true, dijadwalkanUlang: count });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/propaganda/generate", requirePropaganda, async (req, res) => {
    try {
      const { topik } = z.object({ topik: z.string().min(5).max(500) }).parse(req.body);
      const prompt = `Kamu Raden Raka, Ketua RW 03 Padasuka (23 tahun), menulis pesan WhatsApp informasi untuk warga.
Topik: ${topik}
Tulis dalam Bahasa Indonesia santun, ramah, singkat (maks 800 karakter).
WAJIB sertakan placeholder {sapaan}, {nama}, dan {rt} di dalam teks.
Jangan pakai markdown. Akhiri dengan "Raden Raka - Ketua RW 03 Padasuka".`;
      const text = await generateWithGemini(prompt);
      if (!text.includes("{nama}") || !text.includes("{sapaan}")) {
        return res.status(422).json({ message: "AI tidak menghasilkan placeholder wajib. Coba lagi." });
      }
      res.json({ pesan: text.trim() });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal generate pesan" });
    }
  });
}
