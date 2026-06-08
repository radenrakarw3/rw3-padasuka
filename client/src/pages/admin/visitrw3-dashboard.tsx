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
  BarBlock,
  ChartCard,
  DashboardSection,
  pairsToPie,
  PieBlock,
  rowsToPie,
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
  const keperluanPie = useMemo(() => toPieData(data?.pengajuan.byKeperluan ?? {}, visitrw3KeperluanLabels), [data?.pengajuan.byKeperluan]);
  const tipePie = useMemo(() => toPieData(data?.pengajuan.byTipe ?? {}, visitrw3TipeLabels), [data?.pengajuan.byTipe]);
  const bisnisWilayahPie = useMemo(() => {
    if (!data?.pengajuan) return [];
    return pairsToPie([
      { label: "Bisnis di wilayah RW3", value: data.pengajuan.bisnisDiRw3 },
      { label: "Bisnis luar wilayah", value: data.pengajuan.bisnisLuar },
    ]);
  }, [data?.pengajuan]);
  const setujuSyaratPie = useMemo(() => {
    if (!data?.pengajuan) return [];
    return pairsToPie([
      { label: "Setuju tata tertib", value: data.pengajuan.setujuTataTertib.ya },
      { label: "Belum setuju", value: data.pengajuan.setujuTataTertib.tidak },
    ]);
  }, [data?.pengajuan]);
  const nomorUnitPie = useMemo(() => {
    if (!data?.pengajuan) return [];
    return pairsToPie([
      { label: "Ada nomor unit", value: data.pengajuan.denganNomorUnit },
      { label: "Tanpa nomor unit", value: data.pengajuan.tanpaNomorUnit },
    ]);
  }, [data?.pengajuan]);
  const propertiTerkaitPie = useMemo(() => {
    if (!data?.pengajuan) return [];
    return pairsToPie([
      { label: "Terhubung properti", value: data.pengajuan.denganProperti },
      { label: "Tanpa properti (luar)", value: data.pengajuan.tanpaProperti },
    ]);
  }, [data?.pengajuan]);

  const anakPie = useMemo(() => {
    if (!data?.penghuni) return [];
    const { anak, dewasa } = data.penghuni.anakVsDewasa;
    return pairsToPie([
      { label: "Dewasa", value: dewasa },
      { label: "Anak", value: anak },
    ]);
  }, [data?.penghuni]);
  const jenisKelaminPie = useMemo(() => rowsToPie(data?.penghuni.byJenisKelamin ?? []), [data?.penghuni.byJenisKelamin]);
  const kendaraanPie = useMemo(() => {
    if (!data?.penghuni) return [];
    return pairsToPie([
      { label: "Punya kendaraan", value: data.penghuni.denganKendaraan },
      { label: "Tanpa kendaraan", value: data.penghuni.tanpaKendaraan },
    ]);
  }, [data?.penghuni]);
  const fotoKtpPie = useMemo(() => {
    if (!data?.penghuni) return [];
    return pairsToPie([
      { label: "Foto KTP terunggah", value: data.penghuni.withFotoKtp },
      { label: "Tanpa foto KTP", value: data.penghuni.withoutFotoKtp },
    ]);
  }, [data?.penghuni]);

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
  const izinPropertiPie = useMemo(() => rowsToPie(data?.properti.byIzinKombinasi ?? []), [data?.properti.byIzinKombinasi]);
  const pjPropertiPie = useMemo(() => {
    if (!data?.properti) return [];
    return pairsToPie([
      { label: "Ada PJ pengelola", value: data.properti.denganPenanggungJawab },
      { label: "Tanpa PJ", value: data.properti.tanpaPenanggungJawab },
    ]);
  }, [data?.properti]);
  const propertiSetujuSyaratPie = useMemo(() => {
    if (!data?.properti) return [];
    return pairsToPie([
      { label: "Setuju tata tertib", value: data.properti.setujuTataTertib.ya },
      { label: "Belum setuju", value: data.properti.setujuTataTertib.tidak },
    ]);
  }, [data?.properti]);

  const rtBar = useMemo(
    () => (data?.pengajuan.byRt ?? []).map((r) => ({ label: `RT ${String(r.rt).padStart(2, "0")}`, count: r.count })),
    [data?.pengajuan.byRt],
  );
  const propertiRtBar = useMemo(
    () => (data?.properti.byRt ?? []).map((r) => ({ label: `RT ${String(r.rt).padStart(2, "0")}`, count: r.count })),
    [data?.properti.byRt],
  );
  const propertiJenisBar = useMemo(
    () => (data?.properti.byJenisProperti ?? []).map((r) => ({ label: labelPropertiJenis(r.label), count: r.count })),
    [data?.properti.byJenisProperti],
  );
  const terminBar = useMemo(
    () => (data?.pengajuan.byTerminBulan ?? []).map((r) => ({ label: `${r.termin} bln`, count: r.count })),
    [data?.pengajuan.byTerminBulan],
  );
  const jumlahPenghuniBar = useMemo(
    () => data?.pengajuan.byJumlahPenghuni ?? [],
    [data?.pengajuan.byJumlahPenghuni],
  );
  const pekerjaanBar = useMemo(() => data?.penghuni.topPekerjaan ?? [], [data?.penghuni.topPekerjaan]);
  const keperluanTinggalBar = useMemo(() => data?.penghuni.byKeperluanTinggal ?? [], [data?.penghuni.byKeperluanTinggal]);
  const jenjangAnakBar = useMemo(() => data?.penghuni.byJenjangAnak ?? [], [data?.penghuni.byJenjangAnak]);
  const kelompokUsiaBar = useMemo(() => data?.penghuni.byKelompokUsia ?? [], [data?.penghuni.byKelompokUsia]);
  const jenisKendaraanBar = useMemo(() => data?.penghuni.byJenisKendaraan ?? [], [data?.penghuni.byJenisKendaraan]);
  const tempatKerjaBar = useMemo(() => data?.penghuni.topTempatKerja ?? [], [data?.penghuni.topTempatKerja]);
  const jenisUsahaBar = useMemo(() => data?.pengajuan.byJenisTempatUsaha ?? [], [data?.pengajuan.byJenisTempatUsaha]);
  const pintuTierBar = useMemo(() => data?.properti.byJumlahPintu ?? [], [data?.properti.byJumlahPintu]);
  const trenBar = useMemo(() => (data?.trenBulan ?? []).map((r) => ({ label: r.bulan, count: r.count })), [data?.trenBulan]);

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

          <DashboardSection title="Form pengajuan" description="Keperluan, lokasi, bayar, bisnis, dan persetujuan syarat" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ChartCard title="Status pengajuan" description="menunggu_survey · disetujui · ditolak">
              <PieBlock data={statusPie} empty="Belum ada pengajuan" />
            </ChartCard>
            <ChartCard title="Keperluan" description="Field keperluanPengajuan">
              <PieBlock data={keperluanPie} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Tipe pengajuan" description="pengajuan_baru · perpanjang">
              <PieBlock data={tipePie} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Bisnis: wilayah RW3" description="tinggalDiWilayahRw3 pada pengajuan bisnis">
              <PieBlock data={bisnisWilayahPie} empty="Belum ada pengajuan bisnis" />
            </ChartCard>
            <ChartCard title="Setuju tata tertib" description="Checkbox setujuTataTertib">
              <PieBlock data={setujuSyaratPie} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Nomor unit/kamar" description="Field nomorUnit">
              <PieBlock data={nomorUnitPie} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Terhubung properti" description="pemilikKostId — kost terpilih vs bisnis luar">
              <PieBlock data={propertiTerkaitPie} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Pengajuan per RT" description="Field rt">
              <BarBlock data={rtBar} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Termin pembayaran" description="terminBulan (1/3/6/12)">
              <BarBlock data={terminBar} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Jumlah penghuni per pengajuan" description="Field jumlahPenghuni">
              <BarBlock data={jumlahPenghuniBar} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Tren pengajuan masuk" description="Berdasarkan created_at">
              <BarBlock data={trenBar} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Jenis tempat usaha" description="jenisTempatUsaha / bisnis">
              <BarBlock data={jenisUsahaBar} empty="Belum ada pengajuan bisnis" />
            </ChartCard>
          </div>

          <DashboardSection title="Form penghuni" description="Data per orang pada pengajuan tinggal / bisnis di wilayah" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ChartCard title="Anak vs dewasa" description="Checkbox isAnak">
              <PieBlock data={anakPie} empty="Belum ada data penghuni" />
            </ChartCard>
            <ChartCard title="Jenis kelamin" description="Field jenisKelamin">
              <PieBlock data={jenisKelaminPie} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Kelompok usia" description="Dihitung dari tanggalLahir">
              <BarBlock data={kelompokUsiaBar} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Keperluan tinggal" description="Kerja · Kuliah · Usaha · Lainnya">
              <BarBlock data={keperluanTinggalBar} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Jenjang anak" description="Field namaSekolah (anak)">
              <BarBlock data={jenjangAnakBar} empty="Belum ada data anak" />
            </ChartCard>
            <ChartCard title="Pekerjaan" description="Field pekerjaan (dewasa)">
              <BarBlock data={pekerjaanBar} empty="Belum ada data" vertical height={260} />
            </ChartCard>
            <ChartCard title="Kendaraan" description="Checkbox punyaKendaraan">
              <PieBlock data={kendaraanPie} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Jenis kendaraan" description="jenisKendaraan + platNomor">
              <BarBlock data={jenisKendaraanBar} empty="Belum ada kendaraan" />
            </ChartCard>
            <ChartCard title="Upload foto KTP" description="Field fotoKtpPath">
              <PieBlock data={fotoKtpPie} empty="Belum ada data" />
            </ChartCard>
            <ChartCard title="Nama tempat kerja" description="namaTempatKerja (dewasa)">
              <BarBlock data={tempatKerjaBar} empty="Belum ada data" vertical height={240} />
            </ChartCard>
          </div>

          <DashboardSection title="Form daftar properti" description="Kost, kontrakan, kiosk, lapak — pemilik & izin" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ChartCard title="Status properti" description="aktif · menunggu_verifikasi">
              <PieBlock data={propertiStatusPie} empty="Belum ada properti" />
            </ChartCard>
            <ChartCard title="Jenis properti" description="jenisProperti">
              <BarBlock data={propertiJenisBar} empty="Belum ada properti" />
            </ChartCard>
            <ChartCard title="Properti per RT" description="Field rt">
              <BarBlock data={propertiRtBar} empty="Belum ada properti" />
            </ChartCard>
            <ChartCard title="Ukuran properti (pintu)" description="jumlahPintu → tier kecil/sedang/besar">
              <BarBlock data={pintuTierBar} empty="Belum ada properti" />
            </ChartCard>
            <ChartCard title="Izin yang dibuka" description="izinTinggal · izinBisnis">
              <PieBlock data={izinPropertiPie} empty="Belum ada properti" />
            </ChartCard>
            <ChartCard title="Penanggung jawab pengelola" description="namaPenanggungJawab">
              <PieBlock data={pjPropertiPie} empty="Belum ada properti" />
            </ChartCard>
            <ChartCard title="Setuju tata tertib (properti)" description="Checkbox saat daftar properti">
              <PieBlock data={propertiSetujuSyaratPie} empty="Belum ada properti" />
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
