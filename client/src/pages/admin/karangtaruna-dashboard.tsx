import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, UserPlus, HeartHandshake, Sparkles, MapPin } from "lucide-react";
import { KarangtarunaAdminNav } from "@/components/admin/karangtaruna-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3EmptyState,
  Visitrw3Panel,
  Visitrw3StatCard,
} from "@/components/admin/visitrw3-admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { KARANGTARUNA_ROUTES } from "@/lib/karangtaruna-routes";

type Stats = {
  total: number;
  baru: number;
  aktif: number;
  arsip: number;
  bersediaAktif: number;
  perRt: { rt: number; jumlah: number }[];
  topKeahlian: { nama: string; jumlah: number }[];
  topMinat: { nama: string; jumlah: number }[];
};

function BarList({ items, tone }: { items: { nama: string; jumlah: number }[]; tone: "brand" | "gold" }) {
  const max = Math.max(1, ...items.map((i) => i.jumlah));
  const barColor = tone === "brand" ? "bg-[hsl(163,55%,22%)]" : "bg-[hsl(45,60%,50%)]";
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.nama} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate">{i.nama}</span>
            <span className="font-semibold tabular-nums">{i.jumlah}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${(i.jumlah / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminKarangtarunaDashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/karangtaruna/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/karangtaruna/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat statistik");
      return res.json();
    },
  });

  return (
    <Visitrw3AdminShell>
      <KarangtarunaAdminNav
        title="Statistik Karang Taruna"
        description="Ringkasan potensi pemuda RW 03 — sebaran, skill, dan minat kegiatan."
      />

      {isLoading || !stats ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Visitrw3StatCard title="Total anggota" value={String(stats.total)} description="Terdaftar" icon={Users} />
            <Visitrw3StatCard
              title="Belum diverifikasi"
              value={String(stats.baru)}
              description="Perlu ditinjau"
              icon={UserPlus}
              tone="warning"
              href={KARANGTARUNA_ROUTES.admin.anggotaBaru}
            />
            <Visitrw3StatCard title="Anggota aktif" value={String(stats.aktif)} description="Sudah diverifikasi" icon={UserCheck} tone="success" />
            <Visitrw3StatCard title="Siap aktif kegiatan" value={String(stats.bersediaAktif)} description="Bersedia dilibatkan" icon={HeartHandshake} tone="gold" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Visitrw3Panel title="Skill / keahlian terbanyak" description="Potensi yang bisa diberdayakan">
              {stats.topKeahlian.length === 0 ? (
                <Visitrw3EmptyState icon={Sparkles} title="Belum ada data skill" />
              ) : (
                <BarList items={stats.topKeahlian} tone="brand" />
              )}
            </Visitrw3Panel>

            <Visitrw3Panel title="Minat kegiatan" description="Yang ingin difasilitasi RW">
              {stats.topMinat.length === 0 ? (
                <Visitrw3EmptyState icon={HeartHandshake} title="Belum ada data minat" />
              ) : (
                <BarList items={stats.topMinat} tone="gold" />
              )}
            </Visitrw3Panel>
          </div>

          <Visitrw3Panel title="Sebaran per RT">
            {stats.perRt.length === 0 ? (
              <Visitrw3EmptyState icon={MapPin} title="Belum ada data RT" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.perRt.map((r) => (
                  <div key={r.rt} className="rounded-xl border bg-card/80 p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums">{r.jumlah}</p>
                    <p className="text-xs text-muted-foreground">RT {String(r.rt).padStart(2, "0")}</p>
                  </div>
                ))}
              </div>
            )}
          </Visitrw3Panel>
        </div>
      )}
    </Visitrw3AdminShell>
  );
}
