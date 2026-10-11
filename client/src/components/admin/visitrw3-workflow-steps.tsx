import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const STEPS = [
  { href: "/admin/visitrw3/antrian?view=belum", label: "1 · Survey", match: "/admin/visitrw3/antrian" },
  { href: "/admin/visitrw3/penghuni", label: "2 · Warga aktif", match: "/admin/visitrw3/penghuni" },
  { href: "/admin/visitrw3/kalender", label: "3 · Kalender", match: "/admin/visitrw3/kalender" },
] as const;

function isStepActive(location: string, match: string): boolean {
  if (match === "/admin/visitrw3/antrian") {
    return location === "/admin/visitrw3/antrian" || location.startsWith("/admin/visitrw3/antrian?");
  }
  return location === match || location.startsWith(`${match}/`);
}

export function Visitrw3WorkflowSteps() {
  const [location] = useLocation();

  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 text-xs text-muted-foreground sm:flex sm:w-fit sm:items-center sm:bg-transparent sm:p-0 sm:text-[11px]">
      {STEPS.map((step, i) => {
        const active = isStepActive(location, step.match);
        return (
          <span key={step.href} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight className="hidden w-3 h-3 opacity-40 shrink-0 sm:block" />}
            <Link
              href={step.href}
              className={cn(
                "flex min-h-10 w-full items-center justify-center rounded-lg px-2 text-center font-medium transition-colors whitespace-nowrap sm:min-h-0 sm:w-auto sm:rounded-md sm:py-1",
                active
                  ? "bg-background text-[hsl(163,55%,22%)] shadow-sm sm:bg-[hsl(163,55%,22%)]/10 sm:shadow-none"
                  : "hover:bg-muted hover:text-foreground",
              )}
            >
              {step.label}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
