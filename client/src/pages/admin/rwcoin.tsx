import { useState, useEffect } from "react";
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
  Search, Users, CreditCard, RefreshCw, Landmark, Phone, User,
  AlertTriangle, Shield, BarChart3, Activity, PiggyBank,
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
function parseWaList(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return val ? [val] : []; }
}

function WaListInput({ label, list, onChange }: { label: string; list: string[]; onChange: (v: string[]) => void }) {
  const add = () => onChange([...list, ""]);
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const edit = (i: number, v: string) => onChange(list.map((x, idx) => idx === i ? v : x));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <button type="button" onClick={add} className="flex items-center gap-1 text-[11px] text-[hsl(163,55%,22%)] hover:underline">
          <Plus className="w-3 h-3" /> Tambah nomor
        </button>
      </div>
      {list.map((n, i) => (
        <div key={i} className="flex gap-1.5">
          <div className="relative flex-1">
            <Phone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={n}
              onChange={e => edit(i, e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="08xx"
              inputMode="numeric"
              className="pl-8 h-9 text-sm"
            />
          </div>
          <button type="button" onClick={() => remove(i)} className="w-9 h-9 flex items-center justify-center rounded-md border text-muted-foreground hover:text-red-500 hover:border-red-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {list.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">Belum ada nomor tambahan</p>
      )}
    </div>
  );
}

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
    namaKasir: initial?.namaKasir ?? "",
    nomorWaKasir: initial?.nomorWaKasir ?? "",
    nomorWaKasirTambahan: parseWaList(initial?.nomorWaKasirTambahan),
    namaOwner: initial?.namaOwner ?? "",
    nomorWaOwner: parseWaList(initial?.nomorWaOwner),
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
    if (!form.nomorWaKasir.trim()) return setValidasi("Nomor WA kasir utama wajib diisi");
    if (!initial && form.pin.length !== 6) return setValidasi("PIN harus tepat 6 digit angka");
    if (form.pin && form.pin.length !== 6) return setValidasi("PIN harus tepat 6 digit angka");
    if (form.pin && !/^\d+$/.test(form.pin)) return setValidasi("PIN hanya boleh angka");
    setValidasi("");
    const kasirTambahan = form.nomorWaKasirTambahan.filter(Boolean);
    const ownerWa = form.nomorWaOwner.filter(Boolean);
    onSave({
      ...form,
      nomorWaKasirTambahan: kasirTambahan.length > 0 ? JSON.stringify(kasirTambahan) : null,
      nomorWaOwner: ownerWa.length > 0 ? JSON.stringify(ownerWa) : null,
    });
  };

  return (
    <div className="space-y-4">
      {(validasi || error) && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{validasi || error}</span>
        </div>
      )}

      {/* ── Informasi Usaha ── */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5" /> Informasi Usaha
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nama Usaha <span className="text-red-500">*</span></Label>
            <Input value={form.namaUsaha} onChange={e => set("namaUsaha", e.target.value)} placeholder="Contoh: Warung Bu Siti" />
          </div>
          <div>
            <Label>Kategori</Label>
            <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.kategori} onChange={e => set("kategori", e.target.value)}>
              {KATEGORI_MITRA.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <Label>RT</Label>
            <select className="w-full border rounded-md h-10 px-3 text-sm" value={form.rt} onChange={e => set("rt", parseInt(e.target.value))}>
              {[1,2,3,4,5,6,7].map(r => <option key={r} value={r}>RT {String(r).padStart(2,"0")} {r <= 4 ? "(Pemukiman)" : "(Perumahan)"}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <Label>Alamat Lengkap <span className="text-red-500">*</span></Label>
            <Input value={form.alamat} onChange={e => set("alamat", e.target.value)} placeholder="Contoh: Jl. Padasuka No. 12" />
          </div>
          <div className="col-span-2">
            <Label>Deskripsi Usaha</Label>
            <Input value={form.deskripsi} onChange={e => set("deskripsi", e.target.value)} placeholder="Opsional — singkat tentang usaha ini" />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input type="checkbox" id="activeChk" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} className="w-4 h-4" />
          <label htmlFor="activeChk" className="text-sm">Aktif sebagai mitra RWcoin</label>
        </div>
      </div>

      <div className="border-t" />

      {/* ── Kasir ── */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> Kasir
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nama Kasir <span className="text-red-500">*</span></Label>
            <Input value={form.namaKasir} onChange={e => set("namaKasir", e.target.value)} placeholder="Nama kasir utama" />
          </div>
          <div>
            <Label>No WA Kasir Utama <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={form.nomorWaKasir} onChange={e => set("nomorWaKasir", e.target.value.replace(/[^0-9]/g, ""))} placeholder="08xx" inputMode="numeric" className="pl-8" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Dipakai untuk kirim OTP transaksi</p>
          </div>
          <div className="col-span-2">
            <Label>PIN Login Kasir {!initial && <span className="text-red-500">*</span>}</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={form.pin}
              onChange={e => set("pin", e.target.value.replace(/\D/g, ""))}
              placeholder={initial ? "Kosongkan jika tidak ingin mengubah PIN" : "6 digit angka"}
            />
          </div>
        </div>
        <WaListInput
          label="No WA Kasir Tambahan (opsional)"
          list={form.nomorWaKasirTambahan}
          onChange={v => set("nomorWaKasirTambahan", v)}
        />
      </div>

      <div className="border-t" />

      {/* ── Pemilik / Owner ── */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> Pemilik Usaha
          <span className="text-[10px] font-normal normal-case tracking-normal">(opsional)</span>
        </p>
        <div>
          <Label>Nama Pemilik</Label>
          <Input value={form.namaOwner} onChange={e => set("namaOwner", e.target.value)} placeholder="Nama pemilik usaha" />
        </div>
        <WaListInput
          label="No WA Pemilik"
          list={form.nomorWaOwner}
          onChange={v => set("nomorWaOwner", v)}
        />
        <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          Semua nomor WA (kasir utama, tambahan, dan pemilik) akan menerima notifikasi setiap ada transaksi.
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button className="flex-1 bg-[hsl(163,55%,22%)]" onClick={handleSimpan} disabled={isPending}>
          {isPending ? "Menyimpan..." : (initial ? "Simpan Perubahan" : "Daftarkan Mitra")}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>Batal</Button>
      </div>
    </div>
  );
}

// ============ VOUCHER FORM ============
function VoucherForm({ initial, onSave, onCancel, mitraList, budgetSubsidi }: { initial?: any; onSave: (data: any) => void; onCancel: () => void; mitraList: any[]; budgetSubsidi: number }) {
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

  // Kalkulasi estimasi biaya subsidi
  const tanpaKuota = form.subsidiAdmin && !form.kuota;
  const estimasiBiaya = (() => {
    if (!form.subsidiAdmin || !form.kuota || !form.nilai) return 0;
    if (form.tipe === "rupiah") return form.nilai * form.kuota;
    // Persen: estimasi berdasarkan minTransaksi (worst case per-kuota)
    const baseTransaksi = form.minTransaksi > 0 ? form.minTransaksi : 100;
    return Math.floor(baseTransaksi * form.nilai / 100) * form.kuota;
  })();
  const sisaSetelah = budgetSubsidi - estimasiBiaya;
  const melebihiBudget = form.subsidiAdmin && form.kuota && estimasiBiaya > budgetSubsidi;

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
        <div><Label>Kuota {form.subsidiAdmin ? <span className="text-red-500">*wajib</span> : "(kosong = ∞)"}</Label><Input type="number" value={form.kuota ?? ""} onChange={e => set("kuota", e.target.value ? parseInt(e.target.value) : null)} min={1} /></div>
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

        {/* Panel Kalkulasi Anti-Boncos */}
        {form.subsidiAdmin && (
          <div className={`p-3 rounded-xl border-2 space-y-2 ${tanpaKuota ? "border-red-400 bg-red-50" : melebihiBudget ? "border-red-400 bg-red-50" : "border-green-400 bg-green-50"}`}>
            <p className="text-xs font-semibold text-gray-700">Kalkulasi Biaya Subsidi</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Budget kas tersedia</span>
              <span className={`font-bold text-right ${budgetSubsidi >= 0 ? "text-green-700" : "text-red-600"}`}>Rp {budgetSubsidi.toLocaleString("id")}</span>
              <span className="text-muted-foreground">Estimasi biaya voucher</span>
              <span className="font-bold text-right text-orange-700">{tanpaKuota ? "∞ (tak terbatas)" : `Rp ${estimasiBiaya.toLocaleString("id")}`}</span>
              {!tanpaKuota && (
                <>
                  <span className="text-muted-foreground">Sisa kas setelah ini</span>
                  <span className={`font-bold text-right ${sisaSetelah >= 0 ? "text-green-700" : "text-red-600"}`}>Rp {sisaSetelah.toLocaleString("id")}</span>
                </>
              )}
            </div>
            {tanpaKuota && (
              <p className="text-xs font-semibold text-red-700">Voucher subsidi tanpa kuota = BAHAYA! Biaya tidak terbatas, bisa boncos. Wajib isi kuota.</p>
            )}
            {!tanpaKuota && melebihiBudget && (
              <p className="text-xs font-semibold text-red-700">Estimasi melebihi budget kas! Kurangi nilai/kuota atau topup kas dulu.</p>
            )}
            {!tanpaKuota && !melebihiBudget && (
              <p className="text-xs font-semibold text-green-700">Budget cukup. Aman untuk dibuat.</p>
            )}
            {form.tipe === "persen" && form.kuota && (
              <p className="text-[10px] text-muted-foreground">*Estimasi persen dihitung berdasarkan nilai min transaksi ({form.minTransaksi > 0 ? form.minTransaksi : 100} coin) × kuota. Biaya aktual bisa lebih tinggi jika nominal belanja lebih besar.</p>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 bg-[hsl(163,55%,22%)]" onClick={() => onSave(form)} disabled={tanpaKuota}>Simpan</Button>
        <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
      </div>
    </div>
  );
}

// ============ SETTING ROW ============
function SettingRow({ def, initialVal }: { def: any; initialVal: number }) {
  const { toast } = useToast();
  const [localVal, setLocalVal] = useState(initialVal);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(initialVal));
  const [saving, setSaving] = useState(false);

  // Sync nilai dari server saat settingsList selesai load (mengatasi race condition mount)
  useEffect(() => {
    if (!editing) {
      setLocalVal(initialVal);
      setInput(String(initialVal));
    }
  }, [initialVal]);

  const handleSave = async () => {
    const v = parseInt(input);
    if (isNaN(v) || v < 0) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/rwcoin/settings/${def.key}`, { value: String(v) });
      setLocalVal(v);
      setEditing(false);
      // Invalidate supaya fetch ulang dari server dan nilai terkonfirmasi tersimpan
      queryClient.invalidateQueries({ queryKey: ["/api/rwcoin/settings"] });
      toast({ title: "Disimpan", description: `${def.label} diubah ke ${def.satuan === "Rp" ? formatRp(v) : v.toLocaleString("id-ID") + " coin"}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`border ${def.border} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${def.bg}`}>{def.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{def.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{def.keterangan}</p>
              {!editing && (
                <p className="text-lg font-bold mt-1.5 text-[hsl(163,55%,22%)]">
                  {def.satuan === "Rp" ? formatRp(localVal) : localVal.toLocaleString("id-ID") + " coin"}
                </p>
              )}
              {editing && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center border rounded-lg overflow-hidden flex-1">
                    <span className="px-2.5 py-1.5 text-xs bg-muted text-muted-foreground border-r">{def.satuan === "Rp" ? "Rp" : "coin"}</span>
                    <input
                      type="number"
                      className="flex-1 px-2 py-1.5 text-sm outline-none"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      min={0}
                      autoFocus
                    />
                  </div>
                  <Button size="sm" className="bg-[hsl(163,55%,22%)] px-3" onClick={handleSave} disabled={saving}>
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setInput(String(localVal)); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {!editing && (
            <Button size="sm" variant="outline" className="flex-shrink-0 text-xs" onClick={() => { setInput(String(localVal)); setEditing(true); }}>
              <Pencil className="w-3 h-3 mr-1" /> Ubah
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MAIN PAGE ============
export default function AdminRwcoin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"dashboard" | "mitra" | "topup" | "withdraw" | "transaksi" | "voucher" | "kas" | "pengaturan">("dashboard");
  const [showTopup, setShowTopup] = useState(false);
  const [editMitra, setEditMitra] = useState<any>(null);
  const [showMitraForm, setShowMitraForm] = useState(false);
  const [editVoucher, setEditVoucher] = useState<any>(null);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [showInjectKas, setShowInjectKas] = useState(false);
  const [injectTipe, setInjectTipe] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [injectJumlah, setInjectJumlah] = useState("");
  const [injectKet, setInjectKet] = useState("");
  const [kasFilter, setKasFilter] = useState("semua");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/rwcoin/stats"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: mitraList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/mitra"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: withdrawList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/withdraw"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: transaksiList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/transaksi"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: voucherList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/voucher"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: kasData } = useQuery<{ saldo: number; list: any[] }>({ queryKey: ["/api/rwcoin/kas"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: dashboardData } = useQuery<any>({ queryKey: ["/api/rwcoin/dashboard"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: topupRequestList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/topup-request"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: settingsList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/settings"], queryFn: getQueryFn({ on401: "throw" }) });

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
    { id: "pengaturan", label: "Pengaturan", icon: Shield },
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
      {activeTab === "kas" && (() => {
        const list = kasData?.list ?? [];
        const adminFee = list.filter(r => r.tipeDetail === "admin_fee").reduce((a: number, r: any) => a + r.jumlah, 0);
        const topupCoin = list.filter(r => r.tipeDetail === "topup_coin").reduce((a: number, r: any) => a + r.jumlah, 0);
        const subsidiVoucher = list.filter(r => r.tipeDetail === "subsidi_voucher").reduce((a: number, r: any) => a + r.jumlah, 0);
        const withdrawMitra = list.filter(r => r.tipeDetail === "withdraw_mitra").reduce((a: number, r: any) => a + r.jumlah, 0);
        const injectMasuk = list.filter(r => r.tipeDetail === "inject_admin" && r.tipe === "pemasukan").reduce((a: number, r: any) => a + r.jumlah, 0);
        const injectKeluar = list.filter(r => r.tipeDetail === "inject_admin" && r.tipe === "pengeluaran").reduce((a: number, r: any) => a + r.jumlah, 0);
        const totalMasuk = topupCoin + adminFee + injectMasuk;
        const totalKeluar = withdrawMitra + subsidiVoucher + injectKeluar;
        const saldoKas = kasData?.saldo ?? 0;

        // Margin bersih RW (hanya dari fee & inject, bukan modal coin)
        const marginBersih = adminFee + injectMasuk - subsidiVoucher - injectKeluar;

        // Data ekosistem coin
        const ek = dashboardData?.ekonomi;
        const perputaran = dashboardData?.perputaran;
        const totalBeredar = perputaran?.totalBeredar ?? 0;
        const totalDiWarga = perputaran?.totalDiWarga ?? 0;
        const totalDiMitra = perputaran?.totalDiMitra ?? 0;
        const totalWithdrawn = perputaran?.totalWithdrawn ?? 0;

        // Kecukupan kas: setiap 1 coin perlu 1 Rp backing
        const coveragePct = totalBeredar > 0 ? Math.min(Math.round(saldoKas / totalBeredar * 100), 999) : 100;
        const bufferKas = saldoKas - totalBeredar;

        // Withdraw pending
        const pendingWdList = withdrawList.filter((w: any) => w.status === "pending");
        const pendingWdTotal = pendingWdList.reduce((s: number, w: any) => s + (w.jumlahCoin ?? 0), 0);

        // Status kesehatan kas
        const kasStatus = (() => {
          if (saldoKas < 0 || coveragePct < 80 || marginBersih < 0) return "kritis";
          if (coveragePct < 100 || pendingWdList.length > 3) return "waspada";
          return "sehat";
        })();
        const statusStyle = kasStatus === "sehat"
          ? { bg: "from-[hsl(163,55%,18%)] to-[hsl(163,55%,30%)]", badge: "bg-green-400 text-green-900", icon: <Shield className="w-4 h-4" />, label: "KAS SEHAT" }
          : kasStatus === "waspada"
          ? { bg: "from-amber-700 to-amber-500", badge: "bg-yellow-300 text-yellow-900", icon: <AlertTriangle className="w-4 h-4" />, label: "PERLU PERHATIAN" }
          : { bg: "from-red-800 to-red-600", badge: "bg-red-300 text-red-900", icon: <AlertCircle className="w-4 h-4" />, label: "KAS KRITIS!" };

        return (
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
                    <Input type="number" placeholder="Contoh: 50000" value={injectJumlah} onChange={e => setInjectJumlah(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Keterangan (opsional)</Label>
                    <Input placeholder={injectTipe === "pemasukan" ? "Topup subsidi voucher Ramadan" : "Penarikan kas operasional"} value={injectKet} onChange={e => setInjectKet(e.target.value)} />
                  </div>
                  <Button className={injectTipe === "pemasukan" ? "w-full bg-[hsl(163,55%,22%)]" : "w-full bg-red-600 hover:bg-red-700"}
                    onClick={() => injectKasMutation.mutate({ tipe: injectTipe, jumlah: parseInt(injectJumlah), keterangan: injectKet })}
                    disabled={injectKasMutation.isPending || !injectJumlah}>
                    {injectKasMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : (injectTipe === "pemasukan" ? "Tambah ke Kas" : "Tarik dari Kas")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ═══ HERO: STATUS & SALDO KAS ═══ */}
            <Card className="border-0 shadow-md overflow-hidden">
              <div className={`p-5 text-white bg-gradient-to-br ${statusStyle.bg}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Landmark className="w-5 h-5 opacity-70" />
                      <p className="text-sm opacity-80">Saldo Kas RWcoin</p>
                    </div>
                    <p className="text-4xl font-bold tracking-tight">{formatRp(saldoKas)}</p>
                    <p className="text-xs opacity-60 mt-1">Total masuk dikurangi semua pengeluaran</p>
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusStyle.badge}`}>
                    {statusStyle.icon} {statusStyle.label}
                  </span>
                </div>
                {/* Mini neraca dalam hero */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/20">
                  <div>
                    <p className="text-xs opacity-60 mb-1.5">PEMASUKAN</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="opacity-75">Modal Coin Warga</span><span className="font-semibold">+{formatRp(topupCoin)}</span></div>
                      <div className="flex justify-between"><span className="opacity-75">Admin Fee Topup</span><span className="font-semibold text-yellow-300">+{formatRp(adminFee)}</span></div>
                      {injectMasuk > 0 && <div className="flex justify-between"><span className="opacity-75">Inject Manual</span><span className="font-semibold text-blue-300">+{formatRp(injectMasuk)}</span></div>}
                      <div className="flex justify-between border-t border-white/20 pt-1 mt-1"><span className="opacity-60">Total masuk</span><span className="font-bold">+{formatRp(totalMasuk)}</span></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs opacity-60 mb-1.5">PENGELUARAN</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="opacity-75">Withdraw Mitra</span><span className="font-semibold text-red-300">-{formatRp(withdrawMitra)}</span></div>
                      <div className="flex justify-between"><span className="opacity-75">Subsidi Voucher</span><span className="font-semibold text-orange-300">-{formatRp(subsidiVoucher)}</span></div>
                      {injectKeluar > 0 && <div className="flex justify-between"><span className="opacity-75">Tarik Manual</span><span className="font-semibold text-red-300">-{formatRp(injectKeluar)}</span></div>}
                      <div className="flex justify-between border-t border-white/20 pt-1 mt-1"><span className="opacity-60">Total keluar</span><span className="font-bold">-{formatRp(totalKeluar)}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* ═══ PERINGATAN AKTIF ═══ */}
            {(pendingWdList.length > 0 || marginBersih < 0 || coveragePct < 100) && (
              <div className="space-y-2">
                {pendingWdList.length > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">{pendingWdList.length} Withdraw Mitra Menunggu</p>
                      <p className="text-xs text-amber-700 mt-0.5">Total {formatCoin(pendingWdTotal)} perlu dibayarkan ke rekening mitra. Segera proses di tab Withdraw.</p>
                    </div>
                  </div>
                )}
                {marginBersih < 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-800">Subsidi Voucher Melebihi Admin Fee!</p>
                      <p className="text-xs text-red-700 mt-0.5">Subsidi {formatRp(subsidiVoucher)} sudah lebih besar dari fee {formatRp(adminFee)}. Defisit {formatRp(Math.abs(marginBersih))}. Kurangi voucher subsidi atau topup kas.</p>
                    </div>
                  </div>
                )}
                {coveragePct < 100 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-800">Kas Tidak Cukup Cover Semua Coin!</p>
                      <p className="text-xs text-red-700 mt-0.5">Coin beredar {formatCoin(totalBeredar)} tapi kas hanya {formatRp(saldoKas)}. Coverage {coveragePct}% — jika semua mitra withdraw sekarang, kas bisa kurang.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ POSISI EKOSISTEM ═══ */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Posisi Coin di Ekosistem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-green-50">
                    <p className="text-base font-bold text-green-700">{formatCoin(totalDiWarga)}</p>
                    <p className="text-[11px] font-semibold text-green-600">Di Warga</p>
                    <p className="text-[10px] text-muted-foreground">belum dibelanjakan</p>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50">
                    <p className="text-base font-bold text-orange-700">{formatCoin(totalDiMitra)}</p>
                    <p className="text-[11px] font-semibold text-orange-600">Di Mitra</p>
                    <p className="text-[10px] text-muted-foreground">siap diwithdraw</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-base font-bold text-gray-600">{formatCoin(totalWithdrawn)}</p>
                    <p className="text-[11px] font-semibold text-gray-500">Sudah Keluar</p>
                    <p className="text-[10px] text-muted-foreground">dicairkan mitra</p>
                  </div>
                </div>
                {/* Coverage bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Kecukupan kas vs coin beredar</span>
                    <span className={`font-bold ${coveragePct >= 100 ? "text-green-600" : "text-red-600"}`}>{coveragePct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${coveragePct >= 100 ? "bg-green-500" : coveragePct >= 80 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(coveragePct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Kas {formatRp(saldoKas)} vs coin beredar {formatCoin(totalBeredar)}.{" "}
                    {bufferKas >= 0
                      ? <span className="text-green-600 font-medium">Buffer +{formatRp(bufferKas)} — aman.</span>
                      : <span className="text-red-600 font-medium">Defisit {formatRp(Math.abs(bufferKas))} — perlu topup kas!</span>}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ═══ NERACA MARGIN RW ═══ */}
            <Card className={`border-0 shadow-sm border-l-4 ${marginBersih >= 0 ? "border-l-green-400" : "border-l-red-500"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Margin Bersih RW</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Keuntungan nyata RW dari ekosistem ini</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${marginBersih >= 0 ? "text-green-600" : "text-red-600"}`}>{formatRp(marginBersih)}</p>
                    <p className={`text-xs font-semibold ${marginBersih >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {marginBersih >= 0 ? `+${adminFee > 0 ? Math.round(marginBersih / adminFee * 100) : 0}% dari fee` : "BONCOS!"}
                    </p>
                  </div>
                </div>
                {/* Breakdown baris per baris */}
                <div className="space-y-1.5 pt-2 border-t">
                  {[
                    { label: "Admin Fee Topup", val: adminFee, plus: true, color: "text-yellow-600" },
                    { label: "Inject Kas Manual", val: injectMasuk, plus: true, color: "text-blue-600", skip: injectMasuk === 0 },
                    { label: "Subsidi Voucher", val: subsidiVoucher, plus: false, color: "text-orange-600" },
                    { label: "Tarik Kas Manual", val: injectKeluar, plus: false, color: "text-red-600", skip: injectKeluar === 0 },
                  ].filter(r => !r.skip).map(row => {
                    const pct = (adminFee + injectMasuk) > 0 ? Math.round(row.val / (adminFee + injectMasuk) * 100) : 0;
                    return (
                      <div key={row.label} className="flex items-center gap-2">
                        <div className="w-28 flex-shrink-0">
                          <p className="text-xs text-muted-foreground truncate">{row.label}</p>
                        </div>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                          <div className={`h-full rounded-full ${row.plus ? "bg-green-400" : "bg-red-400"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <p className={`text-xs font-semibold w-24 text-right ${row.color}`}>{row.plus ? "+" : "-"}{formatRp(row.val)}</p>
                      </div>
                    );
                  })}
                </div>
                {subsidiVoucher > 0 && (
                  <div className={`p-2.5 rounded-lg text-xs ${marginBersih < 0 ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
                    {marginBersih < 0
                      ? `Subsidi voucher terlalu besar! Sudah pakai ${formatRp(subsidiVoucher)} dari kas, fee hanya ${formatRp(adminFee)}.`
                      : `Subsidi ${formatRp(subsidiVoucher)} masih dalam batas aman. Sisa margin ${formatRp(marginBersih)}.`}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ INDIKATOR EKONOMI ═══ */}
            {ek && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Indikator Ekonomi Lokal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 4 metric utama */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl border">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground">Velocity Coin</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ek.velocity >= 2 ? "bg-green-100 text-green-700" : ek.velocity >= 1 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {ek.velocity >= 2 ? "OPTIMAL" : ek.velocity >= 1 ? "NORMAL" : "RENDAH"}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-purple-700">{ek.velocity.toFixed(2)}x</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {ek.velocity < 1 ? "Coin baru, belum banyak berputar" : ek.velocity < 2 ? "Sehat — coin beredar di ekosistem" : "Coin berputar aktif, ekosistem hidup"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground">Retensi Coin</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ek.retention >= 70 ? "bg-green-100 text-green-700" : ek.retention >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                          {ek.retention >= 70 ? "KUAT" : ek.retention >= 40 ? "NORMAL" : "LEMAH"}
                        </span>
                      </div>
                      <p className={`text-2xl font-bold ${ek.retention >= 70 ? "text-green-600" : ek.retention >= 40 ? "text-yellow-600" : "text-red-600"}`}>{ek.retention}%</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {ek.retention >= 70 ? "Ekosistem kuat, warga simpan coin" : ek.retention >= 40 ? "Normal, sebagian coin keluar" : "Banyak coin keluar via withdraw"}
                      </p>
                    </div>
                  </div>
                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-blue-50">
                      <p className="text-sm font-bold text-blue-700">{formatCoin(ek.totalPernahTopup)}</p>
                      <p className="text-[10px] text-blue-600">Total Topup</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50">
                      <p className="text-sm font-bold">{ek.activeWarga} warga</p>
                      <p className="text-[10px] text-muted-foreground">Punya wallet</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50">
                      <p className="text-sm font-bold">{ek.activeMitra} mitra</p>
                      <p className="text-[10px] text-muted-foreground">Mitra aktif</p>
                    </div>
                  </div>
                  {/* Top spender */}
                  {ek.topSpenders?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <PiggyBank className="w-3.5 h-3.5" /> Top Spender Warga
                      </p>
                      <div className="space-y-1.5">
                        {ek.topSpenders.map((s: any, i: number) => {
                          const maxBelanja = ek.topSpenders[0]?.totalBelanja ?? 1;
                          const pct = Math.round(s.totalBelanja / maxBelanja * 100);
                          return (
                            <div key={s.wargaId} className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[hsl(163,55%,22%)] text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                  <p className="text-xs font-medium truncate max-w-[110px]">{s.namaWarga}</p>
                                  <p className="text-xs font-bold text-[hsl(163,55%,22%)] flex-shrink-0">{formatCoin(s.totalBelanja)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                                    <div className="h-full rounded-full bg-[hsl(163,55%,22%)]" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{s.jumlahTx}x</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ═══ RIWAYAT KAS dengan filter ═══ */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Landmark className="w-4 h-4" /> Riwayat Mutasi Kas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Filter pills */}
                <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
                  {[
                    { key: "semua", label: "Semua" },
                    { key: "admin_fee", label: "Admin Fee" },
                    { key: "topup_coin", label: "Modal Topup" },
                    { key: "withdraw_mitra", label: "Withdraw Mitra" },
                    { key: "subsidi_voucher", label: "Subsidi" },
                    { key: "inject_admin", label: "Manual" },
                  ].map(f => (
                    <button key={f.key} onClick={() => setKasFilter(f.key)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${kasFilter === f.key ? "bg-[hsl(163,55%,22%)] text-white" : "bg-gray-100 text-muted-foreground hover:bg-gray-200"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="divide-y">
                  {list
                    .filter(r => kasFilter === "semua" || r.tipeDetail === kasFilter)
                    .map((r: any) => {
                      const labelMap: Record<string, string> = {
                        inject_admin: r.tipe === "pemasukan" ? "Topup Kas Manual" : "Tarik Kas Manual",
                        admin_fee: "Admin Fee Topup",
                        topup_coin: "Modal Coin Warga",
                        subsidi_voucher: "Subsidi Voucher",
                        withdraw_mitra: "Withdraw Mitra",
                      };
                      const iconMap: Record<string, { bg: string; icon: React.ReactNode }> = {
                        admin_fee: { bg: "bg-yellow-100 text-yellow-700", icon: <Coins className="w-4 h-4" /> },
                        topup_coin: { bg: "bg-green-100 text-green-700", icon: <ArrowUpCircle className="w-4 h-4" /> },
                        withdraw_mitra: { bg: "bg-red-100 text-red-600", icon: <ArrowDownCircle className="w-4 h-4" /> },
                        subsidi_voucher: { bg: "bg-orange-100 text-orange-600", icon: <Tag className="w-4 h-4" /> },
                        inject_admin: r.tipe === "pemasukan" ? { bg: "bg-blue-100 text-blue-600", icon: <Plus className="w-4 h-4" /> } : { bg: "bg-gray-100 text-gray-600", icon: <ArrowDownCircle className="w-4 h-4" /> },
                      };
                      const style = iconMap[r.tipeDetail] ?? { bg: "bg-gray-100 text-gray-600", icon: <Coins className="w-4 h-4" /> };
                      return (
                        <div key={r.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                              {style.icon}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{labelMap[r.tipeDetail] ?? r.tipe}</p>
                              {r.keterangan && <p className="text-xs text-muted-foreground">{r.keterangan}</p>}
                              <p className="text-[10px] text-muted-foreground">{formatTgl(r.createdAt)}</p>
                            </div>
                          </div>
                          <p className={`font-bold text-sm tabular-nums ${r.tipe === "pemasukan" ? "text-green-600" : "text-red-500"}`}>
                            {r.tipe === "pemasukan" ? "+" : "-"}{formatRp(r.jumlah)}
                          </p>
                        </div>
                      );
                    })}
                  {list.filter(r => kasFilter === "semua" || r.tipeDetail === kasFilter).length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">Belum ada mutasi untuk kategori ini</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

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
                  budgetSubsidi={dashboardData?.ekonomi?.budgetSubsidi ?? (kasData?.saldo ?? 0)}
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

      {/* PENGATURAN TAB */}
      {activeTab === "pengaturan" && (() => {
        const settingDefs = [
          {
            key: "topup_fee",
            label: "Biaya Admin Topup",
            keterangan: "Ditagihkan ke warga setiap request topup coin. Warga transfer jumlah topup + biaya ini.",
            satuan: "Rp",
            icon: <ArrowUpCircle className="w-4 h-4 text-yellow-600" />,
            bg: "bg-yellow-50",
            border: "border-yellow-200",
          },
          {
            key: "withdraw_fee",
            label: "Potongan Admin Withdraw",
            keterangan: "Dipotong dari setiap withdraw mitra. Mitra menerima jumlah withdraw dikurangi potongan ini.",
            satuan: "Rp",
            icon: <ArrowDownCircle className="w-4 h-4 text-red-600" />,
            bg: "bg-red-50",
            border: "border-red-200",
          },
          {
            key: "min_topup",
            label: "Minimal Topup",
            keterangan: "Nominal minimum yang bisa di-request warga per satu kali topup.",
            satuan: "Rp",
            icon: <Coins className="w-4 h-4 text-green-600" />,
            bg: "bg-green-50",
            border: "border-green-200",
          },
          {
            key: "min_withdraw",
            label: "Minimal Withdraw Mitra",
            keterangan: "Jumlah coin minimum yang bisa di-withdraw oleh mitra dalam satu request.",
            satuan: "coin",
            icon: <Store className="w-4 h-4 text-blue-600" />,
            bg: "bg-blue-50",
            border: "border-blue-200",
          },
        ];

        return (
          <div className="space-y-4">
            {/* Header */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[hsl(163,55%,18%)] to-[hsl(163,55%,28%)] text-white">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 opacity-70" />
                <p className="font-semibold">Aturan Biaya & Potongan</p>
              </div>
              <p className="text-xs opacity-70">Semua perubahan langsung berlaku untuk transaksi berikutnya. Nilai lama tidak terpengaruh.</p>
            </div>

            {settingDefs.map(def => {
              const current = settingsList.find((s: any) => s.key === def.key);
              const defaultVals: Record<string, number> = { topup_fee: 2500, withdraw_fee: 5000, min_topup: 10000, min_withdraw: 10000 };
              const initialVal = current ? parseInt(current.value) : (defaultVals[def.key] ?? 0);
              return (
                <SettingRow
                  key={def.key}
                  def={def}
                  initialVal={initialVal}
                />
              );
            })}

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-800 mb-1">Catatan Penting</p>
              <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                <li>Biaya topup langsung tampil ke warga saat request topup</li>
                <li>Potongan withdraw tampil ke mitra saat ajukan withdraw</li>
                <li>Pastikan potongan withdraw tidak melebihi minimal withdraw</li>
              </ul>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
