import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { storage } from "./storage";
import { insertKkSchema, insertWargaSchema, insertLaporanSchema, insertSuratWargaSchema, insertSuratRwSchema, insertProfileEditSchema, insertWaBlastSchema, insertPengajuanBansosSchema, insertDonasiCampaignSchema, insertDonasiSchema, insertKasRwSchema, insertPemilikKostSchema, insertWargaSinggahSchema, insertUsahaSchema, insertKaryawanUsahaSchema, insertIzinTetanggaSchema, insertSurveyUsahaSchema } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    kkId?: number;
    nomorKk?: string;
    isAdmin?: boolean;
    adminId?: number;
    adminUsername?: string;
    adminNama?: string;
  }
}

async function generateWithGemini(prompt: string, maxRetries = 2): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (attempt < maxRetries) {
        console.warn(`Gemini API error (attempt ${attempt + 1}), retrying...`, errorText);
        continue;
      }
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || "";
    const finishReason = candidate?.finishReason;

    if (finishReason === "MAX_TOKENS" && attempt < maxRetries) {
      console.warn(`Gemini response truncated (MAX_TOKENS), retrying attempt ${attempt + 2}...`);
      continue;
    }

    if (!text || text.length < 100) {
      if (attempt < maxRetries) {
        console.warn(`Gemini response too short (${text.length} chars), retrying...`);
        continue;
      }
    }

    return text;
  }

  throw new Error("Gemini gagal menghasilkan surat setelah beberapa percobaan");
}

async function sendWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
  const apiKey = process.env.STARSENDER_API_KEY;
  const deviceId = process.env.STARSENDER_DEVICE_ID;
  if (!apiKey || !deviceId) return false;

  let formattedPhone = phoneNumber.replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "62" + formattedPhone.substring(1);
  }
  if (!formattedPhone.startsWith("62")) {
    formattedPhone = "62" + formattedPhone;
  }

  try {
    const response = await fetch("https://api.starsender.online/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify({
        messageType: "text",
        to: formattedPhone,
        body: message,
        device_id: deviceId,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return false;
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
  sosial: "Sosial",
  lainnya: "Lainnya",
};

async function notifyWarga(wargaId: number, template: string) {
  try {
    const w = await storage.getWargaById(wargaId);
    if (!w?.nomorWhatsapp) return;
    await sendWhatsApp(w.nomorWhatsapp, template);
  } catch (err) {
    console.error("Notif WA gagal:", err);
  }
}

const ADMIN_NOTIF_PHONE = "085860604142";

async function notifyAdmin(message: string) {
  try {
    await sendWhatsApp(ADMIN_NOTIF_PHONE, message);
  } catch (err) {
    console.error("Notif admin WA gagal:", err);
  }
}

const otpStore = new Map<string, { otp: string; kkId: number; nomorKk: string; phone: string; expiresAt: number; attempts: number; lastRequestAt: number }>();
const singgahOtpStore = new Map<string, { otp: string; wargaSinggahId: number; nik: string; phone: string; expiresAt: number; attempts: number; lastRequestAt: number }>();

const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(path.join(uploadsDir, "kk"), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, "ktp"), { recursive: true });
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

const uploadStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const type = (req as any).uploadType || "kk";
    cb(null, path.join(uploadsDir, type));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Format file tidak didukung. Gunakan JPG, PNG, atau PDF."));
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    app.set("trust proxy", 1);
  }
  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

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
    const id = req.params.id.replace(/[^a-zA-Z0-9\-_]/g, "");
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

  app.post("/api/auth/check-kk", async (req, res) => {
    try {
      const { nomorKk } = req.body;
      if (!nomorKk) {
        return res.status(400).json({ message: "Nomor KK harus diisi" });
      }

      const kk = await storage.getKkByNomor(nomorKk);
      if (!kk) {
        return res.status(404).json({ message: "Nomor KK tidak ditemukan" });
      }

      const members = await storage.getWargaByKkId(kk.id);
      const contacts = members
        .filter(w => w.nomorWhatsapp)
        .map(w => ({
          id: w.id,
          nama: w.namaLengkap,
          phone: w.nomorWhatsapp!.replace(/(\d{4})(\d+)(\d{3})/, "$1****$3"),
          kedudukan: w.kedudukanKeluarga,
        }));

      if (contacts.length === 0) {
        return res.status(400).json({ message: "Tidak ada nomor WhatsApp terdaftar di KK ini. Hubungi admin RW." });
      }

      return res.json({ contacts });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const { nomorKk, wargaId } = req.body;
      if (!nomorKk || !wargaId) {
        return res.status(400).json({ message: "Nomor KK dan penerima OTP harus diisi" });
      }

      const kk = await storage.getKkByNomor(nomorKk);
      if (!kk) {
        return res.status(404).json({ message: "Nomor KK tidak ditemukan" });
      }

      const target = await storage.getWargaById(wargaId);
      if (!target || target.kkId !== kk.id || !target.nomorWhatsapp) {
        return res.status(400).json({ message: "Nomor WhatsApp tidak valid untuk KK ini" });
      }

      const existing = otpStore.get(nomorKk);
      if (existing && (Date.now() - existing.lastRequestAt) < 60000) {
        return res.status(429).json({ message: "Tunggu 60 detik sebelum meminta OTP lagi" });
      }

      const otp = String(Math.floor(Math.random() * 90) + 10);
      const expiresAt = Date.now() + 5 * 60 * 1000;

      otpStore.set(nomorKk, { otp, kkId: kk.id, nomorKk: kk.nomorKk, phone: target.nomorWhatsapp, expiresAt, attempts: 0, lastRequestAt: Date.now() });

      const message = `[RW 03 Padasuka]\n\nKode OTP login: *${otp}*\nBerlaku 5 menit.\nJangan berikan kode ini ke siapapun ya.\n\nLogin di web 👉 rw3padasukacimahi.org`;
      const sent = await sendWhatsApp(target.nomorWhatsapp, message);

      if (!sent) {
        return res.status(500).json({ message: "Gagal mengirim OTP. Coba lagi nanti." });
      }

      const maskedPhone = target.nomorWhatsapp.replace(/(\d{4})(\d+)(\d{3})/, "$1****$3");
      return res.json({ message: "OTP terkirim", phone: maskedPhone, nama: target.namaLengkap });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { nomorKk, otp } = req.body;
      if (!nomorKk || !otp) {
        return res.status(400).json({ message: "Nomor KK dan kode OTP harus diisi" });
      }

      const stored = otpStore.get(nomorKk);
      if (!stored) {
        return res.status(400).json({ message: "Silakan minta OTP terlebih dahulu" });
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(nomorKk);
        return res.status(400).json({ message: "Kode OTP sudah kadaluarsa. Silakan minta ulang." });
      }

      if (stored.attempts >= 5) {
        otpStore.delete(nomorKk);
        return res.status(429).json({ message: "Terlalu banyak percobaan. Silakan minta OTP baru." });
      }

      if (stored.otp !== otp) {
        stored.attempts++;
        return res.status(401).json({ message: "Kode OTP salah" });
      }

      otpStore.delete(nomorKk);

      req.session.kkId = stored.kkId;
      req.session.nomorKk = stored.nomorKk;
      req.session.isAdmin = false;
      return res.json({ type: "warga", kkId: stored.kkId, nomorKk: stored.nomorKk, message: "Login berhasil" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

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
          return res.json({ type: "admin", message: "Login admin berhasil", adminId: adminAccount.id, username: adminAccount.username, namaLengkap: adminAccount.namaLengkap });
        }
      }

      return res.status(401).json({ message: "Login tidak valid" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/singgah/check-nik", async (req, res) => {
    try {
      const { nik } = req.body;
      if (!nik || nik.length !== 16) {
        return res.status(400).json({ message: "NIK harus 16 digit" });
      }
      const ws = await storage.getWargaSinggahByNik(nik);
      if (!ws) {
        return res.status(404).json({ message: "NIK tidak terdaftar sebagai warga singgah" });
      }
      if (ws.status !== "aktif") {
        return res.status(400).json({ message: "Status kontrak Anda sudah tidak aktif. Hubungi admin RW." });
      }
      const maskedPhone = ws.nomorWhatsapp.replace(/(\d{4})(\d+)(\d{3})/, "$1****$3");
      return res.json({ nama: ws.namaLengkap, phone: maskedPhone });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/singgah/request-otp", async (req, res) => {
    try {
      const { nik } = req.body;
      if (!nik) {
        return res.status(400).json({ message: "NIK harus diisi" });
      }
      const ws = await storage.getWargaSinggahByNik(nik);
      if (!ws || ws.status !== "aktif") {
        return res.status(404).json({ message: "NIK tidak ditemukan atau tidak aktif" });
      }
      const existing = singgahOtpStore.get(nik);
      if (existing && (Date.now() - existing.lastRequestAt) < 60000) {
        return res.status(429).json({ message: "Tunggu 60 detik sebelum meminta OTP lagi" });
      }
      const otp = String(Math.floor(Math.random() * 90) + 10);
      const expiresAt = Date.now() + 5 * 60 * 1000;
      singgahOtpStore.set(nik, { otp, wargaSinggahId: ws.id, nik: ws.nik, phone: ws.nomorWhatsapp, expiresAt, attempts: 0, lastRequestAt: Date.now() });
      const message = `[RW 03 Padasuka]\n\nKode OTP login Warga Singgah: *${otp}*\nBerlaku 5 menit.\nJangan berikan kode ini ke siapapun ya.`;
      const sent = await sendWhatsApp(ws.nomorWhatsapp, message);
      if (!sent) {
        return res.status(500).json({ message: "Gagal mengirim OTP. Coba lagi nanti." });
      }
      const maskedPhone = ws.nomorWhatsapp.replace(/(\d{4})(\d+)(\d{3})/, "$1****$3");
      return res.json({ message: "OTP terkirim", phone: maskedPhone, nama: ws.namaLengkap });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/singgah/verify-otp", async (req, res) => {
    try {
      const { nik, otp } = req.body;
      if (!nik || !otp) {
        return res.status(400).json({ message: "NIK dan kode OTP harus diisi" });
      }
      const stored = singgahOtpStore.get(nik);
      if (!stored) {
        return res.status(400).json({ message: "Silakan minta OTP terlebih dahulu" });
      }
      if (Date.now() > stored.expiresAt) {
        singgahOtpStore.delete(nik);
        return res.status(400).json({ message: "Kode OTP sudah kadaluarsa. Silakan minta ulang." });
      }
      if (stored.attempts >= 5) {
        singgahOtpStore.delete(nik);
        return res.status(429).json({ message: "Terlalu banyak percobaan. Silakan minta OTP baru." });
      }
      if (stored.otp !== otp) {
        stored.attempts++;
        return res.status(401).json({ message: "Kode OTP salah" });
      }
      singgahOtpStore.delete(nik);
      (req.session as any).wargaSinggahId = stored.wargaSinggahId;
      (req.session as any).wargaSinggahNik = stored.nik;
      (req.session as any).isWargaSinggah = true;
      return res.json({ type: "warga_singgah", wargaSinggahId: stored.wargaSinggahId, nik: stored.nik, message: "Login berhasil" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session.isAdmin) {
      return res.json({ type: "admin", isAdmin: true, adminId: req.session.adminId, username: req.session.adminUsername, namaLengkap: req.session.adminNama });
    }
    if ((req.session as any).isWargaSinggah) {
      return res.json({ type: "warga_singgah", wargaSinggahId: (req.session as any).wargaSinggahId, nik: (req.session as any).wargaSinggahNik });
    }
    if (req.session.kkId) {
      return res.json({ type: "warga", kkId: req.session.kkId, nomorKk: req.session.nomorKk });
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
      const stats = await storage.getDashboardStats(rtFilter);
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

      function sanitizeData(input: any): any {
        if (Array.isArray(input)) {
          if (input.length > 0 && input[0]?.nama) {
            return { totalOrang: input.length, catatan: "Daftar nama dihapus untuk privasi" };
          }
          return input.slice(0, 20).map(sanitizeData);
        }
        if (input && typeof input === "object") {
          const sanitized: Record<string, any> = {};
          for (const [key, val] of Object.entries(input)) {
            if (["daftarNama", "nama", "namaLengkap", "nik", "nomorWhatsapp", "fotoKtp"].includes(key)) continue;
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

  app.get("/api/kk", requireAuth, async (req, res) => {
    if (req.session.isAdmin) {
      const data = await storage.getAllKk();
      return res.json(data);
    }
    const data = await storage.getKkById(req.session.kkId!);
    return res.json(data ? [data] : []);
  });

  app.get("/api/kk/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (!req.session.isAdmin && req.session.kkId !== id) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    const data = await storage.getKkById(id);
    if (!data) return res.status(404).json({ message: "KK tidak ditemukan" });
    res.json(data);
  });

  app.post("/api/kk", requireAdmin, async (req, res) => {
    try {
      const parsed = insertKkSchema.parse(req.body);
      const data = await storage.createKk(parsed);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/kk/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = insertKkSchema.partial().parse(req.body);
      const data = await storage.updateKk(parseInt(req.params.id), parsed);
      if (!data) return res.status(404).json({ message: "KK tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/kk/:id", requireAdmin, async (req, res) => {
    try {
      const kk = await storage.getKkById(parseInt(req.params.id));
      if (!kk) return res.status(404).json({ message: "KK tidak ditemukan" });
      await storage.deleteKk(kk.id);
      res.json({ message: "KK dan semua data terkait berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Gagal menghapus KK" });
    }
  });

  app.get("/api/warga", requireAdmin, async (_req, res) => {
    const data = await storage.getAllWarga();
    res.json(data);
  });

  app.get("/api/warga/kk/:kkId", requireAuth, async (req, res) => {
    const kkId = parseInt(req.params.kkId);
    if (!req.session.isAdmin && req.session.kkId !== kkId) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    const data = await storage.getWargaByKkId(kkId);
    res.json(data);
  });

  app.get("/api/warga/:id", requireAuth, async (req, res) => {
    const data = await storage.getWargaById(parseInt(req.params.id));
    if (!data) return res.status(404).json({ message: "Warga tidak ditemukan" });
    if (!req.session.isAdmin && data.kkId !== req.session.kkId) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    res.json(data);
  });

  app.post("/api/warga", requireAdmin, async (req, res) => {
    try {
      const parsed = insertWargaSchema.parse(req.body);
      const data = await storage.createWarga(parsed);

      res.json(data);

      if (data.nomorWhatsapp) {
        (async () => {
          try {
            const kk = await storage.getKkById(data.kkId);
            const rtNum = kk ? String(kk.rt).padStart(2, "0") : "—";
            const nomorKkText = kk ? kk.nomorKk : "nomor KK Anda";
            const waMessage = `Assalamu'alaikum ${data.jenisKelamin === "Perempuan" ? "Ibu" : "Bapak"} *${data.namaLengkap}* 🙏

[RW 03 Padasuka - Kelurahan Padasuka, Kota Cimahi]

Selamat! Data Wargi sudah berhasil terdaftar di sistem informasi digital RW 03 Padasuka ✅

📌 *Apa itu rw3padasukacimahi.org?*
Website resmi RW 03 Padasuka untuk memudahkan warga dalam mengurus administrasi dan layanan RT/RW secara online, kapan saja dan di mana saja.

🔑 *Fitur yang bisa Wargi gunakan:*
• Mengajukan surat keterangan (domisili, SKTM, usaha, dll) tanpa harus datang ke RT/RW
• Melaporkan masalah (keamanan, kebersihan, infrastruktur)
• Melihat data profil keluarga
• Mengecek status bansos

📱 *Cara menggunakannya:*
1. Buka 👉 *rw3padasukacimahi.org*
2. Masukkan *Nomor KK* (${nomorKkText})
3. Pilih nama Wargi, lalu kode OTP akan dikirim ke WhatsApp ini
4. Masukkan kode OTP → langsung bisa menggunakan semua fitur

Data Wargi:
• Nama: ${data.namaLengkap}
• RT/RW: ${rtNum}/03

Jika ada kendala, silakan hubungi pengurus RT ${rtNum} atau pengurus RW 03.

Hatur nuhun! 🙏
Salam hangat dari pengurus RW 03 Padasuka`;

            await sendWhatsApp(data.nomorWhatsapp, waMessage);
          } catch (err) {
            console.error("Notif WA warga baru gagal:", err);
          }
        })();
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/warga/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = insertWargaSchema.partial().parse(req.body);
      const data = await storage.updateWarga(parseInt(req.params.id), parsed);
      if (!data) return res.status(404).json({ message: "Warga tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/warga/:id", requireAdmin, async (req, res) => {
    try {
      const w = await storage.getWargaById(parseInt(req.params.id));
      if (!w) return res.status(404).json({ message: "Warga tidak ditemukan" });
      await storage.deleteWarga(w.id);
      res.json({ message: "Warga dan semua data terkait berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Gagal menghapus warga" });
    }
  });

  app.get("/api/warga-with-kk", requireAdmin, async (_req, res) => {
    const data = await storage.getAllWargaWithKk();
    res.json(data);
  });

  app.get("/api/rt", async (_req, res) => {
    const data = await storage.getAllRt();
    res.json(data);
  });

  app.patch("/api/rt/:id", requireAdmin, async (req, res) => {
    const data = await storage.updateRt(parseInt(req.params.id), req.body);
    if (!data) return res.status(404).json({ message: "RT tidak ditemukan" });
    res.json(data);
  });

  app.get("/api/laporan", requireAuth, async (req, res) => {
    if (req.session.isAdmin) {
      const data = await storage.getAllLaporan();
      return res.json(data);
    }
    const data = await storage.getLaporanByKkId(req.session.kkId!);
    res.json(data);
  });

  app.post("/api/laporan", requireAuth, async (req, res) => {
    try {
      const parsed = insertLaporanSchema.parse(req.body);
      if (!req.session.isAdmin) {
        if (parsed.kkId !== req.session.kkId) {
          return res.status(403).json({ message: "Akses ditolak" });
        }
        const w = await storage.getWargaById(parsed.wargaId);
        if (!w || w.kkId !== req.session.kkId) {
          return res.status(403).json({ message: "Warga bukan anggota KK Anda" });
        }
      }
      const data = await storage.createLaporan(parsed);

      const jenisLabel = jenisLaporanLabels[parsed.jenisLaporan] || parsed.jenisLaporan;
      notifyWarga(parsed.wargaId, `[RW 03 Padasuka]\n\nLaporan Wargi berhasil dikirim ✅\n\nJudul: *${parsed.judul}*\nKategori: ${jenisLabel}\n\nLaporan akan segera ditinjau oleh pengurus RW.\n\nSekarang cek status laporan jadi gampang, langsung buka aja web kita di 👉 rw3padasukacimahi.org\n\nHatur nuhun Wargi! 🙏`);

      if (!req.session.isAdmin) {
        const wargaInfo = await storage.getWargaById(parsed.wargaId);
        const namaWarga = wargaInfo?.namaLengkap || "Warga";
        notifyAdmin(`[RW 03 Padasuka - Admin]\n\n📢 *Laporan Baru Masuk!*\n\nDari: *${namaWarga}*\nJudul: *${parsed.judul}*\nKategori: ${jenisLabel}\n\nSegera cek dan tindak lanjuti di 👉 rw3padasukacimahi.org`);
      }

      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/laporan/:id/status", requireAdmin, async (req, res) => {
    const { status, tanggapan } = req.body;
    if (!["diproses", "selesai", "ditolak"].includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
    }
    const data = await storage.updateLaporanStatus(parseInt(req.params.id), status, tanggapan);
    if (!data) return res.status(404).json({ message: "Laporan tidak ditemukan" });

    const statusLabels: Record<string, string> = {
      diproses: "sedang diproses",
      selesai: "telah selesai ditangani",
      ditolak: "ditolak",
    };
    const statusText = statusLabels[status] || status;
    let waMsg = `[RW 03 Padasuka]\n\nUpdate Laporan Wargi:\n\nJudul: *${data.judul}*\nStatus: *${statusText.charAt(0).toUpperCase() + statusText.slice(1)}*`;
    if (tanggapan) waMsg += `\n\nTanggapan Admin:\n${tanggapan}`;
    if (status === "selesai") waMsg += `\n\nHatur nuhun atas laporannya Wargi, semoga lingkungan kita semakin baik! 🙏`;
    waMsg += `\n\nCek detail laporan langsung di web 👉 rw3padasukacimahi.org`;
    notifyWarga(data.wargaId, waMsg);

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

      const jenisLabel = jenisSuratLabels[parsed.jenisSurat] || parsed.jenisSurat;
      notifyWarga(parsed.wargaId, `[RW 03 Padasuka]\n\nPermohonan surat Wargi berhasil dikirim ✅\n\nJenis: *${jenisLabel}*\nPerihal: ${parsed.perihal}\n\nPermohonan akan segera diproses pengurus RW. Nanti Wargi dapet notifikasi lagi ya kalau sudah selesai.\n\nUntuk tanya status surat, hubungi admin via WhatsApp:\n👉 wa.me/6285860604142\n\nHatur nuhun! 🙏`);

      if (!req.session.isAdmin) {
        const wargaInfo = await storage.getWargaById(parsed.wargaId);
        const namaWarga = wargaInfo?.namaLengkap || "Warga";
        const kk = await storage.getKkById(parsed.kkId);
        const alamat = kk ? `${kk.alamat}, RT ${String(kk.rt).padStart(2, "0")}/RW 03` : "-";
        notifyAdmin(`[RW 03 Padasuka - Admin]\n\n📋 *Permohonan Surat Baru!*\n\nDari: *${namaWarga}*\nNIK: ${wargaInfo?.nik || "-"}\nAlamat: ${alamat}\nRT: ${String(parsed.nomorRt).padStart(2, "0")}\n\nJenis Surat: *${jenisLabel}*\nPerihal: ${parsed.perihal}${parsed.keterangan ? `\nKeterangan: ${parsed.keterangan}` : ""}\n\nSegera proses di 👉 rw3padasukacimahi.org`);
      }

      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const suratUploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(uploadsDir, "surat")),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
  const suratUpload = multer({
    storage: suratUploadStorage,
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
      const surat = await storage.getSuratWargaById(parseInt(req.params.id));
      if (!surat) return res.status(404).json({ message: "Surat tidak ditemukan" });
      if (!req.file) return res.status(400).json({ message: "File tidak ditemukan" });

      const filePath = `/uploads/surat/${req.file.filename}`;
      const updated = await storage.updateSuratWargaFileSurat(surat.id, filePath);
      res.json(updated);
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
      const surat = await storage.getSuratWargaById(parseInt(req.params.id));
      if (!surat) return res.status(404).json({ message: "Surat tidak ditemukan" });
      if (surat.status !== "pending") {
        return res.status(400).json({ message: "Hanya surat dengan status pending yang bisa diubah." });
      }

      const data = await storage.updateSuratWargaStatus(surat.id, status);
      if (!data) return res.status(404).json({ message: "Surat tidak ditemukan" });

      if (status === "disetujui" && nomorSurat) {
        await storage.updateSuratWargaNomor(surat.id, nomorSurat);
      }

      const jenisLabel = jenisSuratLabels[surat.jenisSurat] || surat.jenisSurat;

      if (status === "disetujui") {
        const updated = await storage.getSuratWargaById(surat.id);
        res.json(updated);
        notifyWarga(surat.wargaId, `[RW 03 Padasuka]\n\nSurat Wargi telah *DISETUJUI* ✅\n\nJenis: *${jenisLabel}*\nPerihal: ${surat.perihal}${nomorSurat ? `\nNomor Surat: ${nomorSurat}` : ""}\n\nUntuk pengambilan surat atau informasi lebih lanjut, silakan hubungi admin via WhatsApp:\n👉 wa.me/6285860604142\n\nHatur nuhun! 🙏`);
      } else if (status === "ditolak") {
        res.json(data);
        notifyWarga(surat.wargaId, `[RW 03 Padasuka]\n\nMohon maaf, permohonan surat Wargi *ditolak* ❌\n\nJenis: *${jenisLabel}*\nPerihal: ${surat.perihal}\n\nUntuk info lebih lanjut, hubungi admin via WhatsApp:\n👉 wa.me/6285860604142`);
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

  app.post("/api/surat-rw", requireAdmin, async (req, res) => {
    try {
      const { konteks, ...suratData } = req.body;
      const parsed = insertSuratRwSchema.parse(suratData);

      const contextBlock = konteks ? `\nDetail informasi tambahan:\n${konteks}\n` : "";

      const prompt = `Buatkan ${parsed.jenisSurat} resmi dari RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi.

Perihal: ${parsed.perihal}
${parsed.tujuan ? `Ditujukan kepada: ${parsed.tujuan}` : ""}
${parsed.tanggalSurat ? `Tanggal surat: ${parsed.tanggalSurat}` : `Tanggal surat: Cimahi, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}`}
${contextBlock}
INSTRUKSI PEMBUATAN SURAT:
1. Buat surat ${parsed.jenisSurat} yang lengkap, resmi, dan profesional.
2. Gunakan SEMUA informasi detail yang diberikan di atas secara akurat. Jangan mengarang data yang tidak diberikan.
3. Sesuaikan gaya bahasa dan format dengan jenis surat (undangan harus ada waktu/tempat/acara, surat tugas harus ada uraian tugas, dll).
4. Nama Ketua RW 03: Raden Raka.

LARANGAN:
1. JANGAN sertakan kop surat/header (sudah otomatis oleh sistem).
2. JANGAN sertakan nomor surat (sudah otomatis oleh sistem).
3. JANGAN gunakan markdown (bintang, hashtag, dll). Tulis teks biasa saja.
4. Urutan surat HARUS dimulai dari JUDUL SURAT dalam huruf kapital (contoh: SURAT UNDANGAN, SURAT TUGAS, dll), BARU KEMUDIAN di bawahnya tulis "Perihal: ..." atau "Lampiran: ...". JANGAN menaruh Perihal/Lampiran di atas judul surat.
5. Untuk label NIK, tulis "NIK" saja (3 huruf), JANGAN tulis "Nomor Induk Kependudukan".

FORMAT TANDA TANGAN (di akhir surat, WAJIB format vertikal atas-bawah):

Ketua RW 03
Kelurahan Padasuka


(Raden Raka)

Buat surat dalam format teks biasa yang rapi dan profesional.`;

      let isiSurat = "";
      let rwComplete = false;
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          isiSurat = await generateWithGemini(prompt);
          isiSurat = isiSurat.replace(/Nomor Induk Kependudukan\s*/gi, "NIK");
          isiSurat = isiSurat.replace(/```[a-z]*\n?/g, "").replace(/```/g, "").trim();

          const hasSignature = /Raden Raka/i.test(isiSurat);
          const hasTitle = /SURAT\s+/i.test(isiSurat);
          const hasDemikian = /[Dd]emikian/i.test(isiSurat);
          rwComplete = hasSignature && hasTitle && hasDemikian && isiSurat.length >= 200;
          if (rwComplete) break;
          console.warn(`Surat RW generate attempt ${attempt + 1} incomplete (len=${isiSurat.length}, sig=${hasSignature}, title=${hasTitle}, dem=${hasDemikian}), retrying...`);
        }
      } catch (err: any) {
        console.error("Gemini error:", err.message);
      }

      if (!rwComplete || !isiSurat || isiSurat.length < 100) {
        return res.status(500).json({ message: "Gagal membuat surat RW yang lengkap. Silakan coba lagi." });
      }

      const data = await storage.createSuratRw({ ...parsed, isiSurat });

      const currentCount = await storage.countSuratRwThisYear();
      const seq = String(currentCount + 1).padStart(3, "0");
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const nomorSurat = `${seq}/SK-RW/RW-03/${month}/${year}`;
      if (isiSurat && /XXX\//.test(isiSurat)) {
        const fixedIsi = isiSurat.replace(/XXX\/[^\n\r]*/g, nomorSurat);
        await storage.updateSuratRwIsi(data.id, fixedIsi);
      }
      await storage.updateSuratRwNomor(data.id, nomorSurat);
      const updated = await storage.getSuratRwById(data.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/profile-edits", requireAuth, async (req, res) => {
    if (req.session.isAdmin) {
      const data = await storage.getAllProfileEdits();
      return res.json(data);
    }
    const data = await storage.getProfileEditsByKkId(req.session.kkId!);
    res.json(data);
  });

  app.post("/api/profile-edits", requireAuth, async (req, res) => {
    try {
      const parsed = insertProfileEditSchema.parse(req.body);
      if (!req.session.isAdmin) {
        if (parsed.kkId !== req.session.kkId) {
          return res.status(403).json({ message: "Akses ditolak" });
        }
        const w = await storage.getWargaById(parsed.wargaId);
        if (!w || w.kkId !== req.session.kkId) {
          return res.status(403).json({ message: "Warga bukan anggota KK Anda" });
        }
      }
      const data = await storage.createProfileEdit(parsed);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/profile-edits/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;
    const edit = await storage.updateProfileEditStatus(parseInt(req.params.id), status);
    if (!edit) return res.status(404).json({ message: "Edit request tidak ditemukan" });

    if (status === "disetujui") {
      const changes = edit.fieldChanges as Record<string, any>;
      await storage.updateWarga(edit.wargaId, changes);
      const fieldList = Object.entries(changes).map(([k, v]) => `- ${k}: ${v}`).join("\n");
      notifyWarga(edit.wargaId, `[RW 03 Padasuka]\n\nPerubahan data profil Wargi telah *DISETUJUI* ✅\n\nData yang diperbarui:\n${fieldList}\n\nCek profil terbaru langsung di web 👉 rw3padasukacimahi.org\n\nHatur nuhun! 🙏`);
    } else if (status === "ditolak") {
      notifyWarga(edit.wargaId, `[RW 03 Padasuka]\n\nMohon maaf, pengajuan perubahan data profil Wargi *ditolak* ❌\n\nSilakan hubungi pengurus RW untuk info lebih lanjut atau ajukan ulang di web 👉 rw3padasukacimahi.org`);
    }

    res.json(edit);
  });

  app.get("/api/bansos/penerima", requireAdmin, async (_req, res) => {
    const data = await storage.getBansosRecipients();
    res.json(data);
  });

  app.patch("/api/bansos/penerima/:kkId/jenis", requireAdmin, async (req, res) => {
    try {
      const kkId = parseInt(req.params.kkId);
      const { jenisBansos } = req.body;
      if (!jenisBansos || typeof jenisBansos !== "string") return res.status(400).json({ message: "Jenis bansos harus diisi" });
      const kk = await storage.getKkById(kkId);
      if (!kk) return res.status(404).json({ message: "KK tidak ditemukan" });
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
      if (!kk) return res.status(404).json({ message: "KK tidak ditemukan" });
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
      if (!kk) return res.status(404).json({ message: "KK tidak ditemukan" });
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
      if (!kk) return res.status(404).json({ message: "KK tidak ditemukan" });

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
      const id = parseInt(req.params.id);
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

  app.get("/api/wa-blast", requireAdmin, async (_req, res) => {
    const data = await storage.getAllWaBlast();
    res.json(data);
  });

  app.post("/api/wa-blast/generate", requireAdmin, async (req, res) => {
    try {
      const { topik } = req.body;
      if (!topik || typeof topik !== "string") {
        return res.status(400).json({ message: "Topik pesan harus diisi" });
      }

      const prompt = `Kamu adalah Raden Raka, Ketua RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi.
Umur kamu masih 23 tahun, jadi gaya bicara kamu santai, hangat, dekat sama warga, tapi tetap sopan dan menghormati.
Kamu suka pakai sapaan "Wargi" untuk warga. Sesekali boleh pakai bahasa Sunda ringan biar akrab.

Buatkan pesan WhatsApp broadcast untuk warga RW 03 dengan topik: "${topik}"

ATURAN PENTING:
1. Gunakan placeholder berikut yang WAJIB ada dalam pesan:
   - {gender} = akan otomatis diganti jadi "Bapak" atau "Ibu" sesuai jenis kelamin penerima
   - {warga} = akan otomatis diganti jadi nama lengkap penerima
   - {rtxx} = akan otomatis diganti jadi nomor RT penerima (contoh: RT 03)
2. Awali dengan salam "Assalamu'alaikum Wr. Wb." dan sapaan "{gender} {warga} Wargi {rtxx} yang terhormat,"
3. Akhiri dengan ajakan cek web: "Info lengkap bisa dicek di web kita 👉 rw3padasukacimahi.org"
4. Tutup dengan "Hatur nuhun! 🙏" dan tanda tangan "Raden Raka - Ketua RW 03 Padasuka"
5. Jangan terlalu kaku/formal. Bayangkan kamu ngobrol santai tapi sopan ke warga yang sebagian besar lebih tua dari kamu.
6. Jangan pakai markdown (tanpa tanda *). Gunakan teks biasa saja.
7. Pesan harus singkat, padat, dan jelas. Maksimal 15 baris.
8. Jika ada informasi yang perlu diisi (tanggal, waktu, tempat dll), gunakan format [ISI ...] sebagai placeholder yang bisa diedit admin.

Langsung tulis pesannya saja tanpa penjelasan tambahan.`;

      let result = await generateWithGemini(prompt);
      result = result.trim();

      if (!result.includes("{gender}") || !result.includes("{warga}") || !result.includes("{rtxx}")) {
        const header = `Assalamu'alaikum Wr. Wb.\n\n{gender} {warga} Wargi {rtxx} yang terhormat,\n\n`;
        if (!result.includes("{gender}")) {
          result = header + result;
        }
      }

      res.json({ pesan: result });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/wa-blast/preview", requireAdmin, async (req, res) => {
    try {
      const kategori = (req.query.kategori as string) || "semua";
      const validKategori = ["semua", "per_rt", "kepala_keluarga", "penerima_bansos", "pemukiman", "perumahan", "pemilik_kost", "warga_singgah"];
      if (!validKategori.includes(kategori)) {
        return res.status(400).json({ message: "Kategori tidak valid" });
      }
      const rt = req.query.rt ? parseInt(req.query.rt as string) : undefined;
      if (kategori === "per_rt" && (!rt || rt < 1 || isNaN(rt))) {
        return res.status(400).json({ message: "Nomor RT tidak valid" });
      }

      if (kategori === "pemilik_kost") {
        const allPemilik = await storage.getAllPemilikKost();
        const uniquePhones = new Set<string>();
        for (const p of allPemilik) {
          if (p.nomorWaPemilik) uniquePhones.add(p.nomorWaPemilik);
        }
        return res.json({ total: uniquePhones.size });
      }

      if (kategori === "warga_singgah") {
        const allWs = await storage.getAllWargaSinggah();
        const uniquePhones = new Set<string>();
        for (const ws of allWs) {
          if (ws.status === "aktif" && ws.nomorWhatsapp) uniquePhones.add(ws.nomorWhatsapp);
        }
        return res.json({ total: uniquePhones.size });
      }

      const pemukimanRt = [1, 2, 3, 4];
      const perumahanRt = [5, 6, 7];

      let wargaList: any[] = [];
      if (kategori === "semua") {
        wargaList = await storage.getAllWargaWithKk();
      } else if (kategori === "per_rt" && rt) {
        wargaList = await storage.getWargaByRt(rt);
      } else if (kategori === "pemukiman") {
        const all = await storage.getAllWargaWithKk();
        wargaList = all.filter(w => pemukimanRt.includes(w.rt));
      } else if (kategori === "perumahan") {
        const all = await storage.getAllWargaWithKk();
        wargaList = all.filter(w => perumahanRt.includes(w.rt));
      } else if (kategori === "kepala_keluarga") {
        const all = await storage.getAllWargaWithKk();
        wargaList = all.filter(w => w.kedudukanKeluarga === "Kepala Keluarga");
      } else if (kategori === "penerima_bansos") {
        const allKk = await storage.getAllKk();
        const bansosKkIds = allKk.filter(k => k.penerimaBansos).map(k => k.id);
        const all = await storage.getAllWargaWithKk();
        wargaList = all.filter(w => bansosKkIds.includes(w.kkId) && w.kedudukanKeluarga === "Kepala Keluarga");
      } else {
        wargaList = await storage.getAllWargaWithKk();
      }

      const uniquePhones = new Set<string>();
      for (const w of wargaList) {
        if (w.nomorWhatsapp) uniquePhones.add(w.nomorWhatsapp);
      }

      res.json({ total: uniquePhones.size });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/wa-blast", requireAdmin, async (req, res) => {
    try {
      const parsed = insertWaBlastSchema.parse(req.body);
      const blast = await storage.createWaBlast(parsed);

      let wargaList: any[] = [];

      const pemukimanRt = [1, 2, 3, 4];
      const perumahanRt = [5, 6, 7];

      let useCustomRecipients = false;
      let customRecipients: { nomorWhatsapp: string; namaLengkap: string; jenisKelamin?: string; rt?: number }[] = [];

      if (parsed.kategoriFilter === "pemilik_kost") {
        const allPemilik = await storage.getAllPemilikKost();
        const uniquePhones = new Set<string>();
        for (const p of allPemilik) {
          if (p.nomorWaPemilik && !uniquePhones.has(p.nomorWaPemilik)) {
            uniquePhones.add(p.nomorWaPemilik);
            customRecipients.push({ nomorWhatsapp: p.nomorWaPemilik, namaLengkap: p.namaPemilik, rt: p.rt });
          }
        }
        useCustomRecipients = true;
      } else if (parsed.kategoriFilter === "warga_singgah") {
        const allWs = await storage.getAllWargaSinggah();
        const uniquePhones = new Set<string>();
        for (const ws of allWs) {
          if (ws.status === "aktif" && ws.nomorWhatsapp && !uniquePhones.has(ws.nomorWhatsapp)) {
            uniquePhones.add(ws.nomorWhatsapp);
            customRecipients.push({ nomorWhatsapp: ws.nomorWhatsapp, namaLengkap: ws.namaLengkap });
          }
        }
        useCustomRecipients = true;
      } else if (parsed.kategoriFilter === "semua") {
        wargaList = await storage.getAllWargaWithKk();
      } else if (parsed.kategoriFilter === "per_rt" && parsed.filterRt) {
        wargaList = await storage.getWargaByRt(parsed.filterRt);
      } else if (parsed.kategoriFilter === "pemukiman") {
        const all = await storage.getAllWargaWithKk();
        wargaList = all.filter(w => pemukimanRt.includes(w.rt));
      } else if (parsed.kategoriFilter === "perumahan") {
        const all = await storage.getAllWargaWithKk();
        wargaList = all.filter(w => perumahanRt.includes(w.rt));
      } else if (parsed.kategoriFilter === "kepala_keluarga") {
        const all = await storage.getAllWargaWithKk();
        wargaList = all.filter(w => w.kedudukanKeluarga === "Kepala Keluarga");
      } else if (parsed.kategoriFilter === "penerima_bansos") {
        const allKk = await storage.getAllKk();
        const bansosKkIds = allKk.filter(k => k.penerimaBansos).map(k => k.id);
        const all = await storage.getAllWargaWithKk();
        wargaList = all.filter(w => bansosKkIds.includes(w.kkId) && w.kedudukanKeluarga === "Kepala Keluarga");
      } else {
        wargaList = await storage.getAllWargaWithKk();
      }

      let recipients: any[];
      if (useCustomRecipients) {
        recipients = customRecipients;
      } else {
        const uniquePhones = new Set<string>();
        recipients = [];
        for (const w of wargaList) {
          if (w.nomorWhatsapp && !uniquePhones.has(w.nomorWhatsapp)) {
            uniquePhones.add(w.nomorWhatsapp);
            recipients.push(w);
          }
        }
      }

      await storage.updateWaBlastStatus(blast.id, "mengirim", recipients.length, 0);
      res.json({ message: "Blast sedang dikirim", total: recipients.length, blastId: blast.id });

      (async () => {
        let successCount = 0;
        try {
          for (const recipient of recipients) {
            let personalizedMsg = parsed.pesan;
            const gender = recipient.jenisKelamin === "Perempuan" ? "Ibu" : "Bapak";
            const rtNum = recipient.rt ? `RT ${String(recipient.rt).padStart(2, "0")}` : "RT -";
            personalizedMsg = personalizedMsg.replace(/\{gender\}/gi, gender);
            personalizedMsg = personalizedMsg.replace(/\{warga\}/gi, recipient.namaLengkap || "Warga");
            personalizedMsg = personalizedMsg.replace(/\{rtxx\}/gi, rtNum);
            const success = await sendWhatsApp(recipient.nomorWhatsapp, personalizedMsg);
            if (success) successCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          await storage.updateWaBlastStatus(blast.id, "terkirim", recipients.length, successCount);
          console.log(`WA Blast #${blast.id} selesai: ${successCount}/${recipients.length} berhasil`);
        } catch (err) {
          await storage.updateWaBlastStatus(blast.id, "terkirim", recipients.length, successCount);
          console.error(`WA Blast #${blast.id} error setelah ${successCount} terkirim:`, err);
        }
      })();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/upload/kk/:kkId", requireAuth, (req: Request, res: Response, next: any) => {
    (req as any).uploadType = "kk";
    next();
  }, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const kkId = parseInt(req.params.kkId);
      if (!req.file) return res.status(400).json({ message: "File harus diunggah" });

      const kk = await storage.getKkById(kkId);
      if (!kk) return res.status(404).json({ message: "KK tidak ditemukan" });

      if (!req.session.isAdmin && req.session.kkId !== kkId) {
        return res.status(403).json({ message: "Tidak memiliki akses" });
      }

      if (kk.fotoKk) {
        const oldPath = path.join(uploadsDir, "kk", path.basename(kk.fotoKk));
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch {}
      }

      const filePath = `/uploads/kk/${req.file.filename}`;
      await storage.updateKk(kkId, { fotoKk: filePath } as any);
      res.json({ path: filePath });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/upload/ktp/:wargaId", requireAuth, (req: Request, res: Response, next: any) => {
    (req as any).uploadType = "ktp";
    next();
  }, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const wargaId = parseInt(req.params.wargaId);
      if (!req.file) return res.status(400).json({ message: "File harus diunggah" });

      const w = await storage.getWargaById(wargaId);
      if (!w) return res.status(404).json({ message: "Warga tidak ditemukan" });

      if (!req.session.isAdmin && req.session.kkId !== w.kkId) {
        return res.status(403).json({ message: "Tidak memiliki akses" });
      }

      if (w.fotoKtp) {
        const oldPath = path.join(uploadsDir, "ktp", path.basename(w.fotoKtp));
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch {}
      }

      const filePath = `/uploads/ktp/${req.file.filename}`;
      await storage.updateWarga(wargaId, { fotoKtp: filePath } as any);
      res.json({ path: filePath });
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
    const result = await storage.updateDonasiCampaignStatus(parseInt(req.params.id), status);
    if (!result) return res.status(404).json({ message: "Campaign tidak ditemukan" });
    res.json(result);
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

      const parsed = insertDonasiSchema.parse({ ...req.body, kkId });
      if (parsed.jumlah <= 0) {
        return res.status(400).json({ message: "Jumlah donasi harus lebih dari 0" });
      }

      const campaigns = await storage.getAllDonasiCampaigns();
      const campaign = campaigns.find(c => c.id === parsed.campaignId);
      if (!campaign || campaign.status !== "aktif") {
        return res.status(400).json({ message: "Campaign tidak ditemukan atau sudah selesai" });
      }

      const result = await storage.createDonasi(parsed);

      const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
      notifyAdmin(`[RW 03 Padasuka - Admin]\n\n💰 *Donasi Baru Masuk!*\n\nDonatur: *${parsed.namaDonatur}*\nKegiatan: *${campaign.judul}*\nJumlah: *${formatRupiah(parsed.jumlah)}*\n\nSegera verifikasi di 👉 rw3padasukacimahi.org`);

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
    const donasiId = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      const existing = await storage.getKasRwById(id);
      if (!existing) return res.status(404).json({ message: "Transaksi tidak ditemukan" });
      if (existing.createdBy === "sistem") {
        return res.status(403).json({ message: "Transaksi otomatis dari donasi tidak bisa diedit manual" });
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
      const id = parseInt(req.params.id);
      const existing = await storage.getKasRwById(id);
      if (!existing) return res.status(404).json({ message: "Transaksi tidak ditemukan" });
      if (existing.createdBy === "sistem") {
        return res.status(403).json({ message: "Transaksi otomatis dari donasi tidak bisa dihapus manual" });
      }
      await storage.deleteKasRw(id);
      res.json({ message: "Transaksi berhasil dihapus" });
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      const data = await storage.getWargaSinggahById(id);
      if (!data) return res.status(404).json({ message: "Warga singgah tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/warga-singgah/:id/riwayat", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      const { tanggalMulaiBaru, tanggalHabisBaru } = req.body;
      if (!tanggalMulaiBaru || !tanggalHabisBaru) {
        return res.status(400).json({ message: "Tanggal mulai dan habis baru harus diisi" });
      }
      const result = await storage.perpanjangKontrak(id, tanggalMulaiBaru, tanggalHabisBaru);
      if (!result) return res.status(404).json({ message: "Warga singgah tidak ditemukan" });

      try {
        await sendWhatsApp(result.nomorWhatsapp,
          `Halo ${result.namaLengkap},\n\nKontrak Anda telah diperpanjang.\n📅 Mulai: ${tanggalMulaiBaru}\n📅 Habis: ${tanggalHabisBaru}\n\nTerima kasih telah menjadi warga singgah di wilayah RW 03 Padasuka.\n\n🌐 rw3padasukacimahi.org`
        );
      } catch {}

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/warga-singgah/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      await notifyAdmin(`📋 *Pendaftaran Usaha Baru*\n\n🏪 Nama: ${created.namaUsaha}\n👤 Pemilik: ${created.namaPemilik}\n📍 RT ${created.rt}\n📄 NIB: ${created.nib || '-'}\n\nMenunggu survey lapangan.`);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const usahaId = parseInt(req.params.id);
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
      const usahaId = parseInt(req.params.id);
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
        await sendWhatsApp(existing.nomorWaPemilik, `Halo ${existing.namaPemilik},\n\nUsaha "${existing.namaUsaha}" Anda telah *DISETUJUI* oleh RW 03 Padasuka.\n\n📋 Nomor Stiker: ${result.nomorStiker}\n📅 Berlaku: ${result.tanggalTerbit} s/d ${result.tanggalExpired}\n\nStiker berlaku selama 6 bulan. Harap diperpanjang sebelum masa berlaku habis.\n\n🏘️ RW 03 Padasuka\n🌐 rw3padasukacimahi.org`);
        res.json({ message: "Usaha disetujui dan stiker diterbitkan", nomorStiker: result.nomorStiker });
      } else {
        if (!alasanPenolakan || !alasanPenolakan.trim()) {
          return res.status(400).json({ message: "Alasan penolakan harus diisi" });
        }
        await storage.updateUsahaStatus(usahaId, "ditolak", { alasanPenolakan });
        await sendWhatsApp(existing.nomorWaPemilik, `Halo ${existing.namaPemilik},\n\nMohon maaf, usaha "${existing.namaUsaha}" Anda *TIDAK DISETUJUI* oleh RW 03 Padasuka.\n\nAlasan: ${alasanPenolakan || '-'}\n\nSilakan hubungi admin untuk informasi lebih lanjut.\n\n🏘️ RW 03 Padasuka`);
        res.json({ message: "Usaha ditolak" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/usaha/:id/perpanjang-stiker", requireAdmin, async (req, res) => {
    try {
      const usahaId = parseInt(req.params.id);
      const existing = await storage.getUsahaById(usahaId);
      if (!existing) return res.status(404).json({ message: "Usaha tidak ditemukan" });
      if (existing.status !== "disetujui") {
        return res.status(400).json({ message: "Hanya usaha yang sudah disetujui yang bisa diperpanjang stikernya" });
      }
      const result = await storage.perpanjangStiker(usahaId, existing.tanggalStikerExpired);
      await sendWhatsApp(existing.nomorWaPemilik, `Halo ${existing.namaPemilik},\n\nStiker usaha "${existing.namaUsaha}" telah *DIPERPANJANG*.\n\n📋 Nomor Stiker Baru: ${result.nomorStiker}\n📅 Berlaku: ${result.tanggalTerbit} s/d ${result.tanggalExpired}\n\n🏘️ RW 03 Padasuka\n🌐 rw3padasukacimahi.org`);
      res.json({ message: "Stiker berhasil diperpanjang", nomorStiker: result.nomorStiker, tanggalExpired: result.tanggalExpired });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === Scheduler: H-7 Kontrak Habis WA Notification ===
  async function checkKontrakMendekatiHabis() {
    try {
      const wargaH7 = await storage.getWargaSinggahMendekatiHabis(7);
      for (const ws of wargaH7) {
        const pesanPenghuni = `Halo ${ws.namaLengkap},\n\nKontrak tinggal Anda di ${ws.namaKost} akan berakhir pada tanggal ${ws.tanggalHabisKontrak} (7 hari lagi).\n\nApakah Anda berencana memperpanjang kontrak? Silakan hubungi pemilik kost (${ws.namaPemilik}) atau sampaikan ke pengurus RW.\n\nTerima kasih.\n🏘️ RW 03 Padasuka\n🌐 rw3padasukacimahi.org`;
        await sendWhatsApp(ws.nomorWhatsapp, pesanPenghuni);

        const pesanAdmin = `⚠️ *Notifikasi Kontrak H-7*\n\nWarga singgah berikut kontraknya akan habis 7 hari lagi:\n👤 Nama: ${ws.namaLengkap}\n📍 Kost: ${ws.namaKost}\n👤 Pemilik: ${ws.namaPemilik}\n📅 Habis: ${ws.tanggalHabisKontrak}`;
        await notifyAdmin(pesanAdmin);

        const pesanPemilik = `Halo ${ws.namaPemilik},\n\nKontrak penghuni berikut di ${ws.namaKost} akan berakhir dalam 7 hari:\n👤 Nama: ${ws.namaLengkap}\n📅 Habis: ${ws.tanggalHabisKontrak}\n\nMohon konfirmasi apakah akan diperpanjang.\n\n🏘️ RW 03 Padasuka`;
        await sendWhatsApp(ws.nomorWaPemilik, pesanPemilik);
      }
      if (wargaH7.length > 0) {
        console.log(`[Scheduler] Sent H-7 notifications to ${wargaH7.length} warga singgah`);
      }
    } catch (error) {
      console.error("[Scheduler] Error checking kontrak:", error);
    }
  }

  setInterval(checkKontrakMendekatiHabis, 24 * 60 * 60 * 1000);
  setTimeout(checkKontrakMendekatiHabis, 10000);

  async function checkStikerMendekatiExpired() {
    try {
      const usahaH30 = await storage.getUsahaMendekatiExpired(30);
      for (const u of usahaH30) {
        await sendWhatsApp(u.nomorWaPemilik, `Halo ${u.namaPemilik},\n\nStiker usaha "${u.namaUsaha}" akan habis masa berlakunya pada ${u.tanggalStikerExpired} (30 hari lagi).\n\nSilakan hubungi admin RW untuk memperpanjang stiker.\n\n🏘️ RW 03 Padasuka\n🌐 rw3padasukacimahi.org`);
        await notifyAdmin(`⚠️ *Stiker Usaha H-30*\n\n🏪 ${u.namaUsaha}\n👤 ${u.namaPemilik}\n📅 Expired: ${u.tanggalStikerExpired}`);
      }
      const usahaH7 = await storage.getUsahaMendekatiExpired(7);
      for (const u of usahaH7) {
        await sendWhatsApp(u.nomorWaPemilik, `Halo ${u.namaPemilik},\n\n⚠️ Stiker usaha "${u.namaUsaha}" akan habis masa berlakunya pada ${u.tanggalStikerExpired} (7 hari lagi).\n\nSegera hubungi admin RW untuk memperpanjang stiker sebelum masa berlaku habis.\n\n🏘️ RW 03 Padasuka\n🌐 rw3padasukacimahi.org`);
        await notifyAdmin(`🚨 *Stiker Usaha H-7*\n\n🏪 ${u.namaUsaha}\n👤 ${u.namaPemilik}\n📅 Expired: ${u.tanggalStikerExpired}`);
      }
      if (usahaH30.length + usahaH7.length > 0) {
        console.log(`[Scheduler] Sent stiker expiry notifications: H-30=${usahaH30.length}, H-7=${usahaH7.length}`);
      }
    } catch (error) {
      console.error("[Scheduler] Error checking stiker expiry:", error);
    }
  }

  setInterval(checkStikerMendekatiExpired, 24 * 60 * 60 * 1000);
  setTimeout(checkStikerMendekatiExpired, 15000);

  function requireSinggahAuth(req: Request, res: Response, next: NextFunction) {
    if (!(req.session as any).isWargaSinggah) {
      return res.status(401).json({ message: "Belum login sebagai warga singgah" });
    }
    next();
  }

  app.get("/api/singgah/profil", requireSinggahAuth, async (req, res) => {
    try {
      const wsId = (req.session as any).wargaSinggahId;
      const ws = await storage.getWargaSinggahById(wsId);
      if (!ws) {
        return res.status(404).json({ message: "Data tidak ditemukan" });
      }
      const pemilik = await storage.getPemilikKostById(ws.pemilikKostId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];
      const habis = new Date(ws.tanggalHabisKontrak + "T00:00:00");
      const diffMs = habis.getTime() - today.getTime();
      const sisaHari = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return res.json({
        ...ws,
        namaKost: pemilik?.namaKost || "-",
        namaPemilik: pemilik?.namaPemilik || "-",
        alamatKost: pemilik?.alamatLengkap || "-",
        sisaHari,
        sudahHabis: ws.tanggalHabisKontrak < todayStr,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/singgah/laporan", requireSinggahAuth, async (req, res) => {
    try {
      const wsId = (req.session as any).wargaSinggahId;
      const ws = await storage.getWargaSinggahById(wsId);
      if (!ws) {
        return res.status(404).json({ message: "Data tidak ditemukan" });
      }
      const { jenisLaporan, judul, isi } = req.body;
      if (!jenisLaporan || !judul || !isi) {
        return res.status(400).json({ message: "Semua field harus diisi" });
      }
      const laporan = await storage.createLaporan({
        wargaId: 0,
        kkId: 0,
        jenisLaporan,
        judul: `[Warga Singgah - ${ws.namaLengkap}] ${judul}`,
        isi: `Dari: ${ws.namaLengkap} (NIK: ${ws.nik})\nWA: ${ws.nomorWhatsapp}\n\n${isi}`,
      });
      await notifyAdmin(`Laporan baru dari warga singgah ${ws.namaLengkap}: ${judul}`);
      return res.json(laporan);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
