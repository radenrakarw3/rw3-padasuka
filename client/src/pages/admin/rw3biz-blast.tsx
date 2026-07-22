import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Megaphone, RefreshCw, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3EmptyState,
} from "@/components/admin/visitrw3-admin-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, queryClient, readJsonSafely } from "@/lib/queryClient";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { cn } from "@/lib/utils";

type ChannelStatus = {
  configured: boolean;
  disabled: boolean;
  ready: boolean;
  deviceId: number | null;
  label: string;
};

type Recipient = {
  usahaId: number;
  nomorBiz: string;
  namaUsaha: string;
  pjNama: string;
  pjNomorWhatsapp: string;
  rt: number;
};

type BlastRow = {
  id: number;
  pesan: string;
  kategoriFilter: string;
  filterRt: number | null;
  jumlahPenerima: number;
  jumlahBerhasil: number;
  jumlahPending: number;
  jumlahGagal: number;
  jumlahDilewati: number;
  status: string;
  lastError: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

type BlastDetail = {
  blast: BlastRow;
  recipients: {
    id: number;
    nama: string;
    nomorWhatsapp: string;
    rt: number | null;
    status: string;
    lastError: string | null;
    sentAt: string | null;
  }[];
};

const DEFAULT_PESAN =
  "Assalamu'alaikum, {{nama}}.\n\n" +
  "Pesan dari pengurus RW 03 untuk usaha *{{usaha}}* ({{nomor}}, RT {{rt}}).\n\n" +
  "[Isi pengumuman di sini]\n\n" +
  "— KPP RW 03 Padasuka";

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: "Menunggu",
    mengirim: "Mengirim",
    berjalan: "Berjalan",
    selesai: "Selesai",
    gagal: "Gagal",
    sebagian_gagal: "Sebagian gagal",
    terkirim: "Terkirim",
    sent: "Terkirim",
    failed: "Gagal",
    skipped: "Dilewati",
    retry: "Retry",
    sending: "Mengirim…",
  };
  return map[s] || s;
}

function statusTone(s: string) {
  if (s === "selesai" || s === "sent" || s === "terkirim") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (s === "gagal" || s === "failed") return "text-destructive bg-destructive/10 border-destructive/20";
  if (s === "sebagian_gagal") return "text-amber-800 bg-amber-50 border-amber-200";
  if (s === "berjalan" || s === "mengirim" || s === "sending") return "text-blue-800 bg-blue-50 border-blue-200";
  return "text-muted-foreground bg-muted border-border";
}

export default function AdminRw3bizBlast() {
  const { toast } = useToast();
  const [pesan, setPesan] = useState(DEFAULT_PESAN);
  const [rtFilter, setRtFilter] = useState<string>("semua");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const rtQuery = rtFilter === "semua" ? "" : `?rt=${rtFilter}`;

  const { data: channel, isLoading: channelLoading } = useQuery<ChannelStatus>({
    queryKey: ["/api/admin/rw3biz/blast/channel"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/blast/channel", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal cek StarSender");
      return readJsonSafely(res);
    },
    refetchInterval: 30_000,
  });

  const { data: recipients = [], isLoading: recipientsLoading } = useQuery<Recipient[]>({
    queryKey: ["/api/admin/rw3biz/blast/recipients", rtFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rw3biz/blast/recipients${rtQuery}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat penerima");
      return readJsonSafely(res);
    },
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<BlastRow[]>({
    queryKey: ["/api/admin/rw3biz/blast"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/blast", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat riwayat");
      return readJsonSafely(res);
    },
    refetchInterval: (q) => {
      const rows = q.state.data as BlastRow[] | undefined;
      const running = rows?.some((b) => b.status === "berjalan" || b.status === "mengirim");
      return running ? 2500 : 15_000;
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery<BlastDetail>({
    queryKey: ["/api/admin/rw3biz/blast", detailId],
    enabled: detailId != null,
    queryFn: async () => {
      const res = await fetch(`/api/admin/rw3biz/blast/${detailId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat detail");
      return readJsonSafely(res);
    },
    refetchInterval: (q) => {
      const st = q.state.data?.blast?.status;
      return st === "berjalan" || st === "mengirim" ? 2000 : false;
    },
  });

  useEffect(() => {
    setSelected(new Set(recipients.map((r) => r.usahaId)));
  }, [recipients]);

  const preview = useMemo(() => {
    const sample = recipients.find((r) => selected.has(r.usahaId)) ?? recipients[0];
    if (!sample) return pesan;
    return pesan
      .replaceAll("{{nama}}", sample.pjNama)
      .replaceAll("{{usaha}}", sample.namaUsaha)
      .replaceAll("{{nomor}}", sample.nomorBiz)
      .replaceAll("{{rt}}", String(sample.rt));
  }, [pesan, recipients, selected]);

  const selectedCount = selected.size;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const body: { pesan: string; rt?: number; usahaIds: number[] } = {
        pesan,
        usahaIds: Array.from(selected),
      };
      if (rtFilter !== "semua") body.rt = Number(rtFilter);
      const res = await apiRequest("POST", "/api/admin/rw3biz/blast", body);
      return readJsonSafely<BlastRow>(res);
    },
    onSuccess: (blast) => {
      setConfirmOpen(false);
      toast({
        title: "Blast dimulai",
        description: `Mengirim ke ${blast.jumlahPenerima} PJ via StarSender…`,
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/blast"] });
      setDetailId(blast.id);
    },
    onError: (e: unknown) => {
      toast({ title: "Gagal kirim blast", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/rw3biz/blast/${id}/retry`);
      return readJsonSafely<BlastRow>(res);
    },
    onSuccess: () => {
      toast({ title: "Retry dimulai", description: "Mengirim ulang penerima yang gagal." });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/blast"] });
      if (detailId) void queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/blast", detailId] });
    },
    onError: (e: unknown) => {
      toast({ title: "Retry gagal", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(recipients.map((r) => r.usahaId)) : new Set());
  }

  function toggleOne(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="WA Blast ke PJ usaha"
        description="Kirim pengumuman massal ke penanggung jawab usaha aktif via StarSender."
      />

      {channelLoading ? (
        <Skeleton className="h-14 w-full rounded-xl" />
      ) : (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 flex flex-wrap items-center gap-2 text-sm",
            channel?.ready
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-950",
          )}
        >
          {channel?.ready ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="font-medium">{channel?.label}</span>
          {channel?.deviceId != null && (
            <span className="text-xs opacity-80">· device {channel.deviceId}</span>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <Label>Filter RT</Label>
            <Select value={rtFilter} onValueChange={setRtFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Semua RT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua RT aktif</SelectItem>
                {ACTIVE_RT_NUMBERS.map((rt) => (
                  <SelectItem key={rt} value={String(rt)}>
                    RT {String(rt).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Isi pesan</Label>
            <p className="text-[11px] text-muted-foreground">
              Placeholder: {"{{nama}}"}, {"{{usaha}}"}, {"{{nomor}}"}, {"{{rt}}"}
            </p>
            <Textarea
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pratinjau (contoh penerima)
            </p>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans">{preview}</pre>
          </div>

          <Button
            className="w-full gap-2"
            disabled={!channel?.ready || selectedCount === 0 || pesan.trim().length < 10 || sendMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <Send className="w-4 h-4" />
            Kirim ke {selectedCount} PJ
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Megaphone className="w-4 h-4" />
              Penerima ({recipients.length})
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toggleAll(true)}>
                Semua
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toggleAll(false)}>
                Kosongkan
              </Button>
            </div>
          </div>

          {recipientsLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : recipients.length === 0 ? (
            <Visitrw3EmptyState
              icon={Megaphone}
              title="Belum ada penerima"
              description="PJ muncul setelah usaha RW3BIZ disetujui dan WA + opt-in notifikasi aktif."
            />
          ) : (
            <ul className="max-h-[28rem] overflow-y-auto space-y-2 pr-1">
              {recipients.map((r) => {
                const checked = selected.has(r.usahaId);
                return (
                  <li key={r.usahaId} className="flex items-start gap-2 rounded-lg border px-3 py-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleOne(r.usahaId, v === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.namaUsaha}</p>
                      <p className="text-[11px] text-muted-foreground">
                        PJ {r.pjNama} · RT {String(r.rt).padStart(2, "0")} · {r.pjNomorWhatsapp}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">{r.nomorBiz}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Riwayat blast</h2>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/blast"] })}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat ulang
          </Button>
        </div>
        {historyLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada blast yang dikirim.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusTone(b.status))}>
                      {statusLabel(b.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{b.id} · {b.jumlahBerhasil}/{b.jumlahPenerima} ok
                      {b.jumlahGagal > 0 ? ` · ${b.jumlahGagal} gagal` : ""}
                      {b.filterRt != null ? ` · RT ${b.filterRt}` : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.pesan}</p>
                </div>
                <div className="flex gap-2">
                  {(b.jumlahGagal > 0 || b.status === "gagal" || b.status === "sebagian_gagal") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={retryMutation.isPending}
                      onClick={() => retryMutation.mutate(b.id)}
                    >
                      Retry gagal
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => setDetailId(b.id)}>
                    Detail
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi kirim blast</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pesan akan dikirim via StarSender ke <strong>{selectedCount}</strong> penanggung jawab
            usaha aktif. Jeda antar pesan ±1,2 detik.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
              className="gap-1.5"
            >
              <Send className="w-4 h-4" />
              {sendMutation.isPending ? "Memulai…" : "Ya, kirim sekarang"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail blast #{detailId}</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={cn("px-2 py-0.5 rounded-full border font-semibold", statusTone(detail.blast.status))}>
                  {statusLabel(detail.blast.status)}
                </span>
                <span className="text-muted-foreground">
                  {detail.blast.jumlahBerhasil} ok · {detail.blast.jumlahGagal} gagal ·{" "}
                  {detail.blast.jumlahPending} pending · {detail.blast.jumlahDilewati} dilewati
                </span>
              </div>
              {detail.blast.lastError && (
                <p className="text-xs text-destructive">{detail.blast.lastError}</p>
              )}
              <pre className="whitespace-pre-wrap text-xs rounded-lg border bg-muted/40 p-3">{detail.blast.pesan}</pre>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {detail.recipients.map((r) => (
                  <li key={r.id} className="rounded-lg border px-2.5 py-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium truncate">{r.nama}</span>
                      <span className={cn("shrink-0 px-1.5 rounded border text-[10px]", statusTone(r.status))}>
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{r.nomorWhatsapp}</p>
                    {r.lastError && <p className="text-destructive mt-0.5">{r.lastError}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Visitrw3AdminShell>
  );
}
