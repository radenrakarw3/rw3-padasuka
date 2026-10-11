import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, useSearch } from "wouter";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  Inbox,
  LogOut,
  Megaphone,
  Menu,
  PieChart,
  Settings,
  Users,
  X,
  QrCode,
  Truck,
  UserPen,
  ListChecks,
  ClipboardPen,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisitrw3AdminCounts } from "@/hooks/use-visitrw3-admin-counts";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

type NavItem = { path: string; icon: typeof Megaphone; label: string; badge?: number };
type NavGroup = { judul?: string; items: NavItem[] };

function isNavActive(location: string, search: string, path: string): boolean {
  const [base, query] = path.split("?");
  if (base === "/admin/dashboard") return location === base;
  if (base === "/admin/kelola-warga/warga" && location.startsWith("/admin/kelola-warga/keluarga/")) return true;
  if (query) return location === base && search === query;
  return location === base || location.startsWith(`${base}/`);
}

function NavButton({
  item,
  location,
  search,
  onNavigate,
}: {
  item: NavItem;
  location: string;
  search: string;
  onNavigate: (path: string) => void;
}) {
  const active = isNavActive(location, search, item.path);
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-[hsl(163,55%,22%)] text-white font-medium"
          : "text-foreground hover:bg-muted"
      }`}
      data-testid={`nav-admin-${item.label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge ? (
        <span
          className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
            active ? "bg-white/20 text-white" : "bg-destructive/15 text-destructive"
          }`}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null}
    </button>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const visit = useVisitrw3AdminCounts("visit");
  const biz = useVisitrw3AdminCounts("rw3biz");

  const grup: NavGroup[] = [
    {
      items: [
        { path: "/admin/dashboard", icon: BarChart3, label: "Dashboard" },
        { path: "/admin/pusat-cetak", icon: Printer, label: "Pusat cetak F4" },
        { path: "/admin/surat-rw", icon: FileText, label: "Surat RW" },
      ],
    },
    {
      judul: "Visit RW3",
      items: [
        { path: VISITRW3_ROUTES.admin.antrianSurvey, icon: ClipboardList, label: "Survey hunian", badge: visit.surveyMenunggu },
        { path: VISITRW3_ROUTES.admin.antrianSudahLolos, icon: ClipboardList, label: "Sudah disurvey" },
        { path: VISITRW3_ROUTES.admin.penghuni, icon: Users, label: "Warga singgah" },
        { path: VISITRW3_ROUTES.admin.kalender, icon: CalendarDays, label: "Kalender kontrak" },
        { path: VISITRW3_ROUTES.admin.dashboard, icon: PieChart, label: "Statistik hunian" },
        { path: VISITRW3_ROUTES.admin.pengaturan, icon: Settings, label: "Pengaturan Visit" },
      ],
    },
    {
      judul: "RW3 Biz",
      items: [
        { path: RW3BIZ_ROUTES.admin.antrianSurvey, icon: ClipboardList, label: "Survey usaha", badge: biz.surveyMenunggu },
        { path: RW3BIZ_ROUTES.admin.antrianSudah, icon: ClipboardList, label: "Usaha terdaftar" },
        { path: RW3BIZ_ROUTES.admin.blast, icon: Megaphone, label: "WA Blast usaha" },
        { path: RW3BIZ_ROUTES.admin.dashboard, icon: PieChart, label: "Statistik usaha" },
        { path: RW3BIZ_ROUTES.admin.pengaturan, icon: Settings, label: "Pengaturan Biz" },
      ],
    },
    {
      judul: "Kependudukan",
      items: [
        { path: "/admin/kependudukan", icon: Users, label: "Ringkasan warga" },
        { path: "/admin/kelola-warga/warga", icon: UserPen, label: "Data warga & KK" },
        { path: "/admin/kelola-warga/usulan", icon: Inbox, label: "Isian QR warga" },
        { path: "/admin/kelola-warga/cetak", icon: QrCode, label: "Cetak untuk warga" },
        { path: "/admin/kelola-warga/input-kertas", icon: ClipboardPen, label: "Input dari kertas" },
        { path: "/admin/kelola-warga/pindah", icon: Truck, label: "Pindah RT" },
        { path: "/admin/standar-data", icon: ListChecks, label: "Standar data" },
      ],
    },
  ];

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
            {grup.map((g, i) => (
              <div key={g.judul ?? i} className="space-y-1">
                {g.judul ? (
                  <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{g.judul}</p>
                ) : null}
                {g.items.map((item) => (
                  <NavButton key={item.path} item={item} location={location} search={search} onNavigate={go} />
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 lg:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
