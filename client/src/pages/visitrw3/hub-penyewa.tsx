import { Link } from "wouter";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import { FilePlus, RefreshCw, Search, BookOpen } from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";

export default function Visitrw3HubPenyewa() {
  return (
    <Visitrw3Shell title="Penyewa / penghuni" backHref={VISITRW3_ROUTES.hub}>
      <p className="prose-gov mb-3 text-sm text-muted-foreground">
        Untuk penyewa kost, penghuni kontrakan, atau pengusaha di tempat <strong>milik orang lain</strong>.
        Usaha di rumah sendiri? Bukan menu ini — buka{" "}
        <Link href={VISITRW3_ROUTES.usahaRumahan.hub} className="text-brand font-medium hover:underline">
          Usaha di rumah sendiri
        </Link>
        .
      </p>
      <Link
        href={VISITRW3_ROUTES.panduan}
        className="inline-flex items-center gap-1.5 text-sm text-brand font-medium mb-4 hover:underline"
      >
        <BookOpen className="w-4 h-4" />
        Baca panduan sebelum mengisi
      </Link>
      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle="Pengajuan baru — kapan dipakai?"
          explain={
            <>
              Untuk <strong>pertama kali</strong> mengajukan izin tinggal, bisnis, atau keduanya
              sekaligus. Pilih situasi Anda di langkah pertama (tinggal saja / tinggal + usaha /
              usaha saja). Siapkan foto KTP dan NIK setiap penghuni dewasa.
            </>
          }
          href={VISITRW3_ROUTES.penyewa.pengajuan}
          icon={FilePlus}
          title="Pengajuan baru"
          description="Isi langkah demi langkah — tidak perlu sekaligus"
          variant="solid"
        />
        <FeatureMenuBlock
          explainTitle="Perpanjang izin — kapan dipakai?"
          explain={
            <>
              Untuk memperpanjang izin yang <strong>sudah pernah disetujui</strong> dan masih
              berlaku (atau akan habis). Masukkan nomor VRW3-… lama, pilih tanggal bayar & termin
              baru. Bukan untuk pengajuan pertama kali.
            </>
          }
          href={VISITRW3_ROUTES.penyewa.perpanjang}
          icon={RefreshCw}
          title="Perpanjang izin"
          description="Perpanjang dengan nomor Visit RW3 yang sudah aktif"
          variant="solid"
          iconClassName="bg-accent"
        />
        <FeatureMenuBlock
          explainTitle="Cek status pengajuan"
          explain={
            <>
              Lacak proses pengajuan atau perpanjangan Anda: menunggu survey, disetujui, ditolak,
              atau sudah aktif. Masukkan nomor <strong>VRW3-…</strong> dari konfirmasi pengajuan.
            </>
          }
          href={VISITRW3_ROUTES.penyewa.status}
          icon={Search}
          title="Cek status pengajuan"
          description="Lacak nomor Visit RW3 (VRW3-…)"
          variant="outline"
        />
      </div>
    </Visitrw3Shell>
  );
}
