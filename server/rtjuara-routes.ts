import type { Express, Request, Response, NextFunction } from "express";
import { RTJUARA_API, RTJUARA_ROLE } from "@shared/rtjuara-api";
import { bulanKey as toBulanKey, isBulanKey, isRtjuaraRt } from "@shared/rtjuara";
import { rtjuaraLoginSchema } from "@shared/schema";
import { visitrw3ApiErrorMessage } from "./visitrw3-api-error";
import { saveSession } from "./session-save";
import {
  ensureRtjuaraSchema,
  createQuest,
  createSubmission,
  deleteQuest,
  deleteSubmission,
  getAdminDashboard,
  getFoto,
  getGaleriPublik,
  getJuara,
  getLeaderboard,
  getRingkasanRt,
  getSubmissionDetail,
  hapusAkun,
  listAkun,
  listBulanJuara,
  listQuestAdmin,
  listQuestForRt,
  listRtLogin,
  listSubmission,
  reviewSubmission,
  batalkanJuara,
  tetapkanJuara,
  updateQuest,
  upsertAkun,
  verifikasiLogin,
} from "./rtjuara";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  return req.ip || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function requireRt(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.rtjuaraRt) {
    return res.status(401).json({ message: "Sesi ketua RT tidak valid. Silakan login ulang." });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdmin) return res.status(401).json({ message: "Akses admin diperlukan" });
  next();
}

function parseBulanQuery(raw: unknown): string {
  const value = String(raw ?? "").trim();
  return isBulanKey(value) ? value : toBulanKey();
}

function parseRtQuery(raw: unknown): number | null {
  if (raw == null || raw === "" || raw === "semua") return null;
  const n = Number(raw);
  return Number.isFinite(n) && isRtjuaraRt(n) ? n : null;
}

function parseId(raw: unknown): number | null {
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function adminLabel(req: Request): string {
  return req.session.adminNama || req.session.adminUsername || "admin";
}

export async function registerRtjuaraRoutes(app: Express) {
  await ensureRtjuaraSchema().catch((error) => {
    console.error("[RTJUARA] Schema init error:", error);
  });

  // ===================== PUBLIK =====================

  app.get(RTJUARA_API.ping, (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  app.get(RTJUARA_API.publik.leaderboard, async (req, res) => {
    try {
      const bulan = parseBulanQuery(req.query.bulan);
      const [leaderboard, juara] = await Promise.all([getLeaderboard(bulan), getJuara(bulan)]);
      res.json({ bulan, leaderboard, sudahDiumumkan: juara.length > 0 });
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat papan peringkat") });
    }
  });

  app.get(RTJUARA_API.publik.juara, async (req, res) => {
    try {
      const bulanTersedia = await listBulanJuara();
      const diminta = String(req.query.bulan ?? "").trim();
      const bulan = isBulanKey(diminta) ? diminta : bulanTersedia[0] ?? toBulanKey();
      const juara = await getJuara(bulan);
      res.json({ bulan, juara, bulanTersedia });
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat pengumuman juara") });
    }
  });

  app.get(RTJUARA_API.publik.galeri, async (req, res) => {
    try {
      const bulanRaw = String(req.query.bulan ?? "").trim();
      const bulan = isBulanKey(bulanRaw) ? bulanRaw : null;
      const galeri = await getGaleriPublik(bulan);
      res.json(galeri);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat galeri kegiatan") });
    }
  });

  // Foto disetujui boleh dilihat publik; bukti menunggu/ditolak hanya admin atau RT pemiliknya.
  app.get("/api/rtjuara/foto/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID foto tidak valid" });
      const foto = await getFoto(id);
      if (!foto) return res.status(404).json({ message: "Foto tidak ditemukan" });

      const boleh =
        foto.status === "disetujui" ||
        req.session?.isAdmin === true ||
        req.session?.rtjuaraRt === foto.rt;
      if (!boleh) return res.status(403).json({ message: "Foto ini belum bisa diakses" });

      const commaIdx = foto.fotoData.indexOf(",");
      if (commaIdx < 0) return res.status(415).json({ message: "Format foto tidak dikenali" });
      const mimeType = foto.fotoData.substring(0, commaIdx).split(":")[1]?.split(";")[0] || "image/jpeg";
      const buffer = Buffer.from(foto.fotoData.substring(commaIdx + 1), "base64");

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", String(buffer.length));
      res.setHeader("Cache-Control", foto.status === "disetujui" ? "public, max-age=86400" : "private, no-store");
      res.end(buffer);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat foto") });
    }
  });

  // ===================== AUTH KETUA RT =====================

  app.get(RTJUARA_API.auth.rtList, async (_req, res) => {
    try {
      res.json(await listRtLogin());
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat daftar RT") });
    }
  });

  app.post(RTJUARA_API.auth.login, async (req, res) => {
    try {
      if (!checkRateLimit(getClientIp(req))) {
        return res.status(429).json({ message: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
      }
      const { rt, pin } = rtjuaraLoginSchema.parse(req.body);
      const akun = await verifikasiLogin(rt, pin);
      if (!akun) {
        return res.status(401).json({ message: "RT atau PIN salah, atau akun belum diaktifkan admin RW" });
      }
      req.session.rtjuaraRt = akun.rt;
      req.session.rtjuaraNama = akun.namaKetua;
      req.session.rtjuaraLoginAt = Date.now();
      await saveSession(req);
      res.json({ ok: true, rt: akun.rt, namaKetua: akun.namaKetua, role: RTJUARA_ROLE });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Login gagal") });
    }
  });

  app.post(RTJUARA_API.auth.logout, async (req, res) => {
    req.session.rtjuaraRt = undefined;
    req.session.rtjuaraNama = undefined;
    req.session.rtjuaraLoginAt = undefined;
    try {
      await saveSession(req);
    } catch {
      /* tetap keluar di sisi client */
    }
    res.json({ ok: true });
  });

  app.get(RTJUARA_API.auth.me, requireRt, (req, res) => {
    res.json({
      ok: true,
      role: RTJUARA_ROLE,
      rt: req.session.rtjuaraRt,
      namaKetua: req.session.rtjuaraNama ?? null,
    });
  });

  // ===================== PORTAL KETUA RT =====================

  app.get(RTJUARA_API.quest, requireRt, async (req, res) => {
    try {
      res.json(await listQuestForRt(req.session.rtjuaraRt!));
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat quest") });
    }
  });

  app.get(RTJUARA_API.submission, requireRt, async (req, res) => {
    try {
      const bulanRaw = String(req.query.bulan ?? "").trim();
      const list = await listSubmission({
        rt: req.session.rtjuaraRt!,
        bulan: isBulanKey(bulanRaw) ? bulanRaw : null,
      });
      res.json(list);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat riwayat bukti") });
    }
  });

  app.post(RTJUARA_API.submission, requireRt, async (req, res) => {
    try {
      const created = await createSubmission(req.session.rtjuaraRt!, req.body);
      res.json(created);
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengirim bukti") });
    }
  });

  app.get(RTJUARA_API.ringkasan, requireRt, async (req, res) => {
    try {
      res.json(await getRingkasanRt(req.session.rtjuaraRt!, parseBulanQuery(req.query.bulan)));
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat ringkasan RT") });
    }
  });

  // ===================== ADMIN RW =====================

  app.get(RTJUARA_API.admin.dashboard, requireAdmin, async (req, res) => {
    try {
      res.json(await getAdminDashboard(parseBulanQuery(req.query.bulan)));
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat dashboard RT JUARA") });
    }
  });

  app.get(RTJUARA_API.admin.quest, requireAdmin, async (req, res) => {
    try {
      const aktifRaw = String(req.query.aktif ?? "").trim();
      const list = await listQuestAdmin({
        periode: req.query.periode ? String(req.query.periode) : null,
        aktif: aktifRaw === "true" ? true : aktifRaw === "false" ? false : null,
      });
      res.json(list);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat daftar quest") });
    }
  });

  app.post(RTJUARA_API.admin.quest, requireAdmin, async (req, res) => {
    try {
      res.json(await createQuest(req.body, adminLabel(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat quest") });
    }
  });

  app.patch("/api/admin/rtjuara/quest/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID quest tidak valid" });
      res.json(await updateQuest(id, req.body));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal memperbarui quest") });
    }
  });

  app.delete("/api/admin/rtjuara/quest/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID quest tidak valid" });
      const ok = await deleteQuest(id);
      if (!ok) return res.status(404).json({ message: "Quest tidak ditemukan" });
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menghapus quest") });
    }
  });

  app.get(RTJUARA_API.admin.submission, requireAdmin, async (req, res) => {
    try {
      const bulanRaw = String(req.query.bulan ?? "").trim();
      const statusRaw = String(req.query.status ?? "").trim();
      const list = await listSubmission({
        rt: parseRtQuery(req.query.rt),
        status: statusRaw && statusRaw !== "semua" ? statusRaw : null,
        bulan: isBulanKey(bulanRaw) ? bulanRaw : null,
      });
      res.json(list);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat antrian bukti") });
    }
  });

  app.get("/api/admin/rtjuara/submission/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID bukti tidak valid" });
      const detail = await getSubmissionDetail(id);
      if (!detail) return res.status(404).json({ message: "Bukti tidak ditemukan" });
      res.json(detail);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat detail bukti") });
    }
  });

  app.patch("/api/admin/rtjuara/submission/:id/review", requireAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID bukti tidak valid" });
      res.json(await reviewSubmission(id, adminLabel(req), req.body));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal memverifikasi bukti") });
    }
  });

  app.delete("/api/admin/rtjuara/submission/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID bukti tidak valid" });
      const ok = await deleteSubmission(id);
      if (!ok) return res.status(404).json({ message: "Bukti tidak ditemukan" });
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menghapus bukti") });
    }
  });

  app.get(RTJUARA_API.admin.akun, requireAdmin, async (_req, res) => {
    try {
      res.json(await listAkun());
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat akun ketua RT") });
    }
  });

  app.post(RTJUARA_API.admin.akun, requireAdmin, async (req, res) => {
    try {
      res.json(await upsertAkun(req.body));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menyimpan akun ketua RT") });
    }
  });

  app.delete("/api/admin/rtjuara/akun/:rt", requireAdmin, async (req, res) => {
    try {
      const rt = parseRtQuery(req.params.rt);
      if (!rt) return res.status(400).json({ message: "RT tidak valid" });
      const ok = await hapusAkun(rt);
      if (!ok) return res.status(404).json({ message: "Akun RT tidak ditemukan" });
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menghapus akun ketua RT") });
    }
  });

  app.get(RTJUARA_API.admin.juara, requireAdmin, async (req, res) => {
    try {
      const bulan = parseBulanQuery(req.query.bulan);
      const [juara, bulanTersedia] = await Promise.all([getJuara(bulan), listBulanJuara()]);
      res.json({ bulan, juara, bulanTersedia });
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat pengumuman juara") });
    }
  });

  app.post(RTJUARA_API.admin.juara, requireAdmin, async (req, res) => {
    try {
      const bulan = parseBulanQuery(req.body?.bulan);
      const juara = await tetapkanJuara(bulan, adminLabel(req), req.body?.catatan ?? null);
      res.json({ bulan, juara });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengumumkan juara") });
    }
  });

  app.delete(RTJUARA_API.admin.juara, requireAdmin, async (req, res) => {
    try {
      const bulan = parseBulanQuery(req.query.bulan);
      const ok = await batalkanJuara(bulan);
      if (!ok) return res.status(404).json({ message: "Belum ada pengumuman untuk bulan ini" });
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal membatalkan pengumuman") });
    }
  });
}

export { ensureRtjuaraSchema };
