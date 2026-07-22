import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  ensureRw3bizSchema,
  createPengajuanBaru,
  createPerpanjang,
  getStatusByNomor,
  listPengajuanAdmin,
  getPengajuanDetailAdmin,
  approvePengajuan,
  rejectPengajuan,
  listUsahaAktif,
  getPjBlastRecipients,
  getOrangKtpPayload,
  hitungTanggalBerlaku,
} from "./rw3biz";
import {
  getRw3bizBlastChannelStatus,
  listRw3bizBlasts,
  getRw3bizBlastDetail,
  createRw3bizBlast,
  retryRw3bizBlast,
  ensureRw3bizBlastTables,
} from "./wa-notify-rw3biz";
import { loadVisitrw3SettingsRows } from "./visitrw3-settings";
import { visitrw3ApiErrorMessage } from "./visitrw3-api-error";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";

const ktpDir = path.join(process.cwd(), "uploads", "rw3biz-ktp");
fs.mkdirSync(ktpDir, { recursive: true });

const ktpUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ktpDir),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname) || ".jpg"}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Hanya file gambar"));
  },
});

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.session?.isAdmin) return res.status(401).json({ message: "Akses admin diperlukan" });
  next();
}

export function registerRw3bizRoutes(app: Express) {
  void ensureRw3bizBlastTables().catch((err) => {
    console.error("[RW3BIZ] Gagal memastikan tabel wa_blast:", err);
  });

  // --- Publik ---

  app.get("/api/public/rw3biz/settings", async (_req, res) => {
    try {
      const rows = await loadVisitrw3SettingsRows();
      const wanted = new Set(["tata_tertib_masyarakat", "tata_tertib_penyewa"]);
      res.json(
        rows
          .filter((r) => wanted.has(r.key))
          .map((r) => ({
            key: r.key,
            value: r.value,
            label: r.label,
            keterangan: r.keterangan,
            updatedAt: r.updatedAt,
          })),
      );
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat pengaturan") });
    }
  });

  app.post("/api/public/rw3biz/preview-berlaku", (req, res) => {
    try {
      const { tanggalBayar, terminBulan } = req.body;
      const sampai = hitungTanggalBerlaku(tanggalBayar, terminBulan);
      res.json({ tanggalBerlakuSampai: sampai });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Permintaan tidak valid") });
    }
  });

  app.post("/api/public/rw3biz/upload-ktp", (req, res) => {
    ktpUpload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : "Upload gagal";
        return res.status(400).json({ message: msg });
      }
      if (!req.file) return res.status(400).json({ message: "File tidak ada" });
      res.json({ path: `/uploads/rw3biz-ktp/${req.file.filename}` });
    });
  });

  app.post("/api/public/rw3biz/pengajuan", async (req, res) => {
    try {
      const pengajuan = await createPengajuanBaru(req.body);
      res.json({ nomorBiz: pengajuan.nomorBiz, status: pengajuan.status });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengirim pengajuan") });
    }
  });

  app.post("/api/public/rw3biz/perpanjang", async (req, res) => {
    try {
      const result = await createPerpanjang(req.body);
      res.json({
        nomorBiz: result.nomorBaru,
        nomorLama: result.nomorLama,
        status: result.pengajuan.status,
      });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengajukan perpanjang") });
    }
  });

  app.get("/api/public/rw3biz/status", async (req, res) => {
    try {
      const nomor = String(req.query.nomor || "").trim();
      if (!nomor) return res.status(400).json({ message: "Nomor RW3BIZ wajib diisi" });
      const data = await getStatusByNomor(nomor);
      if (!data) return res.status(404).json({ message: "Nomor RW3BIZ tidak ditemukan" });
      res.json(data);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat status pengajuan") });
    }
  });

  // --- Admin ---

  app.get("/api/admin/rw3biz/pengajuan", requireAdmin, async (req, res) => {
    try {
      const status = String(req.query.status || "menunggu_survey");
      const list = await listPengajuanAdmin(status);
      res.json(list);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat antrian pengajuan") });
    }
  });

  app.get("/api/admin/rw3biz/pengajuan/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const detail = await getPengajuanDetailAdmin(id);
      if (!detail) return res.status(404).json({ message: "Tidak ditemukan" });
      res.json(detail);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat detail pengajuan") });
    }
  });

  app.patch("/api/admin/rw3biz/pengajuan/:id/approve", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const adminUsername = req.session.adminUsername || "admin";
      const result = await approvePengajuan(id, adminUsername, req.body?.catatanSurvey);
      res.json(result);
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Permintaan tidak valid") });
    }
  });

  app.patch("/api/admin/rw3biz/pengajuan/:id/reject", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const alasan = req.body?.alasanTolak;
      if (!alasan?.trim()) return res.status(400).json({ message: "Alasan penolakan wajib diisi" });
      const adminUsername = req.session.adminUsername || "admin";
      const result = await rejectPengajuan(id, adminUsername, alasan);
      res.json(result);
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Permintaan tidak valid") });
    }
  });

  app.get("/api/admin/rw3biz/pengajuan/:id/orang/:orangId/ktp", requireAdmin, async (req, res) => {
    try {
      const orangId = parseInt(String(req.params.orangId), 10);
      if (!Number.isFinite(orangId)) return res.status(400).json({ message: "ID tidak valid" });
      const payload = await getOrangKtpPayload(orangId);
      if (!payload) return res.status(404).json({ message: "Foto KTP tidak ditemukan" });
      res.setHeader("Content-Type", payload.mime);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(payload.buffer);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat KTP") });
    }
  });

  app.get("/api/admin/rw3biz/usaha", requireAdmin, async (_req, res) => {
    try {
      const list = await listUsahaAktif();
      res.json(list);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat daftar usaha") });
    }
  });

  // --- WA blast (StarSender) ---

  app.get("/api/admin/rw3biz/blast/channel", requireAdmin, (_req, res) => {
    res.json(getRw3bizBlastChannelStatus());
  });

  app.get("/api/admin/rw3biz/blast/recipients", requireAdmin, async (req, res) => {
    try {
      const rtRaw = req.query.rt != null ? Number(req.query.rt) : null;
      const rt =
        rtRaw != null && Number.isFinite(rtRaw) && (ACTIVE_RT_NUMBERS as readonly number[]).includes(rtRaw)
          ? rtRaw
          : null;
      const recipients = await getPjBlastRecipients({ rt });
      res.json(recipients);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat penerima blast") });
    }
  });

  app.get("/api/admin/rw3biz/blast", requireAdmin, async (_req, res) => {
    try {
      const list = await listRw3bizBlasts();
      res.json(list);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat riwayat blast") });
    }
  });

  app.get("/api/admin/rw3biz/blast/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const detail = await getRw3bizBlastDetail(id);
      if (!detail) return res.status(404).json({ message: "Blast tidak ditemukan" });
      res.json(detail);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat detail blast") });
    }
  });

  app.post("/api/admin/rw3biz/blast", requireAdmin, async (req, res) => {
    try {
      const pesan = String(req.body?.pesan || "");
      const rtRaw = req.body?.rt != null && req.body.rt !== "" ? Number(req.body.rt) : null;
      const rt =
        rtRaw != null && Number.isFinite(rtRaw) && (ACTIVE_RT_NUMBERS as readonly number[]).includes(rtRaw)
          ? rtRaw
          : null;
      const usahaIds = Array.isArray(req.body?.usahaIds)
        ? req.body.usahaIds.map((x: unknown) => Number(x)).filter((n: number) => Number.isFinite(n))
        : null;
      const blast = await createRw3bizBlast({ pesan, rt, usahaIds });
      res.status(201).json(blast);
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat blast") });
    }
  });

  app.post("/api/admin/rw3biz/blast/:id/retry", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const blast = await retryRw3bizBlast(id);
      res.json(blast);
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal retry blast") });
    }
  });
}

export { ensureRw3bizSchema };
