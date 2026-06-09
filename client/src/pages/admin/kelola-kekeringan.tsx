import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Droplets, Users, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import type { LaporanKekeringan } from "@shared/schema";
import { kekeringanStatusLabels, type KekeringanStatus } from "@shared/laporan-kekeringan";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { toWaMeUrl } from "@/lib/wa";

const statusConfig: Record<KekeringanStatus, { color: string }> = {
  menunggu_survey: { color: "bg-amber-100 text-amber-800" },
  tiket_keluar: { color: "bg-sky-100 text-sky-800" },
  selesai: { color: "bg-green-100 text-green-800" },
  ditolak: { color: "bg-red-100 text-red-800" },
};

function pesanWaSurvey(row: LaporanKekeringan, tiket?: string): string {
  let msg = `Halo ${row.namaPelapor}, terima kasih atas laporan kekeringan air di RW 03 Padasuka.\n`;
  msg += `RT ${String(row.nomorRt).padStart(2, "0")} · ${row.jumlahPenghuni} penghuni`;
  if (tiket) {
    msg += `\n\nSurvey rumah telah selesai. Nomor tiket bantuan air Anda:\n${tiket}`;
    msg += `\n\nTunjukkan nomor tiket saat pengambilan bantuan air.`;
  }
  return msg;
}

export default function AdminKelolaKekeringan() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("menunggu_survey");
  const [filterRt, setFilterRt] = useState("semua");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [catatanSurvey, setCatatanSurvey] = useState("");
  const [tanggalSurvey, setTanggalSurvey] = useState(new Date().toISOString().slice(0, 10));

  const { data: list = [], isLoading } = useQuery<LaporanKekeringan[]>({
    queryKey: ["/api/laporan-kekeringan"],
  });

  const detail = list.find((r) => r.id === detailId);

  const filtered = useMemo(() => {
    return list.filter((row) => {
      if (filterStatus !== "semua" && row.status !== filterStatus) return false;
      if (filterRt !== "semua" && row.nomorRt !== parseInt(filterRt, 10)) return false;
      return true;
    });
  }, [list, filterStatus, filterRt]);

  const surveyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/laporan-kekeringan/${id}/survey`, {
        catatanSurvey,
        tanggalSurvey,
      });
    },
    onSuccess: () => {
      toast({ title: "Survey selesai", description: "Tiket bantuan air telah dikeluarkan" });
      setDetailId(null);
      setCatatanSurvey("");
      queryClient.invalidateQueries({ queryKey: ["/api/laporan-kekeringan"] });
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/laporan-kekeringan/${id}/reject`, { catatanSurvey });
    },
    onSuccess: () => {
      toast({ title: "Laporan ditolak" });
      setDetailId(null);
      setCatatanSurvey("");
      queryClient.invalidateQueries({ queryKey: ["/api/laporan-kekeringan"] });
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const selesaiMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/laporan-kekeringan/${id}/selesai`);
    },
    onSuccess: () => {
      toast({ title: "Distribusi selesai" });
      queryClient.invalidateQueries({ queryKey: ["/api/laporan-kekeringan"] });
    },
    onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const menungguCount = list.filter((r) => r.status === "menunggu_survey").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" data-testid="text-kelola-kekeringan-title">
            <Droplets className="w-5 h-5 text-sky-600" />
            Kekeringan Air
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Antrian diprioritaskan dari keluarga dengan penghuni terbanyak
          </p>
        </div>
        {menungguCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {menungguCount} menunggu survey
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="filter-status-kekeringan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="menunggu_survey">Menunggu survey</SelectItem>
                  <SelectItem value="tiket_keluar">Tiket dikeluarkan</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="ditolak">Ditolak</SelectItem>
                  <SelectItem value="semua">Semua</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>RT</Label>
              <Select value={filterRt} onValueChange={setFilterRt}>
                <SelectTrigger data-testid="filter-rt-kekeringan">
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
          </div>
          {!isLoading && list.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {list.length} laporan · urutan prioritas: penghuni terbanyak dulu
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada laporan kekeringan</p>
          </CardContent>
        </Card>
      ) : (
        filtered.map((row, idx) => {
          const sc = statusConfig[row.status as KekeringanStatus] ?? statusConfig.menunggu_survey;
          const waUrl = toWaMeUrl(row.nomorWa, pesanWaSurvey(row, row.nomorTiket ?? undefined));

          return (
            <Card key={row.id} data-testid={`card-kekeringan-${row.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {filterStatus === "menunggu_survey" || (filterStatus === "semua" && row.status === "menunggu_survey") ? (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          #{idx + 1}
                        </Badge>
                      ) : null}
                      <p className="font-semibold text-sm">{row.namaPelapor}</p>
                      <Badge className="bg-brand/10 text-brand text-[10px] gap-1">
                        <Users className="w-3 h-3" />
                        {row.jumlahPenghuni} orang
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.nomorAntrian}
                      {row.nomorTiket ? ` · ${row.nomorTiket}` : ""}
                      {" · "}RT {String(row.nomorRt).padStart(2, "0")}
                    </p>
                  </div>
                  <Badge className={`${sc.color} text-[10px] flex-shrink-0`}>
                    {kekeringanStatusLabels[row.status as KekeringanStatus] ?? row.status}
                  </Badge>
                </div>

                <p className="text-xs">{row.alamat}</p>
                {row.keterangan && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{row.keterangan}</p>
                )}

                <div className="flex gap-2 flex-wrap">
                  {waUrl && (
                    <Button size="sm" variant="outline" className="text-green-700 border-green-200" asChild>
                      <a href={waUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                        Hubungi (WA)
                      </a>
                    </Button>
                  )}
                  {row.status === "menunggu_survey" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setCatatanSurvey("");
                        setTanggalSurvey(new Date().toISOString().slice(0, 10));
                        setDetailId(row.id);
                      }}
                      data-testid={`button-survey-${row.id}`}
                    >
                      Survey rumah
                    </Button>
                  )}
                  {row.status === "tiket_keluar" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => selesaiMutation.mutate(row.id)}
                      disabled={selesaiMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Tandai selesai
                    </Button>
                  )}
                </div>

                {row.catatanSurvey && (
                  <div className="p-2 bg-muted rounded-md text-xs">
                    <p className="font-medium">Catatan survey ({row.tanggalSurvey}):</p>
                    <p className="text-muted-foreground">{row.catatanSurvey}</p>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  {row.createdAt
                    ? new Date(row.createdAt).toLocaleDateString("id-ID", {
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

      <Dialog open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Survey rumah — {detail?.namaPelapor}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="text-sm space-y-1 bg-muted/50 rounded-lg p-3">
                <p><strong>{detail.jumlahPenghuni} penghuni</strong> · RT {String(detail.nomorRt).padStart(2, "0")}</p>
                <p className="text-muted-foreground">{detail.alamat}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal-survey">Tanggal survey</Label>
                <Input
                  id="tanggal-survey"
                  type="date"
                  value={tanggalSurvey}
                  onChange={(e) => setTanggalSurvey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catatan-survey">Catatan survey</Label>
                <Textarea
                  id="catatan-survey"
                  rows={3}
                  placeholder="Hasil kunjungan ke rumah..."
                  value={catatanSurvey}
                  onChange={(e) => setCatatanSurvey(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Setelah disetujui, tiket <span className="font-mono">TKT-KRG-{detail.id}</span> akan dikeluarkan ke warga.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  className="flex-1 bg-green-700 hover:bg-green-800"
                  onClick={() => surveyMutation.mutate(detail.id)}
                  disabled={surveyMutation.isPending || rejectMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Setujui & keluarkan tiket
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!catatanSurvey.trim()) {
                      toast({ title: "Isi alasan penolakan", variant: "destructive" });
                      return;
                    }
                    rejectMutation.mutate(detail.id);
                  }}
                  disabled={surveyMutation.isPending || rejectMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Tolak
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
