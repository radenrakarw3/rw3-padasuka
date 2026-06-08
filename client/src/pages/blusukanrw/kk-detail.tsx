import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Loader2, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { BLUSUKAN_API } from "@shared/blusukan-api";
import { blusukanApi } from "@/lib/blusukan-api";
import { mapWargaToIssueSlice } from "@shared/blusukan-analytics";
import { getEffectiveKategoriUmur, getKategoriUmurDef } from "@shared/kategori-umur";
import { computeBlusukanWargaCompleteness } from "@shared/profile-completeness";
import { detectWargaDataIssues, summarizeWargaIssues } from "@shared/warga-data-issues";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Warga } from "@shared/schema";
import {
  defaultBlusukanWargaForm,
  mapWargaToBlusukanForm,
  toBlusukanWargaPayload,
  validateBlusukanWargaForm,
  type BlusukanWargaFormValues,
} from "@shared/blusukan-warga-form";
import { BlusukanWargaFormFields } from "@/components/blusukanrw/blusukan-warga-form-fields";
import {
  BlusukanKkFormFields,
  mapKkToForm,
  parseKkLabels,
  toKkPayload,
  validateKkFormKendaraan,
  type KkFormValues,
} from "@/components/blusukanrw/kk-form-fields";
import { formatKkKendaraanDisplay } from "@shared/kk-kendaraan";
import { BlusukanPanelNav, type BlusukanPanel } from "@/components/blusukanrw/panel-nav";
import type { KeluargaKunjunganRow } from "@/components/blusukanrw/keluarga-kunjungan-row";
import {
  blusukanBackRoute,
  blusukanKkHref,
  parseBlusukanFrom,
} from "@/lib/blusukan-navigation";
import { BlusukanFullScreenForm } from "@/components/blusukanrw/blusukan-form-ui";
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
  const fromPage = parseBlusukanFrom(typeof window !== "undefined" ? window.location.search : "");
  const back = blusukanBackRoute(fromPage);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const kkPickerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: [BLUSUKAN_API.kk(id), id],
    queryFn: () => blusukanApi.kk.get<KkDetailResponse>(id),
    enabled: !isNaN(id),
    staleTime: 0,
  });

  const { data: kkList } = useQuery({
    queryKey: [BLUSUKAN_API.kkList],
    queryFn: () => blusukanApi.kkList(),
  });

  const [panel, setPanel] = useState<BlusukanPanel>(() => (fromPage === "kunjungan" ? "anggota" : "kk"));
  const [kkForm, setKkForm] = useState<KkFormValues | null>(null);
  const [catatanKunjungan, setCatatanKunjungan] = useState("");
  const [editWarga, setEditWarga] = useState<Warga | null>(null);
  const [editForm, setEditForm] = useState<BlusukanWargaFormValues | null>(null);
  const [kkSearch, setKkSearch] = useState("");
  const [kkDropdownOpen, setKkDropdownOpen] = useState(false);
  const [addWargaOpen, setAddWargaOpen] = useState(false);
  const [newWargaForm, setNewWargaForm] = useState<BlusukanWargaFormValues>(() => ({
    ...defaultBlusukanWargaForm,
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
    () => (editForm ? validateBlusukanWargaForm(editForm) : {}),
    [editForm],
  );
  const newWargaErrors = useMemo(() => validateBlusukanWargaForm(newWargaForm), [newWargaForm]);
  const editInvalid = Object.keys(editErrors).length > 0;
  const newInvalid = Object.keys(newWargaErrors).length > 0;

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.kk(id)] }),
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.keluarga] }),
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.dashboard] }),
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.kkList] }),
    ]);

  const goToNextKunjungan = async () => {
    await invalidateAll();
    const next = await blusukanApi.keluarga<KeluargaKunjunganRow>({
      filter: "perlu",
      page: 1,
      limit: 10,
    });
    const candidate = next.rows.find((row) => row.kkId !== id);
    if (candidate) {
      toast({
        title: "Kunjungan dicatat",
        description: "Lanjut ke keluarga berikutnya di antrian.",
      });
      setLocation(blusukanKkHref(candidate.kkId, "kunjungan"));
      return;
    }
    toast({
      title: "Kunjungan dicatat",
      description: "Antrian kunjungan kosong — progres diperbarui di dashboard.",
    });
    setLocation("/blusukanrw/dashboard");
  };

  const saveKkMutation = useMutation({
    mutationFn: async () => {
      if (!kkForm || isNaN(id) || !data) return;
      const kendaraanErr = validateKkFormKendaraan(kkForm);
      if (kendaraanErr) throw new Error(kendaraanErr);
      await blusukanApi.kk.patch(
        id,
        toKkPayload(kkForm, { anggotaCount: data.anggota.length, preserve: data.kk }),
      );
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
    mutationFn: async ({ wargaId, form }: { wargaId: number; form: BlusukanWargaFormValues }) => {
      const errs = validateBlusukanWargaForm(form);
      if (Object.keys(errs).length > 0) throw new Error("Lengkapi field wajib");
      await blusukanApi.warga.patch(wargaId, toBlusukanWargaPayload(form));
    },
    onSuccess: () => {
      toast({
        title: "Data warga tersimpan",
        description: "Buka tab Kunjungan lalu simpan untuk menutup kunjungan dan memperbarui dashboard.",
      });
      setEditWarga(null);
      setEditForm(null);
      void invalidateAll();
      setPanel("kunjungan");
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
      return blusukanApi.warga.create(toBlusukanWargaPayload({ ...newWargaForm, kkId: String(id) }));
    },
    onSuccess: () => {
      toast({ title: "Anggota ditambahkan" });
      setAddWargaOpen(false);
      setNewWargaForm({ ...defaultBlusukanWargaForm, kkId: String(id) });
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
      toast({ title: "KK dihapus dari database" });
      setDeleteKkOpen(false);
      invalidateAll();
      queryClient.removeQueries({ queryKey: [BLUSUKAN_API.kk(id)] });
      setLocation("/blusukanrw/dashboard");
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
      if (kkForm && !saveKkMutation.isPending && data) {
        const kendaraanErr = validateKkFormKendaraan(kkForm);
        if (kendaraanErr) throw new Error(kendaraanErr);
        await blusukanApi.kk.patch(
          id,
          toKkPayload(kkForm, { anggotaCount: data.anggota.length, preserve: data.kk }),
        );
      }
      await blusukanApi.kunjungan({
        kkId: id,
        hasil: "selesai",
        catatan: catatanKunjungan || null,
      });
    },
    onSuccess: () => {
      setCatatanKunjungan("");
      void goToNextKunjungan();
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
    setEditForm(mapWargaToBlusukanForm(w));
    setKkSearch("");
    setKkDropdownOpen(false);
  };

  if (isNaN(id)) return <p className="text-sm text-muted-foreground">ID tidak valid</p>;

  const wargaFormOpen = addWargaOpen || (!!editWarga && !!editForm);

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
    <div className="pb-32" style={{ paddingBottom: wargaFormOpen ? undefined : "max(8rem, calc(6rem + env(safe-area-inset-bottom)))" }}>
      <div className="flex items-center gap-2 mb-3 -ml-2">
        <Link href={back.href}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {back.label}
          </Button>
        </Link>
        {fromPage !== "dashboard" && (
          <Link href="/blusukanrw/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Dashboard
            </Button>
          </Link>
        )}
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {isError && <p className="text-sm text-destructive">Gagal memuat data KK.</p>}

      {data && kkForm && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold font-mono">{data.kk.nomorKk}</h2>
            <p className="text-sm text-muted-foreground line-clamp-2">{data.kk.alamat}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge>RT {String(data.kk.rt).padStart(2, "0")}</Badge>
              {data.kk.noUnit && <Badge variant="outline">Unit {data.kk.noUnit}</Badge>}
              <Badge variant="outline">Lengkap {data.completeness.completionPercent}%</Badge>
              {parseKkLabels(data.kk.labelRw).map((label) => (
                <Badge key={label} variant="secondary" className="text-[10px]">
                  {label}
                </Badge>
              ))}
              {formatKkKendaraanDisplay(data.kk.kendaraanData) && (
                <Badge variant="outline" className="text-[10px] max-w-full truncate">
                  Kendaraan: {formatKkKendaraanDisplay(data.kk.kendaraanData)}
                </Badge>
              )}
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
              <BlusukanKkFormFields form={kkForm} onChange={setKkForm} anggotaCount={data.anggota.length} />
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
                Ketuk nama anggota untuk mengubah data. Tombol simpan selalu terlihat di bawah layar.
              </p>
              <Button
                type="button"
                className="w-full gap-2 h-12 text-base touch-manipulation"
                variant="outline"
                onClick={() => setAddWargaOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Tambah anggota
              </Button>
              {data.anggota.map((w) => {
                const pct = computeBlusukanWargaCompleteness(w).completionPercent;
                const ok = pct === 100;
                const katId = getEffectiveKategoriUmur(w);
                const katDef = getKategoriUmurDef(katId);
                const issues = detectWargaDataIssues(mapWargaToIssueSlice(w, data.kk.rt));
                const hasIssues = issues.length > 0;
                return (
                  <div
                    key={w.id}
                    className={`flex items-center gap-2 rounded-xl border bg-card p-3 shadow-sm touch-manipulation ${
                      hasIssues ? "border-amber-200/80" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left py-1 -my-1"
                      onClick={() => openEditWarga(w)}
                    >
                      <p className="text-base font-semibold truncate">{w.namaLengkap}</p>
                      <p className="text-sm text-muted-foreground">
                        {w.kedudukanKeluarga} · {katDef.shortLabel}
                        {w.nomorWhatsapp ? ` · ${w.nomorWhatsapp}` : ""}
                      </p>
                      {(w.statusPekerjaan || w.pekerjaan) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {w.statusPekerjaan || "—"}
                          {w.pekerjaan ? ` · ${w.pekerjaan}` : ""}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {ok && !hasIssues ? (
                          <CheckCircle2 className="w-4 h-4 text-[hsl(163,55%,32%)]" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          Profil {pct}% · {w.statusVerifikasiData}
                        </span>
                        {hasIssues && (
                          <Badge variant="outline" className="text-[10px] font-normal border-amber-300 text-amber-900">
                            {summarizeWargaIssues(issues)}
                          </Badge>
                        )}
                      </div>
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-destructive h-11 w-11"
                      onClick={() => setDeleteWargaTarget(w)}
                      aria-label="Hapus warga"
                    >
                      <Trash2 className="w-5 h-5" />
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
                  className="text-base min-h-[6rem] rounded-lg"
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

      <BlusukanFullScreenForm
        open={addWargaOpen}
        onClose={() => {
          setAddWargaOpen(false);
          setNewWargaForm({ ...defaultBlusukanWargaForm, kkId: String(id) });
        }}
        title="Tambah anggota"
        subtitle={data?.kk.nomorKk}
        saveLabel="Simpan anggota baru"
        onSave={() => addWargaMutation.mutate()}
        saving={addWargaMutation.isPending}
        saveDisabled={newInvalid}
      >
        <BlusukanWargaFormFields
          formData={newWargaForm}
          setFormData={setNewWargaForm}
          errors={newWargaErrors}
          testIdPrefix="blusukan-new-warga"
          searchVal=""
          setSearchVal={() => {}}
          dropdownOpen={false}
          setDropdownOpen={() => {}}
          pickerRef={{ current: null }}
          showVerifikasiAdmin
        />
      </BlusukanFullScreenForm>

      <BlusukanFullScreenForm
        open={!!editWarga && !!editForm}
        onClose={() => {
          setEditWarga(null);
          setEditForm(null);
        }}
        title={editWarga?.namaLengkap ?? "Edit anggota"}
        subtitle="Ketuk section untuk buka/tutup"
        saveLabel="Simpan perubahan"
        onSave={() => editWarga && editForm && saveWargaMutation.mutate({ wargaId: editWarga.id, form: editForm })}
        saving={saveWargaMutation.isPending}
        saveDisabled={editInvalid}
      >
        {editForm && (
          <BlusukanWargaFormFields
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
            showPindahKk
            showVerifikasiAdmin
          />
        )}
      </BlusukanFullScreenForm>

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
              disabled={deleteWargaMutation.isPending}
              onClick={() => deleteWargaTarget && deleteWargaMutation.mutate(deleteWargaTarget.id)}
            >
              {deleteWargaMutation.isPending ? "Menghapus…" : "Hapus"}
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
              disabled={deleteKkMutation.isPending}
              onClick={() => deleteKkMutation.mutate()}
            >
              {deleteKkMutation.isPending ? "Menghapus…" : "Hapus KK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {data && kkForm && footerPrimary && !wargaFormOpen && (
        <div
          className="fixed bottom-16 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t p-4 max-w-lg mx-auto shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <Button
            className="w-full h-12 text-base font-semibold touch-manipulation"
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
