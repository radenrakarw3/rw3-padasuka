import { QrCode, Wallet } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ServiceCard } from "@/components/gov/service-card";
import { Visitrw3VisaCard } from "@/components/gov/visitrw3-visa-card";
import { Rw3bizCard } from "@/components/gov/rw3biz-card";
import { KartuAduanBeranda } from "@/components/aduan/aduan-ui";

export default function PublicLanding() {
  return (
    <PublicKioskLayout variant="hero">
      <p className="text-center text-sm text-white/80">Pilih yang sesuai dengan keperluan Anda</p>
      <Visitrw3VisaCard />
      <Rw3bizCard />
      <KartuAduanBeranda />
      <ServiceCard
        href="/kas-rw"
        icon={Wallet}
        eyebrow="Transparansi"
        title="Kas RW 03"
        description="Saldo, pemasukan, dan pengeluaran kas RW"
        variant="glass"
      />
      <ServiceCard
        href="/isi"
        icon={QrCode}
        eyebrow="Warga ber-KTP RW 03"
        title="Isi data keluarga"
        description="Punya kartu QR dari pengurus? Scan atau ketik kodenya di sini."
        variant="glass"
      />
    </PublicKioskLayout>
  );
}
