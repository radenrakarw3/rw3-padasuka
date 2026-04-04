import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Pencil, Trash2, X, Check,
  ChevronLeft, ChevronRight, BarChart2, Calendar, Heart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { KasRw, DonasiCampaign } from "@shared/schema";

const KATEGORI_PEMASUKAN = ["Iuran Warga", "Donasi", "Infaq Surat", "Sumbangan", "Lainnya"];
const KATEGORI_PENGELUARAN = ["Kegiatan RT/RW", "Kebersihan", "Keamanan", "Pembangunan", "Sosial", "Operasional", "Lainnya"];

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}

function formatTanggal(tanggal: string): string {
  const d = new Date(tanggal + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(monthStr: string, n: number): string {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function formatChartLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "short" });
}

function formatChartValue(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}rb`;
  return String(val);
}

function getMonthlyChartData(transaksi: KasRw[]) {
  const months: Record<string, { bulan: string; pemasukan: number; pengeluaran: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = { bulan: formatChartLabel(key), pemasukan: 0, pengeluaran: 0 };
  }
  for (const t of transaksi) {
    const key = t.tanggal.slice(0, 7);
    if (months[key]) {
      if (t.tipe === "pemasukan") months[key].pemasukan += Number(t.jumlah);
      else months[key].pengeluaran += Number(t.jumlah);
    }
  }
  return Object.values(months);
}

function getDailyChartData(transaksi: KasRw[], month: string) {
  const days: Record<string, { hari: string; pemasukan: number; pengeluaran: number }> = {};
  for (const t of transaksi) {
    if (!t.tanggal.startsWith(month)) continue;
    const day = t.tanggal.slice(8, 10);
    if (!days[day]) days[day] = { hari: String(parseInt(day)), pemasukan: 0, pengeluaran: 0 };
    if (t.tipe === "pemasukan") days[day].pemasukan += Number(t.jumlah);
    else days[day].pengeluaran += Number(t.jumlah);
  }
  return Object.entries(days)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([, v]) => v);
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg p-2.5 shadow-md text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === "pemasukan" ? "Masuk" : "Keluar"}: {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  );
};

const ITEMS_PER_PAGE = 15;

function isRwcoinKasEntry(item: KasRw): boolean {
  return (item.createdBy ?? "").startsWith("rwcoin-") || item.kategori === "Pendapatan RWcoin";
}

export default function AdminKeuangan() {
  const { toast } = useToast();
  const now = getCurrentMonth();

  const [selectedMonth, setSelectedMonth] = useState(now);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"semua" | "rwcoin">("semua");

  const [tipe, setTipe] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [kategori, setKategori] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const { data: transaksiAll, isLoading } = useQuery<KasRw[]>({ queryKey: ["/api/kas-rw"] });
  const { data: summary } = useQuery<{ totalPemasukan: number; totalPengeluaran: number; saldo: number }>({ queryKey: ["/api/kas-rw/summary"] });
  const { data: campaigns } = useQuery<DonasiCampaign[]>({ queryKey: ["/api/donasi-campaign"] });
  const { data: campaignKas } = useQuery<Record<number, { pemasukan: number; pengeluaran: number; saldo: number }>>({ queryKey: ["/api/kas-rw/campaign-summary"] });

  useEffect(() => { setPage(1); }, [selectedMonth, sourceFilter]);

  const transaksi = transaksiAll || [];
  const monthlyChart = getMonthlyChartData(transaksi);
  const dailyChart = getDailyChartData(transaksi, selectedMonth);

  const filtered = transaksi.filter(t => {
    if (!t.tanggal.startsWith(selectedMonth)) return false;
    if (sourceFilter === "rwcoin" && !isRwcoinKasEntry(t)) return false;
    return true;
  });
  const monthPemasukan = filtered.filter(t => t.tipe === "pemasukan").reduce((s, t) => s + Number(t.jumlah), 0);
  const monthPengeluaran = filtered.filter(t => t.tipe === "pengeluaran").reduce((s, t) => s + Number(t.jumlah), 0);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const canPrev = selectedMonth > "2020-01";
  const canNext = selectedMonth < now;

  const resetForm = () => {
    setTipe("pemasukan"); setKategori(""); setJumlah(""); setKeterangan("");
    setTanggal(new Date().toISOString().split("T")[0]);
    setSelectedCampaignId(""); setEditId(null); setShowForm(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { tipe, kategori, jumlah: parseInt(jumlah), keterangan, tanggal, campaignId: selectedCampaignId ? parseInt(selectedCampaignId) : null };
      if (editId) await apiRequest("PUT", `/api/kas-rw/${editId}`, body);
      else await apiRequest("POST", "/api/kas-rw", body);
    },
    onSuccess: () => {
      toast({ title: editId ? "Transaksi diperbarui!" : "Transaksi ditambahkan!" });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/campaign-summary"] });
    },
    onError: (err: any) => toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/kas-rw/${id}`); },
    onSuccess: () => {
      toast({ title: "Transaksi dihapus!" });
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/campaign-summary"] });
    },
    onError: (err: any) => toast({ title: "Gagal menghapus", description: err.message, variant: "destructive" }),
  });

  const startEdit = (item: KasRw) => {
    setEditId(item.id); setTipe(item.tipe as "pemasukan" | "pengeluaran");
    setKategori(item.kategori); setJumlah(String(item.jumlah));
    setKeterangan(item.keterangan); setTanggal(item.tanggal);
    setSelectedCampaignId(item.campaignId ? String(item.campaignId) : "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-keuangan-title">Keuangan Kas RW</h2>
          <p className="text-sm text-muted-foreground">Kelola pemasukan dan pengeluaran kas RW</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)]" data-testid="button-tambah-transaksi">
          <Plus className="w-4 h-4 mr-1" />
          Tambah
        </Button>
      </div>

      {/* Form tambah/edit */}
      {showForm && (
        <Card data-testid="card-form-transaksi">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{editId ? "Edit Transaksi" : "Tambah Transaksi"}</CardTitle>
              <button onClick={resetForm} className="p-1 rounded hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setTipe("pemasukan"); setKategori(""); }}
                className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${tipe === "pemasukan" ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"}`}
                data-testid="button-tipe-pemasukan">
                Pemasukan
              </button>
              <button type="button" onClick={() => { setTipe("pengeluaran"); setKategori(""); }}
                className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${tipe === "pengeluaran" ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"}`}
                data-testid="button-tipe-pengeluaran">
                Pengeluaran
              </button>
            </div>
            <div>
              <Label className="text-xs">Kategori</Label>
              <select value={kategori} onChange={(e) => setKategori(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-kategori">
                <option value="">Pilih Kategori</option>
                {(tipe === "pemasukan" ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Jumlah (Rp)</Label>
                <Input type="number" value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="0" min="1" data-testid="input-jumlah" />
              </div>
              <div>
                <Label className="text-xs">Tanggal</Label>
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} data-testid="input-tanggal" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Keterangan</Label>
              <Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Deskripsi transaksi" data-testid="input-keterangan" />
            </div>
            {campaigns && campaigns.length > 0 && (
              <div>
                <Label className="text-xs">Campaign (opsional)</Label>
                <select value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid="select-campaign">
                  <option value="">Kas Umum RW</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.judul} (saldo: {formatRupiah(campaignKas?.[c.id]?.saldo || 0)})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={() => saveMutation.mutate()} disabled={!kategori || !jumlah || !keterangan || !tanggal || saveMutation.isPending}
                className="flex-1 bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)]" data-testid="button-simpan-transaksi">
                {saveMutation.isPending ? "Menyimpan..." : (editId ? "Perbarui" : "Simpan")}
              </Button>
              <Button variant="outline" onClick={resetForm} data-testid="button-batal">Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary keseluruhan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card data-testid="card-pemasukan">
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total Pemasukan</p>
                <p className="text-sm font-bold text-green-600" data-testid="text-total-pemasukan">
                  {summary ? formatRupiah(summary.totalPemasukan) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-pengeluaran">
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total Pengeluaran</p>
                <p className="text-sm font-bold text-red-600" data-testid="text-total-pengeluaran">
                  {summary ? formatRupiah(summary.totalPengeluaran) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-saldo">
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Saldo Kas</p>
                <p className="text-sm font-bold text-blue-600" data-testid="text-saldo">
                  {summary ? formatRupiah(summary.saldo) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart bulanan */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-[hsl(163,55%,22%)]" />
            6 Bulan Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyChart} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatChartValue} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="pemasukan" fill="hsl(142,71%,45%)" radius={[3, 3, 0, 0]} name="pemasukan" />
                <Bar dataKey="pengeluaran" fill="hsl(0,72%,51%)" radius={[3, 3, 0, 0]} name="pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-3 justify-center mt-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Pemasukan
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Pengeluaran
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Navigasi bulan */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))} disabled={!canPrev}
          className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition-colors" data-testid="button-prev-month">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold" data-testid="text-selected-month">{formatMonthLabel(selectedMonth)}</p>
          <p className="text-[10px] text-muted-foreground">{filtered.length} transaksi</p>
        </div>
        <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} disabled={!canNext}
          className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition-colors" data-testid="button-next-month">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSourceFilter("semua")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            sourceFilter === "semua"
              ? "bg-[hsl(163,55%,22%)] text-white"
              : "bg-white border border-gray-200 text-muted-foreground hover:text-foreground"
          }`}
        >
          Semua Kas
        </button>
        <button
          onClick={() => setSourceFilter("rwcoin")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            sourceFilter === "rwcoin"
              ? "bg-[hsl(40,45%,45%)] text-white"
              : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"
          }`}
        >
          RWcoin Saja
        </button>
        {sourceFilter === "rwcoin" && (
          <p className="text-[11px] text-muted-foreground">
            Menampilkan iuran RWcoin, admin fee topup, dan potongan withdraw yang masuk ke kas RW.
          </p>
        )}
      </div>

      {/* Summary bulan terpilih */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-green-50 border border-green-100 p-2.5 text-center">
            <p className="text-[10px] text-green-700 font-medium">Masuk</p>
            <p className="text-xs font-bold text-green-700 mt-0.5">{formatRupiah(monthPemasukan)}</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-center">
            <p className="text-[10px] text-red-700 font-medium">Keluar</p>
            <p className="text-xs font-bold text-red-700 mt-0.5">{formatRupiah(monthPengeluaran)}</p>
          </div>
          <div className={`rounded-lg p-2.5 text-center border ${monthPemasukan - monthPengeluaran >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}>
            <p className={`text-[10px] font-medium ${monthPemasukan - monthPengeluaran >= 0 ? "text-blue-700" : "text-red-700"}`}>Selisih</p>
            <p className={`text-xs font-bold mt-0.5 ${monthPemasukan - monthPengeluaran >= 0 ? "text-blue-700" : "text-red-700"}`}>
              {formatRupiah(Math.abs(monthPemasukan - monthPengeluaran))}
            </p>
          </div>
        </div>
      )}

      {/* Chart harian */}
      {dailyChart.length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[hsl(163,55%,22%)]" />
              Harian — {formatMonthLabel(selectedMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={dailyChart} barGap={1} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="hari" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatChartValue} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="pemasukan" fill="hsl(142,71%,45%)" radius={[3, 3, 0, 0]} name="pemasukan" />
                <Bar dataKey="pengeluaran" fill="hsl(0,72%,51%)" radius={[3, 3, 0, 0]} name="pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Daftar transaksi */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-base">Daftar Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : paginated.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-empty">
              Belum ada transaksi di bulan ini
            </p>
          ) : (
            <div className="space-y-2">
              {paginated.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card" data-testid={`row-transaksi-${t.id}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.tipe === "pemasukan" ? "bg-green-100" : "bg-red-100"}`}>
                      {t.tipe === "pemasukan"
                        ? <TrendingUp className="w-4 h-4 text-green-600" />
                        : <TrendingDown className="w-4 h-4 text-red-600" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.keterangan}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.tipe === "pemasukan" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {t.kategori}
                        </span>
                        {isRwcoinKasEntry(t) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
                            RWcoin
                          </span>
                        )}
                        {t.campaignId && campaigns && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-100 text-purple-700 flex items-center gap-0.5">
                            <Heart className="w-2.5 h-2.5" />
                            {campaigns.find(c => c.id === t.campaignId)?.judul || "Campaign"}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{formatTanggal(t.tanggal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${t.tipe === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                        {t.tipe === "pemasukan" ? "+" : "-"}{formatRupiah(t.jumlah)}
                      </p>
                      {t.createdBy === "sistem" && <p className="text-[9px] text-blue-600 font-medium">otomatis</p>}
                    </div>
                    {t.createdBy !== "sistem" && (
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(t)} className="p-1.5 rounded-md hover:bg-muted transition-colors" data-testid={`button-edit-${t.id}`}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {deleteConfirmId === t.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => deleteMutation.mutate(t.id)} className="p-1.5 rounded-md bg-red-100 hover:bg-red-200 transition-colors" data-testid={`button-confirm-delete-${t.id}`}>
                              <Check className="w-3.5 h-3.5 text-red-600" />
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors" data-testid={`button-cancel-delete-${t.id}`}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(t.id)} className="p-1.5 rounded-md hover:bg-red-50 transition-colors" data-testid={`button-delete-${t.id}`}>
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border hover:bg-muted/50 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-xs text-muted-foreground">Hal. {page} / {totalPages}</p>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border hover:bg-muted/50 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
