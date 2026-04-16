import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient, getQueryFn, readJsonSafely } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

const LoginPage = lazy(() => import("@/pages/login"));
const WargaLayout = lazy(() => import("@/components/warga-layout"));
const WargaBeranda = lazy(() => import("@/pages/warga/beranda"));
const WargaProfil = lazy(() => import("@/pages/warga/profil"));
const WargaRwcoin = lazy(() => import("@/pages/warga/rwcoin"));
const AdminLayout = lazy(() => import("@/components/admin-layout"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminKelolaKK = lazy(() => import("@/pages/admin/kelola-kk"));
const AdminKelolaWarga = lazy(() => import("@/pages/admin/kelola-warga"));
const AdminPeta = lazy(() => import("@/pages/admin/peta"));
const AdminSuratRw = lazy(() => import("@/pages/admin/surat-rw"));
const AdminProfilEdit = lazy(() => import("@/pages/admin/profil-edit"));
const AdminWaBlast = lazy(() => import("@/pages/admin/wa-blast"));
const AdminPemilikKost = lazy(() => import("@/pages/admin/kelola-pemilik-kost"));
const AdminWargaSinggah = lazy(() => import("@/pages/admin/kelola-warga-singgah"));
const AdminRwcoin = lazy(() => import("@/pages/admin/rwcoin"));
const SinggahLayout = lazy(() => import("@/components/singgah-layout"));
const SinggahBeranda = lazy(() => import("@/pages/singgah/beranda"));
const SinggahLaporan = lazy(() => import("@/pages/singgah/laporan"));
const MitraLayout = lazy(() => import("@/components/mitra-layout"));
const MitraLoginPage = lazy(() => import("@/pages/mitra/login"));
const MitraBeranda = lazy(() => import("@/pages/mitra/beranda"));
const MitraTransaksi = lazy(() => import("@/pages/mitra/transaksi"));
const MitraWithdraw = lazy(() => import("@/pages/mitra/withdraw"));
const MitraDiskon = lazy(() => import("@/pages/mitra/diskon"));

import goldLogo from "@assets/RW3-Cimahi-Logo-Gold.webp";
import emblemSvg from "@assets/rw03-emblem.svg";

function PageLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
      style={{ background: "linear-gradient(160deg, hsl(163,55%,16%) 0%, hsl(163,55%,24%) 100%)" }}
    >
      {/* Emblem */}
      <div className="relative flex items-center justify-center">
        {/* Glow ring */}
        <div
          className="absolute w-40 h-40 rounded-full opacity-20 animate-pulse"
          style={{ background: "radial-gradient(circle, hsl(40,45%,55%) 0%, transparent 70%)" }}
        />
        <img
          src={emblemSvg}
          alt="RW03"
          className="w-28 h-auto relative z-10 drop-shadow-2xl"
          style={{ filter: "drop-shadow(0 4px 24px rgba(199,163,90,0.3))" }}
        />
      </div>

      {/* Text */}
      <div className="text-center space-y-1">
        <p className="text-lg font-bold tracking-wide" style={{ color: "hsl(40,45%,65%)" }}>
          RW 03 Padasuka
        </p>
        <p className="text-xs tracking-widest uppercase opacity-60 text-white">
          Sistem Informasi Warga
        </p>
      </div>

      {/* Loading dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{
              backgroundColor: "hsl(40,45%,55%)",
              animationDelay: `${i * 0.15}s`,
              animationDuration: "0.8s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function WargaRoutes() {
  return (
    <WargaLayout>
      <Switch>
        <Route path="/warga" component={WargaBeranda} />
        <Route path="/warga/profil" component={WargaProfil} />
        <Route path="/warga/rwcoin" component={WargaRwcoin} />
        <Route>{() => <Redirect to="/warga" />}</Route>
      </Switch>
    </WargaLayout>
  );
}

function AdminLoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (error: any) {
      const msg = error.message?.includes(":") ? error.message.split(":").slice(1).join(":").trim() : error.message;
      try { setErr(JSON.parse(msg).message); } catch { setErr(msg); }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src={goldLogo} alt="RW03" className="w-14 h-14 mx-auto" />
          <h1 className="text-xl font-bold" style={{ color: "hsl(163,55%,22%)" }}>Admin RW 03 Padasuka</h1>
          <p className="text-xs text-muted-foreground">Akses khusus pengurus RW</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 bg-card border rounded-2xl p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full h-11 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-[hsl(163,55%,22%)]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full h-11 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-[hsl(163,55%,22%)]" />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button type="submit" disabled={submitting}
            className="w-full h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "hsl(163,55%,22%)" }}>
            {submitting ? "Masuk..." : "Masuk sebagai Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminApp() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || (user.type !== "admin" && !user.isAdmin)) {
    return <AdminLoginForm />;
  }
  return <AdminRoutes />;
}

function MitraRoutes() {
  return (
    <MitraLayout>
      <Switch>
        <Route path="/mitra" component={MitraBeranda} />
        <Route path="/mitra/transaksi" component={MitraTransaksi} />
        <Route path="/mitra/withdraw" component={MitraWithdraw} />
        <Route path="/mitra/diskon" component={MitraDiskon} />
        <Route>{() => <Redirect to="/mitra" />}</Route>
      </Switch>
    </MitraLayout>
  );
}

function AdminRoutes() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/peta" component={AdminPeta} />
        <Route path="/admin/kk" component={AdminKelolaKK} />
        <Route path="/admin/warga" component={AdminKelolaWarga} />
        <Route path="/admin/surat-rw" component={AdminSuratRw} />
        <Route path="/admin/profil-edit" component={AdminProfilEdit} />
        <Route path="/admin/wa-blast" component={AdminWaBlast} />
        <Route path="/admin/pemilik-kost" component={AdminPemilikKost} />
        <Route path="/admin/warga-singgah" component={AdminWargaSinggah} />
        <Route path="/admin/rwcoin" component={AdminRwcoin} />
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
  const [location] = useLocation();

  // Admin - jalur terpisah, punya login sendiri
  if (location.startsWith("/admin")) {
    return <Suspense fallback={<PageLoader />}><AdminApp /></Suspense>;
  }

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
    if (location.startsWith("/mitra")) {
      return <Suspense fallback={<PageLoader />}><MitraLoginPage onLogin={() => window.location.reload()} /></Suspense>;
    }
    return <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>;
  }

  if (user.type === "admin" || user.isAdmin) {
    return <Redirect to="/admin" />;
  }

  if (user.type === "mitra") {
    return <Suspense fallback={<PageLoader />}><MitraRoutes /></Suspense>;
  }

  if (user.type === "warga_singgah") {
    return <Suspense fallback={<PageLoader />}><SinggahRoutes /></Suspense>;
  }

  return <Suspense fallback={<PageLoader />}><WargaRoutes /></Suspense>;
}

function AppUpdateGate({ children }: { children: React.ReactNode }) {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const { data } = useQuery<{ version: string } | null>({
    queryKey: ["/api/app-version"],
    queryFn: async () => {
      const res = await fetch("/api/app-version", {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (res.status === 401) {
        return null;
      }

      if (!res.ok) {
        throw new Error(`Gagal memeriksa versi aplikasi (${res.status})`);
      }

      return readJsonSafely<{ version: string }>(res);
    },
    staleTime: 0,
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data?.version) return;
    const stored = localStorage.getItem("app_version");
    if (!stored) {
      localStorage.setItem("app_version", data.version);
      return;
    }
    if (stored !== data.version) {
      setNewVersion(data.version);
      setNeedsUpdate(true);
    }
  }, [data?.version]);

  if (needsUpdate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-5 max-w-xs">
          <img src={goldLogo} alt="RW03" className="w-16 h-16 mx-auto" />
          <div className="space-y-2">
            <h2 className="font-bold text-lg" style={{ color: "hsl(163,55%,22%)" }}>
              Versi Baru Tersedia
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ada pembaruan sistem RW 03 Padasuka. Perbarui terlebih dahulu sebelum melanjutkan.
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("app_version", newVersion!);
              const url = new URL(window.location.href);
              url.searchParams.set("_appv", newVersion!);
              window.location.replace(url.toString());
            }}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm"
            style={{ backgroundColor: "hsl(163,55%,22%)" }}
          >
            Perbarui Sekarang
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppUpdateGate>
            <AppContent />
          </AppUpdateGate>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
