import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Baby, Briefcase, GraduationCap, HeartHandshake, MessageCircle, UserX, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  GovStatistic,
  GovStatisticRow,
  GovStatisticSection,
} from "@/components/gov/statistic";
import {
  buildKategoriUmurDisplayItems,
  type KategoriUmurId,
  type WargaKategoriSlice,
} from "@shared/kategori-umur";
import {
  buildPekerjaanRingkasan,
  filterWargaByPekerjaanChartLabel,
  PENGANGGURAN_KETERANGAN,
  type PekerjaanRingkasanInput,
} from "@shared/pekerjaan-labor";
import {
  buildPekerjaanChartWaMessage,
  resolveWaVerifikasi,
  type WargaIssueSlice,
} from "@shared/warga-data-issues";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toWaMeUrl } from "@/lib/wa";

const barConfig = { count: { label: "Jumlah", color: "#0f766e" } } satisfies ChartConfig;

export function formatNumber(n: number) {
  return n.toLocaleString("id-ID");
}

export function MetricCard({
  title,
  value,
  description,
  selected,
  onClick,
}: {
  title: string;
  value: string;
  description: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`border-border/70 bg-card/80 shadow-sm ${
        onClick ? "cursor-pointer hover:border-primary/40 transition-colors" : ""
      } ${selected ? "ring-2 ring-[hsl(163,55%,28%)] border-[hsl(163,55%,28%)]/40" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function BarBlock({
  data,
  empty,
  labelWidth = 56,
  height = 260,
  onBarClick,
}: {
  data: { label: string; count: number }[];
  empty: string;
  labelWidth?: number;
  height?: number;
  onBarClick?: (label: string) => void;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>;
  }
  return (
    <ChartContainer config={barConfig} className="w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" />
        <YAxis type="category" dataKey="label" width={labelWidth} tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          fill="#0f766e"
          radius={4}
          cursor={onBarClick ? "pointer" : undefined}
          onClick={(bar) => {
            const label = (bar as { payload?: { label?: string } })?.payload?.label;
            if (label && onBarClick) onBarClick(label);
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}

function PekerjaanWargaListDialog({
  open,
  onOpenChange,
  chartLabel,
  rows,
  allWarga,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartLabel: string | null;
  rows: WargaIssueSlice[];
  allWarga: WargaIssueSlice[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{chartLabel ?? "Daftar warga"}</DialogTitle>
          <DialogDescription>
            {formatNumber(rows.length)} warga · klik Hubungi WA untuk konfirmasi data pekerjaan
          </DialogDescription>
        </DialogHeader>
        <ul className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
          {rows.map((row) => {
            const wa = resolveWaVerifikasi(row, allWarga);
            const waUrl = wa
              ? toWaMeUrl(wa.phone, buildPekerjaanChartWaMessage(row, chartLabel ?? ""))
              : null;
            return (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/80 p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      RT {String(row.rt).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-sm leading-tight">{row.namaLengkap}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    NIK {row.nik}
                    {row.pekerjaan?.trim() ? ` · ${row.pekerjaan.trim()}` : " · pekerjaan kosong"}
                  </p>
                  {wa?.via === "kepala_keluarga" && (
                    <p className="text-[11px] text-muted-foreground">WA via kepala keluarga</p>
                  )}
                </div>
                {waUrl ? (
                  <Button variant="outline" size="sm" className="shrink-0" asChild>
                    <a href={waUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4 mr-1.5" />
                      Hubungi WA
                    </a>
                  </Button>
                ) : (
                  <Badge variant="secondary" className="text-xs font-normal shrink-0">
                    Tanpa WA
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function StatsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const KATEGORI_ICON: Partial<Record<KategoriUmurId, LucideIcon>> = {
  "0-5": Baby,
  "7-18": GraduationCap,
};

type PekerjaanWargaSlice = WargaKategoriSlice &
  WargaIssueSlice &
  PekerjaanRingkasanInput;

export function PekerjaanPanel({ warga }: { warga: PekerjaanWargaSlice[] }) {
  const [chartLabel, setChartLabel] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const ringkasan = useMemo(() => buildPekerjaanRingkasan(warga), [warga]);
  const { summary } = ringkasan;

  const selectedWarga = useMemo(() => {
    if (!chartLabel) return [];
    return filterWargaByPekerjaanChartLabel(warga, chartLabel).sort(
      (a, b) => a.rt - b.rt || a.namaLengkap.localeCompare(b.namaLengkap, "id"),
    );
  }, [chartLabel, warga]);

  const openChartDialog = (label: string) => {
    setChartLabel(label);
    setDialogOpen(true);
  };

  return (
    <GovStatisticSection
      title="Pekerjaan"
      description="Status di luar angkatan kerja — 0–6 «Bimbingan Orang Tua», 7–18 «Pelajar», 65+ «Pensiunan»"
    >
      <div className="space-y-6">
        <GovStatisticRow cols={5}>
          <GovStatistic
            label="Bimbingan Orang Tua"
            value={formatNumber(summary.bimbinganOrangTua)}
            description="Usia 0–6 tahun"
            icon={HeartHandshake}
            tone="info"
          />
          <GovStatistic
            label="Pelajar"
            value={formatNumber(summary.pelajar)}
            description="Usia 7–18 tahun"
            icon={GraduationCap}
            tone="info"
          />
          <GovStatistic
            label="Angkatan kerja"
            value={formatNumber(summary.jabatan)}
            description="Jabatan/pekerjaan aktif"
            icon={Briefcase}
          />
          <GovStatistic
            label="Pengangguran"
            value={formatNumber(summary.pengangguran)}
            description={PENGANGGURAN_KETERANGAN}
            icon={UserX}
            tone="warning"
          />
          <GovStatistic
            label="Belum diisi"
            value={formatNumber(summary.belumDiisi)}
            description="Kolom pekerjaan kosong"
            icon={Users}
            tone={summary.belumDiisi > 0 ? "warning" : "default"}
          />
        </GovStatisticRow>

        {(summary.irt > 0 || summary.pensiun > 0) && (
          <GovStatisticRow cols={4}>
            {summary.irt > 0 && (
              <GovStatistic
                label="Ibu Rumah Tangga"
                value={formatNumber(summary.irt)}
                description="Di luar angkatan kerja (ILO)"
              />
            )}
            {summary.pensiun > 0 && (
              <GovStatistic
                label="Pensiun"
                value={formatNumber(summary.pensiun)}
                description="Di luar angkatan kerja (ILO)"
              />
            )}
          </GovStatisticRow>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Status pekerjaan</p>
          <p className="text-xs text-muted-foreground">Klik bar untuk lihat daftar warga</p>
          <BarBlock
            data={ringkasan.statusChart}
            empty="Belum ada data status pekerjaan"
            labelWidth={168}
            height={Math.max(180, ringkasan.statusChart.length * 36)}
            onBarClick={openChartDialog}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Jabatan angkatan kerja</p>
          <p className="text-xs text-muted-foreground">Klik bar untuk lihat daftar warga</p>
          <BarBlock
            data={ringkasan.jabatanChart}
            empty="Belum ada data jabatan"
            labelWidth={168}
            height={Math.max(220, ringkasan.jabatanChart.length * 36)}
            onBarClick={openChartDialog}
          />
        </div>
      </div>

      <PekerjaanWargaListDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        chartLabel={chartLabel}
        rows={selectedWarga}
        allWarga={warga}
      />
    </GovStatisticSection>
  );
}

export function KategoriUmurPanel({ warga }: { warga: WargaKategoriSlice[] }) {
  const items = useMemo(() => buildKategoriUmurDisplayItems(warga), [warga]);
  const chartData = useMemo(
    () =>
      items
        .filter((item) => item.count > 0)
        .map((item) => ({ label: item.chartLabel, count: item.count })),
    [items],
  );
  const totalTerisi = items.reduce((s, i) => s + (i.id !== "belum_diisi" ? i.count : 0), 0);
  const pelajar = items.find((i) => i.id === "7-18");

  return (
    <GovStatisticSection
      title="Kategori Umur"
      description="0–6 = Bimbingan Orang Tua · 7–18 = Pelajar · 65+ = Pensiunan · dihitung dari tanggal lahir"
    >
      <div className="space-y-5">
        {pelajar && pelajar.count > 0 && (
          <div className="rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{formatNumber(pelajar.count)} pelajar</span>
            {" "}usia 7–18 ({pelajar.shortLabel}) —{" "}
            {totalTerisi > 0
              ? `${Math.round((pelajar.count / totalTerisi) * 100)}% dari populasi terdata`
              : "belum ada data usia"}
          </div>
        )}

        <GovStatisticRow cols={5}>
          {items
            .filter((item) => item.id !== "belum_diisi")
            .map((item) => (
              <GovStatistic
                key={item.id}
                label={item.label}
                value={formatNumber(item.count)}
                description={item.description}
                icon={KATEGORI_ICON[item.id] ?? Users}
                tone={item.isPelajar ? "info" : "default"}
              />
            ))}
        </GovStatisticRow>

        {items.some((i) => i.id === "belum_diisi" && i.count > 0) && (
          <div className="max-w-xs">
            <GovStatistic
              label="Usia belum diisi"
              value={formatNumber(items.find((i) => i.id === "belum_diisi")?.count ?? 0)}
              description="Lengkapi tanggal lahir"
              tone="warning"
            />
          </div>
        )}

        <BarBlock
          data={chartData}
          empty="Belum ada data tanggal lahir"
          labelWidth={120}
          height={Math.max(220, chartData.length * 40)}
        />
      </div>
    </GovStatisticSection>
  );
}
