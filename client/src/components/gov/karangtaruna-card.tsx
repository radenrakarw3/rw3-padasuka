import { Link } from "wouter";
import { ChevronRight, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { KARANGTARUNA_ROUTES } from "@/lib/karangtaruna-routes";

type KarangtarunaCardProps = {
  href?: string;
  className?: string;
};

/** Kartu premium landing — motif energik pemuda (Karang Taruna). */
export function KarangtarunaCard({ href = KARANGTARUNA_ROUTES.hub, className }: KarangtarunaCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block relative overflow-hidden rounded-2xl",
        "min-h-[148px] p-5",
        "border border-[hsl(190,60%,45%)]/45",
        "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]",
        "transition-all duration-300",
        "hover:shadow-[0_20px_48px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]",
        "hover:-translate-y-0.5 hover:border-[hsl(190,65%,55%)]/60",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-muted",
        className,
      )}
      aria-label="Karang Taruna — pendataan pemuda RW 03"
    >
      {/* Base — energik: hijau tua → teal muda */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(163, 48%, 14%) 0%, hsl(195, 55%, 20%) 50%, hsl(163, 42%, 16%) 100%)",
        }}
        aria-hidden
      />
      {/* Sheen teal / kuning */}
      <div
        className="absolute inset-0 opacity-40 group-hover:opacity-55 transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(118deg, transparent 0%, hsl(190, 60%, 50%) / 0.18 36%, hsl(45, 80%, 65%) / 0.22 50%, transparent 64%)",
        }}
        aria-hidden
      />
      {/* Ornamen sudut */}
      <div
        className="absolute -right-10 -top-10 w-36 h-36 rounded-full border border-[hsl(190,55%,55%)]/25"
        aria-hidden
      />
      <div
        className="absolute -right-2 -bottom-14 w-44 h-44 rounded-full border border-[hsl(45,70%,60%)]/15"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col h-full min-h-[108px] justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-8 rounded-md bg-gradient-to-br from-[hsl(190,60%,68%)] to-[hsl(195,50%,32%)] shadow-inner flex items-center justify-center border border-[hsl(190,55%,80%)]/30">
              <Users className="w-4 h-4 text-[hsl(195,45%,18%)]" aria-hidden />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.35em] text-[hsl(45,60%,72%)] font-medium">
                Pemuda
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/80 font-semibold">
                RW 03 Padasuka
              </p>
            </div>
          </div>
          <Sparkles
            className="w-5 h-5 text-[hsl(45,70%,68%)]/75 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
            aria-hidden
          />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[hsl(45,55%,70%)] mb-1">
            Pendataan Anggota
          </p>
          <p className="text-[2rem] leading-none font-extrabold tracking-tight text-white drop-shadow-sm">
            Karang<span className="text-[hsl(45,72%,66%)]"> Taruna</span>
          </p>
          <p className="text-xs text-white/60 mt-2 max-w-[260px]">
            Daftarkan diri, ceritakan skill & potensimu — biar bisa difasilitasi RW 03
          </p>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <span className="text-[10px] uppercase tracking-widest text-white/45 font-mono">
            Kel. Padasuka
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-[hsl(45,60%,75%)] group-hover:text-[hsl(45,65%,85%)] transition-colors">
            Gabung
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
