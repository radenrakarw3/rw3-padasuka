import { Redirect } from "wouter";
import { useVisitrw3AdminCounts } from "@/hooks/use-visitrw3-admin-counts";
import { Skeleton } from "@/components/ui/skeleton";
import { Visitrw3AdminShell } from "@/components/admin/visitrw3-admin-ui";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

export default function AdminRw3bizLanding() {
  const { surveyMenunggu, isLoading } = useVisitrw3AdminCounts("rw3biz");

  if (isLoading) {
    return (
      <Visitrw3AdminShell>
        <div className="space-y-3" aria-busy="true" aria-label="Memuat antrian">
          <Skeleton className="h-8 w-2/3 rounded-lg sm:w-1/3" />
          <div className="flex gap-2 overflow-hidden">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />)}
          </div>
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl sm:h-20" />)}
        </div>
      </Visitrw3AdminShell>
    );
  }

  if (surveyMenunggu > 0) {
    return <Redirect to={RW3BIZ_ROUTES.admin.antrianSurvey} />;
  }
  return <Redirect to={RW3BIZ_ROUTES.admin.antrianSudah} />;
}
