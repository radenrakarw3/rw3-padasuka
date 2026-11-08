import type { Express, Request, Response, NextFunction } from "express";
import { kirimError, requireRwWilayah } from "./wilayah-auth";
import { kenaBatas } from "./wilayah-qr";
import * as rating from "./rating";

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

const batasIp = (nama: string, maks: number, menit: number) => (req: Request, res: Response, next: NextFunction) => {
  if (kenaBatas(`rating-${nama}:${req.ip}`, maks, menit * 60_000)) {
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

export function registerRatingRoutes(app: Express) {
  app.use(["/api/public/rating", "/api/admin/rating"], tanpaJejak);

  app.get("/api/public/rating/opsi", h(async () => rating.opsiPublik()));
  app.post(
    "/api/public/rating",
    batasIp("kirim", 8, 60),
    h((req) => rating.kirimRating(req.body), "Gagal mengirim rating"),
  );

  const RW = requireRwWilayah;
  app.get(
    "/api/admin/rating/ringkasan",
    RW,
    h((req) => rating.ringkasanRating(String(req.query.bulan ?? ""))),
  );
  app.get("/api/admin/rating/bulan", RW, h(() => rating.daftarBulanRating()));
  app.get(
    "/api/admin/rating",
    RW,
    h((req) =>
      rating.daftarRating({
        sasaran: String(req.query.sasaran ?? ""),
        rt: String(req.query.rt ?? ""),
        belumDibaca: String(req.query.belumDibaca ?? "") === "1",
        bulan: String(req.query.bulan ?? ""),
      }),
    ),
  );
  app.post(
    "/api/admin/rating/:id/dibaca",
    RW,
    h((req) => rating.tandaiDibaca(Number(req.params.id))),
  );
}
