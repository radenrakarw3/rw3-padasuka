import { Megaphone, Droplets, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FeatureMenuBlock } from "@/components/gov/feature-menu-block";
import { LAPORAN_KEKERINGAN_PUBLIK_ENABLED } from "@shared/public-features";
import infocimahiKekeringan from "@assets/infocimahi-kekeringan-cimahi.png";

export default function PublicLaporHub() {
  return (
    <PublicKioskLayout title="Lapor warga" backHref="/">
      <div className="space-y-4">
        <FeatureMenuBlock
          explainTitle="Laporkan masalah"
          explain={
            <>
              Untuk keluhan sehari-hari di lingkungan RW: keamanan, kebersihan, infrastruktur rusak,
              ketertiban, dan lainnya. Setelah dikirim, pengurus RW meninjau laporan dan dapat
              menghubungi Anda lewat WhatsApp. Simpan nomor referensi untuk cek status.
            </>
          }
          href="/lapor/masalah"
          icon={Megaphone}
          title="Laporkan masalah"
          description="Keluhan lingkungan, keamanan, kebersihan, infrastruktur"
          variant="solid"
        />
        {LAPORAN_KEKERINGAN_PUBLIK_ENABLED && (
          <div className="space-y-2">
            <FeatureExplain title="Laporan kekeringan air">
              Khusus rumah yang kekurangan air saat musim kemarau. Anda mendaftar antrian bantuan air;
              petugas RW akan survey ke rumah untuk verifikasi. Tiket distribusi air dikeluarkan setelah
              survey — bukan untuk keluhan umum lingkungan.
            </FeatureExplain>
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
        )}
      </div>
    </PublicKioskLayout>
  );
}
