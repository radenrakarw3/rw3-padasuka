import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

export type ItemMenuRingkas = {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
};

/** Daftar menu sekunder (perpanjang, cek status, panduan) dalam satu kotak. */
export function MenuRingkas({ judul, items }: { judul?: string; items: ItemMenuRingkas[] }) {
  return (
    <div className="space-y-2">
      {judul && <p className="text-sm font-semibold text-muted-foreground px-1">{judul}</p>}
      <div className="divide-y rounded-2xl border bg-card shadow-sm">
        {items.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-[var(--touch-min)] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 first:rounded-t-2xl last:rounded-b-2xl"
          >
            <Icon className="h-5 w-5 flex-shrink-0 text-brand" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{title}</span>
              {description && <span className="block text-sm text-muted-foreground">{description}</span>}
            </span>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
