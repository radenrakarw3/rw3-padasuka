/**
 * PDF Surat Sakti (server). Dibentuk dari blok terstruktur yang tersimpan — bukan dari teks bebas.
 * Tanda tangan: ruang kosong untuk tanda tangan basah. Tidak ada gambar tanda tangan.
 */
import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { IDENTITAS_RW } from "@shared/surat-sakti/identitas";
import { F4 } from "@shared/kertas";
import type { Blok } from "@shared/surat-sakti/tipe";

const W = F4.w;
const H = F4.h;
const ML = 25;
const MR = 20;
const MB = 20;
const CW = W - ML - MR;
const LH = 5.4;
const ATAS_LANJUTAN = 20;

let logo: string | null | undefined;
function muatLogo(): string | null {
  if (logo !== undefined) return logo;
  try {
    // Versi kecil (280 px) dari logo resmi; PNG 16x terlalu berat didekode jsPDF per dokumen.
    const p = path.join(process.cwd(), "server", "assets", "logo-kop-rw03.png");
    logo = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
  } catch {
    logo = null;
  }
  return logo;
}

/** Font standar PDF memakai WinAnsi; samakan karakter yang sering muncul dari ketikan HP. */
export function bersihkan(s: string): string {
  return s
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201F]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2022\u25CF]/g, "-")
    .replace(/\r/g, "")
    .replace(/[^\x09\x0A\x20-\x7E\u00A0-\u00FF]/g, "");
}

export interface OpsiPdf {
  bloks: Blok[];
  nomor: string | null;
  draft: boolean;
  verifikasiUrl?: string | null;
  judul?: string;
}

class Penulis {
  doc = new jsPDF({ unit: "mm", format: [F4.w, F4.h], compress: true });
  y = 0;
  constructor(private nomor: string | null) {}

  get bawah() {
    return H - MB;
  }

  halamanBaru() {
    this.doc.addPage();
    this.y = ATAS_LANJUTAN;
  }

  pastikan(h: number) {
    if (this.y + h > this.bawah) this.halamanBaru();
  }

  font(gaya: "normal" | "bold" | "italic" = "normal", size = 11.5) {
    this.doc.setFont("times", gaya);
    this.doc.setFontSize(size);
  }

  pecah(teks: string, lebar: number): string[] {
    return this.doc.splitTextToSize(bersihkan(teks), lebar) as string[];
  }

  baris(teks: string, x: number, opsi?: { align?: "left" | "center" | "right" }) {
    this.pastikan(LH);
    this.doc.text(bersihkan(teks), x, this.y, opsi);
    this.y += LH;
  }

  kop() {
    const l = muatLogo();
    if (l) {
      try {
        this.doc.addImage(l, "PNG", ML - 2, 9, 17, 24.6);
      } catch {
        /* logo opsional */
      }
    }
    const cx = W / 2 + 8;
    this.doc.setTextColor(0);
    this.font("bold", 14);
    this.doc.text(IDENTITAS_RW.baris1, cx, 16, { align: "center" });
    this.font("bold", 13);
    this.doc.text(IDENTITAS_RW.baris2, cx, 22, { align: "center" });
    this.font("normal", 11);
    this.doc.text(IDENTITAS_RW.baris3, cx, 27.5, { align: "center" });
    this.font("normal", 8.5);
    this.doc.text(bersihkan(IDENTITAS_RW.alamat), cx, 32, { align: "center", maxWidth: 150 });
    this.doc.setLineWidth(0.8);
    this.doc.line(ML - 5, 37, W - MR + 3, 37);
    this.doc.setLineWidth(0.25);
    this.doc.line(ML - 5, 38.2, W - MR + 3, 38.2);
    this.y = 46;
  }

  paragraf(teks: string) {
    this.font();
    for (const p of bersihkan(teks).split("\n")) {
      for (const l of this.pecah(p, CW)) this.baris(l, ML);
    }
    this.y += 1.5;
  }

  judul(teks: string, sub: string[] = []) {
    this.pastikan(LH * (2 + sub.length));
    this.font("bold", 12.5);
    for (const l of this.pecah(teks, CW)) {
      this.doc.text(l, W / 2, this.y, { align: "center" });
      const w = this.doc.getTextWidth(l);
      this.doc.setLineWidth(0.3);
      this.doc.line(W / 2 - w / 2, this.y + 1, W / 2 + w / 2, this.y + 1);
      this.y += LH + 0.6;
    }
    this.font("normal", 11.5);
    for (const s of sub) for (const l of this.pecah(s, CW)) this.baris(l, W / 2, { align: "center" });
    this.y += 2;
  }

  label(baris: [string, string][], lebarLabel?: number) {
    this.font();
    const lw = lebarLabel ?? Math.min(55, Math.max(22, ...baris.map(([a]) => this.doc.getTextWidth(bersihkan(a)) + 3)));
    for (const [a, v] of baris) {
      const kiri = this.pecah(a, lw - 2);
      const kanan = this.pecah(v || "-", CW - lw - 4);
      const n = Math.max(kiri.length, kanan.length);
      for (let i = 0; i < n; i++) {
        this.pastikan(LH);
        if (kiri[i]) this.doc.text(kiri[i], ML, this.y);
        if (i === 0) this.doc.text(":", ML + lw, this.y);
        if (kanan[i]) this.doc.text(kanan[i], ML + lw + 3, this.y);
        this.y += LH;
      }
    }
    this.y += 1.5;
  }

  daftar(item: string[], bernomor = true) {
    this.font();
    item.forEach((it, i) => {
      const ls = this.pecah(it, CW - 9);
      ls.forEach((l, j) => {
        this.pastikan(LH);
        if (j === 0) this.doc.text(bernomor ? `${i + 1}.` : "-", ML + 2, this.y);
        this.doc.text(l, ML + 9, this.y);
        this.y += LH;
      });
    });
    this.y += 1.5;
  }

  tabel(kolom: string[], baris: string[][], lebar?: number[], total?: string[]) {
    const fs = 9.5;
    const lh = 4.3;
    const pad = 1.4;
    const bobot = lebar && lebar.length === kolom.length ? lebar : kolom.map(() => 1);
    const jml = bobot.reduce((a, b) => a + b, 0);
    const lw = bobot.map((b) => (b / jml) * CW);
    const xs = lw.reduce<number[]>((acc, w, i) => [...acc, i === 0 ? ML : acc[i - 1] + lw[i - 1]], []);
    this.doc.setLineWidth(0.2);

    const kepala = () => {
      this.font("bold", fs);
      const sel = kolom.map((k, i) => this.pecah(k, lw[i] - 2 * pad));
      const h = Math.max(...sel.map((s) => s.length)) * lh + 2 * pad;
      this.doc.rect(ML, this.y - 0.5, CW, h);
      sel.forEach((s, i) => {
        this.doc.rect(xs[i], this.y - 0.5, lw[i], h);
        s.forEach((l, j) => this.doc.text(l, xs[i] + pad, this.y - 0.5 + pad + lh * (j + 0.8)));
      });
      this.y += h;
    };
    const minimal = lh * 2 + 2 * pad;
    this.pastikan(minimal + 10);
    kepala();
    const semua = total ? [...baris, total] : baris;
    semua.forEach((r, ri) => {
      const tebal = !!total && ri === semua.length - 1;
      this.font(tebal ? "bold" : "normal", fs);
      let sisa = r.map((c, i) => this.pecah(c ?? "", lw[i] - 2 * pad));
      let tinggiMin = !tebal && r.slice(1).every((c) => !c) ? 8 : 0; // baris kosong daftar hadir
      while (sisa.some((s) => s.length) || tinggiMin) {
        const ruang = this.bawah - this.y;
        if (ruang < minimal) {
          this.halamanBaru();
          kepala();
          this.font(tebal ? "bold" : "normal", fs);
          continue;
        }
        const muat = Math.max(1, Math.floor((ruang - 2 * pad) / lh));
        const potong = sisa.map((s) => s.slice(0, muat));
        const h = Math.max(tinggiMin, Math.max(1, ...potong.map((s) => s.length)) * lh + 2 * pad);
        potong.forEach((s, i) => {
          this.doc.rect(xs[i], this.y - 0.5, lw[i], h);
          s.forEach((l, j) => this.doc.text(l, xs[i] + pad, this.y - 0.5 + pad + lh * (j + 0.8)));
        });
        this.y += h;
        sisa = sisa.map((s) => s.slice(muat));
        tinggiMin = 0;
      }
    });
    this.y += 3;
  }

  ttd(kolom: { atas: string; nama: string; jabatan?: string }[], tempatTanggal?: string) {
    this.font();
    const perBaris = kolom.length === 1 ? 1 : Math.min(3, kolom.length);
    const tinggi = LH * 4 + 20;
    for (let i = 0; i < kolom.length; i += perBaris) {
      const grup = kolom.slice(i, i + perBaris);
      this.pastikan(tinggi + (i === 0 && tempatTanggal ? LH : 0) + 4);
      const lebar = perBaris === 1 ? CW / 2 : CW / grup.length;
      const x0 = perBaris === 1 ? ML + CW / 2 : ML;
      if (i === 0 && tempatTanggal) {
        this.doc.text(bersihkan(tempatTanggal), perBaris === 1 ? x0 + lebar / 2 : ML + CW, this.y, { align: perBaris === 1 ? "center" : "right" });
        this.y += LH + 1;
      }
      const yAwal = this.y;
      grup.forEach((k, j) => {
        const cx = x0 + lebar * j + lebar / 2;
        let y = yAwal;
        this.font("normal", 11);
        for (const l of this.pecah(k.atas, lebar - 4)) {
          this.doc.text(l, cx, y, { align: "center" });
          y += LH;
        }
        y += 20;
        this.font("bold", 11);
        const nama = this.pecah(k.nama, lebar - 4)[0] ?? "";
        this.doc.text(nama, cx, y, { align: "center" });
        const w = this.doc.getTextWidth(nama);
        this.doc.setLineWidth(0.2);
        this.doc.line(cx - w / 2, y + 0.8, cx + w / 2, y + 0.8);
        this.font("normal", 10.5);
        if (k.jabatan) this.doc.text(this.pecah(k.jabatan, lebar - 4)[0] ?? "", cx, y + LH, { align: "center" });
      });
      this.y = yAwal + tinggi;
    }
    this.font();
  }

  async qr(url: string) {
    const ukuran = 22;
    this.pastikan(ukuran + 4);
    try {
      const data = await QRCode.toDataURL(url, { margin: 0, width: 240 });
      this.doc.addImage(data, "PNG", ML, this.y, ukuran, ukuran);
    } catch {
      /* QR opsional */
    }
    this.font("italic", 8.5);
    const ket = [
      "Pindai untuk memeriksa nomor, tanggal, penerbit, dan status dokumen.",
      "Kode QR ini bukan tanda tangan elektronik tersertifikasi.",
      "Dokumen sah bila ditandatangani basah oleh penandatangan.",
    ];
    ket.forEach((k, i) => this.doc.text(k, ML + ukuran + 3, this.y + 5 + i * 4.2));
    this.y += ukuran + 3;
    this.font();
  }

  akhiri(draft: boolean) {
    const n = this.doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      this.doc.setPage(i);
      if (draft) {
        this.doc.setTextColor(120);
        this.font("bold", 46);
        try {
          const GState = (this.doc as any).GState;
          if (GState) this.doc.setGState(new GState({ opacity: 0.14 }));
        } catch {
          /* tanpa transparansi */
        }
        this.doc.text("DRAF - BELUM BERLAKU", W / 2, H / 2 + 20, { align: "center", angle: 35 });
        try {
          const GState = (this.doc as any).GState;
          if (GState) this.doc.setGState(new GState({ opacity: 1 }));
        } catch {
          /* abaikan */
        }
      }
      this.doc.setTextColor(110);
      this.font("normal", 8);
      this.doc.text(bersihkan(this.nomor ? `No. ${this.nomor}` : "DRAF - belum bernomor"), ML, H - 10);
      this.doc.text(`Halaman ${i} dari ${n}`, W - MR, H - 10, { align: "right" });
      this.doc.setTextColor(0);
    }
    return n;
  }
}

export async function buatPdf(o: OpsiPdf): Promise<{ buffer: Buffer; halaman: number }> {
  const p = new Penulis(o.nomor);
  if (o.judul) p.doc.setProperties({ title: bersihkan(o.judul), creator: IDENTITAS_RW.penerbit });
  p.kop();
  for (let i = 0; i < o.bloks.length; i++) {
    const b = o.bloks[i];
    switch (b.t) {
      case "judul":
        p.judul(b.teks, b.sub);
        break;
      case "kepala":
        if (b.tempatTanggal) {
          p.font();
          p.doc.text(bersihkan(b.tempatTanggal), W - MR, p.y, { align: "right" });
          p.y += LH + 1;
        }
        p.label(b.baris, 24);
        break;
      case "alamat":
        p.font();
        for (const l of b.baris) for (const x of p.pecah(l, CW / 1.4)) p.baris(x, ML);
        p.y += 2;
        break;
      case "sub":
        p.pastikan(LH * 3);
        p.font("bold", 11.5);
        p.baris(b.teks, ML);
        p.font();
        break;
      case "paragraf":
        p.paragraf(b.teks);
        break;
      case "label":
        p.label(b.baris);
        break;
      case "daftar":
        p.daftar(b.item, b.bernomor !== false);
        break;
      case "tabel":
        p.tabel(b.kolom, b.baris, b.lebar, b.total);
        break;
      case "ttd":
        p.y += 2;
        p.ttd(b.kolom, b.tempatTanggal);
        break;
      case "tembusan":
        p.pastikan(LH * 2);
        p.font("bold", 10.5);
        p.baris("Tembusan:", ML);
        p.font("normal", 10.5);
        b.item.forEach((t, j) => {
          for (const [k, l] of p.pecah(`${j + 1}. ${t}`, CW).entries()) p.baris(k ? `   ${l}` : l, ML);
        });
        break;
      case "catatan":
        p.font("italic", 9.5);
        for (const l of p.pecah(b.teks, CW)) p.baris(l, ML);
        p.font();
        break;
    }
  }
  if (o.verifikasiUrl && !o.draft) {
    p.y += 4;
    await p.qr(o.verifikasiUrl);
  }
  const halaman = p.akhiri(o.draft);
  return { buffer: Buffer.from(p.doc.output("arraybuffer")), halaman };
}
