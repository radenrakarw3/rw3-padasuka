import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { KartuKeluarga } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  statusRumahOptions,
  listrikOptions,
  kondisiBangunanOptions,
  sumberAirOptions,
  sanitasiWcOptions,
  jenisBansosOptions,
  penghasilanBulananOptions,
  kategoriEkonomiOptions,
  rtOptions,
} from "@/lib/constants";

export type KkFormValues = {
  nomorKk: string;
  rt: string;
  alamat: string;
  statusRumah: string;
  jumlahPenghuni: string;
  kondisiBangunan: string;
  sumberAir: string;
  sanitasiWc: string;
  listrik: string;
  penerimaBansos: boolean;
  jenisBansos: string;
  penghasilanBulanan: string;
  layakBansos: boolean;
  kategoriEkonomi: string;
  linkGmaps: string;
  latitude: string;
  longitude: string;
};

export function mapKkToForm(kk: KartuKeluarga): KkFormValues {
  return {
    nomorKk: kk.nomorKk,
    rt: kk.rt.toString(),
    alamat: kk.alamat,
    statusRumah: kk.statusRumah,
    jumlahPenghuni: kk.jumlahPenghuni.toString(),
    kondisiBangunan: kk.kondisiBangunan,
    sumberAir: kk.sumberAir,
    sanitasiWc: kk.sanitasiWc,
    listrik: kk.listrik,
    penerimaBansos: kk.penerimaBansos,
    jenisBansos: kk.jenisBansos || "",
    penghasilanBulanan: kk.penghasilanBulanan || "",
    layakBansos: kk.layakBansos || false,
    kategoriEkonomi: kk.kategoriEkonomi || "",
    linkGmaps: kk.linkGmaps || "",
    latitude: kk.latitude || "",
    longitude: kk.longitude || "",
  };
}

export function toKkPayload(form: KkFormValues) {
  return {
    nomorKk: form.nomorKk,
    rt: parseInt(form.rt, 10),
    alamat: form.alamat,
    statusRumah: form.statusRumah,
    jumlahPenghuni: parseInt(form.jumlahPenghuni, 10),
    kondisiBangunan: form.kondisiBangunan,
    sumberAir: form.sumberAir,
    sanitasiWc: form.sanitasiWc,
    listrik: form.listrik,
    penerimaBansos: form.penerimaBansos,
    jenisBansos: form.penerimaBansos ? form.jenisBansos : null,
    penghasilanBulanan: form.penghasilanBulanan || null,
    layakBansos: form.layakBansos,
    kategoriEkonomi: form.kategoriEkonomi || null,
    linkGmaps: form.linkGmaps || null,
    latitude: form.latitude || null,
    longitude: form.longitude || null,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function BlusukanKkFormFields({
  form,
  onChange,
}: {
  form: KkFormValues;
  onChange: (next: KkFormValues) => void;
}) {
  const [rumahOpen, setRumahOpen] = useState(false);
  const [ekonomiOpen, setEkonomiOpen] = useState(true);
  const set = <K extends keyof KkFormValues>(key: K, value: KkFormValues[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">Data utama kartu keluarga.</p>
        <Field label="Nomor KK">
          <Input value={form.nomorKk} onChange={(e) => set("nomorKk", e.target.value)} className="font-mono" />
        </Field>
        <Field label="RT">
          <Select value={form.rt} onValueChange={(v) => set("rt", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rtOptions.map((rt) => (
                <SelectItem key={rt} value={String(rt)}>
                  RT {String(rt).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Alamat lengkap">
          <Textarea value={form.alamat} onChange={(e) => set("alamat", e.target.value)} rows={3} />
        </Field>
        <Field label="Jumlah penghuni">
          <Input
            type="number"
            min={1}
            value={form.jumlahPenghuni}
            onChange={(e) => set("jumlahPenghuni", e.target.value)}
          />
        </Field>
        <Field label="Status rumah">
          <Select value={form.statusRumah} onValueChange={(v) => set("statusRumah", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusRumahOptions.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      <Collapsible open={rumahOpen} onOpenChange={setRumahOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
            <span className="text-sm font-medium">Rumah & sanitasi</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${rumahOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <Field label="Listrik">
            <Select value={form.listrik} onValueChange={(v) => set("listrik", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {listrikOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Kondisi bangunan">
            <Select value={form.kondisiBangunan} onValueChange={(v) => set("kondisiBangunan", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kondisiBangunanOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sumber air">
            <Select value={form.sumberAir} onValueChange={(v) => set("sumberAir", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sumberAirOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sanitasi / WC">
            <Select value={form.sanitasiWc} onValueChange={(v) => set("sanitasiWc", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sanitasiWcOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Link Google Maps">
            <Input value={form.linkGmaps} onChange={(e) => set("linkGmaps", e.target.value)} placeholder="https://..." />
          </Field>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={ekonomiOpen} onOpenChange={setEkonomiOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
            <span className="text-sm font-medium">Ekonomi & bansos</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${ekonomiOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <Field label="Penghasilan bulanan keluarga">
            <Select
              value={form.penghasilanBulanan || "_"}
              onValueChange={(v) => set("penghasilanBulanan", v === "_" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih rentang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Belum diisi</SelectItem>
                {penghasilanBulananOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Kategori ekonomi">
            <Select
              value={form.kategoriEkonomi || "_"}
              onValueChange={(v) => set("kategoriEkonomi", v === "_" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Belum diisi</SelectItem>
                {kategoriEkonomiOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center gap-2">
            <Checkbox
              id="blusukan-bansos"
              checked={form.penerimaBansos}
              onCheckedChange={(c) => set("penerimaBansos", c === true)}
            />
            <Label htmlFor="blusukan-bansos" className="text-sm font-normal">
              Penerima bansos
            </Label>
          </div>
          {form.penerimaBansos && (
            <Field label="Jenis bansos">
              <Select value={form.jenisBansos} onValueChange={(v) => set("jenisBansos", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  {jenisBansosOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="blusukan-layak"
              checked={form.layakBansos}
              onCheckedChange={(c) => set("layakBansos", c === true)}
            />
            <Label htmlFor="blusukan-layak" className="text-sm font-normal">
              Layak bansos (penilaian RW)
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
