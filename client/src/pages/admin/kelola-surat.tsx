import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, FileText, Eye, Sparkles, Loader2, Download, Printer, HandCoins, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import type { SuratWarga, Warga } from "@shared/schema";
import KopSurat from "@/components/kop-surat";
import { generateSuratPDF } from "@/lib/pdf-surat";

export default function AdminKelolaSurat() {
  const { toast } = useToast();
  const [previewSurat, setPreviewSurat] = useState<SuratWarga | null>(null);

  const { data: suratList, isLoading } = useQuery<SuratWarga[]>({ queryKey: ["/api/surat-warga"] });
  const { data: wargaList } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });

  const generateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/surat-warga/${id}/generate`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Surat berhasil di-generate!" });
      queryClient.invalidateQueries({ queryKey: ["/api/surat-warga"] });
      setPreviewSurat(data);
    },
    onError: (err: any) => toast({ title: "Gagal generate", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/surat-warga/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Status surat diperbarui" });
      queryClient.invalidateQueries({ queryKey: ["/api/surat-warga"] });
      setPreviewSurat(null);
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const [sendingWa, setSendingWa] = useState<number | null>(null);
  const handleSendPdfWa = async (s: SuratWarga) => {
    if (!s.isiSurat) return;
    setSendingWa(s.id);
    try {
      const label = s.jenisSurat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      const blob = await generateSuratPDF({
        nomorSurat: s.nomorSurat,
        isiSurat: s.isiSurat,
        jenisSurat: label,
        returnBlob: true,
      });
      if (!blob) throw new Error("Gagal membuat PDF");
      const formData = new FormData();
      const fileName = `${label.replace(/\s/g, "_")}_${s.nomorSurat?.replace(/\//g, "-") || s.id}.pdf`;
      formData.append("file", new File([blob], fileName, { type: "application/pdf" }));
      const res = await fetch(`/api/surat-warga/${s.id}/send-pdf-wa`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengirim");
      toast({ title: "PDF surat berhasil dikirim via WhatsApp!" });
    } catch (err: any) {
      toast({ title: "Gagal kirim PDF via WA", description: err.message, variant: "destructive" });
    } finally {
      setSendingWa(null);
    }
  };

  const getWargaName = (id: number) => wargaList?.find(w => w.id === id)?.namaLengkap || "Warga";

  const handleDownloadPDF = async (s: SuratWarga) => {
    if (!s.isiSurat) return;
    try {
      const label = s.jenisSurat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      await generateSuratPDF({
        nomorSurat: s.nomorSurat,
        isiSurat: s.isiSurat,
        jenisSurat: label,
        fileName: `Surat_${label.replace(/\s/g, "_")}_${s.nomorSurat?.replace(/\//g, "-") || s.id}`,
      });
    } catch {
      toast({ title: "Gagal membuat PDF", variant: "destructive" });
    }
  };

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
          const hasContent = !!s.isiSurat;
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
                    {s.keterangan && <p className="text-xs text-muted-foreground">Keterangan: {s.keterangan}</p>}
                    {s.nomorSurat && <p className="text-xs font-medium text-primary">No: {s.nomorSurat}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge className={`${sc.color} text-[10px] gap-1`}>
                      <StatusIcon className="w-3 h-3" />{sc.label}
                    </Badge>
                    <Badge
                      variant={s.metodeLayanan === "tau_beres" ? "default" : "outline"}
                      className={`text-[10px] gap-1 ${s.metodeLayanan === "tau_beres" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                      data-testid={`badge-metode-admin-${s.id}`}
                    >
                      {s.metodeLayanan === "tau_beres" ? (
                        <><HandCoins className="w-3 h-3" /> Tau Beres</>
                      ) : (
                        <><Printer className="w-3 h-3" /> Print Mandiri</>
                      )}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {s.status === "pending" && (
                    <Button
                      size="sm"
                      className="gap-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => generateMutation.mutate(s.id)}
                      disabled={generateMutation.isPending}
                      data-testid={`button-generate-surat-${s.id}`}
                    >
                      {generateMutation.isPending ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="w-3 h-3" /> {hasContent ? "Re-generate" : "Generate Surat"}</>
                      )}
                    </Button>
                  )}
                  {hasContent && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setPreviewSurat(s)} data-testid={`button-preview-surat-${s.id}`}>
                      <Eye className="w-3 h-3" /> Lihat Surat
                    </Button>
                  )}
                  {hasContent && s.status === "pending" && (
                    <>
                      <Button size="sm" className="bg-green-700 gap-1" onClick={() => updateMutation.mutate({ id: s.id, status: "disetujui" })} disabled={updateMutation.isPending} data-testid={`button-setujui-surat-${s.id}`}>
                        <CheckCircle className="w-3 h-3" /> Setujui
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateMutation.mutate({ id: s.id, status: "ditolak" })} disabled={updateMutation.isPending} data-testid={`button-tolak-surat-${s.id}`}>
                        <XCircle className="w-3 h-3" /> Tolak
                      </Button>
                    </>
                  )}
                  {!hasContent && s.status === "pending" && (
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateMutation.mutate({ id: s.id, status: "ditolak" })} disabled={updateMutation.isPending} data-testid={`button-tolak-surat-${s.id}-nogen`}>
                      <XCircle className="w-3 h-3" /> Tolak
                    </Button>
                  )}
                  {hasContent && s.status === "disetujui" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownloadPDF(s)} data-testid={`button-download-surat-${s.id}`}>
                        <Download className="w-3 h-3" /> Download PDF
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleSendPdfWa(s)}
                        disabled={sendingWa === s.id}
                        data-testid={`button-wa-surat-${s.id}`}
                      >
                        {sendingWa === s.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Mengirim PDF...</>
                        ) : (
                          <><Send className="w-3 h-3" /> Kirim PDF via WA</>
                        )}
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
            {previewSurat?.nomorSurat && (
              <p className="text-xs font-mono mb-1">Nomor    : {previewSurat.nomorSurat}</p>
            )}
            <pre className="text-xs whitespace-pre-wrap font-mono" data-testid="text-surat-preview">
              {previewSurat?.isiSurat?.replace(/^Nomor\s*:.*\n?/m, "").trim()}
            </pre>
          </div>
          {previewSurat?.status === "pending" && (
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-green-700 gap-1" onClick={() => updateMutation.mutate({ id: previewSurat.id, status: "disetujui" })} disabled={updateMutation.isPending} data-testid="button-setujui-preview">
                <CheckCircle className="w-4 h-4" /> Setujui Surat
              </Button>
              <Button variant="destructive" className="gap-1" onClick={() => updateMutation.mutate({ id: previewSurat.id, status: "ditolak" })} disabled={updateMutation.isPending} data-testid="button-tolak-preview">
                <XCircle className="w-4 h-4" /> Tolak
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
