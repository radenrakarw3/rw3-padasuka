import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, readJsonSafely } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { rtOptions } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import {
  Send, Users, CheckCircle, Clock, ChevronDown, ChevronUp,
  FileText, XCircle, Sparkles, Loader2, AlertTriangle, PhoneOff,
  Phone, RefreshCw, ChevronRight, ChevronLeft, Download, Save, Pencil, X,
  Copy, AlertCircle, Baby, History,
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

interface DuplikatGroup {
  nomor: string;
  jumlah: number;
  warga: { id: number; namaLengkap: string; rt: number; kedudukanKeluarga: string; nomorKk: string }[];
}

interface NomorKosongData {
  stats: {
    totalKosong: number;
    totalAnak: number;
    totalPerluDiisi: number;
    totalDuplikat: number;
    byRt: { rt: number; total: number; anak: number; perluDiisi: number }[];
  };
  data: WargaKosong[];
  duplikat: DuplikatGroup[];
}

const KATEGORI_LABELS: Record<string, string> = {
  semua: "Semua Warga",
  pemukiman: "Pemukiman (RT 01-04)",
  perumahan: "Perumahan (RT 05-07)",
  kepala_keluarga: "Kepala Keluarga",
  penerima_bansos: "Penerima Bansos",
  pemilik_kost: "Pemilik Kostan/Kontrakan",
  warga_singgah: "Warga Singgah",
  anak: "Anak-anak (< 18 Tahun)",
  remaja: "Remaja (18-29 Tahun)",
  dewasa: "Dewasa (30-60 Tahun)",
  lansia: "Lansia (> 60 Tahun)",
};

function formatRt(rt: number | string | null | undefined) {
  if (!rt) return "RT -";
  return `RT ${String(rt).padStart(2, "0")}`;
}

function getKategoriLabel(kategori: string, filterRt?: number | string | null) {
  if (kategori === "per_rt") return formatRt(filterRt);
  return KATEGORI_LABELS[kategori] || kategori;
}

function buildWaLink(phone: string, message: string) {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const intl = cleaned.startsWith("0") ? "62" + cleaned.slice(1) : cleaned;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

const PAGE_SIZE = 10;

function PaginationNav({
  page,
  totalPages,
  onPageChange,
  accentClass = "bg-orange-500",
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  accentClass?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-1">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
        disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft className="w-3.5 h-3.5" /> Prev
      </Button>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p}
            className={`w-6 h-6 rounded text-[10px] font-medium transition-colors ${
              page === p ? `${accentClass} text-white` : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => onPageChange(p)}
          >{p}</button>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
        disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
        Next <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function WargaKosongPanel() {
  const { toast } = useToast();
  const [filterRtPanel, setFilterRtPanel] = useState<number | null>(null);
  const [pageDiisi, setPageDiisi] = useState(1);
  const [pageDuplikat, setPageDuplikat] = useState(1);
  const [editMap, setEditMap] = useState<Record<number, string>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  const { data, isLoading, refetch, isFetching } = useQuery<NomorKosongData>({
    queryKey: ["/api/wa-blast/nomor-kosong"],
    queryFn: async () => {
      const res = await fetch("/api/wa-blast/nomor-kosong", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat data");
      return readJsonSafely<NomorKosongData>(res);
    },
  });

  const stats = data?.stats;
  const allData = data?.data ?? [];

  const displayed = filterRtPanel !== null ? allData.filter(w => w.rt === filterRtPanel) : allData;
  const perluDiisiList = displayed.filter(w => !w.isAnak);
  const anakList = displayed.filter(w => w.isAnak);
  const rtList = stats?.byRt ?? [];

  const handleFilterRt = (rt: number | null) => {
    setFilterRtPanel(rt);
    setPageDiisi(1);
    setPageDuplikat(1);
  };

  const totalPagesDiisi = Math.ceil(perluDiisiList.length / PAGE_SIZE);
  const pagedDiisi = perluDiisiList.slice((pageDiisi - 1) * PAGE_SIZE, pageDiisi * PAGE_SIZE);

  const duplikatFiltered = filterRtPanel !== null
    ? (data?.duplikat ?? []).filter(g => g.warga.some(w => w.rt === filterRtPanel))
    : (data?.duplikat ?? []);
  const totalPagesDuplikat = Math.ceil(duplikatFiltered.length / PAGE_SIZE);
  const pagedDuplikat = duplikatFiltered.slice((pageDuplikat - 1) * PAGE_SIZE, pageDuplikat * PAGE_SIZE);

  const saveNomorWa = async (wargaId: number) => {
    const nomor = (editMap[wargaId] ?? "").trim();
    if (!nomor) {
      toast({ title: "Nomor kosong", description: "Isi nomor WhatsApp terlebih dahulu", variant: "destructive" });
      return;
    }
    setSavingIds(prev => new Set(prev).add(wargaId));
    try {
      await apiRequest("PATCH", `/api/warga/${wargaId}`, { nomorWhatsapp: nomor });
      setEditMap(prev => { const n = { ...prev }; delete n[wargaId]; return n; });
      toast({ title: "Berhasil disimpan", description: "Nomor WA berhasil diperbarui." });
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/nomor-kosong"] });
    } catch (err: any) {
      toast({ title: "Gagal simpan", description: err.message, variant: "destructive" });
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(wargaId); return n; });
    }
  };

  const handleExport = () => {
    const rtParam = filterRtPanel !== null ? `?rt=${filterRtPanel}` : "";
    window.open(`/api/wa-blast/nomor-kosong/export${rtParam}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    );
  }

  if (!stats || stats.totalKosong === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">Semua nomor WA sudah terisi!</p>
          <p className="text-xs text-green-600">Tidak ada warga dengan nomor WA kosong.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats + actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-2 flex-1">
            <div className="rounded-lg bg-white border border-orange-100 p-2 text-center">
              <p className="text-lg font-bold text-orange-700">{stats.totalKosong}</p>
              <p className="text-[10px] text-orange-500">WA Kosong</p>
            </div>
            <div className="rounded-lg bg-white border border-red-100 p-2 text-center">
              <p className="text-lg font-bold text-red-600">{stats.totalPerluDiisi}</p>
              <p className="text-[10px] text-red-500">Perlu Diisi</p>
            </div>
            <div className={`rounded-lg bg-white border p-2 text-center ${(stats.totalDuplikat ?? 0) > 0 ? "border-yellow-200" : "border-gray-100"}`}>
              <p className={`text-lg font-bold ${(stats.totalDuplikat ?? 0) > 0 ? "text-yellow-600" : "text-gray-400"}`}>
                {stats.totalDuplikat ?? 0}
              </p>
              <p className={`text-[10px] ${(stats.totalDuplikat ?? 0) > 0 ? "text-yellow-500" : "text-gray-400"}`}>Duplikat</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground flex-shrink-0"
            onClick={() => refetch()} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline"
            className="h-8 gap-1.5 text-xs border-green-300 text-green-700 hover:bg-green-50 flex-shrink-0"
            onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </Button>
          <div className="flex flex-wrap gap-1">
            <button
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${filterRtPanel === null ? "bg-orange-500 text-white" : "bg-white border border-orange-200 text-orange-700 hover:bg-orange-50"}`}
              onClick={() => handleFilterRt(null)}
            >
              Semua ({stats.totalKosong})
            </button>
            {rtList.map(r => (
              <button key={r.rt}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${filterRtPanel === r.rt ? "bg-orange-500 text-white" : "bg-white border border-orange-200 text-orange-700 hover:bg-orange-50"}`}
                onClick={() => handleFilterRt(filterRtPanel === r.rt ? null : r.rt)}
              >
                {formatRt(r.rt)} ({r.total})
                {r.perluDiisi > 0 && <span className="ml-1 text-red-400">·{r.perluDiisi}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accordion sections */}
      <Accordion type="multiple" defaultValue={["diisi"]} className="space-y-2">
        {perluDiisiList.length > 0 && (
          <AccordionItem value="diisi" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-red-50/50 [&>svg]:text-red-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-red-700">Perlu Diisi</span>
                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] py-0">{perluDiisiList.length} warga</Badge>
                <span className="text-[10px] text-muted-foreground ml-1">
                  Hal. {pageDiisi}/{totalPagesDiisi || 1}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2 pt-1">
                {pagedDiisi.map(w => {
                  const isKK = w.kedudukanKeluarga === "Kepala Keluarga";
                  const kkWaAvail = !isKK && w.kepalaKeluarga?.nomorWhatsapp;
                  const gender = w.jenisKelamin === "Perempuan" ? "Ibu" : "Bapak";
                  const kkGender = w.kepalaKeluarga
                    ? (w.kepalaKeluarga.namaLengkap.startsWith("Ibu") ? "Ibu" : "Bapak")
                    : "Bapak/Ibu";
                  const waMsg = isKK
                    ? `Assalamu'alaikum ${gender} ${w.namaLengkap}, kami dari pengurus RW 03 Padasuka. Mohon segera melengkapi nomor WhatsApp ${gender} di data warga RW 03 kami agar bisa menerima informasi penting. Terima kasih 🙏`
                    : `Assalamu'alaikum ${kkGender} ${w.kepalaKeluarga?.namaLengkap ?? ""}, kami dari pengurus RW 03 Padasuka. Mohon bantu melengkapi nomor WhatsApp atas nama *${w.namaLengkap}* (${w.kedudukanKeluarga}) di data warga RW 03 kami. Terima kasih 🙏`;
                  const waTarget = isKK ? null : (kkWaAvail ? w.kepalaKeluarga!.nomorWhatsapp! : null);
                  const isEditing = w.id in editMap;
                  const isSaving = savingIds.has(w.id);

                  return (
                    <div key={w.id} className="rounded-lg bg-white border border-red-100 overflow-hidden">
                      <div className="flex items-start gap-2.5 p-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <PhoneOff className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold text-gray-800 leading-tight">{w.namaLengkap}</p>
                            <Badge className="text-[9px] bg-red-100 text-red-700 border-red-200 flex-shrink-0 py-0">Belum ada WA</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{formatRt(w.rt)}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">{w.kedudukanKeluarga}</span>
                            {w.umur !== null && <>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground">{w.umur} thn</span>
                            </>}
                          </div>
                          {!isKK && w.kepalaKeluarga && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              KK: {w.kepalaKeluarga.namaLengkap}
                              {w.kepalaKeluarga.nomorWhatsapp
                                ? <span className="text-green-600"> · punya WA</span>
                                : <span className="text-red-500"> · tidak ada WA</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                          {waTarget && (
                            <a href={buildWaLink(waTarget, waMsg)} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="h-6 px-2 text-[10px] gap-1 bg-green-600 hover:bg-green-700 text-white">
                                <Phone className="w-3 h-3" />WA KK
                              </Button>
                            </a>
                          )}
                          <Button size="sm" variant="outline"
                            className="h-6 px-2 text-[10px] gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => setEditMap(prev => isEditing
                              ? (({ [w.id]: _, ...rest }) => rest)(prev)
                              : { ...prev, [w.id]: "" }
                            )}>
                            {isEditing ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                            {isEditing ? "Batal" : "Input WA"}
                          </Button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="px-2.5 pb-2.5 pt-0 border-t border-red-50 bg-blue-50/50">
                          <p className="text-[10px] text-blue-700 font-medium mb-1.5 mt-2">
                            Input Nomor WA untuk <span className="font-bold">{w.namaLengkap}</span>
                          </p>
                          <div className="flex gap-1.5">
                            <Input
                              value={editMap[w.id] ?? ""}
                              onChange={e => setEditMap(prev => ({ ...prev, [w.id]: e.target.value }))}
                              placeholder="Contoh: 08123456789"
                              className="h-8 text-xs flex-1"
                              type="tel"
                              onKeyDown={e => { if (e.key === "Enter" && !isSaving) saveNomorWa(w.id); }}
                              autoFocus
                            />
                            <Button size="sm"
                              className="h-8 px-3 gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => saveNomorWa(w.id)}
                              disabled={isSaving || !(editMap[w.id] ?? "").trim()}>
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Simpan
                            </Button>
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-1">Format: 08xx atau 62xx. Langsung tersimpan ke database.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                <PaginationNav page={pageDiisi} totalPages={totalPagesDiisi} onPageChange={setPageDiisi} accentClass="bg-orange-500" />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {anakList.length > 0 && (
          <AccordionItem value="anak" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-blue-50/50 [&>svg]:text-blue-400">
              <div className="flex items-center gap-2">
                <Baby className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-blue-700">Anak &lt; 16 Tahun</span>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] py-0">{anakList.length} anak</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <p className="text-xs text-blue-700 mb-2 mt-1 leading-snug">
                Berusia &lt; 16 tahun, dianggap belum punya WhatsApp. Tidak perlu diisi.
              </p>
              <div className="space-y-1.5">
                {anakList.map(w => (
                  <div key={w.id} className="flex items-center gap-2.5 rounded-md bg-white border border-blue-100 px-2.5 py-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Baby className="w-3 h-3 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{w.namaLengkap}</p>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{formatRt(w.rt)}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{w.kedudukanKeluarga}</span>
                        {w.umur !== null && <>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground">{w.umur} thn</span>
                        </>}
                      </div>
                    </div>
                    <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200 flex-shrink-0 py-0 whitespace-nowrap">
                      Tidak punya WA
                    </Badge>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {duplikatFiltered.length > 0 && (
          <AccordionItem value="duplikat" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-yellow-50/50 [&>svg]:text-yellow-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-yellow-700">Nomor Duplikat</span>
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px] py-0">
                  {duplikatFiltered.length} nomor · {duplikatFiltered.reduce((s, g) => s + g.jumlah, 0)} warga
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <p className="text-xs text-yellow-700 mb-2 mt-1 leading-snug">
                Nomor dipakai lebih dari 1 warga. Pastikan setiap warga punya nomor unik agar WA Blast tepat sasaran.
              </p>
              <div className="space-y-2">
                {pagedDuplikat.map((group) => (
                  <div key={group.nomor} className="rounded-md bg-white border border-yellow-200 overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-yellow-100/60 border-b border-yellow-200">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-yellow-700 flex-shrink-0" />
                        <span className="text-xs font-bold text-yellow-800 font-mono">{group.nomor}</span>
                        <Badge className="text-[9px] bg-yellow-200 text-yellow-800 border-yellow-300 py-0 ml-1">
                          {group.jumlah}x duplikat
                        </Badge>
                      </div>
                      <button
                        className="flex items-center gap-1 text-[10px] text-yellow-700 hover:text-yellow-900 transition-colors"
                        onClick={() => navigator.clipboard.writeText(group.nomor)}
                        title="Salin nomor"
                      >
                        <Copy className="w-3 h-3" />Salin
                      </button>
                    </div>
                    <div className="divide-y divide-yellow-50">
                      {group.warga.map((w, idx) => (
                        <div key={w.id} className="flex items-center gap-2 px-2.5 py-1.5">
                          <span className="w-4 h-4 rounded-full bg-yellow-100 text-yellow-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-gray-800 truncate">{w.namaLengkap}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatRt(w.rt)} · {w.kedudukanKeluarga} · KK {w.nomorKk}
                            </p>
                          </div>
                          {w.kedudukanKeluarga === "Kepala Keluarga" && (
                            <Badge className="text-[9px] bg-orange-100 text-orange-700 border-orange-200 py-0 flex-shrink-0">KK</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <PaginationNav page={pageDuplikat} totalPages={totalPagesDuplikat} onPageChange={setPageDuplikat} accentClass="bg-yellow-500" />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-50 border border-orange-100">
        <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-orange-700 leading-relaxed">
          Nomor WA yang tidak diisi akan <strong>dilewati saat WA Blast</strong>. Input langsung di sini atau export Excel untuk pengisian offline.
        </p>
      </div>
    </div>
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
  const { data: preview } = useQuery<{ total: number }>({
    queryKey: ["/api/wa-blast/preview", kategori, filterRt],
    queryFn: async () => {
      const res = await fetch(previewUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return readJsonSafely<{ total: number }>(res);
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
      return readJsonSafely<any>(res);
    },
    onSuccess: (data: any) => {
      toast({
        title: "WA Blast Sedang Dikirim",
        description: `Mengirim ke ${data.total} penerima. Cek tab Riwayat untuk progress.`,
      });
      setPesan("");
      setSelectedTemplate("");
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast"] });
      const pollInterval = setInterval(async () => {
        await queryClient.invalidateQueries({ queryKey: ["/api/wa-blast"] });
      }, 5000);
      // Estimasi waktu: rata-rata 6 detik/pesan + jeda batch 20 detik tiap 10 pesan
      const batchPauses = Math.floor(data.total / 10) * 20000;
      setTimeout(() => clearInterval(pollInterval), data.total * 6000 + batchPauses + 15000);
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wa-blast/generate", { topik: topikAi });
      return readJsonSafely<any>(res);
    },
    onSuccess: (data: any) => {
      setPesan(data.pesan);
      setSelectedTemplate("");
      toast({ title: "Pesan Berhasil Dibuat AI ✨", description: "Pesan sudah digenerate, silakan edit jika perlu." });
    },
    onError: (err: any) => toast({ title: "Gagal Generate", description: err.message, variant: "destructive" }),
  });

  const sendingCount = blastList?.filter(b => b.status === "mengirim").length ?? 0;
  const riwayatCount = blastList?.length ?? 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-wa-blast-title">WA Blast Warga</h2>

      <Tabs defaultValue="kirim" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-10">
          <TabsTrigger value="kirim" className="text-xs gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Kirim Pesan
          </TabsTrigger>
          <TabsTrigger value="laporan" className="text-xs gap-1.5">
            <PhoneOff className="w-3.5 h-3.5" />
            WA Kosong
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="text-xs gap-1.5">
            <History className="w-3.5 h-3.5" />
            Riwayat
            {riwayatCount > 0 && (
              <Badge className={`text-[9px] py-0 px-1 ml-0.5 ${sendingCount > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                {sendingCount > 0 ? `${sendingCount} aktif` : riwayatCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Kirim Pesan */}
        <TabsContent value="kirim" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* Kategori + RT — grid 2 kolom saat per_rt */}
              <div className={`grid gap-3 ${kategori === "per_rt" ? "grid-cols-2" : "grid-cols-1"}`}>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Kategori Penerima</Label>
                  <Select value={kategori} onValueChange={setKategori}>
                    <SelectTrigger className="h-10" data-testid="select-kategori-blast">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua Warga</SelectItem>
                      <SelectItem value="pemukiman">Pemukiman (RT 01-04)</SelectItem>
                      <SelectItem value="perumahan">Perumahan (RT 05-07)</SelectItem>
                      <SelectItem value="kepala_keluarga">Kepala Keluarga</SelectItem>
                      <SelectItem value="per_rt">Per RT</SelectItem>
                      <SelectItem value="penerima_bansos">Penerima Bansos</SelectItem>
                      <SelectItem value="pemilik_kost">Pemilik Kostan/Kontrakan</SelectItem>
                      <SelectItem value="warga_singgah">Warga Singgah (Aktif)</SelectItem>
                      <SelectItem value="anak">Anak-anak (di bawah 18 thn)</SelectItem>
                      <SelectItem value="remaja">Remaja (18–29 thn)</SelectItem>
                      <SelectItem value="dewasa">Dewasa (30–60 thn)</SelectItem>
                      <SelectItem value="lansia">Lansia (di atas 60 thn)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {kategori === "per_rt" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Pilih RT</Label>
                    <Select value={filterRt} onValueChange={setFilterRt}>
                      <SelectTrigger className="h-10" data-testid="select-rt-blast">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rtOptions.map(i => (
                          <SelectItem key={i} value={i.toString()}>{formatRt(i)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Template */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Template Pesan (Opsional)</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="h-10" data-testid="select-template">
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

              {/* AI Generator — inline */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[hsl(40,45%,55%)]" />
                  Generate dengan AI
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={topikAi}
                    onChange={(e) => setTopikAi(e.target.value)}
                    placeholder="Ketik topik, misal: kerja bakti minggu depan..."
                    className="h-9 text-sm flex-1"
                    data-testid="input-topik-ai"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && topikAi.trim() && !generateMutation.isPending) {
                        generateMutation.mutate();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="h-9 px-3 border-[hsl(40,45%,55%)] text-[hsl(40,45%,55%)] hover:bg-[hsl(40,45%,55%)]/10"
                    onClick={() => generateMutation.mutate()}
                    disabled={!topikAi.trim() || generateMutation.isPending}
                    data-testid="button-generate-ai"
                  >
                    {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Placeholder: <code className="bg-muted px-1 rounded">{"{gender}"}</code> = Bapak/Ibu · <code className="bg-muted px-1 rounded">{"{warga}"}</code> = nama · <code className="bg-muted px-1 rounded">{"{rtxx}"}</code> = RT
                </p>
              </div>

              {/* Textarea + info baris bawah */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Isi Pesan</Label>
                <Textarea
                  value={pesan}
                  onChange={(e) => {
                    setPesan(e.target.value);
                    if (selectedTemplate) setSelectedTemplate("");
                  }}
                  placeholder="Ketik pesan manual, pilih template, atau generate dengan AI..."
                  rows={6}
                  data-testid="input-pesan-blast"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">{pesan.length} karakter</p>
                  <div className="flex items-center gap-2">
                    {preview && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-[hsl(163,55%,22%)]" data-testid="text-preview-count">
                        <Users className="w-3 h-3" />
                        ±{preview.total} penerima
                      </span>
                    )}
                    {(pesan.includes("{gender}") || pesan.includes("{warga}") || pesan.includes("{rtxx}")) && (
                      <span className="flex items-center gap-0.5 text-[10px] text-[hsl(163,55%,22%)]">
                        <CheckCircle className="w-3 h-3" />
                        Personalisasi aktif
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-11 text-sm"
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
        </TabsContent>

        {/* Tab: Laporan WA Kosong */}
        <TabsContent value="laporan" className="mt-4">
          <WargaKosongPanel />
        </TabsContent>

        {/* Tab: Riwayat */}
        <TabsContent value="riwayat" className="mt-4">
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
            <div className="space-y-2">
              {blastList?.map(b => {
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
                        <p className={`text-xs text-muted-foreground flex-1 min-w-0 ${isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
                          {b.pesan}
                        </p>
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
                        <span>{getKategoriLabel(b.kategoriFilter, b.filterRt)}</span>
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
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Kirim WA Blast</AlertDialogTitle>
            <AlertDialogDescription>
              Pesan akan dikirim ke <strong>±{preview?.total || 0} nomor WhatsApp</strong> dengan
              kategori <strong>{getKategoriLabel(kategori, filterRt)}</strong>.
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
    </div>
  );
}
