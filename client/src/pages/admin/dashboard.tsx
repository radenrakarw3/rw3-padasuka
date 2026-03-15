import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import {
  Users, Home, ClipboardList, FileText, UserCheck, UserX, UserMinus,
  Phone, PhoneOff, CreditCard, ImageOff, HandCoins, UserCog, ScrollText,
  Wallet, TrendingUp, TrendingDown, Heart, GraduationCap, Briefcase,
  UsersRound, Building2, AlertTriangle, Clock, Store, Award, Sparkles,
  Target, BarChart3, Eye, Loader2, Filter, ChevronRight, UserSearch
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Treemap, AreaChart, Area, CartesianGrid, Legend
} from "recharts";

interface DashboardStats {
  totalKk: number;
  totalWarga: number;
  pendingLaporan: number;
  pendingSurat: number;
  pendingEditProfil: number;
  pendingPengajuanBansos: number;
  totalLaporan: number;
  statusLaporan: Record<string, number>;
  totalSuratWarga: number;
  statusSuratWarga: Record<string, number>;
  totalSuratRw: number;
  totalPengajuanBansos: number;
  statusPengajuanBansos: Record<string, number>;
  jenisBansos: Record<string, number>;
  jenisKelamin: Record<string, number>;
  agama: Record<string, number>;
  statusPerkawinan: Record<string, number>;
  kedudukanKeluarga: Record<string, number>;
  pekerjaan: { name: string; count: number }[];
  pendidikan: Record<string, number>;
  statusKependudukan: Record<string, number>;
  kelompokUsia: Record<string, number>;
  waOwnership: { punya: number; belum: number };
  ktpOwnership: { punya: number; belum: number };
  statusRumah: Record<string, number>;
  kondisiBangunan: Record<string, number>;
  sumberAir: Record<string, number>;
  sanitasiWc: Record<string, number>;
  listrik: Record<string, number>;
  bansos: { penerima: number; bukan: number };
  kkFotoOwnership: { punya: number; belum: number };
  perRt: { rt: number; kk: number; warga: number; bansos: number; lakiLaki: number; perempuan: number }[];
  keuangan: { totalPemasukan: number; totalPengeluaran: number; saldo: number };
  donasiSummary: { totalDonasiMasuk: number; totalDonasiPending: number; campaignAktif: number; campaignSelesai: number; totalDonatur: number };
  avgPenghuni: number;
  wargaSinggahStats: {
    totalAktif: number;
    mendekatiHabis: number;
    sudahHabis: number;
    totalPemilikKost: number;
  };
  usahaStats: {
    totalUsaha: number;
    pendaftaran: number;
    survey: number;
    disetujui: number;
    ditolak: number;
    stikerAktif: number;
    stikerMendekatiExpired: number;
  };
  pengangguran: {
    total: number;
    perUsia: Record<string, number>;
    daftarNama: { nama: string; usia: number | null; rt: number | null }[];
  };
  capaian: {
    waPercent: number;
    ktpPercent: number;
    kkFotoPercent: number;
    bansosPercent: number;
    usahaBerizinPercent: number;
    totalUsahaTarget: number;
    totalUsahaBerizin: number;
  };
  rtList: number[];
}

const COLORS = [
  "#2d7a5f", "#b8923e", "#3b6db5", "#b54560",
  "#7a4dbf", "#4dab8a", "#d97730", "#3a8fa6",
  "#c94d7a", "#5a8a3e", "#c9a83a",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#b8923e",
  diproses: "#3b6db5",
  selesai: "#2d7a5f",
  ditolak: "#b54560",
  disetujui: "#2d7a5f",
  approved: "#2d7a5f",
  rejected: "#b54560",
  generated: "#3b6db5",
  pendaftaran: "#3b6db5",
  survey: "#b8923e",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", diproses: "Diproses", selesai: "Selesai",
  ditolak: "Ditolak", disetujui: "Disetujui", approved: "Disetujui",
  rejected: "Ditolak", generated: "Digenerate", pendaftaran: "Pendaftaran", survey: "Survey",
};

const AGE_LABELS: Record<string, string> = {
  "0-5": "Balita (0-5)", "6-17": "Anak & Remaja (6-17)",
  "18-25": "Muda (18-25)", "26-40": "Dewasa (26-40)",
  "41-55": "Paruh Baya (41-55)", "56-64": "Pra-Lansia (56-64)",
  "65+": "Lansia (65+)", "Tidak Diketahui": "Tidak Diketahui",
};

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function GaugeChart({ value, label, color }: { value: number; label: string; color: string }) {
  const angle = (value / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const x = 60 - 40 * Math.cos(rad);
  const y = 60 - 40 * Math.sin(rad);
  const large = angle > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M 20 60 A 40 40 0 0 1 100 60" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
        <path d={`M 20 60 A 40 40 0 ${large} 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <text x="60" y="55" textAnchor="middle" className="text-lg font-bold" fill={color}>{value}%</text>
      </svg>
      <p className="text-[10px] text-muted-foreground mt-0.5 text-center">{label}</p>
    </div>
  );
}

function StatusBar({ data, colorMap }: { data: Record<string, number>; colorMap?: Record<string, string> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return <p className="text-xs text-muted-foreground">Belum ada data</p>;

  return (
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded-full overflow-hidden flex">
        {entries.map(([label, value]) => {
          const pct = (value / total) * 100;
          const color = colorMap?.[label] || STATUS_COLORS[label] || "#999";
          return <div key={label} className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} title={`${STATUS_LABELS[label] || label}: ${value}`} />;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {entries.map(([label, value]) => {
          const color = colorMap?.[label] || STATUS_COLORS[label] || "#999";
          return (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground">{STATUS_LABELS[label] || label} ({value})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ children, icon, onDetailClick }: { children: React.ReactNode; icon?: React.ReactNode; onDetailClick?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-[#2d7a5f] flex items-center gap-2" data-testid={`section-${String(children).toLowerCase().replace(/\s/g, '-')}`}>
        <div className="w-1 h-4 rounded-full bg-[#2d7a5f]" />
        {icon}
        {children}
      </h3>
      {onDetailClick && (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-[#2d7a5f]" onClick={onDetailClick} data-testid={`btn-detail-${String(children).toLowerCase().replace(/\s/g, '-')}`}>
          <Eye className="w-3 h-3" /> Detail
        </Button>
      )}
    </div>
  );
}

function AiInsightButton({ section, data }: { section: string; data: any }) {
  const [insight, setInsight] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stats/dashboard/ai-insight", { section, data });
      return res.json();
    },
    onSuccess: (d: any) => setInsight(d.insight),
  });

  return (
    <div className="mt-4 border-t pt-3">
      {!insight && (
        <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="btn-ai-insight">
          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
          {mutation.isPending ? "Menganalisis data..." : "Minta Rekomendasi AI"}
        </Button>
      )}
      {mutation.isError && <p className="text-xs text-red-500 mt-2">Gagal mendapatkan insight: {mutation.error?.message}</p>}
      {insight && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg p-3 mt-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Rekomendasi AI</span>
          </div>
          <div className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{insight}</div>
        </div>
      )}
    </div>
  );
}

function DetailDialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#2d7a5f]" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [rtFilter, setRtFilter] = useState<string>("all");
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; title: string; section: string; data: any } | null>(null);

  const queryKey = rtFilter === "all" ? ["/api/stats/dashboard"] : ["/api/stats/dashboard", `?rt=${rtFilter}`];
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey,
    queryFn: async () => {
      const url = rtFilter === "all" ? "/api/stats/dashboard" : `/api/stats/dashboard?rt=${rtFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const openDetail = (title: string, section: string, data: any) => {
    setDetailDialog({ open: true, title, section, data });
  };

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold" data-testid="text-dashboard-title">Dashboard</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  const summaryCards = [
    { label: "Kartu Keluarga", value: stats.totalKk, icon: Home, color: "bg-[#2d7a5f]" },
    { label: "Total Warga", value: stats.totalWarga, icon: Users, color: "bg-[#b8923e]" },
    { label: "Pengangguran", value: stats.pengangguran.total, icon: UserSearch, color: "bg-[#b54560]" },
    { label: "Laporan Pending", value: stats.pendingLaporan, icon: ClipboardList, color: "bg-[#d97730]" },
    { label: "Surat Pending", value: stats.pendingSurat, icon: FileText, color: "bg-[#3b6db5]" },
    { label: "Bansos Pending", value: stats.pendingPengajuanBansos || 0, icon: HandCoins, color: "bg-[#7a4dbf]" },
  ];

  const pekerjaanData = stats.pekerjaan.map((p, i) => ({ name: p.name, value: p.count, fill: COLORS[i % COLORS.length] }));

  const genderPieData = Object.entries(stats.jenisKelamin).map(([name, value], i) => ({ name, value, fill: i === 0 ? "#3b6db5" : "#b54560" }));

  const perRtStackedData = stats.perRt.map(r => ({
    name: `RT ${String(r.rt).padStart(2, "0")}`,
    "Laki-laki": r.lakiLaki,
    "Perempuan": r.perempuan,
    kk: r.kk,
    bansos: r.bansos,
  }));

  const radarData = stats.perRt.map(r => {
    const maxW = Math.max(...stats.perRt.map(x => x.warga), 1);
    const maxK = Math.max(...stats.perRt.map(x => x.kk), 1);
    const maxB = Math.max(...stats.perRt.map(x => x.bansos), 1);
    return {
      rt: `RT ${String(r.rt).padStart(2, "0")}`,
      Warga: Math.round((r.warga / maxW) * 100),
      KK: Math.round((r.kk / maxK) * 100),
      Bansos: maxB > 0 ? Math.round((r.bansos / maxB) * 100) : 0,
    };
  });

  const pendidikanTreemap = Object.entries(stats.pendidikan)
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({ name, size: value, fill: COLORS[i % COLORS.length] }));

  const usiaBarData = Object.entries(stats.kelompokUsia)
    .filter(([, v]) => v > 0)
    .map(([key, value], i) => ({ name: AGE_LABELS[key] || key, value, fill: COLORS[i % COLORS.length] }));

  const pengangguranUsiaData = Object.entries(stats.pengangguran.perUsia)
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));

  const statusKepColors: Record<string, { color: string; icon: typeof UserCheck }> = {
    Aktif: { color: "#2d7a5f", icon: UserCheck },
    Pindah: { color: "#b8923e", icon: UserMinus },
    Meninggal: { color: "#b54560", icon: UserX },
  };

  const capaianItems = [
    { label: "WhatsApp Terdaftar", value: stats.capaian.waPercent, color: "#2d7a5f" },
    { label: "KTP Terunggah", value: stats.capaian.ktpPercent, color: "#3b6db5" },
    { label: "Foto KK Terunggah", value: stats.capaian.kkFotoPercent, color: "#7a4dbf" },
    { label: "Penerima Bansos", value: stats.capaian.bansosPercent, color: "#b8923e" },
    { label: "Usaha Berizin", value: stats.capaian.usahaBerizinPercent, color: "#d97730" },
  ];

  const highlights = [
    `Dari ${stats.totalWarga} warga, ${stats.capaian.waPercent}% sudah terhubung WhatsApp`,
    `${stats.pengangguran.total} warga usia 18+ belum bekerja dari total ${stats.totalWarga} warga`,
    `${stats.capaian.totalUsahaBerizin} UMKM sudah berizin dari ${stats.capaian.totalUsahaTarget} usaha terdaftar`,
    stats.totalKk > 0 ? `${stats.capaian.kkFotoPercent}% dari ${stats.totalKk} KK sudah mengunggah foto KK` : null,
    stats.pendingLaporan > 0 ? `${stats.pendingLaporan} laporan warga menunggu ditindaklanjuti` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-dashboard-title">Dashboard RW 03 Padasuka</h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={rtFilter} onValueChange={setRtFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="select-rt-filter">
              <SelectValue placeholder="Filter RT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua RT</SelectItem>
              {(stats.rtList || []).map(rt => (
                <SelectItem key={rt} value={String(rt)}>RT {String(rt).padStart(2, "0")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rtFilter !== "all" && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" />
          Menampilkan data untuk RT {String(rtFilter).padStart(2, "0")}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {summaryCards.map((s) => (
          <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
            if (s.label === "Pengangguran") openDetail("Data Pengangguran", "Pengangguran", stats.pengangguran);
          }} data-testid={`card-stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-tight">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="p-3">
          <SectionTitle icon={<Target className="w-4 h-4" />}>Highlight Konten</SectionTitle>
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/60 dark:bg-card/60">
                <ChevronRight className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle icon={<Target className="w-4 h-4" />} onDetailClick={() => openDetail("Angka Capaian RW", "Angka Capaian", stats.capaian)}>
            Angka Capaian RW
          </SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {capaianItems.map(c => (
              <GaugeChart key={c.label} value={c.value} label={c.label} color={c.color} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle icon={<UserSearch className="w-4 h-4" />} onDetailClick={() => openDetail("Data Pengangguran", "Pengangguran", stats.pengangguran)}>
            Angka Pengangguran
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <div className="w-12 h-12 rounded-xl bg-[#b54560] flex items-center justify-center">
                <UserSearch className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#b54560]">{stats.pengangguran.total}</p>
                <p className="text-xs text-muted-foreground">Usia 18+ Belum Bekerja</p>
                <p className="text-[10px] text-muted-foreground">({stats.totalWarga > 0 ? Math.round((stats.pengangguran.total / stats.totalWarga) * 100) : 0}% dari total warga)</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Per Kelompok Usia</p>
              {pengangguranUsiaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={pengangguranUsiaData} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Jumlah">
                      {pengangguranUsiaData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada data</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle icon={<Wallet className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Keuangan", "Keuangan", { keuangan: stats.keuangan, donasi: stats.donasiSummary })}>
            Ringkasan Keuangan
          </SectionTitle>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Pemasukan", value: stats.keuangan?.totalPemasukan || 0, icon: TrendingUp, color: "#2d7a5f", textColor: "text-[#2d7a5f]" },
              { label: "Pengeluaran", value: stats.keuangan?.totalPengeluaran || 0, icon: TrendingDown, color: "#b54560", textColor: "text-[#b54560]" },
              { label: "Saldo", value: stats.keuangan?.saldo || 0, icon: Wallet, color: "#3b6db5", textColor: (stats.keuangan?.saldo || 0) >= 0 ? "text-[#2d7a5f]" : "text-[#b54560]" },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-1.5" style={{ backgroundColor: item.color }}>
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <p className={`text-xs font-bold ${item.textColor}`}>{formatRupiah(item.value)}</p>
                <p className="text-[9px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Total Donasi Masuk", value: formatRupiah(stats.donasiSummary?.totalDonasiMasuk || 0), icon: Heart, color: "#b54560" },
              { label: "Donatur Terkonfirmasi", value: stats.donasiSummary?.totalDonatur || 0, icon: Users, color: "#b8923e" },
              { label: "Campaign Aktif", value: stats.donasiSummary?.campaignAktif || 0, icon: HandCoins, color: "#2d7a5f" },
              { label: "Donasi Pending", value: stats.donasiSummary?.totalDonasiPending || 0, icon: FileText, color: "#3b6db5" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <item.icon className="w-4 h-4" style={{ color: item.color }} />
                <div>
                  <p className="text-sm font-bold">{item.value}</p>
                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-warga-singgah-stats">
          <CardContent className="p-3">
            <SectionTitle icon={<Building2 className="w-4 h-4" />}>Warga Singgah</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Aktif", value: stats.wargaSinggahStats?.totalAktif || 0, icon: UserCheck, color: "#2d7a5f" },
                { label: "Mendekati Habis", value: stats.wargaSinggahStats?.mendekatiHabis || 0, icon: AlertTriangle, color: "#b8923e" },
                { label: "Sudah Habis", value: stats.wargaSinggahStats?.sudahHabis || 0, icon: Clock, color: "#b54560" },
                { label: "Pemilik Kost", value: stats.wargaSinggahStats?.totalPemilikKost || 0, icon: Building2, color: "#3b6db5" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  <div>
                    <p className="text-sm font-bold">{item.value}</p>
                    <p className="text-[9px] text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-usaha-stats">
          <CardContent className="p-3">
            <SectionTitle icon={<Store className="w-4 h-4" />}>Pendataan Usaha</SectionTitle>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: "Total Usaha", value: stats.usahaStats?.totalUsaha || 0, icon: Store, color: "#2d7a5f" },
                { label: "Stiker Aktif", value: stats.usahaStats?.stikerAktif || 0, icon: Award, color: "#b8923e" },
                { label: "Stiker Akan Expired", value: stats.usahaStats?.stikerMendekatiExpired || 0, icon: AlertTriangle, color: "#b54560" },
                { label: "Disetujui", value: stats.usahaStats?.disetujui || 0, icon: ClipboardList, color: "#3b6db5" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  <div>
                    <p className="text-sm font-bold">{item.value}</p>
                    <p className="text-[9px] text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <StatusBar data={{
              pendaftaran: stats.usahaStats?.pendaftaran || 0,
              survey: stats.usahaStats?.survey || 0,
              disetujui: stats.usahaStats?.disetujui || 0,
              ditolak: stats.usahaStats?.ditolak || 0,
            }} colorMap={{
              pendaftaran: "#3b6db5", survey: "#b8923e", disetujui: "#2d7a5f", ditolak: "#b54560",
            }} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3">
          <SectionTitle icon={<ClipboardList className="w-4 h-4" />} onDetailClick={() => openDetail("Ringkasan Layanan", "Layanan", { laporan: stats.statusLaporan, surat: stats.statusSuratWarga, bansos: stats.statusPengajuanBansos })}>
            Ringkasan Layanan
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Laporan Warga</p>
                <span className="text-xs font-bold">{stats.totalLaporan || 0} total</span>
              </div>
              <StatusBar data={stats.statusLaporan || {}} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Surat Warga</p>
                <span className="text-xs font-bold">{stats.totalSuratWarga || 0} total</span>
              </div>
              <StatusBar data={stats.statusSuratWarga || {}} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Surat RW</p>
                <span className="text-xs font-bold">{stats.totalSuratRw || 0} total</span>
              </div>
              {(stats.totalSuratRw || 0) > 0 ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#2d7a5f]">
                    <ScrollText className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium">{stats.totalSuratRw} surat diterbitkan</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada surat RW</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Pengajuan Bansos</p>
                <span className="text-xs font-bold">{stats.totalPengajuanBansos || 0} total</span>
              </div>
              <StatusBar data={stats.statusPengajuanBansos || {}} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle icon={<UserCog className="w-4 h-4" />}>Status Kependudukan</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(statusKepColors).map(([status, { color, icon: Icon }]) => (
              <div key={status} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50" data-testid={`badge-status-${status.toLowerCase()}`}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold leading-tight">{stats.statusKependudukan[status] || 0}</p>
                  <p className="text-[9px] text-muted-foreground">{status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle icon={<Users className="w-4 h-4" />} onDetailClick={() => openDetail("Demografi Warga", "Demografi", { jenisKelamin: stats.jenisKelamin, statusPerkawinan: stats.statusPerkawinan, agama: stats.agama, kelompokUsia: stats.kelompokUsia })}>
            Demografi Warga
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Jenis Kelamin</p>
              {genderPieData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={genderPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {genderPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-3 mt-1">
                    {genderPieData.map(d => (
                      <div key={d.name} className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span className="text-[10px] text-muted-foreground">{d.name}: {d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Kelompok Usia</p>
              {usiaBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={usiaBarData} layout="vertical" margin={{ left: 5, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Jumlah">
                      {usiaBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Status Perkawinan</p>
              {Object.keys(stats.statusPerkawinan).length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={Object.entries(stats.statusPerkawinan).filter(([,v]) => v > 0).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {Object.entries(stats.statusPerkawinan).filter(([,v]) => v > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Agama</p>
              {Object.keys(stats.agama).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(stats.agama).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value], i) => {
                    const max = Math.max(...Object.values(stats.agama), 1);
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-3">
            <SectionTitle icon={<GraduationCap className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Pendidikan", "Pendidikan", stats.pendidikan)}>
              Pendidikan
            </SectionTitle>
            {pendidikanTreemap.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <Treemap data={pendidikanTreemap} dataKey="size" nameKey="name" aspectRatio={4 / 3} stroke="#fff" content={({ x, y, width, height, name, size, fill }: any) => {
                  if (width < 30 || height < 25) return <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />;
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" rx={4} />
                      <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">{name}</text>
                      <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={9}>{size}</text>
                    </g>
                  );
                }} />
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <SectionTitle icon={<Briefcase className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Pekerjaan", "Pekerjaan", stats.pekerjaan)}>
              Pekerjaan
            </SectionTitle>
            {pekerjaanData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pekerjaanData} layout="vertical" margin={{ left: 5, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Jumlah">
                    {pekerjaanData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3">
          <SectionTitle icon={<UsersRound className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Data Keluarga", "Data Keluarga", { avgPenghuni: stats.avgPenghuni, waOwnership: stats.waOwnership, ktpOwnership: stats.ktpOwnership, kedudukanKeluarga: stats.kedudukanKeluarga })}>
            Data Keluarga
          </SectionTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <UsersRound className="w-5 h-5 text-[#2d7a5f]" />
              <div>
                <p className="text-sm font-bold">{stats.avgPenghuni || 0} orang</p>
                <p className="text-[10px] text-muted-foreground">Rata-rata anggota per KK</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Kepemilikan WhatsApp</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#2d7a5f]" /> Punya: {stats.waOwnership.punya}</span>
                      <span className="flex items-center gap-1"><PhoneOff className="w-3 h-3 text-muted-foreground" /> Belum: {stats.waOwnership.belum}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                      <div className="h-full bg-[#2d7a5f] rounded-l-full" style={{ width: `${stats.totalWarga > 0 ? (stats.waOwnership.punya / stats.totalWarga) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Kepemilikan Foto KTP</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-[#3b6db5]" /> Punya: {stats.ktpOwnership.punya}</span>
                      <span className="flex items-center gap-1"><ImageOff className="w-3 h-3 text-muted-foreground" /> Belum: {stats.ktpOwnership.belum}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                      <div className="h-full bg-[#3b6db5] rounded-l-full" style={{ width: `${stats.totalWarga > 0 ? (stats.ktpOwnership.punya / stats.totalWarga) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle icon={<Home className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Data Rumah", "Data Rumah & Fasilitas", { statusRumah: stats.statusRumah, listrik: stats.listrik, kondisiBangunan: stats.kondisiBangunan, sumberAir: stats.sumberAir, sanitasiWc: stats.sanitasiWc, bansos: stats.bansos })}>
            Data Rumah & Fasilitas
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Status Rumah</p>
              {Object.keys(stats.statusRumah).filter(k => stats.statusRumah[k] > 0).length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={Object.entries(stats.statusRumah).filter(([,v]) => v > 0).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2}>
                      {Object.entries(stats.statusRumah).filter(([,v]) => v > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Listrik</p>
              {Object.keys(stats.listrik).filter(k => stats.listrik[k] > 0).length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={Object.entries(stats.listrik).filter(([,v]) => v > 0).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2}>
                      {Object.entries(stats.listrik).filter(([,v]) => v > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Kondisi Bangunan</p>
              {Object.entries(stats.kondisiBangunan).filter(([,v]) => v > 0).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(stats.kondisiBangunan).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value], i) => {
                    const max = Math.max(...Object.values(stats.kondisiBangunan), 1);
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Sumber Air</p>
              {Object.entries(stats.sumberAir).filter(([,v]) => v > 0).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(stats.sumberAir).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value], i) => {
                    const max = Math.max(...Object.values(stats.sumberAir), 1);
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Sanitasi WC</p>
              {Object.entries(stats.sanitasiWc).filter(([,v]) => v > 0).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(stats.sanitasiWc).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value], i) => {
                    const max = Math.max(...Object.values(stats.sanitasiWc), 1);
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Penerima Bansos</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1"><HandCoins className="w-3 h-3 text-[#b8923e]" /> Penerima: {stats.bansos.penerima}</span>
                    <span className="flex items-center gap-1"><UserX className="w-3 h-3 text-muted-foreground" /> Bukan: {stats.bansos.bukan}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#b8923e] rounded-l-full" style={{ width: `${(stats.bansos.penerima + stats.bansos.bukan) > 0 ? (stats.bansos.penerima / (stats.bansos.penerima + stats.bansos.bukan)) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              {stats.jenisBansos && Object.keys(stats.jenisBansos).length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Jenis Bansos:</p>
                  <div className="space-y-1">
                    {Object.entries(stats.jenisBansos).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value], i) => {
                      const max = Math.max(...Object.values(stats.jenisBansos), 1);
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground truncate mr-2">{label}</span>
                            <span className="font-medium">{value}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle icon={<BarChart3 className="w-4 h-4" />} onDetailClick={() => openDetail("Data per RT", "Data per RT", stats.perRt)}>
            Data per RT
          </SectionTitle>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Komparasi Gender per RT</p>
              {perRtStackedData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={perRtStackedData} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Laki-laki" stackId="gender" fill="#3b6db5" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Perempuan" stackId="gender" fill="#b54560" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            {radarData.length > 2 && (
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Perbandingan Antar RT (Relatif)</p>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="rt" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 8 }} domain={[0, 100]} />
                    <Radar name="Warga" dataKey="Warga" stroke="#2d7a5f" fill="#2d7a5f" fillOpacity={0.2} />
                    <Radar name="KK" dataKey="KK" stroke="#3b6db5" fill="#3b6db5" fillOpacity={0.2} />
                    <Radar name="Bansos" dataKey="Bansos" stroke="#b8923e" fill="#b8923e" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Ringkasan per RT</p>
              {stats.perRt.map((r) => {
                const maxW = Math.max(...stats.perRt.map(x => x.warga), 1);
                return (
                  <div key={r.rt} data-testid={`row-rt-${r.rt}`} className="space-y-1 cursor-pointer hover:bg-muted/30 rounded-lg p-1.5 transition-colors" onClick={() => openDetail(`Detail RT ${String(r.rt).padStart(2, "0")}`, `RT ${r.rt}`, r)}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-12 text-xs font-medium flex-shrink-0">RT {r.rt.toString().padStart(2, "0")}</span>
                      <div className="flex-1 bg-muted rounded-full h-7 relative overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, (r.warga / maxW) * 100)}%`, backgroundColor: "#2d7a5f" }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                          {r.kk} KK · {r.warga} Warga · {r.bansos} Bansos
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-14">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#3b6db5]" />
                        <span className="text-[9px] text-muted-foreground">L: {r.lakiLaki}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#b54560]" />
                        <span className="text-[9px] text-muted-foreground">P: {r.perempuan}</span>
                      </div>
                      {r.warga > 0 && (
                        <span className="text-[9px] text-muted-foreground ml-1">
                          ({Math.round((r.lakiLaki / r.warga) * 100)}% / {Math.round((r.perempuan / r.warga) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {detailDialog && (() => {
        const insightBadge = (level: "baik" | "perhatian" | "kritis", text: string) => {
          const cls = level === "baik" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : level === "perhatian" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
          return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{text}</span>;
        };
        const insightBox = (icon: React.ReactNode, text: string, type: "info" | "warning" | "success" = "info") => {
          const cls = type === "warning" ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : type === "success" ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800";
          return <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${cls}`}>{icon}<p className="text-xs leading-relaxed">{text}</p></div>;
        };
        const pctLabel = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

        return (
        <DetailDialog open={detailDialog.open} onClose={() => setDetailDialog(null)} title={detailDialog.title}>
          <div className="space-y-3">
            {detailDialog.section === "Pengangguran" && (() => {
              const pct = pctLabel(stats.pengangguran.total, stats.totalWarga);
              const sorted = Object.entries(stats.pengangguran.perUsia).sort((a,b) => b[1] - a[1]);
              const topGroup = sorted[0];
              const perRtCount: Record<number, number> = {};
              stats.pengangguran.daftarNama.forEach(w => { if (w.rt) perRtCount[w.rt] = (perRtCount[w.rt] || 0) + 1; });
              const rtSorted = Object.entries(perRtCount).sort((a,b) => b[1] - a[1]);
              const topRt = rtSorted[0];
              return <>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#b54560]">{stats.pengangguran.total} warga usia 18+ belum bekerja</p>
                    <p className="text-xs text-muted-foreground">{pct}% dari total {stats.totalWarga} warga</p>
                  </div>
                  {insightBadge(pct > 15 ? "kritis" : pct > 8 ? "perhatian" : "baik", pct > 15 ? "Tinggi" : pct > 8 ? "Sedang" : "Rendah")}
                </div>
                {topGroup && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `Kelompok usia ${topGroup[0]} paling banyak belum bekerja (${topGroup[1]} orang). ${topGroup[0] === "18-25" ? "Potensi untuk pelatihan kerja atau magang." : topGroup[0] === "56+" ? "Banyak di usia pra-pensiun — pertimbangkan program UMKM ringan." : "Targetkan program pelatihan keterampilan."}`, "warning")}
                {topRt && rtSorted.length > 1 && insightBox(<Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />, `RT ${String(topRt[0]).padStart(2, "0")} paling banyak pengangguran (${topRt[1]} orang). Bisa jadi prioritas untuk sosialisasi lowongan kerja atau program berdaya.`, "info")}
                <div>
                  <p className="text-xs font-semibold mb-2">Sebaran per Kelompok Usia</p>
                  {sorted.map(([group, count]) => {
                    const max = Math.max(...sorted.map(s => s[1]), 1);
                    return (
                      <div key={group} className="mb-1.5">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span>{group} tahun</span>
                          <span className="font-semibold">{count} orang ({pctLabel(count, stats.pengangguran.total)}%)</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#b54560] transition-all" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {rtSorted.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Sebaran per RT</p>
                    {rtSorted.map(([rt, count]) => (
                      <div key={rt} className="flex justify-between items-center text-xs py-1.5 px-2 rounded bg-muted/50 mb-1">
                        <span className="font-medium">RT {String(rt).padStart(2, "0")}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#b54560]" style={{ width: `${(count / Math.max(...rtSorted.map(r => r[1]), 1)) * 100}%` }} /></div>
                          <span className="font-semibold w-12 text-right">{count} org</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold mb-2">Daftar Warga ({stats.pengangguran.daftarNama.length})</p>
                  <div className="max-h-[180px] overflow-y-auto space-y-1">
                    {stats.pengangguran.daftarNama.map((w, i) => (
                      <div key={i} className="flex justify-between items-center text-xs py-1.5 px-2 rounded bg-muted/50">
                        <span>{w.nama}</span>
                        <div className="flex gap-2 text-muted-foreground">
                          {w.usia !== null && <span>{w.usia} thn</span>}
                          {w.rt !== null && <span>RT {String(w.rt).padStart(2, "0")}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>;
            })()}
            {detailDialog.section === "Angka Capaian" && (() => {
              const avg = Math.round(capaianItems.reduce((s, c) => s + c.value, 0) / capaianItems.length);
              const lowest = [...capaianItems].sort((a, b) => a.value - b.value)[0];
              const highest = [...capaianItems].sort((a, b) => b.value - a.value)[0];
              return <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Rata-rata Capaian</p>
                    <p className="text-2xl font-bold">{avg}%</p>
                  </div>
                  {insightBadge(avg >= 70 ? "baik" : avg >= 40 ? "perhatian" : "kritis", avg >= 70 ? "Baik" : avg >= 40 ? "Perlu Ditingkatkan" : "Perlu Perhatian Serius")}
                </div>
                {lowest && lowest.value < 50 && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `"${lowest.label}" baru ${lowest.value}% — ini capaian terendah dan perlu jadi prioritas utama. ${lowest.label.includes("WhatsApp") ? "Sosialisasi WA blast tidak akan efektif jika banyak warga belum terdaftar." : lowest.label.includes("KTP") ? "Data KTP penting untuk validasi identitas warga." : lowest.label.includes("Usaha") ? "Usaha tanpa izin berisiko ditindak — bantu proses perizinannya." : "Perlu program khusus untuk meningkatkan angka ini."}`, "warning")}
                {highest && insightBox(<Award className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />, `"${highest.label}" sudah ${highest.value}% — pencapaian terbaik! ${highest.value >= 80 ? "Pertahankan dan jadikan contoh untuk indikator lain." : "Masih bisa ditingkatkan lagi."}`, "success")}
                <div>
                  <p className="text-xs font-semibold mb-2">Detail Semua Indikator</p>
                  {[...capaianItems].sort((a, b) => a.value - b.value).map(c => (
                    <div key={c.label} className="mb-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs">{c.label}</span>
                        <div className="flex items-center gap-1.5">
                          {insightBadge(c.value >= 70 ? "baik" : c.value >= 40 ? "perhatian" : "kritis", `${c.value}%`)}
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${c.value}%`, backgroundColor: c.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>;
            })()}
            {detailDialog.section.startsWith("RT ") && (() => {
              const d = detailDialog.data;
              const avgWarga = stats.perRt.length > 0 ? Math.round(stats.perRt.reduce((s, r) => s + r.warga, 0) / stats.perRt.length) : 0;
              const avgKk = stats.perRt.length > 0 ? Math.round(stats.perRt.reduce((s, r) => s + r.kk, 0) / stats.perRt.length) : 0;
              const avgBansos = stats.perRt.length > 0 ? Math.round(stats.perRt.reduce((s, r) => s + r.bansos, 0) / stats.perRt.length) : 0;
              const rankWarga = [...stats.perRt].sort((a, b) => b.warga - a.warga).findIndex(r => r.rt === d.rt) + 1;
              const genderRatio = d.warga > 0 ? Math.round((d.lakiLaki / d.warga) * 100) : 50;
              const avgPerKk = d.kk > 0 ? (d.warga / d.kk).toFixed(1) : "0";
              const bansosPct = d.warga > 0 ? Math.round((d.bansos / d.warga) * 100) : 0;
              return <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Jumlah KK", value: d.kk, sub: `${d.kk > avgKk ? "↑" : "↓"} rata-rata RW: ${avgKk}` },
                    { label: "Total Warga", value: d.warga, sub: `Peringkat #${rankWarga} dari ${stats.perRt.length} RT` },
                    { label: "Laki-laki", value: d.lakiLaki, sub: `${genderRatio}% dari total warga` },
                    { label: "Perempuan", value: d.perempuan, sub: `${100 - genderRatio}% dari total warga` },
                  ].map(item => (
                    <div key={item.label} className="p-2.5 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{item.value}</p>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5">{item.sub}</p>
                    </div>
                  ))}
                </div>
                {insightBox(<UsersRound className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />, `Rata-rata ${avgPerKk} orang per KK. ${Number(avgPerKk) > 4 ? "Kepadatan KK tinggi — perlu perhatian ruang tinggal." : "Ukuran keluarga normal."}`, "info")}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs font-medium">Penerima Bansos</p>
                    <p className="text-lg font-bold">{d.bansos} <span className="text-xs font-normal text-muted-foreground">({bansosPct}% warga RT)</span></p>
                  </div>
                  {insightBadge(d.bansos > avgBansos ? "perhatian" : "baik", d.bansos > avgBansos ? `Di atas rata-rata (${avgBansos})` : `Normal`)}
                </div>
                {d.warga > avgWarga * 1.3 && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `RT ini memiliki ${Math.round(((d.warga - avgWarga) / avgWarga) * 100)}% lebih banyak warga dari rata-rata. Alokasi layanan dan perhatian sosial perlu lebih besar.`, "warning")}
              </>;
            })()}
            {detailDialog.section === "Demografi" && (() => {
              const genderData = detailDialog.data.jenisKelamin as Record<string, number>;
              const totalG = Object.values(genderData).reduce((s, v) => s + v, 0);
              const usiaData = detailDialog.data.kelompokUsia as Record<string, number>;
              const totalU = Object.values(usiaData).reduce((s, v) => s + v, 0);
              const usia017 = (usiaData["0-5"] || 0) + (usiaData["6-17"] || 0);
              const usia65 = usiaData["65+"] || 0;
              const usiaProduktif = totalU - usia017 - usia65;
              const rasioKetergantungan = usiaProduktif > 0 ? Math.round(((usia017 + usia65) / usiaProduktif) * 100) : 0;
              const agamaData = detailDialog.data.agama as Record<string, number>;
              const topAgama = Object.entries(agamaData).sort((a, b) => b[1] - a[1])[0];
              const statusKawin = detailDialog.data.statusPerkawinan as Record<string, number>;
              const topGender = Object.entries(genderData).sort((a, b) => b[1] - a[1])[0];
              return <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-center">
                    <p className="text-lg font-bold text-[#3b6db5]">{usiaProduktif}</p>
                    <p className="text-[9px] text-muted-foreground">Usia Produktif</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-center">
                    <p className="text-lg font-bold text-[#b8923e]">{usia017 + usia65}</p>
                    <p className="text-[9px] text-muted-foreground">Tanggungan</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold">{rasioKetergantungan}%</p>
                    <p className="text-[9px] text-muted-foreground">Rasio Ketergantungan</p>
                  </div>
                </div>
                {insightBox(<Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />, `Setiap 100 warga produktif menanggung ${rasioKetergantungan} warga non-produktif (anak & lansia). ${rasioKetergantungan > 60 ? "Rasio cukup tinggi — perlu program bantuan untuk keluarga." : "Rasio masih wajar."}`, rasioKetergantungan > 60 ? "warning" : "info")}
                <div>
                  <p className="text-xs font-semibold mb-2">Jenis Kelamin</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-4 rounded-full overflow-hidden flex">
                      {Object.entries(genderData).map(([name, val], i) => (
                        <div key={name} className="h-full" style={{ width: `${pctLabel(val, totalG)}%`, backgroundColor: i === 0 ? "#3b6db5" : "#b54560" }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    {Object.entries(genderData).map(([name, val], i) => (
                      <span key={name} style={{ color: i === 0 ? "#3b6db5" : "#b54560" }} className="font-medium">{name}: {val} ({pctLabel(val, totalG)}%)</span>
                    ))}
                  </div>
                  {topGender && Math.abs(pctLabel(topGender[1], totalG) - 50) > 10 && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `Rasio gender tidak seimbang — ${topGender[0]} mendominasi ${pctLabel(topGender[1], totalG)}%.`, "warning")}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2">Kelompok Usia</p>
                  {Object.entries(usiaData).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([key, val]) => (
                    <div key={key} className="mb-1.5">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{AGE_LABELS[key] || key}</span>
                        <span className="font-semibold">{val} ({pctLabel(val, totalU)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#2d7a5f]" style={{ width: `${pctLabel(val, totalU)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2">Status Perkawinan</p>
                  {Object.entries(statusKawin).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([name, val]) => (
                    <div key={name} className="flex justify-between text-xs py-1 border-b last:border-0">
                      <span>{name}</span>
                      <span className="font-medium">{val} ({pctLabel(val, totalU)}%)</span>
                    </div>
                  ))}
                </div>
                {topAgama && <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs">Agama mayoritas: <span className="font-bold">{topAgama[0]}</span> ({pctLabel(topAgama[1], totalU)}%). {Object.keys(agamaData).filter(k => agamaData[k] > 0).length > 1 ? `Terdapat ${Object.keys(agamaData).filter(k => agamaData[k] > 0).length} agama — jaga kerukunan antarumat.` : ""}</p></div>}
              </>;
            })()}
            {detailDialog.section === "Pendidikan" && (() => {
              const sorted = Object.entries(detailDialog.data as Record<string, number>).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]);
              const total = sorted.reduce((s, [,v]) => s + v, 0);
              const top = sorted[0];
              const rendahKeys = ["Tidak/Belum Sekolah", "Tidak Tamat SD", "SD/Sederajat", "SLTP/Sederajat", "Tidak Diketahui"];
              const rendah = sorted.filter(([k]) => rendahKeys.includes(k)).reduce((s, [,v]) => s + v, 0);
              const sarjana = sorted.filter(([k]) => k.includes("S1") || k.includes("S2") || k.includes("S3") || k.includes("Diploma")).reduce((s, [,v]) => s + v, 0);
              return <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold text-[#b8923e]">{rendah}</p>
                    <p className="text-[9px] text-muted-foreground">Pendidikan Rendah (≤SMP)</p>
                    <p className="text-[9px] text-muted-foreground/70">{pctLabel(rendah, total)}% dari total</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold text-[#2d7a5f]">{sarjana}</p>
                    <p className="text-[9px] text-muted-foreground">Diploma/Sarjana+</p>
                    <p className="text-[9px] text-muted-foreground/70">{pctLabel(sarjana, total)}% dari total</p>
                  </div>
                </div>
                {rendah > total * 0.4 && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `${pctLabel(rendah, total)}% warga berpendidikan rendah (≤SMP). Pertimbangkan program Kejar Paket atau pelatihan keterampilan vokasi.`, "warning")}
                {top && insightBox(<GraduationCap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />, `Mayoritas warga berpendidikan "${top[0]}" (${top[1]} orang, ${pctLabel(top[1], total)}%). ${top[0].includes("SMA") || top[0].includes("SLTA") ? "Banyak lulusan SMA — dorong akses ke pendidikan tinggi atau pelatihan skill." : ""}`, "info")}
                <div>
                  <p className="text-xs font-semibold mb-2">Rincian Lengkap</p>
                  {sorted.map(([label, value]) => (
                    <div key={label} className="mb-1.5">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{label}</span>
                        <span className="font-semibold">{value} ({pctLabel(value, total)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#7a4dbf]" style={{ width: `${pctLabel(value, total)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>;
            })()}
            {detailDialog.section === "Pekerjaan" && (() => {
              const jobs = detailDialog.data as { name: string; count: number }[];
              const total = jobs.reduce((s, j) => s + j.count, 0);
              const top3 = jobs.slice(0, 3);
              const tidakBekerja = jobs.filter(j => ["Belum/Tidak Bekerja", "Tidak Bekerja", "Pengangguran"].some(k => j.name.toLowerCase().includes(k.toLowerCase())));
              const wiraswasta = jobs.filter(j => j.name.toLowerCase().includes("wiraswasta") || j.name.toLowerCase().includes("wirausaha"));
              return <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold">{jobs.length}</p>
                    <p className="text-[9px] text-muted-foreground">Jenis Pekerjaan</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold text-[#2d7a5f]">{total}</p>
                    <p className="text-[9px] text-muted-foreground">Total Pekerja</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold text-[#b8923e]">{wiraswasta.reduce((s, j) => s + j.count, 0)}</p>
                    <p className="text-[9px] text-muted-foreground">Wiraswasta</p>
                  </div>
                </div>
                {top3.length > 0 && insightBox(<Briefcase className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />, `3 pekerjaan terbanyak: ${top3.map(j => `${j.name} (${j.count})`).join(", ")}. ${top3[0].name.includes("Mengurus Rumah Tangga") ? "Banyak ibu rumah tangga — potensi untuk program pemberdayaan ekonomi perempuan." : `"${top3[0].name}" mendominasi ${pctLabel(top3[0].count, total)}% pekerjaan warga.`}`, "info")}
                <div>
                  <p className="text-xs font-semibold mb-2">Semua Jenis Pekerjaan</p>
                  {jobs.map((p, i) => (
                    <div key={i} className="mb-1.5">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{p.name}</span>
                        <span className="font-semibold">{p.count} ({pctLabel(p.count, total)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pctLabel(p.count, total)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>;
            })()}
            {detailDialog.section === "Keuangan" && (() => {
              const k = detailDialog.data.keuangan;
              const d = detailDialog.data.donasi;
              const rasio = k.totalPemasukan > 0 ? Math.round((k.totalPengeluaran / k.totalPemasukan) * 100) : 0;
              return <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-center">
                    <TrendingUp className="w-4 h-4 text-[#2d7a5f] mx-auto mb-1" />
                    <p className="text-xs font-bold text-[#2d7a5f]">{formatRupiah(k.totalPemasukan)}</p>
                    <p className="text-[9px] text-muted-foreground">Pemasukan</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-center">
                    <TrendingDown className="w-4 h-4 text-[#b54560] mx-auto mb-1" />
                    <p className="text-xs font-bold text-[#b54560]">{formatRupiah(k.totalPengeluaran)}</p>
                    <p className="text-[9px] text-muted-foreground">Pengeluaran</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <Wallet className="w-4 h-4 text-[#3b6db5] mx-auto mb-1" />
                    <p className={`text-xs font-bold ${k.saldo >= 0 ? "text-[#2d7a5f]" : "text-[#b54560]"}`}>{formatRupiah(k.saldo)}</p>
                    <p className="text-[9px] text-muted-foreground">Saldo</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <span className="text-xs">Rasio Pengeluaran vs Pemasukan</span>
                  {insightBadge(rasio > 90 ? "kritis" : rasio > 70 ? "perhatian" : "baik", `${rasio}%`)}
                </div>
                {rasio > 90 && insightBox(<AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />, `Pengeluaran sudah ${rasio}% dari pemasukan. ${k.saldo < 0 ? "Kas RW saat ini MINUS — perlu segera cari sumber pemasukan tambahan." : "Segera kendalikan pengeluaran atau cari pemasukan tambahan."}`, "warning")}
                {rasio <= 70 && insightBox(<Award className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />, `Kondisi keuangan sehat — pengeluaran hanya ${rasio}% dari pemasukan. Saldo cukup untuk operasional.`, "success")}
                {d && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Donasi</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Total Donasi Masuk", value: formatRupiah(d.totalDonasiMasuk || 0) },
                        { label: "Donatur", value: d.totalDonatur || 0 },
                        { label: "Campaign Aktif", value: d.campaignAktif || 0 },
                        { label: "Donasi Pending", value: d.totalDonasiPending || 0 },
                      ].map(item => (
                        <div key={item.label} className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs font-bold">{item.value}</p>
                          <p className="text-[9px] text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>;
            })()}
            {detailDialog.section === "Layanan" && (() => {
              const items = [
                { label: "Laporan Warga", data: detailDialog.data.laporan, total: stats.totalLaporan },
                { label: "Surat Warga", data: detailDialog.data.surat, total: stats.totalSuratWarga },
                { label: "Pengajuan Bansos", data: detailDialog.data.bansos, total: stats.totalPengajuanBansos },
              ];
              const totalPending = (detailDialog.data.laporan?.pending || 0) + (detailDialog.data.surat?.pending || 0) + (detailDialog.data.bansos?.pending || 0);
              const totalAll = items.reduce((s, i) => s + (i.total || 0), 0);
              const totalSelesai = (detailDialog.data.laporan?.selesai || 0) + (detailDialog.data.surat?.selesai || 0) + (detailDialog.data.bansos?.disetujui || 0);
              const resolveRate = totalAll > 0 ? Math.round((totalSelesai / totalAll) * 100) : 0;
              return <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold">{totalAll}</p>
                    <p className="text-[9px] text-muted-foreground">Total Layanan</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-center">
                    <p className="text-lg font-bold text-[#b8923e]">{totalPending}</p>
                    <p className="text-[9px] text-muted-foreground">Menunggu</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-center">
                    <p className="text-lg font-bold text-[#2d7a5f]">{resolveRate}%</p>
                    <p className="text-[9px] text-muted-foreground">Tingkat Selesai</p>
                  </div>
                </div>
                {totalPending > 5 && insightBox(<Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `Ada ${totalPending} layanan yang masih menunggu. Warga mungkin merasa kurang direspon — prioritaskan penyelesaian untuk menjaga kepercayaan.`, "warning")}
                {resolveRate >= 70 && insightBox(<Award className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />, `Tingkat penyelesaian ${resolveRate}% — responsivitas layanan cukup baik! Bisa dijadikan konten: "Dari ${totalAll} permintaan layanan, ${totalSelesai} sudah diselesaikan."`, "success")}
                {items.map(item => {
                  const entries = Object.entries(item.data || {}).filter(([,v]) => (v as number) > 0);
                  const itemTotal = entries.reduce((s, [,v]) => s + (v as number), 0);
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold">{item.label}</p>
                        <span className="text-[10px] text-muted-foreground">{itemTotal} total</span>
                      </div>
                      {itemTotal > 0 ? (
                        <>
                          <div className="h-3 bg-muted rounded-full overflow-hidden flex mb-1.5">
                            {entries.map(([label, value]) => {
                              const color = STATUS_COLORS[label] || "#999";
                              return <div key={label} className="h-full" style={{ width: `${pctLabel(value as number, itemTotal)}%`, backgroundColor: color }} title={`${STATUS_LABELS[label] || label}: ${value}`} />;
                            })}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {entries.map(([label, value]) => {
                              const color = STATUS_COLORS[label] || "#999";
                              return <div key={label} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} /><span className="text-[10px]">{STATUS_LABELS[label] || label}: {value as number}</span></div>;
                            })}
                          </div>
                        </>
                      ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
                    </div>
                  );
                })}
              </>;
            })()}
            {detailDialog.section === "Data Rumah & Fasilitas" && (() => {
              const d = detailDialog.data;
              const bansosData = d.bansos as { penerima: number; bukan: number };
              const totalBansos = bansosData.penerima + bansosData.bukan;
              const bansosPct = totalBansos > 0 ? Math.round((bansosData.penerima / totalBansos) * 100) : 0;
              const kondisi = d.kondisiBangunan as Record<string, number>;
              const totalKondisi = Object.values(kondisi).reduce((s, v) => s + v, 0);
              const baik = kondisi["Baik"] || kondisi["baik"] || 0;
              const baikPct = totalKondisi > 0 ? Math.round((baik / totalKondisi) * 100) : 0;
              const statusR = d.statusRumah as Record<string, number>;
              const milikSendiri = statusR["Milik Sendiri"] || statusR["Hak Milik"] || 0;
              const totalRumah = Object.values(statusR).reduce((s, v) => s + v, 0);
              const sanitasi = d.sanitasiWc as Record<string, number>;
              const airBersih = d.sumberAir as Record<string, number>;
              return <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold">{baikPct}%</p>
                    <p className="text-[9px] text-muted-foreground">Bangunan Baik</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold">{totalRumah > 0 ? Math.round((milikSendiri / totalRumah) * 100) : 0}%</p>
                    <p className="text-[9px] text-muted-foreground">Milik Sendiri</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold">{bansosPct}%</p>
                    <p className="text-[9px] text-muted-foreground">Penerima Bansos</p>
                  </div>
                </div>
                {baikPct < 60 && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `Hanya ${baikPct}% bangunan berkondisi baik. Perlu program perbaikan rumah atau akses ke bantuan RTLH (Rumah Tidak Layak Huni).`, "warning")}
                {Object.entries(kondisi).filter(([,v]) => v > 0).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Kondisi Bangunan</p>
                    {Object.entries(kondisi).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value], i) => (
                      <div key={label} className="mb-1.5">
                        <div className="flex justify-between text-xs mb-0.5"><span>{label}</span><span className="font-semibold">{value} ({pctLabel(value, totalKondisi)}%)</span></div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pctLabel(value, totalKondisi)}%`, backgroundColor: COLORS[i % COLORS.length] }} /></div>
                      </div>
                    ))}
                  </div>
                )}
                {Object.entries(statusR).filter(([,v]) => v > 0).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Status Rumah</p>
                    {Object.entries(statusR).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value]) => (
                      <div key={label} className="flex justify-between text-xs py-1 border-b last:border-0"><span>{label}</span><span className="font-medium">{value} ({pctLabel(value, totalRumah)}%)</span></div>
                    ))}
                  </div>
                )}
                {Object.entries(airBersih).filter(([,v]) => v > 0).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Sumber Air</p>
                    {Object.entries(airBersih).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value]) => {
                      const tot = Object.values(airBersih).reduce((s, v) => s + v, 0);
                      return <div key={label} className="flex justify-between text-xs py-1 border-b last:border-0"><span>{label}</span><span className="font-medium">{value} ({pctLabel(value, tot)}%)</span></div>;
                    })}
                  </div>
                )}
                {Object.entries(sanitasi).filter(([,v]) => v > 0).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Sanitasi WC</p>
                    {Object.entries(sanitasi).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value]) => {
                      const tot = Object.values(sanitasi).reduce((s, v) => s + v, 0);
                      return <div key={label} className="flex justify-between text-xs py-1 border-b last:border-0"><span>{label}</span><span className="font-medium">{value} ({pctLabel(value, tot)}%)</span></div>;
                    })}
                  </div>
                )}
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-xs font-semibold mb-1">Penerima Bansos</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-[#b8923e] rounded-full" style={{ width: `${bansosPct}%` }} /></div>
                    <span className="text-xs font-bold">{bansosData.penerima} / {totalBansos}</span>
                  </div>
                </div>
              </>;
            })()}
            {detailDialog.section === "Data Keluarga" && (() => {
              const d = detailDialog.data;
              const wa = d.waOwnership as { punya: number; belum: number };
              const ktp = d.ktpOwnership as { punya: number; belum: number };
              const totalWa = wa.punya + wa.belum;
              const totalKtp = ktp.punya + ktp.belum;
              const waPct = totalWa > 0 ? Math.round((wa.punya / totalWa) * 100) : 0;
              const ktpPct = totalKtp > 0 ? Math.round((ktp.punya / totalKtp) * 100) : 0;
              const kedudukan = d.kedudukanKeluarga as Record<string, number>;
              const totalKed = Object.values(kedudukan).reduce((s, v) => s + v, 0);
              return <>
                <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Rata-rata Anggota per KK</p>
                    <p className="text-2xl font-bold">{d.avgPenghuni} <span className="text-sm font-normal text-muted-foreground">orang</span></p>
                  </div>
                  {insightBadge(Number(d.avgPenghuni) > 5 ? "perhatian" : "baik", Number(d.avgPenghuni) > 5 ? "Padat" : "Normal")}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2">Keterhubungan Digital</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-0.5"><span>WhatsApp Terdaftar</span>{insightBadge(waPct >= 70 ? "baik" : waPct >= 40 ? "perhatian" : "kritis", `${waPct}%`)}</div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-[#2d7a5f] rounded-full" style={{ width: `${waPct}%` }} /></div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{wa.punya} punya, {wa.belum} belum</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-0.5"><span>Foto KTP Terunggah</span>{insightBadge(ktpPct >= 70 ? "baik" : ktpPct >= 40 ? "perhatian" : "kritis", `${ktpPct}%`)}</div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-[#3b6db5] rounded-full" style={{ width: `${ktpPct}%` }} /></div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{ktp.punya} punya, {ktp.belum} belum</p>
                    </div>
                  </div>
                </div>
                {waPct < 50 && insightBox(<PhoneOff className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `Baru ${waPct}% warga yang terhubung WhatsApp. Jangkauan WA Blast tidak efektif — perlu jemput bola door-to-door untuk registrasi.`, "warning")}
                {Object.keys(kedudukan).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Kedudukan dalam Keluarga</p>
                    {Object.entries(kedudukan).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value]) => (
                      <div key={label} className="flex justify-between text-xs py-1 border-b last:border-0">
                        <span>{label}</span>
                        <span className="font-medium">{value} ({pctLabel(value, totalKed)}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </>;
            })()}
            {detailDialog.section === "Data per RT" && (() => {
              const rtData = detailDialog.data as any[];
              const avgWarga = rtData.length > 0 ? Math.round(rtData.reduce((s, r) => s + r.warga, 0) / rtData.length) : 0;
              const avgKk = rtData.length > 0 ? Math.round(rtData.reduce((s, r) => s + r.kk, 0) / rtData.length) : 0;
              const ranked = [...rtData].sort((a, b) => b.warga - a.warga);
              const maxWarga = Math.max(...rtData.map(r => r.warga), 1);
              const terbesar = ranked[0];
              const terkecil = ranked[ranked.length - 1];
              return <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold">{avgKk}</p>
                    <p className="text-[9px] text-muted-foreground">Rata-rata KK/RT</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold">{avgWarga}</p>
                    <p className="text-[9px] text-muted-foreground">Rata-rata Warga/RT</p>
                  </div>
                </div>
                {terbesar && terkecil && terbesar.rt !== terkecil.rt && insightBox(
                  <BarChart3 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />,
                  `RT ${String(terbesar.rt).padStart(2,"0")} paling padat (${terbesar.warga} warga), RT ${String(terkecil.rt).padStart(2,"0")} paling sedikit (${terkecil.warga} warga). Selisih ${terbesar.warga - terkecil.warga} orang — alokasi perhatian & sumber daya perlu proporsional.`,
                  "info"
                )}
                <div>
                  <p className="text-xs font-semibold mb-2">Ranking per RT (Jumlah Warga)</p>
                  {ranked.map((r, idx) => (
                    <div key={r.rt} className="mb-2 p-2.5 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${idx === 0 ? "bg-[#b8923e]" : idx === 1 ? "bg-[#8a8a8a]" : idx === 2 ? "bg-[#b87333]" : "bg-muted-foreground/50"}`}>{idx + 1}</span>
                          <span className="text-xs font-semibold">RT {String(r.rt).padStart(2, "0")}</span>
                        </div>
                        <span className="text-xs font-bold">{r.warga} warga</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
                        <div className="h-full rounded-full bg-[#2d7a5f]" style={{ width: `${(r.warga / maxWarga) * 100}%` }} />
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
                        <span>{r.kk} KK</span>
                        <span>L: {r.lakiLaki}</span>
                        <span>P: {r.perempuan}</span>
                        <span>Bansos: {r.bansos}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>;
            })()}
            <AiInsightButton section={detailDialog.section} data={detailDialog.data} />
          </div>
        </DetailDialog>
        );
      })()}
    </div>
  );
}
