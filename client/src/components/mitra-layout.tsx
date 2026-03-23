import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Coins, ShoppingBag, ArrowDownCircle, LogOut, Store, Tag } from "lucide-react";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

const navItems = [
  { path: "/mitra", icon: Coins, label: "Beranda" },
  { path: "/mitra/transaksi", icon: ShoppingBag, label: "Transaksi" },
  { path: "/mitra/withdraw", icon: ArrowDownCircle, label: "Withdraw" },
  { path: "/mitra/diskon", icon: Tag, label: "Diskon" },
];

export default function MitraLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  const { data: mitraMe } = useQuery<any>({
    queryKey: ["/api/mitra/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/mitra/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <header className="sticky top-0 z-50 shadow-md text-white px-4 py-3" style={{ backgroundColor: "hsl(163,55%,22%)" }}>
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoGold} alt="Logo RW 03" className="w-8 h-8 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate flex items-center gap-1.5">
                <Coins className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(40,45%,65%)" }} />
                Portal Mitra RWcoin
              </h1>
              <p className="text-[10px] truncate" style={{ color: "hsl(40,30%,80%)" }}>
                {mitraMe?.namaUsaha ?? "Memuat..."} · RT {String(mitraMe?.rt ?? "-").padStart(2, "0")}
              </p>
            </div>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="flex items-center gap-1 text-xs bg-white/10 px-3 py-2 rounded-md flex-shrink-0"
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
            const isActive = location === item.path || (item.path !== "/mitra" && location.startsWith(item.path));
            const isHome = item.path === "/mitra" && location === "/mitra";
            const active = isActive || isHome;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[60px] ${
                  active ? "text-[hsl(163,55%,22%)]" : "text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>{item.label}</span>
                {active && <div className="w-4 h-0.5 bg-[hsl(163,55%,22%)] rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
