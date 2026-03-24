import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Coins, ShoppingBag, ArrowUpCircle, Tag, TrendingUp,
  CheckCircle2, X, Loader2, AlertCircle, Store,
  Plus, Copy, ArrowLeftRight, User, SendHorizontal, ArrowDownCircle,
} from "lucide-react";

function formatCoin(n: number) { return n.toLocaleString("id-ID"); }
function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
function formatTgl(ts: string) {
  return new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Koin emas RWcoin
function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "inline-block", verticalAlign: "-0.18em", flexShrink: 0 }}>
      <circle cx="10" cy="10" r="9.5" fill="#92400E" />
      <circle cx="10" cy="10" r="9" fill="#D97706" />
      <circle cx="10" cy="10" r="8" fill="#F59E0B" />
      <circle cx="10" cy="10" r="6.8" fill="#FCD34D" />
      <circle cx="10" cy="10" r="5.8" fill="none" stroke="#D97706" strokeWidth="0.6" />
      <ellipse cx="8" cy="7.5" rx="2.2" ry="1.1" fill="white" fillOpacity="0.28" transform="rotate(-25 8 7.5)" />
      <text x="10" y="13.2" textAnchor="middle" fill="#78350F" fontSize="4.8" fontWeight="900" fontFamily="Arial,sans-serif">RW</text>
    </svg>
  );
}

// Helper: hitung diskon voucher client-side untuk preview instan
function hitungDiskonVoucher(jumlahBruto: number, voucher: any, mitraIdStr: string): number {
  if (!voucher || !jumlahBruto || jumlahBruto <= 0) return 0;
  const today = new Date().toISOString().split("T")[0];
  if (!voucher.isActive) return 0;
  if (voucher.berlakuHingga && voucher.berlakuHingga < today) return 0;
  if (voucher.kuota != null && voucher.terpakai >= voucher.kuota) return 0;
  if (jumlahBruto < (voucher.minTransaksi ?? 0)) return 0;
  if (voucher.mitraId && String(voucher.mitraId) !== mitraIdStr) return 0;
  if (voucher.tipe === "persen") return Math.floor(jumlahBruto * voucher.nilai / 100);
  return Math.min(voucher.nilai, jumlahBruto);
}

// ============ MODAL BAYAR ============
function BayarModal({ wallet, initialVoucherKode, onClose }: { wallet: any; initialVoucherKode?: string; onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "sukses">("form");
  const [search, setSearch] = useState("");
  const [mitraSelected, setMitraSelected] = useState<any>(null);
  const [jumlah, setJumlah] = useState("");
  const [voucherKode, setVoucherKode] = useState(initialVoucherKode ?? "");
  const [suksesTx, setSuksesTx] = useState<any>(null);

  const { data: mitraList = [] } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/mitra"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: voucherList = [] } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/voucher"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const bayarMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/warga/rwcoin/bayar-langsung", data);
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return await res.json();
    },
    onSuccess: (data: any) => {
      setSuksesTx(data);
      setStep("sukses");
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/transaksi"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const jumlahAngka = parseInt(jumlah) || 0;
  const saldoKurang = !!jumlah && jumlahAngka > (wallet?.saldo ?? 0);
  const mitraIdStr = String(mitraSelected?.id ?? "");
  const today = new Date().toISOString().split("T")[0];

  // Filter mitra by search
  const searchLower = search.toLowerCase();
  const mitraSuggestions = search.length >= 1
    ? mitraList.filter((m: any) =>
        m.namaUsaha.toLowerCase().includes(searchLower) ||
        m.kodeWallet?.toLowerCase().includes(searchLower)
      ).slice(0, 5)
    : [];

  // Voucher relevan untuk mitra yang dipilih (atau semua mitra)
  const voucherRelevan = voucherList.filter((v: any) =>
    v.isActive &&
    (!v.berlakuHingga || v.berlakuHingga >= today) &&
    (v.kuota == null || v.terpakai < v.kuota) &&
    (!v.mitraId || !mitraIdStr || String(v.mitraId) === mitraIdStr)
  );

  const voucherDipilih = voucherRelevan.find((v: any) => v.kode === voucherKode.toUpperCase());
  const voucherTidakValid = voucherKode.trim() !== "" && !voucherDipilih && voucherList.length > 0;
  const diskonPreview = voucherDipilih ? hitungDiskonVoucher(jumlahAngka, voucherDipilih, mitraIdStr) : 0;
  const bayarPreview = Math.max(0, jumlahAngka - diskonPreview);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={step === "sukses" ? onClose : undefined} />

      <div className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-3xl shadow-2xl" style={{ maxHeight: "92dvh" }}>
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-gray-100">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{step === "sukses" ? "Selesai ✓" : "Bayar ke Mitra"}</p>
              <h2 className="font-bold text-base leading-tight">{step === "sukses" ? "Transaksi Berhasil" : "Bayar RWcoin"}</h2>
            </div>
            {step !== "sukses" && (
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* STEP: FORM */}
          {step === "form" && (
            <div className="p-5 space-y-4 pb-8">
              {/* Saldo info */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: "hsl(163,55%,96%)" }}>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo tersedia</p>
                  <p className="font-bold text-[hsl(163,55%,22%)] text-lg">{formatCoin(wallet?.saldo ?? 0)} <CoinIcon /></p>
                </div>
                <p className="text-sm text-muted-foreground">{formatRp(wallet?.saldo ?? 0)}</p>
              </div>

              {/* Pilih Mitra */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Mitra Tujuan</Label>

                {mitraSelected ? (
                  /* Mitra sudah dipilih */
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-50 border-2 border-green-300">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-green-700">{mitraSelected.namaUsaha}</p>
                      <p className="text-xs text-muted-foreground">{mitraSelected.kategori} · RT {String(mitraSelected.rt).padStart(2, "0")}</p>
                    </div>
                    <button
                      onClick={() => { setMitraSelected(null); setSearch(""); }}
                      className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Search input */
                  <div className="space-y-1">
                    <div className="relative">
                      <Store className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Ketik nama toko atau kode mitra..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 border-2 focus:border-[hsl(163,55%,22%)] h-11"
                        autoFocus
                      />
                    </div>
                    {/* Suggestions */}
                    {mitraSuggestions.length > 0 && (
                      <div className="border-2 border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                        {mitraSuggestions.map((m: any) => (
                          <button
                            key={m.id}
                            onClick={() => { setMitraSelected(m); setSearch(""); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[hsl(163,55%,96%)] text-left transition-colors"
                          >
                            <div className="w-9 h-9 rounded-full bg-[hsl(163,55%,22%)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {m.namaUsaha[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{m.namaUsaha}</p>
                              <p className="text-xs text-muted-foreground">{m.kategori} · RT {String(m.rt).padStart(2, "0")}</p>
                            </div>
                            <p className="text-xs font-mono text-muted-foreground flex-shrink-0">{m.kodeWallet}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {search.length >= 1 && mitraSuggestions.length === 0 && (
                      <p className="text-xs text-muted-foreground px-1 py-1">Mitra tidak ditemukan</p>
                    )}
                    {search.length === 0 && (
                      <p className="text-xs text-muted-foreground px-1">Ketik nama toko untuk mencari</p>
                    )}
                  </div>
                )}
              </div>

              {/* Nominal */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Nominal</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={jumlah}
                  onChange={e => setJumlah(e.target.value.replace(/\D/g, ""))}
                  className={`text-2xl font-bold h-14 border-2 text-center ${saldoKurang ? "border-red-400" : "focus:border-[hsl(163,55%,22%)]"}`}
                />
                <div className="flex items-center justify-between px-1">
                  {jumlahAngka > 0 ? <p className="text-xs text-muted-foreground">= {formatRp(jumlahAngka)}</p> : <span />}
                  {saldoKurang && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3" /> Saldo tidak cukup
                    </div>
                  )}
                </div>
              </div>

              {/* Voucher */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" style={{ color: "hsl(40,45%,55%)" }} />
                  Voucher <span className="font-normal text-muted-foreground text-xs">(opsional)</span>
                </Label>

                <div className="relative">
                  <Input
                    placeholder="Ketik atau pilih voucher di bawah"
                    value={voucherKode}
                    onChange={e => setVoucherKode(e.target.value.toUpperCase())}
                    className={`font-mono border-2 pr-8 ${
                      voucherDipilih && diskonPreview > 0 ? "border-emerald-400 bg-emerald-50" :
                      voucherTidakValid ? "border-red-300" : ""
                    }`}
                  />
                  {voucherKode && (
                    <button onClick={() => setVoucherKode("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {voucherDipilih && diskonPreview > 0 && jumlahAngka > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-700">Voucher valid! Hemat {formatCoin(diskonPreview)} <CoinIcon /></p>
                      <p className="text-[11px] text-emerald-600">Bayar {formatCoin(bayarPreview)} <CoinIcon /> (dari {formatCoin(jumlahAngka)} <CoinIcon />)</p>
                    </div>
                  </div>
                )}
                {voucherDipilih && diskonPreview === 0 && jumlahAngka > 0 && voucherDipilih.minTransaksi > jumlahAngka && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">Min. belanja {formatCoin(voucherDipilih.minTransaksi)} <CoinIcon /> untuk voucher ini</p>
                  </div>
                )}
                {voucherTidakValid && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">Kode voucher tidak ditemukan atau sudah tidak berlaku</p>
                  </div>
                )}

                {/* Grid daftar voucher tersedia */}
                {voucherRelevan.length > 0 && (
                  <div className="space-y-1.5 mt-1">
                    <p className="text-[11px] text-muted-foreground font-medium px-0.5">Voucher tersedia ({voucherRelevan.length})</p>
                    {voucherRelevan.map((v: any) => {
                      const isAktif = voucherKode.toUpperCase() === v.kode;
                      const diskonIni = hitungDiskonVoucher(jumlahAngka, v, mitraIdStr);
                      const minBelumCukup = jumlahAngka > 0 && jumlahAngka < (v.minTransaksi ?? 0);
                      return (
                        <div
                          key={v.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border-2 transition-colors ${
                            isAktif ? "border-emerald-400 bg-emerald-50" : "border-gray-100 bg-gray-50"
                          } ${minBelumCukup ? "opacity-50" : ""}`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs font-mono" style={{ color: "hsl(40,45%,35%)" }}>{v.kode}</p>
                              <Badge className="text-[10px] px-1.5 py-0 h-4 text-white" style={{ backgroundColor: "hsl(40,45%,55%)" }}>
                                {v.tipe === "persen" ? `${v.nilai}% OFF` : <>{formatCoin(v.nilai)} <CoinIcon size={12} /></>}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{v.nama}</p>
                            {v.minTransaksi > 0 && (
                              <p className="text-[10px] text-muted-foreground">Min {formatCoin(v.minTransaksi)} <CoinIcon /></p>
                            )}
                            {jumlahAngka > 0 && diskonIni > 0 && (
                              <p className="text-[11px] text-emerald-600 font-semibold">Hemat {formatCoin(diskonIni)} <CoinIcon /></p>
                            )}
                          </div>
                          <button
                            onClick={() => setVoucherKode(isAktif ? "" : v.kode)}
                            className={`ml-2 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isAktif
                                ? "bg-emerald-500 text-white"
                                : minBelumCukup
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-[hsl(163,55%,22%)] text-white hover:bg-[hsl(163,55%,18%)]"
                            }`}
                            disabled={minBelumCukup}
                          >
                            {isAktif ? "✓ Dipakai" : "Pakai"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Preview total */}
              {diskonPreview > 0 && jumlahAngka > 0 && (
                <div className="rounded-2xl p-3.5 space-y-2" style={{ background: "hsl(163,55%,96%)" }}>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span><span>{formatCoin(jumlahAngka)} <CoinIcon /></span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Diskon</span><span>- {formatCoin(diskonPreview)} <CoinIcon /></span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>Total Bayar</span>
                    <span className="text-[hsl(163,55%,22%)]">{formatCoin(bayarPreview)} <CoinIcon /></span>
                  </div>
                </div>
              )}

              <Button
                className="w-full text-base font-semibold rounded-2xl mt-2"
                style={{ height: "52px", background: "hsl(163,55%,22%)" }}
                disabled={!mitraSelected || !jumlah || jumlahAngka <= 0 || saldoKurang || bayarMutation.isPending}
                onClick={() => bayarMutation.mutate({ kodeMitra: mitraSelected.kodeWallet, jumlah: jumlahAngka, voucherKode: voucherKode || undefined })}
              >
                {bayarMutation.isPending
                  ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memproses...</>
                  : "Bayar Sekarang"}
              </Button>
            </div>
          )}

          {/* STEP: SUKSES */}
          {step === "sukses" && suksesTx && (
            <div className="p-6 text-center space-y-5 pb-10">
              {/* Animasi */}
              <div className="relative w-28 h-28 mx-auto mt-4">
                <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-50" />
                <div className="absolute inset-2 rounded-full bg-green-100 animate-ping opacity-30" style={{ animationDelay: "0.2s" }} />
                <div className="relative w-28 h-28 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-600">Berhasil!</h3>
                <p className="text-base font-medium mt-0.5">Kasir sudah mendapat notifikasi WA</p>
              </div>

              <div className="rounded-2xl p-4 space-y-3 text-left" style={{ background: "hsl(163,55%,96%)" }}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mitra</span>
                  <span className="font-semibold">{suksesTx.namaUsaha}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Bayar</span>
                  <span className="font-bold text-[hsl(163,55%,22%)]">{formatCoin(suksesTx.transaksi?.jumlahBayar ?? 0)} <CoinIcon /></span>
                </div>
                {suksesTx.diskon > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Hemat</span>
                    <span className="font-medium">{formatCoin(suksesTx.diskon)} <CoinIcon /></span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground border-t pt-2.5">
                  <span>ID Transaksi</span>
                  <span className="font-mono">{suksesTx.transaksi?.kodeTransaksi}</span>
                </div>
              </div>

              <Button
                className="w-full h-13 text-base font-semibold rounded-2xl"
                style={{ background: "hsl(163,55%,22%)" }}
                onClick={onClose}
              >
                Selesai
              </Button>
            </div>
          )}
        </div>{/* end scrollable body */}
      </div>
    </>
  );
}

// ============ TOPUP MODAL ============
const METODE_TRANSFER = [
  { id: "BCA", label: "BCA", rekening: "1390997490", atasnama: "Raden Raka Abdul Kamal S." },
  { id: "Dana", label: "Dana / OVO", rekening: "0895424577140", atasnama: "Raden Raka" },
  { id: "GoPay", label: "GoPay", rekening: "0895424577140", atasnama: "Raden Raka" },
];
const NOMINAL_PRESET = [10000, 25000, 50000, 100000, 200000, 500000];

function TopupModal({ wallet, onClose }: { wallet: any; onClose: () => void }) {
  const { toast } = useToast();
  const [jumlah, setJumlah] = useState("");
  const [metodeId, setMetodeId] = useState("BCA");
  const [sukses, setSukses] = useState<{ totalTransfer: number; metode: typeof METODE_TRANSFER[0] } | null>(null);

  const { data: settingsList = [] } = useQuery<any[]>({ queryKey: ["/api/rwcoin/settings"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const ADMIN_FEE = parseInt(settingsList.find((s: any) => s.key === "topup_fee")?.value ?? "2500");

  const nominalAngka = parseInt(jumlah.replace(/\D/g, "")) || 0;
  const totalTransfer = nominalAngka + ADMIN_FEE;
  const metode = METODE_TRANSFER.find(m => m.id === metodeId)!;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Tersalin!", description: text });
  };

  const kirimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/warga/rwcoin/request-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jumlah: nominalAngka,
          metode: metode.label,
          rekening: metode.rekening,
          atasnama: metode.atasnama,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `Error ${res.status}`);
      return data;
    },
    onSuccess: () => {
      setSukses({ totalTransfer, metode });
    },
    onError: (e: any) => console.error("[TopupModal] kirimMutation error:", e),
  });

  const buktiWaUrl = `https://wa.me/62895424577140?text=${encodeURIComponent("Halo Admin, ini bukti transfer topup RWcoin saya:")}`;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={sukses ? onClose : undefined} />
      <div className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-3xl shadow-2xl" style={{ maxHeight: "92dvh" }}>
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-gray-100">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{sukses ? "Permintaan Terkirim" : "Isi Saldo RWcoin"}</p>
              <h2 className="font-bold text-base">Topup RWcoin</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* SUKSES STATE */}
        {sukses ? (
          <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5 pb-10">
            <div className="text-center space-y-3 mt-2">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-40" />
                <div className="relative w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-600">Permintaan Terkirim!</h3>
                <p className="text-sm text-muted-foreground mt-1">Admin RW03 sudah mendapat notifikasi WA dari sistem</p>
              </div>
            </div>

            <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "hsl(163,55%,96%)" }}>
              <p className="font-semibold text-sm text-[hsl(163,55%,22%)]">Detail Topup</p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Transfer ke</span>
                <span className="font-medium text-foreground">{sukses.metode.label} {sukses.metode.rekening}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Atas nama</span>
                <span>{sukses.metode.atasnama}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2.5">
                <span>Total Transfer</span>
                <span className="text-[hsl(163,55%,22%)]">Rp {sukses.totalTransfer.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 space-y-2">
              <p className="font-semibold text-sm text-amber-800">Langkah selanjutnya:</p>
              <ol className="space-y-1 list-decimal list-inside text-xs text-amber-800">
                <li>Transfer <strong>Rp {sukses.totalTransfer.toLocaleString("id-ID")}</strong> ke {sukses.metode.label} <strong>{sukses.metode.rekening}</strong></li>
                <li>Tap tombol di bawah untuk buka WA admin</li>
                <li>Kirim <strong>foto bukti transfer</strong> di chat WA tersebut</li>
                <li>Admin akan mengaktifkan topup setelah verifikasi</li>
              </ol>
            </div>

            <Button
              className="w-full h-13 text-base font-semibold rounded-2xl gap-2"
              style={{ background: "hsl(37,100%,42%)" }}
              onClick={() => window.open(buktiWaUrl, "_blank")}
            >
              <span className="text-lg">📸</span>
              Kirim Bukti Transfer ke Admin WA
            </Button>
            <Button variant="outline" className="w-full h-11 rounded-2xl" onClick={onClose}>
              Selesai
            </Button>
          </div>
        ) : (
          /* FORM STATE */
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 pb-8">
            {/* Nominal */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Jumlah Topup</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={jumlah}
                onChange={e => setJumlah(e.target.value.replace(/\D/g, ""))}
                className="text-2xl font-bold h-14 border-2 text-center focus:border-[hsl(163,55%,22%)]"
              />
              {nominalAngka > 0 && (
                <p className="text-xs text-center text-muted-foreground">= Rp {nominalAngka.toLocaleString("id-ID")}</p>
              )}
              <div className="grid grid-cols-3 gap-2 mt-1">
                {NOMINAL_PRESET.map(n => (
                  <button
                    key={n}
                    onClick={() => setJumlah(String(n))}
                    className={`py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${nominalAngka === n ? "border-[hsl(163,55%,22%)] bg-[hsl(163,55%,96%)] text-[hsl(163,55%,22%)]" : "border-gray-200 text-muted-foreground"}`}
                  >
                    {n >= 1000 ? `${n / 1000}rb` : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Pilih metode */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Transfer Via</Label>
              <div className="space-y-2">
                {METODE_TRANSFER.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMetodeId(m.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 text-left transition-colors ${metodeId === m.id ? "border-[hsl(163,55%,22%)] bg-[hsl(163,55%,97%)]" : "border-gray-200"}`}
                  >
                    <div>
                      <p className="font-semibold text-sm">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.rekening} · a.n {m.atasnama}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); handleCopy(m.rekening); }}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${metodeId === m.id ? "border-[hsl(163,55%,22%)] bg-[hsl(163,55%,22%)]" : "border-gray-300"}`}>
                        {metodeId === m.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ringkasan */}
            {nominalAngka > 0 && (
              <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "hsl(163,55%,96%)" }}>
                <p className="font-semibold text-sm text-[hsl(163,55%,22%)] mb-1">Ringkasan Transfer</p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Jumlah topup</span><span>Rp {nominalAngka.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Biaya admin</span><span>Rp {ADMIN_FEE.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2.5">
                  <span>Total Transfer</span>
                  <span className="text-[hsl(163,55%,22%)]">Rp {totalTransfer.toLocaleString("id-ID")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">ke {metode.label} {metode.rekening} a.n {metode.atasnama}</p>
              </div>
            )}

            <Button
              className="w-full text-base font-semibold rounded-2xl gap-2"
              style={{
                height: "52px",
                background: kirimMutation.isError ? "hsl(0,72%,51%)" : "hsl(163,55%,22%)",
              }}
              disabled={nominalAngka <= 0 || kirimMutation.isPending}
              onClick={() => kirimMutation.mutate()}
            >
              {kirimMutation.isPending
                ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Mengirim ke admin...</>
                : kirimMutation.isError
                  ? <><AlertCircle className="w-5 h-5 mr-2" />Gagal — Coba Lagi</>
                  : <><span className="text-lg">📨</span>Kirim Permintaan Topup</>}
            </Button>

            {kirimMutation.isError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 -mt-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-700">Gagal mengirim permintaan</p>
                  <p className="text-[11px] text-red-600 mt-0.5 font-mono break-all">
                    {(kirimMutation.error as any)?.message ?? "Error tidak diketahui"}
                  </p>
                </div>
              </div>
            )}

            {!kirimMutation.isError && (
              <p className="text-center text-xs text-muted-foreground -mt-2">
                Admin akan mendapat notifikasi WA otomatis
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ============ TRANSFER MODAL ============
const NOMINAL_TRANSFER_PRESET = [5000, 10000, 25000, 50000, 100000, 200000];

function TransferModal({ wallet, onClose }: { wallet: any; onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "sukses">("form");
  const [kodeWallet, setKodeWallet] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [suksesTx, setSuksesTx] = useState<any>(null);

  const kodeNorm = kodeWallet.trim().toUpperCase();
  const kodeLengkap = kodeNorm.length >= 6 && kodeNorm.startsWith("WG");

  const { data: previewPenerima, isFetching: loadingPreview, error: errorPreview } = useQuery<any>({
    queryKey: ["/api/warga/rwcoin/wallet-preview", kodeNorm],
    queryFn: async () => {
      const res = await fetch(`/api/warga/rwcoin/wallet-preview/${encodeURIComponent(kodeNorm)}`, { credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    enabled: kodeLengkap,
    retry: false,
  });

  const jumlahAngka = parseInt(jumlah) || 0;
  const saldoKurang = jumlahAngka > 0 && jumlahAngka > (wallet?.saldo ?? 0);
  const transferDisabled = !kodeLengkap || !previewPenerima || jumlahAngka < 100 || saldoKurang;

  // Cek kalau kode sendiri
  const kodeSendiri = previewPenerima && previewPenerima.kodeWallet === wallet?.kodeWallet;

  const transferMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/warga/rwcoin/transfer", {
        kodeWalletTujuan: kodeNorm,
        jumlah: jumlahAngka,
        keterangan: keterangan.trim() || undefined,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: (data: any) => {
      setSuksesTx(data);
      setStep("sukses");
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/transaksi"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Transfer Gagal", description: e.message }),
  });

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={step === "sukses" ? onClose : undefined} />
      <div className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-3xl shadow-2xl" style={{ maxHeight: "92dvh" }}>
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-gray-100">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{step === "sukses" ? "Selesai ✓" : "Kirim RWcoin"}</p>
              <h2 className="font-bold text-base leading-tight">{step === "sukses" ? "Transfer Berhasil" : "Transfer RWcoin"}</h2>
            </div>
            {step !== "sukses" && (
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* SUKSES */}
          {step === "sukses" && suksesTx && (
            <div className="p-6 space-y-5 pb-10">
              <div className="text-center space-y-3 mt-2">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-40" />
                  <div className="relative w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-600">Transfer Berhasil!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {suksesTx.namaPenerima} sudah mendapat notifikasi WA
                  </p>
                </div>
              </div>

              <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "hsl(163,55%,96%)" }}>
                <p className="font-semibold text-sm text-[hsl(163,55%,22%)]">Detail Transfer</p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Kepada</span>
                  <span className="font-semibold text-foreground">{suksesTx.namaPenerima}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2.5">
                  <span>Jumlah</span>
                  <span className="text-[hsl(163,55%,22%)] flex items-center gap-1">
                    {formatCoin(suksesTx.jumlah)} <CoinIcon size={18} />
                  </span>
                </div>
                {suksesTx.keterangan && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Keterangan</span>
                    <span className="text-right max-w-[55%]">{suksesTx.keterangan}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>ID Transaksi</span>
                  <span className="font-mono text-xs">{suksesTx.kodeTransaksi}</span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-semibold rounded-2xl"
                style={{ background: "hsl(163,55%,22%)" }}
                onClick={onClose}
              >
                Selesai
              </Button>
            </div>
          )}

          {/* FORM */}
          {step === "form" && (
            <div className="p-5 space-y-4 pb-8">
              {/* Saldo info */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: "hsl(163,55%,96%)" }}>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo tersedia</p>
                  <p className="font-bold text-[hsl(163,55%,22%)] text-lg">{formatCoin(wallet?.saldo ?? 0)} <CoinIcon /></p>
                </div>
                <p className="text-sm text-muted-foreground">{formatRp(wallet?.saldo ?? 0)}</p>
              </div>

              {/* Kode Wallet Tujuan */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Kode Wallet Penerima</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Contoh: WG0012"
                    value={kodeWallet}
                    onChange={e => setKodeWallet(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    className="pl-9 uppercase font-mono border-2 focus:border-[hsl(163,55%,22%)] h-11 tracking-widest"
                    autoFocus
                    maxLength={8}
                  />
                  {loadingPreview && (
                    <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground px-1">
                  Kode wallet warga dimulai dengan WG (contoh: WG0001, WG0012)
                </p>

                {/* Preview penerima */}
                {kodeLengkap && !loadingPreview && previewPenerima && !kodeSendiri && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-50 border-2 border-green-300">
                    <div className="w-9 h-9 rounded-full bg-[hsl(163,55%,22%)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {previewPenerima.namaWarga[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-700">{previewPenerima.namaWarga}</p>
                      <p className="text-xs text-muted-foreground">RT {String(previewPenerima.rt).padStart(2, "0")} · {previewPenerima.kodeWallet}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />
                  </div>
                )}
                {kodeSendiri && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">Tidak bisa transfer ke diri sendiri</p>
                  </div>
                )}
                {kodeLengkap && !loadingPreview && !previewPenerima && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">Kode wallet tidak ditemukan</p>
                  </div>
                )}
              </div>

              {/* Nominal */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Jumlah Transfer</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={jumlah}
                  onChange={e => setJumlah(e.target.value.replace(/\D/g, ""))}
                  className={`text-2xl font-bold h-14 border-2 text-center ${saldoKurang ? "border-red-400" : "focus:border-[hsl(163,55%,22%)]"}`}
                />
                <div className="flex items-center justify-between px-1">
                  {jumlahAngka > 0 ? <p className="text-xs text-muted-foreground">= {formatRp(jumlahAngka)}</p> : <span />}
                  {saldoKurang ? (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3" /> Saldo tidak cukup
                    </div>
                  ) : jumlahAngka > 0 && jumlahAngka < 100 ? (
                    <p className="text-xs text-amber-600">Min. 100 coin</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {NOMINAL_TRANSFER_PRESET.map(n => (
                    <button
                      key={n}
                      onClick={() => setJumlah(String(n))}
                      className={`py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${jumlahAngka === n ? "border-[hsl(163,55%,22%)] bg-[hsl(163,55%,96%)] text-[hsl(163,55%,22%)]" : "border-gray-200 text-muted-foreground"}`}
                    >
                      {n >= 1000 ? `${n / 1000}rb` : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keterangan opsional */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1">
                  Keterangan <span className="font-normal text-muted-foreground text-xs">(opsional)</span>
                </Label>
                <Input
                  placeholder="Contoh: bayar utang, hadiah, dll"
                  value={keterangan}
                  onChange={e => setKeterangan(e.target.value)}
                  className="border-2 focus:border-[hsl(163,55%,22%)]"
                  maxLength={100}
                />
              </div>

              {/* Ringkasan */}
              {previewPenerima && !kodeSendiri && jumlahAngka >= 100 && !saldoKurang && (
                <div className="rounded-2xl p-4 space-y-2" style={{ background: "hsl(163,55%,96%)" }}>
                  <p className="font-semibold text-sm text-[hsl(163,55%,22%)]">Ringkasan Transfer</p>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Kepada</span>
                    <span className="font-medium text-foreground">{previewPenerima.namaWarga}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>Jumlah</span>
                    <span className="text-[hsl(163,55%,22%)] flex items-center gap-1">{formatCoin(jumlahAngka)} <CoinIcon size={16} /></span>
                  </div>
                  {keterangan.trim() && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Keterangan</span>
                      <span className="text-right max-w-[55%] text-xs">{keterangan.trim()}</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full text-base font-semibold rounded-2xl gap-2"
                style={{
                  height: "52px",
                  background: transferMutation.isError ? "hsl(0,72%,51%)" : transferDisabled ? undefined : "hsl(163,55%,22%)",
                }}
                disabled={transferDisabled || transferMutation.isPending}
                onClick={() => transferMutation.mutate()}
              >
                {transferMutation.isPending
                  ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Memproses...</>
                  : transferMutation.isError
                    ? <><AlertCircle className="w-5 h-5 mr-2" />Gagal — Coba Lagi</>
                    : <><SendHorizontal className="w-5 h-5" />Kirim Transfer</>}
              </Button>

              {transferMutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 -mt-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">
                    {(transferMutation.error as any)?.message ?? "Error tidak diketahui"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ============ MAIN PAGE ============
export default function WargaRwcoin() {
  const [showBayar, setShowBayar] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [bayarVoucher, setBayarVoucher] = useState<string | undefined>(undefined);

  const { data: wallet, isLoading: loadingWallet } = useQuery<any>({
    queryKey: ["/api/warga/rwcoin/wallet"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: transaksiList = [] } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/transaksi"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: voucherList = [] } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/voucher"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  return (
    <div className="space-y-4">
      {showBayar && (
        <BayarModal
          wallet={wallet}
          initialVoucherKode={bayarVoucher}
          onClose={() => { setShowBayar(false); setBayarVoucher(undefined); }}
        />
      )}
      {showTopup && <TopupModal wallet={wallet} onClose={() => setShowTopup(false)} />}
      {showTransfer && <TransferModal wallet={wallet} onClose={() => setShowTransfer(false)} />}

      {/* Wallet Card */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(163,55%,18%), hsl(163,55%,30%))" }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -left-6 bottom-0 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-6 h-6" style={{ color: "hsl(40,45%,65%)" }} />
            <p className="font-semibold text-sm opacity-90">Wallet RWcoin</p>
          </div>

          {loadingWallet ? (
            <div className="animate-pulse">
              <div className="h-10 bg-white/20 rounded-lg w-48 mb-2" />
              <div className="h-4 bg-white/10 rounded w-32" />
            </div>
          ) : (
            <>
              <p className="text-sm opacity-70 mb-1">Saldo Tersedia</p>
              <p className="text-4xl font-bold mb-1">{formatCoin(wallet?.saldo ?? 0)} <CoinIcon size={28} /></p>
              <p className="text-sm opacity-70">= {formatRp(wallet?.saldo ?? 0)}</p>
            </>
          )}

          {wallet && (
            <div className="mt-4 pt-3 border-t border-white/20 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] opacity-60">ID: <span className="font-mono font-bold">{wallet.kodeWallet}</span></p>
                <p className="text-[11px] opacity-60 truncate max-w-[140px]">{wallet.namaWarga}</p>
              </div>
              <button
                onClick={() => setShowTopup(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-white/40 bg-white/15 hover:bg-white/25 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Topup Saldo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tombol Aksi */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="py-6 text-sm font-bold gap-2 rounded-2xl shadow-sm flex-col h-auto"
          style={{ background: "linear-gradient(135deg, hsl(163,55%,22%), hsl(163,55%,32%))" }}
          onClick={() => setShowBayar(true)}
          disabled={!wallet || wallet.saldo <= 0}
        >
          <Store className="w-5 h-5" />
          Bayar Mitra
        </Button>
        <Button
          className="py-6 text-sm font-bold gap-2 rounded-2xl shadow-sm flex-col h-auto"
          style={{ background: "linear-gradient(135deg, hsl(40,45%,45%), hsl(40,45%,58%))" }}
          onClick={() => setShowTransfer(true)}
          disabled={!wallet || wallet.saldo <= 0}
        >
          <ArrowLeftRight className="w-5 h-5" />
          Transfer
        </Button>
      </div>
      {wallet?.saldo === 0 && (
        <p className="text-center text-xs text-muted-foreground -mt-2">
          Saldo kosong —{" "}
          <button onClick={() => setShowTopup(true)} className="underline text-[hsl(163,55%,22%)] font-medium">topup sekarang</button>
        </p>
      )}

      {/* Stats */}
      {wallet && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Topup", value: formatCoin(wallet.totalTopup ?? 0), icon: ArrowUpCircle, color: "text-green-600" },
            { label: "Total Belanja", value: formatCoin(wallet.totalBelanja ?? 0), icon: ShoppingBag, color: "text-blue-600" },
            { label: "Transaksi", value: transaksiList.length + " tx", icon: TrendingUp, color: "text-purple-600" },
          ].map((item, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-1`} />
                <p className="text-xs font-bold">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Voucher Aktif */}
      {voucherList.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4" style={{ color: "hsl(40,45%,55%)" }} />
              Voucher Tersedia ({voucherList.length})
            </h3>
            <div className="space-y-2">
              {voucherList.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "hsl(40,45%,96%)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm font-mono" style={{ color: "hsl(40,45%,35%)" }}>{v.kode}</p>
                      {v.berlakuHingga && <p className="text-[11px] text-muted-foreground">s/d {v.berlakuHingga}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">{v.nama}</p>
                    {v.minTransaksi > 0 && <p className="text-[11px] text-muted-foreground">Min {formatCoin(v.minTransaksi)} <CoinIcon /></p>}
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <Badge className="text-white" style={{ backgroundColor: "hsl(40,45%,55%)" }}>
                      {v.tipe === "persen" ? `${v.nilai}% OFF` : <>{formatCoin(v.nilai)} <CoinIcon size={12} /></>}
                    </Badge>
                    <button
                      onClick={() => { setBayarVoucher(v.kode); setShowBayar(true); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ background: "hsl(163,55%,22%)" }}
                    >
                      Pakai
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riwayat Transaksi */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <ShoppingBag className="w-4 h-4 text-[hsl(163,55%,22%)]" />
            Riwayat Transaksi
          </h3>
          <div className="space-y-2">
            {transaksiList.map((t: any) => {
              // Untuk transfer: apakah kita penerima?
              const isTransferMasuk = t.tipe === "transfer" && t.tujuanWargaId != null && t.wargaId !== wallet?.wargaId;
              const isTransferKeluar = t.tipe === "transfer" && !isTransferMasuk;

              let iconBg = "bg-blue-100 text-blue-600";
              let Icon = ShoppingBag;
              let label = t.namaUsaha ?? "Belanja";
              let labelSub: string | null = null;

              if (t.tipe === "topup") {
                iconBg = "bg-green-100 text-green-600"; Icon = ArrowUpCircle; label = "Topup Saldo";
              } else if (isTransferMasuk) {
                iconBg = "bg-emerald-100 text-emerald-600"; Icon = ArrowDownCircle;
                label = "Transfer Masuk"; labelSub = t.namaPengirim ? `dari ${t.namaPengirim}` : null;
              } else if (isTransferKeluar) {
                iconBg = "bg-amber-100 text-amber-600"; Icon = ArrowLeftRight;
                label = "Transfer Keluar"; labelSub = t.namaPenerima ? `ke ${t.namaPenerima}` : null;
              }

              const isPositive = t.tipe === "topup" || isTransferMasuk;

              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      {labelSub && <p className="text-xs text-muted-foreground">{labelSub}</p>}
                      <p className="text-xs text-muted-foreground">{formatTgl(t.createdAt)}</p>
                      {t.voucherKode && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Tag className="w-2.5 h-2.5 text-[hsl(40,45%,55%)]" />
                          <span className="text-[11px]" style={{ color: "hsl(40,45%,40%)" }}>{t.voucherKode}</span>
                        </div>
                      )}
                      {t.keterangan && t.tipe === "transfer" && (
                        <p className="text-[11px] text-muted-foreground italic">"{t.keterangan}"</p>
                      )}
                      <p className="text-[11px] text-muted-foreground font-mono">{t.kodeTransaksi}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isPositive ? "text-green-600" : "text-red-500"}`}>
                      {isPositive ? "+" : "-"}{formatCoin(t.jumlahBayar)} <CoinIcon />
                    </p>
                    {t.jumlahDiskon > 0 && (
                      <p className="text-[11px] text-emerald-600">hemat {formatCoin(t.jumlahDiskon)} <CoinIcon /></p>
                    )}
                  </div>
                </div>
              );
            })}
            {transaksiList.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <Coins className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                <p className="text-xs text-muted-foreground">Tap "Bayar Mitra" atau "Transfer" untuk mulai</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-0 shadow-sm" style={{ backgroundColor: "hsl(163,55%,97%)" }}>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm text-[hsl(163,55%,22%)] mb-2">Cara Bayar RWcoin</h3>
          <ol className="space-y-1.5">
            {[
              "Tap \"Bayar Mitra\" dan pilih toko tujuan",
              "Masukkan nominal coin dan pilih voucher jika ada",
              "Tap Bayar — transaksi langsung selesai, kasir otomatis dapat notifikasi WA",
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-4 h-4 rounded-full bg-[hsl(163,55%,22%)] text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
