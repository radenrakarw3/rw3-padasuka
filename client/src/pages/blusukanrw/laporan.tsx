import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BLUSUKAN_API } from "@shared/blusukan-api";
import { blusukanApi } from "@/lib/blusukan-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageSquare,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  WifiOff,
  Trash2,
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
  formatLaporanJudulDisplay,
  formatPelaporNamaDisplay,
  formatRtLabel,
  stripLaporanMetaPrefix,
} from "@shared/laporan-pelapor";
import { Link } from "wouter";
import { blusukanKkHref } from "@/lib/blusukan-navigation";
import { toWaMeUrl } from "@/lib/wa";

type LaporanRow = Awaited<ReturnType<typeof blusukanApi.laporan.list>>[number];

const jenisLabels: Record<string, string> = {
  keamanan: "Keamanan",
  kebersihan: "Kebersihan",
  infrastruktur: "Infrastruktur",
  ketertiban: "Ketertiban",
  sosial: "Sosial",
  umum: "Umum",
  lainnya: "Lainnya",
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  diproses: { label: "Diproses", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  selesai: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle },
  ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
};

type FilterStatus = "semua" | "pending" | "diproses" | "selesai" | "ditolak";

export default function BlusukanrwLaporan() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("semua");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [tanggapan, setTanggapan] = useState<Record<number, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<LaporanRow | null>(null);

  const { data: list, isPending: isLoading, isError, error, refetch } = useQuery({
    queryKey: [BLUSUKAN_API.laporan],
    queryFn: () => blusukanApi.laporan.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, tanggapanText }: { id: number; status: string; tanggapanText?: string }) =>
      blusukanApi.laporan.updateStatus(id, { status, tanggapan: tanggapanText }),
    onSuccess: () => {
      toast({ title: "Status laporan diperbarui" });
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.laporan] });
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => blusukanApi.laporan.delete(id),
    onSuccess: (_data, id) => {
      toast({ title: "Laporan dihapus" });
      setDeleteTarget(null);
      setExpandedId((cur) => (cur === id ? null : cur));
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.laporan] });
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menghapus",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    if (!list) return [];
    const q = search.trim().toLowerCase();
    return list.filter((lap) => {
      if (filter !== "semua" && lap.status !== filter) return false;
      if (!q) return true;
      const isi = stripLaporanMetaPrefix(lap.isi);
      const haystack = [lap.judul, lap.pelaporNama ?? "", isi, jenisLabels[lap.jenisLaporan] ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [list, filter, search]);

  const pendingCount = list?.filter((l) => l.status === "pending").length ?? 0;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Laporan Warga</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Keluhan dan masukan dari warga — tangani langsung dari lapangan
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {list && (
            <Badge variant="outline" className="text-xs">
              {list.length} laporan di database
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingCount} menunggu ditanggapi
            </Badge>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari judul, nama, isi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {(
          [
            ["semua", "Semua"],
            ["pending", "Menunggu"],
            ["diproses", "Proses"],
            ["selesai", "Selesai"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === id
                ? "bg-[hsl(163,55%,22%)] text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="text-center py-10 rounded-xl border border-destructive/30 bg-destructive/5 px-4">
          <WifiOff className="h-9 w-9 mx-auto text-destructive/70 mb-2" />
          <p className="text-sm font-medium text-destructive">Gagal memuat laporan warga</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Periksa koneksi server"}
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Coba lagi
          </Button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-sm text-center text-muted-foreground py-12">
          {list && list.length > 0 ? "Tidak ada laporan untuk filter ini" : "Belum ada laporan masuk"}
        </p>
      )}

      <div className="space-y-3">
        {!isLoading && !isError && filtered.map((lap) => {
          const cfg = statusConfig[lap.status] ?? statusConfig.pending;
          const Icon = cfg.icon;
          const expanded = expandedId === lap.id;
          const isi = stripLaporanMetaPrefix(lap.isi);

          return (
            <div
              key={lap.id}
              className="rounded-xl border bg-card shadow-sm overflow-hidden"
            >
              <button
                type="button"
                className="w-full text-left p-4"
                onClick={() => setExpandedId(expanded ? null : lap.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      <Badge className={`text-[10px] ${cfg.color}`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {jenisLabels[lap.jenisLaporan] ?? lap.jenisLaporan}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2">
                      {formatLaporanJudulDisplay(lap.judul)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPelaporNamaDisplay(lap.pelaporNama)}
                      {lap.pelaporRt != null && ` · ${formatRtLabel(lap.pelaporRt)}`}
                      {" · "}
                      {new Date(lap.createdAt!).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                  )}
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                  <p className="text-sm whitespace-pre-wrap">{isi}</p>

                  {lap.pelaporAlamat && (
                    <p className="text-xs text-muted-foreground">{lap.pelaporAlamat}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {lap.kkId && (
                      <Link href={blusukanKkHref(lap.kkId, "laporan")}>
                        <Button variant="outline" size="sm" className="h-9">
                          Buka KK
                        </Button>
                      </Link>
                    )}
                    {lap.pelaporWa && (
                      <a href={toWaMeUrl(lap.pelaporWa)} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="h-9">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          WA Pelapor
                        </Button>
                      </a>
                    )}
                  </div>

                  {lap.tanggapanAdmin && (
                    <div className="rounded-lg bg-muted/50 p-3 text-xs">
                      <p className="font-medium mb-1">Tanggapan sebelumnya</p>
                      <p className="text-muted-foreground">{lap.tanggapanAdmin}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Tanggapan untuk warga..."
                      value={tanggapan[lap.id] ?? lap.tanggapanAdmin ?? ""}
                      onChange={(e) => setTanggapan((p) => ({ ...p, [lap.id]: e.target.value }))}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {lap.status !== "diproses" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10"
                          disabled={updateMutation.isPending || deleteMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              id: lap.id,
                              status: "diproses",
                              tanggapanText: tanggapan[lap.id],
                            })
                          }
                        >
                          Proses
                        </Button>
                      )}
                      {lap.status !== "selesai" && (
                        <Button
                          size="sm"
                          className="h-10"
                          style={{ backgroundColor: "hsl(163,55%,22%)" }}
                          disabled={updateMutation.isPending || deleteMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              id: lap.id,
                              status: "selesai",
                              tanggapanText: tanggapan[lap.id],
                            })
                          }
                        >
                          Selesai
                        </Button>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full h-10 text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={deleteMutation.isPending}
                      onClick={() => setDeleteTarget(lap)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Hapus laporan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus laporan?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {deleteTarget
                ? `Laporan #${deleteTarget.id} akan dihapus permanen dari database.`
                : "Laporan akan dihapus permanen dari database."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
