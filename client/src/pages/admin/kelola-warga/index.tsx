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
    <div className="max-w-2xl text-lg text-gray-900">
      <div className="mb-5 rounded-2xl border bg-white p-4 print:hidden">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kependudukan · Kelola data warga</p>
        <p className="mt-1 text-base text-gray-700">Pilih RT yang datanya ingin diubah. Setiap perubahan tercatat atas nama admin RW.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Pilih RT">
          {WILAYAH_RT_NUMBERS.map((n) => (
            <button key={n} type="button" onClick={() => pilih(n)} aria-pressed={rt === n}
              className={`min-h-[44px] min-w-[76px] rounded-xl border-2 px-3 text-base font-bold ${rt === n ? "text-white" : "bg-white border-gray-300"}`}
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
              <Route>{() => <Redirect to="/warga" />}</Route>
            </Switch>
          </Route>
        </Suspense>
      </RtKelolaContext.Provider>
    </div>
  );
}
