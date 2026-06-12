import { useQuery } from "@tanstack/react-query";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { GovStatistic, GovStatisticRow, GovStatisticSection } from "@/components/gov/statistic";
import type { TransparansiPublik } from "@shared/program-kerja-analytics";
import { Skeleton } from "@/components/ui/skeleton";

function formatNumber(n: number) {
  return n.toLocaleString("id-ID");
}

export default function PublicTransparansi() {
  const { data, isLoading } = useQuery<TransparansiPublik>({
    queryKey: ["/api/public/transparansi"],
  });

  return (
    <PublicKioskLayout title="Transparansi Capaian" backHref="/program">
      <FeatureExplain title="Data transparansi untuk warga" className="mb-4">
        Ringkasan capaian program RW yang aman dipublikasikan — jumlah laporan, properti Visit RW3,
        penghuni aktif, dan kelengkapan data sensus. Data pribadi per keluarga tidak ditampilkan di
        halaman ini.
      </FeatureExplain>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : data ? (
        <GovStatisticSection title="Capaian wilayah">
          <GovStatisticRow>
            <GovStatistic label="Laporan selesai" value={`${data.laporanRateSelesai}%`} />
            <GovStatistic label="Total laporan" value={formatNumber(data.totalLaporan)} />
          </GovStatisticRow>
          <GovStatisticRow>
            <GovStatistic label="Properti terdaftar" value={formatNumber(data.propertiVisitRw3)} />
            <GovStatistic label="Penghuni aktif" value={formatNumber(data.penghuniAktif)} />
          </GovStatisticRow>
          <GovStatisticRow>
            <GovStatistic label="Kelengkapan sensus" value={`${data.sensusKelengkapan}%`} />
            <GovStatistic label="Total KK" value={formatNumber(data.totalKk)} />
          </GovStatisticRow>
          <GovStatisticRow>
            <GovStatistic label="Program berjalan" value={formatNumber(data.programBerjalan)} />
          </GovStatisticRow>
        </GovStatisticSection>
      ) : null}
    </PublicKioskLayout>
  );
}
