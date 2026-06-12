import { Megaphone, Headphones, Target } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ServiceCard } from "@/components/gov/service-card";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { Visitrw3VisaCard } from "@/components/gov/visitrw3-visa-card";
import { Rw3lawCard } from "@/components/gov/rw3law-card";
import {
  LAPORAN_KEKERINGAN_PUBLIK_ENABLED,
  PROGRAM_KERJA_PUBLIK_ENABLED,
} from "@shared/public-features";

export default function PublicLanding() {
  return (
    <PublicKioskLayout variant="hero">
      <FeatureExplain title="Pilih layanan sesuai kebutuhan" variant="glass">
        <ul className="list-disc pl-4 space-y-1">
          {PROGRAM_KERJA_PUBLIK_ENABLED && (
            <li>
              <strong>Program Kerja</strong> — lihat visi, capaian, dan program RW untuk warga.
            </li>
          )}
          <li>
            <strong>Lapor warga</strong>
            {LAPORAN_KEKERINGAN_PUBLIK_ENABLED
              ? " — sampaikan keluhan lingkungan atau daftar antrian bantuan air."
              : " — sampaikan keluhan lingkungan di wilayah RW."}
          </li>
          <li>
            <strong>Hubungi ketua RT</strong> — konsultasi urusan warga per RT lewat WhatsApp.
          </li>
          <li>
            <strong>Visit RW3</strong> — izin administrasi penyewa kost, penghuni, dan pengusaha di wilayah RW.
          </li>
          <li>
            <strong>RW3LAW</strong> — baca peraturan resmi lingkungan yang wajib dipatuhi warga.
          </li>
        </ul>
      </FeatureExplain>
      {PROGRAM_KERJA_PUBLIK_ENABLED && (
        <ServiceCard
          href="/program"
          icon={Target}
          title="Program Kerja RW"
          description="Visi strategis & capaian 3 pilar program RW 03"
          variant="outline"
        />
      )}
      <ServiceCard
        href="/lapor"
        icon={Megaphone}
        title="Lapor warga"
        description={
          LAPORAN_KEKERINGAN_PUBLIK_ENABLED
            ? "Laporkan masalah lingkungan atau daftar antrian kekeringan air"
            : "Laporkan masalah lingkungan di wilayah RW"
        }
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
