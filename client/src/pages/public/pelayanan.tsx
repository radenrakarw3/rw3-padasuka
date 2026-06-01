import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Loader2, ChevronRight, Phone, User } from "lucide-react";
import { toWaMeUrl } from "@/lib/wa";
import { readJsonSafely } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { StatusBadge } from "@/components/gov/status-badge";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";

type RtData = {
  nomorRt: number;
  namaKetua: string;
  nomorWhatsapp: string | null;
  tersedia: boolean;
};

export default function PublicPelayanan() {
  const [selectedRt, setSelectedRt] = useState<number | null>(null);

  const { data: rtList = [], isLoading } = useQuery<RtData[]>({
    queryKey: ["/api/rt", "pelayanan"],
    queryFn: async () => {
      const res = await fetch("/api/rt");
      if (!res.ok) throw new Error("Gagal memuat data RT");
      const list = await readJsonSafely<
        { nomorRt: number; namaKetua: string; nomorWhatsapp: string | null }[]
      >(res);
      return list
        .filter((rt) => (ACTIVE_RT_NUMBERS as readonly number[]).includes(rt.nomorRt))
        .map((rt) => {
          const wa = rt.nomorWhatsapp ? String(rt.nomorWhatsapp) : "";
          return {
            nomorRt: rt.nomorRt,
            namaKetua: rt.namaKetua,
            nomorWhatsapp: rt.nomorWhatsapp,
            tersedia: wa.replace(/\D/g, "").length >= 9,
          };
        });
    },
  });

  const rt = selectedRt != null ? rtList.find((r) => r.nomorRt === selectedRt) : null;

  const openWaRt = () => {
    if (!rt?.nomorWhatsapp) return;
    const pesan = `Halo Pak/Ibu Ketua RT ${String(rt.nomorRt).padStart(2, "0")},\n\nSaya ingin konsultasi pelayanan RW.\n\nTerima kasih.`;
    window.open(toWaMeUrl(rt.nomorWhatsapp, pesan), "_blank", "noopener,noreferrer");
  };

  return (
    <PublicKioskLayout
      title="Hubungi ketua RT"
      backHref="/"
      onBack={rt ? () => setSelectedRt(null) : undefined}
    >
      {isLoading ? (
        <div className="flex justify-center py-12" role="status" aria-label="Memuat">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : rt ? (
        <div className="space-y-4">
          <p className="text-caption text-muted-foreground">Langkah 2 dari 2 · Hubungi ketua</p>
          <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-caption uppercase tracking-wide text-muted-foreground">RT</p>
                <h2 className="text-display text-brand">RT {String(rt.nomorRt).padStart(2, "0")}</h2>
              </div>
              <StatusBadge variant={rt.tersedia ? "ready" : "unavailable"} />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-muted-foreground" aria-hidden />
              </div>
              <div>
                <p className="text-caption text-muted-foreground">Ketua RT</p>
                <p className="font-semibold text-lg">{rt.namaKetua}</p>
              </div>
            </div>
            {rt.tersedia && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" aria-hidden />
                <span className="font-medium">{rt.nomorWhatsapp}</span>
              </div>
            )}
          </div>
          {rt.tersedia && (
            <Button type="button" className="w-full touch-target gap-2" onClick={openWaRt}>
              <MessageCircle className="w-5 h-5" aria-hidden />
              Hubungi via WhatsApp
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="prose-gov mb-4">Langkah 1 dari 2 · Pilih RT tempat Anda membutuhkan pelayanan.</p>
          <div className="space-y-2" role="list">
            {rtList.map((item) => (
              <button
                key={item.nomorRt}
                type="button"
                onClick={() => setSelectedRt(item.nomorRt)}
                className="w-full flex items-center justify-between gap-3 p-4 min-h-[var(--touch-min)] rounded-xl border bg-card text-left hover:bg-muted/50 transition-colors shadow-sm"
                data-testid={`button-rt-${item.nomorRt}`}
                role="listitem"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">RT {String(item.nomorRt).padStart(2, "0")}</p>
                    <StatusBadge
                      variant={item.tersedia ? "ready" : "unavailable"}
                      className="scale-90 origin-left"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{item.namaKetua}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden />
              </button>
            ))}
          </div>
        </>
      )}
    </PublicKioskLayout>
  );
}
