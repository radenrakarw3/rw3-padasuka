import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getApiErrorMessage, getQueryFn, readJsonSafely } from "@/lib/queryClient";
import { invalidateVisitrw3Queries } from "@/lib/visitrw3-invalidate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Visitrw3SurveyKontribusiFields,
  defaultSurveyKontribusiState,
  surveyKontribusiToBody,
  type Visitrw3SurveyKontribusiState,
} from "@/components/gov/visitrw3-survey-kontribusi-fields";
import { rtOptions, jumlahPintuOptions, jenisPropertiOptions } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3EmptyState,
  Visitrw3FormCard,
  Visitrw3ListItem,
  Visitrw3RtBadge,
  Visitrw3Toolbar,
} from "@/components/admin/visitrw3-admin-ui";
import { Plus, Pencil, Trash2, Building2, Phone, MapPin, DoorOpen, Check } from "lucide-react";

interface PemilikKost {
  id: number;
  namaKost: string;
  namaPemilik: string;
  nomorWaPemilik: string;
  namaPenanggungJawab?: string | null;
  nomorWaPenanggungJawab?: string | null;
  rt: number;
  alamatLengkap: string;
  jumlahPintu: number;
  izinTinggal?: boolean;
  izinBisnis?: boolean;
  jenisProperti?: string;
  statusProperti?: string;
  nomorPendaftaran?: string | null;
  catatanPemohon?: string | null;
  createdAt: string;
}

export default function AdminVisitrw3Properti() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<PemilikKost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PemilikKost | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRt, setFilterRt] = useState<string>("semua");
  const [filterStatus, setFilterStatus] = useState<string>("menunggu");
  const [approveTarget, setApproveTarget] = useState<PemilikKost | null>(null);
  const [surveyForm, setSurveyForm] = useState<Visitrw3SurveyKontribusiState>(defaultSurveyKontribusiState);

  const [formData, setFormData] = useState({
    namaKost: "",
    namaPemilik: "",
    nomorWaPemilik: "",
    namaPenanggungJawab: "",
    nomorWaPenanggungJawab: "",
    rt: "",
    alamatLengkap: "",
    jumlahPintu: "1",
    izinTinggal: true,
    izinBisnis: false,
    jenisProperti: "kost",
  });

  const { data: pemilikList, isLoading } = useQuery<PemilikKost[]>({
    queryKey: ["/api/pemilik-kost"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/pemilik-kost", data);
      return readJsonSafely(res);
    },
    onSuccess: () => {
      invalidateVisitrw3Queries(queryClient, { includeKas: false });
      toast({ title: "Berhasil", description: "Properti berhasil ditambahkan" });
      resetForm();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/pemilik-kost/${id}`, data);
      return readJsonSafely(res);
    },
    onSuccess: () => {
      invalidateVisitrw3Queries(queryClient, { includeKas: false });
      toast({ title: "Berhasil", description: "Data properti berhasil diperbarui" });
      resetForm();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: ReturnType<typeof surveyKontribusiToBody> }) => {
      const res = await apiRequest("PATCH", `/api/admin/visitrw3/properti/${id}/approve`, body);
      return readJsonSafely(res);
    },
    onSuccess: () => {
      invalidateVisitrw3Queries(queryClient);
      setApproveTarget(null);
      setSurveyForm(defaultSurveyKontribusiState());
      toast({
        title: "Properti disetujui",
        description: "Properti aktif; kontribusi (jika ada) dicatat ke Kas RW",
      });
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pemilik-kost/${id}`);
      return readJsonSafely(res);
    },
    onSuccess: () => {
      invalidateVisitrw3Queries(queryClient, { includeKas: false });
      toast({ title: "Berhasil", description: "Properti berhasil dihapus" });
      setDeleteTarget(null);
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal menghapus", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  function resetForm() {
    setFormData({
      namaKost: "",
      namaPemilik: "",
      nomorWaPemilik: "",
      namaPenanggungJawab: "",
      nomorWaPenanggungJawab: "",
      rt: "",
      alamatLengkap: "",
      jumlahPintu: "1",
      izinTinggal: true,
      izinBisnis: false,
      jenisProperti: "kost",
    });
    setEditData(null);
    setShowForm(false);
  }

  function handleEdit(item: PemilikKost) {
    setEditData(item);
    setFormData({
      namaKost: item.namaKost,
      namaPemilik: item.namaPemilik,
      nomorWaPemilik: item.nomorWaPemilik,
      namaPenanggungJawab: item.namaPenanggungJawab || "",
      nomorWaPenanggungJawab: item.nomorWaPenanggungJawab || "",
      rt: String(item.rt),
      alamatLengkap: item.alamatLengkap,
      jumlahPintu: String(item.jumlahPintu),
      izinTinggal: item.izinTinggal !== false,
      izinBisnis: Boolean(item.izinBisnis),
      jenisProperti: item.jenisProperti || "kost",
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      namaKost: formData.namaKost,
      namaPemilik: formData.namaPemilik,
      nomorWaPemilik: formData.nomorWaPemilik,
      namaPenanggungJawab: formData.namaPenanggungJawab.trim() || null,
      nomorWaPenanggungJawab: formData.nomorWaPenanggungJawab.trim() || null,
      rt: parseInt(formData.rt),
      alamatLengkap: formData.alamatLengkap,
      jumlahPintu: parseInt(formData.jumlahPintu),
      izinTinggal: formData.izinTinggal,
      izinBisnis: formData.izinBisnis,
      jenisProperti: formData.jenisProperti,
    };
    if (editData) {
      updateMutation.mutate({ id: editData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const filtered = (pemilikList || []).filter((p) => {
    const matchSearch = searchTerm === "" ||
      p.namaKost.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.namaPemilik.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRt = filterRt === "semua" || p.rt === parseInt(filterRt);
    const st = p.statusProperti ?? "menunggu_verifikasi";
    const matchStatus =
      filterStatus === "semua" ||
      (filterStatus === "menunggu" && st === "menunggu_verifikasi") ||
      (filterStatus === "aktif" && st === "aktif");
    return matchSearch && matchRt && matchStatus;
  });

  const menungguCount = (pemilikList || []).filter((p) => p.statusProperti === "menunggu_verifikasi").length;

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        title="Properti (kost & kontrakan)"
        description={
          menungguCount > 0
            ? `${pemilikList?.length || 0} properti · ${menungguCount} menunggu verifikasi`
            : `${pemilikList?.length || 0} properti terdaftar`
        }
        actions={
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-tambah-pemilik">
            <Plus className="w-4 h-4 mr-1" /> Tambah properti
          </Button>
        }
      />

      <Visitrw3Toolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari nama kost/pemilik..."
      >
        <Select value={filterRt} onValueChange={setFilterRt}>
          <SelectTrigger className="w-28 h-9" data-testid="select-filter-rt-pemilik">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua RT</SelectItem>
            {rtOptions.map((rt) => (
              <SelectItem key={rt} value={String(rt)}>RT {String(rt).padStart(2, "0")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            <SelectItem value="menunggu">Menunggu</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
          </SelectContent>
        </Select>
      </Visitrw3Toolbar>

      {showForm && (
        <Visitrw3FormCard title={editData ? "Edit properti" : "Tambah properti"} onClose={resetForm}>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs">Nama Kost/Kontrakan</Label>
                <Input value={formData.namaKost} onChange={(e) => setFormData({ ...formData, namaKost: e.target.value })} required data-testid="input-nama-kost" />
              </div>
              <div>
                <Label className="text-xs">Nama Pemilik</Label>
                <Input value={formData.namaPemilik} onChange={(e) => setFormData({ ...formData, namaPemilik: e.target.value })} required data-testid="input-nama-pemilik" />
              </div>
              <div>
                <Label className="text-xs">No WA Pemilik</Label>
                <Input value={formData.nomorWaPemilik} onChange={(e) => setFormData({ ...formData, nomorWaPemilik: e.target.value })} required placeholder="08xxxxxxxxxx" data-testid="input-wa-pemilik" />
              </div>
              <div>
                <Label className="text-xs">Penanggung jawab pengelola</Label>
                <Input
                  value={formData.namaPenanggungJawab}
                  onChange={(e) => setFormData({ ...formData, namaPenanggungJawab: e.target.value })}
                  placeholder="Nama orang yang mengelola"
                />
              </div>
              <div>
                <Label className="text-xs">WA penanggung jawab</Label>
                <Input
                  value={formData.nomorWaPenanggungJawab}
                  onChange={(e) => setFormData({ ...formData, nomorWaPenanggungJawab: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">RT</Label>
                  <Select value={formData.rt} onValueChange={(v) => setFormData({ ...formData, rt: v })}>
                    <SelectTrigger data-testid="select-rt-pemilik"><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                    <SelectContent>
                      {rtOptions.map((rt) => (
                        <SelectItem key={rt} value={String(rt)}>RT {String(rt).padStart(2, "0")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Jumlah Pintu</Label>
                  <Select value={formData.jumlahPintu} onValueChange={(v) => setFormData({ ...formData, jumlahPintu: v })}>
                    <SelectTrigger data-testid="select-jumlah-pintu"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {jumlahPintuOptions.map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} Pintu</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Alamat Lengkap</Label>
                <Input value={formData.alamatLengkap} onChange={(e) => setFormData({ ...formData, alamatLengkap: e.target.value })} required data-testid="input-alamat-pemilik" />
              </div>
              <div>
                <Label className="text-xs">Jenis properti</Label>
                <Select value={formData.jenisProperti} onValueChange={(v) => setFormData({ ...formData, jenisProperti: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {jenisPropertiOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="izin-tinggal"
                    checked={formData.izinTinggal}
                    onCheckedChange={(c) => setFormData({ ...formData, izinTinggal: Boolean(c) })}
                  />
                  <Label htmlFor="izin-tinggal" className="text-xs font-normal">Izinkan pengajuan tinggal (Visit RW3)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="izin-bisnis"
                    checked={formData.izinBisnis}
                    onCheckedChange={(c) => setFormData({ ...formData, izinBisnis: Boolean(c) })}
                  />
                  <Label htmlFor="izin-bisnis" className="text-xs font-normal">Izinkan pengajuan bisnis (Visit RW3)</Label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-pemilik">
                {(createMutation.isPending || updateMutation.isPending) ? "Menyimpan..." : editData ? "Perbarui" : "Simpan"}
              </Button>
            </form>
        </Visitrw3FormCard>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Visitrw3EmptyState
          icon={Building2}
          title={(pemilikList?.length ?? 0) === 0 ? "Belum ada properti terdaftar" : "Tidak ada properti yang cocok dengan filter"}
          description={
            (pemilikList?.length ?? 0) === 0
              ? "Tambahkan properti di sini atau arahkan pemilik mendaftar lewat form publik, lalu setujui agar muncul di pengajuan tinggal/bisnis."
              : "Ubah kata kunci pencarian atau filter RT/status."
          }
          action={
            (pemilikList?.length ?? 0) === 0 ? (
              <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Tambah properti
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Visitrw3ListItem
              key={item.id}
              testId={`card-pemilik-${item.id}`}
              accent={item.statusProperti === "menunggu_verifikasi" ? "warning" : "default"}
              actions={
                <>
                  {item.statusProperti === "menunggu_verifikasi" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600"
                      title="Setujui properti"
                      onClick={() => {
                        setSurveyForm(defaultSurveyKontribusiState());
                        setApproveTarget(item);
                      }}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item)} data-testid={`button-edit-pemilik-${item.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setDeleteTarget(item)} data-testid={`button-delete-pemilik-${item.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              }
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-[hsl(163,55%,22%)] shrink-0" />
                <span className="font-semibold text-sm truncate" data-testid={`text-nama-kost-${item.id}`}>{item.namaKost}</span>
                <Visitrw3RtBadge rt={item.rt} />
                {item.statusProperti === "menunggu_verifikasi" && (
                  <span className="text-[10px] font-semibold bg-amber-500 text-white px-2 py-0.5 rounded-full">Menunggu</span>
                )}
              </div>
              {item.nomorPendaftaran && (
                <p className="text-[10px] font-mono text-muted-foreground mb-1">{item.nomorPendaftaran}</p>
              )}
              <p className="text-xs text-muted-foreground">Pemilik: {item.namaPemilik}</p>
              {item.namaPenanggungJawab && (
                <p className="text-xs text-muted-foreground">
                  PJ: {item.namaPenanggungJawab}
                  {item.nomorWaPenanggungJawab ? ` · ${item.nomorWaPenanggungJawab}` : ""}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.nomorWaPemilik}</span>
                <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" />{item.jumlahPintu} pintu</span>
                <span className="flex items-center gap-1 min-w-0"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{item.alamatLengkap}</span></span>
              </div>
            </Visitrw3ListItem>
          ))}
        </div>
      )}

      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Setujui properti</DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <p className="text-sm text-muted-foreground">
              {approveTarget.namaKost} · {approveTarget.nomorPendaftaran || `ID ${approveTarget.id}`}
            </p>
          )}
          <Visitrw3SurveyKontribusiFields
            {...surveyForm}
            onChange={(patch) => setSurveyForm((s) => ({ ...s, ...patch }))}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Batal
            </Button>
            <Button
              className="gap-1"
              disabled={approveMutation.isPending || !approveTarget}
              onClick={() => {
                if (!approveTarget) return;
                try {
                  const body = surveyKontribusiToBody(surveyForm);
                  approveMutation.mutate({ id: approveTarget.id, body });
                } catch (e: unknown) {
                  toast({ title: "Lengkapi kontribusi", description: getApiErrorMessage(e), variant: "destructive" });
                }
              }}
            >
              <Check className="w-4 h-4" /> Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus properti?</AlertDialogTitle>
            <AlertDialogDescription>
              Menghapus "{deleteTarget?.namaKost}" akan menghapus semua data warga singgah yang terkait. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
              data-testid="button-confirm-delete-pemilik"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Visitrw3AdminShell>
  );
}
