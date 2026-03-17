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
import { rtOptions } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import {
  Send, MessageSquare, Users, CheckCircle, Clock, ChevronDown, ChevronUp,
  FileText, XCircle, Sparkles, Loader2, AlertTriangle, PhoneOff, Baby,
  Phone, RefreshCw, ChevronRight,
} from "lucide-react";
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

interface WargaKosong {
  id: number;
  namaLengkap: string;
  nik: string;
  umur: number | null;
  jenisKelamin: string;
  kedudukanKeluarga: string;
  rt: number;
  alamat: string;
  kkId: number;
  nomorKk: string;
  isAnak: boolean;
  kepalaKeluarga: { id: number; namaLengkap: string; nomorWhatsapp: string | null } | null;
}

interface NomorKosongData {
  stats: {
    totalKosong: number;
    totalAnak: number;
    totalPerluDiisi: number;
    byRt: { rt: number; total: number; anak: number; perluDiisi: number }[];
  };
  data: WargaKosong[];
}

function buildWaLink(phone: string, message: string) {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const intl = cleaned.startsWith("0") ? "62" + cleaned.slice(1) : cleaned;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

function WargaKosongPanel() {
  const [filterRtPanel, setFilterRtPanel] = useState<number | null>(null);
  const [expandedPanel, setExpandedPanel] = useState(true);

  const { data, isLoading, refetch, isFetching } = useQuery<NomorKosongData>({
    queryKey: ["/api/wa-blast/nomor-kosong"],
    queryFn: async () => {
      const res = await fetch("/api/wa-blast/nomor-kosong", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat data");
      return res.json();
    },
  });

  const stats = data?.stats;
  const allData = data?.data ?? [];

  const displayed = filterRtPanel !== null
    ? allData.filter(w => w.rt === filterRtPanel)
    : allData;

  const anakList = displayed.filter(w => w.isAnak);
  const perluDiisiList = displayed.filter(w => !w.isAnak);

  const rtList = stats?.byRt ?? [];

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedPanel(p => !p)}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <PhoneOff className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-orange-800">Laporan Nomor WA Kosong</h3>
              <p className="text-[11px] text-orange-600">Warga tanpa nomor WhatsApp terdaftar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && stats.totalKosong > 0 && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs font-bold">
                {stats.totalKosong} warga
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-orange-600 hover:bg-orange-100"
              onClick={(e) => { e.stopPropagation(); refetch(); }}
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            {expandedPanel ? (
              <ChevronUp className="w-4 h-4 text-orange-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-orange-500" />
            )}
          </div>
        </div>

        {expandedPanel && (
          <>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            ) : !stats || stats.totalKosong === 0 ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Semua nomor WA sudah terisi!</p>
                  <p className="text-[11px] text-green-600">Tidak ada warga dengan nomor WA kosong.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Stats summary */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white border border-orange-100 p-2 text-center">
                    <p className="text-lg font-bold text-orange-700">{stats.totalKosong}</p>
                    <p className="text-[10px] text-orange-500 leading-tight">Total Kosong</p>
                  </div>
                  <div className="rounded-lg bg-white border border-red-100 p-2 text-center">
                    <p className="text-lg font-bold text-red-600">{stats.totalPerluDiisi}</p>
                    <p className="text-[10px] text-red-500 leading-tight">Perlu Diisi</p>
                  </div>
                  <div className="rounded-lg bg-white border border-blue-100 p-2 text-center">
                    <p className="text-lg font-bold text-blue-600">{stats.totalAnak}</p>
                    <p className="text-[10px] text-blue-500 leading-tight">Anak &lt;16 thn</p>
                  </div>
                </div>

                {/* Persebaran per RT */}
                {rtList.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-orange-700 uppercase tracking-wide">Persebaran per RT</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          filterRtPanel === null
                            ? "bg-orange-500 text-white"
                            : "bg-white border border-orange-200 text-orange-700 hover:bg-orange-50"
                        }`}
                        onClick={() => setFilterRtPanel(null)}
                      >
                        Semua ({stats.totalKosong})
                      </button>
                      {rtList.map(r => (
                        <button
                          key={r.rt}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                            filterRtPanel === r.rt
                              ? "bg-orange-500 text-white"
                              : "bg-white border border-orange-200 text-orange-700 hover:bg-orange-50"
                          }`}
                          onClick={() => setFilterRtPanel(r.rt === filterRtPanel ? null : r.rt)}
                        >
                          RT {String(r.rt).padStart(2, "0")} ({r.total})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warga perlu diisi */}
                {perluDiisiList.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">
                        Perlu Diisi ({perluDiisiList.length})
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {perluDiisiList.map(w => {
                        const isKK = w.kedudukanKeluarga === "Kepala Keluarga";
                        const kkWaAvail = !isKK && w.kepalaKeluarga?.nomorWhatsapp;
                        const gender = w.jenisKelamin === "Perempuan" ? "Ibu" : "Bapak";
                        const kkGender = w.kepalaKeluarga
                          ? (w.jenisKelamin === "Perempuan" ? "Ibu" : "Bapak")
                          : "Bapak/Ibu";

                        const waMsg = isKK
                          ? `Assalamu'alaikum ${gender} ${w.namaLengkap}, kami dari pengurus RW 03 Padasuka. Mohon segera melengkapi nomor WhatsApp ${gender} di data warga RW 03 kami agar bisa menerima informasi penting warga. Terima kasih 🙏`
                          : `Assalamu'alaikum ${kkGender} ${w.kepalaKeluarga?.namaLengkap ?? ""}, kami dari pengurus RW 03 Padasuka. Mohon bantu melengkapi nomor WhatsApp atas nama *${w.namaLengkap}* (${w.kedudukanKeluarga}) di data warga RW 03 kami. Terima kasih 🙏`;

                        const waTarget = isKK
                          ? null
                          : (kkWaAvail ? w.kepalaKeluarga!.nomorWhatsapp! : null);

                        return (
                          <div
                            key={w.id}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-red-100 hover:border-red-200 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <PhoneOff className="w-3.5 h-3.5 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className="text-xs font-semibold text-gray-800 leading-tight">{w.namaLengkap}</p>
                                <Badge className="text-[9px] bg-red-100 text-red-700 border-red-200 flex-shrink-0 py-0">
                                  Belum ada WA
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">
                                  RT {String(w.rt).padStart(2, "0")}
                                </span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground">{w.kedudukanKeluarga}</span>
                                {w.umur !== null && (
                                  <>
                                    <span className="text-[10px] text-muted-foreground">·</span>
                                    <span className="text-[10px] text-muted-foreground">{w.umur} thn</span>
                                  </>
                                )}
                              </div>
                              {!isKK && w.kepalaKeluarga && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  KK: {w.kepalaKeluarga.namaLengkap}
                                  {w.kepalaKeluarga.nomorWhatsapp
                                    ? <span className="text-green-600"> · punya WA</span>
                                    : <span className="text-red-500"> · tidak ada WA</span>
                                  }
                                </p>
                              )}
                            </div>
                            {/* WA Button */}
                            {waTarget ? (
                              <a
                                href={buildWaLink(waTarget, waMsg)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0"
                                title={`Hubungi KK via WA`}
                              >
                                <Button
                                  size="sm"
                                  className="h-7 px-2 text-[10px] gap-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Phone className="w-3 h-3" />
                                  WA KK
                                </Button>
                              </a>
                            ) : isKK ? (
                              <span className="flex-shrink-0 text-[9px] text-muted-foreground text-center leading-tight max-w-[44px]">
                                Dia sendiri KK
                              </span>
                            ) : (
                              <span className="flex-shrink-0 text-[9px] text-red-400 text-center leading-tight max-w-[44px]">
                                KK tak punya WA
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Anak di bawah 16 tahun */}
                {anakList.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Baby className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">
                        Anak &lt; 16 Tahun — Tidak Punya WA ({anakList.length})
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-[11px] text-blue-700 mb-2">
                        Anak di bawah 16 tahun dianggap tidak memiliki WhatsApp. Data ini tidak perlu diisi.
                      </p>
                      <div className="space-y-1">
                        {anakList.map(w => (
                          <div key={w.id} className="flex items-center gap-2 py-1 border-b border-blue-100 last:border-0">
                            <Baby className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <span className="text-[11px] text-blue-800 flex-1 font-medium">{w.namaLengkap}</span>
                            <span className="text-[10px] text-blue-500">RT {String(w.rt).padStart(2, "0")}</span>
                            <span className="text-[10px] text-blue-400">·</span>
                            <span className="text-[10px] text-blue-500">{w.umur ?? "?"} thn</span>
                            <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200 py-0">
                              Anak
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Info footer */}
                <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-orange-700 leading-relaxed">
                    Nomor WA yang tidak diisi akan <strong>dilewati saat WA Blast</strong>. Segera hubungi warga atau kepala keluarga untuk melengkapi data.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

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
  const needsRtPicker = kategori === "per_rt";
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
        title: "WA Blast Sedang Dikirim",
        description: `Mengirim ke ${data.total} penerima. Cek riwayat untuk progress.`,
      });
      setPesan("");
      setSelectedTemplate("");
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast"] });
      const pollInterval = setInterval(async () => {
        await queryClient.invalidateQueries({ queryKey: ["/api/wa-blast"] });
      }, 5000);
      setTimeout(() => clearInterval(pollInterval), data.total * 1500 + 10000);
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
    pemukiman: "Pemukiman (RT 01-04)",
    perumahan: "Perumahan (RT 05-07)",
    semua: "Semua Warga",
    kepala_keluarga: "Kepala Keluarga",
    per_rt: `RT ${filterRt.padStart(2, "0")}`,
    penerima_bansos: "Penerima Bansos",
    pemilik_kost: "Pemilik Kostan/Kontrakan",
    warga_singgah: "Warga Singgah",
    anak: "Anak-anak (< 18 Tahun)",
    remaja: "Remaja (18-29 Tahun)",
    dewasa: "Dewasa (30-60 Tahun)",
    lansia: "Lansia (> 60 Tahun)",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-wa-blast-title">WA Blast Warga</h2>

      {/* Panel Laporan Nomor WA Kosong */}
      <WargaKosongPanel />

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
                <SelectItem value="pemukiman">Pemukiman (RT 01-04)</SelectItem>
                <SelectItem value="perumahan">Perumahan (RT 05-07)</SelectItem>
                <SelectItem value="kepala_keluarga">Kepala Keluarga Saja</SelectItem>
                <SelectItem value="per_rt">Per RT</SelectItem>
                <SelectItem value="penerima_bansos">Penerima Bansos</SelectItem>
                <SelectItem value="pemilik_kost">Pemilik Kostan/Kontrakan</SelectItem>
                <SelectItem value="warga_singgah">Warga Singgah (Aktif)</SelectItem>
                <SelectItem value="anak">Kategori Umur: Anak-anak (di bawah 18 tahun)</SelectItem>
                <SelectItem value="remaja">Kategori Umur: Remaja (18–29 tahun)</SelectItem>
                <SelectItem value="dewasa">Kategori Umur: Dewasa (30–60 tahun)</SelectItem>
                <SelectItem value="lansia">Kategori Umur: Lansia (di atas 60 tahun)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsRtPicker && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih RT</Label>
              <Select value={filterRt} onValueChange={setFilterRt}>
                <SelectTrigger className="h-11" data-testid="select-rt-blast">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rtOptions.map(i => (
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
            pemukiman: "Pemukiman (RT 01-04)",
            perumahan: "Perumahan (RT 05-07)",
            kepala_keluarga: "Kepala Keluarga",
            per_rt: `RT ${b.filterRt?.toString().padStart(2, "0") || ""}`,
            penerima_bansos: "Penerima Bansos",
            pemilik_kost: "Pemilik Kostan/Kontrakan",
            warga_singgah: "Warga Singgah",
            anak: "Anak-anak (< 18 Tahun)",
            remaja: "Remaja (18-29 Tahun)",
            dewasa: "Dewasa (30-60 Tahun)",
            lansia: "Lansia (> 60 Tahun)",
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
                      b.status === "terkirim" ? "bg-green-100 text-green-800" : b.status === "mengirim" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {b.status === "terkirim" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {b.status === "mengirim" ? "sedang mengirim..." : b.status}
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
