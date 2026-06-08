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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getApiErrorMessage } from "@/lib/queryClient";
import type { ProgramRw } from "@shared/schema";
import {
  PILAR_PROGRAM_OPTIONS,
  SUB_PROGRAM_DEFS,
  pilarProgramLabels,
  statusProgramKerjaLabels,
} from "@shared/program-kerja";
import { kategoriProgramOptions, statusProgramOptions } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

const emptyForm = {
  namaProgram: "",
  deskripsi: "",
  tanggalPelaksanaan: new Date().toISOString().slice(0, 10),
  kategoriSasaran: "semua",
  targetRt: "",
  status: "rencana",
  pilar: "digitalisasi",
  subProgram: "",
  targetNilai: "",
  capaianNilai: "0",
  satuanTarget: "",
  publik: true,
  prioritas: "2",
  pic: "",
  anggaran: "",
  sumberDana: "",
};

export default function AdminProgramKerjaKelola() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramRw | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: programs, isLoading } = useQuery<ProgramRw[]>({
    queryKey: ["/api/program-rw"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        namaProgram: form.namaProgram,
        deskripsi: form.deskripsi || null,
        tanggalPelaksanaan: form.tanggalPelaksanaan,
        kategoriSasaran: form.kategoriSasaran,
        targetRt: form.targetRt ? parseInt(form.targetRt, 10) : null,
        status: form.status,
        pilar: form.pilar,
        subProgram: form.subProgram || null,
        targetNilai: form.targetNilai ? parseInt(form.targetNilai, 10) : null,
        capaianNilai: form.capaianNilai ? parseInt(form.capaianNilai, 10) : 0,
        satuanTarget: form.satuanTarget || null,
        publik: form.publik,
        prioritas: parseInt(form.prioritas, 10),
        pic: form.pic || null,
        anggaran: form.anggaran ? parseInt(form.anggaran, 10) : null,
        sumberDana: form.sumberDana || null,
      };
      if (editing) {
        const res = await apiRequest("PATCH", `/api/program-rw/${editing.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/program-rw", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/program-rw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/program-kerja/dashboard"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: editing ? "Program diperbarui" : "Program ditambahkan" });
    },
    onError: (err: unknown) => {
      toast({ title: "Gagal menyimpan", description: getApiErrorMessage(err), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/program-rw/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/program-rw"] });
      toast({ title: "Program dihapus" });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/program-rw/seed-defaults");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/program-rw"] });
      toast({ title: "Program default dibuat" });
    },
  });

  const openEdit = (p: ProgramRw) => {
    setEditing(p);
    setForm({
      namaProgram: p.namaProgram,
      deskripsi: p.deskripsi ?? "",
      tanggalPelaksanaan: p.tanggalPelaksanaan,
      kategoriSasaran: p.kategoriSasaran,
      targetRt: p.targetRt ? String(p.targetRt) : "",
      status: p.status,
      pilar: p.pilar,
      subProgram: p.subProgram ?? "",
      targetNilai: p.targetNilai ? String(p.targetNilai) : "",
      capaianNilai: String(p.capaianNilai ?? 0),
      satuanTarget: p.satuanTarget ?? "",
      publik: p.publik,
      prioritas: String(p.prioritas),
      pic: p.pic ?? "",
      anggaran: p.anggaran ? String(p.anggaran) : "",
      sumberDana: p.sumberDana ?? "",
    });
    setOpen(true);
  };

  const subProgramsForPilar = SUB_PROGRAM_DEFS.filter((s) => s.pilar === form.pilar);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-brand">Kelola Program</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            Seed default
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Tambah
          </Button>
        </div>
      </div>

      <ProgramKerjaAdminNav />

      {isLoading ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <div className="space-y-3">
          {(programs ?? []).map((p) => (
            <div key={p.id} className="rounded-lg border p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap gap-2 items-center">
                  <p className="font-semibold">{p.namaProgram}</p>
                  <Badge variant="outline">{pilarProgramLabels[p.pilar as keyof typeof pilarProgramLabels] ?? p.pilar}</Badge>
                  <Badge>{statusProgramKerjaLabels[p.status] ?? p.status}</Badge>
                  {p.publik && <Badge className="bg-green-100 text-green-800">Publik</Badge>}
                </div>
                {p.deskripsi && <p className="text-sm text-muted-foreground">{p.deskripsi}</p>}
                {p.targetNilai != null && (
                  <p className="text-xs text-muted-foreground">
                    Capaian: {p.capaianNilai ?? 0} / {p.targetNilai} {p.satuanTarget ?? ""}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(p)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit program" : "Tambah program"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Nama program</Label>
              <Input value={form.namaProgram} onChange={(e) => setForm({ ...form, namaProgram: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pilar</Label>
                <Select value={form.pilar} onValueChange={(v) => setForm({ ...form, pilar: v, subProgram: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PILAR_PROGRAM_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{pilarProgramLabels[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub-program</Label>
                <Select value={form.subProgram} onValueChange={(v) => setForm({ ...form, subProgram: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {subProgramsForPilar.map((s) => (
                      <SelectItem key={s.slug} value={s.slug}>{s.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusProgramOptions.map((s) => (
                      <SelectItem key={s} value={s}>{statusProgramKerjaLabels[s] ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={form.tanggalPelaksanaan} onChange={(e) => setForm({ ...form, tanggalPelaksanaan: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Target</Label>
                <Input type="number" value={form.targetNilai} onChange={(e) => setForm({ ...form, targetNilai: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Capaian</Label>
                <Input type="number" value={form.capaianNilai} onChange={(e) => setForm({ ...form, capaianNilai: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input value={form.satuanTarget} onChange={(e) => setForm({ ...form, satuanTarget: e.target.value })} placeholder="%, unit, KK" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>PIC</Label>
                <Input value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sumber dana</Label>
                <Input value={form.sumberDana} onChange={(e) => setForm({ ...form, sumberDana: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sasaran</Label>
              <Select value={form.kategoriSasaran} onValueChange={(v) => setForm({ ...form, kategoriSasaran: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {kategoriProgramOptions.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.publik} onCheckedChange={(v) => setForm({ ...form, publik: v })} />
              <Label>Tampilkan ke warga</Label>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
