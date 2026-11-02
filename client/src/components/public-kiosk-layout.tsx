import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";
import { cn } from "@/lib/utils";

type PublicKioskLayoutProps = {
  children: React.ReactNode;
  title?: string;
  backHref?: string;
  onBack?: () => void;
  variant?: "hero" | "service";
  showFooter?: boolean;
  className?: string;
};

export function PublicKioskLayout({
  children,
  title,
  backHref = "/",
  onBack,
  variant = "service",
  showFooter = true,
  className,
}: PublicKioskLayoutProps) {
  if (variant === "hero") {
    return (
      <div className={cn("min-h-screen flex flex-col surface-kiosk", className)}>
        <header className="px-4 pt-5 pb-2 text-center text-white">
          <div className="flex items-center justify-center gap-2">
            <img
              src={logoGold}
              alt=""
              className="h-8 w-8 object-contain"
              loading="eager"
              aria-hidden
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-accent-muted">
              Portal Warga
            </p>
          </div>
          <h1 className="text-display text-white mt-2">RW 03 Padasuka</h1>
          <p className="text-caption text-white/70 mt-0.5">Kelurahan Padasuka, Kota Cimahi</p>
        </header>
        <main className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full space-y-4">{children}</main>
        {showFooter && <KioskFooter variant="hero" />}
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen flex flex-col bg-background", className)}>
      <header className="sticky top-0 z-10 bg-brand text-brand-foreground shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="touch-target inline-flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden />
            </button>
          ) : (
            <Link href={backHref}>
              <span
                className="touch-target inline-flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
                aria-label="Kembali"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden />
              </span>
            </Link>
          )}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img src={logoGold} alt="" className="w-7 h-7 object-contain flex-shrink-0" aria-hidden />
            <h1 className="text-title truncate">{title}</h1>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">{children}</main>
      {showFooter && <KioskFooter variant="service" />}
    </div>
  );
}

function KioskFooter({ variant }: { variant: "hero" | "service" }) {
  return (
    <footer
      className={cn(
        "py-4 px-4 text-center text-caption",
        variant === "hero" ? "text-white/60" : "text-muted-foreground border-t",
      )}
    >
      <p>Kelurahan Padasuka · RW 03</p>
      {variant === "hero" && (
        <p className="mt-2">
          <Link href="/admin">
            <span className="inline-block px-1 text-[9px] font-medium uppercase tracking-widest text-white/35 hover:text-white/55">
              rw
            </span>
          </Link>
        </p>
      )}
    </footer>
  );
}
