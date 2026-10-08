import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { kirimError, requireRtAtauRw, requireRtWilayah, requireRwWilayah, WilayahError } from "./wilayah-auth";
import * as data from "./wilayah-data";
import * as qr from "./wilayah-qr";
import * as lap from "./wilayah-laporan";
import * as surat from "./wilayah-surat";
import { aksiRw, ringkasanRw } from "./wilayah-dashboard";
import { bulanPeriodeEkspor, isBulanValid, isWilayahRt, type SubjekFakta } from "@shared/wilayah";
import { INDIKATOR_KECAMATAN } from "@shared/indikator-kecamatan";

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

function bulanQuery(req: Request): { tahun: number; bulan: number } {
  const now = new Date();
  const tahun = req.query.tahun ? Number(req.query.tahun) : now.getFullYear();
  const bulan = req.query.bulan ? Number(req.query.bulan) : now.getMonth() + 1;
  if (!isBulanValid(tahun, bulan)) throw new WilayahError(400, "Bulan tidak valid");
  return { tahun, bulan };
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

  // ------------------------------------------------------------------ bersama (RT: scope sesi; RW: baca)
  const RR = requireRtAtauRw;
  app.get("/api/wilayah/saya", RR, h(async (req) => req.aktor));
  app.get("/api/wilayah/indikator", RR, h(async () => INDIKATOR_KECAMATAN));
  app.get("/api/wilayah/keluarga", RR, h(async (req) => data.daftarKeluarga(req.aktor!, { rt: rtQuery(req), cari: String(req.query.cari ?? ""), batas: Number(req.query.batas) || undefined })));
  app.get("/api/wilayah/keluarga/:id", RR, h(async (req) => data.detailKeluarga(req.aktor!, idParam(req))));
  app.get("/api/wilayah/cari-warga", RR, h(async (req) => data.cariWarga(req.aktor!, String(req.query.q ?? ""))));
  app.get("/api/wilayah/riwayat/:subjek/:id", RR, h(async (req) => data.riwayatSubjek(req.aktor!, req.params.subjek as SubjekFakta, idParam(req))));
  app.get("/api/wilayah/rumah", RR, h(async (req) => data.daftarRumah(req.aktor!, rtQuery(req))));
  app.get("/api/wilayah/usaha", RR, h(async (req) => data.daftarUsaha(req.aktor!, rtQuery(req))));
  app.get("/api/wilayah/fasilitas", RR, h(async (req) => data.daftarFasilitas(req.aktor!)));
  app.get("/api/wilayah/kelompok", RR, h(async (req) => data.daftarKelompok(req.aktor!)));
  app.get("/api/wilayah/kegiatan", RR, h(async (req) => data.daftarKegiatan(req.aktor!, { dari: req.query.dari as string | undefined, sampai: req.query.sampai as string | undefined })));
  app.get("/api/wilayah/kejadian", RR, h(async (req) => data.daftarKejadian(req.aktor!, { status: req.query.status as string | undefined, rt: rtQuery(req) })));
  app.get("/api/wilayah/koreksi", RR, h(async (req) => data.daftarUsulanKoreksi(req.aktor!)));
  app.get("/api/wilayah/serah-terima", RR, h(async (req) => data.daftarSerahTerima(req.aktor!)));
  app.get("/api/wilayah/permintaan-surat", RR, h(async (req) => surat.daftarPermintaan(req.aktor!)));

  app.post("/api/wilayah/fasilitas", RR, h(async (req) => data.simpanFasilitas(req.aktor!, req.body)));
  app.patch("/api/wilayah/fasilitas/:id", RR, h(async (req) => data.simpanFasilitas(req.aktor!, req.body, idParam(req))));
  app.post("/api/wilayah/fasilitas/:id/nonaktif", RR, h(async (req) => data.nonaktifkanObjek(req.aktor!, "fasilitas", idParam(req))));
  app.post("/api/wilayah/kelompok", RR, h(async (req) => data.simpanKelompok(req.aktor!, req.body)));
  app.patch("/api/wilayah/kelompok/:id", RR, h(async (req) => data.simpanKelompok(req.aktor!, req.body, idParam(req))));
  app.post("/api/wilayah/kelompok/:id/nonaktif", RR, h(async (req) => data.nonaktifkanObjek(req.aktor!, "kelompok", idParam(req))));
  // RT: subjek di RT-nya; RW: hanya fasilitas yang dikelola RW (dicek di simpanFakta).
  app.post("/api/wilayah/fakta/banyak", RR, h(async (req) => data.simpanBanyakFakta(req.aktor!, req.body)));
  app.post("/api/wilayah/kegiatan", RR, h(async (req) => data.simpanKegiatan(req.aktor!, req.body)));
  app.post("/api/wilayah/kejadian/:id/tindak", RR, h(async (req) => data.tindakLanjutKejadian(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/konfirmasi", RR, h(async (req) => {
    const b = z.object({ tahun: z.number().int(), bulan: z.number().int(), bagian: z.string(), aktif: z.boolean() }).parse(req.body);
    return data.setKonfirmasi(req.aktor!, b.tahun, b.bulan, b.bagian, b.aktif);
  }));

  // Laporan (RT = laporan RT sesi; RW = rekap atau per RT, baca)
  app.get("/api/wilayah/laporan", RR, h(async (req) => {
    const { tahun, bulan } = bulanQuery(req);
    return lap.pratinjauLaporan(req.aktor!, rtQuery(req), tahun, bulan);
  }, "Gagal menghitung laporan"));
  app.get("/api/wilayah/laporan/versi", RR, h(async (req) => {
    const { tahun, bulan } = bulanQuery(req);
    return lap.daftarVersi(req.aktor!, rtQuery(req), tahun, bulan);
  }));
  app.post("/api/wilayah/laporan/final", RR, h(async (req) => {
    const b = z.object({ tahun: z.number().int(), bulan: z.number().int(), alasanKoreksi: z.string().max(500).optional() }).parse(req.body);
    if (!isBulanValid(b.tahun, b.bulan)) throw new WilayahError(400, "Bulan tidak valid");
    return lap.finalkanLaporan(req.aktor!, b.tahun, b.bulan, b.alasanKoreksi);
  }, "Gagal memfinalkan laporan"));
  app.get("/api/wilayah/laporan/ekspor", RR, h(async (req, res) => {
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    const dari = req.query.dari ? Number(req.query.dari) : undefined;
    const sampai = req.query.sampai ? Number(req.query.sampai) : undefined;
    const bulan = bulanPeriodeEkspor(tahun, dari, sampai);
    if (!bulan.length) throw new WilayahError(400, "Periode tidak valid");
    const rt = req.aktor!.role === "rt" ? req.aktor!.rt : rtQuery(req);
    const d = await lap.dataEkspor(req.aktor!, rt, tahun, bulan);
    if (req.query.format === "xlsx") {
      const buf = lap.eksporXlsx(d);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${lap.namaFileEkspor(d, rt, "xlsx")}"`);
      res.end(buf);
      return;
    }
    return d;
  }, "Gagal membuat ekspor"));

  // ------------------------------------------------------------------ khusus Ketua RT
  const RT = requireRtWilayah;
  app.get("/api/wilayah/rt/antrean", RT, h(async (req) => data.antreanRt(req.aktor!)));
  app.post("/api/wilayah/rt/keluarga", RT, h(async (req) => data.tambahKeluarga(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/keluarga/:id/warga", RT, h(async (req) => data.tambahWarga(req.aktor!, idParam(req), req.body)));
  app.patch("/api/wilayah/rt/warga/:id", RT, h(async (req) => data.ubahWarga(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/rt/fakta", RT, h(async (req) => data.simpanFakta(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/fakta/banyak", RT, h(async (req) => data.simpanBanyakFakta(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/fakta/:id/putuskan", RT, h(async (req) => data.putuskanFaktaPerluCek(req.aktor!, idParam(req), req.body?.terima === true)));
  app.post("/api/wilayah/rt/rumah", RT, h(async (req) => data.buatRumah(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/keluarga/:id/rumah", RT, h(async (req) => data.hubungkanKkRumah(req.aktor!, idParam(req), Number(req.body?.rumahId))));
  app.post("/api/wilayah/rt/usaha", RT, h(async (req) => data.simpanUsaha(req.aktor!, req.body)));
  app.patch("/api/wilayah/rt/usaha/:id", RT, h(async (req) => data.simpanUsaha(req.aktor!, req.body, idParam(req))));
  app.post("/api/wilayah/rt/usaha/:id/tutup", RT, h(async (req) => data.tutupUsaha(req.aktor!, idParam(req), req.body?.tanggal)));
  app.post("/api/wilayah/rt/kegiatan/:id/hadir", RT, h(async (req) => data.catatKehadiran(req.aktor!, idParam(req), Number(req.body?.jumlahHadir))));
  app.post("/api/wilayah/rt/kejadian", RT, h(async (req) => data.catatKejadian(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/koreksi", RT, h(async (req) => data.usulkanKoreksi(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/serah-terima", RT, h(async (req) => data.ajukanSerahTerima(req.aktor!, req.body)));
  app.post("/api/wilayah/rt/serah-terima/:id/putuskan", RT, h(async (req) => data.putuskanSerahTerima(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/rt/qr/cetak", RT, h(async (req) => {
    const b = z.object({ kkIds: z.union([z.literal("semua"), z.array(z.number().int().positive()).min(1).max(400)]), ganti: z.boolean().optional() }).parse(req.body);
    return qr.kartuUntukCetak(req.aktor!, b.kkIds, b.ganti === true);
  }, "Gagal menyiapkan kartu QR"));
  app.post("/api/wilayah/rt/qr/:id/cabut", RT, h(async (req) => qr.cabutToken(req.aktor!, idParam(req))));
  app.get("/api/wilayah/rt/usulan", RT, h(async (req) => qr.daftarUsulan(req.aktor!, String(req.query.status ?? "menunggu"))));
  app.get("/api/wilayah/rt/usulan/:id", RT, h(async (req) => qr.detailUsulan(req.aktor!, idParam(req))));
  app.post("/api/wilayah/rt/usulan/:id/putuskan", RT, h(async (req) => qr.putuskanUsulan(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/rt/permintaan-surat", RT, h(async (req) => surat.ajukanPermintaan(req.aktor!, req.body)));

  // ------------------------------------------------------------------ khusus Ketua RW
  const RW = requireRwWilayah;
  app.get("/api/wilayah/rw/ringkasan", RW, h(async (req) => {
    const { tahun, bulan } = bulanQuery(req);
    return ringkasanRw(tahun, bulan);
  }, "Gagal memuat dashboard"));
  app.get("/api/wilayah/rw/aksi", RW, h(async (req) => {
    const { tahun, bulan } = bulanQuery(req);
    return aksiRw(tahun, bulan);
  }));
  app.get("/api/wilayah/rw/laporan-status", RW, h(async (req) => {
    const { tahun, bulan } = bulanQuery(req);
    return lap.statusLaporanSemuaRt(tahun, bulan);
  }));
  app.post("/api/wilayah/rw/koreksi/:id/putuskan", RW, h(async (req) => data.putuskanKoreksi(req.aktor!, idParam(req), req.body?.terima === true, String(req.body?.jawaban ?? ""))));
  app.post("/api/wilayah/rw/permintaan-surat/:id/tolak", RW, h(async (req) => surat.tolakPermintaan(req.aktor!, idParam(req), String(req.body?.jawaban ?? ""))));

  app.get("/api/wilayah/rw/surat", RW, h(async (req) => surat.daftarSurat(String(req.query.bagian ?? "arsip"), req.query.cari as string | undefined)));
  app.get("/api/wilayah/rw/surat/:id", RW, h(async (req) => surat.detailSurat(idParam(req))));
  app.post("/api/wilayah/rw/surat", RW, h(async (req) => surat.simpanDraft(req.aktor!, req.body)));
  app.patch("/api/wilayah/rw/surat/:id", RW, h(async (req) => surat.simpanDraft(req.aktor!, req.body, idParam(req))));
  app.delete("/api/wilayah/rw/surat/:id", RW, h(async (req) => surat.hapusDraft(req.aktor!, idParam(req))));
  app.post("/api/wilayah/rw/surat/:id/terbit", RW, h(async (req) => surat.terbitkanSurat(req.aktor!, idParam(req)), "Gagal menerbitkan surat"));
  app.post("/api/wilayah/rw/surat/:id/batal", RW, h(async (req) => surat.batalkanSurat(req.aktor!, idParam(req), String(req.body?.alasan ?? ""))));
  app.post("/api/wilayah/rw/surat/:id/pengganti", RW, h(async (req) => surat.buatPengganti(req.aktor!, idParam(req))));
  app.post("/api/wilayah/rw/surat/:id/kirim", RW, h(async (req) => surat.catatKirim(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/rw/surat/:id/tindak", RW, h(async (req) => surat.tambahTindak(req.aktor!, idParam(req), req.body)));
  app.post("/api/wilayah/rw/surat-tindak/:id/selesai", RW, h(async (req) => surat.selesaikanTindak(req.aktor!, idParam(req))));
  app.post("/api/wilayah/rw/surat/:id/lampiran", RW, h(async (req) => surat.tambahLampiran(req.aktor!, idParam(req), req.body)));
  app.delete("/api/wilayah/rw/surat-lampiran/:id", RW, h(async (req) => surat.hapusLampiran(req.aktor!, idParam(req))));
  app.get("/api/wilayah/rw/surat-lampiran/:id", RW, async (req, res) => {
    try {
      const l = await surat.ambilLampiran(idParam(req));
      const buf = Buffer.from(l.data.slice(l.data.indexOf(",") + 1), "base64");
      res.setHeader("Content-Type", l.mime);
      res.setHeader("Content-Disposition", `inline; filename="${l.nama.replace(/[^\w.\- ]/g, "_")}"`);
      res.end(buf);
    } catch (e) {
      kirimError(res, e, "Gagal membuka lampiran");
    }
  });
  app.get("/api/wilayah/rw/surat/:id/wa", RW, h(async (req) => ({ teks: await surat.ringkasanWa(idParam(req)) })));
}
