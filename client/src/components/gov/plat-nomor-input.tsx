import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinPlatNomor, type PlatParts } from "@/lib/visitrw3-plat";

type PlatNomorInputProps = {
  value: PlatParts;
  onChange: (parts: PlatParts) => void;
  idPrefix?: string;
  required?: boolean;
  /** Input lebih besar untuk form mobile (Blusukan). */
  large?: boolean;
};

export function PlatNomorInput({ value, onChange, idPrefix = "plat", required, large }: PlatNomorInputProps) {
  const patch = (p: Partial<PlatParts>) => onChange({ ...value, ...p });
  const inputClass = large
    ? "h-12 text-base rounded-lg"
    : "";
  const daerahClass = large ? "w-16" : "w-14";
  const belakangClass = large ? "w-24" : "w-20";

  return (
    <div className="space-y-1.5">
      <Label className={large ? "text-sm" : "text-xs"}>
        Plat nomor{required ? " *" : ""}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={`${idPrefix}-daerah`}
          className={`${daerahClass} text-center uppercase font-semibold shrink-0 ${inputClass}`}
          placeholder="B"
          maxLength={3}
          value={value.daerah}
          onChange={(e) => patch({ daerah: e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase() })}
          aria-label="Kode daerah plat"
        />
        <Input
          id={`${idPrefix}-angka`}
          className={`flex-1 min-w-0 text-center font-mono tracking-wider ${inputClass}`}
          placeholder="1234"
          maxLength={4}
          inputMode="numeric"
          value={value.angka}
          onChange={(e) => patch({ angka: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          aria-label="Nomor plat"
        />
        <Input
          id={`${idPrefix}-belakang`}
          className={`${belakangClass} text-center uppercase font-semibold shrink-0 ${inputClass}`}
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
