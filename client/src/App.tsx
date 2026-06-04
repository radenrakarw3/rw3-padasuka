import { useState, useEffect, lazy, Suspense } from "react";

import { Switch, Route, Redirect, useLocation } from "wouter";

import { queryClient, readJsonSafely } from "./lib/queryClient";

import { QueryClientProvider, useQuery } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";

import { TooltipProvider } from "@/components/ui/tooltip";

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

const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));

const AdminKelolaKK = lazy(() => import("@/pages/admin/kelola-kk"));

const AdminKelolaWarga = lazy(() => import("@/pages/admin/kelola-warga"));

const AdminKelolaLaporan = lazy(() => import("@/pages/admin/kelola-laporan"));

const AdminRw3law = lazy(() => import("@/pages/admin/rw3law"));

const AdminSuratRw = lazy(() => import("@/pages/admin/surat-rw"));

const AdminVisitrw3Dashboard = lazy(() => import("@/pages/admin/visitrw3-dashboard"));
const AdminVisitrw3Antrian = lazy(() => import("@/pages/admin/visitrw3-antrian"));
const AdminVisitrw3Properti = lazy(() => import("@/pages/admin/visitrw3-properti"));
const AdminVisitrw3Penghuni = lazy(() => import("@/pages/admin/visitrw3-penghuni"));
const AdminVisitrw3Pengaturan = lazy(() => import("@/pages/admin/visitrw3-pengaturan"));

const AdminKeuangan = lazy(() => import("@/pages/admin/keuangan"));

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

  return (

    path.startsWith("/admin") ||

    path.startsWith("/singgah") ||

    path.startsWith("/mitra")

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



function AdminRoutes() {

  return (

    <AdminLayout>

      <Switch>

        <Route path="/admin/kk" component={AdminKelolaKK} />

        <Route path="/admin/warga" component={AdminKelolaWarga} />

        <Route path="/admin/laporan" component={AdminKelolaLaporan} />

        <Route path="/admin/rw3law" component={AdminRw3law} />

        <Route path="/admin/surat-rw" component={AdminSuratRw} />

        <Route path="/admin/visitrw3/pengaturan" component={AdminVisitrw3Pengaturan} />
        <Route path="/admin/visitrw3/properti" component={AdminVisitrw3Properti} />
        <Route path="/admin/visitrw3/penghuni" component={AdminVisitrw3Penghuni} />
        <Route path="/admin/visitrw3/antrian" component={AdminVisitrw3Antrian} />
        <Route path="/admin/visitrw3/dashboard" component={AdminVisitrw3Dashboard} />
        <Route path="/admin/visitrw3" component={AdminVisitrw3Dashboard} />
        <Route path="/admin/pemilik-kost">{() => <Redirect to="/admin/visitrw3/properti" />}</Route>
        <Route path="/admin/warga-singgah">{() => <Redirect to="/admin/visitrw3/penghuni" />}</Route>

        <Route path="/admin/keuangan" component={AdminKeuangan} />
        <Route path="/admin/rwcoin">{() => <Redirect to="/admin/keuangan" />}</Route>

        <Route path="/admin" component={AdminDashboard} />

        <Route>{() => <Redirect to="/admin" />}</Route>

      </Switch>

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



function PublicRoutes() {

  return (

    <Switch>

      <Route path="/" component={PublicLanding} />

      <Route path="/lapor" component={PublicLapor} />

      <Route path="/pelayanan" component={PublicPelayanan} />

      <Route path="/rwlaw/:slug" component={Rw3lawDokumen} />

      <Route path="/rwlaw" component={Rw3lawIndex} />

      <Route path="/rw3law/:slug">
        {(params) => <Redirect to={`/rwlaw/${params.slug}`} />}
      </Route>

      <Route path="/rw3law">
        <Redirect to="/rwlaw" />
      </Route>

      <Route path="/visitrw3" component={Visitrw3Hub} />

      <Route path="/visitrw3/pemilik" component={Visitrw3HubPemilik} />

      <Route path="/visitrw3/penyewa" component={Visitrw3HubPenyewa} />

      <Route path="/visitrw3/daftar-properti" component={Visitrw3DaftarProperti} />

      <Route path="/visitrw3/pengajuan" component={Visitrw3Pengajuan} />

      <Route path="/visitrw3/perpanjang" component={Visitrw3Perpanjang} />

      <Route path="/visitrw3/status" component={Visitrw3Status} />

      <Route path="/visitrw3/status-properti" component={Visitrw3StatusProperti} />

      <Route path="/login">{() => <Redirect to="/" />}</Route>

      <Route path="/warga">{() => <Redirect to="/" />}</Route>

      <Route path="/warga/:rest*">{() => <Redirect to="/" />}</Route>

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



  if (location.startsWith("/singgah") || location.startsWith("/visitrw3/login")) {

    return <Redirect to="/visitrw3" />;

  }



  if (location.startsWith("/mitra")) {
    return <Redirect to="/" />;
  }

  if (needsAuthSession(location) && loading) {

    return <PageLoader />;

  }



  if (user?.type === "admin" || user?.isAdmin) {

    return <Redirect to="/admin" />;

  }

  if (user?.type === "mitra") {
    return <Redirect to="/" />;
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


