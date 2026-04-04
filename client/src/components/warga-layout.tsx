import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { User, FileText, LogOut, Home, Wallet, Coins } from "lucide-react";
import { prefetchWargaCoreData, wargaWalletQueryOptions } from "@/lib/warga-prefetch";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

function GoldCoin({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "inline-block", verticalAlign: "-0.15em", flexShrink: 0 }}>
      <circle cx="10" cy="10" r="9.5" fill="#92400E" />
      <circle cx="10" cy="10" r="9" fill="#D97706" />
      <circle cx="10" cy="10" r="8" fill="#F59E0B" />
      <circle cx="10" cy="10" r="6.8" fill="#FCD34D" />
      <circle cx="10" cy="10" r="5.8" fill="none" stroke="#D97706" strokeWidth="0.6" />
      <ellipse cx="8" cy="7.5" rx="2.2" ry="1.1" fill="white" fillOpacity="0.28" transform="rotate(-25 8 7.5)" />
      <text x="10" y="13.2" textAnchor="middle" fill="#78350F" fontSize="4.8" fontWeight="900" fontFamily="Arial,sans-serif">RW</text>
    </svg>
  );
}

const navItems = [
  { path: "/warga", icon: Home, label: "Beranda" },
  { path: "/warga/layanan", icon: FileText, label: "Layanan" },
  { path: "/warga/rwcoin", icon: Coins, label: "RWcoin" },
  { path: "/warga/donasi", icon: Wallet, label: "Keuangan" },
  { path: "/warga/profil", icon: User, label: "Profil" },
];

export default function WargaLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: wallet } = useQuery<any>({
    ...wargaWalletQueryOptions(),
    enabled: user?.type === "warga",
    staleTime: 30000,
  });

  // Scroll ke atas setiap ganti halaman
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);

  useEffect(() => {
    return prefetchWargaCoreData(queryClient, user);
  }, [user?.type, user?.kkId]);

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
          <div className="flex items-center gap-2">
            {wallet != null && (
              <button
                onClick={() => setLocation("/warga/rwcoin")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
              >
                <GoldCoin size={15} />
                <span className="text-xs font-bold" style={{ color: "hsl(40,80%,75%)" }}>
                  {wallet.saldo?.toLocaleString("id-ID")}
                </span>
              </button>
            )}
            <button
              onClick={async () => { await logout(); setLocation("/"); }}
              className="flex items-center gap-1 text-xs bg-white/10 px-3 py-2 rounded-md"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
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
