import { Link } from "wouter";
import { Building2, Search, BookOpen } from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";

export default function Visitrw3HubPemilik() {
  return (
    <Visitrw3Shell title="Pemilik properti" backHref="/visitrw3">
      <p className="prose-gov mb-3 text-sm text-muted-foreground">
        Untuk pemilik kost, kontrakan, kiosk, atau lapak di wilayah RW 03 Padasuka.
      </p>
      <Link
        href="/visitrw3/panduan"
        className="inline-flex items-center gap-1.5 text-sm text-brand font-medium mb-4 hover:underline"
      >
        <BookOpen className="w-4 h-4" />
        Baca panduan pemilik & penyewa
      </Link>
      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle="Daftar properti — langkah pertama"
          explain={
            <>
              Wajib dilakukan <strong>sebelum</strong> penyewa bisa mengajukan Visit RW3. Isi jenis
              properti, alamat, RT, data pemilik & pengelola. Setelah dikirim, Anda mendapat nomor{" "}
              <strong>PROP-…</strong> — simpan untuk cek status.
            </>
          }
          href="/visitrw3/daftar-properti"
          icon={Building2}
          title="Daftar properti"
          description="Isi langkah demi langkah — tidak perlu sekaligus"
          variant="solid"
        />
        <FeatureMenuBlock
          explainTitle="Cek status pendaftaran"
          explain={
            <>
              Lacak apakah properti sudah <strong>aktif</strong> (bisa dipilih penyewa) atau masih{" "}
              <strong>menunggu verifikasi</strong> admin RW. Masukkan nomor PROP-… dari konfirmasi
              pendaftaran.
            </>
          }
          href="/visitrw3/status-properti"
          icon={Search}
          title="Cek status pendaftaran"
          description="Lacak nomor PROP-… setelah admin memverifikasi"
          variant="outline"
        />
      </div>
    </Visitrw3Shell>
  );
}
