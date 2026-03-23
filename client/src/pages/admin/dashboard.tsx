import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import {
  Users, Home, ClipboardList, FileText, UserCheck, UserX, UserMinus,
  Phone, PhoneOff, CreditCard, ImageOff, HandCoins, UserCog, ScrollText,
  Wallet, TrendingUp, TrendingDown, Heart, GraduationCap, Briefcase,
  UsersRound, Building2, AlertTriangle, Clock, Store, Award, Sparkles,
  Target, BarChart3, Eye, Loader2, Filter, ChevronRight, UserSearch,
  CheckCircle2, AlertCircle, Zap, ShieldCheck, Activity,
  Coins, ShoppingBag, ArrowUpCircle, ArrowDownCircle, Trophy,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Treemap, AreaChart, Area, CartesianGrid, Legend,
  LineChart, Line, ComposedChart,
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
  wargaSinggahStats: { totalAktif: number; mendekatiHabis: number; sudahHabis: number; totalPemilikKost: number; };
  usahaStats: { totalUsaha: number; pendaftaran: number; survey: number; disetujui: number; ditolak: number; stikerAktif: number; stikerMendekatiExpired: number; };
  pengangguran: { total: number; perUsia: Record<string, number>; daftarNama: { nama: string; usia: number | null; rt: number | null }[]; };
  capaian: { waPercent: number; ktpPercent: number; kkFotoPercent: number; bansosPercent: number; usahaBerizinPercent: number; totalUsahaTarget: number; totalUsahaBerizin: number; };
  rtList: number[];
  kondisiKesehatan: Record<string, number>;
  totalDisabilitas: number;
  totalIbuHamil: number;
  kategoriEkonomi: Record<string, number>;
  totalLayakBansos: number;
  kkEkonomiTerisi: number;
}

interface MonthlySnapshotData {
  id: number; month: string; totalKk: number; totalWarga: number; pengangguran: number;
  waRegistered: number; ktpUploaded: number; kkFotoUploaded: number; penerimaBansos: number;
  usahaBerizin: number; totalUsaha: number; laporanSelesai: number; totalLaporan: number;
  suratSelesai: number; totalSurat: number; pemasukan: number; pengeluaran: number;
  saldo: number; wargaSinggahAktif: number; indeksKemajuan: number;
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "Mei", "06": "Jun",
  "07": "Jul", "08": "Agu", "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
};

const COLORS = [
  "#2d7a5f", "#b8923e", "#3b6db5", "#b54560",
  "#7a4dbf", "#4dab8a", "#d97730", "#3a8fa6",
  "#c94d7a", "#5a8a3e", "#c9a83a",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#b8923e", diproses: "#3b6db5", selesai: "#2d7a5f", ditolak: "#b54560",
  disetujui: "#2d7a5f", approved: "#2d7a5f", rejected: "#b54560", generated: "#3b6db5",
  pendaftaran: "#3b6db5", survey: "#b8923e",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", diproses: "Diproses", selesai: "Selesai", ditolak: "Ditolak",
  disetujui: "Disetujui", approved: "Disetujui", rejected: "Ditolak", generated: "Digenerate",
  pendaftaran: "Pendaftaran", survey: "Survey",
};

const AGE_LABELS: Record<string, string> = {
  "0-5": "Balita (0-5)", "6-17": "Anak & Remaja (6-17)", "18-25": "Muda (18-25)",
  "26-40": "Dewasa (26-40)", "41-55": "Paruh Baya (41-55)", "56-64": "Pra-Lansia (56-64)",
  "65+": "Lansia (65+)", "Tidak Diketahui": "Tidak Diketahui",
};

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// Health level helper
function healthLevel(pct: number): "kritis" | "perhatian" | "baik" | "bagus" {
  if (pct < 40) return "kritis";
  if (pct < 65) return "perhatian";
  if (pct < 85) return "baik";
  return "bagus";
}

function healthColor(level: "kritis" | "perhatian" | "baik" | "bagus"): string {
  return level === "kritis" ? "#b54560" : level === "perhatian" ? "#d97730" : level === "baik" ? "#3b6db5" : "#2d7a5f";
}

function HealthBadge({ pct }: { pct: number }) {
  const level = healthLevel(pct);
  const map = { kritis: "bg-red-100 text-red-700 border-red-200", perhatian: "bg-orange-100 text-orange-700 border-orange-200", baik: "bg-blue-100 text-blue-700 border-blue-200", bagus: "bg-green-100 text-green-700 border-green-200" };
  const label = { kritis: "Kritis", perhatian: "Perlu Perhatian", baik: "Cukup Baik", bagus: "Sangat Baik" };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${map[level]}`}>{label[level]}</span>;
}

function CapaianBar({ label, pct, sublabel, color }: { label: string; pct: number; sublabel?: string; color?: string }) {
  const level = healthLevel(pct);
  const barColor = color || healthColor(level);
  const bg = level === "kritis" ? "bg-red-50 border-red-100" : level === "perhatian" ? "bg-orange-50 border-orange-100" : level === "baik" ? "bg-blue-50 border-blue-100" : "bg-green-50 border-green-100";

  return (
    <div className={`p-2.5 rounded-lg border ${bg}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold" style={{ color: barColor }}>{pct}%</span>
          <HealthBadge pct={pct} />
        </div>
      </div>
      <div className="h-2.5 bg-white/70 rounded-full overflow-hidden border border-white/50">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      {sublabel && <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{sublabel}</p>}
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
      <h3 className="text-sm font-semibold text-[#2d7a5f] flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-[#2d7a5f]" />
        {icon}
        {children}
      </h3>
      {onDetailClick && (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-[#2d7a5f]" onClick={onDetailClick}>
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
        <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
          {mutation.isPending ? "Menganalisis data..." : "Minta Rekomendasi AI"}
        </Button>
      )}
      {mutation.isError && <p className="text-xs text-red-500 mt-2">Gagal mendapatkan insight</p>}
      {insight && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 mt-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700">Rekomendasi AI</span>
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

// ─── KOMPONEN UTAMA ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [rtFilter, setRtFilter] = useState<string>("all");
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; title: string; section: string; data: any } | null>(null);
  const [trendMetric, setTrendMetric] = useState<string>("indeksKemajuan");

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

  const { data: monthlyData } = useQuery<MonthlySnapshotData[]>({
    queryKey: ["/api/stats/monthly"],
    queryFn: async () => {
      const res = await fetch("/api/stats/monthly", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: rwcoinDashboard, isLoading: rwcoinLoading } = useQuery<{
    transaksiTerbaru: any[];
    topupTerbaru: any[];
    leaderboardMitra: { mitraId: number; namaUsaha: string; totalBelanja: number; jumlahTx: number }[];
    perputaran: { totalDiWarga: number; totalDiMitra: number; totalWithdrawn: number; totalBeredar: number };
  }>({
    queryKey: ["/api/rwcoin/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/rwcoin/dashboard", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    staleTime: 30000,
  });

  const openDetail = (title: string, section: string, data: any) => {
    setDetailDialog({ open: true, title, section, data });
  };

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold" data-testid="text-dashboard-title">Dashboard</h2>
        <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  // ─── Kalkulasi data tugas ──────────────────────────────────────────────────
  type ActionItem = {
    level: "segera" | "perhatian";
    icon: typeof ClipboardList;
    label: string;
    count: number;
    desc: string;
  };

  const actionItems: ActionItem[] = [];

  // SEGERA
  if (stats.pendingLaporan > 0)
    actionItems.push({ level: "segera", icon: ClipboardList, label: "Laporan Warga Pending", count: stats.pendingLaporan, desc: "laporan belum ditindaklanjuti" });
  if (stats.pendingSurat > 0)
    actionItems.push({ level: "segera", icon: FileText, label: "Surat Warga Pending", count: stats.pendingSurat, desc: "permohonan surat belum diproses" });
  if (stats.pendingPengajuanBansos > 0)
    actionItems.push({ level: "segera", icon: HandCoins, label: "Pengajuan Bansos Pending", count: stats.pendingPengajuanBansos, desc: "pengajuan menunggu verifikasi" });
  if (stats.pendingEditProfil > 0)
    actionItems.push({ level: "segera", icon: UserCog, label: "Permintaan Edit Data Pending", count: stats.pendingEditProfil, desc: "warga minta perubahan data" });
  if ((stats.donasiSummary?.totalDonasiPending || 0) > 0)
    actionItems.push({ level: "segera", icon: Heart, label: "Donasi Belum Dikonfirmasi", count: stats.donasiSummary.totalDonasiPending, desc: "donasi masuk belum diverifikasi" });
  if ((stats.wargaSinggahStats?.sudahHabis || 0) > 0)
    actionItems.push({ level: "segera", icon: Clock, label: "Kontrak Warga Singgah Habis", count: stats.wargaSinggahStats.sudahHabis, desc: "kontrak sudah melewati jatuh tempo" });

  // PERHATIKAN
  if ((stats.wargaSinggahStats?.mendekatiHabis || 0) > 0)
    actionItems.push({ level: "perhatian", icon: AlertTriangle, label: "Kontrak Hampir Habis", count: stats.wargaSinggahStats.mendekatiHabis, desc: "kontrak warga singgah mendekati habis" });
  if ((stats.usahaStats?.stikerMendekatiExpired || 0) > 0)
    actionItems.push({ level: "perhatian", icon: Store, label: "Stiker Usaha Mau Expired", count: stats.usahaStats.stikerMendekatiExpired, desc: "stiker UMKM mendekati masa berlaku" });
  if (stats.capaian.waPercent < 60)
    actionItems.push({ level: "perhatian", icon: PhoneOff, label: "Nomor WA Warga Rendah", count: stats.waOwnership.belum, desc: `baru ${stats.capaian.waPercent}% terdaftar WA — WA Blast tidak efektif` });
  if (stats.capaian.ktpPercent < 50)
    actionItems.push({ level: "perhatian", icon: ImageOff, label: "Upload KTP Masih Rendah", count: stats.ktpOwnership.belum, desc: `baru ${stats.capaian.ktpPercent}% KTP terunggah` });
  if (stats.pengangguran.total > 0 && (stats.totalWarga > 0 ? stats.pengangguran.total / stats.totalWarga : 0) > 0.08)
    actionItems.push({ level: "perhatian", icon: UserSearch, label: "Angka Pengangguran Tinggi", count: stats.pengangguran.total, desc: `${Math.round((stats.pengangguran.total / stats.totalWarga) * 100)}% warga usia 18+ belum bekerja` });

  const segeraItems = actionItems.filter(a => a.level === "segera");
  const perhatianItems = actionItems.filter(a => a.level === "perhatian");
  const semuaBeres = actionItems.length === 0;

  // ─── Kalkulasi Indeks & Kondisi ───────────────────────────────────────────
  const latestSnapshot = monthlyData && monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;
  const prevSnapshot = monthlyData && monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
  const indeks = latestSnapshot?.indeksKemajuan ?? 0;
  const indeksDiff = prevSnapshot ? indeks - prevSnapshot.indeksKemajuan : 0;
  const kondisiLabel = indeks >= 80 ? "Sangat Baik" : indeks >= 65 ? "Cukup Baik" : indeks >= 45 ? "Perlu Perhatian" : "Kritis";
  const kondisiColor = indeks >= 80 ? "#2d7a5f" : indeks >= 65 ? "#3b6db5" : indeks >= 45 ? "#d97730" : "#b54560";
  const kondisiBg = indeks >= 80 ? "from-green-50 to-emerald-50 border-green-200" : indeks >= 65 ? "from-blue-50 to-sky-50 border-blue-200" : indeks >= 45 ? "from-orange-50 to-amber-50 border-orange-200" : "from-red-50 to-rose-50 border-red-200";

  const capaianItems = [
    { label: "WhatsApp Terdaftar", pct: stats.capaian.waPercent, sublabel: `${stats.waOwnership.belum} warga belum punya WA`, color: undefined },
    { label: "KTP Terunggah", pct: stats.capaian.ktpPercent, sublabel: `${stats.ktpOwnership.belum} KTP belum diupload`, color: "#3b6db5" },
    { label: "Foto KK Terunggah", pct: stats.capaian.kkFotoPercent, sublabel: `${stats.kkFotoOwnership?.belum ?? 0} KK belum punya foto`, color: "#7a4dbf" },
    { label: "Usaha Berizin", pct: stats.capaian.usahaBerizinPercent, sublabel: `${stats.capaian.totalUsahaBerizin} dari ${stats.capaian.totalUsahaTarget} usaha`, color: "#d97730" },
  ];

  const pekerjaanData = stats.pekerjaan.map((p, i) => ({ name: p.name, value: p.count, fill: COLORS[i % COLORS.length] }));
  const genderPieData = Object.entries(stats.jenisKelamin).map(([name, value], i) => ({ name, value, fill: i === 0 ? "#3b6db5" : "#b54560" }));
  const perRtStackedData = stats.perRt.map(r => ({ name: `RT ${String(r.rt).padStart(2, "0")}`, "Laki-laki": r.lakiLaki, "Perempuan": r.perempuan, kk: r.kk, bansos: r.bansos }));
  const radarData = stats.perRt.map(r => {
    const maxW = Math.max(...stats.perRt.map(x => x.warga), 1);
    const maxK = Math.max(...stats.perRt.map(x => x.kk), 1);
    const maxB = Math.max(...stats.perRt.map(x => x.bansos), 1);
    return { rt: `RT ${String(r.rt).padStart(2, "0")}`, Warga: Math.round((r.warga / maxW) * 100), KK: Math.round((r.kk / maxK) * 100), Bansos: maxB > 0 ? Math.round((r.bansos / maxB) * 100) : 0 };
  });
  const pendidikanTreemap = Object.entries(stats.pendidikan).filter(([, v]) => v > 0).map(([name, value], i) => ({ name, size: value, fill: COLORS[i % COLORS.length] }));
  const usiaBarData = Object.entries(stats.kelompokUsia).filter(([, v]) => v > 0).map(([key, value], i) => ({ name: AGE_LABELS[key] || key, value, fill: COLORS[i % COLORS.length] }));
  const pengangguranUsiaData = Object.entries(stats.pengangguran.perUsia).filter(([, v]) => v > 0).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  const statusKepColors: Record<string, { color: string; icon: typeof UserCheck }> = {
    Aktif: { color: "#2d7a5f", icon: UserCheck },
    Pindah: { color: "#b8923e", icon: UserMinus },
    Meninggal: { color: "#b54560", icon: UserX },
  };

  // Trend chart data
  const fmtMonth = (m: string) => { const [y, mo] = m.split("-"); return `${MONTH_NAMES[mo] || mo} '${y.slice(2)}`; };
  const chartData = (monthlyData || []).map(s => ({
    month: fmtMonth(s.month), raw: s.month, indeksKemajuan: s.indeksKemajuan,
    totalWarga: s.totalWarga, totalKk: s.totalKk, pengangguran: s.pengangguran,
    waRegistered: s.waRegistered, ktpUploaded: s.ktpUploaded, kkFotoUploaded: s.kkFotoUploaded,
    penerimaBansos: s.penerimaBansos, usahaBerizin: s.usahaBerizin,
    laporanSelesai: s.laporanSelesai, suratSelesai: s.suratSelesai,
    pemasukan: s.pemasukan, pengeluaran: s.pengeluaran, saldo: s.saldo,
    wargaSinggahAktif: s.wargaSinggahAktif,
    waPct: s.totalWarga > 0 ? Math.round((s.waRegistered / s.totalWarga) * 100) : 0,
    ktpPct: s.totalWarga > 0 ? Math.round((s.ktpUploaded / s.totalWarga) * 100) : 0,
    pengangguranPct: s.totalWarga > 0 ? Math.round((s.pengangguran / s.totalWarga) * 100) : 0,
  }));
  const trendMetrics = [
    { key: "indeksKemajuan", label: "Indeks Kemajuan", color: "#2d7a5f", suffix: "%" },
    { key: "pengangguran", label: "Pengangguran", color: "#b54560", suffix: " org" },
    { key: "waPct", label: "% WA", color: "#2d7a5f", suffix: "%" },
    { key: "ktpPct", label: "% KTP", color: "#3b6db5", suffix: "%" },
    { key: "totalWarga", label: "Total Warga", color: "#b8923e", suffix: " org" },
    { key: "usahaBerizin", label: "Usaha Berizin", color: "#d97730", suffix: "" },
    { key: "laporanSelesai", label: "Laporan Selesai", color: "#4dab8a", suffix: "" },
    { key: "saldo", label: "Saldo Kas", color: "#3b6db5", suffix: "" },
    { key: "penerimaBansos", label: "Penerima Bansos", color: "#7a4dbf", suffix: " KK" },
    { key: "wargaSinggahAktif", label: "Warga Singgah", color: "#3a8fa6", suffix: " org" },
  ];
  const activeTrend = trendMetrics.find(t => t.key === trendMetric) || trendMetrics[0];

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" />
          Menampilkan data untuk RT {String(rtFilter).padStart(2, "0")}
        </div>
      )}

      {/* ── 1. KONDISI RW HARI INI ─────────────────────────────────────────── */}
      <Card className={`border bg-gradient-to-br ${kondisiBg}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Skor besar */}
            <div className="flex-shrink-0 text-center">
              <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center shadow-sm" style={{ backgroundColor: kondisiColor }}>
                <p className="text-3xl font-black text-white leading-none">{indeks}</p>
                <p className="text-[10px] text-white/70 mt-0.5">/ 100</p>
              </div>
              {prevSnapshot && (
                <div className={`flex items-center justify-center gap-0.5 mt-1.5 ${indeksDiff >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {indeksDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="text-[10px] font-bold">{indeksDiff > 0 ? "+" : ""}{indeksDiff}</span>
                </div>
              )}
            </div>

            {/* Status + ringkasan */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-base font-bold" style={{ color: kondisiColor }}>Kondisi RW: {kondisiLabel}</p>
                {segeraItems.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
                    <AlertCircle className="w-3 h-3" />{segeraItems.length} harus dikerjakan
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">Indeks kemajuan RW dari 7 indikator capaian</p>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="flex items-center gap-1.5 p-1.5 bg-white/70 rounded-lg">
                  <Home className="w-3.5 h-3.5 text-[#2d7a5f] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold leading-tight">{stats.totalKk}</p>
                    <p className="text-[9px] text-muted-foreground">KK</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 bg-white/70 rounded-lg">
                  <Users className="w-3.5 h-3.5 text-[#b8923e] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold leading-tight">{stats.totalWarga}</p>
                    <p className="text-[9px] text-muted-foreground">Warga</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 bg-white/70 rounded-lg">
                  <UserSearch className="w-3.5 h-3.5 text-[#b54560] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold leading-tight text-[#b54560]">{stats.pengangguran.total}</p>
                    <p className="text-[9px] text-muted-foreground">Pengangguran</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. PUSAT TUGAS ─────────────────────────────────────────────────── */}
      <Card className={semuaBeres ? "border-green-200 bg-green-50/30" : segeraItems.length > 0 ? "border-red-200 bg-red-50/20" : "border-orange-200 bg-orange-50/20"}>
        <CardContent className="p-4 space-y-3">
          {/* Header Pusat Tugas */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${semuaBeres ? "bg-green-100" : segeraItems.length > 0 ? "bg-red-100" : "bg-orange-100"}`}>
              {semuaBeres ? <ShieldCheck className="w-4 h-4 text-green-600" /> : segeraItems.length > 0 ? <Zap className="w-4 h-4 text-red-600" /> : <Activity className="w-4 h-4 text-orange-600" />}
            </div>
            <div>
              <h3 className={`text-sm font-bold ${semuaBeres ? "text-green-800" : segeraItems.length > 0 ? "text-red-800" : "text-orange-800"}`}>
                Pusat Tugas RW
              </h3>
              <p className={`text-[11px] ${semuaBeres ? "text-green-600" : segeraItems.length > 0 ? "text-red-600" : "text-orange-600"}`}>
                {semuaBeres
                  ? "Semua kondisi berjalan baik — tidak ada tugas mendesak"
                  : `${segeraItems.length} harus segera dikerjakan · ${perhatianItems.length} perlu diperhatikan`}
              </p>
            </div>
          </div>

          {semuaBeres ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100/60 border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Kerja RW sedang bagus!</p>
                <p className="text-[11px] text-green-600">Tidak ada laporan/surat/bansos pending. Capaian data warga dalam kondisi baik.</p>
              </div>
            </div>
          ) : (
            <>
              {/* SEGERA */}
              {segeraItems.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-[11px] font-bold text-red-700 uppercase tracking-wide">Harus Dikerjakan Sekarang</p>
                  </div>
                  {segeraItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-red-100 hover:border-red-200 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-black text-red-600 leading-none">{item.count}</p>
                        <p className="text-[9px] text-red-400">item</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PERHATIKAN */}
              {perhatianItems.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wide">Perlu Diperhatikan</p>
                  </div>
                  {perhatianItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-orange-100 hover:border-orange-200 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-black text-orange-500 leading-none">{item.count}</p>
                        <p className="text-[9px] text-orange-400">item</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 3. TARGET CAPAIAN ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <SectionTitle icon={<Target className="w-4 h-4" />} onDetailClick={() => openDetail("Angka Capaian RW", "Angka Capaian", stats.capaian)}>
            Target Capaian RW
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {capaianItems.map(c => (
              <CapaianBar key={c.label} label={c.label} pct={c.pct} sublabel={c.sublabel} color={c.color} />
            ))}
          </div>
          <div className="mt-3 p-2.5 rounded-lg bg-muted/40 border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Rata-rata capaian 4 indikator:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">
                  {Math.round(capaianItems.reduce((s, c) => s + c.pct, 0) / capaianItems.length)}%
                </span>
                <HealthBadge pct={Math.round(capaianItems.reduce((s, c) => s + c.pct, 0) / capaianItems.length)} />
              </div>
            </div>
          </div>
          <AiInsightButton section="Angka Capaian" data={stats.capaian} />
        </CardContent>
      </Card>

      {/* ── 4. TREN KEMAJUAN ───────────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <Card className="border-[#2d7a5f]/20 bg-gradient-to-br from-green-50/30 to-emerald-50/30">
          <CardContent className="p-4">
            <SectionTitle icon={<TrendingUp className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Tren Bulanan", "Tren Bulanan", { snapshots: monthlyData })}>
              Tren & Indeks Kemajuan
            </SectionTitle>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {trendMetrics.map(t => (
                <button
                  key={t.key}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${trendMetric === t.key ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  style={trendMetric === t.key ? { backgroundColor: t.color } : undefined}
                  onClick={() => setTrendMetric(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeTrend.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={activeTrend.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="bg-card border rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-xs font-semibold mb-1">{label}</p>
                    <p className="text-xs font-bold" style={{ color: activeTrend.color }}>
                      {activeTrend.label}: {activeTrend.key === "saldo" ? formatRupiah(Number(payload[0].value)) : `${payload[0].value}${activeTrend.suffix}`}
                    </p>
                  </div>
                ) : null} />
                <Area type="monotone" dataKey={activeTrend.key} stroke={activeTrend.color} strokeWidth={2.5} fill="url(#gradTrend)" dot={{ r: 4, fill: activeTrend.color }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
            {chartData.length > 1 && (() => {
              const curr = chartData[chartData.length - 1];
              const prevC = chartData[chartData.length - 2];
              const currVal = (curr as any)[activeTrend.key];
              const prevVal = (prevC as any)[activeTrend.key];
              const diff = currVal - prevVal;
              const isGood = activeTrend.key === "pengangguran" ? diff <= 0 : diff >= 0;
              return (
                <div className={`mt-2 flex items-center gap-2 p-2 rounded-lg border text-xs ${isGood ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  {isGood ? <TrendingUp className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
                  <span>
                    <span className="font-semibold">{activeTrend.label}</span>: {activeTrend.key === "saldo" ? formatRupiah(currVal) : currVal}{activeTrend.suffix}
                    {" "}({diff > 0 ? "+" : ""}{activeTrend.key === "saldo" ? formatRupiah(diff) : diff}{activeTrend.suffix} dari bulan lalu)
                    {" — "}<span className={`font-bold ${isGood ? "text-green-700" : "text-red-700"}`}>{isGood ? "Membaik" : "Menurun"}</span>
                  </span>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* ── 5. KEUANGAN ────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <SectionTitle icon={<Wallet className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Keuangan", "Keuangan", { keuangan: stats.keuangan, donasi: stats.donasiSummary })}>
            Keuangan RW
          </SectionTitle>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Pemasukan", value: stats.keuangan?.totalPemasukan || 0, icon: TrendingUp, color: "#2d7a5f" },
              { label: "Pengeluaran", value: stats.keuangan?.totalPengeluaran || 0, icon: TrendingDown, color: "#b54560" },
              { label: "Saldo Kas", value: stats.keuangan?.saldo || 0, icon: Wallet, color: (stats.keuangan?.saldo || 0) >= 0 ? "#2d7a5f" : "#b54560" },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center p-2.5 rounded-lg bg-muted/40 border">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1" style={{ backgroundColor: item.color }}>
                  <item.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-[11px] font-bold leading-tight text-center" style={{ color: item.color }}>{formatRupiah(item.value)}</p>
                <p className="text-[9px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          {/* Donasi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Total Donasi Masuk", value: formatRupiah(stats.donasiSummary?.totalDonasiMasuk || 0), icon: Heart, color: "#b54560" },
              { label: "Donatur Terkonfirmasi", value: stats.donasiSummary?.totalDonatur || 0, icon: Users, color: "#b8923e" },
              { label: "Campaign Aktif", value: stats.donasiSummary?.campaignAktif || 0, icon: HandCoins, color: "#2d7a5f" },
              { label: "Donasi Pending", value: stats.donasiSummary?.totalDonasiPending || 0, icon: Clock, color: (stats.donasiSummary?.totalDonasiPending || 0) > 0 ? "#d97730" : "#999" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
                <div>
                  <p className="text-sm font-bold leading-tight">{item.value}</p>
                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 5b. RWCOIN ECOSYSTEM ───────────────────────────────────────────── */}
      <Card className="border-[hsl(40,45%,55%)]/30 bg-gradient-to-br from-amber-50/20 to-yellow-50/10">
        <CardContent className="p-4">
          <SectionTitle icon={<Coins className="w-4 h-4" style={{ color: "hsl(40,45%,55%)" }} />}>
            Ekosistem RWcoin
          </SectionTitle>

          {rwcoinLoading ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ) : !rwcoinDashboard ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Gagal memuat data RWcoin</p>
          ) : (
            <>
              {/* Perputaran coin */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Beredar di Warga", value: rwcoinDashboard.perputaran.totalDiWarga, icon: Wallet, color: "#2d7a5f" },
                  { label: "Di Saldo Mitra", value: rwcoinDashboard.perputaran.totalDiMitra, icon: Store, color: "#3b6db5" },
                  { label: "Total Beredar", value: rwcoinDashboard.perputaran.totalBeredar, icon: Coins, color: "hsl(40,45%,55%)" },
                  { label: "Ditarik Mitra", value: rwcoinDashboard.perputaran.totalWithdrawn, icon: ArrowDownCircle, color: "#b54560" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/60 border border-white/80 shadow-sm">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.color }}>
                      <item.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight" style={{ color: item.color }}>
                        {item.value.toLocaleString("id-ID")} 🪙
                      </p>
                      <p className="text-[9px] text-muted-foreground leading-tight">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 5 Transaksi Terakhir + 5 Topup Terakhir */}
                <div className="sm:col-span-2 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                      <ShoppingBag className="w-3.5 h-3.5" /> 5 Transaksi Terakhir
                    </p>
                    <div className="space-y-1.5">
                      {rwcoinDashboard.transaksiTerbaru.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">Belum ada transaksi</p>
                      ) : rwcoinDashboard.transaksiTerbaru.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/60 border border-white/80">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              t.tipe === "topup" ? "bg-green-100 text-green-600"
                              : t.tipe === "belanja" ? "bg-blue-100 text-blue-600"
                              : t.tipe === "transfer" ? "bg-purple-100 text-purple-600"
                              : "bg-orange-100 text-orange-600"
                            }`}>
                              {t.tipe === "topup" ? <ArrowUpCircle className="w-3.5 h-3.5" />
                                : t.tipe === "belanja" ? <ShoppingBag className="w-3.5 h-3.5" />
                                : t.tipe === "transfer" ? <ArrowUpCircle className="w-3.5 h-3.5" />
                                : <ArrowDownCircle className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium truncate">
                                {t.tipe === "topup" ? `Topup → ${t.namaWarga ?? "-"}`
                                  : t.tipe === "belanja" ? `${t.namaWarga ?? "-"} → ${t.namaUsaha ?? "-"}`
                                  : t.tipe === "transfer" ? `Transfer ${t.namaWarga ?? "-"}`
                                  : `${t.namaUsaha ?? "-"}`}
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                {new Date(t.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className={`text-[11px] font-bold ${t.tipe === "topup" ? "text-green-600" : t.tipe === "belanja" ? "text-blue-600" : "text-purple-600"}`}>
                              {t.tipe === "topup" ? "+" : "-"}{t.jumlahBayar.toLocaleString("id-ID")} 🪙
                            </p>
                            {t.jumlahDiskon > 0 && (
                              <p className="text-[9px] text-emerald-600">hemat {t.jumlahDiskon.toLocaleString("id-ID")}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                      <ArrowUpCircle className="w-3.5 h-3.5 text-green-600" /> 5 Topup Terakhir
                    </p>
                    <div className="space-y-1.5">
                      {rwcoinDashboard.topupTerbaru.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">Belum ada topup</p>
                      ) : rwcoinDashboard.topupTerbaru.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-green-50/60 border border-green-100/60">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium truncate">{t.namaWarga ?? "-"}</p>
                            <p className="text-[9px] text-muted-foreground">
                              {new Date(t.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              {t.keterangan ? ` · ${t.keterangan}` : ""}
                            </p>
                          </div>
                          <p className="text-[11px] font-bold text-green-700 flex-shrink-0 ml-2">
                            +{t.jumlahBayar.toLocaleString("id-ID")} 🪙
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Leaderboard Mitra */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> Mitra Teratas
                  </p>
                  {rwcoinDashboard.leaderboardMitra.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Belum ada transaksi mitra</p>
                  ) : (
                    <div className="space-y-2">
                      {rwcoinDashboard.leaderboardMitra.map((m, idx) => {
                        const max = rwcoinDashboard.leaderboardMitra[0].totalBelanja;
                        const pct = max > 0 ? Math.round((m.totalBelanja / max) * 100) : 0;
                        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                        return (
                          <div key={m.mitraId} className="p-2 rounded-lg bg-white/60 border border-white/80">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm flex-shrink-0">{medals[idx]}</span>
                                <p className="text-[11px] font-semibold truncate">{m.namaUsaha}</p>
                              </div>
                              <p className="text-[10px] text-muted-foreground flex-shrink-0">{m.jumlahTx} tx</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: idx === 0 ? "#b8923e" : "#2d7a5f" }} />
                              </div>
                              <p className="text-[10px] font-bold" style={{ color: idx === 0 ? "#b8923e" : "#2d7a5f" }}>
                                {m.totalBelanja.toLocaleString("id-ID")} 🪙
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 6. RINGKASAN LAYANAN ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <SectionTitle icon={<ClipboardList className="w-4 h-4" />} onDetailClick={() => openDetail("Ringkasan Layanan", "Layanan", { laporan: stats.statusLaporan, surat: stats.statusSuratWarga, bansos: stats.statusPengajuanBansos })}>
            Ringkasan Layanan Warga
          </SectionTitle>
          {/* Pending summary bar */}
          {(stats.pendingLaporan + stats.pendingSurat + stats.pendingPengajuanBansos) > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
              <p className="text-[11px] font-semibold text-red-700 w-full flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Total {stats.pendingLaporan + stats.pendingSurat + stats.pendingPengajuanBansos} item masih pending
              </p>
              {stats.pendingLaporan > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{stats.pendingLaporan} Laporan</span>}
              {stats.pendingSurat > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{stats.pendingSurat} Surat</span>}
              {stats.pendingPengajuanBansos > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{stats.pendingPengajuanBansos} Bansos</span>}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Laporan Warga", total: stats.totalLaporan, data: stats.statusLaporan },
              { label: "Surat Warga", total: stats.totalSuratWarga, data: stats.statusSuratWarga },
              { label: "Pengajuan Bansos", total: stats.totalPengajuanBansos, data: stats.statusPengajuanBansos },
              { label: "Surat RW", total: stats.totalSuratRw, data: stats.totalSuratRw > 0 ? { diterbitkan: stats.totalSuratRw } : {} },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <span className="text-xs font-bold">{item.total} total</span>
                </div>
                <StatusBar data={item.data} colorMap={{ diterbitkan: "#2d7a5f" }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 7. MASALAH SOSIAL: Pengangguran + Warga Singgah ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <SectionTitle icon={<UserSearch className="w-4 h-4" />} onDetailClick={() => openDetail("Data Pengangguran", "Pengangguran", stats.pengangguran)}>
              Angka Pengangguran
            </SectionTitle>
            <div className={`flex items-center gap-3 p-3 rounded-lg mb-3 ${stats.pengangguran.total > 0 ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stats.pengangguran.total > 0 ? "#b54560" : "#2d7a5f" }}>
                <UserSearch className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: stats.pengangguran.total > 0 ? "#b54560" : "#2d7a5f" }}>{stats.pengangguran.total}</p>
                <p className="text-xs text-muted-foreground">usia 18+ belum bekerja</p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.totalWarga > 0 ? Math.round((stats.pengangguran.total / stats.totalWarga) * 100) : 0}% dari total warga
                  {stats.totalWarga > 0 && (stats.pengangguran.total / stats.totalWarga) > 0.1 && (
                    <span className="ml-1 text-red-500 font-semibold">— Tinggi!</span>
                  )}
                </p>
              </div>
            </div>
            {pengangguranUsiaData.length > 0 && (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={pengangguranUsiaData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Jumlah">
                    {pengangguranUsiaData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <SectionTitle icon={<Building2 className="w-4 h-4" />}>Warga Singgah & Kost</SectionTitle>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: "Aktif", value: stats.wargaSinggahStats?.totalAktif || 0, icon: UserCheck, color: "#2d7a5f", bg: "bg-green-50" },
                { label: "Hampir Habis", value: stats.wargaSinggahStats?.mendekatiHabis || 0, icon: AlertTriangle, color: "#d97730", bg: (stats.wargaSinggahStats?.mendekatiHabis || 0) > 0 ? "bg-orange-50" : "bg-muted/40" },
                { label: "Kontrak Habis", value: stats.wargaSinggahStats?.sudahHabis || 0, icon: Clock, color: (stats.wargaSinggahStats?.sudahHabis || 0) > 0 ? "#b54560" : "#999", bg: (stats.wargaSinggahStats?.sudahHabis || 0) > 0 ? "bg-red-50" : "bg-muted/40" },
                { label: "Pemilik Kost", value: stats.wargaSinggahStats?.totalPemilikKost || 0, icon: Building2, color: "#3b6db5", bg: "bg-blue-50" },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-2 p-2.5 rounded-lg ${item.bg} border`}>
                  <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
                  <div>
                    <p className="text-base font-bold leading-tight" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <SectionTitle icon={<Store className="w-4 h-4" />}>Pendataan Usaha UMKM</SectionTitle>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                { label: "Total Usaha", value: stats.usahaStats?.totalUsaha || 0, icon: Store, color: "#2d7a5f" },
                { label: "Stiker Aktif", value: stats.usahaStats?.stikerAktif || 0, icon: Award, color: "#b8923e" },
                { label: "Mau Expired", value: stats.usahaStats?.stikerMendekatiExpired || 0, icon: AlertTriangle, color: (stats.usahaStats?.stikerMendekatiExpired || 0) > 0 ? "#b54560" : "#999" },
                { label: "Disetujui", value: stats.usahaStats?.disetujui || 0, icon: CheckCircle2, color: "#3b6db5" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border">
                  <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-[9px] text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <StatusBar data={{ pendaftaran: stats.usahaStats?.pendaftaran || 0, survey: stats.usahaStats?.survey || 0, disetujui: stats.usahaStats?.disetujui || 0, ditolak: stats.usahaStats?.ditolak || 0 }} colorMap={{ pendaftaran: "#3b6db5", survey: "#b8923e", disetujui: "#2d7a5f", ditolak: "#b54560" }} />
          </CardContent>
        </Card>
      </div>

      {/* ── 8. DATA PER RT ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <SectionTitle icon={<BarChart3 className="w-4 h-4" />} onDetailClick={() => openDetail("Data per RT", "Data per RT", stats.perRt)}>
            Perbandingan Data per RT
          </SectionTitle>
          {/* Summary rows per RT */}
          <div className="space-y-2 mb-4">
            {stats.perRt.map((r) => {
              const maxW = Math.max(...stats.perRt.map(x => x.warga), 1);
              const bansosRate = r.warga > 0 ? Math.round((r.bansos / r.warga) * 100) : 0;
              return (
                <div key={r.rt} className="group cursor-pointer hover:bg-muted/20 rounded-lg p-1.5 transition-colors" onClick={() => openDetail(`Detail RT ${String(r.rt).padStart(2, "0")}`, `RT ${r.rt}`, r)}>
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-xs font-bold flex-shrink-0 text-[#2d7a5f]">RT {String(r.rt).padStart(2, "0")}</span>
                    <div className="flex-1 relative h-7 bg-muted rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg transition-all duration-500" style={{ width: `${Math.max(6, (r.warga / maxW) * 100)}%`, backgroundColor: "#2d7a5f", opacity: 0.8 }} />
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-foreground">
                        {r.kk} KK · {r.warga} Warga
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {r.bansos > 0 && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          {r.bansos} Bansos
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground">{r.lakiLaki}L {r.perempuan}P</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-[#2d7a5f] transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {perRtStackedData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={perRtStackedData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Laki-laki" stackId="gender" fill="#3b6db5" />
                <Bar dataKey="Perempuan" stackId="gender" fill="#b54560" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {radarData.length > 2 && (
            <div className="mt-4">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Perbandingan relatif antar RT</p>
              <ResponsiveContainer width="100%" height={230}>
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
        </CardContent>
      </Card>

      {/* ── 9. DEMOGRAFI ───────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <SectionTitle icon={<Users className="w-4 h-4" />} onDetailClick={() => openDetail("Demografi Warga", "Demografi", { jenisKelamin: stats.jenisKelamin, statusPerkawinan: stats.statusPerkawinan, agama: stats.agama, kelompokUsia: stats.kelompokUsia })}>
            Demografi Warga
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Jenis Kelamin</p>
              {genderPieData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={genderPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {genderPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-3">
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
                <ResponsiveContainer width="100%" height={175}>
                  <BarChart data={usiaBarData} layout="vertical" margin={{ left: 5, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Jumlah">
                      {usiaBarData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Status Perkawinan</p>
              {Object.keys(stats.statusPerkawinan).length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
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
              <div className="space-y-1.5">
                {Object.entries(stats.agama).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value], i) => {
                  const max = Math.max(...Object.values(stats.agama), 1);
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 10. STATUS KEPENDUDUKAN + DATA KELUARGA ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <SectionTitle icon={<UserCog className="w-4 h-4" />}>Status Kependudukan</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(statusKepColors).map(([status, { color, icon: Icon }]) => (
                <div key={status} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
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
          <CardContent className="p-4">
            <SectionTitle icon={<UsersRound className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Data Keluarga", "Data Keluarga", { avgPenghuni: stats.avgPenghuni, waOwnership: stats.waOwnership, ktpOwnership: stats.ktpOwnership })}>
              Data Keluarga
            </SectionTitle>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 mb-3">
              <UsersRound className="w-5 h-5 text-[#2d7a5f]" />
              <div>
                <p className="text-sm font-bold">{stats.avgPenghuni || 0} orang</p>
                <p className="text-[10px] text-muted-foreground">Rata-rata anggota per KK</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: "Punya WhatsApp", have: stats.waOwnership.punya, havent: stats.waOwnership.belum, icon: Phone, color: "#2d7a5f" },
                { label: "KTP Terunggah", have: stats.ktpOwnership.punya, havent: stats.ktpOwnership.belum, icon: CreditCard, color: "#3b6db5" },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1"><item.icon className="w-3 h-3" style={{ color: item.color }} /> {item.label}</span>
                    <span className="text-muted-foreground">{item.have} punya · <span className="text-red-500 font-medium">{item.havent} belum</span></span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${stats.totalWarga > 0 ? (item.have / stats.totalWarga) * 100 : 0}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 11. PENDIDIKAN + PEKERJAAN ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <SectionTitle icon={<GraduationCap className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Pendidikan", "Pendidikan", stats.pendidikan)}>
              Tingkat Pendidikan
            </SectionTitle>
            {pendidikanTreemap.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <Treemap data={pendidikanTreemap} dataKey="size" nameKey="name" aspectRatio={4 / 3} stroke="#fff" content={(({ x, y, width, height, name, size, fill }: any) => {
                  if (width < 30 || height < 25) return <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />;
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" rx={4} />
                      <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">{name}</text>
                      <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={9}>{size}</text>
                    </g>
                  );
                }) as any} />
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <SectionTitle icon={<Briefcase className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Pekerjaan", "Pekerjaan", stats.pekerjaan)}>
              Sebaran Pekerjaan
            </SectionTitle>
            {pekerjaanData.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={pekerjaanData} layout="vertical" margin={{ left: 5, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Jumlah">
                    {pekerjaanData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── 12. KESEHATAN & KONDISI EKONOMI ────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <SectionTitle icon={<Heart className="w-4 h-4" />}>Kesehatan & Kondisi Ekonomi</SectionTitle>

          {/* Stat summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Ibu Hamil</p>
              <p className="text-lg font-bold text-red-600">{stats.totalIbuHamil}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Disabilitas</p>
              <p className="text-lg font-bold text-purple-600">{stats.totalDisabilitas}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Layak Bansos</p>
              <p className="text-lg font-bold text-amber-600">{stats.totalLayakBansos}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Kondisi Kesehatan */}
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Kondisi Kesehatan Warga</p>
              {Object.entries(stats.kondisiKesehatan).filter(([,v]) => v > 0).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(stats.kondisiKesehatan).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([label, value], i) => {
                    const max = Math.max(...Object.values(stats.kondisiKesehatan), 1);
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-muted-foreground truncate mr-2">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
            </div>

            {/* Kategori Ekonomi */}
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">
                Kategori Ekonomi KK
                <span className="ml-1 text-[10px] text-muted-foreground font-normal">({stats.kkEkonomiTerisi}/{stats.totalKk} KK terisi)</span>
              </p>
              {Object.entries(stats.kategoriEkonomi).filter(([,v]) => v > 0).length > 0 ? (
                <div className="space-y-1.5">
                  {["Sangat Miskin", "Miskin", "Hampir Miskin", "Tidak Miskin"].map((label, i) => {
                    const value = stats.kategoriEkonomi[label] || 0;
                    if (value === 0) return null;
                    const max = Math.max(...Object.values(stats.kategoriEkonomi), 1);
                    const colors = ["#b54560", "#d97730", "#b8923e", "#2d7a5f"];
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: colors[i] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Belum ada data</p>
                  <p className="text-[10px]">Warga dapat mengisi via halaman Profil</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 13. DATA RUMAH & FASILITAS ─────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <SectionTitle icon={<Home className="w-4 h-4" />} onDetailClick={() => openDetail("Detail Data Rumah", "Data Rumah & Fasilitas", { statusRumah: stats.statusRumah, listrik: stats.listrik, kondisiBangunan: stats.kondisiBangunan, sumberAir: stats.sumberAir, sanitasiWc: stats.sanitasiWc, bansos: stats.bansos })}>
            Data Rumah & Fasilitas
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { title: "Status Rumah", data: stats.statusRumah, type: "pie" as const },
              { title: "Listrik", data: stats.listrik, type: "pie" as const },
              { title: "Kondisi Bangunan", data: stats.kondisiBangunan, type: "bar" as const },
              { title: "Sumber Air", data: stats.sumberAir, type: "bar" as const },
              { title: "Sanitasi WC", data: stats.sanitasiWc, type: "bar" as const },
            ].map(item => (
              <div key={item.title}>
                <p className="text-xs font-medium mb-2 text-muted-foreground">{item.title}</p>
                {Object.entries(item.data).filter(([,v]) => v > 0).length > 0 ? (
                  item.type === "pie" ? (
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={Object.entries(item.data).filter(([,v]) => v > 0).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={20} outerRadius={45} paddingAngle={2}>
                          {Object.entries(item.data).filter(([,v]) => v > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="space-y-1.5">
                      {Object.entries(item.data).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]).map(([label, value], i) => {
                        const max = Math.max(...Object.values(item.data), 1);
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-[11px] mb-0.5">
                              <span className="text-muted-foreground truncate mr-2">{label}</span>
                              <span className="font-medium">{value}</span>
                            </div>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
              </div>
            ))}
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Penerima Bansos</p>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1"><HandCoins className="w-3 h-3 text-[#b8923e]" /> Penerima: {stats.bansos.penerima}</span>
                    <span className="flex items-center gap-1"><UserX className="w-3 h-3 text-muted-foreground" /> Bukan: {stats.bansos.bukan}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#b8923e] rounded-l-full" style={{ width: `${(stats.bansos.penerima + stats.bansos.bukan) > 0 ? (stats.bansos.penerima / (stats.bansos.penerima + stats.bansos.bukan)) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              {stats.jenisBansos && Object.keys(stats.jenisBansos).length > 0 && (
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
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── DETAIL DIALOGS ─────────────────────────────────────────────────── */}
      {detailDialog && (() => {
        const insightBadge = (level: "baik" | "perhatian" | "kritis", text: string) => {
          const cls = level === "baik" ? "bg-green-100 text-green-700" : level === "perhatian" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
          return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{text}</span>;
        };
        const insightBox = (icon: React.ReactNode, text: string, type: "info" | "warning" | "success" = "info") => {
          const cls = type === "warning" ? "bg-amber-50 border-amber-200" : type === "success" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200";
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
                  <div className="bg-red-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#b54560]">{stats.pengangguran.total} warga usia 18+ belum bekerja</p>
                      <p className="text-xs text-muted-foreground">{pct}% dari total {stats.totalWarga} warga</p>
                    </div>
                    {insightBadge(pct > 15 ? "kritis" : pct > 8 ? "perhatian" : "baik", pct > 15 ? "Tinggi" : pct > 8 ? "Sedang" : "Rendah")}
                  </div>
                  {topGroup && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `Kelompok usia ${topGroup[0]} paling banyak belum bekerja (${topGroup[1]} orang). Targetkan program pelatihan keterampilan.`, "warning")}
                  {topRt && insightBox(<Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />, `RT ${String(topRt[0]).padStart(2, "0")} paling banyak pengangguran (${topRt[1]} orang). Prioritaskan sosialisasi lowongan dan program berdaya.`, "info")}
                  <div>
                    <p className="text-xs font-semibold mb-2">Sebaran per Kelompok Usia</p>
                    {sorted.map(([group, count]) => {
                      const max = Math.max(...sorted.map(s => s[1]), 1);
                      return (
                        <div key={group} className="mb-1.5">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span>{group} tahun</span>
                            <span className="font-semibold">{count} org ({pctLabel(count, stats.pengangguran.total)}%)</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#b54560]" style={{ width: `${(count / max) * 100}%` }} />
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
                  <AiInsightButton section="Pengangguran" data={stats.pengangguran} />
                </>;
              })()}

              {detailDialog.section === "Angka Capaian" && (() => {
                const avg = Math.round(capaianItems.reduce((s, c) => s + c.pct, 0) / capaianItems.length);
                const lowest = [...capaianItems].sort((a, b) => a.pct - b.pct)[0];
                const highest = [...capaianItems].sort((a, b) => b.pct - a.pct)[0];
                return <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Rata-rata Capaian</p>
                      <p className="text-2xl font-bold">{avg}%</p>
                    </div>
                    {insightBadge(avg >= 70 ? "baik" : avg >= 40 ? "perhatian" : "kritis", avg >= 70 ? "Baik" : avg >= 40 ? "Perlu Ditingkatkan" : "Perlu Perhatian")}
                  </div>
                  {lowest && lowest.pct < 50 && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `"${lowest.label}" baru ${lowest.pct}% — capaian terendah, perlu jadi prioritas utama.`, "warning")}
                  {highest && insightBox(<Award className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />, `"${highest.label}" sudah ${highest.pct}% — pencapaian terbaik! ${highest.pct >= 80 ? "Pertahankan." : "Masih bisa ditingkatkan."}`, "success")}
                  <div>
                    <p className="text-xs font-semibold mb-2">Detail Semua Indikator</p>
                    {[...capaianItems].sort((a, b) => a.pct - b.pct).map(c => (
                      <div key={c.label} className="mb-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs">{c.label}</span>
                          <HealthBadge pct={c.pct} />
                        </div>
                        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: healthColor(healthLevel(c.pct)) }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.sublabel}</p>
                      </div>
                    ))}
                  </div>
                  <AiInsightButton section="Angka Capaian" data={stats.capaian} />
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
                    {insightBadge(d.bansos > avgBansos ? "perhatian" : "baik", d.bansos > avgBansos ? `Di atas rata-rata (${avgBansos})` : "Normal")}
                  </div>
                  {d.warga > avgWarga * 1.3 && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `RT ini ${Math.round(((d.warga - avgWarga) / avgWarga) * 100)}% lebih padat dari rata-rata. Alokasi layanan perlu lebih besar.`, "warning")}
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
                const topGender = Object.entries(genderData).sort((a, b) => b[1] - a[1])[0];
                return <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-blue-50 text-center">
                      <p className="text-lg font-bold text-[#3b6db5]">{usiaProduktif}</p>
                      <p className="text-[9px] text-muted-foreground">Usia Produktif</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 text-center">
                      <p className="text-lg font-bold text-[#b8923e]">{usia017 + usia65}</p>
                      <p className="text-[9px] text-muted-foreground">Tanggungan</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                      <p className="text-lg font-bold">{rasioKetergantungan}%</p>
                      <p className="text-[9px] text-muted-foreground">Rasio Ketergantungan</p>
                    </div>
                  </div>
                  {insightBox(<Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />, `Setiap 100 warga produktif menanggung ${rasioKetergantungan} warga non-produktif. ${rasioKetergantungan > 60 ? "Rasio cukup tinggi — perlu program bantuan." : "Rasio masih wajar."}`, rasioKetergantungan > 60 ? "warning" : "info")}
                  <div>
                    <p className="text-xs font-semibold mb-1.5">Jenis Kelamin</p>
                    <div className="flex-1 h-4 rounded-full overflow-hidden flex mb-1">
                      {Object.entries(genderData).map(([name, val], i) => (
                        <div key={name} className="h-full" style={{ width: `${pctLabel(val, totalG)}%`, backgroundColor: i === 0 ? "#3b6db5" : "#b54560" }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs">
                      {Object.entries(genderData).map(([name, val], i) => (
                        <span key={name} style={{ color: i === 0 ? "#3b6db5" : "#b54560" }} className="font-medium">{name}: {val} ({pctLabel(val, totalG)}%)</span>
                      ))}
                    </div>
                    {topGender && Math.abs(pctLabel(topGender[1], totalG) - 50) > 10 && insightBox(<AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />, `Rasio gender tidak seimbang — ${topGender[0]} mendominasi ${pctLabel(topGender[1], totalG)}%.`, "warning")}
                  </div>
                  <AiInsightButton section="Demografi" data={detailDialog.data} />
                </>;
              })()}

              {(detailDialog.section === "Keuangan" || detailDialog.section === "Layanan" || detailDialog.section === "Data Keluarga" || detailDialog.section === "Data Rumah & Fasilitas" || detailDialog.section === "Data per RT" || detailDialog.section === "Tren Bulanan" || detailDialog.section === "Pendidikan" || detailDialog.section === "Pekerjaan" || detailDialog.section === "Indeks Kemajuan") && (
                <>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground leading-relaxed">Data detail untuk bagian ini tersedia di halaman masing-masing. Gunakan tombol AI di bawah untuk mendapat rekomendasi.</p>
                  </div>
                  <AiInsightButton section={detailDialog.section} data={detailDialog.data} />
                </>
              )}
            </div>
          </DetailDialog>
        );
      })()}
    </div>
  );
}
