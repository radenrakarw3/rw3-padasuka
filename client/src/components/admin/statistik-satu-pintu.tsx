import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertTriangle, Baby, Briefcase, GraduationCap, Home, Info, Lightbulb, RefreshCw, UserRound, Users, UserX, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPublicJson, getApiErrorMessage } from "@/lib/queryClient";
import { jalurKelolaRt } from "@/pages/admin/kelola-warga/konteks";
import type { AngkaWarga, StatistikWarga } from "@shared/statistik-warga";

const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";
export const STATISTIK_WARGA_KEY = ["/api/statistik-warga"] as const;

const rt2 = (rt: number) => `RT ${String(rt).padStart(2, "0")}`;
const angka = (n: number) => n.toLocaleString("id-ID");
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function Kotak({ ikon, label, nilai, sub, aksen = HIJAU }: { ikon: React.ReactNode; label: string; nilai: React.ReactNode; sub?: React.ReactNode; aksen?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: aksen }}>{ikon}</span>
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-gray-900">{nilai}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
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

export function useStatistikWarga() {
  return useQuery<StatistikWarga>({
    queryKey: STATISTIK_WARGA_KEY,
    queryFn: () => fetchPublicJson<StatistikWarga>("/api/statistik-warga", undefined, 120_000),
    staleTime: 60_000,
  });
}

/**
 * Satu sumber angka warga untuk Dashboard RW dan Kependudukan.
 * `rt` memfokuskan kartu ringkasan ke satu RT; tabel tetap menampilkan semua RT agar bisa dibandingkan.
 */
export function StatistikSatuPintu({ rt, onPilihRt }: { rt?: number; onPilihRt?: (rt: number | undefined) => void }) {
  const [, go] = useLocation();
  const { data, isLoading, error, refetch, isFetching } = useStatistikWarga();

  if (isLoading) {
    return <div className="grid gap-3 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}</div>;
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
  const sorotan = rt != null ? data.sorotan.filter((s) => s.rt == null || s.rt === rt) : data.sorotan;

  return (
    <section className="space-y-4 rounded-3xl border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold" style={{ color: HIJAU }}>Data warga satu pintu · {judulFokus}</h2>
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <Info className="h-3.5 w-3.5" />
            Angka sama di Dashboard & Kependudukan: KK RT 01–04, warga berstatus Aktif, umur dari tanggal lahir.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Perbarui
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kotak ikon={<Users className="h-4 w-4" />} label="Warga aktif" nilai={angka(fokus.warga)} sub={`♂ ${angka(fokus.lakiLaki)} · ♀ ${angka(fokus.perempuan)}`} />
        <Kotak ikon={<Home className="h-4 w-4" />} label="Kartu keluarga" nilai={angka(fokus.kk)} sub={`rata-rata ${fokus.rataAnggota} jiwa/KK`} />
        <Kotak ikon={<UserX className="h-4 w-4" />} label="Pengangguran" nilai={angka(fokus.pengangguran)} sub={`${fokus.tingkatPengangguran}% dari ${angka(fokus.angkatanKerjaEligible)} usia kerja`} aksen="hsl(350,70%,52%)" />
        <Kotak ikon={<Building2 className="h-4 w-4" />} label="Warga singgah (Visit RW3)" nilai={angka(fokus.singgah)} sub={`${fokus.izinSinggah} izin berlaku${fokus.izinSegeraHabis ? ` · ${fokus.izinSegeraHabis} habis ≤30 hari` : ""}`} aksen={EMAS} />
        <Kotak ikon={<Baby className="h-4 w-4" />} label="Balita (0–5)" nilai={angka(fokus.umur.balita)} sub={`${pct(fokus.umur.balita, fokus.warga)}% warga`} aksen={EMAS} />
        <Kotak ikon={<GraduationCap className="h-4 w-4" />} label="Anak & pelajar (6–18)" nilai={angka(fokus.umur.anak)} sub={`${pct(fokus.umur.anak, fokus.warga)}% warga`} aksen="hsl(200,60%,45%)" />
        <Kotak ikon={<Briefcase className="h-4 w-4" />} label="Usia produktif (19–64)" nilai={angka(fokus.umur.produktif)} sub={`${pct(fokus.umur.produktif, fokus.warga)}% warga`} />
        <Kotak ikon={<UserRound className="h-4 w-4" />} label="Lansia (65+)" nilai={angka(fokus.umur.lansia)} sub={`${fokus.kkLansiaSendiri} tinggal sendiri`} aksen="hsl(265,45%,55%)" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">RT</th>
              <th className="px-2 py-2 text-right">KK</th>
              <th className="px-2 py-2 text-right">Warga</th>
              <th className="px-2 py-2 text-right">Balita</th>
              <th className="px-2 py-2 text-right">Lansia</th>
              <th className="px-2 py-2 text-right">Nganggur</th>
              <th className="px-2 py-2 text-right" title="KK dengan satu anggota aktif berusia 65+">Lansia sendiri</th>
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

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-900"><Lightbulb className="h-4 w-4" />Sorotan untuk keputusan</h3>
        {sorotan.length === 0 ? <p className="text-sm text-gray-600">Tidak ada catatan khusus.</p> : (
          <ul className="space-y-1.5 text-sm">
            {sorotan.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${s.tingkat === "tinggi" ? "text-rose-600" : s.tingkat === "sedang" ? "text-amber-600" : "text-sky-600"}`} />
                <span>{s.teks}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
