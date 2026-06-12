import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sparkles, RefreshCw } from "lucide-react";
import { ProgramKerjaAdminNav } from "@/components/admin/program-kerja-admin-nav";
import {
  GovStatistic,
  GovStatisticRow,
  GovStatisticSection,
} from "@/components/gov/statistic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage } from "@/lib/queryClient";
import type { ProgramKerjaDashboardStats } from "@shared/program-kerja-analytics";
import { pilarProgramLabels } from "@shared/program-kerja";

type DashboardResponse = ProgramKerjaDashboardStats & {
  blusukan: {
    avgKelengkapan: number;
    perluKunjungan: number;
    percentLengkap: number;
    totalKk: number;
  };
  proyek: { id: number; status: string }[];
  umkm: { id: number; statusMakeover: string }[];
};

export default function AdminProgramKerjaDashboard() {
  const { toast } = useToast();
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<DashboardResponse>({
    queryKey: ["/api/admin/program-kerja/dashboard"],
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stats/dashboard/ai-insight", {
        section: "Program Strategis RW",
        data: data,
      });
      return res.json() as Promise<{ insight: string }>;
    },
    onSuccess: (result) => setAiInsight(result.insight),
    onError: (err: unknown) => {
      toast({ title: "Gagal mendapatkan insight", description: getApiErrorMessage(err), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ProgramKerjaAdminNav />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <ProgramKerjaAdminNav />
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat dashboard</AlertTitle>
          <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>Coba lagi</Button>
      </div>
    );
  }

  const proyekSelesai = data.proyek.filter((p) => p.status === "selesai").length;
  const umkmSelesai = data.umkm.filter((u) => u.statusMakeover === "selesai").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand">Program Kerja RW</h1>
          <p className="text-sm text-muted-foreground">Dashboard strategis per pilar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending}>
            <Sparkles className="w-4 h-4 mr-1" />
            Insight AI
          </Button>
        </div>
      </div>

      <ProgramKerjaAdminNav />

      <GovStatisticSection title="Indikator utama">
        <GovStatisticRow>
          <GovStatistic label="Indeks kemajuan RW" value={`${data.indeksKemajuan}%`} />
          <GovStatistic label="Laporan selesai" value={`${data.laporan.rateSelesai}%`} />
        </GovStatisticRow>
        <GovStatisticRow>
          <GovStatistic label="Program berjalan" value={String(data.program.berjalan)} />
          <GovStatistic label="Program selesai" value={String(data.program.selesai)} />
        </GovStatisticRow>
        <GovStatisticRow>
          <GovStatistic label="Kelengkapan sensus" value={`${data.blusukan.avgKelengkapan}%`} />
          <GovStatistic label="KK perlu kunjungan" value={String(data.blusukan.perluKunjungan)} />
        </GovStatisticRow>
        <GovStatisticRow>
          <GovStatistic label="Proyek infra selesai" value={`${proyekSelesai}/${data.proyek.length}`} />
          <GovStatistic label="UMKM makeover selesai" value={`${umkmSelesai}/${data.umkm.length}`} />
        </GovStatisticRow>
      </GovStatisticSection>

      {data.pilar.map((p) => (
        <GovStatisticSection key={p.pilar} title={pilarProgramLabels[p.pilar]}>
          <GovStatisticRow>
            <GovStatistic label="Sub-program" value={String(p.totalProgram)} />
            <GovStatistic label="Berjalan" value={String(p.berjalan)} />
            <GovStatistic label="Capaian rata-rata" value={`${p.avgProgress}%`} />
          </GovStatisticRow>
          <Link href={`/program/${p.pilar}`} className="text-sm text-primary underline">
            Lihat halaman warga →
          </Link>
        </GovStatisticSection>
      ))}

      {aiInsight && (
        <Alert>
          <AlertTitle>Rekomendasi AI</AlertTitle>
          <AlertDescription className="whitespace-pre-line text-sm">{aiInsight}</AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-muted-foreground">
        <Link href="/blusukanrw/quest" className="underline">Buka Blusukan RW</Link>
        {" · "}
        <Link href="/admin/kependudukan" className="underline">Kependudukan</Link>
      </div>
    </div>
  );
}
