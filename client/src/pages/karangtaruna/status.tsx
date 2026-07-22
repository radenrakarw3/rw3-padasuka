import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KarangtarunaShell } from "@/components/karangtaruna-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readJsonSafely } from "@/lib/queryClient";
import { Loader2, Search, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/gov/empty-state";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { KARANGTARUNA_ROUTES } from "@/lib/karangtaruna-routes";
import { karangtarunaStatusLabel } from "@shared/karangtaruna";

type StatusResult = {
  nomorAnggota: string;
  namaLengkap: string;
  rt: number;
  statusKeanggotaan: string;
  bidangKeahlian: string[];
  bidangMinat: string[];
  potensiUnggulan?: string | null;
  catatanAdmin?: string | null;
};

export default function KarangtarunaStatus() {
  const [nomor, setNomor] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["/api/public/karangtaruna/status", search],
    queryFn: async () => {
      const res = await fetch(`/api/public/karangtaruna/status?nomor=${encodeURIComponent(search)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Gagal memuat status");
      return readJsonSafely<StatusResult>(res);
    },
    enabled: search.length >= 6,
  });

  return (
    <KarangtarunaShell title="Cek status keanggotaan" backHref={KARANGTARUNA_ROUTES.hub}>
      <div className="space-y-4">
        <FeatureExplain title="Nomor anggota">
          <p>
            Masukkan nomor <strong>KT-…</strong> dari konfirmasi pendaftaran.
          </p>
        </FeatureExplain>
        <div className="space-y-2">
          <Label htmlFor="nomor">Nomor anggota</Label>
          <Input
            id="nomor"
            value={nomor}
            onChange={(e) => setNomor(e.target.value.toUpperCase())}
            placeholder="KT-2026-0001"
            className="font-mono"
          />
        </div>
        <Button
          className="w-full touch-target"
          onClick={() => setSearch(nomor.trim())}
          disabled={nomor.trim().length < 6}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cek status"}
        </Button>

        {isFetched && !data && (
          <EmptyState icon={Search} title="Tidak ditemukan" description="Periksa kembali nomor KT- kamu." />
        )}

        {data && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono font-bold">{data.nomorAnggota}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                <Sparkles className="w-3.5 h-3.5" />
                {karangtarunaStatusLabel(data.statusKeanggotaan)}
              </span>
            </div>
            <p className="text-sm font-medium">{data.namaLengkap}</p>
            <p className="text-xs text-muted-foreground">RT {String(data.rt).padStart(2, "0")}</p>
            {data.bidangKeahlian.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.bidangKeahlian.map((k) => (
                  <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{k}</span>
                ))}
              </div>
            )}
            {data.potensiUnggulan && (
              <div className="rounded-lg border border-brand/20 bg-brand/5 p-3">
                <p className="text-xs font-semibold text-brand">Catatan potensi dari RW</p>
                <p className="text-sm mt-0.5">{data.potensiUnggulan}</p>
              </div>
            )}
            {data.catatanAdmin && (
              <p className="text-xs text-muted-foreground">Catatan: {data.catatanAdmin}</p>
            )}
          </div>
        )}
      </div>
    </KarangtarunaShell>
  );
}
