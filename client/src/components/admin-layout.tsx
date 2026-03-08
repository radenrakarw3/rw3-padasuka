import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, FileText, ClipboardList, ScrollText,
  MessageSquare, LogOut, Menu, X, Home as HomeIcon, Archive, HandCoins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/kk", icon: HomeIcon, label: "Kartu Keluarga" },
  { path: "/admin/warga", icon: Users, label: "Data Warga" },
  { path: "/admin/laporan", icon: ClipboardList, label: "Laporan" },
  { path: "/admin/surat", icon: FileText, label: "Surat Warga" },
  { path: "/admin/surat-rw", icon: ScrollText, label: "Surat RW" },
  { path: "/admin/arsip-surat", icon: Archive, label: "Arsip Surat" },
  { path: "/admin/profil-edit", icon: Users, label: "Edit Profil" },
  { path: "/admin/bansos", icon: HandCoins, label: "Bansos" },
  { path: "/admin/wa-blast", icon: MessageSquare, label: "WA Blast" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            onClick={async () => { await logout(); setLocation("/"); }}
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
          className={`fixed lg:static top-[52px] left-0 bottom-0 z-40 w-64 bg-card border-r transform transition-transform lg:transform-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { setLocation(item.path); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-[hsl(163,55%,22%)] text-white font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                  data-testid={`nav-admin-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-4 lg:p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
