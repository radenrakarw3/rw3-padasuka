import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, Percent, RefreshCw, UserX, Users, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { KategoriUmurPanel, PekerjaanPanel, formatNumber } from "@/components/admin/kependudukan-stats-ui";
import {
  GovStatistic,
  GovStatisticRow,
  GovStatisticSection,
} from "@/components/gov/statistic";
import type { KependudukanStats } from "@/components/admin/kependudukan-types";
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
import { PENGANGGURAN_KETERANGAN } from "@shared/pekerjaan-labor";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { countPengangguranWarga, type WargaIssueSlice } from "@shared/warga-data-issues";
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

type KkRow = { id: number; rt: number };

function enrichKkStats(
  stats: KependudukanStats,
  wargaRows: WargaWithKk[],
  kkRows: KkRow[] | undefined,
  rtFilter: string,
): KependudukanStats {
  const scopedRt = rtFilter === "semua" ? undefined : Number(rtFilter);
  const kkFromApi = (kkRows ?? []).filter((k) =>
    scopedRt === undefined ? true : k.rt === scopedRt,
  );

  let totalKk = stats.totalKk;
  let perRt = stats.perRt ?? [];

  if (kkFromApi.length > 0) {
    totalKk = kkFromApi.length;
    perRt = [...ACTIVE_RT_NUMBERS].map((rt) => {
      const existing = perRt.find((p) => p.rt === rt);
      return {
        rt,
        warga:
          existing?.warga ??
          wargaRows.filter((w) => w.rt === rt).length,
        kk: kkRows!.filter((k) => k.rt === rt).length,
      };
    });
  } else if (totalKk === 0 && wargaRows.length > 0) {
    const kkIds = new Set(wargaRows.map((w) => w.kkId));
    totalKk = kkIds.size;
    perRt = [...ACTIVE_RT_NUMBERS].map((rt) => {
      const rowsRt = wargaRows.filter((w) => w.rt === rt);
      const kkIdsRt = new Set(rowsRt.map((w) => w.kkId));
      const existing = perRt.find((p) => p.rt === rt);
      return {
        rt,
        warga: existing?.warga ?? rowsRt.length,
        kk: kkIdsRt.size,
      };
    });
  } else if (totalKk === 0) {
    const kkFromPerRt = perRt.reduce((sum, p) => sum + (p.kk ?? 0), 0);
    if (kkFromPerRt > 0) totalKk = kkFromPerRt;
  }

  const totalWarga =
    scopedRt === undefined
      ? stats.totalWarga
      : wargaRows.filter((w) => w.rt === scopedRt).length;
  const rataRataAnggotaPerKk =
    totalKk > 0 ? Math.round((totalWarga / totalKk) * 10) / 10 : 0;

  return {
    ...stats,
    totalKk,
    rataRataAnggotaPerKk,
    perRt,
  };
}

function normalizeStats(raw: unknown): KependudukanStats | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.totalWarga === "number") {
    const p = (r.pengangguran as Record<string, unknown> | undefined) ?? {};
    const pekerjaanRaw = r.pekerjaan as Record<string, unknown> | undefined;
    const perRtRaw = (r.perRt as { rt: number; warga: number; kk?: number }[]) ?? [];
    const perRtMapped = perRtRaw.map((x) => ({
      rt: x.rt,
      warga: x.warga,
      kk: x.kk ?? 0,
    }));
    const kkFromPerRt = perRtMapped.reduce((sum, p) => sum + p.kk, 0);
    const totalKk =
      typeof r.totalKk === "number" && r.totalKk > 0 ? r.totalKk : kkFromPerRt;
    const rataRataAnggotaPerKk =
      typeof r.rataRataAnggotaPerKk === "number" && r.rataRataAnggotaPerKk > 0
        ? r.rataRataAnggotaPerKk
        : totalKk > 0
          ? Math.round((r.totalWarga / totalKk) * 10) / 10
          : 0;
    return {
      generatedAt: String(r.generatedAt ?? new Date().toISOString()),
      rtFilter: typeof r.rtFilter === "number" ? r.rtFilter : undefined,
      totalWarga: r.totalWarga,
      totalKk,
      rataRataAnggotaPerKk,
      kelompokUsia: (r.kelompokUsia as Record<string, number>) ?? {},
      perRt: perRtMapped,
      pengangguran: {
        total: Number(p.total ?? 0),
        ratePercent: Number(p.ratePercent ?? 0),
      },
      pekerjaan: {
        distribusi: (pekerjaanRaw?.distribusi as Record<string, number>) ?? {},
      },
    };
  }

  const legacy = r.legacy as Record<string, unknown> | undefined;
  const totals = r.totals as { warga?: number } | undefined;
  if (!legacy) return null;

  const legacyPeng = legacy.pengangguran as Record<string, unknown> | undefined;
  const totalWarga = totals?.warga ?? (legacy.totalWarga as number) ?? 0;
  const pengTotal = Number(legacyPeng?.total ?? 0);

  const perRtLegacy = ((legacy.perRt as { rt: number; warga: number; kk?: number }[]) ?? []).map(
    (x) => ({
      rt: x.rt,
      warga: x.warga,
      kk: x.kk ?? 0,
    }),
  );

  return {
    generatedAt: String(r.generatedAt ?? new Date().toISOString()),
    rtFilter: typeof r.rtFilter === "number" ? r.rtFilter : undefined,
    totalWarga,
    totalKk: 0,
    rataRataAnggotaPerKk: 0,
    kelompokUsia: (legacy.kelompokUsia as Record<string, number>) ?? {},
    perRt: perRtLegacy,
    pengangguran: {
      total: pengTotal,
      ratePercent: totalWarga > 0 ? Math.round((pengTotal / totalWarga) * 100) : 0,
    },
    pekerjaan: { distribusi: {} },
  };
}

export default function KependudukanRingkasan() {
  const [rtFilter, setRtFilter] = useState("semua");
  const rtFilterNum = rtFilter === "semua" ? undefined : Number(rtFilter);

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
    data: rawData,
    isLoading: statsLoading,
    isError,
    error,
    refetch: refetchStats,
    isFetching: statsFetching,
    isPending: statsPending,
  } = useQuery({
    queryKey: ["/api/stats/kependudukan", rtFilter],
    queryFn: async () => {
      const q = rtFilter === "semua" ? "" : `?rt=${encodeURIComponent(rtFilter)}`;
      return fetchPublicJson<unknown>(`/api/stats/kependudukan${q}`, undefined, 120_000);
    },
    staleTime: 60_000,
    retry: 1,
  });

  const {
    data: wargaList,
    isLoading: wargaLoading,
    isError: wargaError,
    refetch: refetchWarga,
    isFetching: wargaFetching,
  } = useQuery({
    queryKey: ["/api/warga-with-kk"],
    queryFn: () => fetchPublicJson<WargaWithKk[]>("/api/warga-with-kk", undefined, 120_000),
    staleTime: 60_000,
    retry: 1,
  });

  const {
    data: kkList,
    isLoading: kkLoading,
    refetch: refetchKk,
    isFetching: kkFetching,
  } = useQuery({
    queryKey: ["/api/kk"],
    queryFn: () => fetchPublicJson<KkRow[]>("/api/kk", undefined, 120_000),
    staleTime: 60_000,
    retry: 1,
  });

  const data = useMemo(() => normalizeStats(rawData), [rawData]);

  const wargaFiltered = useMemo(() => {
    if (!wargaList?.length) return [];
    return rtFilter === "semua" ? wargaList : wargaList.filter((w) => w.rt === Number(rtFilter));
  }, [wargaList, rtFilter]);

  const pengangguran = useMemo(() => {
    const { total, eligible } = countPengangguranWarga(wargaFiltered);
    return {
      total,
      ratePercent: eligible > 0 ? Math.round((total / eligible) * 100) : 0,
    };
  }, [wargaFiltered]);

  const displayStats = useMemo(() => {
    if (!data) return null;
    return enrichKkStats(data, wargaFiltered, kkList, rtFilter);
  }, [data, wargaFiltered, kkList, rtFilter]);

  const refetchAll = () => {
    refetchStats();
    refetchWarga();
    refetchKk();
  };

  const showLoading = statsPending || statsLoading || wargaLoading || kkLoading;
  const isFetching = statsFetching || wargaFetching || kkFetching;

  if (showLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
              {[1, 2, 3, 4].map((rt) => (
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

      {(isError || wargaError) && (
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat statistik</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{getApiErrorMessage(error)}</span>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={refetchAll}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isError && rawData != null && !data && (
        <Alert>
          <AlertTitle>Format data tidak dikenali</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>Respons API statistik tidak sesuai format yang diharapkan.</span>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={refetchAll}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {displayStats && (
        <>
          <KependudukanCariWarga wargaList={wargaFiltered} />

          <GovStatisticSection
            title="Ringkasan RW"
            description={
              rtFilter === "semua"
                ? "Seluruh RT 01–04 pemukiman RW 03"
                : `Filter aktif: RT ${rtFilter.padStart(2, "0")}`
            }
          >
            <GovStatisticRow cols={5}>
              <GovStatistic
                label="Total warga"
                value={formatNumber(displayStats.totalWarga)}
                description={rtFilter === "semua" ? "Seluruh RT 01–04" : `RT ${rtFilter.padStart(2, "0")}`}
                icon={Users}
              />
              <GovStatistic
                label="Kartu keluarga"
                value={formatNumber(displayStats.totalKk)}
                description="Rumah tangga terdaftar"
                icon={Home}
              />
              <GovStatistic
                label="Rata-rata anggota/KK"
                value={String(displayStats.rataRataAnggotaPerKk)}
                description="Jumlah warga per kartu keluarga"
                icon={Users}
                tone="info"
              />
              <GovStatistic
                label="Pengangguran"
                value={formatNumber(pengangguran.total)}
                description={PENGANGGURAN_KETERANGAN}
                icon={UserX}
                tone="warning"
              />
              <GovStatistic
                label="Tingkat pengangguran"
                value={`${pengangguran.ratePercent}%`}
                description="Dari warga dewasa eligible"
                icon={Percent}
                tone="warning"
              />
            </GovStatisticRow>
          </GovStatisticSection>

          <GovStatisticSection title="Per RT" description="Klik kartu untuk memfilter statistik">
            <GovStatisticRow cols={4}>
              {(displayStats.perRt ?? []).map((r) => (
                <GovStatistic
                  key={r.rt}
                  label={`RT ${String(r.rt).padStart(2, "0")}`}
                  value={formatNumber(r.warga)}
                  description={`${formatNumber(r.kk)} KK · klik untuk filter`}
                  selected={rtFilter === String(r.rt)}
                  onClick={() => setRtFilter(String(r.rt))}
                />
              ))}
            </GovStatisticRow>
          </GovStatisticSection>

          <KategoriUmurPanel warga={wargaFiltered} />

          <PekerjaanPanel warga={wargaFiltered} />

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
        </>
      )}
    </div>
  );
}
