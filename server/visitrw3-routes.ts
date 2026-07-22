import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  ensureVisitrw3Schema,
  createPengajuanBaru,
  createPerpanjang,
  getStatusByNomor,
  listPengajuanAdminEnriched,
  getPengajuanDetailAdmin,
  approvePengajuan,
  rejectPengajuan,
  getVisitrw3DashboardStats,
  emptyVisitrw3DashboardStats,
  getVisitrw3Kalender,
  isMissingVisitrw3TableError,
  hitungTanggalBerlaku,
  getPenghuniKtpPayload,
  resolveFotoKtpData,
} from "./visitrw3";
import { loadVisitrw3SettingsRows, upsertVisitrw3Setting } from "./visitrw3-settings";
import { visitrw3ApiErrorMessage } from "./visitrw3-api-error";
import { invalidateVisitrw3Dashboard } from "./cache";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { visitrw3Penghuni } from "@shared/schema";

const ktpDir = path.join(process.cwd(), "uploads", "visitrw3-ktp");
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

export function registerVisitrw3Routes(app: Express) {
  app.get("/api/public/pemilik-kost", async (_req, res) => {
    res.status(410).json({ message: "Daftar properti sudah tidak tersedia. Ajukan langsung lewat Visit RW3." });
  });

  app.get("/api/public/visitrw3/settings", async (_req, res) => {
    try {
      const rows = await loadVisitrw3SettingsRows();
      res.json(
        rows
          .filter((r) => !r.key.startsWith("fee_") && !r.key.startsWith("tier_pintu_"))
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

  app.get("/api/admin/visitrw3/settings", requireAdmin, async (_req, res) => {
    try {
      const rows = await loadVisitrw3SettingsRows();
      res.json(rows.filter((r) => !r.key.startsWith("fee_") && !r.key.startsWith("tier_pintu_")));
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat pengaturan") });
    }
  });

  app.patch("/api/admin/visitrw3/settings/:key", requireAdmin, async (req, res) => {
    try {
      const key = String(req.params.key);
      if (key.startsWith("fee_") || key.startsWith("tier_pintu_")) {
        return res.status(410).json({ message: "Pengaturan tarif kontribusi sudah dihapus" });
      }
      const value = String(req.body?.value ?? "");
      const row = await upsertVisitrw3Setting(key, value);
      res.json(row);
    } catch (error: any) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Permintaan tidak valid") });
    }
  });

  app.post("/api/public/visitrw3/preview-berlaku", (req, res) => {
    try {
      const { tanggalBayar, terminBulan } = req.body;
      const sampai = hitungTanggalBerlaku(tanggalBayar, terminBulan);
      res.json({ tanggalBerlakuSampai: sampai });
    } catch (error: any) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Permintaan tidak valid") });
    }
  });

  app.post("/api/public/visitrw3/upload-ktp", (req, res) => {
    ktpUpload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : "Upload gagal";
        return res.status(400).json({ message: msg });
      }
      if (!req.file) return res.status(400).json({ message: "File tidak ada" });
      // Path relatif — saat submit pengajuan akan disalin ke foto_ktp_data (PostgreSQL)
      res.json({ path: `/uploads/visitrw3-ktp/${req.file.filename}` });
    });
  });

  /** Lihat KTP dari DB (utama) atau disk (legacy) — by id penghuni. */
  app.get("/api/admin/visitrw3/penghuni/:id/ktp", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const payload = await getPenghuniKtpPayload(id);
      if (!payload) return res.status(404).json({ message: "Foto KTP tidak ditemukan" });
      res.setHeader("Content-Type", payload.mime);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(payload.buffer);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat KTP") });
    }
  });

  /** Legacy + fallback by filename (path /uploads/... atau nama file). */
  app.get("/api/admin/visitrw3/ktp/:filename", requireAdmin, async (req, res) => {
    try {
      const safe = path.basename(req.params.filename as string).replace(/[^a-zA-Z0-9._-]/g, "");
      if (!safe) return res.status(400).json({ message: "Nama file tidak valid" });

      const filePath = path.join(ktpDir, safe);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }

      // Cari di DB: path berakhiran nama file
      const rows = await db
        .select({
          id: visitrw3Penghuni.id,
          fotoKtpPath: visitrw3Penghuni.fotoKtpPath,
          fotoKtpData: visitrw3Penghuni.fotoKtpData,
        })
        .from(visitrw3Penghuni)
        .where(eq(visitrw3Penghuni.fotoKtpPath, `/uploads/visitrw3-ktp/${safe}`))
        .limit(1);

      let dataUrl = rows[0]?.fotoKtpData?.trim() || null;
      if (!dataUrl && rows[0]) {
        dataUrl = resolveFotoKtpData(rows[0].fotoKtpPath);
        if (dataUrl && rows[0].id) {
          // backfill DB jika file masih ada di lain request (optional no-op)
          await db
            .update(visitrw3Penghuni)
            .set({ fotoKtpData: dataUrl })
            .where(eq(visitrw3Penghuni.id, rows[0].id));
        }
      }

      if (!dataUrl?.startsWith("data:")) {
        return res.status(404).json({ message: "File tidak ditemukan" });
      }
      const comma = dataUrl.indexOf(",");
      const header = dataUrl.slice(0, comma);
      const mime = /^data:([^;]+)/.exec(header)?.[1] || "image/jpeg";
      res.setHeader("Content-Type", mime);
      res.send(Buffer.from(dataUrl.slice(comma + 1), "base64"));
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat KTP") });
    }
  });

  app.post("/api/public/visitrw3/daftar-properti", async (_req, res) => {
    res.status(410).json({
      message: "Pendaftaran properti sudah tidak tersedia. Warga luar daftar langsung lewat pengajuan Visit RW3.",
    });
  });

  app.get("/api/public/visitrw3/properti/:nomor", async (_req, res) => {
    res.status(410).json({ message: "Status properti sudah tidak tersedia" });
  });

  app.patch("/api/admin/visitrw3/properti/:id/approve", requireAdmin, async (_req, res) => {
    res.status(410).json({ message: "Verifikasi properti sudah tidak tersedia" });
  });
  app.post("/api/public/visitrw3/pengajuan", async (req, res) => {
    try {
      const pengajuan = await createPengajuanBaru(req.body);
      invalidateVisitrw3Dashboard();
      res.json({ nomorVisitrw3: pengajuan.nomorVisitrw3, status: pengajuan.status });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengirim pengajuan") });
    }
  });

  app.post("/api/public/visitrw3/perpanjang", async (req, res) => {
    try {
      const result = await createPerpanjang(req.body);
      invalidateVisitrw3Dashboard();
      res.json({
        nomorVisitrw3: result.nomorBaru,
        nomorLama: result.nomorLama,
        status: result.pengajuan.status,
      });
    } catch (error: any) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengajukan perpanjang") });
    }
  });

  app.get("/api/public/visitrw3/status/:nomor", async (req, res) => {
    try {
      const data = await getStatusByNomor(req.params.nomor as string);
      if (!data) return res.status(404).json({ message: "Nomor Visit RW3 tidak ditemukan" });
      res.json(data);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat status pengajuan") });
    }
  });

  app.get("/api/admin/visitrw3/dashboard-stats", requireAdmin, async (req, res) => {
    try {
      const rtRaw = req.query.rt;
      let rtFilter: number | undefined;
      if (rtRaw != null && String(rtRaw).trim() !== "" && String(rtRaw) !== "semua") {
        const rt = parseInt(String(rtRaw), 10);
        if (!Number.isFinite(rt) || !(ACTIVE_RT_NUMBERS as readonly number[]).includes(rt)) {
          return res.status(400).json({ message: "RT tidak valid" });
        }
        rtFilter = rt;
      }
      try {
        const stats = await getVisitrw3DashboardStats(rtFilter);
        res.json(stats);
      } catch (inner: any) {
        if (isMissingVisitrw3TableError(inner)) {
          await ensureVisitrw3Schema().catch(() => undefined);
          try {
            const stats = await getVisitrw3DashboardStats(rtFilter);
            return res.json(stats);
          } catch {
            return res.json(emptyVisitrw3DashboardStats());
          }
        }
        throw inner;
      }
    } catch (error: any) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat statistik") });
    }
  });

  app.get("/api/admin/visitrw3/pengajuan", requireAdmin, async (req, res) => {
    try {
      const status = String(req.query.status || "menunggu_survey");
      const produkRaw = String(req.query.produk || "visit");
      const produk =
        produkRaw === "rw3biz" || produkRaw === "semua" || produkRaw === "visit"
          ? produkRaw
          : "visit";
      const list = await listPengajuanAdminEnriched(status, produk);
      res.json(list);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat antrian pengajuan") });
    }
  });

  app.get("/api/admin/visitrw3/kalender", requireAdmin, async (req, res) => {
    try {
      const rtRaw = req.query.rt;
      let rtFilter: number | undefined;
      if (rtRaw != null && String(rtRaw).trim() !== "" && String(rtRaw) !== "semua") {
        const rt = parseInt(String(rtRaw), 10);
        if (!Number.isFinite(rt) || !(ACTIVE_RT_NUMBERS as readonly number[]).includes(rt)) {
          return res.status(400).json({ message: "RT tidak valid" });
        }
        rtFilter = rt;
      }
      try {
        const data = await getVisitrw3Kalender(rtFilter);
        return res.json(data);
      } catch (inner: unknown) {
        if (isMissingVisitrw3TableError(inner)) {
          await ensureVisitrw3Schema().catch(() => undefined);
          const data = await getVisitrw3Kalender(rtFilter);
          return res.json(data);
        }
        throw inner;
      }
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat kalender kontrak") });
    }
  });

  app.get("/api/admin/visitrw3/pengajuan/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const detail = await getPengajuanDetailAdmin(id);
      if (!detail) return res.status(404).json({ message: "Tidak ditemukan" });
      res.json(detail);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat detail pengajuan") });
    }
  });

  app.patch("/api/admin/visitrw3/pengajuan/:id/approve", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const adminUsername = req.session.adminUsername || "admin";
      const result = await approvePengajuan(id, adminUsername, req.body ?? {});
      invalidateVisitrw3Dashboard();
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Permintaan tidak valid") });
    }
  });

  app.patch("/api/admin/visitrw3/pengajuan/:id/reject", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const alasan = req.body?.alasanTolak;
      if (!alasan?.trim()) return res.status(400).json({ message: "Alasan penolakan wajib diisi" });
      const adminUsername = req.session.adminUsername || "admin";
      const result = await rejectPengajuan(id, adminUsername, alasan);
      invalidateVisitrw3Dashboard();
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Permintaan tidak valid") });
    }
  });
}

export { ensureVisitrw3Schema };
