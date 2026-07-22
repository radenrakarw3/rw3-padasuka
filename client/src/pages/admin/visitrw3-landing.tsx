import { Redirect } from "wouter";
import { useVisitrw3AdminCounts } from "@/hooks/use-visitrw3-admin-counts";
import { Skeleton } from "@/components/ui/skeleton";
import { Visitrw3AdminShell } from "@/components/admin/visitrw3-admin-ui";

/** Arahkan admin ke tahap yang paling perlu tindakan. */
export default function AdminVisitrw3Landing() {
  const { surveyMenunggu, isLoading } = useVisitrw3AdminCounts();

  if (isLoading) {
    return (
      <Visitrw3AdminShell>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </Visitrw3AdminShell>
    );
  }

  if (surveyMenunggu > 0) {
    return <Redirect to="/admin/visitrw3/antrian?view=belum" />;
  }
  return <Redirect to="/admin/visitrw3/antrian?view=sudah" />;
}
