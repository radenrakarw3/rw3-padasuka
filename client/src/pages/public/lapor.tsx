import { Megaphone } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";

export default function PublicLaporHub() {
  return (
    <PublicKioskLayout title="Lapor warga" backHref="/">
      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle="Laporkan masalah"
          explain={
            <>
              Untuk keluhan sehari-hari di lingkungan RW: keamanan, kebersihan, infrastruktur rusak,
              ketertiban, dan lainnya. Setelah dikirim, pengurus RW meninjau laporan dan dapat
              menghubungi Anda lewat WhatsApp. Simpan nomor referensi untuk cek status.
            </>
          }
          href="/lapor/masalah"
          icon={Megaphone}
          title="Laporkan masalah"
          description="Keluhan lingkungan, keamanan, kebersihan, infrastruktur"
          variant="solid"
        />
      </div>
    </PublicKioskLayout>
  );
}
