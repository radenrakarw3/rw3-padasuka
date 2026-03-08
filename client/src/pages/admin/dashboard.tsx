import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Home, ClipboardList, FileText, MessageSquare } from "lucide-react";
import type { KartuKeluarga, Warga, Laporan, SuratWarga } from "@shared/schema";

export default function AdminDashboard() {
  const { data: kkList, isLoading: kkLoading } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });
  const { data: wargaList, isLoading: wargaLoading } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });
  const { data: laporanList, isLoading: lapLoading } = useQuery<Laporan[]>({ queryKey: ["/api/laporan"] });
  const { data: suratList, isLoading: suratLoading } = useQuery<SuratWarga[]>({ queryKey: ["/api/surat-warga"] });

  const isLoading = kkLoading || wargaLoading || lapLoading || suratLoading;

  const pendingLaporan = laporanList?.filter(l => l.status === "pending").length || 0;
  const pendingSurat = suratList?.filter(s => s.status === "pending").length || 0;

  const stats = [
    { label: "Kartu Keluarga", value: kkList?.length || 0, icon: Home, color: "bg-[hsl(163,55%,22%)]" },
    { label: "Total Warga", value: wargaList?.length || 0, icon: Users, color: "bg-[hsl(40,45%,50%)]" },
    { label: "Laporan Pending", value: pendingLaporan, icon: ClipboardList, color: "bg-[hsl(348,55%,38%)]" },
    { label: "Surat Pending", value: pendingSurat, icon: FileText, color: "bg-[hsl(220,55%,35%)]" },
  ];

  const rtStats = [1, 2, 3, 4, 5, 6, 7].map(rt => ({
    rt,
    kk: kkList?.filter(k => k.rt === rt).length || 0,
    warga: 0,
  }));

  if (wargaList && kkList) {
    const kkRtMap = new Map(kkList.map(k => [k.id, k.rt]));
    for (const w of wargaList) {
      const rt = kkRtMap.get(w.kkId);
      if (rt) {
        const s = rtStats.find(r => r.rt === rt);
        if (s) s.warga++;
      }
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold" data-testid="text-dashboard-title">Dashboard</h2>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} data-testid={`card-stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Data per RT</h3>
          <div className="space-y-3">
            {rtStats.map((r) => (
              <div key={r.rt} className="flex items-center gap-3" data-testid={`row-rt-${r.rt}`}>
                <span className="w-14 text-xs font-medium">RT {r.rt.toString().padStart(2, "0")}</span>
                <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                  <div
                    className="h-full bg-[hsl(163,55%,22%)] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((r.warga || 0) / Math.max(...rtStats.map(s => s.warga || 1))) * 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                    {r.kk} KK / {r.warga} Warga
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
