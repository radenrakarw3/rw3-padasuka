import { cn } from "@/lib/utils";

export type BlusukanPanel = "kk" | "anggota" | "kunjungan";

const panels: { id: BlusukanPanel; label: string }[] = [
  { id: "kk", label: "KK" },
  { id: "anggota", label: "Anggota" },
  { id: "kunjungan", label: "Kunjungan" },
];

export function BlusukanPanelNav({
  value,
  onChange,
  anggotaCount,
}: {
  value: BlusukanPanel;
  onChange: (v: BlusukanPanel) => void;
  anggotaCount?: number;
}) {
  return (
    <div className="flex rounded-lg bg-muted/60 p-1 gap-1" role="tablist">
      {panels.map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={value === p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "flex-1 rounded-md py-3 min-h-11 text-sm font-medium transition-colors touch-manipulation",
            value === p.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground active:bg-background/50",
          )}
        >
          {p.label}
          {p.id === "anggota" && anggotaCount != null ? ` (${anggotaCount})` : ""}
        </button>
      ))}
    </div>
  );
}
