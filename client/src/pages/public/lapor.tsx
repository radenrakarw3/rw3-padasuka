import { Megaphone, Droplets, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ServiceCard } from "@/components/gov/service-card";
import infocimahiKekeringan from "@assets/infocimahi-kekeringan-cimahi.png";

export default function PublicLaporHub() {
  return (
    <PublicKioskLayout title="Lapor warga" backHref="/">
      <p className="prose-gov mb-4">
        Pilih jenis laporan yang ingin Anda sampaikan ke pengurus RW 03 Padasuka.
      </p>
      <div className="space-y-3">
        <ServiceCard
          href="/lapor/masalah"
          icon={Megaphone}
          title="Laporkan masalah"
          description="Keluhan lingkungan, keamanan, kebersihan, infrastruktur, dan lainnya"
          variant="solid"
        />
        <Link
          href="/lapor/kekeringan"
          className="block rounded-2xl overflow-hidden border-2 border-brand/20 bg-card shadow-sm transition-all hover:border-brand/35 hover:shadow-md group"
          data-testid="card-laporan-kekeringan"
        >
          <img
            src={infocimahiKekeringan}
            alt="Waspada kemarau panjang — 3 kelurahan di Cimahi masuk daerah rawan kekeringan"
            className="w-full aspect-[16/10] object-cover"
          />
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center flex-shrink-0">
                <Droplets className="w-5 h-5 text-sky-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-brand">Laporan kekeringan air</h2>
                <p className="text-sm text-muted-foreground">
                  Daftar antrian bantuan air — tiket dikeluarkan setelah survey RW
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Sumber:{" "}
              <a
                href="https://infocimahi.co"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                infocimahi.co
              </a>
            </p>
          </div>
        </Link>
      </div>
    </PublicKioskLayout>
  );
}
