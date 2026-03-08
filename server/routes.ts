import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertKkSchema, insertWargaSchema, insertLaporanSchema, insertSuratWargaSchema, insertSuratRwSchema, insertProfileEditSchema, insertWaBlastSchema } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    kkId?: number;
    nomorKk?: string;
    isAdmin?: boolean;
  }
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
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

const otpStore = new Map<string, { otp: string; kkId: number; nomorKk: string; phone: string; expiresAt: number; attempts: number; lastRequestAt: number }>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

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

      const message = `[RW 03 Padasuka]\nKode OTP login Anda: *${otp}*\nBerlaku 5 menit.\nJangan berikan kode ini kepada siapapun.`;
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
          req.session.kkId = undefined;
          return res.json({ type: "admin", message: "Login admin berhasil" });
        }
      }

      return res.status(401).json({ message: "Login tidak valid" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session.isAdmin) {
      return res.json({ type: "admin", isAdmin: true });
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
      const data = await storage.updateKk(parseInt(req.params.id), req.body);
      if (!data) return res.status(404).json({ message: "KK tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/kk/:id", requireAdmin, async (req, res) => {
    await storage.deleteKk(parseInt(req.params.id));
    res.json({ message: "KK dihapus" });
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/warga/:id", requireAdmin, async (req, res) => {
    try {
      const data = await storage.updateWarga(parseInt(req.params.id), req.body);
      if (!data) return res.status(404).json({ message: "Warga tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/warga/:id", requireAdmin, async (req, res) => {
    await storage.deleteWarga(parseInt(req.params.id));
    res.json({ message: "Warga dihapus" });
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
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/laporan/:id/status", requireAdmin, async (req, res) => {
    const { status, tanggapan } = req.body;
    const data = await storage.updateLaporanStatus(parseInt(req.params.id), status, tanggapan);
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

  app.post("/api/surat-warga/:id/generate", requireAdmin, async (req, res) => {
    try {
      const surat = await storage.getSuratWargaById(parseInt(req.params.id));
      if (!surat) return res.status(404).json({ message: "Surat tidak ditemukan" });
      if (surat.status !== "pending") {
        return res.status(400).json({ message: "Hanya surat dengan status pending yang bisa di-generate" });
      }

      const w = await storage.getWargaById(surat.wargaId);
      const kk = await storage.getKkById(surat.kkId);
      const rt = await storage.getRtByNomor(surat.nomorRt);

      if (!w || !kk) {
        return res.status(400).json({ message: "Data warga/KK tidak ditemukan" });
      }

      const todayFormatted = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

      const prompt = `Buatkan surat keterangan dari RT/RW dengan format resmi bahasa Indonesia.
Jenis surat: ${surat.jenisSurat}
Perihal: ${surat.perihal}
${surat.keterangan ? `Keterangan tambahan: ${surat.keterangan}` : ""}

Data pemohon:
- Nama: ${w.namaLengkap}
- NIK: ${w.nik}
- Alamat: ${kk.alamat}
- RT: ${kk.rt} / RW: 03
- Kelurahan: Padasuka
- Kecamatan: Cimahi Tengah
- Kota: Cimahi
- Agama: ${w.agama}
- Pekerjaan: ${w.pekerjaan || "-"}
- Jenis Kelamin: ${w.jenisKelamin}

Ketua RT ${kk.rt}: ${rt?.namaKetua || "___________"}
Ketua RW 03: Raden Raka

Format surat harus lengkap dengan:
- Perihal
- Isi surat yang jelas dan profesional
- Tanggal surat: Cimahi, ${todayFormatted}

PENTING:
1. JANGAN sertakan kop surat/header karena kop surat akan ditambahkan secara otomatis oleh sistem.
2. JANGAN sertakan nomor surat karena nomor surat akan di-assign otomatis oleh sistem.
3. Langsung mulai dari "Perihal:" atau judul surat.
4. Bagian tanda tangan di bagian akhir surat HARUS menggunakan format DUA KOLOM sejajar kiri-kanan. Tulis PERSIS seperti ini (gunakan tanda | sebagai pemisah kolom):

Mengetahui, | Hormat kami,
Ketua RT ${String(kk.rt).padStart(2, "0")} | Ketua RW 03
Kelurahan Padasuka | Kelurahan Padasuka
|
|
(${rt?.namaKetua || "___________"}) | (Raden Raka)

5. Buat dalam format teks biasa yang rapi, bukan markdown. Jangan gunakan tanda bintang (*) atau formatting markdown apapun.
6. Untuk bagian biodata/data pemohon, gunakan format yang konsisten dengan tanda titik dua (:) yang sejajar.`;

      const isiSurat = await generateWithGemini(prompt);
      const updated = await storage.updateSuratWargaStatus(surat.id, surat.status, isiSurat);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/surat-warga/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const surat = await storage.getSuratWargaById(parseInt(req.params.id));
      if (!surat) return res.status(404).json({ message: "Surat tidak ditemukan" });
      if (status === "disetujui" && !surat.isiSurat) {
        return res.status(400).json({ message: "Surat belum di-generate. Silakan generate terlebih dahulu." });
      }
      const data = await storage.updateSuratWargaStatus(surat.id, status);
      if (!data) return res.status(404).json({ message: "Surat tidak ditemukan" });

      if (status === "disetujui" && !surat.nomorSurat) {
        const currentCount = await storage.countSuratWargaThisYear();
        const seq = String(currentCount + 1).padStart(3, "0");
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, "0");
        const nomorSurat = `${seq}/SK-W/RW-03/${month}/${year}`;
        if (surat.isiSurat && /XXX\//.test(surat.isiSurat)) {
          const fixedIsi = surat.isiSurat.replace(/XXX\/[^\n\r]*/g, nomorSurat);
          await storage.updateSuratWargaStatus(surat.id, status, fixedIsi);
        }
        await storage.updateSuratWargaNomor(surat.id, nomorSurat);
        const updated = await storage.getSuratWargaById(surat.id);
        return res.json(updated);
      }
      res.json(data);
    } catch (error: any) {
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
4. Langsung mulai dari "Lampiran:" atau "Perihal:" atau judul surat.

FORMAT TANDA TANGAN (di akhir surat, WAJIB format vertikal atas-bawah):

Ketua RW 03
Kelurahan Padasuka


(Raden Raka)

Buat surat dalam format teks biasa yang rapi dan profesional.`;

      let isiSurat = "";
      try {
        isiSurat = await generateWithGemini(prompt);
      } catch (err: any) {
        console.error("Gemini error:", err.message);
        isiSurat = "Gagal generate surat.";
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
    }

    res.json(edit);
  });

  app.get("/api/wa-blast", requireAdmin, async (_req, res) => {
    const data = await storage.getAllWaBlast();
    res.json(data);
  });

  app.post("/api/wa-blast", requireAdmin, async (req, res) => {
    try {
      const parsed = insertWaBlastSchema.parse(req.body);
      const blast = await storage.createWaBlast(parsed);

      let wargaList: any[] = [];

      if (parsed.kategoriFilter === "semua") {
        wargaList = await storage.getAllWargaWithKk();
      } else if (parsed.kategoriFilter === "per_rt" && parsed.filterRt) {
        wargaList = await storage.getWargaByRt(parsed.filterRt);
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

      const uniquePhones = new Set<string>();
      const recipients: any[] = [];
      for (const w of wargaList) {
        if (w.nomorWhatsapp && !uniquePhones.has(w.nomorWhatsapp)) {
          uniquePhones.add(w.nomorWhatsapp);
          recipients.push(w);
        }
      }

      let successCount = 0;
      for (const recipient of recipients) {
        const success = await sendWhatsApp(recipient.nomorWhatsapp, parsed.pesan);
        if (success) successCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await storage.updateWaBlastStatus(blast.id, "terkirim", successCount);
      const updated = await storage.getAllWaBlast();
      res.json({ sent: successCount, total: recipients.length, blast: updated[0] });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  return httpServer;
}
