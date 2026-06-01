import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

const LOGIN_OTP_LENGTH = 2;

function parseErrorMsg(error: unknown): string {
  const e = error as { message?: string };
  const msg = e.message?.includes(":") ? e.message.split(":").slice(1).join(":").trim() : e.message || "Terjadi kesalahan";
  try {
    return JSON.parse(msg).message;
  } catch {
    return msg;
  }
}

export default function Visitrw3Login() {
  const { singgahCheckNik, singgahRequestOtp, singgahVerifyOtp } = useAuth();
  const { toast } = useToast();
  const [nik, setNik] = useState("");
  const [step, setStep] = useState<"nik" | "otp">("nik");
  const [nama, setNama] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  const handleCheckNik = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nik.length !== 16) {
      toast({ title: "NIK harus 16 digit", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await singgahCheckNik(nik);
      setNama(result.nama);
      await singgahRequestOtp(nik);
      setStep("otp");
      setCountdown(60);
      setOtp("");
      toast({ title: "OTP terkirim ke WhatsApp terdaftar" });
    } catch (error) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({ title: "Masukkan kode OTP", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await singgahVerifyOtp(nik, otp);
      toast({ title: "Login berhasil" });
    } catch (error) {
      toast({ title: "OTP gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await singgahRequestOtp(nik);
      setCountdown(60);
      setOtp("");
      toast({ title: "OTP dikirim ulang" });
    } catch (error) {
      toast({ title: "Gagal", description: parseErrorMsg(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[hsl(163,55%,22%)] text-white px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button type="button" className="p-1 rounded-md hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <span className="font-semibold">Visit RW3</span>
      </header>

      <main className="max-w-sm mx-auto p-6 space-y-6">
        <div className="text-center">
          <img src={logoGold} alt="RW03" className="w-14 h-14 mx-auto mb-2" />
          <h1 className="text-xl font-bold" style={{ color: "hsl(163,55%,22%)" }}>Warga Singgah</h1>
          <p className="text-sm text-muted-foreground">Login dengan NIK & OTP WhatsApp</p>
        </div>

        {step === "nik" ? (
          <form onSubmit={handleCheckNik} className="space-y-4 bg-card border rounded-2xl p-5">
            <div className="space-y-2">
              <Label htmlFor="nik-singgah">NIK (16 digit)</Label>
              <Input
                id="nik-singgah"
                inputMode="numeric"
                maxLength={16}
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
                data-testid="input-singgah-nik"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4 bg-card border rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">
              OTP dikirim untuk <span className="font-medium text-foreground">{nama}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="otp-singgah">Kode OTP</Label>
              <Input
                ref={otpRef}
                id="otp-singgah"
                inputMode="numeric"
                maxLength={LOGIN_OTP_LENGTH}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, LOGIN_OTP_LENGTH))}
                data-testid="input-singgah-otp"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading || otp.length < LOGIN_OTP_LENGTH}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk"}
            </Button>
            <div className="text-center text-sm">
              {countdown > 0 ? (
                <span className="text-muted-foreground">Kirim ulang dalam {countdown} detik</span>
              ) : (
                <button type="button" onClick={handleResend} className="text-primary font-medium" disabled={loading}>
                  Kirim ulang OTP
                </button>
              )}
            </div>
            <button type="button" className="text-xs text-muted-foreground underline w-full" onClick={() => setStep("nik")}>
              Ganti NIK
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
