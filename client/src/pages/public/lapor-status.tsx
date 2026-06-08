import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/gov/empty-state";
import { parseLaporanRef } from "@shared/program-kerja";
import { fetchPublicJson, getApiErrorMessage } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

type LaporanStatus = {
  nomorReferensi: string;
  judul: string;
  jenisLaporan: string;
  subJenis: string | null;
  status: string;
  tanggapanAdmin: string | null;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

export default function PublicLaporStatus() {
  const [input, setInput] = useState("");
  const [searchId, setSearchId] = useState<number | null>(null);

  const { data, isLoading, isError, error } = useQuery<LaporanStatus>({
    queryKey: ["/api/public/laporan", searchId, "status"],
    queryFn: () => fetchPublicJson<LaporanStatus>(`/api/public/laporan/${searchId}/status`),
    enabled: searchId !== null,
    retry: false,
  });

  const handleSearch = () => {
    const id = parseLaporanRef(input);
    setSearchId(id);
  };

  return (
    <PublicKioskLayout title="Cek status laporan" backHref="/lapor">
      <p className="prose-gov mb-4">
        Masukkan nomor referensi laporan Anda, contoh: LAP-12
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nomor-laporan">Nomor referensi</Label>
          <div className="flex gap-2">
            <Input
              id="nomor-laporan"
              placeholder="LAP-..."
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <Button type="button" onClick={handleSearch} className="touch-target flex-shrink-0">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {searchId === null && (
          <EmptyState title="Belum ada pencarian" description="Masukkan nomor referensi laporan Anda." />
        )}

        {searchId !== null && isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

        {searchId !== null && isError && (
          <EmptyState
            title="Laporan tidak ditemukan"
            description={getApiErrorMessage(error)}
          />
        )}

        {data && (
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono font-semibold text-brand">{data.nomorReferensi}</code>
              <Badge variant="outline">
                {statusLabels[data.status] ?? data.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Judul</p>
              <p className="font-medium">{data.judul}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jenis</p>
              <p className="capitalize">{data.jenisLaporan}{data.subJenis ? ` — ${data.subJenis}` : ""}</p>
            </div>
            {data.tanggapanAdmin && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Tanggapan pengurus</p>
                <p className="text-sm text-muted-foreground">{data.tanggapanAdmin}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Dikirim: {new Date(data.createdAt).toLocaleString("id-ID")}
            </p>
          </div>
        )}
      </div>
    </PublicKioskLayout>
  );
}
