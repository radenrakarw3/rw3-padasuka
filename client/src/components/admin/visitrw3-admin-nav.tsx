import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

type TabDef = { href: string; label: string; exact?: boolean };

const NAV_TABS: TabDef[] = [
  { href: "/admin/visitrw3/antrian", label: "Antrian", exact: true },
  { href: "/admin/visitrw3/kalender", label: "Kalender" },
  { href: "/admin/visitrw3/dashboard", label: "Statistik" },
  { href: "/admin/visitrw3/properti", label: "Properti" },
  { href: "/admin/visitrw3/penghuni", label: "Penghuni" },
  { href: "/admin/visitrw3/pengaturan", label: "Pengaturan" },
];

function isActive(location: string, href: string, exact?: boolean) {
  if (href === "/admin/visitrw3/dashboard") {
    return location === "/admin/visitrw3/dashboard";
  }
  if (href === "/admin/visitrw3/kalender") {
    return location === "/admin/visitrw3/kalender";
  }
  if (href === "/admin/visitrw3/antrian") {
    return location === "/admin/visitrw3/antrian" || location === "/admin/visitrw3";
  }
  if (exact) return location === href;
  return location === href || location.startsWith(`${href}/`);
}

function tabLinkHref(href: string) {
  return href;
}

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function Visitrw3AdminNav({ title, description, actions }: Props) {
  const [location] = useLocation();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav className="flex flex-wrap gap-1 border-b pb-2 -mb-px">
        {NAV_TABS.map((tab) => {
          const active = isActive(location, tab.href, tab.exact);
          return (
            <Link key={tab.href} href={tabLinkHref(tab.href)}>
              <span
                className={cn(
                  "inline-block px-3 py-2 text-sm font-medium rounded-t-md transition-colors cursor-pointer",
                  active
                    ? "bg-[hsl(163,55%,22%)] text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
