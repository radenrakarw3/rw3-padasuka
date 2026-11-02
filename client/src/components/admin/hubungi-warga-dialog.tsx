import { useEffect, useState } from "react";
import { ExternalLink, Loader2, MessageCircle, Send } from "lucide-react";
import {
  bangunPoinBalasan,
  buildHubungiWargaPesanDariPoin,
  HUBUNGI_WARGA_JENIS_OPTIONS,
  type HubungiWargaJenis,
  type HubungiWargaTemplateInput,
  type PoinBalasan,
} from "@shared/wa-template-kependudukan";
import type { WargaDataIssueId } from "@shared/warga-data-issues";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { toWaMeUrl } from "@/lib/wa";
import { cn } from "@/lib/utils";

export type HubungiWargaTarget = {
  wargaId: number;
  namaLengkap: string;
  issueIds?: WargaDataIssueId[];
  chartLabel?: string | null;
  /** Nada awal saat dialog dibuka */
  jenisAwal?: HubungiWargaJenis;
};

type PreviewRes = {
  wargaId: number;
  namaLengkap: string;
  kedudukanKeluarga?: string;
  namaKepalaKeluarga?: string | null;
  rt: number;
  phone: string;
  via: "warga" | "kepala_keluarga";
  issues: WargaDataIssueId[];
  dataPribadi?: string[];
  dataKeluarga?: string[];
  dataAnggotaLain?: { nama: string; kedudukan: string; kurang: string[] }[];
  poinBalasan?: PoinBalasan[];
  jenis: HubungiWargaJenis;
  pesan: string;
  starsenderOk: boolean;
  starsenderReason: string | null;
};

type Props = {
  target: HubungiWargaTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HubungiWargaDialog({ target, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [jenis, setJenis] = useState<HubungiWargaJenis>("minta_bantuan");
  const [pesan, setPesan] = useState("");
  const [preview, setPreview] = useState<PreviewRes | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !target) {
      setPreview(null);
      setPesan("");
      setPreviewError(null);
      return;
    }
    setJenis(target.jenisAwal ?? "minta_bantuan");
  }, [open, target]);

  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    setLoadingPreview(true);
    setPreviewError(null);

    (async () => {
      try {
        const res = await apiRequest("POST", "/api/admin/hubungi-warga/preview", {
          wargaId: target.wargaId,
          jenis,
          issueIds: target.issueIds,
          chartLabel: target.chartLabel ?? undefined,
        });
        const data = await readJsonSafely<PreviewRes>(res);
        if (cancelled) return;
        // Bangun ulang di client agar template terbaru selalu dipakai (hindari server lama).
        const templateInput: HubungiWargaTemplateInput = {
          namaLengkap: data.namaLengkap,
          kedudukanKeluarga: data.kedudukanKeluarga ?? "warga",
          rt: data.rt,
          issues: data.issues,
          jenis,
          via: data.via,
          namaKepalaKeluarga: data.namaKepalaKeluarga,
          dataPribadi: data.dataPribadi,
          dataKeluarga: data.dataKeluarga,
          dataAnggotaLain: data.dataAnggotaLain,
        };
        const poin =
          data.poinBalasan?.length
            ? data.poinBalasan
            : bangunPoinBalasan(templateInput);
        const pesanBaru = buildHubungiWargaPesanDariPoin(templateInput, poin);
        setPreview({ ...data, poinBalasan: poin, pesan: pesanBaru });
        setPesan(pesanBaru);
      } catch (err) {
        if (cancelled) return;
        setPreview(null);
        setPesan("");
        setPreviewError(getApiErrorMessage(err, "Gagal memuat pratinjau"));
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, target, jenis]);

  const kirim = async () => {
    if (!target || !preview) return;
    setSending(true);
    try {
      const res = await apiRequest("POST", "/api/admin/hubungi-warga/kirim", {
        wargaId: target.wargaId,
        jenis,
        issueIds: target.issueIds,
        chartLabel: target.chartLabel ?? undefined,
        confirm: true,
        pesan: pesan.trim(),
      });
      await readJsonSafely(res);
      toast({
        title: "Pesan terkirim",
        description: `WhatsApp ke ${preview.namaLengkap} berhasil dikirim via StarSender.`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Gagal mengirim",
        description: getApiErrorMessage(err, "Gagal mengirim WhatsApp"),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const waMeUrl =
    preview?.phone && pesan.trim()
      ? toWaMeUrl(preview.phone, pesan.trim())
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Hubungi warga</DialogTitle>
          <DialogDescription>
            {target
              ? `Satu pesan berisi seluruh data yang masih kurang (pribadi, keluarga, anggota lain) agar tidak bolak-balik.`
              : "Pilih warga terlebih dahulu."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:flex-1 sm:overflow-y-auto sm:pr-1">
          <div className="space-y-2">
            <Label>Jenis pesan</Label>
            <div className="grid grid-cols-2 gap-2">
              {HUBUNGI_WARGA_JENIS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setJenis(opt.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-colors",
                    jenis === opt.id
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-brand/40",
                  )}
                >
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground leading-snug">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {loadingPreview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyiapkan pratinjau…
            </div>
          )}

          {previewError && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {previewError}
            </p>
          )}

          {preview && !loadingPreview && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">RT {String(preview.rt).padStart(2, "0")}</span>
                <Badge variant="secondary" className="font-normal">
                  {preview.via === "kepala_keluarga" ? "WA via kepala keluarga" : "WA warga"}
                </Badge>
                {(preview.poinBalasan?.length ?? 0) > 0 && (
                  <Badge variant="outline" className="font-normal">
                    {preview.poinBalasan!.length} poin diminta
                  </Badge>
                )}
                {!preview.starsenderOk && (
                  <Badge variant="outline" className="font-normal text-amber-800 border-amber-300">
                    StarSender off
                  </Badge>
                )}
              </div>
              {!preview.starsenderOk && preview.starsenderReason && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {preview.starsenderReason}. Anda masih bisa membuka WhatsApp manual.
                </p>
              )}

              {(preview.poinBalasan?.length ?? 0) > 0 && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <div>
                    <p className="text-sm font-semibold">
                      Data yang diminta ({preview.poinBalasan!.length} poin)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Warga diminta balas sesuai nomor ini — sama dengan isi pesan di bawah.
                    </p>
                  </div>
                  <ol className="space-y-3 max-h-56 overflow-y-auto text-sm">
                    {preview.poinBalasan!.map((p) => (
                      <li key={p.no} className="flex gap-2">
                        <span className="shrink-0 font-mono text-xs font-bold text-brand w-5 pt-0.5">
                          {p.no}.
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium leading-snug">{p.label}</p>
                          <p className="text-xs text-muted-foreground leading-snug">{p.instruksi}</p>
                          {p.pilihan?.length ? (
                            <ul className="text-xs text-muted-foreground pl-1 space-y-0.5">
                              {p.pilihan.map((opsi, i) => (
                                <li key={opsi}>
                                  <span className="font-mono">{String.fromCharCode(97 + i)})</span> {opsi}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Contoh: {p.no}. {p.contohBalasan}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="hubungi-pesan">Pratinjau pesan WA (boleh diedit)</Label>
                <Textarea
                  id="hubungi-pesan"
                  value={pesan}
                  onChange={(e) => setPesan(e.target.value)}
                  className="min-h-[220px] text-sm font-mono"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          {waMeUrl && (
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <a href={waMeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Buka di WhatsApp
              </a>
            </Button>
          )}
          <Button
            className="w-full sm:w-auto"
            disabled={
              !preview ||
              loadingPreview ||
              sending ||
              !preview.starsenderOk ||
              pesan.trim().length < 20
            }
            onClick={() => void kirim()}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            Kirim lewat StarSender
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tombol pembuka dialog — dipakai di daftar verifikasi / grafik. */
export function HubungiWargaButton({
  onClick,
  disabled,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("touch-target", className)}
      disabled={disabled}
      onClick={onClick}
    >
      <MessageCircle className="w-4 h-4 mr-1.5" />
      Hubungi
    </Button>
  );
}
