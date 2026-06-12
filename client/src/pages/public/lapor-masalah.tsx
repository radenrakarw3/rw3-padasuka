import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, ChevronRight, ChevronLeft, User, EyeOff, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FormStepper } from "@/components/gov/form-stepper";
import { SuccessPanel } from "@/components/gov/success-panel";
import { StatusBadge } from "@/components/gov/status-badge";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { formatLaporanRef, subJenisInfrastrukturOptions } from "@shared/program-kerja";
import {
  LAPORAN_MASALAH_JENIS_OPTIONS,
  type LaporanMode,
  publicLaporanSchema,
} from "@shared/laporan-public-form";

type RtData = {
  nomorRt: number;
  namaKetua: string;
  nomorWhatsapp: string | null;
  tersedia: boolean;
};

const STEPS_IDENTITAS = [
  { id: "kontak", label: "Identitas" },
  { id: "detail", label: "Detail" },
];

const STEPS_ANONIM = [{ id: "laporan", label: "Laporan" }];

export default function PublicLaporMasalah() {
  const { toast } = useToast();
  const [mode, setMode] = useState<LaporanMode>("identitas");
  const [step, setStep] = useState(0);
  const [namaPelapor, setNamaPelapor] = useState("");
  const [nomorRt, setNomorRt] = useState<number | null>(null);
  const [nomorWa, setNomorWa] = useState("");
  const [jenisLaporan, setJenisLaporan] = useState("");
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedAnonim, setSubmittedAnonim] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [subJenis, setSubJenis] = useState("");
  const [fotoLaporan, setFotoLaporan] = useState("");

  const { data: rtList = [], isLoading: rtLoading } = useQuery<RtData[]>({
    queryKey: ["/api/public/rt-pelayanan"],
    queryFn: async () => {
      const res = await fetch("/api/public/rt-pelayanan");
      if (!res.ok) throw new Error("Gagal memuat data RT");
      const list = await readJsonSafely<RtData[]>(res);
      return list.filter((rt) =>
        (ACTIVE_RT_NUMBERS as readonly number[]).includes(rt.nomorRt),
      );
    },
  });

  const steps = mode === "anonim" ? STEPS_ANONIM : STEPS_IDENTITAS;
  const selectedRt = nomorRt != null ? rtList.find((r) => r.nomorRt === nomorRt) : null;

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        mode,
        nomorRt: nomorRt!,
        jenisLaporan,
        subJenis:
          mode === "identitas" && jenisLaporan === "infrastruktur" && subJenis
            ? subJenis
            : undefined,
        fotoLaporan: mode === "identitas" && fotoLaporan ? fotoLaporan : undefined,
        judul: mode === "identitas" ? judul.trim() : undefined,
        isi: isi.trim(),
        namaPelapor: mode === "identitas" ? namaPelapor.trim() : undefined,
        nomorWa: mode === "identitas" ? nomorWa : undefined,
      };
      const res = await apiRequest("POST", "/api/public/laporan", body);
      return res.json() as Promise<{ id: number; nomorReferensi?: string }>;
    },
    onSuccess: (data) => {
      setReferenceId(data.nomorReferensi ?? formatLaporanRef(data.id));
      setSubmittedAnonim(mode === "anonim");
      setSubmitted(true);
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal mengirim", description: getApiErrorMessage(error), variant: "destructive" });
    },
  });

  const switchMode = (next: LaporanMode) => {
    setMode(next);
    setStep(0);
    if (next === "anonim") {
      setNamaPelapor("");
      setNomorWa("");
      setJudul("");
      setSubJenis("");
      setFotoLaporan("");
    }
  };

  const validateStep = (): boolean => {
    if (nomorRt == null) {
      toast({ title: "Pilih ketua RT wilayah masalah", variant: "destructive" });
      return false;
    }
    if (!jenisLaporan) {
      toast({ title: "Pilih jenis laporan", variant: "destructive" });
      return false;
    }

    if (mode === "anonim") {
      if (isi.trim().length < 10) {
        toast({ title: "Detail laporan minimal 10 karakter", variant: "destructive" });
        return false;
      }
      return true;
    }

    if (step === 0) {
      if (namaPelapor.trim().length < 2) {
        toast({ title: "Nama pelapor wajib diisi", variant: "destructive" });
        return false;
      }
      const wa = nomorWa.replace(/\D/g, "");
      if (wa.length < 9) {
        toast({ title: "Nomor WhatsApp tidak valid", variant: "destructive" });
        return false;
      }
      if (jenisLaporan === "infrastruktur" && !subJenis) {
        toast({ title: "Sub-jenis infrastruktur wajib dipilih", variant: "destructive" });
        return false;
      }
      return true;
    }

    const parsed = publicLaporanSchema.safeParse({
      mode,
      nomorRt,
      jenisLaporan,
      subJenis: jenisLaporan === "infrastruktur" ? subJenis : undefined,
      fotoLaporan: fotoLaporan || undefined,
      judul: judul.trim(),
      isi: isi.trim(),
      namaPelapor: namaPelapor.trim(),
      nomorWa,
    });
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Lengkapi semua field wajib";
      toast({ title: msg, variant: "destructive" });
      return false;
    }
    return true;
  };

  if (submitted) {
    return (
      <PublicKioskLayout title="Laporan masalah" backHref="/lapor">
        <SuccessPanel
          title="Laporan terkirim"
          referenceLabel="Nomor referensi"
          referenceValue={referenceId}
          nextSteps={
            submittedAnonim
              ? [
                  "Ketua RT wilayah Anda telah diberitahu via WhatsApp.",
                  "Identitas Anda tidak disimpan — laporan bersifat anonim.",
                  "Gunakan nomor referensi untuk cek status laporan.",
                ]
              : [
                  "Ketua RT dan Anda akan mendapat konfirmasi via WhatsApp.",
                  "Pengurus RW akan meninjau laporan Anda.",
                  "Gunakan nomor referensi untuk cek status laporan.",
                ]
          }
          primaryAction={{ label: "Cek status laporan", href: "/lapor/status" }}
          secondaryAction={{ label: "Kembali ke beranda", href: "/" }}
        />
      </PublicKioskLayout>
    );
  }

  const rtPicker = (
    <div className="space-y-2">
      <Label>Ketua RT wilayah masalah</Label>
      <p className="text-xs text-muted-foreground">
        Pilih RT tempat masalah terjadi. Ketua RT terkait akan otomatis diberitahu lewat WhatsApp.
      </p>
      {rtLoading ? (
        <div className="flex justify-center py-6" role="status" aria-label="Memuat RT">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2" role="list">
          {rtList.map((item) => {
            const selected = nomorRt === item.nomorRt;
            return (
              <button
                key={item.nomorRt}
                type="button"
                onClick={() => setNomorRt(item.nomorRt)}
                className={`w-full flex items-center justify-between gap-3 p-4 min-h-[var(--touch-min)] rounded-xl border text-left transition-colors shadow-sm ${
                  selected
                    ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                    : "bg-card hover:bg-muted/50"
                }`}
                data-testid={`button-rt-laporan-${item.nomorRt}`}
                role="listitem"
                aria-pressed={selected}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">RT {String(item.nomorRt).padStart(2, "0")}</p>
                    <StatusBadge
                      variant={item.tersedia ? "ready" : "unavailable"}
                      className="scale-90 origin-left"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5" aria-hidden />
                    {item.namaKetua}
                  </p>
                </div>
                {selected && (
                  <span className="text-xs font-medium text-brand shrink-0">Dipilih</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {selectedRt && !selectedRt.tersedia && (
        <p className="text-sm text-amber-700" role="alert">
          WA Ketua RT belum tersedia di sistem, tetapi laporan tetap tersimpan dan dapat ditinjau
          pengurus RW.
        </p>
      )}
    </div>
  );

  const jenisPicker = (
    <div className="space-y-2">
      <Label>Jenis laporan</Label>
      <Select
        value={jenisLaporan}
        onValueChange={(v) => {
          setJenisLaporan(v);
          if (v !== "infrastruktur") setSubJenis("");
        }}
      >
        <SelectTrigger data-testid="select-jenis-laporan">
          <SelectValue placeholder="Pilih jenis" />
        </SelectTrigger>
        <SelectContent>
          {LAPORAN_MASALAH_JENIS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PublicKioskLayout title="Laporan masalah" backHref="/lapor">
      <FeatureExplain title="Cara kerja laporan ini" className="mb-4">
        <p>
          Laporkan masalah di lingkungan RW Anda. Anda bisa <strong>anonim</strong> (hanya jenis dan
          detail masalah) atau <strong>memberi identitas</strong> agar pengurus dapat menghubungi Anda.
        </p>
        <p>
          Setelah terkirim, <strong>Ketua RT wilayah yang dipilih</strong> otomatis mendapat notifikasi
          WhatsApp.
        </p>
      </FeatureExplain>

      <FormStepper steps={steps} currentStep={step} />

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!validateStep()) return;

          if (mode === "anonim") {
            mutation.mutate();
            return;
          }

          if (step === 0) {
            setStep(1);
            return;
          }
          mutation.mutate();
        }}
      >
        <fieldset className="space-y-3 border-0 p-0 m-0">
          <legend className="text-sm font-medium">Mode pelaporan</legend>
          <RadioGroup
            value={mode}
            onValueChange={(v) => switchMode(v as LaporanMode)}
            className="grid gap-2 sm:grid-cols-2"
          >
            <label
              htmlFor="mode-identitas"
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                mode === "identitas" ? "border-brand bg-brand/5 ring-1 ring-brand/30" : "bg-card"
              }`}
            >
              <RadioGroupItem value="identitas" id="mode-identitas" className="mt-0.5" />
              <div>
                <span className="font-medium flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" aria-hidden />
                  Beri identitas
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Semua field wajib diisi. Anda mendapat konfirmasi WA.
                </p>
              </div>
            </label>
            <label
              htmlFor="mode-anonim"
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                mode === "anonim" ? "border-brand bg-brand/5 ring-1 ring-brand/30" : "bg-card"
              }`}
            >
              <RadioGroupItem value="anonim" id="mode-anonim" className="mt-0.5" />
              <div>
                <span className="font-medium flex items-center gap-1.5">
                  <EyeOff className="w-4 h-4" aria-hidden />
                  Anonim
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Hanya pilih RT, jenis laporan, dan isi masalah.
                </p>
              </div>
            </label>
          </RadioGroup>
        </fieldset>

        {mode === "anonim" && (
          <fieldset className="space-y-4 border-0 p-0 m-0">
            <legend className="sr-only">Laporan anonim</legend>
            {rtPicker}
            {jenisPicker}
            <div className="space-y-2">
              <Label htmlFor="isi-anonim">Detail laporan</Label>
              <Textarea
                id="isi-anonim"
                rows={5}
                placeholder="Jelaskan masalah yang terjadi di lingkungan..."
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                data-testid="input-isi-laporan"
              />
            </div>
          </fieldset>
        )}

        {mode === "identitas" && step === 0 && (
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
            {rtPicker}
            <div className="space-y-2">
              <Label htmlFor="nomor-wa">Nomor WhatsApp</Label>
              <Input
                id="nomor-wa"
                type="tel"
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
                value={nomorWa}
                onChange={(e) => setNomorWa(e.target.value)}
                data-testid="input-nomor-wa-laporan"
              />
            </div>
            {jenisPicker}
            {jenisLaporan === "infrastruktur" && (
              <div className="space-y-2">
                <Label>Sub-jenis infrastruktur</Label>
                <Select value={subJenis} onValueChange={setSubJenis}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sub-jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    {subJenisInfrastrukturOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </fieldset>
        )}

        {mode === "identitas" && step === 1 && (
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
                  if (!file) {
                    setFotoLaporan("");
                    return;
                  }
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
                placeholder="Ringkasan singkat masalah"
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
                data-testid="input-isi-laporan-identitas"
              />
            </div>
          </fieldset>
        )}

        <div className="flex gap-2 pt-2">
          {mode === "identitas" && step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="touch-target flex-1"
              onClick={() => setStep(0)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Kembali
            </Button>
          )}
          <Button
            type="submit"
            className="touch-target flex-1"
            disabled={mutation.isPending || rtLoading}
            data-testid="button-kirim-laporan"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "anonim" || step === 1 ? (
              "Kirim laporan"
            ) : (
              <>
                Lanjut
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </form>
    </PublicKioskLayout>
  );
}
