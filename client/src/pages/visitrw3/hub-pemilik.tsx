import { Building2, Search } from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { ServiceCard } from "@/components/gov/service-card";

export default function Visitrw3HubPemilik() {
  return (
    <Visitrw3Shell title="Pemilik properti" backHref="/visitrw3">
      <p className="prose-gov mb-4 text-sm text-muted-foreground">
        Untuk pemilik kost, kontrakan, kiosk, atau lapak di wilayah RW 03 Padasuka.
      </p>
      <div className="space-y-3">
        <ServiceCard
          href="/visitrw3/daftar-properti"
          icon={Building2}
          title="Daftar properti"
          description="Ajukan pendaftaran properti agar bisa dipilih pada pengajuan Visit RW3"
          variant="solid"
        />
        <ServiceCard
          href="/visitrw3/status-properti"
          icon={Search}
          title="Cek status pendaftaran"
          description="Lacak nomor pendaftaran PROP-… setelah admin memverifikasi"
          variant="outline"
        />
      </div>
    </Visitrw3Shell>
  );
}
