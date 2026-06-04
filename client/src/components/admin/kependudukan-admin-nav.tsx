import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const NAV_TABS = [
  { href: "/admin/kependudukan", label: "Ringkasan RT 01–04", exact: true },
  { href: "/admin/kependudukan/peristiwa", label: "Peristiwa" },
  { href: "/admin/kependudukan/kk", label: "Kartu Keluarga" },
  { href: "/admin/kependudukan/warga", label: "Cari Warga" },
] as const;

function isActive(location: string, href: string, exact?: boolean) {
  if (exact) return location === href;
  return location === href || location.startsWith(`${href}/`);
}

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function KependudukanAdminNav({ title, description, actions }: Props) {
  const [location] = useLocation();

  return (
    <div className="space-y-3 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav className="flex flex-wrap gap-1 border-b pb-2 -mb-px">
        {NAV_TABS.map((tab) => {
          const active = isActive(location, tab.href, "exact" in tab && tab.exact);
          return (
            <Link key={tab.href} href={tab.href}>
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
