import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabDef = { href: string; label: string; icon: typeof ClipboardList; exact?: boolean };

const NAV_TABS: TabDef[] = [
  { href: "/admin/visitrw3/antrian", label: "Antrian", icon: ClipboardList, exact: true },
  { href: "/admin/visitrw3/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/admin/visitrw3/dashboard", label: "Statistik", icon: BarChart3 },
  { href: "/admin/visitrw3/properti", label: "Properti", icon: Building2 },
  { href: "/admin/visitrw3/penghuni", label: "Penghuni", icon: Users },
  { href: "/admin/visitrw3/pengaturan", label: "Pengaturan", icon: Settings },
];

function isActive(location: string, href: string, exact?: boolean) {
  if (href === "/admin/visitrw3/dashboard") return location === href;
  if (href === "/admin/visitrw3/kalender") return location === href;
  if (href === "/admin/visitrw3/antrian") {
    return location === href || location === "/admin/visitrw3";
  }
  if (exact) return location === href;
  return location === href || location.startsWith(`${href}/`);
}

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function Visitrw3AdminNav({ title, description, actions }: Props) {
  const [location] = useLocation();

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[hsl(163,55%,22%)]/20 bg-gradient-to-r from-[hsl(163,55%,22%)] to-[hsl(163,55%,28%)] text-white shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(40,45%,55%)_0%,_transparent_55%)] opacity-30" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Admin Visit RW3</p>
              <p className="text-sm font-semibold truncate">Izin tinggal & bisnis · RW 03 Padasuka</p>
            </div>
          </div>
          <a
            href="/visitrw3"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20 transition-colors shrink-0"
          >
            Form publik
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/50 min-w-max">
          {NAV_TABS.map((tab) => {
            const active = isActive(location, tab.href, tab.exact);
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href}>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap",
                    active
                      ? "bg-[hsl(163,55%,22%)] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
