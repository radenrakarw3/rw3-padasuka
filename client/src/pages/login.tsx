import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Shield, MessageCircle, ArrowLeft, Loader2, User } from "lucide-react";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

interface WaContact {
  id: number;
  nama: string;
  phone: string;
  kedudukan: string;
}

function parseErrorMsg(error: any): string {
  const msg = error.message.includes(":")
    ? error.message.split(":").slice(1).join(":").trim()
    : error.message;
  try { return JSON.parse(msg).message; } catch { return msg; }
}

export default function LoginPage() {
  const { login, checkKk, requestOtp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const [nomorKk, setNomorKk] = useState("");
  const [otp, setOtp] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [step, setStep] = useState<"kk" | "pick" | "otp">("kk");
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<WaContact | null>(null);
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

  const handleCheckKk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorKk) {
      toast({ title: "Masukkan nomor KK", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await checkKk(nomorKk);
      setContacts(result.contacts);
      if (result.contacts.length === 1) {
        await handleSendOtp(result.contacts[0]);
      } else {
        setStep("pick");
      }
    } catch (error: any) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (contact: WaContact) => {
    setSelectedContact(contact);
    setLoading(true);
    try {
      const result = await requestOtp(nomorKk, contact.id);
      setMaskedPhone(result.phone);
      setStep("otp");
      setCountdown(60);
      setOtp("");
      toast({ title: `Kode OTP terkirim ke ${contact.nama}` });
    } catch (error: any) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
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
      toast({ title: "OTP Gagal", description: parseErrorMsg(error), variant: "destructive" });
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
      toast({ title: "Login Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || !selectedContact) return;
    await handleSendOtp(selectedContact);
  };

  const resetToKk = () => {
    setStep("kk");
    setOtp("");
    setContacts([]);
    setSelectedContact(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[hsl(163,55%,22%)] to-[hsl(163,55%,14%)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <img
            src={logoGold}
            alt="Logo RW 03"
            className="w-24 h-24 object-contain drop-shadow-lg"
            data-testid="img-logo"
          />
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
                onClick={() => { setIsAdmin(false); resetToKk(); }}
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
                onClick={() => { setIsAdmin(true); resetToKk(); }}
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
              <form onSubmit={handleCheckKk} className="space-y-4">
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
                  data-testid="button-check-kk"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mencari...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Lanjutkan
                    </span>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Kode OTP akan dikirim ke nomor WhatsApp anggota keluarga
                </p>
              </form>
            ) : step === "pick" ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={resetToKk}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-to-kk"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Ganti nomor KK
                </button>

                <div>
                  <p className="text-sm font-medium mb-3">Kirim OTP ke nomor WhatsApp:</p>
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleSendOtp(contact)}
                        disabled={loading}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                        data-testid={`button-contact-${contact.id}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" data-testid={`text-contact-name-${contact.id}`}>
                            {contact.nama}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contact.kedudukan} &middot; {contact.phone}
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
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStep("pick"); setOtp(""); }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-to-pick"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Ganti penerima OTP
                </button>

                <div className="bg-muted/50 rounded-lg p-3 text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Kode OTP dikirim ke</p>
                  <p className="font-semibold text-base" data-testid="text-otp-recipient">
                    {selectedContact?.nama}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-masked-phone">
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
