import { Link } from "wouter";
import { rw3lawKategoriLabels } from "@/lib/constants";
import { formatTanggalHukum } from "@/lib/rw3law-format";
import { cn } from "@/lib/utils";
import { rw3lawDetailPath } from "@/pages/public/rw3law/paths";
import { formatNomorPeraturan } from "@shared/rw3law-archive";
import type { Rw3lawRevisiRingkas } from "@shared/rw3law-archive";

export type Rw3lawPublicListItem = {
  id: number;
  judul: string;
  slug: string;
  kategori: string;
  versi: string | null;
  tanggalBerlaku: string | null;
  rtAsal: number | null;
  cuplikan: string;
  nomorPeraturan?: number | null;
  tahunNomor?: number | null;
  revisiDari?: Rw3lawRevisiRingkas | null;
  dicabutAt?: Date | string | null;
};

const TABLE_GRID =
  "grid grid-cols-[5.25rem_minmax(0,1fr)_4.75rem_4.25rem] sm:grid-cols-[6.5rem_minmax(0,1fr)_5.5rem_5rem] md:grid-cols-[7rem_minmax(0,1fr)_6.5rem_5.75rem] gap-x-2 sm:gap-x-3 items-center";

function nomorBerkas(d: Rw3lawPublicListItem) {
  const n = formatNomorPeraturan(d.nomorPeraturan, d.tahunNomor);
  return n ?? `RW3LAW-${String(d.id).padStart(4, "0")}`;
}

function formatTanggalSingkat(tanggal: string | Date | null | undefined) {
  if (!tanggal) return "—";
  const iso = typeof tanggal === "string" ? tanggal : tanggal.toISOString();
  const penuh = formatTanggalHukum(iso.includes("T") ? iso : `${iso.slice(0, 10)}`);
  const parts = penuh.split(" ");
  if (parts.length >= 3) return `${parts[0]} ${parts[1]} ${parts[2]}`;
  return penuh;
}

type Props = {
  items: Rw3lawPublicListItem[];
  variant: "berlaku" | "dicabut";
  emptyMessage: string;
};

export function Rw3lawRegulationTable({ items, variant, emptyMessage }: Props) {
  const isDicabut = variant === "dicabut";
  const dateLabel = isDicabut ? "Dicabut" : "Berlaku";

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "px-8 py-10 text-center font-serif text-sm",
          isDicabut ? "bg-[#f5f3ef] text-[#6b6b6b] border border-[#e5e0d5]" : "bg-[#fffef9] text-[#4a4a4a] border border-[#d4cfc4]",
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-sm border",
        isDicabut ? "border-[#e5e0d5] bg-[#f5f3ef]/80" : "border-[#d4cfc4] bg-[#fffef9]",
      )}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[320px] sm:min-w-[520px]">
          <div
            className={cn(
              TABLE_GRID,
              "text-[9px] sm:text-[10px] uppercase tracking-wide sm:tracking-widest font-semibold px-2 sm:px-3 py-3",
              isDicabut ? "bg-[#6b6b6b] text-[#eceae4]" : "bg-[#1a2744] text-[#e8e4dc]",
            )}
          >
            <div className="pr-1">No. Peraturan</div>
            <div className="pr-1 min-w-0">Judul</div>
            <div className="text-center leading-tight px-0.5">Kategori</div>
            <div className="text-right leading-tight pl-0.5 whitespace-nowrap">{dateLabel}</div>
          </div>
          <ul className={cn("divide-y", isDicabut ? "divide-[#ddd8ce]" : "divide-[#e5e0d5]")}>
            {items.map((d, idx) => (
              <li key={d.id}>
                <Link
                  href={rw3lawDetailPath(d.slug)}
                  className={cn(
                    "block transition-colors px-2 sm:px-3 py-3.5",
                    isDicabut ? "hover:bg-[#ebe6dc]" : "hover:bg-[#f0ebe3]",
                    idx % 2 === 1 && (isDicabut ? "bg-[#f0ebe3]/60" : "bg-[#faf8f4]"),
                  )}
                >
                  <div className={TABLE_GRID}>
                    <div
                      className={cn(
                        "font-serif text-[10px] sm:text-xs font-semibold tabular-nums leading-tight pr-1",
                        isDicabut ? "text-[#5c5c5c]" : "text-[#1a2744]",
                      )}
                    >
                      {nomorBerkas(d)}
                    </div>
                    <div className="min-w-0 pr-2">
                      <p
                        className={cn(
                          "font-serif text-[13px] sm:text-[15px] font-semibold leading-snug line-clamp-2",
                          isDicabut ? "text-[#4a4a4a]" : "text-[#1a2744]",
                        )}
                      >
                        {d.judul}
                      </p>
                      {d.revisiDari && (
                        <p className="text-[10px] text-[#5c5c5c] mt-1 line-clamp-1">
                          Mengubah {d.revisiDari.label}
                        </p>
                      )}
                      {d.versi && (
                        <p className="text-[10px] text-[#6b6b6b] mt-0.5">Versi {d.versi}</p>
                      )}
                      {isDicabut && (
                        <p className="text-[10px] uppercase tracking-wider text-[#8b4513] mt-1">
                          Tidak berlaku
                        </p>
                      )}
                    </div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#5c5c5c] text-center leading-tight px-0.5 line-clamp-2">
                      {rw3lawKategoriLabels[d.kategori] ?? d.kategori}
                    </div>
                    <div className="text-[10px] sm:text-xs font-serif text-[#4a4a4a] text-right tabular-nums leading-tight pl-0.5 whitespace-nowrap">
                      {formatTanggalSingkat(isDicabut ? d.dicabutAt : d.tanggalBerlaku)}
                    </div>
                  </div>
                  <p className="font-serif text-xs text-[#6b6b6b] mt-2 line-clamp-2 sm:hidden border-t border-[#e5e0d5]/80 pt-2">
                    {d.cuplikan}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
