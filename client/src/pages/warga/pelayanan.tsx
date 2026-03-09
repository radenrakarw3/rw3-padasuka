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
import { Plus, FileText, Clock, CheckCircle, XCircle, Download, ArrowLeft, Loader2, Printer, HandCoins } from "lucide-react";
import type { SuratWarga, Warga, KartuKeluarga } from "@shared/schema";
import { generateSuratPDF } from "@/lib/pdf-surat";

const metodeLayananOptions = [
  {
    value: "print_mandiri",
    label: "Print Mandiri",
    icon: Printer,
    description: "Download PDF & print sendiri",
    detail: "Gratis",
  },
  {
    value: "tau_beres",
    label: "Tau Beres",
    icon: HandCoins,
    description: "Surat di-print & ditandatangani RT/RW",
    detail: "Infaq seikhlasnya untuk Kas RW",
  },
];

const jenisSuratOptions = [
  { value: "surat_keterangan_domisili", label: "Surat Keterangan Domisili" },
  { value: "surat_keterangan_tidak_mampu", label: "Surat Keterangan Tidak Mampu" },
  { value: "surat_keterangan_usaha", label: "Surat Keterangan Usaha" },
  { value: "surat_keterangan_belum_menikah", label: "Surat Keterangan Belum Menikah" },
  { value: "surat_keterangan_berkelakuan_baik", label: "Surat Keterangan Berkelakuan Baik" },
  { value: "surat_pengantar_rt", label: "Surat Pengantar RT" },
  { value: "surat_keterangan_pindah", label: "Surat Keterangan Pindah" },
  { value: "surat_keterangan_kematian", label: "Surat Keterangan Kematian" },
  { value: "surat_keterangan_lainnya", label: "Surat Keterangan Lainnya" },
];

export default function WargaPelayanan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedWarga, setSelectedWarga] = useState("");
  const [jenisSurat, setJenisSurat] = useState("");
  const [perihal, setPerihal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [metodeLayanan, setMetodeLayanan] = useState("print_mandiri");

  const { data: suratList, isLoading } = useQuery<SuratWarga[]>({
    queryKey: ["/api/surat-warga"],
  });

  const { data: anggota } = useQuery<Warga[]>({
    queryKey: ["/api/warga/kk", user?.kkId],
    enabled: !!user?.kkId,
  });

  const { data: kk } = useQuery<KartuKeluarga>({
    queryKey: ["/api/kk", user?.kkId],
    enabled: !!user?.kkId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/surat-warga", {
        wargaId: parseInt(selectedWarga),
        kkId: user?.kkId,
        jenisSurat,
        perihal,
        keterangan: keterangan || undefined,
        metodeLayanan,
        nomorRt: kk?.rt || 1,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Surat diajukan!", description: "Permohonan surat terkirim. Admin akan memproses dan menyetujui surat Anda." });
      setShowForm(false);
      setJenisSurat("");
      setPerihal("");
      setKeterangan("");
      setSelectedWarga("");
      setMetodeLayanan("print_mandiri");
      queryClient.invalidateQueries({ queryKey: ["/api/surat-warga"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal mengajukan", description: err.message, variant: "destructive" });
    },
  });

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    disetujui: { label: "Disetujui", color: "bg-green-100 text-green-800", icon: CheckCircle },
    ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  const [downloadingPdf, setDownloadingPdf] = useState<number | null>(null);
  const handleDownloadPdf = async (s: SuratWarga) => {
    if (!s.isiSurat) return;
    setDownloadingPdf(s.id);
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
    } finally {
      setDownloadingPdf(null);
    }
  };

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowForm(false)} data-testid="button-back-pelayanan">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-bold">Ajukan Surat</h2>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pemohon (Anggota KK)</Label>
              <Select value={selectedWarga} onValueChange={setSelectedWarga}>
                <SelectTrigger className="h-11" data-testid="select-pemohon-surat">
                  <SelectValue placeholder="Pilih warga yang mengajukan" />
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
              <Label className="text-sm font-medium">Jenis Surat</Label>
              <Select value={jenisSurat} onValueChange={setJenisSurat}>
                <SelectTrigger className="h-11" data-testid="select-jenis-surat">
                  <SelectValue placeholder="Pilih jenis surat" />
                </SelectTrigger>
                <SelectContent>
                  {jenisSuratOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Perihal / Keperluan</Label>
              <Input
                value={perihal}
                onChange={(e) => setPerihal(e.target.value)}
                placeholder="Contoh: Keperluan melamar pekerjaan"
                className="h-11"
                data-testid="input-perihal-surat"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Keterangan Tambahan (opsional)</Label>
              <Textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Tambahkan keterangan jika diperlukan..."
                rows={3}
                data-testid="input-keterangan-surat"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih Metode Layanan</Label>
              <div className="grid grid-cols-1 gap-3">
                {metodeLayananOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = metodeLayanan === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMetodeLayanan(opt.value)}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                      data-testid={`option-metode-${opt.value}`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                        <Badge variant={opt.value === "print_mandiri" ? "secondary" : "outline"} className="mt-1.5 text-[10px]">
                          {opt.detail}
                        </Badge>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full h-12 text-base"
              onClick={() => createMutation.mutate()}
              disabled={!selectedWarga || !jenisSurat || !perihal || createMutation.isPending}
              data-testid="button-ajukan-surat"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Ajukan Surat
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
        <h2 className="text-lg font-bold" data-testid="text-pelayanan-title">Pelayanan Surat</h2>
        <Button onClick={() => setShowForm(true)} className="gap-1.5" data-testid="button-ajukan-surat-baru">
          <Plus className="w-4 h-4" />
          Ajukan Surat
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : suratList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada pengajuan surat</p>
            <p className="text-xs text-muted-foreground mt-1">Tekan "Ajukan Surat" untuk membuat permohonan surat baru</p>
          </CardContent>
        </Card>
      ) : (
        suratList?.map((s) => {
          const sc = statusConfig[s.status] || statusConfig.pending;
          const StatusIcon = sc.icon;
          const label = jenisSuratOptions.find(o => o.value === s.jenisSurat)?.label || s.jenisSurat;
          return (
            <Card key={s.id} data-testid={`card-surat-${s.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{label}</p>
                    <p className="text-xs text-muted-foreground">{s.perihal}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge className={`${sc.color} text-[10px] gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {sc.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1" data-testid={`badge-metode-${s.id}`}>
                      {s.metodeLayanan === "tau_beres" ? (
                        <><HandCoins className="w-3 h-3" /> Tau Beres</>
                      ) : (
                        <><Printer className="w-3 h-3" /> Print Mandiri</>
                      )}
                    </Badge>
                  </div>
                </div>
                {s.status === "disetujui" && s.isiSurat && (
                  <div className="mt-2 space-y-2">
                    {s.nomorSurat && (
                      <p className="text-[10px] text-muted-foreground">No. Surat: {s.nomorSurat}</p>
                    )}
                    {s.metodeLayanan === "tau_beres" && (
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3" data-testid={`info-tau-beres-${s.id}`}>
                        <p className="text-xs font-medium text-green-800 dark:text-green-300">Surat Anda sedang disiapkan</p>
                        <p className="text-[11px] text-green-700 dark:text-green-400 mt-1">Surat akan di-print dan ditandatangani oleh pengurus RT/RW. Silakan ambil di sekretariat RW dengan membawa infaq seikhlasnya untuk kas RW.</p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                      onClick={() => handleDownloadPdf(s)}
                      disabled={downloadingPdf === s.id}
                      data-testid={`button-download-${s.id}`}
                    >
                      {downloadingPdf === s.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Membuat PDF...</>
                      ) : (
                        <><Download className="w-4 h-4" /> Download Surat PDF</>
                      )}
                    </Button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
