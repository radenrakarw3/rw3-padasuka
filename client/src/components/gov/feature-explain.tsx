import type { ReactNode } from "react";
import { Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureExplainProps = {
  title: string;
  children: ReactNode;
  variant?: "info" | "tip" | "glass";
  className?: string;
};

export function FeatureExplain({
  title,
  children,
  variant = "info",
  className,
}: FeatureExplainProps) {
  const Icon = variant === "tip" ? Lightbulb : Info;

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        variant === "glass" && "bg-white/10 border-white/20",
        variant === "tip" && "bg-accent/10 border-accent/25",
        variant === "info" && "bg-brand/5 border-brand/20",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={cn(
            "w-4 h-4 flex-shrink-0 mt-0.5",
            variant === "glass" && "text-brand-accent-muted",
            variant === "tip" && "text-accent-foreground",
            variant === "info" && "text-brand",
          )}
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              variant === "glass" && "text-white",
            )}
          >
            {title}
          </p>
          <div
            className={cn(
              "text-xs leading-relaxed space-y-1.5 [&_strong]:font-medium",
              variant === "glass"
                ? "text-white/75 [&_strong]:text-brand-accent-muted"
                : "text-muted-foreground [&_strong]:text-foreground",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
