import { Store, BookOpen, RefreshCw, Search, FileText } from "lucide-react";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

export default function Rw3bizHub() {
  return (
    <Rw3bizShell title="RW3BIZ" backHref="/">
      <FeatureExplain title="Apa itu RW3BIZ?" className="mb-4">
        <p>
          Layanan izin <strong>berjualan / usaha</strong> di wilayah RW 03 Padasuka — terpisah dari
          Visit RW3 (yang khusus untuk tinggal: ngontrak & ngekost).
        </p>
        <p>
          Isi data usaha, lokasi, jam operasional, dan penanggung jawab. Setelah survey pengurus,
          Anda mendapat nomor izin dan dapat dihubungi lewat WhatsApp.
        </p>
      </FeatureExplain>
      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle="Ajukan izin usaha"
          explain={<>Daftar usaha baru: lapak, kiosk, atau jenis tempat lain di RW 03.</>}
          href={RW3BIZ_ROUTES.pengajuan}
          icon={Store}
          title="Ajukan izin jualan"
          description="Data usaha, jam buka, dan penanggung jawab"
          variant="solid"
        />
        <FeatureMenuBlock
          explainTitle="Sudah punya nomor?"
          explain={<>Perpanjang masa berlaku izin usaha Anda.</>}
          href={RW3BIZ_ROUTES.perpanjang}
          icon={RefreshCw}
          title="Perpanjang izin"
          description="Perpanjang masa usaha"
          variant="outline"
        />
        <FeatureMenuBlock
          explainTitle="Cek status"
          explain={<>Pantau pengajuan — menunggu survey, disetujui, atau ditolak.</>}
          href={RW3BIZ_ROUTES.status}
          icon={Search}
          title="Cek status"
          description="Lacak nomor pengajuan"
          variant="outline"
        />
        <FeatureMenuBlock
          explainTitle="Panduan"
          explain={<>Dokumen yang disiapkan dan alur survey usaha.</>}
          href={RW3BIZ_ROUTES.panduan}
          icon={BookOpen}
          title="Panduan RW3BIZ"
          description="Langkah demi langkah"
          variant="outline"
        />
        <FeatureMenuBlock
          explainTitle="Tinggal di RW 03?"
          explain={<>Ngontrak atau ngekost? Gunakan Visit RW3.</>}
          href="/visitrw3"
          icon={FileText}
          title="Ke Visit RW3"
          description="Izin tinggal (kost / kontrakan)"
          variant="outline"
        />
      </div>
    </Rw3bizShell>
  );
}
