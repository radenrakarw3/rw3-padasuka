import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Tag, TrendingUp, Coins } from "lucide-react";

function formatCoin(n: number) { return n.toLocaleString("id-ID") + " 🪙"; }
function formatTgl(ts: string) {
  return new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MitraTransaksi() {
  const { data: transaksiList = [] } = useQuery<any[]>({
    queryKey: ["/api/mitra/transaksi"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const today = transaksiList.filter((t: any) => new Date(t.createdAt).toDateString() === new Date().toDateString());
  const totalHariIni = today.reduce((s: number, t: any) => s + t.jumlahBayar, 0);
  const totalDiskonHariIni = today.reduce((s: number, t: any) => s + (t.jumlahDiskon ?? 0), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <ShoppingBag className="w-5 h-5" /> Riwayat Transaksi
      </h2>

      {/* Info cara transaksi */}
      <Card className="border-0 shadow-sm" style={{ background: "hsl(163,55%,96%)" }}>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-[hsl(163,55%,22%)] mb-1">Cara Menerima Pembayaran RWcoin</p>
          <ol className="space-y-1 mt-2">
            {[
              "Warga tap \"Bayar di Mitra\" di app mereka dan pilih toko kamu",
              "Kamu akan terima WA berisi kode OTP + nominal",
              "Sebutkan kode OTP itu ke warga",
              "Warga masukkan kode → transaksi otomatis terkonfirmasi",
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-4 h-4 rounded-full bg-[hsl(163,55%,22%)] text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                {s}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Statistik hari ini */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Transaksi Hari Ini", value: today.length + " tx", icon: ShoppingBag, color: "text-blue-600" },
          { label: "Pemasukan Hari Ini", value: formatCoin(totalHariIni), icon: TrendingUp, color: "text-green-600" },
          { label: "Total Diskon", value: formatCoin(totalDiskonHariIni), icon: Tag, color: "text-amber-600" },
        ].map((item, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <item.icon className={`w-4 h-4 ${item.color} mx-auto mb-1`} />
              <p className="text-xs font-bold leading-tight">{item.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List transaksi */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Semua Transaksi</h3>
          <div className="space-y-2">
            {transaksiList.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    {t.namaWarga?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.namaWarga ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">{formatTgl(t.createdAt)}</p>
                    {t.voucherKode && (
                      <Badge variant="outline" className="text-[10px] mt-0.5">{t.voucherKode}</Badge>
                    )}
                    <p className="text-[10px] text-muted-foreground font-mono">{t.kodeTransaksi}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">+{formatCoin(t.jumlahBayar)}</p>
                  {t.jumlahDiskon > 0 && (
                    <p className="text-[11px] text-muted-foreground">diskon {formatCoin(t.jumlahDiskon)}</p>
                  )}
                </div>
              </div>
            ))}
            {transaksiList.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <Coins className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                <p className="text-xs text-muted-foreground">Transaksi masuk otomatis saat warga bayar via app</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
