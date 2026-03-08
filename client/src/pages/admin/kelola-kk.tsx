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
import { Plus, Search, Home, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { statusRumahOptions, listrikOptions, rtOptions } from "@/lib/constants";
import type { KartuKeluarga } from "@shared/schema";

const PER_PAGE = 10;

export default function AdminKelolaKK() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterRt, setFilterRt] = useState("semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    nomorKk: "", rt: "1", alamat: "", statusRumah: "Milik Sendiri",
    jumlahPenghuni: "1", kondisiBangunan: "Permanen", sumberAir: "PDAM",
    sanitasiWc: "Jamban Sendiri", listrik: "PLN 900 VA", penerimaBansos: false,
  });

  const { data: kkList, isLoading } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/kk", {
        ...form,
        rt: parseInt(form.rt),
        jumlahPenghuni: parseInt(form.jumlahPenghuni),
      });
    },
    onSuccess: () => {
      toast({ title: "KK berhasil ditambahkan" });
      setDialogOpen(false);
      setForm({ nomorKk: "", rt: "1", alamat: "", statusRumah: "Milik Sendiri", jumlahPenghuni: "1", kondisiBangunan: "Permanen", sumberAir: "PDAM", sanitasiWc: "Jamban Sendiri", listrik: "PLN 900 VA", penerimaBansos: false });
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    return kkList?.filter(k => {
      const matchSearch = k.nomorKk.includes(search) || k.alamat.toLowerCase().includes(search.toLowerCase());
      const matchRt = filterRt === "semua" || k.rt === parseInt(filterRt);
      return matchSearch && matchRt;
    }) || [];
  }, [kkList, search, filterRt]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };
  const handleFilterChange = (val: string) => {
    setFilterRt(val);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-kk-title">Kartu Keluarga</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" data-testid="button-tambah-kk">
              <Plus className="w-4 h-4" /> Tambah KK
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Kartu Keluarga</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Nomor KK</Label>
                <Input value={form.nomorKk} onChange={e => setForm({...form, nomorKk: e.target.value})} placeholder="16 digit nomor KK" className="h-10" data-testid="input-nomor-kk" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">RT</Label>
                  <Select value={form.rt} onValueChange={v => setForm({...form, rt: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {rtOptions.map(i => <SelectItem key={i} value={i.toString()}>RT {i.toString().padStart(2,"0")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Jumlah Penghuni</Label>
                  <Input type="number" value={form.jumlahPenghuni} onChange={e => setForm({...form, jumlahPenghuni: e.target.value})} className="h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Alamat</Label>
                <Input value={form.alamat} onChange={e => setForm({...form, alamat: e.target.value})} className="h-10" data-testid="input-alamat-kk" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Status Rumah</Label>
                  <Select value={form.statusRumah} onValueChange={v => setForm({...form, statusRumah: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusRumahOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Listrik</Label>
                  <Select value={form.listrik} onValueChange={v => setForm({...form, listrik: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {listrikOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full h-10" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.nomorKk || !form.alamat} data-testid="button-simpan-kk">
                {createMutation.isPending ? "Menyimpan..." : "Simpan KK"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Cari nomor KK atau alamat..." className="h-10 pl-9" data-testid="input-search-kk" />
        </div>
        <Select value={filterRt} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-32 h-10" data-testid="select-filter-rt">
            <SelectValue placeholder="Filter RT" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua RT</SelectItem>
            {rtOptions.map(i => <SelectItem key={i} value={i.toString()}>RT {i.toString().padStart(2,"0")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="text-kk-count">
        Menampilkan {paginated.length} dari {filtered.length} KK
        {totalPages > 1 && ` (halaman ${page} dari ${totalPages})`}
      </p>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {paginated.map(k => (
            <Card key={k.id} data-testid={`card-kk-${k.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                      <Home className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-medium truncate">{k.nomorKk}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{k.alamat}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant="secondary" className="text-[10px]">RT {k.rt.toString().padStart(2,"0")}</Badge>
                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                      <Users className="w-3 h-3" />{k.jumlahPenghuni}
                    </Badge>
                    {k.penerimaBansos && <Badge className="bg-green-100 text-green-800 text-[10px]">Bansos</Badge>}
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
            onClick={() => setPage(p => p + 1)}
            data-testid="button-next-kk"
          >
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
