import { lazy, Suspense, useEffect, useState } from "react";
import { Redirect, Route, Switch, useSearch } from "wouter";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { aturRtKelola } from "@/lib/wilayah-api";
import { Memuat } from "@/components/wilayah/ui";
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

/** Cetak pindah ke Kependudukan › Rekap & cetak; tautan lama (Cetak QR di halaman keluarga) tetap jalan. */
function KeCetak({ rt }: { rt: number }) {
  const search = useSearch();
  return <Redirect to={`~/admin/kependudukan/rekap?tab=bahan&rt=${rt}${search ? `&${search}` : ""}`} replace />;
}

export default function KelolaWarga() {
  const qc = useQueryClient();
  const [rt, setRtState] = useState(rtAwal);
  // Diatur saat render agar permintaan pertama halaman anak sudah membawa X-Wilayah-Rt.
  aturRtKelola(rt);
  useEffect(
    () => () => {
      aturRtKelola(null);
      buangCacheWilayah(qc);
    },
    [qc],
  );

  const setRt = (n: number) => {
    if (n === rt) return;
    aturRtKelola(n);
    buangCacheWilayah(qc);
    localStorage.setItem(KUNCI_RT, String(n));
    setRtState(n);
  };

  return (
    <div className="mx-auto max-w-5xl text-sm text-gray-900">
      <RtKelolaContext.Provider value={{ rt, setRt }}>
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
