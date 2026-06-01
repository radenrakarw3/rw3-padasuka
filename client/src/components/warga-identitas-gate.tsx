import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export type WargaIdentity = {
  wargaId: number;
  kkId: number;
  namaLengkap: string;
  rt: number;
  nomorKk: string;
};

type Props = {
  onVerified: (identity: WargaIdentity, nik: string, nomorWa: string) => void;
  submitLabel?: string;
};

export function WargaIdentitasGate({ onVerified, submitLabel = "Lanjut" }: Props) {
  const [nik, setNik] = useState("");
  const [nomorWa, setNomorWa] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{16}$/.test(nik)) {
      setError("NIK harus 16 digit angka");
      return;
    }
    if (nomorWa.replace(/\D/g, "").length < 9) {
      setError("Nomor WhatsApp tidak valid");
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/public/validate-warga", { nik, nomorWa });
      const data = (await res.json()) as WargaIdentity;
      onVerified(data, nik, nomorWa);
    } catch (err: any) {
      const raw = err.message?.includes(":") ? err.message.split(":").slice(1).join(":").trim() : err.message;
      try {
        setError(JSON.parse(raw).message);
      } catch {
        setError(raw || "Verifikasi gagal");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nik">NIK</Label>
        <Input
          id="nik"
          inputMode="numeric"
          maxLength={16}
          placeholder="16 digit NIK"
          value={nik}
          onChange={(e) => setNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
          data-testid="input-nik"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nomor-wa">Nomor WhatsApp</Label>
        <Input
          id="nomor-wa"
          inputMode="tel"
          placeholder="08xxxxxxxxxx"
          value={nomorWa}
          onChange={(e) => setNomorWa(e.target.value)}
          data-testid="input-nomor-wa"
        />
        <p className="text-xs text-muted-foreground">Harus sama dengan nomor WA terdaftar di data warga RW.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full h-11" disabled={loading} data-testid="button-verifikasi">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
}
