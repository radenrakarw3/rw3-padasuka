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
import WargaLaporan from "@/pages/warga/laporan";
import WargaPelayanan from "@/pages/warga/pelayanan";
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
import { X } from "lucide-react";
import welcomeImg from "@assets/Wilujeng_Sumping_Wargi_RW03!_1772993003046.png";

function WelcomePopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose} data-testid="welcome-overlay">
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          data-testid="button-close-welcome"
        >
          <X className="w-5 h-5" />
        </button>
        <img
          src={welcomeImg}
          alt="Wilujeng Sumping Wargi RW03!"
          className="w-full h-auto"
          data-testid="img-welcome"
        />
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
        <Route path="/">{() => <Redirect to="/warga" />}</Route>
        <Route path="/warga" component={WargaBeranda} />
        <Route path="/warga/profil" component={WargaProfil} />
        <Route path="/warga/laporan" component={WargaLaporan} />
        <Route path="/warga/pelayanan" component={WargaPelayanan} />
        <Route component={NotFound} />
      </Switch>
    </WargaLayout>
  );
}

function AdminRoutes() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/">{() => <Redirect to="/admin" />}</Route>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/kk" component={AdminKelolaKK} />
        <Route path="/admin/warga" component={AdminKelolaWarga} />
        <Route path="/admin/laporan" component={AdminKelolaLaporan} />
        <Route path="/admin/surat" component={AdminKelolaSurat} />
        <Route path="/admin/surat-rw" component={AdminSuratRw} />
        <Route path="/admin/profil-edit" component={AdminProfilEdit} />
        <Route path="/admin/wa-blast" component={AdminWaBlast} />
        <Route path="/admin/arsip-surat" component={AdminArsipSurat} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
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
