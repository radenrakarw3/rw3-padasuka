import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, RefreshCw, Users, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { KategoriUmurPanel, PekerjaanPanel, formatNumber } from "@/components/admin/kependudukan-stats-ui";
import {
  GovStatistic,
  GovStatisticRow,
  GovStatisticSection,
} from "@/components/gov/statistic";
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
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { isWargaTerhitung } from "@shared/statistik-warga";
import type { WargaIssueSlice } from "@shared/warga-data-issues";
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

export default function KependudukanRingkasan() {
  const [rtFilter, setRtFilter] = useState("semua");
  const rtFilterNum = rtFilter === "semua" ? undefined : Number(rtFilter);
  const statistik = useStatistikWarga();

  const { data: blusukanSummary } = useQuery<{
    avgKelengkapan: number;
    perluKunjungan: number;
    percentLengkap: number;
    totalKk: number;
  }>({
    queryKey: ["/api/admin/blusukan-summary", rtFilter],
    queryFn: async () => {
      const q = rtFilterNum ? `?rt=${rtFilterNum}` : "";
      const res = await fetch(`/api/admin/blusukan-summary${q}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat data Blusukan");
      return res.json();
    },
  });

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Statistik Kependudukan</h1>
          <p className="text-sm text-muted-foreground">RT 01–04 — data warga pemukiman RW 03</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={rtFilter} onValueChange={setRtFilter}>
            <SelectTrigger className="w-[140px]">
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
          <Button variant="outline" size="sm" onClick={refetchAll} disabled={isFetching}>
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

      <KependudukanCariWarga wargaList={wargaFiltered} />

      <KategoriUmurPanel warga={wargaAktif} />

      <PekerjaanPanel warga={wargaAktif} />

      {blusukanSummary && (
        <GovStatisticSection
          title="Sensus lapangan (Blusukan RW)"
          description="Kelengkapan data kependudukan — operasional lapangan"
        >
          <GovStatisticRow cols={4}>
            <GovStatistic
              label="Kelengkapan rata-rata"
              value={`${blusukanSummary.avgKelengkapan}%`}
              description="Form sensus per KK"
              icon={ClipboardList}
              tone="info"
            />
            <GovStatistic
              label="KK lengkap"
              value={`${blusukanSummary.percentLengkap}%`}
              description="Dari total KK pemukiman"
              icon={Home}
            />
            <GovStatistic
              label="Perlu kunjungan"
              value={formatNumber(blusukanSummary.perluKunjungan)}
              description="KK belum dikunjungi"
              icon={Users}
              tone="warning"
            />
            <GovStatistic
              label="Total KK"
              value={formatNumber(blusukanSummary.totalKk)}
              description="RT 01–04"
              icon={Home}
            />
          </GovStatisticRow>
          <Link href="/blusukanrw/quest" className="text-sm text-primary underline mt-2 inline-block">
            Buka Blusukan RW untuk operasional lapangan →
          </Link>
        </GovStatisticSection>
      )}

      <KependudukanDataIssues warga={wargaFiltered} />
    </div>
  );
}
