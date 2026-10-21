import { Store, BookOpen, RefreshCw, Search, Home, Megaphone } from "lucide-react";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { ServiceCard } from "@/components/gov/service-card";
import { MenuRingkas } from "@/components/gov/menu-ringkas";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

export default function Rw3bizHub() {
  return (
    <Rw3bizShell title="RW3BIZ" backHref="/">
      <p className="mb-4 text-base">
        Izin <strong>usaha, warung, atau lapak</strong> di wilayah RW 03 Padasuka. Setelah disurvey pengurus,
        usaha Anda mendapat nomor izin.
      </p>
      <ServiceCard
        href={RW3BIZ_ROUTES.pengajuan}
        icon={Store}
        eyebrow="Daftar baru"
        title="Daftarkan usaha"
        description="Data usaha, jam buka, dan orang yang bekerja"
        variant="solid"
      />
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
