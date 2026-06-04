import type { Express, Request, Response } from "express";
import {
  ensureRw3lawReady,
  checkRw3lawConnection,
  isMissingRw3lawTableError,
  listRw3lawPublic,
  getRw3lawBySlugPublic,
  listRw3lawAdmin,
  getRw3lawById,
  createRw3lawDraft,
  createRw3lawRevisiDraft,
  updateRw3lawDraft,
  approveRw3law,
  cabutRw3law,
  deleteRw3law,
  getRw3lawRevisiMeta,
  listRw3lawDicabutPublic,
  seedRw3lawDevIfNeeded,
  getRw3lawOverview,
  getRw3lawPublishPreview,
  syncRw3lawNomorExisting,
} from "./rw3law";

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.session?.isAdmin) return res.status(401).json({ message: "Akses admin diperlukan" });
  next();
}

function apiError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function rw3lawErrorStatus(error: unknown): number {
  return isMissingRw3lawTableError(error) ? 503 : 500;
}

export function registerRw3lawRoutes(app: Express) {
  app.get("/api/public/rw3law/health", async (_req, res) => {
    try {
      const status = await checkRw3lawConnection();
      res.status(status.ok ? 200 : 503).json(status);
    } catch (error: unknown) {
      res.status(503).json({
        ok: false,
        tableExists: false,
        total: 0,
        publicCount: 0,
        message: apiError(error, "RW3LAW health check gagal"),
      });
    }
  });

  app.get("/api/public/rw3law", async (_req, res) => {
    try {
      const data = await listRw3lawPublic();
      res.json(data);
    } catch (error: unknown) {
      console.error("[RW3LAW] GET /api/public/rw3law:", error);
      res.status(rw3lawErrorStatus(error)).json({
        message: apiError(error, "Gagal memuat peraturan"),
        code: isMissingRw3lawTableError(error) ? "RW3LAW_TABLE_MISSING" : "RW3LAW_ERROR",
      });
    }
  });

  app.get("/api/public/rw3law/arsip/dicabut", async (_req, res) => {
    try {
      const data = await listRw3lawDicabutPublic();
      res.json(data);
    } catch (error: unknown) {
      console.error("[RW3LAW] GET /api/public/rw3law/arsip/dicabut:", error);
      res.status(rw3lawErrorStatus(error)).json({
        message: apiError(error, "Gagal memuat arsip peraturan dicabut"),
      });
    }
  });

  app.get("/api/public/rw3law/:slug", async (req, res) => {
    const slug = String(req.params.slug);
    if (slug === "health") {
      return res.redirect(307, "/api/public/rw3law/health");
    }
    try {
      const row = await getRw3lawBySlugPublic(slug);
      if (!row) return res.status(404).json({ message: "Peraturan tidak ditemukan" });
      const revisiDari = await getRw3lawRevisiMeta(row.revisiDariId);
      res.json({
        id: row.id,
        judul: row.judul,
        slug: row.slug,
        isi: row.isi,
        kategori: row.kategori,
        versi: row.versi,
        tanggalBerlaku: row.tanggalBerlaku,
        rtAsal: row.rtAsal,
        status: row.status,
        nomorPeraturan: row.nomorPeraturan,
        tahunNomor: row.tahunNomor,
        revisiDari,
        disetujuiAt: row.disetujuiAt,
        dicabutAt:
          row.status === "dicabut" ? row.dicabutAt ?? row.updatedAt : null,
      });
    } catch (error: unknown) {
      console.error("[RW3LAW] GET /api/public/rw3law/:slug:", error);
      res.status(rw3lawErrorStatus(error)).json({
        message: apiError(error, "Gagal memuat peraturan"),
      });
    }
  });

  app.get("/api/admin/rw3law/status/overview", requireAdmin, async (_req, res) => {
    try {
      const conn = await checkRw3lawConnection();
      if (!conn.ok) {
        return res.status(503).json({
          ready: false,
          message: conn.message ?? "RW3LAW tidak terhubung ke database",
          counts: { draft: 0, disetujui: 0, dicabut: 0, total: 0 },
          publicCount: 0,
        });
      }
      const overview = await getRw3lawOverview();
      res.json({ ...overview, publicCount: conn.publicCount });
    } catch (error: unknown) {
      console.error("[RW3LAW] GET /api/admin/rw3law/status/overview:", error);
      res.status(503).json({
        ready: false,
        message: apiError(error, "RW3LAW tidak terhubung ke database"),
        counts: { draft: 0, disetujui: 0, dicabut: 0, total: 0 },
        publicCount: 0,
      });
    }
  });

  app.get("/api/admin/rw3law/nomor/preview", requireAdmin, async (req, res) => {
    try {
      const tanggalBerlaku =
        typeof req.query.tanggalBerlaku === "string" ? req.query.tanggalBerlaku : undefined;
      const draftIdRaw = req.query.draftId;
      const draftId =
        typeof draftIdRaw === "string" && /^\d+$/.test(draftIdRaw)
          ? parseInt(draftIdRaw, 10)
          : undefined;
      const preview = await getRw3lawPublishPreview({ tanggalBerlaku, draftId });
      res.json(preview);
    } catch (error: unknown) {
      res.status(500).json({ message: apiError(error, "Gagal memuat pratinjau publikasi") });
    }
  });

  app.get("/api/admin/rw3law", requireAdmin, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const data = await listRw3lawAdmin(status);
      res.json(data);
    } catch (error: unknown) {
      console.error("[RW3LAW] GET /api/admin/rw3law:", error);
      res.status(rw3lawErrorStatus(error)).json({
        message: apiError(error, "Gagal memuat daftar peraturan"),
      });
    }
  });

  app.patch("/api/admin/rw3law/:id/approve", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const row = await approveRw3law(id, req.session.adminUsername || "admin");
      res.json(row);
    } catch (error: unknown) {
      res.status(400).json({ message: apiError(error, "Gagal menyetujui") });
    }
  });

  app.post("/api/admin/rw3law/:id/revisi", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const row = await createRw3lawRevisiDraft(id, req.session.adminUsername || "admin");
      res.status(201).json(row);
    } catch (error: unknown) {
      res.status(400).json({ message: apiError(error, "Gagal membuat draft revisi") });
    }
  });

  app.patch("/api/admin/rw3law/:id/cabut", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const row = await cabutRw3law(id);
      res.json(row);
    } catch (error: unknown) {
      res.status(400).json({ message: apiError(error, "Gagal mencabut") });
    }
  });

  app.get("/api/admin/rw3law/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const row = await getRw3lawById(id);
      if (!row) return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      res.json(row);
    } catch (error: unknown) {
      res.status(rw3lawErrorStatus(error)).json({ message: apiError(error, "Gagal memuat dokumen") });
    }
  });

  app.post("/api/admin/rw3law", requireAdmin, async (req, res) => {
    try {
      const row = await createRw3lawDraft(req.body, req.session.adminUsername || "admin");
      res.status(201).json(row);
    } catch (error: unknown) {
      res.status(400).json({ message: apiError(error, "Gagal menyimpan draft") });
    }
  });

  app.patch("/api/admin/rw3law/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const row = await updateRw3lawDraft(id, req.body);
      res.json(row);
    } catch (error: unknown) {
      res.status(400).json({ message: apiError(error, "Gagal memperbarui draft") });
    }
  });

  app.delete("/api/admin/rw3law/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const result = await deleteRw3law(id);
      res.json(result);
    } catch (error: unknown) {
      res.status(400).json({ message: apiError(error, "Gagal menghapus peraturan") });
    }
  });
}

export async function initRw3law() {
  try {
    await ensureRw3lawReady(true);
    await seedRw3lawDevIfNeeded();
    await syncRw3lawNomorExisting();
    const conn = await checkRw3lawConnection();
    if (!conn.ok) {
      throw new Error(conn.message ?? "Tabel rw3law_dokumen tidak dapat diakses");
    }
    console.log(
      `[RW3LAW] Database terhubung — ${conn.total} dokumen (${conn.publicCount} tampil publik)`,
    );
  } catch (error) {
    console.error("[RW3LAW] Inisialisasi database gagal:", error);
    throw error;
  }
}
