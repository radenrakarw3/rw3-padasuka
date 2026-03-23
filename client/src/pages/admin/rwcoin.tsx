import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Coins, Store, Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle,
  Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp,
  ShoppingBag, Tag, Percent, AlertCircle, Clock, CheckCircle2,
  Search, Users, CreditCard, RefreshCw, Landmark,
} from "lucide-react";

function formatCoin(n: number) {
  return n.toLocaleString("id-ID") + " 🪙";
}
function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
function formatTgl(ts: string) {
  return new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const KATEGORI_MITRA = ["Makanan & Minuman", "Warung", "Toko Kelontong", "Jasa", "Bengkel", "Fashion", "Pendidikan", "Kesehatan", "Lainnya"];

// ============ TOPUP DIALOG ============
function TopupDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedWarga, setSelectedWarga] = useState<any>(null);
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const { data: wargaList } = useQuery<any[]>({ queryKey: ["/api/warga"], queryFn: getQueryFn({ on401: "throw" }) });

  const filteredWarga = (wargaList || []).filter(w =>
    w.namaLengkap?.toLowerCase().includes(search.toLowerCase()) ||
    w.nik?.includes(search)
  ).slice(0, 8);

  const topupMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/rwcoin/topup", data); return await res.json(); },
    onSuccess: (data: any) => {
      toast({ title: "Topup berhasil!", description: `Saldo baru: ${formatCoin(data.saldoBaru ?? 0)}` });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/transaksi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/stats"] });
      onClose();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal topup", description: e.message }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg flex items-center gap-2"><ArrowUpCircle className="w-5 h-5 text-green-600" />Topup RWcoin Warga</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {!selectedWarga ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari nama atau NIK warga..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {filteredWarga.map((w: any) => (
                  <button key={w.id} onClick={() => setSelectedWarga(w)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-left">
                    <div className="w-9 h-9 rounded-full bg-[hsl(163,55%,22%)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {w.namaLengkap?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{w.namaLengkap}</p>
                      <p className="text-xs text-muted-foreground">NIK: {w.nik}</p>
                    </div>
                  </button>
                ))}
                {search && filteredWarga.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Warga tidak ditemukan</p>}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-[hsl(163,55%,22%)] text-white flex items-center justify-center font-bold">
                  {selectedWarga.namaLengkap?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{selectedWarga.namaLengkap}</p>
                  <p className="text-xs text-muted-foreground">NIK: {selectedWarga.nik}</p>
                </div>
                <button onClick={() => setSelectedWarga(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <Label>Jumlah Coin</Label>
                <Input type="number" placeholder="Contoh: 50000" value={jumlah} onChange={e => setJumlah(e.target.value)} min={1} />
                {jumlah && <p className="text-xs text-muted-foreground mt-1">= {formatRp(parseInt(jumlah) || 0)}</p>}
              </div>
              <div>
                <Label>Keterangan (opsional)</Label>
                <Input placeholder="Contoh: Iuran bulan Maret" value={keterangan} onChange={e => setKeterangan(e.target.value)} />
              </div>
              <Button className="w-full bg-[hsl(163,55%,22%)]"
                onClick={() => topupMutation.mutate({ wargaId: selectedWarga.id, jumlah: parseInt(jumlah), keterangan })}
                disabled={!jumlah || parseInt(jumlah) <= 0 || topupMutation.isPending}>
                {topupMutation.isPending ? "Memproses..." : `Topup ${formatCoin(parseInt(jumlah) || 0)}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ MITRA FORM ============
function MitraForm({ initial, onSave, onCancel, isPending, error }: {
  initial?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending?: boolean;
  error?: string;
}) {
  const [form, setForm] = useState({
    namaUsaha: initial?.namaUsaha ?? "",
    kategori: initial?.kategori ?? "Umum",
    rt: initial?.rt ?? 1,
    alamat: initial?.alamat ?? "",
    nomorWaKasir: initial?.nomorWaKasir ?? "",
    namaKasir: initial?.namaKasir ?? "",
    pin: "",
    deskripsi: initial?.deskripsi ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [validasi, setValidasi] = useState("");
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSimpan = () => {
    if (!form.namaUsaha.trim()) return setValidasi("Nama usaha wajib diisi");
    if (!form.alamat.trim()) return setValidasi("Alamat wajib diisi");
    if (!form.namaKasir.trim()) return setValidasi("Nama kasir wajib diisi");
    if (!form.nomorWaKasir.trim()) return setValidasi("Nomor WA kasir wajib diisi");
    if (!initial && form.pin.length !== 6) return setValidasi("PIN harus tepat 6 digit angka");
    if (form.pin && form.pin.length !== 6) return setValidasi("PIN harus tepat 6 digit angka");
    if (form.pin && !/^\d+$/.test(form.pin)) return setValidasi("PIN hanya boleh angka");
    setValidasi("");
    onSave(form);
  };

  return (
    <div className="space-y-3">
      {(validasi || error) && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{validasi || error}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nama Usaha <span className="text-red-500">*</span></Label>
          <Input value={form.namaUsaha} onChange={e => set("namaUsaha", e.target.value)} />
        </div>
        <div><Label>Kategori</Label>
          <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.kategori} onChange={e => set("kategori", e.target.value)}>
            {KATEGORI_MITRA.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div><Label>RT</Label>
          <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.rt} onChange={e => set("rt", parseInt(e.target.value))}>
            {[1,2,3,4,5,6,7].map(r => <option key={r} value={r}>RT {String(r).padStart(2,"0")}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <Label>Alamat <span className="text-red-500">*</span></Label>
          <Input value={form.alamat} onChange={e => set("alamat", e.target.value)} />
        </div>
        <div>
          <Label>Nama Kasir <span className="text-red-500">*</span></Label>
          <Input value={form.namaKasir} onChange={e => set("namaKasir", e.target.value)} />
        </div>
        <div>
          <Label>No WA Kasir <span className="text-red-500">*</span></Label>
          <Input value={form.nomorWaKasir} onChange={e => set("nomorWaKasir", e.target.value)} placeholder="08xx" />
        </div>
        <div>
          <Label>PIN Kasir (6 digit angka) {!initial && <span className="text-red-500">*</span>}</Label>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={form.pin}
            onChange={e => set("pin", e.target.value.replace(/\D/g, ""))}
            placeholder={initial ? "Kosongkan = tidak ubah PIN" : "6 digit angka"}
          />
          {!initial && <p className="text-xs text-muted-foreground mt-0.5">Digunakan kasir untuk login portal mitra</p>}
        </div>
        <div>
          <Label>Deskripsi</Label>
          <Input value={form.deskripsi} onChange={e => set("deskripsi", e.target.value)} placeholder="Opsional" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="activeChk" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
        <label htmlFor="activeChk" className="text-sm">Aktif sebagai mitra RWcoin</label>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 bg-[hsl(163,55%,22%)]" onClick={handleSimpan} disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan Mitra"}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>Batal</Button>
      </div>
    </div>
  );
}

// ============ VOUCHER FORM ============
function VoucherForm({ initial, onSave, onCancel, mitraList }: { initial?: any; onSave: (data: any) => void; onCancel: () => void; mitraList: any[] }) {
  const [form, setForm] = useState({
    kode: initial?.kode ?? "",
    nama: initial?.nama ?? "",
    tipe: initial?.tipe ?? "persen",
    nilai: initial?.nilai ?? 10,
    mitraId: initial?.mitraId ?? null,
    minTransaksi: initial?.minTransaksi ?? 0,
    kuota: initial?.kuota ?? null,
    berlakuHingga: initial?.berlakuHingga ?? "",
    khususWargaRw3: initial?.khususWargaRw3 ?? true,
    subsidiAdmin: initial?.subsidiAdmin ?? false,
    isActive: initial?.isActive ?? true,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Kode Voucher</Label><Input value={form.kode} onChange={e => set("kode", e.target.value.toUpperCase())} placeholder="HEMAT20" /></div>
        <div><Label>Nama Voucher</Label><Input value={form.nama} onChange={e => set("nama", e.target.value)} /></div>
        <div><Label>Tipe Diskon</Label>
          <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.tipe} onChange={e => set("tipe", e.target.value)}>
            <option value="persen">Persen (%)</option>
            <option value="rupiah">Rupiah (Rp)</option>
          </select>
        </div>
        <div><Label>Nilai {form.tipe === "persen" ? "(%)" : "(Coin)"}</Label>
          <Input type="number" value={form.nilai} onChange={e => set("nilai", parseInt(e.target.value))} min={1} />
        </div>
        <div><Label>Berlaku untuk</Label>
          <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.mitraId ?? ""} onChange={e => set("mitraId", e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">Semua Mitra</option>
            {mitraList.map(m => <option key={m.id} value={m.id}>{m.namaUsaha}</option>)}
          </select>
        </div>
        <div><Label>Min Transaksi (coin)</Label><Input type="number" value={form.minTransaksi} onChange={e => set("minTransaksi", parseInt(e.target.value))} min={0} /></div>
        <div><Label>Kuota (kosong = ∞)</Label><Input type="number" value={form.kuota ?? ""} onChange={e => set("kuota", e.target.value ? parseInt(e.target.value) : null)} min={1} /></div>
        <div><Label>Berlaku Hingga</Label><Input type="date" value={form.berlakuHingga} onChange={e => set("berlakuHingga", e.target.value)} /></div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.khususWargaRw3} onChange={e => set("khususWargaRw3", e.target.checked)} />Khusus warga RW03</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />Aktif</label>
        </div>
        {/* Toggle Subsidi Admin */}
        <div className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${form.subsidiAdmin ? "border-orange-400 bg-orange-50" : "border-gray-200"}`}
          onClick={() => set("subsidiAdmin", !form.subsidiAdmin)}>
          <input type="checkbox" checked={form.subsidiAdmin} onChange={e => set("subsidiAdmin", e.target.checked)} onClick={e => e.stopPropagation()} className="mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Admin Subsidi Diskon</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {form.subsidiAdmin
                ? "Mitra tetap dapat coin penuh — selisih diskon diambil dari kas admin. Pastikan saldo kas cukup."
                : "Mitra menanggung sendiri — mitra hanya dapat coin setelah dipotong diskon."}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 bg-[hsl(163,55%,22%)]" onClick={() => onSave(form)}>Simpan</Button>
        <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============
export default function AdminRwcoin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"dashboard" | "mitra" | "topup" | "withdraw" | "transaksi" | "voucher" | "kas">("dashboard");
  const [showTopup, setShowTopup] = useState(false);
  const [editMitra, setEditMitra] = useState<any>(null);
  const [showMitraForm, setShowMitraForm] = useState(false);
  const [editVoucher, setEditVoucher] = useState<any>(null);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [showInjectKas, setShowInjectKas] = useState(false);
  const [injectTipe, setInjectTipe] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [injectJumlah, setInjectJumlah] = useState("");
  const [injectKet, setInjectKet] = useState("");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/rwcoin/stats"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: mitraList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/mitra"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: withdrawList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/withdraw"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: transaksiList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/transaksi"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: voucherList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/voucher"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: kasData } = useQuery<{ saldo: number; list: any[] }>({ queryKey: ["/api/rwcoin/kas"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: topupRequestList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/topup-request"], queryFn: getQueryFn({ on401: "throw" }) });

  const saveMitraMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await (editMitra
        ? apiRequest("PATCH", `/api/rwcoin/mitra/${editMitra.id}`, data)
        : apiRequest("POST", "/api/rwcoin/mitra", data));
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: editMitra ? "Mitra diperbarui!" : "Mitra berhasil ditambahkan!" });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/mitra"] });
      setShowMitraForm(false); setEditMitra(null);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal menyimpan mitra", description: e.message }),
  });

  const deleteMitraMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("DELETE", `/api/rwcoin/mitra/${id}`); return await res.json(); },
    onSuccess: () => { toast({ title: "Mitra dihapus" }); queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/mitra"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ id, action, catatan }: { id: number; action: string; catatan?: string }) => {
      const res = await apiRequest("PATCH", `/api/rwcoin/withdraw/${id}/${action}`, { catatan });
      return await res.json();
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.action === "setujui" ? "Withdraw disetujui" : vars.action === "bayar" ? "Marked dibayar" : "Withdraw ditolak" });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/withdraw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/mitra"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/stats"] });
      // kas hanya berubah saat "bayar" (pengeluaran withdraw_mitra dicatat saat dibayar)
      if (vars.action === "bayar") {
        queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/kas"] });
      }
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const saveVoucherMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await (editVoucher
        ? apiRequest("PATCH", `/api/rwcoin/voucher/${editVoucher.id}`, data)
        : apiRequest("POST", "/api/rwcoin/voucher", data));
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: editVoucher ? "Voucher diperbarui" : "Voucher dibuat" });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/voucher"] });
      setShowVoucherForm(false); setEditVoucher(null);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const deleteVoucherMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("DELETE", `/api/rwcoin/voucher/${id}`); return await res.json(); },
    onSuccess: () => { toast({ title: "Voucher dihapus" }); queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/voucher"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const accTopupMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("POST", `/api/rwcoin/topup-request/${id}/acc`); return await res.json(); },
    onSuccess: () => {
      toast({ title: "Topup disetujui!", description: "Saldo warga sudah diaktifkan & WA konfirmasi terkirim." });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/topup-request"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/transaksi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/kas"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal ACC", description: e.message }),
  });

  const tolakTopupMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("POST", `/api/rwcoin/topup-request/${id}/tolak`); return await res.json(); },
    onSuccess: () => {
      toast({ title: "Permintaan ditolak" });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/topup-request"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal tolak", description: e.message }),
  });

  const injectKasMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/rwcoin/kas/inject", data); return await res.json(); },
    onSuccess: () => {
      toast({ title: "Kas berhasil diupdate!" });
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/kas"] });
      setShowInjectKas(false);
      setInjectJumlah("");
      setInjectKet("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Coins },
    { id: "mitra", label: "Mitra", icon: Store },
    { id: "topup", label: "Topup", icon: ArrowUpCircle },
    { id: "withdraw", label: "Withdraw", icon: ArrowDownCircle },
    { id: "transaksi", label: "Transaksi", icon: ShoppingBag },
    { id: "voucher", label: "Voucher", icon: Tag },
    { id: "kas", label: "Kas", icon: Landmark },
  ] as const;

  const pendingWithdraws = withdrawList.filter((w: any) => w.status === "pending").length;
  const pendingTopups = topupRequestList.filter((r: any) => r.status === "pending").length;

  return (
    <div className="space-y-4 max-w-5xl">
      {showTopup && <TopupDialog onClose={() => setShowTopup(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="w-7 h-7" style={{ color: "hsl(40,45%,55%)" }} />
            Ekosistem RWcoin
          </h1>
          <p className="text-sm text-muted-foreground">1 RWcoin = Rp 1 — Mata uang lokal RW 03 Padasuka</p>
        </div>
        <Button className="bg-[hsl(163,55%,22%)]" onClick={() => setShowTopup(true)}>
          <ArrowUpCircle className="w-4 h-4 mr-2" /> Topup Warga
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors relative ${
              activeTab === t.id ? "bg-white shadow text-[hsl(163,55%,22%)]" : "text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.id === "withdraw" && pendingWithdraws > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingWithdraws}</span>
            )}
            {t.id === "topup" && pendingTopups > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingTopups}</span>
            )}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Total Wallet Warga", value: formatCoin(stats?.totalSaldo ?? 0), icon: Wallet, color: "text-green-600" },
              { label: "Total Transaksi", value: (stats?.totalTransaksi ?? 0) + " tx", icon: ShoppingBag, color: "text-blue-600" },
              { label: "Total Topup", value: formatCoin(stats?.totalTopup ?? 0), icon: ArrowUpCircle, color: "text-emerald-600" },
              { label: "Total Belanja", value: formatCoin(stats?.totalBelanja ?? 0), icon: TrendingUp, color: "text-purple-600" },
              { label: "Mitra Aktif", value: mitraList.filter((m: any) => m.isActive).length + " mitra", icon: Store, color: "text-orange-600" },
              { label: "Withdraw Pending", value: (stats?.totalWithdrawPending ?? 0) + " req", icon: Clock, color: "text-red-600" },
            ].map((item, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <item.icon className={`w-8 h-8 ${item.color} opacity-80`} />
                  </div>
                  <p className="text-xl font-bold mt-2">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent transactions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Transaksi Terbaru</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transaksiList.slice(0, 8).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.tipe === "topup" ? "bg-green-100 text-green-600" : t.tipe === "belanja" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
                        {t.tipe === "topup" ? <ArrowUpCircle className="w-4 h-4" /> : t.tipe === "belanja" ? <ShoppingBag className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.namaWarga ?? "-"} {t.namaUsaha ? `→ ${t.namaUsaha}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{formatTgl(t.createdAt)} · {t.kodeTransaksi}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${t.tipe === "topup" ? "text-green-600" : "text-blue-600"}`}>
                        {t.tipe === "topup" ? "+" : "-"}{formatCoin(t.jumlahBayar)}
                      </p>
                      {t.jumlahDiskon > 0 && <p className="text-xs text-emerald-600">hemat {formatCoin(t.jumlahDiskon)}</p>}
                    </div>
                  </div>
                ))}
                {transaksiList.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Belum ada transaksi</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MITRA TAB */}
      {activeTab === "mitra" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-[hsl(163,55%,22%)]" onClick={() => { setEditMitra(null); setShowMitraForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Mitra
            </Button>
          </div>
          {showMitraForm && (
            <Card className="border-[hsl(163,55%,22%)] border-2">
              <CardHeader><CardTitle className="text-base">{editMitra ? "Edit Mitra" : "Tambah Mitra Baru"}</CardTitle></CardHeader>
              <CardContent>
                <MitraForm initial={editMitra}
                  onSave={data => saveMitraMutation.mutate(data)}
                  onCancel={() => { setShowMitraForm(false); setEditMitra(null); }}
                  isPending={saveMitraMutation.isPending}
                  error={saveMitraMutation.error ? (saveMitraMutation.error as any).message : undefined} />
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3">
            {mitraList.map((m: any) => (
              <Card key={m.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0" style={{ backgroundColor: "hsl(163,55%,22%)" }}>
                        {m.namaUsaha?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{m.namaUsaha}</p>
                          <Badge variant={m.isActive ? "default" : "secondary"} className={m.isActive ? "bg-green-100 text-green-700 text-xs" : "text-xs"}>
                            {m.isActive ? "Aktif" : "Non-aktif"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{m.kategori}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">RT {String(m.rt).padStart(2,"0")} · {m.alamat}</p>
                        <p className="text-xs text-muted-foreground">Kasir: {m.namaKasir} · {m.nomorWaKasir}</p>
                        <p className="text-sm font-semibold text-[hsl(163,55%,22%)] mt-1">Saldo: {formatCoin(m.saldo ?? 0)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditMitra(m); setShowMitraForm(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("Hapus mitra ini?")) deleteMitraMutation.mutate(m.id); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {mitraList.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada mitra terdaftar</p>}
          </div>
        </div>
      )}

      {/* TOPUP TAB */}
      {activeTab === "topup" && (
        <div className="space-y-4">
          {/* Antrian permintaan topup */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Permintaan Topup Masuk
                  {pendingTopups > 0 && (
                    <Badge className="bg-orange-100 text-orange-700 text-xs">{pendingTopups} menunggu</Badge>
                  )}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowTopup(true)} className="text-xs h-8">
                  <ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Topup Manual
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {topupRequestList.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">Belum ada permintaan topup dari warga</p>
              )}
              <div className="space-y-3">
                {topupRequestList.map((r: any) => (
                  <div key={r.id} className={`rounded-xl border-2 p-4 ${r.status === "pending" ? "border-orange-300 bg-orange-50" : r.status === "approved" ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{r.namaWarga}</p>
                          <Badge className={`text-[11px] px-2 py-0 h-5 ${r.status === "pending" ? "bg-orange-100 text-orange-700" : r.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {r.status === "pending" ? "Menunggu" : r.status === "approved" ? "Disetujui" : "Ditolak"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTgl(r.createdAt)}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span><span className="text-muted-foreground">Topup:</span> <span className="font-semibold text-green-700">+{formatCoin(r.jumlah)}</span></span>
                          <span><span className="text-muted-foreground">Transfer:</span> <span className="font-medium">Rp {r.totalTransfer.toLocaleString("id-ID")}</span></span>
                          <span><span className="text-muted-foreground">Via:</span> {r.metode} {r.rekening} a.n {r.atasnama}</span>
                          {r.noWa && <span><span className="text-muted-foreground">WA:</span> {r.noWa}</span>}
                        </div>
                      </div>
                      {r.status === "pending" && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            className="h-8 px-4 bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)] text-white text-xs font-bold"
                            onClick={() => accTopupMutation.mutate(r.id)}
                            disabled={accTopupMutation.isPending}
                          >
                            {accTopupMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />ACC</>}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-4 text-xs border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => tolakTopupMutation.mutate(r.id)}
                            disabled={tolakTopupMutation.isPending}
                          >
                            <X className="w-3.5 h-3.5 mr-1" />Tolak
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Riwayat topup yang sudah diproses */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Riwayat Topup Berhasil</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transaksiList.filter((t: any) => t.tipe === "topup").slice(0, 20).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.namaWarga ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">{formatTgl(t.createdAt)} · {t.keterangan ?? "-"}</p>
                    </div>
                    <p className="text-sm font-bold text-green-600">+{formatCoin(t.jumlahBayar)}</p>
                  </div>
                ))}
                {transaksiList.filter((t: any) => t.tipe === "topup").length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Belum ada topup</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WITHDRAW TAB */}
      {activeTab === "withdraw" && (
        <div className="space-y-3">
          {withdrawList.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada permintaan withdraw</p>}
          {withdrawList.map((w: any) => (
            <Card key={w.id} className={`border-0 shadow-sm ${w.status === "pending" ? "border-l-4 border-l-orange-400" : w.status === "disetujui" ? "border-l-4 border-l-blue-400" : w.status === "dibayar" ? "border-l-4 border-l-green-400" : "border-l-4 border-l-red-400"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold">{w.namaUsaha}</p>
                      <Badge className={`text-xs ${w.status === "pending" ? "bg-orange-100 text-orange-700" : w.status === "disetujui" ? "bg-blue-100 text-blue-700" : w.status === "dibayar" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {w.status === "pending" ? "Menunggu" : w.status === "disetujui" ? "Disetujui" : w.status === "dibayar" ? "Dibayar" : "Ditolak"}
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-[hsl(163,55%,22%)]">{formatCoin(w.jumlahCoin)}</p>
                    <p className="text-xs text-muted-foreground">{w.namaBank} · {w.nomorRekening} · a/n {w.atasNama}</p>
                    <p className="text-xs text-muted-foreground">{formatTgl(w.createdAt)}</p>
                    {w.catatan && <p className="text-xs mt-1 italic text-muted-foreground">Catatan: {w.catatan}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {w.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => withdrawMutation.mutate({ id: w.id, action: "setujui" })}>
                          <Check className="w-3 h-3 mr-1" />Setujui
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 text-xs" onClick={() => { const c = prompt("Alasan penolakan:"); if (c !== null) withdrawMutation.mutate({ id: w.id, action: "tolak", catatan: c }); }}>
                          <X className="w-3 h-3 mr-1" />Tolak
                        </Button>
                      </>
                    )}
                    {w.status === "disetujui" && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => withdrawMutation.mutate({ id: w.id, action: "bayar" })}>
                        <CreditCard className="w-3 h-3 mr-1" />Tandai Dibayar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TRANSAKSI TAB */}
      {activeTab === "transaksi" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Semua Transaksi ({transaksiList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transaksiList.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${t.tipe === "topup" ? "bg-green-100 text-green-600" : t.tipe === "belanja" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
                      {t.tipe === "topup" ? <ArrowUpCircle className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t.tipe === "topup" ? `Topup → ${t.namaWarga}` : t.tipe === "belanja" ? `${t.namaWarga} → ${t.namaUsaha}` : t.namaUsaha}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatTgl(t.createdAt)} · #{t.kodeTransaksi}</p>
                      {t.voucherKode && <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5"><Tag className="w-2.5 h-2.5 mr-0.5" />{t.voucherKode}</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.tipe === "topup" ? "text-green-600" : "text-blue-600"}`}>
                      {t.tipe === "topup" ? "+" : "-"}{formatCoin(t.jumlahBayar)}
                    </p>
                    {t.jumlahDiskon > 0 && <p className="text-[11px] text-emerald-600">hemat {formatCoin(t.jumlahDiskon)}</p>}
                  </div>
                </div>
              ))}
              {transaksiList.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Belum ada transaksi</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KAS TAB */}
      {activeTab === "kas" && (
        <div className="space-y-4">
          {/* Tombol Inject */}
          <div className="flex gap-2">
            <Button size="sm" className="bg-[hsl(163,55%,22%)]" onClick={() => { setInjectTipe("pemasukan"); setShowInjectKas(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Topup Kas
            </Button>
            <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => { setInjectTipe("pengeluaran"); setShowInjectKas(true); }}>
              <ArrowDownCircle className="w-4 h-4 mr-1" /> Tarik Kas
            </Button>
          </div>

          {/* Modal Inject */}
          {showInjectKas && (
            <Card className="border-2 border-dashed border-[hsl(163,55%,22%)] bg-green-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Mutasi Kas Manual</p>
                  <button onClick={() => setShowInjectKas(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={injectTipe === "pemasukan" ? "default" : "outline"} className="flex-1 text-xs bg-[hsl(163,55%,22%)]" onClick={() => setInjectTipe("pemasukan")}>+ Topup Kas</Button>
                  <Button size="sm" variant={injectTipe === "pengeluaran" ? "default" : "outline"} className="flex-1 text-xs" onClick={() => setInjectTipe("pengeluaran")}>- Tarik Kas</Button>
                </div>
                <div>
                  <Label className="text-xs">Jumlah (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="Contoh: 50000"
                    value={injectJumlah}
                    onChange={e => setInjectJumlah(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Keterangan (opsional)</Label>
                  <Input
                    placeholder={injectTipe === "pemasukan" ? "Topup subsidi voucher Ramadan" : "Penarikan kas operasional"}
                    value={injectKet}
                    onChange={e => setInjectKet(e.target.value)}
                  />
                </div>
                <Button
                  className={injectTipe === "pemasukan" ? "w-full bg-[hsl(163,55%,22%)]" : "w-full bg-red-600 hover:bg-red-700"}
                  onClick={() => injectKasMutation.mutate({ tipe: injectTipe, jumlah: parseInt(injectJumlah), keterangan: injectKet })}
                  disabled={injectKasMutation.isPending || !injectJumlah}
                >
                  {injectKasMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : (injectTipe === "pemasukan" ? "Tambah ke Kas" : "Tarik dari Kas")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Saldo card */}
          {(() => {
            const list = kasData?.list ?? [];
            const adminFee = list.filter(r => r.tipeDetail === "admin_fee").reduce((a: number, r: any) => a + r.jumlah, 0);
            const topupCoin = list.filter(r => r.tipeDetail === "topup_coin").reduce((a: number, r: any) => a + r.jumlah, 0);
            const subsidiVoucher = list.filter(r => r.tipeDetail === "subsidi_voucher").reduce((a: number, r: any) => a + r.jumlah, 0);
            const withdrawMitra = list.filter(r => r.tipeDetail === "withdraw_mitra").reduce((a: number, r: any) => a + r.jumlah, 0);
            const injectMasuk = list.filter(r => r.tipeDetail === "inject_admin" && r.tipe === "pemasukan").reduce((a: number, r: any) => a + r.jumlah, 0);
            const injectKeluar = list.filter(r => r.tipeDetail === "inject_admin" && r.tipe === "pengeluaran").reduce((a: number, r: any) => a + r.jumlah, 0);
            const margin = adminFee + injectMasuk - subsidiVoucher - injectKeluar;
            const marginPct = adminFee > 0 ? Math.round(margin / adminFee * 100) : 0;
            return (
              <>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="p-5 text-white" style={{ background: "linear-gradient(135deg, hsl(163,55%,18%), hsl(163,55%,30%))" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Landmark className="w-5 h-5 opacity-80" />
                      <p className="text-sm opacity-80">Saldo Kas RWcoin</p>
                    </div>
                    <p className="text-3xl font-bold">{formatRp(kasData?.saldo ?? 0)}</p>
                    <p className="text-xs opacity-60 mt-1">Total uang masuk dikurangi semua pengeluaran</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 pt-3 border-t border-white/20 text-xs">
                      <div><p className="opacity-60">Modal Topup (coin)</p><p className="font-bold">+{formatRp(topupCoin)}</p></div>
                      <div><p className="opacity-60">Admin Fee Topup</p><p className="font-bold text-yellow-300">+{formatRp(adminFee)}</p></div>
                      {injectMasuk > 0 && <div><p className="opacity-60">Topup Kas Manual</p><p className="font-bold text-blue-300">+{formatRp(injectMasuk)}</p></div>}
                      <div><p className="opacity-60">Withdraw Mitra</p><p className="font-bold text-red-300">-{formatRp(withdrawMitra)}</p></div>
                      <div><p className="opacity-60">Subsidi Voucher</p><p className="font-bold text-orange-300">-{formatRp(subsidiVoucher)}</p></div>
                      {injectKeluar > 0 && <div><p className="opacity-60">Tarik Kas Manual</p><p className="font-bold text-red-300">-{formatRp(injectKeluar)}</p></div>}
                    </div>
                  </div>
                </Card>

                {/* Margin analysis */}
                <Card className={`border-0 shadow-sm border-l-4 ${margin >= 0 ? "border-l-green-400" : "border-l-red-500"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Margin Admin Fee</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Fee masuk {formatRp(adminFee)} — Subsidi voucher {formatRp(subsidiVoucher)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>{formatRp(margin)}</p>
                        <p className={`text-xs font-medium ${margin >= 0 ? "text-green-500" : "text-red-500"}`}>{margin >= 0 ? `Aman ${marginPct}%` : "BONCOS!"}</p>
                      </div>
                    </div>
                    {subsidiVoucher > 0 && (
                      <div className="mt-3 p-2.5 rounded-lg bg-orange-50 border border-orange-200">
                        <p className="text-xs text-orange-700">
                          Subsidi voucher sudah pakai {formatRp(subsidiVoucher)} dari kas.
                          {margin < 0 ? " Fee topup tidak cukup menutup subsidi — kurangi voucher atau naikkan admin fee!" : ` Masih aman, sisa margin ${formatRp(margin)}.`}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}

          {/* Riwayat */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Riwayat Kas RWcoin
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {(kasData?.list ?? []).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${r.tipe === "pemasukan" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                        {r.tipe === "pemasukan" ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {r.tipeDetail === "inject_admin" ? (r.tipe === "pemasukan" ? "Topup Kas Manual" : "Tarik Kas Manual")
                            : r.tipeDetail === "admin_fee" ? "Admin Fee Topup"
                            : r.tipeDetail === "topup_coin" ? "Modal Coin Warga"
                            : r.tipeDetail === "subsidi_voucher" ? "Subsidi Voucher"
                            : r.tipeDetail === "withdraw_mitra" ? "Withdraw Mitra"
                            : r.tipe}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.keterangan}</p>
                        <p className="text-[11px] text-muted-foreground">{formatTgl(r.createdAt)}</p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm ${r.tipe === "pemasukan" ? "text-green-600" : "text-red-500"}`}>
                      {r.tipe === "pemasukan" ? "+" : "-"}{formatRp(r.jumlah)}
                    </p>
                  </div>
                ))}
                {(kasData?.list ?? []).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Belum ada mutasi kas</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VOUCHER TAB */}
      {activeTab === "voucher" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-[hsl(163,55%,22%)]" onClick={() => { setEditVoucher(null); setShowVoucherForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Buat Voucher
            </Button>
          </div>
          {showVoucherForm && (
            <Card className="border-[hsl(163,55%,22%)] border-2">
              <CardHeader><CardTitle className="text-base">{editVoucher ? "Edit Voucher" : "Buat Voucher Baru"}</CardTitle></CardHeader>
              <CardContent>
                <VoucherForm initial={editVoucher} mitraList={mitraList}
                  onSave={data => saveVoucherMutation.mutate(data)}
                  onCancel={() => { setShowVoucherForm(false); setEditVoucher(null); }} />
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3">
            {voucherList.map((v: any) => (
              <Card key={v.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[hsl(40,45%,55%)] text-white flex flex-col items-center justify-center flex-shrink-0">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm">{v.kode}</p>
                          <Badge className={`text-xs ${v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{v.isActive ? "Aktif" : "Non-aktif"}</Badge>
                        </div>
                        <p className="text-sm">{v.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          Diskon {v.tipe === "persen" ? `${v.nilai}%` : formatCoin(v.nilai)} ·
                          Min {formatCoin(v.minTransaksi)} ·
                          {v.kuota ? ` ${v.terpakai}/${v.kuota}` : " ∞"} pakai ·
                          {v.berlakuHingga ? ` s/d ${v.berlakuHingga}` : " tanpa batas"}
                        </p>
                        {v.mitraId && <p className="text-xs text-blue-600">Khusus: {mitraList.find((m: any) => m.id === v.mitraId)?.namaUsaha}</p>}
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {v.khususWargaRw3 && <Badge variant="outline" className="text-[10px]">Khusus Warga RW03</Badge>}
                          {v.subsidiAdmin && <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-300">Admin Subsidi</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditVoucher(v); setShowVoucherForm(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("Hapus voucher?")) deleteVoucherMutation.mutate(v.id); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {voucherList.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada voucher</p>}
          </div>
        </div>
      )}
    </div>
  );
}
