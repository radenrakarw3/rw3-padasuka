import { Store, BookOpen, RefreshCw, Search, Home, Megaphone, Smartphone, Printer } from "lucide-react";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { ServiceCard } from "@/components/gov/service-card";
import { MenuRingkas } from "@/components/gov/menu-ringkas";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { KebutuhanRw3 } from "@/components/rw3biz/pernyataan";
import { PENGANTAR_SUMBANGSIH } from "@shared/rw3biz-pernyataan";

export default function Rw3bizHub() {
  return (
    <Rw3bizShell title="RW3BIZ" backHref="/">
      <p className="mb-4 text-base">
        Izin <strong>usaha, warung, atau lapak</strong> di wilayah RW 03 Padasuka. Setelah disetujui Ketua RW 03,
        usaha Anda mendapat nomor izin yang bisa dicek online.
      </p>
      <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{PENGANTAR_SUMBANGSIH}</p>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Store className="h-4 w-4 text-brand" /> Daftarkan usaha — pilih cara:
      </p>
      <div className="space-y-3">
        <ServiceCard
          href={RW3BIZ_ROUTES.pengajuan}
          icon={Smartphone}
          eyebrow="Cara 1"
          title="Isi formulir online"
          description="Langsung dari HP, sekitar 5 menit. Cukup data kontak — tidak perlu fotokopi KTP."
          variant="solid"
        />
        <ServiceCard
          href={RW3BIZ_ROUTES.formulir}
          icon={Printer}
          eyebrow="Cara 2"
          title="Cetak formulir sumbangsih"
          description="Formulir Sumbangsih Pengusaha RW3BIZ — cetak, isi tangan, serahkan ke sekretariat RW 03."
          variant="outline"
        />
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-sm font-semibold">Manfaat bagi pengusaha</p>
        <p className="text-sm text-muted-foreground">
          Izin usaha berlaku berapa pun sumbangsihnya (termasuk Rp0). Keamanan Linmas &amp; CCTV, Peta Usaha online,
          pelatihan UMKM, serta untuk kontributor: promo TikTok/IG, voucher belanja warga, dan lapak bazar gratis. Setor
          tunai ke Bendahara RW 03, Ibu Tini + kwitansi bernomor.
        </p>
        <KebutuhanRw3 ringkas />
      </div>
      <div className="mt-6 space-y-6">
        <MenuRingkas
          judul="Sudah terdaftar?"
          items={[
            { href: RW3BIZ_ROUTES.status, icon: Search, title: "Cek status & surat", description: "Pakai NIU atau nomor BIZ" },
            { href: RW3BIZ_ROUTES.perpanjang, icon: RefreshCw, title: "Perbarui izin" },
            { href: RW3BIZ_ROUTES.panduan, icon: BookOpen, title: "Panduan RW3BIZ" },
          ]}
        />
        <MenuRingkas
          judul="Lainnya"
          items={[
            { href: RW3BIZ_ROUTES.aduan, icon: Megaphone, title: "Adukan usaha yang mengganggu", description: "Identitas pelapor dirahasiakan" },
            { href: "/visitrw3", icon: Home, title: "Ngontrak / ngekost?", description: "Lewat Visit RW3" },
          ]}
        />
      </div>
    </Rw3bizShell>
  );
}
