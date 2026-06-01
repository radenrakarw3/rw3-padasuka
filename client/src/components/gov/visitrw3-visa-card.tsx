import { Link } from "wouter";
import { ChevronRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type Visitrw3VisaCardProps = {
  href?: string;
  className?: string;
};

export function Visitrw3VisaCard({ href = "/visitrw3", className }: Visitrw3VisaCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block relative overflow-hidden rounded-2xl",
        "min-h-[148px] p-5",
        "border border-[hsl(40,55%,58%)]/50",
        "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]",
        "transition-all duration-300",
        "hover:shadow-[0_20px_48px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]",
        "hover:-translate-y-0.5 hover:border-[hsl(40,55%,65%)]/70",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-muted",
        className,
      )}
      aria-label="Visit RW3 — izin warga singgah"
    >
      {/* Base gradient — kartu visa */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(163, 52%, 12%) 0%, hsl(163, 48%, 20%) 42%, hsl(163, 55%, 16%) 100%)",
        }}
        aria-hidden
      />
      {/* Gold sheen */}
      <div
        className="absolute inset-0 opacity-40 group-hover:opacity-55 transition-opacity"
        style={{
          background:
            "linear-gradient(118deg, transparent 0%, hsl(40, 50%, 45%) / 0.15 38%, hsl(40, 60%, 72%) / 0.22 50%, transparent 62%)",
        }}
        aria-hidden
      />
      {/* Pattern */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 8px,
            rgba(255,255,255,0.4) 8px,
            rgba(255,255,255,0.4) 9px
          )`,
        }}
        aria-hidden
      />
      {/* Corner emblem */}
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full border border-[hsl(40,45%,55%)]/20"
        aria-hidden
      />
      <div
        className="absolute -right-4 -bottom-12 w-40 h-40 rounded-full border border-[hsl(40,45%,55%)]/15"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col h-full min-h-[108px] justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-8 rounded-md bg-gradient-to-br from-[hsl(40,55%,72%)] to-[hsl(40,40%,42%)] shadow-inner flex items-center justify-center border border-[hsl(40,50%,80%)]/30">
              <div className="w-5 h-4 rounded-sm border border-[hsl(40,35%,35%)]/40 bg-[hsl(40,45%,50%)]/30" aria-hidden />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.35em] text-[hsl(40,45%,72%)] font-medium">
                Official
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/80 font-semibold">
                RW 03 Padasuka
              </p>
            </div>
          </div>
          <Shield className="w-5 h-5 text-[hsl(40,50%,68%)]/80 flex-shrink-0" aria-hidden />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[hsl(40,45%,70%)] mb-1">
            Warga Singgah
          </p>
          <p className="text-[2rem] leading-none font-extrabold tracking-tight text-white drop-shadow-sm">
            Visit<span className="text-[hsl(40,58%,68%)]">RW3</span>
          </p>
          <p className="text-xs text-white/60 mt-2 max-w-[240px]">
            Izin tinggal & bisnis — seperti nomor visa wilayah RW
          </p>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <span className="text-[10px] uppercase tracking-widest text-white/45 font-mono">
            Kel. Padasuka
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-[hsl(40,50%,75%)] group-hover:text-[hsl(40,55%,85%)] transition-colors">
            Masuk
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
