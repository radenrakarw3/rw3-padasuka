import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Filter, RefreshCw } from "lucide-react";
import { KependudukanAdminNav } from "@/components/admin/kependudukan-admin-nav";
import {
  BarBlock,
  MetricCard,
  PieBlock,
  SectionPanel,
  formatNumber,
  toPieData,
} from "@/components/admin/kependudukan-stats-ui";
import type { KependudukanStats, SectionStats, SegmentRow } from "@/components/admin/kependudukan-types";
import type { KependudukanLegacySummary, MonthlySnapshot } from "@/types/dashboard-stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rtOptions } from "@/lib/constants";
import { PENGANGGURAN_DEFINISI } from "@shared/kependudukan-analytics";
import { fetchPublicJson, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { useLocation } from "wouter";

function normalizeLegacy(raw: KependudukanLegacySummary | undefined): KependudukanLegacySummary | null {
  if (!raw) return null;
  return {
    ...raw,
    pengangguran: raw.pengangguran ?? { total: 0, perUsia: {}, daftarNama: [] },
    capaian: {
      waPercent: raw.capaian?.waPercent ?? 0,
      bansosPercent: raw.capaian?.bansosPercent ?? 0,
      literasiPercent: raw.capaian?.literasiPercent ?? 0,
      iloPercent: raw.capaian?.iloPercent ?? 0,
      crvsPercent: raw.capaian?.crvsPercent ?? 0,
      wgDetailPercent: raw.capaian?.wgDetailPercent ?? 0,
    },
    crvs: raw.crvs ?? { anak: 0, punyaAkta: 0, punyaKia: 0, punyaSalahSatu: 0 },
    peristiwa: raw.peristiwa ?? {
      aktif: 0,
      lahir: 0,
      pindahMasuk: 0,
      pindahKeluar: 0,
      meninggal: 0,
      domisiliAktif: raw.totalWarga ?? 0,
    },
    literasi: raw.literasi ?? {},
    statusPekerjaan: raw.statusPekerjaan ?? {},
    kelompokUsia: raw.kelompokUsia ?? {},
    bansos: raw.bansos ?? { penerima: 0, bukan: 0 },
    perRt: raw.perRt ?? [],
  };
}

function RtFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px] h-9">
        <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
        <SelectValue placeholder="RT" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="semua">Semua RT (01–04)</SelectItem>
        {rtOptions.map((rt) => (
          <SelectItem key={rt} value={String(rt)}>
            RT {String(rt).padStart(2, "0")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SegmentDialog({
  open,
  onOpenChange,
  section,
  field,
  value,
  rtFilter,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  section: string;
  field: string;
  value: string;
  rtFilter: string;
}) {
  const q = rtFilter === "semua" ? "" : `&rt=${rtFilter}`;
  const { data, isLoading } = useQuery({
    queryKey: ["/api/stats/segment", section, field, value, rtFilter],
    queryFn: async () => {
      const res = await fetch(
        `/api/stats/segment/${encodeURIComponent(section)}/${encodeURIComponent(field)}?value=${encodeURIComponent(value)}${q}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Gagal memuat daftar");
      return readJsonSafely<{ rows: SegmentRow[]; total: number }>(res);
    },
    enabled: open && !!field,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Daftar warga ({data?.total ?? 0})</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {isLoading && <Skeleton className="h-32 w-full" />}
          {!isLoading && (data?.rows?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada data</p>
          )}
          <ul className="space-y-2">
            {data?.rows?.map((r) => (
              <li key={r.wargaId} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{r.namaLengkap}</p>
                <p className="text-xs text-muted-foreground font-mono">{r.nik}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  RT {r.rt != null ? String(r.rt).padStart(2, "0") : "—"} · KK {r.nomorKk ?? "—"}
                  {r.fieldValue ? ` · ${r.fieldValue}` : ""}
                </p>
                <Link href={`/admin/kependudukan/kk/${r.kkId}`}>
                  <span className="text-xs text-primary underline mt-1 inline-block cursor-pointer">Lihat KK</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KependudukanRingkasan() {
  const [, setLocation] = useLocation();
  const [rtFilter, setRtFilter] = useState("semua");
  const [drill, setDrill] = useState<{ section: string; field: string; value: string } | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching, isPending } = useQuery<KependudukanStats>({
    queryKey: ["/api/stats/kependudukan", rtFilter],
    queryFn: async () => {
      const q = rtFilter === "semua" ? "" : `?rt=${encodeURIComponent(rtFilter)}`;
      return fetchPublicJson<KependudukanStats>(`/api/stats/kependudukan${q}`, undefined, 120_000);
    },
    staleTime: 60_000,
    retry: 1,
  });

  const { data: monthly } = useQuery<MonthlySnapshot[]>({
    queryKey: ["/api/stats/monthly"],
    queryFn: () => fetchPublicJson<MonthlySnapshot[]>("/api/stats/monthly", undefined, 60_000),
    staleTime: 120_000,
    retry: false,
  });

  const legacy = useMemo(() => normalizeLegacy(data?.legacy), [data?.legacy]);
  const pengangguranRate = useMemo(() => {
    if (!legacy?.totalWarga) return 0;
    return Math.round((legacy.pengangguran.total / legacy.totalWarga) * 100);
  }, [legacy]);

  const sectionByKey = useMemo(() => {
    const m = new Map<string, SectionStats>();
    (data?.sections ?? []).forEach((s) => m.set(s.key, s));
    return m;
  }, [data?.sections]);

  const openDrill = (section: string, field: string, value: string) => {
    setDrill({ section, field, value });
  };

  const showLoading = isPending || isLoading;

  return (
    <div>
      <KependudukanAdminNav
        title="Kependudukan RW"
        description="RT 01–04 — angka dari form Data Warga & Kartu Keluarga"
        actions={
          <>
            <RtFilter value={rtFilter} onChange={setRtFilter} />
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        }
      />

      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Gagal memuat ringkasan kependudukan</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{getApiErrorMessage(error)}</span>
            <span className="text-xs opacity-90">
              Pastikan server dev sudah di-restart setelah update. Endpoint:{" "}
              <code className="font-mono">/api/stats/kependudukan</code>
            </span>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => refetch()}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
          <p className="text-sm text-muted-foreground col-span-full">Menghitung statistik dari data warga & KK…</p>
        </div>
      )}

      {!showLoading && !isError && data && legacy && (
        <Tabs defaultValue="ringkasan" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            <TabsTrigger value="pokok">Data pokok</TabsTrigger>
            <TabsTrigger value="kontak">Kontak & aktivitas</TabsTrigger>
            <TabsTrigger value="tambahan">Tambahan</TabsTrigger>
            <TabsTrigger value="kk">KK</TabsTrigger>
            <TabsTrigger value="kualitas">Kualitas</TabsTrigger>
          </TabsList>

          <TabsContent value="ringkasan" className="space-y-6 mt-4">
            {data.totals.warga === 0 && (
              <Alert>
                <AlertTitle>Belum ada data warga</AlertTitle>
                <AlertDescription>
                  Tambah kartu keluarga dan data warga di tab Kartu Keluarga / Cari Warga agar ringkasan terisi.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <MetricCard
                title="Total warga"
                value={formatNumber(data.totals.warga)}
                description={`${formatNumber(legacy.peristiwa.domisiliAktif)} domisili aktif`}
              />
              <MetricCard
                title="Pindah keluar"
                value={formatNumber(legacy.peristiwa.pindahKeluar)}
                description="Termasuk data legacy «Pindah»"
                onClick={() => setLocation("/admin/kependudukan/peristiwa")}
              />
              <MetricCard
                title="Meninggal"
                value={formatNumber(legacy.peristiwa.meninggal)}
                description="Arsip — catat di tab Peristiwa"
                onClick={() => setLocation("/admin/kependudukan/peristiwa")}
              />
              <MetricCard
                title="Lahir / pindah masuk"
                value={formatNumber(legacy.peristiwa.lahir + legacy.peristiwa.pindahMasuk)}
                description="Menunggu verifikasi → Aktif"
                onClick={() => setLocation("/admin/kependudukan/peristiwa")}
              />
              <MetricCard
                title="Pengangguran (ILO)"
                value={formatNumber(legacy.pengangguran.total)}
                description={`${pengangguranRate}% dari warga · usia ≥18`}
                onClick={() => openDrill("derived", "pengangguran", "ya")}
              />
              <MetricCard
                title="Literasi terisi"
                value={`${legacy.capaian.literasiPercent}%`}
                description={`Usia ≥7 · ${formatNumber(legacy.crvs.anak)} anak di data`}
              />
              <MetricCard
                title="Status kerja (ILO)"
                value={`${legacy.capaian.iloPercent}%`}
                description="Usia ≥15 · form inti"
              />
              <MetricCard
                title="CRVS anak"
                value={`${legacy.capaian.crvsPercent}%`}
                description={`Akta/KIA · ${legacy.crvs.punyaSalahSatu}/${legacy.crvs.anak} anak <18`}
              />
              <MetricCard
                title="Penerima bansos (KK)"
                value={formatNumber(legacy.bansos.penerima)}
                description={`${legacy.capaian.bansosPercent}% KK`}
              />
              <MetricCard
                title="Layak bansos"
                value={formatNumber(legacy.totalLayakBansos)}
                description="KK ditandai layak"
              />
              <MetricCard
                title="Disabilitas"
                value={formatNumber(legacy.totalDisabilitas)}
                description="Warga dengan disabilitas"
              />
              <MetricCard
                title="Ibu hamil"
                value={formatNumber(legacy.totalIbuHamil)}
                description="Saat ini"
              />
              <MetricCard
                title="WA terdaftar"
                value={`${legacy.capaian.waPercent}%`}
                description="Kelengkapan kontak"
              />
              <MetricCard
                title="KK inkonsisten"
                value={formatNumber(data.kk.penghuniMismatch)}
                description="Jumlah penghuni ≠ anggota"
              />
            </div>

            <Card className="border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4 text-sm text-muted-foreground">
                <strong className="text-foreground">Definisi pengangguran:</strong> {PENGANGGURAN_DEFINISI}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pengangguran per kelompok usia</CardTitle>
                  <CardDescription>Definisi ILO — usia ≥18</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarBlock
                    data={Object.entries(legacy.pengangguran.perUsia).map(([label, count]) => ({ label, count }))}
                    empty="Tidak ada data"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Piramida usia</CardTitle>
                </CardHeader>
                <CardContent>
                  <PieBlock data={toPieData(legacy.kelompokUsia)} empty="Tidak ada data" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Literasi (UNESCO)</CardTitle>
                  <CardDescription>Populasi usia ≥7 tahun</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieBlock data={toPieData(legacy.literasi)} empty="Belum ada data" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status angkatan kerja (ILO)</CardTitle>
                  <CardDescription>Populasi usia ≥15 tahun</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieBlock data={toPieData(legacy.statusPekerjaan)} empty="Belum ada data" />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Perbandingan RT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">RT</th>
                        <th className="py-2 pr-4">KK</th>
                        <th className="py-2 pr-4">Warga</th>
                        <th className="py-2 pr-4">Bansos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legacy.perRt.map((r) => (
                        <tr key={r.rt} className="border-b border-border/50">
                          <td className="py-2 font-medium">RT {String(r.rt).padStart(2, "0")}</td>
                          <td className="py-2">{r.kk}</td>
                          <td className="py-2">{r.warga}</td>
                          <td className="py-2">{r.bansos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {monthly && monthly.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tren bulanan (snapshot)</CardTitle>
                  <CardDescription>Pengangguran & indeks kemajuan data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto text-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="text-muted-foreground border-b">
                          <th className="text-left py-2">Bulan</th>
                          <th className="text-right py-2">Warga</th>
                          <th className="text-right py-2">Pengangguran</th>
                          <th className="text-right py-2">Indeks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.slice(-6).map((m) => (
                          <tr key={m.month} className="border-b border-border/40">
                            <td className="py-1.5">{m.month}</td>
                            <td className="text-right">{m.totalWarga}</td>
                            <td className="text-right">{m.pengangguran}</td>
                            <td className="text-right">{m.indeksKemajuan}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {(["pokok", "kontak", "tambahan"] as const).map(
            (key) => {
              const section = sectionByKey.get(key);
              if (!section) return null;
              return (
                <TabsContent key={key} value={key}>
                  {key === "kontak" && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                      <MetricCard
                        title="Literasi"
                        value={`${legacy.capaian.literasiPercent}%`}
                        description="Usia ≥7 terisi"
                        onClick={() => openDrill("kontak", "literasi", "__empty__")}
                      />
                      <MetricCard
                        title="Angkatan kerja (ILO)"
                        value={`${legacy.capaian.iloPercent}%`}
                        description="Status kerja usia ≥15"
                        onClick={() => openDrill("kontak", "statusPekerjaan", "__empty__")}
                      />
                      <MetricCard
                        title="WG detail"
                        value={`${legacy.capaian.wgDetailPercent}%`}
                        description="Domain melihat & berjalan"
                      />
                      <MetricCard
                        title="Pengangguran"
                        value={formatNumber(legacy.pengangguran.total)}
                        description="Status Mencari/Belum kerja"
                        onClick={() => openDrill("derived", "pengangguran", "ya")}
                      />
                    </div>
                  )}
                  <SectionPanel section={section} onDrill={openDrill} />
                </TabsContent>
              );
            },
          )}

          <TabsContent value="kk" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Total KK" value={formatNumber(data.kk.totalKk)} description="Rumah tangga" />
              <MetricCard title="Penerima bansos" value={formatNumber(data.kk.penerimaBansos)} description="Tingkat KK" />
              <MetricCard title="Layak bansos" value={formatNumber(data.kk.layakBansos)} description="Flag layak" />
              <MetricCard title="Ekonomi terisi" value={formatNumber(data.kk.kkEkonomiTerisi)} description="Penghasilan bulanan diisi" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.kk.distributions?.map((d) => (
                <Card key={d.field} className="border-border/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{d.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PieBlock data={toPieData(d.buckets)} empty="Belum ada data" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="kualitas">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kelengkapan per bagian form</CardTitle>
                <CardDescription>Semakin tinggi, semakin bisa dipercaya untuk keputusan program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data.qualityBySection ?? [])
                  .slice()
                  .sort((a, b) => a.fillPercent - b.fillPercent)
                  .map((q) => (
                    <div key={q.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{q.title}</span>
                        <span className="font-mono">{q.fillPercent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[hsl(163,55%,32%)]"
                          style={{ width: `${q.fillPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!showLoading && !isError && data && !legacy && (
        <Alert className="mb-4">
          <AlertTitle>Format data tidak lengkap</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>Server mengembalikan respons tanpa ringkasan legacy. Restart server dev lalu klik Refresh.</span>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => refetch()}>
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!showLoading && !isError && !data && (
        <Alert>
          <AlertTitle>Data tidak tersedia</AlertTitle>
          <AlertDescription>Klik Refresh atau restart server dev lalu muat ulang halaman.</AlertDescription>
        </Alert>
      )}

      <SegmentDialog
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        section={drill?.section ?? ""}
        field={drill?.field ?? ""}
        value={drill?.value ?? ""}
        rtFilter={rtFilter}
      />
    </div>
  );
}
