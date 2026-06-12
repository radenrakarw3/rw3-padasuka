import { useState } from "react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, type GovStatusVariant } from "@/components/gov/status-badge";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { Loader2, Search } from "lucide-react";

type PropertiStatus = {
  nomorPendaftaran: string;
  namaKost: string;
  namaPemilik: string;
  namaPenanggungJawab?: string | null;
  nomorWaPenanggungJawab?: string | null;
  rt: number;
  statusProperti: string;
  izinTinggal: boolean;
  izinBisnis: boolean;
  jenisProperti: string;
};

function statusVariant(s: string): GovStatusVariant {
  if (s === "aktif") return "disetujui";
  if (s === "menunggu_verifikasi") return "menunggu_survey";
  return "info";
}

function statusLabel(s: string) {
  if (s === "aktif") return "Aktif — dapat dipilih di pengajuan";
  if (s === "menunggu_verifikasi") return "Menunggu verifikasi admin";
  return s;
}

export default function Visitrw3StatusProperti() {
  const [nomor, setNomor] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PropertiStatus | null>(null);
  const [error, setError] = useState("");

  async function handleCek() {
    const n = nomor.trim().toUpperCase();
    if (!n) {
      setError("Masukkan nomor pendaftaran");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/public/visitrw3/properti/${encodeURIComponent(n)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Tidak ditemukan");
      }
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Visitrw3Shell title="Status properti" backHref="/visitrw3/pemilik">
      <FeatureExplain title="Nomor PROP — untuk pemilik properti" className="mb-4">
        <p>
          Masukkan nomor <strong>PROP-…</strong> yang Anda terima setelah mendaftarkan properti
          (kost, kontrakan, kiosk, lapak).
        </p>
        <p>
          <strong>Aktif</strong> = penyewa sudah bisa memilih properti ini saat pengajuan Visit RW3.{" "}
          <strong>Menunggu verifikasi</strong> = admin RW masih meninjau pendaftaran Anda.
        </p>
      </FeatureExplain>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Nomor pendaftaran</Label>
          <Input
            value={nomor}
            onChange={(e) => setNomor(e.target.value.toUpperCase())}
            placeholder="PROP-20260601-XXXX"
            className="font-mono"
          />
        </div>
        <Button className="w-full touch-target gap-2" onClick={() => void handleCek()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Cek status
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <code className="text-xs font-bold">{data.nomorPendaftaran}</code>
              <StatusBadge
                variant={statusVariant(data.statusProperti)}
                label={data.statusProperti === "aktif" ? "Aktif" : "Menunggu verifikasi"}
              />
            </div>
            <p className="font-medium">{data.namaKost}</p>
            <p className="text-muted-foreground">Pemilik: {data.namaPemilik}</p>
            {data.namaPenanggungJawab && (
              <p className="text-muted-foreground">
                PJ pengelola: {data.namaPenanggungJawab}
                {data.nomorWaPenanggungJawab ? ` · ${data.nomorWaPenanggungJawab}` : ""}
              </p>
            )}
            <p>RT {String(data.rt).padStart(2, "0")} · {data.jenisProperti}</p>
            <p className="text-muted-foreground">{statusLabel(data.statusProperti)}</p>
            <p className="text-xs">
              Izin:{" "}
              {[data.izinTinggal && "Tinggal", data.izinBisnis && "Bisnis"].filter(Boolean).join(", ") || "—"}
            </p>
          </div>
        )}
      </div>
    </Visitrw3Shell>
  );
}
