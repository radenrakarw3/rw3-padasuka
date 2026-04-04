import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
  XCircle, MessageCircle, ClipboardList, Lock, AlertTriangle
} from "lucide-react";
import type { Laporan, Warga, SuratWarga, KartuKeluarga } from "@shared/schema";
import { useProfileCompleteness } from "@/lib/useProfileCompleteness";
import { wargaAnggotaQueryOptions, wargaKkQueryOptions } from "@/lib/warga-prefetch";

function ProfileLockBanner({ missingFields }: { missingFields: { key: string; label: string; wargaNama?: string }[] }) {
  const [, setLocation] = useLocation();
  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Fitur Terkunci</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Lengkapi profil keluarga terlebih dahulu untuk menggunakan fitur ini.
            </p>
          </div>
        </div>
        <div className="space-y-1 pl-1">
          {missingFields.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {f.label}{f.wargaNama ? ` — ${f.wargaNama}` : ""}
              </span>
            </div>
          ))}
          {missingFields.length > 5 && (
            <p className="text-xs text-amber-600 pl-5">+{missingFields.length - 5} data lainnya</p>
          )}
        </div>
        <Button
          size="sm"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => setLocation("/warga/profil")}
        >
          Lengkapi Profil Sekarang
        </Button>
      </CardContent>
    </Card>
  );
}

type TabType = "surat" | "laporan";

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

  const { data: suratList, isLoading } = useQuery<SuratWarga[]>({
    queryKey: ["/api/surat-warga"],
  });

  const { data: anggota } = useQuery<Warga[]>({
    ...wargaAnggotaQueryOptions(user?.kkId),
  });

  const { data: kk } = useQuery<KartuKeluarga>({
    ...wargaKkQueryOptions(user?.kkId),
  });

  const completeness = useProfileCompleteness(anggota, kk);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/surat-warga", {
        wargaId: parseInt(selectedWarga),
        kkId: user?.kkId,
        jenisSurat,
        perihal,
        keterangan: keterangan || undefined,
        nomorRt: kk?.rt || 1,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Surat diajukan!", description: "Permohonan surat terkirim. Admin akan memproses surat Anda." });
      setShowForm(false);
      setJenisSurat("");
      setPerihal("");
      setKeterangan("");
      setSelectedWarga("");
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
              <Label className="text-sm font-medium">Detail Kebutuhan Surat</Label>
              <Textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Jelaskan detail kebutuhan surat Anda, misalnya:&#10;- Untuk keperluan apa?&#10;- Data tambahan yang perlu dicantumkan?&#10;- Catatan khusus lainnya?"
                rows={5}
                data-testid="input-keterangan-surat"
              />
              <p className="text-[10px] text-muted-foreground">Semakin detail, semakin cepat diproses admin</p>
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
        <Button
          size="sm"
          onClick={() => completeness.isComplete && setShowForm(true)}
          disabled={!completeness.isComplete}
          className="gap-1.5"
          data-testid="button-ajukan-surat-baru"
        >
          {completeness.isComplete ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          Ajukan Surat
        </Button>
      </div>

      {!completeness.isComplete && (
        <ProfileLockBanner missingFields={completeness.missingFields} />
      )}

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
                  <Badge className={`${sc.color} text-[10px] gap-1 flex-shrink-0`}>
                    <StatusIcon className="w-3 h-3" />
                    {sc.label}
                  </Badge>
                </div>
                {s.status === "disetujui" && (
                  <div className="mt-2 space-y-2">
                    {s.nomorSurat && (
                      <p className="text-[10px] text-muted-foreground">No. Surat: {s.nomorSurat}</p>
                    )}
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3" data-testid={`info-approved-${s.id}`}>
                      <p className="text-xs font-medium text-green-800 dark:text-green-300">Surat Anda telah disetujui!</p>
                      <p className="text-[11px] text-green-700 dark:text-green-400 mt-1">Hubungi admin via WhatsApp untuk pengambilan surat atau informasi lebih lanjut.</p>
                    </div>
                    <a
                      href="https://wa.me/6285860604142?text=Assalamualaikum%2C%20saya%20ingin%20menanyakan%20status%20surat%20saya%20yang%20sudah%20disetujui.%20Terima%20kasih."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                      data-testid={`button-wa-admin-${s.id}`}
                    >
                      <Button size="sm" className="w-full gap-1.5 bg-green-600 hover:bg-green-700">
                        <MessageCircle className="w-4 h-4" /> Hubungi Admin via WhatsApp
                      </Button>
                    </a>
                  </div>
                )}
                {s.status === "ditolak" && (
                  <div className="mt-2">
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-xs text-red-700 dark:text-red-300">Permohonan surat ditolak. Hubungi admin untuk info lebih lanjut.</p>
                    </div>
                    <a
                      href="https://wa.me/6285860604142?text=Assalamualaikum%2C%20saya%20ingin%20menanyakan%20tentang%20permohonan%20surat%20saya%20yang%20ditolak.%20Terima%20kasih."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-2"
                      data-testid={`button-wa-admin-ditolak-${s.id}`}
                    >
                      <Button size="sm" variant="outline" className="w-full gap-1.5">
                        <MessageCircle className="w-4 h-4" /> Tanya Admin via WhatsApp
                      </Button>
                    </a>
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
    ...wargaAnggotaQueryOptions(user?.kkId),
  });

  const { data: kk } = useQuery<KartuKeluarga>({
    ...wargaKkQueryOptions(user?.kkId),
  });

  const completeness = useProfileCompleteness(anggota, kk);

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
        <Button
          size="sm"
          onClick={() => completeness.isComplete && setShowForm(true)}
          disabled={!completeness.isComplete}
          className="gap-1.5"
          data-testid="button-buat-laporan"
        >
          {completeness.isComplete ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          Buat Laporan
        </Button>
      </div>

      {!completeness.isComplete && (
        <ProfileLockBanner missingFields={completeness.missingFields} />
      )}

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

export default function WargaLayanan() {
  const [activeTab, setActiveTab] = useState<TabType>("surat");

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: "surat", label: "Surat", icon: FileText },
    { key: "laporan", label: "Laporan", icon: ClipboardList },
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
    </div>
  );
}
