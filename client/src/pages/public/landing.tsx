import { Headphones, QrCode, Wallet } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ServiceCard } from "@/components/gov/service-card";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { Visitrw3VisaCard } from "@/components/gov/visitrw3-visa-card";
import { Rw3bizCard } from "@/components/gov/rw3biz-card";

export default function PublicLanding() {
  return (
    <PublicKioskLayout variant="hero">
      <FeatureExplain title="Pilih layanan sesuai kebutuhan" variant="glass">
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>Isi data keluarga</strong> — pakai kode di kartu QR dari Ketua RT. Isian diperiksa RT dulu, data lama tidak ditampilkan.
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
            <strong>Kas RW</strong> — lihat saldo, pemasukan, dan pengeluaran kas RW secara terbuka.
          </li>
        </ul>
      </FeatureExplain>
      <ServiceCard
        href="/isi"
        icon={QrCode}
        eyebrow="Pendataan keluarga"
        title="Isi data keluarga"
        description="Punya kartu QR dari Ketua RT? Scan atau ketik kodenya di sini. Bisa juga cek status isian."
        variant="solid"
        iconClassName="bg-accent"
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
      <ServiceCard
        href="/kas-rw"
        icon={Wallet}
        eyebrow="Transparansi"
        title="Kas RW 03"
        description="Saldo, pemasukan, dan pengeluaran kas RW — terbuka untuk semua warga"
        variant="glass"
      />
    </PublicKioskLayout>
  );
}
