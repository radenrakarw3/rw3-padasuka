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
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Visitrw3Panel } from "@/components/admin/visitrw3-admin-ui";

export const PIE_COLORS = ["#0f766e", "#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"];
export const CHART_BRAND = "#0f766e";
export const CHART_GOLD = "#b8954a";
const BRAND = CHART_BRAND;
const GOLD = CHART_GOLD;

const pieConfig = { value: { label: "Jumlah" } } satisfies ChartConfig;
const barConfig = { count: { label: "Jumlah", color: BRAND } } satisfies ChartConfig;
const areaConfig = { count: { label: "Pengajuan", color: BRAND } } satisfies ChartConfig;

export type PieDatum = { label: string; value: number; fill: string };

export function DashboardSection({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1 pt-2">
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Visitrw3Panel title={title} description={description}>
      {children}
    </Visitrw3Panel>
  );
}

export function toPieData(
  record: Record<string, number>,
  labelMap?: Record<string, string>,
): PieDatum[] {
  return Object.entries(record)
    .filter(([, v]) => v > 0)
    .map(([key, value], i) => ({
      label: labelMap?.[key] ?? key,
      value,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

export function rowsToPie(rows: { label: string; count: number }[]): PieDatum[] {
  return rows
    .filter((r) => r.count > 0)
    .map((r, i) => ({ label: r.label, value: r.count, fill: PIE_COLORS[i % PIE_COLORS.length] }));
}

export function pairsToPie(pairs: { label: string; value: number }[]): PieDatum[] {
  return pairs
    .filter((p) => p.value > 0)
    .map((p, i) => ({ ...p, fill: PIE_COLORS[i % PIE_COLORS.length] }));
}

function formatBulanLabel(raw: string) {
  const m = /^(\d{4})-(\d{2})/.exec(raw);
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

function ChartEmpty({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground py-8 text-center">{message}</p>;
}

function ChartLegend({ items }: { items: { label: string; value: number; fill: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="mt-2 space-y-1.5 text-xs">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.fill }} />
            <span className="truncate text-muted-foreground">{item.label}</span>
          </span>
          <span className="font-semibold tabular-nums">
            {item.value}
            {total > 0 && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({Math.round((item.value / total) * 100)}%)
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Donut + legenda — komposisi kategori */
export function DonutBlock({
  data,
  empty,
  centerLabel,
}: {
  data: PieDatum[];
  empty: string;
  centerLabel?: string;
}) {
  if (data.length === 0) return <ChartEmpty message={empty} />;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[200px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={`${entry.label}-${i}`} fill={entry.fill} />
            ))}
          </Pie>
          {centerLabel && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground">
              <tspan x="50%" dy="-0.2em" className="text-lg font-bold">
                {total}
              </tspan>
              <tspan x="50%" dy="1.4em" className="text-[10px] fill-muted-foreground">
                {centerLabel}
              </tspan>
            </text>
          )}
        </PieChart>
      </ChartContainer>
      <ChartLegend items={data} />
    </div>
  );
}

/** Pie klasik (tetap untuk kompatibilitas) */
export function PieBlock({ data, empty }: { data: PieDatum[]; empty: string }) {
  return <DonutBlock data={data} empty={empty} />;
}

/** Batang vertikal / horizontal */
export function BarBlock({
  data,
  empty,
  vertical,
  height = 220,
  color = BRAND,
}: {
  data: { label: string; count: number }[];
  empty: string;
  vertical?: boolean;
  height?: number;
  color?: string;
}) {
  if (data.length === 0) return <ChartEmpty message={empty} />;
  const cfg = { count: { label: "Jumlah", color } } satisfies ChartConfig;
  if (vertical) {
    return (
      <ChartContainer config={cfg} className="w-full" style={{ height }}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
          <YAxis type="category" dataKey="label" width={108} tickLine={false} axisLine={false} fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    );
  }
  return (
    <ChartContainer config={cfg} className="w-full" style={{ height }}>
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

/** Tren waktu — area chart */
export function AreaTrendBlock({
  data,
  empty,
  height = 220,
}: {
  data: { label: string; count: number }[];
  empty: string;
  height?: number;
}) {
  if (data.length === 0) return <ChartEmpty message={empty} />;
  const chartData = data.map((d) => ({ ...d, bulan: formatBulanLabel(d.label) }));
  return (
    <ChartContainer config={areaConfig} className="w-full" style={{ height }}>
      <AreaChart data={chartData} margin={{ left: 8, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="visitrw3Area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="bulan" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={32} />
        <ChartTooltip content={<ChartTooltipContent labelKey="bulan" />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#visitrw3Area)"
          dot={{ r: 3, fill: BRAND, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

/** Corong alur — tahap menurun */
export function FunnelBlock({
  stages,
  empty,
}: {
  stages: { label: string; value: number; fill?: string }[];
  empty: string;
}) {
  const filtered = stages.filter((s) => s.value > 0);
  if (filtered.length === 0) return <ChartEmpty message={empty} />;
  const max = Math.max(...filtered.map((s) => s.value), 1);
  return (
    <div className="space-y-2 py-1">
      {filtered.map((stage, i) => {
        const pct = Math.max(12, Math.round((stage.value / max) * 100));
        const color = stage.fill ?? PIE_COLORS[i % PIE_COLORS.length];
        return (
          <div key={stage.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{stage.label}</span>
              <span className="font-semibold tabular-nums">{stage.value}</span>
            </div>
            <div className="h-8 w-full rounded-lg bg-muted/40 overflow-hidden flex justify-center">
              <div
                className="h-full rounded-lg transition-all flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: `${pct}%`, backgroundColor: color, minWidth: stage.value > 0 ? "2.5rem" : 0 }}
              >
                {pct >= 22 ? `${Math.round((stage.value / max) * 100)}%` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Radial bar — perbandingan kategori sedikit (termin, jenis kelamin) */
export function RadialBarBlock({
  data,
  empty,
}: {
  data: PieDatum[];
  empty: string;
}) {
  if (data.length === 0) return <ChartEmpty message={empty} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const radialData = data.map((d) => ({
    ...d,
    pct: Math.round((d.value / max) * 100),
  }));
  const cfg = Object.fromEntries(
    radialData.map((d, i) => [d.label, { label: d.label, color: d.fill ?? PIE_COLORS[i % PIE_COLORS.length] }]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={cfg} className="mx-auto aspect-square max-h-[240px]">
      <RadialBarChart
        data={radialData}
        innerRadius="18%"
        outerRadius="95%"
        startAngle={90}
        endAngle={-270}
      >
        <PolarGrid gridType="circle" />
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
        <ChartTooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null;
            const p = payload[0].payload as PieDatum & { pct: number };
            return (
              <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-md">
                <p className="font-medium">{p.label}</p>
                <p className="text-muted-foreground">
                  {p.value} pengajuan
                </p>
              </div>
            );
          }}
        />
        <RadialBar dataKey="pct" background cornerRadius={4}>
          {radialData.map((entry, i) => (
            <Cell key={entry.label} fill={entry.fill ?? PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>
  );
}

/** Satu bar 100% — komposisi dua+ kategori */
export function StackedPercentBlock({
  segments,
  empty,
}: {
  segments: { label: string; value: number; fill: string }[];
  empty: string;
}) {
  const filtered = segments.filter((s) => s.value > 0);
  if (filtered.length === 0) return <ChartEmpty message={empty} />;
  const total = filtered.reduce((s, x) => s + x.value, 0);
  return (
    <div className="space-y-3 py-1">
      <div className="flex h-9 w-full overflow-hidden rounded-full ring-1 ring-border/50">
        {filtered.map((seg) => (
          <div
            key={seg.label}
            className="h-full transition-all first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(seg.value / total) * 100}%`,
              backgroundColor: seg.fill,
              minWidth: seg.value > 0 ? "4px" : 0,
            }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>
      <ChartLegend items={filtered} />
    </div>
  );
}

/** Daftar peringkat + bar proporsional */
export function RankedBarBlock({
  data,
  empty,
  maxItems = 8,
}: {
  data: { label: string; count: number }[];
  empty: string;
  maxItems?: number;
}) {
  const rows = data.filter((r) => r.count > 0).slice(0, maxItems);
  if (rows.length === 0) return <ChartEmpty message={empty} />;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="space-y-2.5 py-1">
      {rows.map((row, i) => (
        <li key={row.label}>
          <div className="flex justify-between text-xs mb-1 gap-2">
            <span className="truncate text-muted-foreground" title={row.label}>
              {row.label}
            </span>
            <span className="font-semibold tabular-nums shrink-0">{row.count}</span>
          </div>
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.count / max) * 100}%`,
                backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Ring persentase tunggal — KPI */
export function MetricRingBlock({
  percent,
  label,
  detail,
  empty,
  color = BRAND,
}: {
  percent: number | null;
  label: string;
  detail?: string;
  empty?: string;
  color?: string;
}) {
  if (percent == null || Number.isNaN(percent)) {
    return <ChartEmpty message={empty ?? "Belum ada data"} />;
  }
  const clamped = Math.min(100, Math.max(0, percent));
  const ringData = [{ name: "pct", value: clamped, fill: color }];
  return (
    <div className="flex flex-col items-center py-2">
      <ChartContainer
        config={{ pct: { label: "%", color } }}
        className="mx-auto aspect-square max-h-[140px] w-[140px]"
      >
        <PieChart>
          <Pie
            data={[{ value: 100, fill: "hsl(var(--muted))" }]}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={46}
            outerRadius={58}
            strokeWidth={0}
          />
          <Pie
            data={ringData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={46}
            outerRadius={58}
            startAngle={90}
            endAngle={90 - (clamped / 100) * 360}
            strokeWidth={0}
          />
          <text x="50%" y="48%" textAnchor="middle" className="fill-foreground text-xl font-bold">
            {Math.round(clamped)}%
          </text>
        </PieChart>
      </ChartContainer>
      <p className="text-sm font-medium mt-1">{label}</p>
      {detail && <p className="text-xs text-muted-foreground text-center">{detail}</p>}
    </div>
  );
}

/** Histogram usia / kelompok — bar dengan warna gradasi */
export function HistogramBlock({
  data,
  empty,
  height = 220,
}: {
  data: { label: string; count: number }[];
  empty: string;
  height?: number;
}) {
  if (data.length === 0) return <ChartEmpty message={empty} />;
  const enriched = data.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  const cfg = { count: { label: "Jumlah", color: BRAND } } satisfies ChartConfig;
  return (
    <ChartContainer config={cfg} className="w-full" style={{ height }}>
      <BarChart data={enriched} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={48} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {enriched.map((entry, i) => (
            <Cell key={entry.label} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function StatChips({ items }: { items: { label: string; value: number | string }[] }) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {items.map((item) => (
        <span key={item.label} className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs">
          {item.label}: <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  );
}
