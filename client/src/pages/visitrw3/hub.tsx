import { Home, BedDouble, BookOpen, RefreshCw, Search, Store, Printer, FileText } from "lucide-react";
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
        Izin tinggal untuk yang <strong>ngontrak atau ngekost</strong> di RW 03 dengan{" "}
        <strong>KTP luar RW 03</strong>. Kontribusi tetap <strong>Rp1.000 / bulan</strong>.
      </p>
      <p className="mb-2 text-sm text-muted-foreground">
        Cara utama: pengurus cetak formulir → berikan ke pemilik kost/kontrakan → penghuni isi kertas → dikumpulkan →
        admin input. KTP RW 03?{" "}
        <Link href="/isi" className="font-semibold text-brand underline">
          Isi data keluarga
        </Link>
        .
      </p>

      <p className="mb-2 mt-4 text-sm font-semibold">Untuk pengurus / pemilik — cetak formulir</p>
      <div className="mb-6 space-y-3">
        <ServiceCard
          href={VISITRW3_ROUTES.formulir}
          icon={Printer}
          eyebrow="Utama"
          title="Cetak formulir izin tinggal"
          description="Bagulir kosong F4. Bagikan ke pemilik, kumpulkan lagi, lalu input di antrian admin."
          variant="solid"
        />
      </div>

      <p className="mb-2 text-sm font-semibold">Sudah punya nomor VRW3?</p>
      <div className="mb-6">
        <MenuRingkas
          judul=""
          items={[
            { href: VISITRW3_ROUTES.status, icon: Search, title: "Cek status & surat", description: "Pakai nomor VRW3" },
            { href: VISITRW3_ROUTES.perpanjang, icon: RefreshCw, title: "Perpanjang 1 bulan", description: "Kontribusi Rp1.000" },
          ]}
        />
      </div>

      <p className="mb-2 text-sm font-semibold">Cadangan — isi sendiri dari HP</p>
      <div className="space-y-3">
        <ServiceCard
          href={VISITRW3_ROUTES.kontrak.pengajuan}
          icon={Home}
          eyebrow="Cadangan"
          title="Saya ngontrak"
          description="Sewa rumah / kontrakan — isi online"
          variant="outline"
        />
        <ServiceCard
          href={VISITRW3_ROUTES.kost.pengajuan}
          icon={BedDouble}
          eyebrow="Cadangan"
          title="Saya ngekost"
          description="Sewa kamar kost — isi online"
          variant="outline"
        />
      </div>

      <div className="mt-6">
        <MenuRingkas
          judul="Lainnya"
          items={[
            { href: VISITRW3_ROUTES.panduan, icon: BookOpen, title: "Panduan singkat", description: "Alur kertas & FAQ" },
            { href: VISITRW3_ROUTES.formulir, icon: FileText, title: "Formulir kosong", description: "Cetak lagi" },
            { href: RW3BIZ_ROUTES.hub, icon: Store, title: "Mau jualan / usaha?", description: "Lewat RW3BIZ" },
          ]}
        />
      </div>
    </Visitrw3Shell>
  );
}
