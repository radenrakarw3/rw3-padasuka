import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Printer, QrCode } from "lucide-react";
import { wil } from "@/lib/wilayah-api";
import { useRtjuaraAuth } from "@/lib/rtjuara-auth";
import { Judul, Memuat, Pesan, PilihTombol, TombolBesar, rt2 } from "@/components/wilayah/ui";
import { FAKTA_BY_KUNCI, FAKTA_FORM_KK, FAKTA_FORM_RUMAH, FAKTA_FORM_WARGA, FAKTA_FORM_USAHA, HUBUNGAN_KELUARGA } from "@shared/wilayah";
import logoBlack from "@assets/RW03-Cimahi-Logo-Black.svg";

interface Kartu { kkId: number; rt: number; kepala: string; alamatSingkat: string; kodeKartu: string; tokenTampil: string; url: string; qrSvg: string; berlakuSampai: string }

const SITUS = "rw3padasukacimahi.org/isi";

function Kop() {
  return (
    <div className="flex items-center gap-3 border-b-2 border-black pb-1">
      <img src={logoBlack} alt="" className="w-[14mm] h-[14mm]" />
      <div className="flex-1 text-center leading-tight">
        <p className="text-[11pt] font-bold">RUKUN WARGA 03</p>
        <p className="text-[9pt]">KELURAHAN PADASUKA · KECAMATAN CIMAHI TENGAH · KOTA CIMAHI</p>
      </div>
    </div>
  );
}

function KartuA5({ k, namaKetua }: { k: Kartu; namaKetua: string | null }) {
  return (
    <div className="kartu-a5 bg-white text-black px-[10mm] py-[7mm] flex flex-col">
      <Kop />
      <p className="text-center text-[13pt] font-bold mt-2">PEMBERITAHUAN PENDATAAN KELUARGA</p>
      <div className="flex gap-[6mm] mt-2 flex-1">
        <div className="flex-1 text-[10.5pt] leading-snug">
          <p>Kepada Yth.<br /><b className="text-[12pt]">Bapak/Ibu {k.kepala}</b></p>
          <p>{rt2(k.rt)} / RW 03 · {k.alamatSingkat}</p>
          <p className="mt-2">Mohon bantu memperbarui data keluarga untuk laporan RT dan pelayanan warga.</p>
          <ol className="mt-2 list-decimal pl-5 font-semibold">
            <li>Scan QR dengan kamera HP</li>
            <li>Isi pertanyaan</li>
            <li>Tekan Kirim</li>
          </ol>
          <p className="mt-2 text-[9.5pt]">Tanpa QR: buka <b>{SITUS}</b> lalu ketik kode:<br /><b className="text-[11pt] tracking-wider">{k.tokenTampil}</b></p>
          <p className="mt-1 text-[9pt]">Butuh bantuan? Hubungi Ketua {rt2(k.rt)}{namaKetua ? ` (${namaKetua})` : ""}. Bisa juga isi formulir kertas.</p>
        </div>
        <div className="w-[52mm] flex flex-col items-center">
          <div className="w-[50mm] h-[50mm]" dangerouslySetInnerHTML={{ __html: k.qrSvg }} />
          <p className="text-[8pt] mt-1">Kode kartu: <b>{k.kodeKartu}</b></p>
          <p className="text-[7.5pt]">Berlaku s.d. {new Date(k.berlakuSampai).toLocaleDateString("id-ID")}</p>
        </div>
      </div>
      <div className="flex justify-between items-end text-[9pt] mt-1">
        <p className="max-w-[60%] text-[7.5pt]">Kartu ini tidak berisi data pribadi. Jangan bagikan kode ke orang lain. Data lama tidak ditampilkan saat scan.</p>
        <div className="text-center">
          <p>Cimahi, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p>Ketua RW 03</p>
          <div className="h-[12mm]" />
          <p className="border-t border-black px-6">(.................................)</p>
        </div>
      </div>
    </div>
  );
}

function Kotak({ teks }: { teks: string }) {
  return <span className="inline-flex items-center gap-1 mr-3"><span className="inline-block w-[4mm] h-[4mm] border border-black" />{teks}</span>;
}

function PertanyaanKertas({ kunci }: { kunci: string }) {
  const def = FAKTA_BY_KUNCI.get(kunci);
  if (!def) return null;
  const pilihan = def.tipe === "yatidak" ? ["Ya", "Tidak"] : (def.pilihan ?? []).map((p) => p.label);
  return (
    <div className="mb-[2mm] break-inside-avoid">
      <p>{def.pertanyaan}</p>
      <p className="pl-2">{pilihan.map((p) => <Kotak key={p} teks={p} />)}<Kotak teks="Belum tahu" /></p>
    </div>
  );
}

/** Formulir kertas: pertanyaan dan pilihan sama persis dengan form digital (/isi). */
function FormulirKertas() {
  return (
    <div className="formulir bg-white text-black p-[12mm] text-[10pt] leading-snug">
      <Kop />
      <p className="text-center text-[13pt] font-bold my-2">FORMULIR PENDATAAN KELUARGA</p>
      <p>Kode kartu: ______________ &nbsp; Nama pengisi: ____________________ &nbsp; Hubungan: ______________</p>
      <p className="mb-2">Nomor HP (bukan NIK): ____________________</p>
      <p className="font-bold mt-3 mb-1">A. RUMAH TANGGA</p>
      <div className="columns-2 gap-[8mm]">{[...FAKTA_FORM_KK, ...FAKTA_FORM_RUMAH].map((k) => <PertanyaanKertas key={k} kunci={k} />)}</div>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="mt-3 border-t border-black pt-2 break-inside-avoid">
          <p className="font-bold">B{n}. ANGGOTA KELUARGA</p>
          <p>Nama: ______________________________ &nbsp; Tgl lahir: ____ / ____ / ________</p>
          <p>Hubungan: {HUBUNGAN_KELUARGA.slice(0, 6).map((h) => <Kotak key={h} teks={h} />)}</p>
          <p><Kotak teks="Laki-laki" /><Kotak teks="Perempuan" /> &nbsp; Keterangan: <Kotak teks="Tetap" /><Kotak teks="Baru" /><Kotak teks="Pindah" /><Kotak teks="Meninggal" /></p>
          <div className="columns-2 gap-[8mm] mt-1">{FAKTA_FORM_WARGA.map((k) => <PertanyaanKertas key={k} kunci={k} />)}</div>
          <p className="text-[8.5pt] italic">Kesehatan: isi “Ya” hanya bila sudah dinyatakan tenaga kesehatan.</p>
        </div>
      ))}
      <div className="mt-3 border-t border-black pt-2 break-inside-avoid">
        <p className="font-bold">C. USAHA (bila ada)</p>
        <p>Nama usaha: ________________________ &nbsp; Pemilik: ____________________</p>
        <div className="columns-2 gap-[8mm]">{FAKTA_FORM_USAHA.map((k) => <PertanyaanKertas key={k} kunci={k} />)}</div>
      </div>
      <p className="mt-3">Catatan: ____________________________________________________________</p>
      <p className="mt-4 text-[9pt]">Serahkan ke Ketua RT. Ketua RT akan memeriksa sebelum data resmi diubah.</p>
    </div>
  );
}

export default function Cetak() {
  const [, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const { sesi } = useRtjuaraAuth();
  const kkParam = params.get("kk");
  const [mode, setMode] = useState<"kartu" | "formulir">("kartu");
  const [kartu, setKartu] = useState<Kartu[] | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const muat = async (kkIds: number[] | "semua") => {
    setMemuat(true);
    setErr(null);
    try {
      setKartu(await wil<Kartu[]>("/api/wilayah/rt/qr/cetak", { body: { kkIds } }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setMemuat(false);
    }
  };
  useEffect(() => {
    if (kkParam) muat(kkParam.split(",").map(Number).filter((n) => n > 0));
  }, [kkParam]);
  useEffect(() => () => setKartu(null), []);

  const halaman: Kartu[][] = [];
  for (let i = 0; i < (kartu?.length ?? 0); i += 2) halaman.push(kartu!.slice(i, i + 2));

  return (
    <div>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        .lembar-a4 { width: 210mm; height: 297mm; display: flex; flex-direction: column; page-break-after: always; break-after: page; }
        .kartu-a5 { width: 210mm; height: 148.5mm; box-sizing: border-box; border-bottom: 1px dashed #999; overflow: hidden; }
        .kartu-a5 svg { width: 100%; height: 100%; }
        .formulir { width: 210mm; box-sizing: border-box; }
        @media screen { .lembar-a4, .formulir { transform-origin: top left; zoom: 0.45; margin-bottom: 8px; box-shadow: 0 0 0 1px #ddd; } }
        @media print { body * { visibility: hidden; } #area-cetak, #area-cetak * { visibility: visible; } #area-cetak { position: absolute; left: 0; top: 0; } }
      `}</style>
      <div className="print:hidden space-y-4">
        <Judul kembali={() => go("/rt")}>Cetak pemberitahuan</Judul>
        <PilihTombol label="Yang dicetak" belumTahu={false} nilai={mode} onChange={(v) => v && setMode(v as typeof mode)}
          pilihan={[{ nilai: "kartu", label: "Kartu QR" }, { nilai: "formulir", label: "Formulir kertas" }]} />
        {mode === "kartu" && (
          <>
            <Pesan>Satu lembar A4 berisi dua kartu A5. Potong di garis putus-putus. Kartu tidak memuat NIK atau nomor KK.</Pesan>
            {!kkParam && <TombolBesar ikon={<QrCode className="w-6 h-6" />} memuat={memuat} onClick={() => muat("semua")}>Siapkan semua keluarga</TombolBesar>}
            {memuat && <Memuat teks="Menyiapkan kartu…" />}
            {err && <Pesan jenis="error">{err}</Pesan>}
            {kartu && <TombolBesar ikon={<Printer className="w-6 h-6" />} onClick={() => window.print()}>Cetak {kartu.length} kartu ({halaman.length} lembar)</TombolBesar>}
          </>
        )}
        {mode === "formulir" && <TombolBesar ikon={<Printer className="w-6 h-6" />} onClick={() => window.print()}>Cetak formulir</TombolBesar>}
      </div>
      <div id="area-cetak" className="mt-4 overflow-x-auto">
        {mode === "kartu" && halaman.map((h, i) => (
          <div key={i} className="lembar-a4 bg-white">{h.map((k) => <KartuA5 key={k.kkId} k={k} namaKetua={sesi?.namaKetua ?? null} />)}</div>
        ))}
        {mode === "formulir" && <FormulirKertas />}
      </div>
    </div>
  );
}
