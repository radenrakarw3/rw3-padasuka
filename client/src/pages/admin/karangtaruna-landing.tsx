import { Redirect } from "wouter";
import { useKarangtarunaAdminCounts } from "@/hooks/use-karangtaruna-admin-counts";
import { Skeleton } from "@/components/ui/skeleton";
import { Visitrw3AdminShell } from "@/components/admin/visitrw3-admin-ui";
import { KARANGTARUNA_ROUTES } from "@/lib/karangtaruna-routes";

export default function AdminKarangtarunaLanding() {
  const { anggotaBaru, isLoading } = useKarangtarunaAdminCounts();

  if (isLoading) {
    return (
      <Visitrw3AdminShell>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </Visitrw3AdminShell>
    );
  }

  if (anggotaBaru > 0) {
    return <Redirect to={KARANGTARUNA_ROUTES.admin.anggotaBaru} />;
  }
  return <Redirect to={KARANGTARUNA_ROUTES.admin.dashboard} />;
}
