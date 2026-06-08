import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calcProgressPercent, statusProgramKerjaLabels } from "@shared/program-kerja";
import type { ProgramPublicItem } from "@shared/program-kerja-analytics";
import { getSubProgramDef } from "@shared/program-kerja";

type ProgramSubItemProps = {
  program: ProgramPublicItem;
};

const statusColors: Record<string, string> = {
  rencana: "bg-slate-100 text-slate-700",
  berjalan: "bg-blue-100 text-blue-800",
  selesai: "bg-green-100 text-green-800",
  dibatalkan: "bg-red-100 text-red-800",
};

export function ProgramSubItem({ program }: ProgramSubItemProps) {
  const def = program.subProgram ? getSubProgramDef(program.subProgram) : undefined;
  const progress = program.progressPercent || calcProgressPercent(program.targetNilai, program.capaianNilai);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-brand">{program.namaProgram}</h3>
          {program.deskripsi && (
            <p className="text-sm text-muted-foreground mt-1">{program.deskripsi}</p>
          )}
        </div>
        <Badge className={statusColors[program.status] ?? statusColors.rencana}>
          {statusProgramKerjaLabels[program.status] ?? program.status}
        </Badge>
      </div>

      {program.targetNilai != null && program.targetNilai > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Capaian: {program.capaianNilai ?? 0} / {program.targetNilai}
              {program.satuanTarget ? ` ${program.satuanTarget}` : ""}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-brand rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {def?.ctaHref && def.ctaLabel && (
        <Link href={def.ctaHref}>
          <Button variant="outline" size="sm" className="touch-target">
            {def.ctaLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
