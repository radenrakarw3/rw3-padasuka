import { Clock, CheckCircle2, XCircle, Phone, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type GovStatusVariant =
  | "menunggu_survey"
  | "disetujui"
  | "ditolak"
  | "ready"
  | "unavailable"
  | "info";

const config: Record<
  GovStatusVariant,
  { label: string; className: string; icon: typeof Clock }
> = {
  menunggu_survey: {
    label: "Menunggu survey",
    className: "bg-warning/15 text-warning-foreground border-warning/30",
    icon: Clock,
  },
  disetujui: {
    label: "Disetujui",
    className: "bg-success/15 text-success border-success/40",
    icon: CheckCircle2,
  },
  ditolak: {
    label: "Ditolak",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    icon: XCircle,
  },
  ready: {
    label: "Siap dihubungi",
    className: "bg-success/15 text-success border-success/40",
    icon: Phone,
  },
  unavailable: {
    label: "Nomor belum diatur",
    className: "bg-muted text-muted-foreground border-border",
    icon: AlertCircle,
  },
  info: {
    label: "Informasi",
    className: "bg-info/15 text-info border-info/30",
    icon: AlertCircle,
  },
};

type StatusBadgeProps = {
  variant: GovStatusVariant;
  label?: string;
  className?: string;
};

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const c = config[variant];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        c.className,
        className,
      )}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {label ?? c.label}
    </span>
  );
}

export function visitrw3StatusVariant(status: string): GovStatusVariant {
  if (status === "disetujui") return "disetujui";
  if (status === "ditolak") return "ditolak";
  return "menunggu_survey";
}
