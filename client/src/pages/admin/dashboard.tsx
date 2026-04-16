import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { Users, House, HeartPulse, Briefcase, Smartphone, HandHelping, Baby, Accessibility, Filter, BadgeInfo } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type DashboardStats = {
  totalKk: number;
  totalWarga: number;
  jenisKelamin: Record<string, number>;
  kelompokUsia: Record<string, number>;
  pekerjaan: { name: string; count: number }[];
  pendidikan: Record<string, number>;
  statusRumah: Record<string, number>;
  kondisiKesehatan: Record<string, number>;
  kategoriEkonomi: Record<string, number>;
  bansos: { penerima: number; bukan: number };
  waOwnership: { punya: number; belum: number };
  perRt: { rt: number; kk: number; warga: number; bansos: number; lakiLaki: number; perempuan: number }[];
  pengangguran: {
    total: number;
    perUsia: Record<string, number>;
  };
  totalDisabilitas: number;
  totalIbuHamil: number;
  totalLayakBansos: number;
  kkEkonomiTerisi: number;
  avgPenghuni: number;
  rtList: number[];
};

type RecordChartRow = {
  label: string;
  value: number;
  fill?: string;
};

const PIE_COLORS = ["#0f766e", "#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"];

const genderConfig = {
  value: { label: "Jumlah" },
  "Laki-laki": { label: "Laki-laki", color: "#0f766e" },
  Perempuan: { label: "Perempuan", color: "#f97316" },
} satisfies ChartConfig;

const usiaConfig = {
  total: { label: "Warga", color: "#0ea5e9" },
} satisfies ChartConfig;

const rtConfig = {
  warga: { label: "Warga", color: "#0f766e" },
  kk: { label: "KK", color: "#f59e0b" },
  bansos: { label: "Penerima Bansos", color: "#ef4444" },
} satisfies ChartConfig;

const pekerjaanConfig = {
  count: { label: "Jumlah", color: "#6366f1" },
} satisfies ChartConfig;

const pendidikanConfig = {
  value: { label: "Jumlah", color: "#14b8a6" },
} satisfies ChartConfig;

const kesehatanConfig = {
  value: { label: "Jumlah", color: "#ef4444" },
} satisfies ChartConfig;

const ekonomiConfig = {
  value: { label: "KK", color: "#f59e0b" },
} satisfies ChartConfig;

const radarConfig = {
  value: { label: "Jumlah Kasus", color: "#8b5cf6" },
} satisfies ChartConfig;

const coverageConfig = {
  value: { label: "Persen", color: "#0f766e" },
} satisfies ChartConfig;

function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

function toChartData(record: Record<string, number>, limit?: number): RecordChartRow[] {
  const rows = Object.entries(record)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  if (!limit || rows.length <= limit) {
    return rows;
  }

  const topRows = rows.slice(0, limit);
  const others = rows.slice(limit).reduce((sum, item) => sum + item.value, 0);
  if (others > 0) {
    topRows.push({ label: "Lainnya", value: others });
  }
  return topRows;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
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
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
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
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}

function SimpleLegend({ items }: { items: { label: string; value: number; fill?: string }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/35 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.fill || PIE_COLORS[index % PIE_COLORS.length] }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
          <span className="font-semibold text-foreground">{formatNumber(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [rtFilter, setRtFilter] = useState("semua");

  const { data, isLoading, isFetching } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", rtFilter],
    queryFn: async () => {
      const query = rtFilter === "semua" ? "" : `?rt=${rtFilter}`;
      const response = await fetch(`/api/stats/dashboard${query}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Gagal mengambil data dashboard");
      }
      return response.json();
    },
  });

  const genderData = useMemo(() => {
    return toChartData(data?.jenisKelamin || {}).map((item, index) => ({
      ...item,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [data?.jenisKelamin]);

  const usiaData = useMemo(
    () =>
      Object.entries(data?.kelompokUsia || {}).map(([label, total]) => ({
        label,
        total,
      })),
    [data?.kelompokUsia],
  );

  const rtData = useMemo(
    () =>
      (data?.perRt || []).map((item) => ({
        label: `RT ${item.rt}`,
        warga: item.warga,
        kk: item.kk,
        bansos: item.bansos,
        lakiLaki: item.lakiLaki,
        perempuan: item.perempuan,
      })),
    [data?.perRt],
  );

  const pekerjaanData = useMemo(
    () =>
      (data?.pekerjaan || []).map((item) => ({
        label: item.name || "Belum Diisi",
        count: item.count,
      })),
    [data?.pekerjaan],
  );

  const pendidikanData = useMemo(() => toChartData(data?.pendidikan || {}, 6), [data?.pendidikan]);
  const kesehatanData = useMemo(() => toChartData(data?.kondisiKesehatan || {}, 6), [data?.kondisiKesehatan]);
  const ekonomiData = useMemo(() => toChartData(data?.kategoriEkonomi || {}, 6), [data?.kategoriEkonomi]);
  const rumahData = useMemo(() => toChartData(data?.statusRumah || {}, 5), [data?.statusRumah]);

  const radarData = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Pengangguran", value: data.pengangguran.total },
      { label: "Disabilitas", value: data.totalDisabilitas },
      { label: "Ibu Hamil", value: data.totalIbuHamil },
      { label: "Layak Bansos", value: data.totalLayakBansos },
      { label: "Penerima Bansos", value: data.bansos.penerima },
    ];
  }, [data]);

  const coverageData = useMemo(() => {
    if (!data) return [];
    return [
      { label: "WA Terisi", value: percentage(data.waOwnership.punya, data.totalWarga), fill: "#0f766e" },
      { label: "Ekonomi KK", value: percentage(data.kkEkonomiTerisi, data.totalKk), fill: "#f59e0b" },
      { label: "Penerima Bansos", value: percentage(data.bansos.penerima, data.totalKk), fill: "#ef4444" },
    ];
  }, [data]);

  const bansosData = useMemo(
    () => [
      { label: "Penerima", value: data?.bansos.penerima || 0, fill: "#ef4444" },
      { label: "Non Penerima", value: data?.bansos.bukan || 0, fill: "#22c55e" },
    ],
    [data?.bansos],
  );

  const selectedRtLabel = rtFilter === "semua" ? "Semua RT" : `RT ${rtFilter}`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[360px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
          <BadgeInfo className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-semibold">Data dashboard belum tersedia</p>
            <p className="text-sm text-muted-foreground">Coba muat ulang halaman untuk mengambil data terbaru.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Dashboard Kondisi Warga</p>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Ringkasan detail warga, KK, dan profil keluarga</h1>
            <p className="text-sm text-muted-foreground">
              Menampilkan persebaran warga berdasarkan form profil, form kartu keluarga, dan form data warga untuk {selectedRtLabel.toLowerCase()}.
            </p>
          </div>
        </div>

        <div className="w-full max-w-[220px]">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filter wilayah
          </p>
          <Select value={rtFilter} onValueChange={setRtFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih RT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua RT</SelectItem>
              {data.rtList.map((rt) => (
                <SelectItem key={rt} value={String(rt)}>
                  RT {rt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFetching ? <p className="mt-2 text-xs text-muted-foreground">Memuat ulang data...</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Warga"
          value={formatNumber(data.totalWarga)}
          description={`${formatNumber(data.jenisKelamin["Laki-laki"] || 0)} laki-laki dan ${formatNumber(data.jenisKelamin.Perempuan || 0)} perempuan`}
          icon={Users}
        />
        <MetricCard
          title="Total KK"
          value={formatNumber(data.totalKk)}
          description={`Rata-rata ${data.avgPenghuni.toLocaleString("id-ID")} penghuni per KK`}
          icon={House}
        />
        <MetricCard
          title="Kepemilikan WhatsApp"
          value={`${percentage(data.waOwnership.punya, data.totalWarga)}%`}
          description={`${formatNumber(data.waOwnership.punya)} warga sudah mengisi nomor WhatsApp`}
          icon={Smartphone}
        />
        <MetricCard
          title="Penerima Bansos"
          value={formatNumber(data.bansos.penerima)}
          description={`${percentage(data.bansos.penerima, data.totalKk)}% dari total KK di ${selectedRtLabel}`}
          icon={HandHelping}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <ChartCard
          title="Sebaran Warga dan KK per RT"
          description="Membandingkan jumlah warga, KK, dan penerima bansos di tiap RT."
          footer={
            <div className="grid gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground md:grid-cols-3">
              <p>Total RT terdata: <span className="font-semibold text-foreground">{formatNumber(data.rtList.length)}</span></p>
              <p>RT dengan warga terbanyak: <span className="font-semibold text-foreground">{rtData.slice().sort((a, b) => b.warga - a.warga)[0]?.label || "-"}</span></p>
              <p>RT dengan bansos terbanyak: <span className="font-semibold text-foreground">{rtData.slice().sort((a, b) => b.bansos - a.bansos)[0]?.label || "-"}</span></p>
            </div>
          }
        >
          <ChartContainer className="h-[320px] w-full" config={rtConfig}>
            <BarChart data={rtData} barGap={8}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="warga" radius={[10, 10, 0, 0]} fill="var(--color-warga)" />
              <Bar dataKey="kk" radius={[10, 10, 0, 0]} fill="var(--color-kk)" />
              <Bar dataKey="bansos" radius={[10, 10, 0, 0]} fill="var(--color-bansos)" />
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Komposisi Jenis Kelamin"
          description="Perbandingan warga laki-laki dan perempuan dari data profil warga."
          footer={
            <SimpleLegend items={genderData} />
          }
        >
          <ChartContainer className="mx-auto h-[320px] max-w-[360px]" config={genderConfig}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Pie data={genderData} dataKey="value" nameKey="label" innerRadius={70} outerRadius={108} paddingAngle={4}>
                {genderData.map((item, index) => (
                  <Cell key={item.label} fill={item.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Kelompok Usia Warga"
          description="Distribusi umur warga dari tanggal lahir pada form profil."
        >
          <ChartContainer className="h-[300px] w-full" config={usiaConfig}>
            <AreaChart data={usiaData} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="usiaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="total" stroke="var(--color-total)" fill="url(#usiaGradient)" strokeWidth={3} />
            </AreaChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Pekerjaan Warga"
          description="10 pekerjaan dominan dari form data warga."
        >
          <ChartContainer className="h-[300px] w-full" config={pekerjaanConfig}>
            <BarChart data={pekerjaanData} layout="vertical" margin={{ left: 12, right: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" width={110} dataKey="label" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 10, 10, 0]} fill="var(--color-count)" />
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Pendidikan Terakhir"
          description="Tingkat pendidikan yang paling banyak terisi pada form warga."
        >
          <ChartContainer className="h-[300px] w-full" config={pendidikanConfig}>
            <BarChart data={pendidikanData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} angle={-18} textAnchor="end" height={64} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="var(--color-value)" />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.1fr]">
        <ChartCard
          title="Kondisi Kesehatan"
          description="Ringkasan status kesehatan yang tercatat di form warga."
        >
          <ChartContainer className="h-[300px] w-full" config={kesehatanConfig}>
            <BarChart data={kesehatanData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={60} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="var(--color-value)" />
            </BarChart>
          </ChartContainer>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Accessibility className="h-4 w-4" /> Disabilitas</p>
              <p className="mt-1 text-xl font-semibold">{formatNumber(data.totalDisabilitas)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Baby className="h-4 w-4" /> Ibu Hamil</p>
              <p className="mt-1 text-xl font-semibold">{formatNumber(data.totalIbuHamil)}</p>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Kerentanan Sosial"
          description="Gabungan indikator pengangguran, disabilitas, kehamilan, dan bansos."
        >
          <ChartContainer className="h-[360px] w-full" config={radarConfig}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="label" />
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Radar dataKey="value" fill="var(--color-value)" fillOpacity={0.28} stroke="var(--color-value)" strokeWidth={2} />
            </RadarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Kelengkapan dan Cakupan Data"
          description="Persentase isian penting dari profil keluarga dan warga."
          footer={
            <div className="space-y-3">
              <SimpleLegend items={coverageData} />
              <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                <p>Data ekonomi KK terisi: <span className="font-semibold text-foreground">{formatNumber(data.kkEkonomiTerisi)}</span> dari <span className="font-semibold text-foreground">{formatNumber(data.totalKk)}</span> KK</p>
              </div>
            </div>
          }
        >
          <ChartContainer className="h-[300px] w-full" config={coverageConfig}>
            <RadialBarChart data={coverageData} innerRadius="24%" outerRadius="100%" barSize={26} startAngle={180} endAngle={0}>
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <RadialBar background dataKey="value" cornerRadius={12} />
            </RadialBarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
        <ChartCard
          title="Status Rumah KK"
          description="Gambaran kepemilikan atau status hunian keluarga."
          footer={<SimpleLegend items={rumahData} />}
        >
          <ChartContainer className="mx-auto h-[300px] max-w-[340px]" config={{ value: { label: "KK" } }}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Pie data={rumahData} dataKey="value" nameKey="label" innerRadius={52} outerRadius={104} paddingAngle={3}>
                {rumahData.map((item, index) => (
                  <Cell key={item.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Kategori Ekonomi KK"
          description="Segmentasi kemampuan ekonomi berdasarkan form kartu keluarga."
        >
          <ChartContainer className="h-[300px] w-full" config={ekonomiConfig}>
            <BarChart data={ekonomiData} layout="vertical" margin={{ left: 16, right: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" width={118} dataKey="label" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="var(--color-value)" />
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Status Bansos Keluarga"
          description="Proporsi keluarga penerima dan non-penerima bansos."
          footer={
            <SimpleLegend items={bansosData} />
          }
        >
          <ChartContainer className="mx-auto h-[300px] max-w-[360px]" config={{ value: { label: "KK" } }}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Pie data={bansosData} dataKey="value" nameKey="label" innerRadius={68} outerRadius={110}>
                {bansosData.map((item) => (
                  <Cell key={item.label} fill={item.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Pengangguran Terdeteksi"
          value={formatNumber(data.pengangguran.total)}
          description="Warga usia produktif yang belum memiliki pekerjaan terdata"
          icon={Briefcase}
        />
        <MetricCard
          title="Layak Bansos"
          value={formatNumber(data.totalLayakBansos)}
          description="KK yang ditandai layak menerima bantuan"
          icon={HandHelping}
        />
        <MetricCard
          title="Catatan Kesehatan"
          value={formatNumber(Object.values(data.kondisiKesehatan).reduce((sum, current) => sum + current, 0))}
          description="Total entri kesehatan yang sudah diisi warga"
          icon={HeartPulse}
        />
        <MetricCard
          title="Profil Ekonomi Terisi"
          value={`${percentage(data.kkEkonomiTerisi, data.totalKk)}%`}
          description="KK yang sudah mengisi penghasilan atau kategori ekonomi"
          icon={BadgeInfo}
        />
      </div>
    </div>
  );
}
