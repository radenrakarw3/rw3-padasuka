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
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { formatLaporanRef, subJenisInfrastrukturOptions } from "@shared/program-kerja";

const STEPS = [
  { id: "kontak", label: "Identitas" },
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
  const [namaPelapor, setNamaPelapor] = useState("");
  const [nomorRt, setNomorRt] = useState("");
  const [nomorWa, setNomorWa] = useState("");
  const [jenisLaporan, setJenisLaporan] = useState("");
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [subJenis, setSubJenis] = useState("");
  const [fotoLaporan, setFotoLaporan] = useState("");
  const [waError, setWaError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/laporan", {
        namaPelapor: namaPelapor.trim(),
        nomorRt: parseInt(nomorRt, 10),
        nomorWa,
        jenisLaporan,
        subJenis: jenisLaporan === "infrastruktur" && subJenis ? subJenis : undefined,
        fotoLaporan: fotoLaporan || undefined,
        judul,
        isi,
      });
      return res.json() as Promise<{ id: number; nomorReferensi?: string }>;
    },
    onSuccess: (data) => {
      setReferenceId(data.nomorReferensi ?? formatLaporanRef(data.id));
      setSubmitted(true);
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal mengirim", description: getApiErrorMessage(error), variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <PublicKioskLayout title="Laporan masalah" backHref="/">
        <SuccessPanel
          title="Laporan terkirim"
          referenceLabel="Nomor referensi"
          referenceValue={referenceId}
          nextSteps={[
            "Pengurus RW akan meninjau laporan Anda.",
            "Anda dapat dihubungi melalui WhatsApp jika diperlukan klarifikasi.",
            "Gunakan nomor referensi untuk cek status laporan.",
          ]}
          primaryAction={{ label: "Cek status laporan", href: "/lapor/status" }}
          secondaryAction={{ label: "Kembali ke beranda", href: "/" }}
        />
      </PublicKioskLayout>
    );
  }

  const goNext = () => {
    if (namaPelapor.trim().length < 2) {
      toast({ title: "Nama pelapor wajib diisi", variant: "destructive" });
      return;
    }
    if (!nomorRt) {
      toast({ title: "Pilih RT lokasi masalah", variant: "destructive" });
      return;
    }
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
            <legend className="sr-only">Identitas pelapor</legend>
            <div className="space-y-2">
              <Label htmlFor="nama-pelapor">Nama pelapor</Label>
              <Input
                id="nama-pelapor"
                placeholder="Nama lengkap"
                value={namaPelapor}
                onChange={(e) => setNamaPelapor(e.target.value)}
                data-testid="input-nama-pelapor-laporan"
              />
            </div>
            <div className="space-y-2">
              <Label>RT lokasi masalah</Label>
              <Select value={nomorRt} onValueChange={setNomorRt}>
                <SelectTrigger data-testid="select-rt-laporan">
                  <SelectValue placeholder="Pilih RT" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVE_RT_NUMBERS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      RT {String(n).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Select value={jenisLaporan} onValueChange={(v) => { setJenisLaporan(v); if (v !== "infrastruktur") setSubJenis(""); }}>
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
            {jenisLaporan === "infrastruktur" && (
              <div className="space-y-2">
                <Label>Sub-jenis infrastruktur</Label>
                <Select value={subJenis} onValueChange={setSubJenis}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sub-jenis (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {subJenisInfrastrukturOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Laporan drainase/genangan mendukung program Wilayah Bebas Banjir.
                </p>
              </div>
            )}
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-4 border-0 p-0 m-0">
            <legend className="sr-only">Detail laporan</legend>
            <div className="space-y-2">
              <Label htmlFor="foto">Foto (opsional)</Label>
              <Input
                id="foto"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) { setFotoLaporan(""); return; }
                  const reader = new FileReader();
                  reader.onload = () => setFotoLaporan(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </div>
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
