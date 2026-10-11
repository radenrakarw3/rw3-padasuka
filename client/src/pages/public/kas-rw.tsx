import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Search,
  ShieldCheck, Sparkles, Wallet, Cpu, Eye,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";
import { cn } from "@/lib/utils";

type TransaksiPublik = {
  id: number;
  tipe: "pemasukan" | "pengeluaran";
  kategori: string;
  jumlah: number;
  keterangan: string;
  tanggal: string;
  otomatis: boolean;
};

type KasPublik = {
  summary: { totalPemasukan: number; totalPengeluaran: number; saldo: number };
  transaksi: TransaksiPublik[];
  diperbarui: string | null;
};

const GOLD = "hsl(40,58%,68%)";
const MASUK = "hsl(152,60%,52%)";
const KELUAR = "hsl(6,78%,64%)";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const ringkas = (n: number) => {
  const abs = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${s}${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `${s}${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (abs >= 1_000) return `${s}${Math.round(abs / 1_000)} rb`;
  return `${s}${abs}`;
};

const kunciBulan = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const geserBulan = (bulan: string, n: number) => {
  const [y, m] = bulan.split("-").map(Number);
  return kunciBulan(new Date(y, m - 1 + n, 1));
};

const labelBulan = (bulan: string, gaya: "long" | "short" = "long") => {
  const [y, m] = bulan.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", gaya === "long" ? { month: "long", year: "numeric" } : { month: "short" });
};

const labelTanggal = (tgl: string) =>
  new Date(`${tgl}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function useHitungNaik(target: number, durasi = 1400) {
  const kurangiGerak = useReducedMotion();
  const [nilai, setNilai] = useState(kurangiGerak ? target : 0);
  useEffect(() => {
    if (kurangiGerak) {
      setNilai(target);
      return;
    }
    let frame = 0;
    const mulai = performance.now();
    const langkah = (t: number) => {
      const p = Math.min(1, (t - mulai) / durasi);
      setNilai(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(langkah);
    };
    frame = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(frame);
  }, [target, durasi, kurangiGerak]);
  return nilai;
}

function TooltipKas({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/15 bg-[hsl(163,45%,10%)]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.dataKey === "saldo" ? "Saldo" : p.dataKey === "pemasukan" ? "Masuk" : "Keluar"}: {rupiah(p.value)}
        </p>
      ))}
    </div>
  );
}

function Kaca({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  const kurangiGerak = useReducedMotion();
  return (
    <motion.section
      initial={kurangiGerak ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(
        "rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      {children}
    </motion.section>
  );
}

const PER_HALAMAN = 20;

export default function PublicKasRw() {
  const { data, isLoading, isError } = useQuery<KasPublik>({ queryKey: ["/api/public/kas-rw"] });
  const sekarang = kunciBulan(new Date());
  const [bulan, setBulan] = useState(sekarang);
  const [filterTipe, setFilterTipe] = useState<"semua" | "pemasukan" | "pengeluaran">("semua");
  const [tabKategori, setTabKategori] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [cari, setCari] = useState("");
  const [batas, setBatas] = useState(PER_HALAMAN);

  useEffect(() => { setBatas(PER_HALAMAN); }, [bulan, filterTipe, cari]);

  const [bulanAwalDipilih, setBulanAwalDipilih] = useState(false);
  useEffect(() => {
    if (!data || bulanAwalDipilih) return;
    setBulanAwalDipilih(true);
    const terbaru = data.transaksi.reduce<string | null>((max, t) => {
      const k = t.tanggal.slice(0, 7);
      return k <= sekarang && (!max || k > max) ? k : max;
    }, null);
    if (terbaru) setBulan(terbaru);
  }, [data, bulanAwalDipilih, sekarang]);

  const transaksi = data?.transaksi ?? [];
  const summary = data?.summary ?? { totalPemasukan: 0, totalPengeluaran: 0, saldo: 0 };
  const saldoAnimasi = useHitungNaik(summary.saldo);

  const bulanPertama = useMemo(() => {
    if (!transaksi.length) return sekarang;
    return transaksi.reduce((min, t) => (t.tanggal.slice(0, 7) < min ? t.tanggal.slice(0, 7) : min), sekarang);
  }, [transaksi, sekarang]);

  const tren = useMemo(() => {
    const awal = geserBulan(sekarang, -11);
    let saldoBerjalan = 0;
    const perBulan: Record<string, { pemasukan: number; pengeluaran: number }> = {};
    for (const t of transaksi) {
      const k = t.tanggal.slice(0, 7);
      const delta = t.tipe === "pemasukan" ? t.jumlah : -t.jumlah;
      if (k < awal) { saldoBerjalan += delta; continue; }
      perBulan[k] ??= { pemasukan: 0, pengeluaran: 0 };
      perBulan[k][t.tipe] += t.jumlah;
    }
    return Array.from({ length: 12 }, (_, i) => {
      const k = geserBulan(awal, i);
      const b = perBulan[k] ?? { pemasukan: 0, pengeluaran: 0 };
      saldoBerjalan += b.pemasukan - b.pengeluaran;
      return { bulan: labelBulan(k, "short"), kunci: k, ...b, saldo: saldoBerjalan };
    });
  }, [transaksi, sekarang]);

  const dataBulan = useMemo(() => transaksi.filter((t) => t.tanggal.startsWith(bulan)), [transaksi, bulan]);
  const masukBulan = dataBulan.filter((t) => t.tipe === "pemasukan").reduce((s, t) => s + t.jumlah, 0);
  const keluarBulan = dataBulan.filter((t) => t.tipe === "pengeluaran").reduce((s, t) => s + t.jumlah, 0);

  const kategori = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of dataBulan) if (t.tipe === tabKategori) map.set(t.kategori, (map.get(t.kategori) ?? 0) + t.jumlah);
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([nama, jumlah]) => ({ nama, jumlah, persen: total ? (jumlah / total) * 100 : 0 }))
      .sort((a, b) => b.jumlah - a.jumlah);
  }, [dataBulan, tabKategori]);

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return dataBulan.filter((t) =>
      (filterTipe === "semua" || t.tipe === filterTipe) &&
      (!q || t.keterangan.toLowerCase().includes(q) || t.kategori.toLowerCase().includes(q)),
    );
  }, [dataBulan, filterTipe, cari]);

  const grupTanggal = useMemo(() => {
    const grup: { tanggal: string; item: TransaksiPublik[] }[] = [];
    for (const t of daftar.slice(0, batas)) {
      const akhir = grup[grup.length - 1];
      if (akhir?.tanggal === t.tanggal) akhir.item.push(t);
      else grup.push({ tanggal: t.tanggal, item: [t] });
    }
    return grup;
  }, [daftar, batas]);

  const rasioMasuk = summary.totalPemasukan + summary.totalPengeluaran > 0
    ? (summary.totalPemasukan / (summary.totalPemasukan + summary.totalPengeluaran)) * 100
    : 50;

  const diperbarui = data?.diperbarui
    ? new Date(data.diperbarui).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="min-h-screen surface-kiosk relative overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-[hsl(40,60%,55%)]/20 blur-3xl" />
        <div className="absolute top-[40%] -left-40 w-[26rem] h-[26rem] rounded-full bg-[hsl(152,60%,40%)]/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <header className="relative z-10 max-w-3xl mx-auto px-4 pt-5 flex items-center gap-3">
        <Link href="/">
          <span className="touch-target inline-flex items-center justify-center rounded-full w-10 h-10 bg-white/10 hover:bg-white/20 transition-colors" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </span>
        </Link>
        <img src={logoGold} alt="" className="w-9 h-9 object-contain" aria-hidden />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(40,45%,72%)]">Transparansi</p>
          <h1 className="font-bold leading-tight truncate">Kas RW 03 Padasuka</h1>
        </div>
        <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/80">
          <Eye className="w-3.5 h-3.5" aria-hidden /> Terbuka untuk warga
        </span>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 pt-6 pb-12 space-y-5">
        {isError && (
          <div className="rounded-2xl border border-red-300/30 bg-red-500/10 p-4 text-sm">
            Laporan kas belum bisa dimuat. Coba muat ulang halaman sebentar lagi.
          </div>
        )}

        {/* Saldo utama */}
        <Kaca className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 opacity-60" aria-hidden
            style={{ background: "linear-gradient(125deg, transparent 0%, hsl(40,60%,60%,0.10) 40%, hsl(40,70%,75%,0.18) 52%, transparent 66%)" }} />
          <div className="relative">
            <div className="flex items-center gap-2 text-[hsl(40,45%,75%)]">
              <Wallet className="w-4 h-4" aria-hidden />
              <p className="text-xs uppercase tracking-[0.25em]">Saldo Kas Saat Ini</p>
            </div>
            {isLoading ? (
              <div className="h-14 w-64 mt-3 rounded-xl bg-white/10 animate-pulse" />
            ) : (
              <p
                className="mt-2 text-[2.5rem] sm:text-6xl font-extrabold tracking-tight leading-none bg-clip-text text-transparent tabular-nums"
                style={{ backgroundImage: "linear-gradient(180deg, hsl(45,90%,88%) 0%, hsl(40,60%,64%) 55%, hsl(34,55%,48%) 100%)" }}
                data-testid="text-public-saldo"
              >
                {rupiah(saldoAnimasi)}
              </p>
            )}
            <p className="mt-3 text-xs text-white/60 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[hsl(40,60%,70%)]" aria-hidden />
              {diperbarui ? `Pembaruan terakhir ${diperbarui}` : "Belum ada transaksi tercatat"}
            </p>

            <div className="mt-5 h-24 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tren} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<TooltipKas />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
                  <XAxis dataKey="bulan" hide />
                  <Area type="monotone" dataKey="saldo" stroke={GOLD} strokeWidth={2.5} fill="url(#gradSaldo)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 text-right">Pergerakan saldo 12 bulan</p>
          </div>
        </Kaca>

        {/* Total masuk / keluar */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { label: "Total Pemasukan", nilai: summary.totalPemasukan, Icon: ArrowDownLeft, warna: MASUK },
            { label: "Total Pengeluaran", nilai: summary.totalPengeluaran, Icon: ArrowUpRight, warna: KELUAR },
          ] as const).map(({ label, nilai, Icon, warna }, i) => (
            <Kaca key={label} className="p-4 sm:p-5" delay={0.08 * (i + 1)}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${warna.replace(")", ",0.15)")}` }}>
                <Icon className="w-5 h-5" style={{ color: warna }} aria-hidden />
              </div>
              <p className="text-[11px] text-white/60">{label}</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums mt-0.5" style={{ color: warna }}>{rupiah(nilai)}</p>
            </Kaca>
          ))}
        </div>
        <div className="px-1">
          <div className="h-2 rounded-full overflow-hidden bg-white/10 flex" aria-label="Perbandingan pemasukan dan pengeluaran">
            <motion.div initial={{ width: 0 }} animate={{ width: `${rasioMasuk}%` }} transition={{ duration: 1.2, ease: "easeOut" }} style={{ background: MASUK }} />
            <div className="flex-1" style={{ background: KELUAR }} />
          </div>
          <div className="flex justify-between text-[10px] text-white/50 mt-1.5">
            <span>{rasioMasuk.toFixed(0)}% masuk</span>
            <span>{(100 - rasioMasuk).toFixed(0)}% keluar</span>
          </div>
        </div>

        {/* Arus kas */}
        <Kaca className="p-5" delay={0.1}>
          <h2 className="font-semibold">Arus Kas 12 Bulan</h2>
          <p className="text-xs text-white/50 mb-3">Ketuk batang untuk melihat rincian bulan itu</p>
          <div className="h-52 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tren}
                barGap={2}
                barCategoryGap="28%"
                onClick={(e: any) => { const k = e?.activePayload?.[0]?.payload?.kunci; if (k) setBulan(k); }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={ringkas} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<TooltipKas />} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
                <Bar dataKey="pemasukan" fill={MASUK} radius={[6, 6, 0, 0]} className="cursor-pointer" />
                <Bar dataKey="pengeluaran" fill={KELUAR} radius={[6, 6, 0, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Kaca>

        {/* Navigasi bulan */}
        <div className="sticky top-2 z-20">
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-[hsl(163,50%,12%)]/85 backdrop-blur-md p-2 shadow-lg">
            <button
              type="button"
              onClick={() => setBulan(geserBulan(bulan, -1))}
              disabled={bulan <= bulanPertama}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center">
              <p className="font-semibold capitalize">{labelBulan(bulan)}</p>
              <p className="text-[10px] text-white/50">{dataBulan.length} transaksi</p>
            </div>
            <button
              type="button"
              onClick={() => setBulan(geserBulan(bulan, 1))}
              disabled={bulan >= sekarang}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Masuk", nilai: masukBulan, warna: MASUK },
            { label: "Keluar", nilai: keluarBulan, warna: KELUAR },
            { label: "Selisih", nilai: masukBulan - keluarBulan, warna: masukBulan - keluarBulan >= 0 ? GOLD : KELUAR },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/50">{s.label}</p>
              <p className="text-sm sm:text-base font-bold tabular-nums mt-0.5" style={{ color: s.warna }}>
                {s.label === "Selisih" && s.nilai > 0 ? "+" : ""}{ringkas(s.nilai)}
              </p>
            </div>
          ))}
        </div>

        {/* Komposisi kategori */}
        <Kaca className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold">Ke Mana &amp; Dari Mana</h2>
            <div className="flex rounded-full bg-white/10 p-0.5 text-xs">
              {(["pemasukan", "pengeluaran"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTabKategori(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-full transition-colors",
                    tabKategori === t ? "bg-white text-[hsl(163,55%,18%)] font-semibold" : "text-white/70 hover:text-white",
                  )}
                >
                  {t === "pemasukan" ? "Sumber" : "Penggunaan"}
                </button>
              ))}
            </div>
          </div>
          {kategori.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-6">
              Tidak ada {tabKategori} di {labelBulan(bulan)}
            </p>
          ) : (
            <ul className="space-y-3.5">
              {kategori.map((k, i) => (
                <li key={k.nama}>
                  <div className="flex justify-between text-sm mb-1.5 gap-3">
                    <span className="truncate">{k.nama}</span>
                    <span className="tabular-nums text-white/80 flex-shrink-0">
                      {rupiah(k.jumlah)} <span className="text-white/40 text-xs">· {k.persen.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      key={`${bulan}-${tabKategori}-${k.nama}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(k.persen, 2)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: tabKategori === "pemasukan"
                          ? `linear-gradient(90deg, ${MASUK}, hsl(170,60%,60%))`
                          : `linear-gradient(90deg, ${KELUAR}, hsl(30,80%,62%))`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Kaca>

        {/* Buku kas */}
        <Kaca className="p-5">
          <h2 className="font-semibold mb-3">Buku Kas {labelBulan(bulan)}</h2>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <label className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" aria-hidden />
              <input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari keterangan atau kategori"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/10 border border-white/10 text-sm placeholder:text-white/40 outline-none focus:border-[hsl(40,50%,65%)]"
                data-testid="input-cari-kas"
              />
            </label>
            <div className="flex rounded-xl bg-white/10 p-0.5 text-xs">
              {(["semua", "pemasukan", "pengeluaran"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterTipe(t)}
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-2 rounded-lg transition-colors capitalize",
                    filterTipe === t ? "bg-white text-[hsl(163,55%,18%)] font-semibold" : "text-white/70 hover:text-white",
                  )}
                >
                  {t === "semua" ? "Semua" : t === "pemasukan" ? "Masuk" : "Keluar"}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-white/10 animate-pulse" />)}</div>
          ) : grupTanggal.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-10">Belum ada transaksi yang cocok</p>
          ) : (
            <div className="space-y-5">
              {grupTanggal.map((g) => (
                <div key={g.tanggal}>
                  <p className="text-[11px] uppercase tracking-wider text-[hsl(40,45%,72%)] mb-2">{labelTanggal(g.tanggal)}</p>
                  <ul className="space-y-2">
                    {g.item.map((t) => {
                      const masuk = t.tipe === "pemasukan";
                      return (
                        <li
                          key={t.id}
                          className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 hover:bg-white/[0.08] transition-colors"
                          data-testid={`row-kas-publik-${t.id}`}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: (masuk ? MASUK : KELUAR).replace(")", ",0.15)") }}
                          >
                            {masuk
                              ? <ArrowDownLeft className="w-4 h-4" style={{ color: MASUK }} />
                              : <ArrowUpRight className="w-4 h-4" style={{ color: KELUAR }} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{t.keterangan}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/70">{t.kategori}</span>
                              {t.otomatis && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[hsl(40,50%,60%)]/15 text-[hsl(40,55%,75%)] inline-flex items-center gap-1">
                                  <Cpu className="w-3 h-3" aria-hidden /> Sistem
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-semibold tabular-nums flex-shrink-0" style={{ color: masuk ? MASUK : KELUAR }}>
                            {masuk ? "+" : "−"}{rupiah(t.jumlah)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {daftar.length > batas && (
                <button
                  type="button"
                  onClick={() => setBatas((b) => b + PER_HALAMAN)}
                  className="w-full h-11 rounded-xl border border-white/15 text-sm text-white/80 hover:bg-white/10 transition-colors"
                >
                  Tampilkan lebih banyak ({daftar.length - batas} lagi)
                </button>
              )}
            </div>
          )}
        </Kaca>

        <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white/60 leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-[hsl(40,50%,68%)] flex-shrink-0" aria-hidden />
          <p>
            Halaman ini hanya-baca dan dikelola pengurus RW 03. Untuk menjaga privasi, rincian per KK, nama pembayar,
            dan data pribadi lain tidak ditampilkan. Pertanyaan soal kas bisa disampaikan ke pengurus RW.
          </p>
        </div>
      </main>

      <footer className="relative z-10 py-5 text-center text-[11px] text-white/45">
        Kelurahan Padasuka · RW 03 · Kota Cimahi
      </footer>
    </div>
  );
}
