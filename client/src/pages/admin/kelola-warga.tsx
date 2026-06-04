import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { KependudukanAdminNav } from "@/components/admin/kependudukan-admin-nav";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  MessageCircle,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { KartuKeluarga } from "@shared/schema";
import { rtOptions } from "@/lib/constants";
import { StatusKependudukanBadge } from "@/components/kependudukan/status-kependudukan-badge";
import {
  WargaFormFields,
  defaultWargaForm,
  mapWargaToForm,
  toWargaPayload,
  validateWargaFormData,
  toWhatsappLink,
  type WargaFormValues,
  type WargaWithKk,
} from "@/components/kependudukan/warga-form";
import { labelStatusKependudukan } from "@shared/kependudukan-peristiwa";

const STATUS_FILTER_OPTIONS = [
  "semua",
  "Aktif",
  "Lahir",
  "Pindah Masuk",
  "Pindah Keluar",
  "Meninggal",
] as const;

const PER_PAGE = 10;
const defaultForm = defaultWargaForm;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

export default function AdminKelolaWarga() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<WargaFormValues>(defaultForm);
  const [editForm, setEditForm] = useState<WargaFormValues>(defaultForm);
  const [editingWargaId, setEditingWargaId] = useState<number | null>(null);
  const [kkSearch, setKkSearch] = useState("");
  const [kkDropdownOpen, setKkDropdownOpen] = useState(false);
  const [editKkSearch, setEditKkSearch] = useState("");
  const [editKkDropdownOpen, setEditKkDropdownOpen] = useState(false);
  const [deleteWarga, setDeleteWarga] = useState<WargaWithKk | null>(null);
  const kkPickerRef = useRef<HTMLDivElement>(null);
  const editKkPickerRef = useRef<HTMLDivElement>(null);
  const formErrors = useMemo(() => validateWargaFormData(form), [form]);
  const editFormErrors = useMemo(() => validateWargaFormData(editForm), [editForm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (kkPickerRef.current && !kkPickerRef.current.contains(event.target as Node)) {
        setKkDropdownOpen(false);
      }
      if (editKkPickerRef.current && !editKkPickerRef.current.contains(event.target as Node)) {
        setEditKkDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: kkList } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });
  const { data: wargaList, isLoading } = useQuery<WargaWithKk[]>({ queryKey: ["/api/warga-with-kk"] });

  const filteredWarga = useMemo(() => {
    return (
      wargaList?.filter((warga) => {
        if (warga.rt != null && !rtOptions.includes(warga.rt as (typeof rtOptions)[number])) {
          return false;
        }
        if (statusFilter !== "semua") {
          const label = labelStatusKependudukan(warga.statusKependudukan);
          if (label !== statusFilter) return false;
        }
        const query = search.toLowerCase();
        return (
          (warga.namaLengkap || "").toLowerCase().includes(query) ||
          (warga.nik || "").includes(search) ||
          (warga.nomorKk && warga.nomorKk.includes(search))
        );
      }) || []
    );
  }, [search, statusFilter, wargaList]);

  const totalPages = Math.ceil(filteredWarga.length / PER_PAGE);
  const paginatedWarga = filteredWarga.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const resetCreateDialog = () => {
    setDialogOpen(false);
    setForm(defaultForm);
    setKkSearch("");
    setKkDropdownOpen(false);
  };

  const resetEditDialog = () => {
    setEditDialogOpen(false);
    setEditingWargaId(null);
    setEditForm(defaultForm);
    setEditKkSearch("");
    setEditKkDropdownOpen(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/warga", toWargaPayload(form));
    },
    onSuccess: () => {
      toast({ title: "Warga ditambahkan" });
      resetCreateDialog();
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/kependudukan"] });
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingWargaId) return;
      await apiRequest("PATCH", `/api/warga/${editingWargaId}`, toWargaPayload(editForm));
    },
    onSuccess: () => {
      toast({ title: "Data warga diperbarui" });
      resetEditDialog();
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/kependudukan"] });
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteWargaMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/warga/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Warga berhasil dihapus" });
      setDeleteWarga(null);
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/kependudukan"] });
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal menghapus", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const openEditDialog = (warga: WargaWithKk) => {
    setEditForm(mapWargaToForm(warga));
    setEditingWargaId(warga.id);
    setEditDialogOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <KependudukanAdminNav title="Cari Warga" description="Pencarian individu dengan konteks kartu keluarga" />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetCreateDialog();
              return;
            }
            setDialogOpen(true);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-1.5" data-testid="button-tambah-warga">
              <Plus className="w-4 h-4" /> Tambah Warga
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Warga</DialogTitle>
            </DialogHeader>
            <WargaFormFields
              formData={form}
              setFormData={setForm}
              errors={formErrors}
              testIdPrefix="warga"
              searchVal={kkSearch}
              setSearchVal={setKkSearch}
              dropdownOpen={kkDropdownOpen}
              setDropdownOpen={setKkDropdownOpen}
              pickerRef={kkPickerRef}
              kkList={kkList}
              showVerifikasiAdmin
            />
            <Button
              className="w-full h-10"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || Object.keys(formErrors).length > 0}
              data-testid="button-simpan-warga"
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan Warga"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetEditDialog();
            return;
          }
          setEditDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Warga</DialogTitle>
          </DialogHeader>
          <WargaFormFields
            formData={editForm}
            setFormData={setEditForm}
            errors={editFormErrors}
            testIdPrefix="edit-warga"
            searchVal={editKkSearch}
            setSearchVal={setEditKkSearch}
            dropdownOpen={editKkDropdownOpen}
            setDropdownOpen={setEditKkDropdownOpen}
            pickerRef={editKkPickerRef}
            kkList={kkList}
            showVerifikasiAdmin
            showPindahKk
          />
          <Button
            className="w-full h-10"
            onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending || Object.keys(editFormErrors).length > 0}
            data-testid="button-simpan-edit-warga"
          >
            {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Cari nama, NIK, atau nomor KK..."
            className="h-10 pl-9"
            data-testid="input-search-warga"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>
                {o === "semua" ? "Semua status" : o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="text-warga-count">
        Menampilkan {paginatedWarga.length} dari {filteredWarga.length} warga
        {totalPages > 1 && ` (halaman ${page} dari ${totalPages})`}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedWarga.map((warga) => (
            <Card key={warga.id} data-testid={`card-warga-admin-${warga.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{warga.namaLengkap}</p>
                      <p className="text-[10px] text-muted-foreground">NIK: {warga.nik}</p>
                      {warga.nomorKk && (
                        <Link href={`/admin/kependudukan/kk/${warga.kkId}`}>
                          <p className="text-[10px] text-primary hover:underline truncate cursor-pointer">
                            KK {warga.nomorKk} · RT {warga.rt?.toString().padStart(2, "0")}
                            {warga.alamat ? ` · ${warga.alamat}` : ""}
                          </p>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                    <Badge variant="secondary" className="text-[10px]">
                      RT {warga.rt?.toString().padStart(2, "0")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {warga.kedudukanKeluarga}
                    </Badge>
                    <StatusKependudukanBadge status={warga.statusKependudukan} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(warga)}
                    data-testid={`button-edit-warga-${warga.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteWarga(warga)}
                    data-testid={`button-delete-warga-${warga.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  {warga.nomorWhatsapp ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 h-7 text-green-700 border-green-200 hover:bg-green-50"
                      asChild
                      data-testid={`button-wa-${warga.id}`}
                    >
                      <a href={toWhatsappLink(warga.nomorWhatsapp)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-3 h-3" /> WA
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 h-7 opacity-40"
                      disabled
                      data-testid={`button-wa-${warga.id}`}
                    >
                      <MessageCircle className="w-3 h-3" /> WA
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page <= 1}
            onClick={() => setPage((currentPage) => currentPage - 1)}
            data-testid="button-prev-warga"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page >= totalPages}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            data-testid="button-next-warga"
          >
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!deleteWarga}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteWarga(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Hapus Data Warga?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <span className="block">
                Data <strong>{deleteWarga?.namaLengkap}</strong> (NIK: {deleteWarga?.nik}) akan dihapus beserta:
              </span>
              <span className="block text-red-600 font-medium">
                • Semua laporan warga terkait
                <br />
                • Semua surat warga terkait
                <br />
                • Semua pengajuan edit profil terkait
              </span>
              <span className="block font-semibold text-red-700">Tindakan ini tidak dapat dibatalkan!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-warga">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteWarga && deleteWargaMutation.mutate(deleteWarga.id)}
              disabled={deleteWargaMutation.isPending}
              data-testid="button-confirm-delete-warga"
            >
              {deleteWargaMutation.isPending ? "Menghapus..." : "Hapus Warga"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

