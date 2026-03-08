import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, ScrollText, Eye, Download, Loader2 } from "lucide-react";
import type { SuratRw } from "@shared/schema";
import KopSurat from "@/components/kop-surat";
import { generateSuratPDF } from "@/lib/pdf-surat";

const jenisSuratRwOptions = [
  { value: "Surat Undangan", label: "Surat Undangan" },
  { value: "Surat Undangan Klarifikasi", label: "Surat Undangan Klarifikasi" },
  { value: "Surat Tugas", label: "Surat Tugas" },
  { value: "Surat Permohonan Audiensi", label: "Surat Permohonan Audiensi" },
  { value: "Surat Pengajuan Perbaikan", label: "Surat Pengajuan Perbaikan" },
  { value: "Surat Pengajuan", label: "Surat Pengajuan" },
  { value: "Surat Permohonan Bantuan", label: "Surat Permohonan Bantuan" },
  { value: "Surat Edaran", label: "Surat Edaran" },
];

export default function AdminSuratRw() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewSurat, setPreviewSurat] = useState<SuratRw | null>(null);
  const [form, setForm] = useState({
    jenisSurat: "", perihal: "", tujuan: "", tanggalSurat: "",
  });

  const { data: suratList, isLoading } = useQuery<SuratRw[]>({ queryKey: ["/api/surat-rw"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/surat-rw", {
        ...form,
        tujuan: form.tujuan || undefined,
        tanggalSurat: form.tanggalSurat || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Surat RW berhasil dibuat!" });
      setDialogOpen(false);
      setForm({ jenisSurat: "", perihal: "", tujuan: "", tanggalSurat: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/surat-rw"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const handleDownload = async (surat: SuratRw) => {
    if (!surat.isiSurat) return;
    try {
      await generateSuratPDF({
        nomorSurat: surat.nomorSurat,
        isiSurat: surat.isiSurat,
        jenisSurat: surat.jenisSurat,
        fileName: `${surat.jenisSurat.replace(/\s/g, "_")}_${surat.nomorSurat?.replace(/\//g, "-") || surat.id}`,
      });
    } catch {
      toast({ title: "Gagal membuat PDF", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-surat-rw-title">Surat Sakti RW</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" data-testid="button-buat-surat-rw">
              <Plus className="w-4 h-4" /> Buat Surat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Buat Surat RW</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Jenis Surat</Label>
                <Select value={form.jenisSurat} onValueChange={v => setForm({...form, jenisSurat: v})}>
                  <SelectTrigger className="h-10" data-testid="select-jenis-surat-rw"><SelectValue placeholder="Pilih jenis surat" /></SelectTrigger>
                  <SelectContent>
                    {jenisSuratRwOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Perihal</Label>
                <Input value={form.perihal} onChange={e => setForm({...form, perihal: e.target.value})} placeholder="Perihal surat" className="h-10" data-testid="input-perihal-surat-rw" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Ditujukan Kepada (opsional)</Label>
                <Input value={form.tujuan} onChange={e => setForm({...form, tujuan: e.target.value})} placeholder="Tujuan surat" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Tanggal Surat (opsional)</Label>
                <Input type="date" value={form.tanggalSurat} onChange={e => setForm({...form, tanggalSurat: e.target.value})} className="h-10" />
              </div>
              <Button className="w-full h-10" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.jenisSurat || !form.perihal} data-testid="button-generate-surat-rw">
                {createMutation.isPending ? "Membuat surat..." : "Generate Surat dengan AI"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : suratList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada surat RW</p>
          </CardContent>
        </Card>
      ) : (
        suratList?.map(s => (
          <Card key={s.id} data-testid={`card-surat-rw-${s.id}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{s.jenisSurat}</p>
                  <p className="text-xs text-muted-foreground">{s.perihal}</p>
                  {s.tujuan && <p className="text-xs text-muted-foreground">Kepada: {s.tujuan}</p>}
                  {s.nomorSurat && <p className="text-xs font-medium text-primary">No: {s.nomorSurat}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setPreviewSurat(s)} data-testid={`button-preview-rw-${s.id}`}>
                  <Eye className="w-3 h-3" /> Lihat
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownload(s)} data-testid={`button-download-rw-${s.id}`}>
                  <Download className="w-3 h-3" /> Download
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={!!previewSurat} onOpenChange={() => setPreviewSurat(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewSurat?.jenisSurat}</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-6 rounded-md border shadow-sm">
            <KopSurat />
            {previewSurat?.nomorSurat && (
              <p className="text-xs font-mono mb-1">Nomor    : {previewSurat.nomorSurat}</p>
            )}
            <pre className="text-xs whitespace-pre-wrap font-mono" data-testid="text-surat-rw-preview">
              {previewSurat?.isiSurat?.replace(/^Nomor\s*:.*\n?/m, "").trim()}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
