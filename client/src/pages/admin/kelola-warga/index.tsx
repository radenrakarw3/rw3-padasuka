import { lazy, Suspense, useEffect, useState } from "react";
import { Redirect, Route, Switch } from "wouter";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { aturRtKelola } from "@/lib/wilayah-api";
import { HIJAU, Memuat, rt2 } from "@/components/wilayah/ui";
import { WILAYAH_RT_NUMBERS } from "@shared/wilayah";
import { KELOLA_WARGA_PATH, KUNCI_RT_KELOLA as KUNCI_RT, RtKelolaContext } from "./konteks";

const Warga = lazy(() => import("./warga"));
const Keluarga = lazy(() => import("./keluarga"));
const Usulan = lazy(() => import("./usulan"));
const Cetak = lazy(() => import("./cetak"));
const Pindah = lazy(() => import("./pindah"));
const InputKertas = lazy(() => import("./input-kertas"));

function rtAwal(): number {
  const n = Number(localStorage.getItem(KUNCI_RT));
  return (WILAYAH_RT_NUMBERS as readonly number[]).includes(n) ? n : WILAYAH_RT_NUMBERS[0];
}

/** Cache /api/wilayah berisi data ber-scope RT; jangan terbawa ke RT lain atau ke dashboard RW. */
function buangCacheWilayah(qc: QueryClient) {
  qc.removeQueries({ predicate: (q) => String(q.queryKey[0] ?? "").startsWith("/api/wilayah") });
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
      <div className="mb-3 flex items-center gap-2 print:hidden">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kelola RT</span>
        <div className="grid flex-1 grid-cols-4 gap-1 rounded-xl border bg-white p-1 sm:flex-none" role="group" aria-label="Pilih RT">
          {WILAYAH_RT_NUMBERS.map((n) => (
            <button key={n} type="button" onClick={() => pilih(n)} aria-pressed={rt === n}
              className={`h-8 min-w-0 rounded-lg px-2 text-xs font-bold sm:min-w-[64px] ${rt === n ? "text-white" : "text-gray-700 hover:bg-gray-100"}`}
              style={rt === n ? { backgroundColor: HIJAU, borderColor: HIJAU } : undefined}>
              {rt2(n)}
            </button>
          ))}
        </div>
      </div>
      <RtKelolaContext.Provider value={rt}>
        <Suspense fallback={<Memuat />}>
          <Route path={KELOLA_WARGA_PATH} nest>
            <Switch key={rt}>
              <Route path="/warga" component={Warga} />
              <Route path="/keluarga/:id">{(p) => <Keluarga id={Number(p.id)} />}</Route>
              <Route path="/usulan/:id">{(p) => <Usulan id={Number(p.id)} />}</Route>
              <Route path="/usulan">{() => <Usulan />}</Route>
              <Route path="/cetak" component={Cetak} />
              <Route path="/pindah" component={Pindah} />
              <Route path="/input-kertas" component={InputKertas} />
              <Route>{() => <Redirect to="/warga" />}</Route>
            </Switch>
          </Route>
        </Suspense>
      </RtKelolaContext.Provider>
    </div>
  );
}
