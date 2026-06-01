import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  ClipboardList,
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import { formatRupiah } from "@/lib/visitrw3-kontribusi";
import { rtOptions } from "@/lib/constants";
import { getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";

type Visitrw3DashboardStats = {
  ringkasan: {
    totalPengajuan: number;
    menungguSurvey: number;
    disetujui: number;
    ditolak: number;
    totalProperti: number;
    propertiMenunggu: number;
    penghuniAktif: number;
    totalKontribusiKasRw: number;
  };
  pengajuan: {
    byKeperluan: Record<string, number>;
    byTipe: Record<string, number>;
    byStatus: Record<string, number>;
    byRt: { rt: number; count: number }[];
    byTerminBulan: { termin: number; count: number }[];
    bisnisDiRw3: number;
    bisnisLuar: number;
    byJenisTempatUsaha: { label: string; count: number }[];
  };
  penghuni: {
    totalBaris: number;
    anakVsDewasa: { anak: number; dewasa: number };
    byJenisKelamin: Record<string, number>;
    topPekerjaan: { label: string; count: number }[];
    denganKendaraan: number;
    tanpaKendaraan: number;
    byJenisKendaraan: { label: string; count: number }[];
  };
  properti: {
    byJenisProperti: { label: string; count: number }[];
    byStatusProperti: { label: string; count: number }[];
    byRt: { rt: number; count: number }[];
    izinTinggal: number;
    izinBisnis: number;
    byJumlahPintu: { label: string; count: number }[];
  };
  trenBulan: { bulan: string; count: number }[];
  pengajuanTerbaru: {
    id: number;
    nomorVisitrw3: string;
    keperluanPengajuan: string;
    status: string;
    rt: number;
    createdAt: string | null;
  }[];
  rtList: number[];
};

const PIE_COLORS = ["#0f766e", "#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"];

const statusLabel: Record<string, string> = {
  menunggu_survey: "Menunggu survey",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

const keperluanLabel: Record<string, string> = {
  tinggal: "Tinggal",
  bisnis: "Bisnis",
};

const tipeLabel: Record<string, string> = {
  pengajuan_baru: "Pengajuan baru",
  perpanjang: "Perpanjang",
};

const DEFAULT_RT_LIST = [...rtOptions];

const pieConfig = { value: { label: "Jumlah" } } satisfies ChartConfig;
const barConfig = { count: { label: "Jumlah", color: "#0f766e" } } satisfies ChartConfig;

function formatNumber(n: number) {
  return n.toLocaleString("id-ID");
}

function toPieData(record: Record<string, number>, labelMap?: Record<string, string>) {
  return Object.entries(record)
    .filter(([, v]) => v > 0)
    .map(([key, value], i) => ({
      label: labelMap?.[key] ?? key,
      value,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Users;
}) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PieBlock({ data, empty }: { data: { label: string; value: number; fill: string }[]; empty: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>;
  }
  return (
    <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[240px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
          {data.map((entry, i) => (
            <Cell key={`${entry.label}-${i}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export default function AdminVisitrw3Dashboard() {
  const [rtFilter, setRtFilter] = useState("semua");

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Visitrw3DashboardStats>({
    queryKey: ["/api/admin/visitrw3/dashboard-stats", rtFilter],
    queryFn: async () => {
      const q = rtFilter === "semua" ? "" : `?rt=${encodeURIComponent(rtFilter)}`;
      const res = await fetch(`/api/admin/visitrw3/dashboard-stats${q}`, { credentials: "include" });
      if (!res.ok) {
        let msg = "Gagal memuat statistik Visit RW3";
        try {
          const body = await readJsonSafely<{ message?: string }>(res);
          if (body?.message) msg = body.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      return readJsonSafely<Visitrw3DashboardStats>(res);
    },
    retry: 1,
    staleTime: 60_000,
  });

  const statusPie = useMemo(
    () => toPieData(data?.pengajuan.byStatus ?? {}, statusLabel),
    [data?.pengajuan.byStatus],
  );
  const keperluanPie = useMemo(
    () => toPieData(data?.pengajuan.byKeperluan ?? {}, keperluanLabel),
    [data?.pengajuan.byKeperluan],
  );
  const anakPie = useMemo(() => {
    if (!data?.penghuni) return [];
    const { anak, dewasa } = data.penghuni.anakVsDewasa;
    return [
      { label: "Dewasa", value: dewasa, fill: PIE_COLORS[0] },
      { label: "Anak", value: anak, fill: PIE_COLORS[1] },
    ].filter((d) => d.value > 0);
  }, [data?.penghuni]);
  const kendaraanPie = useMemo(() => {
    if (!data?.penghuni) return [];
    return [
      { label: "Punya kendaraan", value: data.penghuni.denganKendaraan, fill: PIE_COLORS[0] },
      { label: "Tanpa kendaraan", value: data.penghuni.tanpaKendaraan, fill: PIE_COLORS[2] },
    ].filter((d) => d.value > 0);
  }, [data?.penghuni]);

  const rtBar = useMemo(
    () => (data?.pengajuan.byRt ?? []).map((r) => ({ label: `RT ${String(r.rt).padStart(2, "0")}`, count: r.count })),
    [data?.pengajuan.byRt],
  );
  const propertiJenisBar = useMemo(
    () => (data?.properti.byJenisProperti ?? []).map((r) => ({ label: r.label, count: r.count })),
    [data?.properti.byJenisProperti],
  );
  const terminBar = useMemo(
    () =>
      (data?.pengajuan.byTerminBulan ?? []).map((r) => ({
        label: `${r.termin} bln`,
        count: r.count,
      })),
    [data?.pengajuan.byTerminBulan],
  );
  const pekerjaanBar = useMemo(
    () => (data?.penghuni.topPekerjaan ?? []).map((r) => ({ label: r.label, count: r.count })),
    [data?.penghuni.topPekerjaan],
  );
  const jenisUsahaBar = useMemo(
    () => (data?.pengajuan.byJenisTempatUsaha ?? []).map((r) => ({ label: r.label, count: r.count })),
    [data?.pengajuan.byJenisTempatUsaha],
  );
  const trenBar = useMemo(
    () => (data?.trenBulan ?? []).map((r) => ({ label: r.bulan, count: r.count })),
    [data?.trenBulan],
  );
  const propertiStatusPie = useMemo(
    () =>
      (data?.properti.byStatusProperti ?? []).map((r, i) => ({
        label: r.label === "menunggu_verifikasi" ? "Menunggu verifikasi" : r.label === "aktif" ? "Aktif" : r.label,
        value: r.count,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [data?.properti.byStatusProperti],
  );
  const pengajuanBaru = data?.pengajuan.byTipe?.pengajuan_baru ?? 0;
  const pengajuanPerpanjang = data?.pengajuan.byTipe?.perpanjang ?? 0;

  const rtList = data?.rtList?.length ? data.rtList : DEFAULT_RT_LIST;
  const selectedRtLabel = rtFilter === "semua" ? "Semua RT" : `RT ${rtFilter}`;

  return (
    <div className="space-y-6">
      <Visitrw3AdminNav
        title="Dashboard Visit RW3"
        description={`Ringkasan dari form pengajuan, properti, dan penghuni — ${selectedRtLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={rtFilter} onValueChange={setRtFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua RT</SelectItem>
                {rtList.map((rt) => (
                  <SelectItem key={rt} value={String(rt)}>
                    RT {String(rt).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isFetching && !isLoading && (
              <span className="text-xs text-muted-foreground">Memuat…</span>
            )}
          </div>
        }
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat dashboard</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{getApiErrorMessage(error)}</span>
            <span className="text-xs opacity-90">
              Pastikan server dev sudah di-restart setelah update. Endpoint:{" "}
              <code className="font-mono">/api/admin/visitrw3/dashboard-stats</code>
            </span>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => refetch()}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data && !isError ? (
        <>
          {data.ringkasan.totalPengajuan === 0 && data.ringkasan.totalProperti === 0 && (
            <Alert>
              <AlertTitle>Belum ada data Visit RW3</AlertTitle>
              <AlertDescription>
                Dashboard siap dipakai. Statistik akan terisi setelah ada pengajuan dari form publik atau properti
                terdaftar. Anda tetap bisa mengelola antrian, properti, dan penghuni dari tab di atas.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-md border px-3 py-1.5">
              Pengajuan baru: <strong>{formatNumber(pengajuanBaru)}</strong>
            </span>
            <span className="rounded-md border px-3 py-1.5">
              Perpanjang: <strong>{formatNumber(pengajuanPerpanjang)}</strong>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Menunggu survey"
              value={formatNumber(data.ringkasan.menungguSurvey)}
              description="Pengajuan belum diproses admin"
              icon={Clock}
            />
            <MetricCard
              title="Disetujui"
              value={formatNumber(data.ringkasan.disetujui)}
              description={`Dari ${formatNumber(data.ringkasan.totalPengajuan)} pengajuan`}
              icon={CheckCircle2}
            />
            <MetricCard
              title="Properti"
              value={formatNumber(data.ringkasan.totalProperti)}
              description={
                data.ringkasan.propertiMenunggu > 0
                  ? `${data.ringkasan.propertiMenunggu} menunggu verifikasi`
                  : "Terdaftar di Visit RW3"
              }
              icon={Building2}
            />
            <MetricCard
              title="Penghuni aktif"
              value={formatNumber(data.ringkasan.penghuniAktif)}
              description="Kontrak aktif di properti RW"
              icon={Users}
            />
            <MetricCard
              title="Kontribusi Kas RW"
              value={formatRupiah(data.ringkasan.totalKontribusiKasRw)}
              description="Total setelah survey & persetujuan"
              icon={Wallet}
            />
            <MetricCard
              title="Baris data penghuni"
              value={formatNumber(data.penghuni.totalBaris)}
              description="Isian form penghuni pada pengajuan"
              icon={ClipboardList}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Status pengajuan" description="Dari form pengajuan / perpanjang">
              <PieBlock data={statusPie} empty="Belum ada pengajuan" />
            </ChartCard>
            <ChartCard title="Keperluan" description="Tinggal vs bisnis">
              <PieBlock data={keperluanPie} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Status properti" description="Form daftar properti">
              <PieBlock data={propertiStatusPie} empty="Belum ada properti" />
            </ChartCard>
            <ChartCard title="Penghuni: anak vs dewasa" description="Data isian form penghuni">
              <PieBlock data={anakPie} empty="Belum ada data penghuni" />
            </ChartCard>
            <ChartCard title="Kendaraan penghuni" description="Field kendaraan pada form">
              <PieBlock data={kendaraanPie} empty="Belum ada data" />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Pengajuan per RT" description="Filter lokasi form">
              {rtBar.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data</p>
              ) : (
                <ChartContainer config={barConfig} className="h-[240px] w-full">
                  <BarChart data={rtBar} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </ChartCard>
            <ChartCard title="Properti per jenis" description="Form daftar properti">
              {propertiJenisBar.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Belum ada properti</p>
              ) : (
                <ChartContainer config={barConfig} className="h-[240px] w-full">
                  <BarChart data={propertiJenisBar} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </ChartCard>
            <ChartCard title="Termin pembayaran" description="Pilihan bulan pada form bayar">
              {terminBar.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data</p>
              ) : (
                <ChartContainer config={barConfig} className="h-[240px] w-full">
                  <BarChart data={terminBar} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </ChartCard>
            <ChartCard title="Tren pengajuan" description="Bulan terakhir (created_at)">
              {trenBar.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data</p>
              ) : (
                <ChartContainer config={barConfig} className="h-[240px] w-full">
                  <BarChart data={trenBar} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Top pekerjaan penghuni" description="Field pekerjaan pada form penghuni">
              {pekerjaanBar.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data</p>
              ) : (
                <ChartContainer config={barConfig} className="h-[280px] w-full">
                  <BarChart data={pekerjaanBar} layout="vertical" margin={{ left: 4, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis type="category" dataKey="label" width={100} tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </ChartCard>
            <ChartCard title="Jenis tempat usaha (bisnis)" description="Bisnis di RW vs luar wilayah">
              <div className="flex flex-wrap gap-3 mb-4 text-sm">
                <span className="rounded-md border px-3 py-1.5">
                  Di wilayah RW3: <strong>{formatNumber(data.pengajuan.bisnisDiRw3)}</strong>
                </span>
                <span className="rounded-md border px-3 py-1.5">
                  Luar wilayah: <strong>{formatNumber(data.pengajuan.bisnisLuar)}</strong>
                </span>
                <span className="rounded-md border px-3 py-1.5">
                  Izin tinggal: <strong>{formatNumber(data.properti.izinTinggal)}</strong> properti
                </span>
                <span className="rounded-md border px-3 py-1.5">
                  Izin bisnis: <strong>{formatNumber(data.properti.izinBisnis)}</strong> properti
                </span>
              </div>
              {jenisUsahaBar.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Belum ada pengajuan bisnis</p>
              ) : (
                <ChartContainer config={barConfig} className="h-[200px] w-full">
                  <BarChart data={jenisUsahaBar} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </ChartCard>
          </div>

          <Card className="border-border/70">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Pengajuan terbaru</CardTitle>
                <CardDescription>5 entri terakhir — data dari form yang masuk</CardDescription>
              </div>
              <Link href="/admin/visitrw3/antrian">
                <Button variant="outline" size="sm">
                  Buka antrian
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.pengajuanTerbaru.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada pengajuan</p>
              ) : (
                data.pengajuanTerbaru.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-mono font-medium">{p.nomorVisitrw3}</p>
                      <p className="text-xs text-muted-foreground">
                        RT {String(p.rt).padStart(2, "0")} · {keperluanLabel[p.keperluanPengajuan] ?? p.keperluanPengajuan}
                      </p>
                    </div>
                    <Badge variant={p.status === "menunggu_survey" ? "secondary" : "outline"}>
                      {statusLabel[p.status] ?? p.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Statistik penghuni mencakup semua baris isian form pada pengajuan (termasuk yang belum disetujui).
            Kontribusi hanya menjumlahkan pengajuan yang sudah dicatat ke Kas RW.
          </p>
        </>
      ) : (
        !isLoading &&
        !isError && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Data dashboard tidak tersedia.{" "}
              <button type="button" className="underline text-primary" onClick={() => refetch()}>
                Muat ulang
              </button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
