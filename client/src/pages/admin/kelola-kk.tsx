import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Home,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  MessageCircle,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
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
import {
  statusRumahOptions,
  listrikOptions,
  rtOptions,
  kondisiBangunanOptions,
  sumberAirOptions,
  sanitasiWcOptions,
  jenisBansosOptions,
  penghasilanBulananOptions,
  kategoriEkonomiOptions,
} from "@/lib/constants";
import type { KartuKeluarga, Warga } from "@shared/schema";

const PER_PAGE = 10;

type KkFormValues = {
  nomorKk: string;
  rt: string;
  alamat: string;
  statusRumah: string;
  jumlahPenghuni: string;
  kondisiBangunan: string;
  sumberAir: string;
  sanitasiWc: string;
  listrik: string;
  penerimaBansos: boolean;
  jenisBansos: string;
  penghasilanBulanan: string;
  layakBansos: boolean;
  kategoriEkonomi: string;
};

const defaultForm: KkFormValues = {
  nomorKk: "",
  rt: "1",
  alamat: "",
  statusRumah: "Milik Sendiri",
  jumlahPenghuni: "1",
  kondisiBangunan: "Permanen",
  sumberAir: "PDAM",
  sanitasiWc: "Jamban Sendiri",
  listrik: "PLN 900 VA",
  penerimaBansos: false,
  jenisBansos: "",
  penghasilanBulanan: "",
  layakBansos: false,
  kategoriEkonomi: "",
};

function mapKkToForm(kk: KartuKeluarga): KkFormValues {
  return {
    nomorKk: kk.nomorKk,
    rt: kk.rt.toString(),
    alamat: kk.alamat,
    statusRumah: kk.statusRumah,
    jumlahPenghuni: kk.jumlahPenghuni.toString(),
    kondisiBangunan: kk.kondisiBangunan,
    sumberAir: kk.sumberAir,
    sanitasiWc: kk.sanitasiWc,
    listrik: kk.listrik,
    penerimaBansos: kk.penerimaBansos,
    jenisBansos: kk.jenisBansos || "",
    penghasilanBulanan: kk.penghasilanBulanan || "",
    layakBansos: kk.layakBansos || false,
    kategoriEkonomi: kk.kategoriEkonomi || "",
  };
}

function toKkPayload(form: KkFormValues) {
  return {
    ...form,
    rt: parseInt(form.rt),
    jumlahPenghuni: parseInt(form.jumlahPenghuni),
    jenisBansos: form.penerimaBansos ? form.jenisBansos : null,
    penghasilanBulanan: form.penghasilanBulanan || null,
    kategoriEkonomi: form.kategoriEkonomi || null,
  };
}

function toWhatsappLink(nomorWhatsapp: string) {
  return `https://wa.me/${nomorWhatsapp.replace(/^0/, "62").replace(/[^0-9]/g, "")}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

export default function AdminKelolaKK() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterRt, setFilterRt] = useState("semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<KkFormValues>(defaultForm);
  const [editForm, setEditForm] = useState<KkFormValues>(defaultForm);
  const [editingKkId, setEditingKkId] = useState<number | null>(null);
  const [expandedKk, setExpandedKk] = useState<number | null>(null);
  const [deleteKk, setDeleteKk] = useState<KartuKeluarga | null>(null);

  const { data: kkList, isLoading } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });
  const { data: wargaList } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });

  const kepalaByKkId = useMemo(() => {
    const map: Record<number, Warga> = {};
    wargaList?.forEach((warga) => {
      if (warga.kedudukanKeluarga === "Kepala Keluarga") {
        map[warga.kkId] = warga;
      }
    });
    return map;
  }, [wargaList]);

  const membersByKkId = useMemo(() => {
    const map: Record<number, Warga[]> = {};
    wargaList?.forEach((warga) => {
      if (!map[warga.kkId]) {
        map[warga.kkId] = [];
      }
      map[warga.kkId].push(warga);
    });
    return map;
  }, [wargaList]);

  const filteredKk = useMemo(() => {
    return (
      kkList?.filter((kk) => {
        const query = search.toLowerCase();
        const kepalaKeluarga = kepalaByKkId[kk.id];
        const anggotaKeluarga = membersByKkId[kk.id] || [];
        const matchesSearch =
          !query ||
          kk.nomorKk.includes(search) ||
          kk.alamat.toLowerCase().includes(query) ||
          kepalaKeluarga?.namaLengkap.toLowerCase().includes(query) ||
          anggotaKeluarga.some((anggota) => anggota.namaLengkap.toLowerCase().includes(query));
        const matchesRt = filterRt === "semua" || kk.rt === parseInt(filterRt);
        return matchesSearch && matchesRt;
      }) || []
    );
  }, [filterRt, kepalaByKkId, kkList, membersByKkId, search]);

  const totalPages = Math.ceil(filteredKk.length / PER_PAGE);
  const paginatedKk = filteredKk.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const resetCreateDialog = () => {
    setDialogOpen(false);
    setForm(defaultForm);
  };

  const resetEditDialog = () => {
    setEditDialogOpen(false);
    setEditingKkId(null);
    setEditForm(defaultForm);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/kk", toKkPayload(form));
    },
    onSuccess: () => {
      toast({ title: "KK berhasil ditambahkan" });
      resetCreateDialog();
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingKkId) return;
      await apiRequest("PATCH", `/api/kk/${editingKkId}`, toKkPayload(editForm));
    },
    onSuccess: () => {
      toast({ title: "KK berhasil diperbarui" });
      resetEditDialog();
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteKkMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/kk/${id}`);
    },
    onSuccess: () => {
      toast({ title: "KK berhasil dihapus" });
      setDeleteKk(null);
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal menghapus", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const openEditDialog = (kk: KartuKeluarga) => {
    setEditingKkId(kk.id);
    setEditForm(mapKkToForm(kk));
    setEditDialogOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterRt(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-kk-title">
          Kartu Keluarga
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
            <Button className="gap-1.5" data-testid="button-tambah-kk">
              <Plus className="w-4 h-4" /> Tambah KK
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Kartu Keluarga</DialogTitle>
            </DialogHeader>
            <FormKkFields form={form} setForm={setForm} />
            <Button
              className="w-full h-10"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.nomorKk || !form.alamat}
              data-testid="button-simpan-kk"
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan KK"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Cari nama, nomor KK, atau alamat..."
            className="h-10 pl-9"
            data-testid="input-search-kk"
          />
        </div>

        <Select value={filterRt} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-32 h-10" data-testid="select-filter-rt">
            <SelectValue placeholder="Filter RT" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua RT</SelectItem>
            {rtOptions.map((rt) => (
              <SelectItem key={rt} value={rt.toString()}>
                RT {rt.toString().padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="text-kk-count">
        Menampilkan {paginatedKk.length} dari {filteredKk.length} KK
        {totalPages > 1 && ` (halaman ${page} dari ${totalPages})`}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedKk.map((kk) => {
            const kepalaKeluarga = kepalaByKkId[kk.id];
            const anggotaKeluarga = membersByKkId[kk.id] || [];
            const isExpanded = expandedKk === kk.id;

            return (
              <Card key={kk.id} data-testid={`card-kk-${kk.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[hsl(163,55%,22%)]/10 flex items-center justify-center flex-shrink-0">
                        <Home className="w-4 h-4 text-[hsl(163,55%,22%)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium truncate">{kk.nomorKk}</p>
                        {kepalaKeluarga && (
                          <p className="text-[11px] font-medium truncate" data-testid={`text-kepala-${kk.id}`}>
                            {kepalaKeluarga.namaLengkap}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground truncate">{kk.alamat}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                      <Badge variant="secondary" className="text-[10px]">
                        RT {kk.rt.toString().padStart(2, "0")}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-0.5">
                        <Users className="w-3 h-3" />
                        {kk.jumlahPenghuni}
                      </Badge>
                      {kk.penerimaBansos && (
                        <Badge className="bg-green-100 text-green-800 text-[10px]">Bansos</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                    <button
                      onClick={() => setExpandedKk(isExpanded ? null : kk.id)}
                      className="flex items-center gap-1 flex-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`button-toggle-anggota-${kk.id}`}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                      <Users className="w-3 h-3" />
                      Anggota ({anggotaKeluarga.length})
                    </button>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={() => openEditDialog(kk)}
                        data-testid={`button-edit-kk-${kk.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteKk(kk)}
                        data-testid={`button-delete-kk-${kk.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5" data-testid={`list-anggota-${kk.id}`}>
                      {anggotaKeluarga.map((anggota) => (
                        <div
                          key={anggota.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-2"
                          data-testid={`anggota-${anggota.id}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-[hsl(163,55%,22%)]/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-[hsl(163,55%,22%)]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{anggota.namaLengkap}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {anggota.kedudukanKeluarga} · {anggota.jenisKelamin === "Laki-laki" ? "L" : "P"} ·{" "}
                                {anggota.pekerjaan || "-"}
                              </p>
                            </div>
                          </div>

                          {anggota.nomorWhatsapp && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6 text-green-700"
                              asChild
                              data-testid={`button-wa-anggota-${anggota.id}`}
                            >
                              <a href={toWhatsappLink(anggota.nomorWhatsapp)} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
            data-testid="button-prev-kk"
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
            data-testid="button-next-kk"
          >
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

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
            <DialogTitle>Edit Kartu Keluarga</DialogTitle>
          </DialogHeader>
          <FormKkFields form={editForm} setForm={setEditForm} isEdit />
          <Button
            className="w-full h-10"
            onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending || !editForm.nomorKk || !editForm.alamat}
            data-testid="button-simpan-edit-kk"
          >
            {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteKk}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteKk(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Hapus Kartu Keluarga?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <span className="block">
                KK <strong>{deleteKk?.nomorKk}</strong> akan dihapus beserta:
              </span>
              <span className="block text-red-600 font-medium">
                • Semua anggota keluarga ({deleteKk ? membersByKkId[deleteKk.id]?.length || 0 : 0} orang)
                <br />
                • Semua laporan warga terkait
                <br />
                • Semua surat warga terkait
                <br />
                • Semua donasi terkait
                <br />
                • Semua pengajuan bansos terkait
              </span>
              <span className="block font-semibold text-red-700">Tindakan ini tidak dapat dibatalkan!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-kk">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteKk && deleteKkMutation.mutate(deleteKk.id)}
              disabled={deleteKkMutation.isPending}
              data-testid="button-confirm-delete-kk"
            >
              {deleteKkMutation.isPending ? "Menghapus..." : "Hapus KK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormKkFields({
  form,
  setForm,
  isEdit = false,
}: {
  form: KkFormValues;
  setForm: Dispatch<SetStateAction<KkFormValues>>;
  isEdit?: boolean;
}) {
  const prefix = isEdit ? "edit-" : "";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-sm">Nomor KK</Label>
        <Input
          value={form.nomorKk}
          onChange={(event) => setForm({ ...form, nomorKk: event.target.value })}
          placeholder="16 digit nomor KK"
          className="h-10"
          data-testid={`input-${prefix}nomor-kk`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">RT</Label>
          <Select value={form.rt} onValueChange={(value) => setForm({ ...form, rt: value })}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rtOptions.map((rt) => (
                <SelectItem key={rt} value={rt.toString()}>
                  RT {rt.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Jumlah Penghuni</Label>
          <Input
            type="number"
            value={form.jumlahPenghuni}
            onChange={(event) => setForm({ ...form, jumlahPenghuni: event.target.value })}
            className="h-10"
            data-testid={`input-${prefix}jumlah-penghuni`}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Alamat</Label>
        <Input
          value={form.alamat}
          onChange={(event) => setForm({ ...form, alamat: event.target.value })}
          className="h-10"
          data-testid={`input-${prefix}alamat-kk`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Status Rumah</Label>
          <Select value={form.statusRumah} onValueChange={(value) => setForm({ ...form, statusRumah: value })}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusRumahOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Listrik</Label>
          <Select value={form.listrik} onValueChange={(value) => setForm({ ...form, listrik: value })}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {listrikOptions.map((listrik) => (
                <SelectItem key={listrik} value={listrik}>
                  {listrik}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Kondisi Bangunan</Label>
          <Select
            value={form.kondisiBangunan}
            onValueChange={(value) => setForm({ ...form, kondisiBangunan: value })}
          >
            <SelectTrigger className="h-10" data-testid={`select-${prefix}kondisi-bangunan`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kondisiBangunanOptions.map((kondisi) => (
                <SelectItem key={kondisi} value={kondisi}>
                  {kondisi}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Sumber Air</Label>
          <Select value={form.sumberAir} onValueChange={(value) => setForm({ ...form, sumberAir: value })}>
            <SelectTrigger className="h-10" data-testid={`select-${prefix}sumber-air`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sumberAirOptions.map((sumberAir) => (
                <SelectItem key={sumberAir} value={sumberAir}>
                  {sumberAir}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Sanitasi WC</Label>
          <Select value={form.sanitasiWc} onValueChange={(value) => setForm({ ...form, sanitasiWc: value })}>
            <SelectTrigger className="h-10" data-testid={`select-${prefix}sanitasi-wc`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sanitasiWcOptions.map((sanitasi) => (
                <SelectItem key={sanitasi} value={sanitasi}>
                  {sanitasi}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 flex items-end">
          <div className="flex items-center gap-2 h-10">
            <Checkbox
              id={`${prefix}penerimaBansos`}
              checked={form.penerimaBansos}
              onCheckedChange={(checked) => setForm({ ...form, penerimaBansos: checked === true })}
              data-testid={`checkbox-${prefix}penerima-bansos`}
            />
            <Label htmlFor={`${prefix}penerimaBansos`} className="text-sm cursor-pointer">
              Penerima Bansos
            </Label>
          </div>
        </div>
      </div>

      {form.penerimaBansos && (
        <div className="space-y-1">
          <Label className="text-sm">Jenis Bansos</Label>
          <div className="grid grid-cols-2 gap-2 p-2 rounded-md border">
            {jenisBansosOptions.map((jenis) => {
              const selectedJenis = form.jenisBansos ? form.jenisBansos.split(", ") : [];
              const isChecked = selectedJenis.includes(jenis);

              return (
                <div key={jenis} className="flex items-center gap-2">
                  <Checkbox
                    id={`${prefix}bansos-${jenis}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const updatedJenis = checked
                        ? [...selectedJenis, jenis]
                        : selectedJenis.filter((item) => item !== jenis);
                      setForm({ ...form, jenisBansos: updatedJenis.join(", ") });
                    }}
                    data-testid={`checkbox-${prefix}bansos-${jenis}`}
                  />
                  <Label htmlFor={`${prefix}bansos-${jenis}`} className="text-xs cursor-pointer">
                    {jenis}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-1 pb-0.5 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Data Ekonomi Keluarga
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Penghasilan Bulanan</Label>
          <Select
            value={form.penghasilanBulanan}
            onValueChange={(value) => setForm({ ...form, penghasilanBulanan: value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Pilih range" />
            </SelectTrigger>
            <SelectContent>
              {penghasilanBulananOptions.map((penghasilan) => (
                <SelectItem key={penghasilan} value={penghasilan}>
                  {penghasilan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Kategori Ekonomi</Label>
          <Select
            value={form.kategoriEkonomi}
            onValueChange={(value) => setForm({ ...form, kategoriEkonomi: value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {kategoriEkonomiOptions.map((kategori) => (
                <SelectItem key={kategori} value={kategori}>
                  {kategori}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 h-9">
        <Checkbox
          id={`${prefix}layakBansos`}
          checked={form.layakBansos}
          onCheckedChange={(checked) => setForm({ ...form, layakBansos: checked === true })}
        />
        <Label htmlFor={`${prefix}layakBansos`} className="text-sm cursor-pointer">
          Layak Bansos (belum menerima)
        </Label>
      </div>
    </div>
  );
}
