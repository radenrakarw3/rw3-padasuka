import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Store, ClipboardList, Users } from "lucide-react";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3EmptyState,
  Visitrw3StatCard,
} from "@/components/admin/visitrw3-admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { useVisitrw3AdminCounts } from "@/hooks/use-visitrw3-admin-counts";

type UsahaRow = {
  id: number;
  nomorBiz: string;
  namaUsaha: string;
  pjNama: string;
  pjNomorWhatsapp: string;
  status: string;
};

export default function AdminRw3bizDashboard() {
  const { surveyMenunggu, isLoading: countsLoading } = useVisitrw3AdminCounts("rw3biz");

  const { data: usaha = [], isLoading: usahaLoading } = useQuery<UsahaRow[]>({
    queryKey: ["/api/admin/rw3biz/usaha"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/usaha", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat usaha");
      return res.json();
    },
  });

  const loading = countsLoading || usahaLoading;

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="Statistik RW3BIZ"
        description="Ringkasan usaha aktif dan antrian survey — data dari tabel rw3biz_* (terpisah Visit RW3)."
      />

      {loading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Visitrw3StatCard
              title="Menunggu survey"
              value={String(surveyMenunggu)}
              description="Pengajuan belum diproses"
              icon={ClipboardList}
              tone="warning"
              href={RW3BIZ_ROUTES.admin.antrianSurvey}
            />
            <Visitrw3StatCard
              title="Usaha aktif"
              value={String(usaha.length)}
              description="Sudah disetujui"
              icon={Store}
              tone="success"
            />
          </div>

          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Usaha aktif terbaru
              </h2>
              <Link href={RW3BIZ_ROUTES.admin.antrianSudah}>
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  Riwayat
                </Button>
              </Link>
            </div>
            {usaha.length === 0 ? (
              <Visitrw3EmptyState
                icon={Store}
                title="Belum ada usaha aktif"
                description="Usaha muncul di sini setelah pengajuan RW3BIZ disetujui."
              />
            ) : (
              <ul className="space-y-2">
                {usaha.slice(0, 8).map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.namaUsaha}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{u.nomorBiz}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PJ: {u.pjNama}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Visitrw3AdminShell>
  );
}
