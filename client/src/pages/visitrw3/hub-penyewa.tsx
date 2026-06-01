import { FilePlus, RefreshCw, Search } from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { ServiceCard } from "@/components/gov/service-card";

export default function Visitrw3HubPenyewa() {
  return (
    <Visitrw3Shell title="Penyewa / penghuni" backHref="/visitrw3">
      <p className="prose-gov mb-4 text-sm text-muted-foreground">
        Untuk warga singgah yang mengajukan izin tinggal atau bisnis di properti terdaftar RW 03.
      </p>
      <div className="space-y-3">
        <ServiceCard
          href="/visitrw3/pengajuan"
          icon={FilePlus}
          title="Pengajuan baru"
          description="Tinggal atau bisnis — lengkapi data penghuni dan pembayaran"
          variant="solid"
        />
        <ServiceCard
          href="/visitrw3/perpanjang"
          icon={RefreshCw}
          title="Perpanjang izin"
          description="Perpanjang dengan nomor Visit RW3 yang sudah aktif"
          variant="solid"
          iconClassName="bg-accent"
        />
        <ServiceCard
          href="/visitrw3/status"
          icon={Search}
          title="Cek status pengajuan"
          description="Lacak nomor Visit RW3 (VRW3-…)"
          variant="outline"
        />
      </div>
    </Visitrw3Shell>
  );
}
