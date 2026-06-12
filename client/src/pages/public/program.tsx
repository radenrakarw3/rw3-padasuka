import { useQuery } from "@tanstack/react-query";
import { Droplets, Database, Store, Target } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { ProgramPilarCard } from "@/components/gov/program-pilar-card";
import { groupProgramsByPilar } from "@shared/program-kerja-analytics";
import { pilarProgramFokus, pilarProgramLabels, visiProgramRw } from "@shared/program-kerja";
import type { ProgramRw } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/queryClient";

const pilarIcons = {
  infrastruktur: Droplets,
  digitalisasi: Database,
  ekonomi: Store,
} as const;

type PublicProgramResponse = {
  programs: ProgramRw[];
};

export default function PublicProgram() {
  const { data, isLoading, isError, error, refetch } = useQuery<PublicProgramResponse>({
    queryKey: ["/api/public/program-kerja"],
  });

  const pillars = groupProgramsByPilar(data?.programs ?? []);

  return (
    <PublicKioskLayout title="Program Kerja RW" backHref="/">
      <div className="space-y-6">
        <FeatureExplain title="Apa ini?">
          Halaman ini menampilkan program kerja resmi RW 03 — dibagi ke tiga pilar (infrastruktur,
          digitalisasi, ekonomi). Warga bisa melihat visi pengurus, program yang sedang/sudah
          dijalankan, dan capaiannya secara transparan.
        </FeatureExplain>
        <div className="rounded-xl bg-brand/5 border border-brand/15 p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Visi RW 03</p>
          <p className="text-sm leading-relaxed">{visiProgramRw}</p>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertTitle>Gagal memuat program kerja</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{getApiErrorMessage(error)}</p>
              <p className="text-xs">Pastikan server sudah di-restart setelah update terbaru (<code>npm run dev</code>).</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Coba lagi
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : !isError ? (
          <div className="space-y-3">
            {pillars.map((p) => {
              const Icon = pilarIcons[p.pilar];
              return (
                <ProgramPilarCard
                  key={p.pilar}
                  href={`/program/${p.pilar}`}
                  icon={Icon}
                  title={pilarProgramLabels[p.pilar]}
                  fokus={pilarProgramFokus[p.pilar]}
                  progress={p.avgProgress}
                  programCount={p.totalProgram}
                />
              );
            })}
          </div>
        ) : null}

        <Link href="/program/transparansi">
          <Button variant="outline" className="w-full touch-target gap-2">
            <Target className="w-4 h-4" />
            Lihat capaian transparan
          </Button>
        </Link>
      </div>
    </PublicKioskLayout>
  );
}
