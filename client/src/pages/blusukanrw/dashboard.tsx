import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BLUSUKAN_API } from "@shared/blusukan-api";
import { blusukanApi } from "@/lib/blusukan-api";
import { BLUSUKAN_RT_NUMBERS } from "@shared/rt";
import { PENGANGGURAN_KETERANGAN } from "@shared/pekerjaan-labor";
import {
  Users,
  Home,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  AlertCircle,
  UserX,
  ShieldAlert,
} from "lucide-react";

type DataIssueCounts = {
  tanpa_tanggal_lahir: number;
  kategori_belum_sinkron: number;
  tanpa_status_pekerjaan: number;
  status_pekerjaan_tidak_selaras: number;
  tanpa_pekerjaan: number;
  pekerjaan_tidak_standar: number;
  pekerjaan_salah_kategori: number;
};

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
  pengangguran: number;
  pengangguranRatePercent: number;
  dataIssues: {
    wargaBermasalah: number;
    counts: DataIssueCounts;
  };
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

function StatMini({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Home;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning" | "info";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200/80 bg-amber-50/40"
      : tone === "info"
        ? "border-sky-200/80 bg-sky-50/40"
        : "";
  return (
    <Card className={toneClass}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="text-xs leading-tight">{label}</span>
        </div>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function BlusukanrwDashboard() {
  const [rtFilter, setRtFilter] = useState<number | "semua">("semua");
  const rtParam = rtFilter === "semua" ? undefined : rtFilter;

  const { data, isLoading } = useQuery({
    queryKey: [BLUSUKAN_API.dashboard, rtParam],
    queryFn: () => blusukanApi.dashboard<DashboardData>(rtParam),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const topIssues = data
    ? (
        [
          ["tanpa_status_pekerjaan", "Status pekerjaan kosong"],
          ["status_pekerjaan_tidak_selaras", "Status vs pekerjaan"],
          ["pekerjaan_salah_kategori", "Pekerjaan tidak sesuai usia"],
          ["tanpa_pekerjaan", "Pekerjaan kosong"],
          ["kategori_belum_sinkron", "Kategori umur"],
        ] as const
      )
        .map(([key, label]) => ({
          label,
          count: data.dataIssues.counts[key],
        }))
        .filter((x) => x.count > 0)
        .slice(0, 4)
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Dashboard Blusukan</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Sensus lapangan RT 01–04 · selaras statistik kependudukan (status ILO, kategori umur)
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
            <StatMini icon={Home} label="Kartu keluarga" value={data.totalKk} />
            <StatMini icon={Users} label="Total warga" value={data.totalWarga} />

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
              </CardContent>
            </Card>

            <StatMini
              icon={ShieldAlert}
              label="Perlu perbaikan data"
              value={data.dataIssues.wargaBermasalah}
              hint="Status ILO, pekerjaan, kategori umur"
              tone="warning"
            />
            <StatMini
              icon={UserX}
              label="Pengangguran"
              value={data.pengangguran}
              hint={`${data.pengangguranRatePercent}% eligible · ${PENGANGGURAN_KETERANGAN}`}
              tone="info"
            />

            <StatMini icon={FileCheck} label="Diverifikasi petugas" value={`${data.percentDiverifikasi}%`} />
            <StatMini icon={CheckCircle2} label="Kunjungan selesai" value={`${data.percentKunjunganSelesai}%`} />

            <Card className="col-span-2 border-amber-200/80 bg-amber-50/50">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-amber-900 font-medium">Perlu dikunjungi</p>
                  <p className="text-2xl font-bold text-amber-950 tabular-nums">{data.perluKunjungan}</p>
                  <p className="text-[10px] text-amber-800/90">
                    Prioritas: belum kunjungi → data bermasalah → belum lengkap
                  </p>
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

          {topIssues.length > 0 && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  Masalah data terbanyak
                </p>
                <ul className="space-y-1.5">
                  {topIssues.map((item) => (
                    <li key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold tabular-nums">{item.count}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Perbaiki saat kunjungan — form anggota menampilkan peringatan otomatis.
                </p>
              </CardContent>
            </Card>
          )}

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

          {data.wargaBelumLengkap > 0 && (
            <p className="text-xs text-amber-800 flex items-center gap-1 px-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {data.wargaBelumLengkap} anggota belum form lengkap
            </p>
          )}

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
