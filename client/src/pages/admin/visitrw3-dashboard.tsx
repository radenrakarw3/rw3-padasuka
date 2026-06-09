import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2,
  ClipboardList,
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import { Visitrw3AdminShell, Visitrw3Panel, Visitrw3StatCard } from "@/components/admin/visitrw3-admin-ui";
import {
  AreaTrendBlock,
  BarBlock,
  ChartCard,
  DashboardSection,
  DonutBlock,
  FunnelBlock,
  HistogramBlock,
  CHART_GOLD,
  MetricRingBlock,
  PIE_COLORS,
  pairsToPie,
  RadialBarBlock,
  RankedBarBlock,
  rowsToPie,
  StackedPercentBlock,
  StatChips,
  toPieData,
} from "@/components/admin/visitrw3-dashboard-charts";
import { formatRupiah } from "@/lib/visitrw3-kontribusi";
import { rtOptions } from "@/lib/constants";
import { getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import {
  type Visitrw3DashboardStats,
  normalizeVisitrw3DashboardStats,
  visitrw3JenisPropertiLabels,
  visitrw3KeperluanLabels,
  visitrw3PropertiStatusLabels,
  visitrw3StatusLabels,
  visitrw3TipeLabels,
} from "@shared/visitrw3-analytics";

const DEFAULT_RT_LIST = [...rtOptions];

function formatNumber(n: number) {
  return n.toLocaleString("id-ID");
}

function labelPropertiJenis(label: string) {
  return visitrw3JenisPropertiLabels[label] ?? label;
}

export default function AdminVisitrw3Dashboard() {
  const [rtFilter, setRtFilter] = useState("semua");

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Visitrw3DashboardStats>({
    queryKey: ["/api/admin/visitrw3/dashboard-stats", rtFilter],
    queryFn: async () => {
      const q = rtFilter === "semua" ? "" : `?rt=${encodeURIComponent(rtFilter)}`;
      const res = await fetch(`/api/admin/visitrw3/dashboard-stats${q}`, { credentials: "include" });
      if (!res.ok) {
        let msg = "Gagal memuat statistik Visit RW3";
        try {
          const body = await readJsonSafely<{ message?: string }>(res);
          if (body?.message) msg = body.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const raw = await readJsonSafely<Partial<Visitrw3DashboardStats>>(res);
      return normalizeVisitrw3DashboardStats(raw);
    },
    retry: 1,
    staleTime: 60_000,
  });

  const statusPie = useMemo(() => toPieData(data?.pengajuan.byStatus ?? {}, visitrw3StatusLabels), [data?.pengajuan.byStatus]);
  const funnelPengajuan = useMemo(() => {
    if (!data?.ringkasan) return [];
    return [
      { label: "Total masuk", value: data.ringkasan.totalPengajuan, fill: PIE_COLORS[0] },
      { label: "Menunggu survey", value: data.ringkasan.menungguSurvey, fill: PIE_COLORS[2] },
      { label: "Disetujui", value: data.ringkasan.disetujui, fill: PIE_COLORS[1] },
      { label: "Ditolak", value: data.ringkasan.ditolak, fill: PIE_COLORS[3] },
    ];
  }, [data?.ringkasan]);

  const keperluanSegments = useMemo(() => {
    if (!data?.pengajuan) return [];
    return toPieData(data.pengajuan.byKeperluan ?? {}, visitrw3KeperluanLabels);
  }, [data?.pengajuan]);

  const bisnisWilayahSegments = useMemo(() => {
    if (!data?.pengajuan) return [];
    return pairsToPie([
      { label: "Bisnis di wilayah RW3", value: data.pengajuan.bisnisDiRw3 },
      { label: "Bisnis luar wilayah", value: data.pengajuan.bisnisLuar },
    ]);
  }, [data?.pengajuan]);

  const propertiTerkaitSegments = useMemo(() => {
    if (!data?.pengajuan) return [];
    return pairsToPie([
      { label: "Terhubung properti", value: data.pengajuan.denganProperti },
      { label: "Tanpa properti (luar)", value: data.pengajuan.tanpaProperti },
    ]);
  }, [data?.pengajuan]);

  const anakSegments = useMemo(() => {
    if (!data?.penghuni) return [];
    const { anak, dewasa } = data.penghuni.anakVsDewasa;
    return pairsToPie([
      { label: "Dewasa", value: dewasa },
      { label: "Anak", value: anak },
    ]);
  }, [data?.penghuni]);

  const jenisKelaminRadial = useMemo(() => rowsToPie(data?.penghuni.byJenisKelamin ?? []), [data?.penghuni.byJenisKelamin]);
  const terminRadial = useMemo(
    () =>
      rowsToPie(
        (data?.pengajuan.byTerminBulan ?? []).map((r) => ({
          label: `${r.termin} bulan`,
          count: r.count,
        })),
      ),
    [data?.pengajuan.byTerminBulan],
  );
  const tipeRadial = useMemo(() => toPieData(data?.pengajuan.byTipe ?? {}, visitrw3TipeLabels), [data?.pengajuan.byTipe]);

  const kendaraanSegments = useMemo(() => {
    if (!data?.penghuni) return [];
    return pairsToPie([
      { label: "Punya kendaraan", value: data.penghuni.denganKendaraan },
      { label: "Tanpa kendaraan", value: data.penghuni.tanpaKendaraan },
    ]);
  }, [data?.penghuni]);

  const setujuSyaratPct = useMemo(() => {
    if (!data?.pengajuan) return null;
    const { ya, tidak } = data.pengajuan.setujuTataTertib;
    const total = ya + tidak;
    return total > 0 ? (ya / total) * 100 : null;
  }, [data?.pengajuan]);

  const fotoKtpPct = useMemo(() => {
    if (!data?.penghuni) return null;
    const total = data.penghuni.withFotoKtp + data.penghuni.withoutFotoKtp;
    return total > 0 ? (data.penghuni.withFotoKtp / total) * 100 : null;
  }, [data?.penghuni]);

  const approvalRatePct = useMemo(() => {
    if (!data?.ringkasan) return null;
    const { disetujui, ditolak } = data.ringkasan;
    const decided = disetujui + ditolak;
    return decided > 0 ? (disetujui / decided) * 100 : null;
  }, [data?.ringkasan]);

  const pjPropertiPct = useMemo(() => {
    if (!data?.properti) return null;
    const total = data.properti.denganPenanggungJawab + data.properti.tanpaPenanggungJawab;
    return total > 0 ? (data.properti.denganPenanggungJawab / total) * 100 : null;
  }, [data?.properti]);

  const propertiStatusPie = useMemo(
    () =>
      rowsToPie(
        (data?.properti.byStatusProperti ?? []).map((r) => ({
          label: visitrw3PropertiStatusLabels[r.label] ?? r.label,
          count: r.count,
        })),
      ),
    [data?.properti.byStatusProperti],
  );
  const izinPropertiDonut = useMemo(() => rowsToPie(data?.properti.byIzinKombinasi ?? []), [data?.properti.byIzinKombinasi]);
  const propertiJenisRadial = useMemo(
    () =>
      rowsToPie(
        (data?.properti.byJenisProperti ?? []).map((r) => ({
          label: labelPropertiJenis(r.label),
          count: r.count,
        })),
      ),
    [data?.properti.byJenisProperti],
  );

  const rtBar = useMemo(
    () => (data?.pengajuan.byRt ?? []).map((r) => ({ label: `RT ${String(r.rt).padStart(2, "0")}`, count: r.count })),
    [data?.pengajuan.byRt],
  );
  const propertiRtBar = useMemo(
    () => (data?.properti.byRt ?? []).map((r) => ({ label: `RT ${String(r.rt).padStart(2, "0")}`, count: r.count })),
    [data?.properti.byRt],
  );
  const jumlahPenghuniRanked = useMemo(() => data?.pengajuan.byJumlahPenghuni ?? [], [data?.pengajuan.byJumlahPenghuni]);
  const pekerjaanRanked = useMemo(() => data?.penghuni.topPekerjaan ?? [], [data?.penghuni.topPekerjaan]);
  const keperluanTinggalRanked = useMemo(() => data?.penghuni.byKeperluanTinggal ?? [], [data?.penghuni.byKeperluanTinggal]);
  const jenjangAnakRanked = useMemo(() => data?.penghuni.byJenjangAnak ?? [], [data?.penghuni.byJenjangAnak]);
  const kelompokUsiaHist = useMemo(() => data?.penghuni.byKelompokUsia ?? [], [data?.penghuni.byKelompokUsia]);
  const jenisKendaraanRanked = useMemo(() => data?.penghuni.byJenisKendaraan ?? [], [data?.penghuni.byJenisKendaraan]);
  const tempatKerjaRanked = useMemo(() => data?.penghuni.topTempatKerja ?? [], [data?.penghuni.topTempatKerja]);
  const jenisUsahaRanked = useMemo(() => data?.pengajuan.byJenisTempatUsaha ?? [], [data?.pengajuan.byJenisTempatUsaha]);
  const pintuTierBar = useMemo(() => data?.properti.byJumlahPintu ?? [], [data?.properti.byJumlahPintu]);
  const trenArea = useMemo(() => (data?.trenBulan ?? []).map((r) => ({ label: r.bulan, count: r.count })), [data?.trenBulan]);

  const pengajuanBaru = data?.pengajuan.byTipe?.pengajuan_baru ?? 0;
  const pengajuanPerpanjang = data?.pengajuan.byTipe?.perpanjang ?? 0;
  const rtList = data?.rtList?.length ? data.rtList : DEFAULT_RT_LIST;
  const selectedRtLabel = rtFilter === "semua" ? "Semua RT" : `RT ${rtFilter}`;

  return (
    <Visitrw3AdminShell className="space-y-6">
      <Visitrw3AdminNav
        title="Dashboard Visit RW3"
        description={`Ringkasan semua isian form pengajuan, properti, dan penghuni — ${selectedRtLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={rtFilter} onValueChange={setRtFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua RT</SelectItem>
                {rtList.map((rt) => (
                  <SelectItem key={rt} value={String(rt)}>
                    RT {String(rt).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Memuat…</span>}
          </div>
        }
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat dashboard</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{getApiErrorMessage(error)}</span>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => refetch()}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data && !isError ? (
        <>
          {data.ringkasan.totalPengajuan === 0 && data.ringkasan.totalProperti === 0 && (
            <Alert>
              <AlertTitle>Belum ada data Visit RW3</AlertTitle>
              <AlertDescription>
                Statistik akan terisi otomatis dari form publik (pengajuan, daftar properti) dan data penghuni pada
                setiap pengajuan.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-sm shadow-sm">
              Pengajuan baru: <strong>{formatNumber(pengajuanBaru)}</strong>
            </span>
            <span className="rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-sm shadow-sm">
              Perpanjang: <strong>{formatNumber(pengajuanPerpanjang)}</strong>
            </span>
            <span className="rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-sm shadow-sm">
              Catatan pemohon: <strong>{formatNumber(data.pengajuan.denganCatatanPemohon)}</strong>
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Visitrw3StatCard title="Menunggu survey" value={formatNumber(data.ringkasan.menungguSurvey)} description="Belum diproses admin" icon={Clock} tone="warning" />
            <Visitrw3StatCard title="Disetujui" value={formatNumber(data.ringkasan.disetujui)} description={`Dari ${formatNumber(data.ringkasan.totalPengajuan)} pengajuan`} icon={CheckCircle2} tone="success" />
            <Visitrw3StatCard title="Properti" value={formatNumber(data.ringkasan.totalProperti)} description={data.ringkasan.propertiMenunggu > 0 ? `${data.ringkasan.propertiMenunggu} menunggu verifikasi` : "Terdaftar"} icon={Building2} />
            <Visitrw3StatCard title="Penghuni aktif" value={formatNumber(data.ringkasan.penghuniAktif)} description="Kontrak aktif (warga_singgah)" icon={Users} />
            <Visitrw3StatCard title="Kontribusi Kas RW" value={formatRupiah(data.ringkasan.totalKontribusiKasRw)} description="Setelah survey & persetujuan" icon={Wallet} tone="gold" />
            <Visitrw3StatCard title="Baris form penghuni" value={formatNumber(data.penghuni.totalBaris)} description="Isian penghuni pada pengajuan" icon={ClipboardList} />
          </div>

          <DashboardSection title="Form pengajuan" description="Alur, tren waktu, distribusi RT, dan komposisi keperluan" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ChartCard title="Alur pengajuan" description="Corong dari masuk hingga keputusan admin">
              <FunnelBlock stages={funnelPengajuan} empty="Belum ada pengajuan" />
            </ChartCard>
            <ChartCard title="Tren pengajuan masuk" description="Area chart — 12 bulan terakhir (created_at)">
              <AreaTrendBlock data={trenArea} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Status pengajuan" description="Donut — menunggu · disetujui · ditolak">
              <DonutBlock data={statusPie} empty="Belum ada pengajuan" centerLabel="pengajuan" />
            </ChartCard>
            <ChartCard title="Tingkat disetujui" description="Persentase disetujui dari yang sudah diputuskan">
              <MetricRingBlock
                percent={approvalRatePct}
                label="Tingkat persetujuan"
                detail={
                  data.ringkasan.disetujui + data.ringkasan.ditolak > 0
                    ? `${data.ringkasan.disetujui} disetujui · ${data.ringkasan.ditolak} ditolak`
                    : undefined
                }
                empty="Belum ada keputusan admin"
                color={PIE_COLORS[1]}
              />
            </ChartCard>
            <ChartCard title="Keperluan pengajuan" description="Bar 100% — tinggal vs bisnis">
              <StackedPercentBlock segments={keperluanSegments} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Tipe pengajuan" description="Radial — pengajuan baru vs perpanjang">
              <RadialBarBlock data={tipeRadial} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Termin pembayaran" description="Radial — 1 / 3 / 6 / 12 bulan">
              <RadialBarBlock data={terminRadial} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Pengajuan per RT" description="Batang — sebaran wilayah">
              <BarBlock data={rtBar} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Bisnis: wilayah RW3" description="Bar 100% — di dalam vs luar wilayah">
              <StackedPercentBlock segments={bisnisWilayahSegments} empty="Belum ada pengajuan bisnis" />
            </ChartCard>
            <ChartCard title="Terhubung properti" description="Bar 100% — kost terpilih vs bisnis luar">
              <StackedPercentBlock segments={propertiTerkaitSegments} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Setuju tata tertib" description="Ring KPI — persetujuan syarat form">
              <MetricRingBlock
                percent={setujuSyaratPct}
                label="Persetujuan syarat"
                detail={`${data.pengajuan.setujuTataTertib.ya} setuju · ${data.pengajuan.setujuTataTertib.tidak} belum`}
                empty="Belum ada data"
              />
            </ChartCard>
            <ChartCard title="Jenis tempat usaha" description="Peringkat — lapak · kiosk · lainnya">
              <RankedBarBlock data={jenisUsahaRanked} empty="Belum ada pengajuan bisnis" />
            </ChartCard>
            <ChartCard title="Jumlah penghuni / pengajuan" description="Peringkat — ukuran rombongan">
              <RankedBarBlock data={jumlahPenghuniRanked} empty="Belum ada data" />
            </ChartCard>
          </div>

          <DashboardSection title="Form penghuni" description="Demografi, pekerjaan, kendaraan, dan kelengkapan dokumen" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ChartCard title="Anak vs dewasa" description="Bar 100% — komposisi penghuni form">
              <StackedPercentBlock segments={anakSegments} empty="Belum ada data penghuni" />
            </ChartCard>
            <ChartCard title="Jenis kelamin" description="Radial — distribusi gender">
              <RadialBarBlock data={jenisKelaminRadial} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Kelompok usia" description="Histogram — dari tanggal lahir">
              <HistogramBlock data={kelompokUsiaHist} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Keperluan tinggal" description="Peringkat — kerja · kuliah · usaha">
              <RankedBarBlock data={keperluanTinggalRanked} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Pekerjaan" description="Peringkat — top pekerjaan dewasa">
              <RankedBarBlock data={pekerjaanRanked} empty="Belum ada data" maxItems={8} />
            </ChartCard>
            <ChartCard title="Jenjang anak" description="Peringkat — jenjang pendidikan anak">
              <RankedBarBlock data={jenjangAnakRanked} empty="Belum ada data anak" />
            </ChartCard>
            <ChartCard title="Kendaraan" description="Bar 100% — punya vs tidak">
              <StackedPercentBlock segments={kendaraanSegments} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Jenis kendaraan" description="Peringkat — motor · mobil · lainnya">
              <RankedBarBlock data={jenisKendaraanRanked} empty="Belum ada kendaraan" />
            </ChartCard>
            <ChartCard title="Kelengkapan foto KTP" description="Ring KPI — upload dokumen">
              <MetricRingBlock
                percent={fotoKtpPct}
                label="Foto KTP terunggah"
                detail={`${data.penghuni.withFotoKtp} lengkap · ${data.penghuni.withoutFotoKtp} belum`}
                empty="Belum ada data"
                color={PIE_COLORS[4]}
              />
            </ChartCard>
            <ChartCard title="Nama tempat kerja" description="Peringkat — lokasi kerja penghuni">
              <RankedBarBlock data={tempatKerjaRanked} empty="Belum ada data" maxItems={6} />
            </ChartCard>
          </div>

          <DashboardSection title="Form daftar properti" description="Jenis, lokasi RT, ukuran, dan izin pengajuan" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ChartCard title="Status properti" description="Donut — aktif · menunggu verifikasi">
              <DonutBlock data={propertiStatusPie} empty="Belum ada properti" centerLabel="properti" />
            </ChartCard>
            <ChartCard title="Jenis properti" description="Radial — kost · kontrakan · kiosk · lapak">
              <RadialBarBlock data={propertiJenisRadial} empty="Belum ada properti" />
            </ChartCard>
            <ChartCard title="Properti per RT" description="Batang — sebaran lokasi">
              <BarBlock data={propertiRtBar} empty="Belum ada properti" color={CHART_GOLD} />
            </ChartCard>
            <ChartCard title="Ukuran properti (pintu)" description="Batang — tier kecil / sedang / besar">
              <BarBlock data={pintuTierBar} empty="Belum ada properti" />
            </ChartCard>
            <ChartCard title="Izin yang dibuka" description="Donut — kombinasi izin tinggal & bisnis">
              <DonutBlock data={izinPropertiDonut} empty="Belum ada properti" centerLabel="izin" />
            </ChartCard>
            <ChartCard title="Penanggung jawab pengelola" description="Ring KPI — kelengkapan data PJ">
              <MetricRingBlock
                percent={pjPropertiPct}
                label="Properti ada PJ"
                detail={`${data.properti.denganPenanggungJawab} lengkap · ${data.properti.tanpaPenanggungJawab} belum`}
                empty="Belum ada properti"
                color={CHART_GOLD}
              />
            </ChartCard>
          </div>

          <Visitrw3Panel
            title="Ringkasan izin properti"
            description="Jumlah properti yang mengizinkan tiap jenis pengajuan"
          >
            <StatChips
              items={[
                { label: "Izin tinggal", value: formatNumber(data.properti.izinTinggal) },
                { label: "Izin bisnis", value: formatNumber(data.properti.izinBisnis) },
                { label: "Bisnis di RW3", value: formatNumber(data.pengajuan.bisnisDiRw3) },
                { label: "Bisnis luar", value: formatNumber(data.pengajuan.bisnisLuar) },
                { label: "Catatan pemohon properti", value: formatNumber(data.properti.denganCatatanPemohon) },
              ]}
            />
          </Visitrw3Panel>

          <Visitrw3Panel
            title="Pengajuan terbaru"
            description="5 entri terakhir dari form publik"
            actions={
              <Link href="/admin/visitrw3/antrian">
                <Button variant="outline" size="sm">Buka antrian</Button>
              </Link>
            }
          >
            {data.pengajuanTerbaru.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pengajuan</p>
            ) : (
              <div className="space-y-2">
                {data.pengajuanTerbaru.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-mono font-semibold text-[hsl(163,55%,22%)]">{p.nomorVisitrw3}</p>
                      <p className="text-xs text-muted-foreground">
                        RT {String(p.rt).padStart(2, "0")} · {visitrw3KeperluanLabels[p.keperluanPengajuan] ?? p.keperluanPengajuan}
                      </p>
                    </div>
                    <Badge variant={p.status === "menunggu_survey" ? "secondary" : "outline"}>
                      {visitrw3StatusLabels[p.status] ?? p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Visitrw3Panel>

          <p className="text-xs text-muted-foreground">
            Statistik penghuni diambil dari tabel visitrw3_penghuni (semua pengajuan). Penghuni aktif hanya yang sudah
            disetujui dan tercatat di warga_singgah. Field bisnis seperti jam operasional, alamat usaha, dan persetujuan
            tetangga tidak diagregasi numerik karena bersifat teks/unik per pengajuan — lihat detail di antrian.
          </p>
        </>
      ) : (
        !isLoading &&
        !isError && (
          <Visitrw3Panel>
            <p className="py-4 text-center text-sm text-muted-foreground">
              Data dashboard tidak tersedia.{" "}
              <button type="button" className="underline text-primary" onClick={() => refetch()}>
                Muat ulang
              </button>
            </p>
          </Visitrw3Panel>
        )
      )}
    </Visitrw3AdminShell>
  );
}
