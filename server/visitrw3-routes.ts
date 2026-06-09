import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  ensureVisitrw3Schema,
  createPengajuanBaru,
  createPendaftaranProperti,
  createPerpanjang,
  getStatusByNomor,
  getPropertiByNomorPendaftaran,
  getPemilikKostPublic,
  approveProperti,
  listPengajuanAdmin,
  getPengajuanDetailAdmin,
  approvePengajuan,
  rejectPengajuan,
  getVisitrw3DashboardStats,
  emptyVisitrw3DashboardStats,
  getVisitrw3Kalender,
  isMissingVisitrw3TableError,
  hitungTanggalBerlaku,
} from "./visitrw3";
import { loadVisitrw3SettingsRows, upsertVisitrw3Setting } from "./visitrw3-settings";
import { visitrw3ApiErrorMessage } from "./visitrw3-api-error";
import { invalidateVisitrw3Dashboard } from "./cache";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";

const ktpDir = path.join(process.cwd(), "uploads", "visitrw3-ktp");
fs.mkdirSync(ktpDir, { recursive: true });

const ktpUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ktpDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname) || ".jpg"}`),
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
  app.get("/api/public/pemilik-kost", async (req, res) => {
    try {
      const rt = parseInt(String(req.query.rt || ""), 10);
      const keperluan = String(req.query.keperluan || "tinggal");
      if (!rt || !(ACTIVE_RT_NUMBERS as readonly number[]).includes(rt)) {
        return res.status(400).json({ message: "RT tidak valid" });
      }
      if (keperluan !== "tinggal" && keperluan !== "bisnis") {
        return res.status(400).json({ message: "Keperluan tidak valid" });
      }
      const data = await getPemilikKostPublic(rt, keperluan);
      res.json(
        data.map((k) => ({
          id: k.id,
          namaKost: k.namaKost,
          namaPemilik: k.namaPemilik,
          rt: k.rt,
          alamatLengkap: k.alamatLengkap,
          jenisProperti: k.jenisProperti,
          jumlahPintu: k.jumlahPintu,
        })),
      );
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat daftar kost") });
    }
  });

  app.get("/api/public/visitrw3/settings", async (_req, res) => {
    try {
      const rows = await loadVisitrw3SettingsRows();
      res.json(
        rows.map((r) => ({
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
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat pengaturan") });
    }
  });

  app.patch("/api/admin/visitrw3/settings/:key", requireAdmin, async (req, res) => {
    try {
      const key = String(req.params.key);
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

  app.post("/api/public/visitrw3/upload-ktp", ktpUpload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "File tidak ada" });
    res.json({ path: `/uploads/visitrw3-ktp/${req.file.filename}` });
  });

  app.get("/api/admin/visitrw3/ktp/:filename", requireAdmin, (req, res) => {
    const safe = path.basename(req.params.filename as string).replace(/[^a-zA-Z0-9._-]/g, "");
    const filePath = path.join(ktpDir, safe);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File tidak ditemukan" });
    res.sendFile(filePath);
  });

  app.post("/api/public/visitrw3/daftar-properti", async (req, res) => {
    try {
      const properti = await createPendaftaranProperti(req.body);
      invalidateVisitrw3Dashboard();
      res.json({
        nomorPendaftaran: properti.nomorPendaftaran,
        statusProperti: properti.statusProperti,
      });
    } catch (error: any) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mendaftarkan properti") });
    }
  });

  app.get("/api/public/visitrw3/properti/:nomor", async (req, res) => {
    try {
      const row = await getPropertiByNomorPendaftaran(req.params.nomor as string);
      if (!row) return res.status(404).json({ message: "Nomor pendaftaran tidak ditemukan" });
      res.json({
        nomorPendaftaran: row.nomorPendaftaran,
        namaKost: row.namaKost,
        namaPemilik: row.namaPemilik,
        namaPenanggungJawab: row.namaPenanggungJawab,
        nomorWaPenanggungJawab: row.nomorWaPenanggungJawab,
        rt: row.rt,
        statusProperti: row.statusProperti,
        izinTinggal: row.izinTinggal,
        izinBisnis: row.izinBisnis,
        jenisProperti: row.jenisProperti,
        createdAt: row.createdAt,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat status properti") });
    }
  });

  app.patch("/api/admin/visitrw3/properti/:id/approve", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const updated = await approveProperti(id, req.session.adminUsername || "admin", req.body ?? {});
      invalidateVisitrw3Dashboard();
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Permintaan tidak valid") });
    }
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
      const list = await listPengajuanAdmin(status);
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
