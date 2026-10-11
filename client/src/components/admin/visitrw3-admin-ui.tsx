import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Visitrw3AdminShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "space-y-5 -mx-1 px-1 pb-2 rounded-2xl",
        "bg-gradient-to-b from-[hsl(163,55%,22%)]/[0.05] via-transparent to-[hsl(40,45%,55%)]/[0.03]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Visitrw3StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
  href,
}: {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success" | "gold";
  href?: string;
}) {
  const toneClass = {
    default: "from-[hsl(163,55%,22%)]/10 to-[hsl(163,55%,22%)]/5 text-[hsl(163,55%,22%)]",
    warning: "from-amber-500/15 to-amber-500/5 text-amber-700",
    success: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
    gold: "from-[hsl(40,45%,55%)]/20 to-[hsl(40,45%,55%)]/5 text-[hsl(40,35%,35%)]",
  }[tone];

  const card = (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm transition-shadow",
      href && "hover:shadow-md cursor-pointer",
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
        </div>
        <div className={cn("rounded-xl bg-gradient-to-br p-2 shrink-0 sm:rounded-2xl sm:p-3", toneClass)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline text-inherit">
        {card}
      </Link>
    );
  }
  return card;
}

export function Visitrw3Panel({
  title,
  description,
  actions,
  children,
  className,
  noPadding,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card/90 shadow-sm overflow-clip", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
          <div>
            {title && <h3 className="text-sm font-bold">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn(!noPadding && "p-4 sm:p-5")}>{children}</div>
    </div>
  );
}

export function Visitrw3Toolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Cari…",
  children,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/80 p-2 shadow-sm",
        className,
      )}
    >
      {onSearchChange != null && (
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-h-11 pl-9 text-base border-0 bg-muted/40 focus-visible:ring-1 sm:min-h-9 sm:h-9 sm:text-sm"
          />
        </div>
      )}
      {children}
    </div>
  );
}

export function Visitrw3ChipFilters<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:gap-1.5 sm:overflow-visible sm:px-0",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs",
              active
                ? "bg-[hsl(163,55%,22%)] text-white shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span
                className={cn(
                  "min-w-[1.25rem] rounded-full px-1 py-0.5 text-[10px] text-center leading-none",
                  active ? "bg-white/20" : "bg-background",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Visitrw3EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-[hsl(163,55%,22%)]/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-[hsl(163,55%,28%)]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Visitrw3ListItem({
  children,
  actions,
  accent = "default",
  onClick,
  className,
  testId,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  accent?: "default" | "warning" | "danger" | "success";
  onClick?: () => void;
  className?: string;
  testId?: string;
}) {
  const accentBar = {
    default: "bg-[hsl(163,55%,22%)]",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    success: "bg-emerald-500",
  }[accent];

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      data-testid={testId}
      className={cn(
        "group relative w-full text-left rounded-xl border border-border/60 bg-card/90 shadow-sm",
        "transition-all hover:shadow-md hover:border-[hsl(163,55%,22%)]/25",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", accentBar)} />
      <div className="flex flex-col gap-3 py-3.5 pl-4 pr-3 sm:flex-row sm:items-start sm:justify-between sm:pl-5 sm:pr-4">
        <div className="flex-1 min-w-0">{children}</div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-1 sm:opacity-90 sm:group-hover:opacity-100">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function Visitrw3FormCard({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Visitrw3Panel
      title={title}
      actions={
        <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Tutup">
          <X className="w-4 h-4" />
        </Button>
      }
    >
      {children}
    </Visitrw3Panel>
  );
}

export function Visitrw3RtBadge({ rt }: { rt: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[hsl(163,55%,22%)] px-1.5 py-0.5 text-[10px] font-bold text-white">
      RT {String(rt).padStart(2, "0")}
    </span>
  );
}

export function Visitrw3MonoId({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-sm font-semibold tracking-tight text-[hsl(163,55%,22%)]">{children}</span>;
}
