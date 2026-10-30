import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "wouter";
import QRCode from "qrcode";
import { Printer, Smartphone } from "lucide-react";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlirF4, AreaCetak, GayaCetakF4, KopHemat, LembarF4 } from "@/components/cetak/lembar-f4";
import { BlokTtdDuaKolom, kolomKetuaRw } from "@/components/cetak/ttd-ketua";
import { useProgramRw3 } from "@/components/rw3biz/kontribusi-form";
import { useTarifPublik } from "@/components/rw3biz/transparansi";
import {
  GARANSI_ANTI_OKNUM,
  JANGKAR_SUMBANGSIH_DETAIL,
  LABEL_REKENING_SUMBANGSIH,
  MANFAAT_RINGKAS,
  PERNYATAAN_VERSI,
  PERWAL_RW,
  REKOGNISI_USAHA_TERTIB,
  pasalPernyataanSumbangsih,
  tanggalSetorBulanan,
  teksBagianSayaRab,
  teksCaraSetor,
} from "@shared/rw3biz-pernyataan";
import { RW3BIZ_RT_NUMBERS } from "@shared/rt";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { IDENTITAS_RW } from "@shared/surat-sakti/identitas";
import { SITUS_PENDEK } from "@shared/kertas";
import { JENIS_TEMPAT_BIZ, JENIS_TEMPAT_BIZ_LABEL, formatRp, type PosAnggaran } from "@shared/rw3biz-kontribusi";

/** Kategori yang paling sering; sisanya ditulis di "Lainnya". Label sama dengan pilihan form online. */
const KATEGORI_UMUM = [
  "Warung/Toko Kelontong",
  "Warung nasi/masakan rumahan",
  "Kedai minuman/es/juice",
  "Gorengan/jajanan pasar",
  "Toko pulsa/kuota/token",
  "Laundry",
  "Salon/Barbershop",
  "Bengkel motor",
  "Industri Rumahan",
];

const TERMIN = ["1 bulan", "3 bulan", "6 bulan", "1 tahun"];

const huruf = (pt: number): CSSProperties => ({ fontSize: `${pt}pt` });

/** Kotak centang besar agar mudah ditandai pulpen. `padat` = hemat tinggi halaman 1. */
function Pilih({ teks, padat = false }: { teks: string; padat?: boolean }) {
  const s = padat ? 4.2 : 5;
  return (
    <span
      className="mr-[4mm] inline-flex items-center gap-[1.2mm] whitespace-nowrap"
      style={{ lineHeight: padat ? "6.5mm" : "8mm" }}
    >
      <span className="inline-block border-[1.5px] border-black" style={{ width: `${s}mm`, height: `${s}mm` }} />
      {teks}
    </span>
  );
}

/** Garis isian setinggi tulisan tangan. */
function Garis({
  label,
  lebar = "100%",
  tinggi = 9,
}: {
  label?: ReactNode;
  lebar?: string;
  tinggi?: number;
}) {
  return (
    <span className="inline-flex items-end gap-[2mm] align-bottom" style={{ width: lebar, height: `${tinggi}mm` }}>
      {label && <span className="whitespace-nowrap">{label}</span>}
      <span className="h-full flex-1 border-b border-black" />
    </span>
  );
}

/** Kotak per angka (NIK, nomor WA, tanggal). */
function KotakAngka({ jumlah, pisah = [], padat = false }: { jumlah: number; pisah?: number[]; padat?: boolean }) {
  const w = padat ? 5.6 : 6.2;
  const h = padat ? 6.5 : 8;
  return (
    <span className="inline-flex items-center align-middle">
      {Array.from({ length: jumlah }).map((_, i) => (
        <span key={i} className="inline-flex items-center">
          {pisah.includes(i) && <span className="px-[1mm] font-bold">–</span>}
          <span
            className="inline-block border border-black"
            style={{ width: `${w}mm`, height: `${h}mm`, marginLeft: i && !pisah.includes(i) ? "-1px" : 0 }}
          />
        </span>
      ))}
    </span>
  );
}

function Bagian({
  huruf: h,
  judul,
  sub,
  children,
  padat = false,
}: {
  huruf: string;
  judul: string;
  sub?: string;
  children: ReactNode;
  padat?: boolean;
}) {
  return (
    <section className="jaga" style={{ marginTop: padat ? "2mm" : "3mm" }}>
      <div
        className="flex items-center gap-[2mm] border-b-2 border-black"
        style={{ paddingBottom: "0.8mm", marginBottom: padat ? "1mm" : "1.5mm" }}
      >
        <span
          className="inline-flex items-center justify-center bg-black font-bold text-white"
          style={{ width: padat ? "5.5mm" : "6.5mm", height: padat ? "5.5mm" : "6.5mm", ...huruf(padat ? 11 : 12) }}
        >
          {h}
        </span>
        <span className="font-bold" style={huruf(padat ? 11.5 : 12.5)}>
          {judul}
        </span>
        {sub && <span style={huruf(9)}>{sub}</span>}
      </div>
      <div className={padat ? "space-y-[0.6mm]" : "space-y-[1.2mm]"} style={huruf(padat ? 10 : 11)}>
        {children}
      </div>
    </section>
  );
}

function Baris({ no, children, padat = false }: { no: number; children: ReactNode; padat?: boolean }) {
  return (
    <div className="flex gap-[2mm]">
      <span className="w-[5.5mm] shrink-0 font-bold" style={{ lineHeight: padat ? "7mm" : "9mm" }}>
        {no}.
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Halaman1({ qrSvg, target }: { qrSvg: string; target: number }) {
  const g = 7.2; // tinggi garis isian halaman 1 (hemat agar tidak kepotong)
  const lh = "7mm";
  return (
    <LembarF4>
      <KopHemat kecil />
      <div className="flex items-start justify-between gap-[3mm]" style={{ marginTop: "1.5mm" }}>
        <div>
          <p className="font-bold" style={{ ...huruf(12.5), lineHeight: 1.25 }}>
            FORMULIR KOMITMEN PENGUSAHA
          </p>
          <p className="font-bold" style={{ ...huruf(10.5), lineHeight: 1.25 }}>
            TERHADAP PROGRAM RW 03 PADASUKA
          </p>
          <p style={huruf(9)}>RW3BIZ · Izin usaha, warung, dan lapak di wilayah RW 03 Padasuka</p>
          <p style={huruf(8.5)}>
            Ditandatangani <b>Ketua RW 03</b> — {IDENTITAS_RW.ketua.nama}
          </p>
        </div>
        <div className="shrink-0 border-[1.5px] border-black" style={{ width: "50mm", padding: "1mm 2mm", ...huruf(8.5) }}>
          <p className="font-bold">Diterima Ketua RW 03</p>
          <p style={{ lineHeight: "5.5mm" }}>No. BIZ: ........................</p>
          <p style={{ lineHeight: "5.5mm" }}>Tgl terima: ....................</p>
        </div>
      </div>

      <div className="jaga" style={{ marginTop: "1.5mm", border: "1.5px solid #000", padding: "1.5mm 2mm" }}>
        <p className="font-bold" style={huruf(10)}>
          Mengapa ikut berkontribusi?
        </p>
        <div className="grid grid-cols-2 gap-x-[3mm]" style={{ ...huruf(8.5), lineHeight: 1.25, marginTop: "0.5mm" }}>
          {MANFAAT_RINGKAS.map((m) => (
            <p key={m}>• {m}</p>
          ))}
        </div>
        <p style={{ ...huruf(8.5), marginTop: "1mm", textAlign: "justify", lineHeight: 1.25 }}>
          <b>Sumbangsih = komitmen tiap tanggal 1</b> (bukan sekali bayar). Tidak ada tarif — di halaman 2 centang level
          sanggupan. Hanya ke <b>Ketua RW 03</b>. Detail RAB: {teksBagianSayaRab(target)}
        </p>
      </div>

      <div className="flex items-center gap-[3mm] border border-dashed border-black" style={{ marginTop: "1.5mm", padding: "1.2mm 2mm" }}>
        <ol className="flex-1 list-decimal space-y-[0.1mm] pl-[4.5mm]" style={{ ...huruf(9.5), lineHeight: 1.3 }}>
          <li>
            Tulis <b>HURUF KAPITAL</b> · centang kotak · lampirkan fotokopi KTP
          </li>
          <li>
            Halaman 2: <b>level sanggupan</b> + rincian program (= komitmen tgl 1)
          </li>
          <li>
            Serahkan ke <b>Ketua RW 03</b> ({IDENTITAS_RW.ketua.nama}) / sekretariat
          </li>
        </ol>
        <div className="flex shrink-0 items-center gap-[1.5mm]" style={huruf(7.5)}>
          <div className="text-right leading-tight">
            <p>Isi online:</p>
            <p className="font-bold">{SITUS_PENDEK}/rw3biz</p>
          </div>
          {qrSvg ? <div className="qr" style={{ width: "16mm", height: "16mm" }} dangerouslySetInnerHTML={{ __html: qrSvg }} /> : null}
        </div>
      </div>

      <Bagian huruf="A" judul="DATA USAHA" padat>
        <Baris no={1} padat>
          <Garis label="Nama usaha:" tinggi={g} />
        </Baris>
        <Baris no={2} padat>
          <p style={{ lineHeight: lh }}>Jenis tempat usaha:</p>
          <div style={huruf(9.5)}>
            {JENIS_TEMPAT_BIZ.filter((j) => j !== "lainnya").map((j) => (
              <Pilih key={j} teks={JENIS_TEMPAT_BIZ_LABEL[j]} padat />
            ))}
            <span className="inline-flex items-end" style={{ width: "55mm" }}>
              <Pilih teks="Lainnya:" padat />
              <Garis tinggi={g} />
            </span>
          </div>
        </Baris>
        <Baris no={3} padat>
          <p style={{ lineHeight: lh }}>
            Jenis dagangan / jasa <i style={huruf(8.5)}>(boleh lebih dari satu)</i>:
          </p>
          <div className="grid grid-cols-3" style={huruf(9.5)}>
            {KATEGORI_UMUM.map((k) => (
              <Pilih key={k} teks={k} padat />
            ))}
          </div>
          <div className="flex items-end">
            <Pilih teks="Lainnya:" padat />
            <Garis lebar="70%" tinggi={g} />
          </div>
        </Baris>
        <Baris no={4} padat>
          <Garis label="Alamat lokasi usaha:" tinggi={g} />
          <div className="flex items-center gap-[1mm]">
            <span className="mr-[2mm]" style={{ lineHeight: lh }}>
              RT:
            </span>
            {RW3BIZ_RT_NUMBERS.map((n) => (
              <Pilih key={n} teks={String(n).padStart(2, "0")} padat />
            ))}
            <span style={{ lineHeight: lh }}>/ RW 03</span>
          </div>
        </Baris>
        <Baris no={5} padat>
          <Garis label="Patokan / nomor lapak (bila ada):" tinggi={g} />
        </Baris>
        <Baris no={6} padat>
          <div className="flex flex-wrap items-center gap-[2mm]" style={{ minHeight: lh }}>
            <span>Jam buka:</span>
            <KotakAngka jumlah={2} padat />
            <b>.</b>
            <KotakAngka jumlah={2} padat />
            <span>s.d.</span>
            <KotakAngka jumlah={2} padat />
            <b>.</b>
            <KotakAngka jumlah={2} padat />
            <span>WIB</span>
            <span style={huruf(8)}>(24 jam, mis. 07.00–21.00)</span>
          </div>
        </Baris>
      </Bagian>

      <Bagian huruf="B" judul="PEMILIK / PENANGGUNG JAWAB" sub="(satu orang)" padat>
        <Baris no={7} padat>
          <span style={{ lineHeight: lh }}>Sebagai: </span>
          <Pilih teks="Pemilik" padat />
          <Pilih teks="Penanggung jawab" padat />
        </Baris>
        <Baris no={8} padat>
          <Garis label="Nama lengkap (sesuai KTP):" tinggi={g} />
        </Baris>
        <Baris no={9} padat>
          <div className="flex items-center gap-[2mm]" style={{ minHeight: lh }}>
            <span className="w-[36mm]">NIK (16 angka):</span>
            <KotakAngka jumlah={16} padat />
          </div>
        </Baris>
        <Baris no={10} padat>
          <div className="flex flex-wrap items-center gap-[2mm]" style={{ minHeight: lh }}>
            <span className="w-[36mm]">
              Tgl lahir <span style={huruf(8)}>(tgl–bln–thn)</span>:
            </span>
            <KotakAngka jumlah={8} pisah={[2, 4]} padat />
            <span className="ml-[2mm]">Kelamin:</span>
            <Pilih teks="Laki-laki" padat />
            <Pilih teks="Perempuan" padat />
          </div>
        </Baris>
        <Baris no={11} padat>
          <div className="flex items-center gap-[2mm]" style={{ minHeight: lh }}>
            <span className="w-[36mm]">No. WhatsApp aktif:</span>
            <KotakAngka jumlah={13} padat />
          </div>
        </Baris>
        <Baris no={12} padat>
          <div>
            <span style={{ lineHeight: lh }}>Tempat tinggal: </span>
            <Pilih teks="Warga RW 03" padat />
            <Pilih teks="Luar RW 03, alamat:" padat />
          </div>
          <Garis tinggi={g} />
        </Baris>
      </Bagian>
      <div
        className="mt-auto jaga flex flex-col justify-end"
        style={{ marginTop: "auto", paddingTop: "2mm", minHeight: "22mm" }}
      >
        <div
          style={{
            border: "1.5px solid #000",
            padding: "2.5mm 3mm",
            textAlign: "center",
            ...huruf(10.5),
            lineHeight: 1.4,
          }}
        >
          <p className="font-bold" style={huruf(11)}>
            Pengusaha yang bertransaksi di wilayah RW 03,
          </p>
          <p style={{ marginTop: "1mm" }}>
            alangkah baiknya ikut berkontribusi juga untuk wilayah RW 03 — agar lingkungan usaha tetap aman, bersih, dan maju
            bersama.
          </p>
        </div>
        <p className="text-right" style={{ ...huruf(8.5), marginTop: "1.5mm" }}>
          Lanjut ke halaman 2 →
        </p>
      </div>
    </LembarF4>
  );
}

function Halaman2({ program, target, tenggangHari }: { program: PosAnggaran[]; target: number; tenggangHari: number }) {
  const sel: CSSProperties = { border: "1px solid #000", padding: "1.5mm 2mm", verticalAlign: "middle" };
  const tglSetor = tanggalSetorBulanan(tenggangHari);
  return (
    <AlirF4>
      <div className="flex items-baseline justify-between border-b border-black" style={{ paddingBottom: "1mm", ...huruf(9.5) }}>
        <span className="font-bold">FORMULIR KOMITMEN PENGUSAHA · RW3BIZ · halaman 2</span>
        <span>Nama usaha: ........................................................</span>
      </div>

      <Bagian huruf="C" judul="SUMBANGSIH UNTUK PROGRAM RW 03">
        <div className="jaga" style={{ border: "2px solid #000", padding: "2mm 2.5mm", marginBottom: "2mm" }}>
          <p className="font-bold" style={huruf(11)}>1. Centang level sanggupan Anda (bukan tarif — pilih satu)</p>
          <p style={{ ...huruf(9), marginTop: "0.5mm", marginBottom: "1.5mm", textAlign: "justify" }}>
            Bandingkan dengan omzet harian usaha Anda. Makin besar kemampuan, centang level yang lebih tinggi — atau isi “Lainnya”.
          </p>
          <div className="space-y-[1.5mm]">
            {JANGKAR_SUMBANGSIH_DETAIL.map((j) => (
              <div key={j.nominal} className="flex items-start gap-[2mm]" style={{ ...huruf(10.5), lineHeight: 1.3 }}>
                <span className="mt-[0.5mm] inline-block shrink-0 border-[1.5px] border-black" style={{ width: "5mm", height: "5mm" }} />
                <span>
                  <b>{j.labelPendek}/bulan</b>
                  <span style={huruf(9)}> — {j.setara}</span>
                </span>
              </div>
            ))}
            <div className="flex items-end gap-[2mm]" style={{ ...huruf(10.5), minHeight: "8mm" }}>
              <span className="mb-[1mm] inline-block shrink-0 border-[1.5px] border-black" style={{ width: "5mm", height: "5mm" }} />
              <span className="font-bold shrink-0">Lainnya / lebih besar:</span>
              <span className="flex-1 border-b border-black" style={{ height: "7mm" }}>
                <span className="pl-[1mm]">Rp</span>
              </span>
              <span className="shrink-0" style={huruf(9)}>/bulan</span>
            </div>
          </div>
          <p style={{ ...huruf(9), marginTop: "1.5mm", textAlign: "justify", lineHeight: 1.3 }}>
            <b>Bagian saya:</b> {teksBagianSayaRab(target)} {REKOGNISI_USAHA_TERTIB}
          </p>
        </div>

        <p className="font-bold" style={{ ...huruf(10.5), marginBottom: "1mm" }}>
          2. Rincian ke program (utamakan 1–3 program) — jumlah harus sama dengan level di atas
        </p>
        <p style={{ ...huruf(9.5), textAlign: "justify", marginBottom: "1.5mm" }}>
          Manfaat: {MANFAAT_RINGKAS.join(" · ")} {teksCaraSetor(tenggangHari)}
        </p>
        <table className="w-full border-collapse" style={huruf(10.5)}>
          <thead>
            <tr style={{ background: "#eee" }}>
              <th style={{ ...sel, width: "8mm" }}>No</th>
              <th style={{ ...sel, textAlign: "left" }}>Program RW 03</th>
              <th style={{ ...sel, width: "28mm" }}>Kebutuhan RW</th>
              <th style={{ ...sel, width: "48mm" }}>Sumbangsih saya / bulan</th>
            </tr>
          </thead>
          <tbody>
            {program.map((p, i) => (
              <tr key={p.id} style={{ height: "9mm" }}>
                <td style={{ ...sel, textAlign: "center" }}>{i + 1}</td>
                <td style={{ ...sel, lineHeight: 1.15 }}>
                  <span className="font-bold">{p.label}</span>
                  {p.keterangan && <span style={huruf(7.5)}> — {p.keterangan}</span>}
                </td>
                <td style={{ ...sel, textAlign: "right", ...huruf(9) }}>{formatRp(p.nominal)}</td>
                <td style={{ ...sel, verticalAlign: "bottom" }}>Rp</td>
              </tr>
            ))}
            <tr style={{ height: "11mm" }}>
              <td style={{ ...sel, textAlign: "right", fontWeight: 700 }} colSpan={2}>JUMLAH PER BULAN (= level di atas)</td>
              <td style={{ ...sel, textAlign: "right", fontWeight: 700, ...huruf(9) }}>{formatRp(target)}</td>
              <td style={{ ...sel, verticalAlign: "bottom", fontWeight: 700, borderWidth: "2px" }}>Rp</td>
            </tr>
          </tbody>
        </table>
        <div
          className="jaga"
          style={{
            marginTop: "2mm",
            border: "2px solid #000",
            padding: "2mm 2.5mm",
            ...huruf(10),
            textAlign: "justify",
            fontWeight: 700,
            lineHeight: 1.35,
          }}
        >
          KOMITMEN: Jumlah di atas = janji setor <u>setiap bulan paling lambat tanggal {tglSetor}</u> — bukan sekali bayar.
          <br />
          <span style={{ fontWeight: 600 }}>
            Transfer <b>{LABEL_REKENING_SUMBANGSIH}</b>, atau tunai dalam amplop — petugas RW mengambil sambil memberi kwitansi.
          </span>
        </div>
        <p className="font-bold" style={{ ...huruf(9), marginTop: "1.5mm", textAlign: "justify", lineHeight: 1.3 }}>
          {GARANSI_ANTI_OKNUM}
        </p>
        <p style={{ ...huruf(8.5), textAlign: "justify", marginTop: "1mm" }}>
          Dasar: <b>{PERWAL_RW.singkat} {PERWAL_RW.pasal}</b> (swadaya — bukan pajak/retribusi). RAB{" "}
          <b>{formatRp(target)}/bulan</b>.
        </p>
      </Bagian>

      <Bagian huruf="D" judul="MASA BERLAKU IZIN">
        <div>{TERMIN.map((t) => <Pilih key={t} teks={t} />)}</div>
        <p style={huruf(9.5)}>
          Izin mulai berlaku sejak sumbangsih pertama diterima. Setelah itu setor setiap tanggal {tglSetor} ke{" "}
          <b>{LABEL_REKENING_SUMBANGSIH}</b> atau amplop tunai berkwitansi. Perpanjangan bisa lewat online.
        </p>
        <Garis label="Catatan (bila ada):" tinggi={8} />
      </Bagian>

      <Bagian huruf="E" judul="PERNYATAAN">
        <p style={{ ...huruf(10), textAlign: "justify", lineHeight: 1.35 }}>
          Saya menyatakan data di atas benar; mengerti manfaat berkontribusi bagi usaha saya; rela ikut menanggung program RW 03;
          tidak menolak kontribusi resmi; mengerti garansi anti-oknum (hanya Ketua RW 03 / bendahara resmi); menaati tata tertib
          lingkungan RW 03; serta berkomitmen menyetor sumbangsih di atas <b>setiap bulan paling lambat tanggal {tglSetor}</b> ke
          Kas RW 03 sebagaimana <b>Surat Pernyataan Sumbangsih</b> (versi {PERNYATAAN_VERSI}) pada halaman berikutnya.
        </p>
        <BlokTtdDuaKolom
          kiri={{ atas: "Pemohon,", petunjuk: "tanda tangan & nama jelas" }}
          kanan={kolomKetuaRw()}
          tinggiRuang="20mm"
        />
      </Bagian>

      <div className="jaga" style={{ marginTop: "3mm", borderTop: "1.5px dashed #000", paddingTop: "1.5mm", ...huruf(10) }}>
        <p className="text-center" style={huruf(8)}>✂ gunting di sini — bukti untuk pemohon</p>
        <p className="font-bold" style={{ marginTop: "1mm" }}>
          BUKTI PENYERAHAN FORMULIR KOMITMEN RW3BIZ{" "}
          <span className="font-normal">(diisi Ketua RW 03 — {IDENTITAS_RW.ketua.nama})</span>
        </p>
        <div className="flex gap-[4mm]">
          <Garis label="Nama usaha:" lebar="55%" tinggi={8} />
          <Garis label="Diterima tgl:" lebar="25%" tinggi={8} />
          <Garis label="Paraf:" lebar="20%" tinggi={8} />
        </div>
        <p style={{ ...huruf(9), marginTop: "1mm" }}>
          Status: menunggu persetujuan Ketua RW. Nomor (BIZ-…) dikabarkan lewat WhatsApp. Cek di{" "}
          <b>{SITUS_PENDEK}/rw3biz/status</b>.
        </p>
      </div>
    </AlirF4>
  );
}

/** Kepala Perwal + bunyi lengkap Pasal 114 + penerapannya, versi cetak. */
function DasarHukumCetak() {
  return (
    <section className="jaga" style={{ marginTop: "3mm", border: "1.5px solid #000", padding: "2.5mm 4mm", ...huruf(9.5), lineHeight: 1.35 }}>
      <p className="font-bold" style={huruf(10.5)}>DASAR HUKUM</p>
      <div className="text-center font-bold" style={{ ...huruf(9), lineHeight: 1.3 }}>
        {PERWAL_RW.kepala.map((b) => <p key={b}>{b}</p>)}
        <p style={{ marginTop: "1.5mm" }}>{PERWAL_RW.bab}</p>
        <p>{PERWAL_RW.pasal}</p>
      </div>
      <ol style={{ marginTop: "1.5mm" }}>
        {PERWAL_RW.ayat.map((a) => (
          <li key={a.no} className="flex gap-[2mm]" style={{ marginTop: "1mm" }}>
            <span className="shrink-0">{a.no}</span>
            <div style={{ textAlign: "justify" }}>
              {a.teks}
              {a.huruf?.map((h) => <p key={h} style={{ paddingLeft: "3mm", fontWeight: h.startsWith("c.") ? 700 : 400 }}>{h}</p>)}
            </div>
          </li>
        ))}
      </ol>
      <div style={{ marginTop: "2mm", borderTop: "1px dashed #000", paddingTop: "1.5mm", ...huruf(8.5) }}>
        <p className="font-bold">Penerapan pada sumbangsih RW3BIZ:</p>
        {PERWAL_RW.penerapan.map((p) => (
          <p key={p.ayat}><b>{p.ayat}:</b> {p.teks}</p>
        ))}
      </div>
    </section>
  );
}

/** Surat Pernyataan Sumbangsih kosong untuk ditandatangani (isi pasal sama dengan versi online). */
function HalamanPernyataan({ target, tenggangHari }: { target: number; tenggangHari: number }) {
  const pasal = pasalPernyataanSumbangsih({ total: null, tenggangHari, target });
  const tglSetor = tanggalSetorBulanan(tenggangHari);
  return (
    <AlirF4>
      <KopHemat kecil />
      <div className="text-center" style={{ marginTop: "3mm" }}>
        <p className="font-bold underline" style={huruf(14)}>SURAT PERNYATAAN SUMBANGSIH</p>
        <p style={huruf(9.5)}>RW3BIZ · Sumbangsih usaha untuk program RW 03 · versi {PERNYATAAN_VERSI}</p>
        <p style={{ ...huruf(9), marginTop: "1mm" }}>
          PIHAK KEDUA: {IDENTITAS_RW.ketua.jabatan} — {IDENTITAS_RW.ketua.nama} · Setor tgl {tglSetor}: {LABEL_REKENING_SUMBANGSIH} / amplop + kwitansi
        </p>
      </div>
      <div className="jaga" style={{ marginTop: "2mm", border: "1.5px solid #000", padding: "2mm 2.5mm" }}>
        <p className="font-bold" style={huruf(10)}>Ringkasan manfaat &amp; bagian saya</p>
        <ul className="list-disc pl-[5mm]" style={{ ...huruf(9), lineHeight: 1.3, marginTop: "1mm" }}>
          {MANFAAT_RINGKAS.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p style={{ ...huruf(8.5), marginTop: "1mm", textAlign: "justify", lineHeight: 1.3 }}>{teksBagianSayaRab(target)}</p>
        <ul className="list-none pl-0" style={{ ...huruf(8.5), marginTop: "1mm", lineHeight: 1.3 }}>
          {JANGKAR_SUMBANGSIH_DETAIL.map((j) => (
            <li key={j.nominal}>
              <b>{j.labelPendek}/bulan</b> — {j.setara}
            </li>
          ))}
        </ul>
        <p className="font-bold" style={{ ...huruf(8.5), marginTop: "1.5mm", textAlign: "justify", lineHeight: 1.3 }}>
          {GARANSI_ANTI_OKNUM}
        </p>
      </div>
      <DasarHukumCetak />
      <div style={{ ...huruf(10.5), marginTop: "3mm" }}>
        <p>Yang bertanda tangan di bawah ini:</p>
        <Garis label="Nama lengkap:" />
        <div className="flex items-center gap-[3mm]" style={{ minHeight: "9mm" }}>
          <span className="w-[28mm]">NIK:</span>
          <KotakAngka jumlah={16} />
        </div>
        <Garis label="Nama usaha:" />
        <div className="flex items-end gap-[3mm]">
          <Garis label="Alamat usaha:" lebar="78%" />
          <Garis label="RT:" lebar="22%" />
        </div>
        <p style={{ marginTop: "2mm", textAlign: "justify" }}>
          selanjutnya disebut <b>PIHAK PERTAMA</b>, dengan ini menyatakan kepada {IDENTITAS_RW.ketua.jabatan}{" "}
          ({IDENTITAS_RW.ketua.nama}) selaku <b>PIHAK KEDUA</b> (bersama-sama disebut <b>PARA PIHAK</b>), bahwa jumlah sumbangsih
          pada formulir adalah <b>komitmen setiap bulan paling lambat tanggal {tglSetor}</b>, serta menyatakan hal-hal berikut:
        </p>
      </div>
      <div style={{ ...huruf(9.5), marginTop: "2mm", lineHeight: 1.4 }}>
        {pasal.map((p, i) => (
          <section key={p.judul} className="jaga" style={{ marginTop: "2.5mm" }}>
            <p className="text-center font-bold">Pasal {i + 1} — {p.judul}</p>
            <ol className="list-decimal pl-[6mm]" style={{ textAlign: "justify" }}>
              {p.ayat.map((a) => <li key={a}>{a}</li>)}
            </ol>
          </section>
        ))}
      </div>
      <BlokTtdDuaKolom
        kiri={{
          atas: "PIHAK PERTAMA,",
          petunjuk: "tanda tangan & nama jelas",
          ruang: (
            <div
              className="border border-dashed border-gray-500 text-center text-gray-500"
              style={{ width: "24mm", padding: "2mm 1mm", ...huruf(7) }}
            >
              Meterai Rp10.000
              <br />
              (bila diminta)
            </div>
          ),
        }}
        kanan={kolomKetuaRw({ atas: "PIHAK KEDUA," })}
        tinggiRuang="24mm"
      />
    </AlirF4>
  );
}

export default function Rw3bizFormulir() {
  const { program, isLoading } = useProgramRw3();
  const { data: tarif } = useTarifPublik();
  const target = tarif?.targetBulanan ?? program.reduce((s, p) => s + p.nominal, 0);
  const [qrSvg, setQrSvg] = useState("");
  useEffect(() => {
    QRCode.toString(`https://${SITUS_PENDEK}${RW3BIZ_ROUTES.pengajuan}`, { type: "svg", margin: 0 })
      .then(setQrSvg)
      .catch(() => setQrSvg(""));
  }, []);

  return (
    <Rw3bizShell title="Formulir komitmen" backHref={RW3BIZ_ROUTES.hub}>
      <GayaCetakF4 />
      <div className="space-y-3 print:hidden">
        <p className="text-base">
          <strong>Formulir Komitmen Pengusaha terhadap Program RW 03 Padasuka</strong> — diisi dengan{" "}
          <strong>tulisan tangan</strong>, beserta <strong>Surat Pernyataan Sumbangsih</strong>. Isinya memuat manfaat bagi
          usaha, komitmen setor tanggal 1, dan ditandatangani hanya oleh pemohon +{" "}
          <strong>Ketua RW 03 ({IDENTITAS_RW.ketua.nama})</strong> — tanpa petugas survey. Cetak semua halaman, isi, serahkan
          ke Ketua RW 03 beserta fotokopi KTP.
        </p>
        <Button className="h-12 w-full gap-2 text-base" disabled={isLoading || !program.length} onClick={() => window.print()}>
          <Printer className="h-5 w-5" /> Cetak formulir komitmen
        </Button>
        <p className="text-xs text-muted-foreground">
          Ukuran kertas <b>F4 / folio</b>. Bila printer hanya memakai A4, pilih <b>Sesuaikan ke halaman (Fit to page)</b> di
          pengaturan cetak. Di HP, pilih <b>Simpan sebagai PDF</b> lalu cetak di tempat fotokopi.
        </p>
        <Link href={RW3BIZ_ROUTES.pengajuan}>
          <Button variant="outline" className="h-11 w-full gap-2">
            <Smartphone className="h-4 w-4" /> Lebih mudah isi online
          </Button>
        </Link>
        <p className="pt-2 text-sm font-semibold">Pratinjau</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <AreaCetak>
          <Halaman1 qrSvg={qrSvg} target={target} />
          <Halaman2 program={program} target={target} tenggangHari={tarif?.tenggangHari ?? 0} />
          <HalamanPernyataan target={target} tenggangHari={tarif?.tenggangHari ?? 0} />
        </AreaCetak>
      )}
    </Rw3bizShell>
  );
}
