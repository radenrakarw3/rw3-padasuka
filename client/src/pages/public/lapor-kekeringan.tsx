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

const STEPS = [
  { id: "kontak", label: "Identitas" },
  { id: "rumah", label: "Kondisi rumah" },
];

export default function PublicLaporKekeringan() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [namaPelapor, setNamaPelapor] = useState("");
  const [nomorRt, setNomorRt] = useState("");
  const [nomorWa, setNomorWa] = useState("");
  const [alamat, setAlamat] = useState("");
  const [jumlahPenghuni, setJumlahPenghuni] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nomorAntrian, setNomorAntrian] = useState("");
  const [waError, setWaError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/laporan-kekeringan", {
        namaPelapor: namaPelapor.trim(),
        nomorRt: parseInt(nomorRt, 10),
        nomorWa,
        alamat: alamat.trim(),
        jumlahPenghuni: parseInt(jumlahPenghuni, 10),
        keterangan: keterangan.trim() || undefined,
      });
      return res.json() as Promise<{ nomorAntrian: string }>;
    },
    onSuccess: (data) => {
      setNomorAntrian(data.nomorAntrian);
      setSubmitted(true);
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal mengirim", description: getApiErrorMessage(error), variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <PublicKioskLayout title="Laporan kekeringan air" backHref="/lapor">
        <SuccessPanel
          title="Terdaftar dalam antrian"
          referenceLabel="Nomor antrian"
          referenceValue={nomorAntrian}
          nextSteps={[
            "Laporan Anda masuk antrian bantuan air RW 03.",
            "Petugas RW akan melakukan survey ke rumah Anda untuk verifikasi kondisi.",
            "Tiket distribusi air (TKT-KRG-...) akan dikeluarkan setelah survey selesai.",
            "Simpan nomor antrian untuk cek status.",
          ]}
          primaryAction={{ label: "Cek status antrian", href: "/lapor/kekeringan/status" }}
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
      toast({ title: "Pilih RT lokasi rumah", variant: "destructive" });
      return;
    }
    const wa = nomorWa.replace(/\D/g, "");
    if (wa.length < 9) {
      setWaError("Nomor WhatsApp minimal 9 digit");
      return;
    }
    setWaError("");
    setStep(1);
  };

  return (
    <PublicKioskLayout title="Laporan kekeringan air" backHref="/lapor">
      <p className="prose-gov mb-4">
        Laporkan kekurangan air di rumah Anda. Antrian diprioritaskan berdasarkan jumlah penghuni keluarga.
        Tiket bantuan air dikeluarkan setelah petugas RW melakukan survey ke rumah.
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
          if (alamat.trim().length < 5) {
            toast({ title: "Alamat rumah wajib diisi", variant: "destructive" });
            return;
          }
          const jumlah = parseInt(jumlahPenghuni, 10);
          if (!jumlah || jumlah < 1) {
            toast({ title: "Isi jumlah orang di rumah", variant: "destructive" });
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
                data-testid="input-nama-pelapor-kekeringan"
              />
            </div>
            <div className="space-y-2">
              <Label>RT lokasi rumah</Label>
              <Select value={nomorRt} onValueChange={setNomorRt}>
                <SelectTrigger data-testid="select-rt-kekeringan">
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
                data-testid="input-nomor-wa-kekeringan"
              />
              {waError && (
                <p className="text-sm text-destructive" role="alert">
                  {waError}
                </p>
              )}
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-4 border-0 p-0 m-0">
            <legend className="sr-only">Kondisi rumah</legend>
            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat rumah</Label>
              <Input
                id="alamat"
                placeholder="Contoh: Jl. Padasuka No. 12, dekat masjid"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                data-testid="input-alamat-kekeringan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jumlah-penghuni">Berapa orang di rumah?</Label>
              <Input
                id="jumlah-penghuni"
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                placeholder="Jumlah penghuni saat ini"
                value={jumlahPenghuni}
                onChange={(e) => setJumlahPenghuni(e.target.value)}
                data-testid="input-jumlah-penghuni-kekeringan"
              />
              <p className="text-xs text-muted-foreground">
                Termasuk anak, lansia, dan semua anggota keluarga yang tinggal di rumah yang sama.
                Semakin banyak penghuni, semakin tinggi prioritas antrian.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan tambahan (opsional)</Label>
              <Textarea
                id="keterangan"
                rows={4}
                placeholder="Contoh: air PDAM mati sejak 3 hari, sumur kering..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                data-testid="input-keterangan-kekeringan"
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
            data-testid="button-kirim-kekeringan"
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
