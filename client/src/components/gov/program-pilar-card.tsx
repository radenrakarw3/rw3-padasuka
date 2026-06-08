import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ProgramPilarCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  fokus: string;
  progress: number;
  programCount: number;
};

export function ProgramPilarCard({
  href,
  icon: Icon,
  title,
  fokus,
  progress,
  programCount,
}: ProgramPilarCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-2xl bg-card border border-card-border p-5 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg text-brand">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{fokus}</p>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Capaian rata-rata</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-brand transition-all")}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{programCount} sub-program aktif</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
