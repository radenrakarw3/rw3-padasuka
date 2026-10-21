import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const TERMIN = [
  { value: "1", label: "1 bulan" },
  { value: "3", label: "3 bulan" },
  { value: "6", label: "6 bulan" },
  { value: "12", label: "1 tahun" },
];

/** Pilihan lama berlaku izin. Tanggal bayar dicatat pengurus saat uang diterima. */
export function PilihTermin({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Mau bayar untuk berapa lama?</Label>
      <div className="grid grid-cols-2 gap-2">
        {TERMIN.map((t) => (
          <Button
            key={t.value}
            type="button"
            variant={value === t.value ? "default" : "outline"}
            className="h-12 text-base"
            aria-pressed={value === t.value}
            onClick={() => onChange(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Izin mulai berlaku sejak tanggal Anda membayar ke pengurus RW saat survey.
      </p>
    </div>
  );
}
