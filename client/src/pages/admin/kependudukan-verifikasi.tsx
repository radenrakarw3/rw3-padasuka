import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { KependudukanDataIssues } from "@/components/admin/kependudukan-data-issues";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { isWargaTerhitung } from "@shared/statistik-warga";
import {
  buildVerifikasiReport,
  type VerifikasiKelengkapanSlice,
} from "@shared/verifikasi-kelengkapan";
import { fetchPublicJson, getApiErrorMessage } from "@/lib/queryClient";
import { formatNumber } from "@/components/admin/kependudukan-stats-ui";

type WargaWithKk = VerifikasiKelengkapanSlice & {
  nomorKk: string;
  alamat: string;
};

/** Halaman mandiri: hanya warga aktif yang datanya perlu diperbaiki. */
export default function KependudukanVerifikasi() {
  const [rtFilter, setRtFilter] = useState("semua");
  const rtFilterNum = rtFilter === "semua" ? undefined : Number(rtFilter);

  const {
    data: wargaList,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["/api/warga-with-kk"],
    queryFn: () => fetchPublicJson<WargaWithKk[]>("/api/warga-with-kk", undefined, 120_000),
    staleTime: 60_000,
    retry: 1,
  });

  const wargaAktif = useMemo(() => {
    if (!wargaList?.length) return [];
    const aktif = wargaList.filter(isWargaTerhitung);
    return rtFilterNum === undefined ? aktif : aktif.filter((w) => w.rt === rtFilterNum);
  }, [wargaList, rtFilterNum]);

  const ringkas = useMemo(() => buildVerifikasiReport(wargaAktif), [wargaAktif]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground" asChild>
            <Link href="/admin/kependudukan">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Ringkasan warga
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Verifikasi data</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Master data pribadi dan keluarga yang belum lengkap. Perbaiki langsung atau hubungi warga
            1-per-1. Data yang sudah lengkap tidak ditampilkan.
          </p>
          <p className="text-sm font-medium text-amber-800">
            {ringkas.totalPerlu > 0
              ? `${formatNumber(ringkas.totalPerlu)} warga perlu dicek · kelengkapan rata-rata ${ringkas.rataPribadi}%`
              : "Semua data warga aktif sudah lengkap untuk filter ini"}
          </p>
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
          <Button
            variant="outline"
            className="h-12 shrink-0 sm:h-auto"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat data warga</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{getApiErrorMessage(error)}</span>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isError && <KependudukanDataIssues warga={wargaAktif} rtFilter={rtFilterNum} />}
    </div>
  );
}
