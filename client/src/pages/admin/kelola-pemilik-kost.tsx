import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { rtOptions, jumlahPintuOptions } from "@/lib/constants";
import { Plus, Pencil, Trash2, Building2, Phone, MapPin, X, DoorOpen } from "lucide-react";

interface PemilikKost {
  id: number;
  namaKost: string;
  namaPemilik: string;
  nomorWaPemilik: string;
  rt: number;
  alamatLengkap: string;
  jumlahPintu: number;
  createdAt: string;
}

export default function KelolaPemilikKost() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<PemilikKost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PemilikKost | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRt, setFilterRt] = useState<string>("semua");

  const [formData, setFormData] = useState({
    namaKost: "",
    namaPemilik: "",
    nomorWaPemilik: "",
    rt: "",
    alamatLengkap: "",
    jumlahPintu: "1",
  });

  const { data: pemilikList, isLoading } = useQuery<PemilikKost[]>({
    queryKey: ["/api/pemilik-kost"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/pemilik-kost", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pemilik-kost"] });
      toast({ title: "Berhasil", description: "Pemilik kost berhasil ditambahkan" });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/pemilik-kost/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pemilik-kost"] });
      toast({ title: "Berhasil", description: "Data pemilik kost berhasil diperbarui" });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pemilik-kost/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pemilik-kost"] });
      toast({ title: "Berhasil", description: "Pemilik kost berhasil dihapus" });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormData({ namaKost: "", namaPemilik: "", nomorWaPemilik: "", rt: "", alamatLengkap: "", jumlahPintu: "1" });
    setEditData(null);
    setShowForm(false);
  }

  function handleEdit(item: PemilikKost) {
    setEditData(item);
    setFormData({
      namaKost: item.namaKost,
      namaPemilik: item.namaPemilik,
      nomorWaPemilik: item.nomorWaPemilik,
      rt: String(item.rt),
      alamatLengkap: item.alamatLengkap,
      jumlahPintu: String(item.jumlahPintu),
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      namaKost: formData.namaKost,
      namaPemilik: formData.namaPemilik,
      nomorWaPemilik: formData.nomorWaPemilik,
      rt: parseInt(formData.rt),
      alamatLengkap: formData.alamatLengkap,
      jumlahPintu: parseInt(formData.jumlahPintu),
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
    return matchSearch && matchRt;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" data-testid="text-title-pemilik-kost">Kelola Pemilik Kost/Kontrakan</h2>
          <p className="text-xs text-muted-foreground">Total: {pemilikList?.length || 0} pemilik</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-tambah-pemilik">
          <Plus className="w-4 h-4 mr-1" /> Tambah
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Cari nama kost/pemilik..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm"
          data-testid="input-search-pemilik"
        />
        <Select value={filterRt} onValueChange={setFilterRt}>
          <SelectTrigger className="w-28" data-testid="select-filter-rt-pemilik">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua RT</SelectItem>
            {rtOptions.map((rt) => (
              <SelectItem key={rt} value={String(rt)}>RT {String(rt).padStart(2, "0")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{editData ? "Edit Pemilik Kost" : "Tambah Pemilik Kost"}</h3>
              <Button size="icon" variant="ghost" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>
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
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-pemilik">
                {(createMutation.isPending || updateMutation.isPending) ? "Menyimpan..." : editData ? "Perbarui" : "Simpan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Belum ada data pemilik kost</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} data-testid={`card-pemilik-${item.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-[hsl(163,55%,22%)] flex-shrink-0" />
                      <span className="font-semibold text-sm truncate" data-testid={`text-nama-kost-${item.id}`}>{item.namaKost}</span>
                      <span className="text-[10px] bg-[hsl(163,55%,22%)] text-white px-1.5 py-0.5 rounded flex-shrink-0">RT {String(item.rt).padStart(2, "0")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Pemilik: {item.namaPemilik}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.nomorWaPemilik}</span>
                      <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" />{item.jumlahPintu} pintu</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{item.alamatLengkap}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(item)} data-testid={`button-edit-pemilik-${item.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDeleteTarget(item)} data-testid={`button-delete-pemilik-${item.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pemilik Kost?</AlertDialogTitle>
            <AlertDialogDescription>
              Menghapus "{deleteTarget?.namaKost}" akan menghapus semua data warga singgah yang terkait. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} data-testid="button-confirm-delete-pemilik">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
