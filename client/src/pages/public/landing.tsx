import { Phone, Shield, Star, Wallet } from "lucide-react";
import fotoKetua from "@assets/foto_raden_raka_mewah.png";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ServiceCard } from "@/components/gov/service-card";
import { Visitrw3VisaCard } from "@/components/gov/visitrw3-visa-card";
import { Rw3bizCard } from "@/components/gov/rw3biz-card";
import { KartuAduanBeranda } from "@/components/aduan/aduan-ui";
import { RuangTtdKetua } from "@/components/cetak/ttd-ketua";

function KartuSambutanKetua() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[hsl(40,55%,58%)]/50 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]"
      aria-label="Sambutan resmi Ketua RW 03"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(163, 52%, 12%) 0%, hsl(163, 48%, 20%) 42%, hsl(163, 55%, 16%) 100%)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-45"
        style={{
          background:
            "linear-gradient(118deg, transparent 0%, hsl(40, 50%, 45%) / 0.15 38%, hsl(40, 60%, 72%) / 0.22 50%, transparent 62%)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.4) 8px, rgba(255,255,255,0.4) 9px)`,
        }}
        aria-hidden
      />
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border border-[hsl(40,45%,55%)]/20" aria-hidden />

      <div className="relative z-10 flex items-stretch gap-3 p-4 sm:gap-4 sm:p-5">
        <div
          className="relative shrink-0 self-center"
          style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.45)) drop-shadow(0 0 14px hsl(40 55% 50% / 0.28))" }}
        >
          {/* Outer ornate gold ring */}
          <div
            className="rounded-2xl p-[3px]"
            style={{
              background:
                "linear-gradient(145deg, hsl(40,70%,82%) 0%, hsl(40,55%,52%) 28%, hsl(40,35%,28%) 52%, hsl(40,60%,68%) 78%, hsl(40,75%,88%) 100%)",
            }}
          >
            {/* Dark enamel channel */}
            <div
              className="rounded-[13px] p-[3px]"
              style={{
                background:
                  "linear-gradient(160deg, hsl(163,45%,16%) 0%, hsl(163,40%,10%) 50%, hsl(40,30%,18%) 100%)",
                boxShadow: "inset 0 1px 0 hsl(40 60% 70% / 0.35)",
              }}
            >
              {/* Inner bright gold fillet */}
              <div
                className="relative overflow-hidden rounded-[10px] p-[1.5px]"
                style={{
                  background:
                    "linear-gradient(160deg, hsl(40,65%,78%) 0%, hsl(40,45%,48%) 45%, hsl(40,55%,70%) 100%)",
                }}
              >
                <div
                  className="h-[124px] w-[94px] overflow-hidden rounded-[8px] sm:h-[132px] sm:w-[100px]"
                  style={{
                    background:
                      "linear-gradient(160deg, hsl(163,48%,18%) 0%, hsl(40,35%,28%) 100%)",
                    boxShadow: "inset 0 0 0 1px hsl(40 50% 60% / 0.25)",
                  }}
                >
                  <img
                    src={fotoKetua}
                    alt="Raden Raka A.K.S, Ketua RW 03 Padasuka"
                    className="h-full w-full object-cover object-center"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Corner jewels */}
          {[
            "left-1 top-1",
            "right-1 top-1",
            "left-1 bottom-1",
            "right-1 bottom-1",
          ].map((pos) => (
            <span
              key={pos}
              className={`pointer-events-none absolute ${pos} h-2 w-2 rotate-45 rounded-[1px]`}
              style={{
                background:
                  "linear-gradient(135deg, hsl(40,75%,88%), hsl(40,50%,48%))",
                boxShadow: "0 0 6px hsl(40 70% 55% / 0.65)",
              }}
              aria-hidden
            />
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5 text-left">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-[hsl(40,50%,65%)]/35 bg-[hsl(40,45%,55%)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(40,55%,78%)]">
                <Shield className="h-3 w-3" aria-hidden />
                Resmi
              </span>
              <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/55">
                RW 03 Padasuka
              </span>
            </div>
            <p className="text-base font-semibold leading-snug tracking-tight text-[hsl(40,55%,84%)] sm:text-lg">
              Wilujeng Sumping Wargi RW3!
            </p>
          </div>

          <div className="flex items-end justify-between gap-2 border-t border-[hsl(40,45%,55%)]/20 pt-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Raden Raka A.K.S</p>
              <p className="text-[10px] leading-snug text-white/60">Ketua RW 03 · Padasuka, Cimahi</p>
            </div>
            <div
              className="shrink-0 rounded-xl border border-[hsl(40,55%,65%)]/35 px-2 py-1"
              style={{
                background:
                  "linear-gradient(155deg, hsl(40 35% 22% / 0.5) 0%, hsl(163 45% 12% / 0.65) 100%)",
                boxShadow:
                  "inset 0 1px 0 hsl(40 55% 75% / 0.28), 0 6px 18px rgba(0,0,0,0.35)",
              }}
            >
              <div
                className="[&_img]:opacity-95 [&_img]:[filter:brightness(0)_invert(1)_sepia(0.4)_saturate(2.4)_hue-rotate(6deg)_drop-shadow(0_0_8px_hsl(40_70%_55%_/_0.55))]"
              >
                <RuangTtdKetua tinggi="48px" lebarMaks="100px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicLanding() {
  return (
    <PublicKioskLayout variant="hero">
      <KartuSambutanKetua />
      <p className="text-center text-sm text-white/80">Pilih yang sesuai dengan keperluan Anda</p>
      <Visitrw3VisaCard />
      <Rw3bizCard />
      <KartuAduanBeranda />
      <ServiceCard
        href="/pelayanan"
        icon={Phone}
        eyebrow="Hubungi pengurus"
        title="Kontak person"
        description="Minta nomor RT, sekretaris, bendahara, atau darurat lewat WhatsApp"
        variant="glass"
      />
      <ServiceCard
        href="/rating"
        icon={Star}
        eyebrow="Rahasia"
        title="Rating & masukan"
        description="Nilai RT atau RW, tulis kritik/saran — tidak ditampilkan publik"
        variant="glass"
      />
      <ServiceCard
        href="/kas-rw"
        icon={Wallet}
        eyebrow="Transparansi"
        title="Kas RW 03"
        description="Saldo, pemasukan, dan pengeluaran kas RW"
        variant="glass"
      />
    </PublicKioskLayout>
  );
}
