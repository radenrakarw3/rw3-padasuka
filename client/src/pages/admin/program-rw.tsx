import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, CalendarDays, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, UserPlus, Search } from "lucide-react";
import { rtOptions, kategoriProgramOptions, statusProgramOptions } from "@/lib/constants";
import type { KartuKeluarga } from "@shared/schema";

type Program = {
  id: number; namaProgram: string; deskripsi: string | null;
  tanggalPelaksanaan: string; kategoriSasaran: string;
  targetRt: number | null; status: string; createdAt: string | null;
};
type Peserta = {
  id: number; programId: number; kkId: number | null; namaManual: string | null;
  kehadiran: string; catatan: string | null;
  nomorKk: string | null; alamat: string | null; kepalaKeluarga: string | null;
};

const defaultForm = {
  namaProgram: "", deskripsi: "", tanggalPelaksanaan: "",
  kategoriSasaran: "semua", targetRt: "", status: "rencana",
};

const statusColor: Record<string, string> = {
  rencana: "bg-blue-100 text-blue-700",
  berjalan: "bg-yellow-100 text-yellow-700",
  selesai: "bg-green-100 text-green-700",
  dibatalkan: "bg-red-100 text-red-700",
};

const statusIcon: Record<string, React.ReactNode> = {
  rencana: <Clock className="w-3 h-3" />,
  berjalan: <CheckCircle2 className="w-3 h-3" />,
  selesai: <CheckCircle2 className="w-3 h-3" />,
  dibatalkan: <XCircle className="w-3 h-3" />,
};

const kehadiranColor: Record<string, string> = {
  belum: "bg-gray-100 text-gray-600",
  hadir: "bg-green-100 text-green-700",
  tidak_hadir: "bg-red-100 text-red-600",
};

export default function AdminProgramRw() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [editForm, setEditForm] = useState({ ...defaultForm });
  const [deleteProgram, setDeleteProgram] = useState<Program | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [addPesertaDialogOpen, setAddPesertaDialogOpen] = useState(false);
  const [addPesertaForId, setAddPesertaForId] = useState<number | null>(null);
  const [pesertaMode, setPesertaMode] = useState<"kk" | "manual">("kk");
  const [kkSearch, setKkSearch] = useState("");
  const [selectedKkId, setSelectedKkId] = useState<number | null>(null);
  const [namaManual, setNamaManual] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");

  const { data: programList = [], isLoading } = useQuery<Program[]>({
    queryKey: ["/api/program-rw"],
  });

  const { data: kkList = [] } = useQuery<KartuKeluarga[]>({
    queryKey: ["/api/kk"],
  });

  const { data: pesertaList = [] } = useQuery<Peserta[]>({
    queryKey: [`/api/program-rw/${expandedId}/peserta`],
    enabled: expandedId !== null,
  });

  const filteredKk = useMemo(() => {
    const q = kkSearch.toLowerCase();
    return kkList.filter(k =>
      k.nomorKk.includes(kkSearch) || k.alamat.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [kkList, kkSearch]);

  const filtered = useMemo(() => {
    return programList.filter(p => {
      const matchSearch = !searchFilter || p.namaProgram.toLowerCase().includes(searchFilter.toLowerCase());
      const matchStatus = filterStatus === "semua" || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [programList, searchFilter, filterStatus]);

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/program-rw", {
        ...form,
        targetRt: form.targetRt ? parseInt(form.targetRt) : null,
        deskripsi: form.deskripsi || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Program berhasil ditambahkan" });
      setDialogOpen(false);
      setForm({ ...defaultForm });
      queryClient.invalidateQueries({ queryKey: ["/api/program-rw"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      await apiRequest("PATCH", `/api/program-rw/${editingId}`, {
        ...editForm,
        targetRt: editForm.targetRt ? parseInt(editForm.targetRt) : null,
        deskripsi: editForm.deskripsi || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Program diperbarui" });
      setEditDialogOpen(false);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/program-rw"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/program-rw/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Program dihapus" });
      setDeleteProgram(null);
      queryClient.invalidateQueries({ queryKey: ["/api/program-rw"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const addPesertaMutation = useMutation({
    mutationFn: async () => {
      if (!addPesertaForId) return;
      await apiRequest("POST", `/api/program-rw/${addPesertaForId}/peserta`, {
        kkId: pesertaMode === "kk" ? selectedKkId : null,
        namaManual: pesertaMode === "manual" ? namaManual : null,
      });
    },
    onSuccess: () => {
      toast({ title: "Peserta ditambahkan" });
      setAddPesertaDialogOpen(false);
      setSelectedKkId(null);
      setNamaManual("");
      setKkSearch("");
      queryClient.invalidateQueries({ queryKey: [`/api/program-rw/${addPesertaForId}/peserta`] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const updateKehadiranMutation = useMutation({
    mutationFn: async ({ programId, pesertaId, kehadiran }: { programId: number; pesertaId: number; kehadiran: string }) => {
      await apiRequest("PATCH", `/api/program-rw/${programId}/peserta/${pesertaId}`, { kehadiran });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/program-rw/${expandedId}/peserta`] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const deletePesertaMutation = useMutation({
    mutationFn: async ({ programId, pesertaId }: { programId: number; pesertaId: number }) => {
      await apiRequest("DELETE", `/api/program-rw/${programId}/peserta/${pesertaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/program-rw/${expandedId}/peserta`] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const openEdit = (p: Program) => {
    setEditingId(p.id);
    setEditForm({
      namaProgram: p.namaProgram,
      deskripsi: p.deskripsi || "",
      tanggalPelaksanaan: p.tanggalPelaksanaan,
      kategoriSasaran: p.kategoriSasaran,
      targetRt: p.targetRt?.toString() || "",
      status: p.status,
    });
    setEditDialogOpen(true);
  };

  const formatTanggal = (t: string) => {
    try {
      return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } catch { return t; }
  };

  const ringkasanPeserta = (programId: number) => {
    if (expandedId !== programId) return null;
    const hadir = pesertaList.filter(p => p.kehadiran === "hadir").length;
    const tidakHadir = pesertaList.filter(p => p.kehadiran === "tidak_hadir").length;
    const belum = pesertaList.filter(p => p.kehadiran === "belum").length;
    return { hadir, tidakHadir, belum, total: pesertaList.length };
  };

  const FormFields = ({ f, setF }: { f: typeof defaultForm; setF: (v: typeof defaultForm) => void }) => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-sm">Nama Program <span className="text-red-500">*</span></Label>
        <Input value={f.namaProgram} onChange={e => setF({...f, namaProgram: e.target.value})} placeholder="cth: Posyandu Bulan April" className="h-10" />
      </div>
      <div className="space-y-1">
        <Label className="text-sm">Deskripsi</Label>
        <Textarea value={f.deskripsi} onChange={e => setF({...f, deskripsi: e.target.value})} placeholder="Uraian kegiatan..." rows={2} className="resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Tanggal Pelaksanaan <span className="text-red-500">*</span></Label>
          <Input type="date" value={f.tanggalPelaksanaan} onChange={e => setF({...f, tanggalPelaksanaan: e.target.value})} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Status</Label>
          <Select value={f.status} onValueChange={v => setF({...f, status: v})}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusProgramOptions.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Kategori Sasaran</Label>
          <Select value={f.kategoriSasaran} onValueChange={v => setF({...f, kategoriSasaran: v})}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {kategoriProgramOptions.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Target RT (opsional)</Label>
          <Select value={f.targetRt || "semua"} onValueChange={v => setF({...f, targetRt: v === "semua" ? "" : v})}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua RT</SelectItem>
              {rtOptions.map(r => <SelectItem key={r} value={r.toString()}>RT {String(r).padStart(2,"0")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const summary = useMemo(() => ({
    total: programList.length,
    rencana: programList.filter(p => p.status === "rencana").length,
    berjalan: programList.filter(p => p.status === "berjalan").length,
    selesai: programList.filter(p => p.status === "selesai").length,
  }), [programList]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Program RW</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="w-4 h-4" /> Tambah Program</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tambah Program RW</DialogTitle></DialogHeader>
            <FormFields f={form} setF={setForm} />
            <Button className="w-full mt-1" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.namaProgram || !form.tanggalPelaksanaan}>
              {createMutation.isPending ? "Menyimpan..." : "Simpan Program"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Program", val: summary.total, cls: "text-foreground" },
          { label: "Rencana", val: summary.rencana, cls: "text-blue-600" },
          { label: "Berjalan", val: summary.berjalan, cls: "text-yellow-600" },
          { label: "Selesai", val: summary.selesai, cls: "text-green-600" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-2xl font-bold ${item.cls}`}>{item.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="Cari nama program..." className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            {statusProgramOptions.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada program RW</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const isExpanded = expandedId === p.id;
            const rs = ringkasanPeserta(p.id);
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{p.namaProgram}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[p.status] || "bg-gray-100 text-gray-600"}`}>
                          {statusIcon[p.status]} {p.status}
                        </span>
                        {p.targetRt && (
                          <Badge variant="outline" className="text-xs">RT {String(p.targetRt).padStart(2,"0")}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatTanggal(p.tanggalPelaksanaan)}</span>
                        <span className="capitalize">{p.kategoriSasaran}</span>
                      </div>
                      {p.deskripsi && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.deskripsi}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteProgram(p)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Peserta Section */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Peserta ({pesertaList.length})</span>
                          {rs && rs.total > 0 && (
                            <div className="flex gap-1 text-xs">
                              <span className="text-green-600">{rs.hadir} hadir</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-red-500">{rs.tidakHadir} tidak</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-gray-500">{rs.belum} belum</span>
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => {
                          setAddPesertaForId(p.id);
                          setPesertaMode("kk");
                          setSelectedKkId(null);
                          setNamaManual("");
                          setKkSearch("");
                          setAddPesertaDialogOpen(true);
                        }}>
                          <UserPlus className="w-3 h-3" /> Tambah
                        </Button>
                      </div>

                      {pesertaList.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Belum ada peserta terdaftar</p>
                      ) : (
                        <div className="space-y-1.5">
                          {pesertaList.map(ps => (
                            <div key={ps.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {ps.kepalaKeluarga || ps.namaManual || "—"}
                                </p>
                                {ps.nomorKk && <p className="text-[10px] text-muted-foreground">{ps.nomorKk} · {ps.alamat}</p>}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Select
                                  value={ps.kehadiran}
                                  onValueChange={v => updateKehadiranMutation.mutate({ programId: p.id, pesertaId: ps.id, kehadiran: v })}
                                >
                                  <SelectTrigger className={`h-6 w-28 text-xs px-2 ${kehadiranColor[ps.kehadiran] || ""}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="belum">Belum</SelectItem>
                                    <SelectItem value="hadir">Hadir</SelectItem>
                                    <SelectItem value="tidak_hadir">Tidak Hadir</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => deletePesertaMutation.mutate({ programId: p.id, pesertaId: ps.id })}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Program RW</DialogTitle></DialogHeader>
          <FormFields f={editForm} setF={setEditForm} />
          <Button className="w-full mt-1" onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editForm.namaProgram || !editForm.tanggalPelaksanaan}>
            {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Tambah Peserta Dialog */}
      <Dialog open={addPesertaDialogOpen} onOpenChange={setAddPesertaDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Peserta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant={pesertaMode === "kk" ? "default" : "outline"} onClick={() => setPesertaMode("kk")} className="flex-1">Pilih dari KK</Button>
              <Button size="sm" variant={pesertaMode === "manual" ? "default" : "outline"} onClick={() => setPesertaMode("manual")} className="flex-1">Input Manual</Button>
            </div>
            {pesertaMode === "kk" ? (
              <div className="space-y-2">
                <Label className="text-sm">Cari KK</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={kkSearch} onChange={e => setKkSearch(e.target.value)} placeholder="Cari nomor KK / alamat..." className="pl-9 h-10" />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-1">
                  {filteredKk.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Tidak ditemukan</p>
                  ) : filteredKk.map(k => (
                    <button
                      key={k.id}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors ${selectedKkId === k.id ? "bg-primary/10 font-medium" : ""}`}
                      onClick={() => setSelectedKkId(k.id)}
                    >
                      <span className="font-medium">{k.nomorKk}</span> · RT {String(k.rt).padStart(2,"0")} · {k.alamat}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-sm">Nama Peserta</Label>
                <Input value={namaManual} onChange={e => setNamaManual(e.target.value)} placeholder="Nama peserta..." className="h-10" />
              </div>
            )}
            <Button className="w-full" onClick={() => addPesertaMutation.mutate()}
              disabled={addPesertaMutation.isPending || (pesertaMode === "kk" && !selectedKkId) || (pesertaMode === "manual" && !namaManual.trim())}>
              {addPesertaMutation.isPending ? "Menyimpan..." : "Tambah Peserta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteProgram} onOpenChange={(open) => { if (!open) setDeleteProgram(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Program?</AlertDialogTitle>
            <AlertDialogDescription>
              Program <strong>{deleteProgram?.namaProgram}</strong> beserta seluruh data pesertanya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteProgram && deleteMutation.mutate(deleteProgram.id)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
