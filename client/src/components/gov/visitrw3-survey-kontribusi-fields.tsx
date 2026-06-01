import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type Visitrw3SurveyKontribusiState = {
  kontribusiJumlah: string;
  tanggalKas: string;
  keteranganKas: string;
  catatanSurvey: string;
};

export function defaultSurveyKontribusiState(): Visitrw3SurveyKontribusiState {
  const today = new Date().toISOString().slice(0, 10);
  return { kontribusiJumlah: "", tanggalKas: today, keteranganKas: "", catatanSurvey: "" };
}

export function surveyKontribusiToBody(state: Visitrw3SurveyKontribusiState) {
  const jumlah = parseInt(state.kontribusiJumlah.replace(/\D/g, ""), 10);
  if (Number.isNaN(jumlah) || state.kontribusiJumlah.trim() === "") {
    throw new Error("Jumlah kontribusi wajib diisi (angka, boleh 0 jika gratis)");
  }
  if (!state.tanggalKas) throw new Error("Tanggal masuk kas wajib diisi");
  return {
    kontribusiJumlah: jumlah,
    tanggalKas: state.tanggalKas,
    keteranganKas: state.keteranganKas.trim() || null,
    catatanSurvey: state.catatanSurvey.trim() || null,
  };
}

type Props = Visitrw3SurveyKontribusiState & {
  onChange: (patch: Partial<Visitrw3SurveyKontribusiState>) => void;
  showCatatan?: boolean;
};

export function Visitrw3SurveyKontribusiFields({
  kontribusiJumlah,
  tanggalKas,
  keteranganKas,
  catatanSurvey,
  onChange,
  showCatatan = true,
}: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-sm font-medium">Kontribusi (ditetapkan saat survey)</p>
      <p className="text-xs text-muted-foreground">
        Nominal dicatat sebagai pemasukan Kas RW. Lihat tarif di Pengaturan Visit RW3 sebagai panduan.
      </p>
      <div className="space-y-2">
        <Label>Jumlah kontribusi (Rp) *</Label>
        <Input
          inputMode="numeric"
          placeholder="0 jika tidak ada iuran"
          value={kontribusiJumlah}
          onChange={(e) => onChange({ kontribusiJumlah: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Tanggal masuk kas *</Label>
        <Input type="date" value={tanggalKas} onChange={(e) => onChange({ tanggalKas: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Keterangan kas (opsional)</Label>
        <Input
          value={keteranganKas}
          onChange={(e) => onChange({ keteranganKas: e.target.value })}
          placeholder="Contoh: Kontribusi Visit RW3 — VRW3-..."
        />
      </div>
      {showCatatan && (
        <div className="space-y-2">
          <Label>Catatan survey (opsional)</Label>
          <Textarea value={catatanSurvey} onChange={(e) => onChange({ catatanSurvey: e.target.value })} rows={2} />
        </div>
      )}
    </div>
  );
}
