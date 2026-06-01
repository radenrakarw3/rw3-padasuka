import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { User, LogOut, Home } from "lucide-react";
import { prefetchWargaCoreData } from "@/lib/warga-prefetch";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

const navItems = [
  { path: "/warga", icon: Home, label: "Beranda" },
  { path: "/warga/profil", icon: User, label: "Profil" },
];

export default function WargaLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const [location, setLocation] = useLocation();

  // Scroll ke atas setiap ganti halaman
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);

  useEffect(() => {
    return prefetchWargaCoreData(queryClient, user);
  }, [user?.type, user?.kkId]);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="sticky top-0 z-50 bg-[hsl(163,55%,22%)] text-white px-4 py-4 shadow-md">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoGold} alt="Logo RW 03" className="w-10 h-10 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate" data-testid="text-header-title">RW 03 Padasuka</h1>
              <p className="text-sm text-[hsl(40,30%,80%)] truncate">Portal warga RW 03 Padasuka</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => { await logout(); setLocation("/"); }}
              className="flex min-h-12 items-center gap-2 text-sm font-medium bg-white/10 px-4 py-2 rounded-xl"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg">
        <div className="flex items-stretch justify-around max-w-lg mx-auto px-2 py-2">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/warga" && location.startsWith(item.path));
            const isHome = item.path === "/warga" && location === "/warga";
            const active = isActive || isHome;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-colors ${
                  active
                    ? "bg-[hsl(163,55%,96%)] text-[hsl(163,55%,22%)]"
                    : "text-muted-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className={`text-sm leading-none ${active ? "font-bold" : "font-medium"}`}>
                  {item.label}
                </span>
                {active && (
                  <div className="w-5 h-1 bg-[hsl(163,55%,22%)] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
