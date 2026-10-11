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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Minus, TrendingUp, TrendingDown, Wallet, Pencil, Trash2, X, Check,
  ChevronLeft, ChevronRight, BarChart2, Calendar, RotateCcw,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { KasRw } from "@shared/schema";

const KATEGORI_CADANGAN = {
  pemasukan: ["Kontribusi RW3BIZ", "Iuran Warga", "Donasi", "Sumbangan", "Lainnya"],
  pengeluaran: ["Lainnya"],
};

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
    <div className="bg-white border rounded-lg p-2.5 shadow-md text-sm space-y-1 sm:text-xs">
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

function isOtomatis(item: KasRw): boolean {
  return ["sistem", "iuran-sistem", "rw3biz-sistem"].includes(item.createdBy);
}

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
  const [tipe, setTipe] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [kategori, setKategori] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");

  const { data: transaksiAll, isLoading } = useQuery<KasRw[]>({ queryKey: ["/api/kas-rw"] });
  const { data: summary } = useQuery<{ totalPemasukan: number; totalPengeluaran: number; saldo: number }>({ queryKey: ["/api/kas-rw/summary"] });
  const { data: kategoriKas } = useQuery<{ pemasukan: string[]; pengeluaran: string[] }>({ queryKey: ["/api/kas-rw/kategori"] });
  const daftarKategori = kategoriKas ?? KATEGORI_CADANGAN;

  useEffect(() => { setPage(1); }, [selectedMonth]);

  const transaksi = transaksiAll || [];
  const monthlyChart = getMonthlyChartData(transaksi);
  const dailyChart = getDailyChartData(transaksi, selectedMonth);

  const filtered = transaksi.filter(t => t.tanggal.startsWith(selectedMonth));
  const monthPemasukan = filtered.filter(t => t.tipe === "pemasukan").reduce((s, t) => s + Number(t.jumlah), 0);
  const monthPengeluaran = filtered.filter(t => t.tipe === "pengeluaran").reduce((s, t) => s + Number(t.jumlah), 0);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const canPrev = selectedMonth > "2020-01";
  const canNext = selectedMonth < now;

  const resetForm = () => {
    setTipe("pemasukan"); setKategori(""); setJumlah(""); setKeterangan("");
    setTanggal(new Date().toISOString().split("T")[0]);
    setEditId(null); setShowForm(false);
  };

  const invalidateKas = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/kas-rw"] });
    queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/laporan"] });
    queryClient.invalidateQueries({ queryKey: ["/api/public/kas-rw"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/rab"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { tipe, kategori, jumlah: parseInt(jumlah), keterangan, tanggal };
      if (editId) await apiRequest("PUT", `/api/kas-rw/${editId}`, body);
      else await apiRequest("POST", "/api/kas-rw", body);
    },
    onSuccess: () => {
      toast({ title: editId ? "Transaksi diperbarui!" : "Transaksi ditambahkan!" });
      resetForm();
      invalidateKas();
    },
    onError: (err: any) => toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/kas-rw/${id}`); },
    onSuccess: () => {
      toast({ title: "Transaksi dihapus!" });
      setDeleteConfirmId(null);
      invalidateKas();
    },
    onError: (err: any) => toast({ title: "Gagal menghapus", description: err.message, variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/kas-rw/reset", { confirm: "RESET" });
    },
    onSuccess: () => {
      toast({ title: "Kas RW direset", description: "Semua transaksi dihapus — saldo kembali Rp 0" });
      setShowResetDialog(false);
      setResetConfirm("");
      invalidateKas();
    },
    onError: (err: any) =>
      toast({ title: "Gagal reset", description: err.message, variant: "destructive" }),
  });

  const startEdit = (item: KasRw) => {
    setEditId(item.id); setTipe(item.tipe as "pemasukan" | "pengeluaran");
    setKategori(item.kategori); setJumlah(String(item.jumlah));
    setKeterangan(item.keterangan); setTanggal(item.tanggal);
    setShowForm(true);
  };

  const bukaFormBaru = (t: "pemasukan" | "pengeluaran") => {
    resetForm();
    setTipe(t);
    setShowForm(true);
  };

  const selisihBulan = monthPemasukan - monthPengeluaran;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="space-y-3 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:space-y-0">
        <div className="min-w-0">
          <h2 className="text-xl font-bold sm:text-2xl" data-testid="text-keuangan-title">Keuangan Kas RW</h2>
          <p className="text-sm text-muted-foreground">
            Kelola pemasukan dan pengeluaran kas RW ·{" "}
            <a href="/kas-rw" target="_blank" rel="noopener noreferrer" className="text-[hsl(163,55%,22%)] underline underline-offset-2" data-testid="link-kas-publik">
              Lihat halaman publik
            </a>
          </p>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Button
            onClick={() => bukaFormBaru("pemasukan")}
            className="flex-1 bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)] sm:flex-none"
            data-testid="button-tambah-transaksi"
          >
            <Plus className="w-4 h-4" />
            Pemasukan
          </Button>
          <Button
            variant="outline"
            onClick={() => bukaFormBaru("pengeluaran")}
            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 sm:flex-none"
            data-testid="button-tambah-pengeluaran"
          >
            <Minus className="w-4 h-4" />
            Pengeluaran
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowResetDialog(true)}
            className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5 sm:w-auto sm:px-3"
            aria-label="Reset Kas RW ke 0"
            data-testid="button-reset-kas-rw"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset ke 0</span>
          </Button>
        </div>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Kas RW ke nol?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Semua transaksi Kas RW akan dihapus permanen. Saldo kembali Rp 0. Status iuran KK
                yang sudah lunas juga dikembalikan ke belum.
              </p>
              <p>Ketik <strong>RESET</strong> untuk melanjutkan.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
            placeholder="RESET"
            className="font-mono"
            autoCapitalize="characters"
            autoComplete="off"
            data-testid="input-reset-kas-confirm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirm("")}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={resetConfirm !== "RESET" || resetMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                resetMutation.mutate();
              }}
            >
              {resetMutation.isPending ? "Mereset..." : "Reset Kas RW"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form tambah/edit — lembar bawah di HP, modal di laptop */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent data-testid="card-form-transaksi">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{editId ? "Edit Transaksi" : "Catat Transaksi"}</DialogTitle>
            <DialogDescription>Isi jumlah, kategori, dan keterangan lalu simpan.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!kategori || !jumlah || !keterangan || !tanggal || saveMutation.isPending) return;
              saveMutation.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setTipe("pemasukan"); setKategori(""); }}
                className={`min-h-12 rounded-lg px-3 text-sm font-semibold transition-colors sm:min-h-10 ${tipe === "pemasukan" ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"}`}
                aria-pressed={tipe === "pemasukan"}
                data-testid="button-tipe-pemasukan">
                Pemasukan
              </button>
              <button type="button" onClick={() => { setTipe("pengeluaran"); setKategori(""); }}
                className={`min-h-12 rounded-lg px-3 text-sm font-semibold transition-colors sm:min-h-10 ${tipe === "pengeluaran" ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"}`}
                aria-pressed={tipe === "pengeluaran"}
                data-testid="button-tipe-pengeluaran">
                Pengeluaran
              </button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kas-jumlah">Jumlah (Rp)</Label>
              <Input
                id="kas-jumlah"
                type="number"
                inputMode="numeric"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="0"
                min="1"
                className="text-lg font-semibold sm:text-base"
                data-testid="input-jumlah"
              />
              {jumlah && Number(jumlah) > 0 && (
                <p className="text-xs text-muted-foreground">{formatRupiah(Number(jumlah))}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kas-kategori">Kategori</Label>
              <select id="kas-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)}
                className="w-full min-h-12 rounded-md border border-input bg-background px-3 text-base sm:min-h-10 sm:text-sm"
                data-testid="select-kategori">
                <option value="">Pilih Kategori</option>
                {(tipe === "pemasukan" ? daftarKategori.pemasukan : daftarKategori.pengeluaran).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kas-tanggal">Tanggal</Label>
              <Input id="kas-tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} data-testid="input-tanggal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kas-keterangan">Keterangan</Label>
              <Input id="kas-keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Deskripsi transaksi" data-testid="input-keterangan" />
              <p className="text-xs text-muted-foreground">
                Keterangan tampil di halaman publik /kas-rw — jangan tulis NIK, No. KK, atau data pribadi warga.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm} data-testid="button-batal">Batal</Button>
              <Button type="submit" disabled={!kategori || !jumlah || !keterangan || !tanggal || saveMutation.isPending}
                className="bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)]" data-testid="button-simpan-transaksi">
                {saveMutation.isPending ? "Menyimpan..." : (editId ? "Perbarui" : "Simpan")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary keseluruhan */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <Card className="col-span-2 sm:col-span-1 sm:order-3" data-testid="card-saldo">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Saldo Kas</p>
                <p className="text-lg font-bold text-blue-600 break-words sm:text-sm" data-testid="text-saldo">
                  {summary ? formatRupiah(summary.saldo) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:order-1" data-testid="card-pemasukan">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="hidden w-9 h-9 rounded-lg bg-green-100 items-center justify-center flex-shrink-0 sm:flex">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600 sm:hidden" />
                  Total Pemasukan
                </p>
                <p className="text-sm font-bold text-green-600 break-words" data-testid="text-total-pemasukan">
                  {summary ? formatRupiah(summary.totalPemasukan) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:order-2" data-testid="card-pengeluaran">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="hidden w-9 h-9 rounded-lg bg-red-100 items-center justify-center flex-shrink-0 sm:flex">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingDown className="w-3.5 h-3.5 text-red-600 sm:hidden" />
                  Total Pengeluaran
                </p>
                <p className="text-sm font-bold text-red-600 break-words" data-testid="text-total-pengeluaran">
                  {summary ? formatRupiah(summary.totalPengeluaran) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigasi bulan */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))} disabled={!canPrev}
          aria-label="Bulan sebelumnya" data-testid="button-prev-month">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-base font-semibold sm:text-sm" data-testid="text-selected-month">{formatMonthLabel(selectedMonth)}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} transaksi</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} disabled={!canNext}
          aria-label="Bulan berikutnya" data-testid="button-next-month">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary bulan terpilih */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-lg bg-green-50 border border-green-100 p-2 text-center sm:p-2.5">
            <p className="text-xs text-green-700 font-medium">Masuk</p>
            <p className="text-xs font-bold text-green-700 mt-0.5 break-words sm:text-sm">{formatRupiah(monthPemasukan)}</p>
          </div>
          <div className="min-w-0 rounded-lg bg-red-50 border border-red-100 p-2 text-center sm:p-2.5">
            <p className="text-xs text-red-700 font-medium">Keluar</p>
            <p className="text-xs font-bold text-red-700 mt-0.5 break-words sm:text-sm">{formatRupiah(monthPengeluaran)}</p>
          </div>
          <div className={`min-w-0 rounded-lg p-2 text-center border sm:p-2.5 ${selisihBulan >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}>
            <p className={`text-xs font-medium ${selisihBulan >= 0 ? "text-blue-700" : "text-red-700"}`}>Selisih</p>
            <p className={`text-xs font-bold mt-0.5 break-words sm:text-sm ${selisihBulan >= 0 ? "text-blue-700" : "text-red-700"}`}>
              {formatRupiah(Math.abs(selisihBulan))}
            </p>
          </div>
        </div>
      )}

      {/* Daftar transaksi */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-3 sm:px-4">
          <CardTitle className="text-base">Daftar Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : paginated.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-empty">
              Belum ada transaksi di bulan ini
            </p>
          ) : (
            <div className="space-y-2">
              {paginated.map((t) => (
                <div key={t.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 rounded-lg border bg-card sm:flex-nowrap sm:items-center" data-testid={`row-transaksi-${t.id}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${t.tipe === "pemasukan" ? "bg-green-100" : "bg-red-100"}`}>
                    {t.tipe === "pemasukan"
                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                      : <TrendingDown className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-medium break-words sm:truncate">{t.keterangan}</p>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-semibold ${t.tipe === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                          {t.tipe === "pemasukan" ? "+" : "-"}{formatRupiah(t.jumlah)}
                        </p>
                        {isOtomatis(t) && <p className="text-[11px] text-blue-600 font-medium">otomatis</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${t.tipe === "pemasukan" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {t.kategori}
                      </span>
                      {isRwcoinKasEntry(t) && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
                          RWcoin
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatTanggal(t.tanggal)}</span>
                    </div>
                  </div>
                  {!isOtomatis(t) && (
                    <div className="flex w-full items-center justify-end gap-2 border-t pt-2 sm:w-auto sm:shrink-0 sm:gap-1 sm:border-0 sm:pt-0">
                      {deleteConfirmId === t.id ? (
                        <>
                          <span className="mr-auto text-sm font-medium text-red-600 sm:hidden">Hapus transaksi ini?</span>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(t.id)} disabled={deleteMutation.isPending}
                            className="bg-red-100 hover:bg-red-200" aria-label="Ya, hapus" data-testid={`button-confirm-delete-${t.id}`}>
                            <Check className="w-4 h-4 text-red-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirmId(null)} aria-label="Batal hapus" data-testid={`button-cancel-delete-${t.id}`}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(t)} aria-label="Edit transaksi" data-testid={`button-edit-${t.id}`}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirmId(t.id)} className="hover:bg-red-50" aria-label="Hapus transaksi" data-testid={`button-delete-${t.id}`}>
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Halaman sebelumnya">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <p className="text-sm text-muted-foreground sm:text-xs">Hal. {page} / {totalPages}</p>
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Halaman berikutnya">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart bulanan */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-3 sm:px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-[hsl(163,55%,22%)]" />
            6 Bulan Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyChart} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatChartValue} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="pemasukan" fill="hsl(142,71%,45%)" radius={[3, 3, 0, 0]} name="pemasukan" />
                <Bar dataKey="pengeluaran" fill="hsl(0,72%,51%)" radius={[3, 3, 0, 0]} name="pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-3 justify-center mt-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Pemasukan
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Pengeluaran
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Chart harian */}
      {dailyChart.length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-3 sm:px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[hsl(163,55%,22%)]" />
              Harian — {formatMonthLabel(selectedMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dailyChart} barGap={1} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="hari" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatChartValue} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="pemasukan" fill="hsl(142,71%,45%)" radius={[3, 3, 0, 0]} name="pemasukan" />
                <Bar dataKey="pengeluaran" fill="hsl(0,72%,51%)" radius={[3, 3, 0, 0]} name="pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
