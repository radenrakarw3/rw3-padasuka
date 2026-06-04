import { Megaphone, Headphones } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ServiceCard } from "@/components/gov/service-card";
import { Visitrw3VisaCard } from "@/components/gov/visitrw3-visa-card";
import { Rw3lawCard } from "@/components/gov/rw3law-card";

export default function PublicLanding() {
  return (
    <PublicKioskLayout variant="hero">
      <ServiceCard
        href="/lapor"
        icon={Megaphone}
        title="Laporkan masalah"
        description="Sampaikan keluhan atau laporan lingkungan RT"
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
      <Rw3lawCard />
    </PublicKioskLayout>
  );
}
