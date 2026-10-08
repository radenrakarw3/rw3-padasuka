import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ClipboardCheck, MapPin, Trash2, Users, XCircle } from "lucide-react";
import { RtjuaraAdminNav } from "@/components/admin/rtjuara-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3ChipFilters,
  Visitrw3EmptyState,
  Visitrw3Panel,
  Visitrw3RtBadge,
} from "@/components/admin/visitrw3-admin-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { RTJUARA_API } from "@shared/rtjuara-api";
import { RTJUARA_RT_NUMBERS, bulanKey, bulanLabel, bulanSebelumnya, rtLabel } from "@shared/rtjuara";
import { rtjuaraApi, type SubmissionView } from "@/lib/rtjuara-api";
import { FotoStrip, PeriodeBadge, PoinBadge, StatusBuktiBadge } from "@/components/rtjuara/rtjuara-ui";
import { getApiErrorMessage } from "@/lib/queryClient";

type FilterStatus = "menunggu" | "disetujui" | "ditolak" | "semua";

function daftarBulan(): string[] {
  const list: string[] = [];
  let key = bulanKey();
  for (let i = 0; i < 6; i++) {
    list.push(key);
    key = bulanSebelumnya(key);
  }
  return list;
}

export default function AdminRtjuaraVerifikasi() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<FilterStatus>("menunggu");
  const [rt, setRt] = useState<number | null>(null);
  const [bulan, setBulan] = useState<string | null>(null);
  const [catatan, setCatatan] = useState<Record<number, string>>({});
  const [hapusItem, setHapusItem] = useState<SubmissionView | null>(null);

  const { data: daftar = [], isLoading } = useQuery({
    queryKey: [RTJUARA_API.admin.submission, status, rt, bulan],
    queryFn: () =>
      rtjuaraApi.admin.submissionList({
        status: status === "semua" ? null : status,
        rt,
        bulan,
      }),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.admin.submission] }),
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.admin.dashboard] }),
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.publik.leaderboard] }),
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.publik.galeri] }),
    ]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, keputusan }: { id: number; keputusan: "disetujui" | "ditolak" }) =>
      rtjuaraApi.admin.submissionReview(id, {
        status: keputusan,
        catatanAdmin: catatan[id]?.trim() || null,
      }),
    onSuccess: (hasil) => {
      toast({
        title: hasil.status === "disetujui" ? "Bukti disetujui" : "Bukti ditolak",
        description:
          hasil.status === "disetujui"
            ? `${rtLabel(hasil.rt)} mendapat ${hasil.poinDiberikan} poin.`
            : `${rtLabel(hasil.rt)} bisa mengirim ulang bukti untuk periode ini.`,
      });
      setCatatan((prev) => {
        const next = { ...prev };
        delete next[hasil.id];
        return next;
      });
      void invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal memverifikasi", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const hapusMutation = useMutation({
    mutationFn: (id: number) => rtjuaraApi.admin.submissionDelete(id),
    onSuccess: () => {
      toast({ title: "Bukti dihapus" });
      setHapusItem(null);
      void invalidate();
    },
    onError: (e: unknown) => {
      setHapusItem(null);
      toast({ title: "Gagal menghapus bukti", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  const handleTolak = (item: SubmissionView) => {
    if (!catatan[item.id]?.trim()) {
      toast({
        title: "Alasan penolakan wajib diisi",
        description: "Tulis catatan supaya ketua RT tahu apa yang harus diperbaiki.",
        variant: "destructive",
      });
      return;
    }
    reviewMutation.mutate({ id: item.id, keputusan: "ditolak" });
  };

  return (
    <Visitrw3AdminShell>
      <RtjuaraAdminNav
        title="Verifikasi Bukti"
        description="Periksa dokumentasi dan form dari ketua RT sebelum poin diberikan."
      />

      <div className="space-y-2">
        <Visitrw3ChipFilters<FilterStatus>
          value={status}
          onChange={setStatus}
          options={[
            { value: "menunggu", label: "Menunggu" },
            { value: "disetujui", label: "Disetujui" },
            { value: "ditolak", label: "Ditolak" },
            { value: "semua", label: "Semua" },
          ]}
        />

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setRt(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              rt == null ? "bg-[hsl(163,55%,22%)] text-white" : "bg-muted/70 text-muted-foreground"
            }`}
          >
            Semua RT
          </button>
          {RTJUARA_RT_NUMBERS.map((nomor) => (
            <button
              key={nomor}
              type="button"
              onClick={() => setRt(nomor)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                rt === nomor ? "bg-[hsl(163,55%,22%)] text-white" : "bg-muted/70 text-muted-foreground"
              }`}
            >
              {rtLabel(nomor)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setBulan(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              bulan == null ? "bg-[hsl(40,45%,55%)] text-white" : "bg-muted/70 text-muted-foreground"
            }`}
          >
            Semua bulan
          </button>
          {daftarBulan().map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setBulan(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                bulan === key ? "bg-[hsl(40,45%,55%)] text-white" : "bg-muted/70 text-muted-foreground"
              }`}
            >
              {bulanLabel(key)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : daftar.length === 0 ? (
        <Visitrw3Panel>
          <Visitrw3EmptyState
            icon={ClipboardCheck}
            title="Tidak ada bukti pada filter ini"
            description="Coba ubah filter status, RT, atau bulan."
          />
        </Visitrw3Panel>
      ) : (
        <div className="space-y-3">
          {daftar.map((item) => (
            <Visitrw3Panel key={item.id} className="overflow-visible">
              <div className="space-y-3" data-testid={`verifikasi-${item.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Visitrw3RtBadge rt={item.rt} />
                      <StatusBuktiBadge status={item.status} />
                      <PeriodeBadge periode={item.questPeriode} />
                    </div>
                    <p className="text-sm font-semibold">{item.judulKegiatan}</p>
                    <p className="text-xs text-muted-foreground">Quest: {item.questJudul}</p>
                  </div>
                  <PoinBadge
                    poin={item.status === "disetujui" ? item.poinDiberikan : item.poinPotensi}
                    muted={item.status !== "disetujui"}
                  />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" /> {item.tanggalKegiatan}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {item.lokasi}
                  </span>
                  {item.jumlahPeserta != null && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {item.jumlahPeserta} peserta
                    </span>
                  )}
                  {item.dikirimOleh && <span>Dikirim: {item.dikirimOleh}</span>}
                </div>

                <p className="text-sm whitespace-pre-wrap">{item.deskripsi}</p>

                <FotoStrip fotoIds={item.fotoIds} alt={item.judulKegiatan} />

                {item.status === "menunggu" ? (
                  <div className="space-y-2 border-t pt-3">
                    <Textarea
                      value={catatan[item.id] ?? ""}
                      onChange={(e) => setCatatan((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      rows={2}
                      maxLength={500}
                      placeholder="Catatan untuk ketua RT (wajib bila ditolak)"
                      data-testid={`catatan-${item.id}`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ id: item.id, keputusan: "disetujui" })}
                        className="text-white"
                        style={{ backgroundColor: "hsl(163,55%,22%)" }}
                        data-testid={`setujui-${item.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Setujui (+{item.poinPotensi} poin)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reviewMutation.isPending}
                        onClick={() => handleTolak(item)}
                        className="text-destructive border-destructive/40"
                        data-testid={`tolak-${item.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <div className="text-xs text-muted-foreground">
                      {item.catatanAdmin && <p>Catatan: {item.catatanAdmin}</p>}
                      {item.reviewedBy && <p>Diverifikasi oleh {item.reviewedBy}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reviewMutation.mutate({ id: item.id, keputusan: "disetujui" })}
                        disabled={reviewMutation.isPending || item.status === "disetujui"}
                      >
                        Setujui ulang
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setHapusItem(item)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Visitrw3Panel>
          ))}
        </div>
      )}

      <AlertDialog open={hapusItem != null} onOpenChange={(open) => !open && setHapusItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus bukti ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Bukti "{hapusItem?.judulKegiatan}" beserta seluruh fotonya akan dihapus permanen.
              Poin yang sudah diberikan ikut hilang dari papan peringkat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => hapusItem && hapusMutation.mutate(hapusItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Visitrw3AdminShell>
  );
}
