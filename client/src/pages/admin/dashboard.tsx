import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryFn } from "@/lib/queryClient";
import {
  Users, Home, ClipboardList, FileText, UserCheck, UserX, UserMinus,
  Phone, PhoneOff, CreditCard, ImageOff, HandCoins, UserCog, ScrollText,
  Wallet, TrendingUp, TrendingDown, Heart, GraduationCap, Baby, BookOpen,
  Briefcase, UsersRound
} from "lucide-react";

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
}

const COLORS = [
  "hsl(163,55%,22%)",
  "hsl(40,45%,50%)",
  "hsl(220,55%,35%)",
  "hsl(348,55%,38%)",
  "hsl(280,40%,45%)",
  "hsl(160,40%,45%)",
  "hsl(20,60%,50%)",
  "hsl(190,50%,40%)",
  "hsl(330,45%,50%)",
  "hsl(100,35%,40%)",
  "hsl(50,50%,45%)",
];

const STATUS_COLORS: Record<string, string> = {
  "pending": "hsl(40,45%,50%)",
  "diproses": "hsl(220,55%,35%)",
  "selesai": "hsl(163,55%,22%)",
  "ditolak": "hsl(348,55%,38%)",
  "disetujui": "hsl(163,55%,22%)",
  "approved": "hsl(163,55%,22%)",
  "rejected": "hsl(348,55%,38%)",
  "generated": "hsl(220,55%,35%)",
};

const STATUS_LABELS: Record<string, string> = {
  "pending": "Pending",
  "diproses": "Diproses",
  "selesai": "Selesai",
  "ditolak": "Ditolak",
  "disetujui": "Disetujui",
  "approved": "Disetujui",
  "rejected": "Ditolak",
  "generated": "Digenerate",
};

const AGE_LABELS: Record<string, string> = {
  "0-5": "Balita (0-5)",
  "6-17": "Anak & Remaja (6-17)",
  "18-25": "Muda (18-25)",
  "26-40": "Dewasa (26-40)",
  "41-55": "Paruh Baya (41-55)",
  "56-64": "Pra-Lansia (56-64)",
  "65+": "Lansia (65+)",
  "Tidak Diketahui": "Tidak Diketahui",
};

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function DonutChart({ data, size = 120 }: { data: Record<string, number>; size?: number }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return <p className="text-xs text-muted-foreground">Belum ada data</p>;

  let cumulative = 0;
  const segments = entries.map(([label, value], i) => {
    const start = cumulative;
    cumulative += (value / total) * 100;
    return { label, value, pct: (value / total) * 100, start, color: COLORS[i % COLORS.length] };
  });

  const gradient = segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(", ");

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-full relative"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradient})`,
        }}
        data-testid="chart-donut"
      >
        <div
          className="absolute rounded-full bg-card"
          style={{
            width: size * 0.55,
            height: size * 0.55,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{total}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-muted-foreground">{s.label} ({s.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBar({ data, maxVal, labelMap }: { data: Record<string, number>; maxVal?: number; labelMap?: Record<string, string> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const max = maxVal || Math.max(...entries.map(([, v]) => v), 1);
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">Belum ada data</p>;

  return (
    <div className="space-y-2">
      {entries.map(([label, value], i) => (
        <div key={label} data-testid={`bar-${label}`}>
          <div className="flex justify-between text-[11px] mb-0.5">
            <span className="text-muted-foreground truncate mr-2">{labelMap?.[label] || label}</span>
            <span className="font-medium flex-shrink-0">{value}</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(4, (value / max) * 100)}%`,
                backgroundColor: COLORS[i % COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
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
          const color = colorMap?.[label] || STATUS_COLORS[label] || "hsl(0,0%,60%)";
          return (
            <div
              key={label}
              className="h-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${STATUS_LABELS[label] || label}: ${value}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {entries.map(([label, value]) => {
          const color = colorMap?.[label] || STATUS_COLORS[label] || "hsl(0,0%,60%)";
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

function PairStat({ label1, val1, label2, val2, icon1, icon2, color1, color2 }: {
  label1: string; val1: number; label2: string; val2: number;
  icon1: React.ReactNode; icon2: React.ReactNode;
  color1: string; color2: string;
}) {
  const total = val1 + val2;
  const pct1 = total > 0 ? Math.round((val1 / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color1 }}>
            {icon1}
          </div>
          <div>
            <p className="text-lg font-bold">{val1}</p>
            <p className="text-[10px] text-muted-foreground">{label1}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color2 }}>
            {icon2}
          </div>
          <div>
            <p className="text-lg font-bold">{val2}</p>
            <p className="text-[10px] text-muted-foreground">{label2}</p>
          </div>
        </div>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
        <div className="h-full rounded-l-full transition-all" style={{ width: `${pct1}%`, backgroundColor: color1 }} />
        <div className="h-full rounded-r-full transition-all" style={{ width: `${100 - pct1}%`, backgroundColor: color2 }} />
      </div>
      <p className="text-[10px] text-center text-muted-foreground">{pct1}% {label1} / {100 - pct1}% {label2}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-[hsl(163,55%,22%)] flex items-center gap-2 mb-3" data-testid={`section-${String(children).toLowerCase().replace(/\s/g, '-')}`}>
      <div className="w-1 h-4 rounded-full bg-[hsl(163,55%,22%)]" />
      {children}
    </h3>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

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
    { label: "Kartu Keluarga", value: stats.totalKk, icon: Home, color: "bg-[hsl(163,55%,22%)]" },
    { label: "Total Warga", value: stats.totalWarga, icon: Users, color: "bg-[hsl(40,45%,50%)]" },
    { label: "Laporan Pending", value: stats.pendingLaporan, icon: ClipboardList, color: "bg-[hsl(348,55%,38%)]" },
    { label: "Surat Pending", value: stats.pendingSurat, icon: FileText, color: "bg-[hsl(220,55%,35%)]" },
    { label: "Edit Profil Pending", value: stats.pendingEditProfil || 0, icon: UserCog, color: "bg-[hsl(280,40%,45%)]" },
    { label: "Pengajuan Bansos", value: stats.pendingPengajuanBansos || 0, icon: HandCoins, color: "bg-[hsl(20,60%,50%)]" },
  ];

  const statusKepColors: Record<string, { color: string; icon: typeof UserCheck }> = {
    "Aktif": { color: "hsl(163,55%,22%)", icon: UserCheck },
    "Pindah": { color: "hsl(40,45%,50%)", icon: UserMinus },
    "Meninggal": { color: "hsl(348,55%,38%)", icon: UserX },
  };

  const pekerjaanData: Record<string, number> = {};
  for (const p of stats.pekerjaan) {
    pekerjaanData[p.name] = p.count;
  }

  const maxRtWarga = Math.max(...stats.perRt.map(r => r.warga), 1);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-dashboard-title">Dashboard RW 03 Padasuka</h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {summaryCards.map((s) => (
          <Card key={s.label} data-testid={`card-stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
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

      <Card>
        <CardContent className="p-3">
          <SectionTitle>Ringkasan Keuangan</SectionTitle>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-[hsl(163,55%,22%)] flex items-center justify-center mb-1.5">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs font-bold text-[hsl(163,55%,22%)]">{formatRupiah(stats.keuangan?.totalPemasukan || 0)}</p>
              <p className="text-[9px] text-muted-foreground">Pemasukan</p>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-[hsl(348,55%,38%)] flex items-center justify-center mb-1.5">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs font-bold text-[hsl(348,55%,38%)]">{formatRupiah(stats.keuangan?.totalPengeluaran || 0)}</p>
              <p className="text-[9px] text-muted-foreground">Pengeluaran</p>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-[hsl(220,55%,35%)] flex items-center justify-center mb-1.5">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <p className={`text-xs font-bold ${(stats.keuangan?.saldo || 0) >= 0 ? "text-[hsl(163,55%,22%)]" : "text-[hsl(348,55%,38%)]"}`}>{formatRupiah(stats.keuangan?.saldo || 0)}</p>
              <p className="text-[9px] text-muted-foreground">Saldo</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Heart className="w-4 h-4 text-[hsl(348,55%,38%)]" />
              <div>
                <p className="text-sm font-bold">{formatRupiah(stats.donasiSummary?.totalDonasiMasuk || 0)}</p>
                <p className="text-[9px] text-muted-foreground">Total Donasi Masuk</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Users className="w-4 h-4 text-[hsl(40,45%,50%)]" />
              <div>
                <p className="text-sm font-bold">{stats.donasiSummary?.totalDonatur || 0}</p>
                <p className="text-[9px] text-muted-foreground">Donatur Terkonfirmasi</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <HandCoins className="w-4 h-4 text-[hsl(163,55%,22%)]" />
              <div>
                <p className="text-sm font-bold">{stats.donasiSummary?.campaignAktif || 0}</p>
                <p className="text-[9px] text-muted-foreground">Campaign Aktif</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <FileText className="w-4 h-4 text-[hsl(220,55%,35%)]" />
              <div>
                <p className="text-sm font-bold">{stats.donasiSummary?.totalDonasiPending || 0}</p>
                <p className="text-[9px] text-muted-foreground">Donasi Pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle>Ringkasan Layanan</SectionTitle>
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
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[hsl(163,55%,22%)]">
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
          <SectionTitle>Status Kependudukan</SectionTitle>
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
          <SectionTitle>Demografi Warga</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Jenis Kelamin</p>
              <DonutChart data={stats.jenisKelamin} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Status Perkawinan</p>
              <DonutChart data={stats.statusPerkawinan} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Agama</p>
              <HorizontalBar data={stats.agama} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Kelompok Usia</p>
              <HorizontalBar data={stats.kelompokUsia} labelMap={AGE_LABELS} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle>Pendidikan</SectionTitle>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-[hsl(220,55%,35%)]" />
            <p className="text-xs text-muted-foreground">Tingkat pendidikan terakhir warga</p>
          </div>
          <HorizontalBar data={stats.pendidikan} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle>Pekerjaan</SectionTitle>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-[hsl(40,45%,50%)]" />
            <p className="text-xs text-muted-foreground">10 pekerjaan terbanyak</p>
          </div>
          <HorizontalBar data={pekerjaanData} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle>Data Keluarga</SectionTitle>
          <div className="space-y-5">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-2">
              <UsersRound className="w-5 h-5 text-[hsl(163,55%,22%)]" />
              <div>
                <p className="text-sm font-bold">{stats.avgPenghuni || 0} orang</p>
                <p className="text-[10px] text-muted-foreground">Rata-rata anggota per KK</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Kedudukan dalam Keluarga</p>
              <HorizontalBar data={stats.kedudukanKeluarga} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Kepemilikan WhatsApp</p>
                <PairStat
                  label1="Punya" val1={stats.waOwnership.punya}
                  label2="Belum" val2={stats.waOwnership.belum}
                  icon1={<Phone className="w-3.5 h-3.5 text-white" />}
                  icon2={<PhoneOff className="w-3.5 h-3.5 text-white" />}
                  color1="hsl(163,55%,22%)" color2="hsl(0,0%,60%)"
                />
              </div>
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Kepemilikan Foto KTP</p>
                <PairStat
                  label1="Punya" val1={stats.ktpOwnership.punya}
                  label2="Belum" val2={stats.ktpOwnership.belum}
                  icon1={<CreditCard className="w-3.5 h-3.5 text-white" />}
                  icon2={<ImageOff className="w-3.5 h-3.5 text-white" />}
                  color1="hsl(220,55%,35%)" color2="hsl(0,0%,60%)"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle>Data Rumah & Fasilitas</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Status Rumah</p>
              <DonutChart data={stats.statusRumah} size={100} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Listrik</p>
              <DonutChart data={stats.listrik} size={100} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Kondisi Bangunan</p>
              <HorizontalBar data={stats.kondisiBangunan} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Sumber Air</p>
              <HorizontalBar data={stats.sumberAir} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Sanitasi WC</p>
              <HorizontalBar data={stats.sanitasiWc} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Penerima Bansos</p>
              <PairStat
                label1="Penerima" val1={stats.bansos.penerima}
                label2="Bukan" val2={stats.bansos.bukan}
                icon1={<HandCoins className="w-3.5 h-3.5 text-white" />}
                icon2={<UserX className="w-3.5 h-3.5 text-white" />}
                color1="hsl(40,45%,50%)" color2="hsl(0,0%,60%)"
              />
            </div>
            {stats.jenisBansos && Object.keys(stats.jenisBansos).length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Jenis Bansos</p>
                <HorizontalBar data={stats.jenisBansos} />
              </div>
            )}
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Kepemilikan Foto KK</p>
              <PairStat
                label1="Punya" val1={stats.kkFotoOwnership.punya}
                label2="Belum" val2={stats.kkFotoOwnership.belum}
                icon1={<Home className="w-3.5 h-3.5 text-white" />}
                icon2={<ImageOff className="w-3.5 h-3.5 text-white" />}
                color1="hsl(163,55%,22%)" color2="hsl(0,0%,60%)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <SectionTitle>Data per RT</SectionTitle>
          <div className="space-y-3">
            {stats.perRt.map((r) => (
              <div key={r.rt} data-testid={`row-rt-${r.rt}`} className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-12 text-xs font-medium flex-shrink-0">RT {r.rt.toString().padStart(2, "0")}</span>
                  <div className="flex-1 bg-muted rounded-full h-7 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(5, (r.warga / maxRtWarga) * 100)}%`,
                        backgroundColor: "hsl(163,55%,22%)",
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                      {r.kk} KK · {r.warga} Warga · {r.bansos} Bansos
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-14">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(220,55%,35%)]" />
                    <span className="text-[9px] text-muted-foreground">L: {r.lakiLaki}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(348,55%,38%)]" />
                    <span className="text-[9px] text-muted-foreground">P: {r.perempuan}</span>
                  </div>
                  {r.warga > 0 && (
                    <span className="text-[9px] text-muted-foreground ml-1">
                      ({Math.round((r.lakiLaki / r.warga) * 100)}% / {Math.round((r.perempuan / r.warga) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
