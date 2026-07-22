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
    <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
      {STEPS.map((step, i) => {
        const active = isStepActive(location, step.match);
        return (
          <span key={step.href} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />}
            <Link href={step.href}>
              <span
                className={cn(
                  "rounded-md px-2 py-1 font-medium transition-colors cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-[hsl(163,55%,22%)]/10 text-[hsl(163,55%,22%)]"
                    : "hover:bg-muted hover:text-foreground",
                )}
              >
                {step.label}
              </span>
            </Link>
          </span>
        );
      })}
    </div>
  );
}
