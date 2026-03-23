import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Pencil, Trash2, X, Percent, Coins } from "lucide-react";

function formatCoin(n: number) { return n.toLocaleString("id-ID") + " 🪙"; }

export default function MitraDiskon() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [form, setForm] = useState({ namaDiskon: "", tipe: "persen", nilai: 10, berlakuMulai: "", berlakuHingga: "", khususWargaRw3: true, isActive: true });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: diskonList = [] } = useQuery<any[]>({ queryKey: ["/api/mitra/diskon"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const { data: voucherList = [] } = useQuery<any[]>({ queryKey: ["/api/mitra/voucher"], queryFn: getQueryFn({ on401: "returnNull" }) });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editData
      ? apiRequest("PATCH", `/api/mitra/diskon/${editData.id}`, data)
      : apiRequest("POST", "/api/mitra/diskon", data),
    onSuccess: () => {
      toast({ title: editData ? "Diskon diperbarui" : "Diskon ditambahkan" });
      queryClient.invalidateQueries({ queryKey: ["/api/mitra/diskon"] });
      setShowForm(false); setEditData(null);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/mitra/diskon/${id}`),
    onSuccess: () => { toast({ title: "Diskon dihapus" }); queryClient.invalidateQueries({ queryKey: ["/api/mitra/diskon"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const openEdit = (d: any) => {
    setEditData(d);
    setForm({ namaDiskon: d.namaDiskon, tipe: d.tipe, nilai: d.nilai, berlakuMulai: d.berlakuMulai ?? "", berlakuHingga: d.berlakuHingga ?? "", khususWargaRw3: d.khususWargaRw3, isActive: d.isActive });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2"><Tag className="w-5 h-5" />Diskon & Promo</h2>
        <Button size="sm" className="bg-[hsl(163,55%,22%)]" onClick={() => { setEditData(null); setForm({ namaDiskon: "", tipe: "persen", nilai: 10, berlakuMulai: "", berlakuHingga: "", khususWargaRw3: true, isActive: true }); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Tambah
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-[hsl(163,55%,22%)]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editData ? "Edit Diskon" : "Tambah Diskon Baru"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div><Label>Nama Diskon</Label><Input value={form.namaDiskon} onChange={e => set("namaDiskon", e.target.value)} placeholder="Contoh: Diskon Akhir Pekan" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipe</Label>
                <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.tipe} onChange={e => set("tipe", e.target.value)}>
                  <option value="persen">Persen (%)</option>
                  <option value="rupiah">Rupiah (coin)</option>
                </select>
              </div>
              <div><Label>Nilai</Label><Input type="number" value={form.nilai} onChange={e => set("nilai", parseInt(e.target.value))} min={1} /></div>
              <div><Label>Berlaku Mulai</Label><Input type="date" value={form.berlakuMulai} onChange={e => set("berlakuMulai", e.target.value)} /></div>
              <div><Label>Berlaku Hingga</Label><Input type="date" value={form.berlakuHingga} onChange={e => set("berlakuHingga", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.khususWargaRw3} onChange={e => set("khususWargaRw3", e.target.checked)} />Khusus warga RW03</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />Aktif</label>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-[hsl(163,55%,22%)]" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Simpan</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Diskon Usaha Saya</h3>
        {diskonList.map((d: any) => (
          <Card key={d.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "hsl(163,55%,22%)" }}>
                    {d.tipe === "persen" ? <Percent className="w-6 h-6 text-white" /> : <Coins className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{d.namaDiskon}</p>
                      <Badge className={`text-xs ${d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{d.isActive ? "Aktif" : "Non-aktif"}</Badge>
                    </div>
                    <p className="text-base font-bold text-[hsl(163,55%,22%)]">
                      {d.tipe === "persen" ? `${d.nilai}% OFF` : `${formatCoin(d.nilai)} OFF`}
                    </p>
                    {(d.berlakuMulai || d.berlakuHingga) && (
                      <p className="text-xs text-muted-foreground">{d.berlakuMulai || "–"} s/d {d.berlakuHingga || "–"}</p>
                    )}
                    {d.khususWargaRw3 && <Badge variant="outline" className="text-[10px] mt-0.5">Khusus Warga RW03</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("Hapus diskon?")) deleteMutation.mutate(d.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {diskonList.length === 0 && <p className="text-center text-muted-foreground py-6">Belum ada diskon. Tambahkan promo untuk menarik pembeli!</p>}
      </div>

      {voucherList.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Voucher dari Admin RW</h3>
          {voucherList.map((v: any) => (
            <Card key={v.id} className="border-0 shadow-sm bg-[hsl(40,45%,97%)]">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-[hsl(40,45%,35%)]">{v.kode}</p>
                  <p className="text-xs text-muted-foreground">{v.nama} · {v.tipe === "persen" ? `${v.nilai}%` : formatCoin(v.nilai)} off</p>
                </div>
                <Badge className="bg-[hsl(40,45%,55%)] text-white text-xs">{v.tipe === "persen" ? `${v.nilai}%` : formatCoin(v.nilai)}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
