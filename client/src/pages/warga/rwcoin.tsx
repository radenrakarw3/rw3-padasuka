import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient, readJsonSafely } from "@/lib/queryClient";
import { useEffect, useState } from "react";
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
  Smartphone, Wifi, Zap, Receipt, Heart, RefreshCw, XCircle, Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { wargaMitraQueryOptions, wargaVoucherQueryOptions, wargaWalletQueryOptions } from "@/lib/warga-prefetch";

function formatCoin(n: number) { return n.toLocaleString("id-ID"); }
function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
function formatTgl(ts: string | null) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function tripayKindLabel(kind: string) {
  if (kind === "electricity") return "Token PLN";
  if (kind === "data") return "Paket Data";
  return "Pulsa";
}

function normalizeTripayOperatorLabel(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  const map: Record<string, string> = {
    pln: "PLN",
    telkomsel: "Telkomsel",
    indosat: "Indosat",
    xl: "XL",
    axis: "AXIS",
    tri: "Tri",
    smartfren: "Smartfren",
    mobile_legends: "Mobile Legends",
    free_fire: "Free Fire",
    pubg: "PUBG",
    point_blank: "Point Blank",
    grab_driver: "Grab Driver",
    call_of_duty: "Call of Duty",
    roblox: "Roblox",
    genshin_impact: "Genshin Impact",
    aov: "AOV",
    google_play: "Google Play",
    steam: "Steam",
    gopay: "GoPay",
    ovo: "OVO",
    dana: "DANA",
    shopeepay: "ShopeePay",
    linkaja: "LinkAja",
  };
  if (map[normalized]) return map[normalized];
  if (/^operator\b/i.test(normalized) || /tidak dikenal/i.test(normalized)) return null;
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function tripayOperatorLabel(product: any) {
  return normalizeTripayOperatorLabel(product?.operatorNormalized)
    || normalizeTripayOperatorLabel(product?.operatorName)
    || product?.categoryName
    || "Tripay";
}

function tripayCategoryLabel(category: any) {
  const rawType = String(category?.type ?? "").toUpperCase();
  const rawName = String(category?.adminLabel || category?.name || "").trim();
  if (rawName) {
    if (rawType === "PLN") return "Token PLN";
    if (rawType === "DATA") return "Paket Data";
    if (rawType === "PULSA") return "Pulsa";
    return rawName;
  }
  if (rawType === "PLN") return "Token PLN";
  if (rawType === "DATA") return "Paket Data";
  if (rawType === "PULSA") return "Pulsa";
  return "Produk Digital";
}

function tripayCategoryKey(category: any) {
  return String(category?.id ?? category?.tripayCategoryId ?? category?.type ?? category?.name ?? "tripay");
}

function tripayCategoryNeedsMeter(category: any) {
  const rawType = String(category?.type ?? "").toUpperCase();
  const rawName = String(category?.name ?? "").toLowerCase();
  return rawType === "PLN" || rawName.includes("pln") || rawName.includes("listrik");
}

function tripayCategoryFriendlyKind(category: any): "pulsa" | "data" | "electricity" | "other" {
  const rawType = String(category?.type ?? "").toUpperCase();
  if (rawType === "PLN") return "electricity";
  if (rawType === "DATA") return "data";
  if (rawType === "PULSA") return "pulsa";
  return "other";
}

function tripayTargetLabel(category: any) {
  const rawType = String(category?.type ?? "").toUpperCase();
  const name = String(category?.name ?? "").toLowerCase();
  if (rawType === "PLN" || name.includes("listrik")) return "Nomor HP kontak";
  if (rawType === "PULSA" || rawType === "DATA") return "Nomor HP tujuan";
  if (name.includes("game")) return "User ID / tujuan";
  if (name.includes("wallet") || name.includes("e-wallet")) return "Nomor akun / tujuan";
  return "Tujuan / ID pelanggan";
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
  const [digits, setDigits] = useState("");
  const [voucherKode, setVoucherKode] = useState(initialVoucherKode ?? "");
  const [suksesTx, setSuksesTx] = useState<any>(null);

  const { data: mitraList = [] } = useQuery<any[]>({
    ...wargaMitraQueryOptions(),
  });

  const { data: voucherList = [] } = useQuery<any[]>({
    ...wargaVoucherQueryOptions(),
  });

  const bayarMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/warga/rwcoin/bayar-langsung", data);
      return await readJsonSafely(res);
    },
    onSuccess: (data: any) => {
      setSuksesTx(data);
      setStep("sukses");
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/transaksi"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const saldo = wallet?.saldo ?? 0;
  const jumlahAngka = parseInt(digits) || 0;
  const saldoKurang = jumlahAngka > saldo;
  const mitraIdStr = String(mitraSelected?.id ?? "");
  const today = new Date().toISOString().split("T")[0];

  const numpadKeysBayar = ["1","2","3","4","5","6","7","8","9","","0","del"];
  function handleNumKeyBayar(k: string) {
    if (k === "del") { setDigits(d => d.slice(0, -1)); }
    else if (digits.length < 8) {
      const next = digits + k;
      if (parseInt(next) <= saldo) setDigits(next);
      else setDigits(String(saldo));
    }
  }
  function addPresetBayar(n: number) { setDigits(String(Math.min(jumlahAngka + n, saldo))); }

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
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={step === "sukses" ? onClose : undefined}
      />

      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 380 }}
        className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-3xl shadow-2xl"
        style={{ maxHeight: "92dvh" }}
      >
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
          <AnimatePresence mode="wait">
          {/* STEP: FORM */}
          {step === "form" && (
            <motion.div
              key="bayar-form"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="p-5 space-y-4 pb-8"
            >
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

              {/* Nominal — amount display */}
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Nominal Bayar</p>
                <motion.div key={digits} initial={{ scale: 0.94 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 24 }}>
                  <p className={`text-5xl font-black tracking-tight ${saldoKurang ? "text-red-500" : jumlahAngka > 0 ? "text-[hsl(163,55%,22%)]" : "text-gray-300"}`}>
                    {formatCoin(jumlahAngka || 0)}
                  </p>
                </motion.div>
                <p className="text-sm text-muted-foreground mt-1">{jumlahAngka > 0 ? formatRp(jumlahAngka) : "Masukkan nominal"}</p>
                {saldoKurang && <p className="text-xs text-red-500 mt-1 flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3 inline" /> Melebihi saldo ({formatCoin(saldo)})</p>}
              </div>

              {/* Quick preset chips */}
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {[5000, 10000, 25000, 50000, 100000].map(n => (
                  <motion.button key={n} whileTap={{ scale: 0.88 }} onClick={() => addPresetBayar(n)} disabled={n > saldo}
                    className="flex-shrink-0 px-4 py-1.5 rounded-full border-2 border-[hsl(163,55%,22%)] text-[hsl(163,55%,22%)] text-xs font-bold disabled:opacity-30 disabled:border-gray-200 disabled:text-gray-400">
                    +{n >= 1000 ? `${n/1000}rb` : n}
                  </motion.button>
                ))}
                {saldo > 0 && (
                  <motion.button whileTap={{ scale: 0.88 }} onClick={() => setDigits(String(saldo))}
                    className="flex-shrink-0 px-4 py-1.5 rounded-full border-2 border-amber-400 text-amber-600 text-xs font-bold">
                    Maks
                  </motion.button>
                )}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {numpadKeysBayar.map((k, idx) => (
                  <motion.button key={idx} whileTap={{ scale: 0.85, backgroundColor: k === "del" ? "#fee2e2" : "#d1fae5" }}
                    onClick={() => k && handleNumKeyBayar(k)} disabled={!k}
                    className={`h-13 rounded-2xl text-xl font-bold select-none transition-colors ${k === "del" ? "bg-red-50 text-red-400 hover:bg-red-100" : !k ? "invisible" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}
                    style={{ height: "52px" }}>
                    {k === "del" ? "⌫" : k}
                  </motion.button>
                ))}
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

              {/* Saldo setelah bayar */}
              <AnimatePresence>
                {mitraSelected && jumlahAngka > 0 && !saldoKurang && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-gray-50"
                  >
                    <div className="flex-1 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo kamu</p>
                      <p className="text-sm font-bold">{formatCoin(saldo)} <CoinIcon /></p>
                    </div>
                    <div className="text-muted-foreground text-sm">→</div>
                    <div className="flex-1 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Setelah bayar</p>
                      <p className="text-sm font-bold text-[hsl(163,55%,22%)]">{formatCoin(saldo - bayarPreview)} <CoinIcon /></p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  className="w-full text-base font-bold rounded-2xl gap-2"
                  style={{ height: "52px", background: "hsl(163,55%,22%)", opacity: (!mitraSelected || jumlahAngka <= 0 || saldoKurang) ? 0.5 : 1 }}
                  disabled={!mitraSelected || jumlahAngka <= 0 || saldoKurang || bayarMutation.isPending}
                  onClick={() => bayarMutation.mutate({ kodeMitra: mitraSelected.kodeWallet, jumlah: jumlahAngka, voucherKode: voucherKode || undefined })}
                >
                  {bayarMutation.isPending
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</>
                    : <>Bayar {jumlahAngka > 0 ? formatCoin(bayarPreview) + " Coin" : "Sekarang"}</>}
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP: SUKSES */}
          {step === "sukses" && suksesTx && (
            <motion.div
              key="bayar-sukses"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="p-6 text-center space-y-5 pb-10"
            >
              {/* Animasi */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 260, delay: 0.1 }}
                className="relative w-28 h-28 mx-auto mt-4"
              >
                <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-50" />
                <div className="absolute inset-2 rounded-full bg-green-100 animate-ping opacity-30" style={{ animationDelay: "0.2s" }} />
                <div className="relative w-28 h-28 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
              </motion.div>
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
            </motion.div>
          )}
          </AnimatePresence>
        </div>{/* end scrollable body */}
      </motion.div>
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
      const data = await readJsonSafely<any>(res);
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
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={sukses ? onClose : undefined}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 380 }}
        className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-3xl shadow-2xl"
        style={{ maxHeight: "92dvh" }}
      >
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

        <div className="flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait">
        {/* SUKSES STATE */}
        {sukses ? (
          <motion.div
            key="topup-sukses"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="p-6 space-y-5 pb-10"
          >
            <div className="text-center space-y-3 mt-2">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 260, delay: 0.1 }}
                className="relative w-24 h-24 mx-auto"
              >
                <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-40" />
                <div className="relative w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              </motion.div>
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
          </motion.div>
        ) : (
          /* FORM STATE */
          <motion.div
            key="topup-form"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="p-5 space-y-4 pb-8"
          >
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
          </motion.div>
        )}
        </AnimatePresence>
        </div>{/* end scrollable body */}
      </motion.div>
    </>
  );
}

// Deteksi provider dari prefix nomor HP Indonesia (Kominfo-compliant)
function detectProvider(phone: string): string | null {
  // Normalisasi: hapus non-digit, konversi 62xxx → 0xxx
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("62")) n = "0" + n.slice(2);
  const p4 = n.slice(0, 4);

  // Telkomsel: Simpati (0812-0813), Kartu AS (0821-0823), Kartu Halo (0811), by.U (0851-0853)
  if (["0811","0812","0813","0821","0822","0823","0851","0852","0853"].includes(p4)) return "Telkomsel";

  // Indosat Ooredoo: IM3 (0814-0816, 0857-0858), Mentari (0856), Matrix (0815)
  if (["0814","0815","0816","0855","0856","0857","0858"].includes(p4)) return "Indosat";

  // XL Axiata: XL (0817-0819, 0877-0878), XLSmart (0859)
  if (["0817","0818","0819","0859","0877","0878"].includes(p4)) return "XL";

  // AXIS (anak usaha XL, prefix terpisah)
  if (["0831","0832","0833","0838"].includes(p4)) return "AXIS";

  // Tri / 3 Indonesia (Hutchison)
  if (["0895","0896","0897","0898","0899"].includes(p4)) return "Tri";

  // Smartfren (0881-0889)
  if (["0881","0882","0883","0884","0885","0886","0887","0888","0889"].includes(p4)) return "Smartfren";

  return null;
}

// Cocokkan produk Tripay (operator name + product code + product name) dengan provider yang terdeteksi
function matchProductByProvider(product: any, provider: string): boolean {
  const op   = String(product?.operatorNormalized ?? product?.operatorName ?? "").toLowerCase().trim();
  const code = (product?.productCode ?? "").toLowerCase();
  const name = (product?.productName ?? "").toLowerCase();
  const pv   = provider.toLowerCase();

  if (pv === "telkomsel") {
    const inOp   = op.includes("telkomsel") || op.includes("simpati") || op.includes("kartu as")
      || op.includes("kartu halo") || op.includes("by.u") || op.includes("byu") || op === "halo";
    const inCode = code.startsWith("tsel") || code.startsWith("simpati") || code.startsWith("halo")
      || code.startsWith("byu") || code.startsWith("byu") || code.startsWith("as");
    const inName = name.includes("telkomsel") || name.includes("simpati") || name.includes("by.u")
      || name.includes("kartu as") || name.includes("halo");
    return inOp || inCode || inName;
  }
  if (pv === "indosat") {
    const inOp   = op.includes("indosat") || op.includes("im3") || op.includes("ooredoo")
      || op.includes("mentari") || op.includes("matrix");
    const inCode = code.startsWith("isat") || code.startsWith("im3") || code.startsWith("indosat")
      || code.startsWith("mentari") || code.startsWith("matrix");
    const inName = name.includes("indosat") || name.includes("im3") || name.includes("ooredoo")
      || name.includes("mentari");
    return inOp || inCode || inName;
  }
  if (pv === "xl") {
    const inOp   = (op.includes("xl") && !op.includes("axis")) || op.includes("xtra")
      || op.includes("xlsmart") || op.includes("xl smart");
    const inCode = (code.startsWith("xl") && !code.startsWith("xld") && !code.startsWith("xls")) // hindari axis
      || code.startsWith("xtra");
    const inName = (name.includes("xl") && !name.includes("axis")) || name.includes("xlsmart")
      || name.includes("xtra");
    return inOp || inCode || inName;
  }
  if (pv === "axis") {
    const inOp   = op.includes("axis");
    const inCode = code.startsWith("axis");
    const inName = name.includes("axis");
    return inOp || inCode || inName;
  }
  if (pv === "tri") {
    const inOp   = /\btri\b/.test(op) || op === "3" || op.includes("three")
      || op.includes("3 indonesia") || op.includes("hutchison") || op.includes("hutch");
    const inCode = code.startsWith("tri") || code.startsWith("three") || code.startsWith("h3")
      || code.startsWith("3id") || code.includes("_tri") || code.includes("-tri");
    const inName = /\btri\b/.test(name) || name.includes("three") || name.includes("hutchison")
      || name.startsWith("3 ");
    return inOp || inCode || inName;
  }
  if (pv === "smartfren") {
    const inOp   = op.includes("smartfren") || op.includes("smart");
    const inCode = code.startsWith("sf") || code.startsWith("smartfren") || code.startsWith("smart");
    const inName = name.includes("smartfren");
    return inOp || inCode || inName;
  }
  return false;
}

// Alias backward-compat untuk filter chip (hanya cek operator name)
function matchOperatorByProvider(operatorName: string, provider: string): boolean {
  return matchProductByProvider({ operatorName }, provider);
}

type TripayRecentTarget = {
  categoryKey: string;
  target: string;
  noMeterPln?: string;
};

const TRIPAY_RECENT_TARGETS_KEY = "rwcoin_tripay_recent_targets";

function readRecentTripayTargets(): TripayRecentTarget[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRIPAY_RECENT_TARGETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => ({
      categoryKey: String(item?.categoryKey ?? item?.kind ?? "legacy"),
      target: String(item?.target ?? ""),
      noMeterPln: item?.noMeterPln ? String(item.noMeterPln) : undefined,
    })).filter((item) => item.target) : [];
  } catch {
    return [];
  }
}

function saveRecentTripayTarget(entry: TripayRecentTarget) {
  if (typeof window === "undefined") return;
  const current = readRecentTripayTargets();
  const next = [
    entry,
    ...current.filter((item) => !(item.categoryKey === entry.categoryKey && item.target === entry.target && (item.noMeterPln ?? "") === (entry.noMeterPln ?? ""))),
  ].slice(0, 6);
  window.localStorage.setItem(TRIPAY_RECENT_TARGETS_KEY, JSON.stringify(next));
}

function ResultScreen({ result: initialResult, onClose }: { result: any; onClose: () => void }) {
  const { toast } = useToast();
  const [result, setResult] = useState(initialResult);
  const [checking, setChecking] = useState(false);

  const isPending  = result.status === "pending";
  const isSuccess  = result.status === "success";
  const isRefunded = result.status === "refunded";

  async function cekStatus() {
    setChecking(true);
    try {
      const res = await apiRequest("POST", "/api/warga/rwcoin/tripay/cek-status", { reference: result.reference });
      const data = await readJsonSafely<any>(res);
      setResult(data);
      if (data.status === "success") {
        queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/transaksi"] });
        queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/tripay/transaksi"] });
        toast({ title: "Transaksi berhasil", description: "Produk sudah dikirim." });
      } else if (data.status === "refunded") {
        queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/transaksi"] });
        toast({ variant: "destructive", title: "Transaksi gagal", description: "Saldo sudah dikembalikan." });
      } else {
        toast({ title: "Masih diproses", description: "Tripay belum menyelesaikan transaksi ini." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal cek status", description: e.message });
    } finally {
      setChecking(false);
    }
  }

  const statusConfig = isSuccess
    ? { icon: CheckCircle2, iconClass: "bg-green-100 text-green-600", title: "Transaksi Sukses", desc: "Produk digital sudah dikirim." }
    : isRefunded
    ? { icon: XCircle, iconClass: "bg-red-100 text-red-500", title: "Transaksi Gagal", desc: "Saldo sudah dikembalikan ke wallet Anda." }
    : { icon: Clock, iconClass: "bg-amber-100 text-amber-500", title: "Sedang Diproses", desc: "Tripay sedang memproses pesanan ini." };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-5 space-y-4 pb-8">
      <div className="text-center space-y-2 mt-2">
        <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${statusConfig.iconClass}`}>
          <StatusIcon className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold">{statusConfig.title}</h3>
        <p className="text-sm text-muted-foreground">{statusConfig.desc}</p>
      </div>

      <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "hsl(163,55%,96%)" }}>
        <div className="flex justify-between text-sm"><span>Produk</span><span className="font-semibold text-right max-w-[60%]">{result.productName}</span></div>
        <div className="flex justify-between text-[11px] text-muted-foreground"><span>SKU</span><span className="font-mono">{result.productCode}</span></div>
        <div className="flex justify-between text-sm"><span>Tujuan</span><span>{result.target}</span></div>
        {result.noMeterPln && <div className="flex justify-between text-sm"><span>No Meter</span><span>{result.noMeterPln}</span></div>}
        <div className="flex justify-between text-sm"><span>Status</span>
          <span className={`font-semibold ${isSuccess ? "text-green-600" : isRefunded ? "text-red-500" : "text-amber-600"}`}>
            {isSuccess ? "Sukses" : isRefunded ? "Refunded" : "Pending"}
          </span>
        </div>
        <div className="flex justify-between text-sm font-bold border-t pt-2.5"><span>Dipotong RWcoin</span><span>{formatCoin(result.hargaJual ?? 0)} <CoinIcon /></span></div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>Ref</span><span className="font-mono text-[10px]">{result.reference}</span></div>
        {result.serialNumber && <p className="text-xs text-green-700 font-mono break-all">SN/Token: {result.serialNumber}</p>}
        {result.note && !isSuccess && <p className="text-[11px] text-muted-foreground border-t pt-2">{result.note}</p>}
      </div>

      {isPending && (
        <Button
          variant="outline"
          className="w-full h-11 rounded-2xl border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={cekStatus}
          disabled={checking}
        >
          {checking ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Mengecek...</> : <><RefreshCw className="w-4 h-4 mr-2" />Cek Status Terbaru</>}
        </Button>
      )}

      <Button className="w-full h-12 rounded-2xl" style={{ background: "hsl(163,55%,22%)" }} onClick={onClose}>
        Selesai
      </Button>
    </div>
  );
}

function TripayModal({ wallet, onClose, initialKind = "pulsa" }: { wallet: any; onClose: () => void; initialKind?: "pulsa" | "data" | "electricity" }) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedOperator, setSelectedOperator] = useState<any>(null);
  const [target, setTarget] = useState("");
  const [noMeterPln, setNoMeterPln] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState<"browse" | "confirm">("browse");
  const [recentTargets, setRecentTargets] = useState<TripayRecentTarget[]>([]);

  const { data: categories = [], isLoading: loadingCategories } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/tripay/catalog/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: operators = [], isLoading: loadingOperators } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/tripay/catalog/operators", selectedCategory?.id],
    enabled: Boolean(selectedCategory?.id),
    queryFn: async () => {
      const res = await fetch(`/api/warga/rwcoin/tripay/catalog/operators?categoryId=${encodeURIComponent(String(selectedCategory.id))}`, { credentials: "include" });
      if (!res.ok) {
        const err = await readJsonSafely<any>(res);
        throw new Error(err.message);
      }
      return readJsonSafely(res);
    },
  });

  useEffect(() => {
    setRecentTargets(readRecentTripayTargets());
  }, []);

  useEffect(() => {
    if (!categories.length || selectedCategory) return;
    const matched = categories.find((category: any) => tripayCategoryFriendlyKind(category) === initialKind);
    setSelectedCategory(matched ?? categories[0]);
  }, [categories, selectedCategory, initialKind]);

  useEffect(() => {
    setSelectedOperator(null);
    setSelected(null);
    setTarget("");
    setNoMeterPln("");
    setStep("browse");
  }, [selectedCategory?.id]);

  useEffect(() => {
    setSelected(null);
    setStep("browse");
  }, [selectedOperator?.id]);

  const { data: products = [], isLoading: loadingProducts } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/tripay/catalog/products", selectedCategory?.id, selectedOperator?.id ?? "none"],
    enabled: Boolean(selectedCategory?.id),
    queryFn: async () => {
      const params = new URLSearchParams({ categoryId: String(selectedCategory.id) });
      if (selectedOperator?.id) params.set("operatorId", String(selectedOperator.id));
      const res = await fetch(`/api/warga/rwcoin/tripay/catalog/products?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const err = await readJsonSafely<any>(res);
        throw new Error(err.message);
      }
      return readJsonSafely(res);
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/warga/rwcoin/tripay/checkout", {
        productCode: selected?.productCode,
        target,
        noMeterPln: tripayCategoryNeedsMeter(selectedCategory) ? noMeterPln : undefined,
      });
      return readJsonSafely(res);
    },
    onSuccess: (data: any) => {
      saveRecentTripayTarget({
        categoryKey: tripayCategoryKey(selectedCategory),
        target,
        noMeterPln: tripayCategoryNeedsMeter(selectedCategory) ? noMeterPln : undefined,
      });
      setRecentTargets(readRecentTripayTargets());
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/transaksi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/tripay/transaksi"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Transaksi gagal", description: e.message }),
  });

  const categoryKind = tripayCategoryFriendlyKind(selectedCategory);
  const categoryNeedsMeter = tripayCategoryNeedsMeter(selectedCategory);
  const telcoCategory = categoryKind === "pulsa" || categoryKind === "data";
  const saldo = wallet?.saldo ?? 0;
  const hargaJual = selected?.hargaJual ?? 0;
  const saldoKurang = hargaJual > saldo;
  const targetMinLength = telcoCategory || categoryNeedsMeter ? 10 : 4;
  const targetValid = target.trim().length >= targetMinLength;
  const meterValid = !categoryNeedsMeter || noMeterPln.trim().length >= 8;
  const canSubmit = selected && targetValid && meterValid && !saldoKurang;
  const recentTargetsForCategory = recentTargets.filter((item) => item.categoryKey === tripayCategoryKey(selectedCategory)).slice(0, 3);
  const detectedProvider = telcoCategory && target.length >= 4 ? detectProvider(target) : null;

  useEffect(() => {
    if (!detectedProvider || !operators.length || selectedOperator) return;
    const matched = operators.find((operator: any) => matchOperatorByProvider(operator.name, detectedProvider));
    if (matched) setSelectedOperator(matched);
  }, [detectedProvider, operators, selectedOperator]);

  const filteredProducts = !targetValid || !selectedCategory
    ? []
    : [...products].filter((product: any) => {
      if (!telcoCategory || !detectedProvider || selectedOperator) return true;
      return matchProductByProvider(product, detectedProvider);
    }).sort((a: any, b: any) => {
    const featuredDelta = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
    if (featuredDelta !== 0) return featuredDelta;
    const recommendedDelta = Number(Boolean(b.isRecommended)) - Number(Boolean(a.isRecommended));
    if (recommendedDelta !== 0) return recommendedDelta;
    const salesDelta = (b.salesCount ?? 0) - (a.salesCount ?? 0);
    if (salesDelta !== 0) return salesDelta;
    return (a.hargaJual ?? 0) - (b.hargaJual ?? 0);
  });

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/50" onClick={result ? onClose : undefined} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 380 }}
        className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-3xl shadow-2xl"
        style={{ maxHeight: "94dvh" }}
      >
        <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-gray-100">
          <div className="flex justify-center mb-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{result ? "Pesanan Tercatat" : "Beli Produk Digital"}</p>
              <h2 className="font-bold text-base">Tripay dengan RWcoin</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {result ? (
            <ResultScreen result={result} onClose={onClose} />
          ) : (
            <div className="p-5 space-y-4 pb-8">
              {/* Saldo */}
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-muted-foreground">Saldo tersedia</p>
                <p className="text-sm font-bold">{formatCoin(saldo)} <CoinIcon /></p>
              </div>

              {!result && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
                    <span className={`flex-1 rounded-full px-2.5 py-1 text-center ${step === "browse" ? "bg-[hsl(163,55%,22%)] text-white" : "bg-white border border-gray-200"}`}>
                      1. Isi tujuan & pilih produk
                    </span>
                    <span className={`flex-1 rounded-full px-2.5 py-1 text-center ${step === "confirm" ? "bg-[hsl(163,55%,22%)] text-white" : "bg-white border border-gray-200"}`}>
                      2. Konfirmasi & bayar
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {categories.map((category: any) => {
                  const kind = tripayCategoryFriendlyKind(category);
                  const Icon = kind === "electricity" ? Zap : kind === "data" ? Wifi : kind === "pulsa" ? Smartphone : Receipt;
                  return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-2xl border-2 px-3 py-3 text-left transition-colors ${selectedCategory?.id === category.id ? "border-[hsl(163,55%,22%)] bg-[hsl(163,55%,96%)] text-[hsl(163,55%,22%)]" : "border-gray-200 text-muted-foreground"}`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <p className="text-xs font-semibold">{tripayCategoryLabel(category)}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{category.productCount ?? 0} produk</p>
                  </button>
                )})}
              </div>

              {step === "browse" ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{tripayTargetLabel(selectedCategory)}</Label>
                    <div className="relative">
                      <Input
                        value={target}
                        onChange={e => { setTarget(e.target.value.replace(/[^0-9]/g, "")); setSelected(null); }}
                        placeholder={telcoCategory || categoryNeedsMeter ? "08xxxxxxxxxx" : "Masukkan tujuan / user ID"}
                        inputMode="numeric"
                        maxLength={20}
                        className="h-12 text-base font-mono pr-24"
                        autoFocus
                      />
                      {target.length >= 4 && detectedProvider && telcoCategory && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded-full bg-[hsl(163,55%,96%)] text-[hsl(163,55%,22%)]">
                          {detectedProvider}
                        </span>
                      )}
                      {target.length >= 4 && !detectedProvider && telcoCategory && target.length < targetMinLength && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">mendeteksi...</span>
                      )}
                    </div>
                    {target.length > 0 && target.length < targetMinLength && (
                      <p className="text-[11px] text-amber-600">Masukkan minimal {targetMinLength} karakter</p>
                    )}
                    {telcoCategory && (
                      <p className="text-[11px] text-muted-foreground">Nomor ini akan dipakai untuk mengirim pulsa atau paket data.</p>
                    )}
                  </div>

                  {recentTargetsForCategory.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-muted-foreground">Target terakhir</p>
                      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                        {recentTargetsForCategory.map((item, idx) => (
                          <button
                            key={`${item.categoryKey}-${item.target}-${item.noMeterPln ?? idx}`}
                            onClick={() => {
                              setTarget(item.target);
                              setNoMeterPln(item.noMeterPln ?? "");
                              setSelected(null);
                              setStep("browse");
                            }}
                            className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
                          >
                            {item.target}{item.noMeterPln ? ` · ${item.noMeterPln}` : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {categoryNeedsMeter && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">No Meter / ID Pelanggan PLN</Label>
                      <Input
                        value={noMeterPln}
                        onChange={e => { setNoMeterPln(e.target.value.replace(/[^0-9]/g, "")); setSelected(null); }}
                        placeholder="Contoh: 12345678901"
                        inputMode="numeric"
                        maxLength={14}
                        className="h-12 text-base font-mono"
                      />
                      {noMeterPln.length > 0 && noMeterPln.length < 8 && (
                        <p className="text-[11px] text-amber-600">Minimal 8 digit</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">Pastikan ID pelanggan benar karena token akan dikirim ke meter tersebut.</p>
                    </div>
                  )}

                  {!targetValid && target.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <Smartphone className="w-10 h-10 text-gray-200" />
                      <p className="text-sm text-muted-foreground">
                        {categoryNeedsMeter
                          ? "Masukkan nomor kontak dan nomor meter untuk melihat pilihan produk"
                          : "Masukkan tujuan untuk melihat pilihan produk"}
                      </p>
                    </div>
                  )}

                  {loadingCategories && (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  )}

                  {operators.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Operator</Label>
                      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                        <button
                          onClick={() => { setSelectedOperator(null); setSelected(null); }}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${!selectedOperator ? "bg-[hsl(163,55%,22%)] text-white border-[hsl(163,55%,22%)]" : "bg-white text-muted-foreground border-gray-200"}`}
                        >
                          Semua
                        </button>
                        {operators.map((operator: any) => (
                          <button
                            key={operator.id}
                            onClick={() => { setSelectedOperator(operator); setSelected(null); }}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selectedOperator?.id === operator.id ? "bg-[hsl(163,55%,22%)] text-white border-[hsl(163,55%,22%)]" : "bg-white text-muted-foreground border-gray-200"}`}
                          >
                            {operator.name}
                          </button>
                        ))}
                      </div>
                      {loadingOperators && <p className="text-[11px] text-muted-foreground">Memuat operator...</p>}
                    </div>
                  )}

                  {targetValid && meterValid && loadingProducts && (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  )}

                  {targetValid && meterValid && !loadingProducts && filteredProducts.length === 0 && (
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
                      <p className="text-sm font-semibold text-amber-800">Belum ada produk aktif untuk pilihan ini</p>
                      <p className="text-xs text-amber-600 mt-1">Coba ganti operator atau hubungi admin untuk mengaktifkan kategori ini.</p>
                    </div>
                  )}

                  {targetValid && meterValid && !loadingProducts && filteredProducts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-0.5">
                        <p className="text-sm font-semibold">
                          {selectedOperator?.name ? `Produk ${selectedOperator.name}` : selectedCategory ? tripayCategoryLabel(selectedCategory) : "Pilih produk"}
                        </p>
                        <p className="text-xs text-muted-foreground">{filteredProducts.length} pilihan</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {filteredProducts.map((product: any) => (
                          <button
                            key={product.id}
                            onClick={() => setSelected(selected?.id === product.id ? null : product)}
                            className={`rounded-2xl border-2 p-3 text-left transition-all ${selected?.id === product.id ? "border-[hsl(163,55%,22%)] bg-[hsl(163,55%,97%)] shadow-sm" : "border-gray-200 bg-white"}`}
                          >
                            <p className="text-[9px] font-mono text-muted-foreground/60 mb-0.5 truncate">{product.productCode}</p>
                            <div className="flex items-center gap-1 flex-wrap mb-1">
                              {product.isFeatured && <Badge className="h-4 text-[9px] bg-amber-100 text-amber-700">Unggulan</Badge>}
                              {product.isRecommended && <Badge className="h-4 text-[9px] bg-sky-100 text-sky-700">Rekomendasi</Badge>}
                              {(product.salesCount ?? 0) > 0 && <Badge variant="outline" className="h-4 text-[9px]">Terlaris</Badge>}
                            </div>
                            <p className="text-xs font-semibold line-clamp-2 leading-snug">{product.productName}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{product.operatorName || product.categoryName || "Tripay"}</p>
                            <p className="text-xs font-bold text-[hsl(163,55%,22%)] mt-2">{formatCoin(product.hargaJual)} <CoinIcon size={12} /></p>
                            <p className="text-[10px] text-muted-foreground">{formatRp(product.hargaJual)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ringkasan pilihan */}
                  {selected && (
                    <div className="rounded-2xl p-4 border border-green-200 bg-green-50 space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span>Produk</span><span className="font-semibold text-right max-w-[60%]">{selected.productName}</span></div>
                        <div className="flex justify-between text-[11px] text-muted-foreground"><span>SKU</span><span className="font-mono">{selected.productCode}</span></div>
                        <div className="flex justify-between text-sm"><span>Tujuan</span><span className="font-mono">{target}</span></div>
                        {noMeterPln && <div className="flex justify-between text-sm"><span>No Meter</span><span className="font-mono">{noMeterPln}</span></div>}
                        <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Bayar</span><span className="text-[hsl(163,55%,22%)]">{formatCoin(selected.hargaJual)} <CoinIcon /></span></div>
                        <div className="flex justify-between text-[11px] text-muted-foreground"><span>Sisa saldo</span><span>{formatCoin(Math.max(0, saldo - selected.hargaJual))} <CoinIcon size={11} /></span></div>
                      </div>
                      {saldoKurang ? (
                        <p className="text-xs text-red-600 font-medium">Saldo tidak cukup untuk produk ini.</p>
                      ) : (
                        <Button
                          className="w-full h-11 rounded-2xl text-sm font-semibold"
                          style={{ background: "hsl(163,55%,22%)" }}
                          onClick={() => setStep("confirm")}
                        >
                          Lanjut ke konfirmasi
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Ringkasan pesanan</p>
                        <p className="font-semibold">{selected?.productName}</p>
                      </div>
                      <button
                        onClick={() => setStep("browse")}
                        className="text-xs font-medium text-[hsl(163,55%,22%)] hover:underline"
                      >
                        Ubah
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Kategori</span><span>{selectedCategory ? tripayCategoryLabel(selectedCategory) : "Tripay"}</span></div>
                      {selectedOperator && <div className="flex justify-between"><span>Operator</span><span>{selectedOperator.name}</span></div>}
                      <div className="flex justify-between"><span>Tujuan</span><span className="font-mono">{target}</span></div>
                      {noMeterPln && <div className="flex justify-between"><span>No Meter</span><span className="font-mono">{noMeterPln}</span></div>}
                      {detectedProvider && telcoCategory && (
                        <div className="flex justify-between"><span>Operator</span><span>{detectedProvider}</span></div>
                      )}
                      <div className="flex justify-between text-[11px] text-muted-foreground"><span>SKU</span><span className="font-mono">{selected?.productCode}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <p className="text-sm font-semibold text-amber-800">Cek lagi sebelum bayar</p>
                    <p className="text-xs text-amber-700">Pastikan nomor tujuan dan nomor meter benar. Setelah diproses, pesanan digital umumnya tidak bisa dibatalkan.</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2.5">
                    <div className="flex justify-between text-sm"><span>Harga produk</span><span>{formatCoin(hargaJual)} <CoinIcon /></span></div>
                    <div className="flex justify-between text-sm"><span>Saldo saat ini</span><span>{formatCoin(saldo)} <CoinIcon /></span></div>
                    <div className="flex justify-between text-sm font-bold border-t pt-2.5"><span>Sisa saldo setelah bayar</span><span>{formatCoin(Math.max(0, saldo - hargaJual))} <CoinIcon /></span></div>
                  </div>

                  {saldoKurang && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-600">Saldo tidak cukup. Silakan kembali dan pilih nominal lain atau topup terlebih dahulu.</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-2xl"
                      onClick={() => setStep("browse")}
                    >
                      Kembali
                    </Button>
                    <Button
                      className="flex-[1.4] h-12 rounded-2xl text-base font-semibold shadow-sm"
                      style={{ background: "hsl(163,55%,22%)" }}
                      disabled={!canSubmit || mutation.isPending}
                      onClick={() => mutation.mutate()}
                    >
                      {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Memproses...</> : "Bayar sekarang"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ============ TRANSFER MODAL ============
function TransferModal({ wallet, onClose }: { wallet: any; onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "sukses">("form");
  const [kodeWallet, setKodeWallet] = useState("");
  const [digits, setDigits] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [suksesTx, setSuksesTx] = useState<any>(null);

  const kodeNorm = kodeWallet.trim().toUpperCase();
  const kodeLengkap = kodeNorm.length >= 6 && kodeNorm.startsWith("WG");
  const jumlahAngka = parseInt(digits) || 0;
  const saldo = wallet?.saldo ?? 0;
  const saldoKurang = jumlahAngka > saldo;

  const { data: previewPenerima, isFetching: loadingPreview } = useQuery<any>({
    queryKey: ["/api/warga/rwcoin/wallet-preview", kodeNorm],
    queryFn: async () => {
      const res = await fetch(`/api/warga/rwcoin/wallet-preview/${encodeURIComponent(kodeNorm)}`, { credentials: "include" });
      if (!res.ok) {
        const e = await readJsonSafely<any>(res);
        throw new Error(e.message);
      }
      return readJsonSafely(res);
    },
    enabled: kodeLengkap,
    retry: false,
  });

  const isSendiri = previewPenerima?.kodeWallet === wallet?.kodeWallet;
  const transferDisabled = !kodeLengkap || !previewPenerima || isSendiri || jumlahAngka < 100 || saldoKurang;

  function handleNumKey(k: string) {
    if (k === "del") {
      setDigits(d => d.slice(0, -1));
    } else if (digits.length < 8) {
      const next = digits + k;
      if (parseInt(next) <= saldo) setDigits(next);
      else setDigits(String(saldo));
    }
  }
  function addPreset(n: number) {
    setDigits(String(Math.min(jumlahAngka + n, saldo)));
  }

  const transferMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/warga/rwcoin/transfer", {
        kodeWalletTujuan: kodeNorm,
        jumlah: jumlahAngka,
        keterangan: keterangan.trim() || undefined,
      });
      return readJsonSafely(res);
    },
    onSuccess: (data: any) => {
      setSuksesTx(data);
      setStep("sukses");
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/transaksi"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Transfer Gagal", description: e.message }),
  });

  const numpadKeys = ["1","2","3","4","5","6","7","8","9","","0","del"];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/60"
        onClick={step === "sukses" ? onClose : undefined}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 340 }}
        className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-3xl shadow-2xl"
        style={{ maxHeight: "96dvh" }}
      >
        {/* Handle + header row */}
        <div className="flex-shrink-0 px-5 pt-3 pb-2">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">{step === "sukses" ? "Transfer Berhasil" : "Transfer RWcoin"}</h2>
            {step !== "sukses" && (
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* SUKSES */}
          {step === "sukses" && suksesTx && (
            <motion.div
              key="transfer-sukses"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5 pb-10"
            >
              <div className="text-center space-y-3 mt-4">
                <motion.div
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 11, stiffness: 180, delay: 0.08 }}
                  className="relative w-28 h-28 mx-auto"
                >
                  <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-40" />
                  <div className="relative w-28 h-28 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle2 className="w-14 h-14" />
                  </div>
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold text-green-600">Terkirim!</h3>
                  <p className="text-sm text-muted-foreground mt-1">{suksesTx.namaPenerima} sudah dapat notifikasi WA</p>
                </div>
              </div>
              <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "hsl(163,55%,96%)" }}>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Kepada</span>
                  <span className="font-semibold text-foreground">{suksesTx.namaPenerima}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2.5">
                  <span>Jumlah</span>
                  <span className="text-[hsl(163,55%,22%)] flex items-center gap-1">{formatCoin(suksesTx.jumlah)} <CoinIcon size={18} /></span>
                </div>
                {suksesTx.keterangan && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Keterangan</span><span className="text-right max-w-[55%]">{suksesTx.keterangan}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>ID</span><span className="font-mono">{suksesTx.kodeTransaksi}</span>
                </div>
              </div>
              <Button className="w-full h-12 text-base font-semibold rounded-2xl" style={{ background: "hsl(163,55%,22%)" }} onClick={onClose}>
                Selesai
              </Button>
            </motion.div>
          )}

          {/* FORM — numpad layout */}
          {step === "form" && (
            <motion.div
              key="transfer-form"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex-1 overflow-y-auto overscroll-contain"
            >
              {/* Penerima input */}
              <div className="px-5 pb-3">
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Kode wallet penerima: WG0001"
                    value={kodeWallet}
                    onChange={e => setKodeWallet(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    className="pl-9 uppercase font-mono border-2 focus:border-[hsl(163,55%,22%)] h-11 tracking-widest"
                    autoFocus
                    maxLength={8}
                  />
                  {loadingPreview && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                <AnimatePresence>
                  {kodeLengkap && !loadingPreview && previewPenerima && !isSendiri && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 8 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-50 border-2 border-green-300 overflow-hidden"
                    >
                      <div className="w-9 h-9 rounded-full bg-[hsl(163,55%,22%)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {previewPenerima.namaWarga?.[0] ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-green-700">{previewPenerima.namaWarga}</p>
                        <p className="text-xs text-muted-foreground">RT {String(previewPenerima.rt).padStart(2,"0")} · {previewPenerima.kodeWallet}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    </motion.div>
                  )}
                  {isSendiri && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600">Tidak bisa transfer ke diri sendiri</p>
                    </motion.div>
                  )}
                  {kodeLengkap && !loadingPreview && !previewPenerima && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600">Kode wallet tidak ditemukan</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Amount display */}
              <div className="px-5 py-5 text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Jumlah Transfer</p>
                <motion.div
                  key={digits}
                  initial={{ scale: 0.94 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                >
                  <p className={`text-5xl font-black tracking-tight ${saldoKurang ? "text-red-500" : jumlahAngka > 0 ? "text-[hsl(163,55%,22%)]" : "text-gray-300"}`}>
                    {formatCoin(jumlahAngka || 0)}
                  </p>
                </motion.div>
                <p className="text-sm text-muted-foreground mt-1">{jumlahAngka > 0 ? formatRp(jumlahAngka) : "Masukkan jumlah"}</p>
                {saldoKurang && (
                  <p className="text-xs text-red-500 mt-1 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Melebihi saldo ({formatCoin(saldo)})
                  </p>
                )}
                {jumlahAngka > 0 && jumlahAngka < 100 && (
                  <p className="text-xs text-amber-500 mt-1">Min. 100 coin</p>
                )}
              </div>

              {/* Quick preset chips */}
              <div className="flex gap-2 px-5 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {[5000, 10000, 25000, 50000, 100000].map(n => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => addPreset(n)}
                    disabled={n > saldo}
                    className="flex-shrink-0 px-4 py-1.5 rounded-full border-2 border-[hsl(163,55%,22%)] text-[hsl(163,55%,22%)] text-xs font-bold disabled:opacity-30 disabled:border-gray-200 disabled:text-gray-400"
                  >
                    +{n >= 1000 ? `${n/1000}rb` : n}
                  </motion.button>
                ))}
                {saldo > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setDigits(String(saldo))}
                    className="flex-shrink-0 px-4 py-1.5 rounded-full border-2 border-amber-400 text-amber-600 text-xs font-bold"
                  >
                    Maks
                  </motion.button>
                )}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2.5 px-5 pb-3">
                {numpadKeys.map((k, idx) => (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.85, backgroundColor: k === "del" ? "#fee2e2" : "#d1fae5" }}
                    onClick={() => k && handleNumKey(k)}
                    disabled={!k}
                    className={`h-14 rounded-2xl text-xl font-bold select-none transition-colors ${
                      k === "del" ? "bg-red-50 text-red-400 hover:bg-red-100" :
                      !k ? "invisible" :
                      "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {k === "del" ? "⌫" : k}
                  </motion.button>
                ))}
              </div>

              {/* Saldo setelah + keterangan + CTA */}
              <div className="px-5 pb-8 space-y-3">
                <AnimatePresence>
                  {jumlahAngka >= 100 && previewPenerima && !isSendiri && !saldoKurang && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-gray-50"
                    >
                      <div className="flex-1 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo kamu</p>
                        <p className="text-sm font-bold">{formatCoin(saldo)} <CoinIcon /></p>
                      </div>
                      <div className="text-muted-foreground">→</div>
                      <div className="flex-1 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Setelah kirim</p>
                        <p className="text-sm font-bold text-[hsl(163,55%,22%)]">{formatCoin(saldo - jumlahAngka)} <CoinIcon /></p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Input
                  placeholder="Keterangan: bayar utang, hadiah... (opsional)"
                  value={keterangan}
                  onChange={e => setKeterangan(e.target.value)}
                  className="border-2 focus:border-[hsl(163,55%,22%)] text-sm"
                  maxLength={100}
                />

                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    className="w-full text-base font-bold rounded-2xl gap-2"
                    style={{ height: "52px", background: transferMutation.isError ? "hsl(0,72%,51%)" : "hsl(163,55%,22%)", opacity: transferDisabled ? 0.5 : 1 }}
                    disabled={transferDisabled || transferMutation.isPending}
                    onClick={() => transferMutation.mutate()}
                  >
                    {transferMutation.isPending
                      ? <><Loader2 className="w-5 h-5 animate-spin" />Memproses...</>
                      : transferMutation.isError
                        ? <><AlertCircle className="w-5 h-5" />Gagal — Coba Lagi</>
                        : <><SendHorizontal className="w-5 h-5" />Kirim {jumlahAngka > 0 ? formatCoin(jumlahAngka) + " Coin" : "Transfer"}</>}
                  </Button>
                </motion.div>

                {transferMutation.isError && (
                  <p className="text-xs text-center text-red-500">{(transferMutation.error as any)?.message}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ============ MAIN PAGE ============
export default function WargaRwcoin() {
  const [showBayar, setShowBayar] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showTripay, setShowTripay] = useState(false);
  const [tripayInitialKind, setTripayInitialKind] = useState<"pulsa" | "data" | "electricity">("pulsa");
  const [bayarVoucher, setBayarVoucher] = useState<string | undefined>(undefined);

  const { data: wallet, isLoading: loadingWallet } = useQuery<any>({
    ...wargaWalletQueryOptions(),
  });
  const { data: transaksiList = [], isLoading: loadingTransaksi } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/transaksi"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: voucherList = [] } = useQuery<any[]>({
    ...wargaVoucherQueryOptions(),
  });
  const { data: tripayTxList = [] } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/tripay/transaksi"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const tripayPending = tripayTxList.filter((t: any) => t.status === "pending").length;
  const tripaySuccess = tripayTxList.filter((t: any) => t.status === "success").length;

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {showBayar && (
          <BayarModal
            key="modal-bayar"
            wallet={wallet}
            initialVoucherKode={bayarVoucher}
            onClose={() => { setShowBayar(false); setBayarVoucher(undefined); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTopup && <TopupModal key="modal-topup" wallet={wallet} onClose={() => setShowTopup(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showTransfer && <TransferModal key="modal-transfer" wallet={wallet} onClose={() => setShowTransfer(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showTripay && <TripayModal key={`modal-tripay-${tripayInitialKind}`} wallet={wallet} initialKind={tripayInitialKind} onClose={() => setShowTripay(false)} />}
      </AnimatePresence>

      {/* Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(163,55%,18%), hsl(163,55%,30%))" }}
      >
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
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <p className="text-sm opacity-70 mb-1">Saldo Tersedia</p>
              <p className="text-4xl font-bold mb-1">{formatCoin(wallet?.saldo ?? 0)} <CoinIcon size={28} /></p>
              <p className="text-sm opacity-70">= {formatRp(wallet?.saldo ?? 0)}</p>
            </motion.div>
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
      </motion.div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-[hsl(163,55%,22%)]">Belanja Harian</p>
        <p className="text-xs text-muted-foreground">Gunakan RWcoin untuk bayar di mitra sekitar atau kirim saldo ke sesama warga.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Button
            className="w-full py-6 text-sm font-bold gap-2 rounded-2xl shadow-sm flex-col h-auto"
            style={{ background: "linear-gradient(135deg, hsl(163,55%,22%), hsl(163,55%,32%))" }}
            onClick={() => setShowBayar(true)}
            disabled={!wallet || wallet.saldo <= 0}
          >
            <Store className="w-5 h-5" />
            Bayar Mitra
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Button
            className="w-full py-6 text-sm font-bold gap-2 rounded-2xl shadow-sm flex-col h-auto"
            style={{ background: "linear-gradient(135deg, hsl(40,45%,45%), hsl(40,45%,58%))" }}
            onClick={() => setShowTransfer(true)}
            disabled={!wallet || wallet.saldo <= 0}
          >
            <ArrowLeftRight className="w-5 h-5" />
            Transfer
          </Button>
        </motion.div>
      </div>

      <div className="space-y-1 pt-1">
        <p className="text-sm font-semibold text-[hsl(163,55%,22%)]">Produk Digital</p>
        <p className="text-xs text-muted-foreground">Pulsa, paket data, dan token listrik dengan harga yang sudah disiapkan admin RW.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Button
            className="w-full py-5 text-sm font-bold gap-2 rounded-2xl shadow-sm flex-col h-auto items-start text-left"
            style={{ background: "linear-gradient(135deg, hsl(200,70%,32%), hsl(180,70%,40%))" }}
            onClick={() => { setTripayInitialKind("pulsa"); setShowTripay(true); }}
            disabled={!wallet || wallet.saldo <= 0}
          >
            <Wifi className="w-5 h-5" />
            <span>Pulsa & Paket</span>
            <span className="text-[11px] font-medium opacity-80">Isi pulsa dan kuota internet tanpa transfer bank lagi.</span>
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Button
            className="w-full py-5 text-sm font-bold gap-2 rounded-2xl shadow-sm flex-col h-auto items-start text-left"
            style={{ background: "linear-gradient(135deg, hsl(38,92%,42%), hsl(48,90%,54%))" }}
            onClick={() => { setTripayInitialKind("electricity"); setShowTripay(true); }}
            disabled={!wallet || wallet.saldo <= 0}
          >
            <Zap className="w-5 h-5" />
            <span>Token Listrik</span>
            <span className="text-[11px] font-medium opacity-80">Pilih nominal token PLN dan pantau status pesanan di aplikasi.</span>
          </Button>
        </motion.div>
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-r from-cyan-50 to-emerald-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Belanja digital lebih tenang</p>
              <p className="text-xs text-muted-foreground mt-1">Harga sudah final, saldo langsung terpotong, dan status pesanan bisa dipantau dari riwayat Tripay.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center flex-shrink-0">
              <div className="rounded-xl bg-white/80 px-3 py-2 min-w-[74px]">
                <p className="text-base font-bold text-amber-600">{tripayPending}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-2 min-w-[74px]">
                <p className="text-base font-bold text-green-600">{tripaySuccess}</p>
                <p className="text-[10px] text-muted-foreground">Sukses</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.28 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-1`} />
                  <p className="text-xs font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            </motion.div>
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
              {voucherList.map((v: any, vi: number) => (
                <motion.div key={v.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: vi * 0.06, duration: 0.22 }} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "hsl(40,45%,96%)" }}>
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
                </motion.div>
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
            {transaksiList.slice(0, 10).map((t: any, txIdx: number) => {
              // Untuk transfer: apakah kita penerima?
              const isTransferMasuk = t.tipe === "transfer" && t.tujuanWargaId != null && t.wargaId !== wallet?.wargaId;
              const isTransferKeluar = t.tipe === "transfer" && !isTransferMasuk;

              let iconBg = "bg-blue-100 text-blue-600";
              let Icon = ShoppingBag;
              let label = t.namaUsaha ?? "Belanja";
              let labelSub: string | null = null;

              if (t.tipe === "topup") {
                iconBg = "bg-green-100 text-green-600"; Icon = ArrowUpCircle; label = "Topup Saldo";
              } else if (t.tipe === "donasi") {
                iconBg = "bg-rose-100 text-rose-600"; Icon = Heart;
                label = "Donasi RW"; labelSub = t.keterangan ?? "Campaign RW";
              } else if (t.tipe === "iuran") {
                iconBg = "bg-violet-100 text-violet-600"; Icon = Receipt;
                label = "Bayar Iuran"; labelSub = t.keterangan ?? "Kas RW";
              } else if (isTransferMasuk) {
                iconBg = "bg-emerald-100 text-emerald-600"; Icon = ArrowDownCircle;
                label = "Transfer Masuk"; labelSub = t.namaPengirim ? `dari ${t.namaPengirim}` : null;
              } else if (isTransferKeluar) {
                iconBg = "bg-amber-100 text-amber-600"; Icon = ArrowLeftRight;
                label = "Transfer Keluar"; labelSub = t.namaPenerima ? `ke ${t.namaPenerima}` : null;
              }

              const isPositive = t.tipe === "topup" || isTransferMasuk;

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(txIdx * 0.04, 0.25), duration: 0.2 }}
                  className="flex items-center justify-between py-2.5 border-b last:border-0"
                >
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
                </motion.div>
              );
            })}
            {loadingTransaksi && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Memuat transaksi...</span>
              </div>
            )}
            {!loadingTransaksi && transaksiList.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <Coins className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                <p className="text-xs text-muted-foreground">Tap "Bayar Mitra" atau "Transfer" untuk mulai</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-cyan-600" />
            Riwayat Tripay
          </h3>
          <div className="space-y-2">
            {tripayTxList.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 border-b last:border-0 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{t.productName}</p>
                    <Badge variant="outline" className="text-[10px]">{tripayKindLabel(t.kind)}</Badge>
                    <Badge className={`text-[10px] ${t.status === "success" ? "bg-green-100 text-green-700" : t.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.target}{t.noMeterPln ? ` · meter ${t.noMeterPln}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{formatTgl(t.createdAt)}</p>
                  {t.serialNumber && <p className="text-[11px] text-green-700 break-all">SN/Token: {t.serialNumber}</p>}
                  {t.note && <p className="text-[11px] text-muted-foreground">{t.note}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-500">-{formatCoin(t.hargaJual ?? 0)} <CoinIcon /></p>
                  <p className="text-[11px] text-muted-foreground">{t.reference}</p>
                </div>
              </div>
            ))}
            {tripayTxList.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <Smartphone className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Belum ada transaksi Tripay</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-0 shadow-sm" style={{ backgroundColor: "hsl(163,55%,97%)" }}>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm text-[hsl(163,55%,22%)] mb-2">Belanja Nyaman di RWcoin</h3>
          <ol className="space-y-1.5">
            {[
              "Topup sekali, lalu gunakan saldo untuk belanja berkali-kali tanpa transfer ulang.",
              "Untuk produk digital, pilih nomor tujuan dengan teliti agar pulsa, paket, atau token masuk ke alamat yang benar.",
              "Jika transaksi Tripay masih pending, tunggu sebentar dan pantau di riwayat Tripay pada halaman ini.",
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
