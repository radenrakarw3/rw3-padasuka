import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { getWargaAge } from "@shared/warga-form-tier";
import { needsStatusAngkatanKerja } from "@shared/warga-international";
import { pekerjaanLegacyOptions } from "@shared/pekerjaan-options";
import { statusPekerjaanOptions } from "@/lib/constants";
import {
  mapWargaToForm,
  toWargaPayload,
  type WargaFormValues,
} from "@/components/kependudukan/warga-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { apiRequest, fetchPublicJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ISSUE_LABEL = Object.fromEntries(WARGA_DATA_ISSUE_DEFS.map((d) => [d.id, d.label])) as Record<
  WargaDataIssueId,
  string
>;

type Props = {
  row: WargaIssueSlice | null;
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

  const [form, setForm] = useState<
    Pick<WargaFormValues, "tempatLahir" | "tanggalLahir" | "pekerjaan" | "pendidikan" | "statusPekerjaan">
  >({
    tempatLahir: "",
    tanggalLahir: "",
    pekerjaan: "",
    pendidikan: "",
    statusPekerjaan: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<"tanggalLahir" | "pekerjaan" | "statusPekerjaan", string>>
  >({});

  useEffect(() => {
    if (!warga) return;
    const mapped = mapWargaToForm(warga);
    setForm({
      tempatLahir: mapped.tempatLahir,
      tanggalLahir: mapped.tanggalLahir,
      pekerjaan: mapped.pekerjaan,
      pendidikan: mapped.pendidikan,
      statusPekerjaan: mapped.statusPekerjaan,
    });
    setErrors({});
  }, [warga]);

  const kategoriId = useMemo(() => resolveKategoriUmur(form.tanggalLahir), [form.tanggalLahir]);
  const kategoriDef = useMemo(() => getKategoriUmurDef(kategoriId), [kategoriId]);

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

  const wargaAge = useMemo(() => getWargaAge(form.tanggalLahir), [form.tanggalLahir]);
  const showStatusPekerjaan = needsStatusAngkatanKerja(wargaAge);

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
      const nextErrors: Partial<Record<"tanggalLahir" | "pekerjaan" | "statusPekerjaan", string>> = {};
      if (!form.tanggalLahir.trim()) {
        nextErrors.tanggalLahir = "Tanggal lahir wajib diisi";
      } else if (getWargaAge(form.tanggalLahir) === null) {
        nextErrors.tanggalLahir = "Format tanggal lahir tidak valid";
      }
      if (showStatusPekerjaan && !form.statusPekerjaan.trim()) {
        nextErrors.statusPekerjaan = "Status pekerjaan wajib dipilih";
      }
      if (!form.pekerjaan.trim()) {
        nextErrors.pekerjaan = "Pekerjaan wajib dipilih";
      }
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        throw new Error("Lengkapi field yang wajib diisi");
      }

      const fullForm = mapWargaToForm(warga);
      const payload = toWargaPayload({
        ...fullForm,
        tempatLahir: form.tempatLahir,
        tanggalLahir: form.tanggalLahir,
        pekerjaan: form.pekerjaan,
        pendidikan: form.pendidikan,
        statusPekerjaan: form.statusPekerjaan,
      });
      await apiRequest("PATCH", `/api/warga/${warga.id}`, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/stats/kependudukan"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/warga", wargaId] }),
      ]);
      toast({ title: "Data warga disimpan", description: `Kategori: ${kategoriDef.label}` });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan";
      if (msg !== "Lengkapi field yang wajib diisi") {
        toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
            </div>

            {issues.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {issues.map((id) => (
                  <Badge key={id} variant="secondary" className="text-xs font-normal">
                    {ISSUE_LABEL[id]}
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="fix-tanggal-lahir">Tanggal lahir *</Label>
              <Input
                id="fix-tanggal-lahir"
                type="date"
                value={form.tanggalLahir}
                onChange={(e) => {
                  setForm((f) => ({ ...f, tanggalLahir: e.target.value }));
                  setErrors((prev) => ({ ...prev, tanggalLahir: undefined }));
                }}
              />
              {errors.tanggalLahir && (
                <p className="text-sm text-destructive">{errors.tanggalLahir}</p>
              )}
              {form.tanggalLahir && getWargaAge(form.tanggalLahir) != null && (
                <p className="text-xs text-muted-foreground">
                  Usia: {getWargaAge(form.tanggalLahir)} tahun → {kategoriDef.label}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fix-tempat-lahir">Tempat lahir</Label>
              <Input
                id="fix-tempat-lahir"
                value={form.tempatLahir}
                onChange={(e) => setForm((f) => ({ ...f, tempatLahir: e.target.value }))}
                placeholder="Kota/kabupaten kelahiran"
              />
            </div>

            {showStatusPekerjaan && (
              <div className="space-y-1.5">
                <Label>Status pekerjaan (ILO) *</Label>
                <Select
                  value={form.statusPekerjaan}
                  onValueChange={(value) => {
                    setForm((f) => ({ ...f, statusPekerjaan: value }));
                    setErrors((prev) => ({ ...prev, statusPekerjaan: undefined }));
                  }}
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
            )}

            <div className="space-y-1.5">
              <Label>Pekerjaan *</Label>
              <SearchableSelect
                value={form.pekerjaan}
                onValueChange={(value) => {
                  setForm((f) => ({ ...f, pekerjaan: value }));
                  setErrors((prev) => ({ ...prev, pekerjaan: undefined }));
                }}
                options={pekerjaanLegacyOptions}
                placeholder="Pilih pekerjaan"
                searchPlaceholder="Cari pekerjaan…"
              />
              {errors.pekerjaan && <p className="text-sm text-destructive">{errors.pekerjaan}</p>}
              {kategoriDef.isPelajar && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Usia 7–18 tahun wajib pekerjaan «Pelajar».
                </p>
              )}
              {kategoriDef.isBimbinganOrangTua && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Usia 0–6 tahun wajib pekerjaan «Bimbingan Orang Tua».
                </p>
              )}
              {kategoriDef.isPensiunan && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Usia 65+ tahun (lansia) wajib pekerjaan «Pensiunan» — bukan pengangguran.
                </p>
              )}
            </div>
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
