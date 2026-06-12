import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { rtOptions, jenisPropertiOptions } from "@/lib/constants";
import { Loader2, ChevronRight, ChevronLeft, Plus, Minus, Home, Store, BookOpen } from "lucide-react";
import { SuccessPanel } from "@/components/gov/success-panel";
import { Visitrw3SyaratPanel } from "@/components/gov/visitrw3-syarat-panel";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { FormStepper } from "@/components/gov/form-stepper";
import { settingsRowsToMap } from "@/lib/visitrw3-kontribusi";
import {
  izinDefaultFromJenis,
  kegunaanPropertiLabel,
  validatePropertiStep,
  type PropertiDraft,
} from "@/lib/visitrw3-validate-properti";

const STEPS = [
  { id: "jenis", label: "Jenis" },
  { id: "nama", label: "Nama" },
  { id: "lokasi", label: "Lokasi" },
  { id: "unit", label: "Unit" },
  { id: "pemilik", label: "Pemilik" },
  { id: "pengelola", label: "Pengelola" },
  { id: "syarat", label: "Syarat" },
  { id: "kirim", label: "Kirim" },
] as const;

const JENIS_HINTS: Record<string, string> = {
  kost: "Tempat tinggal penyewa kamar",
  kontrakan: "Rumah atau ruko disewakan",
  kiosk: "Toko kecil / warung tetap",
  lapak: "Jualan di lapak / gerobak",
};

function MicroStepHeader({
  current,
  total,
  title,
  hint,
}: {
  current: number;
  total: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-brand/5 border border-brand/20 p-3 space-y-1">
      <p className="text-xs text-muted-foreground">
        Langkah {current} dari {total}
      </p>
      <p className="font-semibold text-sm">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function Visitrw3DaftarProperti() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [namaKost, setNamaKost] = useState("");
  const [namaPemilik, setNamaPemilik] = useState("");
  const [nomorWaPemilik, setNomorWaPemilik] = useState("");
  const [namaPenanggungJawab, setNamaPenanggungJawab] = useState("");
  const [nomorWaPenanggungJawab, setNomorWaPenanggungJawab] = useState("");
  const [pjSamaPemilik, setPjSamaPemilik] = useState(true);
  const [rt, setRt] = useState("");
  const [alamatLengkap, setAlamatLengkap] = useState("");
  const [jumlahPintu, setJumlahPintu] = useState(1);
  const [jenisProperti, setJenisProperti] = useState<PropertiDraft["jenisProperti"]>("");
  const [izinTinggal, setIzinTinggal] = useState(true);
  const [izinBisnis, setIzinBisnis] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [setujuTataTertib, setSetujuTataTertib] = useState(false);
  const [nomorHasil, setNomorHasil] = useState<string | null>(null);

  const stepId = STEPS[step]?.id ?? "jenis";

  const draft = useMemo<PropertiDraft>(
    () => ({
      jenisProperti,
      namaKost,
      rt,
      alamatLengkap,
      jumlahPintu,
      namaPemilik,
      nomorWaPemilik,
      pjSamaPemilik,
      namaPenanggungJawab,
      nomorWaPenanggungJawab,
      izinTinggal,
      izinBisnis,
      setujuTataTertib,
    }),
    [
      jenisProperti,
      namaKost,
      rt,
      alamatLengkap,
      jumlahPintu,
      namaPemilik,
      nomorWaPemilik,
      pjSamaPemilik,
      namaPenanggungJawab,
      nomorWaPenanggungJawab,
      izinTinggal,
      izinBisnis,
      setujuTataTertib,
    ],
  );

  const { data: settingsRows = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/public/visitrw3/settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/visitrw3/settings");
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return readJsonSafely<{ key: string; value: string; updatedAt?: string }[]>(res);
    },
  });

  const settingsMap = useMemo(() => settingsRowsToMap(settingsRows), [settingsRows]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/visitrw3/daftar-properti", {
        namaKost: namaKost.trim(),
        namaPemilik: namaPemilik.trim(),
        nomorWaPemilik: nomorWaPemilik.trim(),
        namaPenanggungJawab: pjSamaPemilik ? namaPemilik.trim() : namaPenanggungJawab.trim(),
        nomorWaPenanggungJawab: pjSamaPemilik ? nomorWaPemilik.trim() : nomorWaPenanggungJawab.trim(),
        rt: parseInt(rt, 10),
        alamatLengkap: alamatLengkap.trim(),
        jumlahPintu,
        jenisProperti,
        izinTinggal,
        izinBisnis,
        catatanPemohon: catatan.trim() || null,
        setujuTataTertib: true as const,
      });
      return res.json();
    },
    onSuccess: (data) => setNomorHasil(data.nomorPendaftaran),
    onError: (e: unknown) => {
      toast({ title: "Gagal mengirim", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  const showErr = (msg: string) => {
    toast({ title: "Lengkapi data", description: msg, variant: "destructive" });
  };

  function pickJenis(value: PropertiDraft["jenisProperti"]) {
    if (!value) return;
    setJenisProperti(value);
    const izin = izinDefaultFromJenis(value);
    setIzinTinggal(izin.izinTinggal);
    setIzinBisnis(izin.izinBisnis);
  }

  function goStep(delta: number) {
    setStep((s) => Math.min(Math.max(0, s + delta), STEPS.length - 1));
  }

  function lanjut() {
    const err = validatePropertiStep(stepId, draft);
    if (err) return showErr(err);
    goStep(1);
  }

  const isHunian = jenisProperti === "kost" || jenisProperti === "kontrakan";

  if (nomorHasil) {
    return (
      <Visitrw3Shell title="Daftar properti" backHref="/visitrw3/pemilik">
        <SuccessPanel
          title="Pendaftaran terkirim"
          referenceLabel="Nomor pendaftaran properti"
          referenceValue={nomorHasil}
          nextSteps={[
            "Simpan nomor ini untuk mengecek status verifikasi.",
            "Admin RW akan memverifikasi data properti Anda.",
            "Setelah disetujui, properti muncul di formulir pengajuan Visit RW3.",
          ]}
          primaryAction={{ label: "Cek status properti", href: "/visitrw3/status-properti" }}
          secondaryAction={{ label: "Menu pemilik properti", href: "/visitrw3/pemilik" }}
        />
      </Visitrw3Shell>
    );
  }

  return (
    <Visitrw3Shell title="Daftar properti" backHref="/visitrw3/pemilik">
      <FeatureExplain title="Siapa yang harus isi form ini?" className="mb-3">
        <p>
          <strong>Pemilik</strong> kost, kontrakan, kiosk, atau lapak — bukan penyewa. Setelah
          disetujui admin, properti Anda muncul di daftar pilihan penyewa saat mengajukan Visit RW3.
        </p>
        <p>
          Anda akan mendapat nomor <strong>PROP-…</strong>. Penyewa tidak bisa mengajukan izin
          sebelum properti ini aktif.
        </p>
      </FeatureExplain>
      <p className="prose-gov mb-2 text-sm">
        Isi langkah demi langkah — tekan <strong>Lanjut</strong> setelah setiap bagian.
      </p>
      <Link
        href="/visitrw3/panduan"
        className="inline-flex items-center gap-1.5 text-sm text-brand font-medium mb-4 hover:underline"
      >
        <BookOpen className="w-4 h-4" />
        Bingung? Baca panduan
      </Link>
      <FormStepper steps={[...STEPS]} currentStep={step} />

      <div className="space-y-4">
        {stepId === "jenis" && (
          <>
            <MicroStepHeader
              current={step + 1}
              total={STEPS.length}
              title="Properti Anda jenis apa?"
              hint="Pilih yang paling sesuai dengan properti Anda."
            />
            <div className="grid grid-cols-2 gap-3">
              {jenisPropertiOptions.map((o) => (
                <Button
                  key={o.value}
                  type="button"
                  variant={jenisProperti === o.value ? "default" : "outline"}
                  className="h-auto py-4 flex-col gap-1"
                  onClick={() => pickJenis(o.value)}
                >
                  {o.value === "kiosk" || o.value === "lapak" ? (
                    <Store className="w-5 h-5 mb-0.5" />
                  ) : (
                    <Home className="w-5 h-5 mb-0.5" />
                  )}
                  <span className="font-medium">{o.label}</span>
                  <span className="text-[10px] font-normal opacity-80">{JENIS_HINTS[o.value]}</span>
                </Button>
              ))}
            </div>
            {jenisProperti && (
              <p className="text-sm rounded-lg bg-muted/50 border p-3 text-muted-foreground">
                {kegunaanPropertiLabel(jenisProperti, izinTinggal, izinBisnis)}
              </p>
            )}
          </>
        )}

        {stepId === "nama" && (
          <>
            <MicroStepHeader
              current={step + 1}
              total={STEPS.length}
              title="Nama properti"
              hint="Nama yang dikenal warga, misalnya nama kost atau warung."
            />
            <div className="space-y-2">
              <Label>Nama kost / kontrakan / usaha</Label>
              <Input
                className="h-12"
                value={namaKost}
                onChange={(e) => setNamaKost(e.target.value)}
                placeholder="Contoh: Kost Melati, Warung Bu Siti"
                autoFocus
              />
            </div>
          </>
        )}

        {stepId === "lokasi" && (
          <>
            <MicroStepHeader
              current={step + 1}
              total={STEPS.length}
              title="Lokasi properti"
              hint="Pilih RT dan tulis alamat lengkap."
            />
            <div className="space-y-2">
              <Label>RT</Label>
              <Select value={rt} onValueChange={setRt}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Pilih RT" />
                </SelectTrigger>
                <SelectContent>
                  {rtOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      RT {String(n).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alamat lengkap</Label>
              <Textarea
                value={alamatLengkap}
                onChange={(e) => setAlamatLengkap(e.target.value)}
                rows={3}
                placeholder="Jl., gang, nomor rumah, patokan"
              />
            </div>
          </>
        )}

        {stepId === "unit" && (
          <>
            <MicroStepHeader
              current={step + 1}
              total={STEPS.length}
              title="Berapa unit / kamar / pintu?"
              hint="Tekan + atau −. Untuk lapak/kiosk biasanya 1."
            />
            <div className="rounded-xl border bg-card p-6 text-center space-y-3">
              <Label>Jumlah unit</Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  disabled={jumlahPintu <= 1}
                  onClick={() => setJumlahPintu((n) => Math.max(1, n - 1))}
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <span className="text-3xl font-bold tabular-nums w-12">{jumlahPintu}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  disabled={jumlahPintu >= 50}
                  onClick={() => setJumlahPintu((n) => Math.min(50, n + 1))}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isHunian ? "Jumlah kamar atau pintu yang disewakan" : "Biasanya 1 untuk kiosk/lapak"}
              </p>
            </div>
            {jenisProperti === "kontrakan" && (
              <div className="space-y-3 rounded-xl border p-4 bg-card">
                <p className="text-sm font-medium">Di kontrakan ini juga ada usaha?</p>
                <p className="text-xs text-muted-foreground">
                  Misalnya warung atau toko di bagian depan rumah.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={!izinBisnis ? "default" : "outline"}
                    className="h-auto py-3"
                    onClick={() => setIzinBisnis(false)}
                  >
                    Tidak
                  </Button>
                  <Button
                    type="button"
                    variant={izinBisnis ? "default" : "outline"}
                    className="h-auto py-3"
                    onClick={() => setIzinBisnis(true)}
                  >
                    Ya, ada usaha
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {stepId === "pemilik" && (
          <>
            <MicroStepHeader
              current={step + 1}
              total={STEPS.length}
              title="Data pemilik"
              hint="Nama dan WhatsApp yang bisa dihubungi admin."
            />
            <div className="space-y-2">
              <Label>Nama pemilik</Label>
              <Input
                className="h-12"
                value={namaPemilik}
                onChange={(e) => setNamaPemilik(e.target.value)}
                placeholder="Nama lengkap pemilik"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp pemilik</Label>
              <Input
                className="h-12"
                value={nomorWaPemilik}
                onChange={(e) => setNomorWaPemilik(e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </>
        )}

        {stepId === "pengelola" && (
          <>
            <MicroStepHeader
              current={step + 1}
              total={STEPS.length}
              title="Siapa pengelola sehari-hari?"
              hint="Orang yang mengurus properti. Boleh sama dengan pemilik."
            />
            <div className="grid grid-cols-1 gap-3">
              <Button
                type="button"
                variant={pjSamaPemilik ? "default" : "outline"}
                className="h-auto py-4 justify-start px-4"
                onClick={() => setPjSamaPemilik(true)}
              >
                <span className="text-left">
                  <span className="block font-medium">Saya sendiri (pemilik)</span>
                  <span className="block text-xs font-normal opacity-80 mt-0.5">
                    Pakai nama & WhatsApp pemilik tadi
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant={!pjSamaPemilik ? "default" : "outline"}
                className="h-auto py-4 justify-start px-4"
                onClick={() => setPjSamaPemilik(false)}
              >
                <span className="text-left">
                  <span className="block font-medium">Ada pengelola lain</span>
                  <span className="block text-xs font-normal opacity-80 mt-0.5">
                    Misalnya karyawan atau keluarga yang mengurus
                  </span>
                </span>
              </Button>
            </div>
            {!pjSamaPemilik && (
              <div className="space-y-3 rounded-xl border p-4 bg-card">
                <div className="space-y-2">
                  <Label>Nama pengelola</Label>
                  <Input
                    className="h-12"
                    value={namaPenanggungJawab}
                    onChange={(e) => setNamaPenanggungJawab(e.target.value)}
                    placeholder="Nama penanggung jawab"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp pengelola</Label>
                  <Input
                    className="h-12"
                    value={nomorWaPenanggungJawab}
                    onChange={(e) => setNomorWaPenanggungJawab(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {stepId === "syarat" && (
          <Visitrw3SyaratPanel
            tataMasyarakat={settingsMap.tata_tertib_masyarakat ?? ""}
            tataKhusus={settingsMap.tata_tertib_pemilik ?? ""}
            setuju={setujuTataTertib}
            onSetuju={setSetujuTataTertib}
            loading={settingsLoading}
          />
        )}

        {stepId === "kirim" && (
          <>
            <MicroStepHeader
              current={step + 1}
              total={STEPS.length}
              title="Siap dikirim?"
              hint="Periksa ringkasan di bawah. Catatan boleh dikosongkan."
            />
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Properti:</span>{" "}
                <span className="font-medium">{namaKost}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Jenis:</span>{" "}
                {jenisPropertiOptions.find((o) => o.value === jenisProperti)?.label}
              </p>
              <p>
                <span className="text-muted-foreground">Lokasi:</span> RT {String(rt).padStart(2, "0")} — {alamatLengkap}
              </p>
              <p>
                <span className="text-muted-foreground">Pemilik:</span> {namaPemilik} ({nomorWaPemilik})
              </p>
              <p className="text-xs pt-1 border-t border-border/60">
                {kegunaanPropertiLabel(jenisProperti, izinTinggal, izinBisnis)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Catatan untuk admin (opsional)</Label>
              <Textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={2}
                placeholder="Ada info tambahan? (boleh dikosongkan)"
              />
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <Button variant="outline" className="touch-target" type="button" onClick={() => goStep(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {stepId !== "kirim" ? (
            <Button
              className="flex-1 touch-target"
              type="button"
              disabled={stepId === "jenis" && !jenisProperti}
              onClick={lanjut}
            >
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="flex-1 touch-target"
              type="button"
              disabled={mutation.isPending || !setujuTataTertib}
              onClick={() => {
                const err = validatePropertiStep("syarat", draft);
                if (err) return showErr(err);
                mutation.mutate();
              }}
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim pendaftaran"}
            </Button>
          )}
        </div>
      </div>
    </Visitrw3Shell>
  );
}
