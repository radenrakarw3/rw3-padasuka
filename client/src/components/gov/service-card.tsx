import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceCardProps = {
  href: string;
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  variant?: "solid" | "glass" | "outline";
  iconClassName?: string;
};

export function ServiceCard({
  href,
  icon: Icon,
  eyebrow,
  title,
  description,
  variant = "solid",
  iconClassName,
}: ServiceCardProps) {
  const isGlass = variant === "glass";
  const isOutline = variant === "outline";

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-2xl p-5 transition-all group",
        isGlass
          ? "bg-white/10 border border-white/25 backdrop-blur-sm hover:bg-white/15 hover:border-white/35"
          : isOutline
            ? "bg-card border-2 border-brand/20 shadow-sm hover:border-brand/35 hover:shadow-md"
            : "bg-card shadow-lg border border-card-border hover:shadow-xl",
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            isGlass
              ? "bg-white/15 border border-white/20"
              : isOutline
                ? "bg-brand/10 border border-brand/15"
                : "bg-brand",
            iconClassName,
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6",
              isGlass ? "text-brand-accent-muted" : isOutline ? "text-brand" : "text-brand-foreground",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <p
              className={cn(
                "text-[10px] uppercase tracking-[0.2em] mb-0.5",
                isGlass ? "text-brand-accent-muted" : "text-muted-foreground",
              )}
            >
              {eyebrow}
            </p>
          )}
          <h2 className={cn("font-bold text-lg", isGlass ? "text-white" : "text-brand")}>{title}</h2>
          {description && (
            <p className={cn("text-sm mt-0.5", isGlass ? "text-white/70" : "text-muted-foreground")}>
              {description}
            </p>
          )}
        </div>
        <ChevronRight
          className={cn(
            "w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5",
            isGlass ? "text-white/50" : "text-muted-foreground",
          )}
          aria-hidden
        />
      </div>
    </Link>
  );
}
