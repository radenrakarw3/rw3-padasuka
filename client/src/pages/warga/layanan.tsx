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
import {
  Plus, Send, Clock, CheckCircle, AlertCircle, ArrowLeft, FileText,
  XCircle, Download, Loader2, Printer, HandCoins, ExternalLink,
  Heart, Trophy, ClipboardList
} from "lucide-react";
import type { Laporan, Warga, SuratWarga, KartuKeluarga, DonasiCampaign, Donasi } from "@shared/schema";
import { generateSuratPDF } from "@/lib/pdf-surat";

const SAWERIA_LINK = "https://saweria.co/rw3padasuka";

type TabType = "surat" | "laporan" | "donasi";

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

function SuratTab() {
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
        <h2 className="text-base font-bold" data-testid="text-pelayanan-title">Pelayanan Surat</h2>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5" data-testid="button-ajukan-surat-baru">
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

function LaporanTab() {
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
        <h2 className="text-base font-bold" data-testid="text-laporan-title">Laporan Saya</h2>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5" data-testid="button-buat-laporan">
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

function DonasiTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [namaDonatur, setNamaDonatur] = useState("");
  const [jumlah, setJumlah] = useState("");

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery<DonasiCampaign[]>({
    queryKey: ["/api/donasi-campaign"],
  });

  const { data: myDonasi, isLoading: loadingDonasi } = useQuery<(Donasi & { judulCampaign: string })[]>({
    queryKey: ["/api/donasi"],
  });

  const { data: leaderboard } = useQuery<{ namaDonatur: string; total: number; count: number }[]>({
    queryKey: ["/api/donasi/leaderboard"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/donasi", {
        campaignId: parseInt(selectedCampaign),
        kkId: user?.kkId,
        namaDonatur,
        jumlah: parseInt(jumlah),
      });
    },
    onSuccess: () => {
      toast({ title: "Donasi tercatat!", description: "Menunggu konfirmasi admin." });
      setShowForm(false);
      setSelectedCampaign("");
      setNamaDonatur("");
      setJumlah("");
      queryClient.invalidateQueries({ queryKey: ["/api/donasi"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal mencatat donasi", description: err.message, variant: "destructive" });
    },
  });

  const activeCampaigns = campaigns?.filter(c => c.status === "aktif") || [];

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    dikonfirmasi: { label: "Dikonfirmasi", color: "bg-green-100 text-green-800", icon: CheckCircle },
    ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowForm(false)} data-testid="button-back-donasi">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-bold">Laporkan Donasi</h2>
        </div>

        <Card className="border-[hsl(163,55%,22%)]/20 bg-[hsl(163,55%,22%)]/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Langkah Donasi:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Klik tombol "Donasi via Saweria" di bawah</li>
              <li>Transfer sesuai jumlah yang diinginkan</li>
              <li>Kembali ke sini, isi form nama & jumlah donasi</li>
              <li>Admin akan memverifikasi pembayaran Anda</li>
            </ol>
            <Button
              className="w-full mt-3 gap-2"
              variant="outline"
              onClick={() => window.open(SAWERIA_LINK, "_blank")}
              data-testid="button-saweria-link"
            >
              <ExternalLink className="w-4 h-4" />
              Donasi via Saweria
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih Campaign Donasi</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="h-11" data-testid="select-campaign-donasi">
                  <SelectValue placeholder="Pilih campaign" />
                </SelectTrigger>
                <SelectContent>
                  {activeCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.judul}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Nama Donatur (sesuai di Saweria)</Label>
              <Input
                value={namaDonatur}
                onChange={(e) => setNamaDonatur(e.target.value)}
                placeholder="Nama yang digunakan saat donasi"
                className="h-11"
                data-testid="input-nama-donatur"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Jumlah Donasi (Rp)</Label>
              <Input
                type="number"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="Contoh: 50000"
                className="h-11"
                data-testid="input-jumlah-donasi"
              />
            </div>

            <Button
              className="w-full h-12 text-base"
              onClick={() => createMutation.mutate()}
              disabled={!selectedCampaign || !namaDonatur || !jumlah || parseInt(jumlah) <= 0 || createMutation.isPending}
              data-testid="button-kirim-donasi"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Laporkan Donasi
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
      {activeCampaigns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold" data-testid="text-campaign-title">Campaign Donasi</h3>
          {activeCampaigns.map((c) => (
              <Card key={c.id} className="border-[hsl(163,55%,22%)]/30" data-testid={`card-campaign-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[hsl(163,55%,22%)]/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-[hsl(163,55%,22%)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{c.judul}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.deskripsi}</p>
                      {c.targetDana && (
                        <p className="text-xs text-muted-foreground mt-1">Target: {formatRupiah(c.targetDana)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
          ))}

          <Button
            className="w-full gap-2"
            onClick={() => setShowForm(true)}
            data-testid="button-donasi-baru"
          >
            <Heart className="w-4 h-4" />
            Donasi Sekarang
          </Button>
        </div>
      )}

      {loadingCampaigns ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : activeCampaigns.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada campaign donasi aktif</p>
          </CardContent>
        </Card>
      )}

      {leaderboard && leaderboard.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold flex items-center gap-2" data-testid="text-leaderboard-title">
            <Trophy className="w-4 h-4 text-[hsl(40,45%,55%)]" />
            Leaderboard Donatur
          </h3>
          {leaderboard.slice(0, 10).map((entry, idx) => (
            <Card key={entry.namaDonatur} data-testid={`card-leaderboard-${idx}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  idx === 0 ? "bg-yellow-100 text-yellow-700" :
                  idx === 1 ? "bg-gray-100 text-gray-600" :
                  idx === 2 ? "bg-orange-100 text-orange-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{entry.namaDonatur}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.count}x donasi</p>
                </div>
                <p className="font-bold text-sm text-[hsl(163,55%,22%)] flex-shrink-0">
                  {formatRupiah(entry.total)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {myDonasi && myDonasi.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold" data-testid="text-riwayat-donasi">Riwayat Donasi Saya</h3>
          {myDonasi.map((d) => {
            const sc = statusConfig[d.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <Card key={d.id} data-testid={`card-donasi-${d.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{d.judulCampaign}</p>
                      <p className="text-xs text-muted-foreground">a.n. {d.namaDonatur}</p>
                      <p className="text-sm font-bold text-[hsl(163,55%,22%)] mt-0.5">{formatRupiah(d.jumlah)}</p>
                    </div>
                    <Badge className={`${sc.color} text-[10px] gap-1 flex-shrink-0`}>
                      <StatusIcon className="w-3 h-3" />
                      {sc.label}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WargaLayanan() {
  const [activeTab, setActiveTab] = useState<TabType>("surat");

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: "surat", label: "Surat", icon: FileText },
    { key: "laporan", label: "Laporan", icon: ClipboardList },
    { key: "donasi", label: "Donasi", icon: Heart },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-muted rounded-lg" data-testid="tabs-layanan">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "surat" && <SuratTab />}
      {activeTab === "laporan" && <LaporanTab />}
      {activeTab === "donasi" && <DonasiTab />}
    </div>
  );
}
