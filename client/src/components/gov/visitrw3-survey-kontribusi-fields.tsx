import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { KontribusiSatuan } from "@shared/visitrw3-kontribusi";
import type { SurveyChecklistItem } from "@shared/visitrw3-survey-checklist";
import { validateSurveyChecklist } from "@shared/visitrw3-survey-checklist";
import {
  formatNominalInput,
  parseNominalInput,
  KONTRIBUSI_SATUAN_LABEL,
  KONTRIBUSI_SATUAN_VALUES,
} from "@/lib/visitrw3-kontribusi";

export type Visitrw3SurveyKontribusiState = {
  kontribusiJumlah: string;
  kontribusiSatuan: KontribusiSatuan;
  tanggalKas: string;
  keteranganKas: string;
  catatanSurvey: string;
  checklist: Record<string, boolean>;
};

export function defaultSurveyKontribusiState(): Visitrw3SurveyKontribusiState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    kontribusiJumlah: "",
    kontribusiSatuan: "bulan",
    tanggalKas: today,
    keteranganKas: "",
    catatanSurvey: "",
    checklist: {},
  };
}

export function surveyKontribusiToBody(
  state: Visitrw3SurveyKontribusiState,
  opts?: { checklistItems?: SurveyChecklistItem[] },
) {
  const checklistErr = validateSurveyChecklist(opts?.checklistItems ?? [], state.checklist);
  if (checklistErr) throw new Error(checklistErr);

  const jumlah = parseNominalInput(state.kontribusiJumlah);
  if (state.kontribusiJumlah.trim() === "") {
    throw new Error("Isi nominal kontribusi (angka, boleh 0 jika gratis)");
  }
  return {
    kontribusiJumlah: jumlah,
    kontribusiSatuan: state.kontribusiSatuan,
    tanggalKas: state.tanggalKas.trim() || null,
    keteranganKas: state.keteranganKas.trim() || null,
    catatanSurvey: state.catatanSurvey.trim() || null,
    checklistSurvey: Object.keys(state.checklist).length ? state.checklist : undefined,
  };
}

type Props = Visitrw3SurveyKontribusiState & {
  onChange: (patch: Partial<Visitrw3SurveyKontribusiState>) => void;
  showCatatan?: boolean;
};

export function Visitrw3SurveyKontribusiFields({
  kontribusiJumlah,
  kontribusiSatuan,
  tanggalKas,
  keteranganKas,
  catatanSurvey,
  onChange,
  showCatatan = true,
}: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-sm font-medium">Kontribusi (ditetapkan saat survey)</p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Nominal (Rp) *</Label>
          <Input
            inputMode="numeric"
            placeholder="0"
            className="tabular-nums"
            value={kontribusiJumlah}
            onChange={(e) => onChange({ kontribusiJumlah: formatNominalInput(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5 sm:w-36">
          <Label className="text-xs">Satuan *</Label>
          <Select
            value={kontribusiSatuan}
            onValueChange={(v) => onChange({ kontribusiSatuan: v as KontribusiSatuan })}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KONTRIBUSI_SATUAN_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {KONTRIBUSI_SATUAN_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Tanggal masuk kas (informasi)</Label>
        <Input type="date" value={tanggalKas} onChange={(e) => onChange({ tanggalKas: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Catatan untuk Kas RW (opsional)</Label>
        <Input
          className="h-9 text-sm"
          value={keteranganKas}
          onChange={(e) => onChange({ keteranganKas: e.target.value })}
          placeholder="Contoh: Kontribusi Visit RW3 — VRW3-..."
        />
      </div>
      {showCatatan && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Catatan survey (opsional)</Label>
          <Textarea
            className="min-h-[52px] text-sm"
            value={catatanSurvey}
            onChange={(e) => onChange({ catatanSurvey: e.target.value })}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
