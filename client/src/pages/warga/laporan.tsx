import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Clock, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import type { Laporan, Warga } from "@shared/schema";

export default function WargaLaporan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedWarga, setSelectedWarga] = useState("");
  const [jenisLaporan, setJenisLaporan] = useState("umum");
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");

  const { data: laporanList, isLoading } = useQuery<Laporan[]>({
    queryKey: ["/api/laporan"],
  });

  const { data: anggota } = useQuery<Warga[]>({
    queryKey: ["/api/warga/kk", user?.kkId],
    enabled: !!user?.kkId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/laporan", {
        wargaId: parseInt(selectedWarga),
        kkId: user?.kkId,
        jenisLaporan,
        judul,
        isi,
      });
    },
    onSuccess: () => {
      toast({ title: "Laporan terkirim!" });
      setShowForm(false);
      setJudul("");
      setIsi("");
      setSelectedWarga("");
      queryClient.invalidateQueries({ queryKey: ["/api/laporan"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal mengirim", description: err.message, variant: "destructive" });
    },
  });

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    diproses: { label: "Diproses", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
    selesai: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle },
  };

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowForm(false)} data-testid="button-back-laporan">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-bold">Buat Laporan Baru</h2>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pelapor (Anggota KK)</Label>
              <Select value={selectedWarga} onValueChange={setSelectedWarga}>
                <SelectTrigger className="h-11" data-testid="select-pelapor">
                  <SelectValue placeholder="Pilih anggota keluarga" />
                </SelectTrigger>
                <SelectContent>
                  {anggota?.map((w) => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      {w.namaLengkap} ({w.kedudukanKeluarga})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Jenis Laporan</Label>
              <Select value={jenisLaporan} onValueChange={setJenisLaporan}>
                <SelectTrigger className="h-11" data-testid="select-jenis-laporan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="umum">Laporan Umum</SelectItem>
                  <SelectItem value="bansos">Laporan Bansos</SelectItem>
                  <SelectItem value="keamanan">Keamanan</SelectItem>
                  <SelectItem value="kebersihan">Kebersihan</SelectItem>
                  <SelectItem value="infrastruktur">Infrastruktur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Judul Laporan</Label>
              <Input
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Jalan rusak di depan rumah"
                className="h-11"
                data-testid="input-judul-laporan"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Isi Laporan</Label>
              <Textarea
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                placeholder="Jelaskan laporan Anda secara detail..."
                rows={5}
                data-testid="input-isi-laporan"
              />
            </div>

            <Button
              className="w-full h-12 text-base"
              onClick={() => createMutation.mutate()}
              disabled={!selectedWarga || !judul || !isi || createMutation.isPending}
              data-testid="button-kirim-laporan"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Kirim Laporan
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
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold" data-testid="text-laporan-title">Laporan Saya</h2>
        <Button onClick={() => setShowForm(true)} className="gap-1.5" data-testid="button-buat-laporan">
          <Plus className="w-4 h-4" />
          Buat Laporan
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : laporanList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada laporan</p>
            <p className="text-xs text-muted-foreground mt-1">Tekan tombol "Buat Laporan" untuk membuat laporan baru</p>
          </CardContent>
        </Card>
      ) : (
        laporanList?.map((lap) => {
          const sc = statusConfig[lap.status] || statusConfig.pending;
          const StatusIcon = sc.icon;
          return (
            <Card key={lap.id} data-testid={`card-laporan-${lap.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{lap.judul}</p>
                    <p className="text-xs text-muted-foreground capitalize">{lap.jenisLaporan}</p>
                  </div>
                  <Badge className={`${sc.color} text-[10px] flex-shrink-0 gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {sc.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{lap.isi}</p>
                {lap.tanggapanAdmin && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <p className="text-xs font-medium">Tanggapan Admin:</p>
                    <p className="text-xs text-muted-foreground">{lap.tanggapanAdmin}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">
                  {lap.createdAt ? new Date(lap.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
