import { Building2, Users, BookOpen } from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { ServiceCard } from "@/components/gov/service-card";

export default function Visitrw3Hub() {
  return (
    <Visitrw3Shell title="Visit RW3" backHref="/">
      <p className="prose-gov mb-4 text-sm text-muted-foreground">
        Pilih sesuai peran Anda: pemilik properti atau penyewa / penghuni yang mengajukan izin.
      </p>
      <div className="space-y-3">
        <ServiceCard
          href="/visitrw3/pemilik"
          icon={Building2}
          title="Pemilik properti"
          description="Daftarkan kost, kontrakan, kiosk, atau lapak ke RW 03"
          variant="solid"
        />
        <ServiceCard
          href="/visitrw3/penyewa"
          icon={Users}
          title="Penyewa / penghuni"
          description="Pengajuan tinggal, bisnis, perpanjang, dan cek status izin"
          variant="solid"
          iconClassName="bg-accent"
        />
        <ServiceCard
          href="/visitrw3/panduan"
          icon={BookOpen}
          title="Panduan & tanya jawab"
          description="Alur lengkap, dokumen yang disiapkan, dan perkiraan biaya"
          variant="outline"
        />
      </div>
    </Visitrw3Shell>
  );
}
