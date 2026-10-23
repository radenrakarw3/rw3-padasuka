import { lazy, Suspense, useEffect, useState } from "react";
import { Redirect, Route, Switch, useLocation, useSearch } from "wouter";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ClipboardPen, Inbox, Users } from "lucide-react";
import { aturRtKelola } from "@/lib/wilayah-api";
import { useKotakMasuk } from "@/lib/kotak-masuk";
import { HIJAU, Memuat, rt2 } from "@/components/wilayah/ui";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { KELOLA_WARGA_PATH, KUNCI_RT_KELOLA as KUNCI_RT, RtKelolaContext } from "./konteks";

const Warga = lazy(() => import("./warga"));
const Keluarga = lazy(() => import("./keluarga"));
const Usulan = lazy(() => import("./usulan"));
const KotakMasuk = lazy(() => import("./kotak-masuk"));
const Pindah = lazy(() => import("./pindah"));
const InputKertas = lazy(() => import("./input-kertas"));

function rtAwal(): number {
  const n = Number(localStorage.getItem(KUNCI_RT));
  return (ACTIVE_RT_NUMBERS as readonly number[]).includes(n) ? n : ACTIVE_RT_NUMBERS[0];
}

/** Cache /api/wilayah berisi data ber-scope RT; jangan terbawa ke RT lain atau ke dashboard RW. */
function buangCacheWilayah(qc: QueryClient) {
  qc.removeQueries({ predicate: (q) => String(q.queryKey[0] ?? "").startsWith("/api/wilayah") });
}

const TAB = [
  { ke: "/warga", label: "Keluarga", Ikon: Users, aktif: ["/warga", "/keluarga"] },
  { ke: "/masuk", label: "Kotak masuk", Ikon: Inbox, aktif: ["/masuk", "/usulan", "/pindah"] },
  { ke: "/input-kertas", label: "Input kertas", Ikon: ClipboardPen, aktif: ["/input-kertas"] },
] as const;

function BilahTab({ rt }: { rt: number }) {
  const [lokasi, go] = useLocation();
  const { data } = useKotakMasuk();
  const sub = lokasi.slice(KELOLA_WARGA_PATH.length) || "/warga";
  const r = data?.perRt.find((x) => x.rt === rt);
  const menunggu = (r?.usulan ?? 0) + (r?.pindah ?? 0);
  return (
    <nav aria-label="Menu data warga" className="mb-3 grid grid-cols-3 gap-1 rounded-xl border bg-white p-1 print:hidden">
      {TAB.map(({ ke, label, Ikon, aktif }) => {
        const on = aktif.some((a) => sub === a || sub.startsWith(`${a}/`));
        return (
          <button key={ke} type="button" onClick={() => go(`${KELOLA_WARGA_PATH}${ke}`)} aria-current={on ? "page" : undefined}
            className={`relative flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold sm:text-sm ${on ? "text-white" : "text-gray-700 hover:bg-gray-100"}`}
            style={on ? { backgroundColor: HIJAU } : undefined}>
            <Ikon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
            {ke === "/masuk" && menunggu > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${on ? "bg-white/25 text-white" : "bg-red-600 text-white"}`}>{menunggu}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/** Cetak pindah ke Kependudukan › Rekap & cetak; tautan lama (Cetak QR di halaman keluarga) tetap jalan. */
function KeCetak({ rt }: { rt: number }) {
  const search = useSearch();
  return <Redirect to={`~/admin/kependudukan/rekap?tab=bahan&rt=${rt}${search ? `&${search}` : ""}`} replace />;
}

export default function KelolaWarga() {
  const qc = useQueryClient();
  const [rt, setRt] = useState(rtAwal);
  // Diatur saat render agar permintaan pertama halaman anak sudah membawa X-Wilayah-Rt.
  aturRtKelola(rt);
  useEffect(() => () => {
    aturRtKelola(null);
    buangCacheWilayah(qc);
  }, [qc]);

  const pilih = (n: number) => {
    if (n === rt) return;
    aturRtKelola(n);
    buangCacheWilayah(qc);
    localStorage.setItem(KUNCI_RT, String(n));
    setRt(n);
  };

  return (
    <div className="max-w-3xl text-sm text-gray-900">
      <div className="mb-2 flex items-center gap-2 print:hidden">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kelola RT</span>
        <div className="grid flex-1 grid-cols-4 gap-1 rounded-xl border bg-white p-1 sm:flex-none" role="group" aria-label="Pilih RT">
          {ACTIVE_RT_NUMBERS.map((n) => (
            <button key={n} type="button" onClick={() => pilih(n)} aria-pressed={rt === n}
              className={`h-8 min-w-0 rounded-lg px-2 text-xs font-bold sm:min-w-[64px] ${rt === n ? "text-white" : "text-gray-700 hover:bg-gray-100"}`}
              style={rt === n ? { backgroundColor: HIJAU, borderColor: HIJAU } : undefined}>
              {rt2(n)}
            </button>
          ))}
        </div>
      </div>
      <BilahTab rt={rt} />
      <RtKelolaContext.Provider value={rt}>
        <Suspense fallback={<Memuat />}>
          <Route path={KELOLA_WARGA_PATH} nest>
            <Switch key={rt}>
              <Route path="/warga" component={Warga} />
              <Route path="/keluarga/:id">{(p) => <Keluarga id={Number(p.id)} />}</Route>
              <Route path="/masuk" component={KotakMasuk} />
              <Route path="/usulan/:id">{(p) => <Usulan id={Number(p.id)} />}</Route>
              <Route path="/usulan">{() => <Redirect to="/masuk" replace />}</Route>
              <Route path="/pindah" component={Pindah} />
              <Route path="/input-kertas" component={InputKertas} />
              <Route path="/cetak">{() => <KeCetak rt={rt} />}</Route>
              <Route>{() => <Redirect to="/warga" />}</Route>
            </Switch>
          </Route>
        </Suspense>
      </RtKelolaContext.Provider>
    </div>
  );
}
