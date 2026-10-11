import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, ClipboardList, Home, PieChart, Settings2 } from "lucide-react";
import { StatistikSatuPintu } from "@/components/admin/statistik-satu-pintu";
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
  sebaran: { kunci: string; subjek: "kk" | "warga"; kelompok: string; label: string; terjawab: number; opsi: { nilai: string; label: string; jumlah: number; perhatian: boolean }[] }[];
}

function Stat({ ikon, label, nilai, sub, aksen = HIJAU }: { ikon: React.ReactNode; label: string; nilai: React.ReactNode; sub?: React.ReactNode; aksen?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: aksen }}>{ikon}</span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{nilai}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function Batang({ persen, warna }: { persen: number; warna: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, persen))}%`, backgroundColor: warna }} />
    </div>
  );
}

const warnaPersen = (p: number | null) => (p == null ? "#d1d5db" : p >= 80 ? "hsl(163,55%,32%)" : p >= 40 ? "hsl(38,85%,50%)" : "hsl(0,70%,56%)");

function RingkasanRw() {
  const [, go] = useLocation();
  const [kelompok, setKelompok] = useState<string>(KELOMPOK_STANDAR[0]);
  const { data, isLoading, error } = useQuery<Ringkasan>({ queryKey: ["/api/wilayah/rw/ringkasan"], queryFn: () => wil("/api/wilayah/rw/ringkasan", RW) });
  if (isLoading) return <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}</div>;
  if (error || !data) return <p className="text-sm text-red-700">{(error as Error)?.message ?? "Gagal memuat"}</p>;
  if (!Array.isArray(data.sebaran) || !Array.isArray(data.perhatian) || !data.total) {
    return <p className="text-sm text-red-700">Server masih versi lama. Jalankan ulang server (atau tunggu deploy selesai), lalu muat ulang halaman.</p>;
  }
  const t = data.total;
  const kelompokAda = Array.from(new Set(data.sebaran.map((s) => s.kelompok)));
  const aktifKelompok = kelompokAda.includes(kelompok) ? kelompok : kelompokAda[0];
  const maksPerhatian = Math.max(1, ...data.perhatian.map((p) => p.kk));

  return (
    <div className="space-y-6">
      <StatistikSatuPintu />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Kelengkapan standar data</h3>
        <Button size="sm" variant="outline" onClick={() => go("/admin/kependudukan")}><BarChart3 className="mr-1.5 h-4 w-4" />Rincian di Kependudukan</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat ikon={<Home className="h-4 w-4" />} label="Keluarga belum diisi" nilai={t.kkBelumDiisi} sub={`dari ${t.kk} KK`} />
        <Stat ikon={<ClipboardList className="h-4 w-4" />} label="Kelengkapan data" nilai={t.kelengkapan == null ? "—" : `${t.kelengkapan}%`}
          sub={<span className="mt-1 block"><Batang persen={t.kelengkapan ?? 0} warna={warnaPersen(t.kelengkapan)} /></span>} />
        <Stat ikon={<AlertTriangle className="h-4 w-4" />} label="KK perlu perhatian" nilai={t.kkPerhatian} aksen="hsl(350,70%,52%)" sub="berdasar jawaban standar" />
      </div>

      <section>
        <h3 className="mb-3 font-semibold">Kelengkapan per RT</h3>
        {data.perRt.length === 0 ? <p className="text-sm text-gray-500">Belum ada keluarga terdaftar.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.perRt.map((r) => (
              <div key={r.rt} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-rose-500" />Hal yang perlu perhatian</h3>
          {data.perhatian.length === 0 ? <p className="text-sm text-gray-500">Belum ada. Muncul otomatis dari jawaban yang ditandai “perlu perhatian” di Standar data.</p> : (
            <ul className="space-y-2.5">
              {data.perhatian.map((p) => (
                <li key={p.kunci}>
                  <div className="mb-1 flex justify-between text-sm"><span>{p.label}</span><b>{p.kk} KK</b></div>
                  <Batang persen={(p.kk / maksPerhatian) * 100} warna="hsl(350,70%,58%)" />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Keluarga prioritas</h3>
          {data.prioritas.length === 0 ? <p className="text-sm text-gray-500">Belum ada.</p> : (
            <ul className="max-h-80 divide-y overflow-y-auto">
              {data.prioritas.map((k) => (
                <li key={k.id} className="flex items-start gap-3 py-2">
                  <span className="mt-0.5 rounded-md px-1.5 text-[11px] font-bold text-white" style={{ backgroundColor: EMAS }}>{rt2(k.rt)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{k.kepala ?? "—"} <span className="font-normal text-gray-500">· {k.alamat}</span></p>
                    <div className="mt-1 flex flex-wrap gap-1">{k.perhatian.map((p) => <span key={p.kunci} className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-800">{p.label}: {p.detail}</span>)}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => go(jalurKelolaRt(k.rt, `/keluarga/${k.id}`))}>Buka</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold"><PieChart className="h-4 w-4" />Sebaran jawaban</h3>
          <Button size="sm" variant="outline" onClick={() => go("/admin/standar-data")}><Settings2 className="mr-1.5 h-4 w-4" />Atur pertanyaan</Button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {kelompokAda.map((k) => (
            <button key={k} type="button" onClick={() => setKelompok(k)}
              className={`rounded-full px-3 py-1 text-sm ${aktifKelompok === k ? "text-white" : "border border-gray-200 bg-white text-gray-700"}`}
              style={aktifKelompok === k ? { backgroundColor: HIJAU } : undefined}>{k}</button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {data.sebaran.filter((s) => s.kelompok === aktifKelompok).map((s) => {
            const maks = Math.max(1, ...s.opsi.map((o) => o.jumlah));
            return (
              <div key={s.kunci} className="rounded-xl border border-gray-100 p-3">
                <div className="mb-2 flex justify-between gap-2">
                  <p className="text-sm font-medium">{s.label}</p>
                  <span className="shrink-0 text-xs text-gray-500">{s.terjawab} {s.subjek === "kk" ? "KK" : "orang"} menjawab</span>
                </div>
                <ul className="space-y-1.5">
                  {s.opsi.map((o) => (
                    <li key={o.nilai} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-xs">
                      <span className={`truncate ${o.perhatian ? "text-rose-700" : "text-gray-600"}`}>{o.label}</span>
                      <b className="text-right">{o.jumlah}</b>
                      <span className="col-span-2"><Batang persen={(o.jumlah / maks) * 100} warna={o.perhatian ? "hsl(350,70%,58%)" : HIJAU} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function RwDashboard() {
  const [, go] = useLocation();
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: HIJAU }}>Dashboard RW 03</h1>
          <p className="text-sm text-muted-foreground">Gambaran warga menurut standar data RW 03. Data diubah di Kependudukan.</p>
        </div>
        <Button variant="outline" onClick={() => go("/admin/standar-data")}><Settings2 className="mr-2 h-4 w-4" />Standar data</Button>
      </div>
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
