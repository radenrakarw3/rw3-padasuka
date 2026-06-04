import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { pool } from "./db";
import { cache, CacheKey, TTL, invalidateWarga, invalidateKk } from "./cache";
import { insertKkSchema, patchKkSchema, insertWargaSchema, insertLaporanSchema, insertSuratWargaSchema, insertSuratRwSchema, insertPengajuanBansosSchema, insertDonasiCampaignSchema, insertDonasiSchema, insertKasRwSchema, insertPemilikKostSchema, insertWargaSinggahSchema, insertUsahaSchema, insertKaryawanUsahaSchema, insertIzinTetanggaSchema, insertSurveyUsahaSchema, insertProgramRwSchema, insertPesertaProgramSchema } from "@shared/schema";
import { z } from "zod";
import { ACTIVE_RT_NUMBERS, isActiveRt, assertKkInPemukimanScope } from "@shared/rt";
import { formatLaporanKioskIsi, formatRtLabel } from "@shared/laporan-pelapor";
import { generateWithGemini } from "./gemini";
import { buildKependudukanStats, buildSegmentRows } from "./kependudukan-stats";
import { isFieldFilled } from "@shared/kependudukan-analytics";

function resolveAppVersion() {
  const productionIndexPath = path.resolve(process.cwd(), "dist", "public", "index.html");
  const developmentIndexPath = path.resolve(process.cwd(), "client", "index.html");
  const versionFilePath = fs.existsSync(productionIndexPath) ? productionIndexPath : developmentIndexPath;

  try {
    return fs.statSync(versionFilePath).mtimeMs.toString();
  } catch {
    return Date.now().toString();
  }
}

declare module "express-session" {
  interface SessionData {
    kkId?: number;
    wargaId?: number;       // ID warga yang sedang login (bukan selalu kepala KK)
    nomorKk?: string;
    isAdmin?: boolean;
    adminId?: number;
    adminUsername?: string;
    adminNama?: string;
    blusukanAuth?: boolean;
    blusukanLoginAt?: number;
  }
}

const jenisSuratLabels: Record<string, string> = {
  surat_keterangan_domisili: "Surat Keterangan Domisili",
  surat_keterangan_tidak_mampu: "Surat Keterangan Tidak Mampu",
  surat_keterangan_usaha: "Surat Keterangan Usaha",
  surat_keterangan_belum_menikah: "Surat Keterangan Belum Menikah",
  surat_keterangan_berkelakuan_baik: "Surat Keterangan Berkelakuan Baik",
  surat_pengantar_rt: "Surat Pengantar RT",
  surat_keterangan_pindah: "Surat Keterangan Pindah",
  surat_keterangan_kematian: "Surat Keterangan Kematian",
  surat_keterangan_lainnya: "Surat Keterangan Lainnya",
};

const jenisLaporanLabels: Record<string, string> = {
  keamanan: "Keamanan",
  kebersihan: "Kebersihan",
  infrastruktur: "Infrastruktur",
  ketertiban: "Ketertiban",
  sosial: "Sosial",
  umum: "Umum",
  lainnya: "Lainnya",
};

function maskNama(nama: string): string {
  const words = nama.trim().split(/\s+/);
  return words.map((w, i) => {
    if (w.length <= 2) return w;
    const visible = i === 0 ? 2 : 1;
    return w.slice(0, visible) + "*".repeat(w.length - visible);
  }).join(" ");
}

const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(path.join(uploadsDir, "surat"), { recursive: true });
const pdfTempDir = path.join(uploadsDir, "pdf-temp");
fs.mkdirSync(pdfTempDir, { recursive: true });

function cleanupOldPdfTemps() {
  try {
    const files = fs.readdirSync(pdfTempDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(pdfTempDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 10 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {}
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const FEATURE_DISABLED_MSG =
    "Fitur ini sudah tidak digunakan (login warga/singgah, RWcoin, Tripay, ubah profil warga).";
  const deprecatedApiPaths = [
    /^\/api\/auth\/check-kk$/,
    /^\/api\/auth\/request-otp$/,
    /^\/api\/auth\/verify-otp$/,
    /^\/api\/auth\/check-wa$/,
    /^\/api\/auth\/request-wa-otp$/,
    /^\/api\/auth\/verify-wa-otp$/,
    /^\/api\/auth\/saved-login(?:\/|$)/,
    /^\/api\/auth\/singgah(?:\/|$)/,
    /^\/api\/singgah(?:\/|$)/,
    /^\/api\/rwcoin(?:\/|$)/,
    /^\/api\/warga\/rwcoin(?:\/|$)/,
    /^\/api\/mitra(?:\/|$)/,
    /^\/api\/tripay(?:\/|$)/,
    /^\/api\/iuran\/\d+\/bayar-rwcoin$/,
    /^\/api\/iuran\/warga$/,
    /^\/api\/warga\/curhat(?:\/|$)/,
    /^\/api\/profile-edits(?:\/|$)/,
  ];
  app.use((req, res, next) => {
    if (deprecatedApiPaths.some((re) => re.test(req.path))) {
      return res.status(410).json({ message: FEATURE_DISABLED_MSG });
    }
    next();
  });

  const { ensureVisitrw3Schema, registerVisitrw3Routes } = await import("./visitrw3-routes");
  const { ensureVisitrw3SettingsTable } = await import("./visitrw3-settings");
  await ensureVisitrw3SettingsTable().catch((error) => {
    console.error("Visit RW3 settings table init error:", error);
  });
  await ensureVisitrw3Schema().catch((error) => {
    console.error("Visit RW3 schema init error:", error);
  });
  const { initRw3law } = await import("./rw3law-routes");
  await initRw3law().catch((error) => {
    console.error(
      "[RW3LAW] Startup init gagal — API akan mencoba membuat tabel saat request pertama:",
      error,
    );
  });

  /** Tanpa session — cek server hidup (Blusukan RW tidak stuck di "Memuat…"). */
  app.get("/api/blusukan/ping", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    app.set("trust proxy", 1);
  }
  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  const { registerBlusukanRoutes } = await import("./blusukan-routes");
  await registerBlusukanRoutes(app);

  const { registerRw3lawRoutes } = await import("./rw3law-routes");
  registerRw3lawRoutes(app);

  const pdfTempPublicDir = path.join(uploadsDir, "pdf-temp");
  fs.mkdirSync(pdfTempPublicDir, { recursive: true });
  const pdfTempTokens = new Map<string, { filePath: string; expires: number }>();
  app.get("/uploads/pdf-temp/:token", (req, res) => {
    const entry = pdfTempTokens.get(req.params.token);
    if (!entry || Date.now() > entry.expires) {
      pdfTempTokens.delete(req.params.token);
      return res.status(404).json({ message: "File tidak ditemukan atau sudah kadaluarsa" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.sendFile(entry.filePath);
  });

  app.use("/uploads", (req: Request, res: Response, next: any) => {
    if (!req.session?.kkId && !req.session?.isAdmin) {
      return res.status(401).json({ message: "Silakan login terlebih dahulu" });
    }
    next();
  }, express.static(uploadsDir));

  const pdfUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, pdfTempDir),
      filename: (_req, _file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "application/pdf") cb(null, true);
      else cb(new Error("Only PDF files allowed"));
    },
  });

  app.post("/api/pdf/temp", requireAuth, pdfUpload.single("file"), (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    cleanupOldPdfTemps();
    const fileName = req.body?.fileName || req.file.filename;
    const id = path.basename(req.file.filename, ".pdf");
    res.json({ url: `/api/pdf/download/${id}?name=${encodeURIComponent(fileName)}` });
  });

  app.get("/api/pdf/download/:id", requireAuth, (req: Request, res: Response) => {
    const id = (req.params.id as string).replace(/[^a-zA-Z0-9\-_]/g, "");
    const filePath = path.join(pdfTempDir, `${id}.pdf`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found or expired" });
    const downloadName = (req.query.name as string) || "surat.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on("end", () => {
      setTimeout(() => { try { fs.unlinkSync(filePath); } catch {} }, 3000);
    });
  });


  app.get("/api/surat-pdf/:code", (_req: Request, res: Response) => {
    res.status(410).json({ message: "Link PDF ini sudah tidak berlaku. Silakan download surat langsung dari web rw3padasukacimahi.org" });
  });
  const APP_VERSION = resolveAppVersion();
  app.get("/api/app-version", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json({ version: APP_VERSION });
  });

  function requireAuth(req: Request, res: Response, next: any) {
    if (!req.session.kkId && !req.session.isAdmin) {
      return res.status(401).json({ message: "Silakan login terlebih dahulu" });
    }
    next();
  }

  function requireAdmin(req: Request, res: Response, next: any) {
    if (!req.session.isAdmin) {
      return res.status(403).json({ message: "Akses khusus admin" });
    }
    next();
  }

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username dan password harus diisi" });
      }

      const adminAccount = await storage.getAdminByUsername(username);
      if (adminAccount && adminAccount.isActive) {
        const passwordMatch = await bcrypt.compare(password, adminAccount.passwordHash);
        if (passwordMatch) {
          req.session.isAdmin = true;
          req.session.adminId = adminAccount.id;
          req.session.adminUsername = adminAccount.username;
          req.session.adminNama = adminAccount.namaLengkap;
          req.session.kkId = undefined;
          return req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ message: `Session error: ${err.message}` });
            }
            return res.json({
              type: "admin",
              isAdmin: true,
              message: "Login admin berhasil",
              adminId: adminAccount.id,
              username: adminAccount.username,
              namaLengkap: adminAccount.namaLengkap,
            });
          });
        }
      }

      return res.status(401).json({ message: "Login tidak valid" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session.isAdmin) {
      return res.json({
        type: "admin",
        isAdmin: true,
        adminId: req.session.adminId,
        username: req.session.adminUsername,
        namaLengkap: req.session.adminNama,
      });
    }
    return res.status(401).json({ message: "Belum login" });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logout berhasil" });
    });
  });

  app.get("/api/stats/dashboard", requireAdmin, async (req, res) => {
    try {
      const rtParam = req.query.rt ? parseInt(req.query.rt as string) : undefined;
      const rtFilter = rtParam && !isNaN(rtParam) ? rtParam : undefined;
      const key = CacheKey.dashboard(rtFilter);
      const cached = cache.get(key);
      if (cached) return res.json(cached);
      const stats = await storage.getDashboardStats(rtFilter);
      cache.set(key, stats, TTL.DASHBOARD);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil statistik" });
    }
  });

  app.post("/api/stats/dashboard/ai-insight", requireAdmin, async (req, res) => {
    try {
      const { section, data } = req.body;
      if (!section || !data) {
        return res.status(400).json({ message: "Section dan data diperlukan" });
      }

      const sanitizeData = (input: any): any => {
        if (Array.isArray(input)) {
          if (input.length > 0 && input[0]?.nama) {
            return { totalOrang: input.length, catatan: "Daftar nama dihapus untuk privasi" };
          }
          return input.slice(0, 20).map(sanitizeData);
        }
        if (input && typeof input === "object") {
          const sanitized: Record<string, any> = {};
          for (const [key, val] of Object.entries(input)) {
            if (["daftarNama", "nama", "namaLengkap", "nik", "nomorWhatsapp"].includes(key)) continue;
            sanitized[key] = sanitizeData(val);
          }
          return sanitized;
        }
        return input;
      }

      const safeData = sanitizeData(data);
      const safeDataStr = JSON.stringify(safeData).slice(0, 3000);

      const prompt = `Kamu adalah analis data untuk RW 03 Padasuka, Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi. Berikan rekomendasi singkat dan actionable (maksimal 3 poin, masing-masing 1-2 kalimat) berdasarkan data berikut.

Bagian: ${section}
Data: ${safeDataStr}

Berikan rekomendasi dalam format:
1. [rekomendasi 1]
2. [rekomendasi 2]
3. [rekomendasi 3]

Fokus pada insight yang bisa dijadikan konten atau program kerja nyata. Gunakan bahasa Indonesia yang ringkas dan mudah dipahami.`;
      const result = await generateWithGemini(prompt);
      res.json({ insight: result.trim() });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Gagal mendapatkan insight AI" });
    }
  });

  app.get("/api/stats/monthly", requireAdmin, async (req, res) => {
    try {
      await storage.captureCurrentSnapshot();
      const snapshots = await storage.getMonthlySnapshots();
      res.json(snapshots);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Gagal mengambil data bulanan" });
    }
  });

  app.get("/api/stats/kependudukan", requireAdmin, async (req, res) => {
    try {
      const rtParam = req.query.rt ? parseInt(req.query.rt as string) : undefined;
      const rtFilter = rtParam && !isNaN(rtParam) ? rtParam : undefined;
      if (rtFilter !== undefined && !isActiveRt(rtFilter)) {
        return res.status(400).json({ message: "Statistik kependudukan hanya untuk RT 01–04" });
      }
      const key = CacheKey.kependudukan(rtFilter);
      const cached = cache.get(key);
      if (cached) return res.json(cached);

      const kkPemukiman = await storage.getAllKkPemukiman();
      const wargaPemukiman = await storage.getAllWargaPemukiman();
      const allKk = rtFilter ? kkPemukiman.filter((k) => k.rt === rtFilter) : kkPemukiman;
      const kkIds = new Set(allKk.map((k) => k.id));
      const allWarga = wargaPemukiman.filter((w) => kkIds.has(w.kkId));

      const stats = buildKependudukanStats(allKk, allWarga, kkPemukiman, rtFilter);
      cache.set(key, stats, TTL.DASHBOARD);
      res.json(stats);
    } catch (error: unknown) {
      console.error("[kependudukan] stats error:", error);
      const message = error instanceof Error ? error.message : "Gagal mengambil statistik kependudukan";
      res.status(500).json({ message });
    }
  });

  app.get("/api/stats/segment/:section/:field", requireAdmin, async (req, res) => {
    try {
      const section = req.params.section as string;
      const field = req.params.field as string;
      const value = (req.query.value as string) ?? "";
      const rtParam = req.query.rt ? parseInt(req.query.rt as string) : undefined;
      const rtFilter = rtParam && !isNaN(rtParam) ? rtParam : undefined;

      if (rtFilter !== undefined && !isActiveRt(rtFilter)) {
        return res.status(400).json({ message: "Filter hanya untuk RT 01–04" });
      }
      const allKkRaw = await storage.getAllKkPemukiman();
      const kkIds = new Set(allKkRaw.map((k) => k.id));
      const allWargaRaw = (await storage.getAllWargaPemukiman()).filter((w) => kkIds.has(w.kkId));
      const rows = buildSegmentRows(allWargaRaw, allKkRaw, section, field, value, rtFilter);
      res.json({ section, field, value, total: rows.length, rows });
    } catch {
      res.status(500).json({ message: "Gagal mengambil daftar segment" });
    }
  });

  app.get("/api/kk/:id/detail", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });
      const kk = await storage.getKkById(id);
      if (!assertKkInPemukimanScope(kk)) {
        return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });
      }

      const anggota = await storage.getWargaByKkId(id);
      const kepala = anggota.find((w) => w.kedudukanKeluarga === "Kepala Keluarga");
      const kepalaCount = anggota.filter((w) => w.kedudukanKeluarga === "Kepala Keluarga").length;

      const { computeKkCompleteness } = await import("@shared/profile-completeness");
      const completeness = computeKkCompleteness(anggota, kk);

      res.json({
        kk,
        anggota,
        kepalaKeluarga: kepala ?? null,
        flags: {
          penghuniMismatch: kk.jumlahPenghuni !== anggota.length,
          noKepalaKeluarga: kepalaCount === 0,
          multipleKepalaKeluarga: kepalaCount > 1,
          belumVerifikasi: anggota.filter((w) => w.statusVerifikasiData !== "Sudah Diverifikasi").length,
        },
        completeness: {
          ...completeness,
          anggotaCount: anggota.length,
        },
      });
    } catch {
      res.status(500).json({ message: "Gagal mengambil detail KK" });
    }
  });

  app.get("/api/kk", requireAuth, async (req, res) => {
    if (req.session.isAdmin) {
      const key = CacheKey.kkList();
      const cached = cache.get(key);
      if (cached) return res.json(cached);
      const data = await storage.getAllKkPemukiman();
      cache.set(key, data, TTL.KK_LIST);
      return res.json(data);
    }
    const data = await storage.getKkById(req.session.kkId!);
    return res.json(data ? [data] : []);
  });

  app.get("/api/kk/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (!req.session.isAdmin && req.session.kkId !== id) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    const data = await storage.getKkById(id);
    if (!data) return res.status(404).json({ message: "KK tidak ditemukan" });
    if (req.session.isAdmin && !assertKkInPemukimanScope(data)) {
      return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });
    }
    res.json(data);
  });

  app.post("/api/kk", requireAdmin, async (req, res) => {
    try {
      const parsed = insertKkSchema.parse(req.body);
      const data = await storage.createKk(parsed);
      invalidateKk();
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/kk/:id", requireAdmin, async (req, res) => {
    try {
      const kkId = parseInt(req.params.id as string);
      const existing = await storage.getKkById(kkId);
      if (!assertKkInPemukimanScope(existing)) {
        return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });
      }
      const parsed = patchKkSchema.parse(req.body);
      const data = await storage.updateKk(kkId, parsed);
      if (!data) return res.status(404).json({ message: "KK tidak ditemukan" });
      invalidateKk();
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/kk/:id", requireAdmin, async (req, res) => {
    try {
      const kk = await storage.getKkById(parseInt(req.params.id as string));
      if (!assertKkInPemukimanScope(kk)) {
        return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });
      }
      await storage.deleteKk(kk.id);
      invalidateKk();
      res.json({ message: "KK dan semua data terkait berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Gagal menghapus KK" });
    }
  });

  app.get("/api/warga", requireAdmin, async (_req, res) => {
    const key = CacheKey.wargaList();
    const cached = cache.get(key);
    if (cached) return res.json(cached);
    const data = await storage.getAllWargaPemukiman();
    cache.set(key, data, TTL.WARGA_LIST);
    res.json(data);
  });

  app.get("/api/warga/kk/:kkId", requireAuth, async (req, res) => {
    const kkId = parseInt(req.params.kkId as string);
    if (!req.session.isAdmin && req.session.kkId !== kkId) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    if (req.session.isAdmin) {
      const kk = await storage.getKkById(kkId);
      if (!assertKkInPemukimanScope(kk)) {
        return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });
      }
    }
    const data = await storage.getWargaByKkId(kkId);
    res.json(data);
  });

  app.get("/api/warga/:id", requireAuth, async (req, res) => {
    const data = await storage.getWargaById(parseInt(req.params.id as string));
    if (!data) return res.status(404).json({ message: "Warga tidak ditemukan" });
    if (!req.session.isAdmin && data.kkId !== req.session.kkId) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    if (req.session.isAdmin) {
      const kk = await storage.getKkById(data.kkId);
      if (!assertKkInPemukimanScope(kk)) {
        return res.status(404).json({ message: "Warga tidak ditemukan atau di luar RT 01–04" });
      }
    }
    res.json(data);
  });

  app.post("/api/warga", requireAdmin, async (req, res) => {
    try {
      const kk = await storage.getKkById(Number(req.body.kkId));
      if (!assertKkInPemukimanScope(kk)) {
        return res.status(400).json({ message: "KK harus di RT 01–04" });
      }
      const parsed = insertWargaSchema.parse(req.body);
      const data = await storage.createWarga(parsed);
      invalidateWarga();
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/warga/:id", requireAdmin, async (req, res) => {
    try {
      const wargaId = parseInt(req.params.id as string);
      const before = await storage.getWargaById(wargaId);
      if (!before) return res.status(404).json({ message: "Warga tidak ditemukan" });
      const kk = await storage.getKkById(before.kkId);
      if (!assertKkInPemukimanScope(kk)) {
        return res.status(404).json({ message: "Warga tidak ditemukan atau di luar RT 01–04" });
      }
      const parsed = insertWargaSchema.parse({
        ...before,
        ...req.body,
        id: undefined,
        createdAt: undefined,
      });
      const data = await storage.updateWarga(wargaId, parsed);
      if (!data) return res.status(404).json({ message: "Warga tidak ditemukan" });
      invalidateWarga();
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/warga/:id", requireAdmin, async (req, res) => {
    try {
      const w = await storage.getWargaById(parseInt(req.params.id as string));
      if (!w) return res.status(404).json({ message: "Warga tidak ditemukan" });
      const kk = await storage.getKkById(w.kkId);
      if (!assertKkInPemukimanScope(kk)) {
        return res.status(404).json({ message: "Warga tidak ditemukan atau di luar RT 01–04" });
      }
      await storage.deleteWarga(w.id);
      invalidateWarga();
      res.json({ message: "Warga dan semua data terkait berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Gagal menghapus warga" });
    }
  });

  app.get("/api/warga-with-kk", requireAdmin, async (_req, res) => {
    const key = CacheKey.wargaWithKk();
    const cached = cache.get(key);
    if (cached) return res.json(cached);
    const data = await storage.getAllWargaWithKkPemukiman();
    cache.set(key, data, TTL.WARGA_WITH_KK);
    res.json(data);
  });

  const publicWargaIdentitySchema = z.object({
    nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit"),
    nomorWa: z.string().min(9, "Nomor WhatsApp tidak valid"),
  });

  const publicLaporanSchema = z.object({
    namaPelapor: z.string().min(2, "Nama pelapor wajib diisi"),
    nomorRt: z.coerce.number().int().refine((n) => (ACTIVE_RT_NUMBERS as readonly number[]).includes(n), {
      message: "RT tidak valid",
    }),
    nomorWa: z.string().min(9, "Nomor WhatsApp tidak valid"),
    jenisLaporan: z.string().min(1),
    judul: z.string().min(3),
    isi: z.string().min(10),
  });

  app.post("/api/public/validate-warga", async (req, res) => {
    try {
      const parsed = publicWargaIdentitySchema.parse(req.body);
      const identity = await storage.validateWargaIdentity(parsed.nik, parsed.nomorWa);
      if (!identity) {
        return res.status(401).json({ message: "NIK dan nomor WhatsApp tidak cocok dengan data warga RW" });
      }
      return res.json(identity);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Data tidak valid" });
    }
  });

  app.get("/api/public/rt-pelayanan", async (_req, res) => {
    try {
      const list = await storage.getAllRt();
      return res.json(
        list.map((rt) => ({
          nomorRt: rt.nomorRt,
          namaKetua: rt.namaKetua,
          nomorWhatsapp: rt.nomorWhatsapp,
          tersedia: Boolean(rt.nomorWhatsapp && rt.nomorWhatsapp.replace(/\D/g, "").length >= 9),
        })),
      );
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Gagal memuat data RT" });
    }
  });

  app.post("/api/public/laporan", async (req, res) => {
    try {
      const parsed = publicLaporanSchema.parse(req.body);
      const nomorWa = parsed.nomorWa.trim();

      const data = await storage.createLaporan({
        jenisLaporan: parsed.jenisLaporan,
        judul: parsed.judul,
        isi: formatLaporanKioskIsi({
          namaPelapor: parsed.namaPelapor,
          nomorRt: parsed.nomorRt,
          nomorWa,
          isi: parsed.isi,
        }),
      });

      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Gagal mengirim laporan" });
    }
  });

  registerVisitrw3Routes(app);

  app.get("/api/rt", requireAdmin, async (_req, res) => {
    const data = await storage.getAllRt();
    res.json(data);
  });

  app.patch("/api/rt/:id", requireAdmin, async (req, res) => {
    const data = await storage.updateRt(parseInt(req.params.id as string), req.body);
    if (!data) return res.status(404).json({ message: "RT tidak ditemukan" });
    res.json(data);
  });

  app.get("/api/laporan", requireAdmin, async (_req, res) => {
    const data = await storage.getAllLaporan();
    res.json(data);
  });

  app.patch("/api/laporan/:id/status", requireAdmin, async (req, res) => {
    const { status, tanggapan } = req.body;
    if (!["diproses", "selesai", "ditolak"].includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
    }
    const data = await storage.updateLaporanStatus(parseInt(req.params.id as string), status, tanggapan);
    if (!data) return res.status(404).json({ message: "Laporan tidak ditemukan" });

    res.json(data);
  });

  app.get("/api/surat-warga", requireAuth, async (req, res) => {
    if (req.session.isAdmin) {
      const data = await storage.getAllSuratWarga();
      return res.json(data);
    }
    const data = await storage.getSuratByKkId(req.session.kkId!);
    res.json(data);
  });

  app.post("/api/surat-warga", requireAuth, async (req, res) => {
    try {
      const parsed = insertSuratWargaSchema.parse(req.body);
      if (!req.session.isAdmin) {
        if (parsed.kkId !== req.session.kkId) {
          return res.status(403).json({ message: "Akses ditolak" });
        }
        const w = await storage.getWargaById(parsed.wargaId);
        if (!w || w.kkId !== req.session.kkId) {
          return res.status(403).json({ message: "Warga bukan anggota KK Anda" });
        }
      }

      const data = await storage.createSuratWarga(parsed);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const suratUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) cb(null, true);
      else cb(new Error("Format file tidak didukung. Gunakan JPG, PNG, atau PDF."));
    },
  });

  app.post("/api/surat-warga/:id/upload", requireAdmin, suratUpload.single("file"), async (req, res) => {
    try {
      const surat = await storage.getSuratWargaById(parseInt(req.params.id as string));
      if (!surat) return res.status(404).json({ message: "Surat tidak ditemukan" });
      if (!req.file) return res.status(400).json({ message: "File tidak ditemukan" });

      const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const fileRef = `/api/surat-warga/${surat.id}/file`;
      const updated = await storage.updateSuratWargaFileSurat(surat.id, fileRef, base64Data);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/surat-warga/:id/file", async (req, res) => {
    try {
      if (!req.session?.kkId && !req.session?.isAdmin) {
        return res.status(401).json({ message: "Silakan login terlebih dahulu" });
      }
      const id = parseInt(req.params.id as string);
      const fileData = await storage.getSuratWargaFileData(id);
      if (!fileData) return res.status(404).json({ message: "File tidak ditemukan" });

      const commaIdx = fileData.indexOf(",");
      const header = fileData.substring(0, commaIdx);
      const mimeType = header.split(":")[1]?.split(";")[0] || "application/octet-stream";
      const base64 = fileData.substring(commaIdx + 1);
      const buffer = Buffer.from(base64, "base64");

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `inline; filename="surat-${id}"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/surat-warga/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status, nomorSurat } = req.body;
      if (!["disetujui", "ditolak"].includes(status)) {
        return res.status(400).json({ message: "Status tidak valid. Gunakan 'disetujui' atau 'ditolak'." });
      }
      const surat = await storage.getSuratWargaById(parseInt(req.params.id as string));
      if (!surat) return res.status(404).json({ message: "Surat tidak ditemukan" });
      if (surat.status !== "pending") {
        return res.status(400).json({ message: "Hanya surat dengan status pending yang bisa diubah." });
      }

      const data = await storage.updateSuratWargaStatus(surat.id, status);
      if (!data) return res.status(404).json({ message: "Surat tidak ditemukan" });

      if (status === "disetujui" && nomorSurat) {
        await storage.updateSuratWargaNomor(surat.id, nomorSurat);
      }

      if (status === "disetujui") {
        const updated = await storage.getSuratWargaById(surat.id);
        res.json(updated);
      } else {
        res.json(data);
      }
    } catch (error: any) {
      console.error("Surat approval error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/surat-rw", requireAdmin, async (_req, res) => {
    const data = await storage.getAllSuratRw();
    res.json(data);
  });

  function toRomanMonth(monthNumber: number): string {
    const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return romans[Math.max(0, Math.min(11, monthNumber - 1))];
  }

  function getSuratRwCode(jenisSurat: string): string {
    const normalized = jenisSurat.toLowerCase();
    if (normalized.includes("undangan klarifikasi")) return "UND-KLR";
    if (normalized.includes("undangan")) return "UND";
    if (normalized.includes("tugas")) return "ST";
    if (normalized.includes("audiensi")) return "AUD";
    if (normalized.includes("pengajuan perbaikan")) return "PGJ-PBK";
    if (normalized.includes("pengajuan")) return "PGJ";
    if (normalized.includes("bantuan")) return "PMB";
    if (normalized.includes("edaran")) return "SE";
    return "ADM";
  }

  app.get("/verify/surat-rw/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).send("<h1>Verifikasi gagal</h1><p>ID surat tidak valid.</p>");
    }

    const surat = await storage.getSuratRwById(id);
    if (!surat?.nomorSurat) {
      return res.status(404).send("<h1>Surat tidak ditemukan</h1><p>Data surat RW tidak tersedia atau belum memiliki nomor resmi.</p>");
    }

    const expectedNomor = typeof req.query.nomor === "string" ? req.query.nomor : null;
    const isMatch = !expectedNomor || expectedNomor === surat.nomorSurat;
    const statusText = isMatch ? "TERVERIFIKASI" : "NOMOR TIDAK SESUAI";
    const statusColor = isMatch ? "#166534" : "#991b1b";
    const cardBg = isMatch ? "#f0fdf4" : "#fef2f2";
    const accent = isMatch ? "#0f766e" : "#b91c1c";
    const escapedIsi = (surat.isiSurat || "").replace(/[&<>"]/g, (char) => (
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" } as Record<string, string>)[char] || char
    ));

    res.type("html").send(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verifikasi Surat RW 03</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background:
      radial-gradient(circle at top, rgba(15,118,110,0.10), transparent 30%),
      linear-gradient(135deg, #e7e5e4, #fafaf9 34%, #f5f5f4);
      color: #111827; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 32px 20px 56px; }
    .card { position: relative; background: rgba(255,255,255,0.94); border: 1px solid #d6d3d1; border-radius: 28px; box-shadow: 0 28px 80px rgba(0,0,0,0.12); overflow: hidden; backdrop-filter: blur(10px); }
    .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 120px; font-weight: 700; letter-spacing: 0.18em; color: rgba(15,23,42,0.035); transform: rotate(-26deg); pointer-events: none; user-select: none; }
    .hero { position: relative; padding: 28px 30px 22px; color: white; background:
      linear-gradient(135deg, rgba(17,24,39,0.96), rgba(31,41,55,0.88)),
      linear-gradient(90deg, #0f766e, #111827); border-bottom: 1px solid rgba(255,255,255,0.12); }
    .hero-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .brand { max-width: 70%; }
    .brand-kicker { font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; opacity: 0.85; }
    .brand-title { margin: 10px 0 6px; font-size: 32px; line-height: 1.1; font-weight: 700; }
    .brand-subtitle { margin: 0; max-width: 620px; line-height: 1.7; color: rgba(255,255,255,0.82); }
    .seal { min-width: 104px; height: 104px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.34); display: grid; place-items: center; position: relative; }
    .seal:before { content: ""; position: absolute; inset: 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.22); }
    .seal span { font-size: 11px; text-align: center; line-height: 1.6; letter-spacing: 0.16em; text-transform: uppercase; }
    .pill { display: inline-block; margin-top: 18px; padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; background: ${cardBg}; color: ${statusColor}; }
    .meta-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; margin-top: 18px; background: rgba(255,255,255,0.12); border-radius: 18px; overflow: hidden; }
    .meta-item { padding: 14px 16px; background: rgba(255,255,255,0.04); }
    .meta-label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.75; }
    .meta-value { margin-top: 6px; font-size: 15px; font-weight: 700; word-break: break-word; }
    .section { position: relative; padding: 28px 30px 30px; }
    .section-title { margin: 0 0 18px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: ${accent}; }
    .content-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr); gap: 24px; }
    .panel { border: 1px solid #e7e5e4; border-radius: 24px; background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,250,249,0.92)); padding: 22px; }
    .grid { display: grid; grid-template-columns: 160px 1fr; gap: 12px 16px; font-size: 15px; }
    .label { color: #57534e; }
    .value { font-weight: 600; word-break: break-word; }
    .isi { margin-top: 18px; padding: 18px 20px; border-radius: 18px; background: #fafaf9; border: 1px solid #e7e5e4; white-space: pre-wrap; line-height: 1.78; min-height: 220px; }
    .badge { display: inline-flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 18px; background: ${cardBg}; border: 1px solid ${isMatch ? "#bbf7d0" : "#fecaca"}; color: ${statusColor}; font-weight: 700; }
    .badge-dot { width: 10px; height: 10px; border-radius: 999px; background: currentColor; }
    .side-copy { margin: 18px 0 0; color: #44403c; line-height: 1.8; }
    .codebox { margin-top: 18px; padding: 16px 18px; border-radius: 18px; background: #111827; color: #f9fafb; }
    .codebox-label { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.72; }
    .codebox-value { margin-top: 8px; font-size: 18px; line-height: 1.5; word-break: break-word; }
    .footer-note { margin-top: 18px; font-size: 13px; line-height: 1.8; color: #57534e; }
    @media (max-width: 760px) {
      .hero-top { flex-direction: column; align-items: flex-start; }
      .brand { max-width: 100%; }
      .seal { align-self: flex-start; }
      .meta-strip, .content-grid { grid-template-columns: 1fr; }
      .grid { grid-template-columns: 1fr; }
      .brand-title { font-size: 26px; }
      .watermark { font-size: 70px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="watermark">CIMAHI</div>
      <div class="hero">
        <div class="hero-top">
          <div class="brand">
            <div class="brand-kicker">Portal Dokumen Resmi</div>
            <h1 class="brand-title">Verifikasi Surat RW 03 Padasuka</h1>
            <p class="brand-subtitle">Validasi administratif digital untuk dokumen resmi RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi.</p>
          </div>
          <div class="seal"><span>RW 03<br/>Padasuka<br/>Cimahi</span></div>
        </div>
        <span class="pill">${statusText}</span>
        <div class="meta-strip">
          <div class="meta-item">
            <div class="meta-label">Nomor Dokumen</div>
            <div class="meta-value">${surat.nomorSurat}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Jenis Surat</div>
            <div class="meta-value">${surat.jenisSurat}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Status Validasi</div>
            <div class="meta-value">${statusText}</div>
          </div>
        </div>
      </div>
      <div class="section">
        <h2 class="section-title">Detail Autentikasi Dokumen</h2>
        <div class="content-grid">
          <div class="panel">
            <div class="grid">
              <div class="label">Nomor Surat</div><div class="value">${surat.nomorSurat}</div>
              <div class="label">Jenis Surat</div><div class="value">${surat.jenisSurat}</div>
              <div class="label">Perihal</div><div class="value">${surat.perihal}</div>
              <div class="label">Tujuan</div><div class="value">${surat.tujuan || "-"}</div>
              <div class="label">Tanggal Surat</div><div class="value">${surat.tanggalSurat || "-"}</div>
              <div class="label">Waktu Terekam</div><div class="value">${surat.createdAt ? new Date(surat.createdAt).toLocaleString("id-ID") : "-"}</div>
            </div>
            <div class="isi">${escapedIsi || "Isi surat tidak tersedia."}</div>
          </div>
          <div class="panel">
            <div class="badge"><span class="badge-dot"></span> Status dokumen: ${statusText}</div>
            <p class="side-copy">Halaman ini menandakan bahwa dokumen telah tercatat dalam administrasi RW 03. Nomor surat, jenis surat, dan isi surat dapat dicocokkan langsung dengan lembar cetak yang diterima.</p>
            <div class="codebox">
              <div class="codebox-label">Kode Validasi</div>
              <div class="codebox-value">${surat.id}-${Buffer.from(surat.nomorSurat).toString("base64").slice(0, 18)}</div>
            </div>
            <p class="footer-note">Apabila terdapat perbedaan nomor atau isi dokumen, mohon konfirmasi kembali kepada pengurus RW 03 Kelurahan Padasuka.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
  });

  app.post("/api/surat-rw", requireAdmin, async (req, res) => {
    try {
      const parsed = insertSuratRwSchema.parse(req.body);

      if (!parsed.isiSurat || parsed.isiSurat.length < 100) {
        return res.status(400).json({ message: "Isi surat tidak valid atau terlalu pendek." });
      }

      const data = await storage.createSuratRw(parsed);

      const currentCount = await storage.countSuratRwThisYear();
      const seq = String(currentCount + 1).padStart(3, "0");
      const issueDate = parsed.tanggalSurat ? new Date(`${parsed.tanggalSurat}T00:00:00`) : new Date();
      const year = issueDate.getFullYear();
      const month = toRomanMonth(issueDate.getMonth() + 1);
      const code = getSuratRwCode(parsed.jenisSurat);
      const nomorSurat = `${seq}/${code}/RW.03/KEL.PADASUKA/KEC.CIMAHI-TENGAH/KOTA.CIMAHI/${month}/${year}`;
      await storage.updateSuratRwNomor(data.id, nomorSurat);
      const updated = await storage.getSuratRwById(data.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/bansos/penerima", requireAdmin, async (_req, res) => {
    const data = await storage.getBansosRecipients();
    res.json(data);
  });

  app.patch("/api/bansos/penerima/:kkId/jenis", requireAdmin, async (req, res) => {
    try {
      const kkId = parseInt(req.params.kkId as string);
      const { jenisBansos } = req.body;
      if (!jenisBansos || typeof jenisBansos !== "string") return res.status(400).json({ message: "Jenis bansos harus diisi" });
      const kk = await storage.getKkById(kkId);
      if (!assertKkInPemukimanScope(kk)) return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });
      if (!kk.penerimaBansos) return res.status(400).json({ message: "KK ini bukan penerima bansos" });
      const updated = await storage.updateKkBansos(kkId, true, jenisBansos);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bansos/penerima/tambah", requireAdmin, async (req, res) => {
    try {
      const { kkId, jenisBansos } = req.body;
      if (!kkId) return res.status(400).json({ message: "KK ID harus diisi" });
      if (!jenisBansos || typeof jenisBansos !== "string") return res.status(400).json({ message: "Jenis bansos harus diisi" });
      const kk = await storage.getKkById(kkId);
      if (!assertKkInPemukimanScope(kk)) return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });
      if (kk.penerimaBansos) return res.status(400).json({ message: "KK ini sudah terdaftar sebagai penerima bansos" });
      const updated = await storage.updateKkBansos(kkId, true, jenisBansos);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bansos/penerima/hapus", requireAdmin, async (req, res) => {
    try {
      const { kkId } = req.body;
      if (!kkId) return res.status(400).json({ message: "KK ID harus diisi" });
      const kk = await storage.getKkById(kkId);
      if (!assertKkInPemukimanScope(kk)) return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });
      if (!kk.penerimaBansos) return res.status(400).json({ message: "KK ini bukan penerima bansos" });
      const updated = await storage.updateKkBansos(kkId, false, null);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bansos/pengajuan", requireAdmin, async (_req, res) => {
    const data = await storage.getAllPengajuanBansos();
    res.json(data);
  });

  app.post("/api/bansos/pengajuan", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPengajuanBansosSchema.parse(req.body);
      const kk = await storage.getKkById(parsed.kkId);
      if (!assertKkInPemukimanScope(kk)) return res.status(404).json({ message: "KK tidak ditemukan atau di luar RT 01–04" });

      if (parsed.jenisPengajuan === "rekomendasi_coret" && !kk.penerimaBansos) {
        return res.status(400).json({ message: "KK ini bukan penerima bansos" });
      }
      if (parsed.jenisPengajuan === "rekomendasi_penerima" && kk.penerimaBansos) {
        return res.status(400).json({ message: "KK ini sudah penerima bansos" });
      }

      const data = await storage.createPengajuanBansos(parsed);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/bansos/pengajuan/:id/status", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { status } = req.body;
      if (!["disetujui", "ditolak"].includes(status)) {
        return res.status(400).json({ message: "Status tidak valid" });
      }

      const pengajuan = await storage.getPengajuanBansosById(id);
      if (!pengajuan) return res.status(404).json({ message: "Pengajuan tidak ditemukan" });
      if (pengajuan.status !== "pending") return res.status(400).json({ message: "Pengajuan sudah diproses" });

      let updated;
      if (status === "disetujui") {
        updated = await storage.approvePengajuanBansos(id, pengajuan.kkId, pengajuan.jenisPengajuan, pengajuan.jenisBansos);
      } else {
        updated = await storage.updatePengajuanBansosStatus(id, status);
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/donasi-campaign", requireAuth, async (_req, res) => {
    const campaigns = await storage.getAllDonasiCampaigns();
    res.json(campaigns);
  });

  app.post("/api/donasi-campaign", requireAdmin, async (req, res) => {
    try {
      const parsed = insertDonasiCampaignSchema.parse(req.body);
      const campaign = await storage.createDonasiCampaign(parsed);
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/donasi-campaign/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!["aktif", "selesai"].includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
    }
    const result = await storage.updateDonasiCampaignStatus(parseInt(req.params.id as string), status);
    if (!result) return res.status(404).json({ message: "Campaign tidak ditemukan" });
    res.json(result);
  });

  app.patch("/api/donasi-campaign/:id", requireAdmin, async (req, res) => {
    try {
      const { judul, deskripsi, targetDana } = req.body;
      if (!judul || !deskripsi) {
        return res.status(400).json({ message: "Judul dan deskripsi harus diisi" });
      }
      const result = await storage.updateDonasiCampaign(parseInt(req.params.id as string), {
        judul,
        deskripsi,
        targetDana: targetDana ? parseInt(targetDana) : null,
      });
      if (!result) return res.status(404).json({ message: "Campaign tidak ditemukan" });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/donasi", requireAuth, async (req, res) => {
    if (req.session.isAdmin) {
      const all = await storage.getAllDonasi();
      return res.json(all);
    }
    const kkId = req.session.kkId;
    if (!kkId) return res.json([]);
    const list = await storage.getDonasiByKkId(kkId);
    res.json(list);
  });

  app.post("/api/donasi", requireAuth, async (req, res) => {
    try {
      const kkId = req.session.kkId;
      if (!kkId) return res.status(403).json({ message: "Tidak memiliki akses" });
      const paymentMethod = String(req.body?.paymentMethod ?? "transfer_manual");

      const parsed = insertDonasiSchema.parse({ ...req.body, kkId });
      if (parsed.jumlah <= 0) {
        return res.status(400).json({ message: "Jumlah donasi harus lebih dari 0" });
      }

      const campaigns = await storage.getAllDonasiCampaigns();
      const campaign = campaigns.find(c => c.id === parsed.campaignId);
      if (!campaign || campaign.status !== "aktif") {
        return res.status(400).json({ message: "Campaign tidak ditemukan atau sudah selesai" });
      }

      const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
      if (paymentMethod === "rwcoin") {
        return res.status(410).json({ message: "Donasi via RWcoin sudah tidak digunakan." });
      }

      const result = await storage.createDonasi(parsed);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/donasi/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!["pending", "dikonfirmasi", "ditolak"].includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
    }
    const donasiId = parseInt(req.params.id as string);
    const existing = await storage.getDonasiById(donasiId);
    if (!existing) return res.status(404).json({ message: "Donasi tidak ditemukan" });

    const previousStatus = existing.status;

    if (previousStatus === "dikonfirmasi" && status !== "dikonfirmasi") {
      return res.status(400).json({ message: "Donasi yang sudah dikonfirmasi tidak bisa diubah statusnya. Hubungi pengembang jika ada kesalahan." });
    }

    if (previousStatus === status) {
      return res.json(existing);
    }

    if (status === "dikonfirmasi") {
      const campaigns = await storage.getAllDonasiCampaigns();
      const campaign = campaigns.find(c => c.id === existing.campaignId);
      const judulCampaign = campaign?.judul || "Donasi";
      const today = new Date().toISOString().split("T")[0];

      const result = await storage.confirmDonasiWithKas(donasiId, {
        tipe: "pemasukan",
        kategori: "Donasi",
        jumlah: existing.jumlah,
        keterangan: `Donasi: ${judulCampaign}`,
        tanggal: today,
        createdBy: "sistem",
        campaignId: existing.campaignId,
      });
      if (!result) return res.status(404).json({ message: "Donasi tidak ditemukan" });
      res.json(result);
    } else {
      const result = await storage.updateDonasiStatus(donasiId, status);
      if (!result) return res.status(404).json({ message: "Donasi tidak ditemukan" });
      res.json(result);
    }
  });

  app.get("/api/donasi/leaderboard", async (_req, res) => {
    const leaderboard = await storage.getDonasiLeaderboard();
    res.json(leaderboard);
  });

  app.get("/api/donasi/terkumpul", requireAuth, async (_req, res) => {
    const terkumpul = await storage.getDonasiTerkumpulByCampaign();
    res.json(terkumpul);
  });

  app.get("/api/kas-rw/campaign-summary", requireAuth, async (_req, res) => {
    try {
      const summary = await storage.getKasRwCampaignSummary();
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/kas-rw/summary", requireAuth, async (_req, res) => {
    try {
      const summary = await storage.getKasRwSummary();
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/kas-rw/laporan", requireAuth, async (_req, res) => {
    try {
      const transaksi = await storage.getAllKasRw();
      const summary = await storage.getKasRwSummary();
      res.json({ transaksi, summary });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/kas-rw", requireAdmin, async (_req, res) => {
    try {
      const transaksi = await storage.getAllKasRw();
      res.json(transaksi);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/kas-rw", requireAdmin, async (req, res) => {
    try {
      const parsed = insertKasRwSchema.parse(req.body);
      const result = await storage.createKasRw({ ...parsed, createdBy: req.session.adminUsername || "admin" });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/kas-rw/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const existing = await storage.getKasRwById(id);
      if (!existing) return res.status(404).json({ message: "Transaksi tidak ditemukan" });
      if (existing.createdBy === "sistem" || existing.createdBy === "iuran-sistem") {
        return res.status(403).json({ message: "Transaksi otomatis tidak bisa diedit manual" });
      }
      const parsed = insertKasRwSchema.partial().parse(req.body);
      const result = await storage.updateKasRw(id, parsed);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/kas-rw/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const existing = await storage.getKasRwById(id);
      if (!existing) return res.status(404).json({ message: "Transaksi tidak ditemukan" });
      if (existing.createdBy === "sistem" || existing.createdBy === "iuran-sistem") {
        return res.status(403).json({ message: "Transaksi otomatis tidak bisa dihapus manual" });
      }
      await storage.deleteKasRw(id);
      res.json({ message: "Transaksi berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === Iuran Routes ===

  app.get("/api/iuran/setting", requireAdmin, async (_req, res) => {
    try {
      const setting = await storage.getIuranSetting();
      res.json(setting ?? { jumlahDefault: 30000 });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/iuran/setting", requireAdmin, async (req, res) => {
    try {
      const { jumlahDefault } = req.body;
      if (!jumlahDefault || typeof jumlahDefault !== "number" || jumlahDefault <= 0) {
        return res.status(400).json({ message: "Jumlah iuran harus lebih dari 0" });
      }
      const result = await storage.upsertIuranSetting(jumlahDefault, (req.session as any).adminUsername || "admin");
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/iuran/rekap", requireAdmin, async (req, res) => {
    try {
      const tahun = (req.query.tahun as string) || new Date().getFullYear().toString();
      const result = await storage.getIuranRekap(tahun);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/iuran", requireAdmin, async (req, res) => {
    try {
      const bulanTahun = req.query.bulanTahun as string | undefined;
      const filterRt = req.query.rt ? parseInt(req.query.rt as string) : undefined;
      if (!bulanTahun || !/^\d{4}-\d{2}$/.test(bulanTahun)) {
        return res.status(400).json({ message: "Parameter bulanTahun (YYYY-MM) wajib diisi" });
      }
      if (filterRt !== undefined && !isActiveRt(filterRt)) {
        return res.status(400).json({ message: "Filter RT harus 1–4" });
      }
      const data = await storage.getIuranByBulan(bulanTahun, filterRt);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/iuran/generate", requireAdmin, async (req, res) => {
    try {
      const { bulanTahun } = req.body;
      if (!bulanTahun || !/^\d{4}-\d{2}$/.test(bulanTahun)) {
        return res.status(400).json({ message: "Format bulanTahun harus YYYY-MM" });
      }
      const setting = await storage.getIuranSetting();
      const jumlahDefault = setting?.jumlahDefault ?? 30000;
      const result = await storage.generateIuranBulan(bulanTahun, jumlahDefault);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/iuran/:id/bayar", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { tanggalBayar } = req.body;
      if (!tanggalBayar || !/^\d{4}-\d{2}-\d{2}$/.test(tanggalBayar)) {
        return res.status(400).json({ message: "Format tanggalBayar harus YYYY-MM-DD" });
      }
      const result = await storage.markIuranLunas(id, tanggalBayar, (req.session as any).adminUsername || "admin");
      if (!result) return res.status(404).json({ message: "Iuran tidak ditemukan atau sudah lunas" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/iuran/:id/batal", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const result = await storage.batalIuranLunas(id);
      if (!result) return res.status(404).json({ message: "Iuran tidak ditemukan atau belum lunas" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/iuran/:id/jumlah", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { jumlah } = req.body;
      if (!jumlah || typeof jumlah !== "number" || jumlah <= 0) {
        return res.status(400).json({ message: "Jumlah harus lebih dari 0" });
      }
      const result = await storage.updateJumlahIuran(id, jumlah);
      if (!result) return res.status(400).json({ message: "Iuran tidak ditemukan atau sudah lunas" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === Pemilik Kost Routes ===
  app.get("/api/pemilik-kost", requireAdmin, async (_req, res) => {
    try {
      const data = await storage.getAllPemilikKost();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/pemilik-kost/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const data = await storage.getPemilikKostById(id);
      if (!data) return res.status(404).json({ message: "Pemilik kost tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/pemilik-kost", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPemilikKostSchema.parse(req.body);
      const result = await storage.createPemilikKost(parsed);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/pemilik-kost/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const existing = await storage.getPemilikKostById(id);
      if (!existing) return res.status(404).json({ message: "Pemilik kost tidak ditemukan" });
      const parsed = insertPemilikKostSchema.partial().parse(req.body);
      const result = await storage.updatePemilikKost(id, parsed);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/pemilik-kost/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const existing = await storage.getPemilikKostById(id);
      if (!existing) return res.status(404).json({ message: "Pemilik kost tidak ditemukan" });
      await storage.deletePemilikKost(id);
      res.json({ message: "Pemilik kost berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === Warga Singgah Routes ===
  app.get("/api/warga-singgah", requireAdmin, async (_req, res) => {
    try {
      const data = await storage.getAllWargaSinggah();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/warga-singgah/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const data = await storage.getWargaSinggahById(id);
      if (!data) return res.status(404).json({ message: "Warga singgah tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/warga-singgah/:id/riwayat", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const data = await storage.getRiwayatKontrak(id);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/warga-singgah", requireAdmin, async (req, res) => {
    try {
      const parsed = insertWargaSinggahSchema.parse(req.body);
      const result = await storage.createWargaSinggah(parsed);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/warga-singgah/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const existing = await storage.getWargaSinggahById(id);
      if (!existing) return res.status(404).json({ message: "Warga singgah tidak ditemukan" });
      const parsed = insertWargaSinggahSchema.partial().parse(req.body);
      const result = await storage.updateWargaSinggah(id, parsed);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/warga-singgah/:id/perpanjang", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { tanggalMulaiBaru, tanggalHabisBaru } = req.body;
      if (!tanggalMulaiBaru || !tanggalHabisBaru) {
        return res.status(400).json({ message: "Tanggal mulai dan habis baru harus diisi" });
      }
      const result = await storage.perpanjangKontrak(id, tanggalMulaiBaru, tanggalHabisBaru);
      if (!result) return res.status(404).json({ message: "Warga singgah tidak ditemukan" });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/warga-singgah/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const existing = await storage.getWargaSinggahById(id);
      if (!existing) return res.status(404).json({ message: "Warga singgah tidak ditemukan" });
      await storage.deleteWargaSinggah(id);
      res.json({ message: "Warga singgah berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === USAHA ===
  app.get("/api/usaha", requireAdmin, async (req, res) => {
    try {
      const allUsaha = await storage.getAllUsaha();
      res.json(allUsaha);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/usaha/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const u = await storage.getUsahaById(id);
      if (!u) return res.status(404).json({ message: "Usaha tidak ditemukan" });
      const karyawan = await storage.getKaryawanByUsahaId(id);
      const izinTetangga = await storage.getIzinTetanggaByUsahaId(id);
      const survey = await storage.getSurveyByUsahaId(id);
      const riwayatStiker = await storage.getRiwayatStikerByUsahaId(id);
      res.json({ ...u, karyawan, izinTetangga, survey, riwayatStiker });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/usaha", requireAdmin, async (req, res) => {
    try {
      const { karyawan, izinTetangga: izinList, ...usahaData } = req.body;
      const parsed = insertUsahaSchema.parse(usahaData);
      if (!izinList || izinList.length < 4) {
        return res.status(400).json({ message: "Minimal 4 izin tetangga diperlukan (kiri, kanan, depan, belakang)" });
      }
      const requiredPositions = ["kiri", "kanan", "depan", "belakang"];
      const givenPositions = izinList.map((i: any) => i.posisi?.toLowerCase());
      for (const pos of requiredPositions) {
        if (!givenPositions.includes(pos)) {
          return res.status(400).json({ message: `Izin tetangga posisi "${pos}" belum diisi` });
        }
      }
      for (const izin of izinList) {
        if (!izin.namaWarga || !izin.posisi) {
          return res.status(400).json({ message: "Nama warga dan posisi tetangga harus diisi" });
        }
      }
      if (karyawan && Array.isArray(karyawan)) {
        for (const k of karyawan) {
          if (!k.namaLengkap || !k.nik || !k.alamat || !k.jabatan) {
            return res.status(400).json({ message: "Nama, NIK, alamat, dan jabatan karyawan harus diisi" });
          }
        }
      }
      const created = await storage.createUsahaWithRelations(parsed, karyawan || [], izinList);
      res.json(created);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Data tidak valid: " + error.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/usaha/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const existing = await storage.getUsahaById(id);
      if (!existing) return res.status(404).json({ message: "Usaha tidak ditemukan" });
      const { karyawan, izinTetangga: izinList, ...usahaData } = req.body;
      const updated = await storage.updateUsahaWithRelations(id, usahaData, karyawan, izinList);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/usaha/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const existing = await storage.getUsahaById(id);
      if (!existing) return res.status(404).json({ message: "Usaha tidak ditemukan" });
      await storage.deleteUsaha(id);
      res.json({ message: "Usaha berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/usaha/:id/survey", requireAdmin, async (req, res) => {
    try {
      const usahaId = parseInt(req.params.id as string);
      const existing = await storage.getUsahaById(usahaId);
      if (!existing) return res.status(404).json({ message: "Usaha tidak ditemukan" });
      if (existing.status !== "pendaftaran" && existing.status !== "survey") {
        return res.status(400).json({ message: "Usaha tidak dalam tahap yang bisa disurvey" });
      }
      const surveyData = { ...req.body, usahaId };
      const survey = await storage.createSurveyUsaha(surveyData);
      await storage.updateUsahaStatus(usahaId, "survey");
      res.json(survey);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const surveyUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), "uploads", "survey");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `survey_${req.params.id}_${Date.now()}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, allowed.includes(ext));
    },
  });

  app.post("/api/usaha/:id/survey/upload", requireAdmin, surveyUpload.single("foto"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "File tidak ditemukan" });
      const filePath = `/uploads/survey/${req.file.filename}`;
      res.json({ filePath });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/usaha/:id/verifikasi", requireAdmin, async (req, res) => {
    try {
      const usahaId = parseInt(req.params.id as string);
      const existing = await storage.getUsahaById(usahaId);
      if (!existing) return res.status(404).json({ message: "Usaha tidak ditemukan" });
      if (existing.status !== "survey") {
        return res.status(400).json({ message: "Usaha harus dalam tahap survey sebelum diverifikasi" });
      }
      const { keputusan, alasanPenolakan } = req.body;
      if (!keputusan || !["disetujui", "ditolak"].includes(keputusan)) {
        return res.status(400).json({ message: "Keputusan harus 'disetujui' atau 'ditolak'" });
      }
      if (keputusan === "disetujui") {
        const result = await storage.approveUsahaWithStiker(usahaId);
        res.json({ message: "Usaha disetujui dan stiker diterbitkan", nomorStiker: result.nomorStiker });
      } else {
        if (!alasanPenolakan || !alasanPenolakan.trim()) {
          return res.status(400).json({ message: "Alasan penolakan harus diisi" });
        }
        await storage.updateUsahaStatus(usahaId, "ditolak", { alasanPenolakan });
        res.json({ message: "Usaha ditolak" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/usaha/:id/perpanjang-stiker", requireAdmin, async (req, res) => {
    try {
      const usahaId = parseInt(req.params.id as string);
      const existing = await storage.getUsahaById(usahaId);
      if (!existing) return res.status(404).json({ message: "Usaha tidak ditemukan" });
      if (existing.status !== "disetujui") {
        return res.status(400).json({ message: "Hanya usaha yang sudah disetujui yang bisa diperpanjang stikernya" });
      }
      const result = await storage.perpanjangStiker(usahaId, existing.tanggalStikerExpired);
      res.json({ message: "Stiker berhasil diperpanjang", nomorStiker: result.nomorStiker, tanggalExpired: result.tanggalExpired });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===================== PROGRAM RW =====================
  app.get("/api/program-rw", requireAdmin, async (req, res) => {
    try {
      const data = await storage.getAllProgramRw();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/program-rw/:id", requireAdmin, async (req, res) => {
    try {
      const data = await storage.getProgramRwById(parseInt(req.params.id as string));
      if (!data) return res.status(404).json({ message: "Program tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/program-rw", requireAdmin, async (_req, res) => {
    try {
      const parsed = insertProgramRwSchema.parse(_req.body);
      const data = await storage.createProgramRw(parsed);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/program-rw/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = insertProgramRwSchema.partial().parse(req.body);
      const data = await storage.updateProgramRw(parseInt(req.params.id as string), parsed);
      if (!data) return res.status(404).json({ message: "Program tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/program-rw/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProgramRw(parseInt(req.params.id as string));
      res.json({ message: "Program dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Peserta Program
  app.get("/api/program-rw/:id/peserta", requireAdmin, async (req, res) => {
    try {
      const data = await storage.getPesertaByProgramId(parseInt(req.params.id as string));
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/program-rw/:id/peserta", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPesertaProgramSchema.parse({
        ...req.body,
        programId: parseInt(req.params.id as string),
      });
      const data = await storage.addPesertaProgram(parsed);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/program-rw/:id/peserta/:pesertaId", requireAdmin, async (req, res) => {
    try {
      const { kehadiran, catatan } = req.body;
      if (!kehadiran) return res.status(400).json({ message: "Kehadiran harus diisi" });
      const data = await storage.updateKehadiranPeserta(parseInt(req.params.pesertaId as string), kehadiran, catatan);
      if (!data) return res.status(404).json({ message: "Peserta tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/program-rw/:id/peserta/:pesertaId", requireAdmin, async (req, res) => {
    try {
      await storage.deletePesertaProgram(parseInt(req.params.pesertaId as string));
      res.json({ message: "Peserta dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}

