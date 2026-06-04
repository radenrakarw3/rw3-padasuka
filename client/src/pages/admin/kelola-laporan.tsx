import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { Clock, CheckCircle, AlertCircle, XCircle, MessageSquare, MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import type { KartuKeluarga, Laporan, Warga, WargaSinggah } from "@shared/schema";
import { toWaMeUrl } from "@/lib/wa";
import {
  formatRtLabel,
  parseLaporanPelaporMeta,
  stripLaporanMetaPrefix,
} from "@shared/laporan-pelapor";

const jenisLaporanLabels: Record<string, string> = {
  keamanan: "Keamanan",
  kebersihan: "Kebersihan",
  infrastruktur: "Infrastruktur",
  ketertiban: "Ketertiban",
  sosial: "Sosial",
  umum: "Umum",
  lainnya: "Lainnya",
};

type SumberLaporan = "kiosk" | "warga" | "singgah";

function sumberLaporanKey(lap: Laporan): SumberLaporan {
  if (lap.wargaId) return "warga";
  if (lap.wargaSinggahId) return "singgah";
  return "kiosk";
}

const sumberLaporanLabels: Record<SumberLaporan, string> = {
  kiosk: "Kiosk publik",
  warga: "Warga terdaftar",
  singgah: "Warga singgah",
};

function sumberLaporan(lap: Laporan, wargaList?: Warga[]): string {
  if (lap.wargaId) {
    return wargaList?.find((w) => w.id === lap.wargaId)?.namaLengkap ?? "Warga";
  }
  if (lap.wargaSinggahId) return sumberLaporanLabels.singgah;
  return sumberLaporanLabels.kiosk;
}

function nomorRtLaporan(
  lap: Laporan,
  wargaList?: Warga[],
  kkList?: KartuKeluarga[],
): number | null {
  const meta = parseLaporanPelaporMeta(lap.isi);
  if (meta.nomorRt != null) return meta.nomorRt;
  if (lap.wargaId) {
    const w = wargaList?.find((x) => x.id === lap.wargaId);
    const kk = w ? kkList?.find((k) => k.id === (lap.kkId ?? w.kkId)) : undefined;
    return kk?.rt ?? null;
  }
  return null;
}

function pelaporInfo(
  lap: Laporan,
  wargaList?: Warga[],
  singgahList?: WargaSinggah[],
  kkList?: KartuKeluarga[],
): { nama: string; rtLabel?: string; nomorWa: string | null } {
  const meta = parseLaporanPelaporMeta(lap.isi);

  if (lap.wargaId) {
    const w = wargaList?.find((x) => x.id === lap.wargaId);
    const kk = w ? kkList?.find((k) => k.id === (lap.kkId ?? w.kkId)) : undefined;
    return {
      nama: w?.namaLengkap ?? meta.nama ?? "Warga",
      rtLabel: kk?.rt != null ? formatRtLabel(kk.rt) : meta.nomorRt != null ? formatRtLabel(meta.nomorRt) : undefined,
      nomorWa: w?.nomorWhatsapp?.trim() || meta.nomorWa || null,
    };
  }

  if (lap.wargaSinggahId) {
    const ws = singgahList?.find((s) => s.id === lap.wargaSinggahId);
    const waSinggah = ws?.nomorWhatsapp?.trim() || lap.isi.match(/WA:\s*(\S+)/)?.[1]?.trim();
    const namaMatch = lap.judul.match(/\[Warga Singgah - ([^\]]+)\]/);
    return {
      nama: ws?.namaLengkap ?? namaMatch?.[1] ?? meta.nama ?? "Warga singgah",
      rtLabel: meta.nomorRt != null ? formatRtLabel(meta.nomorRt) : undefined,
      nomorWa: waSinggah || meta.nomorWa || null,
    };
  }

  return {
    nama: meta.nama ?? sumberLaporan(lap, wargaList),
    rtLabel: meta.nomorRt != null ? formatRtLabel(meta.nomorRt) : undefined,
    nomorWa: meta.nomorWa || null,
  };
}

function pesanWaPelapor(lap: Laporan, info: { nama: string; rtLabel?: string }): string {
  const statusLabel =
    lap.status === "pending"
      ? "sedang kami tinjau"
      : lap.status === "diproses"
        ? "sedang diproses"
        : lap.status === "selesai"
          ? "telah selesai ditangani"
          : "telah kami catat";
  let msg = `Halo ${info.nama}, terima kasih atas laporan Anda di RW 03 Padasuka.`;
  if (info.rtLabel) msg += `\n${info.rtLabel}`;
  msg += `\n\nJudul: ${lap.judul}\nStatus: ${statusLabel}`;
  if (lap.tanggapanAdmin?.trim()) {
    msg += `\n\nTanggapan pengurus:\n${lap.tanggapanAdmin.trim()}`;
  }
  return msg;
}

export default function AdminKelolaLaporan() {
  const { toast } = useToast();
  const [tanggapan, setTanggapan] = useState<Record<number, string>>({});
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterRt, setFilterRt] = useState("semua");
  const [filterJenis, setFilterJenis] = useState("semua");
  const [filterSumber, setFilterSumber] = useState("semua");
  const [search, setSearch] = useState("");

  const { data: laporanList, isLoading } = useQuery<Laporan[]>({ queryKey: ["/api/laporan"] });
  const { data: wargaList } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });
  const { data: kkList } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });
  const needsSinggah = Boolean(laporanList?.some((l) => l.wargaSinggahId));
  const { data: singgahList } = useQuery<WargaSinggah[]>({
    queryKey: ["/api/warga-singgah"],
    enabled: needsSinggah,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, tanggapanText }: { id: number; status: string; tanggapanText?: string }) => {
      await apiRequest("PATCH", `/api/laporan/${id}/status`, { status, tanggapan: tanggapanText });
    },
    onSuccess: () => {
      toast({ title: "Status diperbarui" });
      queryClient.invalidateQueries({ queryKey: ["/api/laporan"] });
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    diproses: { label: "Diproses", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
    selesai: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle },
    ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  const handleUpdate = (id: number, status: string) => {
    updateMutation.mutate({ id, status, tanggapanText: tanggapan[id] });
  };

  const pendingCount = laporanList?.filter((l) => l.status === "pending").length ?? 0;

  const filteredLaporan = useMemo(() => {
    if (!laporanList) return [];
    const q = search.trim().toLowerCase();
    return laporanList.filter((lap) => {
      if (filterStatus !== "semua" && lap.status !== filterStatus) return false;
      if (filterJenis !== "semua" && lap.jenisLaporan !== filterJenis) return false;
      if (filterSumber !== "semua" && sumberLaporanKey(lap) !== filterSumber) return false;
      if (filterRt !== "semua") {
        const rt = nomorRtLaporan(lap, wargaList, kkList);
        if (rt !== parseInt(filterRt, 10)) return false;
      }
      if (!q) return true;
      const info = pelaporInfo(lap, wargaList, singgahList, kkList);
      const isi = stripLaporanMetaPrefix(lap.isi);
      const haystack = [lap.judul, info.nama, isi, info.rtLabel ?? "", sumberLaporan(lap, wargaList)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    laporanList,
    filterStatus,
    filterRt,
    filterJenis,
    filterSumber,
    search,
    wargaList,
    kkList,
    singgahList,
  ]);

  const hasActiveFilter =
    filterStatus !== "semua" ||
    filterRt !== "semua" ||
    filterJenis !== "semua" ||
    filterSumber !== "semua" ||
    search.trim().length > 0;

  const resetFilter = () => {
    setFilterStatus("semua");
    setFilterRt("semua");
    setFilterJenis("semua");
    setFilterSumber("semua");
    setSearch("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold" data-testid="text-kelola-laporan-title">
          Kelola Laporan
        </h2>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {pendingCount} menunggu
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-medium">Filter</p>
            {hasActiveFilter && (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilter}>
                Reset filter
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="cari-laporan">Cari</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cari-laporan"
                  placeholder="Judul, nama pelapor, isi laporan…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-cari-laporan"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="filter-status-laporan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua status</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="diproses">Diproses</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="ditolak">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>RT</Label>
              <Select value={filterRt} onValueChange={setFilterRt}>
                <SelectTrigger data-testid="filter-rt-laporan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua RT</SelectItem>
                  {ACTIVE_RT_NUMBERS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      RT {String(n).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jenis</Label>
              <Select value={filterJenis} onValueChange={setFilterJenis}>
                <SelectTrigger data-testid="filter-jenis-laporan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua jenis</SelectItem>
                  {Object.entries(jenisLaporanLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sumber</Label>
              <Select value={filterSumber} onValueChange={setFilterSumber}>
                <SelectTrigger data-testid="filter-sumber-laporan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua sumber</SelectItem>
                  <SelectItem value="kiosk">{sumberLaporanLabels.kiosk}</SelectItem>
                  <SelectItem value="warga">{sumberLaporanLabels.warga}</SelectItem>
                  <SelectItem value="singgah">{sumberLaporanLabels.singgah}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!isLoading && laporanList && laporanList.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Menampilkan {filteredLaporan.length} dari {laporanList.length} laporan
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : laporanList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada laporan masuk</p>
          </CardContent>
        </Card>
      ) : filteredLaporan.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Tidak ada laporan sesuai filter</p>
            <Button type="button" variant="outline" size="sm" onClick={resetFilter}>
              Reset filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        filteredLaporan.map((lap) => {
          const sc = statusConfig[lap.status] || statusConfig.pending;
          const StatusIcon = sc.icon;
          const canUpdate = lap.status !== "selesai" && lap.status !== "ditolak";
          const jenisLabel = jenisLaporanLabels[lap.jenisLaporan] || lap.jenisLaporan;
          const info = pelaporInfo(lap, wargaList, singgahList, kkList);
          const waUrl = info.nomorWa ? toWaMeUrl(info.nomorWa, pesanWaPelapor(lap, info)) : null;
          const isiTampil = stripLaporanMetaPrefix(lap.isi);

          const nextStatuses =
            lap.status === "pending"
              ? [
                  { value: "diproses", label: "Proses", color: "bg-blue-600 hover:bg-blue-700" },
                  { value: "selesai", label: "Selesai", color: "bg-green-700 hover:bg-green-800" },
                  { value: "ditolak", label: "Tolak", color: "" },
                ]
              : lap.status === "diproses"
                ? [
                    { value: "selesai", label: "Selesai", color: "bg-green-700 hover:bg-green-800" },
                    { value: "ditolak", label: "Tolak", color: "" },
                  ]
                : [];

          return (
            <Card key={lap.id} data-testid={`card-laporan-admin-${lap.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{lap.judul}</p>
                    <p className="text-xs text-muted-foreground">
                      {info.nama}
                      {info.rtLabel ? ` · ${info.rtLabel}` : ""}
                      {" · "}
                      {sumberLaporanLabels[sumberLaporanKey(lap)]} · {jenisLabel}
                    </p>
                  </div>
                  <Badge className={`${sc.color} text-[10px] flex-shrink-0 gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {sc.label}
                  </Badge>
                </div>
                <p className="text-xs whitespace-pre-wrap">{isiTampil || lap.isi}</p>

                {waUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-700 border-green-200 hover:bg-green-50"
                    asChild
                  >
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`button-wa-pelapor-${lap.id}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      Hubungi pelapor (WA)
                    </a>
                  </Button>
                )}

                {canUpdate && (
                  <div className="space-y-2 pt-2 border-t">
                    <Textarea
                      placeholder="Tulis tanggapan (opsional)..."
                      value={tanggapan[lap.id] || ""}
                      onChange={(e) => setTanggapan({ ...tanggapan, [lap.id]: e.target.value })}
                      rows={2}
                      data-testid={`input-tanggapan-${lap.id}`}
                    />
                    <div className="flex gap-2 flex-wrap">
                      {nextStatuses.map((ns) =>
                        ns.value === "ditolak" ? (
                          <Button
                            key={ns.value}
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdate(lap.id, ns.value)}
                            disabled={updateMutation.isPending}
                            data-testid={`button-${ns.value}-${lap.id}`}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            {ns.label}
                          </Button>
                        ) : (
                          <Button
                            key={ns.value}
                            size="sm"
                            className={ns.color}
                            onClick={() => handleUpdate(lap.id, ns.value)}
                            disabled={updateMutation.isPending}
                            data-testid={`button-${ns.value}-${lap.id}`}
                          >
                            {ns.value === "selesai" ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {ns.label}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {lap.tanggapanAdmin && (
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-xs font-medium">Tanggapan:</p>
                    <p className="text-xs text-muted-foreground">{lap.tanggapanAdmin}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {lap.createdAt
                    ? new Date(lap.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
