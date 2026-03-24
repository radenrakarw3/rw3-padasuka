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
  const [ubahRekening, setUbahRekening] = useState(false);
  const [form, setForm] = useState({ jumlahCoin: "", nomorRekening: "", namaBank: "", atasNama: "", catatan: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: me } = useQuery<any>({ queryKey: ["/api/mitra/me"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: withdrawList = [] } = useQuery<any[]>({ queryKey: ["/api/mitra/withdraw"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: settingsList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/settings"], queryFn: getQueryFn({ on401: "returnNull" }) });

  const POTONGAN_ADMIN = parseInt(settingsList.find((s: any) => s.key === "withdraw_fee")?.value ?? "5000");
  const MIN_WITHDRAW = parseInt(settingsList.find((s: any) => s.key === "min_withdraw")?.value ?? "10000");

  // Cari data rekening dari riwayat withdraw sebelumnya
  const savedBank = withdrawList.find((w: any) => w.nomorRekening && w.namaBank && w.atasNama);
  const pakaiSavedBank = !!savedBank && !ubahRekening;

  const withdrawMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/mitra/withdraw", data),
    onSuccess: () => {
      toast({ title: "Permintaan withdraw dikirim!", description: "Admin akan memproses dalam 1x24 jam." });
      queryClient.invalidateQueries({ queryKey: ["/api/mitra/withdraw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mitra/me"] });
      setShowForm(false);
      setUbahRekening(false);
      setForm({ jumlahCoin: "", nomorRekening: "", namaBank: "", atasNama: "", catatan: "" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const jumlah = parseInt(form.jumlahCoin) || 0;
  const saldo = me?.saldo ?? 0;
  const saldoCukup = saldo >= jumlah && jumlah >= MIN_WITHDRAW;
  const jumlahDiterima = jumlah - POTONGAN_ADMIN;

  const nomorRekening = pakaiSavedBank ? savedBank.nomorRekening : form.nomorRekening;
  const namaBank = pakaiSavedBank ? savedBank.namaBank : form.namaBank;
  const atasNama = pakaiSavedBank ? savedBank.atasNama : form.atasNama;

  const handleSubmit = () => {
    withdrawMutation.mutate({ jumlahCoin: jumlah, nomorRekening, namaBank, atasNama, catatan: form.catatan });
  };

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
          <p className="text-3xl font-bold">{formatCoin(saldo)}</p>
          <p className="text-xs opacity-60">= {formatRp(saldo)}</p>
          <p className="text-xs opacity-60 mt-2">Hanya mitra yang dapat melakukan withdraw. Kas RW akan membayarkan ke rekening Anda.</p>
        </CardContent>
      </Card>

      {/* Form Withdraw */}
      {showForm && (
        <Card className="border-2 border-[hsl(163,55%,22%)]">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Form Withdraw</h3>
              <button onClick={() => { setShowForm(false); setUbahRekening(false); }}><X className="w-5 h-5" /></button>
            </div>

            <div>
              <Label>Jumlah Coin (max: {formatCoin(saldo)})</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" value={form.jumlahCoin} onChange={e => set("jumlahCoin", e.target.value)} min={1} max={saldo} />
                <Button type="button" variant="outline" size="sm" className="shrink-0 px-3 text-xs font-semibold border-[hsl(163,55%,22%)] text-[hsl(163,55%,22%)]"
                  onClick={() => set("jumlahCoin", String(saldo))}>
                  MAX
                </Button>
              </div>
              {jumlah > 0 && jumlah < MIN_WITHDRAW && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Minimal withdraw {formatCoin(MIN_WITHDRAW)}
                </p>
              )}
              {jumlah >= MIN_WITHDRAW && !saldoCukup && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Saldo tidak cukup
                </p>
              )}
              {jumlah >= MIN_WITHDRAW && saldoCukup && (
                <div className="mt-2 p-2 rounded bg-muted text-xs space-y-1">
                  <div className="flex justify-between"><span>Jumlah withdraw</span><span>{formatRp(jumlah)}</span></div>
                  <div className="flex justify-between text-red-500"><span>Potongan admin</span><span>- {formatRp(POTONGAN_ADMIN)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-1"><span>Anda akan menerima</span><span className="text-[hsl(163,55%,22%)]">{formatRp(jumlahDiterima)}</span></div>
                </div>
              )}
            </div>

            {/* Rekening */}
            {pakaiSavedBank ? (
              <div className="p-3 rounded-lg bg-muted space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rekening Tersimpan</p>
                  <button className="text-xs text-[hsl(163,55%,22%)] underline" onClick={() => setUbahRekening(true)}>Ubah</button>
                </div>
                <p className="text-sm font-semibold">{savedBank.namaBank} — {savedBank.nomorRekening}</p>
                <p className="text-xs text-muted-foreground">a/n {savedBank.atasNama}</p>
              </div>
            ) : (
              <>
                {savedBank && (
                  <button className="text-xs text-[hsl(163,55%,22%)] underline" onClick={() => setUbahRekening(false)}>
                    Gunakan rekening tersimpan
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nama Bank</Label><Input placeholder="BCA, BRI, Mandiri..." value={form.namaBank} onChange={e => set("namaBank", e.target.value)} /></div>
                  <div><Label>No. Rekening</Label><Input placeholder="08xx / 12345678" value={form.nomorRekening} onChange={e => set("nomorRekening", e.target.value)} /></div>
                </div>
                <div><Label>Atas Nama</Label><Input placeholder="Nama pemilik rekening" value={form.atasNama} onChange={e => set("atasNama", e.target.value)} /></div>
              </>
            )}

            <div><Label>Catatan (opsional)</Label><Input value={form.catatan} onChange={e => set("catatan", e.target.value)} /></div>

            <Button className="w-full bg-[hsl(163,55%,22%)]"
              onClick={handleSubmit}
              disabled={!saldoCukup || !nomorRekening || !namaBank || !atasNama || withdrawMutation.isPending}>
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
                    <p className="text-xs text-muted-foreground">Diterima: <span className="font-medium">{formatRp(w.jumlahCoin - POTONGAN_ADMIN)}</span> (potongan admin {formatRp(POTONGAN_ADMIN)})</p>
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
