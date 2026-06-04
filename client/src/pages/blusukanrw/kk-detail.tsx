import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Loader2, Plus, Trash2, Pencil, CheckCircle2, AlertCircle } from "lucide-react";
import { BLUSUKAN_API } from "@shared/blusukan-api";
import { blusukanApi } from "@/lib/blusukan-api";
import { computeWargaCompleteness } from "@shared/profile-completeness";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Warga } from "@shared/schema";
import {
  WargaFormFields,
  defaultWargaForm,
  mapWargaToForm,
  toWargaPayload,
  validateWargaFormData,
  type WargaFormValues,
} from "@/components/kependudukan/warga-form";
import {
  BlusukanKkFormFields,
  mapKkToForm,
  toKkPayload,
  type KkFormValues,
} from "@/components/blusukanrw/kk-form-fields";
import { BlusukanPanelNav, type BlusukanPanel } from "@/components/blusukanrw/panel-nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type KkDetailResponse = {
  kk: import("@shared/schema").KartuKeluarga;
  anggota: Warga[];
  completeness: { completionPercent: number; isComplete: boolean; missingFields: { label: string; wargaNama?: string }[] };
  belumVerifikasi: number;
  kunjunganTerakhir: { hasil: string; catatan: string | null; createdAt: string | null } | null;
};

export default function BlusukanrwKkDetail() {
  const [, params] = useRoute("/blusukanrw/kk/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : NaN;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const kkPickerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: [BLUSUKAN_API.kk(id), id],
    queryFn: () => blusukanApi.kk.get<KkDetailResponse>(id),
    enabled: !isNaN(id),
  });

  const { data: kkList } = useQuery({
    queryKey: [BLUSUKAN_API.kkList],
    queryFn: () => blusukanApi.kkList(),
  });

  const [panel, setPanel] = useState<BlusukanPanel>("kk");
  const [kkForm, setKkForm] = useState<KkFormValues | null>(null);
  const [catatanKunjungan, setCatatanKunjungan] = useState("");
  const [editWarga, setEditWarga] = useState<Warga | null>(null);
  const [editForm, setEditForm] = useState<WargaFormValues | null>(null);
  const [kkSearch, setKkSearch] = useState("");
  const [kkDropdownOpen, setKkDropdownOpen] = useState(false);
  const [addWargaOpen, setAddWargaOpen] = useState(false);
  const [newWargaForm, setNewWargaForm] = useState<WargaFormValues>(() => ({
    ...defaultWargaForm,
    kkId: String(id),
  }));
  const [deleteWargaTarget, setDeleteWargaTarget] = useState<Warga | null>(null);
  const [deleteKkOpen, setDeleteKkOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (kkPickerRef.current && !kkPickerRef.current.contains(event.target as Node)) {
        setKkDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isNaN(id)) {
      setNewWargaForm((f) => ({ ...f, kkId: String(id) }));
    }
  }, [id]);

  useEffect(() => {
    if (!data) return;
    setKkForm(mapKkToForm(data.kk));
  }, [data]);

  const editErrors = useMemo(
    () => (editForm ? validateWargaFormData(editForm) : {}),
    [editForm],
  );
  const newWargaErrors = useMemo(() => validateWargaFormData(newWargaForm), [newWargaForm]);
  const editInvalid = Object.keys(editErrors).length > 0;
  const newInvalid = Object.keys(newWargaErrors).length > 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.kk(id)] });
    queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.keluarga] });
    queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.dashboard] });
    queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.kkList] });
  };

  const saveKkMutation = useMutation({
    mutationFn: async () => {
      if (!kkForm || isNaN(id)) return;
      await blusukanApi.kk.patch(id, toKkPayload(kkForm));
    },
    onSuccess: () => {
      toast({ title: "Data KK tersimpan" });
      invalidateAll();
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menyimpan KK",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const saveWargaMutation = useMutation({
    mutationFn: async ({ wargaId, form }: { wargaId: number; form: WargaFormValues }) => {
      const errs = validateWargaFormData(form);
      if (Object.keys(errs).length > 0) throw new Error("Lengkapi field wajib");
      await blusukanApi.warga.patch(wargaId, toWargaPayload(form));
    },
    onSuccess: () => {
      toast({ title: "Data warga tersimpan" });
      setEditWarga(null);
      setEditForm(null);
      invalidateAll();
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menyimpan warga",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const addWargaMutation = useMutation({
    mutationFn: async () => {
      if (Object.keys(newWargaErrors).length > 0) throw new Error("Lengkapi data warga baru");
      return blusukanApi.warga.create(toWargaPayload({ ...newWargaForm, kkId: String(id) }));
    },
    onSuccess: () => {
      toast({ title: "Anggota ditambahkan" });
      setAddWargaOpen(false);
      setNewWargaForm({ ...defaultWargaForm, kkId: String(id) });
      setPanel("anggota");
      invalidateAll();
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menambah warga",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const deleteWargaMutation = useMutation({
    mutationFn: (wargaId: number) => blusukanApi.warga.delete(wargaId),
    onSuccess: () => {
      toast({ title: "Warga dihapus" });
      setDeleteWargaTarget(null);
      invalidateAll();
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menghapus",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const deleteKkMutation = useMutation({
    mutationFn: () => blusukanApi.kk.delete(id),
    onSuccess: () => {
      toast({ title: "KK dihapus" });
      setLocation("/blusukanrw/kunjungan");
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menghapus KK",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const kunjunganMutation = useMutation({
    mutationFn: async () => {
      if (kkForm && !saveKkMutation.isPending) {
        await blusukanApi.kk.patch(id, toKkPayload(kkForm));
      }
      await blusukanApi.kunjungan({
        kkId: id,
        hasil: "selesai",
        catatan: catatanKunjungan || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Kunjungan dicatat" });
      setCatatanKunjungan("");
      invalidateAll();
      setLocation("/blusukanrw/kunjungan");
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const openEditWarga = (w: Warga) => {
    setEditWarga(w);
    setEditForm(mapWargaToForm(w));
    setKkSearch("");
    setKkDropdownOpen(false);
  };

  if (isNaN(id)) return <p className="text-sm text-muted-foreground">ID tidak valid</p>;

  const footerPrimary =
    panel === "kk"
      ? { label: "Simpan KK", onClick: () => saveKkMutation.mutate(), pending: saveKkMutation.isPending }
      : panel === "kunjungan"
        ? {
            label: "Simpan & selesai kunjungan",
            onClick: () => kunjunganMutation.mutate(),
            pending: kunjunganMutation.isPending || saveKkMutation.isPending,
          }
        : null;

  return (
    <div className="pb-28">
      <Link href="/blusukanrw/kunjungan">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Kembali
        </Button>
      </Link>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {isError && <p className="text-sm text-destructive">Gagal memuat data KK.</p>}

      {data && kkForm && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold font-mono">{data.kk.nomorKk}</h2>
            <p className="text-sm text-muted-foreground line-clamp-2">{data.kk.alamat}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge>RT {String(data.kk.rt).padStart(2, "0")}</Badge>
              <Badge variant="outline">Lengkap {data.completeness.completionPercent}%</Badge>
              {data.belumVerifikasi > 0 && (
                <Badge variant="outline" className="text-amber-800 border-amber-300">
                  {data.belumVerifikasi} belum verifikasi
                </Badge>
              )}
            </div>
            {data.kk.linkGmaps && (
              <a
                href={data.kk.linkGmaps}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-2"
              >
                <MapPin className="w-3 h-3" />
                Buka di Maps
              </a>
            )}
          </div>

          {data.completeness.missingFields.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100">
              <p className="font-semibold mb-1">Perlu dilengkapi:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {data.completeness.missingFields.slice(0, 5).map((m, i) => (
                  <li key={i}>
                    {m.label}
                    {m.wargaNama ? ` — ${m.wargaNama}` : ""}
                  </li>
                ))}
                {data.completeness.missingFields.length > 5 && (
                  <li>+{data.completeness.missingFields.length - 5} lainnya</li>
                )}
              </ul>
            </div>
          )}

          <BlusukanPanelNav value={panel} onChange={setPanel} anggotaCount={data.anggota.length} />

          {panel === "kk" && (
            <div className="space-y-4">
              <BlusukanKkFormFields form={kkForm} onChange={setKkForm} />
              <Button
                type="button"
                variant="outline"
                className="w-full text-destructive border-destructive/40"
                onClick={() => setDeleteKkOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus kartu keluarga
              </Button>
            </div>
          )}

          {panel === "anggota" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ketuk anggota untuk mengubah. Simpan per orang — tidak perlu scroll form panjang.
              </p>
              <Button
                type="button"
                className="w-full gap-2"
                variant="outline"
                onClick={() => setAddWargaOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Tambah anggota
              </Button>
              {data.anggota.map((w) => {
                const pct = computeWargaCompleteness(w).completionPercent;
                const ok = pct === 100;
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 rounded-xl border bg-card p-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{w.namaLengkap}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.kedudukanKeluarga}
                        {w.nomorWhatsapp ? ` · ${w.nomorWhatsapp}` : ""}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        {ok ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(163,55%,32%)]" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          Profil {pct}% · {w.statusVerifikasiData}
                        </span>
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="secondary" className="shrink-0 gap-1" onClick={() => openEditWarga(w)}>
                      <Pencil className="w-3.5 h-3.5" />
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-destructive h-8 w-8"
                      onClick={() => setDeleteWargaTarget(w)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              {data.anggota.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-6">Belum ada anggota. Tambah dari tombol di atas.</p>
              )}
            </div>
          )}

          {panel === "kunjungan" && (
            <div className="space-y-4">
              {data.kunjunganTerakhir && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">Kunjungan terakhir</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {data.kunjunganTerakhir.hasil}
                    {data.kunjunganTerakhir.createdAt
                      ? ` · ${new Date(data.kunjunganTerakhir.createdAt).toLocaleDateString("id-ID")}`
                      : ""}
                  </p>
                  {data.kunjunganTerakhir.catatan && (
                    <p className="text-xs mt-2">{data.kunjunganTerakhir.catatan}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Catatan kunjungan hari ini</Label>
                <Textarea
                  value={catatanKunjungan}
                  onChange={(e) => setCatatanKunjungan(e.target.value)}
                  rows={4}
                  placeholder="Contoh: Data KK dicek, 1 anggota tambah WA..."
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Tombol di bawah menyimpan perubahan KK (jika ada) lalu menandai kunjungan selesai.
              </p>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={addWargaOpen}
        onOpenChange={(o) => {
          setAddWargaOpen(o);
          if (!o) setNewWargaForm({ ...defaultWargaForm, kkId: String(id) });
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[92vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>Tambah anggota</DialogTitle>
          </DialogHeader>
          <WargaFormFields
            variant="blusukan"
            formData={newWargaForm}
            setFormData={setNewWargaForm}
            errors={newWargaErrors}
            testIdPrefix="blusukan-new-warga"
            searchVal=""
            setSearchVal={() => {}}
            dropdownOpen={false}
            setDropdownOpen={() => {}}
            pickerRef={{ current: null }}
            kkIdLocked
            showVerifikasiAdmin
          />
          <Button
            className="w-full"
            style={{ backgroundColor: "hsl(163,55%,22%)" }}
            disabled={addWargaMutation.isPending || newInvalid}
            onClick={() => addWargaMutation.mutate()}
          >
            {addWargaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Simpan anggota baru
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editWarga && !!editForm}
        onOpenChange={(o) => {
          if (!o) {
            setEditWarga(null);
            setEditForm(null);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[92vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="pr-6">{editWarga?.namaLengkap}</DialogTitle>
          </DialogHeader>
          {editForm && (
            <>
              <WargaFormFields
                variant="blusukan"
                formData={editForm}
                setFormData={(updater) => {
                  setEditForm((prev) => {
                    if (!prev) return prev;
                    return typeof updater === "function" ? updater(prev) : updater;
                  });
                }}
                errors={editErrors}
                testIdPrefix={`blusukan-edit-${editWarga?.id}`}
                searchVal={kkSearch}
                setSearchVal={setKkSearch}
                dropdownOpen={kkDropdownOpen}
                setDropdownOpen={setKkDropdownOpen}
                pickerRef={kkPickerRef}
                kkList={kkList}
                kkIdLocked
                showPindahKk
                showVerifikasiAdmin
              />
              <Button
                className="w-full"
                style={{ backgroundColor: "hsl(163,55%,22%)" }}
                disabled={saveWargaMutation.isPending || editInvalid}
                onClick={() =>
                  editWarga &&
                  saveWargaMutation.mutate({ wargaId: editWarga.id, form: editForm })
                }
              >
                {saveWargaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Simpan perubahan
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteWargaTarget} onOpenChange={(o) => !o && setDeleteWargaTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus warga?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteWargaTarget?.namaLengkap} akan dihapus permanen dari database RW.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteWargaTarget && deleteWargaMutation.mutate(deleteWargaTarget.id)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteKkOpen} onOpenChange={setDeleteKkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus KK?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua anggota dan data terkait KK ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteKkMutation.mutate()}
            >
              Hapus KK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {data && kkForm && footerPrimary && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t p-4 max-w-lg mx-auto">
          <Button
            className="w-full"
            style={{ backgroundColor: "hsl(163,55%,22%)" }}
            disabled={footerPrimary.pending}
            onClick={footerPrimary.onClick}
          >
            {footerPrimary.pending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {footerPrimary.label}
          </Button>
        </div>
      )}
    </div>
  );
}
