import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ProgramSubItem } from "@/components/gov/program-sub-item";
import { groupProgramsByPilar } from "@shared/program-kerja-analytics";
import {
  getSubProgramsByPilar,
  pilarProgramFokus,
  pilarProgramLabels,
  type PilarProgram,
  PILAR_PROGRAM_OPTIONS,
} from "@shared/program-kerja";
import type { ProgramRw, ProyekInfrastruktur } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCard } from "@/components/gov/service-card";
import { Megaphone, Building2, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusProyekInfrastrukturLabels } from "@shared/program-kerja";

type PublicProgramResponse = {
  programs: ProgramRw[];
  proyek: ProyekInfrastruktur[];
};

const ctaByPilar: Record<PilarProgram, { href: string; icon: typeof Megaphone; title: string; description: string }[]> = {
  infrastruktur: [
    { href: "/lapor", icon: Megaphone, title: "Laporkan genangan", description: "Dukung program Wilayah Bebas Banjir" },
  ],
  digitalisasi: [
    { href: "/visitrw3", icon: Building2, title: "Visit RW3", description: "Registrasi properti & penyewa" },
    { href: "/lapor", icon: Megaphone, title: "Laporkan masalah", description: "Portal pelaporan terpadu" },
  ],
  ekonomi: [
    { href: "/kampung-umkm", icon: Store, title: "Kampung UMKM", description: "Lihat progres makeover usaha warga" },
  ],
};

export default function PublicProgramPilar() {
  const [, params] = useRoute("/program/:pilar");
  const pilar = params?.pilar as PilarProgram | undefined;
  const validPilar = pilar && PILAR_PROGRAM_OPTIONS.includes(pilar) ? pilar : null;

  const { data, isLoading } = useQuery<PublicProgramResponse>({
    queryKey: ["/api/public/program-kerja"],
    enabled: !!validPilar,
  });

  if (!validPilar) {
    return (
      <PublicKioskLayout title="Program tidak ditemukan" backHref="/program">
        <p className="text-muted-foreground">Pilar program tidak valid.</p>
      </PublicKioskLayout>
    );
  }

  const pillarData = data?.programs
    ? groupProgramsByPilar(data.programs).find((p) => p.pilar === validPilar)
    : undefined;
  const programs = pillarData?.programs ?? [];
  const defs = getSubProgramsByPilar(validPilar);
  const proyekPublik = (data?.proyek ?? []).filter((p) => p.subProgram && defs.some((d) => d.slug === p.subProgram));

  return (
    <PublicKioskLayout title={pilarProgramLabels[validPilar]} backHref="/program">
      <div className="space-y-6">
        <p className="prose-gov">{pilarProgramFokus[validPilar]}</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : programs.length > 0 ? (
          <div className="space-y-3">
            {programs.map((p) => (
              <ProgramSubItem key={p.id} program={p} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {defs.map((def) => (
              <div key={def.slug} className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold text-brand">{def.nama}</h3>
                <p className="text-sm text-muted-foreground mt-1">{def.deskripsi}</p>
              </div>
            ))}
          </div>
        )}

        {validPilar === "infrastruktur" && proyekPublik.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-brand">Proyek selesai</h3>
            {proyekPublik
              .filter((p) => p.status === "selesai")
              .map((p) => (
                <div key={p.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{p.nama}</p>
                    <Badge variant="outline">
                      {statusProyekInfrastrukturLabels[p.status] ?? p.status}
                    </Badge>
                  </div>
                  {p.lokasi && <p className="text-sm text-muted-foreground">{p.lokasi}</p>}
                  {p.fotoSesudah && (
                    <img
                      src={p.fotoSesudah.startsWith("data:") ? p.fotoSesudah : `data:image/jpeg;base64,${p.fotoSesudah}`}
                      alt={p.nama}
                      className="rounded-lg w-full max-h-48 object-cover"
                    />
                  )}
                </div>
              ))}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-semibold text-brand">Layanan terkait</h3>
          {ctaByPilar[validPilar].map((cta) => (
            <ServiceCard
              key={cta.href}
              href={cta.href}
              icon={cta.icon}
              title={cta.title}
              description={cta.description}
              variant="outline"
            />
          ))}
        </div>
      </div>
    </PublicKioskLayout>
  );
}
