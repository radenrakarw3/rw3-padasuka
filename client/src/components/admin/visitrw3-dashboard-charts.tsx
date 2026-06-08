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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Visitrw3Panel } from "@/components/admin/visitrw3-admin-ui";

export const PIE_COLORS = ["#0f766e", "#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"];

const pieConfig = { value: { label: "Jumlah" } } satisfies ChartConfig;
const barConfig = { count: { label: "Jumlah", color: "#0f766e" } } satisfies ChartConfig;

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
): { label: string; value: number; fill: string }[] {
  return Object.entries(record)
    .filter(([, v]) => v > 0)
    .map(([key, value], i) => ({
      label: labelMap?.[key] ?? key,
      value,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

export function rowsToPie(rows: { label: string; count: number }[]): { label: string; value: number; fill: string }[] {
  return rows
    .filter((r) => r.count > 0)
    .map((r, i) => ({ label: r.label, value: r.count, fill: PIE_COLORS[i % PIE_COLORS.length] }));
}

export function pairsToPie(
  pairs: { label: string; value: number }[],
): { label: string; value: number; fill: string }[] {
  return pairs
    .filter((p) => p.value > 0)
    .map((p, i) => ({ ...p, fill: PIE_COLORS[i % PIE_COLORS.length] }));
}

export function PieBlock({ data, empty }: { data: { label: string; value: number; fill: string }[]; empty: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>;
  }
  return (
    <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[220px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={76}>
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
  vertical,
  height = 220,
}: {
  data: { label: string; count: number }[];
  empty: string;
  vertical?: boolean;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>;
  }
  if (vertical) {
    return (
      <ChartContainer config={barConfig} className="w-full" style={{ height }}>
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
    <ChartContainer config={barConfig} className="w-full" style={{ height }}>
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
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
