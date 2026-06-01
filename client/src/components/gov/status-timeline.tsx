import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

type TimelineStep = {
  id: string;
  label: string;
  description?: string;
  state: "done" | "current" | "upcoming" | "rejected";
};

type StatusTimelineProps = {
  steps: TimelineStep[];
  className?: string;
};

export function StatusTimeline({ steps, className }: StatusTimelineProps) {
  return (
    <ol className={cn("space-y-0", className)} aria-label="Status pengajuan">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const Icon =
          step.state === "done"
            ? CheckCircle2
            : step.state === "rejected"
              ? XCircle
              : Circle;
        return (
          <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[11px] top-6 bottom-0 w-0.5",
                  step.state === "done" ? "bg-success" : "bg-border",
                )}
                aria-hidden
              />
            )}
            <Icon
              className={cn(
                "w-6 h-6 flex-shrink-0 relative z-10",
                step.state === "done" && "text-success",
                step.state === "current" && "text-brand fill-brand/10",
                step.state === "rejected" && "text-destructive",
                step.state === "upcoming" && "text-muted-foreground",
              )}
              aria-hidden
            />
            <div className="pt-0.5 min-w-0">
              <p
                className={cn(
                  "font-medium text-sm",
                  step.state === "upcoming" && "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function buildVisitrw3Timeline(status: string, alasanTolak?: string | null): TimelineStep[] {
  const steps: TimelineStep[] = [
    {
      id: "submitted",
      label: "Pengajuan diterima",
      description: "Data Anda masuk antrian",
      state: "done",
    },
    {
      id: "survey",
      label: "Survey admin",
      description: "Tim RW meninjau kelengkapan",
      state: status === "menunggu_survey" ? "current" : "done",
    },
  ];

  if (status === "disetujui") {
    steps.push({
      id: "approved",
      label: "Disetujui",
      description: "Nomor Visit RW3 aktif",
      state: "done",
    });
  } else if (status === "ditolak") {
    steps.push({
      id: "rejected",
      label: "Ditolak",
      description: alasanTolak || "Lihat alasan di bawah",
      state: "rejected",
    });
  } else {
    steps.push({
      id: "result",
      label: "Keputusan",
      description: "Menunggu hasil survey",
      state: "upcoming",
    });
  }

  return steps;
}
