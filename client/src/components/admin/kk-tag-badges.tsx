import { cn } from "@/lib/utils";
import { kategoriTag, type KkTagKategori } from "@shared/kk-label-rw";

const TONE: Record<KkTagKategori["tone"] | "custom", string> = {
  amber: "border-amber-300/80 bg-amber-50 text-amber-900",
  rose: "border-rose-300/80 bg-rose-50 text-rose-900",
  emerald: "border-emerald-300/80 bg-emerald-50 text-emerald-900",
  sky: "border-sky-300/80 bg-sky-50 text-sky-900",
  violet: "border-violet-300/80 bg-violet-50 text-violet-900",
  slate: "border-slate-300/80 bg-slate-100 text-slate-800",
  orange: "border-orange-300/80 bg-orange-50 text-orange-900",
  teal: "border-teal-300/80 bg-teal-50 text-teal-900",
  custom: "border-border bg-muted text-foreground",
};

export function KkTagBadge({
  tag,
  onRemove,
  className,
}: {
  tag: string;
  onRemove?: () => void;
  className?: string;
}) {
  const kat = kategoriTag(tag);
  const tone = kat?.tone ?? "custom";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight",
        TONE[tone],
        className,
      )}
      title={kat ? `${kat.label}: ${tag}` : tag}
    >
      <span className="min-w-0 truncate">{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 rounded-full px-0.5 opacity-70 hover:opacity-100"
          aria-label={`Hapus tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

export function KkTagList({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((t) => (
        <KkTagBadge key={t} tag={t} />
      ))}
    </div>
  );
}
