import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  Shield,
  Siren,
} from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  KEPERLUAN_KONTAK,
  KEPERLUAN_KONTAK_INFO,
  NOMOR_DARURAT,
  type KeperluanKontak,
} from "@shared/kontak-person";

type Langkah = "pilih" | "isi" | "terkirim" | "darurat";

function telHref(nomor: string): string {
  const d = nomor.replace(/\D/g, "");
  return `tel:${d}`;
}

function tampilNomor(nomor: string): string {
  const d = nomor.replace(/\D/g, "");
  if (d.length <= 4) return d;
  if (d.startsWith("0") && d.length >= 10) {
    return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
  }
  if (d.startsWith("022") && d.length > 6) {
    return `${d.slice(0, 3)}-${d.slice(3)}`;
  }
  return nomor;
}

export default function PublicPelayanan() {
  const { toast } = useToast();
  const [langkah, setLangkah] = useState<Langkah>("pilih");
  const [keperluan, setKeperluan] = useState<KeperluanKontak | null>(null);
  const [nama, setNama] = useState("");
  const [nomorWa, setNomorWa] = useState("");

  const kirim = useMutation({
    mutationFn: async () => {
      if (!keperluan || keperluan === "darurat") throw new Error("Keperluan tidak valid");
      await apiRequest("POST", "/api/public/kontak-person", {
        nama: nama.trim(),
        nomorWa: nomorWa.trim(),
        keperluan,
      });
    },
    onSuccess: () => setLangkah("terkirim"),
    onError: (err) => {
      toast({
        title: "Gagal mengirim",
        description: getApiErrorMessage(err, "Coba lagi beberapa saat."),
        variant: "destructive",
      });
    },
  });

  const pilih = (k: KeperluanKontak) => {
    setKeperluan(k);
    if (KEPERLUAN_KONTAK_INFO[k].mode === "langsung") {
      setLangkah("darurat");
      return;
    }
    setLangkah("isi");
  };

  const kembali = () => {
    setLangkah("pilih");
    setKeperluan(null);
    kirim.reset();
  };

  const bisaKirim =
    nama.trim().length >= 2 &&
    nomorWa.replace(/\D/g, "").length >= 10 &&
    !!keperluan &&
    keperluan !== "darurat" &&
    !kirim.isPending;

  const judul =
    langkah === "darurat"
      ? "Nomor darurat"
      : langkah === "terkirim"
        ? "Kontak terkirim"
        : langkah === "isi" && keperluan
          ? KEPERLUAN_KONTAK_INFO[keperluan].label
          : "Kontak person";

  return (
    <PublicKioskLayout
      title={judul}
      backHref="/"
      onBack={langkah === "pilih" ? undefined : kembali}
    >
      {langkah === "pilih" && (
        <div className="space-y-4">
          <FeatureExplain title="Privasi nomor pengurus">
            Nomor pengurus tidak ditampilkan di situs. Isi nama dan WhatsApp Anda, lalu kami
            kirim kontak yang sesuai ke WhatsApp Anda.
          </FeatureExplain>

          <p className="text-caption text-muted-foreground">Pilih keperluan Anda</p>
          <div className="space-y-2" role="list">
            {KEPERLUAN_KONTAK.map((id) => {
              const info = KEPERLUAN_KONTAK_INFO[id];
              const Darurat = id === "darurat";
              return (
                <button
                  key={id}
                  type="button"
                  role="listitem"
                  onClick={() => pilih(id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-4 min-h-[var(--touch-min)] rounded-xl border text-left transition-colors shadow-sm",
                    Darurat
                      ? "border-red-200 bg-red-50 hover:bg-red-100/70"
                      : "bg-card hover:bg-muted/50",
                  )}
                  data-testid={`button-keperluan-${id}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        Darurat ? "bg-red-100 text-red-700" : "bg-brand/10 text-brand",
                      )}
                    >
                      {Darurat ? (
                        <Siren className="w-5 h-5" aria-hidden />
                      ) : (
                        <Phone className="w-5 h-5" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("font-semibold", Darurat && "text-red-900")}>{info.label}</p>
                      <p className={cn("text-sm", Darurat ? "text-red-800/80" : "text-muted-foreground")}>
                        {info.deskripsi}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={cn("w-5 h-5 flex-shrink-0", Darurat ? "text-red-400" : "text-muted-foreground")}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {langkah === "isi" && keperluan && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
            <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" aria-hidden />
            <div>
              <p className="font-semibold text-green-900">Nomor pengurus dikirim ke WhatsApp Anda</p>
              <p className="text-sm text-green-900/80">
                Keperluan: {KEPERLUAN_KONTAK_INFO[keperluan].label}. Nomor pengurus tidak dipajang di
                situs agar privasi terjaga.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="nama-kontak">Nama Anda</Label>
              <Input
                id="nama-kontak"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                autoComplete="name"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-kontak">Nomor WhatsApp Anda</Label>
              <Input
                id="wa-kontak"
                inputMode="tel"
                value={nomorWa}
                onChange={(e) => setNomorWa(e.target.value)}
                placeholder="08xxxxxxxxxx"
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground">
                Kontak pengurus akan dikirim ke nomor ini lewat WhatsApp.
              </p>
            </div>
          </div>

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
              "Kirim kontak ke WhatsApp saya"
            )}
          </Button>

          <button
            type="button"
            onClick={kembali}
            className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Pilih keperluan lain
          </button>
        </div>
      )}

      {langkah === "terkirim" && keperluan && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-9 w-9" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-brand">Cek WhatsApp Anda</h2>
            <p className="text-sm text-muted-foreground">
              Kontak untuk <strong>{KEPERLUAN_KONTAK_INFO[keperluan].label}</strong> sudah dikirim ke{" "}
              <strong>{nomorWa.trim()}</strong>.
            </p>
          </div>
          <Button type="button" variant="outline" className="w-full touch-target" onClick={kembali}>
            Minta kontak lain
          </Button>
        </div>
      )}

      {langkah === "darurat" && (
        <div className="space-y-4">
          <FeatureExplain title="Segera hubungi nomor resmi" variant="tip">
            Untuk keadaan darurat, hubungi langsung nomor di bawah. Jangan menunggu pengurus RW jika
            nyawa atau keamanan sedang terancam.
          </FeatureExplain>

          <div className="space-y-2" role="list">
            {NOMOR_DARURAT.map((item) => (
              <a
                key={item.nomor + item.nama}
                href={telHref(item.nomor)}
                role="listitem"
                className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 transition-colors hover:bg-red-100/70"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-red-950">{item.nama}</p>
                  {item.catatan && (
                    <p className="text-xs text-red-900/70">{item.catatan}</p>
                  )}
                </div>
                <span className="flex items-center gap-1.5 font-mono text-base font-bold text-red-800 tabular-nums">
                  <Phone className="h-4 w-4" aria-hidden />
                  {tampilNomor(item.nomor)}
                </span>
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={kembali}
            className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Kembali
          </button>
        </div>
      )}
    </PublicKioskLayout>
  );
}
