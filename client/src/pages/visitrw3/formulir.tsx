import { type CSSProperties, type ReactNode } from "react";
import { Link } from "wouter";
import { Printer, Smartphone } from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import {
  AreaCetak,
  GayaCetakA4,
  KopHemat,
  LembarF4,
  PanduanPrinter,
} from "@/components/cetak/lembar-f4";
import { BlokTtdDuaKolom, kolomKetuaRw } from "@/components/cetak/ttd-ketua";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import { A4, SITUS_PENDEK } from "@shared/kertas";
import { KONTRIBUSI_TINGGAL_PER_BULAN } from "@shared/visitrw3-kontribusi";
import { KEPERLUAN_TINGGAL_OPSI } from "@shared/visitrw3-keperluan";
import {
  pasalPernyataanTinggal,
  PERNYATAAN_TINGGAL_VERSI,
} from "@shared/visitrw3-pernyataan";

/** Margin A4 aman untuk Epson L3210 (tidak cetak sampai tepi). */
const MARGIN_A4 = A4.margin;

const h = (pt: number): CSSProperties => ({ fontSize: `${pt}pt`, lineHeight: 1.28 });

function Cek({ teks }: { teks: string }) {
  return (
    <span className="mr-[2.4mm] mb-[0.9mm] inline-flex items-center gap-[0.9mm] whitespace-nowrap">
      <span className="inline-block border border-black" style={{ width: "3.3mm", height: "3.3mm" }} />
      <span style={h(7.5)}>{teks}</span>
    </span>
  );
}

function Garis({
  label,
  lebar = "100%",
  tinggi = 6.2,
}: {
  label?: ReactNode;
  lebar?: string;
  tinggi?: number;
}) {
  return (
    <span className="inline-flex items-end gap-[1.3mm] align-bottom" style={{ width: lebar, height: `${tinggi}mm` }}>
      {label && (
        <span className="whitespace-nowrap" style={h(7.5)}>
          {label}
        </span>
      )}
      <span className="h-full flex-1 border-b border-black" />
    </span>
  );
}

function Kotak({ jumlah }: { jumlah: number }) {
  return (
    <span className="inline-flex items-center align-middle">
      {Array.from({ length: jumlah }).map((_, i) => (
        <span
          key={i}
          className="inline-block border border-black"
          style={{ width: "4mm", height: "5mm", marginLeft: i ? "-1px" : 0 }}
        />
      ))}
    </span>
  );
}

function JudulBag({ no, teks }: { no: string; teks: string }) {
  return (
    <p className="font-bold uppercase" style={{ ...h(8.5), marginTop: "3.2mm", marginBottom: "1.4mm" }}>
      {no}. {teks}
    </p>
  );
}

function HalamanFormulir() {
  return (
    <LembarF4 style={{ ...h(7.5), paddingBottom: 0, display: "flex", flexDirection: "column" }}>
      <KopHemat kecil />
      <p className="text-center font-bold uppercase" style={{ ...h(11), marginTop: "2.5mm" }}>
        Formulir Izin Tinggal — Visit RW3
      </p>
      <p className="text-center" style={{ ...h(7), marginTop: "0.8mm", color: "#333", lineHeight: 1.35 }}>
        Halaman 1 dari 2 · A4 · kontribusi Rp{KONTRIBUSI_TINGGAL_PER_BULAN.toLocaleString("id-ID")}/bulan ·{" "}
        <b>lampirkan fotokopi KTP semua anggota</b>
      </p>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <JudulBag no="1" teks="Jenis tinggal & lokasi di RW 03" />
          <div>
            <Cek teks="Ngontrak" />
            <Cek teks="Ngekost" />
            <span style={h(7.5)}>RT: </span>
            {ACTIVE_RT_NUMBERS.map((n) => (
              <Cek key={n} teks={String(n).padStart(2, "0")} />
            ))}
          </div>
          <div className="mt-[1.5mm] flex gap-[3.5mm]">
            <Garis label="No. kamar/unit:" lebar="42%" />
            <Garis label="Alamat di RW 03 (opsional):" lebar="58%" />
          </div>

          <JudulBag no="2" teks="Asal tempat tinggal (wajib — sebelum pindah ke RW 03)" />
          <div className="space-y-[1.5mm]">
            <div className="flex gap-[3.5mm]">
              <Garis label="Kab/Kota:" lebar="50%" />
              <Garis label="Kecamatan:" lebar="50%" />
            </div>
            <div className="flex gap-[3.5mm]">
              <Garis label="Kelurahan/Desa:" lebar="50%" />
              <Garis label="RT/RW asal:" lebar="50%" />
            </div>
            <Garis label="Alamat lengkap asal:" />
          </div>

          <JudulBag no="3" teks="Kepentingan tinggal (wajib — centang satu, isi detail)" />
          <div className="flex flex-wrap">
            {KEPERLUAN_TINGGAL_OPSI.map((k) => (
              <Cek key={k} teks={k} />
            ))}
          </div>
          <div className="mt-[1.5mm] space-y-[1.5mm]">
            <Garis label="Nama tempat (kantor/kampus/usaha/dll):" />
            <Garis label="Alamat tempat kegiatan:" />
            <div className="flex gap-[3.5mm]">
              <Garis label="Jabatan/jurusan/jenis:" lebar="55%" />
              <Garis label="Status/semester:" lebar="45%" />
            </div>
            <div className="flex gap-[3.5mm]">
              <Garis label="Sampai (bln/thn):" lebar="40%" />
              <Garis label="Uraian kepentingan:" lebar="60%" />
            </div>
          </div>

          <JudulBag no="4" teks="Penanggung jawab (1 orang — data lengkap)" />
          <div className="space-y-[1.6mm]">
            <Garis label="Nama lengkap:" />
            <div className="flex flex-wrap items-center gap-[2mm]">
              <span style={h(7.5)}>NIK:</span>
              <Kotak jumlah={16} />
              <span style={h(7.5)}>L/P:</span>
              <Cek teks="L" />
              <Cek teks="P" />
            </div>
            <div className="flex flex-wrap items-center gap-[2mm]">
              <span style={h(7.5)}>WhatsApp:</span>
              <Kotak jumlah={13} />
              <Garis label="Tgl lahir:" lebar="36%" tinggi={5} />
            </div>
            <Garis label="Pekerjaan:" />
          </div>

          <JudulBag no="5" teks="Anggota penghuni lain (maks. 5) — centang KTP bila dilampirkan" />
          <table className="w-full border-collapse" style={{ ...h(7.5), marginTop: "1.2mm" }}>
            <thead>
              <tr>
                {["No", "Nama lengkap", "Kedudukan", "Fotokopi KTP"].map((col) => (
                  <th
                    key={col}
                    className="border border-black bg-black/5 px-[1mm] py-[0.9mm] text-left font-semibold"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((n) => (
                <tr key={n}>
                  <td className="border border-black text-center" style={{ width: "7.5mm", height: "7.8mm" }}>
                    {n}
                  </td>
                  <td className="border border-black" style={{ width: "38%" }} />
                  <td className="border border-black px-[1mm]" style={{ width: "40%" }}>
                    <span className="inline-flex flex-wrap gap-x-[1.8mm]">
                      <Cek teks="Istri" />
                      <Cek teks="Anak" />
                      <Cek teks="Famili" />
                    </span>
                  </td>
                  <td className="border border-black px-[1mm] text-center" style={{ width: "14%" }}>
                    <Cek teks="Ada" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...h(7), marginTop: "1.5mm", color: "#333", lineHeight: 1.35 }}>
            Wajib lampirkan: fotokopi KTP penanggung jawab + semua anggota dewasa. Anak tanpa KTP: fotokopi KK / akta /
            identitas lain.
          </p>
        </div>

        <div style={{ marginTop: "2.5mm" }}>
          <JudulBag no="6" teks="Lanjut ke surat pernyataan" />
          <p style={{ ...h(7.5), lineHeight: 1.4 }}>
            Setelah mengisi halaman ini, penanggung jawab wajib membaca dan menandatangani{" "}
            <b>Surat Pernyataan Kesepakatan Tata Tertib Bermasyarakat</b> pada halaman berikutnya. Data di atas dinyatakan
            benar; kontribusi Rp{KONTRIBUSI_TINGGAL_PER_BULAN.toLocaleString("id-ID")}/bulan.
          </p>
          <p className="text-center" style={{ ...h(6.5), marginTop: "2mm", color: "#444" }}>
            {SITUS_PENDEK}
            {VISITRW3_ROUTES.status} · {SITUS_PENDEK}
            {VISITRW3_ROUTES.formulir} · lanjut ke halaman 2 →
          </p>
        </div>
      </div>
    </LembarF4>
  );
}

function HalamanPernyataan() {
  const pasal = pasalPernyataanTinggal();
  return (
    <LembarF4 style={{ ...h(8), paddingBottom: 0, display: "flex", flexDirection: "column" }}>
      <KopHemat kecil />
      <div className="text-center" style={{ marginTop: "3mm", marginBottom: "0.5mm" }}>
        <p className="font-bold underline" style={h(11)}>
          SURAT PERNYATAAN KESEPAKATAN
        </p>
        <p className="font-bold" style={{ ...h(9), marginTop: "0.8mm" }}>
          TATA TERTIB BERMASYARAKAT — RW 03 PADASUKA
        </p>
        <p style={{ ...h(7), marginTop: "1mm", color: "#333" }}>
          Visit RW3 · versi {PERNYATAAN_TINGGAL_VERSI} · Halaman 2 dari 2 · A4
        </p>
      </div>

      <p style={{ ...h(8), marginTop: "3mm", textAlign: "justify", lineHeight: 1.42 }}>
        Saya, penanggung jawab penghuni yang data dirinya tercantum pada <b>formulir halaman 1</b>, dengan ini menyatakan
        secara sadar dan tanpa paksaan bahwa saya <b>sepakat mengikuti aturan wilayah RW 03</b>, mematuhi tata tertib
        bermasyarakat, dan <b>tidak melakukan serta tidak memfasilitasi hal-hal yang dilarang</b>. Surat ini menjadi dasar
        pengendalian pengurus RT/RW apabila terjadi kejadian atau laporan yang berkaitan dengan kesepakatan berikut:
      </p>

      <div style={{ ...h(7.5), marginTop: "2.5mm", lineHeight: 1.36, flex: 1 }}>
        {pasal.map((p, i) => (
          <section key={p.judul} className="jaga" style={{ marginTop: i ? "2.8mm" : "0.8mm" }}>
            <p className="text-center font-bold" style={{ ...h(8.5), marginBottom: "0.9mm" }}>
              Pasal {i + 1} — {p.judul}
            </p>
            <ol className="list-decimal pl-[5.5mm]" style={{ textAlign: "justify" }}>
              {p.ayat.map((a) => (
                <li key={a} style={{ marginBottom: "0.75mm" }}>
                  {a}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p style={{ ...h(7.5), marginTop: "2.5mm", textAlign: "justify", lineHeight: 1.4 }}>
        Demikian pernyataan ini saya buat untuk dipergunakan sebagaimana mestinya oleh pengurus RW 03.
      </p>

      <BlokTtdDuaKolom
        kiri={{ atas: "Penanggung jawab,", petunjuk: "tanda tangan & nama jelas" }}
        kanan={kolomKetuaRw({ atas: "Ketua RW 03," })}
        tinggiRuang="18mm"
        style={{ ...h(8), marginTop: "3.5mm" }}
      />

      <p className="text-center" style={{ ...h(6.5), marginTop: "2mm", color: "#444" }}>
        {SITUS_PENDEK}
        {VISITRW3_ROUTES.formulir} · serahkan bersama formulir halaman 1 + fotokopi KTP
      </p>
    </LembarF4>
  );
}

export default function Visitrw3Formulir() {
  return (
    <Visitrw3Shell title="Cetak formulir" backHref={VISITRW3_ROUTES.hub}>
      <GayaCetakA4 margin={MARGIN_A4} />
      <p className="mb-3 text-sm text-muted-foreground">
        Dua lembar <strong>A4 (210 × 297 mm, 75 gsm)</strong>: (1) formulir data; (2) surat pernyataan tata tertib.
        Hitam-putih, hemat tinta. Lampirkan <strong>fotokopi KTP semua anggota</strong>.
      </p>
      <div className="mb-3">
        <PanduanPrinter ukuran="a4" buka />
      </div>
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button type="button" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Cetak A4 (2 lembar)
        </Button>
        <Button type="button" variant="outline" className="gap-2" asChild>
          <Link href={VISITRW3_ROUTES.pengajuan}>
            <Smartphone className="h-4 w-4" /> Cadangan: isi online
          </Link>
        </Button>
      </div>
      <AreaCetak>
        <HalamanFormulir />
        <HalamanPernyataan />
      </AreaCetak>
    </Visitrw3Shell>
  );
}
