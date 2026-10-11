import { lazy, Suspense, useState, type ReactNode } from "react";
import { Link, Redirect, Route, Switch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, FileText, Home, Inbox, LogOut, Search, Truck, UserPlus, Users, QrCode, Store, Mail } from "lucide-react";
import { RtjuaraAuthProvider, useRtjuaraAuth } from "@/lib/rtjuara-auth";
import { wil } from "@/lib/wilayah-api";
import { HIJAU, KartuMenu, Memuat, Pesan, TombolBesar, rt2 } from "@/components/wilayah/ui";
import { NAMA_BULAN } from "@shared/wilayah";

const Warga = lazy(() => import("./warga"));
const Keluarga = lazy(() => import("./keluarga"));
const Masalah = lazy(() => import("./masalah"));
const Laporan = lazy(() => import("./laporan"));
const Usulan = lazy(() => import("./usulan"));
const Cetak = lazy(() => import("./cetak"));
const Objek = lazy(() => import("./objek"));
const Pindah = lazy(() => import("./pindah"));

function Login() {
  const { login, bootError } = useRtjuaraAuth();
  const [rt, setRt] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [proses, setProses] = useState(false);
  const masuk = async () => {
    if (!rt || pin.length !== 6 || proses) return;
    setProses(true);
    setErr("");
    try {
      await login(rt, pin);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal masuk");
    } finally {
      setProses(false);
    }
  };
  return (
    <div className="min-h-screen bg-[hsl(163,30%,96%)] px-4 py-8 text-lg">
      <div className="max-w-md mx-auto bg-white rounded-3xl p-6 shadow">
        <h1 className="text-3xl font-bold mb-1" style={{ color: HIJAU }}>Pendataan RT</h1>
        <p className="text-lg text-gray-700 mb-6">RW 03 Kelurahan Padasuka. Khusus Ketua RT.</p>
        <p className="font-semibold mb-2">1. Pilih RT Anda</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button key={n} type="button" onClick={() => setRt(n)} aria-pressed={rt === n}
              className={`min-h-[56px] rounded-xl border-2 text-xl font-bold ${rt === n ? "text-white" : "bg-white border-gray-300"}`}
              style={rt === n ? { backgroundColor: HIJAU, borderColor: HIJAU } : undefined}>
              {String(n).padStart(2, "0")}
            </button>
          ))}
        </div>
        <label className="block mb-6">
          <span className="font-semibold">2. Ketik PIN (6 angka)</span>
          <input type="password" inputMode="numeric" autoComplete="off" value={pin} maxLength={6}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && masuk()}
            className="mt-2 w-full min-h-[60px] rounded-xl border-2 border-gray-300 text-center text-2xl tracking-[0.5em]" />
        </label>
        {bootError && <div className="mb-4"><Pesan jenis="peringatan">{bootError}</Pesan></div>}
        {err && <div className="mb-4"><Pesan jenis="error">{err}</Pesan></div>}
        <TombolBesar onClick={masuk} disabled={!rt || pin.length !== 6} memuat={proses}>
          {rt ? `Masuk sebagai ${rt2(rt)}` : "Masuk"}
        </TombolBesar>
        <p className="text-base text-gray-600 mt-4">Lupa PIN? Hubungi Ketua RW untuk membuat PIN baru.</p>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { sesi, logout } = useRtjuaraAuth();
  const nav = [
    { href: "/rt", label: "Beranda", ikon: Home, aktif: loc === "/rt" || loc === "/rt/" },
    { href: "/rt/warga", label: "Warga", ikon: Users, aktif: loc.startsWith("/rt/warga") || loc.startsWith("/rt/keluarga") },
    { href: "/rt/laporan", label: "Laporan", ikon: FileText, aktif: loc.startsWith("/rt/laporan") },
  ];
  return (
    <div className="min-h-screen bg-[hsl(163,30%,96%)] text-lg text-gray-900">
      <header className="sticky top-0 z-20 text-white px-4 py-3 flex items-center justify-between print:hidden" style={{ backgroundColor: HIJAU }}>
        <div>
          <p className="text-xl font-bold leading-tight">{rt2(sesi?.rt)} · RW 03</p>
          {sesi?.namaKetua && <p className="text-base opacity-90">{sesi.namaKetua}</p>}
        </div>
        <button type="button" onClick={logout} className="min-h-[52px] px-3 flex items-center gap-2 rounded-xl active:bg-white/10">
          <LogOut className="w-6 h-6" /> Keluar
        </button>
      </header>
      <main className="max-w-xl mx-auto px-4 pt-4 pb-32 print:p-0 print:max-w-none">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t-2 border-gray-200 grid grid-cols-3 print:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {nav.map((n) => (
          <Link key={n.href} href={n.href}
            className="min-h-[68px] flex flex-col items-center justify-center gap-1 text-lg font-semibold"
            style={{ color: n.aktif ? HIJAU : "#4b5563" }}>
            <n.ikon className="w-7 h-7" strokeWidth={n.aktif ? 2.6 : 2} />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Beranda() {
  const [, go] = useLocation();
  const [cari, setCari] = useState("");
  const { data: a, isLoading, error } = useQuery({ queryKey: ["/api/wilayah/rt/antrean"], queryFn: () => wil("/api/wilayah/rt/antrean") });
  const now = new Date();
  const antre = [
    { n: a?.usulan, judul: "Isian warga perlu diperiksa", sub: "Dari QR pemberitahuan", href: "/rt/usulan", ikon: <Inbox className="w-7 h-7" /> },
    { n: a?.pindah_masuk, judul: "Warga pindah masuk", sub: "Perlu Anda terima atau tolak", href: "/rt/pindah", ikon: <Truck className="w-7 h-7" /> },
    { n: a?.perlu_cek, judul: "Data lama perlu dicek", sub: "Benarkan atau tolak", href: "/rt/warga?perlu=cek", ikon: <ClipboardList className="w-7 h-7" /> },
    { n: a?.hadir_belum_diisi, judul: "Kehadiran kegiatan RW belum diisi", sub: "Isi jumlah warga RT yang hadir", href: "/rt/laporan?langkah=lengkapi", ikon: <Users className="w-7 h-7" /> },
    { n: a?.kejadian_terbuka, judul: "Masalah belum selesai", sub: "Catat tindak lanjut", href: "/rt/masalah", ikon: <AlertTriangle className="w-7 h-7" /> },
    { n: a?.kk_tanpa_rumah, judul: "Keluarga belum dihubungkan ke rumah", sub: "Agar rumah tidak terhitung ganda", href: "/rt/warga?perlu=rumah", ikon: <Home className="w-7 h-7" /> },
  ].filter((x) => (x.n ?? 0) > 0);
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); go(`/rt/warga?cari=${encodeURIComponent(cari)}`); }} className="flex gap-2">
        <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama atau alamat…"
          className="flex-1 min-h-[56px] rounded-2xl border-2 border-gray-300 px-4 text-lg bg-white" aria-label="Cari warga" />
        <button type="submit" className="min-h-[56px] min-w-[56px] rounded-2xl text-white flex items-center justify-center" style={{ backgroundColor: HIJAU }} aria-label="Cari">
          <Search className="w-7 h-7" />
        </button>
      </form>
      <KartuMenu ikon={<UserPlus className="w-7 h-7" />} judul="Catat Perubahan Warga" sub="Lahir, pindah, meninggal, kondisi keluarga" onClick={() => go("/rt/warga?aksi=catat")} />
      <KartuMenu ikon={<AlertTriangle className="w-7 h-7" />} judul="Catat Masalah Wilayah" sub="Kejadian keamanan, kesehatan, lingkungan" onClick={() => go("/rt/masalah/baru")} />
      <KartuMenu ikon={<FileText className="w-7 h-7" />} judul={`Laporan ${NAMA_BULAN[now.getMonth()]}`} sub="Tarik, lengkapi, periksa, finalkan" onClick={() => go("/rt/laporan")} />

      <h2 className="text-xl font-bold pt-2">Pekerjaan menunggu</h2>
      {isLoading && <Memuat />}
      {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}
      {!isLoading && !error && antre.length === 0 && <Pesan jenis="sukses">Tidak ada pekerjaan menunggu. Terima kasih!</Pesan>}
      {antre.map((x) => <KartuMenu key={x.href} ikon={x.ikon} judul={x.judul} sub={x.sub} angka={x.n} onClick={() => go(x.href)} />)}

      <h2 className="text-xl font-bold pt-2">Lainnya</h2>
      <KartuMenu ikon={<QrCode className="w-7 h-7" />} judul="Cetak QR Pemberitahuan" sub="Kartu pendataan untuk tiap keluarga" onClick={() => go("/rt/cetak")} />
      <KartuMenu ikon={<Store className="w-7 h-7" />} judul="Usaha, Fasilitas, Kegiatan" sub="Data wilayah RT" onClick={() => go("/rt/objek")} />
      <KartuMenu ikon={<Truck className="w-7 h-7" />} judul="Pindah RT (serah-terima)" onClick={() => go("/rt/pindah")} />
      <KartuMenu ikon={<Mail className="w-7 h-7" />} judul="Surat dari RW" sub="Dokumen untuk RT dan tugas yang perlu dilaporkan" onClick={() => go("/rt/objek?tab=surat")} />
    </div>
  );
}

function Rute() {
  const { sesi, loading } = useRtjuaraAuth();
  if (loading) return <Memuat />;
  if (!sesi) return <Login />;
  return (
    <Shell>
      <Suspense fallback={<Memuat />}>
        <Switch>
          <Route path="/rt" component={Beranda} />
          <Route path="/rt/warga" component={Warga} />
          <Route path="/rt/keluarga/:id">{(p) => <Keluarga id={Number(p.id)} />}</Route>
          <Route path="/rt/masalah/baru">{() => <Masalah baru />}</Route>
          <Route path="/rt/masalah">{() => <Masalah />}</Route>
          <Route path="/rt/laporan" component={Laporan} />
          <Route path="/rt/usulan/:id">{(p) => <Usulan id={Number(p.id)} />}</Route>
          <Route path="/rt/usulan">{() => <Usulan />}</Route>
          <Route path="/rt/cetak" component={Cetak} />
          <Route path="/rt/objek" component={Objek} />
          <Route path="/rt/pindah" component={Pindah} />
          <Route>{() => <Redirect to="/rt" />}</Route>
        </Switch>
      </Suspense>
    </Shell>
  );
}

export default function RtApp() {
  return (
    <RtjuaraAuthProvider>
      <Rute />
    </RtjuaraAuthProvider>
  );
}
