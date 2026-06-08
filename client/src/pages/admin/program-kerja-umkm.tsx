import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ProgramKerjaAdminNav } from "@/components/admin/program-kerja-admin-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GovStatistic, GovStatisticRow, GovStatisticSection } from "@/components/gov/statistic";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getApiErrorMessage } from "@/lib/queryClient";
import type { UmkmMakeover } from "@shared/schema";
import { statusMakeoverLabels } from "@shared/program-kerja";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_ORDER = ["belum_dinilai", "perlu_renovasi", "sedang_dikerjakan", "selesai"];

const emptyForm = {
  namaUnit: "",
  jenisUsaha: "",
  alamat: "",
  rt: "1",
  statusMakeover: "belum_dinilai",
  skorFasad: "",
  skorInterior: "",
  skorEtalase: "",
  catatanMakeover: "",
  rencanaKerja: "",
  rantaiPasok: "",
  tanggalTarget: "",
  tanggalSelesai: "",
  publik: false,
  fotoSebelum: "",
  fotoSesudah: "",
};

export default function AdminProgramKerjaUmkm() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UmkmMakeover | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("semua");

  const { data: units, isLoading } = useQuery<UmkmMakeover[]>({
    queryKey: ["/api/umkm-makeover"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        namaUnit: form.namaUnit,
        jenisUsaha: form.jenisUsaha,
        alamat: form.alamat,
        rt: parseInt(form.rt, 10),
        statusMakeover: form.statusMakeover,
        skorFasad: form.skorFasad ? parseInt(form.skorFasad, 10) : null,
        skorInterior: form.skorInterior ? parseInt(form.skorInterior, 10) : null,
        skorEtalase: form.skorEtalase ? parseInt(form.skorEtalase, 10) : null,
        catatanMakeover: form.catatanMakeover || null,
        rencanaKerja: form.rencanaKerja || null,
        rantaiPasok: form.rantaiPasok || null,
        tanggalTarget: form.tanggalTarget || null,
        tanggalSelesai: form.tanggalSelesai || null,
        publik: form.publik,
        fotoSebelum: form.fotoSebelum || null,
        fotoSesudah: form.fotoSesudah || null,
      };
      if (editing) {
        const res = await apiRequest("PATCH", `/api/umkm-makeover/${editing.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/umkm-makeover", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/umkm-makeover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/program-kerja/dashboard"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: "Unit disimpan" });
    },
    onError: (err: unknown) => {
      toast({ title: "Gagal", description: getApiErrorMessage(err), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/umkm-makeover/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/umkm-makeover"] });
      toast({ title: "Unit dihapus" });
    },
  });

  const openEdit = (u: UmkmMakeover) => {
    setEditing(u);
    setForm({
      namaUnit: u.namaUnit,
      jenisUsaha: u.jenisUsaha,
      alamat: u.alamat,
      rt: String(u.rt),
      statusMakeover: u.statusMakeover,
      skorFasad: u.skorFasad ? String(u.skorFasad) : "",
      skorInterior: u.skorInterior ? String(u.skorInterior) : "",
      skorEtalase: u.skorEtalase ? String(u.skorEtalase) : "",
      catatanMakeover: u.catatanMakeover ?? "",
      rencanaKerja: u.rencanaKerja ?? "",
      rantaiPasok: u.rantaiPasok ?? "",
      tanggalTarget: u.tanggalTarget ?? "",
      tanggalSelesai: u.tanggalSelesai ?? "",
      publik: u.publik,
      fotoSebelum: u.fotoSebelum ?? "",
      fotoSesudah: u.fotoSesudah ?? "",
    });
    setOpen(true);
  };

  const filtered = (units ?? []).filter(
    (u) => statusFilter === "semua" || u.statusMakeover === statusFilter,
  );
  const selesai = (units ?? []).filter((u) => u.statusMakeover === "selesai").length;
  const perluRenovasi = (units ?? []).filter((u) => u.statusMakeover === "perlu_renovasi").length;

  const handleFoto = (field: "fotoSebelum" | "fotoSesudah", file: File | undefined) => {
    if (!file) { setForm({ ...form, [field]: "" }); return; }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, [field]: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-brand">Pipeline UMKM Makeover</h1>
        <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Tambah unit
        </Button>
      </div>

      <ProgramKerjaAdminNav />

      <GovStatisticSection title="Ringkasan">
        <GovStatisticRow>
          <GovStatistic label="Total unit" value={String(units?.length ?? 0)} />
          <GovStatistic label="Perlu renovasi" value={String(perluRenovasi)} />
          <GovStatistic label="Selesai" value={String(selesai)} />
        </GovStatisticRow>
      </GovStatisticSection>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="semua">Semua status</SelectItem>
          {STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>{statusMakeoverLabels[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className="rounded-lg border p-4 flex justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2 items-center">
                  <p className="font-semibold">{u.namaUnit}</p>
                  <Badge variant="outline">{statusMakeoverLabels[u.statusMakeover] ?? u.statusMakeover}</Badge>
                  <Badge>RT {String(u.rt).padStart(2, "0")}</Badge>
                  {u.publik && <Badge className="bg-green-100 text-green-800">Publik</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{u.jenisUsaha} — {u.alamat}</p>
                {(u.skorFasad || u.skorEtalase || u.skorInterior) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Skor: fasad {u.skorFasad ?? "-"} · etalase {u.skorEtalase ?? "-"} · interior {u.skorInterior ?? "-"}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit unit" : "Tambah unit"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-2">
              <Label>Nama unit usaha</Label>
              <Input value={form.namaUnit} onChange={(e) => setForm({ ...form, namaUnit: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jenis usaha</Label>
                <Input value={form.jenisUsaha} onChange={(e) => setForm({ ...form, jenisUsaha: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>RT</Label>
                <Select value={form.rt} onValueChange={(v) => setForm({ ...form, rt: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVE_RT_NUMBERS.map((n) => (
                      <SelectItem key={n} value={String(n)}>RT {String(n).padStart(2, "0")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Status makeover</Label>
              <Select value={form.statusMakeover} onValueChange={(v) => setForm({ ...form, statusMakeover: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{statusMakeoverLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(["skorFasad", "skorEtalase", "skorInterior"] as const).map((field) => (
                <div key={field} className="space-y-2">
                  <Label>{field === "skorFasad" ? "Skor fasad" : field === "skorEtalase" ? "Skor etalase" : "Skor interior"}</Label>
                  <Input type="number" min={1} max={5} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Rencana kerja</Label>
              <Textarea value={form.rencanaKerja} onChange={(e) => setForm({ ...form, rencanaKerja: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Catatan survey</Label>
              <Textarea value={form.catatanMakeover} onChange={(e) => setForm({ ...form, catatanMakeover: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rantai pasok internal</Label>
              <Input value={form.rantaiPasok} onChange={(e) => setForm({ ...form, rantaiPasok: e.target.value })} placeholder="Mis. bahan baku dari warung tetangga" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Foto sebelum</Label>
                <Input type="file" accept="image/*" onChange={(e) => handleFoto("fotoSebelum", e.target.files?.[0])} />
              </div>
              <div className="space-y-2">
                <Label>Foto sesudah</Label>
                <Input type="file" accept="image/*" onChange={(e) => handleFoto("fotoSesudah", e.target.files?.[0])} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.publik} onCheckedChange={(v) => setForm({ ...form, publik: v })} />
              <Label>Publikasikan di Kampung UMKM (setelah selesai)</Label>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>Simpan</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
