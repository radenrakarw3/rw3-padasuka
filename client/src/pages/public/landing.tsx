import { Megaphone, Headphones, Target } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ServiceCard } from "@/components/gov/service-card";
import { Visitrw3VisaCard } from "@/components/gov/visitrw3-visa-card";
import { Rw3lawCard } from "@/components/gov/rw3law-card";

export default function PublicLanding() {
  return (
    <PublicKioskLayout variant="hero">
      <ServiceCard
        href="/program"
        icon={Target}
        title="Program Kerja RW"
        description="Visi strategis & capaian 3 pilar program RW 03"
        variant="outline"
      />
      <ServiceCard
        href="/lapor"
        icon={Megaphone}
        title="Lapor warga"
        description="Laporkan masalah lingkungan atau daftar antrian kekeringan air"
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
