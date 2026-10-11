/**
 * Surat Izin Tinggal Sementara Visit RW3 — terbit setiap pengajuan (baru/perpanjang) disetujui.
 * Perpanjang selalu memberi nomor VRW3 baru, sehingga setiap persetujuan = surat baru.
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "./db";
import { visitrw3Pengajuan, visitrw3Penghuni, wargaSinggah, type Visitrw3Pengajuan } from "@shared/schema";
import { IDENTITAS_RW } from "@shared/surat-sakti/identitas";
import { F4 } from "@shared/kertas";
import { maskNik } from "@shared/kontak";
import { labelJenisWarga } from "@shared/visitrw3-jenis-warga";
import { formatKendaraanBaris, parseKendaraan } from "@shared/visitrw3-kendaraan";
import { barisKeperluan, parseDetailKeperluan } from "@shared/visitrw3-keperluan";
import { bersihkan, muatLogo } from "./surat-sakti/pdf";

/** Batas pengajuan perpanjang: H-7 sebelum masa berlaku habis (selaras pengingat WA H-7). */
export const HARI_BATAS_PERPANJANG = 7;

export type PemegangIzin = {
  nama: string;
  nik: string | null;
  anak: boolean;
  tanggalLahir: string | null;
  jenisKelamin: string | null;
  keterangan: string | null;
  /** Baris label–nilai keperluan tinggal (sama dengan ringkasan form online). */
  keperluan: [string, string][];
  /** null = data lama tanpa jawaban kendaraan. */
  kendaraan: string[] | null;
};

export type DataSuratVisitrw3 = {
  pengajuan: Visitrw3Pengajuan;
  pemegang: PemegangIzin[];
  tanggalTerbit: string;
  berlakuMulai: string;
  berlakuSampai: string;
  perpanjangPalingLambat: string;
  sisaHari: number;
  kedaluwarsa: boolean;
  nomorSebelumnya: string | null;
  digantiOleh: string | null;
};

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

export function formatTanggalSurat(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

async function pemegangDariPengajuan(pengajuanId: number): Promise<PemegangIzin[]> {
  const rows = await db
    .select()
    .from(visitrw3Penghuni)
    .where(eq(visitrw3Penghuni.pengajuanId, pengajuanId))
    .orderBy(visitrw3Penghuni.urutan);
  return rows.map((p) => ({
    nama: p.namaLengkap,
    nik: p.isAnak ? null : p.nik,
    anak: p.isAnak,
    tanggalLahir: p.tanggalLahir,
    jenisKelamin: p.jenisKelamin,
    keterangan: p.isAnak ? (p.namaSekolah ? `Anak (${p.namaSekolah})` : "Anak") : p.pekerjaan,
    keperluan: p.isAnak ? [] : barisKeperluan(p.keperluanTinggal, p.namaTempatKerja, parseDetailKeperluan(p.detailKeperluan)),
    kendaraan: p.isAnak ? [] : parseKendaraan(p.jenisKendaraan, p.platNomor).map(formatKendaraanBaris),
  }));
}

/** Data surat untuk nomor VRW3 yang sudah disetujui; null bila belum/tidak disetujui. */
export async function getDataSuratVisitrw3(nomorRaw: string): Promise<DataSuratVisitrw3 | null> {
  const nomor = nomorRaw.trim().toUpperCase();
  const [p] = await db
    .select()
    .from(visitrw3Pengajuan)
    .where(eq(visitrw3Pengajuan.nomorVisitrw3, nomor))
    .orderBy(desc(visitrw3Pengajuan.createdAt))
    .limit(1);
  if (!p || p.status !== "disetujui") return null;

  let pemegang = await pemegangDariPengajuan(p.id);
  if (!pemegang.length && p.wargaSinggahId) {
    // Pengajuan perpanjang tidak menyimpan penghuni — ambil dari pengajuan asal warga singgah.
    const [ws] = await db.select().from(wargaSinggah).where(eq(wargaSinggah.id, p.wargaSinggahId)).limit(1);
    if (ws?.pengajuanId) pemegang = await pemegangDariPengajuan(ws.pengajuanId);
    if (!pemegang.length && ws) {
      pemegang = [
        {
          nama: ws.namaLengkap,
          nik: ws.nik,
          anak: false,
          tanggalLahir: null,
          jenisKelamin: null,
          keterangan: ws.pekerjaan,
          keperluan: ws.keperluanTinggal ? [["Keperluan", ws.keperluanTinggal]] : [],
          kendaraan: null,
        },
      ];
    }
  }

  let nomorSebelumnya: string | null = null;
  let digantiOleh: string | null = null;
  if (p.wargaSinggahId) {
    const sama = and(eq(visitrw3Pengajuan.wargaSinggahId, p.wargaSinggahId), eq(visitrw3Pengajuan.status, "disetujui"));
    if (p.tipe === "perpanjang") {
      const [lama] = await db
        .select({ nomor: visitrw3Pengajuan.nomorVisitrw3 })
        .from(visitrw3Pengajuan)
        .where(and(sama, lt(visitrw3Pengajuan.id, p.id)))
        .orderBy(desc(visitrw3Pengajuan.id))
        .limit(1);
      nomorSebelumnya = lama?.nomor ?? null;
    }
    const [baru] = await db
      .select({ nomor: visitrw3Pengajuan.nomorVisitrw3 })
      .from(visitrw3Pengajuan)
      .where(and(sama, gt(visitrw3Pengajuan.id, p.id)))
      .orderBy(desc(visitrw3Pengajuan.id))
      .limit(1);
    digantiOleh = baru?.nomor ?? null;
  }

  const hariIni = tanggalWib(new Date());
  const sisaHari = keHari(p.tanggalBerlakuSampai) - keHari(hariIni);
  return {
    pengajuan: p,
    pemegang,
    tanggalTerbit: p.reviewedAt ? tanggalWib(new Date(p.reviewedAt)) : hariIni,
    berlakuMulai: p.tanggalBayar,
    berlakuSampai: p.tanggalBerlakuSampai,
    perpanjangPalingLambat: tambahHari(p.tanggalBerlakuSampai, -HARI_BATAS_PERPANJANG),
    sisaHari,
    kedaluwarsa: sisaHari < 0,
    nomorSebelumnya,
    digantiOleh,
  };
}

/** Ringkasan aman untuk halaman publik (NIK disamarkan). */
export function ringkasSuratPublik(d: DataSuratVisitrw3) {
  return {
    nomor: d.pengajuan.nomorVisitrw3,
    tanggalTerbit: d.tanggalTerbit,
    berlakuMulai: d.berlakuMulai,
    berlakuSampai: d.berlakuSampai,
    perpanjangPalingLambat: d.perpanjangPalingLambat,
    sisaHari: d.sisaHari,
    kedaluwarsa: d.kedaluwarsa,
    nomorSebelumnya: d.nomorSebelumnya,
    digantiOleh: d.digantiOleh,
    pemegang: d.pemegang.map((x) => ({ nama: x.nama, nikSamar: x.nik ? maskNik(x.nik) : null, anak: x.anak })),
  };
}

const W = F4.w;
const H = F4.h;
const ML = 22;
const MR = 18;
const CW = W - ML - MR;
const HIJAU: [number, number, number] = [25, 87, 72];
const EMAS: [number, number, number] = [196, 160, 92];

export async function buatPdfSuratVisitrw3(
  d: DataSuratVisitrw3,
  opsi: { nikLengkap: boolean },
): Promise<{ buffer: Buffer; nama: string }> {
  const p = d.pengajuan;
  const doc = new jsPDF({ unit: "mm", format: [W, H], compress: true });
  doc.setProperties({ title: `Surat Izin Tinggal ${p.nomorVisitrw3}`, creator: IDENTITAS_RW.penerbit });
  const font = (gaya: "normal" | "bold" | "italic" = "normal", size = 11) => {
    doc.setFont("times", gaya);
    doc.setFontSize(size);
  };
  const pecah = (t: string, w: number) => doc.splitTextToSize(bersihkan(t), w) as string[];
  let y = 48;
  const ruang = (h: number) => {
    if (y + h <= H - 18) return;
    const { fontStyle } = doc.getFont();
    const ukuran = doc.getFontSize();
    doc.addPage([W, H]);
    font("italic", 9);
    doc.setTextColor(110);
    doc.text(bersihkan(`Lanjutan Surat Izin Tinggal Sementara No. ${p.nomorVisitrw3}`), ML, 14);
    doc.setTextColor(0);
    font(fontStyle as "normal" | "bold" | "italic", ukuran);
    y = 22;
  };

  // Kop
  const logo = muatLogo();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", ML - 2, 9, 17, 24.6);
    } catch {
      /* logo opsional */
    }
  }
  const cx = W / 2 + 8;
  font("bold", 14);
  doc.text(IDENTITAS_RW.baris1, cx, 16, { align: "center" });
  font("bold", 13);
  doc.text(IDENTITAS_RW.baris2, cx, 22, { align: "center" });
  font("normal", 11);
  doc.text(IDENTITAS_RW.baris3, cx, 27.5, { align: "center" });
  font("normal", 8.5);
  doc.text(bersihkan(IDENTITAS_RW.alamat), cx, 32, { align: "center", maxWidth: 150 });
  doc.setLineWidth(0.8);
  doc.line(ML - 4, 37, W - MR + 3, 37);
  doc.setLineWidth(0.25);
  doc.line(ML - 4, 38.2, W - MR + 3, 38.2);

  // Judul
  font("bold", 14);
  const judul = "SURAT IZIN TINGGAL SEMENTARA";
  doc.text(judul, W / 2, y, { align: "center" });
  const wj = doc.getTextWidth(judul);
  doc.setLineWidth(0.35);
  doc.line(W / 2 - wj / 2, y + 1.2, W / 2 + wj / 2, y + 1.2);
  y += 6;
  font("bold", 10.5);
  doc.setTextColor(...HIJAU);
  doc.text("VISIT RW3 - WARGA SINGGAH RW 03 PADASUKA", W / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 5.5;
  font("normal", 11);
  doc.text(`Nomor: ${p.nomorVisitrw3}`, W / 2, y, { align: "center" });
  y += 9;

  font("normal", 11);
  const jenis = labelJenisWarga(p.jenisWarga);
  const pembuka =
    `Ketua Rukun Warga 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi menerangkan bahwa ` +
    `orang yang namanya tercantum di bawah ini telah didata dan diizinkan tinggal sementara ` +
    `(${jenis.toLowerCase()}) di wilayah RW 03 dengan keterangan sebagai berikut:`;
  for (const l of pecah(pembuka, CW)) {
    doc.text(l, ML, y);
    y += 5.2;
  }
  y += 2;

  const label: [string, string][] = [
    ["Jenis tinggal", jenis],
    ["Alamat", p.alamat?.trim() || "-"],
    ["RT / RW", `${String(p.rt).padStart(2, "0")} / 03, Kel. Padasuka`],
  ];
  if (p.nomorUnit?.trim()) label.push(["Nomor kamar / unit", p.nomorUnit.trim()]);
  label.push(["Jumlah penghuni", `${d.pemegang.length || p.jumlahPenghuni} orang`]);
  label.push([
    "Jenis surat",
    p.tipe === "perpanjang"
      ? `Perpanjangan${d.nomorSebelumnya ? ` (menggantikan No. ${d.nomorSebelumnya})` : ""}`
      : "Terbitan pertama",
  ]);
  const lw = 40;
  for (const [a, v] of label) {
    const kanan = pecah(v, CW - lw - 4);
    doc.text(a, ML, y);
    doc.text(":", ML + lw, y);
    kanan.forEach((l, i) => doc.text(l, ML + lw + 3, y + i * 5.2));
    y += 5.2 * Math.max(1, kanan.length);
  }
  y += 3;

  // Tabel pemegang izin
  const kolom = ["No", "Nama lengkap", "NIK", "L/P", "Tgl. lahir", "Keterangan"];
  const lebar = [9, 50, 38, 10, 25, CW - 132];
  const xs = lebar.reduce<number[]>((acc, w, i) => [...acc, i === 0 ? ML : acc[i - 1] + lebar[i - 1]], []);
  const barisTabel = (sel: string[], tebal: boolean, isi?: boolean) => {
    font(tebal ? "bold" : "normal", 9.5);
    const pecahan = sel.map((s, i) => pecah(s, lebar[i] - 2.4));
    const h = Math.max(...pecahan.map((x) => x.length)) * 4.2 + 2.6;
    ruang(h);
    font(tebal ? "bold" : "normal", 9.5);
    if (isi) {
      doc.setFillColor(235, 243, 240);
      doc.rect(ML, y, CW, h, "F");
    }
    doc.setLineWidth(0.2);
    pecahan.forEach((ls, i) => {
      doc.rect(xs[i], y, lebar[i], h);
      ls.forEach((l, j) => doc.text(l, xs[i] + 1.2, y + 4 + j * 4.2));
    });
    y += h;
  };
  barisTabel(kolom, true, true);
  d.pemegang.forEach((x, i) => {
    const nik = x.anak ? "-" : x.nik ? (opsi.nikLengkap ? x.nik : maskNik(x.nik)) : "-";
    const lp = x.jenisKelamin?.startsWith("L") ? "L" : x.jenisKelamin?.startsWith("P") ? "P" : "-";
    const tgl = x.tanggalLahir
      ? new Date(`${x.tanggalLahir}T12:00:00Z`).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
      : "-";
    barisTabel([String(i + 1), x.nama, nik, lp, tgl, x.keterangan || (x.anak ? "Anak" : "-")], false);
  });
  y += 7;

  // Rincian keperluan & kendaraan — urutan sama dengan ringkasan form online
  const dewasa = d.pemegang.map((x, i) => ({ x, no: i + 1 })).filter(({ x }) => !x.anak);
  if (dewasa.length) {
    ruang(14);
    font("bold", 11);
    doc.text("Rincian keperluan tinggal dan kendaraan:", ML, y);
    y += 5.6;
    const ind = ML + 6;
    font("normal", 9.5);
    const lwR = Math.min(
      62,
      Math.max(30, ...dewasa.flatMap(({ x }) => [...x.keperluan.map(([a]) => a), "Kendaraan 10"]).map((a) => doc.getTextWidth(bersihkan(a)))) + 2,
    );
    const tulisBaris = (a: string, v: string) => {
      font("normal", 9.5);
      const kanan = pecah(v, CW - (ind - ML) - lwR - 4);
      ruang(4.6 * kanan.length);
      doc.text(bersihkan(a), ind, y);
      doc.text(":", ind + lwR, y);
      kanan.forEach((l, j) => doc.text(l, ind + lwR + 3, y + j * 4.6));
      y += 4.6 * Math.max(1, kanan.length);
    };
    for (const { x, no } of dewasa) {
      ruang(14);
      font("bold", 10);
      doc.text(bersihkan(`${no}. ${x.nama}`), ML + 1, y);
      y += 5;
      if (x.keperluan.length) x.keperluan.forEach(([a, v]) => tulisBaris(a, v));
      else tulisBaris("Keperluan", "-");
      if (x.kendaraan === null) tulisBaris("Kendaraan", "Belum didata");
      else if (!x.kendaraan.length) tulisBaris("Kendaraan", "Tidak punya kendaraan");
      else x.kendaraan.forEach((k, j) => tulisBaris(x.kendaraan!.length > 1 ? `Kendaraan ${j + 1}` : "Kendaraan", k));
      y += 2;
    }
    y += 4;
  }

  // Kotak masa berlaku (gaya visa)
  const kotakH = 34;
  ruang(kotakH + 4);
  doc.setDrawColor(...HIJAU);
  doc.setLineWidth(0.9);
  doc.roundedRect(ML, y, CW, kotakH, 2.5, 2.5);
  doc.setDrawColor(...EMAS);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML + 1.6, y + 1.6, CW - 3.2, kotakH - 3.2, 1.8, 1.8);
  doc.setDrawColor(0);
  const kol = CW / 3;
  const sel: [string, string, boolean][] = [
    ["TANGGAL TERBIT", formatTanggalSurat(d.tanggalTerbit), false],
    ["BERLAKU MULAI", formatTanggalSurat(d.berlakuMulai), false],
    ["BERLAKU SAMPAI", formatTanggalSurat(d.berlakuSampai), true],
  ];
  sel.forEach(([k, v, utama], i) => {
    const tx = ML + kol * i + kol / 2;
    font("bold", 8);
    doc.setTextColor(...HIJAU);
    doc.text(k, tx, y + 8, { align: "center" });
    doc.setTextColor(0);
    font("bold", utama ? 14 : 11.5);
    doc.text(bersihkan(v), tx, y + 15.5, { align: "center" });
  });
  doc.setLineWidth(0.2);
  doc.line(ML + 6, y + 20, ML + CW - 6, y + 20);
  font("bold", 10.5);
  doc.setTextColor(170, 30, 30);
  doc.text(
    bersihkan(`WAJIB PERPANJANG paling lambat ${formatTanggalSurat(d.perpanjangPalingLambat)}`),
    W / 2,
    y + 26,
    { align: "center" },
  );
  doc.setTextColor(0);
  font("normal", 8.5);
  doc.text(
    bersihkan(`Ajukan di ${situs().replace(/^https?:\/\//, "")}/visitrw3/perpanjang dengan nomor ${p.nomorVisitrw3}`),
    W / 2,
    y + 30.5,
    { align: "center" },
  );
  y += kotakH + 7;

  // Ketentuan
  ruang(20);
  font("bold", 11);
  doc.text("Ketentuan:", ML, y);
  y += 5.2;
  font("normal", 10);
  const ketentuan = [
    "Surat ini hanya berlaku untuk orang dan alamat yang tercantum di atas, sampai tanggal BERLAKU SAMPAI.",
    `Perpanjangan diajukan paling lambat ${formatTanggalSurat(d.perpanjangPalingLambat)} (${HARI_BATAS_PERPANJANG} hari sebelum masa berlaku habis). Setelah disetujui, pemegang menerima nomor dan surat baru, dan surat ini tidak berlaku lagi.`,
    "Pindah alamat, berhenti tinggal, atau penambahan penghuni wajib dilaporkan kepada pengurus RT/RW.",
    "Pemegang wajib mematuhi tata tertib lingkungan dan menjaga ketertiban di wilayah RW 03.",
    "Simpan surat ini dan tunjukkan bila diminta oleh pengurus RT/RW atau petugas.",
  ];
  ketentuan.forEach((k, i) => {
    const ls = pecah(k, CW - 7);
    ruang(4.8 * ls.length);
    ls.forEach((l, j) => {
      if (j === 0) doc.text(`${i + 1}.`, ML + 1, y);
      doc.text(l, ML + 7, y);
      y += 4.8;
    });
  });
  y += 6;

  // Tanda tangan basah + QR tetap satu halaman
  ruang(70);
  font("normal", 11);
  const utama = d.pemegang.find((x) => !x.anak) ?? d.pemegang[0];
  const kiriX = ML + CW / 4;
  const kananX = ML + (CW * 3) / 4;
  doc.text(bersihkan(`${IDENTITAS_RW.tempat}, ${formatTanggalSurat(d.tanggalTerbit)}`), kananX, y, { align: "center" });
  y += 5.5;
  doc.text("Pemegang izin,", kiriX, y, { align: "center" });
  doc.text(bersihkan(IDENTITAS_RW.ketua.jabatan) + ",", kananX, y, { align: "center" });
  y += 24;
  font("bold", 11);
  const ttdNama = (nama: string, x: number) => {
    const n = pecah(nama, CW / 2 - 8)[0] ?? "";
    doc.text(n, x, y, { align: "center" });
    const w = doc.getTextWidth(n);
    doc.setLineWidth(0.2);
    doc.line(x - w / 2, y + 0.8, x + w / 2, y + 0.8);
  };
  ttdNama(utama?.nama ?? "(...........................)", kiriX);
  ttdNama(IDENTITAS_RW.ketua.nama, kananX);
  y += 10;

  // QR verifikasi
  const urlCek = `${situs()}/visitrw3/status?nomor=${encodeURIComponent(p.nomorVisitrw3)}`;
  const ukuranQr = 22;
  const yQr = Math.min(y, H - 20 - ukuranQr);
  try {
    const qr = await QRCode.toDataURL(urlCek, { margin: 0, width: 240 });
    doc.addImage(qr, "PNG", ML, yQr, ukuranQr, ukuranQr);
  } catch {
    /* QR opsional */
  }
  font("italic", 8.5);
  [
    "Pindai untuk memeriksa keaslian, masa berlaku, dan status surat ini.",
    bersihkan(urlCek.replace(/^https?:\/\//, "")),
    "Kode QR bukan tanda tangan elektronik. Surat sah bila ditandatangani basah.",
  ].forEach((t, i) => doc.text(t, ML + ukuranQr + 3, yQr + 5 + i * 4.2));

  const tidakBerlaku = d.digantiOleh
    ? `DIGANTI ${d.digantiOleh}`
    : d.kedaluwarsa
      ? "MASA BERLAKU HABIS"
      : null;
  const jumlahHal = doc.getNumberOfPages();
  for (let hal = 1; hal <= jumlahHal; hal++) {
    doc.setPage(hal);
    if (tidakBerlaku) {
      doc.setTextColor(170, 30, 30);
      font("bold", 40);
      try {
        const GState = (doc as any).GState;
        if (GState) doc.setGState(new GState({ opacity: 0.16 }));
      } catch {
        /* tanpa transparansi */
      }
      doc.text("TIDAK BERLAKU", W / 2, H / 2, { align: "center", angle: 35 });
      font("bold", 18);
      doc.text(bersihkan(tidakBerlaku), W / 2 + 8, H / 2 + 14, { align: "center", angle: 35 });
      try {
        const GState = (doc as any).GState;
        if (GState) doc.setGState(new GState({ opacity: 1 }));
      } catch {
        /* abaikan */
      }
    }
    doc.setTextColor(110);
    font("normal", 8);
    doc.text(bersihkan(`No. ${p.nomorVisitrw3}${jumlahHal > 1 ? ` - hal. ${hal}/${jumlahHal}` : ""}`), ML, H - 10);
    doc.text(bersihkan(`Dicetak ${formatTanggalSurat(tanggalWib(new Date()))}`), W - MR, H - 10, { align: "right" });
    doc.setTextColor(0);
  }

  return {
    buffer: Buffer.from(doc.output("arraybuffer")),
    nama: `Surat-Izin-Tinggal-${p.nomorVisitrw3}.pdf`,
  };
}
