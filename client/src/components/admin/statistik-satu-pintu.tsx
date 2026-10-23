import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertTriangle, Baby, Briefcase, ChevronRight, GraduationCap, Home, Lightbulb, RefreshCw, UserRound, Users, UserX, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DaftarWargaDialog } from "@/components/admin/daftar-warga-dialog";
import type { KategoriDaftar } from "@shared/statistik-warga";
import { fetchPublicJson, getApiErrorMessage } from "@/lib/queryClient";
import { jalurKelolaRt } from "@/pages/admin/kelola-warga/konteks";
import type { AngkaWarga, StatistikWarga } from "@shared/statistik-warga";

const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";
export const STATISTIK_WARGA_KEY = ["/api/statistik-warga"] as const;

const rt2 = (rt: number) => `RT ${String(rt).padStart(2, "0")}`;
const angka = (n: number) => n.toLocaleString("id-ID");
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function Kotak({ ikon, label, nilai, sub, aksen = HIJAU, onClick }: { ikon: React.ReactNode; label: string; nilai: React.ReactNode; sub?: React.ReactNode; aksen?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`${label}: lihat daftar warga`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-2.5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-3.5">
      <div className="flex w-full min-w-0 items-start gap-1.5 text-[11px] leading-tight text-gray-500 sm:text-xs">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white sm:h-7 sm:w-7 [&_svg]:h-3.5 [&_svg]:w-3.5 sm:[&_svg]:h-4 sm:[&_svg]:w-4" style={{ backgroundColor: aksen }}>{ikon}</span>
        <span className="line-clamp-2 min-w-0 flex-1 break-words pt-0.5">{label}</span>
        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 transition group-hover:text-emerald-600" />
      </div>
      <p className="mt-1.5 truncate text-lg font-bold tabular-nums text-gray-900 sm:text-2xl">{nilai}</p>
      {sub && <p className="line-clamp-2 break-words text-[11px] leading-snug text-gray-500 sm:text-xs">{sub}</p>}
    </button>
  );
}

function Sel({ n, dari, waspada }: { n: number; dari?: number; waspada?: boolean }) {
  if (!n) return <td className="px-2 py-2 text-right text-gray-300">0</td>;
  return (
    <td className={`px-2 py-2 text-right tabular-nums ${waspada ? "font-semibold text-rose-700" : ""}`}>
      {angka(n)}
      {dari != null && <span className="ml-1 text-[11px] font-normal text-gray-400">{pct(n, dari)}%</span>}
    </td>
  );
}

type BarisRt = AngkaWarga & { rt: number };
type Indikator = {
  id: string;
  label: string;
  nilai: (r: AngkaWarga) => number;
  /** Teks di samping angka, mis. persentase dari warga RT. */
  sub?: (r: AngkaWarga) => string | null;
  satuan?: string;
  waspada?: boolean;
};

const INDIKATOR: Indikator[] = [
  { id: "warga", label: "Warga", nilai: (r) => r.warga, sub: (r) => `${angka(r.kk)} KK` },
  { id: "kk", label: "KK", nilai: (r) => r.kk, sub: (r) => `${r.rataAnggota} jiwa/KK` },
  { id: "balita", label: "Balita", nilai: (r) => r.umur.balita, sub: (r) => `${pct(r.umur.balita, r.warga)}% warga` },
  { id: "anak", label: "Pelajar 6–18", nilai: (r) => r.umur.anak, sub: (r) => `${pct(r.umur.anak, r.warga)}% warga` },
  { id: "lansia", label: "Lansia", nilai: (r) => r.umur.lansia, sub: (r) => `${pct(r.umur.lansia, r.warga)}% warga` },
  { id: "nganggur", label: "Pengangguran", nilai: (r) => r.tingkatPengangguran, satuan: "%", sub: (r) => `${angka(r.pengangguran)} orang`, waspada: true },
  { id: "lansiaSendiri", label: "Lansia sendiri", nilai: (r) => r.kkLansiaSendiri, sub: () => "KK", waspada: true },
  { id: "tanpaWa", label: "KK tanpa WA", nilai: (r) => r.kkTanpaWa, sub: (r) => `${pct(r.kkTanpaWa, r.kk)}% KK`, waspada: true },
  { id: "bansos", label: "KK bansos", nilai: (r) => r.kkBansos, sub: (r) => `${pct(r.kkBansos, r.kk)}% KK` },
  { id: "singgah", label: "Singgah", nilai: (r) => r.singgah, sub: (r) => (r.izinSinggah ? `${r.izinSinggah} izin` : null) },
  { id: "keluar", label: "Pindah/wafat", nilai: (r) => r.pindah + r.meninggal, sub: (r) => `${r.pindah} pindah · ${r.meninggal} wafat` },
];

/** Perbandingan antar-RT berbentuk grafik batang — satu indikator sekali tampil agar terbaca di HP. */
function BandingRt({ data, rt, onPilihRt }: { data: StatistikWarga; rt?: number; onPilihRt?: (rt: number | undefined) => void }) {
  const [, go] = useLocation();
  const [id, setId] = useState(INDIKATOR[0].id);
  const ind = INDIKATOR.find((i) => i.id === id) ?? INDIKATOR[0];
  const maks = Math.max(1, ...data.perRt.map((r) => ind.nilai(r)));
  const tertinggi = Math.max(...data.perRt.map((r) => ind.nilai(r)));
  const nilaiTotal = ind.nilai(data.total);

  const pilih = (r: BarisRt) => {
    if (onPilihRt) onPilihRt(rt === r.rt ? undefined : r.rt);
    else go(jalurKelolaRt(r.rt, "/warga"));
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4" data-testid="banding-rt">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Bandingkan RT</h3>
        <span className="text-xs text-gray-500">
          RW: <span className="font-semibold tabular-nums text-gray-800">{angka(nilaiTotal)}{ind.satuan ?? ""}</span>
        </span>
      </div>
      <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Pilih indikator">
        {INDIKATOR.map((i) => (
          <button
            key={i.id}
            type="button"
            aria-pressed={i.id === ind.id}
            onClick={() => setId(i.id)}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium sm:text-sm ${
              i.id === ind.id ? "border-transparent text-white" : "border-gray-200 bg-gray-50 text-gray-700"
            }`}
            style={i.id === ind.id ? { backgroundColor: HIJAU } : undefined}
          >
            {i.label}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {data.perRt.map((r) => {
          const n = ind.nilai(r);
          const fokus = rt === r.rt;
          const sorot = ind.waspada && n > 0 && n === tertinggi;
          const sub = ind.sub?.(r);
          return (
            <li key={r.rt}>
              <button
                type="button"
                onClick={() => pilih(r)}
                aria-pressed={onPilihRt ? fokus : undefined}
                className={`w-full rounded-xl border px-2.5 py-2 text-left transition-colors ${
                  fokus ? "border-emerald-400 bg-emerald-50/70" : "border-transparent hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: EMAS }}>{rt2(r.rt)}</span>
                  <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${(n / maks) * 100}%`, backgroundColor: sorot ? "hsl(350,70%,52%)" : HIJAU }}
                    />
                  </div>
                  <span className={`w-14 shrink-0 text-right text-sm font-semibold tabular-nums ${sorot ? "text-rose-700" : "text-gray-900"}`}>
                    {angka(n)}{ind.satuan ?? ""}
                  </span>
                </div>
                {sub && <p className="mt-0.5 pl-[3.25rem] text-[11px] text-gray-500">{sub}</p>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {data.perRt.map((r) => (
          <Button key={r.rt} size="sm" variant="outline" className="min-h-10 sm:min-h-9" onClick={() => go(jalurKelolaRt(r.rt, "/warga"))}>
            Kelola {rt2(r.rt)}
          </Button>
        ))}
      </div>
      {onPilihRt && <p className="mt-2 text-[11px] text-gray-500">Ketuk baris RT untuk memfokuskan kartu di atas.</p>}
    </div>
  );
}

export function useStatistikWarga() {
  return useQuery<StatistikWarga>({
    queryKey: STATISTIK_WARGA_KEY,
    queryFn: () => fetchPublicJson<StatistikWarga>("/api/statistik-warga", undefined, 120_000),
    staleTime: 60_000,
  });
}

/**
 * Satu sumber angka warga untuk Dashboard RW dan Kependudukan.
 * `rt` memfokuskan kartu ringkasan ke satu RT; grafik «Bandingkan RT» tetap menampilkan semua RT.
 */
const SOROTAN_RINGKAS = 3;

export function StatistikSatuPintu({ rt, onPilihRt }: { rt?: number; onPilihRt?: (rt: number | undefined) => void }) {
  const [, go] = useLocation();
  const [daftar, setDaftar] = useState<KategoriDaftar | null>(null);
  const [sorotanPenuh, setSorotanPenuh] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useStatistikWarga();

  if (isLoading) {
    return <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}</div>;
  }
  if (error || !data?.total) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {error ? getApiErrorMessage(error) : "Server masih versi lama. Jalankan ulang server lalu muat ulang halaman."}
      </div>
    );
  }

  const fokus: AngkaWarga = (rt != null && data.perRt.find((r) => r.rt === rt)) || data.total;
  const judulFokus = rt != null ? rt2(rt) : "RT 01–04";
  const bobot = (t: string) => (t === "tinggi" ? 0 : t === "sedang" ? 1 : 2);
  const sorotan = (rt != null ? data.sorotan.filter((s) => s.rt == null || s.rt === rt) : data.sorotan)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => bobot(a.s.tingkat) - bobot(b.s.tingkat) || a.i - b.i)
    .map(({ s }) => s);

  return (
    <section className="space-y-4 rounded-3xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 pt-1 text-base font-bold sm:text-lg" style={{ color: HIJAU }}>Data warga · {judulFokus}</h2>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => refetch()} disabled={isFetching} aria-label="Perbarui">
          <RefreshCw className={`h-4 w-4 sm:mr-1.5 ${isFetching ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Perbarui</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Kotak onClick={() => setDaftar("warga")} ikon={<Users className="h-4 w-4" />} label="Warga aktif" nilai={angka(fokus.warga)} sub={`♂ ${angka(fokus.lakiLaki)} · ♀ ${angka(fokus.perempuan)}`} />
        <Kotak onClick={() => setDaftar("kk")} ikon={<Home className="h-4 w-4" />} label="Kartu keluarga" nilai={angka(fokus.kk)} sub={`rata-rata ${fokus.rataAnggota} jiwa/KK`} />
        <Kotak onClick={() => setDaftar("pengangguran")} ikon={<UserX className="h-4 w-4" />} label="Pengangguran" nilai={angka(fokus.pengangguran)} sub={`${fokus.tingkatPengangguran}% dari ${angka(fokus.angkatanKerjaEligible)} usia kerja`} aksen="hsl(350,70%,52%)" />
        <Kotak onClick={() => setDaftar("singgah")} ikon={<Building2 className="h-4 w-4" />} label="Warga singgah (Visit RW3)" nilai={angka(fokus.singgah)} sub={`${fokus.izinSinggah} izin berlaku${fokus.izinSegeraHabis ? ` · ${fokus.izinSegeraHabis} habis ≤30 hari` : ""}`} aksen={EMAS} />
        <Kotak onClick={() => setDaftar("balita")} ikon={<Baby className="h-4 w-4" />} label="Balita (0–5)" nilai={angka(fokus.umur.balita)} sub={`${pct(fokus.umur.balita, fokus.warga)}% warga`} aksen={EMAS} />
        <Kotak onClick={() => setDaftar("anak")} ikon={<GraduationCap className="h-4 w-4" />} label="Anak & pelajar (6–18)" nilai={angka(fokus.umur.anak)} sub={`${pct(fokus.umur.anak, fokus.warga)}% warga`} aksen="hsl(200,60%,45%)" />
        <Kotak onClick={() => setDaftar("produktif")} ikon={<Briefcase className="h-4 w-4" />} label="Usia produktif (19–59)" nilai={angka(fokus.umur.produktif)} sub={`${pct(fokus.umur.produktif, fokus.warga)}% warga`} />
        <Kotak onClick={() => setDaftar("lansia")} ikon={<UserRound className="h-4 w-4" />} label="Lansia (60+)" nilai={angka(fokus.umur.lansia)} sub={`${fokus.kkLansiaSendiri} tinggal sendiri`} aksen="hsl(265,45%,55%)" />
      </div>
      <DaftarWargaDialog kategori={daftar} rtAwal={rt} onTutup={() => setDaftar(null)} />

      <BandingRt data={data} rt={rt} onPilihRt={onPilihRt} />

      <details className="hidden rounded-2xl border border-gray-200 bg-white lg:block">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700">Tabel lengkap per RT</summary>
      <div className="overflow-x-auto border-t border-gray-200">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">RT</th>
              <th className="px-2 py-2 text-right">KK</th>
              <th className="px-2 py-2 text-right">Warga</th>
              <th className="px-2 py-2 text-right">Balita</th>
              <th className="px-2 py-2 text-right">Lansia</th>
              <th className="px-2 py-2 text-right">Nganggur</th>
              <th className="px-2 py-2 text-right" title="KK dengan satu anggota aktif berusia 60+">Lansia sendiri</th>
              <th className="px-2 py-2 text-right">KK tanpa WA</th>
              <th className="px-2 py-2 text-right">Usia kosong</th>
              <th className="px-2 py-2 text-right" title="Tidak dihitung sebagai warga aktif">Pindah / wafat</th>
              <th className="px-2 py-2 text-right">Singgah</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.perRt.map((r) => (
              <tr key={r.rt} className={rt === r.rt ? "bg-emerald-50/70" : onPilihRt ? "cursor-pointer hover:bg-gray-50" : ""}
                onClick={onPilihRt ? () => onPilihRt(rt === r.rt ? undefined : r.rt) : undefined}>
                <td className="px-3 py-2"><span className="rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: EMAS }}>{rt2(r.rt)}</span></td>
                <Sel n={r.kk} />
                <Sel n={r.warga} />
                <Sel n={r.umur.balita} dari={r.warga} />
                <Sel n={r.umur.lansia} dari={r.warga} />
                <td className={`px-2 py-2 text-right tabular-nums ${r.tingkatPengangguran > data.total.tingkatPengangguran ? "font-semibold text-rose-700" : ""}`}>
                  {angka(r.pengangguran)}<span className="ml-1 text-[11px] font-normal text-gray-400">{r.tingkatPengangguran}%</span>
                </td>
                <Sel n={r.kkLansiaSendiri} waspada />
                <Sel n={r.kkTanpaWa} waspada />
                <Sel n={r.umur.belum} waspada />
                <td className="px-2 py-2 text-right text-gray-500 tabular-nums">{r.pindah + r.meninggal ? `${r.pindah} / ${r.meninggal}` : <span className="text-gray-300">0</span>}</td>
                <Sel n={r.singgah} />
                <td className="px-2 py-1 text-right">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); go(jalurKelolaRt(r.rt, "/warga")); }}>Kelola</Button>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-3 py-2">Total</td>
              <Sel n={data.total.kk} />
              <Sel n={data.total.warga} />
              <Sel n={data.total.umur.balita} dari={data.total.warga} />
              <Sel n={data.total.umur.lansia} dari={data.total.warga} />
              <td className="px-2 py-2 text-right tabular-nums">{angka(data.total.pengangguran)}<span className="ml-1 text-[11px] font-normal text-gray-400">{data.total.tingkatPengangguran}%</span></td>
              <Sel n={data.total.kkLansiaSendiri} />
              <Sel n={data.total.kkTanpaWa} />
              <Sel n={data.total.umur.belum} />
              <td className="px-2 py-2 text-right tabular-nums">{data.total.pindah} / {data.total.meninggal}</td>
              <Sel n={data.total.singgah} />
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      </details>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 sm:p-4">
        <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-amber-900 sm:mb-2 sm:text-base">
          <Lightbulb className="h-4 w-4" />Sorotan untuk keputusan
          {sorotan.length > 0 && <span className="ml-auto rounded-full bg-amber-100 px-2 text-xs font-medium">{sorotan.length}</span>}
        </h3>
        {sorotan.length === 0 ? <p className="text-xs text-gray-600 sm:text-sm">Tidak ada catatan khusus.</p> : (
          <>
            <ul className="space-y-1 text-xs leading-snug sm:space-y-1.5 sm:text-sm">
              {sorotan.map((s, i) => (
                <li key={i} className={`items-start gap-1.5 sm:gap-2 ${!sorotanPenuh && i >= SOROTAN_RINGKAS ? "hidden sm:flex" : "flex"}`}>
                  <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${s.tingkat === "tinggi" ? "text-rose-600" : s.tingkat === "sedang" ? "text-amber-600" : "text-sky-600"}`} />
                  <span>{s.teks}</span>
                </li>
              ))}
            </ul>
            {sorotan.length > SOROTAN_RINGKAS && (
              <button type="button" onClick={() => setSorotanPenuh((v) => !v)} className="mt-1.5 text-xs font-semibold text-amber-800 underline sm:hidden">
                {sorotanPenuh ? "Ringkas" : `Lihat ${sorotan.length - SOROTAN_RINGKAS} lainnya`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
