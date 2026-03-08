import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Clock, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import type { Laporan, Warga } from "@shared/schema";

export default function AdminKelolaLaporan() {
  const { toast } = useToast();
  const [tanggapan, setTanggapan] = useState<Record<number, string>>({});

  const { data: laporanList, isLoading } = useQuery<Laporan[]>({ queryKey: ["/api/laporan"] });
  const { data: wargaList } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, tanggapanText }: { id: number; status: string; tanggapanText?: string }) => {
      await apiRequest("PATCH", `/api/laporan/${id}/status`, { status, tanggapan: tanggapanText });
    },
    onSuccess: () => {
      toast({ title: "Status diperbarui" });
      queryClient.invalidateQueries({ queryKey: ["/api/laporan"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const getWargaName = (id: number) => wargaList?.find(w => w.id === id)?.namaLengkap || "Warga";

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    diproses: { label: "Diproses", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
    selesai: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-kelola-laporan-title">Kelola Laporan</h2>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : laporanList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada laporan masuk</p>
          </CardContent>
        </Card>
      ) : (
        laporanList?.map(lap => {
          const sc = statusConfig[lap.status] || statusConfig.pending;
          const StatusIcon = sc.icon;
          return (
            <Card key={lap.id} data-testid={`card-laporan-admin-${lap.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{lap.judul}</p>
                    <p className="text-xs text-muted-foreground">
                      Oleh: {getWargaName(lap.wargaId)} | {lap.jenisLaporan}
                    </p>
                  </div>
                  <Badge className={`${sc.color} text-[10px] flex-shrink-0 gap-1`}>
                    <StatusIcon className="w-3 h-3" />{sc.label}
                  </Badge>
                </div>
                <p className="text-xs">{lap.isi}</p>
                {lap.status === "pending" && (
                  <div className="space-y-2 pt-2 border-t">
                    <Textarea
                      placeholder="Tulis tanggapan (opsional)..."
                      value={tanggapan[lap.id] || ""}
                      onChange={e => setTanggapan({...tanggapan, [lap.id]: e.target.value})}
                      rows={2}
                      data-testid={`input-tanggapan-${lap.id}`}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateMutation.mutate({ id: lap.id, status: "diproses", tanggapanText: tanggapan[lap.id] })} disabled={updateMutation.isPending} data-testid={`button-proses-${lap.id}`}>
                        Proses
                      </Button>
                      <Button size="sm" variant="default" className="bg-green-700" onClick={() => updateMutation.mutate({ id: lap.id, status: "selesai", tanggapanText: tanggapan[lap.id] })} disabled={updateMutation.isPending} data-testid={`button-selesai-${lap.id}`}>
                        Selesai
                      </Button>
                    </div>
                  </div>
                )}
                {lap.tanggapanAdmin && (
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-xs font-medium">Tanggapan:</p>
                    <p className="text-xs text-muted-foreground">{lap.tanggapanAdmin}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
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
