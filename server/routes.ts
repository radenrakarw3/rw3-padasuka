import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { storage } from "./storage";
import { pool } from "./db";
import { cache, CacheKey, TTL, invalidateWarga, invalidateKk, invalidateVisitrw3Dashboard } from "./cache";
import { insertKkSchema, patchKkSchema, insertWargaSchema, insertSuratRwSchema, insertWargaSinggahSchema, insertUsahaSchema } from "@shared/schema";
import { getBlusukanDashboard } from "./blusukan";
import { z } from "zod";
import { isActiveRt, assertKkInPemukimanScope } from "@shared/rt";
import {
  notifyUsahaDidaftar,
  notifyUsahaDisetujui,
  notifyUsahaDitolak,
  notifyUsahaStikerPerpanjang,
  ensureWaNotifikasiSchema,
  logWaStartupStatus,
  startVisitrw3ReminderScheduler,
} from "./wa-notify";
import { buildKependudukanStats } from "./kependudukan-stats";

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
    rtjuaraRt?: number;        // RT JUARA — nomor RT ketua RT yang sedang login
    rtjuaraNama?: string;
    rtjuaraLoginAt?: number;
  }
}

const uploadsDir = path.join(process.cwd(), "uploads");
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
  const { ensureRw3bizSchema, registerRw3bizRoutes } = await import("./rw3biz-routes");
  await ensureRw3bizSchema().catch((error) => {
    console.error("RW3BIZ schema init error:", error);
  });
  await ensureWaNotifikasiSchema().catch((error) => {
    console.error("WA notifikasi schema init error:", error);
  });
  logWaStartupStatus();
  startVisitrw3ReminderScheduler();

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

  // Endpoint admin RW3BIZ membaca req.session — wajib didaftarkan setelah middleware session.
  registerRw3bizRoutes(app);

  // Master warga/KK dikelola Ketua RT (portal /rt). Endpoint lama milik admin RW & Blusukan hanya baca.
  // IZINKAN_RW_EDIT_MASTER=true hanya untuk masa transisi darurat.
  const { tolakUbahMasterOlehRw } = await import("./wilayah-auth");
  const MASTER_LAMA = /^\/api\/(kk|warga|blusukan\/kk|blusukan\/warga)(\/\d+)?\/?$/;
  app.use((req, res, next) => {
    if (process.env.IZINKAN_RW_EDIT_MASTER === "true") return next();
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
    if (MASTER_LAMA.test(req.path)) return tolakUbahMasterOlehRw(req, res);
    next();
  });

  const { pastikanSkemaWilayah } = await import("./wilayah-skema");
  await pastikanSkemaWilayah();
  const { registerWilayahRoutes } = await import("./wilayah-routes");
  registerWilayahRoutes(app);

  const { registerBlusukanRoutes } = await import("./blusukan-routes");
  await registerBlusukanRoutes(app);

  const { registerRtjuaraRoutes } = await import("./rtjuara-routes");
  await registerRtjuaraRoutes(app);
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

  registerVisitrw3Routes(app);

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

  // Verifikasi publik: hanya informasi minimum (nomor, tanggal, penerbit, status). Isi dokumen tidak ditampilkan.
  const halamanVerifikasi = async (res: any, by: { token?: string; id?: number }, nomorDiharapkan?: string | null) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex");
    res.setHeader("Referrer-Policy", "no-referrer");
    const { verifikasi } = await import("./surat-sakti/tindak");
    const s = await verifikasi(by).catch(() => undefined);
    const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" } as Record<string, string>)[c]);
    const cocok = !!s && (nomorDiharapkan === undefined || nomorDiharapkan === s.nomor_surat);
    const statusTeks = !s || !cocok ? (nomorDiharapkan === "" || !s ? "TIDAK DITEMUKAN" : "NOMOR TIDAK SESUAI")
      : s.status === "terbit" ? "TERDAFTAR & BERLAKU"
      : s.status === "digantikan" ? "SUDAH DIGANTIKAN"
      : s.status === "dibatalkan" ? "DIBATALKAN" : s.status.toUpperCase();
    const baik = cocok && s?.status === "terbit";
    const baris = s && cocok ? [
      ["Nomor", s.nomor_surat], ["Tanggal", s.tanggal_surat ?? "-"], ["Jenis", s.jenis_surat],
      ["Penerbit", "Ketua RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi"],
    ] : [];
    res.status(s && cocok ? 200 : 404).type("html").send(`<!doctype html><html lang="id"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Cek Nomor Dokumen RW 03</title><style>
body{margin:0;font-family:system-ui,sans-serif;background:#f5f5f4;color:#1c1917}.w{max-width:560px;margin:0 auto;padding:28px 18px}
.c{background:#fff;border:1px solid #e7e5e4;border-radius:18px;overflow:hidden}.h{background:hsl(163,55%,22%);color:#fff;padding:18px 20px}
.h b{display:block;font-size:18px}.s{display:inline-block;margin:16px 20px 4px;padding:6px 12px;border-radius:999px;font-weight:700;font-size:13px;
background:${baik ? "#dcfce7" : "#fee2e2"};color:${baik ? "#166534" : "#991b1b"}}dl{margin:0;padding:8px 20px 4px;display:grid;grid-template-columns:110px 1fr;gap:8px 12px;font-size:15px}
dt{color:#57534e}dd{margin:0;font-weight:600;word-break:break-word}p{padding:0 20px 18px;font-size:13px;line-height:1.6;color:#57534e}</style></head>
<body><div class="w"><div class="c"><div class="h"><small>KPP RW 03 Padasuka</small><b>Cek Nomor Dokumen</b></div>
<span class="s">${statusTeks}</span><dl>${baris.map(([k, v]) => `<dt>${k}</dt><dd>${esc(String(v))}</dd>`).join("")}</dl>
<p>Halaman ini hanya mencocokkan nomor dan status dokumen pada arsip RW 03. Ini bukan tanda tangan elektronik tersertifikasi;
dokumen sah bila ditandatangani basah oleh pejabat yang tercantum. Isi dokumen tidak ditampilkan di sini.</p></div></div></body></html>`);
  };

  app.get("/verify/surat/:token", async (req, res) => {
    const token = String(req.params.token);
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return halamanVerifikasi(res, { token: "-" });
    await halamanVerifikasi(res, { token });
  });

  // Tautan QR arsip lama (ID berurutan): wajib menyertakan ?nomor= agar ID tidak bisa ditelusuri satu per satu.
  app.get("/verify/surat-rw/:id", async (req, res) => {
    const id = Number(req.params.id);
    await halamanVerifikasi(res, { id: Number.isInteger(id) && id > 0 ? id : -1 }, typeof req.query.nomor === "string" ? req.query.nomor : "");
  });

  app.post("/api/surat-rw", requireAdmin, async (req, res) => {
    try {
      const parsed = insertSuratRwSchema.parse(req.body);

      if (!parsed.isiSurat || parsed.isiSurat.length < 100) {
        return res.status(400).json({ message: "Isi surat tidak valid atau terlalu pendek." });
      }

      const data = await storage.createSuratRw(parsed);

      const tanggalTerbit = parsed.tanggalSurat ? new Date(`${parsed.tanggalSurat}T00:00:00`) : new Date();
      const { nomoriSuratLama } = await import("./wilayah-surat");
      if (await nomoriSuratLama(data.id, parsed.jenisSurat, tanggalTerbit)) {
        return res.json(await storage.getSuratRwById(data.id));
      }

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

  // === Iuran Routes ===

  // === Pemilik Kost Routes (dihapus dari produk — arsip API) ===
  app.get("/api/pemilik-kost", requireAdmin, async (_req, res) => {
    res.status(410).json({ message: "Modul pemilik properti sudah tidak tersedia" });
  });

  app.get("/api/pemilik-kost/:id", requireAdmin, async (_req, res) => {
    res.status(410).json({ message: "Modul pemilik properti sudah tidak tersedia" });
  });

  app.post("/api/pemilik-kost", requireAdmin, async (_req, res) => {
    res.status(410).json({ message: "Modul pemilik properti sudah tidak tersedia" });
  });

  app.put("/api/pemilik-kost/:id", requireAdmin, async (_req, res) => {
    res.status(410).json({ message: "Modul pemilik properti sudah tidak tersedia" });
  });

  app.delete("/api/pemilik-kost/:id", requireAdmin, async (_req, res) => {
    res.status(410).json({ message: "Modul pemilik properti sudah tidak tersedia" });
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
      invalidateVisitrw3Dashboard();
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
      invalidateVisitrw3Dashboard();
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
      invalidateVisitrw3Dashboard();
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
      invalidateVisitrw3Dashboard();
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
      notifyUsahaDidaftar(created);
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
        const updated = await storage.getUsahaById(usahaId);
        if (updated) notifyUsahaDisetujui(updated, result);
        res.json({ message: "Usaha disetujui dan stiker diterbitkan", nomorStiker: result.nomorStiker });
      } else {
        if (!alasanPenolakan || !alasanPenolakan.trim()) {
          return res.status(400).json({ message: "Alasan penolakan harus diisi" });
        }
        await storage.updateUsahaStatus(usahaId, "ditolak", { alasanPenolakan });
        const updated = await storage.getUsahaById(usahaId);
        if (updated) notifyUsahaDitolak(updated, alasanPenolakan.trim());
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
      const updated = await storage.getUsahaById(usahaId);
      if (updated) {
        notifyUsahaStikerPerpanjang(updated, {
          nomorStiker: result.nomorStiker,
          tanggalExpired: result.tanggalExpired,
        });
      }
      res.json({ message: "Stiker berhasil diperpanjang", nomorStiker: result.nomorStiker, tanggalExpired: result.tanggalExpired });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/blusukan-summary", requireAdmin, async (req, res) => {
    try {
      const rtParam = req.query.rt ? parseInt(req.query.rt as string) : undefined;
      const rtFilter = rtParam && !isNaN(rtParam) ? rtParam : undefined;
      const data = await getBlusukanDashboard(rtFilter);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}

