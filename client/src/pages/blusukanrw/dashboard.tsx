import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BLUSUKAN_API } from "@shared/blusukan-api";
import { blusukanApi } from "@/lib/blusukan-api";
import { BLUSUKAN_RT_NUMBERS } from "@shared/rt";
import { Users, Home, CheckCircle2, ClipboardList, FileCheck, AlertCircle } from "lucide-react";

type DashboardData = {
  totalKk: number;
  totalWarga: number;
  kkLengkap: number;
  kkBelumLengkap: number;
  avgKelengkapan: number;
  wargaBelumLengkap: number;
  percentLengkap: number;
  percentDiverifikasi: number;
  percentKunjunganSelesai: number;
  perluKunjungan: number;
  perRt: {
    rt: number;
    kk: number;
    warga: number;
    perluKunjungan: number;
    kkLengkap: number;
    avgKelengkapan: number;
  }[];
};

function KelengkapanBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden mt-1.5">
      <div
        className="h-full rounded-full bg-[hsl(163,55%,35%)] transition-all"
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

export default function BlusukanrwDashboard() {
  const [rtFilter, setRtFilter] = useState<number | "semua">("semua");
  const rtParam = rtFilter === "semua" ? undefined : rtFilter;

  const { data, isLoading } = useQuery({
    queryKey: [BLUSUKAN_API.dashboard, rtParam],
    queryFn: () => blusukanApi.dashboard<DashboardData>(rtParam),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Dashboard Blusukan</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kelengkapan form sensus terbaru — data KK, anggota, pekerjaan, bansos, kendaraan
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRtFilter("semua")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border min-h-9 touch-manipulation ${
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
            className={`px-3 py-1.5 rounded-full text-xs font-medium border min-h-9 touch-manipulation ${
              rtFilter === rt ? "bg-[hsl(163,55%,22%)] text-white border-transparent" : "bg-background"
            }`}
          >
            RT {String(rt).padStart(2, "0")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Home className="w-4 h-4" />
                  <span className="text-xs">KK</span>
                </div>
                <p className="text-2xl font-bold tabular-nums">{data.totalKk}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Warga</span>
                </div>
                <p className="text-2xl font-bold tabular-nums">{data.totalWarga}</p>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Rata-rata kelengkapan form</p>
                    <p className="text-2xl font-bold tabular-nums">{data.avgKelengkapan}%</p>
                    <KelengkapanBar percent={data.avgKelengkapan} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">KK 100% lengkap</p>
                    <p className="text-lg font-bold tabular-nums">
                      {data.kkLengkap}
                      <span className="text-sm font-normal text-muted-foreground"> / {data.totalKk}</span>
                    </p>
                  </div>
                </div>
                {data.wargaBelumLengkap > 0 && (
                  <p className="text-xs text-amber-800 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {data.wargaBelumLengkap} anggota belum form lengkap
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileCheck className="w-4 h-4" />
                  <span className="text-xs">Diverifikasi petugas</span>
                </div>
                <p className="text-xl font-bold tabular-nums">{data.percentDiverifikasi}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Semua anggota KK sudah diverifikasi</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">Kunjungan selesai</span>
                </div>
                <p className="text-xl font-bold tabular-nums">{data.percentKunjunganSelesai}%</p>
              </CardContent>
            </Card>

            <Card className="col-span-2 border-amber-200/80 bg-amber-50/50">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-amber-900 font-medium">Perlu dikunjungi</p>
                  <p className="text-2xl font-bold text-amber-950 tabular-nums">{data.perluKunjungan}</p>
                  <p className="text-[10px] text-amber-800/90">Belum pernah / perlu ulang kunjungan</p>
                </div>
                <Link href="/blusukanrw/kunjungan">
                  <Button size="sm" className="gap-1 shrink-0" style={{ backgroundColor: "hsl(163,55%,22%)" }}>
                    <ClipboardList className="w-4 h-4" />
                    Antrian
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-3 space-y-3">
              <p className="text-sm font-semibold">Per RT</p>
              {data.perRt.map((row) => (
                <div key={row.rt} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">RT {String(row.rt).padStart(2, "0")}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Form {row.avgKelengkapan}% · {row.kkLengkap}/{row.kk} lengkap
                    </span>
                  </div>
                  <KelengkapanBar percent={row.avgKelengkapan} />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {row.kk} KK · {row.warga} warga · {row.perluKunjungan} perlu kunjungan
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Link href="/blusukanrw/kunjungan">
            <Button className="w-full gap-2 h-11 touch-manipulation" style={{ backgroundColor: "hsl(163,55%,22%)" }}>
              <ClipboardList className="w-4 h-4" />
              Mulai kunjungan ({data.perluKunjungan})
            </Button>
          </Link>
        </>
      ) : null}
    </div>
  );
}
