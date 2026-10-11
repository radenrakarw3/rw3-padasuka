import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, ChevronDown, ChevronRight, ClipboardList, Home, IdCard, PieChart, Settings2 } from "lucide-react";
import { StatistikSatuPintu } from "@/components/admin/statistik-satu-pintu";
import { DaftarWargaDialog } from "@/components/admin/daftar-warga-dialog";
import type { KategoriDaftar } from "@shared/statistik-warga";
import { GrafikWarga } from "@/components/admin/grafik-warga";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { wil } from "@/lib/wilayah-api";
import { rt2 } from "@/components/wilayah/ui";
import { KELOMPOK_STANDAR } from "@shared/wilayah";
import DataWarga from "./rw-data-warga";
import { jalurKelolaRt } from "./kelola-warga/konteks";

const RW = { peran: "rw" as const };
const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";

interface Perhatian { kunci: string; label: string; detail: string }
interface Ringkasan {
  total: { kk: number; warga: number; lakiLaki: number; perempuan: number; balita: number; anak: number; lansia: number; kelengkapan: number | null; kkPerhatian: number; kkBelumDiisi: number };
  perRt: { rt: number; kk: number; warga: number; kelengkapan: number | null; kkPerhatian: number; kkBelumDiisi: number; usulanMenunggu: number; pindahMenunggu: number }[];
  perhatian: { kunci: string; label: string; kk: number }[];
  prioritas: { id: number; rt: number; kepala: string | null; alamat: string; perhatian: Perhatian[] }[];
  sebaran: {
    kunci: string; subjek: "kk" | "warga"; kelompok: string; label: string; tipe?: string; terjawab: number; sasaran?: number;
    opsi: { nilai: string; label: string; jumlah: number; perhatian: boolean }[];
    angka?: { total: number; rata: number | null; median: number | null; min: number | null; maks: number | null } | null;
  }[];
  dasar?: {
    indeks: { label: string; nilai: string; ket: string }[];
    distribusi: { kunci: string; label: string; satuan: string; keterangan: string; opsi: { label: string; jumlah: number; perhatian?: boolean; kosong?: boolean }[] }[];
  };
}

const ABU = "hsl(0,0%,78%)";
const MERAH = "hsl(350,70%,58%)";
const fmt = (n: number | null | undefined) => (n == null ? "–" : n.toLocaleString("id-ID", { maximumFractionDigits: 1 }));
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** Satu grafik batang horizontal: tiap baris label, jumlah, persen. */
function GrafikBaris({ opsi, total }: { opsi: { label: string; jumlah: number; perhatian?: boolean; kosong?: boolean }[]; total: number }) {
  const maks = Math.max(1, ...opsi.map((o) => o.jumlah));
  return (
    <ul className="space-y-1.5">
      {opsi.map((o) => (
        <li key={o.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-xs">
          <span className={`truncate ${o.perhatian ? "text-rose-700" : o.kosong ? "italic text-gray-400" : "text-gray-600"}`}>{o.label}</span>
          <span className="text-right tabular-nums"><b>{fmt(o.jumlah)}</b><span className="ml-1 text-[11px] text-gray-400">{pct(o.jumlah, total)}%</span></span>
          <span className="col-span-2"><Batang persen={(o.jumlah / maks) * 100} warna={o.perhatian ? MERAH : o.kosong ? ABU : HIJAU} /></span>
        </li>
      ))}
    </ul>
  );
}

function KartuSebaran({ s }: { s: Ringkasan["sebaran"][number] }) {
  const sasaran = Math.max(s.sasaran ?? s.terjawab, s.terjawab);
  const belum = sasaran - s.terjawab;
  const satuan = s.subjek === "kk" ? "KK" : "orang";
  const cakupan = pct(s.terjawab, sasaran);
  const opsi = [
    ...s.opsi.map((o) => ({ label: o.label, jumlah: o.jumlah, perhatian: o.perhatian })),
    ...(belum > 0 ? [{ label: "Belum dijawab", jumlah: belum, kosong: true }] : []),
  ];
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="mb-1 flex justify-between gap-2">
        <p className="text-sm font-medium">{s.label}</p>
        <span className="shrink-0 text-xs text-gray-500">{fmt(s.terjawab)}/{fmt(sasaran)} {satuan}</span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex-1"><Batang persen={cakupan} warna={warnaPersen(cakupan)} /></div>
        <span className="text-[11px] tabular-nums text-gray-500">{cakupan}% terjawab</span>
      </div>
      {s.tipe === "angka" && s.angka && s.terjawab > 0 && (
        <div className="mb-2 grid grid-cols-4 gap-1 text-center">
          {[["Total", s.angka.total], ["Rata-rata", s.angka.rata], ["Median", s.angka.median], ["Maks", s.angka.maks]].map(([l, v]) => (
            <div key={l as string} className="rounded-lg bg-gray-50 px-1 py-1">
              <p className="text-[10px] text-gray-500">{l}</p>
              <p className="text-sm font-bold tabular-nums">{fmt(v as number | null)}</p>
            </div>
          ))}
        </div>
      )}
      <GrafikBaris opsi={opsi} total={sasaran} />
      {s.tipe === "banyak" && <p className="mt-1.5 text-[10px] text-gray-400">Boleh lebih dari satu jawaban; persen dihitung dari {satuan} sasaran.</p>}
    </div>
  );
}

function Stat({ ikon, label, nilai, sub, aksen = HIJAU, className = "", onClick }: { ikon: React.ReactNode; label: string; nilai: React.ReactNode; sub?: React.ReactNode; aksen?: string; className?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`${label}: lihat daftar`}
      className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-2.5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-4 ${className}`}>
      <div className="flex w-full min-w-0 items-start gap-1.5 text-[11px] leading-tight text-gray-500 sm:text-sm">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white sm:h-8 sm:w-8 [&_svg]:h-3.5 [&_svg]:w-3.5 sm:[&_svg]:h-4 sm:[&_svg]:w-4" style={{ backgroundColor: aksen }}>{ikon}</span>
        <span className="line-clamp-2 min-w-0 flex-1 break-words pt-0.5">{label}</span>
        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 transition group-hover:text-emerald-600" />
      </div>
      <p className="mt-1.5 truncate text-lg font-bold tabular-nums text-gray-900 sm:text-2xl">{nilai}</p>
      {sub && <div className="w-full min-w-0 break-words text-[11px] leading-snug text-gray-500 sm:text-xs">{sub}</div>}
    </button>
  );
}

function Batang({ persen, warna }: { persen: number; warna: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, persen))}%`, backgroundColor: warna }} />
    </div>
  );
}

/** Di HP bagian panjang bisa dilipat; di laptop (≥ lg) selalu terbuka. */
function Lipat({ judul, ikon, aksi, bukaAwal = false, children, className = "" }: {
  judul: React.ReactNode; ikon?: React.ReactNode; aksi?: React.ReactNode; bukaAwal?: boolean; children: React.ReactNode; className?: string;
}) {
  const [buka, setBuka] = useState(bukaAwal);
  return (
    <section className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setBuka(!buka)} aria-expanded={buka}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left font-semibold lg:pointer-events-none lg:min-h-0">
          {ikon}
          <span className="min-w-0">{judul}</span>
          <ChevronDown className={`ml-auto h-5 w-5 shrink-0 text-gray-400 transition-transform lg:hidden ${buka ? "rotate-180" : ""}`} />
        </button>
        {aksi && <div className={buka ? "w-full sm:w-auto" : "hidden w-full sm:w-auto lg:block"}>{aksi}</div>}
      </div>
      <div className={buka ? "mt-3" : "mt-3 hidden lg:block"}>{children}</div>
    </section>
  );
}

const warnaPersen = (p: number | null) => (p == null ? "#d1d5db" : p >= 80 ? "hsl(163,55%,32%)" : p >= 40 ? "hsl(38,85%,50%)" : "hsl(0,70%,56%)");

function RingkasanRw() {
  const [, go] = useLocation();
  const [kelompok, setKelompok] = useState<string>(KELOMPOK_STANDAR[0]);
  const [rtFokus, setRtFokus] = useState<number | undefined>();
  const [daftar, setDaftar] = useState<KategoriDaftar | null>(null);
  const { data, isLoading, error } = useQuery<Ringkasan>({ queryKey: ["/api/wilayah/rw/ringkasan"], queryFn: () => wil("/api/wilayah/rw/ringkasan", RW) });
  if (isLoading) return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}</div>;
  if (error || !data) return <p className="text-sm text-red-700">{(error as Error)?.message ?? "Gagal memuat"}</p>;
  if (!Array.isArray(data.sebaran) || !Array.isArray(data.perhatian) || !data.total) {
    return <p className="text-sm text-red-700">Server masih versi lama. Jalankan ulang server (atau tunggu deploy selesai), lalu muat ulang halaman.</p>;
  }
  const t = data.total;
  const kelompokAda = Array.from(new Set(data.sebaran.map((s) => s.kelompok)));
  const aktifKelompok = kelompokAda.includes(kelompok) ? kelompok : kelompokAda[0];
  const maksPerhatian = Math.max(1, ...data.perhatian.map((p) => p.kk));

  return (
    <div className="space-y-4 sm:space-y-6">
      <StatistikSatuPintu rt={rtFokus} onPilihRt={setRtFokus} />
      <GrafikWarga rt={rtFokus} onPilihRt={setRtFokus} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Kelengkapan standar data</h3>
        <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => go("/admin/kependudukan")}><BarChart3 className="mr-1.5 h-4 w-4" />Rincian di Kependudukan</Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <Stat onClick={() => setDaftar("belumDiisi")} ikon={<Home className="h-4 w-4" />} label="Keluarga belum diisi" nilai={t.kkBelumDiisi} sub={`dari ${t.kk} KK`} />
        <Stat onClick={() => setDaftar("kelengkapan")} ikon={<ClipboardList className="h-4 w-4" />} label="Kelengkapan data" nilai={t.kelengkapan == null ? "—" : `${t.kelengkapan}%`}
          sub={<span className="mt-1 block"><Batang persen={t.kelengkapan ?? 0} warna={warnaPersen(t.kelengkapan)} /></span>} />
        <Stat onClick={() => setDaftar("perhatian")} ikon={<AlertTriangle className="h-4 w-4" />} label="KK perlu perhatian" nilai={t.kkPerhatian} aksen="hsl(350,70%,52%)" sub="berdasar jawaban standar" className="col-span-2 sm:col-span-1" />
      </div>
      <DaftarWargaDialog kategori={daftar} rtAwal={rtFokus} onTutup={() => setDaftar(null)} />

      <Lipat judul={`Kelengkapan per RT (${data.perRt.length})`}>
        {data.perRt.length === 0 ? <p className="text-sm text-gray-500">Belum ada keluarga terdaftar.</p> : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
            {data.perRt.map((r) => (
              <div key={r.rt} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg px-2 py-0.5 text-sm font-bold text-white" style={{ backgroundColor: EMAS }}>{rt2(r.rt)}</span>
                  <span className="text-xs text-gray-500">{r.kk} KK · {r.warga} jiwa</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Kelengkapan</span>
                  <b>{r.kelengkapan == null ? "—" : `${r.kelengkapan}%`}</b>
                </div>
                <div className="mt-1"><Batang persen={r.kelengkapan ?? 0} warna={warnaPersen(r.kelengkapan)} /></div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {r.kkPerhatian > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-800">{r.kkPerhatian} perlu perhatian</span>}
                  {r.kkBelumDiisi > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{r.kkBelumDiisi} belum diisi</span>}
                  {r.usulanMenunggu > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{r.usulanMenunggu} isian QR</span>}
                  {r.pindahMenunggu > 0 && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-800">{r.pindahMenunggu} pindah</span>}
                </div>
                <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => go(jalurKelolaRt(r.rt, "/warga"))}>Kelola {rt2(r.rt)}</Button>
              </div>
            ))}
          </div>
        )}
      </Lipat>

      <div className="grid gap-4 lg:grid-cols-2">
        <Lipat className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4" ikon={<AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />} judul={`Hal yang perlu perhatian (${data.perhatian.length})`}>
          {data.perhatian.length === 0 ? <p className="text-sm text-gray-500">Belum ada. Muncul otomatis dari jawaban yang ditandai “perlu perhatian” di Standar data.</p> : (
            <ul className="space-y-2.5">
              {data.perhatian.map((p) => (
                <li key={p.kunci}>
                  <div className="mb-1 flex justify-between gap-2 text-sm"><span className="min-w-0">{p.label}</span><b className="shrink-0">{p.kk} KK</b></div>
                  <Batang persen={(p.kk / maksPerhatian) * 100} warna="hsl(350,70%,58%)" />
                </li>
              ))}
            </ul>
          )}
        </Lipat>
        <Lipat className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4" judul={`Keluarga prioritas (${data.prioritas.length})`}>
          {data.prioritas.length === 0 ? <p className="text-sm text-gray-500">Belum ada.</p> : (
            <ul className="max-h-80 divide-y overflow-y-auto">
              {data.prioritas.map((k) => (
                <li key={k.id} className="flex items-start gap-3 py-2">
                  <span className="mt-0.5 shrink-0 rounded-md px-1.5 text-[11px] font-bold text-white" style={{ backgroundColor: EMAS }}>{rt2(k.rt)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium sm:truncate">{k.kepala ?? "—"} <span className="font-normal text-gray-500">· {k.alamat}</span></p>
                    <div className="mt-1 flex flex-wrap gap-1">{k.perhatian.map((p) => <span key={p.kunci} className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-800">{p.label}: {p.detail}</span>)}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={() => go(jalurKelolaRt(k.rt, `/keluarga/${k.id}`))}>Buka</Button>
                </li>
              ))}
            </ul>
          )}
        </Lipat>
      </div>

      <Lipat className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4" ikon={<PieChart className="h-4 w-4 shrink-0" />} judul="Sebaran jawaban"
        aksi={<Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => go("/admin/standar-data")}><Settings2 className="mr-1.5 h-4 w-4" />Atur pertanyaan</Button>}>
        <div className="no-scrollbar -mx-3 mb-4 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {kelompokAda.map((k) => (
            <button key={k} type="button" onClick={() => setKelompok(k)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm sm:min-h-0 sm:px-3 sm:py-1 ${aktifKelompok === k ? "text-white" : "border border-gray-200 bg-white text-gray-700"}`}
              style={aktifKelompok === k ? { backgroundColor: HIJAU } : undefined}>{k}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {data.sebaran.filter((s) => s.kelompok === aktifKelompok).map((s) => <KartuSebaran key={s.kunci} s={s} />)}
        </div>
      </Lipat>

      {data.dasar && data.dasar.distribusi.length > 0 && (
        <Lipat className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4" ikon={<IdCard className="h-4 w-4 shrink-0" />} judul="Data dasar formulir warga & KK">
          <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {data.dasar.indeks.map((i) => (
              <div key={i.label} className="min-w-0 rounded-xl border border-gray-200 p-2.5">
                <p className="text-[11px] leading-tight text-gray-500">{i.label}</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums">{i.nilai}</p>
                <p className="text-[10px] leading-snug text-gray-400">{i.ket}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {data.dasar.distribusi.map((d) => {
              const total = d.opsi.reduce((s, o) => s + o.jumlah, 0);
              return (
                <div key={d.kunci} className="rounded-xl border border-gray-100 p-3">
                  <div className="mb-2 flex justify-between gap-2">
                    <p className="text-sm font-medium">{d.label}</p>
                    <span className="shrink-0 text-xs text-gray-500">{fmt(total)} {d.satuan} · {d.keterangan}</span>
                  </div>
                  <GrafikBaris opsi={d.opsi} total={total} />
                </div>
              );
            })}
          </div>
        </Lipat>
      )}
    </div>
  );
}

export default function RwDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold sm:text-2xl" style={{ color: HIJAU }}>Dashboard RW 03</h1>
      <Tabs defaultValue="ringkasan">
        <TabsList>
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="warga">Data Warga</TabsTrigger>
        </TabsList>
        <TabsContent value="ringkasan"><RingkasanRw /></TabsContent>
        <TabsContent value="warga"><DataWarga /></TabsContent>
      </Tabs>
    </div>
  );
}
