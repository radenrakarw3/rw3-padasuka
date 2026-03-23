import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, Wallet, TrendingUp, TrendingDown, Trophy, Clock,
  CheckCircle, XCircle, Users, ChevronRight, ChevronLeft,
  Banknote, Copy, Shield, BarChart2, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Receipt, CheckCircle2 } from "lucide-react";
import type { DonasiCampaign, Donasi, KasRw, IuranKk } from "@shared/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function formatTanggal(t: string) {
  return new Date(t + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function addMonths(m: string, n: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatMonthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function fmtChart(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}rb`;
  return String(v);
}
function getMonthlyChart(tx: KasRw[]) {
  const months: Record<string, { bulan: string; pemasukan: number; pengeluaran: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[k] = { bulan: new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("id-ID", { month: "short" }), pemasukan: 0, pengeluaran: 0 };
  }
  for (const t of tx) {
    const k = t.tanggal.slice(0, 7);
    if (months[k]) months[k][t.tipe === "pemasukan" ? "pemasukan" : "pengeluaran"] += Number(t.jumlah);
  }
  return Object.values(months);
}
function getDailyChart(tx: KasRw[], month: string) {
  const days: Record<string, { hari: string; pemasukan: number; pengeluaran: number }> = {};
  for (const t of tx) {
    if (!t.tanggal.startsWith(month)) continue;
    const d = t.tanggal.slice(8, 10);
    if (!days[d]) days[d] = { hari: String(parseInt(d)), pemasukan: 0, pengeluaran: 0 };
    days[d][t.tipe === "pemasukan" ? "pemasukan" : "pengeluaran"] += Number(t.jumlah);
  }
  return Object.entries(days).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([, v]) => v);
}
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg p-2.5 shadow-md text-xs space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name === "pemasukan" ? "Masuk" : "Keluar"}: {formatRupiah(p.value)}</p>
      ))}
    </div>
  );
};

const NOMINAL_PRESETS = [5000, 10000, 25000, 50000, 100000];
const statusConfig: Record<string, { label: string; bg: string; icon: any }> = {
  pending:      { label: "Menunggu konfirmasi", bg: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
  dikonfirmasi: { label: "Diterima",            bg: "bg-green-50 text-green-700 border-green-200",  icon: CheckCircle },
  ditolak:      { label: "Ditolak",             bg: "bg-red-50 text-red-700 border-red-200",        icon: XCircle },
};
const ITEMS_PER_PAGE = 10;

// ─── TAB: KEUANGAN RW ─────────────────────────────────────────────────────────
function TabKeuangan() {
  const now = getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(now);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ transaksi: KasRw[]; summary: { totalPemasukan: number; totalPengeluaran: number; saldo: number } }>({
    queryKey: ["/api/kas-rw/laporan"],
  });
  const { data: campaigns } = useQuery<DonasiCampaign[]>({ queryKey: ["/api/donasi-campaign"] });

  useEffect(() => { setPage(1); }, [selectedMonth]);

  const transaksi = data?.transaksi ?? [];
  const summary = data?.summary;
  const filtered = transaksi.filter(t => t.tanggal.startsWith(selectedMonth));
  const monthIn   = filtered.filter(t => t.tipe === "pemasukan").reduce((s, t) => s + Number(t.jumlah), 0);
  const monthOut  = filtered.filter(t => t.tipe === "pengeluaran").reduce((s, t) => s + Number(t.jumlah), 0);
  const monthSaldo = monthIn - monthOut;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const canPrev = selectedMonth > "2020-01";
  const canNext = selectedMonth < now;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: TrendingUp,   color: "text-green-600", label: "Total Masuk",   val: summary ? formatRupiah(summary.totalPemasukan) : "-" },
          { icon: TrendingDown, color: "text-red-600",   label: "Total Keluar",  val: summary ? formatRupiah(summary.totalPengeluaran) : "-" },
          { icon: Wallet,       color: "text-blue-600",  label: "Saldo Kas",     val: summary ? formatRupiah(summary.saldo) : "-" },
        ].map((item, i) => (
          <Card key={i}><CardContent className="p-3 text-center">
            <item.icon className={`w-4 h-4 ${item.color} mx-auto mb-1`} />
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
            <p className={`text-[11px] font-bold ${item.color} leading-tight`}>{item.val}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Grafik 6 bulan */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-[hsl(163,55%,22%)]" /> 6 Bulan Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {isLoading ? <Skeleton className="h-36 w-full" /> : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={getMonthlyChart(transaksi)} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtChart} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="pemasukan"   fill="hsl(142,71%,45%)" radius={[3,3,0,0]} name="pemasukan" />
                <Bar dataKey="pengeluaran" fill="hsl(0,72%,51%)"   radius={[3,3,0,0]} name="pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-3 justify-center mt-1">
            {[["bg-green-500","Pemasukan"],["bg-red-500","Pengeluaran"]].map(([bg, label]) => (
              <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`w-2.5 h-2.5 rounded-sm ${bg} inline-block`} />{label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigasi bulan */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))} disabled={!canPrev}
          className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold">{formatMonthLabel(selectedMonth)}</p>
          <p className="text-[10px] text-muted-foreground">{filtered.length} transaksi</p>
        </div>
        <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} disabled={!canNext}
          className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Ringkasan bulan */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-green-50 border border-green-100 p-2.5 text-center">
            <p className="text-[10px] text-green-700 font-medium">Masuk Bulan Ini</p>
            <p className="text-xs font-bold text-green-700 mt-0.5">{formatRupiah(monthIn)}</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-center">
            <p className="text-[10px] text-red-700 font-medium">Keluar Bulan Ini</p>
            <p className="text-xs font-bold text-red-700 mt-0.5">{formatRupiah(monthOut)}</p>
          </div>
          <div className={`rounded-lg p-2.5 text-center border ${monthSaldo >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}>
            <p className={`text-[10px] font-medium ${monthSaldo >= 0 ? "text-blue-700" : "text-red-700"}`}>Selisih</p>
            <p className={`text-xs font-bold mt-0.5 ${monthSaldo >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatRupiah(Math.abs(monthSaldo))}</p>
          </div>
        </div>
      )}

      {/* Grafik harian */}
      {getDailyChart(transaksi, selectedMonth).length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[hsl(163,55%,22%)]" /> Harian — {formatMonthLabel(selectedMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={getDailyChart(transaksi, selectedMonth)} barGap={1} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="hari" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtChart} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="pemasukan"   fill="hsl(142,71%,45%)" radius={[3,3,0,0]} name="pemasukan" />
                <Bar dataKey="pengeluaran" fill="hsl(0,72%,51%)"   radius={[3,3,0,0]} name="pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Riwayat transaksi */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2.5">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : paginated.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada transaksi di bulan ini</p>
          ) : (
            <div className="space-y-2">
              {paginated.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${t.tipe === "pemasukan" ? "bg-green-100" : "bg-red-100"}`}>
                      {t.tipe === "pemasukan"
                        ? <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                        : <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{t.keterangan}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${t.tipe === "pemasukan" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {t.kategori}
                        </span>
                        {t.campaignId && campaigns && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-700 flex items-center gap-0.5">
                            <Heart className="w-2 h-2" />
                            {campaigns.find(c => c.id === t.campaignId)?.judul ?? "Campaign"}
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground">{formatTanggal(t.tanggal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-semibold ${t.tipe === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                      {t.tipe === "pemasukan" ? "+" : "-"}{formatRupiah(Number(t.jumlah))}
                    </p>
                    {t.createdBy === "sistem" && <p className="text-[8px] text-blue-500">otomatis</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="p-1.5 rounded border hover:bg-muted/50 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-xs text-muted-foreground">Hal. {page} / {totalPages}</p>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="p-1.5 rounded border hover:bg-muted/50 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transparansi */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(163,55%,22%)]/5 border border-[hsl(163,55%,22%)]/20">
        <Shield className="w-4 h-4 text-[hsl(163,55%,22%)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-semibold text-[hsl(163,55%,22%)]">Transparansi Keuangan</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
            Seluruh pemasukan dari donasi tercatat otomatis oleh sistem saat dikonfirmasi admin. Data tidak bisa diedit demi menjaga akuntabilitas.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: DONASI ──────────────────────────────────────────────────────────────
function TabDonasi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<0 | 1>(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [namaDonatur, setNamaDonatur] = useState("");
  const [nominalPreset, setNominalPreset] = useState<number | null>(null);
  const [nominalCustom, setNominalCustom] = useState("");
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

  const { data: campaigns, isLoading } = useQuery<DonasiCampaign[]>({ queryKey: ["/api/donasi-campaign"] });
  const { data: myDonasi }  = useQuery<(Donasi & { judulCampaign: string })[]>({ queryKey: ["/api/donasi"] });
  const { data: leaderboard } = useQuery<{ namaDonatur: string; total: number; count: number }[]>({ queryKey: ["/api/donasi/leaderboard"] });
  const { data: terkumpulMap } = useQuery<Record<number, number>>({ queryKey: ["/api/donasi/terkumpul"] });

  const jumlahFinal = nominalPreset ?? (nominalCustom ? parseInt(nominalCustom) : 0);
  const activeCampaigns = campaigns?.filter(c => c.status === "aktif") ?? [];
  const selectedCampaign = activeCampaigns.find(c => c.id === selectedCampaignId);

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/donasi", { campaignId: selectedCampaignId, kkId: user?.kkId, namaDonatur, jumlah: jumlahFinal });
    },
    onSuccess: () => {
      toast({ title: "Terima kasih!", description: "Donasi tercatat, menunggu konfirmasi admin." });
      setStep(0); setSelectedCampaignId(null);
      setNamaDonatur(""); setNominalPreset(null); setNominalCustom("");
      queryClient.invalidateQueries({ queryKey: ["/api/donasi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/donasi/terkumpul"] });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const copyRekening = () => {
    try { navigator.clipboard.writeText("1390997490"); } catch {}
    toast({ title: "Nomor rekening disalin!" });
  };

  const openDonasi = (campaignId: number, preset?: number) => {
    setSelectedCampaignId(campaignId);
    setNominalPreset(preset ?? 25000);
    setNominalCustom("");
    setStep(1);
  };

  // ── Form donasi ──
  if (step === 1 && selectedCampaign) {
    const collected = Number(terkumpulMap?.[selectedCampaign.id] ?? 0);
    const target    = Number(selectedCampaign.targetDana ?? 0);
    const persen    = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
    const sisaTarget = target > 0 ? Math.max(0, target - collected) : 0;

    return (
      <div className="space-y-4">
        <button onClick={() => setStep(0)} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> Kembali
        </button>

        {/* Header campaign */}
        <div className="rounded-2xl bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,15%)] p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-[hsl(40,65%,70%)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-snug">{selectedCampaign.judul}</p>
              <p className="text-xs text-white/70 mt-0.5 line-clamp-2">{selectedCampaign.deskripsi}</p>
              {target > 0 && (
                <div className="mt-2.5 space-y-1">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[hsl(40,65%,65%)] rounded-full" style={{ width: `${persen}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-white/70">
                    <span>Terkumpul {formatRupiah(collected)}</span>
                    <span>{persen}% dari {formatRupiah(target)}</span>
                  </div>
                </div>
              )}
              {sisaTarget > 0 && <p className="mt-1.5 text-[11px] text-[hsl(40,65%,75%)] font-medium">Kurang {formatRupiah(sisaTarget)} lagi</p>}
            </div>
          </div>
        </div>

        {/* Rekening */}
        <div className="rounded-xl border-2 border-dashed border-[hsl(163,55%,22%)]/30 bg-[hsl(163,55%,22%)]/5 p-4">
          <p className="text-xs text-muted-foreground mb-2.5 font-medium">1. Transfer terlebih dahulu ke rekening ini</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Banknote className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">BCA · Raden Raka Abdul Kamal S.</p>
                <p className="text-lg font-bold tracking-wider">1390997490</p>
              </div>
            </div>
            <button onClick={copyRekening}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(163,55%,22%)] text-white text-xs font-semibold active:scale-95 transition-transform">
              <Copy className="w-3.5 h-3.5" /> Salin
            </button>
          </div>
        </div>

        {/* Nominal */}
        <div className="space-y-2.5">
          <p className="text-xs text-muted-foreground font-medium">2. Pilih jumlah donasi</p>
          <div className="grid grid-cols-3 gap-2">
            {NOMINAL_PRESETS.map(n => (
              <button key={n}
                onClick={() => { setNominalPreset(n); setNominalCustom(""); }}
                className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
                  nominalPreset === n
                    ? "bg-[hsl(163,55%,22%)] text-white border-[hsl(163,55%,22%)]"
                    : "bg-background border-border hover:border-[hsl(163,55%,22%)]/40"
                }`}>
                {n >= 1000 ? `${n/1000}rb` : n}
              </button>
            ))}
            <button
              onClick={() => { setNominalPreset(null); setNominalCustom(""); }}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
                nominalPreset === null
                  ? "bg-[hsl(163,55%,22%)] text-white border-[hsl(163,55%,22%)]"
                  : "bg-background border-border hover:border-[hsl(163,55%,22%)]/40"
              }`}>
              Lainnya
            </button>
          </div>
          {nominalPreset === null && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
              <Input type="number" value={nominalCustom} onChange={e => setNominalCustom(e.target.value)}
                placeholder="Masukkan jumlah" className="pl-10 h-12 text-base" min="1" />
            </div>
          )}
          {jumlahFinal > 0 && <p className="text-center text-base font-bold text-[hsl(163,55%,22%)]">{formatRupiah(jumlahFinal)}</p>}
        </div>

        {/* Nama */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">3. Nama pengirim transfer</p>
          <Input value={namaDonatur} onChange={e => setNamaDonatur(e.target.value)}
            placeholder="Nama sesuai pengirim di bank" className="h-12 text-base" />
          <p className="text-[10px] text-muted-foreground">Isi sama persis seperti nama di rekening/m-Banking agar admin bisa memverifikasi.</p>
        </div>

        <Button className="w-full h-14 text-base font-bold bg-[hsl(163,55%,22%)] gap-2"
          onClick={() => createMutation.mutate()}
          disabled={!namaDonatur.trim() || jumlahFinal <= 0 || createMutation.isPending}>
          {createMutation.isPending
            ? <span className="flex items-center gap-2"><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Mengirim...</span>
            : <span className="flex items-center gap-2"><Heart className="w-5 h-5" />Saya Sudah Transfer — Konfirmasi</span>
          }
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">Admin akan memverifikasi transfer Anda.</p>
      </div>
    );
  }

  // ── Halaman utama donasi ──
  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,15%)] p-4 text-white">
        <div className="flex items-center gap-2 mb-1.5">
          <Heart className="w-5 h-5 text-[hsl(40,65%,70%)]" />
          <h2 className="text-base font-bold">Donasi Warga</h2>
        </div>
        <p className="text-sm text-white/75 leading-relaxed">Bantu kegiatan dan pembangunan lingkungan RW 03.</p>
        {(leaderboard?.length ?? 0) > 0 && (
          <div className="mt-3 flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2 w-fit">
            <Users className="w-3.5 h-3.5 text-[hsl(40,65%,70%)]" />
            <p className="text-xs font-semibold text-white">{leaderboard!.length} warga sudah berkontribusi</p>
          </div>
        )}
      </div>

      {/* Campaigns */}
      {activeCampaigns.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Heart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Belum ada program donasi aktif</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {activeCampaigns.map(c => {
            const collected = Number(terkumpulMap?.[c.id] ?? 0);
            const target    = Number(c.targetDana ?? 0);
            const persen    = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
            const sisaTarget = target > 0 ? Math.max(0, target - collected) : 0;
            return (
              <Card key={c.id} className="overflow-hidden border-2 border-[hsl(163,55%,22%)]/15">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(163,55%,22%)]/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-[hsl(163,55%,22%)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-snug">{c.judul}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.deskripsi}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Terkumpul</p>
                        <p className="text-base font-bold text-[hsl(163,55%,22%)]">{formatRupiah(collected)}</p>
                      </div>
                      {target > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Target</p>
                          <p className="text-sm font-semibold">{formatRupiah(target)}</p>
                        </div>
                      )}
                    </div>
                    {target > 0 && (
                      <>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-[hsl(163,55%,22%)] rounded-full transition-all" style={{ width: `${persen}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span className="font-medium text-[hsl(163,55%,22%)]">{persen}% tercapai</span>
                          {sisaTarget > 0 && <span>Kurang {formatRupiah(sisaTarget)}</span>}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-medium">Pilih nominal donasi:</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[10000, 25000, 50000, 100000].map(n => (
                        <button key={n} onClick={() => openDonasi(c.id, n)}
                          className="py-2 rounded-lg text-xs font-semibold border-2 border-[hsl(163,55%,22%)]/25 bg-[hsl(163,55%,22%)]/5 text-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,22%)]/15 active:scale-95 transition-all">
                          {n >= 1000 ? `${n/1000}rb` : n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => openDonasi(c.id)}
                    className="w-full relative flex items-center justify-center gap-2 py-3 bg-[hsl(163,55%,22%)] text-white rounded-xl text-sm font-bold active:scale-[0.98] transition-transform">
                    <Heart className="w-4 h-4" />
                    Donasi Sekarang
                    <ChevronRight className="w-4 h-4 absolute right-3" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[hsl(40,45%,55%)]" />
                <span className="text-sm font-bold">Donatur Terbaik</span>
              </div>
              {leaderboard.length > 3 && (
                <button onClick={() => setShowAllLeaderboard(!showAllLeaderboard)} className="text-xs text-[hsl(163,55%,22%)] font-medium">
                  {showAllLeaderboard ? "Sembunyikan" : `Lihat semua (${leaderboard.length})`}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(showAllLeaderboard ? leaderboard : leaderboard.slice(0, 3)).map((e, i) => (
                <div key={e.namaDonatur} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-500" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
                  }`}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                  <p className="flex-1 text-sm font-medium truncate">{e.namaDonatur}</p>
                  <p className="text-sm font-bold text-[hsl(163,55%,22%)] flex-shrink-0">{formatRupiah(Number(e.total))}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Donasi saya */}
      {myDonasi && myDonasi.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-bold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Donasi Saya ({myDonasi.length})
            </p>
            <div className="space-y-2.5">
              {myDonasi.map(d => {
                const sc = statusConfig[d.status] ?? statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div key={d.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${sc.bg}`}>
                    <StatusIcon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{d.judulCampaign}</p>
                      <p className="text-[10px] opacity-70">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""} · {sc.label}
                      </p>
                    </div>
                    <p className="text-sm font-bold flex-shrink-0">{formatRupiah(Number(d.jumlah))}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── TAB IURAN SAYA ───────────────────────────────────────────────────────────
function formatBulanIuran(bulanTahun: string): string {
  const [year, month] = bulanTahun.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function formatTanggalIuran(tanggal: string): string {
  const d = new Date(tanggal + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatRupiahIuran(num: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}

function getCurrentMonthIuran(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function TabIuran() {
  const { data: iuranList = [], isLoading } = useQuery<IuranKk[]>({
    queryKey: ["/api/iuran/warga"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/iuran/warga");
      return res.json();
    },
  });

  const currentMonth = getCurrentMonthIuran();
  const iuranBulanIni = iuranList.find(r => r.bulanTahun === currentMonth);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (iuranList.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Tidak ada data iuran untuk KK Anda.<br />
          <span className="text-xs">(Iuran hanya untuk warga RT 1–4)</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status bulan ini */}
      <Card className={iuranBulanIni?.status === "lunas" ? "border-green-200 bg-green-50/50" : "border-orange-200 bg-orange-50/50"}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Iuran Bulan Ini</p>
              <p className="font-semibold text-sm">{formatBulanIuran(currentMonth)}</p>
            </div>
            {iuranBulanIni ? (
              <div className="text-right">
                <p className="font-bold text-lg">{formatRupiahIuran(Number(iuranBulanIni.jumlah))}</p>
                {iuranBulanIni.status === "lunas" ? (
                  <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Lunas {iuranBulanIni.tanggalBayar ? `· ${formatTanggalIuran(iuranBulanIni.tanggalBayar)}` : ""}
                  </span>
                ) : (
                  <span className="text-orange-600 text-xs font-medium">Belum Dibayar</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Belum ada tagihan</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Riwayat */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Riwayat Iuran</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {iuranList.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{formatBulanIuran(r.bulanTahun)}</p>
                  {r.tanggalBayar && (
                    <p className="text-xs text-muted-foreground">Bayar: {formatTanggalIuran(r.tanggalBayar)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatRupiahIuran(Number(r.jumlah))}</p>
                  {r.status === "lunas" ? (
                    <span className="text-xs text-green-600 font-medium">Lunas</span>
                  ) : (
                    <span className="text-xs text-red-500">Belum</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── HALAMAN UTAMA ────────────────────────────────────────────────────────────
export default function WargaKeuanganDonasi() {
  const [activeTab, setActiveTab] = useState<"donasi" | "keuangan" | "iuran">("donasi");

  const tabs = [
    { id: "donasi",   label: "Donasi",   icon: Heart    },
    { id: "keuangan", label: "Kas RW",   icon: Wallet   },
    { id: "iuran",    label: "Iuran",    icon: Receipt  },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-2 bg-muted rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-[hsl(163,55%,22%)] shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Konten tab */}
      {activeTab === "donasi"   && <TabDonasi />}
      {activeTab === "keuangan" && <TabKeuangan />}
      {activeTab === "iuran"    && <TabIuran />}
    </div>
  );
}
