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
        <Skeleton className="h-32 w-full rounded-2xl" />
      </Visitrw3AdminShell>
    );
  }

  if (surveyMenunggu > 0) {
    return <Redirect to={RW3BIZ_ROUTES.admin.antrianSurvey} />;
  }
  return <Redirect to={RW3BIZ_ROUTES.admin.antrianSudah} />;
}
