import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Plus, Search, User, ChevronLeft, ChevronRight } from "lucide-react";
import type { KartuKeluarga } from "@shared/schema";
import { pekerjaanOptions, agamaOptions, jenisKelaminOptions, statusPerkawinanOptions, kedudukanKeluargaOptions } from "@/lib/constants";

const PER_PAGE = 10;

export default function AdminKelolaWarga() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    kkId: "", namaLengkap: "", nik: "", nomorWhatsapp: "",
    jenisKelamin: "Laki-laki", statusPerkawinan: "Belum Kawin",
    agama: "Islam", kedudukanKeluarga: "Anak", tanggalLahir: "", pekerjaan: "",
  });

  const { data: kkList } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });

  const { data: wargaList, isLoading } = useQuery<any[]>({ queryKey: ["/api/warga-with-kk"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/warga", {
        ...form,
        kkId: parseInt(form.kkId),
        nomorWhatsapp: form.nomorWhatsapp || null,
        tanggalLahir: form.tanggalLahir || null,
        pekerjaan: form.pekerjaan || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Warga ditambahkan" });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    return wargaList?.filter(w =>
      w.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      w.nik.includes(search) ||
      (w.nomorKk && w.nomorKk.includes(search))
    ) || [];
  }, [wargaList, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-warga-title">Data Warga</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" data-testid="button-tambah-warga">
              <Plus className="w-4 h-4" /> Tambah Warga
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Warga</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Kartu Keluarga</Label>
                <Select value={form.kkId} onValueChange={v => setForm({...form, kkId: v})}>
                  <SelectTrigger className="h-10" data-testid="select-kk-warga"><SelectValue placeholder="Pilih KK" /></SelectTrigger>
                  <SelectContent>
                    {kkList?.map(k => <SelectItem key={k.id} value={k.id.toString()}>{k.nomorKk} - RT {k.rt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Nama Lengkap</Label>
                <Input value={form.namaLengkap} onChange={e => setForm({...form, namaLengkap: e.target.value})} className="h-10" data-testid="input-nama-warga" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">NIK</Label>
                <Input value={form.nik} onChange={e => setForm({...form, nik: e.target.value})} className="h-10" data-testid="input-nik-warga" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">No. WhatsApp</Label>
                <Input value={form.nomorWhatsapp} onChange={e => setForm({...form, nomorWhatsapp: e.target.value})} className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Jenis Kelamin</Label>
                  <Select value={form.jenisKelamin} onValueChange={v => setForm({...form, jenisKelamin: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {jenisKelaminOptions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Kedudukan</Label>
                  <Select value={form.kedudukanKeluarga} onValueChange={v => setForm({...form, kedudukanKeluarga: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {kedudukanKeluargaOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Agama</Label>
                  <Select value={form.agama} onValueChange={v => setForm({...form, agama: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {agamaOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Status Kawin</Label>
                  <Select value={form.statusPerkawinan} onValueChange={v => setForm({...form, statusPerkawinan: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusPerkawinanOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Pekerjaan</Label>
                <Select value={form.pekerjaan} onValueChange={v => setForm({...form, pekerjaan: v})}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Pilih pekerjaan" /></SelectTrigger>
                  <SelectContent>
                    {pekerjaanOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full h-10" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.kkId || !form.namaLengkap || !form.nik} data-testid="button-simpan-warga">
                {createMutation.isPending ? "Menyimpan..." : "Simpan Warga"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Cari nama, NIK, atau nomor KK..." className="h-10 pl-9" data-testid="input-search-warga" />
      </div>

      <p className="text-xs text-muted-foreground" data-testid="text-warga-count">
        Menampilkan {paginated.length} dari {filtered.length} warga
        {totalPages > 1 && ` (halaman ${page} dari ${totalPages})`}
      </p>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {paginated.map(w => (
            <Card key={w.id} data-testid={`card-warga-admin-${w.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.namaLengkap}</p>
                      <p className="text-[10px] text-muted-foreground">NIK: {w.nik}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                    <Badge variant="secondary" className="text-[10px]">RT {w.rt?.toString().padStart(2,"0")}</Badge>
                    <Badge variant="outline" className="text-[10px]">{w.kedudukanKeluarga}</Badge>
                  </div>
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
            onClick={() => setPage(p => p - 1)}
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
            onClick={() => setPage(p => p + 1)}
            data-testid="button-next-warga"
          >
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
