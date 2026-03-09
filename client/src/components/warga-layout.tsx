import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { User, FileText, LogOut, Home } from "lucide-react";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

const navItems = [
  { path: "/warga", icon: Home, label: "Beranda" },
  { path: "/warga/profil", icon: User, label: "Profil" },
  { path: "/warga/layanan", icon: FileText, label: "Layanan" },
];

export default function WargaLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <header className="sticky top-0 z-50 bg-[hsl(163,55%,22%)] text-white px-4 py-3 shadow-md">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoGold} alt="Logo RW 03" className="w-8 h-8 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate" data-testid="text-header-title">RW 03 Padasuka</h1>
              <p className="text-[10px] text-[hsl(40,30%,80%)] truncate">Sistem Informasi Warga</p>
            </div>
          </div>
          <button
            onClick={async () => { await logout(); setLocation("/"); }}
            className="flex items-center gap-1 text-xs bg-white/10 px-3 py-2 rounded-md"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg">
        <div className="flex items-center justify-around max-w-lg mx-auto py-1">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/warga" && location.startsWith(item.path));
            const isHome = item.path === "/warga" && location === "/warga";
            const active = isActive || isHome;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[60px] ${
                  active
                    ? "text-[hsl(163,55%,22%)]"
                    : "text-muted-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                  {item.label}
                </span>
                {active && (
                  <div className="w-4 h-0.5 bg-[hsl(163,55%,22%)] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
