import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  ensureRw3bizSchema,
  createPengajuanBaru,
  createPerpanjang,
  dataUntukPerpanjang,
  getStatusByNomor,
  listPengajuanAdmin,
  getPengajuanDetailAdmin,
  approvePengajuan,
  rejectPengajuan,
  listUsahaAktif,
  getOrangKtpPayload,
  hitungTanggalBerlaku,
} from "./rw3biz";
import {
  ajukanKeberatan,
  alokasiUntuk,
  batalkanPembayaran,
  bayarTagihan,
  bebaskanTagihan,
  kategoriKas,
  listKeberatan,
  listTagihan,
  loadTarif,
  parseRincianTersimpan,
  publikTarif,
  rabBulan,
  simpanTarif,
  tagihanUntukUsaha,
  tanggapiKeberatan,
  transparansiPublik,
  ubahKontribusiUsaha,
} from "./rw3biz-kontribusi";
import { bulanIni, parseSumbangsih, totalSumbangsih } from "@shared/rw3biz-kontribusi";
import {
  bayarDenda,
  batalBayarDenda,
  bebaskanDenda,
  catatRazia,
  cocokkanRazia,
  getDataKwitansiRazia,
  hapusRazia,
  listRazia,
  raziaUntukUsaha,
} from "./rw3biz-razia";
import {
  ajukanAduan,
  batalBayarDendaPelanggaran,
  bayarDendaPelanggaran,
  bebaskanDendaPelanggaran,
  catatTemuan,
  daftarUsahaPublik,
  fotoPelanggaran,
  getDataKwitansiPelanggaran,
  hapusPelanggaran,
  listPelanggaran,
  pelanggaranUntukUsaha,
  pratinjauDenda,
  verifikasiAduan,
} from "./rw3biz-pelanggaran";
import {
  buatPdfFormulir,
  buatPdfKwitansi,
  buatPdfKwitansiPelanggaran,
  buatPdfKwitansiRazia,
  buatPdfPernyataan,
  buatPdfSuratUsaha,
  getDataFormulir,
  getDataKwitansi,
  getDataSuratUsaha,
  ringkasSuratUsaha,
} from "./rw3biz-surat";
import { loadVisitrw3SettingsRows } from "./visitrw3-settings";
import { visitrw3ApiErrorMessage } from "./visitrw3-api-error";

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

function kirimPdf(res: Response, pdf: { buffer: Buffer; nama: string }, unduh: boolean) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${unduh ? "attachment" : "inline"}; filename="${pdf.nama}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(pdf.buffer);
}

export function registerRw3bizRoutes(app: Express) {
  // --- Dokumen cetak ---

  /** Salinan pemegang izin: NIK disamarkan. Nomor boleh NIU (surat terbaru) atau BIZ. */
  app.get("/api/public/rw3biz/surat/:nomor", async (req, res) => {
    try {
      const data = await getDataSuratUsaha(String(req.params.nomor));
      if (!data) return res.status(404).json({ message: "Surat belum terbit — pengajuan belum disetujui atau nomor tidak ditemukan" });
      kirimPdf(res, await buatPdfSuratUsaha(data, { nikLengkap: false }), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat surat izin usaha") });
    }
  });

  app.get("/api/public/rw3biz/formulir/:nomor", async (req, res) => {
    try {
      const data = await getDataFormulir({ nomorBiz: String(req.params.nomor) });
      if (!data) return res.status(404).json({ message: "Nomor pengajuan tidak ditemukan" });
      kirimPdf(res, await buatPdfFormulir(data, { lengkap: false }), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat formulir") });
    }
  });

  app.get("/api/public/rw3biz/pernyataan/:nomor", async (req, res) => {
    try {
      const data = await getDataFormulir({ nomorBiz: String(req.params.nomor) });
      if (!data) return res.status(404).json({ message: "Nomor pengajuan tidak ditemukan" });
      kirimPdf(res, await buatPdfPernyataan(data, { lengkap: false }), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat surat pernyataan") });
    }
  });

  /** Kwitansi publik hanya dengan nomor usaha yang cocok — id pembayaran berurutan, jangan bisa ditebak-tebak. */
  app.get("/api/public/rw3biz/kwitansi/:id", async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const nomor = String(req.query.nomor ?? "").trim().toUpperCase();
      const data = Number.isFinite(id) ? await getDataKwitansi(id) : null;
      const cocok =
        data && nomor && (nomor === data.usaha.nomorInduk || nomor === data.usaha.nomorBiz);
      if (!data || !cocok) return res.status(404).json({ message: "Kwitansi tidak ditemukan" });
      kirimPdf(res, await buatPdfKwitansi(data), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat kwitansi") });
    }
  });

  app.get("/api/public/rw3biz/razia/:id/kwitansi", async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const nomor = String(req.query.nomor ?? "").trim().toUpperCase();
      const data = Number.isFinite(id) ? await getDataKwitansiRazia(id) : null;
      const cocok = data?.usaha && nomor && (nomor === data.usaha.nomorInduk || nomor === data.usaha.nomorBiz);
      if (!data || !cocok) return res.status(404).json({ message: "Kwitansi tidak ditemukan" });
      kirimPdf(res, await buatPdfKwitansiRazia(data), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat kwitansi") });
    }
  });

  app.get("/api/admin/rw3biz/pengajuan/:id/surat", requireAdmin, async (req, res) => {
    try {
      const data = await getDataFormulir({ id: parseInt(String(req.params.id), 10) });
      if (!data) return res.status(404).json({ message: "Pengajuan tidak ditemukan" });
      const surat = await getDataSuratUsaha(data.pengajuan.nomorBiz);
      if (!surat) return res.status(404).json({ message: "Surat terbit setelah pengajuan disetujui" });
      kirimPdf(res, await buatPdfSuratUsaha(surat, { nikLengkap: true }), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat surat izin usaha") });
    }
  });

  app.get("/api/admin/rw3biz/pengajuan/:id/formulir", requireAdmin, async (req, res) => {
    try {
      const data = await getDataFormulir({ id: parseInt(String(req.params.id), 10) });
      if (!data) return res.status(404).json({ message: "Pengajuan tidak ditemukan" });
      kirimPdf(res, await buatPdfFormulir(data, { lengkap: true }), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat formulir") });
    }
  });

  app.get("/api/admin/rw3biz/pengajuan/:id/pernyataan", requireAdmin, async (req, res) => {
    try {
      const data = await getDataFormulir({ id: parseInt(String(req.params.id), 10) });
      if (!data) return res.status(404).json({ message: "Pengajuan tidak ditemukan" });
      kirimPdf(res, await buatPdfPernyataan(data, { lengkap: true }), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat surat pernyataan") });
    }
  });

  app.get("/api/admin/rw3biz/kwitansi/:id", requireAdmin, async (req, res) => {
    try {
      const data = await getDataKwitansi(parseInt(String(req.params.id), 10));
      if (!data) return res.status(404).json({ message: "Kwitansi tidak ditemukan" });
      kirimPdf(res, await buatPdfKwitansi(data), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat kwitansi") });
    }
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

  app.get("/api/public/rw3biz/tarif", async (_req, res) => {
    try {
      res.json(publikTarif(await loadTarif()));
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat tarif") });
    }
  });

  app.get("/api/public/rw3biz/transparansi", async (req, res) => {
    try {
      res.json(await transparansiPublik(String(req.query.bulan || bulanIni())));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat laporan kontribusi") });
    }
  });

  app.get("/api/public/rw3biz/usaha", async (_req, res) => {
    try {
      res.json(await daftarUsahaPublik());
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat daftar usaha") });
    }
  });

  app.post("/api/public/rw3biz/aduan", async (req, res) => {
    try {
      res.json(await ajukanAduan(req.body ?? {}, req.ip ?? "anon"));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengirim aduan") });
    }
  });

  app.get("/api/public/rw3biz/pelanggaran/:id/kwitansi", async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const nomor = String(req.query.nomor ?? "").trim().toUpperCase();
      const data = Number.isFinite(id) ? await getDataKwitansiPelanggaran(id) : null;
      const cocok = data?.usaha && nomor && (nomor === data.usaha.nomorInduk || nomor === data.usaha.nomorBiz);
      if (!data || !cocok) return res.status(404).json({ message: "Kwitansi tidak ditemukan" });
      kirimPdf(res, await buatPdfKwitansiPelanggaran(data), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat kwitansi") });
    }
  });

  app.post("/api/public/rw3biz/keberatan", async (req, res) => {
    try {
      const row = await ajukanKeberatan(req.body);
      res.json({ id: row.id, status: row.status });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengirim pengajuan peninjauan") });
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

  app.post("/api/public/rw3biz/perpanjang/data", async (req, res) => {
    try {
      res.json(await dataUntukPerpanjang(req.body ?? {}));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Data usaha tidak dapat dimuat") });
    }
  });

  app.post("/api/public/rw3biz/perpanjang", async (req, res) => {
    try {
      const result = await createPerpanjang(req.body);
      res.json({
        nomorBiz: result.nomorBaru,
        nomorLama: result.nomorLama,
        nomorInduk: result.nomorInduk,
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
      const tarif = await loadTarif();
      // Pembaruan yang masih menunggu survey memuat sumbangsih terbaru yang diajukan.
      const sumber = data.pengajuan?.status === "menunggu_survey" ? data.pengajuan : data.usaha ?? data.pengajuan;
      const sumbangsih = parseSumbangsih(sumber?.sumbangsih);
      const rincian = sumbangsih ? null : parseRincianTersimpan(sumber?.rincianKontribusi);
      const keringanan = data.usaha?.keringananPersen
        ? { persen: data.usaha.keringananPersen, sampai: data.usaha.keringananSampai }
        : null;
      const final = sumber === data.usaha || sumber?.status === "disetujui";
      const kontribusi = sumbangsih
        ? { bulanan: totalSumbangsih(sumbangsih), sumbangsih, hasil: null, alokasi: [], final, keringanan }
        : rincian
          ? {
              bulanan: sumber?.kontribusiBulanan ?? rincian.hasil.total,
              sumbangsih: null,
              hasil: rincian.hasil,
              alokasi: alokasiUntuk(sumber?.kontribusiBulanan ?? rincian.hasil.total, tarif),
              final,
              keringanan,
            }
          : null;
      const tagihan = data.usaha ? await tagihanUntukUsaha(data.usaha.id) : [];
      // Nomor WA PJ dipakai sebagai verifikasi keberatan — jangan dibuka di endpoint publik.
      const samarkanWa = (n?: string | null) => (n ? `${n.slice(0, 4)}****${n.slice(-3)}` : null);
      const samarkanNik = (n?: string | null) => (n ? `${n.slice(0, 4)}********${n.slice(-4)}` : null);
      const samarkanPj = <T extends { pjNomorWhatsapp?: string | null; pjNik?: string | null }>(r: T) => ({
        ...r,
        pjNomorWhatsapp: samarkanWa(r.pjNomorWhatsapp),
        pjNik: samarkanNik(r.pjNik),
      });
      const orang = data.orang.map(({ fotoKtpData: _f, fotoKtpPath: _p, nik, nomorWhatsapp, ...o }) => ({
        ...o,
        nik: samarkanNik(nik),
        nomorWhatsapp: samarkanWa(nomorWhatsapp),
      }));
      const pengajuan = data.pengajuan ? samarkanPj(data.pengajuan) : null;
      const riwayat = data.riwayat.map(samarkanPj);
      const usaha = data.usaha ? samarkanPj(data.usaha) : null;
      const dataSurat = data.usaha?.nomorInduk ? await getDataSuratUsaha(data.usaha.nomorInduk) : null;
      const surat = dataSurat ? ringkasSuratUsaha(dataSurat) : null;
      const razia = data.usaha ? await raziaUntukUsaha(data.usaha.id) : [];
      const pelanggaran = data.usaha ? await pelanggaranUntukUsaha(data.usaha.id) : [];
      res.json({ ...data, pengajuan, riwayat, usaha, orang, kontribusi, tagihan, surat, razia, pelanggaran });
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
      const result = await approvePengajuan(id, adminUsername, req.body ?? {});
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

  const idParam = (v: unknown) => {
    const n = parseInt(String(v), 10);
    if (!Number.isFinite(n) || n <= 0) throw new Error("ID tidak valid");
    return n;
  };
  const admin = (req: Request) => req.session.adminUsername || "admin";

  app.patch("/api/admin/rw3biz/usaha/:id/kontribusi", requireAdmin, async (req, res) => {
    try {
      res.json(await ubahKontribusiUsaha(idParam(req.params.id), req.body ?? {}));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mengubah kontribusi usaha") });
    }
  });

  app.get("/api/admin/rw3biz/settings", requireAdmin, async (_req, res) => {
    try {
      res.json(await loadTarif());
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat tarif") });
    }
  });

  app.put("/api/admin/rw3biz/settings", requireAdmin, async (req, res) => {
    try {
      res.json(await simpanTarif(req.body));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menyimpan tarif") });
    }
  });

  app.get("/api/admin/rw3biz/rab", requireAdmin, async (req, res) => {
    try {
      res.json(await rabBulan(String(req.query.bulan || bulanIni())));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat RAB") });
    }
  });

  app.get("/api/admin/rw3biz/tagihan", requireAdmin, async (req, res) => {
    try {
      res.json(await listTagihan(String(req.query.bulan || bulanIni()), String(req.query.status || "semua")));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat tagihan") });
    }
  });

  app.post("/api/admin/rw3biz/tagihan/:id/bayar", requireAdmin, async (req, res) => {
    try {
      res.json(await bayarTagihan(idParam(req.params.id), req.body ?? {}, admin(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mencatat pembayaran") });
    }
  });

  app.post("/api/admin/rw3biz/tagihan/:id/batal", requireAdmin, async (req, res) => {
    try {
      res.json(await batalkanPembayaran(idParam(req.params.id)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal membatalkan pembayaran") });
    }
  });

  app.post("/api/admin/rw3biz/tagihan/:id/bebaskan", requireAdmin, async (req, res) => {
    try {
      const alasan = String(req.body?.alasan ?? "").trim();
      if (alasan.length < 3) return res.status(400).json({ message: "Alasan pembebasan wajib diisi" });
      res.json(await bebaskanTagihan(idParam(req.params.id), alasan, admin(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal membebaskan tagihan") });
    }
  });

  app.get("/api/admin/rw3biz/keberatan", requireAdmin, async (req, res) => {
    try {
      res.json(await listKeberatan(String(req.query.status || "semua")));
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat keberatan") });
    }
  });

  app.patch("/api/admin/rw3biz/keberatan/:id", requireAdmin, async (req, res) => {
    try {
      res.json(await tanggapiKeberatan(idParam(req.params.id), req.body ?? {}, admin(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menanggapi keberatan") });
    }
  });

  // --- Razia kendaraan ---

  app.post("/api/admin/rw3biz/razia/cek", requireAdmin, async (req, res) => {
    try {
      res.json(await cocokkanRazia(req.body ?? {}));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mencocokkan kendaraan") });
    }
  });

  app.get("/api/admin/rw3biz/razia", requireAdmin, async (req, res) => {
    try {
      res.json(
        await listRazia({
          bulan: req.query.bulan ? String(req.query.bulan) : undefined,
          hasil: req.query.hasil ? String(req.query.hasil) : undefined,
          denda: req.query.denda ? String(req.query.denda) : undefined,
          q: req.query.q ? String(req.query.q) : undefined,
        }),
      );
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat data razia") });
    }
  });

  app.post("/api/admin/rw3biz/razia", requireAdmin, async (req, res) => {
    try {
      res.json(await catatRazia(req.body ?? {}, admin(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mencatat temuan razia") });
    }
  });

  app.delete("/api/admin/rw3biz/razia/:id", requireAdmin, async (req, res) => {
    try {
      await hapusRazia(idParam(req.params.id));
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menghapus temuan") });
    }
  });

  app.post("/api/admin/rw3biz/razia/:id/bayar", requireAdmin, async (req, res) => {
    try {
      res.json(await bayarDenda(idParam(req.params.id), req.body ?? {}, admin(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mencatat pembayaran denda") });
    }
  });

  app.post("/api/admin/rw3biz/razia/:id/batal", requireAdmin, async (req, res) => {
    try {
      res.json(await batalBayarDenda(idParam(req.params.id)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal membatalkan pembayaran denda") });
    }
  });

  app.post("/api/admin/rw3biz/razia/:id/bebaskan", requireAdmin, async (req, res) => {
    try {
      res.json(await bebaskanDenda(idParam(req.params.id), String(req.body?.alasan ?? ""), admin(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal membebaskan denda") });
    }
  });

  app.get("/api/admin/rw3biz/razia/:id/kwitansi", requireAdmin, async (req, res) => {
    try {
      const data = await getDataKwitansiRazia(idParam(req.params.id));
      if (!data) return res.status(404).json({ message: "Denda belum dibayar / tidak ditemukan" });
      kirimPdf(res, await buatPdfKwitansiRazia(data), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat kwitansi denda") });
    }
  });

  // --- Pelanggaran usaha (aduan warga & temuan petugas) ---

  app.get("/api/admin/rw3biz/pelanggaran", requireAdmin, async (req, res) => {
    try {
      res.json(
        await listPelanggaran({
          status: req.query.status ? String(req.query.status) : undefined,
          denda: req.query.denda ? String(req.query.denda) : undefined,
          bulan: req.query.bulan ? String(req.query.bulan) : undefined,
          q: req.query.q ? String(req.query.q) : undefined,
        }),
      );
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat pelanggaran") });
    }
  });

  app.post("/api/admin/rw3biz/pelanggaran/pratinjau", requireAdmin, async (req, res) => {
    try {
      res.json(await pratinjauDenda(req.body ?? {}));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menghitung denda") });
    }
  });

  app.post("/api/admin/rw3biz/pelanggaran", requireAdmin, async (req, res) => {
    try {
      res.json(await catatTemuan(req.body ?? {}, admin(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mencatat pelanggaran") });
    }
  });

  app.post("/api/admin/rw3biz/pelanggaran/:id/verifikasi", requireAdmin, async (req, res) => {
    try {
      res.json(await verifikasiAduan(idParam(req.params.id), req.body ?? {}, admin(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal memverifikasi aduan") });
    }
  });

  app.get("/api/admin/rw3biz/pelanggaran/:id/foto", requireAdmin, async (req, res) => {
    try {
      const f = await fotoPelanggaran(idParam(req.params.id));
      if (!f) return res.status(404).json({ message: "Foto tidak ada" });
      res.setHeader("Content-Type", f.tipe);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(f.buffer);
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat foto") });
    }
  });

  app.post("/api/admin/rw3biz/pelanggaran/:id/bayar", requireAdmin, async (req, res) => {
    try {
      res.json(await bayarDendaPelanggaran(idParam(req.params.id), req.body ?? {}));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal mencatat pembayaran denda") });
    }
  });

  app.post("/api/admin/rw3biz/pelanggaran/:id/batal", requireAdmin, async (req, res) => {
    try {
      res.json(await batalBayarDendaPelanggaran(idParam(req.params.id)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal membatalkan pembayaran denda") });
    }
  });

  app.post("/api/admin/rw3biz/pelanggaran/:id/bebaskan", requireAdmin, async (req, res) => {
    try {
      res.json(await bebaskanDendaPelanggaran(idParam(req.params.id), String(req.body?.alasan ?? ""), admin(req)));
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal membebaskan denda") });
    }
  });

  app.delete("/api/admin/rw3biz/pelanggaran/:id", requireAdmin, async (req, res) => {
    try {
      await hapusPelanggaran(idParam(req.params.id));
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(400).json({ message: visitrw3ApiErrorMessage(error, "Gagal menghapus pelanggaran") });
    }
  });

  app.get("/api/admin/rw3biz/pelanggaran/:id/kwitansi", requireAdmin, async (req, res) => {
    try {
      const data = await getDataKwitansiPelanggaran(idParam(req.params.id));
      if (!data) return res.status(404).json({ message: "Denda belum dibayar / tidak ditemukan" });
      kirimPdf(res, await buatPdfKwitansiPelanggaran(data), req.query.unduh === "1");
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal membuat kwitansi denda") });
    }
  });

  app.get("/api/kas-rw/kategori", requireAdmin, async (_req, res) => {
    try {
      res.json(await kategoriKas());
    } catch (error: unknown) {
      res.status(500).json({ message: visitrw3ApiErrorMessage(error, "Gagal memuat kategori kas") });
    }
  });

}

export { ensureRw3bizSchema };
