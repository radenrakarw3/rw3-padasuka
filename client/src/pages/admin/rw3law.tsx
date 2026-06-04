import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  CheckCircle,
  Ban,
  Pencil,
  Scale,
  Eye,
  RefreshCw,
  Database,
  Trash2,
  GitBranch,
  Loader2,
} from "lucide-react";
import { formatNomorPeraturanLengkap, groupByTahunNomor } from "@shared/rw3law-archive";
import { Rw3lawDocumentView } from "@/components/gov/rw3law-document-view";
import { Rw3lawStructuredBody } from "@/components/gov/rw3law-structured-body";
import type { Rw3lawDokumen } from "@shared/schema";
import { rw3lawKategoriOptions, rw3lawKategoriLabels, rw3lawStatusLabels } from "@/lib/constants";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import {
  createEmptyStructuredIsi,
  parseIsiToStructured,
  structuredToIsi,
  validateStructuredIsi,
  type Rw3lawStructuredIsi,
} from "@shared/rw3law-structured";
import { Rw3lawIsiEditor } from "@/components/admin/rw3law-isi-editor";

type FormState = {
  judul: string;
  kategori: string;
  rtAsal: string;
  tanggalBerlaku: string;
  catatanInternal: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: FormState = {
  judul: "",
  kategori: "umum",
  rtAsal: "",
  tanggalBerlaku: todayIsoDate(),
  catatanInternal: "",
};

function statusBadgeClass(status: string) {
  if (status === "disetujui") return "bg-green-100 text-green-800";
  if (status === "dicabut") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

function formToBody(f: FormState, structured: Rw3lawStructuredIsi) {
  return {
    judul: f.judul.trim(),
    kategori: f.kategori,
    rtAsal: f.rtAsal ? parseInt(f.rtAsal, 10) : null,
    tanggalBerlaku: f.tanggalBerlaku.trim() || null,
    isi: structuredToIsi(structured),
    catatanInternal: f.catatanInternal.trim() || null,
  };
}

function dokumenToForm(d: Rw3lawDokumen): FormState {
  return {
    judul: d.judul,
    kategori: d.kategori,
    rtAsal: d.rtAsal != null ? String(d.rtAsal) : "",
    tanggalBerlaku: d.tanggalBerlaku ?? todayIsoDate(),
    catatanInternal: d.catatanInternal ?? "",
  };
}

export default function AdminRw3law() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Rw3lawDokumen | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [structuredIsi, setStructuredIsi] = useState<Rw3lawStructuredIsi>(createEmptyStructuredIsi);
  const [cabutTarget, setCabutTarget] = useState<Rw3lawDokumen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rw3lawDokumen | null>(null);
  const [revisiLoadingId, setRevisiLoadingId] = useState<number | null>(null);

  const isiPreview = structuredToIsi(structuredIsi);
  const isiValid = validateStructuredIsi(structuredIsi) === null;

  const publishPreviewQuery = useQuery({
    queryKey: ["/api/admin/rw3law/nomor/preview", form.tanggalBerlaku, editingId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (form.tanggalBerlaku.trim()) {
        params.set("tanggalBerlaku", form.tanggalBerlaku.trim());
      }
      if (editingId != null) params.set("draftId", String(editingId));
      const qs = params.toString();
      const res = await fetch(`/api/admin/rw3law/nomor/preview${qs ? `?${qs}` : ""}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await readJsonSafely<{ message?: string }>(res).catch(() => null);
        throw new Error(err?.message || "Gagal memuat pratinjau publikasi");
      }
      return readJsonSafely<{
        tahun: number;
        nomorBerikut: number;
        label: string;
        singkat: string;
        versiBerikut: string;
        urutanBerikut: number;
        adalahRevisi: boolean;
      }>(res);
    },
    enabled: dialogOpen,
    staleTime: 10_000,
  });

  const queryKey = ["/api/admin/rw3law", filterStatus] as const;

  const {
    data: overview,
    isError: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["/api/admin/rw3law/status/overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3law/status/overview", { credentials: "include" });
      if (res.status === 401) throw new Error("Sesi admin berakhir. Silakan login ulang.");
      const body = await readJsonSafely<{
        ready?: boolean;
        message?: string;
        publicCount?: number;
        counts?: { draft: number; disetujui: number; dicabut: number; total: number };
      }>(res).catch(() => null);
      if (!res.ok || body?.ready === false) {
        throw new Error(body?.message || "Database RW3LAW tidak dapat dihubungi");
      }
      return {
        ready: true,
        publicCount: body?.publicCount ?? 0,
        counts: body?.counts ?? { draft: 0, disetujui: 0, dicabut: 0, total: 0 },
      };
    },
  });

  const {
    data: list = [],
    isLoading,
    isError: listError,
    error: listQueryError,
    refetch: refetchList,
  } = useQuery<Rw3lawDokumen[]>({
    queryKey,
    queryFn: async () => {
      const q = filterStatus !== "semua" ? `?status=${filterStatus}` : "";
      const res = await fetch(`/api/admin/rw3law${q}`, { credentials: "include" });
      if (res.status === 401) throw new Error("Sesi admin berakhir. Silakan login ulang.");
      if (!res.ok) {
        const err = await readJsonSafely<{ message?: string }>(res).catch(() => null);
        throw new Error(err?.message || "Gagal memuat daftar peraturan");
      }
      return readJsonSafely<Rw3lawDokumen[]>(res);
    },
  });

  /** Selalu muat draft (untuk tombol Lanjutkan revisi meski filter bukan Semua). */
  const { data: draftList = [] } = useQuery<Rw3lawDokumen[]>({
    queryKey: ["/api/admin/rw3law", "draft"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3law?status=draft", { credentials: "include" });
      if (!res.ok) return [];
      return (await readJsonSafely<Rw3lawDokumen[]>(res)) ?? [];
    },
    staleTime: 30_000,
  });

  const removeFromRw3lawLists = (id: number) => {
    queryClient.setQueriesData<Rw3lawDokumen[]>(
      { queryKey: ["/api/admin/rw3law"] },
      (prev) => (prev ?? []).filter((d) => d.id !== id),
    );
  };

  const invalidateRw3law = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3law"], refetchType: "active" }),
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/rw3law/status/overview"],
        refetchType: "active",
      }),
      queryClient.invalidateQueries({ queryKey: ["/api/public/rw3law"], refetchType: "active" }),
      queryClient.invalidateQueries({
        queryKey: ["/api/public/rw3law/arsip/dicabut"],
        refetchType: "active",
      }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3law", "draft"], refetchType: "active" }),
    ]);
  };

  const RW3LAW_ACTION_TIMEOUT_MS = 15_000;

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setStructuredIsi(createEmptyStructuredIsi());
    setShowPreview(false);
    setDialogOpen(true);
  }, []);

  const openEditDraft = useCallback((d: Rw3lawDokumen) => {
    setEditingId(d.id);
    setForm(dokumenToForm(d));
    try {
      setStructuredIsi(parseIsiToStructured(d.isi ?? ""));
    } catch {
      setStructuredIsi(createEmptyStructuredIsi());
    }
    setShowPreview(false);
    setDialogOpen(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const err = validateStructuredIsi(structuredIsi);
      if (err) throw new Error(err);
      const body = formToBody(form, structuredIsi);
      if (editingId) {
        await apiRequest("PATCH", `/api/admin/rw3law/${editingId}`, body);
      } else {
        await apiRequest("POST", "/api/admin/rw3law", body);
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Draft diperbarui" : "Draft dibuat" });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setStructuredIsi(createEmptyStructuredIsi());
      invalidateRw3law();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/rw3law/${id}/approve`, {});
      return readJsonSafely<Rw3lawDokumen>(res);
    },
    onSuccess: (row) => {
      const nomor = row
        ? formatNomorPeraturanLengkap(row.nomorPeraturan, row.tahunNomor)
        : null;
      toast({
        title: "Peraturan dipublikasikan",
        description: nomor
          ? `${nomor} · v${row?.versi ?? "1.0"} · urutan ${row?.urutan ?? "—"}`
          : undefined,
      });
      invalidateRw3law();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const cabutMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest("PATCH", `/api/admin/rw3law/${id}/cabut`, {}, { timeoutMs: RW3LAW_ACTION_TIMEOUT_MS }),
    onSuccess: () => {
      toast({
        title: "Peraturan dicabut",
        description: "Pindah ke arsip dicabut. Bisa dihapus permanen setelah ini.",
      });
      invalidateRw3law();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
    onSettled: () => setCabutTarget(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/rw3law/${id}`, undefined, {
        timeoutMs: RW3LAW_ACTION_TIMEOUT_MS,
      });
      const body = await readJsonSafely<{ id?: number }>(res);
      if (body?.id !== id) {
        throw new Error("Hapus gagal: respons server tidak sesuai.");
      }
      return body;
    },
    onSuccess: async (_data, id) => {
      removeFromRw3lawLists(id);
      toast({ title: "Peraturan dihapus permanen" });
      await invalidateRw3law();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
    onSettled: () => setDeleteTarget(null),
  });

  const grouped = useMemo(() => {
    const berlaku = list.filter((d) => d.status === "disetujui");
    const draft = list.filter((d) => d.status === "draft");
    const dicabut = list.filter((d) => d.status === "dicabut");
    return { berlaku, draft, dicabut };
  }, [list]);

  const draftRevisiByParentId = useMemo(() => {
    const map = new Map<number, Rw3lawDokumen>();
    for (const d of draftList) {
      if (d.revisiDariId != null) map.set(d.revisiDariId, d);
    }
    return map;
  }, [draftList]);

  const handleBuatRevisi = useCallback(
    async (parentId: number) => {
      const existing = draftRevisiByParentId.get(parentId);
      if (existing) {
        setFilterStatus("semua");
        openEditDraft(existing);
        toast({
          title: "Melanjutkan draft revisi",
          description: `Versi ${existing.versi ?? "—"}`,
        });
        return;
      }

      setRevisiLoadingId(parentId);
      try {
        const res = await apiRequest("POST", `/api/admin/rw3law/${parentId}/revisi`, undefined, {
          timeoutMs: RW3LAW_ACTION_TIMEOUT_MS,
        });
        const row = await readJsonSafely<Rw3lawDokumen>(res);
        if (!row?.id || !row.isi) {
          throw new Error(
            "Respons server tidak valid. Muat ulang halaman; jika masih gagal, restart server (npm run dev).",
          );
        }

        setFilterStatus("semua");
        openEditDraft(row);

        toast({
          title: "Editor revisi dibuka",
          description: `Versi ${row.versi ?? "—"} — sunting isi lalu klik Setujui. Peraturan lama dicabut otomatis.`,
        });
        await invalidateRw3law();
      } catch (e: unknown) {
        const msg = getApiErrorMessage(e);
        toast({
          title: "Gagal membuat revisi",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setRevisiLoadingId(null);
      }
    },
    [draftRevisiByParentId, openEditDraft, toast, invalidateRw3law],
  );

  const openPreview = (d: Rw3lawDokumen) => {
    setPreviewDoc(d);
  };

  const draftCount = draftList.length;

  const renderDocCard = (d: Rw3lawDokumen) => {
    const nomorLabel = formatNomorPeraturanLengkap(d.nomorPeraturan, d.tahunNomor);
    return (
    <Card key={d.id} data-testid={`card-rw3law-admin-${d.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {nomorLabel && (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(163,55%,28%)]">
                {nomorLabel}
              </p>
            )}
            <p className="font-semibold text-sm">{d.judul}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {rw3lawKategoriLabels[d.kategori] ?? d.kategori}
              {d.rtAsal != null ? ` · RT ${String(d.rtAsal).padStart(2, "0")}` : ""}
              {d.versi ? ` · v${d.versi}` : ""}
              {d.revisiDariId ? " · revisi" : ""}
            </p>
          </div>
          <Badge className={`${statusBadgeClass(d.status)} text-[10px] flex-shrink-0`}>
            {rw3lawStatusLabels[d.status] ?? d.status}
          </Badge>
        </div>

        {d.catatanInternal && (
          <p className="text-xs bg-muted p-2 rounded-md">
            <span className="font-medium">Catatan internal:</span> {d.catatanInternal}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1 border-t">
          <Button size="sm" variant="outline" onClick={() => openPreview(d)}>
            <Eye className="w-3 h-3 mr-1" />
            Pratinjau
          </Button>
          {d.status === "draft" && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEditDraft(d)}>
                <Pencil className="w-3 h-3 mr-1" />
                Edit draft
              </Button>
              <Button
                size="sm"
                className="bg-green-700 hover:bg-green-800"
                onClick={() => approveMutation.mutate(d.id)}
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Setujui & publikasikan
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setDeleteTarget(d)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Hapus draft
              </Button>
            </>
          )}
          {d.status === "disetujui" && (
            <>
              {draftRevisiByParentId.has(d.id) ? (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  type="button"
                  onClick={() => {
                    const pending = draftRevisiByParentId.get(d.id)!;
                    setFilterStatus("semua");
                    openEditDraft(pending);
                    toast({
                      title: "Melanjutkan draft revisi",
                      description: `Versi ${pending.versi ?? "—"}`,
                    });
                  }}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Lanjutkan revisi
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => void handleBuatRevisi(d.id)}
                  disabled={revisiLoadingId === d.id}
                >
                  {revisiLoadingId === d.id ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <GitBranch className="w-3 h-3 mr-1" />
                  )}
                  {revisiLoadingId === d.id ? "Membuat…" : "Buat revisi"}
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setCabutTarget(d)}
                disabled={cabutMutation.isPending}
              >
                <Ban className="w-3 h-3 mr-1" />
                Cabut
              </Button>
            </>
          )}
          {d.status === "dicabut" && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setDeleteTarget(d)}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Hapus permanen
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {d.tahunNomor ? `Arsip penomeran ${d.tahunNomor}` : ""}
          {d.createdBy ? `${d.tahunNomor ? " · " : ""}Oleh ${d.createdBy}` : ""}
          {d.disetujuiOleh ? ` · Disetujui ${d.disetujuiOleh}` : ""}
          {d.updatedAt ? ` · Diubah ${new Date(d.updatedAt).toLocaleDateString("id-ID")}` : ""}
        </p>
      </CardContent>
    </Card>
    );
  };

  const renderArsipDicabut = (docs: Rw3lawDokumen[]) => {
    const byTahun = groupByTahunNomor(docs);
    const tanpaTahun = docs.filter((d) => !d.tahunNomor);
    return (
      <div className="space-y-5">
        {byTahun.map(({ tahun, items }) => (
          <div key={tahun} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Arsip tahun {tahun}
            </h4>
            {items.map(renderDocCard)}
          </div>
        ))}
        {tanpaTahun.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Arsip lainnya
            </h4>
            {tanpaTahun.map(renderDocCard)}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title: string, docs: Rw3lawDokumen[], hint?: string) => (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
          Tidak ada dokumen.
        </p>
      ) : (
        docs.map(renderDocCard)
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Scale className="w-6 h-6 text-[hsl(163,55%,22%)]" />
          <h2 className="text-xl font-bold" data-testid="text-admin-rw3law-title">
            RW3LAW — Peraturan RW
          </h2>
        </div>
        <Button size="sm" onClick={openCreate} data-testid="button-buat-draft-rw3law">
          <Plus className="w-4 h-4 mr-1" />
          Draft baru
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Hanya <strong>draft</strong> yang dapat diedit. Peraturan <strong>berlaku</strong> harus dicabut dulu
        sebelum dihapus permanen. Di halaman publik, berlaku dan dicabut ditampilkan terpisah.
      </p>

      {overviewError ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-destructive">Koneksi database RW3LAW gagal.</span>
            <Button size="sm" variant="outline" onClick={() => refetchOverview()}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : overview?.ready ? (
        <Card className="border-green-200 bg-green-50/80" data-testid="rw3law-db-status">
          <CardContent className="p-3 flex flex-wrap items-center gap-2 text-sm text-green-900">
            <Database className="w-4 h-4 flex-shrink-0" />
            <span>
              Terhubung ke database — {overview.counts.total} dokumen ({overview.counts.draft} draft,{" "}
              {overview.counts.disetujui} berlaku, {overview.counts.dicabut} dicabut). Halaman publik:{" "}
              {overview.publicCount} peraturan.
            </span>
            <Button size="sm" variant="ghost" className="h-7 ml-auto" onClick={() => refetchOverview()}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 min-w-[160px]">
            <Label>Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="admin-filter-status-rw3law">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua</SelectItem>
                <SelectItem value="draft">Draft ({draftCount})</SelectItem>
                <SelectItem value="disetujui">Berlaku</SelectItem>
                <SelectItem value="dicabut">Dicabut</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {listError ? (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-destructive">
              {listQueryError instanceof Error ? listQueryError.message : "Gagal memuat data"}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetchList()}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Muat ulang
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Belum ada dokumen. Buat draft peraturan baru.
          </CardContent>
        </Card>
      ) : filterStatus === "semua" ? (
        <div className="space-y-8">
          {renderSection(
            "Peraturan berlaku",
            grouped.berlaku,
            "Tampil di halaman publik (bagian peraturan berlaku). Tidak dapat diedit — cabut dulu jika perlu diubah.",
          )}
          {renderSection(
            "Draft",
            grouped.draft,
            "Belum dipublikasikan. Dapat diedit, disetujui, atau dihapus.",
          )}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dicabut (arsip)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dikelompokkan per tahun penomeran. Tidak berlaku — hanya arsip referensi di publik.
              </p>
            </div>
            {grouped.dicabut.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                Tidak ada dokumen.
              </p>
            ) : (
              renderArsipDicabut(grouped.dicabut)
            )}
          </div>
        </div>
      ) : filterStatus === "dicabut" ? (
        <div className="space-y-3">{renderArsipDicabut(list)}</div>
      ) : (
        <div className="space-y-3">{list.map(renderDocCard)}</div>
      )}

      <Dialog open={Boolean(previewDoc)} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-[#f4f1ea]">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="font-serif text-[#1a2744]">Pratinjau peraturan (publik)</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="px-4 pb-6">
              <Rw3lawDocumentView
                judul={previewDoc.judul}
                isi={previewDoc.isi}
                kategori={previewDoc.kategori}
                versi={previewDoc.versi}
                tanggalBerlaku={previewDoc.tanggalBerlaku}
                rtAsal={previewDoc.rtAsal}
                nomorPeraturan={previewDoc.nomorPeraturan}
                tahunNomor={previewDoc.tahunNomor}
                docketId={`RW3LAW-${String(previewDoc.id).padStart(4, "0")}`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setShowPreview(false);
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
            <DialogTitle className="text-lg">
              {editingId ? "Edit draft" : "Draft peraturan baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid lg:grid-cols-[minmax(0,260px)_1fr] gap-6 items-start">
              <aside className="space-y-3 lg:sticky lg:top-0">
                <div className="space-y-1.5">
                  <Label>Judul</Label>
                  <Input
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    data-testid="input-judul-rw3law"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rw3lawKategoriOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>RT asal (opsional)</Label>
                  <Select
                    value={form.rtAsal || "none"}
                    onValueChange={(v) => setForm({ ...form, rtAsal: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="RW" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Seluruh RW —</SelectItem>
                      {ACTIVE_RT_NUMBERS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          RT {String(n).padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Berlaku sejak</Label>
                  <Input
                    type="date"
                    value={form.tanggalBerlaku}
                    onChange={(e) => setForm({ ...form, tanggalBerlaku: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Tahun penomeran mengikuti tanggal ini (atau tahun persetujuan jika kosong).
                  </p>
                </div>
                <div className="rounded-md border border-[hsl(163,55%,22%)]/25 bg-[hsl(163,55%,22%)]/5 px-3 py-2.5 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(163,55%,28%)]">
                    Saat dipublikasikan (otomatis)
                  </p>
                  {publishPreviewQuery.isPending ? (
                    <p className="text-xs text-muted-foreground">Menghitung…</p>
                  ) : publishPreviewQuery.data ? (
                    <>
                      <p className="text-sm font-medium text-foreground">
                        {publishPreviewQuery.data.label}
                      </p>
                      <ul className="text-[11px] text-muted-foreground space-y-0.5">
                        <li>
                          Versi <span className="font-medium text-foreground">{publishPreviewQuery.data.versiBerikut}</span>
                          {publishPreviewQuery.data.adalahRevisi ? " (revisi)" : " (peraturan baru)"}
                        </li>
                        <li>
                          Urutan tampil #{publishPreviewQuery.data.urutanBerikut} di daftar berlaku
                        </li>
                        <li>Tahun penomeran {publishPreviewQuery.data.tahun}</li>
                      </ul>
                      <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                        Nomor, versi, dan urutan tidak perlu diisi manual. Sistem mencegah nomor
                        ganda per tahun.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Pratinjau tidak tersedia.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Catatan internal</Label>
                  <Textarea
                    rows={2}
                    className="text-sm"
                    value={form.catatanInternal}
                    onChange={(e) => setForm({ ...form, catatanInternal: e.target.value })}
                  />
                </div>
              </aside>

              <main className="space-y-3 min-w-0">
                <Label className="text-base font-semibold">Isi peraturan</Label>
                <Rw3lawIsiEditor value={structuredIsi} onChange={setStructuredIsi} />
                {showPreview && form.judul.trim() && isiValid && (
                  <div className="rounded-lg border border-[#d4cfc4] bg-[#fffef9] p-4 sm:p-5 overflow-y-auto max-h-[50vh]">
                    <p className="text-xs uppercase tracking-wider text-[#6b6b6b] font-serif mb-3">
                      Pratinjau isi (sama dengan tampilan publik)
                    </p>
                    <p className="font-serif text-sm font-bold text-[#1a2744] mb-4">{form.judul.trim()}</p>
                    <Rw3lawStructuredBody isi={isiPreview} structured={structuredIsi} />
                  </div>
                )}
              </main>
            </div>
          </div>

          <DialogFooter className="shrink-0 px-6 py-4 border-t flex-wrap gap-2 sm:justify-between bg-background">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview((v) => !v)}
              disabled={!form.judul.trim() || !isiValid}
            >
              <Eye className="w-4 h-4 mr-1" />
              {showPreview ? "Sembunyikan pratinjau" : "Pratinjau peraturan"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.judul.trim() || !isiValid}
              >
                Simpan draft
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(cabutTarget)}
        onOpenChange={(o) => {
          if (!o) setCabutTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cabut peraturan?</AlertDialogTitle>
            <AlertDialogDescription>
              {cabutTarget && (
                <>
                  <span className="font-medium text-foreground">{cabutTarget.judul}</span> tidak
                  lagi berlaku dan dipindah ke arsip dicabut di halaman publik. Untuk menghapus dari
                  database, cabut terlebih dahulu lalu gunakan &quot;Hapus permanen&quot;.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!cabutTarget) return;
                const id = cabutTarget.id;
                setCabutTarget(null);
                cabutMutation.mutate(id);
              }}
            >
              Ya, cabut
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.status === "draft" ? "Hapus draft?" : "Hapus permanen?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">{deleteTarget.judul}</span> akan
                  dihapus dari database dan tidak dapat dikembalikan.
                  {deleteTarget.status === "disetujui" && (
                    <span className="block mt-2 text-destructive">
                      Peraturan masih berlaku — cabut terlebih dahulu.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                const id = deleteTarget.id;
                setDeleteTarget(null);
                deleteMutation.mutate(id);
              }}
            >
              Hapus permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
