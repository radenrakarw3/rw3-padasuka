import { useState, type ReactNode } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, ClipboardList, FileText, Home, IdCard, Mail, Printer, QrCode, Store, Sticker, Users } from "lucide-react";
import { AreaCetak, GayaCetakF4, PanduanPrinter } from "@/components/cetak/lembar-f4";
import { FormulirSinggah, type JenisFormSinggah } from "@/components/cetak/formulir-singgah";
import { LembarStiker, POSTER, PosterQr, type JenisPoster } from "@/components/cetak/poster-qr";

const HIJAU = "hsl(163,55%,22%)";

type Item = { id: string; judul: string; ket: string; ikon: ReactNode; ke?: string };
const GRUP: { judul: string; items: Item[] }[] = [
  {
    judul: "Data keluarga (Kependudukan)",
    items: [
      { id: "paket", judul: "Paket per KK", ket: "Surat pemberitahuan + QR di depan, formulir terisi di belakang. Warga cukup mengoreksi.", ikon: <Mail />, ke: "/admin/kelola-warga/cetak?mode=paket" },
      { id: "kartu", judul: "Kartu QR keluarga", ket: "2 kartu per lembar F4, potong tengah.", ikon: <QrCode />, ke: "/admin/kelola-warga/cetak?mode=kartu" },
      { id: "kosong", judul: "Formulir keluarga kosong", ket: "Untuk keluarga baru / belum tercatat.", ikon: <FileText />, ke: "/admin/kelola-warga/cetak?mode=kosong" },
      { id: "rekap", judul: "Rekap keliling per RT", ket: "Daftar KK + kolom diantar/kembali untuk pengurus.", ikon: <ClipboardList />, ke: "/admin/kelola-warga/cetak?mode=rekap" },
    ],
  },
  {
    judul: "Warga singgah & usaha",
    items: [
      { id: "form-kost", judul: "Formulir warga kost", ket: "Kosong, sama dengan isian Visit RW3 (kost).", ikon: <IdCard /> },
      { id: "form-kontrak", judul: "Formulir warga kontrakan", ket: "Kosong, sama dengan isian Visit RW3 (kontrakan).", ikon: <Home /> },
      { id: "form-usaha", judul: "Formulir pendaftaran usaha", ket: "Kosong, sama dengan isian RW3 Biz.", ikon: <Store /> },
    ],
  },
  {
    judul: "Poster & stiker QR",
    items: [
      { id: "poster", judul: "Poster QR (1 per lembar)", ket: "Tempel di pintu kost, kontrakan, warung, atau pos RW.", ikon: <Printer /> },
      { id: "stiker", judul: "Stiker QR (6 per lembar)", ket: "Potong dan tempel di tiap pintu/kamar.", ikon: <Sticker /> },
    ],
  },
  {
    judul: "Surat",
    items: [{ id: "surat", judul: "Surat RW (Surat Sakti)", ket: "Semua surat RW terbit dalam ukuran F4. Buka surat, lalu Lihat/Unduh PDF.", ikon: <Users />, ke: "/admin/surat-rw" }],
  },
];

const FORM: Record<string, JenisFormSinggah> = { "form-kost": "kost", "form-kontrak": "kontrak", "form-usaha": "jualan" };

function Pratinjau({ item, kembali }: { item: string; kembali: () => void }) {
  const [jenisPoster, setJenisPoster] = useState<JenisPoster>("kost");
  const [kontak, setKontak] = useState("");
  const [jumlah, setJumlah] = useState(1);
  const form = FORM[item];
  const judul = GRUP.flatMap((g) => g.items).find((i) => i.id === item)?.judul ?? "Cetak";
  return (
    <div>
      <GayaCetakF4 />
      <div className="print:hidden space-y-4">
        <button type="button" onClick={kembali} className="inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:underline sm:min-h-0"><ArrowLeft className="h-4 w-4" /> Pusat cetak</button>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: HIJAU }}>{judul}</h1>
        {(item === "poster" || item === "stiker") && (
          <div className="grid grid-cols-1 gap-3 rounded-2xl border bg-white p-3 sm:grid-cols-2 sm:p-4">
            <div>
              <p className="mb-1 text-sm font-semibold">Untuk</p>
              <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
                {(Object.keys(POSTER) as JenisPoster[]).map((j) => (
                  <button key={j} type="button" onClick={() => setJenisPoster(j)}
                    className={`min-h-10 shrink-0 rounded-full border px-4 text-sm sm:min-h-0 sm:px-3 sm:py-1.5 ${jenisPoster === j ? "text-white" : "bg-white"}`}
                    style={jenisPoster === j ? { backgroundColor: HIJAU, borderColor: HIJAU } : undefined}>
                    {POSTER[j].judul.charAt(0) + POSTER[j].judul.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            {item === "poster" && (
              <label className="block space-y-1">
                <span className="text-sm font-semibold">Kontak bantuan (boleh kosong)</span>
                <input value={kontak} onChange={(e) => setKontak(e.target.value)} placeholder="mis. Sekretariat RW 0812-xxxx-xxxx" inputMode="tel" className="min-h-12 w-full rounded-xl border px-3 text-base sm:min-h-0 sm:py-2 sm:text-sm" />
              </label>
            )}
          </div>
        )}
        {form && (
          <label className="flex flex-wrap items-center gap-2 text-sm">
            Jumlah lembar:
            <input type="number" min={1} max={50} value={jumlah} onChange={(e) => setJumlah(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} inputMode="numeric" className="min-h-12 w-24 rounded-lg border px-3 text-base sm:min-h-0 sm:w-20 sm:px-2 sm:py-1 sm:text-sm" />
            <span className="text-muted-foreground">(atau atur "Salinan" di dialog cetak)</span>
          </label>
        )}
        <PanduanPrinter />
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-lg font-semibold text-white shadow sm:w-auto" style={{ backgroundColor: HIJAU }}>
          <Printer className="h-6 w-6" /> Cetak
        </button>
      </div>
      <AreaCetak>
        {form && Array.from({ length: jumlah }).map((_, i) => <FormulirSinggah key={i} jenis={form} />)}
        {item === "poster" && <PosterQr jenis={jenisPoster} kontak={kontak} />}
        {item === "stiker" && <LembarStiker jenis={jenisPoster} />}
      </AreaCetak>
    </div>
  );
}

export default function PusatCetak() {
  const [, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const item = params.get("item");
  if (item && (FORM[item] || item === "poster" || item === "stiker")) return <Pratinjau item={item} kembali={() => go("/admin/pusat-cetak")} />;

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl" style={{ color: HIJAU }}>Pusat cetak F4</h1>
      {GRUP.map((g) => (
        <section key={g.judul}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{g.judul}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {g.items.map((it) => (
              <button key={it.id} type="button" onClick={() => go(it.ke ?? `/admin/pusat-cetak?item=${it.id}`)}
                className="group flex min-w-0 items-start gap-3 rounded-2xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white [&>svg]:h-5 [&>svg]:w-5" style={{ backgroundColor: HIJAU }}>{it.ikon}</span>
                <span className="min-w-0">
                  <span className="block font-semibold">{it.judul}</span>
                  <span className="block text-sm text-muted-foreground">{it.ket}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
