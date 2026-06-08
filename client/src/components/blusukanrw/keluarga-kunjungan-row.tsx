import { Link } from "wouter";
import { ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { blusukanKkHref } from "@/lib/blusukan-navigation";

export type KeluargaKunjunganRow = {
  kkId: number;
  nomorKk: string;
  rt: number;
  noUnit: string | null;
  alamat: string;
  kepalaKeluarga: string | null;
  jumlahAnggota: number;
  completionPercent: number;
  belumVerifikasi: number;
  anggotaBermasalah: number;
  kunjunganTerakhir: { hasil: string; createdAt: string | null } | null;
  perluKunjungan: boolean;
};

type StatusTone = "amber" | "orange" | "green" | "slate";

function kunjunganStatus(row: KeluargaKunjunganRow): { label: string; tone: StatusTone } {
  if (!row.kunjunganTerakhir) return { label: "Belum pernah", tone: "amber" };
  const hasil = row.kunjunganTerakhir.hasil;
  if (hasil === "selesai") return { label: "Selesai", tone: "green" };
  if (hasil === "perlu_ulang") return { label: "Perlu ulang", tone: "orange" };
  if (hasil === "tidak_ada") return { label: "Tidak ada", tone: "slate" };
  return { label: "Belum selesai", tone: "amber" };
}

const toneClass: Record<StatusTone, string> = {
  amber: "bg-amber-100 text-amber-900 border-amber-200",
  orange: "bg-orange-100 text-orange-900 border-orange-200",
  green: "bg-emerald-100 text-emerald-900 border-emerald-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatLokasi(row: KeluargaKunjunganRow) {
  const rt = `RT ${String(row.rt).padStart(2, "0")}`;
  const unit = row.noUnit?.trim();
  if (unit) return `${rt} · Unit ${unit}`;
  return rt;
}

export function KeluargaKunjunganRowCard({
  row,
  index,
  highlightNext,
}: {
  row: KeluargaKunjunganRow;
  index?: number;
  highlightNext?: boolean;
}) {
  const status = kunjunganStatus(row);
  const lokasi = formatLokasi(row);

  return (
    <Link href={blusukanKkHref(row.kkId, "kunjungan")}>
      <article
        className={cn(
          "block rounded-xl border bg-card p-4 transition-colors active:bg-muted/40 touch-manipulation",
          highlightNext
            ? "border-[hsl(163,55%,22%)] ring-2 ring-[hsl(163,55%,22%)]/20 shadow-sm"
            : row.perluKunjungan
              ? "border-amber-200/80"
              : "border-border",
        )}
      >
        {highlightNext && (
          <p className="text-[11px] font-semibold text-[hsl(163,55%,22%)] mb-2 uppercase tracking-wide">
            Kunjungi berikutnya
          </p>
        )}

        <div className="flex items-start gap-3">
          {index != null && (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                highlightNext ? "bg-[hsl(163,55%,22%)] text-white" : "bg-muted text-foreground",
              )}
            >
              {index}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold leading-snug truncate">
                  {row.kepalaKeluarga || "Kepala keluarga belum diisi"}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{row.alamat}</p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground mt-0.5" />
            </div>

            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{lokasi}</span>
              <span aria-hidden>·</span>
              <span>{row.jumlahAnggota} anggota</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                  toneClass[status.tone],
                )}
              >
                {status.label}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                Data {row.completionPercent}%
                {row.anggotaBermasalah > 0 ? ` · ${row.anggotaBermasalah} perlu perbaikan` : ""}
                {row.belumVerifikasi > 0 ? ` · ${row.belumVerifikasi} belum verifikasi` : ""}
              </span>
            </div>

            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  row.completionPercent >= 100 ? "bg-emerald-500" : "bg-[hsl(163,55%,35%)]",
                )}
                style={{ width: `${Math.min(100, row.completionPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
