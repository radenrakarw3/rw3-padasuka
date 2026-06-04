import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, Ban, Pencil, Scale, Eye, RefreshCw, Database } from "lucide-react";
import { Rw3lawDocumentView } from "@/components/gov/rw3law-document-view";
import type { Rw3lawDokumen } from "@shared/schema";
import { rw3lawKategoriOptions, rw3lawKategoriLabels, rw3lawStatusLabels } from "@/lib/constants";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { Link } from "wouter";

type FormState = {
  judul: string;
  kategori: string;
  rtAsal: string;
  versi: string;
  tanggalBerlaku: string;
  urutan: string;
  isi: string;
  catatanInternal: string;
};

const emptyForm: FormState = {
  judul: "",
  kategori: "umum",
  rtAsal: "",
  versi: "1.0",
  tanggalBerlaku: "",
  urutan: "0",
  isi: "",
  catatanInternal: "",
};

function statusBadgeClass(status: string) {
  if (status === "disetujui") return "bg-green-100 text-green-800";
  if (status === "dicabut") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

function formToBody(f: FormState) {
  return {
    judul: f.judul.trim(),
    kategori: f.kategori,
    rtAsal: f.rtAsal ? parseInt(f.rtAsal, 10) : null,
    versi: f.versi.trim() || null,
    tanggalBerlaku: f.tanggalBerlaku.trim() || null,
    urutan: parseInt(f.urutan, 10) || 0,
    isi: f.isi.trim(),
    catatanInternal: f.catatanInternal.trim() || null,
  };
}

function dokumenToForm(d: Rw3lawDokumen): FormState {
  return {
    judul: d.judul,
    kategori: d.kategori,
    rtAsal: d.rtAsal != null ? String(d.rtAsal) : "",
    versi: d.versi ?? "",
    tanggalBerlaku: d.tanggalBerlaku ?? "",
    urutan: String(d.urutan ?? 0),
    isi: d.isi,
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

  const invalidateRw3law = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3law"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3law/status/overview"] });
    queryClient.invalidateQueries({ queryKey: ["/api/public/rw3law"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = formToBody(form);
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
      invalidateRw3law();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("PATCH", `/api/admin/rw3law/${id}/approve`, {}),
    onSuccess: () => {
      toast({ title: "Peraturan dipublikasikan" });
      invalidateRw3law();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const cabutMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("PATCH", `/api/admin/rw3law/${id}/cabut`, {}),
    onSuccess: () => {
      toast({ title: "Peraturan dicabut" });
      invalidateRw3law();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowPreview(false);
    setDialogOpen(true);
  };

  const openEdit = (d: Rw3lawDokumen) => {
    setEditingId(d.id);
    setForm(dokumenToForm(d));
    setShowPreview(false);
    setDialogOpen(true);
  };

  const openPreview = (d: Rw3lawDokumen) => {
    setPreviewDoc(d);
  };

  const draftCount = list.filter((d) => d.status === "draft").length;

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
        Susun draft bersama pengurus RW dan RT (catat RT asal). Setelah disetujui, peraturan tampil di
        halaman publik RW3LAW.
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
      ) : (
        <div className="space-y-3">
          {list.map((d) => (
            <Card key={d.id} data-testid={`card-rw3law-admin-${d.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{d.judul}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rw3lawKategoriLabels[d.kategori] ?? d.kategori}
                      {d.rtAsal != null ? ` · RT ${String(d.rtAsal).padStart(2, "0")}` : ""}
                      {d.versi ? ` · v${d.versi}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{d.isi}</p>
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
                    Pratinjau peraturan
                  </Button>
                  {d.status === "draft" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
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
                    </>
                  )}
                  {d.status === "disetujui" && (
                    <>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/rwlaw/${d.slug}`} target="_blank">
                          Lihat publik
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => cabutMutation.mutate(d.id)}
                        disabled={cabutMutation.isPending}
                      >
                        <Ban className="w-3 h-3 mr-1" />
                        Cabut
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {d.createdBy ? `Oleh ${d.createdBy}` : ""}
                  {d.disetujuiOleh ? ` · Disetujui ${d.disetujuiOleh}` : ""}
                  {d.updatedAt
                    ? ` · Diubah ${new Date(d.updatedAt).toLocaleDateString("id-ID")}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
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
        <DialogContent
          className={
            showPreview
              ? "max-w-4xl max-h-[92vh] overflow-y-auto"
              : "max-w-lg max-h-[90vh] overflow-y-auto"
          }
        >
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit draft" : "Draft peraturan baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Judul</Label>
              <Input
                value={form.judul}
                onChange={(e) => setForm({ ...form, judul: e.target.value })}
                data-testid="input-judul-rw3law"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                <Select value={form.rtAsal || "none"} onValueChange={(v) => setForm({ ...form, rtAsal: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="RW" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— RW —</SelectItem>
                    {ACTIVE_RT_NUMBERS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        RT {String(n).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Versi</Label>
                <Input value={form.versi} onChange={(e) => setForm({ ...form, versi: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Berlaku sejak</Label>
                <Input
                  type="date"
                  value={form.tanggalBerlaku}
                  onChange={(e) => setForm({ ...form, tanggalBerlaku: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Urutan tampil</Label>
              <Input
                type="number"
                min={0}
                value={form.urutan}
                onChange={(e) => setForm({ ...form, urutan: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Isi peraturan</Label>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Format peraturan resmi: baris <span className="font-mono">MENIMBANG …</span>, judul pasal{" "}
                <span className="font-mono">PASAL 1 — Judul</span>, ayat bernomor{" "}
                <span className="font-mono">1. …</span>
              </p>
              <Textarea
                rows={10}
                value={form.isi}
                onChange={(e) => setForm({ ...form, isi: e.target.value })}
                data-testid="input-isi-rw3law"
              />
            </div>
            {showPreview && form.judul.trim() && form.isi.trim().length >= 20 && (
              <div className="rounded-lg border bg-[#f4f1ea] p-3 overflow-x-auto">
                <Rw3lawDocumentView
                  judul={form.judul.trim()}
                  isi={form.isi.trim()}
                  kategori={form.kategori}
                  versi={form.versi.trim() || null}
                  tanggalBerlaku={form.tanggalBerlaku.trim() || null}
                  rtAsal={form.rtAsal ? parseInt(form.rtAsal, 10) : null}
                  docketId={editingId ? `RW3LAW-${String(editingId).padStart(4, "0")}` : "RW3LAW-DRAFT"}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Catatan internal (tidak tampil publik)</Label>
              <Textarea
                rows={2}
                value={form.catatanInternal}
                onChange={(e) => setForm({ ...form, catatanInternal: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview((v) => !v)}
              disabled={!form.judul.trim() || form.isi.trim().length < 20}
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
                disabled={saveMutation.isPending || !form.judul.trim() || form.isi.trim().length < 20}
              >
                Simpan draft
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
