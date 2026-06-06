import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KartuKeluarga } from "@shared/schema";
import { parseKkKendaraanData, serializeKkKendaraanData, validateKkKendaraanList } from "@shared/kk-kendaraan";
import {
  statusRumahOptions,
  listrikOptions,
  sumberAirOptions,
  sanitasiWcOptions,
  penghasilanBulananOptions,
  rtOptions,
  kkLabelRwSuggestions,
  jenisKendaraanOptions,
} from "@/lib/constants";
import { X, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  BlusukanCheckRow,
  BlusukanField,
  BlusukanFormSection,
  BlusukanNativeSelect,
  blusukanInputClass,
} from "./blusukan-form-ui";
import { PlatNomorInput } from "@/components/gov/plat-nomor-input";
import {
  emptyKendaraanRow,
  kendaraanWithPlatParts,
  type KendaraanRow,
} from "@/lib/visitrw3-kendaraan";
import { joinPlatNomor, isPlatLengkap } from "@/lib/visitrw3-plat";

export type KkFormValues = {
  nomorKk: string;
  rt: string;
  noUnit: string;
  statusRumah: string;
  listrik: string;
  sumberAir: string;
  sanitasiWc: string;
  penghasilanBulanan: string;
  labelRw: string[];
  kendaraanList: KendaraanRow[];
};

export function parseKkLabels(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

export function serializeKkLabels(labels: string[]): string | null {
  const clean = labels.map((l) => l.trim()).filter(Boolean);
  return clean.length ? JSON.stringify([...new Set(clean)]) : null;
}

export function composeKkAlamat(rt: string | number, noUnit: string): string {
  const rtStr = String(rt).padStart(2, "0");
  return `RT ${rtStr} No. Unit ${noUnit.trim() || "-"}`;
}

function kendaraanRowsFromDb(raw: string | null | undefined): KendaraanRow[] {
  return parseKkKendaraanData(raw).map((k) =>
    kendaraanWithPlatParts({ jenis: k.jenis, plat: k.platNomor }),
  );
}

function kendaraanRowsToDb(rows: KendaraanRow[]): string | null {
  const items = rows
    .map((r) => ({
      jenis: r.jenis.trim(),
      platNomor: joinPlatNomor(r.platParts) || r.plat.trim(),
    }))
    .filter((k) => k.jenis);
  return serializeKkKendaraanData(items);
}

export function mapKkToForm(kk: KartuKeluarga): KkFormValues {
  return {
    nomorKk: kk.nomorKk,
    rt: kk.rt.toString(),
    noUnit: kk.noUnit || "",
    statusRumah: kk.statusRumah,
    listrik: kk.listrik,
    sumberAir: kk.sumberAir,
    sanitasiWc: kk.sanitasiWc,
    penghasilanBulanan: kk.penghasilanBulanan || "",
    labelRw: parseKkLabels(kk.labelRw),
    kendaraanList: kendaraanRowsFromDb(kk.kendaraanData),
  };
}

export function toKkPayload(form: KkFormValues, options?: { anggotaCount?: number; preserve?: KartuKeluarga }) {
  const p = options?.preserve;
  return {
    nomorKk: form.nomorKk,
    rt: parseInt(form.rt, 10),
    noUnit: form.noUnit.trim() || null,
    alamat: composeKkAlamat(form.rt, form.noUnit),
    statusRumah: form.statusRumah,
    jumlahPenghuni: options?.anggotaCount ?? p?.jumlahPenghuni ?? 1,
    kondisiBangunan: p?.kondisiBangunan ?? "Permanen",
    listrik: form.listrik,
    sumberAir: form.sumberAir,
    sanitasiWc: form.sanitasiWc,
    penghasilanBulanan: form.penghasilanBulanan || null,
    penerimaBansos: p?.penerimaBansos ?? false,
    jenisBansos: p?.jenisBansos ?? null,
    layakBansos: p?.layakBansos ?? false,
    kategoriEkonomi: p?.kategoriEkonomi ?? null,
    linkGmaps: p?.linkGmaps ?? null,
    latitude: p?.latitude ?? null,
    longitude: p?.longitude ?? null,
    labelRw: serializeKkLabels(form.labelRw),
    kendaraanData: kendaraanRowsToDb(form.kendaraanList),
  };
}

/** Validasi kendaraan KK sebelum simpan — pesan error atau null. */
export function validateKkFormKendaraan(form: KkFormValues): string | null {
  if (form.kendaraanList.length === 0) return null;
  const items = form.kendaraanList.map((r) => ({
    jenis: r.jenis.trim(),
    platNomor: joinPlatNomor(r.platParts) || r.plat.trim(),
  }));
  const base = validateKkKendaraanList(items);
  if (base) return base;
  for (let i = 0; i < form.kendaraanList.length; i++) {
    if (!isPlatLengkap(form.kendaraanList[i].platParts)) {
      return `Kendaraan #${i + 1}: lengkapi kode daerah, nomor, dan akhiran plat`;
    }
  }
  return null;
}

const penghasilanSelectOptions = ["", ...penghasilanBulananOptions];

export function BlusukanKkFormFields({
  form,
  onChange,
  anggotaCount,
}: {
  form: KkFormValues;
  onChange: (next: KkFormValues) => void;
  anggotaCount: number;
}) {
  const [labelDraft, setLabelDraft] = useState("");
  const set = <K extends keyof KkFormValues>(key: K, value: KkFormValues[K]) =>
    onChange({ ...form, [key]: value });

  const addLabel = (raw: string) => {
    const label = raw.trim();
    if (!label || form.labelRw.includes(label)) return;
    set("labelRw", [...form.labelRw, label]);
    setLabelDraft("");
  };

  const removeLabel = (label: string) => {
    set(
      "labelRw",
      form.labelRw.filter((l) => l !== label),
    );
  };

  const setPunyaKendaraan = (punya: boolean) => {
    if (!punya) {
      onChange({ ...form, kendaraanList: [] });
    } else if (form.kendaraanList.length === 0) {
      onChange({ ...form, kendaraanList: [emptyKendaraanRow()] });
    }
  };

  const updateKendaraan = (index: number, patch: Partial<KendaraanRow>) => {
    const list = [...form.kendaraanList];
    list[index] = kendaraanWithPlatParts({ ...list[index], ...patch });
    set("kendaraanList", list);
  };

  const addKendaraan = () => {
    set("kendaraanList", [...form.kendaraanList, emptyKendaraanRow()]);
  };

  const removeKendaraan = (index: number) => {
    const list = form.kendaraanList.filter((_, i) => i !== index);
    set("kendaraanList", list);
  };

  return (
    <div className="space-y-4">
      <BlusukanFormSection title="Data KK" subtitle="Nomor KK, RT, unit, rumah" defaultOpen>
        <BlusukanField label="Nomor KK">
          <Input
            value={form.nomorKk}
            onChange={(e) => set("nomorKk", e.target.value)}
            className={`${blusukanInputClass} font-mono`}
            inputMode="numeric"
          />
        </BlusukanField>
        <BlusukanField label="RT">
          <BlusukanNativeSelect
            value={form.rt}
            onChange={(v) => set("rt", v)}
            options={rtOptions.map(String)}
            formatOption={(v) => `RT ${v.padStart(2, "0")}`}
          />
        </BlusukanField>
        <BlusukanField label="No. unit / rumah">
          <Input
            value={form.noUnit}
            onChange={(e) => set("noUnit", e.target.value)}
            placeholder="Contoh: 48A, Blok B-12"
            className={blusukanInputClass}
          />
        </BlusukanField>
        <BlusukanField label="Status rumah">
          <BlusukanNativeSelect value={form.statusRumah} onChange={(v) => set("statusRumah", v)} options={statusRumahOptions} />
        </BlusukanField>
        <BlusukanField label="Listrik">
          <BlusukanNativeSelect value={form.listrik} onChange={(v) => set("listrik", v)} options={listrikOptions} />
        </BlusukanField>
        <BlusukanField label="Sumber air">
          <BlusukanNativeSelect value={form.sumberAir} onChange={(v) => set("sumberAir", v)} options={sumberAirOptions} />
        </BlusukanField>
        <BlusukanField label="Sanitasi">
          <BlusukanNativeSelect value={form.sanitasiWc} onChange={(v) => set("sanitasiWc", v)} options={sanitasiWcOptions} />
        </BlusukanField>
        <BlusukanField label="Penghasilan bulanan keluarga">
          <BlusukanNativeSelect
            value={form.penghasilanBulanan}
            onChange={(v) => set("penghasilanBulanan", v)}
            options={penghasilanSelectOptions}
            formatOption={(v) => (v ? v : "Belum diisi")}
          />
        </BlusukanField>
      </BlusukanFormSection>

      <BlusukanFormSection title="Kendaraan keluarga" subtitle="Seperti Visit RW3 — jenis & plat nomor" defaultOpen={false}>
        <BlusukanCheckRow
          id="kk-punya-kendaraan"
          checked={form.kendaraanList.length > 0}
          onCheckedChange={setPunyaKendaraan}
          label="Keluarga punya kendaraan"
        />
        {form.kendaraanList.length > 0 && (
          <div className="space-y-4">
            {form.kendaraanList.map((k, ki) => (
              <div key={ki} className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Kendaraan {ki + 1}</p>
                  {form.kendaraanList.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 text-destructive touch-manipulation"
                      onClick={() => removeKendaraan(ki)}
                      aria-label={`Hapus kendaraan ${ki + 1}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                <BlusukanField label="Jenis kendaraan *">
                  <BlusukanNativeSelect
                    value={k.jenis}
                    onChange={(v) => updateKendaraan(ki, { jenis: v })}
                    options={jenisKendaraanOptions}
                    placeholder="Pilih jenis"
                  />
                </BlusukanField>
                <PlatNomorInput
                  large
                  required
                  idPrefix={`kk-kendaraan-${ki}`}
                  value={k.platParts}
                  onChange={(platParts) => updateKendaraan(ki, { platParts })}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base gap-2 touch-manipulation"
              onClick={addKendaraan}
            >
              <Plus className="h-5 w-5" />
              Tambah kendaraan
            </Button>
          </div>
        )}
      </BlusukanFormSection>

      <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
        <p className="text-sm font-medium">Jumlah anggota</p>
        <p className="text-3xl font-bold tabular-nums">{anggotaCount}</p>
        <p className="text-xs text-muted-foreground">
          Otomatis dari anggota terdaftar — tidak perlu diisi manual.
        </p>
      </div>

      <BlusukanFormSection title="Label internal RW" subtitle="Hanya petugas — warga tidak melihat" defaultOpen={false}>
        {form.labelRw.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.labelRw.map((label) => (
              <Badge key={label} variant="secondary" className="gap-1 pr-1 text-sm py-1">
                {label}
                <button type="button" onClick={() => removeLabel(label)} className="rounded p-1 min-h-8 min-w-8 flex items-center justify-center touch-manipulation">
                  <X className="h-4 w-4" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {kkLabelRwSuggestions
            .filter((s) => !form.labelRw.includes(s))
            .map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                className="h-10 text-sm touch-manipulation"
                onClick={() => addLabel(s)}
              >
                + {s}
              </Button>
            ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder="Label kustom..."
            className={blusukanInputClass}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLabel(labelDraft);
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-12 shrink-0"
            onClick={() => addLabel(labelDraft)}
            disabled={!labelDraft.trim()}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </BlusukanFormSection>
    </div>
  );
}
