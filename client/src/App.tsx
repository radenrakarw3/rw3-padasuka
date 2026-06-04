import { useState, useEffect, lazy, Suspense, Component, type ReactNode } from "react";

import { Switch, Route, Redirect, useLocation } from "wouter";

import { queryClient, readJsonSafely } from "./lib/queryClient";

import { QueryClientProvider, useQuery } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";

import { TooltipProvider } from "@/components/ui/tooltip";

import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { AuthProvider, useAuth } from "@/lib/auth";



const PublicLanding = lazy(() => import("@/pages/public/landing"));

const PublicLapor = lazy(() => import("@/pages/public/lapor"));

const PublicPelayanan = lazy(() => import("@/pages/public/pelayanan"));

const Rw3lawIndex = lazy(() => import("@/pages/public/rw3law/index"));
const Rw3lawDokumen = lazy(() => import("@/pages/public/rw3law/dokumen"));

const Visitrw3Hub = lazy(() => import("@/pages/visitrw3/hub"));
const Visitrw3HubPemilik = lazy(() => import("@/pages/visitrw3/hub-pemilik"));
const Visitrw3HubPenyewa = lazy(() => import("@/pages/visitrw3/hub-penyewa"));
const Visitrw3DaftarProperti = lazy(() => import("@/pages/visitrw3/daftar-properti"));
const Visitrw3Pengajuan = lazy(() => import("@/pages/visitrw3/pengajuan"));
const Visitrw3Perpanjang = lazy(() => import("@/pages/visitrw3/perpanjang"));
const Visitrw3Status = lazy(() => import("@/pages/visitrw3/status"));
const Visitrw3StatusProperti = lazy(() => import("@/pages/visitrw3/status-properti"));

const AdminLayout = lazy(() => import("@/components/admin-layout"));

const AdminKelolaKK = lazy(() => import("@/pages/admin/kelola-kk"));

const AdminKelolaWarga = lazy(() => import("@/pages/admin/kelola-warga"));

const AdminKelolaLaporan = lazy(() => import("@/pages/admin/kelola-laporan"));

const AdminRw3law = lazy(() => import("@/pages/admin/rw3law"));

const AdminSuratRw = lazy(() => import("@/pages/admin/surat-rw"));

const AdminVisitrw3Dashboard = lazy(() => import("@/pages/admin/visitrw3-dashboard"));
const AdminVisitrw3Kalender = lazy(() => import("@/pages/admin/visitrw3-kalender"));
const AdminVisitrw3Antrian = lazy(() => import("@/pages/admin/visitrw3-antrian"));
const AdminVisitrw3Properti = lazy(() => import("@/pages/admin/visitrw3-properti"));
const AdminVisitrw3Penghuni = lazy(() => import("@/pages/admin/visitrw3-penghuni"));
const AdminVisitrw3Pengaturan = lazy(() => import("@/pages/admin/visitrw3-pengaturan"));

const AdminKeuangan = lazy(() => import("@/pages/admin/keuangan"));

const AdminKependudukanRingkasan = lazy(() => import("@/pages/admin/kependudukan-ringkasan"));
const AdminPeristiwaKependudukan = lazy(() => import("@/pages/admin/peristiwa-kependudukan"));
const AdminKkDetail = lazy(() => import("@/pages/admin/kk-detail"));

import BlusukanrwLogin from "@/pages/blusukanrw/login";
import BlusukanrwDashboard from "@/pages/blusukanrw/dashboard";
import BlusukanrwKunjungan from "@/pages/blusukanrw/kunjungan";
import BlusukanrwCari from "@/pages/blusukanrw/cari";
import BlusukanrwKkDetail from "@/pages/blusukanrw/kk-detail";

import goldLogo from "@assets/RW3-Cimahi-Logo-Gold.webp";
import { BlusukanAuthProvider, useBlusukanAuth } from "@/lib/blusukan-auth";
import { BlusukanrwLayout } from "@/components/blusukanrw-layout";

import emblemSvg from "@assets/rw03-emblem.svg";



function PageLoader() {

  return (

    <div

      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 surface-kiosk motion-reduce:transition-none"

    >

      <img src={emblemSvg} alt="RW03" className="w-28 h-auto drop-shadow-2xl motion-reduce:animate-none" />

      <div className="text-center space-y-1">

        <p className="text-lg font-bold tracking-wide" style={{ color: "hsl(40,45%,65%)" }}>

          RW 03 Padasuka

        </p>

        <p className="text-xs tracking-widest uppercase opacity-60 text-white">Memuat...</p>

      </div>

    </div>

  );

}



function needsAuthSession(path: string) {
  return path.startsWith("/admin");
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

    } catch (error: unknown) {

      const e = error as { message?: string };

      const msg = e.message?.includes(":") ? e.message!.split(":").slice(1).join(":").trim() : e.message;

      try {

        setErr(JSON.parse(msg || "").message);

      } catch {

        setErr(msg || "Login gagal");

      }

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

            <input

              type="text"

              value={username}

              onChange={(e) => setUsername(e.target.value)}

              className="w-full h-11 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-[hsl(163,55%,22%)]"

            />

          </div>

          <div className="space-y-2">

            <label className="text-sm font-medium">Password</label>

            <input

              type="password"

              value={password}

              onChange={(e) => setPassword(e.target.value)}

              className="w-full h-11 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-[hsl(163,55%,22%)]"

            />

          </div>

          {err && <p className="text-xs text-destructive">{err}</p>}

          <button

            type="submit"

            disabled={submitting}

            className="w-full h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-60"

            style={{ backgroundColor: "hsl(163,55%,22%)" }}

          >

            {submitting ? "Masuk..." : "Masuk sebagai Admin"}

          </button>

        </form>

      </div>

    </div>

  );

}



function AdminRouteFallback() {
  return <AdminPageSkeleton />;
}

class AdminSectionErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm space-y-2">
          <p className="font-semibold text-destructive">Halaman admin gagal dimuat</p>
          <p className="text-muted-foreground">{this.state.error.message}</p>
          <button
            type="button"
            className="underline text-primary text-xs"
            onClick={() => this.setState({ error: null })}
          >
            Coba lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminRoutes() {

  return (

    <AdminLayout>

      <AdminSectionErrorBoundary>
        <Suspense fallback={<AdminRouteFallback />}>
          <Switch>

        <Route path="/admin/kependudukan/kk/:id" component={AdminKkDetail} />
        <Route path="/admin/kependudukan/kk" component={AdminKelolaKK} />
        <Route path="/admin/kependudukan/warga" component={AdminKelolaWarga} />
        <Route path="/admin/kependudukan/peristiwa" component={AdminPeristiwaKependudukan} />
        <Route path="/admin/kependudukan" component={AdminKependudukanRingkasan} />

        <Route path="/admin/kk">{() => <Redirect to="/admin/kependudukan/kk" />}</Route>
        <Route path="/admin/warga">{() => <Redirect to="/admin/kependudukan/warga" />}</Route>

        <Route path="/admin/laporan" component={AdminKelolaLaporan} />

        <Route path="/admin/surat-warga">{() => <Redirect to="/admin/laporan" />}</Route>
        <Route path="/admin/dashboard">{() => <Redirect to="/admin/kependudukan" />}</Route>
        <Route path="/admin/antrian-warga">{() => <Redirect to="/admin/laporan" />}</Route>
        <Route path="/admin/rwcoin">{() => <Redirect to="/admin/laporan" />}</Route>

        <Route path="/admin/rw3law" component={AdminRw3law} />
        <Route path="/admin/rwlaw">{() => <Redirect to="/admin/rw3law" />}</Route>

        <Route path="/admin/surat-rw" component={AdminSuratRw} />

        <Route path="/admin/visitrw3/pengaturan" component={AdminVisitrw3Pengaturan} />
        <Route path="/admin/visitrw3/properti" component={AdminVisitrw3Properti} />
        <Route path="/admin/visitrw3/penghuni" component={AdminVisitrw3Penghuni} />
        <Route path="/admin/visitrw3/antrian" component={AdminVisitrw3Antrian} />
        <Route path="/admin/visitrw3/kalender" component={AdminVisitrw3Kalender} />
        <Route path="/admin/visitrw3/dashboard" component={AdminVisitrw3Dashboard} />
        <Route path="/admin/visitrw3">{() => <Redirect to="/admin/visitrw3/antrian" />}</Route>
        <Route path="/admin/pemilik-kost">{() => <Redirect to="/admin/visitrw3/properti" />}</Route>
        <Route path="/admin/warga-singgah">{() => <Redirect to="/admin/visitrw3/penghuni" />}</Route>

        <Route path="/admin/keuangan" component={AdminKeuangan} />

        <Route path="/admin">{() => <Redirect to="/admin/laporan" />}</Route>

        <Route>{() => <Redirect to="/admin/laporan" />}</Route>

      </Switch>
        </Suspense>
      </AdminSectionErrorBoundary>

    </AdminLayout>

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



function BlusukanrwRoutes() {
  const { authenticated, loading, bootError } = useBlusukanAuth();

  if (loading) return <PageLoader />;

  if (!authenticated) {
    return (
      <Switch>
        <Route path="/blusukanrw">
          {() => <BlusukanrwLogin bootError={bootError} />}
        </Route>
        <Route path="/blusukanrw/">{() => <Redirect to="/blusukanrw" />}</Route>
        <Route path="/blusukanrw/:rest*">{() => <Redirect to="/blusukanrw" />}</Route>
      </Switch>
    );
  }

  return (
    <BlusukanrwLayout>
      <Switch>
        <Route path="/blusukanrw/dashboard" component={BlusukanrwDashboard} />
        <Route path="/blusukanrw/kunjungan" component={BlusukanrwKunjungan} />
        <Route path="/blusukanrw/cari" component={BlusukanrwCari} />
        <Route path="/blusukanrw/kk/:id" component={BlusukanrwKkDetail} />
        <Route path="/blusukanrw">{() => <Redirect to="/blusukanrw/dashboard" />}</Route>
        <Route>{() => <Redirect to="/blusukanrw/dashboard" />}</Route>
      </Switch>
    </BlusukanrwLayout>
  );
}

function BlusukanrwApp() {
  return (
    <BlusukanAuthProvider>
      <BlusukanrwRoutes />
    </BlusukanAuthProvider>
  );
}

function PublicRoutes() {

  return (

    <Switch>
      {/* Beranda & form warga publik */}
      <Route path="/" component={PublicLanding} />
      <Route path="/lapor" component={PublicLapor} />
      <Route path="/pelayanan" component={PublicPelayanan} />

      {/* RW3LAW — path kanonik /rwlaw */}
      <Route path="/rwlaw/:slug" component={Rw3lawDokumen} />
      <Route path="/rwlaw" component={Rw3lawIndex} />
      <Route path="/rw3law/:slug">
        {(params) => <Redirect to={`/rwlaw/${params.slug}`} />}
      </Route>
      <Route path="/rw3law">{() => <Redirect to="/rwlaw" />}</Route>

      {/* Visit RW3 */}
      <Route path="/visitrw3/pemilik" component={Visitrw3HubPemilik} />
      <Route path="/visitrw3/penyewa" component={Visitrw3HubPenyewa} />
      <Route path="/visitrw3/daftar-properti" component={Visitrw3DaftarProperti} />
      <Route path="/visitrw3/pengajuan" component={Visitrw3Pengajuan} />
      <Route path="/visitrw3/perpanjang" component={Visitrw3Perpanjang} />
      <Route path="/visitrw3/status-properti" component={Visitrw3StatusProperti} />
      <Route path="/visitrw3/status" component={Visitrw3Status} />
      <Route path="/visitrw3/login">{() => <Redirect to="/visitrw3/penyewa" />}</Route>
      <Route path="/visitrw3" component={Visitrw3Hub} />

      {/* Fitur lama — redirect */}
      <Route path="/login">{() => <Redirect to="/" />}</Route>
      <Route path="/warga/rwcoin">{() => <Redirect to="/" />}</Route>
      <Route path="/warga/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/warga">{() => <Redirect to="/" />}</Route>
      <Route path="/mitra/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/mitra">{() => <Redirect to="/" />}</Route>
      <Route path="/rwcoin/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/rwcoin">{() => <Redirect to="/" />}</Route>
      <Route path="/tripay/:rest*">{() => <Redirect to="/" />}</Route>
      <Route path="/tripay">{() => <Redirect to="/" />}</Route>
      <Route path="/singgah/:rest*">{() => <Redirect to="/visitrw3/penyewa" />}</Route>
      <Route path="/singgah">{() => <Redirect to="/visitrw3/penyewa" />}</Route>

      <Route>{() => <Redirect to="/" />}</Route>
    </Switch>

  );

}



function AppContent() {

  const { user, loading } = useAuth();

  const [location] = useLocation();



  if (location.startsWith("/admin")) {

    return (

      <Suspense fallback={<PageLoader />}>

        <AdminApp />

      </Suspense>

    );

  }

  if (location.startsWith("/blusukanrw")) {
    return <BlusukanrwApp />;
  }

  if (needsAuthSession(location) && loading) {

    return <PageLoader />;

  }



  if (user?.type === "admin" || user?.isAdmin) {
    return <Redirect to="/admin/laporan" />;
  }

  return (

    <Suspense fallback={<PageLoader />}>

      <PublicRoutes />

    </Suspense>

  );

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

        headers: { "Cache-Control": "no-cache" },

      });

      if (res.status === 401) return null;

      if (!res.ok) throw new Error(`Gagal memeriksa versi aplikasi (${res.status})`);

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

          <h2 className="font-bold text-lg" style={{ color: "hsl(163,55%,22%)" }}>

            Versi Baru Tersedia

          </h2>

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


