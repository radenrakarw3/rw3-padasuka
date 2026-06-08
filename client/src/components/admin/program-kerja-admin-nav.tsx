import { useLocation } from "wouter";
import { BarChart3, ListChecks, Droplets, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { path: "/admin/program-kerja", icon: BarChart3, label: "Dashboard" },
  { path: "/admin/program-kerja/kelola", icon: ListChecks, label: "Kelola Program" },
  { path: "/admin/program-kerja/infrastruktur", icon: Droplets, label: "Infrastruktur" },
  { path: "/admin/program-kerja/umkm", icon: Store, label: "UMKM Makeover" },
];

export function ProgramKerjaAdminNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      {items.map((item) => {
        const active = location === item.path;
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => setLocation(item.path)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              active
                ? "bg-brand text-white font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
