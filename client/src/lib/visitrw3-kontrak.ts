import { startOfDay } from "date-fns";
import { parseISO } from "date-fns";

export type KontrakStatusVariant = "default" | "secondary" | "destructive" | "outline";

export function parseKontrakDate(ymd: string): Date {
  return parseISO(`${ymd}T00:00:00`);
}

export function getDaysRemaining(tanggalHabis: string): number {
  const today = startOfDay(new Date());
  const habis = startOfDay(parseKontrakDate(tanggalHabis));
  return Math.ceil((habis.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStatusKontrak(tanggalHabis: string): { label: string; variant: KontrakStatusVariant } {
  const diffDays = getDaysRemaining(tanggalHabis);
  if (diffDays < 0) return { label: "Habis", variant: "destructive" };
  if (diffDays === 0) return { label: "Hari ini", variant: "secondary" };
  if (diffDays <= 7) return { label: `H-${diffDays}`, variant: "secondary" };
  return { label: "Aktif", variant: "default" };
}
