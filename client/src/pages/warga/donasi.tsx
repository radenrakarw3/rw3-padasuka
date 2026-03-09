import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, CheckCircle, XCircle, Heart, Trophy,
  ExternalLink, ArrowLeft, ChevronDown, ChevronUp
} from "lucide-react";
import type { DonasiCampaign, Donasi } from "@shared/schema";

const SAWERIA_LINK = "https://saweria.co/rw3padasuka";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function WargaDonasi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [namaDonatur, setNamaDonatur] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRiwayat, setShowRiwayat] = useState(false);

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery<DonasiCampaign[]>({
    queryKey: ["/api/donasi-campaign"],
  });

  const { data: myDonasi } = useQuery<(Donasi & { judulCampaign: string })[]>({
    queryKey: ["/api/donasi"],
  });

  const { data: leaderboard } = useQuery<{ namaDonatur: string; total: number; count: number }[]>({
    queryKey: ["/api/donasi/leaderboard"],
  });

  const { data: terkumpulMap } = useQuery<Record<number, number>>({
    queryKey: ["/api/donasi/terkumpul"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/donasi", {
        campaignId: selectedCampaignId,
        kkId: user?.kkId,
        namaDonatur,
        jumlah: parseInt(jumlah),
      });
    },
    onSuccess: () => {
      toast({ title: "Berhasil!", description: "Donasi Anda tercatat. Menunggu konfirmasi admin." });
      setStep(0);
      setSelectedCampaignId(null);
      setNamaDonatur("");
      setJumlah("");
      queryClient.invalidateQueries({ queryKey: ["/api/donasi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/donasi/terkumpul"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const activeCampaigns = campaigns?.filter(c => c.status === "aktif") || [];
  const selectedCampaign = activeCampaigns.find(c => c.id === selectedCampaignId);

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    dikonfirmasi: { label: "Diterima", color: "bg-green-100 text-green-800", icon: CheckCircle },
    ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  if (loadingCampaigns) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (step === 1 && selectedCampaign) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setStep(0)}
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="button-back-donasi"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>

        <Card className="bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,16%)] text-white border-0">
          <CardContent className="p-5 text-center">
            <Heart className="w-10 h-10 mx-auto mb-2 text-[hsl(40,45%,65%)]" />
            <p className="text-lg font-bold">{selectedCampaign.judul}</p>
            <p className="text-base text-white/80 mt-1">{selectedCampaign.deskripsi}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-[hsl(163,55%,22%)]/30">
          <CardContent className="p-5">
            <p className="text-base font-bold text-center mb-5">Cara Donasi</p>

            <div className="space-y-5">
              <div className="flex gap-4" data-testid="step-1-saweria">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg font-bold">1</span>
                  </div>
                  <div className="w-0.5 flex-1 bg-[hsl(163,55%,22%)]/20 mt-1" />
                </div>
                <div className="pb-2 flex-1">
                  <p className="text-base font-bold">Kirim Donasi via Saweria</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Tekan tombol hijau di bawah ini. Anda akan diarahkan ke halaman Saweria untuk mengirim donasi.
                  </p>
                  <Button
                    className="w-full mt-3 h-12 text-base gap-2 bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)]"
                    onClick={() => window.open(SAWERIA_LINK, "_blank")}
                    data-testid="button-saweria-link"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Buka Saweria Sekarang
                  </Button>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-2-nama">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg font-bold">2</span>
                  </div>
                  <div className="w-0.5 flex-1 bg-[hsl(163,55%,22%)]/20 mt-1" />
                </div>
                <div className="pb-2 flex-1">
                  <p className="text-base font-bold">Tulis Nama Anda</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Tulis nama yang sama seperti yang Anda pakai saat donasi di Saweria.
                  </p>
                  <Input
                    value={namaDonatur}
                    onChange={(e) => setNamaDonatur(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="mt-2 h-12 text-base"
                    data-testid="input-nama-donatur"
                  />
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-3-jumlah">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg font-bold">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold">Tulis Jumlah Donasi</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Tulis jumlah uang yang Anda kirim (dalam Rupiah, angka saja).
                  </p>
                  <Input
                    type="number"
                    value={jumlah}
                    onChange={(e) => setJumlah(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="mt-2 h-12 text-base"
                    data-testid="input-jumlah-donasi"
                  />
                  {jumlah && parseInt(jumlah) > 0 && (
                    <p className="text-sm font-semibold text-[hsl(163,55%,22%)] mt-1.5">
                      = {formatRupiah(parseInt(jumlah))}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button
              className="w-full h-14 text-lg mt-6 gap-2"
              onClick={() => createMutation.mutate()}
              disabled={!namaDonatur.trim() || !jumlah || parseInt(jumlah) <= 0 || createMutation.isPending}
              data-testid="button-kirim-donasi"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Kirim Konfirmasi Donasi
                </span>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center mt-3 leading-relaxed">
              Setelah dikirim, admin akan memeriksa dan mengkonfirmasi donasi Anda.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,16%)] text-white border-0">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-7 h-7 text-[hsl(40,45%,65%)]" />
            <h2 className="text-lg font-bold" data-testid="text-donasi-page-title">Donasi Warga</h2>
          </div>
          <p className="text-base text-white/80 leading-relaxed">
            Bantu kegiatan dan pembangunan di lingkungan RW 03. Pilih kegiatan di bawah, lalu ikuti langkah-langkahnya.
          </p>
        </CardContent>
      </Card>

      {activeCampaigns.length > 0 ? (
        <div className="space-y-3">
          <p className="text-base font-bold" data-testid="text-campaign-title">Pilih Kegiatan yang Ingin Dibantu:</p>
          {activeCampaigns.map((c) => {
            const collected = Number(terkumpulMap?.[c.id] || 0);
            const target = Number(c.targetDana || 0);
            const persen = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;

            return (
              <Card
                key={c.id}
                className="border-2 cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                onClick={() => {
                  setSelectedCampaignId(c.id);
                  setStep(1);
                }}
                data-testid={`card-campaign-${c.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(163,55%,22%)]/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-6 h-6 text-[hsl(163,55%,22%)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base">{c.judul}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{c.deskripsi}</p>

                      <div className="mt-3">
                        <div className="flex items-end justify-between mb-1.5">
                          <div>
                            <p className="text-xs text-muted-foreground">Terkumpul</p>
                            <p className="text-base font-bold text-[hsl(163,55%,22%)]">{formatRupiah(collected)}</p>
                          </div>
                          {target > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Target</p>
                              <p className="text-base font-semibold">{formatRupiah(target)}</p>
                            </div>
                          )}
                        </div>
                        {target > 0 && (
                          <div className="relative">
                            <div className="h-3.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[hsl(163,55%,22%)] rounded-full transition-all"
                                style={{ width: `${persen}%` }}
                                data-testid={`progress-campaign-${c.id}`}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-right mt-0.5">{persen}%</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-center gap-2 py-3 bg-[hsl(163,55%,22%)] text-white rounded-lg">
                        <Heart className="w-5 h-5" />
                        <span className="text-base font-semibold">Donasi untuk Kegiatan Ini</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-base font-semibold text-muted-foreground">Belum Ada Kegiatan</p>
            <p className="text-sm text-muted-foreground mt-1">Saat ini belum ada kegiatan donasi yang dibuka.</p>
          </CardContent>
        </Card>
      )}

      {leaderboard && leaderboard.length > 0 && (
        <Card data-testid="card-leaderboard-section">
          <CardContent className="p-0">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="w-full flex items-center justify-between p-4"
              data-testid="button-toggle-leaderboard"
            >
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[hsl(40,45%,55%)]" />
                <span className="text-base font-bold">Donatur Terbanyak</span>
              </div>
              {showLeaderboard ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showLeaderboard && (
              <div className="px-4 pb-4 space-y-2 border-t pt-3">
                {leaderboard.slice(0, 10).map((entry, idx) => (
                  <div key={entry.namaDonatur} className="flex items-center gap-3" data-testid={`card-leaderboard-${idx}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      idx === 0 ? "bg-yellow-100 text-yellow-700" :
                      idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{entry.namaDonatur}</p>
                    </div>
                    <p className="font-bold text-base text-[hsl(163,55%,22%)] flex-shrink-0">
                      {formatRupiah(Number(entry.total))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {myDonasi && myDonasi.length > 0 && (
        <Card data-testid="card-riwayat-section">
          <CardContent className="p-0">
            <button
              onClick={() => setShowRiwayat(!showRiwayat)}
              className="w-full flex items-center justify-between p-4"
              data-testid="button-toggle-riwayat"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-base font-bold">Donasi Saya ({myDonasi.length})</span>
              </div>
              {showRiwayat ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showRiwayat && (
              <div className="px-4 pb-4 space-y-2.5 border-t pt-3">
                {myDonasi.map((d) => {
                  const sc = statusConfig[d.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  return (
                    <div key={d.id} className="flex items-center gap-3 py-1" data-testid={`card-donasi-${d.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{d.judulCampaign}</p>
                        <p className="text-sm text-muted-foreground">
                          {d.createdAt ? new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-[hsl(163,55%,22%)] flex-shrink-0">
                        {formatRupiah(Number(d.jumlah))}
                      </p>
                      <Badge className={`${sc.color} text-xs gap-1 flex-shrink-0`}>
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
