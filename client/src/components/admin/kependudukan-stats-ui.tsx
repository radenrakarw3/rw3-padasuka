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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { BooleanItem, DistributionItem, FillRateItem, SectionStats } from "./kependudukan-types";

export const PIE_COLORS = ["#0f766e", "#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"];

const pieConfig = { value: { label: "Jumlah" } } satisfies ChartConfig;
const barConfig = { count: { label: "Jumlah", color: "#0f766e" } } satisfies ChartConfig;

export function formatNumber(n: number) {
  return n.toLocaleString("id-ID");
}

export function toPieData(record: Record<string, number>, max = 8) {
  return Object.entries(record)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([key, value], i) => ({
      label: key,
      value,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

export function MetricCard({
  title,
  value,
  description,
  onClick,
}: {
  title: string;
  value: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`border-border/70 bg-card/80 shadow-sm ${onClick ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
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

export function PieBlock({ data, empty }: { data: { label: string; value: number; fill: string }[]; empty: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>;
  }
  return (
    <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[220px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={72}>
          {data.map((entry, i) => (
            <Cell key={`${entry.label}-${i}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export function BarBlock({
  data,
  empty,
}: {
  data: { label: string; count: number }[];
  empty: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>;
  }
  return (
    <ChartContainer config={barConfig} className="h-[220px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" />
        <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="#0f766e" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

function DistributionCard({
  dist,
  onDrill,
}: {
  dist: DistributionItem;
  onDrill?: (field: string, value: string) => void;
}) {
  const pie = toPieData(dist.buckets);
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{dist.label}</CardTitle>
        <CardDescription className="text-xs">Klik segmen di tabel untuk lihat daftar warga</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <PieBlock data={pie} empty="Belum ada data" />
        <div className="max-h-32 overflow-y-auto text-xs space-y-1">
          {Object.entries(dist.buckets)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([k, c]) => (
              <button
                key={k}
                type="button"
                className="w-full flex justify-between gap-2 hover:bg-muted rounded px-1 py-0.5 text-left"
                onClick={() => onDrill?.(dist.field, k)}
              >
                <span className="truncate">{k}</span>
                <span className="font-mono shrink-0">{c}</span>
              </button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BooleanCard({ item, onDrill }: { item: BooleanItem; onDrill?: (field: string, value: string) => void }) {
  const total = item.true + item.false;
  const pct = total > 0 ? Math.round((item.true / total) * 100) : 0;
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-sm font-medium">{item.label}</p>
        <p className="text-xl font-bold mt-1">
          {item.true}{" "}
          <span className="text-sm font-normal text-muted-foreground">({pct}%)</span>
        </p>
        <div className="flex gap-2 mt-2 text-xs">
          <button type="button" className="underline text-primary" onClick={() => onDrill?.(item.field, "true")}>
            Lihat ya ({item.true})
          </button>
          <button type="button" className="underline text-muted-foreground" onClick={() => onDrill?.(item.field, "false")}>
            Tidak ({item.false})
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function FillRateList({ items }: { items: FillRateItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <div key={f.field}>
          <div className="flex justify-between text-xs mb-0.5">
            <span>{f.label}</span>
            <span className="font-mono">{f.percent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-[hsl(163,55%,32%)]" style={{ width: `${f.percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionPanel({
  section,
  onDrill,
}: {
  section: SectionStats;
  onDrill?: (sectionKey: string, field: string, value: string) => void;
}) {
  const drill = (field: string, value: string) => onDrill?.(section.key, field, value);
  const booleans = section.booleans ?? [];
  const distributions = section.distributions ?? [];
  const fillRates = section.fillRates ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{section.description}</span>
        <span className="text-xs rounded-full bg-muted px-2 py-0.5 font-medium">
          Kelengkapan bagian: {section.sectionFillPercent}%
        </span>
      </div>

      {booleans.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {booleans.map((b) => (
            <BooleanCard key={b.field} item={b} onDrill={drill} />
          ))}
        </div>
      )}

      {distributions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {distributions.map((d) => (
            <DistributionCard key={d.field} dist={d} onDrill={drill} />
          ))}
        </div>
      )}

      {fillRates.length > 0 && (
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tingkat pengisian field</CardTitle>
          </CardHeader>
          <CardContent>
            <FillRateList items={fillRates} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
