import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  pekerjaanOptions,
  pendidikanOptions,
  agamaOptions,
  jenisKelaminOptions,
  statusPerkawinanOptions,
  kedudukanKeluargaOptions,
  statusKependudukanOptions,
  statusDisabilitasOptions,
  kondisiKesehatanOptions,
} from "@/lib/constants";

const PER_PAGE = 10;

type WargaFormValues = {
  kkId: string;
  namaLengkap: string;
  nik: string;
  nomorWhatsapp: string;
  jenisKelamin: string;
  statusPerkawinan: string;
  agama: string;
  kedudukanKeluarga: string;
  tempatLahir: string;
  tanggalLahir: string;
  pekerjaan: string;
  pendidikan: string;
  statusKependudukan: string;
  statusDisabilitas: string;
  kondisiKesehatan: string;
  ibuHamil: boolean;
};

type WargaWithKk = {
  id: number;
  kkId: number | null;
  namaLengkap: string;
  nik: string;
  nomorWhatsapp: string | null;
  jenisKelamin: string;
  statusPerkawinan: string;
  agama: string;
  kedudukanKeluarga: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  pekerjaan: string | null;
  pendidikan: string | null;
  statusKependudukan: string;
  statusDisabilitas: string;
  kondisiKesehatan: string;
  ibuHamil: boolean;
  nomorKk?: string | null;
  rt?: number | null;
};

const defaultForm: WargaFormValues = {
  kkId: "",
  namaLengkap: "",
  nik: "",
  nomorWhatsapp: "",
  jenisKelamin: "Laki-laki",
  statusPerkawinan: "Belum Kawin",
  agama: "Islam",
  kedudukanKeluarga: "Anak",
  tempatLahir: "",
  tanggalLahir: "",
  pekerjaan: "",
  pendidikan: "",
  statusKependudukan: "Aktif",
  statusDisabilitas: "Tidak Ada",
  kondisiKesehatan: "Sehat",
  ibuHamil: false,
};

function mapWargaToForm(warga: WargaWithKk): WargaFormValues {
  return {
    kkId: warga.kkId?.toString() || "",
    namaLengkap: warga.namaLengkap || "",
    nik: warga.nik || "",
    nomorWhatsapp: warga.nomorWhatsapp || "",
    jenisKelamin: warga.jenisKelamin || "Laki-laki",
    statusPerkawinan: warga.statusPerkawinan || "Belum Kawin",
    agama: warga.agama || "Islam",
    kedudukanKeluarga: warga.kedudukanKeluarga || "Anak",
    tempatLahir: warga.tempatLahir || "",
    tanggalLahir: warga.tanggalLahir || "",
    pekerjaan: warga.pekerjaan || "",
    pendidikan: warga.pendidikan || "",
    statusKependudukan: warga.statusKependudukan || "Aktif",
    statusDisabilitas: warga.statusDisabilitas || "Tidak Ada",
    kondisiKesehatan: warga.kondisiKesehatan || "Sehat",
    ibuHamil: warga.ibuHamil || false,
  };
}

function toWargaPayload(form: WargaFormValues) {
  return {
    ...form,
    kkId: parseInt(form.kkId),
    nomorWhatsapp: form.nomorWhatsapp || null,
    tempatLahir: form.tempatLahir || null,
    tanggalLahir: form.tanggalLahir || null,
    pekerjaan: form.pekerjaan || null,
    pendidikan: form.pendidikan || null,
    statusKependudukan: form.statusKependudukan,
  };
}

function toWhatsappLink(nomorWhatsapp: string) {
  return `https://wa.me/${nomorWhatsapp.replace(/^0/, "62").replace(/[^0-9]/g, "")}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

export default function AdminKelolaWarga() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
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
        const query = search.toLowerCase();
        return (
          warga.namaLengkap.toLowerCase().includes(query) ||
          warga.nik.includes(search) ||
          (warga.nomorKk && warga.nomorKk.includes(search))
        );
      }) || []
    );
  }, [search, wargaList]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-warga-title">
          Data Warga
        </h2>

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
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Warga</DialogTitle>
            </DialogHeader>
            <WargaFormFields
              formData={form}
              setFormData={setForm}
              testIdPrefix="warga"
              searchVal={kkSearch}
              setSearchVal={setKkSearch}
              dropdownOpen={kkDropdownOpen}
              setDropdownOpen={setKkDropdownOpen}
              pickerRef={kkPickerRef}
              kkList={kkList}
            />
            <Button
              className="w-full h-10"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.kkId || !form.namaLengkap || !form.nik}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Warga</DialogTitle>
          </DialogHeader>
          <WargaFormFields
            formData={editForm}
            setFormData={setEditForm}
            testIdPrefix="edit-warga"
            searchVal={editKkSearch}
            setSearchVal={setEditKkSearch}
            dropdownOpen={editKkDropdownOpen}
            setDropdownOpen={setEditKkDropdownOpen}
            pickerRef={editKkPickerRef}
            kkList={kkList}
          />
          <Button
            className="w-full h-10"
            onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending || !editForm.kkId || !editForm.namaLengkap || !editForm.nik}
            data-testid="button-simpan-edit-warga"
          >
            {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Cari nama, NIK, atau nomor KK..."
          className="h-10 pl-9"
          data-testid="input-search-warga"
        />
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
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                    <Badge variant="secondary" className="text-[10px]">
                      RT {warga.rt?.toString().padStart(2, "0")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {warga.kedudukanKeluarga}
                    </Badge>
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

function WargaFormFields({
  formData,
  setFormData,
  testIdPrefix,
  searchVal,
  setSearchVal,
  dropdownOpen,
  setDropdownOpen,
  pickerRef,
  kkList,
}: {
  formData: WargaFormValues;
  setFormData: Dispatch<SetStateAction<WargaFormValues>>;
  testIdPrefix: string;
  searchVal: string;
  setSearchVal: (value: string) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (value: boolean) => void;
  pickerRef: RefObject<HTMLDivElement>;
  kkList?: KartuKeluarga[];
}) {
  const selectedKk = kkList?.find((kk) => kk.id.toString() === formData.kkId);
  const filteredKkList =
    kkList?.filter((kk) => {
      if (!searchVal) return true;
      const query = searchVal.toLowerCase();
      return (
        kk.nomorKk.toLowerCase().includes(query) ||
        kk.alamat.toLowerCase().includes(query) ||
        `rt ${kk.rt}`.includes(query)
      );
    }) || [];

  return (
    <div className="space-y-3">
      <div className="space-y-1 relative" ref={pickerRef}>
        <Label className="text-sm">Kartu Keluarga</Label>
        {selectedKk ? (
          <div className="flex items-center gap-2 rounded-md border p-2 h-10">
            <span className="text-sm flex-1 truncate">
              {selectedKk.nomorKk} - RT {selectedKk.rt}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => {
                setFormData({ ...formData, kkId: "" });
                setSearchVal("");
              }}
              data-testid={`button-clear-kk-${testIdPrefix}`}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchVal}
              onChange={(event) => {
                setSearchVal(event.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Cari nomor KK, alamat, atau RT..."
              className="h-10 pl-9"
              data-testid={`input-search-kk-${testIdPrefix}`}
            />
          </div>
        )}

        {dropdownOpen && !selectedKk && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
            {filteredKkList.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">Tidak ditemukan</p>
            ) : (
              filteredKkList.slice(0, 20).map((kk) => (
                <button
                  key={kk.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                  onClick={() => {
                    setFormData({ ...formData, kkId: kk.id.toString() });
                    setDropdownOpen(false);
                    setSearchVal("");
                  }}
                  data-testid={`option-kk-${kk.id}-${testIdPrefix}`}
                >
                  <div className="font-medium">{kk.nomorKk}</div>
                  <div className="text-xs text-muted-foreground">
                    RT {kk.rt} - {kk.alamat}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Nama Lengkap</Label>
        <Input
          value={formData.namaLengkap}
          onChange={(event) => setFormData({ ...formData, namaLengkap: event.target.value })}
          className="h-10"
          data-testid={`input-nama-${testIdPrefix}`}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">NIK</Label>
        <Input
          value={formData.nik}
          onChange={(event) => setFormData({ ...formData, nik: event.target.value })}
          className="h-10"
          data-testid={`input-nik-${testIdPrefix}`}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">No. WhatsApp</Label>
        <Input
          value={formData.nomorWhatsapp}
          onChange={(event) => setFormData({ ...formData, nomorWhatsapp: event.target.value })}
          className="h-10"
          data-testid={`input-wa-${testIdPrefix}`}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Tempat Lahir</Label>
        <Input
          value={formData.tempatLahir}
          onChange={(event) => setFormData({ ...formData, tempatLahir: event.target.value })}
          placeholder="Contoh: Bandung"
          className="h-10"
          data-testid={`input-tempat-lahir-${testIdPrefix}`}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Tanggal Lahir</Label>
        <Input
          type="date"
          value={formData.tanggalLahir}
          onChange={(event) => setFormData({ ...formData, tanggalLahir: event.target.value })}
          className="h-10"
          data-testid={`input-tanggal-lahir-${testIdPrefix}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Jenis Kelamin</Label>
          <Select
            value={formData.jenisKelamin}
            onValueChange={(value) => setFormData({ ...formData, jenisKelamin: value })}
          >
            <SelectTrigger className="h-10" data-testid={`select-jk-${testIdPrefix}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jenisKelaminOptions.map((jenisKelamin) => (
                <SelectItem key={jenisKelamin} value={jenisKelamin}>
                  {jenisKelamin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Kedudukan</Label>
          <Select
            value={formData.kedudukanKeluarga}
            onValueChange={(value) => setFormData({ ...formData, kedudukanKeluarga: value })}
          >
            <SelectTrigger className="h-10" data-testid={`select-kedudukan-${testIdPrefix}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kedudukanKeluargaOptions.map((kedudukan) => (
                <SelectItem key={kedudukan} value={kedudukan}>
                  {kedudukan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Agama</Label>
          <Select value={formData.agama} onValueChange={(value) => setFormData({ ...formData, agama: value })}>
            <SelectTrigger className="h-10" data-testid={`select-agama-${testIdPrefix}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agamaOptions.map((agama) => (
                <SelectItem key={agama} value={agama}>
                  {agama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Status Kawin</Label>
          <Select
            value={formData.statusPerkawinan}
            onValueChange={(value) => setFormData({ ...formData, statusPerkawinan: value })}
          >
            <SelectTrigger className="h-10" data-testid={`select-status-kawin-${testIdPrefix}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusPerkawinanOptions.map((statusPerkawinan) => (
                <SelectItem key={statusPerkawinan} value={statusPerkawinan}>
                  {statusPerkawinan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Pekerjaan</Label>
          <Select
            value={formData.pekerjaan}
            onValueChange={(value) => setFormData({ ...formData, pekerjaan: value })}
          >
            <SelectTrigger className="h-10" data-testid={`select-pekerjaan-${testIdPrefix}`}>
              <SelectValue placeholder="Pilih pekerjaan" />
            </SelectTrigger>
            <SelectContent>
              {pekerjaanOptions.map((pekerjaan) => (
                <SelectItem key={pekerjaan} value={pekerjaan}>
                  {pekerjaan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Pendidikan</Label>
          <Select
            value={formData.pendidikan}
            onValueChange={(value) => setFormData({ ...formData, pendidikan: value })}
          >
            <SelectTrigger className="h-10" data-testid={`select-pendidikan-${testIdPrefix}`}>
              <SelectValue placeholder="Pilih pendidikan" />
            </SelectTrigger>
            <SelectContent>
              {pendidikanOptions.map((pendidikan) => (
                <SelectItem key={pendidikan} value={pendidikan}>
                  {pendidikan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Status Kependudukan</Label>
        <Select
          value={formData.statusKependudukan}
          onValueChange={(value) => setFormData({ ...formData, statusKependudukan: value })}
        >
          <SelectTrigger className="h-10" data-testid={`select-status-kependudukan-${testIdPrefix}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusKependudukanOptions.map((statusKependudukan) => (
              <SelectItem key={statusKependudukan} value={statusKependudukan}>
                {statusKependudukan}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-1 pb-0.5 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Data Kesehatan & Kondisi Khusus
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Kondisi Kesehatan</Label>
          <Select
            value={formData.kondisiKesehatan}
            onValueChange={(value) => setFormData({ ...formData, kondisiKesehatan: value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kondisiKesehatanOptions.map((kondisiKesehatan) => (
                <SelectItem key={kondisiKesehatan} value={kondisiKesehatan}>
                  {kondisiKesehatan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Status Disabilitas</Label>
          <Select
            value={formData.statusDisabilitas}
            onValueChange={(value) => setFormData({ ...formData, statusDisabilitas: value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusDisabilitasOptions.map((statusDisabilitas) => (
                <SelectItem key={statusDisabilitas} value={statusDisabilitas}>
                  {statusDisabilitas}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.jenisKelamin === "Perempuan" && (
        <div className="flex items-center gap-2 h-9">
          <Checkbox
            id={`ibuHamil-${testIdPrefix}`}
            checked={formData.ibuHamil}
            onCheckedChange={(checked) => setFormData({ ...formData, ibuHamil: checked === true })}
          />
          <Label htmlFor={`ibuHamil-${testIdPrefix}`} className="text-sm cursor-pointer">
            Sedang Hamil
          </Label>
        </div>
      )}
    </div>
  );
}
