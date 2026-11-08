import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, Loader2, Shield, Star } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  BINTANG_RATING,
  BINTANG_RATING_LABEL,
  MAKS_ISI_RATING,
  SASARAN_RATING,
  SASARAN_RATING_INFO,
  type BintangRating,
  type SasaranRating,
} from "@shared/rating";
import { WILAYAH_RT_NUMBERS } from "@shared/wilayah";

type Langkah = "pilih" | "isi" | "terkirim";

export default function PublicRating() {
  const { toast } = useToast();
  const [langkah, setLangkah] = useState<Langkah>("pilih");
  const [sasaran, setSasaran] = useState<SasaranRating | null>(null);
  const [nomorRt, setNomorRt] = useState<number | null>(null);
  const [bintang, setBintang] = useState<BintangRating | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [isi, setIsi] = useState("");
  const [nomorWa, setNomorWa] = useState("");
  const [konfirmasiWa, setKonfirmasiWa] = useState(true);

  const kirim = useMutation({
    mutationFn: async () => {
      if (!sasaran || !bintang) throw new Error("Lengkapi rating");
      const res = await apiRequest("POST", "/api/public/rating", {
        sasaran,
        nomorRt: sasaran === "rt" ? nomorRt : null,
        bintang,
        isi: isi.trim(),
        nomorWa: nomorWa.trim(),
        website: "",
      });
      return res.json() as Promise<{ ok: boolean; konfirmasi: boolean }>;
    },
    onSuccess: (data) => {
      setKonfirmasiWa(data.konfirmasi !== false);
      setLangkah("terkirim");
    },
    onError: (err) => {
      toast({
        title: "Gagal mengirim",
        description: getApiErrorMessage(err, "Coba lagi beberapa saat."),
        variant: "destructive",
      });
    },
  });

  const pilihSasaran = (s: SasaranRating) => {
    setSasaran(s);
    setNomorRt(null);
    setBintang(null);
    setIsi("");
    setLangkah("isi");
  };

  const kembali = () => {
    setLangkah("pilih");
    setSasaran(null);
    setNomorRt(null);
    setBintang(null);
    setIsi("");
    kirim.reset();
  };

  const bisaKirim =
    !!sasaran &&
    !!bintang &&
    (sasaran !== "rt" || nomorRt != null) &&
    isi.trim().length >= 5 &&
    nomorWa.replace(/\D/g, "").length >= 10 &&
    !kirim.isPending;

  const judul =
    langkah === "terkirim"
      ? "Masukan terkirim"
      : langkah === "isi" && sasaran
        ? SASARAN_RATING_INFO[sasaran].label
        : "Rating & masukan";

  return (
    <PublicKioskLayout title={judul} backHref="/" onBack={langkah === "pilih" ? undefined : kembali}>
      {langkah === "pilih" && (
        <div className="space-y-4">
          <FeatureExplain title="Rahasia · dihitung per bulan">
            Rating serta kritik/saran Anda hanya dibaca pengurus RW 03. Tidak ditampilkan publik.
            Nilai dihitung per bulan untuk penilaian kinerja, lalu ranking dimulai ulang tiap bulan baru.
          </FeatureExplain>

          <p className="text-caption text-muted-foreground">Nilai siapa?</p>
          <div className="space-y-2" role="list">
            {SASARAN_RATING.map((id) => {
              const info = SASARAN_RATING_INFO[id];
              return (
                <button
                  key={id}
                  type="button"
                  role="listitem"
                  onClick={() => pilihSasaran(id)}
                  className="w-full flex items-center justify-between gap-3 p-4 min-h-[var(--touch-min)] rounded-xl border bg-card text-left hover:bg-muted/50 transition-colors shadow-sm"
                  data-testid={`button-rating-${id}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{info.label}</p>
                    <p className="text-sm text-muted-foreground">{info.deskripsi}</p>
                  </div>
                  <Star className="w-5 h-5 text-brand-accent flex-shrink-0" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {langkah === "isi" && sasaran && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
            <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" aria-hidden />
            <div>
              <p className="font-semibold text-green-900">Masukan Anda dirahasiakan</p>
              <p className="text-sm text-green-900/80">
                Setelah dikirim, konfirmasi otomatis masuk ke WhatsApp Anda. Isi rating tidak
                dipajang ke publik.
              </p>
            </div>
          </div>

          {sasaran === "rt" && (
            <div className="space-y-2">
              <Label>Pilih RT</Label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {WILAYAH_RT_NUMBERS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={nomorRt === n}
                    onClick={() => setNomorRt(n)}
                    className={cn(
                      "min-h-12 rounded-xl border-2 text-base font-semibold transition-colors",
                      nomorRt === n
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-card hover:border-brand/40",
                    )}
                  >
                    RT {String(n).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Rating bintang</Label>
            <div className="flex items-center justify-center gap-1 rounded-2xl border bg-card p-4 shadow-sm">
              {BINTANG_RATING.map((n) => {
                const aktif = (hover ?? bintang ?? 0) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} bintang — ${BINTANG_RATING_LABEL[n]}`}
                    aria-pressed={bintang === n}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(n)}
                    onBlur={() => setHover(null)}
                    onClick={() => setBintang(n)}
                    className="p-1.5 touch-target"
                  >
                    <Star
                      className={cn(
                        "h-9 w-9 transition-colors",
                        aktif ? "fill-[hsl(40,70%,52%)] text-[hsl(40,70%,52%)]" : "text-muted-foreground/40",
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
            {bintang && (
              <p className="text-center text-sm font-medium text-brand">
                {bintang} — {BINTANG_RATING_LABEL[bintang]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="isi-rating">Kritik, saran, atau masukan</Label>
            <Textarea
              id="isi-rating"
              value={isi}
              onChange={(e) => setIsi(e.target.value.slice(0, MAKS_ISI_RATING))}
              placeholder="Ceritakan pengalaman atau usulan perbaikan Anda…"
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {isi.trim().length}/{MAKS_ISI_RATING}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-rating">Nomor WhatsApp Anda</Label>
            <Input
              id="wa-rating"
              inputMode="tel"
              value={nomorWa}
              onChange={(e) => setNomorWa(e.target.value)}
              placeholder="08xxxxxxxxxx"
              autoComplete="tel"
            />
            <p className="text-xs text-muted-foreground">
              Dipakai untuk mengirim konfirmasi bahwa masukan sudah diterima.
            </p>
          </div>

          {/* honeypot */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

          <Button
            type="button"
            className="w-full touch-target gap-2"
            disabled={!bisaKirim}
            onClick={() => kirim.mutate()}
          >
            {kirim.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                Mengirim…
              </>
            ) : (
              "Kirim rating & masukan"
            )}
          </Button>

          <button
            type="button"
            onClick={kembali}
            className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Pilih sasaran lain
          </button>
        </div>
      )}

      {langkah === "terkirim" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-9 w-9" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-brand">Terima kasih</h2>
            <p className="text-sm text-muted-foreground">
              Rating dan masukan Anda sudah kami terima secara rahasia.
              {konfirmasiWa
                ? ` Konfirmasi juga dikirim ke WhatsApp ${nomorWa.trim()}.`
                : " Konfirmasi WhatsApp mungkin tertunda; masukan Anda tetap tersimpan."}
            </p>
          </div>
          <Button type="button" variant="outline" className="w-full touch-target" onClick={kembali}>
            Kirim masukan lain
          </Button>
        </div>
      )}
    </PublicKioskLayout>
  );
}
