import { Megaphone, Headphones } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ServiceCard } from "@/components/gov/service-card";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { Visitrw3VisaCard } from "@/components/gov/visitrw3-visa-card";
import { Rw3bizCard } from "@/components/gov/rw3biz-card";
import { KarangtarunaCard } from "@/components/gov/karangtaruna-card";
import { Rw3lawCard } from "@/components/gov/rw3law-card";

export default function PublicLanding() {
  return (
    <PublicKioskLayout variant="hero">
      <FeatureExplain title="Pilih layanan sesuai kebutuhan" variant="glass">
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>Lapor warga</strong> — sampaikan keluhan lingkungan di wilayah RW.
          </li>
          <li>
            <strong>Hubungi ketua RT</strong> — konsultasi urusan warga per RT lewat WhatsApp.
          </li>
          <li>
            <strong>Visit RW3</strong> — izin tinggal (ngontrak / ngekost) di wilayah RW.
          </li>
          <li>
            <strong>RW3BIZ</strong> — izin berjualan / usaha di wilayah RW.
          </li>
          <li>
            <strong>Karang Taruna</strong> — daftar & ceritakan skill pemuda RW untuk difasilitasi.
          </li>
          <li>
            <strong>RW3LAW</strong> — baca peraturan resmi lingkungan yang wajib dipatuhi warga.
          </li>
        </ul>
      </FeatureExplain>
      <ServiceCard
        href="/lapor"
        icon={Megaphone}
        title="Lapor warga"
        description="Laporkan masalah lingkungan di wilayah RW"
        variant="solid"
      />
      <ServiceCard
        href="/pelayanan"
        icon={Headphones}
        title="Hubungi ketua RT"
        description="Konsultasi pelayanan warga per RT"
        variant="solid"
        iconClassName="bg-accent"
      />
      <Visitrw3VisaCard />
      <Rw3bizCard />
      <KarangtarunaCard />
      <Rw3lawCard />
    </PublicKioskLayout>
  );
}
