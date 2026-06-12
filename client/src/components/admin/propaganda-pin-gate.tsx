import { useState } from "react";
import { usePropagandaAuth } from "@/lib/propaganda-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

const EXPECTED_PIN_LEN = 4;

export function PropagandaPinGate({ children }: { children: React.ReactNode }) {
  const { authenticated, loading, login } = usePropagandaAuth();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-muted-foreground">Memverifikasi akses...</p>
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      await login(pin);
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : "PIN salah");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
        <div className="text-center space-y-2">
          <img src={logoGold} alt="RW 03" className="w-14 h-14 mx-auto object-contain" />
          <div className="flex items-center justify-center gap-2 text-[hsl(163,55%,22%)]">
            <Shield className="w-5 h-5" />
            <h1 className="text-lg font-bold">Propaganda RW</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Distribusi informasi warga via WhatsApp — akses terbatas Ketua RW.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">PIN (4 digit)</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={EXPECTED_PIN_LEN}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, EXPECTED_PIN_LEN))}
              className="h-12 text-center text-lg tracking-[0.5em] mt-1"
              placeholder="••••"
              autoComplete="off"
            />
          </div>
          {err && <p className="text-xs text-destructive text-center">{err}</p>}
          <Button
            type="submit"
            className="w-full h-11"
            style={{ backgroundColor: "hsl(163,55%,22%)" }}
            disabled={submitting || pin.length !== EXPECTED_PIN_LEN}
          >
            {submitting ? "Memverifikasi..." : "Buka Propaganda"}
          </Button>
        </form>
      </div>
    </div>
  );
}
