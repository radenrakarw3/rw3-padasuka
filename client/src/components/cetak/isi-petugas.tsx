import { PenLine } from "lucide-react";

const TAUTAN = {
  visit: [
    { label: "Kontrakan", href: "/visitrw3/pengajuan?jenis=kontrak&petugas=1" },
    { label: "Kost", href: "/visitrw3/pengajuan?jenis=kost&petugas=1" },
  ],
  rw3biz: [{ label: "Usaha", href: "/rw3biz/pengajuan?petugas=1" }],
} as const;

/** Untuk warga yang tidak bisa mengisi sendiri: petugas mengetik ulang formulir kertas lewat form publik. */
export function TombolIsiPetugas({ product }: { product: "visit" | "rw3biz" }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-1 text-muted-foreground"><PenLine className="h-4 w-4" /> Isi atas nama warga:</span>
      {TAUTAN[product].map((t) => (
        <a key={t.href} href={t.href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-md border bg-white px-3 font-medium hover:bg-muted sm:min-h-0 sm:px-2.5 sm:py-1">{t.label}</a>
      ))}
    </div>
  );
}
