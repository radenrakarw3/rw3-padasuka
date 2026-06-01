import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinPlatNomor, type PlatParts } from "@/lib/visitrw3-plat";

type PlatNomorInputProps = {
  value: PlatParts;
  onChange: (parts: PlatParts) => void;
  idPrefix?: string;
  required?: boolean;
};

export function PlatNomorInput({ value, onChange, idPrefix = "plat", required }: PlatNomorInputProps) {
  const patch = (p: Partial<PlatParts>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        Plat nomor{required ? " *" : ""}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={`${idPrefix}-daerah`}
          className="w-14 text-center uppercase font-semibold shrink-0"
          placeholder="B"
          maxLength={3}
          value={value.daerah}
          onChange={(e) => patch({ daerah: e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase() })}
          aria-label="Kode daerah plat"
        />
        <Input
          id={`${idPrefix}-angka`}
          className="flex-1 min-w-0 text-center font-mono tracking-wider"
          placeholder="1234"
          maxLength={4}
          inputMode="numeric"
          value={value.angka}
          onChange={(e) => patch({ angka: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          aria-label="Nomor plat"
        />
        <Input
          id={`${idPrefix}-belakang`}
          className="w-20 text-center uppercase font-semibold shrink-0"
          placeholder="DZ"
          maxLength={3}
          value={value.belakang}
          onChange={(e) => patch({ belakang: e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase() })}
          aria-label="Akhiran plat"
        />
      </div>
      {joinPlatNomor(value) && (
        <p className="text-[11px] text-muted-foreground font-mono">{joinPlatNomor(value)}</p>
      )}
    </div>
  );
}
