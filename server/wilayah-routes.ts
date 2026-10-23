import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { kirimError, requireRtAtauRw, requireRtWilayah, requireRwWilayah, WilayahError } from "./wilayah-auth";
import * as data from "./wilayah-data";
import * as qr from "./wilayah-qr";
import * as standar from "./wilayah-standar";
import * as surat from "./wilayah-surat";
import * as layanan from "./surat-sakti/layanan";
import * as tindak from "./surat-sakti/tindak";
import { kotakMasukRw, ringkasanRw } from "./wilayah-dashboard";
import { isWilayahRt, type SubjekFakta } from "@shared/wilayah";

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

function idParam(req: Request, nama = "id"): number {
  const n = Number(req.params[nama]);
  if (!Number.isInteger(n) || n <= 0) throw new WilayahError(400, "ID tidak valid");
  return n;
}

function rtQuery(req: Request): number | null {
  if (req.query.rt == null || req.query.rt === "") return null;
  const rt = Number(req.query.rt);
  if (!isWilayahRt(rt)) throw new WilayahError(400, "RT tidak valid");
  return rt;
}

function tanpaCache(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  next();
}

const batasIp = (nama: string, maks: number, menit: number) => (req: Request, res: Response, next: NextFunction) => {
  if (qr.kenaBatas(`${nama}:${req.ip}`, maks, menit * 60_000)) {
    return res.status(429).json({ message: "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi." });
  }
  next();
};

export function registerWilayahRoutes(app: Express) {
  // Halaman & API QR: jangan bocorkan token lewat referrer atau cache.
  app.use(["/isi", "/api/isi"], (_req, res, next) => {
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex");
    next();
  });
  app.use("/api/wilayah", tanpaCache);

  // ------------------------------------------------------------------ publik (QR)
  app.post("/api/isi/buka", batasIp("isi-buka", 30, 10), h(async (req) => qr.bukaToken(String(req.body?.token ?? ""))));
  app.post("/api/isi/kirim", batasIp("isi-kirim", 15, 60), h(async (req) => qr.kirimUsulan(String(req.body?.token ?? ""), req.body, req.ip ?? "")));
  app.get("/api/isi/status/:kode", batasIp("isi-status", 30, 10), h(async (req) => qr.statusUsulan(String(req.params.kode))));

  // ------------------------------------------------------------------ bersama (RW; dengan X-Wilayah-Rt dibatasi ke RT yang dikelola)
  const RR = requireRtAtauRw;
  app.get("/api/wilayah/saya", RR, h(async (req) => req.aktor));
  app.get("/api/wilayah/standar", RR, h(async (req) => standar.daftarStandar({ semua: req.query.semua === "1" })));
  app.get("/api/wilayah/keluarga", RR, h(async (req) => data.daftarKeluarga(req.aktor!, { rt: rtQuery(req), cari: String(req.query.cari ?? ""), batas: Number(req.query.batas) || undefined })));
  app.get("/api/wilayah/keluarga/:id", RR, h(async (req) => data.detailKeluarga(req.aktor!, idParam(req))));
  app.get("/api/wilayah/cari-warga", RR, h(async (req) => data.cariWarga(req.aktor!, String(req.query.q ?? ""))));
  app.get("/api/wilayah/riwayat/:subjek/:id", RR, h(async (req) => data.riwayatSubjek(req.aktor!, req.params.subjek as SubjekFakta, idParam(req))));
  app.get("/api/wilayah/rumah", RR, h(async (req) => data.daftarRumah(req.aktor!, rtQuery(req))));
  app.get("/api/wilayah/serah-terima", RR, h(async (req) => data.daftarSerahTerima(req.aktor!)));
  // ------------------------------------------------------------------ RW mengelola data satu RT (X-Wilayah-Rt)
  const RT = requireRtWilayah;
  app.post("/api/wilayah/rt/keluarga", RT, h(async (req) => data.tambahKeluarga(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/keluarga/:id/warga", RT, h(async (req) => data.tambahWarga(req.aktor!, idParam(req), req.body)));
  app.patch("/api/wilayah/rt/warga/:id", RT, h(async (req) => data.ubahWarga(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/rt/fakta", RT, h(async (req) => data.simpanFakta(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/fakta/banyak", RT, h(async (req) => data.simpanBanyakFakta(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/fakta/:id/putuskan", RT, h(async (req) => data.putuskanFaktaPerluCek(req.aktor!, idParam(req), req.body?.terima === true)));
  app.post("/api/wilayah/rt/rumah", RT, h(async (req) => data.buatRumah(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/keluarga/:id/rumah", RT, h(async (req) => data.hubungkanKkRumah(req.aktor!, idParam(req), Number(req.body?.rumahId))));
  app.post("/api/wilayah/rt/serah-terima", RT, h(async (req) => data.ajukanSerahTerima(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/serah-terima/:id/putuskan", RT, h(async (req) => data.putuskanSerahTerima(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/rt/qr/cetak", RT, h(async (req) => {
    const b = z.object({ kkIds: z.union([z.literal("semua"), z.array(z.number().int().positive()).min(1).max(400)]), ganti: z.boolean().optional() }).parse(req.body);
    return qr.kartuUntukCetak(req.aktor!, b.kkIds, b.ganti === true);
  }, "Gagal menyiapkan kartu QR"));
  app.post("/api/wilayah/rt/cetak/paket", RT, h(async (req) => {
    const b = z.object({ kkIds: z.union([z.literal("semua"), z.array(z.number().int().positive()).min(1).max(400)]) }).parse(req.body);
    return qr.paketUntukCetak(req.aktor!, b.kkIds);
  }, "Gagal menyiapkan bahan cetak"));
  app.get("/api/wilayah/rt/kartu/:kode", RT, h(async (req) => qr.kkDariKodeKartu(req.aktor!, String(req.params.kode))));
  app.post("/api/wilayah/rt/qr/:id/cabut", RT, h(async (req) => qr.cabutToken(req.aktor!, idParam(req))));
  app.get("/api/wilayah/rt/usulan", RT, h(async (req) => qr.daftarUsulan(req.aktor!, String(req.query.status ?? "menunggu"))));
  app.get("/api/wilayah/rt/usulan/:id", RT, h(async (req) => qr.detailUsulan(req.aktor!, idParam(req))));
  app.post("/api/wilayah/rt/usulan/:id/putuskan", RT, h(async (req) => qr.putuskanUsulan(req.aktor!, idParam(req), req.body)));
  // ------------------------------------------------------------------ khusus Ketua RW
  const RW = requireRwWilayah;
  app.get("/api/wilayah/rw/ringkasan", RW, h(async () => ringkasanRw(), "Gagal memuat dashboard"));
  app.get("/api/wilayah/rw/kotak-masuk", RW, h(async () => kotakMasukRw()));
  app.post("/api/wilayah/rw/standar", RW, h(async (req) => standar.tambahStandar(req.aktor!, standar.inputStandarSchema.parse(req.body))));
  app.patch("/api/wilayah/rw/standar/:id", RW, h(async (req) => standar.ubahStandar(req.aktor!, idParam(req), standar.inputStandarSchema.parse(req.body))));
  app.delete("/api/wilayah/rw/standar/:id", RW, h(async (req) => standar.aturAktifStandar(req.aktor!, idParam(req), false)));
  app.post("/api/wilayah/rw/standar/:id/pulihkan", RW, h(async (req) => standar.aturAktifStandar(req.aktor!, idParam(req), true)));
  app.post("/api/wilayah/rw/standar-urutan", RW, h(async (req) => {
    const b = z.object({ ids: z.array(z.number().int().positive()).min(1).max(300) }).parse(req.body);
    await standar.urutkanStandar(req.aktor!, b.ids);
    return { ok: true };
  }));
  // ------------------------------------------------------------------ Surat Sakti (RW mengelola; RT membaca yang relevan)
  const kirimBerkas = (gagal: string, fn: (req: Request) => Promise<{ buffer: Buffer; nama: string; mime?: string }>, unduh = false) =>
    async (req: Request, res: Response) => {
      try {
        const b = await fn(req);
        res.setHeader("Content-Type", b.mime ?? "application/pdf");
        res.setHeader("Content-Disposition", `${unduh ? "attachment" : "inline"}; filename="${b.nama.replace(/[^\w.\- ]/g, "_")}"`);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.end(b.buffer);
      } catch (e) {
        kirimError(res, e, gagal);
      }
    };
  const lampiranBerkas = async (req: Request) => {
    const l = await tindak.ambilLampiranAman(req.aktor!, idParam(req));
    return { buffer: Buffer.from(l.data.slice(l.data.indexOf(",") + 1), "base64"), nama: l.nama, mime: l.mime };
  };

  app.get("/api/wilayah/surat", RR, h(async (req) => layanan.daftarSurat(req.aktor!, {
    bagian: req.query.bagian as string | undefined,
    cari: req.query.cari as string | undefined,
  })));
  app.get("/api/wilayah/surat/:id", RR, h(async (req) => layanan.detailSurat(req.aktor!, idParam(req))));
  app.get("/api/wilayah/surat/:id/pdf", RR, kirimBerkas("Gagal membuka PDF", (req) => layanan.unduhPdf(req.aktor!, idParam(req)), true));
  app.get("/api/wilayah/surat-lampiran/:id", RR, kirimBerkas("Gagal membuka lampiran", lampiranBerkas));
  app.get("/api/wilayah/surat-tindak", RR, h(async (req) => tindak.daftarTindak(req.aktor!, String(req.query.filter ?? "terbuka"))));
  app.post("/api/wilayah/surat-tindak/:id/update", RR, h(async (req) => tindak.perbaruiTindak(req.aktor!, idParam(req), req.body)));
  app.get("/api/wilayah/surat-tindak-update/:id/bukti", RR, kirimBerkas("Gagal membuka bukti", (req) => tindak.ambilBuktiTindak(req.aktor!, idParam(req))));
  app.get("/api/wilayah/cari-pihak", RR, h(async (req) => tindak.cariPihak(req.aktor!, String(req.query.q ?? ""))));

  app.get("/api/wilayah/rw/surat-ringkasan", RW, h(async (req) => tindak.ringkasan(req.aktor!)));
  app.get("/api/wilayah/rw/surat-referensi", RW, h(async (req) => tindak.referensi(req.aktor!)));
  app.post("/api/wilayah/rw/surat", RW, h(async (req) => layanan.simpanDraft(req.aktor!, req.body)));
  app.patch("/api/wilayah/rw/surat/:id", RW, h(async (req) => layanan.simpanDraft(req.aktor!, req.body, idParam(req))));
  app.delete("/api/wilayah/rw/surat/:id", RW, h(async (req) => layanan.hapusDraft(req.aktor!, idParam(req))));
  app.get("/api/wilayah/rw/surat/:id/pratinjau.pdf", RW, kirimBerkas("Gagal membentuk pratinjau", (req) => layanan.pratinjauPdf(req.aktor!, idParam(req))));
  app.post("/api/wilayah/rw/surat/:id/terbit", RW, h(async (req) => layanan.terbitkan(req.aktor!, idParam(req)), "Gagal menerbitkan dokumen"));
  app.post("/api/wilayah/rw/surat/:id/batal", RW, h(async (req) => layanan.batalkan(req.aktor!, idParam(req), String(req.body?.alasan ?? ""))));
  app.post("/api/wilayah/rw/surat/:id/salin", RW, h(async (req) => layanan.salinJadiDraft(req.aktor!, idParam(req))));
  app.get("/api/wilayah/rw/surat/:id/wa", RW, h(async (req) => ({ teks: await layanan.pengantarWa(req.aktor!, idParam(req)) })));
  app.post("/api/wilayah/rw/surat/:id/lampiran", RW, h(async (req) => surat.tambahLampiran(req.aktor!, idParam(req), req.body)));
  app.delete("/api/wilayah/rw/surat-lampiran/:id", RW, h(async (req) => surat.hapusLampiran(req.aktor!, idParam(req))));
  app.post("/api/wilayah/rw/surat/:id/kirim", RW, h(async (req) => tindak.catatKirim(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/rw/surat-kirim/:id/terima", RW, h(async (req) => tindak.konfirmasiTerima(req.aktor!, idParam(req), req.body)));
  app.get("/api/wilayah/rw/surat-kirim/:id/bukti", RW, kirimBerkas("Gagal membuka bukti", (req) => tindak.ambilBuktiKirim(req.aktor!, idParam(req))));
  app.post("/api/wilayah/rw/surat/:id/tindak", RW, h(async (req) => tindak.tambahTindak(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/rw/surat-tindak/:id/evaluasi", RW, h(async (req) => tindak.evaluasiTindak(req.aktor!, idParam(req), String(req.body?.evaluasi ?? ""))));
  app.post("/api/wilayah/rw/surat-bantuan", RW, h(async (req) => tindak.catatBantuan(req.aktor!, req.body)));
}
