import { Link } from "wouter";
import { ArrowLeft, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

type Rw3lawLayoutProps = {
  children: React.ReactNode;
  title?: string;
  backHref?: string;
  subtitle?: string;
  className?: string;
};

export function Rw3lawLayout({
  children,
  title = "RW3LAW",
  backHref = "/",
  subtitle = "Peraturan Lingkungan · RW 03 Padasuka",
  className,
}: Rw3lawLayoutProps) {
  return (
    <div className={cn("min-h-screen flex flex-col rw3law-court", className)}>
      <header className="bg-[#1a2744] text-white border-b-4 border-[#8b7355]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={backHref}
            className="touch-target inline-flex items-center justify-center rounded p-1.5 hover:bg-white/10 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <img src={logoGold} alt="" className="w-8 h-8 object-contain opacity-90" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#c9b896] font-medium truncate">
              {subtitle}
            </p>
            <h1 className="font-serif text-lg font-semibold tracking-wide truncate">{title}</h1>
          </div>
          <Scale className="w-6 h-6 text-[#c9b896] flex-shrink-0" aria-hidden />
        </div>
      </header>

      <main className="flex-1 bg-[#f4f1ea]">
        <div className="max-w-3xl mx-auto px-4 py-6 w-full">{children}</div>
      </main>

      <footer className="bg-[#1a2744] text-[#a8b4c8] text-center text-[10px] uppercase tracking-widest py-3 px-4">
        RW 03 Kelurahan Padasuka · Peraturan resmi lingkungan
      </footer>
    </div>
  );
}
