import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { readJsonSafely } from "@/lib/queryClient";
import { BLUSUKAN_RT_NUMBERS } from "@shared/rt";
import { Users, Home, CheckCircle2, ClipboardList } from "lucide-react";

type DashboardData = {
  totalKk: number;
  totalWarga: number;
  percentLengkap: number;
  percentDiverifikasi: number;
  percentKunjunganSelesai: number;
  perluKunjungan: number;
  perRt: { rt: number; kk: number; warga: number; perluKunjungan: number }[];
};

async function fetchDashboard(rt?: number) {
  const q = rt != null ? `?rt=${rt}` : "";
  const res = await fetch(`/api/blusukan/dashboard${q}`, { credentials: "include" });
  if (!res.ok) throw new Error("Gagal memuat dashboard");
  return readJsonSafely<DashboardData>(res);
}

export default function BlusukanrwDashboard() {
  const [rtFilter, setRtFilter] = useState<number | "semua">("semua");
  const rtParam = rtFilter === "semua" ? undefined : rtFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/blusukan/dashboard", rtParam],
    queryFn: () => fetchDashboard(rtParam),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Dashboard Blusukan</h2>
        <p className="text-xs text-muted-foreground">Ringkasan kependudukan RT 01–04</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRtFilter("semua")}
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            rtFilter === "semua" ? "bg-[hsl(163,55%,22%)] text-white border-transparent" : "bg-background"
          }`}
        >
          Semua RT
        </button>
        {BLUSUKAN_RT_NUMBERS.map((rt) => (
          <button
            key={rt}
            type="button"
            onClick={() => setRtFilter(rt)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              rtFilter === rt ? "bg-[hsl(163,55%,22%)] text-white border-transparent" : "bg-background"
            }`}
          >
            RT {String(rt).padStart(2, "0")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Home className="w-4 h-4" />
                  <span className="text-xs">KK</span>
                </div>
                <p className="text-2xl font-bold">{data.totalKk}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Warga</span>
                </div>
                <p className="text-2xl font-bold">{data.totalWarga}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Data lengkap</p>
                <p className="text-xl font-bold">{data.percentLengkap}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Diverifikasi</p>
                <p className="text-xl font-bold">{data.percentDiverifikasi}%</p>
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs">Kunjungan selesai</span>
                  </div>
                  <p className="text-xl font-bold mt-1">{data.percentKunjunganSelesai}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-700 font-medium">Perlu dikunjungi</p>
                  <p className="text-2xl font-bold text-amber-800">{data.perluKunjungan}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-semibold">Per RT</p>
              {data.perRt.map((row) => (
                <div key={row.rt} className="flex justify-between text-xs border-b last:border-0 py-1.5">
                  <span>RT {String(row.rt).padStart(2, "0")}</span>
                  <span className="text-muted-foreground">
                    {row.kk} KK · {row.warga} warga · {row.perluKunjungan} perlu kunjungan
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Link href="/blusukanrw/kunjungan">
            <Button className="w-full gap-2" style={{ backgroundColor: "hsl(163,55%,22%)" }}>
              <ClipboardList className="w-4 h-4" />
              Lihat keluarga harus dikunjungi
            </Button>
          </Link>
        </>
      ) : null}
    </div>
  );
}
