import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, FileText, Upload, Loader2, File } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef } from "react";
import type { SuratWarga, Warga } from "@shared/schema";

export default function AdminKelolaSurat() {
  const { toast } = useToast();
  const [approveDialog, setApproveDialog] = useState<SuratWarga | null>(null);
  const [nomorSuratInput, setNomorSuratInput] = useState("");
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);

  const { data: suratList, isLoading } = useQuery<SuratWarga[]>({ queryKey: ["/api/surat-warga"] });
  const { data: wargaList } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, nomorSurat }: { id: number; status: string; nomorSurat?: string }) => {
      await apiRequest("PATCH", `/api/surat-warga/${id}/status`, { status, nomorSurat });
    },
    onSuccess: () => {
      toast({ title: "Status surat diperbarui" });
      queryClient.invalidateQueries({ queryKey: ["/api/surat-warga"] });
      setApproveDialog(null);
      setNomorSuratInput("");
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const handleUploadClick = (suratId: number) => {
    setUploadTargetId(suratId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    setUploadingId(uploadTargetId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/surat-warga/${uploadTargetId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal upload");
      toast({ title: "File surat berhasil diupload!" });
      queryClient.invalidateQueries({ queryKey: ["/api/surat-warga"] });
    } catch (err: any) {
      toast({ title: "Gagal upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingId(null);
      setUploadTargetId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getWargaName = (id: number) => wargaList?.find(w => w.id === id)?.namaLengkap || "Warga";

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    disetujui: { label: "Disetujui", color: "bg-green-100 text-green-800", icon: CheckCircle },
    ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-kelola-surat-title">Kelola Surat Warga</h2>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
      />

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
                    {s.keterangan && <p className="text-xs text-muted-foreground">Keterangan: {s.keterangan}</p>}
                    {s.nomorSurat && <p className="text-xs font-medium text-primary">No: {s.nomorSurat}</p>}
                  </div>
                  <Badge className={`${sc.color} text-[10px] gap-1 flex-shrink-0`}>
                    <StatusIcon className="w-3 h-3" />{sc.label}
                  </Badge>
                </div>

                {s.fileSurat && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <File className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-xs text-green-700 dark:text-green-300 flex-1">Arsip surat sudah diupload</span>
                    <a
                      href={s.fileSurat}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-700 dark:text-green-300 underline"
                      data-testid={`link-file-surat-${s.id}`}
                    >
                      Lihat
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {s.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-700 gap-1"
                        onClick={() => { setApproveDialog(s); setNomorSuratInput(""); }}
                        disabled={updateMutation.isPending}
                        data-testid={`button-setujui-surat-${s.id}`}
                      >
                        <CheckCircle className="w-3 h-3" /> Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => updateMutation.mutate({ id: s.id, status: "ditolak" })}
                        disabled={updateMutation.isPending}
                        data-testid={`button-tolak-surat-${s.id}`}
                      >
                        <XCircle className="w-3 h-3" /> Tolak
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handleUploadClick(s.id)}
                    disabled={uploadingId === s.id}
                    data-testid={`button-upload-surat-${s.id}`}
                  >
                    {uploadingId === s.id ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="w-3 h-3" /> {s.fileSurat ? "Ganti Scan" : "Upload Scan"}</>
                    )}
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Setujui Surat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {approveDialog?.jenisSurat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p className="text-xs text-muted-foreground">Pemohon: {approveDialog ? getWargaName(approveDialog.wargaId) : ""}</p>
              <p className="text-xs text-muted-foreground">Perihal: {approveDialog?.perihal}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor Surat (opsional)</label>
              <Input
                value={nomorSuratInput}
                onChange={e => setNomorSuratInput(e.target.value)}
                placeholder="Contoh: 001/SK-W/RW-03/03/2026"
                className="h-10"
                data-testid="input-nomor-surat-approve"
              />
              <p className="text-[10px] text-muted-foreground">Isi nomor surat jika sudah ada. Bisa diisi nanti.</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-700 gap-1"
                onClick={() => {
                  if (approveDialog) {
                    updateMutation.mutate({
                      id: approveDialog.id,
                      status: "disetujui",
                      nomorSurat: nomorSuratInput || undefined,
                    });
                  }
                }}
                disabled={updateMutation.isPending}
                data-testid="button-confirm-setujui"
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Setujui Surat</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setApproveDialog(null)} data-testid="button-cancel-setujui">
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
