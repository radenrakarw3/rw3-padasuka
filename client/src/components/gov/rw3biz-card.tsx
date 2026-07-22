import { Link } from "wouter";
import { ChevronRight, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

type Rw3bizCardProps = {
  href?: string;
  className?: string;
};

/** Kartu premium landing — setara VisitRW3 & RW3LAW, motif usaha/jualan. */
export function Rw3bizCard({ href = RW3BIZ_ROUTES.hub, className }: Rw3bizCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block relative overflow-hidden rounded-2xl",
        "min-h-[148px] p-5",
        "border border-[hsl(32,55%,48%)]/45",
        "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]",
        "transition-all duration-300",
        "hover:shadow-[0_20px_48px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]",
        "hover:-translate-y-0.5 hover:border-[hsl(32,60%,58%)]/60",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-muted",
        className,
      )}
      aria-label="RW3BIZ — izin usaha / jualan di RW 03"
    >
      {/* Base — dagang: hijau tua → tembaga hangat */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(163, 48%, 14%) 0%, hsl(28, 42%, 18%) 48%, hsl(163, 40%, 16%) 100%)",
        }}
        aria-hidden
      />
      {/* Copper / gold sheen */}
      <div
        className="absolute inset-0 opacity-40 group-hover:opacity-55 transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(118deg, transparent 0%, hsl(32, 55%, 48%) / 0.18 36%, hsl(40, 60%, 70%) / 0.24 50%, transparent 64%)",
        }}
        aria-hidden
      />
      {/* Motif kotak usaha (bukan garis miring visa) */}
      <div
        className="absolute inset-0 opacity-[0.07] group-hover:opacity-[0.1] transition-opacity"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)
          `,
          backgroundSize: "18px 18px",
        }}
        aria-hidden
      />
      {/* Ornamen sudut */}
      <div
        className="absolute -right-10 -top-10 w-36 h-36 rounded-full border border-[hsl(32,50%,55%)]/25"
        aria-hidden
      />
      <div
        className="absolute -right-2 -bottom-14 w-44 h-44 rounded-full border border-[hsl(40,45%,55%)]/15"
        aria-hidden
      />
      <div
        className="absolute right-6 top-1/2 -translate-y-1/2 w-24 h-24 rounded-2xl border border-[hsl(40,50%,60%)]/10 rotate-12 opacity-60 group-hover:rotate-[18deg] transition-transform duration-500"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col h-full min-h-[108px] justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-8 rounded-md bg-gradient-to-br from-[hsl(40,55%,72%)] to-[hsl(28,45%,40%)] shadow-inner flex items-center justify-center border border-[hsl(40,50%,80%)]/30">
              <Store className="w-4 h-4 text-[hsl(28,40%,22%)]" aria-hidden />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.35em] text-[hsl(40,45%,72%)] font-medium">
                Usaha
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/80 font-semibold">
                RW 03 Padasuka
              </p>
            </div>
          </div>
          <Store
            className="w-5 h-5 text-[hsl(40,50%,68%)]/75 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
            aria-hidden
          />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[hsl(40,45%,70%)] mb-1">
            Izin Usaha &amp; Jualan
          </p>
          <p className="text-[2rem] leading-none font-extrabold tracking-tight text-white drop-shadow-sm">
            RW3<span className="text-[hsl(40,58%,68%)]">BIZ</span>
          </p>
          <p className="text-xs text-white/60 mt-2 max-w-[260px]">
            Daftar usaha / lapak di RW 03 — terpisah dari izin tinggal Visit RW3
          </p>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <span className="text-[10px] uppercase tracking-widest text-white/45 font-mono">
            Kel. Padasuka
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-[hsl(40,50%,75%)] group-hover:text-[hsl(40,55%,85%)] transition-colors">
            Ajukan
            <ChevronRight
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
