import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type GovStatisticTone = "default" | "success" | "warning" | "info";

const toneIconClass: Record<GovStatisticTone, string> = {
  default: "bg-brand/10 text-brand",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

const colsClass = {
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
} as const;

export function GovStatistic({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
  selected,
  onClick,
}: {
  label: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  tone?: GovStatisticTone;
  selected?: boolean;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm transition-shadow",
        interactive && "cursor-pointer hover:border-brand/35 hover:shadow-md",
        selected && "ring-2 ring-brand border-brand/40",
      )}
    >
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="space-y-1 min-w-0">
          <p className="text-caption uppercase tracking-wide text-muted-foreground font-semibold">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("rounded-xl p-3 shrink-0", toneIconClass[tone])}>
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}

export function GovStatisticRow({
  cols = 4,
  children,
  className,
}: {
  cols?: 3 | 4 | 5;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 grid-cols-1", colsClass[cols], className)}>{children}</div>
  );
}

export function GovStatisticSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}
