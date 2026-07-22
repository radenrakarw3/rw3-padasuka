import type { Express, Request, Response } from "express";
import {
  ensureKarangtarunaSchema,
  createAnggota,
  getStatusByNomor,
  listAnggotaAdmin,
  getAnggotaDetail,
  updateAnggotaAdmin,
  deleteAnggotaAdmin,
  getStats,
} from "./karangtaruna";
import { visitrw3ApiErrorMessage } from "./visitrw3-api-error";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.session?.isAdmin) return res.status(401).json({ message: "Akses admin diperlukan" });
  next();
}

function parseRtQuery(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && (ACTIVE_RT_NUMBERS as readonly number[]).includes(n) ? n : null;
}

export function registerKarangtarunaRoutes(app: Express) {
  // --- Publik ---

  app.post("/api/public/karangtaruna/daftar", async (req, res) => {
    try {
      const anggota = await createAnggota(req.body);
      res.json({ nomorAnggota: anggota.nomorAnggota, status: anggota.statusKeanggotaan });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengirim pendaftaran") });
    }
  });

  app.get("/api/public/karangtaruna/status", async (req, res) => {
    try {
      const nomor = String(req.query.nomor || "").trim();
      if (!nomor) return res.status(400).json({ message: "Nomor anggota wajib diisi" });
      const anggota = await getStatusByNomor(nomor);
      if (!anggota) return res.status(404).json({ message: "Nomor anggota tidak ditemukan" });
      res.json({
        nomorAnggota: anggota.nomorAnggota,
        namaLengkap: anggota.namaLengkap,
        rt: anggota.rt,
        statusKeanggotaan: anggota.statusKeanggotaan,
        bidangKeahlian: anggota.bidangKeahlian,
        bidangMinat: anggota.bidangMinat,
        potensiUnggulan: anggota.potensiUnggulan,
        catatanAdmin: anggota.catatanAdmin,
        createdAt: anggota.createdAt,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat status") });
    }
  });

  // --- Admin ---

  app.get("/api/admin/karangtaruna/anggota", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : null;
      const rt = parseRtQuery(req.query.rt);
      const search = req.query.search ? String(req.query.search) : null;
      const list = await listAnggotaAdmin({ status, rt, search });
      res.json(list);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat daftar anggota") });
    }
  });

  app.get("/api/admin/karangtaruna/anggota/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const detail = await getAnggotaDetail(id);
      if (!detail) return res.status(404).json({ message: "Tidak ditemukan" });
      res.json(detail);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat detail anggota") });
    }
  });

  app.patch("/api/admin/karangtaruna/anggota/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      const adminUsername = req.session.adminUsername || "admin";
      const updated = await updateAnggotaAdmin(id, adminUsername, req.body ?? {});
      res.json(updated);
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Permintaan tidak valid") });
    }
  });

  app.delete("/api/admin/karangtaruna/anggota/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID tidak valid" });
      await deleteAnggotaAdmin(id);
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menghapus anggota") });
    }
  });

  app.get("/api/admin/karangtaruna/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await getStats();
      res.json(stats);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat statistik") });
    }
  });
}

export { ensureKarangtarunaSchema };
