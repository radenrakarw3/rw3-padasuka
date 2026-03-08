import { Switch, Route } from "wouter";
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

function WargaRoutes() {
  return (
    <WargaLayout>
      <Switch>
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
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/kk" component={AdminKelolaKK} />
        <Route path="/admin/warga" component={AdminKelolaWarga} />
        <Route path="/admin/laporan" component={AdminKelolaLaporan} />
        <Route path="/admin/surat" component={AdminKelolaSurat} />
        <Route path="/admin/surat-rw" component={AdminSuratRw} />
        <Route path="/admin/profil-edit" component={AdminProfilEdit} />
        <Route path="/admin/wa-blast" component={AdminWaBlast} />
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
