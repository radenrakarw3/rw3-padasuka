import { useState } from "react";
import { useLocation } from "wouter";
import { useBlusukanAuth } from "@/lib/blusukan-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

export default function BlusukanrwLogin({ bootError }: { bootError?: string | null }) {
  const { login } = useBlusukanAuth();
  const [, setLocation] = useLocation();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      await login(pin);
      setLocation("/blusukanrw/dashboard");
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[hsl(163,55%,22%)]">
      <div className="w-full max-w-sm bg-background rounded-2xl shadow-xl p-6 space-y-5">
        <div className="text-center">
          <img src={logoGold} alt="RW 03" className="w-16 h-16 mx-auto mb-3 object-contain" />
          <h1 className="text-lg font-bold text-[hsl(163,55%,22%)]">Blusukan RW</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Khusus Ketua RW — master data kependudukan RT 01–04 (tambah, ubah, hapus, pindah warga)
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">PIN (6 digit)</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-12 text-center text-lg tracking-[0.4em] mt-1"
              placeholder="••••••"
              autoComplete="off"
            />
          </div>
          {bootError && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 text-center">
              {bootError}
            </p>
          )}
          {err && <p className="text-xs text-destructive text-center">{err}</p>}
          <Button
            type="submit"
            className="w-full h-11"
            style={{ backgroundColor: "hsl(163,55%,22%)" }}
            disabled={submitting || pin.length !== 6}
          >
            {submitting ? "Memverifikasi..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
