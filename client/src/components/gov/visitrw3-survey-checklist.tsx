import { Checkbox } from "@/components/ui/checkbox";
import type { SurveyChecklistItem } from "@shared/visitrw3-survey-checklist";
import {
  countChecklistDone,
  groupChecklistByKategori,
  sdgBadges,
  SDG_SINGKAT,
} from "@shared/visitrw3-survey-checklist";
import { cn } from "@/lib/utils";
import { ClipboardCheck, Leaf } from "lucide-react";

type Props = {
  title?: string;
  subtitle?: string;
  items: SurveyChecklistItem[];
  checked: Record<string, boolean>;
  onChange: (id: string, value: boolean) => void;
};

function SdgPills({ item }: { item: SurveyChecklistItem }) {
  const badges = sdgBadges(item);
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {badges.map((n) => (
        <span
          key={n}
          className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-medium border border-emerald-500/20"
        >
          {SDG_SINGKAT[n] ?? `SDG ${n}`}
        </span>
      ))}
    </div>
  );
}

export function Visitrw3SurveyChecklist({
  title = "Checklist survey",
  subtitle = "Tanyakan ke pemilik — centang hanya setelah terkonfirmasi di lapangan",
  items,
  checked,
  onChange,
}: Props) {
  const done = countChecklistDone(items, checked);
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const complete = done === items.length && items.length > 0;
  const groups = groupChecklistByKategori(items);
  let nomor = 0;

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed p-3 space-y-3 transition-colors",
        complete ? "border-green-500/40 bg-green-500/[0.04]" : "border-primary/25 bg-primary/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2 min-w-0">
          <ClipboardCheck
            className={cn("w-5 h-5 shrink-0 mt-0.5", complete ? "text-green-600" : "text-[hsl(163,55%,22%)]")}
          />
          <div>
            <p className="text-sm font-semibold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <Leaf className="w-3 h-3 shrink-0" />
              Selaras SDGs — limbah, sanitasi, lingkungan & ketertiban warga
            </p>
          </div>
        </div>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full shrink-0",
            complete ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground",
          )}
        >
          {done}/{items.length}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", complete ? "bg-green-500" : "bg-[hsl(163,55%,22%)]")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-4 sm:max-h-[min(52vh,28rem)] sm:overflow-y-auto sm:pr-0.5">
        {groups.map((group) => (
          <div key={group.kategori} className="space-y-2">
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wide px-1 sm:text-[11px]",
                group.kategori === "lingkungan"
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-muted-foreground",
              )}
            >
              {group.label}
            </p>
            <div className="space-y-2">
              {group.items.map((item) => {
                nomor += 1;
                const isChecked = Boolean(checked[item.id]);
                const isLingkungan = item.kategori === "lingkungan";
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex min-h-12 gap-3 rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/30 active:bg-muted/40",
                      isChecked
                        ? "border-primary/35 bg-background shadow-sm"
                        : isLingkungan
                          ? "border-amber-500/25 bg-amber-500/[0.03]"
                          : "border-border/60 bg-background/60",
                    )}
                  >
                    <Checkbox
                      className="mt-0.5 h-5 w-5 sm:h-4 sm:w-4"
                      checked={isChecked}
                      onCheckedChange={(v) => onChange(item.id, Boolean(v))}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        <span className="text-muted-foreground font-normal mr-1.5">{nomor}.</span>
                        {item.label}
                      </p>
                      {item.hint && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.hint}</p>
                      )}
                      <SdgPills item={item} />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
