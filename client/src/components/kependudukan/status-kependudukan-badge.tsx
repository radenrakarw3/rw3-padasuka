import { Badge } from "@/components/ui/badge";
import { labelStatusKependudukan } from "@shared/kependudukan-peristiwa";
import { cn } from "@/lib/utils";

const VARIANT: Record<string, string> = {
  Aktif: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Lahir: "bg-sky-100 text-sky-800 border-sky-200",
  "Pindah Masuk": "bg-blue-100 text-blue-800 border-blue-200",
  "Pindah Keluar": "bg-amber-100 text-amber-900 border-amber-200",
  Meninggal: "bg-slate-200 text-slate-800 border-slate-300",
};

export function StatusKependudukanBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const label = labelStatusKependudukan(status);
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium", VARIANT[label] ?? "", className)}
    >
      {label}
    </Badge>
  );
}
