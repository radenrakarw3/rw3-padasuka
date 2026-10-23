import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearch } from "wouter";
import { ClipboardList, FileText, Printer, QrCode } from "lucide-react";
import { wil } from "@/lib/wilayah-api";
import { useRtKelola } from "./konteks";
import { Judul, Memuat, Pesan, PilihTombol, TombolBesar, rt2 } from "@/components/wilayah/ui";
import { isoTanggal } from "@shared/wilayah";
import { useStandar } from "@/lib/standar";
import { AlirF4, AreaCetak, GayaCetakF4, ISI_H, KopHemat, LembarF4, PanduanPrinter } from "@/components/cetak/lembar-f4";
import { FormulirKeluarga, KartuQr, SuratPemberitahuan, type PaketKk } from "@/components/cetak/formulir-keluarga";

type Mode = "paket" | "kartu" | "kosong" | "rekap";
const KARTU_PER_LEMBAR = 3;
/** Kartu dipotong, jadi margin cukup batas minimal printer (Epson L3210 ±3 mm). */
const MARGIN_KARTU = 5;
const MODE: { nilai: Mode; label: string }[] = [
  { nilai: "paket", label: "Paket per KK (surat + formulir terisi)" },
  { nilai: "kartu", label: "Kartu QR (3 per lembar)" },
  { nilai: "kosong", label: "Formulir kosong" },
  { nilai: "rekap", label: "Rekap keliling RT" },
];
const KETERANGAN: Record<Mode, string> = {
  paket: "Depan: surat pemberitahuan + QR. Belakang: formulir yang sudah terisi data kami, warga cukup mengoreksi. Cetak bolak-balik manual.",
  kartu: "Satu lembar F4 berisi tiga kartu QR. Potong di garis putus-putus. Kartu tidak memuat NIK atau nomor KK.",
  kosong: "Untuk keluarga baru atau yang belum tercatat. Pertanyaan sama persis dengan formulir QR.",
  rekap: "Daftar KK untuk pengurus keliling: catat kapan surat diantar dan formulir kembali.",
};

function tambahHari(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoTanggal(d);
}

/** Paket per KK. Halaman tiap KK digenapkan agar cetak bolak-balik manual tidak bergeser antar-keluarga. */
function DaftarPaket({ paket, batas, kontak }: { paket: PaketKk[]; batas: string; kontak: string }) {
  const { data: standar } = useStandar();
  const acuan = useRef<HTMLDivElement>(null);
  const isi = useRef<(HTMLDivElement | null)[]>([]);
  const [ganjil, setGanjil] = useState<Set<number>>(new Set());
  useLayoutEffect(() => {
    const tinggi = acuan.current?.offsetHeight ?? 0;
    if (!tinggi) return;
    const s = new Set<number>();
    paket.forEach((p, i) => {
      const h = isi.current[i]?.offsetHeight ?? 0;
      const halamanForm = Math.max(1, Math.ceil(h / (tinggi * 0.94)));
      if ((1 + halamanForm) % 2 === 1) s.add(p.kkId);
    });
    setGanjil(s);
  }, [paket, standar]);
  if (!standar) return <Memuat />;
  return (
    <>
      <div className="alir-f4 print:hidden" aria-hidden style={{ position: "absolute", visibility: "hidden", pointerEvents: "none" }}>
        <div ref={acuan} style={{ height: `${ISI_H}mm` }} />
      </div>
      {paket.map((p, i) => (
        <Fragment key={p.kkId}>
          <SuratPemberitahuan p={p} batas={batas} kontak={kontak} />
          <FormulirKeluarga ref={(el) => { isi.current[i] = el; }} defs={standar} paket={p} />
          {ganjil.has(p.kkId) && <LembarF4><p style={{ margin: "auto", fontSize: "8pt", color: "#999" }}>(halaman sengaja kosong)</p></LembarF4>}
        </Fragment>
      ))}
    </>
  );
}

function Rekap({ paket, rt }: { paket: PaketKk[]; rt: number | null }) {
  const sel = { border: "1px solid #000", padding: "1.2mm 1.5mm", verticalAlign: "top" } as const;
  return (
    <AlirF4>
      <KopHemat kecil />
      <p style={{ fontSize: "13pt", fontWeight: 700, marginTop: "2mm" }}>REKAP KELILING PENDATAAN · {rt2(rt)} / RW 03</p>
      <p style={{ fontSize: "9pt" }}>Dicetak {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · {paket.length} KK · Petugas: ..............................</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", marginTop: "2mm" }}>
        <thead style={{ display: "table-header-group" }}>
          <tr style={{ fontWeight: 700 }}>
            <td style={{ ...sel, width: "7mm" }}>No</td><td style={sel}>Kepala keluarga</td><td style={sel}>Alamat</td><td style={{ ...sel, width: "22mm" }}>Kode kartu</td>
            <td style={{ ...sel, width: "11mm" }}>Data</td><td style={{ ...sel, width: "20mm" }}>Diantar (tgl/paraf)</td><td style={{ ...sel, width: "20mm" }}>Kembali (tgl/paraf)</td><td style={{ ...sel, width: "24mm" }}>Catatan</td>
          </tr>
        </thead>
        <tbody>
          {paket.map((p, i) => (
            <tr key={p.kkId} className="jaga">
              <td style={sel}>{i + 1}</td><td style={sel}>{p.kepala}</td><td style={sel}>{p.alamatSingkat}</td><td style={sel}>{p.kodeKartu}</td>
              <td style={sel}>{Math.round(p.kelengkapan * 100)}%</td><td style={sel} /><td style={sel} /><td style={sel} />
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: "8pt", marginTop: "2mm" }}>Kolom "Data" = kelengkapan data saat dicetak. Formulir yang kembali diinput di Kependudukan › Data warga & KK › Input kertas.</p>
    </AlirF4>
  );
}

export default function Cetak() {
  const params = new URLSearchParams(useSearch());
  const rtKelola = useRtKelola();
  const kkParam = params.get("kk");
  const modeAwal = (params.get("mode") as Mode | null) ?? (kkParam ? "paket" : "paket");
  const [mode, setMode] = useState<Mode>(MODE.some((m) => m.nilai === modeAwal) ? modeAwal : "paket");
  const [paket, setPaket] = useState<PaketKk[] | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [batas, setBatas] = useState(tambahHari(14));
  const [kontak, setKontak] = useState("");
  const { data: standar } = useStandar();

  const muat = async (kkIds: number[] | "semua") => {
    setMemuat(true);
    setErr(null);
    try {
      setPaket(await wil<PaketKk[]>("/api/wilayah/rt/cetak/paket", { body: { kkIds } }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setMemuat(false);
    }
  };
  useEffect(() => {
    if (kkParam) muat(kkParam.split(",").map(Number).filter((n) => n > 0));
  }, [kkParam]);
  useEffect(() => () => setPaket(null), []);

  const butuhData = mode !== "kosong";
  const halamanKartu: PaketKk[][] = [];
  for (let i = 0; i < (paket?.length ?? 0); i += KARTU_PER_LEMBAR) halamanKartu.push(paket!.slice(i, i + KARTU_PER_LEMBAR));
  const siap = butuhData ? !!paket : !!standar;
  const label = mode === "paket" ? `Cetak paket ${paket?.length ?? 0} KK` : mode === "kartu" ? `Cetak ${paket?.length ?? 0} kartu (${halamanKartu.length} lembar)` : mode === "rekap" ? "Cetak rekap" : "Cetak formulir kosong";

  return (
    <div>
      <GayaCetakF4 margin={mode === "kartu" ? MARGIN_KARTU : undefined} />
      <div className="print:hidden space-y-4">
        <Judul sub={`${rt2(rtKelola)} · kertas F4`}>Bahan pendataan untuk warga</Judul>
        <PilihTombol label="Yang dicetak" belumTahu={false} nilai={mode} onChange={(v) => v && setMode(v as Mode)} pilihan={MODE} kolom={1} />
        <Pesan>{KETERANGAN[mode]}</Pesan>
        {mode === "paket" && (
          <div className="grid grid-cols-1 gap-3 rounded-2xl border bg-white p-3 text-base sm:grid-cols-2 sm:p-4">
            <label className="block space-y-1">
              <span className="block text-sm font-semibold">Kembalikan formulir paling lambat</span>
              <input type="date" value={batas} onChange={(e) => setBatas(e.target.value)} className="min-h-12 w-full rounded-xl border px-3 py-2 sm:min-h-0" />
            </label>
            <label className="block space-y-1">
              <span className="block text-sm font-semibold">Kontak bantuan (boleh kosong)</span>
              <input value={kontak} onChange={(e) => setKontak(e.target.value)} placeholder="mis. Pak RT 0812-xxxx-xxxx" className="min-h-12 w-full rounded-xl border px-3 py-2 sm:min-h-0" />
            </label>
          </div>
        )}
        <PanduanPrinter bolakBalik={mode === "paket"} />
        {butuhData && !kkParam && (
          <TombolBesar ikon={mode === "rekap" ? <ClipboardList className="w-6 h-6" /> : mode === "kartu" ? <QrCode className="w-6 h-6" /> : <FileText className="w-6 h-6" />} memuat={memuat} onClick={() => muat("semua")}>
            Siapkan semua keluarga {rt2(rtKelola)}
          </TombolBesar>
        )}
        {memuat && <Memuat teks="Menyiapkan bahan cetak…" />}
        {err && <Pesan jenis="error">{err}</Pesan>}
        {paket && paket.length === 0 && butuhData && <Pesan jenis="peringatan">Belum ada KK di {rt2(rtKelola)}.</Pesan>}
        {siap && (!butuhData || (paket && paket.length > 0)) && (
          <TombolBesar ikon={<Printer className="w-6 h-6" />} onClick={() => window.print()}>{label}</TombolBesar>
        )}
      </div>
      <AreaCetak>
        {mode === "paket" && paket && <DaftarPaket paket={paket} batas={batas} kontak={kontak} />}
        {mode === "kartu" && halamanKartu.map((h, i) => (
          <LembarF4 key={i}>
            {h.map((k, j) => (
              <div key={k.kkId} style={{ height: `${100 / KARTU_PER_LEMBAR}%`, flexShrink: 0, boxSizing: "border-box", borderBottom: j < KARTU_PER_LEMBAR - 1 ? "1px dashed #000" : undefined }}>
                <KartuQr k={k} />
              </div>
            ))}
          </LembarF4>
        ))}
        {mode === "kosong" && standar && <FormulirKeluarga defs={standar} />}
        {mode === "rekap" && paket && <Rekap paket={paket} rt={rtKelola} />}
      </AreaCetak>
    </div>
  );
}
