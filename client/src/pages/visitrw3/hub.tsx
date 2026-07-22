import { Home, BedDouble, BookOpen, RefreshCw, Search, Store } from "lucide-react";
import { Redirect, useSearch } from "wouter";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { JENIS_WARGA_DESKRIPSI, JENIS_WARGA_LABEL } from "@shared/visitrw3-jenis-warga";

export default function Visitrw3Hub() {
  const search = useSearch();
  const fokus = new URLSearchParams(search).get("fokus");
  if (fokus === "jualan" || fokus === "usaha" || fokus === "bisnis") {
    return <Redirect to={RW3BIZ_ROUTES.hub} />;
  }

  return (
    <Visitrw3Shell title="Visit RW3" backHref="/">
      <FeatureExplain title="Apa itu Visit RW3?" className="mb-4">
        <p>
          Pendaftaran warga luar yang <strong>tinggal</strong> di wilayah RW 03 — ngontrak atau
          ngekost. Tanpa perantara pemilik properti.
        </p>
        <p>
          Setelah disetujui, Anda mendapat nomor VRW3 dan dapat dihubungi pengurus lewat WhatsApp.
        </p>
        <p className="text-muted-foreground">
          Mau berjualan / usaha? Gunakan layanan terpisah{" "}
          <strong className="text-foreground">RW3BIZ</strong>.
        </p>
      </FeatureExplain>
      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle={JENIS_WARGA_LABEL.kontrak}
          explain={<>{JENIS_WARGA_DESKRIPSI.kontrak}</>}
          href={VISITRW3_ROUTES.kontrak.pengajuan}
          icon={Home}
          title={JENIS_WARGA_LABEL.kontrak}
          description={JENIS_WARGA_DESKRIPSI.kontrak}
          variant="solid"
        />
        <FeatureMenuBlock
          explainTitle={JENIS_WARGA_LABEL.kost}
          explain={<>{JENIS_WARGA_DESKRIPSI.kost}</>}
          href={VISITRW3_ROUTES.kost.pengajuan}
          icon={BedDouble}
          title={JENIS_WARGA_LABEL.kost}
          description={JENIS_WARGA_DESKRIPSI.kost}
          variant="outline"
        />
        <FeatureMenuBlock
          explainTitle="RW3BIZ — izin usaha"
          explain={<>Berjualan atau usaha di RW 03 ditangani lewat layanan RW3BIZ, bukan Visit RW3.</>}
          href={RW3BIZ_ROUTES.hub}
          icon={Store}
          title="Pindah ke RW3BIZ"
          description="Izin jualan / usaha di wilayah RW"
          variant="outline"
          iconClassName="bg-accent"
        />
        <FeatureMenuBlock
          explainTitle="Sudah punya nomor VRW3?"
          explain={<>Perpanjang masa berlaku atau cek status pengajuan tinggal Anda.</>}
          href={VISITRW3_ROUTES.perpanjang}
          icon={RefreshCw}
          title="Perpanjang izin"
          description="Perpanjang masa tinggal"
          variant="outline"
        />
        <FeatureMenuBlock
          explainTitle="Cek status"
          explain={<>Pantau nomor VRW3 — menunggu survey, disetujui, atau ditolak.</>}
          href={VISITRW3_ROUTES.status}
          icon={Search}
          title="Cek status"
          description="Lacak nomor VRW3"
          variant="outline"
        />
        <FeatureMenuBlock
          explainTitle="Panduan"
          explain={<>Alur singkat untuk ngontrak & ngekost.</>}
          href={VISITRW3_ROUTES.panduan}
          icon={BookOpen}
          title="Panduan & tanya jawab"
          description="Langkah demi langkah"
          variant="outline"
        />
      </div>
    </Visitrw3Shell>
  );
}
