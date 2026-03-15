import { useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import WargaLayout from "@/components/warga-layout";
import WargaBeranda from "@/pages/warga/beranda";
import WargaProfil from "@/pages/warga/profil";
import WargaLayanan from "@/pages/warga/layanan";
import WargaDonasi from "@/pages/warga/donasi";
import AdminLayout from "@/components/admin-layout";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminKelolaKK from "@/pages/admin/kelola-kk";
import AdminKelolaWarga from "@/pages/admin/kelola-warga";
import AdminKelolaLaporan from "@/pages/admin/kelola-laporan";
import AdminKelolaSurat from "@/pages/admin/kelola-surat";
import AdminSuratRw from "@/pages/admin/surat-rw";
import AdminProfilEdit from "@/pages/admin/profil-edit";
import AdminWaBlast from "@/pages/admin/wa-blast";
import AdminArsipSurat from "@/pages/admin/arsip-surat";
import AdminBansos from "@/pages/admin/bansos";
import AdminDonasi from "@/pages/admin/donasi";
import AdminKeuangan from "@/pages/admin/keuangan";
import AdminPemilikKost from "@/pages/admin/kelola-pemilik-kost";
import AdminWargaSinggah from "@/pages/admin/kelola-warga-singgah";
import AdminKelolaUsaha from "@/pages/admin/kelola-usaha";
import WargaKeuangan from "@/pages/warga/keuangan";
import SinggahLayout from "@/components/singgah-layout";
import SinggahBeranda from "@/pages/singgah/beranda";
import SinggahLaporan from "@/pages/singgah/laporan";
import { X } from "lucide-react";
import goldLogo from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";
import radenRakaImg from "@assets/raden_raka_nobg.png";

function WelcomePopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose} data-testid="welcome-overlay">
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: "hsl(163,55%,22%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors"
          data-testid="button-close-welcome"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative min-h-[420px]">
          <img
            src={goldLogo}
            alt=""
            className="absolute bottom-4 left-4 w-24 h-24 opacity-30"
          />

          <img
            src={goldLogo}
            alt="RW03 Logo"
            className="absolute top-4 right-4 w-10 h-10"
          />

          <div className="absolute top-8 left-5 right-24 z-10">
            <h1
              className="text-[2.2rem] leading-[1.1] font-bold italic"
              style={{ color: "hsl(40,45%,55%)", fontFamily: "Georgia, 'Times New Roman', serif" }}
              data-testid="text-welcome-title"
            >
              Wilujeng Sumping Wargi RW03!
            </h1>
          </div>

          <img
            src={radenRakaImg}
            alt="Raden Raka - Ketua RW03"
            className="absolute bottom-0 right-0 w-[75%] h-auto object-contain"
            style={{ maxHeight: "85%" }}
            data-testid="img-welcome"
          />

          <div className="absolute bottom-16 left-5 z-10">
            <p
              className="text-sm italic font-medium"
              style={{ color: "hsl(40,45%,65%)" }}
            >
              Raden Raka
            </p>
            <p
              className="text-xs italic"
              style={{ color: "hsl(40,45%,65%)" }}
            >
              Ketua RW03
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WargaRoutes() {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <WargaLayout>
      {showWelcome && <WelcomePopup onClose={() => setShowWelcome(false)} />}
      <Switch>
        <Route path="/warga" component={WargaBeranda} />
        <Route path="/warga/profil" component={WargaProfil} />
        <Route path="/warga/layanan" component={WargaLayanan} />
        <Route path="/warga/donasi" component={WargaDonasi} />
        <Route path="/warga/keuangan" component={WargaKeuangan} />
        <Route>{() => <Redirect to="/warga" />}</Route>
      </Switch>
    </WargaLayout>
  );
}

function AdminRoutes() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/kk" component={AdminKelolaKK} />
        <Route path="/admin/warga" component={AdminKelolaWarga} />
        <Route path="/admin/laporan" component={AdminKelolaLaporan} />
        <Route path="/admin/surat" component={AdminKelolaSurat} />
        <Route path="/admin/surat-rw" component={AdminSuratRw} />
        <Route path="/admin/profil-edit" component={AdminProfilEdit} />
        <Route path="/admin/wa-blast" component={AdminWaBlast} />
        <Route path="/admin/arsip-surat" component={AdminArsipSurat} />
        <Route path="/admin/bansos" component={AdminBansos} />
        <Route path="/admin/donasi" component={AdminDonasi} />
        <Route path="/admin/keuangan" component={AdminKeuangan} />
        <Route path="/admin/pemilik-kost" component={AdminPemilikKost} />
        <Route path="/admin/warga-singgah" component={AdminWargaSinggah} />
        <Route path="/admin/usaha" component={AdminKelolaUsaha} />
        <Route>{() => <Redirect to="/admin" />}</Route>
      </Switch>
    </AdminLayout>
  );
}

function SinggahRoutes() {
  return (
    <SinggahLayout>
      <Switch>
        <Route path="/singgah" component={SinggahBeranda} />
        <Route path="/singgah/laporan" component={SinggahLaporan} />
        <Route>{() => <Redirect to="/singgah" />}</Route>
      </Switch>
    </SinggahLayout>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[hsl(163,55%,22%)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.type === "admin" || user.isAdmin) {
    return <AdminRoutes />;
  }

  if (user.type === "warga_singgah") {
    return <SinggahRoutes />;
  }

  return <WargaRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
