import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "wouter";
import QRCode from "qrcode";
import { Printer, Smartphone } from "lucide-react";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlirF4, AreaCetak, GayaCetakF4, KopHemat, LembarF4 } from "@/components/cetak/lembar-f4";
import { useProgramRw3 } from "@/components/rw3biz/kontribusi-form";
import { useTarifPublik } from "@/components/rw3biz/transparansi";
import { PERNYATAAN_VERSI, PERWAL_RW, pasalPernyataanSumbangsih } from "@shared/rw3biz-pernyataan";
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

/** Kotak centang besar (5 mm) agar mudah ditandai pulpen. */
function Pilih({ teks }: { teks: string }) {
  return (
    <span className="mr-[5mm] inline-flex items-center gap-[1.5mm] whitespace-nowrap" style={{ lineHeight: "8mm" }}>
      <span className="inline-block border-[1.5px] border-black" style={{ width: "5mm", height: "5mm" }} />
      {teks}
    </span>
  );
}

/** Garis isian setinggi tulisan tangan (9 mm). */
function Garis({ label, lebar = "100%", tinggi = 9 }: { label?: ReactNode; lebar?: string; tinggi?: number }) {
  return (
    <span className="inline-flex items-end gap-[2mm] align-bottom" style={{ width: lebar, height: `${tinggi}mm` }}>
      {label && <span className="whitespace-nowrap">{label}</span>}
      <span className="h-full flex-1 border-b border-black" />
    </span>
  );
}

/** Kotak per angka (NIK, nomor WA, tanggal). */
function KotakAngka({ jumlah, pisah = [] }: { jumlah: number; pisah?: number[] }) {
  return (
    <span className="inline-flex items-center align-middle">
      {Array.from({ length: jumlah }).map((_, i) => (
        <span key={i} className="inline-flex items-center">
          {pisah.includes(i) && <span className="px-[1mm] font-bold">–</span>}
          <span
            className="inline-block border border-black"
            style={{ width: "6.2mm", height: "8mm", marginLeft: i && !pisah.includes(i) ? "-1px" : 0 }}
          />
        </span>
      ))}
    </span>
  );
}

function Bagian({ huruf: h, judul, sub, children }: { huruf: string; judul: string; sub?: string; children: ReactNode }) {
  return (
    <section className="jaga" style={{ marginTop: "3mm" }}>
      <div className="flex items-center gap-[2mm] border-b-2 border-black" style={{ paddingBottom: "1mm", marginBottom: "1.5mm" }}>
        <span className="inline-flex items-center justify-center bg-black font-bold text-white" style={{ width: "6.5mm", height: "6.5mm", ...huruf(12) }}>
          {h}
        </span>
        <span className="font-bold" style={huruf(12.5)}>{judul}</span>
        {sub && <span style={huruf(9.5)}>{sub}</span>}
      </div>
      <div className="space-y-[1.2mm]" style={huruf(11)}>{children}</div>
    </section>
  );
}

function Baris({ no, children }: { no: number; children: ReactNode }) {
  return (
    <div className="flex gap-[2mm]">
      <span className="w-[6mm] shrink-0 font-bold" style={{ lineHeight: "9mm" }}>{no}.</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Halaman1({ qrSvg }: { qrSvg: string }) {
  return (
    <LembarF4>
      <KopHemat kecil />
      <div className="flex items-start justify-between gap-[4mm]" style={{ marginTop: "2mm" }}>
        <div>
          <p className="font-bold" style={huruf(16)}>FORMULIR PENDAFTARAN USAHA</p>
          <p style={huruf(10.5)}>RW3BIZ · Izin usaha, warung, dan lapak di wilayah RW 03 Padasuka</p>
        </div>
        <div className="shrink-0 border-[1.5px] border-black" style={{ width: "56mm", padding: "1mm 2.5mm", ...huruf(9) }}>
          <p className="font-bold">Diisi petugas</p>
          <p style={{ lineHeight: "6.5mm" }}>No. BIZ: ............................</p>
          <p style={{ lineHeight: "6.5mm" }}>Tgl terima: ........................</p>
        </div>
      </div>

      <div className="flex items-center gap-[4mm] border border-dashed border-black" style={{ marginTop: "2mm", padding: "2mm 3mm" }}>
        <ol className="flex-1 list-decimal space-y-[0.3mm] pl-[5mm]" style={huruf(10.5)}>
          <li>Tulis dengan <b>HURUF KAPITAL</b> memakai pulpen.</li>
          <li>Beri tanda <b>✓</b> pada kotak yang sesuai.</li>
          <li>Lampirkan <b>fotokopi KTP</b> pemilik / penanggung jawab.</li>
          <li>Serahkan ke pengurus RT/RW 03 atau sekretariat RW. Petugas akan datang untuk survey.</li>
        </ol>
        <div className="flex shrink-0 items-center gap-[2mm]" style={huruf(8.5)}>
          <div className="text-right leading-tight">
            <p>Atau isi online,</p>
            <p>scan kode ini:</p>
            <p className="font-bold">{SITUS_PENDEK}</p>
            <p className="font-bold">/rw3biz</p>
          </div>
          {qrSvg ? <div className="qr" style={{ width: "21mm", height: "21mm" }} dangerouslySetInnerHTML={{ __html: qrSvg }} /> : null}
        </div>
      </div>

      <Bagian huruf="A" judul="DATA USAHA">
        <Baris no={1}><Garis label="Nama usaha:" /></Baris>
        <Baris no={2}>
          <p style={{ lineHeight: "9mm" }}>Jenis tempat usaha:</p>
          <div style={huruf(10.5)}>
            {JENIS_TEMPAT_BIZ.filter((j) => j !== "lainnya").map((j) => <Pilih key={j} teks={JENIS_TEMPAT_BIZ_LABEL[j]} />)}
            <span className="inline-flex items-end" style={{ width: "62mm" }}><Pilih teks="Lainnya:" /><Garis /></span>
          </div>
        </Baris>
        <Baris no={3}>
          <p style={{ lineHeight: "9mm" }}>Jenis dagangan / jasa <i style={huruf(9.5)}>(boleh lebih dari satu)</i>:</p>
          <div className="grid grid-cols-3" style={huruf(10.5)}>
            {KATEGORI_UMUM.map((k) => <Pilih key={k} teks={k} />)}
          </div>
          <div className="flex items-end"><Pilih teks="Lainnya:" /><Garis lebar="72%" /></div>
        </Baris>
        <Baris no={4}>
          <Garis label="Alamat lokasi usaha:" />
          <Garis />
          <div className="flex items-center gap-[1mm]">
            <span className="mr-[2mm]" style={{ lineHeight: "9mm" }}>RT:</span>
            {RW3BIZ_RT_NUMBERS.map((n) => <Pilih key={n} teks={String(n).padStart(2, "0")} />)}
            <span style={{ lineHeight: "9mm" }}>/ RW 03</span>
          </div>
        </Baris>
        <Baris no={5}><Garis label="Patokan / nomor lapak (bila ada):" /></Baris>
        <Baris no={6}>
          <div className="flex flex-wrap items-center gap-[2mm]" style={{ minHeight: "9mm" }}>
            <span>Jam buka:</span>
            <KotakAngka jumlah={2} /><b>.</b><KotakAngka jumlah={2} />
            <span>s.d.</span>
            <KotakAngka jumlah={2} /><b>.</b><KotakAngka jumlah={2} />
            <span>WIB</span>
            <span style={huruf(9)}>(format 24 jam, contoh 07.00 s.d. 21.00)</span>
          </div>
        </Baris>
      </Bagian>

      <Bagian huruf="B" judul="PEMILIK / PENANGGUNG JAWAB" sub="(cukup satu orang, data pegawai tidak perlu)">
        <Baris no={7}>
          <span style={{ lineHeight: "9mm" }}>Sebagai: </span>
          <Pilih teks="Pemilik" />
          <Pilih teks="Penanggung jawab" />
        </Baris>
        <Baris no={8}><Garis label="Nama lengkap (sesuai KTP):" /></Baris>
        <Baris no={9}>
          <div className="flex items-center gap-[3mm]" style={{ minHeight: "9mm" }}><span className="w-[40mm]">NIK (16 angka):</span><KotakAngka jumlah={16} /></div>
        </Baris>
        <Baris no={10}>
          <div className="flex flex-wrap items-center gap-[3mm]" style={{ minHeight: "9mm" }}>
            <span className="w-[40mm]">Tgl lahir <span style={huruf(9)}>(tgl–bln–thn)</span>:</span>
            <KotakAngka jumlah={8} pisah={[2, 4]} />
            <span className="ml-[3mm]">Kelamin:</span>
            <Pilih teks="Laki-laki" />
            <Pilih teks="Perempuan" />
          </div>
        </Baris>
        <Baris no={11}>
          <div className="flex items-center gap-[3mm]" style={{ minHeight: "9mm" }}><span className="w-[40mm]">No. WhatsApp aktif:</span><KotakAngka jumlah={13} /></div>
        </Baris>
        <Baris no={12}>
          <div>
            <span style={{ lineHeight: "9mm" }}>Tempat tinggal: </span>
            <Pilih teks="Warga RW 03" />
            <Pilih teks="Luar RW 03, alamat:" />
          </div>
          <Garis />
        </Baris>
      </Bagian>
      <p className="mt-auto text-right" style={huruf(9.5)}>Lanjut ke halaman 2 →</p>
    </LembarF4>
  );
}

function Halaman2({ program, target }: { program: PosAnggaran[]; target: number }) {
  const sel: CSSProperties = { border: "1px solid #000", padding: "1.5mm 2mm", verticalAlign: "middle" };
  return (
    <AlirF4>
      <div className="flex items-baseline justify-between border-b border-black" style={{ paddingBottom: "1mm", ...huruf(9.5) }}>
        <span className="font-bold">FORMULIR PENDAFTARAN USAHA RW3BIZ · halaman 2</span>
        <span>Nama usaha: ........................................................</span>
      </div>

      <Bagian huruf="C" judul="SUMBANGSIH UNTUK PROGRAM RW 03">
        <p style={{ ...huruf(10.5), textAlign: "justify" }}>
          <b>Tidak ada tarif.</b> Tuliskan sendiri berapa yang ingin Bapak/Ibu sumbangkan <b>setiap bulan</b> untuk program RW 03
          yang ingin didukung — boleh satu atau beberapa. Contoh: kebersihan Rp10.000 + Linmas Rp10.000 = Rp20.000/bulan.
          Sumbangsih disetor ke Kas RW 03 dengan kwitansi.
        </p>
        <table className="w-full border-collapse" style={huruf(10.5)}>
          <thead>
            <tr style={{ background: "#eee" }}>
              <th style={{ ...sel, width: "8mm" }}>No</th>
              <th style={{ ...sel, textAlign: "left" }}>Program RW 03</th>
              <th style={{ ...sel, width: "30mm" }}>Kebutuhan RW / bulan</th>
              <th style={{ ...sel, width: "52mm" }}>Sumbangsih saya / bulan</th>
            </tr>
          </thead>
          <tbody>
            {program.map((p, i) => (
              <tr key={p.id} style={{ height: "9.5mm" }}>
                <td style={{ ...sel, textAlign: "center" }}>{i + 1}</td>
                <td style={{ ...sel, lineHeight: 1.2 }}>
                  <span className="font-bold">{p.label}</span>
                  {p.keterangan && <span style={huruf(8)}> — {p.keterangan}</span>}
                </td>
                <td style={{ ...sel, textAlign: "right", ...huruf(9.5) }}>{formatRp(p.nominal)}</td>
                <td style={{ ...sel, verticalAlign: "bottom" }}>Rp</td>
              </tr>
            ))}
            <tr style={{ height: "12mm" }}>
              <td style={{ ...sel, textAlign: "right", fontWeight: 700 }} colSpan={2}>JUMLAH PER BULAN</td>
              <td style={{ ...sel, textAlign: "right", fontWeight: 700, ...huruf(9.5) }}>{formatRp(target)}</td>
              <td style={{ ...sel, verticalAlign: "bottom", fontWeight: 700, borderWidth: "2px" }}>Rp</td>
            </tr>
          </tbody>
        </table>
        <p style={{ ...huruf(9.5), textAlign: "justify" }}>
          Kebutuhan RW 03 <b>{formatRp(target * 12)}/tahun</b> ditanggung bersama secara gotong royong. Dasar:{" "}
          <b>{PERWAL_RW.singkat} {PERWAL_RW.pasal}</b> (pembiayaan RW dari swadaya masyarakat).
        </p>
      </Bagian>

      <Bagian huruf="D" judul="MASA BERLAKU IZIN">
        <div>{TERMIN.map((t) => <Pilih key={t} teks={t} />)}</div>
        <p style={huruf(9.5)}>Izin mulai berlaku sejak sumbangsih pertama diterima pengurus saat survey. Perpanjangan bisa lewat online.</p>
        <Garis label="Catatan (bila ada):" tinggi={8} />
      </Bagian>

      <Bagian huruf="E" judul="PERNYATAAN">
        <p style={{ ...huruf(10.5), textAlign: "justify" }}>
          Saya menyatakan data di atas benar, bersedia didatangi petugas survey, menaati tata tertib lingkungan RW 03, serta sanggup
          menyetor sumbangsih yang saya tulis di atas setiap bulan ke Kas RW 03 sebagaimana <b>Surat Pernyataan Sumbangsih</b> pada
          halaman berikutnya yang juga saya tanda tangani.
        </p>
        <div className="flex justify-between" style={{ marginTop: "2mm", ...huruf(10.5) }}>
          <div className="text-center" style={{ width: "46%" }}>
            <p>{IDENTITAS_RW.tempat}, ........................ 20.....</p>
            <p>Pemohon,</p>
            <div style={{ height: "12mm" }} />
            <p>(........................................................)</p>
            <p style={huruf(8.5)}>tanda tangan & nama jelas</p>
          </div>
          <div className="text-center" style={{ width: "46%" }}>
            <p>&nbsp;</p>
            <p>Diterima pengurus RT/RW 03,</p>
            <div style={{ height: "12mm" }} />
            <p>(........................................................)</p>
          </div>
        </div>
      </Bagian>

      <div className="jaga" style={{ marginTop: "2mm", borderTop: "1.5px dashed #000", paddingTop: "1.5mm", ...huruf(10) }}>
        <p className="text-center" style={huruf(8)}>✂ gunting di sini — bukti untuk pemohon</p>
        <p className="font-bold" style={{ marginTop: "1mm" }}>BUKTI PENYERAHAN FORMULIR RW3BIZ <span className="font-normal">(diisi pengurus yang menerima)</span></p>
        <div className="flex gap-[4mm]">
          <Garis label="Nama usaha:" lebar="55%" tinggi={8} />
          <Garis label="Diterima tgl:" lebar="25%" tinggi={8} />
          <Garis label="Paraf:" lebar="20%" tinggi={8} />
        </div>
        <p style={{ ...huruf(9), marginTop: "1mm" }}>
          Nomor pendaftaran (BIZ-…) dikabarkan lewat WhatsApp. Cek status di <b>{SITUS_PENDEK}/rw3biz/status</b>.
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
              {a.huruf?.map((h) => <p key={h} style={{ paddingLeft: "3mm", fontWeight: h.startsWith("a.") ? 700 : 400 }}>{h}</p>)}
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
  return (
    <AlirF4>
      <KopHemat kecil />
      <div className="text-center" style={{ marginTop: "3mm" }}>
        <p className="font-bold underline" style={huruf(14)}>SURAT PERNYATAAN SUMBANGSIH</p>
        <p style={huruf(9.5)}>RW3BIZ · Sumbangsih usaha untuk program RW 03 · versi {PERNYATAAN_VERSI}</p>
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
          selanjutnya disebut <b>PIHAK PERTAMA</b>, dengan ini menyatakan kepada Pengurus Rukun Warga 03 Kelurahan Padasuka yang
          diwakili oleh {IDENTITAS_RW.ketua.jabatan} (selanjutnya disebut <b>PIHAK KEDUA</b>; bersama-sama disebut <b>PARA PIHAK</b>),
          hal-hal sebagai berikut:
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
      <div className="jaga flex justify-between" style={{ marginTop: "5mm", ...huruf(10.5) }}>
        <div className="text-center" style={{ width: "46%" }}>
          <p>{IDENTITAS_RW.tempat}, ........................ 20.....</p>
          <p className="font-bold">PIHAK PERTAMA,</p>
          <div className="flex items-center justify-center" style={{ height: "24mm" }}>
            <div className="border border-dashed border-gray-500 text-center text-gray-500" style={{ width: "24mm", padding: "2mm 1mm", ...huruf(7) }}>
              Meterai Rp10.000<br />(bila diminta)
            </div>
          </div>
          <p>(........................................................)</p>
          <p style={huruf(8.5)}>tanda tangan & nama jelas</p>
        </div>
        <div className="text-center" style={{ width: "46%" }}>
          <p>&nbsp;</p>
          <p className="font-bold">PIHAK KEDUA,</p>
          <p style={huruf(9)}>{IDENTITAS_RW.ketua.jabatan}</p>
          <div style={{ height: "19mm" }} />
          <p className="font-bold underline">{IDENTITAS_RW.ketua.nama}</p>
        </div>
      </div>
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
    <Rw3bizShell title="Formulir kertas" backHref={RW3BIZ_ROUTES.hub}>
      <GayaCetakF4 />
      <div className="space-y-3 print:hidden">
        <p className="text-base">
          Formulir pendaftaran usaha untuk diisi dengan <strong>tulisan tangan</strong>, beserta{" "}
          <strong>Surat Pernyataan Sumbangsih</strong> yang ditandatangani. Cetak semua halaman (boleh bolak-balik), isi, lalu
          serahkan ke pengurus RT/RW 03 beserta fotokopi KTP.
        </p>
        <Button className="h-12 w-full gap-2 text-base" disabled={isLoading || !program.length} onClick={() => window.print()}>
          <Printer className="h-5 w-5" /> Cetak formulir
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
          <Halaman1 qrSvg={qrSvg} />
          <Halaman2 program={program} target={target} />
          <HalamanPernyataan target={target} tenggangHari={tarif?.tenggangHari ?? 10} />
        </AreaCetak>
      )}
    </Rw3bizShell>
  );
}
