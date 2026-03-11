import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, Filter, Heart } from "lucide-react";
import type { KasRw, DonasiCampaign } from "@shared/schema";

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}

function formatTanggal(tanggal: string): string {
  const d = new Date(tanggal + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getBulanOptions(): { value: string; label: string }[] {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: val, label: `${months[d.getMonth()]} ${d.getFullYear()}` });
  }
  return options;
}

export default function WargaKeuangan() {
  const [filterBulan, setFilterBulan] = useState("");
  const [filterKategori, setFilterKategori] = useState("");

  const { data, isLoading } = useQuery<{ transaksi: KasRw[]; summary: { totalPemasukan: number; totalPengeluaran: number; saldo: number } }>({
    queryKey: ["/api/kas-rw/laporan"],
  });

  const { data: campaigns } = useQuery<DonasiCampaign[]>({
    queryKey: ["/api/donasi-campaign"],
  });

  const { data: campaignKas } = useQuery<Record<number, { pemasukan: number; pengeluaran: number; saldo: number }>>({
    queryKey: ["/api/kas-rw/campaign-summary"],
  });

  const transaksi = data?.transaksi || [];
  const summary = data?.summary;

  const filtered = transaksi.filter((t) => {
    if (filterBulan && !t.tanggal.startsWith(filterBulan)) return false;
    if (filterKategori && t.kategori !== filterKategori) return false;
    return true;
  });

  const allKategori = Array.from(new Set(transaksi.map((t) => t.kategori))).sort();

  const kategoriSummary: Record<string, { pemasukan: number; pengeluaran: number }> = {};
  for (const t of filtered) {
    if (!kategoriSummary[t.kategori]) {
      kategoriSummary[t.kategori] = { pemasukan: 0, pengeluaran: 0 };
    }
    if (t.tipe === "pemasukan") {
      kategoriSummary[t.kategori].pemasukan += Number(t.jumlah);
    } else {
      kategoriSummary[t.kategori].pengeluaran += Number(t.jumlah);
    }
  }

  const filteredPemasukan = filtered.filter(t => t.tipe === "pemasukan").reduce((s, t) => s + Number(t.jumlah), 0);
  const filteredPengeluaran = filtered.filter(t => t.tipe === "pengeluaran").reduce((s, t) => s + Number(t.jumlah), 0);

  const maxKategoriAmount = Math.max(
    ...Object.values(kategoriSummary).map(v => Math.max(v.pemasukan, v.pengeluaran)),
    1
  );

  const bulanOptions = getBulanOptions();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" data-testid="text-keuangan-warga-title">Laporan Keuangan Kas RW</h2>
        <p className="text-xs text-muted-foreground">Transparansi keuangan RW 03 Padasuka</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card data-testid="card-warga-pemasukan">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Pemasukan</p>
            <p className="text-xs font-bold text-green-600" data-testid="text-warga-pemasukan">
              {summary ? formatRupiah(summary.totalPemasukan) : "-"}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="card-warga-pengeluaran">
          <CardContent className="p-3 text-center">
            <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Pengeluaran</p>
            <p className="text-xs font-bold text-red-600" data-testid="text-warga-pengeluaran">
              {summary ? formatRupiah(summary.totalPengeluaran) : "-"}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="card-warga-saldo">
          <CardContent className="p-3 text-center">
            <Wallet className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Saldo</p>
            <p className="text-xs font-bold text-blue-600" data-testid="text-warga-saldo">
              {summary ? formatRupiah(summary.saldo) : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <select
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          data-testid="select-filter-bulan"
        >
          <option value="">Semua Bulan</option>
          {bulanOptions.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        {allKategori.length > 0 && (
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            data-testid="select-filter-kategori-warga"
          >
            <option value="">Semua Kategori</option>
            {allKategori.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        )}
      </div>

      {campaigns && campaigns.length > 0 && campaignKas && Object.keys(campaignKas).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[hsl(163,55%,22%)]" />
              Kas Campaign Donasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {campaigns.filter(c => campaignKas[c.id]).map((c) => {
              const kas = campaignKas[c.id];
              return (
                <div key={c.id} className="rounded-lg border p-2.5" data-testid={`card-warga-campaign-kas-${c.id}`}>
                  <p className="text-xs font-semibold mb-1.5">{c.judul}</p>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Masuk</p>
                      <p className="text-[11px] font-bold text-green-600">{formatRupiah(kas.pemasukan)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Keluar</p>
                      <p className="text-[11px] font-bold text-red-600">{formatRupiah(kas.pengeluaran)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Saldo</p>
                      <p className={`text-[11px] font-bold ${kas.saldo >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatRupiah(kas.saldo)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {Object.keys(kategoriSummary).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ringkasan per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {Object.entries(kategoriSummary).map(([kat, val]) => (
              <div key={kat} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{kat}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {val.pemasukan > 0 && <span className="text-green-600">+{formatRupiah(val.pemasukan)}</span>}
                    {val.pemasukan > 0 && val.pengeluaran > 0 && " / "}
                    {val.pengeluaran > 0 && <span className="text-red-600">-{formatRupiah(val.pengeluaran)}</span>}
                  </span>
                </div>
                {val.pemasukan > 0 && (
                  <div className="h-2 rounded-full bg-green-100 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(val.pemasukan / maxKategoriAmount) * 100}%` }}
                    />
                  </div>
                )}
                {val.pengeluaran > 0 && (
                  <div className="h-2 rounded-full bg-red-100 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${(val.pengeluaran / maxKategoriAmount) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}

            {(filterBulan || filterKategori) && (
              <div className="pt-2 border-t flex justify-between text-xs">
                <span className="text-muted-foreground">Total Filtered:</span>
                <span>
                  <span className="text-green-600 font-medium">+{formatRupiah(filteredPemasukan)}</span>
                  {" / "}
                  <span className="text-red-600 font-medium">-{formatRupiah(filteredPengeluaran)}</span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-warga-empty">
              Belum ada transaksi keuangan
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border"
                  data-testid={`row-warga-transaksi-${t.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      t.tipe === "pemasukan" ? "bg-green-100" : "bg-red-100"
                    }`}>
                      {t.tipe === "pemasukan" ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{t.keterangan}</p>
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground">
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium ${
                          t.tipe === "pemasukan"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {t.kategori}
                        </span>
                        {t.campaignId && campaigns && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-700">
                            <Heart className="w-2 h-2" />
                            {campaigns.find(c => c.id === t.campaignId)?.judul || "Campaign"}
                          </span>
                        )}
                        <span>{formatTanggal(t.tanggal)}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ${
                    t.tipe === "pemasukan" ? "text-green-600" : "text-red-600"
                  }`}>
                    {t.tipe === "pemasukan" ? "+" : "-"}{formatRupiah(t.jumlah)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
