import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRtjuaraAuth } from "@/lib/rtjuara-auth";
import { rtjuaraApi } from "@/lib/rtjuara-api";
import { RTJUARA_API } from "@shared/rtjuara-api";
import { RTJUARA_RT_NUMBERS, RTJUARA_TAGLINE, rtLabel } from "@shared/rtjuara";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

export default function RtjuaraLogin({ bootError }: { bootError?: string | null }) {
  const { login } = useRtjuaraAuth();
  const [, setLocation] = useLocation();
  const [rt, setRt] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: rtTersedia = [] } = useQuery({
    queryKey: [RTJUARA_API.auth.rtList],
    queryFn: () => rtjuaraApi.auth.rtList(),
    retry: false,
  });

  // Sebelum admin mengaktifkan akun, tetap tampilkan RT 01-07 supaya tombolnya tidak kosong.
  const daftarRt = rtTersedia.length
    ? rtTersedia.map((r) => r.rt)
    : (RTJUARA_RT_NUMBERS as readonly number[]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!rt) {
      setErr("Pilih RT terlebih dahulu");
      return;
    }
    setSubmitting(true);
    try {
      await login(rt, pin);
      setLocation("/rtjuara/quest");
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
          <h1 className="text-lg font-bold text-[hsl(163,55%,22%)]">RT JUARA</h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: "hsl(40,45%,45%)" }}>
            {RTJUARA_TAGLINE}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Khusus Ketua RT — kirim bukti quest harian, mingguan, dan bulanan
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pilih RT</label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {daftarRt.map((nomor) => (
                <button
                  key={nomor}
                  type="button"
                  onClick={() => setRt(nomor)}
                  className={`h-11 rounded-lg border text-sm font-semibold transition-colors ${
                    rt === nomor
                      ? "bg-[hsl(163,55%,22%)] text-white border-[hsl(163,55%,22%)]"
                      : "bg-background hover:bg-muted"
                  }`}
                  data-testid={`pilih-rt-${nomor}`}
                >
                  {String(nomor).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

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
              data-testid="input-rtjuara-pin"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              PIN dibuat admin RW 03. Belum punya PIN? Hubungi Ketua RW.
            </p>
          </div>

          {bootError && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 text-center">
              {bootError}
            </p>
          )}
          {err && <p className="text-xs text-destructive text-center">{err}</p>}

          <Button
            type="submit"
            disabled={submitting || pin.length !== 6 || !rt}
            className="w-full h-12 text-white font-semibold"
            style={{ backgroundColor: "hsl(163,55%,22%)" }}
            data-testid="button-rtjuara-login"
          >
            {submitting ? "Masuk..." : rt ? `Masuk sebagai ${rtLabel(rt)}` : "Masuk"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setLocation("/rtjuara")}
          className="w-full text-xs text-muted-foreground underline"
        >
          Lihat papan peringkat publik
        </button>
      </div>
    </div>
  );
}
