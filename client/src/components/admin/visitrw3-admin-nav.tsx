import { Link, useLocation } from "wouter";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Megaphone,
  Settings,
  Shield,
  Store,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisitrw3AdminCounts } from "@/hooks/use-visitrw3-admin-counts";
import { Visitrw3WorkflowSteps } from "@/components/admin/visitrw3-workflow-steps";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import type { PengajuanProduct } from "@/lib/visitrw3-produk-ui";

type TabDef = {
  href: string;
  label: string;
  icon: typeof ClipboardList;
  badgeKey?: "survey";
};

function tabsFor(product: PengajuanProduct): TabDef[] {
  if (product === "rw3biz") {
    return [
      {
        href: RW3BIZ_ROUTES.admin.antrianSurvey,
        label: "Survey usaha",
        icon: ClipboardList,
        badgeKey: "survey",
      },
      { href: RW3BIZ_ROUTES.admin.blast, label: "WA Blast", icon: Megaphone },
      { href: RW3BIZ_ROUTES.admin.dashboard, label: "Statistik", icon: BarChart3 },
      { href: RW3BIZ_ROUTES.admin.pengaturan, label: "Pengaturan", icon: Settings },
    ];
  }
  return [
    {
      href: VISITRW3_ROUTES.admin.antrianSurvey,
      label: "Survey",
      icon: ClipboardList,
      badgeKey: "survey",
    },
    { href: VISITRW3_ROUTES.admin.penghuni, label: "Warga singgah", icon: Users },
    { href: VISITRW3_ROUTES.admin.kalender, label: "Kalender", icon: CalendarDays },
    { href: VISITRW3_ROUTES.admin.dashboard, label: "Statistik", icon: BarChart3 },
    { href: VISITRW3_ROUTES.admin.pengaturan, label: "Pengaturan", icon: Settings },
  ];
}

function isActive(location: string, href: string) {
  const path = href.split("?")[0];
  return location === path || location.startsWith(`${path}?`) || location.startsWith(`${path}/`);
}

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  product?: PengajuanProduct;
};

export function Visitrw3AdminNav({ title, description, actions, product = "visit" }: Props) {
  const [location] = useLocation();
  const { surveyMenunggu } = useVisitrw3AdminCounts(product);
  const tabs = tabsFor(product);

  const publicHref = product === "rw3biz" ? RW3BIZ_ROUTES.hub : VISITRW3_ROUTES.hub;
  const publicLabel =
    product === "rw3biz" ? "Halaman publik /rw3biz" : "Halaman warga /visitrw3";
  const brandLabel = product === "rw3biz" ? "Admin RW3BIZ" : "Admin Visit RW3";
  const brandSub =
    product === "rw3biz" ? "Izin usaha / jualan · RW 03" : "Kost & kontrakan · RW 03 Padasuka";
  const BrandIcon = product === "rw3biz" ? Store : Shield;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[hsl(163,55%,22%)]/20 bg-gradient-to-r from-[hsl(163,55%,22%)] to-[hsl(163,55%,28%)] text-white shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(40,45%,55%)_0%,_transparent_55%)] opacity-30" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <BrandIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{brandLabel}</p>
              <p className="text-sm font-semibold truncate">{brandSub}</p>
            </div>
          </div>
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            title={
              product === "rw3biz"
                ? "Membuka halaman publik RW3BIZ (izin usaha / jualan)"
                : "Membuka halaman publik Visit RW3 (ngontrak / ngekost)"
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20 transition-colors shrink-0"
          >
            {publicLabel}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {product === "visit" ? <Visitrw3WorkflowSteps /> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground mt-0.5">{description}</p> : null}
        </div>
        {actions}
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Navigasi admin">
        {tabs.map((tab) => {
          const active = isActive(location, tab.href);
          const count = tab.badgeKey === "survey" ? surveyMenunggu : 0;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-[hsl(163,55%,22%)] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 ? (
                <span
                  className={cn(
                    "ml-0.5 min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold",
                    active ? "bg-white/20 text-white" : "bg-destructive/15 text-destructive",
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
