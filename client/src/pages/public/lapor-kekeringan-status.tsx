import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/gov/empty-state";
import { fetchPublicJson, getApiErrorMessage } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { kekeringanStatusLabels, type KekeringanStatus } from "@shared/laporan-kekeringan";

type KekeringanStatusResponse = {
  nomorAntrian: string;
  nomorTiket: string | null;
  namaPelapor: string;
  nomorRt: number;
  jumlahPenghuni: number;
  status: KekeringanStatus;
  catatanSurvey: string | null;
  tanggalSurvey: string | null;
  createdAt: string;
};

const statusColors: Record<KekeringanStatus, string> = {
  menunggu_survey: "bg-amber-100 text-amber-800",
  tiket_keluar: "bg-sky-100 text-sky-800",
  selesai: "bg-green-100 text-green-800",
  ditolak: "bg-red-100 text-red-800",
};

export default function PublicLaporKekeringanStatus() {
  const [input, setInput] = useState("");
  const [searchNomor, setSearchNomor] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<KekeringanStatusResponse>({
    queryKey: ["/api/public/laporan-kekeringan", searchNomor, "status"],
    queryFn: () => fetchPublicJson<KekeringanStatusResponse>(`/api/public/laporan-kekeringan/${searchNomor}/status`),
    enabled: searchNomor !== null,
    retry: false,
  });

  const handleSearch = () => {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    setSearchNomor(trimmed);
  };

  return (
    <PublicKioskLayout title="Cek status kekeringan" backHref="/lapor/kekeringan">
      <p className="prose-gov mb-4">
        Masukkan nomor antrian (KRG-...) atau nomor tiket (TKT-KRG-...) Anda.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nomor-kekeringan">Nomor antrian / tiket</Label>
          <div className="flex gap-2">
            <Input
              id="nomor-kekeringan"
              placeholder="KRG-... atau TKT-KRG-..."
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <Button type="button" onClick={handleSearch} className="touch-target flex-shrink-0">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {searchNomor === null && (
          <EmptyState title="Belum ada pencarian" description="Masukkan nomor antrian atau tiket Anda." />
        )}

        {searchNomor !== null && isLoading && <Skeleton className="h-48 w-full rounded-xl" />}

        {searchNomor !== null && isError && (
          <EmptyState title="Tidak ditemukan" description={getApiErrorMessage(error)} />
        )}

        {data && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono font-bold text-lg">{data.nomorAntrian}</p>
                {data.nomorTiket && (
                  <p className="text-sm text-muted-foreground">
                    Tiket: <span className="font-mono font-semibold text-foreground">{data.nomorTiket}</span>
                  </p>
                )}
              </div>
              <Badge className={statusColors[data.status]}>
                {kekeringanStatusLabels[data.status]}
              </Badge>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Pelapor:</span> {data.namaPelapor}</p>
              <p><span className="text-muted-foreground">RT:</span> {String(data.nomorRt).padStart(2, "0")}</p>
              <p><span className="text-muted-foreground">Penghuni rumah:</span> {data.jumlahPenghuni} orang</p>
            </div>
            {data.status === "menunggu_survey" && (
              <p className="text-xs text-muted-foreground border-t pt-3">
                Menunggu survey petugas RW ke rumah Anda. Setelah diverifikasi, nomor tiket akan dikeluarkan.
              </p>
            )}
            {data.nomorTiket && data.status !== "ditolak" && (
              <p className="text-xs text-sky-800 bg-sky-50 rounded-md p-2">
                Tunjukkan nomor tiket <strong>{data.nomorTiket}</strong> saat pengambilan bantuan air.
              </p>
            )}
            {data.catatanSurvey && (
              <div className="text-xs bg-muted rounded-md p-2">
                <p className="font-medium">Catatan survey:</p>
                <p className="text-muted-foreground">{data.catatanSurvey}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicKioskLayout>
  );
}
