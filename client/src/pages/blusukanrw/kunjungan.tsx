import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { BLUSUKAN_API } from "@shared/blusukan-api";
import { blusukanApi } from "@/lib/blusukan-api";
import { useToast } from "@/hooks/use-toast";
import { BLUSUKAN_RT_NUMBERS, isActiveRt } from "@shared/rt";
import { statusRumahOptions, rtOptions } from "@/lib/constants";

type KeluargaRow = {
  kkId: number;
  nomorKk: string;
  rt: number;
  alamat: string;
  kepalaKeluarga: string | null;
  jumlahAnggota: number;
  completionPercent: number;
  belumVerifikasi: number;
  kunjunganTerakhir: { hasil: string; createdAt: string | null } | null;
  perluKunjungan: boolean;
};

const PER_PAGE = 15;

const defaultNewKk = {
  nomorKk: "",
  rt: "1",
  alamat: "",
  statusRumah: statusRumahOptions[0],
  jumlahPenghuni: 1,
  kondisiBangunan: "Permanen",
  sumberAir: "PDAM",
  sanitasiWc: "Jamban Sendiri",
  listrik: "PLN 900 VA",
};

function hasilLabel(hasil: string) {
  if (hasil === "selesai") return "Selesai";
  if (hasil === "perlu_ulang") return "Perlu ulang";
  if (hasil === "tidak_ada") return "Tidak ada";
  return hasil;
}

export default function BlusukanrwKunjungan() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [rtFilter, setRtFilter] = useState<number | "semua">("semua");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addKkOpen, setAddKkOpen] = useState(false);
  const [newKk, setNewKk] = useState(defaultNewKk);
  const rtParam = rtFilter === "semua" ? undefined : rtFilter;

  useEffect(() => {
    setPage(1);
  }, [rtFilter, search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [BLUSUKAN_API.keluarga, rtParam, search, page],
    queryFn: () =>
      blusukanApi.keluarga<KeluargaRow>({
        rt: rtParam,
        q: search || undefined,
        page,
        limit: PER_PAGE,
      }),
    placeholderData: (prev) => prev,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;
  const pageLimit = data?.limit ?? PER_PAGE;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const rangeEnd = Math.min(currentPage * pageLimit, total);

  const createKkMutation = useMutation({
    mutationFn: () =>
      blusukanApi.kk.create({
        ...newKk,
        rt: parseInt(newKk.rt, 10),
        penerimaBansos: false,
        jenisBansos: null,
        layakBansos: false,
        penghasilanBulanan: null,
        kategoriEkonomi: null,
        linkGmaps: null,
        latitude: null,
        longitude: null,
      }),
    onSuccess: (kk) => {
      toast({ title: "KK baru ditambahkan" });
      setAddKkOpen(false);
      setNewKk(defaultNewKk);
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.keluarga] });
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.kkList] });
      setLocation(`/blusukanrw/kk/${kk.id}`);
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menambah KK",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Keluarga Harus Dikunjungi</h2>
          <p className="text-xs text-muted-foreground">Master data Ketua RW · RT 01–04</p>
        </div>
        <Dialog open={addKkOpen} onOpenChange={setAddKkOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="gap-1 shrink-0" style={{ backgroundColor: "hsl(163,55%,22%)" }}>
              <Plus className="w-4 h-4" />
              KK Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Tambah Kartu Keluarga</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nomor KK</Label>
                <Input value={newKk.nomorKk} onChange={(e) => setNewKk({ ...newKk, nomorKk: e.target.value })} className="h-9 font-mono" />
              </div>
              <div>
                <Label className="text-xs">RT</Label>
                <Select value={newKk.rt} onValueChange={(v) => setNewKk({ ...newKk, rt: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rtOptions.map((rt) => (
                      <SelectItem key={rt} value={String(rt)}>RT {String(rt).padStart(2, "0")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Alamat</Label>
                <Input value={newKk.alamat} onChange={(e) => setNewKk({ ...newKk, alamat: e.target.value })} className="h-9" />
              </div>
              <Button
                className="w-full"
                style={{ backgroundColor: "hsl(163,55%,22%)" }}
                disabled={createKkMutation.isPending || !newKk.nomorKk || !newKk.alamat}
                onClick={() => createKkMutation.mutate()}
              >
                Simpan & Buka Detail
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari alamat, nama, NIK, nomor KK..."
          className="pl-9 h-10"
          aria-label="Cari keluarga"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setRtFilter("semua");
            setPage(1);
          }}
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            rtFilter === "semua" ? "bg-[hsl(163,55%,22%)] text-white" : ""
          }`}
        >
          Semua
        </button>
        {BLUSUKAN_RT_NUMBERS.map((rt) => (
          <button
            key={rt}
            type="button"
            onClick={() => {
              setRtFilter(rt);
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              rtFilter === rt ? "bg-[hsl(163,55%,22%)] text-white" : ""
            }`}
          >
            RT {String(rt).padStart(2, "0")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {total === 0
              ? "0 keluarga"
              : `Menampilkan ${rangeStart}–${rangeEnd} dari ${total} keluarga`}
            {isFetching && !isLoading ? " · memuat…" : ""}
          </p>
          {rows.filter((row) => isActiveRt(row.rt)).map((row) => (
            <Link key={row.kkId} href={`/blusukanrw/kk/${row.kkId}`}>
              <Card className={`cursor-pointer hover:border-[hsl(163,55%,22%)] transition-colors ${row.perluKunjungan ? "border-amber-300" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{row.kepalaKeluarga || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.alamat}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        KK {row.nomorKk} · RT {String(row.rt).padStart(2, "0")} · {row.jumlahAnggota} anggota
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant={row.completionPercent === 100 ? "secondary" : "outline"} className="text-[10px]">
                      Lengkap {row.completionPercent}%
                    </Badge>
                    {row.belumVerifikasi > 0 && (
                      <Badge variant="outline" className="text-[10px] text-amber-800 border-amber-300">
                        {row.belumVerifikasi} belum verifikasi
                      </Badge>
                    )}
                    {row.kunjunganTerakhir ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {hasilLabel(row.kunjunganTerakhir.hasil)}
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-amber-100 text-amber-900 hover:bg-amber-100">
                        Belum dikunjungi
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Tidak ada keluarga yang cocok.</p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 pb-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
