import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Heart, Trophy, CheckCircle, XCircle, Clock,
  Target, Pause, Play
} from "lucide-react";
import type { DonasiCampaign, Donasi } from "@shared/schema";

export default function AdminDonasi() {
  const { toast } = useToast();
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [targetDana, setTargetDana] = useState("");

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery<DonasiCampaign[]>({
    queryKey: ["/api/donasi-campaign"],
  });

  const { data: allDonasi, isLoading: loadingDonasi } = useQuery<(Donasi & { judulCampaign: string })[]>({
    queryKey: ["/api/donasi"],
  });

  const { data: leaderboard } = useQuery<{ namaDonatur: string; total: number; count: number }[]>({
    queryKey: ["/api/donasi/leaderboard"],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/donasi-campaign", {
        judul,
        deskripsi,
        targetDana: targetDana ? parseInt(targetDana) : null,
      });
    },
    onSuccess: () => {
      toast({ title: "Campaign dibuat!" });
      setShowCampaignForm(false);
      setJudul("");
      setDeskripsi("");
      setTargetDana("");
      queryClient.invalidateQueries({ queryKey: ["/api/donasi-campaign"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal membuat campaign", description: err.message, variant: "destructive" });
    },
  });

  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/donasi-campaign/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donasi-campaign"] });
    },
  });

  const updateDonasiMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/donasi/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Status donasi diperbarui!" });
      queryClient.invalidateQueries({ queryKey: ["/api/donasi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/donasi/leaderboard"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal memperbarui", description: err.message, variant: "destructive" });
    },
  });

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const pendingDonasi = allDonasi?.filter(d => d.status === "pending") || [];
  const processedDonasi = allDonasi?.filter(d => d.status !== "pending") || [];

  const totalTerkumpul = allDonasi
    ?.filter(d => d.status === "dikonfirmasi")
    .reduce((sum, d) => sum + d.jumlah, 0) || 0;

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    dikonfirmasi: { label: "Dikonfirmasi", color: "bg-green-100 text-green-800", icon: CheckCircle },
    ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-admin-donasi-title">Kelola Donasi</h1>
        <Button onClick={() => setShowCampaignForm(!showCampaignForm)} className="gap-2" data-testid="button-new-campaign">
          <Plus className="w-4 h-4" />
          Campaign Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(163,55%,22%)]/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-[hsl(163,55%,22%)]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Terkumpul</p>
              <p className="text-lg font-bold" data-testid="text-total-terkumpul">{formatRupiah(totalTerkumpul)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Verifikasi</p>
              <p className="text-lg font-bold" data-testid="text-pending-donasi">{pendingDonasi.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(40,45%,55%)]/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[hsl(40,45%,55%)]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Donatur</p>
              <p className="text-lg font-bold" data-testid="text-total-donatur">{leaderboard?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showCampaignForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buat Campaign Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Campaign</Label>
              <Input
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Renovasi Mushola RW 03"
                data-testid="input-campaign-judul"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Jelaskan tujuan donasi..."
                rows={3}
                data-testid="input-campaign-deskripsi"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Dana (opsional)</Label>
              <Input
                type="number"
                value={targetDana}
                onChange={(e) => setTargetDana(e.target.value)}
                placeholder="Contoh: 5000000"
                data-testid="input-campaign-target"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createCampaignMutation.mutate()}
                disabled={!judul || !deskripsi || createCampaignMutation.isPending}
                data-testid="button-save-campaign"
              >
                {createCampaignMutation.isPending ? "Menyimpan..." : "Simpan Campaign"}
              </Button>
              <Button variant="outline" onClick={() => setShowCampaignForm(false)} data-testid="button-cancel-campaign">
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingCampaigns ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : campaigns && campaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Campaign</h2>
          {campaigns.map((c) => {
            const campaignDonasi = allDonasi?.filter(d => d.campaignId === c.id && d.status === "dikonfirmasi") || [];
            const collected = campaignDonasi.reduce((s, d) => s + d.jumlah, 0);
            return (
              <Card key={c.id} data-testid={`card-admin-campaign-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{c.judul}</p>
                        <Badge variant={c.status === "aktif" ? "default" : "secondary"} className="text-[10px]">
                          {c.status === "aktif" ? "Aktif" : "Selesai"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.deskripsi}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs">
                          Terkumpul: <span className="font-bold text-[hsl(163,55%,22%)]">{formatRupiah(collected)}</span>
                        </p>
                        {c.targetDana && (
                          <>
                            <p className="text-xs text-muted-foreground">Target: {formatRupiah(c.targetDana)}</p>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className="h-full bg-[hsl(163,55%,22%)] rounded-full transition-all"
                                style={{ width: `${Math.min(100, (collected / c.targetDana) * 100)}%` }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleCampaignMutation.mutate({
                        id: c.id,
                        status: c.status === "aktif" ? "selesai" : "aktif",
                      })}
                      data-testid={`button-toggle-campaign-${c.id}`}
                    >
                      {c.status === "aktif" ? (
                        <><Pause className="w-3 h-3 mr-1" /> Akhiri</>
                      ) : (
                        <><Play className="w-3 h-3 mr-1" /> Aktifkan</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pendingDonasi.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Menunggu Verifikasi ({pendingDonasi.length})
          </h2>
          {pendingDonasi.map((d) => (
            <Card key={d.id} className="border-yellow-200" data-testid={`card-pending-donasi-${d.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{d.judulCampaign}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Donatur: <span className="font-medium text-foreground">{d.namaDonatur}</span></p>
                    <p className="text-base font-bold text-[hsl(163,55%,22%)] mt-1">{formatRupiah(d.jumlah)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {d.createdAt ? new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => updateDonasiMutation.mutate({ id: d.id, status: "dikonfirmasi" })}
                      disabled={updateDonasiMutation.isPending}
                      data-testid={`button-konfirmasi-donasi-${d.id}`}
                    >
                      <CheckCircle className="w-3 h-3" />
                      Konfirmasi
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => updateDonasiMutation.mutate({ id: d.id, status: "ditolak" })}
                      disabled={updateDonasiMutation.isPending}
                      data-testid={`button-tolak-donasi-${d.id}`}
                    >
                      <XCircle className="w-3 h-3" />
                      Tolak
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {leaderboard && leaderboard.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[hsl(40,45%,55%)]" />
            Leaderboard Donatur
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {leaderboard.map((entry, idx) => (
                  <div key={entry.namaDonatur} className="flex items-center gap-3 p-3" data-testid={`row-leaderboard-${idx}`}>
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {processedDonasi.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Riwayat Donasi</h2>
          {processedDonasi.slice(0, 20).map((d) => {
            const sc = statusConfig[d.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <Card key={d.id} data-testid={`card-riwayat-donasi-${d.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{d.namaDonatur}</p>
                    <p className="text-xs text-muted-foreground">{d.judulCampaign}</p>
                  </div>
                  <p className="font-bold text-sm flex-shrink-0">{formatRupiah(d.jumlah)}</p>
                  <Badge className={`${sc.color} text-[10px] gap-1 flex-shrink-0`}>
                    <StatusIcon className="w-3 h-3" />
                    {sc.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
