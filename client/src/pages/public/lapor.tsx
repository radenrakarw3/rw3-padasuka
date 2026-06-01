import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage } from "@/lib/queryClient";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { FormStepper } from "@/components/gov/form-stepper";
import { SuccessPanel } from "@/components/gov/success-panel";

const STEPS = [
  { id: "kontak", label: "Kontak" },
  { id: "detail", label: "Detail" },
];

const jenisLaporanOptions = [
  { value: "keamanan", label: "Keamanan" },
  { value: "kebersihan", label: "Kebersihan" },
  { value: "infrastruktur", label: "Infrastruktur" },
  { value: "ketertiban", label: "Ketertiban" },
  { value: "umum", label: "Umum" },
  { value: "lainnya", label: "Lainnya" },
];

export default function PublicLapor() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [nomorWa, setNomorWa] = useState("");
  const [jenisLaporan, setJenisLaporan] = useState("");
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [waError, setWaError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/laporan", {
        nomorWa,
        jenisLaporan,
        judul,
        isi,
      });
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: (error: unknown) => {
      toast({ title: "Gagal mengirim", description: getApiErrorMessage(error), variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <PublicKioskLayout title="Laporan masalah" backHref="/">
        <SuccessPanel
          title="Laporan terkirim"
          nextSteps={[
            "Pengurus RW akan meninjau laporan Anda.",
            "Anda dapat dihubungi melalui WhatsApp jika diperlukan klarifikasi.",
            "Simpan nomor ini jika ingin menanyakan status.",
          ]}
          primaryAction={{ label: "Kembali ke beranda", href: "/" }}
        />
      </PublicKioskLayout>
    );
  }

  const goNext = () => {
    const wa = nomorWa.replace(/\D/g, "");
    if (wa.length < 9) {
      setWaError("Nomor WhatsApp minimal 9 digit");
      return;
    }
    setWaError("");
    if (!jenisLaporan) {
      toast({ title: "Pilih jenis laporan", variant: "destructive" });
      return;
    }
    setStep(1);
  };

  return (
    <PublicKioskLayout title="Laporan masalah" backHref="/">
      <p className="prose-gov mb-4">
        Setelah dikirim, pengurus RW akan meninjau laporan dan dapat menghubungi Anda via WhatsApp.
      </p>

      <FormStepper steps={STEPS} currentStep={step} />

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 0) {
            goNext();
            return;
          }
          if (!judul.trim() || !isi.trim()) {
            toast({ title: "Lengkapi judul dan detail laporan", variant: "destructive" });
            return;
          }
          mutation.mutate();
        }}
      >
        {step === 0 && (
          <fieldset className="space-y-4 border-0 p-0 m-0">
            <legend className="sr-only">Kontak dan kategori</legend>
            <div className="space-y-2">
              <Label htmlFor="nomor-wa">Nomor WhatsApp</Label>
              <Input
                id="nomor-wa"
                type="tel"
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
                value={nomorWa}
                onChange={(e) => {
                  setNomorWa(e.target.value);
                  setWaError("");
                }}
                aria-invalid={!!waError}
                aria-describedby={waError ? "wa-error" : undefined}
                data-testid="input-nomor-wa-laporan"
              />
              {waError && (
                <p id="wa-error" className="text-sm text-destructive" role="alert">
                  {waError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Jenis laporan</Label>
              <Select value={jenisLaporan} onValueChange={setJenisLaporan}>
                <SelectTrigger data-testid="select-jenis-laporan">
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  {jenisLaporanOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-4 border-0 p-0 m-0">
            <legend className="sr-only">Detail laporan</legend>
            <div className="space-y-2">
              <Label htmlFor="judul">Judul</Label>
              <Input
                id="judul"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                data-testid="input-judul-laporan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isi">Detail laporan</Label>
              <Textarea
                id="isi"
                rows={5}
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                data-testid="input-isi-laporan"
              />
            </div>
          </fieldset>
        )}

        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline" className="touch-target flex-1" onClick={() => setStep(0)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Kembali
            </Button>
          )}
          <Button
            type="submit"
            className="touch-target flex-1"
            disabled={mutation.isPending}
            data-testid="button-kirim-laporan"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step === 0 ? (
              <>
                Lanjut
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              "Kirim laporan"
            )}
          </Button>
        </div>
      </form>
    </PublicKioskLayout>
  );
}
