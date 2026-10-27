import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, useSearch } from "wouter";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  Gavel,
  Home,
  LayoutGrid,
  LogOut,
  Megaphone,
  PieChart,
  Search,
  Users,
  Printer,
  Truck,
  UserPen,
  UserSearch,
  ListChecks,
  Receipt,
  ShieldAlert,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UiRingkas } from "@/components/wilayah/ui";
import { useVisitrw3AdminCounts } from "@/hooks/use-visitrw3-admin-counts";
import { useRingkasanAduan } from "@/hooks/use-aduan-admin";
import { useKotakMasuk } from "@/lib/kotak-masuk";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

type NavItem = { path: string; icon: typeof Megaphone; label: string; badge?: number };
type NavGroup = { judul?: string; items: NavItem[] };

function isNavActive(location: string, search: string, path: string): boolean {
  const [base, query] = path.split("?");
  if (base === "/admin/dashboard" || base === "/admin/kependudukan") return location === base;
  if (base === "/admin/kelola-warga/warga") return location === "/admin/kelola-warga" || location.startsWith("/admin/kelola-warga/");
  if (query) return location === base && search === query;
  return location === base || location.startsWith(`${base}/`);
}

function Badge({ n, terang }: { n?: number; terang?: boolean }) {
  if (!n) return null;
  return (
    <span
      className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none ${
        terang ? "bg-white/20 text-white" : "bg-destructive text-white"
      }`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
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
        active ? "bg-[hsl(163,55%,22%)] text-white font-medium" : "text-foreground hover:bg-muted"
      }`}
      data-testid={`nav-admin-${item.label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      <Badge n={item.badge} terang={active} />
    </button>
  );
}

function MenuTile({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: (path: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className={`relative flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center text-xs font-medium leading-tight transition-colors active:scale-[0.98] ${
        active ? "border-[hsl(163,55%,22%)] bg-[hsl(163,55%,22%)]/10 text-[hsl(163,55%,22%)]" : "bg-card"
      }`}
    >
      <item.icon className="h-6 w-6" />
      <span>{item.label}</span>
      {item.badge ? (
        <span className="absolute right-2 top-2">
          <Badge n={item.badge} />
        </span>
      ) : null}
    </button>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cari, setCari] = useState("");
  const visit = useVisitrw3AdminCounts("visit");
  const biz = useVisitrw3AdminCounts("rw3biz");
  const { data: aduan } = useRingkasanAduan();
  const { data: kotakMasuk } = useKotakMasuk();

  const grup: NavGroup[] = [
    {
      items: [
        { path: "/admin/dashboard", icon: BarChart3, label: "Dashboard" },
        { path: "/admin/cek-warga", icon: UserSearch, label: "Cek Warga" },
        { path: "/admin/surat-rw", icon: FileText, label: "Surat RW" },
      ],
    },
    {
      judul: "Aduan Warga",
      items: [
        { path: "/admin/aduan", icon: Megaphone, label: "Pusat aduan", badge: aduan?.belumDibaca },
        { path: "/admin/aduan-teguran", icon: Gavel, label: "Teguran & SP", badge: aduan?.tenggatLewat },
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
      ],
    },
    {
      judul: "RW3 Biz",
      items: [
        { path: RW3BIZ_ROUTES.admin.antrianSurvey, icon: ClipboardList, label: "Survey usaha", badge: biz.surveyMenunggu },
        { path: RW3BIZ_ROUTES.admin.antrianSudah, icon: ClipboardList, label: "Usaha terdaftar" },
        { path: RW3BIZ_ROUTES.admin.tagihan, icon: Receipt, label: "Tagihan sumbangsih", badge: biz.keberatanMenunggu },
        { path: RW3BIZ_ROUTES.admin.razia, icon: Truck, label: "Razia kendaraan" },
        { path: RW3BIZ_ROUTES.admin.pelanggaran, icon: ShieldAlert, label: "Pelanggaran & aduan", badge: biz.aduanMenunggu },
        { path: RW3BIZ_ROUTES.admin.dashboard, icon: PieChart, label: "RAB & statistik" },
        { path: RW3BIZ_ROUTES.admin.tarif, icon: SlidersHorizontal, label: "Program & denda" },
      ],
    },
    {
      judul: "Keuangan",
      items: [{ path: RW3BIZ_ROUTES.kas, icon: Wallet, label: "Kas RW" }],
    },
    {
      judul: "Kependudukan",
      items: [
        { path: "/admin/kependudukan", icon: Users, label: "Ringkasan warga" },
        { path: "/admin/kelola-warga/warga", icon: UserPen, label: "Data warga & KK", badge: kotakMasuk?.total },
        { path: "/admin/kependudukan/rekap", icon: Printer, label: "Rekap & cetak" },
        { path: "/admin/standar-data", icon: ListChecks, label: "Standar data" },
      ],
    },
  ];

  const bawah: NavItem[] = [
    { path: "/admin/dashboard", icon: Home, label: "Beranda" },
    { path: "/admin/kelola-warga/warga", icon: UserPen, label: "Warga" },
    { path: VISITRW3_ROUTES.admin.antrianSurvey, icon: ClipboardList, label: "Hunian", badge: visit.surveyMenunggu },
    { path: "/admin/cek-warga", icon: UserSearch, label: "Cek Warga" },
  ];

  const semua = grup.flatMap((g) => g.items);
  const aktif = semua.find((i) => isNavActive(location, search, i.path));
  const bawahAktif = bawah.some((i) => isNavActive(location, search, i.path));
  const badgeMenu = (biz.keberatanMenunggu ?? 0) + (biz.aduanMenunggu ?? 0) + (biz.surveyMenunggu ?? 0) + (aduan?.belumDibaca ?? 0) + (aduan?.tenggatLewat ?? 0);

  const q = cari.trim().toLowerCase();
  const grupTersaring = q
    ? grup
        .map((g) => ({ ...g, items: g.items.filter((i) => `${i.label} ${g.judul ?? ""}`.toLowerCase().includes(q)) }))
        .filter((g) => g.items.length > 0)
    : grup;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);

  const go = (path: string) => {
    setLocation(path);
    setMenuOpen(false);
    setCari("");
  };

  const keluar = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-[hsl(163,55%,22%)] text-white shadow-md pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <button type="button" className="flex h-11 min-w-0 items-center gap-3 text-left" onClick={() => go("/admin/dashboard")}>
            <img src={logoGold} alt="Logo RW 03" className="w-8 h-8 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold" data-testid="text-admin-header">
                <span className="lg:hidden">{aktif?.label ?? "Admin RW 03"}</span>
                <span className="hidden lg:inline">Admin Panel - RW 03</span>
              </h1>
              <p className="truncate text-[10px] text-[hsl(40,30%,80%)]">Kelurahan Padasuka, Cimahi</p>
            </div>
          </button>
          <button
            type="button"
            onClick={keluar}
            className="flex h-10 items-center gap-1.5 rounded-md bg-white/10 px-3 text-xs"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] w-64 flex-shrink-0 overflow-y-auto border-r bg-card">
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

        <main className="flex-1 min-w-0 px-3 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-4 lg:p-6">
          <UiRingkas value={true}>{children}</UiRingkas>
        </main>
      </div>

      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
        aria-label="Navigasi utama"
      >
        <div className="grid grid-cols-5">
          {bawah.map((item) => {
            const active = isNavActive(location, search, item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => go(item.path)}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? "text-[hsl(163,55%,22%)]" : "text-muted-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {active && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-[hsl(163,55%,22%)]" />}
                <span className="relative">
                  <item.icon className="h-6 w-6" />
                  {item.badge ? (
                    <span className="absolute -right-3 -top-2">
                      <Badge n={item.badge} />
                    </span>
                  ) : null}
                </span>
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              !bawahAktif ? "text-[hsl(163,55%,22%)]" : "text-muted-foreground"
            }`}
            data-testid="button-toggle-sidebar"
          >
            {!bawahAktif && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-[hsl(163,55%,22%)]" />}
            <span className="relative">
              <LayoutGrid className="h-6 w-6" />
              {badgeMenu ? (
                <span className="absolute -right-3 -top-2">
                  <Badge n={badgeMenu} />
                </span>
              ) : null}
            </span>
            Menu
          </button>
        </div>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="sm:max-w-2xl">
          <div className="space-y-1 pr-10">
            <DialogTitle>Semua menu</DialogTitle>
            <DialogDescription>Pilih fitur yang ingin dibuka.</DialogDescription>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari menu…" className="pl-10" />
          </div>
          <div className="space-y-5">
            {grupTersaring.map((g, i) => (
              <section key={g.judul ?? i} className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{g.judul ?? "Umum"}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {g.items.map((item) => (
                    <MenuTile
                      key={item.path}
                      item={item}
                      active={isNavActive(location, search, item.path)}
                      onNavigate={go}
                    />
                  ))}
                </div>
              </section>
            ))}
            {grupTersaring.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Menu tidak ditemukan.</p>
            )}
          </div>
          <button
            type="button"
            onClick={keluar}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium text-destructive"
          >
            <LogOut className="h-4 w-4" /> Keluar dari admin
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
