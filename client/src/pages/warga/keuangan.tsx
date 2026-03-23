import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight, Shield, Heart, BarChart2, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { KasRw, DonasiCampaign } from "@shared/schema";

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

const ITEMS_PER_PAGE = 10;

export default function WargaKeuangan() {
  const now = getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(now);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ transaksi: KasRw[]; summary: { totalPemasukan: number; totalPengeluaran: number; saldo: number } }>({
    queryKey: ["/api/kas-rw/laporan"],
  });

  const { data: campaigns } = useQuery<DonasiCampaign[]>({
    queryKey: ["/api/donasi-campaign"],
  });

  useEffect(() => { setPage(1); }, [selectedMonth]);

  const transaksi = data?.transaksi || [];
  const summary = data?.summary;

  const monthlyChart = getMonthlyChartData(transaksi);
  const dailyChart = getDailyChartData(transaksi, selectedMonth);

  const filtered = transaksi.filter(t => t.tanggal.startsWith(selectedMonth));
  const monthPemasukan = filtered.filter(t => t.tipe === "pemasukan").reduce((s, t) => s + Number(t.jumlah), 0);
  const monthPengeluaran = filtered.filter(t => t.tipe === "pengeluaran").reduce((s, t) => s + Number(t.jumlah), 0);
  const monthSaldo = monthPemasukan - monthPengeluaran;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const canPrev = selectedMonth > "2020-01";
  const canNext = selectedMonth < now;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" data-testid="text-keuangan-warga-title">Laporan Keuangan</h2>
        <p className="text-xs text-muted-foreground">Transparansi keuangan RW 03 Padasuka</p>
      </div>

      {/* Summary keseluruhan */}
      <div className="grid grid-cols-3 gap-2">
        <Card data-testid="card-warga-pemasukan">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Total Masuk</p>
            <p className="text-[11px] font-bold text-green-600 leading-tight" data-testid="text-warga-pemasukan">
              {summary ? formatRupiah(summary.totalPemasukan) : "-"}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="card-warga-pengeluaran">
          <CardContent className="p-3 text-center">
            <TrendingDown className="w-4 h-4 text-red-600 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Total Keluar</p>
            <p className="text-[11px] font-bold text-red-600 leading-tight" data-testid="text-warga-pengeluaran">
              {summary ? formatRupiah(summary.totalPengeluaran) : "-"}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="card-warga-saldo">
          <CardContent className="p-3 text-center">
            <Wallet className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Saldo Kas</p>
            <p className="text-[11px] font-bold text-blue-600 leading-tight" data-testid="text-warga-saldo">
              {summary ? formatRupiah(summary.saldo) : "-"}
            </p>
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
            <Skeleton className="h-36 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthlyChart} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatChartValue} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
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
        <button
          onClick={() => { setSelectedMonth(addMonths(selectedMonth, -1)); }}
          disabled={!canPrev}
          className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition-colors"
          data-testid="button-prev-month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold" data-testid="text-selected-month">{formatMonthLabel(selectedMonth)}</p>
          <p className="text-[10px] text-muted-foreground">{filtered.length} transaksi</p>
        </div>
        <button
          onClick={() => { setSelectedMonth(addMonths(selectedMonth, 1)); }}
          disabled={!canNext}
          className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition-colors"
          data-testid="button-next-month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary bulan terpilih */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-green-50 border border-green-100 p-2.5 text-center">
            <p className="text-[10px] text-green-700 font-medium">Masuk Bulan Ini</p>
            <p className="text-xs font-bold text-green-700 mt-0.5">{formatRupiah(monthPemasukan)}</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-center">
            <p className="text-[10px] text-red-700 font-medium">Keluar Bulan Ini</p>
            <p className="text-xs font-bold text-red-700 mt-0.5">{formatRupiah(monthPengeluaran)}</p>
          </div>
          <div className={`rounded-lg p-2.5 text-center border ${monthSaldo >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}>
            <p className={`text-[10px] font-medium ${monthSaldo >= 0 ? "text-blue-700" : "text-red-700"}`}>Selisih</p>
            <p className={`text-xs font-bold mt-0.5 ${monthSaldo >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatRupiah(Math.abs(monthSaldo))}</p>
          </div>
        </div>
      )}

      {/* Chart harian (jika ada data di bulan terpilih) */}
      {dailyChart.length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[hsl(163,55%,22%)]" />
              Harian — {formatMonthLabel(selectedMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={dailyChart} barGap={1} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="hari" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatChartValue} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="pemasukan" fill="hsl(142,71%,45%)" radius={[3, 3, 0, 0]} name="pemasukan" />
                <Bar dataKey="pengeluaran" fill="hsl(0,72%,51%)" radius={[3, 3, 0, 0]} name="pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Riwayat transaksi bulan terpilih */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : paginated.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-warga-empty">
              Belum ada transaksi di bulan ini
            </p>
          ) : (
            <div className="space-y-2">
              {paginated.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border" data-testid={`row-warga-transaksi-${t.id}`}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${t.tipe === "pemasukan" ? "bg-green-100" : "bg-red-100"}`}>
                      {t.tipe === "pemasukan"
                        ? <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                        : <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                      }
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
                            {campaigns.find(c => c.id === t.campaignId)?.judul || "Campaign"}
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground">{formatTanggal(t.tanggal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-semibold ${t.tipe === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                      {t.tipe === "pemasukan" ? "+" : "-"}{formatRupiah(t.jumlah)}
                    </p>
                    {t.createdBy === "sistem" && (
                      <p className="text-[8px] text-blue-500">otomatis</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border hover:bg-muted/50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-xs text-muted-foreground">Hal. {page} / {totalPages}</p>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border hover:bg-muted/50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transparansi keuangan */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(163,55%,22%)]/5 border border-[hsl(163,55%,22%)]/20">
        <Shield className="w-4 h-4 text-[hsl(163,55%,22%)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-semibold text-[hsl(163,55%,22%)]">Transparansi Keuangan</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
            Seluruh pemasukan dari donasi tercatat otomatis oleh sistem saat dikonfirmasi admin. Data ini tidak bisa diedit atau dihapus demi menjaga akuntabilitas.
          </p>
        </div>
      </div>
    </div>
  );
}
