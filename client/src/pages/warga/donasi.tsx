import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, CheckCircle, ArrowLeft, ExternalLink,
  XCircle, Heart, Trophy
} from "lucide-react";
import type { DonasiCampaign, Donasi } from "@shared/schema";

const SAWERIA_LINK = "https://saweria.co/rw3padasuka";

export default function WargaDonasi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [namaDonatur, setNamaDonatur] = useState("");
  const [jumlah, setJumlah] = useState("");

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery<DonasiCampaign[]>({
    queryKey: ["/api/donasi-campaign"],
  });

  const { data: myDonasi } = useQuery<(Donasi & { judulCampaign: string })[]>({
    queryKey: ["/api/donasi"],
  });

  const { data: leaderboard } = useQuery<{ namaDonatur: string; total: number; count: number }[]>({
    queryKey: ["/api/donasi/leaderboard"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/donasi", {
        campaignId: parseInt(selectedCampaign),
        kkId: user?.kkId,
        namaDonatur,
        jumlah: parseInt(jumlah),
      });
    },
    onSuccess: () => {
      toast({ title: "Donasi tercatat!", description: "Menunggu konfirmasi admin." });
      setShowForm(false);
      setSelectedCampaign("");
      setNamaDonatur("");
      setJumlah("");
      queryClient.invalidateQueries({ queryKey: ["/api/donasi"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal mencatat donasi", description: err.message, variant: "destructive" });
    },
  });

  const activeCampaigns = campaigns?.filter(c => c.status === "aktif") || [];

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    dikonfirmasi: { label: "Dikonfirmasi", color: "bg-green-100 text-green-800", icon: CheckCircle },
    ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowForm(false)} data-testid="button-back-donasi">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-bold">Laporkan Donasi</h2>
        </div>

        <Card className="border-[hsl(163,55%,22%)]/20 bg-[hsl(163,55%,22%)]/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Langkah Donasi:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Klik tombol "Donasi via Saweria" di bawah</li>
              <li>Transfer sesuai jumlah yang diinginkan</li>
              <li>Kembali ke sini, isi form nama & jumlah donasi</li>
              <li>Admin akan memverifikasi pembayaran Anda</li>
            </ol>
            <Button
              className="w-full mt-3 gap-2"
              variant="outline"
              onClick={() => window.open(SAWERIA_LINK, "_blank")}
              data-testid="button-saweria-link"
            >
              <ExternalLink className="w-4 h-4" />
              Donasi via Saweria
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih Campaign Donasi</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="h-11" data-testid="select-campaign-donasi">
                  <SelectValue placeholder="Pilih campaign" />
                </SelectTrigger>
                <SelectContent>
                  {activeCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.judul}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Nama Donatur (sesuai di Saweria)</Label>
              <Input
                value={namaDonatur}
                onChange={(e) => setNamaDonatur(e.target.value)}
                placeholder="Nama yang digunakan saat donasi"
                className="h-11"
                data-testid="input-nama-donatur"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Jumlah Donasi (Rp)</Label>
              <Input
                type="number"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="Contoh: 50000"
                className="h-11"
                data-testid="input-jumlah-donasi"
              />
            </div>

            <Button
              className="w-full h-12 text-base"
              onClick={() => createMutation.mutate()}
              disabled={!selectedCampaign || !namaDonatur || !jumlah || parseInt(jumlah) <= 0 || createMutation.isPending}
              data-testid="button-kirim-donasi"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Laporkan Donasi
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-donasi-page-title">Donasi</h2>

      {activeCampaigns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold" data-testid="text-campaign-title">Campaign Donasi</h3>
          {activeCampaigns.map((c) => (
            <Card key={c.id} className="border-[hsl(163,55%,22%)]/30" data-testid={`card-campaign-${c.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(163,55%,22%)]/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-[hsl(163,55%,22%)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{c.judul}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.deskripsi}</p>
                    {c.targetDana && (
                      <p className="text-xs text-muted-foreground mt-1">Target: {formatRupiah(c.targetDana)}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            className="w-full gap-2"
            onClick={() => setShowForm(true)}
            data-testid="button-donasi-baru"
          >
            <Heart className="w-4 h-4" />
            Donasi Sekarang
          </Button>
        </div>
      )}

      {loadingCampaigns ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : activeCampaigns.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada campaign donasi aktif</p>
          </CardContent>
        </Card>
      )}

      {leaderboard && leaderboard.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold flex items-center gap-2" data-testid="text-leaderboard-title">
            <Trophy className="w-4 h-4 text-[hsl(40,45%,55%)]" />
            Leaderboard Donatur
          </h3>
          {leaderboard.slice(0, 10).map((entry, idx) => (
            <Card key={entry.namaDonatur} data-testid={`card-leaderboard-${idx}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  idx === 0 ? "bg-yellow-100 text-yellow-700" :
                  idx === 1 ? "bg-gray-100 text-gray-600" :
                  idx === 2 ? "bg-orange-100 text-orange-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{entry.namaDonatur}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.count}x donasi</p>
                </div>
                <p className="font-bold text-sm text-[hsl(163,55%,22%)] flex-shrink-0">
                  {formatRupiah(entry.total)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {myDonasi && myDonasi.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold" data-testid="text-riwayat-donasi">Riwayat Donasi Saya</h3>
          {myDonasi.map((d) => {
            const sc = statusConfig[d.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <Card key={d.id} data-testid={`card-donasi-${d.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{d.judulCampaign}</p>
                      <p className="text-xs text-muted-foreground">a.n. {d.namaDonatur}</p>
                      <p className="text-sm font-bold text-[hsl(163,55%,22%)] mt-0.5">{formatRupiah(d.jumlah)}</p>
                    </div>
                    <Badge className={`${sc.color} text-[10px] gap-1 flex-shrink-0`}>
                      <StatusIcon className="w-3 h-3" />
                      {sc.label}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
