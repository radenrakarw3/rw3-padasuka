import { Home, BedDouble, BookOpen, RefreshCw, Search, Store } from "lucide-react";
import { Link, Redirect, useSearch } from "wouter";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { ServiceCard } from "@/components/gov/service-card";
import { MenuRingkas } from "@/components/gov/menu-ringkas";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

export default function Visitrw3Hub() {
  const search = useSearch();
  const fokus = new URLSearchParams(search).get("fokus");
  if (fokus === "jualan" || fokus === "usaha" || fokus === "bisnis") {
    return <Redirect to={RW3BIZ_ROUTES.hub} />;
  }

  return (
    <Visitrw3Shell title="Visit RW3" backHref="/">
      <p className="mb-4 text-base">
        Untuk yang <strong>ngontrak atau ngekost</strong> di RW 03 dengan <strong>KTP luar RW 03</strong>.
        KTP RW 03?{" "}
        <Link href="/isi" className="font-semibold text-brand underline">
          Isi data keluarga
        </Link>
        .
      </p>
      <div className="space-y-3">
        <ServiceCard
          href={VISITRW3_ROUTES.kontrak.pengajuan}
          icon={Home}
          eyebrow="Daftar baru"
          title="Saya ngontrak"
          description="Sewa rumah / kontrakan"
          variant="solid"
        />
        <ServiceCard
          href={VISITRW3_ROUTES.kost.pengajuan}
          icon={BedDouble}
          eyebrow="Daftar baru"
          title="Saya ngekost"
          description="Sewa kamar kost"
          variant="solid"
        />
      </div>
      <div className="mt-6">
        <MenuRingkas
          judul="Sudah pernah daftar?"
          items={[
            { href: VISITRW3_ROUTES.status, icon: Search, title: "Cek status", description: "Pakai nomor VRW3" },
            { href: VISITRW3_ROUTES.perpanjang, icon: RefreshCw, title: "Perpanjang izin tinggal" },
            { href: VISITRW3_ROUTES.panduan, icon: BookOpen, title: "Panduan & tanya jawab" },
            { href: RW3BIZ_ROUTES.hub, icon: Store, title: "Mau jualan / usaha?", description: "Lewat RW3BIZ" },
          ]}
        />
      </div>
    </Visitrw3Shell>
  );
}
