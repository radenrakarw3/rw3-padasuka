import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readJsonSafely } from "@/lib/queryClient";
import { Loader2, Search } from "lucide-react";
import { StatusBadge, visitrw3StatusVariant } from "@/components/gov/status-badge";
import { StatusTimeline, buildVisitrw3Timeline } from "@/components/gov/status-timeline";
import { EmptyState } from "@/components/gov/empty-state";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { formatKategoriUsahaLabel } from "@shared/visitrw3-kategori-usaha";

export default function Rw3bizStatus() {
  const [nomor, setNomor] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["/api/public/rw3biz/status", search],
    queryFn: async () => {
      const res = await fetch(`/api/public/rw3biz/status?nomor=${encodeURIComponent(search)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Gagal memuat status");
      return readJsonSafely<{
        pengajuan: {
          nomorBiz: string;
          status: string;
          tipe: string;
          namaUsaha: string;
          rt: number;
          alamat: string;
          tanggalBerlakuSampai: string;
          jamBuka?: string | null;
          jamTutup?: string | null;
          kategoriUsaha?: string | null;
          alasanTolak?: string | null;
          pjNama: string;
        } | null;
        usaha: { status: string; tanggalHabis: string; namaUsaha: string } | null;
      }>(res);
    },
    enabled: search.length >= 8,
  });

  const pengajuan = data?.pengajuan;

  return (
    <Rw3bizShell title="Cek status" backHref={RW3BIZ_ROUTES.hub}>
      <div className="space-y-4">
        <FeatureExplain title="Nomor RW3BIZ">
          <p>
            Masukkan nomor <strong>BIZ-…</strong> dari konfirmasi pengajuan izin usaha.
          </p>
        </FeatureExplain>
        <div className="space-y-2">
          <Label htmlFor="nomor">Nomor RW3BIZ</Label>
          <Input
            id="nomor"
            value={nomor}
            onChange={(e) => setNomor(e.target.value.toUpperCase())}
            placeholder="BIZ-2026-0001"
            className="font-mono"
          />
        </div>
        <Button
          className="w-full touch-target"
          onClick={() => setSearch(nomor.trim())}
          disabled={nomor.trim().length < 8}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cek status"}
        </Button>

        {isFetched && !pengajuan && !data?.usaha && (
          <EmptyState icon={Search} title="Tidak ditemukan" description="Periksa kembali nomor BIZ Anda." />
        )}

        {pengajuan && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono font-bold">{pengajuan.nomorBiz}</p>
              <StatusBadge variant={visitrw3StatusVariant(pengajuan.status)} />
            </div>
            <StatusTimeline steps={buildVisitrw3Timeline(pengajuan.status)} />
            <p className="text-sm font-medium">{pengajuan.namaUsaha}</p>
            <p className="text-xs text-muted-foreground">
              RT {String(pengajuan.rt).padStart(2, "0")} · PJ {pengajuan.pjNama}
            </p>
            {pengajuan.kategoriUsaha && (
              <p className="text-xs text-muted-foreground">{formatKategoriUsahaLabel(pengajuan.kategoriUsaha)}</p>
            )}
            {pengajuan.jamBuka && pengajuan.jamTutup && (
              <p className="text-xs">Jam: {pengajuan.jamBuka} – {pengajuan.jamTutup}</p>
            )}
            <p className="text-xs">Berlaku sampai {pengajuan.tanggalBerlakuSampai}</p>
            {pengajuan.alasanTolak && (
              <p className="text-sm text-destructive">Alasan tolak: {pengajuan.alasanTolak}</p>
            )}
          </div>
        )}
      </div>
    </Rw3bizShell>
  );
}
