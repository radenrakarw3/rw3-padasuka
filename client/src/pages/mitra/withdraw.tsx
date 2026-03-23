import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownCircle, CreditCard, Clock, CheckCircle2, X, Loader2, AlertCircle } from "lucide-react";

function formatCoin(n: number) { return n.toLocaleString("id-ID") + " 🪙"; }
function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
function formatTgl(ts: string) {
  return new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Menunggu", color: "bg-orange-100 text-orange-700" },
  disetujui: { label: "Disetujui", color: "bg-blue-100 text-blue-700" },
  dibayar: { label: "Dibayar", color: "bg-green-100 text-green-700" },
  ditolak: { label: "Ditolak", color: "bg-red-100 text-red-700" },
};

export default function MitraWithdraw() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ jumlahCoin: "", nomorRekening: "", namaBank: "", atasNama: "", catatan: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: me } = useQuery<any>({ queryKey: ["/api/mitra/me"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: withdrawList = [] } = useQuery<any[]>({ queryKey: ["/api/mitra/withdraw"], queryFn: getQueryFn({ on401: "returnNull" }) });

  const withdrawMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/mitra/withdraw", data),
    onSuccess: () => {
      toast({ title: "Permintaan withdraw dikirim!", description: "Admin akan memproses dalam 1x24 jam." });
      queryClient.invalidateQueries({ queryKey: ["/api/mitra/withdraw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mitra/me"] });
      setShowForm(false);
      setForm({ jumlahCoin: "", nomorRekening: "", namaBank: "", atasNama: "", catatan: "" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const jumlah = parseInt(form.jumlahCoin) || 0;
  const saldoCukup = (me?.saldo ?? 0) >= jumlah && jumlah > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2"><ArrowDownCircle className="w-5 h-5" />Withdraw RWcoin</h2>
        {!showForm && (
          <Button size="sm" className="bg-[hsl(163,55%,22%)]" onClick={() => setShowForm(true)}>
            + Request Withdraw
          </Button>
        )}
      </div>

      {/* Saldo Info */}
      <Card className="border-0 shadow-sm" style={{ background: "linear-gradient(135deg, hsl(163,55%,22%), hsl(163,55%,35%))" }}>
        <CardContent className="p-4 text-white">
          <p className="text-sm opacity-70 mb-1">Saldo Tersedia</p>
          <p className="text-3xl font-bold">{formatCoin(me?.saldo ?? 0)}</p>
          <p className="text-xs opacity-60">= {formatRp(me?.saldo ?? 0)}</p>
          <p className="text-xs opacity-60 mt-2">Hanya mitra yang dapat melakukan withdraw. Kas RW akan membayarkan ke rekening Anda.</p>
        </CardContent>
      </Card>

      {/* Form Withdraw */}
      {showForm && (
        <Card className="border-2 border-[hsl(163,55%,22%)]">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Form Withdraw</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>

            <div>
              <Label>Jumlah Coin (max: {formatCoin(me?.saldo ?? 0)})</Label>
              <Input type="number" value={form.jumlahCoin} onChange={e => set("jumlahCoin", e.target.value)} min={1} max={me?.saldo ?? 0} />
              {jumlah > 0 && <p className="text-xs text-muted-foreground mt-1">= {formatRp(jumlah)}</p>}
              {jumlah > 0 && !saldoCukup && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Saldo tidak cukup
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama Bank</Label><Input placeholder="BCA, BRI, Mandiri..." value={form.namaBank} onChange={e => set("namaBank", e.target.value)} /></div>
              <div><Label>No. Rekening</Label><Input placeholder="08xx / 12345678" value={form.nomorRekening} onChange={e => set("nomorRekening", e.target.value)} /></div>
            </div>
            <div><Label>Atas Nama</Label><Input placeholder="Nama pemilik rekening" value={form.atasNama} onChange={e => set("atasNama", e.target.value)} /></div>
            <div><Label>Catatan (opsional)</Label><Input value={form.catatan} onChange={e => set("catatan", e.target.value)} /></div>

            <Button className="w-full bg-[hsl(163,55%,22%)]"
              onClick={() => withdrawMutation.mutate({ jumlahCoin: jumlah, nomorRekening: form.nomorRekening, namaBank: form.namaBank, atasNama: form.atasNama, catatan: form.catatan })}
              disabled={!saldoCukup || !form.nomorRekening || !form.namaBank || !form.atasNama || withdrawMutation.isPending}>
              {withdrawMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Memproses...</> : <><CreditCard className="w-4 h-4 mr-2" />Kirim Permintaan Withdraw</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Riwayat Withdraw */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Riwayat Withdraw</h3>
        {withdrawList.map((w: any) => {
          const cfg = statusConfig[w.status] ?? { label: w.status, color: "bg-gray-100 text-gray-700" };
          return (
            <Card key={w.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xl font-bold">{formatCoin(w.jumlahCoin)}</p>
                      <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{w.namaBank} · {w.nomorRekening} · a/n {w.atasNama}</p>
                    <p className="text-xs text-muted-foreground">{formatTgl(w.createdAt)}</p>
                    {w.catatan && <p className="text-xs italic text-muted-foreground mt-1">{w.catatan}</p>}
                    {w.disetujuiOleh && <p className="text-xs text-blue-600 mt-1">Disetujui oleh {w.disetujuiOleh}</p>}
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${w.status === "dibayar" ? "bg-green-100 text-green-600" : w.status === "disetujui" ? "bg-blue-100 text-blue-600" : w.status === "pending" ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-600"}`}>
                    {w.status === "dibayar" ? <CheckCircle2 className="w-5 h-5" /> : w.status === "ditolak" ? <X className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {withdrawList.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada riwayat withdraw</p>}
      </div>
    </div>
  );
}
