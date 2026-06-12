import { Calendar, ScrollText, User, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { BlusukanQuest } from "@shared/schema";
import { cn } from "@/lib/utils";

function deadlineMeta(deadline: string): { label: string; tone: "overdue" | "urgent" | "normal" | "done" } {
  if (!deadline) return { label: "—", tone: "normal" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + "T00:00:00");
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Terlambat ${Math.abs(diff)} hari`, tone: "overdue" };
  if (diff === 0) return { label: "Harus selesai hari ini", tone: "urgent" };
  if (diff === 1) return { label: "Besok deadline", tone: "urgent" };
  return { label: `${diff} hari lagi`, tone: "normal" };
}

const toneBorder: Record<string, string> = {
  overdue: "border-red-500/70 shadow-[0_0_12px_rgba(239,68,68,0.25)]",
  urgent: "border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
  normal: "border-[hsl(40,45%,55%)]/50",
  done: "border-emerald-600/40 opacity-80",
};

export function QuestCard({
  quest,
  archived = false,
  onClick,
}: {
  quest: BlusukanQuest;
  archived?: boolean;
  onClick?: () => void;
}) {
  const dl = archived ? { label: "Selesai", tone: "done" as const } : deadlineMeta(quest.deadline);
  const wargaLabel = quest.targetWargaNama?.trim() || "—";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border-2 bg-gradient-to-br from-[hsl(163,55%,14%)] to-[hsl(163,50%,10%)] p-4 transition-transform active:scale-[0.98]",
        toneBorder[dl.tone],
        archived && "from-muted/30 to-muted/20 border-dashed",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
            archived
              ? "border-emerald-600/40 bg-emerald-950/40 text-emerald-400"
              : "border-[hsl(40,45%,55%)]/40 bg-[hsl(40,45%,55%)]/10 text-[hsl(40,55%,65%)]",
          )}
        >
          {archived ? <CheckCircle2 className="h-5 w-5" /> : <ScrollText className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(40,45%,55%)]">
              {archived ? "Quest selesai" : "Quest aktif"}
            </span>
            {!archived && dl.tone === "overdue" && (
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            )}
          </div>
          <h3 className="font-bold text-white text-base leading-tight mt-0.5 line-clamp-2">{quest.judul}</h3>
          <p className="text-xs text-white/60 mt-1 line-clamp-2">{quest.perihal}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/25 px-2 py-1 text-white/80">
            <User className="h-3 w-3 text-[hsl(40,45%,55%)]" />
            {wargaLabel}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1",
              dl.tone === "overdue"
                ? "bg-red-950/50 text-red-300"
                : dl.tone === "urgent"
                  ? "bg-amber-950/50 text-amber-300"
                  : "bg-black/25 text-white/80",
            )}
          >
            {archived ? <CheckCircle2 className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
            {archived && quest.selesaiAt
              ? new Date(quest.selesaiAt).toLocaleDateString("id-ID")
              : new Date(quest.deadline + "T00:00:00").toLocaleDateString("id-ID")}
            {!archived && (
              <span className="text-white/50">· {dl.label}</span>
            )}
          </span>
        </div>

        {!archived && (
          <div>
            <div className="flex justify-between text-[10px] text-white/50 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Progres
              </span>
              <span className="font-mono text-[hsl(40,55%,65%)]">{quest.progres}%</span>
            </div>
            <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[hsl(163,55%,35%)] to-[hsl(40,45%,55%)] transition-all"
                style={{ width: `${Math.min(100, Math.max(0, quest.progres))}%` }}
              />
            </div>
          </div>
        )}

        {archived && quest.catatanSelesai && (
          <p className="text-[11px] text-white/50 italic line-clamp-2">"{quest.catatanSelesai}"</p>
        )}
      </div>
    </button>
  );
}
