import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, FileText, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import type { SuratWarga, Warga } from "@shared/schema";
import KopSurat from "@/components/kop-surat";

export default function AdminKelolaSurat() {
  const { toast } = useToast();
  const [previewSurat, setPreviewSurat] = useState<SuratWarga | null>(null);

  const { data: suratList, isLoading } = useQuery<SuratWarga[]>({ queryKey: ["/api/surat-warga"] });
  const { data: wargaList } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/surat-warga/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Status surat diperbarui" });
      queryClient.invalidateQueries({ queryKey: ["/api/surat-warga"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const getWargaName = (id: number) => wargaList?.find(w => w.id === id)?.namaLengkap || "Warga";

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    disetujui: { label: "Disetujui", color: "bg-green-100 text-green-800", icon: CheckCircle },
    ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-kelola-surat-title">Kelola Surat Warga</h2>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : suratList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada pengajuan surat</p>
          </CardContent>
        </Card>
      ) : (
        suratList?.map(s => {
          const sc = statusConfig[s.status] || statusConfig.pending;
          const StatusIcon = sc.icon;
          return (
            <Card key={s.id} data-testid={`card-surat-admin-${s.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{s.jenisSurat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <p className="text-xs text-muted-foreground">
                      Pemohon: {getWargaName(s.wargaId)} | RT {s.nomorRt.toString().padStart(2,"0")}
                    </p>
                    <p className="text-xs text-muted-foreground">Perihal: {s.perihal}</p>
                  </div>
                  <Badge className={`${sc.color} text-[10px] flex-shrink-0 gap-1`}>
                    <StatusIcon className="w-3 h-3" />{sc.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {s.isiSurat && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setPreviewSurat(s)} data-testid={`button-preview-surat-${s.id}`}>
                      <Eye className="w-3 h-3" /> Lihat Surat
                    </Button>
                  )}
                  {s.status === "pending" && (
                    <>
                      <Button size="sm" className="bg-green-700 gap-1" onClick={() => updateMutation.mutate({ id: s.id, status: "disetujui" })} disabled={updateMutation.isPending} data-testid={`button-setujui-surat-${s.id}`}>
                        <CheckCircle className="w-3 h-3" /> Setujui
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateMutation.mutate({ id: s.id, status: "ditolak" })} disabled={updateMutation.isPending} data-testid={`button-tolak-surat-${s.id}`}>
                        <XCircle className="w-3 h-3" /> Tolak
                      </Button>
                    </>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={!!previewSurat} onOpenChange={() => setPreviewSurat(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Surat</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-6 rounded-md border shadow-sm">
            <KopSurat />
            <pre className="text-xs whitespace-pre-wrap font-mono" data-testid="text-surat-preview">
              {previewSurat?.isiSurat}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
