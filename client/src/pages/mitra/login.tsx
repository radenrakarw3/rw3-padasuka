import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Coins, Store, Eye, EyeOff, Loader2 } from "lucide-react";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

export default function MitraLoginPage({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [nomorWa, setNomorWa] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const loginMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/mitra/login", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mitra/me"] });
      onLogin();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Login gagal", description: e.message }),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, hsl(163,55%,15%) 0%, hsl(163,55%,25%) 100%)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={logoGold} alt="Logo RW03" className="w-12 h-12" />
            <Coins className="w-10 h-10" style={{ color: "hsl(40,45%,65%)" }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Portal Mitra RWcoin</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(40,30%,75%)" }}>RW 03 Padasuka, Cimahi</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-5 h-5 text-[hsl(163,55%,22%)]" />
            <h2 className="font-bold text-[hsl(163,55%,22%)]">Login Kasir Mitra</h2>
          </div>

          <div>
            <Label>Nomor WA Kasir</Label>
            <Input
              type="tel"
              placeholder="08xxxxxxxxxx"
              value={nomorWa}
              onChange={e => setNomorWa(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>PIN (6 digit)</Label>
            <div className="relative mt-1">
              <Input
                type={showPin ? "text" : "password"}
                placeholder="••••••"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="font-mono tracking-[0.4em] text-center text-lg pr-10"
                onKeyDown={e => e.key === "Enter" && loginMutation.mutate({ nomorWa, pin })}
              />
              <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPin(s => !s)}>
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            className="w-full mt-2 text-base py-5"
            style={{ backgroundColor: "hsl(163,55%,22%)" }}
            onClick={() => loginMutation.mutate({ nomorWa, pin })}
            disabled={!nomorWa || !pin || loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Memproses...</>
            ) : (
              "Masuk"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-2">
            PIN dan akun mitra dikelola oleh Admin RW 03.<br />
            Hubungi admin jika lupa PIN.
          </p>
        </div>
      </div>
    </div>
  );
}
