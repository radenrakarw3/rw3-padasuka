import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, Printer } from "lucide-react";
import { F4 } from "@shared/kertas";
import { IDENTITAS_RW } from "@shared/surat-sakti/identitas";
import logoBlack from "@assets/RW03-Cimahi-Logo-Black.svg";

/**
 * Gaya cetak F4 bersama. Hanya isi `.area-cetak` yang tercetak; sisanya (sidebar, tombol) disembunyikan.
 * Di layar, lembar diperkecil supaya terlihat utuh sebagai pratinjau.
 */
export function GayaCetakF4({ margin = F4.margin }: { margin?: number } = {}) {
  const isiW = F4.w - 2 * margin;
  const isiH = F4.h - 2 * margin;
  return (
    <style>{`
      @page { size: ${F4.w}mm ${F4.h}mm; margin: ${margin}mm; }
      .lembar-f4 { width: ${isiW}mm; height: ${isiH}mm; box-sizing: border-box; overflow: hidden; background: #fff; color: #000; position: relative; break-after: page; page-break-after: always; display: flex; flex-direction: column; }
      .alir-f4 { width: ${isiW}mm; box-sizing: border-box; background: #fff; color: #000; break-after: page; page-break-after: always; }
      .lembar-f4:last-child, .alir-f4:last-child { break-after: auto; page-break-after: auto; }
      .area-cetak { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 10pt; line-height: 1.35; }
      .area-cetak svg { display: block; }
      .area-cetak .qr svg { width: 100%; height: 100%; }
      .jaga { break-inside: avoid; page-break-inside: avoid; }
      @media screen {
        .area-cetak { overflow-x: auto; padding-bottom: 8px; }
        .lembar-f4, .alir-f4 { zoom: 0.42; margin: 0 auto 12px; box-sizing: content-box; padding: ${margin}mm; box-shadow: 0 0 0 1px #d6d3d1, 0 4px 14px rgba(0,0,0,.08); }
        .alir-f4 { min-height: ${isiH}mm; }
        @media (min-width: 1024px) { .lembar-f4, .alir-f4 { zoom: 0.6; } }
      }
      @media print {
        html, body { background: #fff !important; }
        body * { visibility: hidden; }
        .area-cetak, .area-cetak * { visibility: visible; }
        .area-cetak { position: absolute; left: 0; top: 0; width: ${F4.w}mm; margin: 0 !important; padding: 0 !important; }
        .area-cetak * { box-shadow: none !important; print-color-adjust: economy; -webkit-print-color-adjust: economy; }
      }
    `}</style>
  );
}

/** Bidang cetak F4 setelah margin printer. */
export const ISI_W = F4.w - 2 * F4.margin;
export const ISI_H = F4.h - 2 * F4.margin;

/** Satu halaman F4 tetap (isi dipotong bila melebihi). */
export function LembarF4({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={`lembar-f4 ${className}`} style={style}>{children}</section>;
}

/** Dokumen F4 yang boleh bersambung ke halaman berikutnya (formulir panjang, rekap). */
export function AlirF4({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`alir-f4 ${className}`}>{children}</section>;
}

export function AreaCetak({ children }: { children: ReactNode }) {
  return <div className="area-cetak mt-4">{children}</div>;
}

/** Kop surat hitam-putih (hemat tinta). */
export function KopHemat({ kecil = false }: { kecil?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-black pb-1.5">
      <img src={logoBlack} alt="" style={{ width: kecil ? "11mm" : "16mm", height: kecil ? "11mm" : "16mm" }} />
      <div className="flex-1 text-center leading-tight">
        <p style={{ fontSize: kecil ? "10pt" : "13pt" }} className="font-bold tracking-wide">RUKUN WARGA 03</p>
        <p style={{ fontSize: kecil ? "7.5pt" : "9pt" }}>KELURAHAN PADASUKA · KECAMATAN CIMAHI TENGAH · KOTA CIMAHI</p>
        {!kecil && <p style={{ fontSize: "7.5pt" }}>{IDENTITAS_RW.alamat} · {IDENTITAS_RW.situs}</p>}
      </div>
      <div style={{ width: kecil ? "11mm" : "16mm" }} />
    </div>
  );
}

export function KotakCentang({ teks, tercentang = false }: { teks: string; tercentang?: boolean }) {
  return (
    <span className="mr-3 inline-flex items-center gap-1 whitespace-nowrap">
      <span className="inline-flex items-center justify-center border border-black" style={{ width: "3.6mm", height: "3.6mm", fontSize: "8pt", lineHeight: 1 }}>{tercentang ? "✓" : ""}</span>
      {teks}
    </span>
  );
}

/** Garis isian kosong. */
export function Isian({ lebar = "100%", label }: { lebar?: string; label?: string }) {
  return (
    <span className="inline-flex items-end gap-1" style={{ width: lebar }}>
      {label && <span className="whitespace-nowrap">{label}</span>}
      <span className="flex-1 border-b border-dotted border-black" style={{ minHeight: "5mm" }} />
    </span>
  );
}

/** Kotak per huruf/angka (mis. NIK 16 digit). */
export function KotakDigit({ jumlah }: { jumlah: number }) {
  return (
    <span className="inline-flex">
      {Array.from({ length: jumlah }).map((_, i) => (
        <span key={i} className="inline-block border border-black" style={{ width: "4.4mm", height: "5.4mm", marginLeft: i ? "-1px" : 0 }} />
      ))}
    </span>
  );
}

/** Panduan pengaturan printer Epson L3210 + kertas F4. */
export function PanduanPrinter({ bolakBalik = false, buka: bukaAwal = false }: { bolakBalik?: boolean; buka?: boolean }) {
  const [buka, setBuka] = useState(bukaAwal);
  return (
    <div className="print:hidden rounded-2xl border border-amber-200 bg-amber-50/70 text-sm text-amber-950">
      <button type="button" onClick={() => setBuka(!buka)} className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold">
        <Printer className="h-4 w-4 shrink-0" />
        <span className="flex-1">Pengaturan cetak: Epson L3210 · kertas F4 (215 × 330 mm)</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${buka ? "rotate-180" : ""}`} />
      </button>
      {buka && (
        <div className="space-y-2 border-t border-amber-200 px-4 pb-4 pt-3">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Masukkan kertas F4 ke baki belakang, geser pemandu kertas sampai pas.</li>
            <li>Tekan <b>Cetak</b>, lalu pilih printer <b>EPSON L3210</b>.</li>
            <li>
              Ukuran kertas: <b>F4 215 × 330</b>. Jika belum ada di daftar, buat sekali di Windows: <i>Pengaturan › Bluetooth &amp; perangkat › Printer &amp; pemindai › Properti server cetak › tab Formulir</i>,
              centang <b>Buat formulir baru</b>, nama "F4", lebar 21,5 cm, tinggi 33 cm, <b>Simpan formulir</b>, lalu tutup dan buka lagi browser.
              Sementara belum dibuat, pilih <b>Indian Legal 215 × 345</b>: isi tetap tercetak benar, hanya sisa 1,5 cm di bawah yang tidak terpakai.
            </li>
            <li>Skala <b>100% / Ukuran sebenarnya</b> (jangan "Sesuaikan dengan halaman"). Margin: <b>Default</b> (sudah diatur dari halaman ini).</li>
            <li>Matikan <b>Header dan footer</b> browser. Grafik latar boleh dimatikan (hemat tinta).</li>
            <li>Kualitas: <b>Standar</b> untuk surat, <b>Draf/Cepat</b> untuk formulir dan rekap. Warna: <b>Skala abu-abu / Hitam</b>.</li>
            {bolakBalik && <li><b>Bolak-balik manual</b> (L3210 tidak bisa otomatis): cetak <b>Halaman ganjil</b> dulu, balik tumpukan kertas (sisi tercetak menghadap ke depan, bagian atas tetap di atas), masukkan lagi, lalu cetak <b>Halaman genap</b>. Coba 1 lembar dulu.</li>}
          </ol>
          <p className="text-xs text-amber-800">Kertas 80 gsm: isi baki maksimal ±50 lembar agar tidak macet.</p>
        </div>
      )}
    </div>
  );
}
