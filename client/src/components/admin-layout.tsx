import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  Users, Megaphone, Scale,
  LogOut, Menu, X, Building2, Wallet, FileText, BarChart3, Target, Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

type NavItem = { path: string; icon: typeof Megaphone; label: string };

const navFormWarga: NavItem[] = [
  { path: "/admin/laporan", icon: Megaphone, label: "Laporan" },
  { path: "/admin/kekeringan", icon: Droplets, label: "Kekeringan" },
  { path: "/admin/visitrw3/antrian", icon: Building2, label: "Visit RW3" },
];

const navProgramKerja: NavItem[] = [
  { path: "/admin/program-kerja", icon: Target, label: "Program Kerja" },
];

const navPengelolaan: NavItem[] = [
  { path: "/admin/kependudukan", icon: BarChart3, label: "Kependudukan" },
  { path: "/admin/keuangan", icon: Wallet, label: "Kas RW" },
  { path: "/admin/rw3law", icon: Scale, label: "RW3LAW" },
  { path: "/admin/surat-rw", icon: FileText, label: "Surat RW" },
];

function isNavActive(location: string, path: string): boolean {
  if (path === "/admin/laporan") return location === path || location.startsWith("/admin/laporan/");
  if (path === "/admin/kekeringan") return location === path || location.startsWith("/admin/kekeringan/");
  if (path === "/admin/visitrw3/antrian") {
    return location === path || location.startsWith("/admin/visitrw3/");
  }
  if (path === "/admin/kependudukan") {
    return location === path;
  }
  if (path === "/admin/program-kerja") {
    return location === path || location.startsWith("/admin/program-kerja/");
  }
  return location === path || location.startsWith(`${path}/`);
}

function NavButton({
  item,
  location,
  onNavigate,
}: {
  item: NavItem;
  location: string;
  onNavigate: (path: string) => void;
}) {
  const active = isNavActive(location, item.path);
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
        active
          ? "bg-[hsl(163,55%,22%)] text-white font-medium"
          : "text-foreground hover:bg-muted"
      }`}
      data-testid={`nav-admin-${item.label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {item.label}
    </button>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const go = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-[hsl(163,55%,22%)] text-white px-4 py-3 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="text-white lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-testid="button-toggle-sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <img src={logoGold} alt="Logo RW 03" className="w-8 h-8 object-contain flex-shrink-0" />
            <div>
              <h1 className="text-sm font-bold" data-testid="text-admin-header">Admin Panel - RW 03</h1>
              <p className="text-[10px] text-[hsl(40,30%,80%)]">Kelurahan Padasuka, Cimahi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              setLocation("/");
            }}
            className="flex items-center gap-1 text-xs bg-white/10 px-3 py-2 rounded-md"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed lg:static top-[52px] left-0 bottom-0 z-40 w-64 bg-card border-r transform transition-transform lg:transform-none overflow-y-auto ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <nav className="p-3 space-y-4">
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Form warga
              </p>
              {navFormWarga.map((item) => (
                <NavButton key={item.path} item={item} location={location} onNavigate={go} />
              ))}
            </div>
            <div className="space-y-1 border-t border-border/60 pt-3">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Program kerja
              </p>
              {navProgramKerja.map((item) => (
                <NavButton key={item.path} item={item} location={location} onNavigate={go} />
              ))}
            </div>
            <div className="space-y-1 border-t border-border/60 pt-3">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pengelolaan data
              </p>
              {navPengelolaan.map((item) => (
                <NavButton key={item.path} item={item} location={location} onNavigate={go} />
              ))}
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-4 lg:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
