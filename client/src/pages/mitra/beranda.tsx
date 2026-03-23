import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Coins, ShoppingBag, ArrowDownCircle, TrendingUp, Tag, Store,
  ChevronRight, Copy,
} from "lucide-react";

function formatCoin(n: number) {
  return n.toLocaleString("id-ID") + " 🪙";
}
function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
function formatTgl(ts: string) {
  return new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function MitraBeranda() {
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);

  function handleCopyKode(kode: string) {
    copyToClipboard(kode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const { data: me } = useQuery<any>({ queryKey: ["/api/mitra/me"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: transaksiList = [] } = useQuery<any[]>({ queryKey: ["/api/mitra/transaksi"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: withdrawList = [] } = useQuery<any[]>({ queryKey: ["/api/mitra/withdraw"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: voucherList = [] } = useQuery<any[]>({ queryKey: ["/api/mitra/voucher"], queryFn: getQueryFn({ on401: "returnNull" }) });

  const todayTx = transaksiList.filter((t: any) => {
    const d = new Date(t.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const todayTotal = todayTx.reduce((sum: number, t: any) => sum + t.jumlahBayar, 0);
  const pendingWithdraw = withdrawList.filter((w: any) => w.status === "pending" || w.status === "disetujui").length;

  return (
    <div className="space-y-4">
      {/* Wallet Card */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(163,55%,22%), hsl(163,55%,35%))" }}>
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-4 bottom-0 w-20 h-20 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 opacity-80" />
            <p className="text-sm opacity-80">{me?.namaUsaha}</p>
          </div>
          <p className="text-xs opacity-60 mb-4">
            <Badge className="bg-white/20 text-white text-[10px]">{me?.kategori}</Badge>
            <span className="ml-2">RT {String(me?.rt ?? "-").padStart(2, "0")}</span>
          </p>
          <p className="text-sm opacity-70 mb-1">Saldo RWcoin</p>
          <p className="text-3xl font-bold">{formatCoin(me?.saldo ?? 0)}</p>
          <p className="text-xs opacity-60 mt-1">= {formatRp(me?.saldo ?? 0)}</p>
          <p className="text-xs opacity-60 mt-3">Kasir: {me?.namaKasir}</p>

          {/* Kode Mitra — dibagikan ke pembeli */}
          {me?.kodeWallet && (
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] opacity-60">Kode Mitra (bagikan ke pembeli)</p>
                <p className="font-mono font-bold text-lg tracking-widest">{me.kodeWallet}</p>
              </div>
              <button
                onClick={() => handleCopyKode(me.kodeWallet)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/40 bg-white/15 hover:bg-white/25 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Tersalin!" : "Salin"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/mitra/transaksi")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{formatCoin(todayTotal)}</p>
            <p className="text-xs text-muted-foreground">{todayTx.length} transaksi hari ini</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/mitra/withdraw")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ArrowDownCircle className="w-5 h-5 text-orange-500" />
              {pendingWithdraw > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">{pendingWithdraw}</span>}
            </div>
            <p className="text-xl font-bold">{formatCoin(me?.saldo ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Siap di-withdraw</p>
          </CardContent>
        </Card>
      </div>

      {/* Voucher aktif */}
      {voucherList.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm"><Tag className="w-4 h-4 text-[hsl(40,45%,55%)]" />Voucher Aktif</h3>
            </div>
            <div className="space-y-2">
              {voucherList.slice(0, 3).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between p-2.5 bg-[hsl(40,45%,95%)] rounded-lg">
                  <div>
                    <p className="text-sm font-bold text-[hsl(40,45%,35%)]">{v.kode}</p>
                    <p className="text-xs text-muted-foreground">{v.nama}</p>
                  </div>
                  <Badge className="bg-[hsl(40,45%,55%)] text-white text-xs">
                    {v.tipe === "persen" ? `${v.nilai}%` : formatCoin(v.nilai)} OFF
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaksi Terbaru */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm"><TrendingUp className="w-4 h-4 text-[hsl(163,55%,22%)]" />Transaksi Terbaru</h3>
            <button className="text-xs text-[hsl(163,55%,22%)] font-medium" onClick={() => setLocation("/mitra/transaksi")}>Lihat semua</button>
          </div>
          <div className="space-y-2">
            {transaksiList.slice(0, 5).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.namaWarga ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">{formatTgl(t.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">+{formatCoin(t.jumlahBayar)}</p>
                  {t.jumlahDiskon > 0 && <p className="text-[11px] text-emerald-600">hemat {formatCoin(t.jumlahDiskon)}</p>}
                </div>
              </div>
            ))}
            {transaksiList.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">Belum ada transaksi</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
