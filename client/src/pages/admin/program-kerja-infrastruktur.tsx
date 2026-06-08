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
import type { ProyekInfrastruktur } from "@shared/schema";
import { getSubProgramsByPilar, statusProyekInfrastrukturLabels } from "@shared/program-kerja";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { Skeleton } from "@/components/ui/skeleton";

const emptyForm = {
  nama: "",
  subProgram: "audit-drainase",
  rt: "",
  lokasi: "",
  status: "inventaris",
  prioritas: "2",
  estimasiBiaya: "",
  sumberDana: "",
  catatan: "",
  publik: false,
  fotoSebelum: "",
  fotoSesudah: "",
};

export default function AdminProgramKerjaInfrastruktur() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProyekInfrastruktur | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: proyek, isLoading } = useQuery<ProyekInfrastruktur[]>({
    queryKey: ["/api/proyek-infrastruktur"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nama: form.nama,
        subProgram: form.subProgram,
        rt: form.rt ? parseInt(form.rt, 10) : null,
        lokasi: form.lokasi || null,
        status: form.status,
        prioritas: parseInt(form.prioritas, 10),
        estimasiBiaya: form.estimasiBiaya ? parseInt(form.estimasiBiaya, 10) : null,
        sumberDana: form.sumberDana || null,
        catatan: form.catatan || null,
        publik: form.publik,
        fotoSebelum: form.fotoSebelum || null,
        fotoSesudah: form.fotoSesudah || null,
      };
      if (editing) {
        const res = await apiRequest("PATCH", `/api/proyek-infrastruktur/${editing.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/proyek-infrastruktur", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proyek-infrastruktur"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/program-kerja/dashboard"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: "Proyek disimpan" });
    },
    onError: (err: unknown) => {
      toast({ title: "Gagal", description: getApiErrorMessage(err), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/proyek-infrastruktur/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proyek-infrastruktur"] });
      toast({ title: "Proyek dihapus" });
    },
  });

  const openEdit = (p: ProyekInfrastruktur) => {
    setEditing(p);
    setForm({
      nama: p.nama,
      subProgram: p.subProgram,
      rt: p.rt ? String(p.rt) : "",
      lokasi: p.lokasi ?? "",
      status: p.status,
      prioritas: String(p.prioritas),
      estimasiBiaya: p.estimasiBiaya ? String(p.estimasiBiaya) : "",
      sumberDana: p.sumberDana ?? "",
      catatan: p.catatan ?? "",
      publik: p.publik,
      fotoSebelum: p.fotoSebelum ?? "",
      fotoSesudah: p.fotoSesudah ?? "",
    });
    setOpen(true);
  };

  const subPrograms = getSubProgramsByPilar("infrastruktur");
  const selesai = (proyek ?? []).filter((p) => p.status === "selesai").length;
  const berjalan = (proyek ?? []).filter((p) => p.status === "berjalan").length;

  const handleFoto = (field: "fotoSebelum" | "fotoSesudah", file: File | undefined) => {
    if (!file) { setForm({ ...form, [field]: "" }); return; }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, [field]: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-brand">Proyek Infrastruktur</h1>
        <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Tambah proyek
        </Button>
      </div>

      <ProgramKerjaAdminNav />

      <GovStatisticSection title="Ringkasan">
        <GovStatisticRow>
          <GovStatistic label="Total proyek" value={String(proyek?.length ?? 0)} />
          <GovStatistic label="Berjalan" value={String(berjalan)} />
          <GovStatistic label="Selesai" value={String(selesai)} />
        </GovStatisticRow>
      </GovStatisticSection>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-3">
          {(proyek ?? []).map((p) => (
            <div key={p.id} className="rounded-lg border p-4 flex justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2 items-center">
                  <p className="font-semibold">{p.nama}</p>
                  <Badge variant="outline">{statusProyekInfrastrukturLabels[p.status] ?? p.status}</Badge>
                  {p.rt && <Badge>RT {String(p.rt).padStart(2, "0")}</Badge>}
                  {p.publik && <Badge className="bg-green-100 text-green-800">Publik</Badge>}
                </div>
                {p.lokasi && <p className="text-sm text-muted-foreground">{p.lokasi}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit proyek" : "Tambah proyek"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-2">
              <Label>Nama proyek</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sub-program</Label>
                <Select value={form.subProgram} onValueChange={(v) => setForm({ ...form, subProgram: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subPrograms.map((s) => (
                      <SelectItem key={s.slug} value={s.slug}>{s.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusProyekInfrastrukturLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>RT</Label>
                <Select value={form.rt} onValueChange={(v) => setForm({ ...form, rt: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>
                    {ACTIVE_RT_NUMBERS.map((n) => (
                      <SelectItem key={n} value={String(n)}>RT {String(n).padStart(2, "0")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estimasi biaya</Label>
                <Input type="number" value={form.estimasiBiaya} onChange={(e) => setForm({ ...form, estimasiBiaya: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lokasi</Label>
              <Input value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
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
              <Label>Tampilkan ke warga (setelah selesai)</Label>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>Simpan</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
