import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username dan password harus diisi" });
      }

      if (username === "admin" && password === "admin2026") {
        req.session.isAdmin = true;
        req.session.kkId = undefined;
        return res.json({ type: "admin", message: "Login admin berhasil" });
      }

      const kk = await storage.getKkByNomor(username);
      if (!kk) {
        return res.status(401).json({ message: "Nomor KK tidak ditemukan" });
      }

      const lastFour = kk.nomorKk.slice(-4);
      if (password !== lastFour) {
        return res.status(401).json({ message: "Password salah. Gunakan 4 digit terakhir nomor KK" });
      }

      req.session.kkId = kk.id;
      req.session.nomorKk = kk.nomorKk;
      req.session.isAdmin = false;
      return res.json({ type: "warga", kkId: kk.id, nomorKk: kk.nomorKk, message: "Login berhasil" });
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

      const w = await storage.getWargaById(parsed.wargaId);
      const kk = await storage.getKkById(parsed.kkId);
      const rt = await storage.getRtByNomor(parsed.nomorRt);

      if (!w || !kk) {
        return res.status(400).json({ message: "Data warga/KK tidak ditemukan" });
      }

      const prompt = `Buatkan surat keterangan dari RT/RW dengan format resmi bahasa Indonesia.
Jenis surat: ${parsed.jenisSurat}
Perihal: ${parsed.perihal}
${parsed.keterangan ? `Keterangan tambahan: ${parsed.keterangan}` : ""}

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

Format surat harus lengkap dengan:
- Kop surat (RT/RW)
- Nomor surat
- Perihal
- Isi surat yang jelas
- Tempat tanda tangan RT dan RW
- Tanggal surat hari ini

Buat dalam format teks biasa yang rapi, bukan markdown.`;

      let isiSurat = "";
      try {
        isiSurat = await generateWithGemini(prompt);
      } catch (err: any) {
        console.error("Gemini error:", err.message);
        isiSurat = "Surat sedang diproses, silakan tunggu persetujuan admin.";
      }

      const data = await storage.createSuratWarga(parsed);
      await storage.updateSuratWargaStatus(data.id, "pending", isiSurat);
      const updated = await storage.getSuratWargaById(data.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/surat-warga/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;
    const data = await storage.updateSuratWargaStatus(parseInt(req.params.id), status);
    if (!data) return res.status(404).json({ message: "Surat tidak ditemukan" });
    res.json(data);
  });

  app.get("/api/surat-rw", requireAdmin, async (_req, res) => {
    const data = await storage.getAllSuratRw();
    res.json(data);
  });

  app.post("/api/surat-rw", requireAdmin, async (req, res) => {
    try {
      const parsed = insertSuratRwSchema.parse(req.body);

      const prompt = `Buatkan ${parsed.jenisSurat} resmi dari RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi.

Perihal: ${parsed.perihal}
${parsed.tujuan ? `Ditujukan kepada: ${parsed.tujuan}` : ""}
${parsed.tanggalSurat ? `Tanggal surat: ${parsed.tanggalSurat}` : `Tanggal surat: hari ini`}

Format surat harus lengkap dan resmi dengan:
- Kop surat RW 03 Kelurahan Padasuka
- Nomor surat
- Perihal
- Isi surat yang jelas dan profesional
- Tempat tanda tangan Ketua RW 03
- Nama Ketua RW: ___________

Buat dalam format teks biasa yang rapi, bukan markdown. Surat harus terlihat profesional dan resmi.`;

      let isiSurat = "";
      try {
        isiSurat = await generateWithGemini(prompt);
      } catch (err: any) {
        console.error("Gemini error:", err.message);
        isiSurat = "Gagal generate surat.";
      }

      const data = await storage.createSuratRw({ ...parsed, isiSurat });
      res.json(data);
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
