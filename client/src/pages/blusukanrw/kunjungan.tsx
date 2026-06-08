import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Plus, ClipboardList } from "lucide-react";
import { BLUSUKAN_API } from "@shared/blusukan-api";
import { blusukanApi } from "@/lib/blusukan-api";
import { useToast } from "@/hooks/use-toast";
import { BLUSUKAN_RT_NUMBERS } from "@shared/rt";
import { statusRumahOptions, rtOptions } from "@/lib/constants";
import {
  KeluargaKunjunganRowCard,
  type KeluargaKunjunganRow,
} from "@/components/blusukanrw/keluarga-kunjungan-row";
import { blusukanKkHref } from "@/lib/blusukan-navigation";
import { cn } from "@/lib/utils";

type KunjunganFilter = "perlu" | "semua" | "selesai";

const PER_PAGE = 20;

const filterTabs: { id: KunjunganFilter; label: string }[] = [
  { id: "perlu", label: "Perlu dikunjungi" },
  { id: "semua", label: "Semua" },
  { id: "selesai", label: "Selesai" },
];

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

export default function BlusukanrwKunjungan() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [rtFilter, setRtFilter] = useState<number | "semua">("semua");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<KunjunganFilter>("perlu");
  const [page, setPage] = useState(1);
  const [addKkOpen, setAddKkOpen] = useState(false);
  const [newKk, setNewKk] = useState(defaultNewKk);
  const rtParam = rtFilter === "semua" ? undefined : rtFilter;

  useEffect(() => {
    setPage(1);
  }, [rtFilter, search, filter]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [BLUSUKAN_API.keluarga, rtParam, search, page, filter],
    queryFn: () =>
      blusukanApi.keluarga<KeluargaKunjunganRow>({
        rt: rtParam,
        q: search || undefined,
        page,
        limit: PER_PAGE,
        filter,
      }),
    placeholderData: (prev) => prev,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const counts = data?.counts ?? { perlu: 0, selesai: 0, semua: 0 };
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
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.dashboard] });
      setLocation(blusukanKkHref(kk.id, "kunjungan"));
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menambah KK",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const countForTab = (id: KunjunganFilter) => {
    if (id === "perlu") return counts.perlu;
    if (id === "selesai") return counts.selesai;
    return counts.semua;
  };

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Kunjungan Keluarga</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tap keluarga → isi data → catat hasil kunjungan
          </p>
        </div>
        <Dialog open={addKkOpen} onOpenChange={setAddKkOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0 h-9">
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
                <Input
                  value={newKk.nomorKk}
                  onChange={(e) => setNewKk({ ...newKk, nomorKk: e.target.value })}
                  className="h-11 text-base font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">RT</Label>
                <Select value={newKk.rt} onValueChange={(v) => setNewKk({ ...newKk, rt: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rtOptions.map((rt) => (
                      <SelectItem key={rt} value={String(rt)}>
                        RT {String(rt).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Alamat</Label>
                <Input
                  value={newKk.alamat}
                  onChange={(e) => setNewKk({ ...newKk, alamat: e.target.value })}
                  className="h-11 text-base"
                />
              </div>
              <Button
                className="w-full h-11"
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

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-lg py-2.5 px-1 text-center text-[11px] font-medium leading-tight transition-colors min-h-11 touch-manipulation",
              filter === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span className="block text-sm font-bold tabular-nums mt-0.5">{countForTab(tab.id)}</span>
          </button>
        ))}
      </div>

      {filter === "perlu" && counts.perlu > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-start gap-3">
          <ClipboardList className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-950">
              {counts.perlu} keluarga menunggu kunjungan
            </p>
            <p className="text-xs text-amber-800/90 mt-0.5">
              Urutan: belum pernah → data bermasalah → belum lengkap → perlu ulang
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, alamat, NIK, nomor KK..."
          className="pl-9 h-11 text-base"
          aria-label="Cari keluarga"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setRtFilter("semua")}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border min-h-9 touch-manipulation",
            rtFilter === "semua" && "bg-[hsl(163,55%,22%)] text-white border-transparent",
          )}
        >
          Semua RT
        </button>
        {BLUSUKAN_RT_NUMBERS.map((rt) => (
          <button
            key={rt}
            type="button"
            onClick={() => setRtFilter(rt)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border min-h-9 touch-manipulation",
              rtFilter === rt && "bg-[hsl(163,55%,22%)] text-white border-transparent",
            )}
          >
            RT {String(rt).padStart(2, "0")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {total === 0
              ? filter === "perlu"
                ? "Semua keluarga sudah dikunjungi"
                : "Tidak ada keluarga yang cocok"
              : `Menampilkan ${rangeStart}–${rangeEnd} dari ${total}`}
            {isFetching && !isLoading ? " · memuat…" : ""}
          </p>

          {rows.map((row, i) => (
            <KeluargaKunjunganRowCard
              key={row.kkId}
              row={row}
              index={filter === "perlu" ? rangeStart + i : undefined}
              highlightNext={filter === "perlu" && page === 1 && i === 0}
            />
          ))}

          {rows.length === 0 && filter === "perlu" && !search && (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed">
              <p className="text-sm font-medium">Tidak ada antrian kunjungan</p>
              <p className="text-xs text-muted-foreground mt-1">
                Semua keluarga di filter ini sudah selesai dikunjungi.
              </p>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 text-[hsl(163,55%,22%)]"
                onClick={() => setFilter("selesai")}
              >
                Lihat yang sudah selesai
              </Button>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 h-10"
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
                className="gap-1 h-10"
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
