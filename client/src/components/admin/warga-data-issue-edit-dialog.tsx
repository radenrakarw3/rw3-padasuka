import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ExternalLink, Loader2 } from "lucide-react";
import type { Warga } from "@shared/schema";
import {
  applyKategoriUmurDefaults,
  getKategoriUmurDef,
  resolveKategoriUmur,
} from "@shared/kategori-umur";
import {
  detectWargaDataIssues,
  WARGA_DATA_ISSUE_DEFS,
  type WargaDataIssueId,
  type WargaIssueSlice,
} from "@shared/warga-data-issues";
import {
  getWargaAge,
  KESULITAN_AKTIVITAS_OPTIONS,
  mapDisabilitasToKesulitan,
  mapKesulitanToDisabilitas,
  needsPendidikan,
  needsWhatsapp,
} from "@shared/warga-form-tier";
import {
  WG_DOMAIN_LEVEL_OPTIONS,
  needsCrvsDocuments,
  needsPekerjaanDetail,
  needsStatusAngkatanKerja,
  hasKesulitanFungsional,
} from "@shared/warga-international";
import { computeWargaCompleteness } from "@shared/profile-completeness";
import { pekerjaanLegacyOptions } from "@shared/pekerjaan-options";
import {
  mapWargaToForm,
  toWargaPayload,
  type WargaFormValues,
} from "@/components/kependudukan/warga-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  pendidikanOptions,
  penghasilanBulananOptions,
  statusPekerjaanOptions,
} from "@/lib/constants";
import { apiRequest, fetchPublicJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { KELOLA_WARGA_PATH } from "@/pages/admin/kelola-warga/konteks";

const ISSUE_LABEL = Object.fromEntries(WARGA_DATA_ISSUE_DEFS.map((d) => [d.id, d.label])) as Record<
  WargaDataIssueId,
  string
>;

type FormSlice = Pick<
  WargaFormValues,
  | "tempatLahir"
  | "tanggalLahir"
  | "pekerjaan"
  | "pendidikan"
  | "statusPekerjaan"
  | "nomorWhatsapp"
  | "punyaAktaLahir"
  | "punyaKia"
  | "statusDisabilitas"
  | "wgKesulitanMelihat"
  | "wgKesulitanBerjalan"
  | "kedudukanKeluarga"
>;

type Props = {
  row: (WargaIssueSlice & { penghasilanBulanan?: string | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WargaDataIssueEditDialog({ row, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wargaId = row?.id ?? null;

  const { data: warga, isLoading, isError } = useQuery({
    queryKey: ["/api/warga", wargaId],
    queryFn: () => fetchPublicJson<Warga>(`/api/warga/${wargaId}`, undefined, 30_000),
    enabled: open && wargaId != null,
    staleTime: 0,
  });

  const [form, setForm] = useState<FormSlice>({
    tempatLahir: "",
    tanggalLahir: "",
    pekerjaan: "",
    pendidikan: "",
    statusPekerjaan: "",
    nomorWhatsapp: "",
    punyaAktaLahir: false,
    punyaKia: false,
    statusDisabilitas: "Tidak Ada",
    wgKesulitanMelihat: "",
    wgKesulitanBerjalan: "",
    kedudukanKeluarga: "",
  });
  const [penghasilanBulanan, setPenghasilanBulanan] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (!warga) return;
    const mapped = mapWargaToForm(warga);
    setForm({
      tempatLahir: mapped.tempatLahir,
      tanggalLahir: mapped.tanggalLahir,
      pekerjaan: mapped.pekerjaan,
      pendidikan: mapped.pendidikan,
      statusPekerjaan: mapped.statusPekerjaan,
      nomorWhatsapp: mapped.nomorWhatsapp,
      punyaAktaLahir: mapped.punyaAktaLahir,
      punyaKia: mapped.punyaKia,
      statusDisabilitas: mapped.statusDisabilitas,
      wgKesulitanMelihat: mapped.wgKesulitanMelihat,
      wgKesulitanBerjalan: mapped.wgKesulitanBerjalan,
      kedudukanKeluarga: mapped.kedudukanKeluarga,
    });
    setPenghasilanBulanan(row?.penghasilanBulanan?.trim() || "");
    setErrors({});
  }, [warga, row?.penghasilanBulanan]);

  const kategoriId = useMemo(() => resolveKategoriUmur(form.tanggalLahir), [form.tanggalLahir]);
  const kategoriDef = useMemo(() => getKategoriUmurDef(kategoriId), [kategoriId]);
  const wargaAge = useMemo(() => getWargaAge(form.tanggalLahir), [form.tanggalLahir]);
  const kesulitan = useMemo(
    () => mapDisabilitasToKesulitan(form.statusDisabilitas),
    [form.statusDisabilitas],
  );

  const showPendidikan = needsPendidikan(wargaAge);
  const showCrvs = needsCrvsDocuments(wargaAge);
  const showStatusPekerjaan = needsStatusAngkatanKerja(wargaAge);
  const showPekerjaan = showStatusPekerjaan && needsPekerjaanDetail(form.statusPekerjaan);
  const showWa = needsWhatsapp(wargaAge);
  const showWgDetail = hasKesulitanFungsional(kesulitan);

  const issues = useMemo(() => {
    if (!row) return [];
    return detectWargaDataIssues({
      ...row,
      tanggalLahir: form.tanggalLahir,
      kategoriUmur: kategoriId,
      pekerjaan: form.pekerjaan,
      statusPekerjaan: form.statusPekerjaan,
    });
  }, [row, form.tanggalLahir, form.pekerjaan, form.statusPekerjaan, kategoriId]);

  const previewMissing = useMemo(() => {
    if (!warga) return [] as string[];
    const preview = {
      ...warga,
      ...form,
      tanggalLahir: form.tanggalLahir || null,
      tempatLahir: form.tempatLahir || null,
      pendidikan: form.pendidikan || null,
      statusPekerjaan: form.statusPekerjaan || null,
      pekerjaan: form.pekerjaan || null,
      nomorWhatsapp: form.nomorWhatsapp || null,
      punyaAktaLahir: form.punyaAktaLahir,
      punyaKia: form.punyaKia,
      statusDisabilitas: form.statusDisabilitas,
      wgKesulitanMelihat: form.wgKesulitanMelihat || null,
      wgKesulitanBerjalan: form.wgKesulitanBerjalan || null,
      kategoriUmur: kategoriId,
    } as Warga;
    return computeWargaCompleteness(preview).missingFields.map((f) => f.label);
  }, [warga, form, kategoriId]);

  const applyKategoriDefaults = () => {
    const defaults = applyKategoriUmurDefaults(kategoriId, form);
    setForm((f) => ({
      ...f,
      ...(defaults.pekerjaan ? { pekerjaan: defaults.pekerjaan } : {}),
      ...(defaults.pendidikan ? { pendidikan: defaults.pendidikan } : {}),
    }));
  };

  useEffect(() => {
    if (!open || kategoriId === "belum_diisi") return;
    setForm((f) => {
      const defaults = applyKategoriUmurDefaults(kategoriId, f);
      if (!defaults.pekerjaan && !defaults.pendidikan) return f;
      const wajibKategori =
        kategoriDef.isPelajar || kategoriDef.isBimbinganOrangTua || kategoriDef.isPensiunan;
      return {
        ...f,
        ...(defaults.pekerjaan && (wajibKategori || !f.pekerjaan?.trim())
          ? { pekerjaan: defaults.pekerjaan }
          : {}),
        ...(!f.pendidikan?.trim() && defaults.pendidikan ? { pendidikan: defaults.pendidikan } : {}),
      };
    });
  }, [kategoriId, open, kategoriDef.isPelajar, kategoriDef.isBimbinganOrangTua, kategoriDef.isPensiunan]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!warga) throw new Error("Data warga belum dimuat");
      const nextErrors: Partial<Record<string, string>> = {};
      if (!form.tanggalLahir.trim()) {
        nextErrors.tanggalLahir = "Tanggal lahir wajib diisi";
      } else if (getWargaAge(form.tanggalLahir) === null) {
        nextErrors.tanggalLahir = "Format tanggal lahir tidak valid";
      }
      if (!form.tempatLahir.trim()) nextErrors.tempatLahir = "Tempat lahir wajib diisi";
      if (showPendidikan && !form.pendidikan.trim()) nextErrors.pendidikan = "Pendidikan wajib diisi";
      if (showStatusPekerjaan && !form.statusPekerjaan.trim()) {
        nextErrors.statusPekerjaan = "Status pekerjaan wajib dipilih";
      }
      if (showPekerjaan && !form.pekerjaan.trim()) nextErrors.pekerjaan = "Pekerjaan wajib dipilih";
      if (showWa && !form.nomorWhatsapp.trim()) nextErrors.nomorWhatsapp = "No. WhatsApp wajib";
      if (showWgDetail) {
        if (!form.wgKesulitanMelihat) nextErrors.wgKesulitanMelihat = "Wajib diisi";
        if (!form.wgKesulitanBerjalan) nextErrors.wgKesulitanBerjalan = "Wajib diisi";
      }
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        throw new Error("Lengkapi field yang wajib diisi");
      }

      const fullForm = mapWargaToForm(warga);
      const payload = toWargaPayload({
        ...fullForm,
        ...form,
        statusDisabilitas: mapKesulitanToDisabilitas(kesulitan),
      });
      await apiRequest("PATCH", `/api/warga/${warga.id}`, payload);

      if (penghasilanBulanan.trim() && penghasilanBulanan.trim() !== (row?.penghasilanBulanan ?? "").trim()) {
        await apiRequest("PATCH", `/api/kk/${warga.kkId}`, {
          penghasilanBulanan: penghasilanBulanan.trim(),
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/stats/kependudukan"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/statistik-warga"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/warga", wargaId] }),
        queryClient.invalidateQueries({ queryKey: ["/api/kk"] }),
      ]);
      toast({ title: "Data disimpan", description: `Kategori: ${kategoriDef.label}` });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan";
      if (msg !== "Lengkapi field yang wajib diisi") {
        toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" });
      }
    },
  });

  const setField = <K extends keyof FormSlice>(key: K, value: FormSlice[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perbaiki data warga</DialogTitle>
          <DialogDescription>
            {row ? (
              <>
                {row.namaLengkap} · RT {String(row.rt).padStart(2, "0")} · NIK {row.nik}
              </>
            ) : (
              "Memuat…"
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Memuat data…
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive py-4">Gagal memuat data warga. Tutup dan coba lagi.</p>
        )}

        {warga && !isLoading && (
          <div className="space-y-4 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">
                Kategori: {kategoriDef.label} ({kategoriDef.shortLabel})
              </Badge>
              {kategoriDef.defaultPekerjaan && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={applyKategoriDefaults}>
                  Terapkan default kategori
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link href={`${KELOLA_WARGA_PATH}?kk=${warga.kkId}`}>
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Buka di Kelola Warga
                </Link>
              </Button>
            </div>

            {(issues.length > 0 || previewMissing.length > 0 || !penghasilanBulanan.trim()) && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Yang masih kurang</p>
                <div className="flex flex-wrap gap-1.5">
                  {issues.map((id) => (
                    <Badge key={id} variant="secondary" className="text-xs font-normal">
                      {ISSUE_LABEL[id]}
                    </Badge>
                  ))}
                  {previewMissing.map((label) => (
                    <Badge key={label} variant="outline" className="text-xs font-normal">
                      {label}
                    </Badge>
                  ))}
                  {!penghasilanBulanan.trim() && (
                    <Badge variant="outline" className="text-xs font-normal">
                      Penghasilan bulanan keluarga
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <section className="space-y-3">
              <p className="text-sm font-semibold">Identitas</p>
              <div className="space-y-1.5">
                <Label htmlFor="fix-tanggal-lahir">Tanggal lahir *</Label>
                <Input
                  id="fix-tanggal-lahir"
                  type="date"
                  value={form.tanggalLahir}
                  onChange={(e) => setField("tanggalLahir", e.target.value)}
                />
                {errors.tanggalLahir && <p className="text-sm text-destructive">{errors.tanggalLahir}</p>}
                {form.tanggalLahir && getWargaAge(form.tanggalLahir) != null && (
                  <p className="text-xs text-muted-foreground">
                    Usia: {getWargaAge(form.tanggalLahir)} tahun → {kategoriDef.label}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fix-tempat-lahir">Tempat lahir *</Label>
                <Input
                  id="fix-tempat-lahir"
                  value={form.tempatLahir}
                  onChange={(e) => setField("tempatLahir", e.target.value)}
                  placeholder="Kota/kabupaten kelahiran"
                />
                {errors.tempatLahir && <p className="text-sm text-destructive">{errors.tempatLahir}</p>}
              </div>
            </section>

            {showWa && (
              <section className="space-y-3">
                <p className="text-sm font-semibold">Kontak</p>
                <div className="space-y-1.5">
                  <Label>No. WhatsApp *</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.nomorWhatsapp}
                    onChange={(e) => setField("nomorWhatsapp", e.target.value)}
                    placeholder="08…"
                  />
                  {errors.nomorWhatsapp && (
                    <p className="text-sm text-destructive">{errors.nomorWhatsapp}</p>
                  )}
                </div>
              </section>
            )}

            {showPendidikan && (
              <section className="space-y-3">
                <p className="text-sm font-semibold">Pendidikan</p>
                <div className="space-y-1.5">
                  <Label>Pendidikan terakhir *</Label>
                  <Select value={form.pendidikan} onValueChange={(v) => setField("pendidikan", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendidikanOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.pendidikan && <p className="text-sm text-destructive">{errors.pendidikan}</p>}
                </div>
              </section>
            )}

            {showStatusPekerjaan && (
              <section className="space-y-3">
                <p className="text-sm font-semibold">Pekerjaan</p>
                <div className="space-y-1.5">
                  <Label>Status pekerjaan (ILO) *</Label>
                  <Select
                    value={form.statusPekerjaan}
                    onValueChange={(value) => setField("statusPekerjaan", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status angkatan kerja" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusPekerjaanOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.statusPekerjaan && (
                    <p className="text-sm text-destructive">{errors.statusPekerjaan}</p>
                  )}
                </div>
                {(showPekerjaan || kategoriDef.isPelajar || kategoriDef.isBimbinganOrangTua || kategoriDef.isPensiunan) && (
                  <div className="space-y-1.5">
                    <Label>Pekerjaan {showPekerjaan ? "*" : ""}</Label>
                    <SearchableSelect
                      value={form.pekerjaan}
                      onValueChange={(value) => setField("pekerjaan", value)}
                      options={pekerjaanLegacyOptions}
                      placeholder="Pilih pekerjaan"
                      searchPlaceholder="Cari pekerjaan…"
                    />
                    {errors.pekerjaan && <p className="text-sm text-destructive">{errors.pekerjaan}</p>}
                  </div>
                )}
              </section>
            )}

            {showCrvs && (
              <section className="space-y-3">
                <p className="text-sm font-semibold">Dokumen sipil (anak)</p>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="fix-akta"
                    checked={form.punyaAktaLahir}
                    onCheckedChange={(c) => setField("punyaAktaLahir", c === true)}
                  />
                  <Label htmlFor="fix-akta">Punya akta lahir</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="fix-kia"
                    checked={form.punyaKia}
                    onCheckedChange={(c) => setField("punyaKia", c === true)}
                  />
                  <Label htmlFor="fix-kia">Punya KIA</Label>
                </div>
              </section>
            )}

            <section className="space-y-3">
              <p className="text-sm font-semibold">Kesulitan aktivitas</p>
              <div className="space-y-1.5">
                <Label>Status kesulitan</Label>
                <Select
                  value={kesulitan}
                  onValueChange={(value) => {
                    setForm((f) => ({
                      ...f,
                      statusDisabilitas: mapKesulitanToDisabilitas(value),
                      ...(hasKesulitanFungsional(value)
                        ? {}
                        : { wgKesulitanMelihat: "", wgKesulitanBerjalan: "" }),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KESULITAN_AKTIVITAS_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showWgDetail && (
                <>
                  <div className="space-y-1.5">
                    <Label>Kesulitan melihat *</Label>
                    <Select
                      value={form.wgKesulitanMelihat}
                      onValueChange={(v) => setField("wgKesulitanMelihat", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                      <SelectContent>
                        {WG_DOMAIN_LEVEL_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.wgKesulitanMelihat && (
                      <p className="text-sm text-destructive">{errors.wgKesulitanMelihat}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kesulitan berjalan *</Label>
                    <Select
                      value={form.wgKesulitanBerjalan}
                      onValueChange={(v) => setField("wgKesulitanBerjalan", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                      <SelectContent>
                        {WG_DOMAIN_LEVEL_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.wgKesulitanBerjalan && (
                      <p className="text-sm text-destructive">{errors.wgKesulitanBerjalan}</p>
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold">Data keluarga (KK)</p>
              <div className="space-y-1.5">
                <Label>Penghasilan bulanan keluarga</Label>
                <Select value={penghasilanBulanan || undefined} onValueChange={setPenghasilanBulanan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rentang penghasilan" />
                  </SelectTrigger>
                  <SelectContent>
                    {penghasilanBulananOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Berlaku untuk seluruh anggota KK ini.
                </p>
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
            Batal
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!warga || isLoading || saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
