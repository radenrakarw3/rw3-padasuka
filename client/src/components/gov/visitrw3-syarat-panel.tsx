import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props = {
  tataMasyarakat: string;
  tataKhusus: string;
  setuju: boolean;
  onSetuju: (v: boolean) => void;
  loading?: boolean;
};

export function Visitrw3SyaratPanel({ tataMasyarakat, tataKhusus, setuju, onSetuju, loading }: Props) {
  return (
    <div className="space-y-4">
      <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-3 text-sm whitespace-pre-wrap">
        <div>
          <p className="font-semibold mb-1">Tata tertib masyarakat</p>
          <p className="text-muted-foreground">{tataMasyarakat || "—"}</p>
        </div>
        <div>
          <p className="font-semibold mb-1">Syarat & tata tertib</p>
          <p className="text-muted-foreground">{tataKhusus || "—"}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
        Besaran kontribusi ditetapkan oleh pengurus RW setelah survey. Pembayaran dicatat ke Kas RW.
      </p>

      {loading && <p className="text-sm text-muted-foreground">Memuat pengaturan…</p>}

      <div className="flex items-start gap-2 rounded-lg border p-3">
        <Checkbox
          id="setuju-syarat"
          checked={setuju}
          onCheckedChange={(c) => onSetuju(c === true)}
          disabled={loading}
        />
        <Label htmlFor="setuju-syarat" className="text-sm leading-snug cursor-pointer">
          Saya telah membaca dan menyetujui syarat serta tata tertib di atas.
        </Label>
      </div>
    </div>
  );
}
