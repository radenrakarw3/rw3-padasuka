import { useState, useEffect, useRef } from "react";
import { useAuth, type SavedAccount } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Shield, MessageCircle, ArrowLeft, Loader2, User, Building2, Phone, CreditCard, KeyRound, Trash2, ChevronRight, CheckCircle2 } from "lucide-react";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

interface WaContact {
  id: number;
  nama: string;
  phone: string;
  kedudukan: string;
  rt?: number;
  kkId?: number;
}

function parseErrorMsg(error: any): string {
  const msg = error.message.includes(":")
    ? error.message.split(":").slice(1).join(":").trim()
    : error.message;
  try { return JSON.parse(msg).message; } catch { return msg; }
}

export default function LoginPage() {
  const {
    login, checkKk, requestOtp, verifyOtp, checkWa, requestWaOtp, verifyWaOtp,
    singgahCheckNik, singgahRequestOtp, singgahVerifyOtp,
    pendingLoginData, completePendingLogin, getSavedAccounts, setupPinLogin, pinLogin, deleteSavedLogin,
  } = useAuth();
  const { toast } = useToast();

  // Tab utama
  const [loginMode, setLoginMode] = useState<"warga" | "singgah" | "admin">("warga");

  // Sub-metode login warga
  const [wargaMethod, setWargaMethod] = useState<"wa" | "kk">("wa");

  // State WA flow
  const [waPhone, setWaPhone] = useState("");
  const [waContacts, setWaContacts] = useState<WaContact[]>([]);
  const [waStep, setWaStep] = useState<"phone" | "pick" | "otp">("phone");

  // State KK flow
  const [nomorKk, setNomorKk] = useState("");
  const [kkContacts, setKkContacts] = useState<WaContact[]>([]);
  const [kkStep, setKkStep] = useState<"kk" | "pick" | "otp">("kk");

  // State OTP (shared)
  const [otp, setOtp] = useState("");
  const [selectedContact, setSelectedContact] = useState<WaContact | null>(null);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [countdown, setCountdown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // State admin
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // State singgah
  const [singgahNik, setSinggahNik] = useState("");
  const [singgahStep, setSinggahStep] = useState<"nik" | "otp">("nik");
  const [singgahNama, setSinggahNama] = useState("");
  const [singgahPhone, setSinggahPhone] = useState("");
  const [singgahOtp, setSinggahOtp] = useState("");
  const singgahOtpRef = useRef<HTMLInputElement>(null);

  // State saved login & PIN
  const [deviceId, setDeviceId] = useState("");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showOtherLogin, setShowOtherLogin] = useState(false);
  const [selectedSavedAccount, setSelectedSavedAccount] = useState<SavedAccount | null>(null);
  // wargaView: "saved" = tampilkan akun tersimpan, "pin-login" = input PIN untuk akun tersimpan
  // "pin-setup-enter" = buat PIN baru step 1, "pin-setup-confirm" = konfirmasi PIN step 2
  const [wargaView, setWargaView] = useState<"normal" | "pin-login" | "pin-setup-enter" | "pin-setup-confirm">("normal");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const pinInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);

  // Inisialisasi deviceId dari localStorage
  useEffect(() => {
    let did = localStorage.getItem("rw3_device_id");
    if (!did) {
      did = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("rw3_device_id", did);
    }
    setDeviceId(did);
    getSavedAccounts(did).then(setSavedAccounts).catch(() => {});
  }, []);

  // Deteksi pendingLoginData → tampilkan PIN setup
  useEffect(() => {
    if (pendingLoginData) {
      setWargaView("pin-setup-enter");
      setPin("");
      setConfirmPin("");
    }
  }, [pendingLoginData]);

  // Auto focus PIN input
  useEffect(() => {
    if ((wargaView === "pin-login" || wargaView === "pin-setup-enter" || wargaView === "pin-setup-confirm") && pinInputRef.current) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [wargaView]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const isOtpStep = (wargaMethod === "wa" && waStep === "otp") || (wargaMethod === "kk" && kkStep === "otp");
    if (isOtpStep && otpInputRef.current) otpInputRef.current.focus();
  }, [waStep, kkStep, wargaMethod]);

  useEffect(() => {
    if (singgahStep === "otp" && singgahOtpRef.current) singgahOtpRef.current.focus();
  }, [singgahStep]);

  // --- Reset functions ---
  const resetWa = () => { setWaStep("phone"); setOtp(""); setWaContacts([]); setSelectedContact(null); };
  const resetKk = () => { setKkStep("kk"); setOtp(""); setKkContacts([]); setSelectedContact(null); };
  const resetSinggah = () => { setSinggahStep("nik"); setSinggahOtp(""); setSinggahNama(""); setSinggahPhone(""); };

  const handleSetWargaMethod = (method: "wa" | "kk") => {
    setWargaMethod(method);
    if (method === "wa") resetWa();
    else resetKk();
  };

  // --- WA flow ---
  const handleCheckWa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waPhone) { toast({ title: "Masukkan nomor WhatsApp", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const result = await checkWa(waPhone);
      setWaContacts(result.contacts);
      if (result.contacts.length === 1) {
        await handleSendWaOtp(result.contacts[0]);
      } else {
        setWaStep("pick");
      }
    } catch (error: any) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendWaOtp = async (contact: WaContact) => {
    setSelectedContact(contact);
    setLoading(true);
    try {
      const result = await requestWaOtp(waPhone, contact.id);
      setMaskedPhone(result.phone);
      setWaStep("otp");
      setCountdown(60);
      setOtp("");
      toast({ title: `Kode OTP terkirim ke ${result.nama}` });
    } catch (error: any) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWaOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) { toast({ title: "Masukkan kode OTP", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await verifyWaOtp(waPhone, otp);
      // pendingLoginData akan di-set oleh auth context → useEffect akan trigger PIN setup
    } catch (error: any) {
      toast({ title: "OTP Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendWaOtp = async () => {
    if (countdown > 0 || !selectedContact) return;
    await handleSendWaOtp(selectedContact);
  };

  // --- KK flow ---
  const handleCheckKk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorKk) { toast({ title: "Masukkan nomor KK", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const result = await checkKk(nomorKk);
      setKkContacts(result.contacts);
      if (result.contacts.length === 1) {
        await handleSendKkOtp(result.contacts[0]);
      } else {
        setKkStep("pick");
      }
    } catch (error: any) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendKkOtp = async (contact: WaContact) => {
    setSelectedContact(contact);
    setLoading(true);
    try {
      const result = await requestOtp(nomorKk, contact.id);
      setMaskedPhone(result.phone);
      setKkStep("otp");
      setCountdown(60);
      setOtp("");
      toast({ title: `Kode OTP terkirim ke ${contact.nama}` });
    } catch (error: any) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKkOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) { toast({ title: "Masukkan kode OTP", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await verifyOtp(nomorKk, otp);
      // pendingLoginData akan di-set oleh auth context → useEffect akan trigger PIN setup
    } catch (error: any) {
      toast({ title: "OTP Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendKkOtp = async () => {
    if (countdown > 0 || !selectedContact) return;
    await handleSendKkOtp(selectedContact);
  };

  // --- Admin login ---
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) { toast({ title: "Mohon isi semua kolom", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await login(adminUsername, adminPassword);
      toast({ title: "Login berhasil!" });
    } catch (error: any) {
      toast({ title: "Login Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Singgah flow ---
  const handleSinggahCheckNik = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singgahNik || singgahNik.length !== 16) { toast({ title: "Masukkan NIK 16 digit", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const result = await singgahCheckNik(singgahNik);
      setSinggahNama(result.nama);
      const otpResult = await singgahRequestOtp(singgahNik);
      setSinggahPhone(otpResult.phone);
      setSinggahStep("otp");
      setCountdown(60);
      setSinggahOtp("");
      toast({ title: `Kode OTP terkirim ke ${result.nama}` });
    } catch (error: any) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSinggahVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singgahOtp) { toast({ title: "Masukkan kode OTP", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await singgahVerifyOtp(singgahNik, singgahOtp);
      toast({ title: "Login berhasil!" });
    } catch (error: any) {
      toast({ title: "OTP Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSinggahResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const result = await singgahRequestOtp(singgahNik);
      setSinggahPhone(result.phone);
      setCountdown(60);
      setSinggahOtp("");
      toast({ title: "Kode OTP terkirim ulang" });
    } catch (error: any) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- PIN Login (akun tersimpan) ---
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSavedAccount || pin.length < 4) return;
    setLoading(true);
    try {
      await pinLogin(selectedSavedAccount.wargaId, pin, deviceId);
      toast({ title: "Login berhasil!" });
    } catch (error: any) {
      toast({ title: "PIN salah", description: parseErrorMsg(error), variant: "destructive" });
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // --- PIN Setup ---
  const handlePinSetupNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;
    setConfirmPin("");
    setWargaView("pin-setup-confirm");
  };

  const handlePinSetupSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPin.length < 4) return;
    if (pin !== confirmPin) {
      toast({ title: "PIN tidak cocok", description: "Masukkan ulang PIN yang sama", variant: "destructive" });
      setConfirmPin("");
      return;
    }
    setLoading(true);
    try {
      if (deviceId) {
        await setupPinLogin(pin, deviceId);
        toast({ title: "PIN berhasil dibuat!", description: "Login berikutnya cukup pakai PIN" });
        const accs = await getSavedAccounts(deviceId);
        setSavedAccounts(accs);
      }
    } catch (error: any) {
      toast({ title: "Gagal menyimpan PIN", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
      completePendingLogin();
    }
  };

  const handlePinSetupSkip = () => {
    completePendingLogin();
  };

  const handleDeleteSavedAccount = async (acc: SavedAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedLogin(acc.wargaId, deviceId);
      setSavedAccounts(prev => prev.filter(a => a.wargaId !== acc.wargaId));
      toast({ title: "Akun tersimpan dihapus" });
    } catch {
      toast({ title: "Gagal menghapus akun", variant: "destructive" });
    }
  };

  // --- OTP input UI (shared) ---
  const renderOtpForm = (opts: {
    onSubmit: (e: React.FormEvent) => void;
    onBack: () => void;
    backLabel: string;
    onResend: () => void;
    otpValue: string;
    setOtpValue: (v: string) => void;
    inputRef: React.RefObject<HTMLInputElement>;
  }) => (
    <form onSubmit={opts.onSubmit} className="space-y-4">
      <button
        type="button"
        onClick={opts.onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {opts.backLabel}
      </button>

      <div className="bg-muted/50 rounded-lg p-3 text-center space-y-1">
        <p className="text-sm text-muted-foreground">Kode OTP dikirim ke</p>
        <p className="font-semibold text-base">{selectedContact?.nama}</p>
        <p className="text-sm text-muted-foreground">{maskedPhone}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="otp-input" className="text-base font-medium">Kode OTP</Label>
        <Input
          ref={opts.inputRef}
          id="otp-input"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="______"
          value={opts.otpValue}
          onChange={(e) => opts.setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-14 text-2xl text-center tracking-[0.5em] font-bold"
          data-testid="input-otp"
        />
        <p className="text-xs text-muted-foreground text-center">Masukkan 6 digit kode dari WhatsApp</p>
      </div>

      <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading || opts.otpValue.length < 6} data-testid="button-verify-otp">
        {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Memverifikasi...</span>
          : <span className="flex items-center gap-2"><LogIn className="w-5 h-5" />Masuk</span>}
      </Button>

      <div className="text-center">
        {countdown > 0
          ? <p className="text-sm text-muted-foreground">Kirim ulang dalam {countdown} detik</p>
          : <button type="button" onClick={opts.onResend} className="text-sm text-primary font-medium hover:underline" disabled={loading}>Kirim Ulang OTP</button>
        }
      </div>
    </form>
  );

  // --- Warga contact pick UI ---
  const renderPickList = (contacts: WaContact[], onSelect: (c: WaContact) => void, onBack: () => void, backLabel: string, showRt = false) => (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </button>
      <div>
        <p className="text-sm font-medium mb-3">Pilih akun Anda:</p>
        <div className="space-y-2">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelect(contact)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              data-testid={`button-contact-${contact.id}`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{contact.nama}</p>
                <p className="text-xs text-muted-foreground">
                  {contact.kedudukan}{showRt && contact.rt ? ` · RT 0${contact.rt}` : ""}
                </p>
              </div>
              <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Mengirim OTP...
        </div>
      )}
    </div>
  );

  // --- PIN input UI ---
  const renderPinInput = (opts: {
    value: string;
    onChange: (v: string) => void;
    label: string;
    id: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={opts.id} className="text-base font-medium">{opts.label}</Label>
      <div className="flex gap-2 justify-center">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all
              ${opts.value.length > i ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/30"}`}
          >
            {opts.value.length > i ? "●" : ""}
          </div>
        ))}
      </div>
      <input
        ref={pinInputRef}
        id={opts.id}
        type="tel"
        inputMode="numeric"
        maxLength={4}
        value={opts.value}
        onChange={(e) => opts.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className="opacity-0 h-0 w-0 absolute pointer-events-none"
        autoComplete="off"
      />
      {/* Invisible tap area to focus input */}
      <button
        type="button"
        onClick={() => pinInputRef.current?.focus()}
        className="w-full h-8 flex items-center justify-center gap-1 text-xs text-muted-foreground"
      >
        Ketuk untuk mengetik PIN
      </button>
    </div>
  );

  // Wrapper PIN input pakai numpad visual
  const renderNumpad = (opts: { value: string; onChange: (v: string) => void }) => {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
    return (
      <div className="grid grid-cols-3 gap-2 mt-2">
        {keys.map((k, i) => (
          <button
            key={i}
            type="button"
            disabled={k === "" || (k !== "⌫" && opts.value.length >= 4)}
            onClick={() => {
              if (k === "⌫") opts.onChange(opts.value.slice(0, -1));
              else if (k !== "") opts.onChange(opts.value + k);
            }}
            className={`h-12 rounded-lg text-lg font-semibold transition-colors
              ${k === "" ? "invisible" : "border hover:bg-muted active:bg-muted/80 disabled:opacity-40 bg-background"}`}
          >
            {k === "⌫" ? <span className="text-base">⌫</span> : k}
          </button>
        ))}
      </div>
    );
  };

  const renderPinDots = (value: string) => (
    <div className="flex gap-3 justify-center my-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all
            ${value.length > i ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[hsl(163,55%,22%)] to-[hsl(163,55%,14%)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <img src={logoGold} alt="Logo RW 03" className="w-24 h-24 object-contain drop-shadow-lg" data-testid="img-logo" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white" data-testid="text-app-title">RW 03 Padasuka</h1>
            <p className="text-[hsl(40,30%,80%)] text-base mt-1">Sistem Informasi Warga Digital</p>
            <p className="text-[hsl(40,30%,70%)] text-sm">Kecamatan Cimahi Tengah, Kota Cimahi</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center gap-1.5 justify-center">
              <button type="button" onClick={() => { setLoginMode("warga"); resetWa(); resetSinggah(); setWargaView("normal"); setShowOtherLogin(false); }}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${loginMode === "warga" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                data-testid="button-login-warga">
                Warga
              </button>
              <button type="button" onClick={() => { setLoginMode("singgah"); resetWa(); resetKk(); resetSinggah(); }}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${loginMode === "singgah" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                data-testid="button-login-singgah">
                <Building2 className="w-3.5 h-3.5" />
                Singgah
              </button>
              <button type="button" onClick={() => { setLoginMode("admin"); resetWa(); resetKk(); resetSinggah(); }}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${loginMode === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                data-testid="button-login-admin">
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>
          </CardHeader>

          <CardContent className="px-5 pb-5 pt-3">

            {/* ---- ADMIN ---- */}
            {loginMode === "admin" && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username" className="text-base font-medium">Username</Label>
                  <Input id="admin-username" type="text" placeholder="Masukkan username" value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)} className="h-12 text-base" data-testid="input-username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-base font-medium">Password</Label>
                  <Input id="admin-password" type="password" placeholder="Masukkan password" value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)} className="h-12 text-base" data-testid="input-password" />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading} data-testid="button-submit-login">
                  {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Masuk...</span>
                    : <span className="flex items-center gap-2"><LogIn className="w-5 h-5" />Masuk</span>}
                </Button>
              </form>
            )}

            {/* ---- SINGGAH ---- */}
            {loginMode === "singgah" && (
              singgahStep === "nik" ? (
                <form onSubmit={handleSinggahCheckNik} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="singgah-nik" className="text-base font-medium">Nomor Induk Kependudukan (NIK)</Label>
                    <Input id="singgah-nik" type="text" inputMode="numeric" pattern="[0-9]*"
                      placeholder="Contoh: 3277021234560001" value={singgahNik}
                      onChange={(e) => setSinggahNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
                      className="h-12 text-base" data-testid="input-singgah-nik" />
                    <p className="text-xs text-muted-foreground">Masukkan 16 digit NIK yang terdaftar</p>
                  </div>
                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading || singgahNik.length !== 16} data-testid="button-singgah-check">
                    {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Mencari...</span>
                      : <span className="flex items-center gap-2"><MessageCircle className="w-5 h-5" />Lanjutkan</span>}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">Kode OTP akan dikirim ke nomor WhatsApp terdaftar</p>
                </form>
              ) : (
                <form onSubmit={handleSinggahVerifyOtp} className="space-y-4">
                  <button type="button" onClick={resetSinggah} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-singgah-back">
                    <ArrowLeft className="w-4 h-4" />
                    Ganti NIK
                  </button>
                  <div className="bg-muted/50 rounded-lg p-3 text-center space-y-1">
                    <p className="text-sm text-muted-foreground">Kode OTP dikirim ke</p>
                    <p className="font-semibold text-base" data-testid="text-singgah-nama">{singgahNama}</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-singgah-phone">{singgahPhone}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="singgah-otp" className="text-base font-medium">Kode OTP</Label>
                    <Input ref={singgahOtpRef} id="singgah-otp" type="text" inputMode="numeric" maxLength={6} placeholder="______"
                      value={singgahOtp} onChange={(e) => setSinggahOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="h-14 text-2xl text-center tracking-[0.5em] font-bold" data-testid="input-singgah-otp" />
                    <p className="text-xs text-muted-foreground text-center">Masukkan 2 digit kode dari WhatsApp</p>
                  </div>
                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading || singgahOtp.length < 6} data-testid="button-singgah-verify">
                    {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Memverifikasi...</span>
                      : <span className="flex items-center gap-2"><LogIn className="w-5 h-5" />Masuk</span>}
                  </Button>
                  <div className="text-center">
                    {countdown > 0
                      ? <p className="text-sm text-muted-foreground" data-testid="text-singgah-countdown">Kirim ulang dalam {countdown} detik</p>
                      : <button type="button" onClick={handleSinggahResendOtp} className="text-sm text-primary font-medium hover:underline" disabled={loading} data-testid="button-singgah-resend">Kirim Ulang OTP</button>
                    }
                  </div>
                </form>
              )
            )}

            {/* ---- WARGA ---- */}
            {loginMode === "warga" && (
              <div className="space-y-4">

                {/* === PIN SETUP (setelah OTP berhasil) === */}
                {wargaView === "pin-setup-enter" && (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <KeyRound className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-semibold text-base">Buat PIN Login Cepat</p>
                      <p className="text-xs text-muted-foreground">PIN 4 digit untuk login tanpa OTP di perangkat ini</p>
                    </div>
                    <form onSubmit={handlePinSetupNext} className="space-y-3">
                      {renderPinDots(pin)}
                      {renderNumpad({ value: pin, onChange: setPin })}
                      <Button type="submit" className="w-full h-11 font-semibold mt-2" disabled={pin.length < 4}>
                        <ChevronRight className="w-4 h-4 mr-1" />
                        Lanjut
                      </Button>
                      <button type="button" onClick={handlePinSetupSkip}
                        className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1">
                        Lewati, login tanpa PIN
                      </button>
                    </form>
                  </div>
                )}

                {wargaView === "pin-setup-confirm" && (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-semibold text-base">Konfirmasi PIN</p>
                      <p className="text-xs text-muted-foreground">Masukkan ulang PIN yang sama</p>
                    </div>
                    <form onSubmit={handlePinSetupSave} className="space-y-3">
                      {renderPinDots(confirmPin)}
                      {renderNumpad({ value: confirmPin, onChange: setConfirmPin })}
                      <Button type="submit" className="w-full h-11 font-semibold mt-2" disabled={loading || confirmPin.length < 4}>
                        {loading
                          ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</span>
                          : <span className="flex items-center gap-2"><KeyRound className="w-4 h-4" />Simpan PIN</span>}
                      </Button>
                      <button type="button" onClick={() => { setConfirmPin(""); setWargaView("pin-setup-enter"); }}
                        className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1 flex items-center justify-center gap-1">
                        <ArrowLeft className="w-3 h-3" />
                        Kembali
                      </button>
                    </form>
                  </div>
                )}

                {/* === PIN LOGIN (klik akun tersimpan) === */}
                {wargaView === "pin-login" && selectedSavedAccount && (
                  <form onSubmit={handlePinLogin} className="space-y-4">
                    <button type="button"
                      onClick={() => { setWargaView("normal"); setPin(""); setSelectedSavedAccount(null); }}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                      Ganti akun
                    </button>
                    <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-base">
                          {selectedSavedAccount.nama.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{selectedSavedAccount.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedSavedAccount.kedudukan} · RT 0{selectedSavedAccount.rt}
                        </p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1">Masukkan PIN</p>
                      {renderPinDots(pin)}
                    </div>
                    {renderNumpad({ value: pin, onChange: setPin })}
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={loading || pin.length < 4}>
                      {loading
                        ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Masuk...</span>
                        : <span className="flex items-center gap-2"><LogIn className="w-5 h-5" />Masuk</span>}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setWargaView("normal"); setPin(""); setSelectedSavedAccount(null); setShowOtherLogin(true); }}
                      className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1"
                    >
                      Lupa PIN? Login via OTP
                    </button>
                  </form>
                )}

                {/* === NORMAL (akun tersimpan + form biasa) === */}
                {wargaView === "normal" && (
                  <>
                    {/* Akun Tersimpan */}
                    {savedAccounts.length > 0 && !showOtherLogin && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Akun Tersimpan</p>
                        <div className="space-y-2">
                          {savedAccounts.map((acc) => (
                            <div key={acc.wargaId} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => { setSelectedSavedAccount(acc); setPin(""); setWargaView("pin-login"); }}
                                className="flex-1 flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                              >
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                  <span className="text-primary-foreground font-bold text-base">
                                    {acc.nama.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{acc.nama}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {acc.kedudukan} · RT 0{acc.rt}
                                  </p>
                                </div>
                                <KeyRound className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSavedAccount(acc, e)}
                                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                                title="Hapus akun tersimpan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowOtherLogin(true)}
                          className="w-full text-sm text-primary font-medium hover:underline text-center py-1"
                        >
                          Gunakan akun lain (OTP)
                        </button>
                      </div>
                    )}

                    {/* Form login biasa (WA / KK) */}
                    {(savedAccounts.length === 0 || showOtherLogin) && (
                      <div className="space-y-4">
                        {showOtherLogin && (
                          <button type="button"
                            onClick={() => setShowOtherLogin(false)}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Kembali ke akun tersimpan
                          </button>
                        )}

                        {/* Sub-metode selector */}
                        {((wargaMethod === "wa" && waStep === "phone") || (wargaMethod === "kk" && kkStep === "kk")) && (
                          <div className="flex rounded-lg border overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleSetWargaMethod("wa")}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${wargaMethod === "wa" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"}`}
                              data-testid="button-method-wa"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              No. WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetWargaMethod("kk")}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-l ${wargaMethod === "kk" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"}`}
                              data-testid="button-method-kk"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Nomor KK
                            </button>
                          </div>
                        )}

                        {/* WA flow */}
                        {wargaMethod === "wa" && waStep === "phone" && (
                          <form onSubmit={handleCheckWa} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="wa-phone" className="text-base font-medium">Nomor WhatsApp</Label>
                              <Input id="wa-phone" type="text" inputMode="numeric" pattern="[0-9]*"
                                placeholder="Contoh: 08123456789" value={waPhone}
                                onChange={(e) => setWaPhone(e.target.value.replace(/\D/g, ""))}
                                className="h-12 text-base" data-testid="input-wa-phone" />
                              <p className="text-xs text-muted-foreground">Nomor WhatsApp yang terdaftar di data warga RW 03</p>
                            </div>
                            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading || waPhone.length < 9} data-testid="button-check-wa">
                              {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Mencari...</span>
                                : <span className="flex items-center gap-2"><MessageCircle className="w-5 h-5" />Kirim OTP</span>}
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                              Belum terdaftar? Gunakan <button type="button" className="text-primary font-medium hover:underline" onClick={() => handleSetWargaMethod("kk")}>Nomor KK</button>
                            </p>
                          </form>
                        )}

                        {wargaMethod === "wa" && waStep === "pick" && renderPickList(
                          waContacts, handleSendWaOtp, resetWa, "Ganti nomor WhatsApp", true
                        )}

                        {wargaMethod === "wa" && waStep === "otp" && renderOtpForm({
                          onSubmit: handleVerifyWaOtp,
                          onBack: () => { waContacts.length > 1 ? setWaStep("pick") : resetWa(); setOtp(""); },
                          backLabel: waContacts.length > 1 ? "Ganti penerima OTP" : "Ganti nomor WhatsApp",
                          onResend: handleResendWaOtp,
                          otpValue: otp,
                          setOtpValue: setOtp,
                          inputRef: otpInputRef,
                        })}

                        {/* KK flow */}
                        {wargaMethod === "kk" && kkStep === "kk" && (
                          <form onSubmit={handleCheckKk} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="nomor-kk" className="text-base font-medium">Nomor Kartu Keluarga</Label>
                              <Input id="nomor-kk" type="text" inputMode="numeric" pattern="[0-9]*"
                                placeholder="Contoh: 3277022211060211" value={nomorKk}
                                onChange={(e) => setNomorKk(e.target.value.replace(/\D/g, ""))}
                                className="h-12 text-base" data-testid="input-nomor-kk" />
                              <p className="text-xs text-muted-foreground">Masukkan 16 digit nomor KK Anda</p>
                            </div>
                            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading} data-testid="button-check-kk">
                              {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Mencari...</span>
                                : <span className="flex items-center gap-2"><MessageCircle className="w-5 h-5" />Lanjutkan</span>}
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">Kode OTP akan dikirim ke nomor WhatsApp anggota keluarga</p>
                          </form>
                        )}

                        {wargaMethod === "kk" && kkStep === "pick" && renderPickList(
                          kkContacts, handleSendKkOtp, resetKk, "Ganti nomor KK", false
                        )}

                        {wargaMethod === "kk" && kkStep === "otp" && renderOtpForm({
                          onSubmit: handleVerifyKkOtp,
                          onBack: () => { kkContacts.length > 1 ? setKkStep("pick") : resetKk(); setOtp(""); },
                          backLabel: kkContacts.length > 1 ? "Ganti penerima OTP" : "Ganti nomor KK",
                          onResend: handleResendKkOtp,
                          otpValue: otp,
                          setOtpValue: setOtp,
                          inputRef: otpInputRef,
                        })}
                      </div>
                    )}
                  </>
                )}

              </div>
            )}

          </CardContent>
        </Card>

        <p className="text-center text-[hsl(40,20%,65%)] text-xs">
          {loginMode === "admin" ? "Login khusus admin RW 03"
            : loginMode === "singgah" ? "Login khusus warga singgah / penghuni kost"
            : wargaView === "pin-setup-enter" || wargaView === "pin-setup-confirm" ? "Buat PIN untuk login cepat di perangkat ini"
            : wargaView === "pin-login" ? "Masukkan PIN 4 digit Anda"
            : savedAccounts.length > 0 && !showOtherLogin ? "Pilih akun dan masukkan PIN"
            : wargaMethod === "wa" ? "Masuk menggunakan nomor WhatsApp terdaftar"
            : "Satu akun per Kartu Keluarga"}
        </p>
      </div>
    </div>
  );
}
