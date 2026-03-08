import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Shield, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import logoImg from "@assets/2f80aef4-6f16-4fd8-8801-982a3e49dd03_1772991075891.JPG";

export default function LoginPage() {
  const { login, requestOtp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const [nomorKk, setNomorKk] = useState("");
  const [otp, setOtp] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [step, setStep] = useState<"kk" | "otp">("kk");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [countdown, setCountdown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (step === "otp" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorKk) {
      toast({ title: "Masukkan nomor KK", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await requestOtp(nomorKk);
      setMaskedPhone(result.phone);
      setStep("otp");
      setCountdown(60);
      setOtp("");
      toast({ title: "Kode OTP terkirim ke WhatsApp" });
    } catch (error: any) {
      const msg = error.message.includes(":")
        ? error.message.split(":").slice(1).join(":").trim()
        : error.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Gagal", description: parsed, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({ title: "Masukkan kode OTP", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(nomorKk, otp);
      toast({ title: "Login berhasil!" });
    } catch (error: any) {
      const msg = error.message.includes(":")
        ? error.message.split(":").slice(1).join(":").trim()
        : error.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "OTP Gagal", description: parsed, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      toast({ title: "Mohon isi semua kolom", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await login(adminUsername, adminPassword);
      toast({ title: "Login berhasil!" });
    } catch (error: any) {
      const msg = error.message.includes(":")
        ? error.message.split(":").slice(1).join(":").trim()
        : error.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Login Gagal", description: parsed, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const result = await requestOtp(nomorKk);
      setMaskedPhone(result.phone);
      setCountdown(60);
      setOtp("");
      toast({ title: "Kode OTP baru terkirim" });
    } catch (error: any) {
      const msg = error.message.includes(":")
        ? error.message.split(":").slice(1).join(":").trim()
        : error.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Gagal kirim ulang", description: parsed, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[hsl(163,55%,22%)] to-[hsl(163,55%,14%)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[hsl(40,45%,55%)] flex items-center justify-center shadow-lg">
            <img
              src={logoImg}
              alt="Logo RW 03"
              className="w-full h-full object-cover"
              data-testid="img-logo"
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white" data-testid="text-app-title">
              RW 03 Padasuka
            </h1>
            <p className="text-[hsl(40,30%,80%)] text-base mt-1">
              Sistem Informasi Warga Digital
            </p>
            <p className="text-[hsl(40,30%,70%)] text-sm">
              Kecamatan Cimahi Tengah, Kota Cimahi
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center gap-2 justify-center">
              <button
                type="button"
                onClick={() => { setIsAdmin(false); setStep("kk"); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isAdmin
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid="button-login-warga"
              >
                Warga
              </button>
              <button
                type="button"
                onClick={() => { setIsAdmin(true); setStep("kk"); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isAdmin
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid="button-login-admin"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-3">
            {isAdmin ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username" className="text-base font-medium">Username</Label>
                  <Input
                    id="admin-username"
                    type="text"
                    placeholder="Masukkan username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="h-12 text-base"
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-base font-medium">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Masukkan password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="h-12 text-base"
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                  data-testid="button-submit-login"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Masuk...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="w-5 h-5" />
                      Masuk
                    </span>
                  )}
                </Button>
              </form>
            ) : step === "kk" ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nomor-kk" className="text-base font-medium">
                    Nomor Kartu Keluarga
                  </Label>
                  <Input
                    id="nomor-kk"
                    type="text"
                    placeholder="Contoh: 3277022211060211"
                    value={nomorKk}
                    onChange={(e) => setNomorKk(e.target.value)}
                    className="h-12 text-base"
                    data-testid="input-nomor-kk"
                  />
                  <p className="text-xs text-muted-foreground">
                    Masukkan 16 digit nomor KK Anda
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                  data-testid="button-request-otp"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengirim OTP...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Kirim Kode OTP via WhatsApp
                    </span>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Kode OTP akan dikirim ke nomor WhatsApp kepala keluarga
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStep("kk"); setOtp(""); }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-to-kk"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Ganti nomor KK
                </button>

                <div className="bg-muted/50 rounded-lg p-3 text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Kode OTP dikirim ke</p>
                  <p className="font-semibold text-base" data-testid="text-masked-phone">
                    {maskedPhone}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-base font-medium">Kode OTP</Label>
                  <Input
                    ref={otpInputRef}
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="__"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    className="h-14 text-2xl text-center tracking-[0.5em] font-bold"
                    data-testid="input-otp"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Masukkan 2 digit kode dari WhatsApp
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading || otp.length < 2}
                  data-testid="button-verify-otp"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memverifikasi...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="w-5 h-5" />
                      Masuk
                    </span>
                  )}
                </Button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-countdown">
                      Kirim ulang dalam {countdown} detik
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-sm text-primary font-medium hover:underline"
                      disabled={loading}
                      data-testid="button-resend-otp"
                    >
                      Kirim Ulang OTP
                    </button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[hsl(40,20%,65%)] text-xs">
          {isAdmin ? "Login khusus admin RW 03" : "Satu akun per Kartu Keluarga"}
        </p>
      </div>
    </div>
  );
}
