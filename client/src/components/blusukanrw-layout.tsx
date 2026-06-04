import { useLocation } from "wouter";
import { LayoutDashboard, Home, Search, LogOut } from "lucide-react";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";
import { useBlusukanAuth } from "@/lib/blusukan-auth";

const navItems = [
  { path: "/blusukanrw/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/blusukanrw/kunjungan", icon: Home, label: "Kunjungan" },
  { path: "/blusukanrw/cari", icon: Search, label: "Cari" },
];

export function BlusukanrwLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useBlusukanAuth();
  const [location, setLocation] = useLocation();
  const hideNav = location.startsWith("/blusukanrw/kk/");

  return (
    <div className={`min-h-screen flex flex-col bg-background ${hideNav ? "pb-0" : "pb-20"}`}>
      <header className="sticky top-0 z-50 bg-[hsl(163,55%,22%)] text-white px-4 py-3 shadow-md">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoGold} alt="Logo RW 03" className="w-8 h-8 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate">Blusukan RW</h1>
              <p className="text-[10px] text-[hsl(40,30%,80%)] truncate">Ketua RW · Master data RT 01–04</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              setLocation("/blusukanrw");
            }}
            className="flex items-center gap-1 text-xs bg-white/10 px-3 py-2 rounded-md"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">{children}</main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg">
          <div className="flex items-center justify-around max-w-lg mx-auto py-1">
            {navItems.map((item) => {
              const active = location === item.path || location.startsWith(`${item.path}/`);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => setLocation(item.path)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[72px] ${
                    active ? "text-[hsl(163,55%,22%)]" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                    {item.label}
                  </span>
                  {active && <div className="w-4 h-0.5 bg-[hsl(163,55%,22%)] rounded-full" />}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
