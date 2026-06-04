import { Link } from "wouter";
import { ChevronRight, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type Rw3lawCardProps = {
  href?: string;
  className?: string;
};

export function Rw3lawCard({ href = "/rwlaw", className }: Rw3lawCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block relative overflow-hidden rounded-2xl",
        "min-h-[148px] p-5",
        "border border-[hsl(210,35%,45%)]/40",
        "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]",
        "transition-all duration-300",
        "hover:shadow-[0_20px_48px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]",
        "hover:-translate-y-0.5 hover:border-[hsl(210,40%,55%)]/55",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-muted",
        className,
      )}
      aria-label="RW3LAW — peraturan warga RW 03"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(210, 45%, 14%) 0%, hsl(163, 48%, 18%) 50%, hsl(210, 40%, 16%) 100%)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-35 group-hover:opacity-50 transition-opacity"
        style={{
          background:
            "linear-gradient(118deg, transparent 0%, hsl(40, 50%, 45%) / 0.12 40%, hsl(40, 60%, 72%) / 0.18 52%, transparent 64%)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 6px,
            rgba(255,255,255,0.5) 6px,
            rgba(255,255,255,0.5) 7px
          )`,
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col h-full min-h-[108px] justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-8 rounded-md bg-gradient-to-br from-[hsl(40,55%,72%)] to-[hsl(40,40%,42%)] shadow-inner flex items-center justify-center border border-[hsl(40,50%,80%)]/30">
              <Scale className="w-4 h-4 text-[hsl(210,30%,25%)]" aria-hidden />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.35em] text-[hsl(40,45%,72%)] font-medium">
                Peraturan
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/80 font-semibold">
                RW 03 Padasuka
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[hsl(40,45%,70%)] mb-1">
            Peraturan Warga
          </p>
          <p className="text-[2rem] leading-none font-extrabold tracking-tight text-white drop-shadow-sm">
            RW3<span className="text-[hsl(40,58%,68%)]">LAW</span>
          </p>
          <p className="text-xs text-white/60 mt-2 max-w-[260px]">
            Peraturan resmi lingkungan RW — baca daftar & teks lengkap
          </p>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <span className="text-[10px] uppercase tracking-widest text-white/45 font-mono">
            Kel. Padasuka
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-[hsl(40,50%,75%)] group-hover:text-[hsl(40,55%,85%)] transition-colors">
            Baca
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
