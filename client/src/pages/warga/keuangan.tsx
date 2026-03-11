import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Filter, Heart, ArrowUpRight, ArrowDownRight, BarChart3, Shield } from "lucide-react";
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

      {campaigns && campaigns.length > 0 && campaignKas && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[hsl(163,55%,22%)]" />
              Kas per Campaign Donasi
            </CardTitle>
            <p className="text-[10px] text-muted-foreground mt-0.5">Transparansi penggunaan dana setiap kegiatan</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.map((c) => {
              const kas = campaignKas[c.id] || { pemasukan: 0, pengeluaran: 0, saldo: 0 };
              const target = Number(c.targetDana || 0);
              const persenTerkumpul = target > 0 ? Math.min(100, Math.round((kas.pemasukan / target) * 100)) : 0;
              const persenTerpakai = kas.pemasukan > 0 ? Math.round((kas.pengeluaran / kas.pemasukan) * 100) : 0;
              const transaksiCampaign = transaksi.filter(t => t.campaignId === c.id);
              const jumlahMasuk = transaksiCampaign.filter(t => t.tipe === "pemasukan").length;
              const jumlahKeluar = transaksiCampaign.filter(t => t.tipe === "pengeluaran").length;

              return (
                <div key={c.id} className="rounded-xl border-2 p-3 space-y-2.5" data-testid={`card-warga-campaign-kas-${c.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(163,55%,22%)]/10 flex items-center justify-center flex-shrink-0">
                        <Heart className="w-4 h-4 text-[hsl(163,55%,22%)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{c.judul}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.deskripsi}</p>
                      </div>
                    </div>
                    <Badge className={`text-[9px] flex-shrink-0 ${c.status === "aktif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.status === "aktif" ? "Aktif" : "Selesai"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-green-50 p-2 text-center">
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        <ArrowUpRight className="w-3 h-3 text-green-600" />
                        <p className="text-[9px] text-green-700 font-medium">Masuk</p>
                      </div>
                      <p className="text-[11px] font-bold text-green-600">{formatRupiah(kas.pemasukan)}</p>
                      <p className="text-[8px] text-green-600/70">{jumlahMasuk} transaksi</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-center">
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        <ArrowDownRight className="w-3 h-3 text-red-600" />
                        <p className="text-[9px] text-red-700 font-medium">Keluar</p>
                      </div>
                      <p className="text-[11px] font-bold text-red-600">{formatRupiah(kas.pengeluaran)}</p>
                      <p className="text-[8px] text-red-600/70">{jumlahKeluar} transaksi</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${kas.saldo >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        <Wallet className="w-3 h-3 text-blue-600" />
                        <p className={`text-[9px] font-medium ${kas.saldo >= 0 ? "text-blue-700" : "text-red-700"}`}>Saldo</p>
                      </div>
                      <p className={`text-[11px] font-bold ${kas.saldo >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatRupiah(kas.saldo)}</p>
                      <p className="text-[8px] text-muted-foreground">{jumlahMasuk + jumlahKeluar} total</p>
                    </div>
                  </div>

                  {target > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Target: {formatRupiah(target)}</span>
                        <span className="font-semibold text-[hsl(163,55%,22%)]">{persenTerkumpul}% terkumpul</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[hsl(163,55%,22%)] rounded-full transition-all"
                          style={{ width: `${persenTerkumpul}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {kas.pemasukan > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Penggunaan dana</span>
                        <span className={`font-semibold ${persenTerpakai > 80 ? "text-red-600" : persenTerpakai > 50 ? "text-yellow-600" : "text-green-600"}`}>
                          {persenTerpakai}% terpakai
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${persenTerpakai > 80 ? "bg-red-500" : persenTerpakai > 50 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${Math.min(100, persenTerpakai)}%` }}
                        />
                      </div>
                    </div>
                  )}
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

      <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(163,55%,22%)]/5 border border-[hsl(163,55%,22%)]/20">
        <Shield className="w-4 h-4 text-[hsl(163,55%,22%)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-semibold text-[hsl(163,55%,22%)]">Transparansi Keuangan</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
            Seluruh pemasukan dari donasi tercatat otomatis oleh sistem saat dikonfirmasi admin. Data ini tidak bisa diedit atau dihapus secara manual demi menjaga akuntabilitas.
          </p>
        </div>
      </div>

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
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-semibold ${
                      t.tipe === "pemasukan" ? "text-green-600" : "text-red-600"
                    }`}>
                      {t.tipe === "pemasukan" ? "+" : "-"}{formatRupiah(t.jumlah)}
                    </span>
                    {t.createdBy === "sistem" && (
                      <p className="text-[8px] text-blue-500 font-medium">otomatis</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
