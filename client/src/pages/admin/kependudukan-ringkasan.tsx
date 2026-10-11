import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import {
  KategoriUmurPanel,
  PekerjaanPanel,
  formatNumber,
} from "@/components/admin/kependudukan-stats-ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KependudukanDataIssues } from "@/components/admin/kependudukan-data-issues";
import { KependudukanCariWarga } from "@/components/admin/kependudukan-cari-warga";
import { StatistikSatuPintu, useStatistikWarga } from "@/components/admin/statistik-satu-pintu";
import { GrafikWarga } from "@/components/admin/grafik-warga";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { isWargaTerhitung } from "@shared/statistik-warga";
import { buildWargaDataIssueReport, type WargaIssueSlice } from "@shared/warga-data-issues";
import { fetchPublicJson, getApiErrorMessage } from "@/lib/queryClient";

type WargaWithKk = WargaIssueSlice & {
  pekerjaan: string | null;
  statusPekerjaan?: string | null;
  kategoriUmur?: string | null;
  nomorWhatsapp?: string | null;
  nomorKk: string;
  alamat: string;
  jenisKelamin?: string | null;
  statusKependudukan?: string | null;
};

type BagianId = "cari" | "umur" | "pekerjaan" | "verifikasi";
const SEMUA_BAGIAN: BagianId[] = ["cari", "umur", "pekerjaan", "verifikasi"];

/** Di laptop semua bagian terbuka seperti semula; di HP hanya pencarian agar halaman tidak memanjang. */
function bagianAwal(): string[] {
  if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) return SEMUA_BAGIAN;
  return ["cari"];
}

export default function KependudukanRingkasan() {
  const [rtFilter, setRtFilter] = useState("semua");
  const [terbuka, setTerbuka] = useState<string[]>(bagianAwal);
  const rtFilterNum = rtFilter === "semua" ? undefined : Number(rtFilter);
  const statistik = useStatistikWarga();

  const {
    data: wargaList,
    isLoading: wargaLoading,
    isError: wargaError,
    error,
    refetch: refetchWarga,
    isFetching: wargaFetching,
  } = useQuery({
    queryKey: ["/api/warga-with-kk"],
    queryFn: () => fetchPublicJson<WargaWithKk[]>("/api/warga-with-kk", undefined, 120_000),
    staleTime: 60_000,
    retry: 1,
  });

  const wargaFiltered = useMemo(() => {
    if (!wargaList?.length) return [];
    return rtFilterNum === undefined ? wargaList : wargaList.filter((w) => w.rt === rtFilterNum);
  }, [wargaList, rtFilterNum]);

  const wargaAktif = useMemo(() => wargaFiltered.filter(isWargaTerhitung), [wargaFiltered]);
  const jumlahPerluVerifikasi = useMemo(
    () => buildWargaDataIssueReport(wargaFiltered).totalBermasalah,
    [wargaFiltered],
  );

  const refetchAll = () => {
    statistik.refetch();
    refetchWarga();
  };
  const isFetching = statistik.isFetching || wargaFetching;

  if (wargaLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Statistik Kependudukan</h1>
          <p className="text-sm text-muted-foreground">RT 01–04 — data warga pemukiman RW 03</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={rtFilter} onValueChange={setRtFilter}>
            <SelectTrigger className="min-w-0 flex-1 sm:w-[140px] sm:flex-none" aria-label="Filter RT">
              <SelectValue placeholder="Filter RT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua RT</SelectItem>
              {ACTIVE_RT_NUMBERS.map((rt) => (
                <SelectItem key={rt} value={String(rt)}>
                  RT {String(rt).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-12 shrink-0 sm:h-auto" size="sm" onClick={refetchAll} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {wargaError && (
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat data warga</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{getApiErrorMessage(error)}</span>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={refetchAll}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <StatistikSatuPintu
        rt={rtFilterNum}
        onPilihRt={(rt) => setRtFilter(rt == null ? "semua" : String(rt))}
      />
      <GrafikWarga rt={rtFilterNum} onPilihRt={(rt) => setRtFilter(rt == null ? "semua" : String(rt))} />

      <Accordion type="multiple" value={terbuka} onValueChange={setTerbuka} className="space-y-3">
        <BagianLipat value="cari" judul="Cari warga" ringkas="Nama, NIK, nomor KK, atau alamat">
          <KependudukanCariWarga wargaList={wargaFiltered} polos />
        </BagianLipat>

        <BagianLipat value="umur" judul="Kategori umur" ringkas={`${formatNumber(wargaAktif.length)} warga aktif`}>
          <KategoriUmurPanel warga={wargaAktif} polos />
        </BagianLipat>

        <BagianLipat value="pekerjaan" judul="Pekerjaan" ringkas="Angkatan kerja, pelajar, pengangguran">
          <PekerjaanPanel warga={wargaAktif} polos />
        </BagianLipat>

        <BagianLipat
          value="verifikasi"
          judul="Verifikasi data"
          ringkas={jumlahPerluVerifikasi > 0 ? `${formatNumber(jumlahPerluVerifikasi)} warga perlu dicek` : "Semua data selaras"}
          sorot={jumlahPerluVerifikasi > 0}
        >
          <KependudukanDataIssues warga={wargaFiltered} polos />
        </BagianLipat>
      </Accordion>
    </div>
  );
}

function BagianLipat({
  value,
  judul,
  ringkas,
  sorot,
  children,
}: {
  value: BagianId;
  judul: string;
  ringkas?: string;
  sorot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-2xl border bg-card/60 px-3 sm:px-4">
      <AccordionTrigger className="min-h-14 gap-3 py-3 text-left hover:no-underline">
        <span className="min-w-0">
          <span className="block text-sm font-semibold uppercase tracking-wide text-brand">{judul}</span>
          {ringkas && (
            <span className={`mt-0.5 block text-sm font-normal ${sorot ? "text-amber-700" : "text-muted-foreground"}`}>{ringkas}</span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}
