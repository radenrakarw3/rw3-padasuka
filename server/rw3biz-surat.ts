/**
 * Dokumen cetak RW3BIZ (F4, jsPDF):
 * - Surat Izin Usaha RW 03 — terbit setiap pengajuan disetujui; wajib diperbarui sebelum masa berlaku habis.
 * - Formulir pendaftaran — salinan lengkap isian pengajuan (semua status), untuk arsip & survey.
 * - Kwitansi — bukti setiap pembayaran kontribusi / denda razia yang masuk Kas RW 03.
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "./db";
import {
  rw3bizOrang,
  rw3bizPembayaran,
  rw3bizPengajuan,
  rw3bizTagihan,
  rw3bizUsaha,
  type Rw3bizOrang,
  type Rw3bizPengajuan,
  type Rw3bizUsaha,
} from "@shared/schema";
import { IDENTITAS_RW } from "@shared/surat-sakti/identitas";
import { terbilang } from "@shared/surat-sakti/redaksi";
import { F4 } from "@shared/kertas";
import { formatKategoriUsahaLabel } from "@shared/visitrw3-kategori-usaha";
import {
  ASAL_ORANG_BIZ_LABEL,
  JENIS_TEMPAT_BIZ_LABEL,
  CHARTER_BIZ,
  JENIS_PELANGGARAN_INFO,
  KATEGORI_KAS_DENDA_PELANGGARAN,
  KATEGORI_KAS_DENDA_RAZIA,
  KATEGORI_KAS_KONTRIBUSI,
  KENDARAAN_BIZ,
  nomorKwitansiPelanggaran,
  nomorKwitansiRazia,
  type JenisPelanggaran,
  OPERASIONAL_MALAM_LABEL,
  PERAN_ORANG_BIZ_LABEL,
  RENTANG_OMZET_LABEL,
  STATUS_TEMPAT_BIZ_LABEL,
  formatRp,
  labelPeriode,
  nomorKwitansi,
  parseSumbangsih,
  totalSumbangsih,
  type AsalOrangBiz,
  type JenisTempatBiz,
  type OperasionalMalam,
  type PeranOrangBiz,
  type RentangOmzet,
  type StatusTempatBiz,
} from "@shared/rw3biz-kontribusi";
import { PERNYATAAN_VERSI, PERWAL_RW, pasalPernyataanSumbangsih } from "@shared/rw3biz-pernyataan";
import { bersihkan, muatLogo, SKALA_SURAT, tulisRata } from "./surat-sakti/pdf";
import { dataUsahaDariBaris, loadTarif, parseRincianTersimpan } from "./rw3biz-kontribusi";
import type { getDataKwitansiRazia } from "./rw3biz-razia";
import type { getDataKwitansiPelanggaran } from "./rw3biz-pelanggaran";

/** Batas pengajuan perpanjang: H-7 sebelum masa berlaku habis. */
export const HARI_BATAS_PERBARUI_BIZ = 7;

const W = F4.w;
const H = F4.h;
const ML = 20;
const MR = 18;
const CW = W - ML - MR;
const HIJAU: [number, number, number] = [25, 87, 72];
const EMAS: [number, number, number] = [196, 160, 92];
const NIU_REGEX = /^NIU-RW3-\d+$/;

function situs(): string {
  return (process.env.PUBLIC_SITE_URL || "https://rw3padasukacimahi.org").replace(/\/+$/, "");
}

function tanggalWib(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function keHari(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
}

function tambahHari(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

function tgl(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function tglPendek(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function samarNik(n: string | null | undefined): string {
  const d = String(n ?? "").replace(/\D/g, "");
  return d.length >= 8 ? `${d.slice(0, 4)}********${d.slice(-4)}` : "-";
}

function samarWa(n: string | null | undefined): string {
  const d = String(n ?? "").replace(/\D/g, "");
  return d.length >= 7 ? `${d.slice(0, 4)}****${d.slice(-3)}` : "-";
}

function rupiahTerbilang(n: number): string {
  const t = terbilang(n);
  return `${t.charAt(0).toUpperCase()}${t.slice(1)} rupiah`;
}

const label = <K extends string>(peta: Record<K, string>, v: string | null | undefined, fallback = "-") =>
  v && v in peta ? peta[v as K] : v || fallback;

// ---------------------------------------------------------------- Penulis PDF

type Gaya = "normal" | "bold" | "italic";

class Lembar {
  doc = new jsPDF({ unit: "mm", format: [W, H], compress: true });
  y = 14;

  /** @param k pengali ukuran huruf & jarak baris isi (kop, kaki, watermark tetap). */
  constructor(private lanjutan: string, judulDokumen: string, readonly k = SKALA_SURAT) {
    this.doc.setProperties({ title: judulDokumen, creator: IDENTITAS_RW.penerbit });
  }

  font(gaya: Gaya = "normal", size = 11) {
    this.fontTetap(gaya, size * this.k);
  }

  fontTetap(gaya: Gaya, size: number) {
    this.doc.setFont("times", gaya);
    this.doc.setFontSize(size);
  }

  pecah(t: string, w: number): string[] {
    return this.doc.splitTextToSize(bersihkan(t), w) as string[];
  }

  ruang(h: number) {
    if (this.y + h <= H - 18) return;
    const { fontStyle } = this.doc.getFont();
    const ukuran = this.doc.getFontSize();
    this.doc.addPage([W, H]);
    this.fontTetap("italic", 9);
    this.doc.setTextColor(110);
    this.doc.text(bersihkan(this.lanjutan), ML, 14);
    this.doc.setTextColor(0);
    this.fontTetap(fontStyle as Gaya, ukuran);
    this.y = 22;
  }

  kop(atas = 9, kecil = false) {
    const d = this.doc;
    const logo = muatLogo();
    const tinggiLogo = kecil ? 17 : 24.6;
    if (logo) {
      try {
        d.addImage(logo, "PNG", ML - 2, atas, tinggiLogo * 0.69, tinggiLogo);
      } catch {
        /* logo opsional */
      }
    }
    const cx = W / 2 + 8;
    const s = kecil ? 0.8 : 1;
    this.fontTetap("bold", 14 * s);
    d.text(IDENTITAS_RW.baris1, cx, atas + 7 * s, { align: "center" });
    this.fontTetap("bold", 13 * s);
    d.text(IDENTITAS_RW.baris2, cx, atas + 13 * s, { align: "center" });
    this.fontTetap("normal", 11 * s);
    d.text(IDENTITAS_RW.baris3, cx, atas + 18.5 * s, { align: "center" });
    this.fontTetap("normal", 8.5 * s);
    d.text(bersihkan(IDENTITAS_RW.alamat), cx, atas + 23 * s, { align: "center", maxWidth: 150 });
    const garis = atas + 28 * s;
    d.setLineWidth(0.8);
    d.line(ML - 4, garis, W - MR + 3, garis);
    d.setLineWidth(0.25);
    d.line(ML - 4, garis + 1.2, W - MR + 3, garis + 1.2);
    this.y = garis + 10;
  }

  judul(teks: string, sub?: string, nomor?: string) {
    const d = this.doc;
    this.font("bold", 14);
    d.text(teks, W / 2, this.y, { align: "center" });
    const wj = d.getTextWidth(teks);
    d.setLineWidth(0.35);
    d.line(W / 2 - wj / 2, this.y + 1.2, W / 2 + wj / 2, this.y + 1.2);
    this.y += 6 * this.k;
    if (sub) {
      this.font("bold", 10.5);
      d.setTextColor(...HIJAU);
      d.text(bersihkan(sub), W / 2, this.y, { align: "center" });
      d.setTextColor(0);
      this.y += 5.5 * this.k;
    }
    if (nomor) {
      this.font("normal", 11);
      d.text(bersihkan(nomor), W / 2, this.y, { align: "center" });
      this.y += 5.5 * this.k;
    }
    this.y += 3;
  }

  paragraf(teks: string, size = 11, lh = 5.2) {
    this.font("normal", size);
    const tinggi = lh * this.k;
    const ls = this.pecah(teks, CW);
    ls.forEach((l, i) => {
      this.ruang(tinggi);
      tulisRata(this.doc, l, ML, this.y, CW, i === ls.length - 1);
      this.y += tinggi;
    });
  }

  subjudul(teks: string) {
    this.ruang(12 * this.k);
    this.y += 3;
    this.font("bold", 11);
    this.doc.setTextColor(...HIJAU);
    this.doc.text(bersihkan(teks), ML, this.y);
    this.doc.setTextColor(0);
    this.doc.setDrawColor(...EMAS);
    this.doc.setLineWidth(0.3);
    this.doc.line(ML, this.y + 1.3, ML + CW, this.y + 1.3);
    this.doc.setDrawColor(0);
    this.y += 6.5 * this.k;
  }

  labelNilai(rows: [string, string][], lebarLabel = 50, size = 10.5, lhDasar = 5) {
    const lw = lebarLabel * this.k;
    const lh = lhDasar * this.k;
    for (const [a, v] of rows) {
      this.font("normal", size);
      const kanan = this.pecah(v || "-", CW - lw - 4);
      this.ruang(lh * kanan.length);
      this.doc.text(bersihkan(a), ML, this.y);
      this.doc.text(":", ML + lw, this.y);
      kanan.forEach((l, i) => this.doc.text(l, ML + lw + 3, this.y + i * lh));
      this.y += lh * Math.max(1, kanan.length);
    }
  }

  tabel(kolom: string[], lebar: number[], baris: string[][], sizeDasar = 9) {
    const xs = lebar.reduce<number[]>((acc, w, i) => [...acc, i === 0 ? ML : acc[i - 1] + lebar[i - 1]], []);
    const size = sizeDasar * this.k;
    const tulis = (sel: string[], tebal: boolean, isi?: boolean) => {
      this.fontTetap(tebal ? "bold" : "normal", size);
      const pecahan = sel.map((s, i) => this.pecah(s || "-", lebar[i] - 2.4));
      const h = Math.max(...pecahan.map((x) => x.length)) * (size * 0.43) + 2.6;
      this.ruang(h);
      this.fontTetap(tebal ? "bold" : "normal", size);
      if (isi) {
        this.doc.setFillColor(235, 243, 240);
        this.doc.rect(ML, this.y, lebar.reduce((s, w) => s + w, 0), h, "F");
      }
      this.doc.setLineWidth(0.2);
      pecahan.forEach((ls, i) => {
        this.doc.rect(xs[i], this.y, lebar[i], h);
        ls.forEach((l, j) => this.doc.text(l, xs[i] + 1.2, this.y + size * 0.42 + j * (size * 0.43)));
      });
      this.y += h;
    };
    tulis(kolom, true, true);
    for (const b of baris) tulis(b, false);
    this.y += 4;
  }

  /** @param ikutAkhir tinggi blok sesudahnya (mis. tanda tangan) yang harus satu halaman dengan butir terakhir. */
  daftarBernomor(items: string[], size = 10, ikutAkhir = 0) {
    this.font("normal", size);
    const lh = size * this.k * 0.48;
    const indent = 7 * this.k;
    items.forEach((k, i) => {
      const ls = this.pecah(k, CW - indent);
      this.ruang(lh * ls.length + (i === items.length - 1 ? ikutAkhir : 0));
      ls.forEach((l, j) => {
        if (j === 0) this.doc.text(`${i + 1}.`, ML + 1, this.y);
        tulisRata(this.doc, l, ML + indent, this.y, CW - indent, j === ls.length - 1);
        this.y += lh;
      });
      this.y += 0.8;
    });
  }

  /** Blok tanda tangan berjajar; nama kosong = garis titik untuk ditulis tangan. */
  tandaTangan(kolom: { jabatan: string; nama?: string | null }[], tempatTanggal?: string) {
    this.ruang(44 * this.k);
    const lebar = CW / kolom.length;
    this.font("normal", 10.5);
    if (tempatTanggal) {
      this.doc.text(bersihkan(tempatTanggal), ML + lebar * (kolom.length - 0.5), this.y, { align: "center" });
      this.y += 5 * this.k;
    }
    kolom.forEach((k, i) => this.doc.text(bersihkan(k.jabatan), ML + lebar * (i + 0.5), this.y, { align: "center" }));
    this.y += 22;
    this.font("bold", 10.5);
    kolom.forEach((k, i) => {
      const x = ML + lebar * (i + 0.5);
      const n = k.nama ? this.pecah(k.nama, lebar - 6)[0] ?? "" : "(..............................)";
      this.doc.text(n, x, this.y, { align: "center" });
      if (k.nama) {
        const w = this.doc.getTextWidth(n);
        this.doc.setLineWidth(0.2);
        this.doc.line(x - w / 2, this.y + 0.8, x + w / 2, this.y + 0.8);
      }
    });
    this.y += 8 * this.k;
  }

  async qr(url: string, baris: string[], ukuran = 22) {
    this.ruang(ukuran + 2);
    const yQr = this.y;
    try {
      const gambar = await QRCode.toDataURL(url, { margin: 0, width: 240 });
      this.doc.addImage(gambar, "PNG", ML, yQr, ukuran, ukuran);
    } catch {
      /* QR opsional */
    }
    this.font("italic", 8.5);
    baris.forEach((t, i) => this.doc.text(bersihkan(t), ML + ukuran + 3, yQr + 5 + i * 4.2 * this.k));
    this.y = yQr + ukuran + 3;
  }

  watermark(teks: string, sub?: string) {
    const d = this.doc;
    for (let hal = 1; hal <= d.getNumberOfPages(); hal++) {
      d.setPage(hal);
      d.setTextColor(170, 30, 30);
      this.fontTetap("bold", 40);
      try {
        const GState = (d as any).GState;
        if (GState) d.setGState(new GState({ opacity: 0.16 }));
      } catch {
        /* tanpa transparansi */
      }
      d.text(bersihkan(teks), W / 2, H / 2, { align: "center", angle: 35 });
      if (sub) {
        this.fontTetap("bold", 18);
        d.text(bersihkan(sub), W / 2 + 8, H / 2 + 14, { align: "center", angle: 35 });
      }
      try {
        const GState = (d as any).GState;
        if (GState) d.setGState(new GState({ opacity: 1 }));
      } catch {
        /* abaikan */
      }
      d.setTextColor(0);
    }
  }

  kaki(kiri: string) {
    const d = this.doc;
    const n = d.getNumberOfPages();
    for (let hal = 1; hal <= n; hal++) {
      d.setPage(hal);
      d.setTextColor(110);
      this.fontTetap("normal", 8);
      d.text(bersihkan(`${kiri}${n > 1 ? ` - hal. ${hal}/${n}` : ""}`), ML, H - 10);
      d.text(bersihkan(`Dicetak ${tgl(tanggalWib(new Date()))}`), W - MR, H - 10, { align: "right" });
      d.setTextColor(0);
    }
  }

  buffer(): Buffer {
    return Buffer.from(this.doc.output("arraybuffer"));
  }
}

// ---------------------------------------------------------------- Data bersama

type BarisUsaha = Rw3bizPengajuan | Rw3bizUsaha;

function barisKendaraan(row: BarisUsaha, tarif?: Awaited<ReturnType<typeof loadTarif>>): string[][] {
  const data = dataUsahaDariBaris(row);
  const milik = KENDARAAN_BIZ.filter((k) => (data[k.kode] ?? 0) > 0).map((k) => [
    k.label + (k.beratJalan ? " (beban jalan)" : ""),
    `${data[k.kode]} unit`,
    tarif ? `${formatRp(tarif[k.kode])}/unit` : "-",
  ]);
  const charter = CHARTER_BIZ.filter((c) => (data[c.kode] ?? 0) > 0).map((c) => [
    `${c.label} (beban jalan)`,
    `${data[c.kode]}x datang/minggu`,
    tarif ? `${formatRp(tarif[c.tarif])}/datang` : "-",
  ]);
  return [...milik, ...charter];
}

function ringkasKendaraan(row: BarisUsaha): string {
  const data = dataUsahaDariBaris(row);
  const bagian = KENDARAAN_BIZ.filter((k) => (data[k.kode] ?? 0) > 0).map((k) => `${data[k.kode]} ${k.label.toLowerCase()}`);
  const plat = data.kendaraanOperasional.length ? ` (plat: ${data.kendaraanOperasional.join(", ")})` : "";
  const charter = CHARTER_BIZ.filter((c) => (data[c.kode] ?? 0) > 0).map((c) => `${c.label.toLowerCase()} ${data[c.kode]}x/minggu`);
  const teksCharter = charter.length
    ? `${bagian.length ? "; " : ""}${charter.join(", ")}${data.charterPenyedia ? ` dari ${data.charterPenyedia}` : ""}`
    : "";
  if (!bagian.length && !charter.length) return "Tidak ada";
  return `${bagian.join(", ")}${bagian.length ? plat : ""}${teksCharter}`;
}

function baris(o: Rw3bizOrang, nikLengkap: boolean, waLengkap: boolean, denganWa = true): string[] {
  const lp = o.jenisKelamin?.startsWith("L") ? "L" : o.jenisKelamin?.startsWith("P") ? "P" : "-";
  const peran = o.isAnak ? "Anak (bukan pegawai)" : `${label(PERAN_ORANG_BIZ_LABEL, o.peran as PeranOrangBiz)}${o.isPenanggungJawab ? " - PJ" : ""}`;
  const asal = o.isAnak
    ? "-"
    : `${label(ASAL_ORANG_BIZ_LABEL, o.asal as AsalOrangBiz)}${o.wargaId ? " (cocok data warga)" : ""}${o.asal === "luar" && o.domisili ? `; ${o.domisili}` : ""}`;
  const nik = o.isAnak ? "-" : nikLengkap ? o.nik || "-" : samarNik(o.nik);
  const sel = [o.namaLengkap, nik, lp, tglPendek(o.tanggalLahir), peran, asal];
  if (denganWa) sel.push(o.isAnak ? "-" : waLengkap ? o.nomorWhatsapp || "-" : samarWa(o.nomorWhatsapp));
  return sel;
}

// ---------------------------------------------------------------- Surat Izin Usaha

export type DataSuratUsaha = {
  pengajuan: Rw3bizPengajuan;
  usaha: Rw3bizUsaha;
  orang: Rw3bizOrang[];
  tanggalTerbit: string;
  berlakuMulai: string;
  berlakuSampai: string;
  perbaruiPalingLambat: string;
  sisaHari: number;
  kedaluwarsa: boolean;
  nomorSebelumnya: string | null;
  digantiOleh: string | null;
};

/** Surat untuk nomor BIZ tertentu, atau surat terbaru bila yang dimasukkan NIU. */
export async function getDataSuratUsaha(nomorRaw: string): Promise<DataSuratUsaha | null> {
  const nomor = nomorRaw.trim().toUpperCase();
  let p: Rw3bizPengajuan | undefined;
  if (NIU_REGEX.test(nomor)) {
    const [u] = await db.select({ id: rw3bizUsaha.id }).from(rw3bizUsaha).where(eq(rw3bizUsaha.nomorInduk, nomor)).limit(1);
    if (!u) return null;
    [p] = await db
      .select()
      .from(rw3bizPengajuan)
      .where(and(eq(rw3bizPengajuan.usahaId, u.id), eq(rw3bizPengajuan.status, "disetujui")))
      .orderBy(desc(rw3bizPengajuan.id))
      .limit(1);
  } else {
    [p] = await db.select().from(rw3bizPengajuan).where(eq(rw3bizPengajuan.nomorBiz, nomor)).limit(1);
  }
  if (!p || p.status !== "disetujui" || !p.usahaId) return null;
  const [usaha] = await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, p.usahaId)).limit(1);
  if (!usaha) return null;
  const orang = await db.select().from(rw3bizOrang).where(eq(rw3bizOrang.pengajuanId, p.id)).orderBy(rw3bizOrang.urutan);

  const sama = and(eq(rw3bizPengajuan.usahaId, p.usahaId), eq(rw3bizPengajuan.status, "disetujui"));
  const [lama] = await db
    .select({ nomor: rw3bizPengajuan.nomorBiz })
    .from(rw3bizPengajuan)
    .where(and(sama, lt(rw3bizPengajuan.id, p.id)))
    .orderBy(desc(rw3bizPengajuan.id))
    .limit(1);
  const [baru] = await db
    .select({ nomor: rw3bizPengajuan.nomorBiz })
    .from(rw3bizPengajuan)
    .where(and(sama, gt(rw3bizPengajuan.id, p.id)))
    .orderBy(desc(rw3bizPengajuan.id))
    .limit(1);

  const hariIni = tanggalWib(new Date());
  const sisaHari = keHari(p.tanggalBerlakuSampai) - keHari(hariIni);
  return {
    pengajuan: p,
    usaha,
    orang,
    tanggalTerbit: p.reviewedAt ? tanggalWib(new Date(p.reviewedAt)) : hariIni,
    berlakuMulai: p.tanggalBayar,
    berlakuSampai: p.tanggalBerlakuSampai,
    perbaruiPalingLambat: tambahHari(p.tanggalBerlakuSampai, -HARI_BATAS_PERBARUI_BIZ),
    sisaHari,
    kedaluwarsa: sisaHari < 0,
    nomorSebelumnya: lama?.nomor ?? null,
    digantiOleh: baru?.nomor ?? null,
  };
}

/** Ringkasan aman untuk halaman cek status. */
export function ringkasSuratUsaha(d: DataSuratUsaha) {
  return {
    nomor: d.pengajuan.nomorBiz,
    nomorInduk: d.usaha.nomorInduk,
    namaUsaha: d.pengajuan.namaUsaha,
    tanggalTerbit: d.tanggalTerbit,
    berlakuMulai: d.berlakuMulai,
    berlakuSampai: d.berlakuSampai,
    perbaruiPalingLambat: d.perbaruiPalingLambat,
    terminBulan: d.pengajuan.terminBulan,
    sisaHari: d.sisaHari,
    kedaluwarsa: d.kedaluwarsa,
    nomorSebelumnya: d.nomorSebelumnya,
    digantiOleh: d.digantiOleh,
  };
}

export async function buatPdfSuratUsaha(d: DataSuratUsaha, opsi: { nikLengkap: boolean }) {
  const p = d.pengajuan;
  const niu = d.usaha.nomorInduk ?? "-";
  const L = new Lembar(`Lanjutan Surat Izin Usaha RW 03 No. ${p.nomorBiz}`, `Surat Izin Usaha ${p.nomorBiz}`);
  L.kop();
  L.judul("SURAT IZIN USAHA", "RW3BIZ - IZIN USAHA DI WILAYAH RW 03 PADASUKA", `Nomor: ${p.nomorBiz}`);

  // Nomor induk menonjol: dipakai untuk cek status, bayar, dan perpanjang
  const kotakNiuH = 15;
  L.doc.setDrawColor(...HIJAU);
  L.doc.setLineWidth(0.6);
  L.doc.roundedRect(W / 2 - 50, L.y - 4.5, 100, kotakNiuH, 2, 2);
  L.doc.setDrawColor(0);
  L.font("bold", 8);
  L.doc.setTextColor(...HIJAU);
  L.doc.text("NOMOR INDUK USAHA RW3", W / 2, L.y, { align: "center" });
  L.doc.setTextColor(0);
  L.font("bold", 15);
  L.doc.text(bersihkan(niu), W / 2, L.y + 7.5, { align: "center" });
  L.y += kotakNiuH + 5;

  L.paragraf(
    `Ketua Rukun Warga 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi menerangkan bahwa usaha ` +
      `di bawah ini telah didata, disurvey, dan diizinkan menjalankan kegiatan usaha di wilayah RW 03 dengan keterangan:`,
  );
  L.y += 2;

  // Surat yang masih berlaku memuat sumbangsih terkini (bisa diubah pengurus setelah terbit).
  const sumber = d.digantiOleh ? p : d.usaha;
  const rincian = parseRincianTersimpan(sumber.rincianKontribusi);
  const sumbangsih = parseSumbangsih(sumber.sumbangsih);
  const kontribusi = sumber.kontribusiBulanan ?? (sumbangsih ? totalSumbangsih(sumbangsih) : rincian?.hasil.total) ?? null;
  const pjNik = p.pjNik ? (opsi.nikLengkap ? p.pjNik : samarNik(p.pjNik)) : null;
  const jenisTempat =
    p.jenisTempatUsaha === "lainnya" && p.jenisTempatUsahaLain
      ? `Lainnya - ${p.jenisTempatUsahaLain}`
      : label(JENIS_TEMPAT_BIZ_LABEL, p.jenisTempatUsaha as JenisTempatBiz);
  L.labelNilai([
    ["Nama usaha", p.namaUsaha],
    ["Jenis tempat usaha", jenisTempat],
    ["Kategori usaha", formatKategoriUsahaLabel(p.kategoriUsaha) || "-"],
    ["Alamat usaha", `${p.alamatUsaha?.trim() || p.alamat}${p.nomorLokasi ? ` (${p.nomorLokasi})` : ""}`],
    ["RT / RW", `${String(p.rt).padStart(2, "0")} / 03, Kel. Padasuka`],
    ["Jam operasional", p.jamBuka && p.jamTutup ? `${p.jamBuka} - ${p.jamTutup} WIB` : "-"],
    ["Penanggung jawab", `${p.pjNama}${pjNik ? ` (NIK ${pjNik})` : ""}`],
    ["Status tempat", label(STATUS_TEMPAT_BIZ_LABEL, p.statusTempat as StatusTempatBiz)],
    ["Kendaraan operasional", ringkasKendaraan(p)],
    [
      sumbangsih ? "Sumbangsih bulanan" : "Kontribusi bulanan",
      kontribusi != null ? `${formatRp(kontribusi)} (${rupiahTerbilang(kontribusi)})` : "-",
    ],
    ...(sumbangsih?.length
      ? ([["Untuk program", sumbangsih.map((s) => `${s.label} ${formatRp(s.nominal)}`).join("; ")]] as [string, string][])
      : []),
    [
      "Jenis surat",
      p.tipe === "perpanjang"
        ? `Pembaruan${d.nomorSebelumnya ? ` (menggantikan No. ${d.nomorSebelumnya})` : ""}`
        : "Terbitan pertama",
    ],
  ], 46);
  L.y += 2;

  const pemegang = d.orang.filter((o) => o.isPenanggungJawab && !o.isAnak);
  L.subjudul("Pemilik / penanggung jawab usaha");
  L.tabel(
    ["No", "Nama lengkap", "NIK", "L/P", "Tgl. lahir", "Peran", "Asal"],
    [8, 37, 34, 9, 21, 28, CW - 137],
    (pemegang.length ? pemegang : d.orang.filter((o) => !o.isAnak).slice(0, 1)).map((o, i) => [
      String(i + 1),
      ...baris(o, opsi.nikLengkap, false, false),
    ]),
  );

  // Kotak masa berlaku
  const kotakH = 37;
  L.y += 2;
  L.ruang(kotakH + 4);
  const y = L.y;
  L.doc.setDrawColor(...HIJAU);
  L.doc.setLineWidth(0.9);
  L.doc.roundedRect(ML, y, CW, kotakH, 2.5, 2.5);
  L.doc.setDrawColor(...EMAS);
  L.doc.setLineWidth(0.3);
  L.doc.roundedRect(ML + 1.6, y + 1.6, CW - 3.2, kotakH - 3.2, 1.8, 1.8);
  L.doc.setDrawColor(0);
  const kol = CW / 3;
  ([
    ["TANGGAL TERBIT", tgl(d.tanggalTerbit), false],
    ["BERLAKU MULAI", tgl(d.berlakuMulai), false],
    [`BERLAKU SAMPAI (${p.terminBulan} BULAN)`, tgl(d.berlakuSampai), true],
  ] as const).forEach(([k, v, utama], i) => {
    const tx = ML + kol * i + kol / 2;
    L.font("bold", 8);
    L.doc.setTextColor(...HIJAU);
    L.doc.text(k, tx, y + 8.5, { align: "center" });
    L.doc.setTextColor(0);
    L.font("bold", utama ? 14 : 11.5);
    L.doc.text(bersihkan(v), tx, y + 16.5, { align: "center" });
  });
  L.doc.setLineWidth(0.2);
  L.doc.line(ML + 6, y + 21.5, ML + CW - 6, y + 21.5);
  L.font("bold", 10.5);
  L.doc.setTextColor(170, 30, 30);
  L.doc.text(bersihkan(`WAJIB DIPERBARUI paling lambat ${tgl(d.perbaruiPalingLambat)}`), W / 2, y + 27.5, { align: "center" });
  L.doc.setTextColor(0);
  L.font("normal", 8.5);
  L.doc.text(
    bersihkan(`Perbarui di ${situs().replace(/^https?:\/\//, "")}/rw3biz/perpanjang dengan Nomor Induk ${niu}`),
    W / 2,
    y + 32.5,
    { align: "center" },
  );
  L.y = y + kotakH + 8;

  const tarif = await loadTarif();
  L.ruang(20);
  L.font("bold", 11);
  L.doc.text("Ketentuan:", ML, L.y);
  L.y += 5.2 * L.k;
  L.daftarBernomor([
    "Surat ini hanya berlaku untuk usaha, lokasi, dan kendaraan yang tercantum, sampai tanggal BERLAKU SAMPAI.",
    `Surat wajib diperbarui sebelum masa berlaku habis (paling lambat ${tgl(d.perbaruiPalingLambat)}) sekaligus memperbarui data kendaraan operasional dan sumbangsih. Setelah disetujui, terbit surat baru dan surat ini tidak berlaku lagi. Nomor Induk Usaha tetap sama.`,
    "Setiap penambahan atau pengurangan kendaraan operasional - milik sendiri maupun charter/sewaan (terutama kolbak dan truk yang membebani jalan lingkungan) - wajib dilaporkan kepada pengurus RW.",
    "Pengurus RW dapat melakukan razia kendaraan. Kendaraan menuju usaha ini yang tidak tercatat di surat ini dikenai denda yang disetor ke Kas RW 03, dan data usaha wajib diperbarui.",
    sumbangsih
      ? `Sumbangsih yang disanggupkan dalam Surat Pernyataan Sumbangsih SPS/${p.nomorBiz} adalah dana swadaya masyarakat sebagaimana ${PERWAL_RW.pasal} ${PERWAL_RW.singkat}, disetor ke Kas RW 03 paling lambat tanggal ${1 + tarif.tenggangHari} setiap bulan, dan dipakai sesuai RAB RW 03. Setiap setoran diberi kwitansi resmi; simpan kwitansi sebagai bukti.`
      : `Kontribusi bulanan dibayarkan ke Kas RW 03 paling lambat tanggal ${1 + tarif.tenggangHari} setiap bulan. Setiap pembayaran diberi kwitansi resmi; simpan kwitansi sebagai bukti.`,
    "Pemegang izin wajib menjaga kebersihan, ketertiban, dan keamanan lingkungan, serta tidak merusak jalan dan fasilitas umum di wilayah RW 03.",
    "Pelanggaran (sampah tercecer, kebisingan, parkir menghalangi jalan, limbah/bau, melanggar jam operasional, merusak fasilitas umum, data tidak sesuai, dll) dari aduan warga yang terbukti atau temuan petugas dikenai teguran / denda: denda dasar x tingkat (ringan/sedang/berat) x pengulangan dalam 12 bulan. Denda disetor ke Kas RW 03 dengan kwitansi.",
    "Bila kontribusi dan denda yang terkumpul dalam sebulan melebihi kebutuhan anggaran RW, kelebihannya dijadikan voucher belanja bagi warga RW 03 yang hanya dapat dibelanjakan di usaha RW3BIZ yang tertib berkontribusi. Voucher yang diterima usaha ditukar ke Kas RW 03 senilai nominalnya.",
    "Simpan surat ini di tempat usaha dan tunjukkan bila diminta oleh pengurus RT/RW atau petugas.",
  ], 10, 5 + 44 * L.k);
  L.y += 5;

  L.tandaTangan(
    [
      { jabatan: "Pemegang izin,", nama: p.pjNama },
      { jabatan: `${IDENTITAS_RW.ketua.jabatan},`, nama: IDENTITAS_RW.ketua.nama },
    ],
    `${IDENTITAS_RW.tempat}, ${tgl(d.tanggalTerbit)}`,
  );

  const urlCek = `${situs()}/rw3biz/status?nomor=${encodeURIComponent(niu !== "-" ? niu : p.nomorBiz)}`;
  await L.qr(urlCek, [
    "Pindai untuk memeriksa keaslian, masa berlaku, dan kontribusi usaha ini.",
    urlCek.replace(/^https?:\/\//, ""),
    "Kode QR bukan tanda tangan elektronik. Surat sah bila ditandatangani basah.",
  ]);

  const tidakBerlaku = d.digantiOleh ? `DIGANTI ${d.digantiOleh}` : d.kedaluwarsa ? "MASA BERLAKU HABIS" : null;
  if (tidakBerlaku) L.watermark("TIDAK BERLAKU", tidakBerlaku);
  L.kaki(`No. ${p.nomorBiz} · ${niu}`);
  return { buffer: L.buffer(), nama: `Surat-Izin-Usaha-${p.nomorBiz}.pdf` };
}

// ---------------------------------------------------------------- Formulir pendaftaran

const STATUS_LABEL: Record<string, string> = {
  menunggu_survey: "Menunggu survey",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export async function getDataFormulir(cari: { nomorBiz: string } | { id: number }) {
  const [p] = await db
    .select()
    .from(rw3bizPengajuan)
    .where("id" in cari ? eq(rw3bizPengajuan.id, cari.id) : eq(rw3bizPengajuan.nomorBiz, cari.nomorBiz.trim().toUpperCase()))
    .limit(1);
  if (!p) return null;
  const orang = await db.select().from(rw3bizOrang).where(eq(rw3bizOrang.pengajuanId, p.id)).orderBy(rw3bizOrang.urutan);
  const usaha = p.usahaId ? (await db.select().from(rw3bizUsaha).where(eq(rw3bizUsaha.id, p.usahaId)).limit(1))[0] ?? null : null;
  return { pengajuan: p, orang, usaha };
}

export async function buatPdfFormulir(
  data: NonNullable<Awaited<ReturnType<typeof getDataFormulir>>>,
  opsi: { lengkap: boolean },
) {
  const { pengajuan: p, orang, usaha } = data;
  const tarif = await loadTarif();
  const L = new Lembar(`Lanjutan Formulir RW3BIZ ${p.nomorBiz}`, `Formulir RW3BIZ ${p.nomorBiz}`);
  L.kop();
  L.judul(
    "FORMULIR PENDAFTARAN USAHA",
    p.tipe === "perpanjang" ? "RW3BIZ - PEMBARUAN IZIN USAHA" : "RW3BIZ - PENDAFTARAN USAHA BARU",
    `Nomor pengajuan: ${p.nomorBiz}`,
  );

  L.subjudul("A. Pengajuan");
  L.labelNilai([
    ["Nomor Induk Usaha", usaha?.nomorInduk ?? "Diberikan setelah disetujui"],
    ["Status", STATUS_LABEL[p.status] ?? p.status],
    ["Tanggal pengajuan", p.createdAt ? tgl(tanggalWib(new Date(p.createdAt))) : "-"],
    ["Masa berlaku diminta", `${p.terminBulan} bulan: ${tgl(p.tanggalBayar)} s.d. ${tgl(p.tanggalBerlakuSampai)}`],
    ...(p.reviewedAt ? ([["Diproses", `${tgl(tanggalWib(new Date(p.reviewedAt)))} oleh ${p.reviewedBy ?? "admin"}`]] as [string, string][]) : []),
    ...(p.alasanTolak ? ([["Alasan ditolak", p.alasanTolak]] as [string, string][]) : []),
  ]);

  L.subjudul("B. Data usaha");
  const jenisTempat =
    p.jenisTempatUsaha === "lainnya" && p.jenisTempatUsahaLain
      ? `Lainnya - ${p.jenisTempatUsahaLain}`
      : label(JENIS_TEMPAT_BIZ_LABEL, p.jenisTempatUsaha as JenisTempatBiz);
  L.labelNilai([
    ["Nama usaha", p.namaUsaha],
    ["Jenis tempat usaha", jenisTempat],
    ["Kategori usaha", formatKategoriUsahaLabel(p.kategoriUsaha) || "-"],
    ["Alamat lokasi", `${p.alamat}${p.nomorLokasi ? ` (${p.nomorLokasi})` : ""}`],
    ...(p.alamatUsaha && p.alamatUsaha !== p.alamat ? ([["Alamat usaha", p.alamatUsaha]] as [string, string][]) : []),
    ["RT / RW", `${String(p.rt).padStart(2, "0")} / 03`],
    ["Jam operasional", p.jamBuka && p.jamTutup ? `${p.jamBuka} - ${p.jamTutup} WIB` : "-"],
    ["Hari buka per minggu", p.hariOperasional ? `${p.hariOperasional} hari` : "-"],
    ["Operasional malam", label(OPERASIONAL_MALAM_LABEL, p.operasionalMalam as OperasionalMalam)],
    ["Status tempat", label(STATUS_TEMPAT_BIZ_LABEL, p.statusTempat as StatusTempatBiz)],
    ["Luas tempat", p.luasM2 != null ? `${p.luasM2} m²` : "-"],
    ...(p.rentangOmzet
      ? ([["Kisaran omzet / bulan", label(RENTANG_OMZET_LABEL, p.rentangOmzet as RentangOmzet)]] as [string, string][])
      : []),
    ["Sampah per hari", p.sampahKantongHari != null ? `${p.sampahKantongHari} kantong` : "-"],
    ["Memakai bahu jalan", p.pakaiBahuJalan ? "Ya" : "Tidak"],
    ["Usaha baru (< 3 bulan)", p.usahaBaru ? "Ya" : "Tidak"],
  ]);

  L.subjudul("C. Kendaraan operasional");
  const kendaraan = barisKendaraan(p, tarif);
  if (kendaraan.length) {
    L.tabel(["Jenis kendaraan", "Jumlah", "Tarif"], [80, 40, CW - 120], kendaraan);
    const du = dataUsahaDariBaris(p);
    L.labelNilai(
      [
        ["Plat milik usaha", du.kendaraanOperasional.length ? du.kendaraanOperasional.join(", ") : "-"],
        ...(du.charterPenyedia ? ([["Penyedia charter", du.charterPenyedia]] as [string, string][]) : []),
      ],
      36,
    );
  } else {
    L.paragraf("Tidak ada kendaraan operasional.", 10.5);
  }

  L.subjudul("D. Pemilik / penanggung jawab");
  L.tabel(
    ["No", "Nama lengkap", "NIK", "L/P", "Tgl. lahir", "Peran", "Asal / domisili", "WhatsApp"],
    [8, 31, 31, 8, 19, 26, 28, CW - 151],
    orang.map((o, i) => [String(i + 1), ...baris(o, opsi.lengkap, opsi.lengkap)]),
    8.5,
  );

  const sumbangsih = parseSumbangsih(p.sumbangsih);
  const rincian = sumbangsih ? null : parseRincianTersimpan(p.rincianKontribusi);
  L.subjudul(
    sumbangsih
      ? p.status === "disetujui"
        ? "E. Sumbangsih bulanan untuk program RW 03 (disepakati)"
        : "E. Sumbangsih bulanan untuk program RW 03 (disanggupkan)"
      : p.status === "disetujui"
        ? "E. Kontribusi bulanan (ditetapkan)"
        : "E. Perkiraan kontribusi bulanan",
  );
  if (sumbangsih) {
    const total = totalSumbangsih(sumbangsih);
    L.tabel(
      ["Program RW 03", "Per bulan"],
      [CW - 40, 40],
      [...sumbangsih.map((s) => [s.label, formatRp(s.nominal)]), ["JUMLAH", formatRp(total)]],
    );
    L.font("italic", 9.5);
    L.paragraf(`(${rupiahTerbilang(total)} per bulan)`, 9.5, 4.6);
  } else if (rincian) {
    const h = rincian.hasil;
    const rows: string[][] = h.komponen.map((k) => [k.label, formatRp(k.nominal)]);
    if (h.diskonLokal > 0) rows.push([`Potongan pegawai warga RW 03 (${h.diskonLokalPersen}%)`, `-${formatRp(h.diskonLokal)}`]);
    if (h.faktorPenyesuaian !== 1) rows.push(["Faktor penyesuaian RAB", `x ${h.faktorPenyesuaian.toFixed(2)}`]);
    if (h.terkenaBatasAtas) rows.push([`Dibatasi: ${h.batasAtasAlasan}`, ""]);
    L.tabel(["Komponen", "Nominal"], [CW - 40, 40], rows);
    const total = p.kontribusiBulanan ?? h.total;
    L.font("bold", 11);
    L.ruang(6);
    L.doc.text(bersihkan(`Kontribusi per bulan: ${formatRp(total)}`), ML, L.y);
    L.y += 5 * L.k;
    L.font("italic", 9.5);
    L.paragraf(`(${rupiahTerbilang(total)})`, 9.5, 4.6);
    if (p.status !== "disetujui") {
      L.paragraf("Angka final ditetapkan pengurus setelah survey lapangan.", 9.5, 4.6);
    }
  } else {
    L.paragraf("Belum dihitung.", 10.5);
  }

  if (p.catatanPemohon?.trim()) {
    L.subjudul("Catatan pemohon");
    L.paragraf(p.catatanPemohon.trim(), 10);
  }

  L.subjudul("F. Hasil survey lapangan (diisi petugas)");
  if (p.catatanSurvey?.trim()) {
    L.paragraf(p.catatanSurvey.trim(), 10);
  } else {
    L.font("normal", 10);
    for (let i = 0; i < 4; i++) {
      L.ruang(7);
      L.doc.setLineWidth(0.15);
      L.doc.setDrawColor(150);
      L.doc.line(ML, L.y + 1, ML + CW, L.y + 1);
      L.doc.setDrawColor(0);
      L.y += 7;
    }
  }
  L.y += 3;

  L.ruang(4.6 * L.k * 2 + 3 + 44 * L.k);
  L.paragraf(
    sumbangsih
      ? "Dengan menandatangani formulir ini, pemohon menyatakan data di atas benar, bersedia disurvey, dan sanggup menyetor sumbangsih bulanan di atas ke Kas RW 03 untuk program RW 03."
      : "Dengan menandatangani formulir ini, pemohon menyatakan data di atas benar, bersedia disurvey, dan sanggup membayar kontribusi bulanan ke Kas RW 03 sesuai ketentuan.",
    9.5,
    4.6,
  );
  L.y += 3;
  L.tandaTangan(
    [
      { jabatan: "Pemohon / penanggung jawab,", nama: p.pjNama },
      { jabatan: "Petugas survey," },
      { jabatan: `${IDENTITAS_RW.ketua.jabatan},`, nama: IDENTITAS_RW.ketua.nama },
    ],
    `${IDENTITAS_RW.tempat}, ....................................`,
  );

  if (!opsi.lengkap) {
    L.font("italic", 8.5);
    L.paragraf("Salinan pemohon: NIK dan nomor WhatsApp disamarkan.", 8.5, 4.2);
  }
  L.kaki(`Formulir RW3BIZ ${p.nomorBiz}${usaha?.nomorInduk ? ` · ${usaha.nomorInduk}` : ""}`);
  return { buffer: L.buffer(), nama: `Formulir-RW3BIZ-${p.nomorBiz}.pdf` };
}

// ---------------------------------------------------------------- Surat Pernyataan Sumbangsih

function waktuWib(d: Date): string {
  return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Kepala Perwal, bunyi lengkap Pasal 114, dan penerapannya — dalam bingkai emas. */
function tulisDasarHukum(L: Lembar) {
  const d = L.doc;
  const yAwal = L.y - 2;
  L.y += 3;
  L.font("bold", 10.5);
  d.setTextColor(...HIJAU);
  d.text("DASAR HUKUM", ML + 4, L.y);
  d.setTextColor(0);
  L.y += 5.5 * L.k;
  L.font("bold", 9.5);
  for (const baris of PERWAL_RW.kepala) {
    d.text(bersihkan(baris), W / 2, L.y, { align: "center" });
    L.y += 4.3 * L.k;
  }
  L.y += 1.5;
  L.font("bold", 9.5);
  d.text(bersihkan(PERWAL_RW.bab), W / 2, L.y, { align: "center" });
  L.y += 4.5 * L.k;
  d.text(PERWAL_RW.pasal, W / 2, L.y, { align: "center" });
  L.y += 5.5 * L.k;
  const lebar = CW - 18;
  const lh = 4.6 * L.k;
  for (const a of PERWAL_RW.ayat) {
    L.font("normal", 10);
    const baris = L.pecah(a.teks, lebar);
    L.ruang(lh * (baris.length + (a.huruf?.length ?? 0)));
    d.text(a.no, ML + 4, L.y);
    baris.forEach((b, i) => {
      tulisRata(d, b, ML + 12, L.y, lebar, i === baris.length - 1);
      L.y += lh;
    });
    for (const h of a.huruf ?? []) {
      L.font(h.startsWith("a.") ? "bold" : "normal", 10);
      for (const b of L.pecah(h, lebar - 6)) {
        d.text(b, ML + 17, L.y);
        L.y += lh;
      }
    }
    L.y += 1;
  }
  L.y += 1.5;
  L.font("bold", 9.5);
  d.text("Penerapan pada sumbangsih RW3BIZ:", ML + 4, L.y);
  L.y += 4.6 * L.k;
  for (const p of PERWAL_RW.penerapan) {
    L.font("normal", 9.5);
    const baris = L.pecah(`${p.ayat}: ${p.teks}`, lebar + 6);
    L.ruang(4.4 * L.k * baris.length);
    baris.forEach((b) => {
      d.text(b, ML + 6, L.y);
      L.y += 4.4 * L.k;
    });
  }
  L.y += 1;
  // Bingkai hanya digambar bila blok tidak terpotong ke halaman berikutnya.
  if (L.y > yAwal && d.getNumberOfPages() === 1) {
    d.setDrawColor(...EMAS);
    d.setLineWidth(0.6);
    d.roundedRect(ML, yAwal, CW, L.y - yAwal, 2, 2);
    d.setDrawColor(0);
    d.setLineWidth(0.2);
  }
  L.y += 5;
}

/** Surat pernyataan yang disetujui pemohon (online) — pasal dari shared/rw3biz-pernyataan.ts. */
export async function buatPdfPernyataan(
  data: NonNullable<Awaited<ReturnType<typeof getDataFormulir>>>,
  opsi: { lengkap: boolean },
) {
  const { pengajuan: p, orang, usaha } = data;
  const tarif = await loadTarif();
  const sumbangsih = parseSumbangsih(p.sumbangsih) ?? [];
  const total = totalSumbangsih(sumbangsih);
  const pj = orang.find((o) => o.isPenanggungJawab && !o.isAnak) ?? orang.find((o) => !o.isAnak) ?? null;
  const L = new Lembar(`Lanjutan Surat Pernyataan Sumbangsih ${p.nomorBiz}`, `Surat Pernyataan Sumbangsih ${p.nomorBiz}`);
  L.kop();
  L.judul("SURAT PERNYATAAN SUMBANGSIH", "RW3BIZ - SUMBANGSIH USAHA UNTUK PROGRAM RW 03", `Nomor: SPS/${p.nomorBiz}`);

  tulisDasarHukum(L);

  L.paragraf("Yang bertanda tangan di bawah ini:");
  L.y += 1;
  const nik = pj?.nik ? (opsi.lengkap ? pj.nik : samarNik(pj.nik)) : p.pjNik ? (opsi.lengkap ? p.pjNik : samarNik(p.pjNik)) : "-";
  L.labelNilai([
    ["Nama", pj?.namaLengkap ?? p.pjNama],
    ["NIK", nik],
    ["Kedudukan", pj ? label(PERAN_ORANG_BIZ_LABEL, pj.peran as PeranOrangBiz) : "Penanggung jawab"],
    ["Nama usaha", p.namaUsaha],
    ["Alamat usaha", `${p.alamatUsaha?.trim() || p.alamat}, RT ${String(p.rt).padStart(2, "0")} / RW 03, Kel. Padasuka`],
    ["Nomor WhatsApp", opsi.lengkap ? p.pjNomorWhatsapp : samarWa(p.pjNomorWhatsapp)],
    ["Nomor pengajuan", `${p.nomorBiz}${usaha?.nomorInduk ? ` · ${usaha.nomorInduk}` : ""}`],
  ], 40);
  L.y += 1;
  L.paragraf(
    `selanjutnya disebut PIHAK PERTAMA, dengan ini menyatakan kepada Pengurus Rukun Warga 03 Kelurahan Padasuka yang diwakili oleh ${IDENTITAS_RW.ketua.jabatan} (selanjutnya disebut PIHAK KEDUA; bersama-sama disebut PARA PIHAK), hal-hal sebagai berikut:`,
  );

  L.subjudul(`Kebutuhan RW 03 (${formatRp(tarif.targetBulanan)}/bulan) dan sumbangsih yang disanggupkan`);
  const disanggupi = new Map(sumbangsih.map((s) => [s.posId, s.nominal]));
  const baris = tarif.posAnggaran.map((pos) => [pos.label, formatRp(pos.nominal), disanggupi.has(pos.id) ? formatRp(disanggupi.get(pos.id)!) : "-"]);
  for (const s of sumbangsih) if (!tarif.posAnggaran.some((pos) => pos.id === s.posId)) baris.push([s.label, "-", formatRp(s.nominal)]);
  baris.push(["JUMLAH", formatRp(tarif.targetBulanan), total ? formatRp(total) : "-"]);
  L.tabel(["Program RW 03", "Kebutuhan / bulan", "Sumbangsih / bulan"], [CW - 76, 38, 38], baris, 9.5);

  pasalPernyataanSumbangsih({ total: total || null, tenggangHari: tarif.tenggangHari, target: tarif.targetBulanan, terminBulan: p.terminBulan }).forEach(
    (pasal, i) => {
      L.ruang(24 * L.k);
      L.y += 2;
      L.font("bold", 11);
      L.doc.text(`Pasal ${i + 1}`, W / 2, L.y, { align: "center" });
      L.y += 5 * L.k;
      L.doc.text(bersihkan(pasal.judul.toUpperCase()), W / 2, L.y, { align: "center" });
      L.y += 5.5 * L.k;
      L.daftarBernomor(pasal.ayat, 10);
    },
  );

  L.y += 3;
  L.ruang(70 * L.k);
  L.font("bold", 10);
  L.doc.setTextColor(...HIJAU);
  const bukti = p.pernyataanDisetujuiAt
    ? `Disetujui secara elektronik oleh PIHAK PERTAMA pada ${waktuWib(new Date(p.pernyataanDisetujuiAt))} WIB (versi ${p.pernyataanVersi ?? PERNYATAAN_VERSI}).`
    : "Belum ada persetujuan elektronik - berlaku setelah ditandatangani PIHAK PERTAMA.";
  L.paragraf(bukti, 10);
  L.doc.setTextColor(0);
  L.y += 3;

  const yTtd = L.y;
  L.tandaTangan(
    [
      { jabatan: "PIHAK PERTAMA,", nama: pj?.namaLengkap ?? p.pjNama },
      { jabatan: "PIHAK KEDUA,", nama: IDENTITAS_RW.ketua.nama },
    ],
    `${IDENTITAS_RW.tempat}, ${p.pernyataanDisetujuiAt ? tgl(tanggalWib(new Date(p.pernyataanDisetujuiAt))) : "...................................."}`,
  );
  // Kotak meterai di sisi kiri kolom PIHAK PERTAMA, di ruang tanda tangan.
  L.doc.setDrawColor(150);
  L.doc.setLineDashPattern([1.2, 1], 0);
  L.doc.rect(ML + 2, yTtd + 9 * L.k, 22, 15);
  L.doc.setLineDashPattern([], 0);
  L.doc.setDrawColor(0);
  L.fontTetap("normal", 6.5);
  L.doc.setTextColor(130);
  L.doc.text("Meterai", ML + 13, yTtd + 9 * L.k + 6.5, { align: "center" });
  L.doc.text("Rp10.000", ML + 13, yTtd + 9 * L.k + 9.5, { align: "center" });
  L.doc.text("(bila diminta)", ML + 13, yTtd + 9 * L.k + 12.5, { align: "center" });
  L.doc.setTextColor(0);

  if (!opsi.lengkap) {
    L.font("italic", 8.5);
    L.paragraf("Salinan pemohon: NIK dan nomor WhatsApp disamarkan.", 8.5, 4.2);
  }
  L.kaki(`Surat Pernyataan Sumbangsih SPS/${p.nomorBiz} · versi ${p.pernyataanVersi ?? PERNYATAAN_VERSI}`);
  return { buffer: L.buffer(), nama: `Surat-Pernyataan-Sumbangsih-${p.nomorBiz}.pdf` };
}

// ---------------------------------------------------------------- Kwitansi

export async function getDataKwitansi(pembayaranId: number) {
  const [row] = await db
    .select({ bayar: rw3bizPembayaran, tagihan: rw3bizTagihan, usaha: rw3bizUsaha })
    .from(rw3bizPembayaran)
    .innerJoin(rw3bizTagihan, eq(rw3bizPembayaran.tagihanId, rw3bizTagihan.id))
    .innerJoin(rw3bizUsaha, eq(rw3bizTagihan.usahaId, rw3bizUsaha.id))
    .where(eq(rw3bizPembayaran.id, pembayaranId))
    .limit(1);
  if (!row) return null;
  const semua = await db
    .select({ id: rw3bizPembayaran.id, jumlah: rw3bizPembayaran.jumlah })
    .from(rw3bizPembayaran)
    .where(eq(rw3bizPembayaran.tagihanId, row.tagihan.id))
    .orderBy(rw3bizPembayaran.id);
  const sampaiIni = semua.filter((b) => b.id <= row.bayar.id).reduce((s, b) => s + b.jumlah, 0);
  return { ...row, terbayarSampaiIni: sampaiIni, cicilanKe: semua.findIndex((b) => b.id === row.bayar.id) + 1, jumlahCicilan: semua.length };
}

export async function buatPdfKwitansi(d: NonNullable<Awaited<ReturnType<typeof getDataKwitansi>>>) {
  const { bayar, tagihan, usaha } = d;
  const sisa = Math.max(0, tagihan.jumlah - d.terbayarSampaiIni);
  const keterangan =
    `Kontribusi bulanan RW3BIZ periode ${labelPeriode(tagihan.periode)}` +
    (d.jumlahCicilan > 1 || sisa > 0 ? ` (pembayaran ke-${d.cicilanKe}${sisa > 0 ? ", cicilan" : ", pelunasan"})` : " (lunas)");
  return pdfKwitansi({
    nomor: nomorKwitansi(bayar.id, bayar.tanggal),
    jumlah: bayar.jumlah,
    tanggal: bayar.tanggal,
    dicatatOleh: bayar.dicatatOleh,
    baris: [
      ["Telah terima dari", `${usaha.pjNama} - ${usaha.namaUsaha}`],
      ["Nomor Induk Usaha", usaha.nomorInduk ?? usaha.nomorBiz],
      ["Uang sejumlah", rupiahTerbilang(bayar.jumlah)],
      ["Untuk pembayaran", keterangan],
      ["Rincian tagihan", `Tagihan ${formatRp(tagihan.jumlah)} · terbayar ${formatRp(d.terbayarSampaiIni)} · sisa ${formatRp(sisa)}`],
      ["Disetor ke", `Kas RW 03 - kategori "${KATEGORI_KAS_KONTRIBUSI}"${bayar.kasRwId ? ` (ref. kas #${bayar.kasRwId})` : ""}`],
    ],
    nomorCek: usaha.nomorInduk ?? usaha.nomorBiz,
    catatanKaki: "Kwitansi sah bila ditandatangani penerima. Seluruh kontribusi masuk Kas RW 03 dan dilaporkan terbuka di halaman RW3BIZ.",
  });
}

export async function buatPdfKwitansiRazia(d: NonNullable<Awaited<ReturnType<typeof getDataKwitansiRazia>>>) {
  const { razia: r, usaha } = d;
  const tanggalBayar = r.tanggalBayar!;
  const jenis = KENDARAAN_BIZ.find((k) => k.kode === r.jenis)?.label ?? r.jenis;
  return pdfKwitansi({
    nomor: nomorKwitansiRazia(r.id, tanggalBayar),
    jumlah: r.denda,
    tanggal: tanggalBayar,
    dicatatOleh: r.dicatatOleh,
    baris: [
      ["Telah terima dari", r.pembayarNama || (usaha ? `${usaha.pjNama} - ${usaha.namaUsaha}` : r.namaSopir || "-")],
      ...(usaha ? ([["Nomor Induk Usaha", usaha.nomorInduk ?? usaha.nomorBiz]] as [string, string][]) : []),
      ["Uang sejumlah", rupiahTerbilang(r.denda)],
      ["Untuk pembayaran", `Denda razia kendaraan tidak terdaftar: ${jenis} ${r.plat}, ${tgl(r.tanggal)} di ${r.lokasi}`],
      ["Disetor ke", `Kas RW 03 - kategori "${KATEGORI_KAS_DENDA_RAZIA}"${r.kasRwId ? ` (ref. kas #${r.kasRwId})` : ""}`],
    ],
    nomorCek: usaha ? usaha.nomorInduk ?? usaha.nomorBiz : null,
    catatanKaki: "Kwitansi sah bila ditandatangani penerima. Denda razia masuk Kas RW 03 untuk pemeliharaan jalan lingkungan.",
  });
}

export async function buatPdfKwitansiPelanggaran(d: NonNullable<Awaited<ReturnType<typeof getDataKwitansiPelanggaran>>>) {
  const { p, usaha } = d;
  const tanggalBayar = p.tanggalBayar!;
  const jenis = JENIS_PELANGGARAN_INFO[p.jenis as JenisPelanggaran]?.label ?? p.jenis;
  return pdfKwitansi({
    nomor: nomorKwitansiPelanggaran(p.id, tanggalBayar),
    jumlah: p.denda,
    tanggal: tanggalBayar,
    dicatatOleh: p.diverifikasiOleh ?? p.dicatatOleh ?? "-",
    baris: [
      ["Telah terima dari", p.pembayarNama || (usaha ? `${usaha.pjNama} - ${usaha.namaUsaha}` : p.namaUsahaLain || "-")],
      ...(usaha ? ([["Nomor Induk Usaha", usaha.nomorInduk ?? usaha.nomorBiz]] as [string, string][]) : []),
      ["Uang sejumlah", rupiahTerbilang(p.denda)],
      ["Untuk pembayaran", `Denda pelanggaran: ${jenis}, ${tgl(p.tanggalKejadian)}${p.lokasi ? ` di ${p.lokasi}` : ""}`],
      ["Perhitungan", p.dendaRincian ?? "-"],
      ["Disetor ke", `Kas RW 03 - kategori "${KATEGORI_KAS_DENDA_PELANGGARAN}"${p.kasRwId ? ` (ref. kas #${p.kasRwId})` : ""}`],
    ],
    nomorCek: usaha ? usaha.nomorInduk ?? usaha.nomorBiz : null,
    catatanKaki: "Kwitansi sah bila ditandatangani penerima. Denda masuk Kas RW 03 dan dilaporkan terbuka di halaman RW3BIZ.",
  });
}

async function pdfKwitansi(o: {
  nomor: string;
  jumlah: number;
  tanggal: string;
  dicatatOleh: string;
  baris: [string, string][];
  nomorCek: string | null;
  catatanKaki: string;
}) {
  const nomor = o.nomor;
  // Dua salinan per lembar: skala lebih kecil agar tiap salinan tetap muat setengah halaman.
  const L = new Lembar(`Kwitansi ${nomor}`, `Kwitansi ${nomor}`, 1.08);
  const tinggiSalinan = (H - 16) / 2;

  const salinan = async (atas: number, untuk: string) => {
    L.kop(atas, true);
    const d0 = L.doc;
    L.font("bold", 16);
    d0.text("KWITANSI", ML, L.y);
    L.font("normal", 9);
    d0.setTextColor(110);
    d0.text(bersihkan(untuk), W - MR, L.y - 4, { align: "right" });
    d0.setTextColor(0);
    L.font("bold", 10);
    d0.text(bersihkan(`No. ${nomor}`), W - MR, L.y, { align: "right" });
    L.y += 7;

    L.labelNilai(o.baris, 38, 10.5, 5.4);
    L.y += 3;

    // Nominal + tanda tangan
    const yBox = L.y;
    d0.setDrawColor(...HIJAU);
    d0.setLineWidth(0.7);
    d0.roundedRect(ML, yBox, 70, 14, 2, 2);
    d0.setDrawColor(0);
    L.font("bold", 16);
    d0.text(bersihkan(formatRp(o.jumlah)), ML + 35, yBox + 9.3, { align: "center" });
    L.font("normal", 8.5);
    d0.text(bersihkan(`Tanggal bayar: ${tgl(o.tanggal)}`), ML, yBox + 19);
    d0.text(bersihkan(`Dicatat oleh: ${o.dicatatOleh}`), ML, yBox + 23);

    const kx = ML + CW - 35;
    L.font("normal", 10);
    d0.text(bersihkan(`${IDENTITAS_RW.tempat}, ${tgl(o.tanggal)}`), kx, yBox + 2, { align: "center" });
    d0.text("Penerima / Bendahara RW 03,", kx, yBox + 7, { align: "center" });
    L.font("bold", 10);
    d0.text("(..............................)", kx, yBox + 28, { align: "center" });

    if (o.nomorCek) {
      const urlCek = `${situs()}/rw3biz/status?nomor=${encodeURIComponent(o.nomorCek)}`;
      try {
        const gambar = await QRCode.toDataURL(urlCek, { margin: 0, width: 200 });
        d0.addImage(gambar, "PNG", ML + 78, yBox, 18, 18);
      } catch {
        /* QR opsional */
      }
      L.font("italic", 7.5);
      d0.text("Cek riwayat bayar", ML + 87, yBox + 21.5, { align: "center" });
    }
    L.y = yBox + 32;
    L.font("italic", 8);
    d0.setTextColor(110);
    d0.text(bersihkan(o.catatanKaki), ML, L.y, { maxWidth: CW });
    d0.setTextColor(0);
  };

  await salinan(8, "Lembar untuk pembayar");
  const yPotong = 8 + tinggiSalinan;
  L.doc.setLineDashPattern([2, 1.5], 0);
  L.doc.setDrawColor(150);
  L.doc.line(6, yPotong, W - 6, yPotong);
  L.doc.setLineDashPattern([], 0);
  L.doc.setDrawColor(0);
  L.font("italic", 7.5);
  L.doc.setTextColor(150);
  L.doc.text("gunting di sini", W / 2, yPotong - 1.2, { align: "center" });
  L.doc.setTextColor(0);
  await salinan(yPotong + 6, "Lembar arsip Kas RW");

  return { buffer: L.buffer(), nama: `Kwitansi-${nomor.replace(/\//g, "-")}.pdf` };
}
