import { useState, useEffect, lazy, Suspense, Component, type ReactNode } from "react";

import { Switch, Route, Redirect, useLocation } from "wouter";

import { queryClient, readJsonSafely } from "./lib/queryClient";

import { QueryClientProvider, useQuery } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";

import { PersetujuanCookie } from "@/components/persetujuan-cookie";

import { TooltipProvider } from "@/components/ui/tooltip";

import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { AuthProvider, useAuth } from "@/lib/auth";



const PublicLanding = lazy(() => import("@/pages/public/landing"));

const PublicPelayanan = lazy(() => import("@/pages/public/pelayanan"));
const PublicKasRw = lazy(() => import("@/pages/public/kas-rw"));

const Visitrw3Hub = lazy(() => import("@/pages/visitrw3/hub"));
const Visitrw3HubPemilik = lazy(() => import("@/pages/visitrw3/hub-pemilik"));
const Visitrw3HubPenyewa = lazy(() => import("@/pages/visitrw3/hub-penyewa"));
const Visitrw3DaftarProperti = lazy(() => import("@/pages/visitrw3/daftar-properti"));
const Visitrw3Pengajuan = lazy(() => import("@/pages/visitrw3/pengajuan"));
const Visitrw3Perpanjang = lazy(() => import("@/pages/visitrw3/perpanjang"));
const Visitrw3Status = lazy(() => import("@/pages/visitrw3/status"));
const Visitrw3StatusProperti = lazy(() => import("@/pages/visitrw3/status-properti"));
const Visitrw3Panduan = lazy(() => import("@/pages/visitrw3/panduan"));

const Rw3bizHub = lazy(() => import("@/pages/rw3biz/hub"));
const Rw3bizPengajuan = lazy(() => import("@/pages/rw3biz/pengajuan"));
const Rw3bizFormulir = lazy(() => import("@/pages/rw3biz/formulir"));
const Rw3bizPanduan = lazy(() => import("@/pages/rw3biz/panduan"));
const Rw3bizStatus = lazy(() => import("@/pages/rw3biz/status"));
const Rw3bizPerpanjang = lazy(() => import("@/pages/rw3biz/perpanjang"));

const AdminLayout = lazy(() => import("@/components/admin-layout"));

const AdminKependudukanRingkasan = lazy(() => import("@/pages/admin/kependudukan-ringkasan"));
const AdminKependudukanRekap = lazy(() => import("@/pages/admin/kependudukan-rekap"));
const AdminKelolaWarga = lazy(() => import("@/pages/admin/kelola-warga"));

const AdminSuratRw = lazy(() => import("@/pages/admin/surat-rw"));
const AdminSuratSakti = lazy(() => import("@/pages/admin/surat-sakti"));
const AdminRwDashboard = lazy(() => import("@/pages/admin/rw-dashboard"));
const AdminStandarData = lazy(() => import("@/pages/admin/standar-data"));
const AdminCekWarga = lazy(() => import("@/pages/admin/cek-warga"));
const PublicIsi = lazy(() => import("@/pages/public/isi"));

const AdminVisitrw3Landing = lazy(() => import("@/pages/admin/visitrw3-landing"));
const AdminVisitrw3Dashboard = lazy(() => import("@/pages/admin/visitrw3-dashboard"));
const AdminVisitrw3Kalender = lazy(() => import("@/pages/admin/visitrw3-kalender"));
const AdminVisitrw3Antrian = lazy(() => import("@/pages/admin/visitrw3-antrian-page"));
const AdminVisitrw3Properti = lazy(() => import("@/pages/admin/visitrw3-properti"));
const AdminVisitrw3Penghuni = lazy(() => import("@/pages/admin/visitrw3-penghuni"));
const AdminRw3bizLanding = lazy(() => import("@/pages/admin/rw3biz-landing"));
const AdminRw3bizAntrian = lazy(() => import("@/pages/admin/rw3biz-antrian"));
const AdminRw3bizDashboard = lazy(() => import("@/pages/admin/rw3biz-dashboard"));
const AdminRw3bizTagihan = lazy(() => import("@/pages/admin/rw3biz-tagihan"));
const AdminRw3bizTarif = lazy(() => import("@/pages/admin/rw3biz-tarif"));
const AdminRw3bizRazia = lazy(() => import("@/pages/admin/rw3biz-razia"));
const AdminRw3bizPelanggaran = lazy(() => import("@/pages/admin/rw3biz-pelanggaran"));
const AduanBeranda = lazy(() => import("@/pages/aduan/index"));
const AduanBuat = lazy(() => import("@/pages/aduan/buat"));
const AduanLacak = lazy(() => import("@/pages/aduan/lacak"));
const AdminAduan = lazy(() => import("@/pages/admin/aduan/index"));
const AdminAduanDetail = lazy(() => import("@/pages/admin/aduan/detail"));
const AdminAduanTeguran = lazy(() => import("@/pages/admin/aduan/teguran"));
const AdminAduanTeradu = lazy(() => import("@/pages/admin/aduan/teradu"));
const AdminKeuangan = lazy(() => import("@/pages/admin/keuangan"));

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
  return path.startsWith("/admin");
}

/** Redirect path lama /singgah/* ke alur Visit RW3. */
function singgahLegacyRedirect(rest?: string): string {
  const path = (rest ?? "").replace(/^\//, "").toLowerCase();
  if (!path || path === "beranda") return "/visitrw3";
  if (path === "pengajuan" || path.startsWith("pengajuan")) return "/visitrw3/pengajuan";
  if (path === "perpanjang" || path.startsWith("perpanjang")) return "/visitrw3/perpanjang";
  if (path === "status" || path.startsWith("status")) return "/visitrw3/status";
  if (path === "login") return "/visitrw3";
  return "/visitrw3";
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

              placeholder="Contoh: raden raka"

              autoComplete="username"

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

        <Route path="/admin/kependudukan/rekap" component={AdminKependudukanRekap} />
        <Route path="/admin/kependudukan" component={AdminKependudukanRingkasan} />
        <Route path="/admin/kelola-warga/*" component={AdminKelolaWarga} />
        <Route path="/admin/kelola-warga" component={AdminKelolaWarga} />
        <Route path="/admin/akun-rt">{() => <Redirect to="/admin/kelola-warga" />}</Route>
        <Route path="/admin/rtjuara/:rest*">{() => <Redirect to="/admin/kelola-warga" />}</Route>
        <Route path="/admin/rtjuara">{() => <Redirect to="/admin/kelola-warga" />}</Route>

        <Route path="/admin/dashboard" component={AdminRwDashboard} />
        <Route path="/admin/standar-data" component={AdminStandarData} />
        <Route path="/admin/cek-warga" component={AdminCekWarga} />
        <Route path="/admin/surat-rw-lama" component={AdminSuratRw} />
        <Route path="/admin/surat-rw" component={AdminSuratSakti} />

        <Route path="/admin/rw3biz/antrian" component={AdminRw3bizAntrian} />
        <Route path="/admin/rw3biz/dashboard" component={AdminRw3bizDashboard} />
        <Route path="/admin/rw3biz/tagihan" component={AdminRw3bizTagihan} />
        <Route path="/admin/rw3biz/tarif" component={AdminRw3bizTarif} />
        <Route path="/admin/rw3biz/razia" component={AdminRw3bizRazia} />
        <Route path="/admin/rw3biz/pelanggaran" component={AdminRw3bizPelanggaran} />
        <Route path="/admin/aduan-teguran" component={AdminAduanTeguran} />
        <Route path="/admin/aduan-teradu" component={AdminAduanTeradu} />
        <Route path="/admin/aduan/:id">{(p) => <AdminAduanDetail id={Number(p.id)} />}</Route>
        <Route path="/admin/aduan" component={AdminAduan} />
        <Route path="/admin/keuangan" component={AdminKeuangan} />
        <Route path="/admin/rw3biz" component={AdminRw3bizLanding} />
        <Route path="/admin/visitrw3/properti" component={AdminVisitrw3Properti} />
        <Route path="/admin/visitrw3/penghuni" component={AdminVisitrw3Penghuni} />
        <Route path="/admin/visitrw3/antrian" component={AdminVisitrw3Antrian} />
        <Route path="/admin/visitrw3/kalender" component={AdminVisitrw3Kalender} />
        <Route path="/admin/visitrw3/dashboard" component={AdminVisitrw3Dashboard} />
        <Route path="/admin/visitrw3" component={AdminVisitrw3Landing} />
        <Route path="/admin/pemilik-kost">{() => <Redirect to="/admin/visitrw3/antrian" />}</Route>
        <Route path="/admin/warga-singgah">{() => <Redirect to="/admin/visitrw3/penghuni" />}</Route>

        <Route path="/admin">{() => <Redirect to="/admin/dashboard" />}</Route>

        <Route>{() => <Redirect to="/admin/dashboard" />}</Route>

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



function PublicRoutes() {

  return (

    <Switch>
      {/* Beranda & form warga publik */}
      <Route path="/" component={PublicLanding} />
      <Route path="/program/transparansi">{() => <Redirect to="/" />}</Route>
      <Route path="/program/:pilar">{() => <Redirect to="/" />}</Route>
      <Route path="/program">{() => <Redirect to="/" />}</Route>
      <Route path="/kampung-umkm">{() => <Redirect to="/" />}</Route>
      <Route path="/pelayanan" component={PublicPelayanan} />
      <Route path="/kas-rw" component={PublicKasRw} />
      <Route path="/kas">{() => <Redirect to="/kas-rw" />}</Route>

      {/* QR pendataan keluarga — token tidak pernah membuka data lama */}
      <Route path="/isi/status">{() => <PublicIsi status />}</Route>
      <Route path="/isi/:token">{(p) => <PublicIsi token={p.token} />}</Route>
      <Route path="/isi">{() => <PublicIsi />}</Route>

      {/* Aduan Warga — satu pintu, identitas pelapor dilindungi */}
      <Route path="/aduan/buat" component={AduanBuat} />
      <Route path="/aduan/lacak" component={AduanLacak} />
      <Route path="/aduan" component={AduanBeranda} />

      {/* RW3BIZ — izin usaha / jualan */}
      <Route path="/rw3biz/pengajuan" component={Rw3bizPengajuan} />
      <Route path="/rw3biz/formulir" component={Rw3bizFormulir} />
      <Route path="/rw3biz/perpanjang" component={Rw3bizPerpanjang} />
      <Route path="/rw3biz/status" component={Rw3bizStatus} />
      <Route path="/rw3biz/aduan">{() => <Redirect to="/aduan/buat?kategori=usaha" />}</Route>
      <Route path="/rw3biz/panduan" component={Rw3bizPanduan} />
      <Route path="/rw3biz" component={Rw3bizHub} />

      {/* Visit RW3 — tinggal (kost / kontrakan) */}
      <Route path="/visitrw3/daftar-usaha-rumahan">
        {() => <Redirect to="/rw3biz" />}
      </Route>
      <Route path="/visitrw3/ajukan-usaha-rumahan">
        {() => <Redirect to="/rw3biz/pengajuan" />}
      </Route>
      <Route path="/visitrw3/usaha-rumahan">
        {() => <Redirect to="/rw3biz" />}
      </Route>
      <Route path="/visitrw3/pemilik" component={Visitrw3HubPemilik} />
      <Route path="/visitrw3/penyewa" component={Visitrw3HubPenyewa} />
      <Route path="/visitrw3/daftar-properti" component={Visitrw3DaftarProperti} />
      <Route path="/visitrw3/pengajuan" component={Visitrw3Pengajuan} />
      <Route path="/visitrw3/perpanjang" component={Visitrw3Perpanjang} />
      <Route path="/visitrw3/status-properti" component={Visitrw3StatusProperti} />
      <Route path="/visitrw3/status" component={Visitrw3Status} />
      <Route path="/visitrw3/panduan" component={Visitrw3Panduan} />
      <Route path="/visitrw3/login">{() => <Redirect to="/visitrw3" />}</Route>
      <Route path="/visitrw3" component={Visitrw3Hub} />

      {/* Alias pendek — hindari tabrakan dengan /rwlaw */}
      <Route path="/biz/pengajuan">{() => <Redirect to="/rw3biz/pengajuan" />}</Route>
      <Route path="/biz">{() => <Redirect to="/rw3biz" />}</Route>

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
      <Route path="/singgah/:rest*">
        {(params) => <Redirect to={singgahLegacyRedirect(params["rest*"])} />}
      </Route>
      <Route path="/singgah">{() => <Redirect to="/visitrw3" />}</Route>

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

  if (location.startsWith("/blusukanrw") || location.startsWith("/rtjuara") || location === "/rt" || location.startsWith("/rt/")) {
    return <Redirect to="/" />;
  }

  // Admin juga memakai form publik ini (mode petugas: input dari formulir kertas).
  const layananPublik = ["/isi", "/visitrw3", "/rw3biz", "/kas-rw"].some(
    (p) => location === p || location.startsWith(`${p}/`),
  );
  if (layananPublik) {
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicRoutes />
      </Suspense>
    );
  }

  if (needsAuthSession(location) && loading) {

    return <PageLoader />;

  }



  if (user?.type === "admin" || user?.isAdmin) {
    return <Redirect to="/admin/dashboard" />;
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

          <PersetujuanCookie />

          <AppUpdateGate>

            <AppContent />

          </AppUpdateGate>

        </AuthProvider>

      </TooltipProvider>

    </QueryClientProvider>

  );

}



export default App;


