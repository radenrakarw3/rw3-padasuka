import type { Express, Request, Response, NextFunction } from "express";
import { kirimError, requireRwWilayah, WilayahError } from "./wilayah-auth";
import { kenaBatas } from "./wilayah-qr";
import * as aduan from "./aduan";
import * as teguran from "./aduan-teguran";

type Handler = (req: Request, res: Response) => Promise<unknown>;

function h(fn: Handler, gagal = "Permintaan gagal diproses") {
  return async (req: Request, res: Response) => {
    try {
      const out = await fn(req, res);
      if (!res.headersSent) res.json(out ?? { ok: true });
    } catch (e) {
      kirimError(res, e, gagal);
    }
  };
}

function berkas(gagal: string, fn: (req: Request) => Promise<{ buffer: Buffer; nama: string; mime?: string }>) {
  return async (req: Request, res: Response) => {
    try {
      const b = await fn(req);
      res.setHeader("Content-Type", b.mime ?? "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${b.nama.replace(/[^\w.\- ]/g, "_")}"`);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(b.buffer);
    } catch (e) {
      kirimError(res, e, gagal);
    }
  };
}

function idParam(req: Request): number {
  const n = Number(req.params.id);
  if (!Number.isInteger(n) || n <= 0) throw new WilayahError(400, "ID tidak valid");
  return n;
}

const batasIp = (nama: string, maks: number, menit: number) => (req: Request, res: Response, next: NextFunction) => {
  if (kenaBatas(`aduan-${nama}:${req.ip}`, maks, menit * 60_000)) {
    return res.status(429).json({ message: "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi." });
  }
  next();
};

function tanpaJejak(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex");
  next();
}

export function registerAduanRoutes(app: Express) {
  app.use(["/api/public/aduan", "/api/admin/aduan"], tanpaJejak);

  // ------------------------------------------------------------ publik
  app.get("/api/public/aduan/opsi", h(() => aduan.opsiPublik()));
  app.post("/api/public/aduan", batasIp("kirim", 5, 60), h((req) => aduan.kirimAduan(req.body), "Gagal mengirim aduan"));
  app.post("/api/public/aduan/lacak", batasIp("lacak", 20, 10), h((req) => aduan.lacakAduan(req.body)));
  app.post("/api/public/aduan/lacak/tambah", batasIp("tambah", 10, 60), h((req) => aduan.tambahKeteranganPelapor(req.body)));

  // ------------------------------------------------------------ admin (Ketua RW)
  const RW = requireRwWilayah;
  app.get("/api/admin/aduan/ringkasan", RW, h(() => aduan.ringkasanAduan()));
  app.get("/api/admin/aduan/cari-teradu", RW, h((req) => aduan.cariTeradu(String(req.query.q ?? ""))));
  app.get("/api/admin/aduan/teradu", RW, h((req) => aduan.raporTeradu(String(req.query.kunci ?? ""))));
  app.get("/api/admin/aduan/bukti/:id", RW, berkas("Gagal membuka foto", (req) => aduan.fotoBukti(idParam(req))));

  app.get("/api/admin/aduan/teguran", RW, h((req) => teguran.daftarTeguran(String(req.query.filter ?? "aktif"))));
  app.post("/api/admin/aduan/teguran/pratinjau", RW, berkas("Gagal membentuk pratinjau", (req) => teguran.pratinjauTeguran(req.body)));
  app.post("/api/admin/aduan/teguran", RW, h((req) => teguran.terbitkanTeguran(req.aktor!, req.body), "Gagal menerbitkan teguran"));
  app.patch("/api/admin/aduan/teguran/:id", RW, h((req) => teguran.ubahTeguran(req.aktor!, idParam(req), req.body)));

  app.get("/api/admin/aduan", RW, h((req) => aduan.daftarAduan({
    status: String(req.query.status ?? ""),
    kategori: String(req.query.kategori ?? ""),
    rt: String(req.query.rt ?? ""),
    cari: String(req.query.cari ?? ""),
  })));
  app.get("/api/admin/aduan/:id", RW, h((req) => aduan.detailAduan(req.aktor!, idParam(req))));
  app.patch("/api/admin/aduan/:id", RW, h((req) => aduan.ubahAduan(req.aktor!, idParam(req), req.body)));
  app.post("/api/admin/aduan/:id/teradu", RW, h((req) => aduan.aturTeradu(req.aktor!, idParam(req), req.body)));
  app.post("/api/admin/aduan/:id/identitas", RW, h((req) => aduan.bukaIdentitas(req.aktor!, idParam(req), String(req.body?.alasan ?? ""))));
  app.post("/api/admin/aduan/:id/catatan", RW, h((req) => aduan.tambahCatatan(req.aktor!, idParam(req), req.body)));
  app.post("/api/admin/aduan/:id/gabung", RW, h((req) => aduan.gabungkanAduan(req.aktor!, idParam(req), String(req.body?.nomor ?? ""))));
  app.post("/api/admin/aduan/:id/klarifikasi", RW, h((req) => teguran.undangKlarifikasi(req.aktor!, idParam(req), req.body)));
  app.post("/api/admin/aduan/:id/rw3biz", RW, h((req) => teguran.teruskanKeRw3biz(req.aktor!, idParam(req))));
}
