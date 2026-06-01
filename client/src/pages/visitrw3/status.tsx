import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readJsonSafely } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { StatusBadge, visitrw3StatusVariant } from "@/components/gov/status-badge";
import { StatusTimeline, buildVisitrw3Timeline } from "@/components/gov/status-timeline";
import { EmptyState } from "@/components/gov/empty-state";
import { Search } from "lucide-react";

export default function Visitrw3Status() {
  const [nomor, setNomor] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["/api/public/visitrw3/status", search],
    queryFn: async () => {
      const res = await fetch(`/api/public/visitrw3/status/${encodeURIComponent(search)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Gagal memuat status");
      return readJsonSafely<{
        pengajuan: {
          nomorVisitrw3: string;
          status: string;
          tipe: string;
          keperluanPengajuan: string;
          rt: number;
          tanggalBerlakuSampai: string;
          terminBulan: number;
          nomorUnit?: string | null;
          alasanTolak?: string | null;
          namaUsaha?: string | null;
          jamBuka?: string | null;
          jamTutup?: string | null;
        };
        kost?: { namaKost: string };
        kontrakAktif?: boolean;
      }>(res);
    },
    enabled: search.length >= 8,
  });

  return (
    <Visitrw3Shell title="Cek status" backHref="/visitrw3/penyewa">
      <div className="space-y-4">
        <p className="prose-gov">Masukkan nomor Visit RW3 yang Anda terima setelah mengajukan atau memperpanjang.</p>

        <div className="space-y-2">
          <Label htmlFor="nomor">Nomor Visit RW3</Label>
          <Input
            id="nomor"
            value={nomor}
            onChange={(e) => setNomor(e.target.value.toUpperCase())}
            placeholder="VRW3-YYYYMMDD-XXXX"
            className="font-mono"
          />
        </div>
        <Button
          className="w-full touch-target"
          onClick={() => setSearch(nomor.trim())}
          disabled={nomor.trim().length < 8}
        >
          Cek status
        </Button>

        {isLoading && (
          <div className="flex justify-center py-8" role="status" aria-label="Memuat">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {isFetched && !isLoading && !data && (
          <EmptyState
            icon={Search}
            title="Nomor tidak ditemukan"
            description="Periksa kembali penulisan nomor Visit RW3. Nomor tertera pada konfirmasi pengajuan Anda."
          />
        )}

        {data?.pengajuan && (
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <code className="font-mono font-bold text-brand text-sm break-all">
                {data.pengajuan.nomorVisitrw3}
              </code>
              <StatusBadge variant={visitrw3StatusVariant(data.pengajuan.status)} />
            </div>

            <StatusTimeline
              steps={buildVisitrw3Timeline(data.pengajuan.status, data.pengajuan.alasanTolak)}
            />

            <dl className="text-sm space-y-2 border-t pt-3">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Jenis</dt>
                <dd className="font-medium text-right">
                  {data.pengajuan.tipe === "perpanjang" ? "Perpanjang" : "Pengajuan baru"} ·{" "}
                  {data.pengajuan.keperluanPengajuan === "bisnis" ? "Bisnis" : "Tinggal"}
                </dd>
              </div>
              {data.kost && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Properti</dt>
                  <dd className="font-medium text-right">{data.kost.namaKost}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">RT</dt>
                <dd className="font-medium">RT {String(data.pengajuan.rt).padStart(2, "0")}</dd>
              </div>
              {data.pengajuan.nomorUnit && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Nomor unit</dt>
                  <dd className="font-medium text-right">{data.pengajuan.nomorUnit}</dd>
                </div>
              )}
              {data.pengajuan.keperluanPengajuan === "bisnis" && data.pengajuan.namaUsaha && (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Usaha</dt>
                    <dd className="font-medium text-right">{data.pengajuan.namaUsaha}</dd>
                  </div>
                  {data.pengajuan.jamBuka && data.pengajuan.jamTutup && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Jam operasional</dt>
                      <dd className="font-medium text-right">
                        {data.pengajuan.jamBuka} – {data.pengajuan.jamTutup}
                      </dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Berlaku sampai</dt>
                <dd className="font-medium">{data.pengajuan.tanggalBerlakuSampai}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Termin</dt>
                <dd className="font-medium">{data.pengajuan.terminBulan} bulan</dd>
              </div>
            </dl>

            {data.pengajuan.status === "ditolak" && data.pengajuan.alasanTolak && (
              <p className="text-sm text-destructive rounded-lg bg-destructive/10 p-3" role="alert">
                Alasan penolakan: {data.pengajuan.alasanTolak}
              </p>
            )}
            {data.kontrakAktif && (
              <p className="text-sm text-success font-medium">Kontrak aktif terdaftar di sistem RW.</p>
            )}
          </div>
        )}
      </div>
    </Visitrw3Shell>
  );
}
