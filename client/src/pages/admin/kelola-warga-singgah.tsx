import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pekerjaanOptions, keperluanTinggalOptions, rtOptions } from "@/lib/constants";
import { Plus, Pencil, Trash2, User, Phone, Briefcase, Calendar, Users as UsersIcon, X, RefreshCw, History } from "lucide-react";

interface PemilikKost {
  id: number;
  namaKost: string;
  namaPemilik: string;
  rt: number;
}

interface WargaSinggahItem {
  id: number;
  pemilikKostId: number;
  namaLengkap: string;
  nik: string;
  nomorWhatsapp: string;
  pekerjaan: string;
  tanggalMulaiKontrak: string;
  tanggalHabisKontrak: string;
  jumlahPenghuni: number;
  keperluanTinggal: string;
  status: string;
  createdAt: string;
  namaKost: string;
  namaPemilik: string;
  rtKost: number;
}

interface RiwayatKontrak {
  id: number;
  tanggalMulaiLama: string;
  tanggalHabisLama: string;
  tanggalMulaiBaru: string;
  tanggalHabisBaru: string;
  createdAt: string;
}

function getStatusKontrak(tanggalHabis: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const habis = new Date(tanggalHabis);
  const diffDays = Math.ceil((habis.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Habis", variant: "destructive" };
  if (diffDays <= 7) return { label: `H-${diffDays}`, variant: "secondary" };
  return { label: "Aktif", variant: "default" };
}

function getDaysRemaining(tanggalHabis: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const habis = new Date(tanggalHabis);
  return Math.ceil((habis.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function KelolaWargaSinggah() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<WargaSinggahItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WargaSinggahItem | null>(null);
  const [perpanjangTarget, setPerpanjangTarget] = useState<WargaSinggahItem | null>(null);
  const [riwayatTarget, setRiwayatTarget] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRt, setFilterRt] = useState<string>("semua");
  const [filterStatus, setFilterStatus] = useState<string>("semua");

  const [formData, setFormData] = useState({
    pemilikKostId: "",
    namaLengkap: "",
    nik: "",
    nomorWhatsapp: "",
    pekerjaan: "",
    tanggalMulaiKontrak: "",
    tanggalHabisKontrak: "",
    jumlahPenghuni: "1",
    keperluanTinggal: "",
  });

  const [perpanjangData, setPerpanjangData] = useState({
    tanggalMulaiBaru: "",
    tanggalHabisBaru: "",
  });

  const { data: wargaList, isLoading } = useQuery<WargaSinggahItem[]>({
    queryKey: ["/api/warga-singgah"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: pemilikList } = useQuery<PemilikKost[]>({
    queryKey: ["/api/pemilik-kost"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: riwayatList } = useQuery<RiwayatKontrak[]>({
    queryKey: ["/api/warga-singgah", riwayatTarget, "riwayat"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!riwayatTarget,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/warga-singgah", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warga-singgah"] });
      toast({ title: "Berhasil", description: "Warga singgah berhasil ditambahkan" });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/warga-singgah/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warga-singgah"] });
      toast({ title: "Berhasil", description: "Data warga singgah berhasil diperbarui" });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/warga-singgah/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warga-singgah"] });
      toast({ title: "Berhasil", description: "Warga singgah berhasil dihapus" });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const perpanjangMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/warga-singgah/${id}/perpanjang`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warga-singgah"] });
      toast({ title: "Berhasil", description: "Kontrak berhasil diperpanjang" });
      setPerpanjangTarget(null);
      setPerpanjangData({ tanggalMulaiBaru: "", tanggalHabisBaru: "" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormData({ pemilikKostId: "", namaLengkap: "", nik: "", nomorWhatsapp: "", pekerjaan: "", tanggalMulaiKontrak: "", tanggalHabisKontrak: "", jumlahPenghuni: "1", keperluanTinggal: "" });
    setEditData(null);
    setShowForm(false);
  }

  function handleEdit(item: WargaSinggahItem) {
    setEditData(item);
    setFormData({
      pemilikKostId: String(item.pemilikKostId),
      namaLengkap: item.namaLengkap,
      nik: item.nik,
      nomorWhatsapp: item.nomorWhatsapp,
      pekerjaan: item.pekerjaan,
      tanggalMulaiKontrak: item.tanggalMulaiKontrak,
      tanggalHabisKontrak: item.tanggalHabisKontrak,
      jumlahPenghuni: String(item.jumlahPenghuni),
      keperluanTinggal: item.keperluanTinggal,
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      pemilikKostId: parseInt(formData.pemilikKostId),
      namaLengkap: formData.namaLengkap,
      nik: formData.nik,
      nomorWhatsapp: formData.nomorWhatsapp,
      pekerjaan: formData.pekerjaan,
      tanggalMulaiKontrak: formData.tanggalMulaiKontrak,
      tanggalHabisKontrak: formData.tanggalHabisKontrak,
      jumlahPenghuni: parseInt(formData.jumlahPenghuni),
      keperluanTinggal: formData.keperluanTinggal,
    };
    if (editData) {
      updateMutation.mutate({ id: editData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const filtered = (wargaList || []).filter((w) => {
    const matchSearch = searchTerm === "" ||
      w.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.nik.includes(searchTerm) ||
      w.namaKost.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRt = filterRt === "semua" || w.rtKost === parseInt(filterRt);
    const status = getStatusKontrak(w.tanggalHabisKontrak);
    const matchStatus = filterStatus === "semua" ||
      (filterStatus === "aktif" && status.label === "Aktif") ||
      (filterStatus === "mendekati" && status.label.startsWith("H-")) ||
      (filterStatus === "habis" && status.label === "Habis");
    return matchSearch && matchRt && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" data-testid="text-title-warga-singgah">Kelola Warga Singgah</h2>
          <p className="text-xs text-muted-foreground">Total: {wargaList?.length || 0} warga singgah</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-tambah-warga-singgah">
          <Plus className="w-4 h-4 mr-1" /> Tambah
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Cari nama/NIK/kost..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm flex-1 min-w-[150px]"
          data-testid="input-search-warga-singgah"
        />
        <Select value={filterRt} onValueChange={setFilterRt}>
          <SelectTrigger className="w-28" data-testid="select-filter-rt-singgah">
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
          <SelectTrigger className="w-32" data-testid="select-filter-status-singgah">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="mendekati">Mendekati Habis</SelectItem>
            <SelectItem value="habis">Habis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{editData ? "Edit Warga Singgah" : "Tambah Warga Singgah"}</h3>
              <Button size="icon" variant="ghost" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs">Kost/Kontrakan</Label>
                <Select value={formData.pemilikKostId} onValueChange={(v) => setFormData({ ...formData, pemilikKostId: v })}>
                  <SelectTrigger data-testid="select-pemilik-kost"><SelectValue placeholder="Pilih Kost/Kontrakan" /></SelectTrigger>
                  <SelectContent>
                    {(pemilikList || []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.namaKost} (RT {String(p.rt).padStart(2, "0")})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nama Lengkap</Label>
                <Input value={formData.namaLengkap} onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })} required data-testid="input-nama-singgah" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">NIK</Label>
                  <Input value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} required maxLength={16} data-testid="input-nik-singgah" />
                </div>
                <div>
                  <Label className="text-xs">No WA</Label>
                  <Input value={formData.nomorWhatsapp} onChange={(e) => setFormData({ ...formData, nomorWhatsapp: e.target.value })} required placeholder="08xxx" data-testid="input-wa-singgah" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Pekerjaan</Label>
                  <Select value={formData.pekerjaan} onValueChange={(v) => setFormData({ ...formData, pekerjaan: v })}>
                    <SelectTrigger data-testid="select-pekerjaan-singgah"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {pekerjaanOptions.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Keperluan Tinggal</Label>
                  <Select value={formData.keperluanTinggal} onValueChange={(v) => setFormData({ ...formData, keperluanTinggal: v })}>
                    <SelectTrigger data-testid="select-keperluan-singgah"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {keperluanTinggalOptions.map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tanggal Mulai Kontrak</Label>
                  <Input type="date" value={formData.tanggalMulaiKontrak} onChange={(e) => setFormData({ ...formData, tanggalMulaiKontrak: e.target.value })} required data-testid="input-mulai-kontrak" />
                </div>
                <div>
                  <Label className="text-xs">Tanggal Habis Kontrak</Label>
                  <Input type="date" value={formData.tanggalHabisKontrak} onChange={(e) => setFormData({ ...formData, tanggalHabisKontrak: e.target.value })} required data-testid="input-habis-kontrak" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Jumlah Penghuni</Label>
                <Input type="number" min="1" value={formData.jumlahPenghuni} onChange={(e) => setFormData({ ...formData, jumlahPenghuni: e.target.value })} required data-testid="input-jumlah-penghuni-singgah" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-warga-singgah">
                {(createMutation.isPending || updateMutation.isPending) ? "Menyimpan..." : editData ? "Perbarui" : "Simpan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Belum ada data warga singgah</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const status = getStatusKontrak(item.tanggalHabisKontrak);
            const daysLeft = getDaysRemaining(item.tanggalHabisKontrak);
            return (
              <Card
                key={item.id}
                className={`${status.label === "Habis" ? "border-red-300" : status.label.startsWith("H-") ? "border-amber-300" : "border-green-300"}`}
                data-testid={`card-warga-singgah-${item.id}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <User className="w-4 h-4 text-[hsl(163,55%,22%)] flex-shrink-0" />
                        <span className="font-semibold text-sm" data-testid={`text-nama-singgah-${item.id}`}>{item.namaLengkap}</span>
                        <Badge variant={status.variant} className="text-[10px]" data-testid={`badge-status-${item.id}`}>{status.label}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">NIK: {item.nik}</p>
                      <p className="text-[11px] text-muted-foreground">{item.namaKost} — RT {String(item.rtKost).padStart(2, "0")}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.nomorWhatsapp}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{item.pekerjaan}</span>
                        <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" />{item.jumlahPenghuni} orang</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{item.tanggalMulaiKontrak} — {item.tanggalHabisKontrak}</span>
                        <span className="font-medium">({daysLeft > 0 ? `${daysLeft} hari lagi` : daysLeft === 0 ? "Hari ini" : `${Math.abs(daysLeft)} hari lewat`})</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Keperluan: {item.keperluanTinggal}</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(item)} data-testid={`button-edit-singgah-${item.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" onClick={() => { setPerpanjangTarget(item); setPerpanjangData({ tanggalMulaiBaru: item.tanggalHabisKontrak, tanggalHabisBaru: "" }); }} data-testid={`button-perpanjang-${item.id}`}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-500" onClick={() => setRiwayatTarget(item.id)} data-testid={`button-riwayat-${item.id}`}>
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDeleteTarget(item)} data-testid={`button-delete-singgah-${item.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Warga Singgah?</AlertDialogTitle>
            <AlertDialogDescription>
              Menghapus data "{deleteTarget?.namaLengkap}" beserta riwayat kontraknya. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} data-testid="button-confirm-delete-singgah">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!perpanjangTarget} onOpenChange={() => setPerpanjangTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perpanjang Kontrak</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Perpanjang kontrak untuk: <strong>{perpanjangTarget?.namaLengkap}</strong></p>
          <p className="text-xs text-muted-foreground">Kontrak sebelumnya: {perpanjangTarget?.tanggalMulaiKontrak} — {perpanjangTarget?.tanggalHabisKontrak}</p>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Tanggal Mulai Baru</Label>
              <Input type="date" value={perpanjangData.tanggalMulaiBaru} onChange={(e) => setPerpanjangData({ ...perpanjangData, tanggalMulaiBaru: e.target.value })} data-testid="input-perpanjang-mulai" />
            </div>
            <div>
              <Label className="text-xs">Tanggal Habis Baru</Label>
              <Input type="date" value={perpanjangData.tanggalHabisBaru} onChange={(e) => setPerpanjangData({ ...perpanjangData, tanggalHabisBaru: e.target.value })} data-testid="input-perpanjang-habis" />
            </div>
            <Button
              className="w-full"
              disabled={perpanjangMutation.isPending || !perpanjangData.tanggalMulaiBaru || !perpanjangData.tanggalHabisBaru}
              onClick={() => perpanjangTarget && perpanjangMutation.mutate({ id: perpanjangTarget.id, data: perpanjangData })}
              data-testid="button-confirm-perpanjang"
            >
              {perpanjangMutation.isPending ? "Memproses..." : "Perpanjang Kontrak"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!riwayatTarget} onOpenChange={() => setRiwayatTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Riwayat Perpanjangan Kontrak</DialogTitle>
          </DialogHeader>
          {!riwayatList || riwayatList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat perpanjangan</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {riwayatList.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-2 px-3 text-xs">
                    <p className="text-muted-foreground">Kontrak lama: {r.tanggalMulaiLama} — {r.tanggalHabisLama}</p>
                    <p className="font-medium">Kontrak baru: {r.tanggalMulaiBaru} — {r.tanggalHabisBaru}</p>
                    <p className="text-muted-foreground mt-1">Diperpanjang: {new Date(r.createdAt).toLocaleDateString("id-ID")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
