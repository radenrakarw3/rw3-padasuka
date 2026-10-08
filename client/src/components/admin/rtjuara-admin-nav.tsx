import { Link, useLocation } from "wouter";
import { BarChart3, ClipboardCheck, ExternalLink, KeyRound, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRtjuaraAdminCounts } from "@/hooks/use-rtjuara-admin-counts";
import { RTJUARA_TAGLINE } from "@shared/rtjuara";

export const ADMIN_RTJUARA_PATH = "/admin/rtjuara";

export const RTJUARA_ADMIN_ROUTES = {
  dashboard: ADMIN_RTJUARA_PATH,
  quest: "/admin/rtjuara/quest",
  verifikasi: "/admin/rtjuara/verifikasi",
  akun: "/admin/rtjuara/akun",
} as const;

type TabDef = {
  href: string;
  label: string;
  icon: typeof Swords;
  badge?: boolean;
};

const tabs: TabDef[] = [
  { href: RTJUARA_ADMIN_ROUTES.dashboard, label: "Ringkasan", icon: BarChart3 },
  { href: RTJUARA_ADMIN_ROUTES.quest, label: "Quest", icon: Swords },
  { href: RTJUARA_ADMIN_ROUTES.verifikasi, label: "Verifikasi", icon: ClipboardCheck, badge: true },
  { href: RTJUARA_ADMIN_ROUTES.akun, label: "Akun RT", icon: KeyRound },
];

function isActive(pathname: string, href: string) {
  if (href === RTJUARA_ADMIN_ROUTES.dashboard) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function RtjuaraAdminNav({ title, description, actions }: Props) {
  const [location] = useLocation();
  const { buktiMenunggu } = useRtjuaraAdminCounts();

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[hsl(163,55%,22%)]/20 bg-gradient-to-r from-[hsl(163,55%,22%)] to-[hsl(163,45%,34%)] text-white shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(40,70%,60%)_0%,_transparent_55%)] opacity-30" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Admin RT JUARA</p>
              <p className="text-sm font-semibold truncate">{RTJUARA_TAGLINE}</p>
            </div>
          </div>
          <a
            href="/rtjuara"
            target="_blank"
            rel="noreferrer"
            title="Membuka papan peringkat publik"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20 transition-colors shrink-0"
          >
            Halaman publik /rtjuara
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground mt-0.5">{description}</p> : null}
        </div>
        {actions}
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Navigasi admin RT JUARA">
        {tabs.map((tab) => {
          const active = isActive(location, tab.href);
          const count = tab.badge ? buktiMenunggu : 0;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors no-underline",
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
