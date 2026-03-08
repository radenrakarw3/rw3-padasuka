import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Users, CheckCircle, Clock, ChevronDown, ChevronUp, FileText, XCircle, Sparkles, Loader2 } from "lucide-react";
import type { WaBlast } from "@shared/schema";

const MESSAGE_TEMPLATES = [
  {
    label: "Undangan Rapat",
    text: `Assalamu'alaikum Wr. Wb.

Wargi RW 03 yang terhormat,

Kami mengundang Bapak/Ibu untuk hadir dalam rapat warga:

Hari/Tanggal : [ISI TANGGAL]
Waktu        : [ISI WAKTU] WIB
Tempat       : [ISI TEMPAT]
Agenda       : [ISI AGENDA]

Kehadiran Wargi sangat kami harapkan.

Info lengkap bisa dicek di web kita 👉 rw3padasukacimahi.org

Hatur nuhun 🙏
Pengurus RW 03 Padasuka`,
  },
  {
    label: "Info Iuran",
    text: `Assalamu'alaikum Wr. Wb.

Wargi RW 03 yang terhormat,

Iuran bulanan warga bulan [ISI BULAN] sebesar Rp [ISI NOMINAL] sudah bisa dibayarkan.

Pembayaran bisa melalui:
- Ketua RT masing-masing
- Transfer ke rekening: [ISI REKENING]

Mohon bayar sebelum tanggal [ISI BATAS WAKTU] ya.

Cek info warga lainnya di web 👉 rw3padasukacimahi.org

Hatur nuhun kerjasamanya Wargi! 🙏
Pengurus RW 03 Padasuka`,
  },
  {
    label: "Pengumuman Umum",
    text: `Assalamu'alaikum Wr. Wb.

Wargi RW 03 yang terhormat,

[ISI PENGUMUMAN]

Info lebih lengkap bisa dicek di web 👉 rw3padasukacimahi.org

Hatur nuhun perhatiannya Wargi! 🙏
Pengurus RW 03 Padasuka`,
  },
  {
    label: "Info Kegiatan",
    text: `Assalamu'alaikum Wr. Wb.

Wargi RW 03 yang terhormat,

Hayu urang ramékeun bareng kegiatan:

Kegiatan     : [ISI NAMA KEGIATAN]
Hari/Tanggal : [ISI TANGGAL]
Waktu        : [ISI WAKTU] WIB
Tempat       : [ISI TEMPAT]

Urang ramékeun bareng supaya silaturahmi Wargi RW 03 tambah erat! 💪

Info warga lainnya di web 👉 rw3padasukacimahi.org

Hatur nuhun! 🙏
Pengurus RW 03 Padasuka`,
  },
];

export default function AdminWaBlast() {
  const { toast } = useToast();
  const [pesan, setPesan] = useState("");
  const [kategori, setKategori] = useState("semua");
  const [filterRt, setFilterRt] = useState("1");
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [topikAi, setTopikAi] = useState("");

  const { data: blastList, isLoading } = useQuery<WaBlast[]>({ queryKey: ["/api/wa-blast"] });

  const previewUrl = kategori === "per_rt"
    ? `/api/wa-blast/preview?kategori=${kategori}&rt=${filterRt}`
    : `/api/wa-blast/preview?kategori=${kategori}`;
  const { data: preview } = useQuery<{ total: number }>({
    queryKey: ["/api/wa-blast/preview", kategori, filterRt],
    queryFn: async () => {
      const res = await fetch(previewUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  useEffect(() => {
    if (selectedTemplate) {
      const tpl = MESSAGE_TEMPLATES.find(t => t.label === selectedTemplate);
      if (tpl) setPesan(tpl.text);
    }
  }, [selectedTemplate]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wa-blast", {
        pesan,
        kategoriFilter: kategori,
        filterRt: kategori === "per_rt" ? parseInt(filterRt) : undefined,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "WA Blast Terkirim!",
        description: `Berhasil terkirim ke ${data.sent}/${data.total} nomor`,
      });
      setPesan("");
      setSelectedTemplate("");
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wa-blast/generate", { topik: topikAi });
      return res.json();
    },
    onSuccess: (data: any) => {
      setPesan(data.pesan);
      setSelectedTemplate("");
      toast({ title: "Pesan Berhasil Dibuat AI ✨", description: "Pesan sudah digenerate, silakan edit jika perlu." });
    },
    onError: (err: any) => toast({ title: "Gagal Generate", description: err.message, variant: "destructive" }),
  });

  const kategoriLabel: Record<string, string> = {
    semua: "Semua Warga",
    kepala_keluarga: "Kepala Keluarga",
    per_rt: `RT ${filterRt.padStart(2, "0")}`,
    penerima_bansos: "Penerima Bansos",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-wa-blast-title">WA Blast Warga</h2>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-[hsl(163,55%,22%)]">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-sm font-semibold">Kirim Pesan Massal</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Kategori Penerima</Label>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger className="h-11" data-testid="select-kategori-blast">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Warga (Semua nomor unik)</SelectItem>
                <SelectItem value="kepala_keluarga">Kepala Keluarga Saja</SelectItem>
                <SelectItem value="per_rt">Per RT</SelectItem>
                <SelectItem value="penerima_bansos">Penerima Bansos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kategori === "per_rt" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih RT</Label>
              <Select value={filterRt} onValueChange={setFilterRt}>
                <SelectTrigger className="h-11" data-testid="select-rt-blast">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <SelectItem key={i} value={i.toString()}>RT {i.toString().padStart(2, "0")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {preview && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[hsl(163,55%,22%)]/10 border border-[hsl(163,55%,22%)]/20" data-testid="text-preview-count">
              <Users className="w-4 h-4 text-[hsl(163,55%,22%)] flex-shrink-0" />
              <p className="text-xs font-medium text-[hsl(163,55%,22%)]">
                Akan dikirim ke ±{preview.total} nomor WhatsApp
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Template Pesan (Opsional)</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="h-11" data-testid="select-template">
                <SelectValue placeholder="Pilih template atau tulis manual..." />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TEMPLATES.map(t => (
                  <SelectItem key={t.label} value={t.label}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[hsl(40,45%,55%)]" />
              Generate Pesan dengan AI
            </Label>
            <div className="flex gap-2">
              <Input
                value={topikAi}
                onChange={(e) => setTopikAi(e.target.value)}
                placeholder="Ketik topik, misal: kerja bakti minggu depan..."
                className="h-11 flex-1"
                data-testid="input-topik-ai"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && topikAi.trim() && !generateMutation.isPending) {
                    generateMutation.mutate();
                  }
                }}
              />
              <Button
                variant="outline"
                className="h-11 px-4 border-[hsl(40,45%,55%)] text-[hsl(40,45%,55%)] hover:bg-[hsl(40,45%,55%)]/10"
                onClick={() => generateMutation.mutate()}
                disabled={!topikAi.trim() || generateMutation.isPending}
                data-testid="button-generate-ai"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              AI akan buatkan pesan sebagai Ketua RW. Placeholder otomatis: <code className="bg-muted px-1 rounded">{"{gender}"}</code> = Bapak/Ibu, <code className="bg-muted px-1 rounded">{"{warga}"}</code> = nama, <code className="bg-muted px-1 rounded">{"{rtxx}"}</code> = RT
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Isi Pesan</Label>
            <Textarea
              value={pesan}
              onChange={(e) => {
                setPesan(e.target.value);
                if (selectedTemplate) setSelectedTemplate("");
              }}
              placeholder="Ketik pesan manual, pilih template, atau generate dengan AI..."
              rows={8}
              data-testid="input-pesan-blast"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{pesan.length} karakter</p>
              {(pesan.includes("{gender}") || pesan.includes("{warga}") || pesan.includes("{rtxx}")) && (
                <p className="text-[11px] text-[hsl(163,55%,22%)] font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Pesan akan dipersonalisasi per penerima
                </p>
              )}
            </div>
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={() => setShowConfirm(true)}
            disabled={!pesan.trim() || sendMutation.isPending}
            data-testid="button-kirim-blast"
          >
            {sendMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Mengirim pesan...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Kirim WA Blast
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Kirim WA Blast</AlertDialogTitle>
            <AlertDialogDescription>
              Pesan akan dikirim ke <strong>±{preview?.total || 0} nomor WhatsApp</strong> dengan
              kategori <strong>{kategoriLabel[kategori]}</strong>.
              <br /><br />
              Tindakan ini tidak bisa dibatalkan setelah pesan terkirim. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-batal-blast">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirm(false);
                sendMutation.mutate();
              }}
              data-testid="button-konfirmasi-blast"
            >
              <Send className="w-4 h-4 mr-1" />
              Ya, Kirim Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <h3 className="text-sm font-semibold text-muted-foreground">Riwayat Pengiriman</h3>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : blastList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Send className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada riwayat pengiriman</p>
          </CardContent>
        </Card>
      ) : (
        blastList?.map(b => {
          const histKategoriLabel: Record<string, string> = {
            semua: "Semua Warga",
            kepala_keluarga: "Kepala Keluarga",
            per_rt: `RT ${b.filterRt?.toString().padStart(2, "0") || ""}`,
            penerima_bansos: "Penerima Bansos",
          };
          const isExpanded = expandedId === b.id;
          const gagal = (b.jumlahPenerima || 0) - (b.jumlahBerhasil || 0);
          const createdDate = b.createdAt ? new Date(b.createdAt) : null;

          return (
            <Card
              key={b.id}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => setExpandedId(isExpanded ? null : b.id)}
              data-testid={`card-blast-${b.id}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs text-muted-foreground ${isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
                      {b.pesan}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge className={`text-[10px] gap-0.5 ${
                      b.status === "terkirim" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {b.status === "terkirim" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {b.status}
                    </Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Users className="w-3 h-3" />
                    {b.jumlahPenerima} penerima
                  </span>
                  {b.status === "terkirim" && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        {b.jumlahBerhasil || 0} berhasil
                      </span>
                      {gagal > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-red-600">
                            <XCircle className="w-3 h-3" />
                            {gagal} gagal
                          </span>
                        </>
                      )}
                    </>
                  )}
                  <span>·</span>
                  <span>{histKategoriLabel[b.kategoriFilter] || b.kategoriFilter}</span>
                  <span>·</span>
                  <span>
                    {createdDate
                      ? createdDate.toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
