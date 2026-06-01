import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, readJsonSafely, getApiErrorMessage } from "@/lib/queryClient";
import {
  rtOptions,
  keperluanTinggalOptions,
  pekerjaanOptions,
  jenisKendaraanOptions,
  visitrw3JenisTempatUsahaOptions,
  visitrw3JenjangAnakOptions,
} from "@/lib/constants";
import { Loader2, ChevronRight, ChevronLeft, Building2, Plus, Trash2 } from "lucide-react";
import {
  emptyKendaraanRow,
  serializeKendaraanForApi,
  type KendaraanRow,
} from "@/lib/visitrw3-kendaraan";
import { joinPlatNomor } from "@/lib/visitrw3-plat";
import {
  validateStepBayar,
  validateStepSyarat,
  validateStepJumlah,
  validateStepKeperluan,
  validateStepLokasiBisnis,
  validatePenghuniList,
  validatePersetujuanTetangga,
} from "@/lib/visitrw3-validate-pengajuan";
import {
  emptyPersetujuanTetangga,
  VISITRW3_TETANGGA_SLOTS,
  type PersetujuanTetanggaRow,
} from "@/lib/visitrw3-tetangga";
import { PlatNomorInput } from "@/components/gov/plat-nomor-input";
import { FormStepper } from "@/components/gov/form-stepper";
import { EmptyState } from "@/components/gov/empty-state";
import { SuccessPanel } from "@/components/gov/success-panel";
import { Visitrw3SyaratPanel } from "@/components/gov/visitrw3-syarat-panel";
import { settingsRowsToMap } from "@/lib/visitrw3-kontribusi";

type StepDef = { id: string; label: string };

function buildPengajuanSteps(keperluan: string, tinggalDiWilayahRw3: boolean | null): StepDef[] {
  const steps: StepDef[] = [
    { id: "keperluan", label: "Keperluan" },
    { id: "lokasi", label: "Lokasi" },
  ];
  const formLengkap = keperluan === "tinggal" || (keperluan === "bisnis" && tinggalDiWilayahRw3 === true);
  if (formLengkap) {
    steps.push({ id: "jumlah", label: "Jumlah" }, { id: "penghuni", label: "Penghuni" });
  }
  if (keperluan === "bisnis") {
    steps.push({ id: "tetangga", label: "Tetangga" });
  }
  steps.push({ id: "syarat", label: "Syarat" }, { id: "bayar", label: "Bayar" });
  return steps;
}

const TERMIN_OPTIONS = [
  { value: "1", label: "Bulanan (1 bulan)" },
  { value: "3", label: "3 bulan" },
  { value: "6", label: "6 bulan" },
  { value: "12", label: "1 tahun" },
];

type PenghuniForm = {
  namaLengkap: string;
  tanggalLahir: string;
  isAnak: boolean;
  nik: string;
  nomorWhatsapp: string;
  jenisKelamin: string;
  pekerjaan: string;
  keperluanTinggal: string;
  namaTempatKerja: string;
  namaSekolah: string;
  kendaraanList: KendaraanRow[];
  fotoKtpPath: string;
};

function emptyPenghuni(isAnak = false): PenghuniForm {
  return {
    namaLengkap: "",
    tanggalLahir: "",
    isAnak,
    nik: "",
    nomorWhatsapp: "",
    jenisKelamin: "",
    pekerjaan: "",
    keperluanTinggal: "",
    namaTempatKerja: "",
    namaSekolah: "",
    kendaraanList: [],
    fotoKtpPath: "",
  };
}

function umurFromDate(tgl: string) {
  if (!tgl) return 99;
  const b = new Date(`${tgl}T00:00:00`);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

export default function Visitrw3Pengajuan() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [keperluan, setKeperluan] = useState<"tinggal" | "bisnis" | "">("");
  const [rt, setRt] = useState("");
  const [pemilikKostId, setPemilikKostId] = useState("");
  const [tinggalDiWilayahRw3, setTinggalDiWilayahRw3] = useState<boolean | null>(null);
  const [namaUsaha, setNamaUsaha] = useState("");
  const [jenisTempatUsaha, setJenisTempatUsaha] = useState("");
  const [jenisTempatUsahaLain, setJenisTempatUsahaLain] = useState("");
  const [penanggungJawab, setPenanggungJawab] = useState("");
  const [jamBuka, setJamBuka] = useState("");
  const [jamTutup, setJamTutup] = useState("");
  const [alamatUsaha, setAlamatUsaha] = useState("");
  const [pjNik, setPjNik] = useState("");
  const [pjNomorWhatsapp, setPjNomorWhatsapp] = useState("");
  const [pjTanggalLahir, setPjTanggalLahir] = useState("");
  const [pjFotoKtpPath, setPjFotoKtpPath] = useState("");
  const [persetujuanTetangga, setPersetujuanTetangga] = useState<PersetujuanTetanggaRow[]>(
    () => emptyPersetujuanTetangga(),
  );
  const [jumlahDewasa, setJumlahDewasa] = useState(1);
  const [jumlahAnak, setJumlahAnak] = useState(0);
  const jumlah = jumlahDewasa + jumlahAnak;
  const [penghuni, setPenghuni] = useState<PenghuniForm[]>([emptyPenghuni(false)]);
  const [tanggalBayar, setTanggalBayar] = useState("");
  const [terminBulan, setTerminBulan] = useState("3");
  const [previewSampai, setPreviewSampai] = useState("");
  const [nomorUnit, setNomorUnit] = useState("");
  const [catatan, setCatatan] = useState("");
  const [setujuTataTertib, setSetujuTataTertib] = useState(false);
  const [nomorHasil, setNomorHasil] = useState<string | null>(null);

  const steps = useMemo(
    () => buildPengajuanSteps(keperluan, tinggalDiWilayahRw3),
    [keperluan, tinggalDiWilayahRw3],
  );
  const stepId = steps[step]?.id ?? "keperluan";
  const bisnisLuar = keperluan === "bisnis" && tinggalDiWilayahRw3 === false;
  const formLengkap = keperluan === "tinggal" || (keperluan === "bisnis" && tinggalDiWilayahRw3 === true);

  const showErr = (msg: string) => {
    toast({ title: "Lengkapi data", description: msg, variant: "destructive" });
  };

  function goStep(delta: number) {
    setStep((s) => Math.min(Math.max(0, s + delta), steps.length - 1));
  }

  function updateTetangga(posisi: PersetujuanTetanggaRow["posisi"], slot: 1 | 2, patch: Partial<PersetujuanTetanggaRow>) {
    setPersetujuanTetangga((prev) =>
      prev.map((r) => (r.posisi === posisi && r.slot === slot ? { ...r, ...patch } : r)),
    );
  }

  const { data: settingsRows = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/public/visitrw3/settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/visitrw3/settings");
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return readJsonSafely<{ key: string; value: string; updatedAt?: string }[]>(res);
    },
  });

  const settingsMap = useMemo(() => settingsRowsToMap(settingsRows), [settingsRows]);

  const { data: kostList = [], isLoading: kostLoading } = useQuery({
    queryKey: ["/api/public/pemilik-kost", rt, keperluan],
    queryFn: async () => {
      const res = await fetch(
        `/api/public/pemilik-kost?rt=${rt}&keperluan=${keperluan}`,
      );
      if (!res.ok) throw new Error("Gagal memuat kost");
      return readJsonSafely<
        { id: number; namaKost: string; namaPemilik: string; jenisProperti: string; jumlahPintu: number }[]
      >(res);
    },
    enabled: Boolean(
      rt && keperluan && (keperluan === "tinggal" || tinggalDiWilayahRw3 === true),
    ),
  });

  useEffect(() => {
    if (step >= steps.length) setStep(Math.max(0, steps.length - 1));
  }, [steps.length, step]);

  useEffect(() => {
    setPenghuni((prev) => {
      const dewasaPrev = prev.filter((p) => !p.isAnak);
      const anakPrev = prev.filter((p) => p.isAnak);
      const dewasa = Array.from({ length: jumlahDewasa }, (_, i) => {
        const row = dewasaPrev[i] ?? emptyPenghuni(false);
        return { ...row, isAnak: false };
      });
      const anak = Array.from({ length: jumlahAnak }, (_, i) => {
        const row = anakPrev[i] ?? emptyPenghuni(true);
        return { ...row, isAnak: true };
      });
      return [...dewasa, ...anak];
    });
  }, [jumlahDewasa, jumlahAnak]);

  function penghuniHeading(p: PenghuniForm, index: number) {
    const sameTypeBefore = penghuni.slice(0, index).filter((x) => x.isAnak === p.isAnak).length;
    const n = sameTypeBefore + 1;
    return p.isAnak ? `Anak ${n}` : `Dewasa ${n}`;
  }

  function clampJumlahDewasa(n: number) {
    const maxDewasa = Math.max(1, 20 - jumlahAnak);
    return Math.min(maxDewasa, Math.max(1, n));
  }

  function clampJumlahAnak(n: number) {
    const maxAnak = Math.max(0, 20 - jumlahDewasa);
    return Math.min(maxAnak, Math.max(0, n));
  }

  useEffect(() => {
    if (!tanggalBayar || !terminBulan) return;
    apiRequest("POST", "/api/public/visitrw3/preview-berlaku", {
      tanggalBayar,
      terminBulan: parseInt(terminBulan, 10),
    })
      .then((r) => r.json())
      .then((d) => setPreviewSampai(d.tanggalBerlakuSampai))
      .catch(() => setPreviewSampai(""));
  }, [tanggalBayar, terminBulan]);

  const penghuniPayload = useMemo(() => {
    if (bisnisLuar) {
      return [
        {
          namaLengkap: penanggungJawab,
          tanggalLahir: pjTanggalLahir,
          isAnak: false,
          nik: pjNik,
          nomorWhatsapp: pjNomorWhatsapp,
          jenisKelamin: null,
          pekerjaan: "Usaha",
          keperluanTinggal: null,
          namaTempatKerja: null,
          namaSekolah: null,
          fotoKtpPath: pjFotoKtpPath,
          punyaKendaraan: false,
          jenisKendaraan: null,
          platNomor: null,
        },
      ];
    }
    return penghuni.map((p) => {
      const kendaraan = p.isAnak
        ? { punyaKendaraan: false, jenisKendaraan: null, platNomor: null }
        : serializeKendaraanForApi(p.kendaraanList);
      return {
        namaLengkap: p.namaLengkap,
        tanggalLahir: p.tanggalLahir,
        isAnak: p.isAnak,
        nik: p.isAnak ? null : p.nik,
        nomorWhatsapp: p.isAnak ? null : p.nomorWhatsapp || null,
        jenisKelamin: p.isAnak ? null : p.jenisKelamin || null,
        pekerjaan: p.isAnak ? null : p.pekerjaan || null,
        keperluanTinggal: p.isAnak ? null : p.keperluanTinggal || null,
        namaTempatKerja: p.isAnak ? null : p.namaTempatKerja || null,
        namaSekolah: p.namaSekolah?.trim() || null,
        fotoKtpPath: p.isAnak ? null : p.fotoKtpPath || null,
        ...kendaraan,
      };
    });
  }, [bisnisLuar, penghuni, penanggungJawab, pjTanggalLahir, pjNik, pjNomorWhatsapp, pjFotoKtpPath]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/visitrw3/pengajuan", {
        keperluanPengajuan: keperluan,
        rt: parseInt(rt, 10),
        pemilikKostId: pemilikKostId ? parseInt(pemilikKostId, 10) : null,
        tinggalDiWilayahRw3: keperluan === "bisnis" ? tinggalDiWilayahRw3 : null,
        namaUsaha: keperluan === "bisnis" ? namaUsaha : null,
        jenisTempatUsaha: keperluan === "bisnis" ? jenisTempatUsaha : null,
        jenisTempatUsahaLain:
          keperluan === "bisnis" && jenisTempatUsaha === "lainnya" ? jenisTempatUsahaLain : null,
        jamBuka: bisnisLuar ? jamBuka : null,
        jamTutup: bisnisLuar ? jamTutup : null,
        alamatUsaha: bisnisLuar ? alamatUsaha : null,
        persetujuanTetangga: keperluan === "bisnis" ? persetujuanTetangga : null,
        penanggungJawab: keperluan === "bisnis" ? penanggungJawab : null,
        jumlahPenghuni: bisnisLuar ? 1 : jumlah,
        tanggalBayar,
        terminBulan: parseInt(terminBulan, 10),
        nomorUnit: nomorUnit.trim(),
        catatanPemohon: catatan.trim(),
        penghuni: penghuniPayload,
        setujuTataTertib: true as const,
      });
      return readJsonSafely<{ nomorVisitrw3: string }>(res);
    },
    onSuccess: (data) => setNomorHasil(data.nomorVisitrw3),
    onError: (e: unknown) => {
      toast({ title: "Gagal mengirim", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  async function uploadKtpPj(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/public/visitrw3/upload-ktp", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload gagal");
    const data = await res.json();
    setPjFotoKtpPath(data.path);
  }

  async function uploadKtp(file: File, index: number) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/public/visitrw3/upload-ktp", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload gagal");
    const data = await res.json();
    setPenghuni((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], fotoKtpPath: data.path };
      return next;
    });
  }

  function updatePenghuni(i: number, patch: Partial<PenghuniForm>) {
    setPenghuni((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function setPunyaKendaraan(i: number, punya: boolean) {
    setPenghuni((prev) => {
      const next = [...prev];
      const row = next[i];
      next[i] = {
        ...row,
        kendaraanList: punya
          ? row.kendaraanList.length > 0
            ? row.kendaraanList
            : [emptyKendaraanRow()]
          : [],
      };
      return next;
    });
  }

  function updateKendaraan(i: number, ki: number, patch: Partial<KendaraanRow>) {
    setPenghuni((prev) => {
      const next = [...prev];
      const list = [...next[i].kendaraanList];
      const merged = { ...list[ki], ...patch };
      if (patch.platParts) {
        merged.plat = joinPlatNomor(merged.platParts);
      }
      list[ki] = merged;
      next[i] = { ...next[i], kendaraanList: list };
      return next;
    });
  }

  function addKendaraan(i: number) {
    setPenghuni((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], kendaraanList: [...next[i].kendaraanList, emptyKendaraanRow()] };
      return next;
    });
  }

  function removeKendaraan(i: number, ki: number) {
    setPenghuni((prev) => {
      const next = [...prev];
      const list = next[i].kendaraanList.filter((_, idx) => idx !== ki);
      next[i] = { ...next[i], kendaraanList: list };
      return next;
    });
  }

  if (nomorHasil) {
    return (
      <Visitrw3Shell title="Pengajuan" backHref="/visitrw3/penyewa">
        <SuccessPanel
          title="Pengajuan terkirim"
          referenceLabel="Nomor Visit RW3"
          referenceValue={nomorHasil}
          nextSteps={[
            "Simpan nomor ini untuk cek status dan perpanjang nanti.",
            "Admin RW akan melakukan survey kelengkapan data.",
            "Anda akan dihubungi jika diperlukan klarifikasi.",
          ]}
          primaryAction={{ label: "Cek status", href: "/visitrw3/status" }}
          secondaryAction={{ label: "Menu penyewa", href: "/visitrw3/penyewa" }}
        />
      </Visitrw3Shell>
    );
  }

  return (
    <Visitrw3Shell title="Pengajuan baru" backHref="/visitrw3/penyewa">
      <p className="prose-gov mb-4">
        Lengkapi formulir berikut. Setelah dikirim, pengajuan masuk antrian survey admin RW.
      </p>
      <FormStepper steps={steps} currentStep={step} />

      {stepId === "keperluan" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Pilih keperluan pengajuan</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={keperluan === "tinggal" ? "default" : "outline"}
              className="h-auto py-4 flex-col"
              onClick={() => {
                setKeperluan("tinggal");
                setTinggalDiWilayahRw3(null);
              }}
            >
              Tinggal
            </Button>
            <Button
              type="button"
              variant={keperluan === "bisnis" ? "default" : "outline"}
              className="h-auto py-4 flex-col"
              onClick={() => {
                setKeperluan("bisnis");
                setTinggalDiWilayahRw3(null);
                setPemilikKostId("");
              }}
            >
              Bisnis
            </Button>
          </div>
          <Button
            className="w-full touch-target"
            disabled={!keperluan}
            onClick={() => {
              const err = validateStepKeperluan(keperluan);
              if (err) return showErr(err);
              setStep(1);
            }}
          >
            Lanjut <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {stepId === "lokasi" && (
        <div className="space-y-4">
          {keperluan === "bisnis" && (
            <>
              <div className="space-y-2">
                <Label>Tinggal di wilayah RW 03? *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={tinggalDiWilayahRw3 === true ? "default" : "outline"}
                    onClick={() => {
                      setTinggalDiWilayahRw3(true);
                      setJamBuka("");
                      setJamTutup("");
                      setAlamatUsaha("");
                    }}
                  >
                    Ya, di RW 03
                  </Button>
                  <Button
                    type="button"
                    variant={tinggalDiWilayahRw3 === false ? "default" : "outline"}
                    onClick={() => {
                      setTinggalDiWilayahRw3(false);
                      setPemilikKostId("");
                    }}
                  >
                    Tidak, di luar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tinggalDiWilayahRw3 === true
                    ? "Anda wajib mengisi formulir penghuni lengkap seperti pengajuan tinggal."
                    : tinggalDiWilayahRw3 === false
                      ? "Isi jam operasional dan alamat usaha; formulir penghuni tidak diperlukan."
                      : "Pilih salah satu opsi di atas."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nama usaha *</Label>
                <Input value={namaUsaha} onChange={(e) => setNamaUsaha(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Jenis tempat usaha *</Label>
                <Select value={jenisTempatUsaha} onValueChange={setJenisTempatUsaha}>
                  <SelectTrigger><SelectValue placeholder="Lapak, kiosk, atau lainnya" /></SelectTrigger>
                  <SelectContent>
                    {visitrw3JenisTempatUsahaOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {jenisTempatUsaha === "lainnya" && (
                <div className="space-y-2">
                  <Label>Jelaskan jenis usaha *</Label>
                  <Input
                    value={jenisTempatUsahaLain}
                    onChange={(e) => setJenisTempatUsahaLain(e.target.value)}
                    placeholder="Contoh: bengkel keliling, depot air"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Penanggung jawab *</Label>
                <Input value={penanggungJawab} onChange={(e) => setPenanggungJawab(e.target.value)} required />
              </div>
              {tinggalDiWilayahRw3 === false && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Jam buka *</Label>
                      <Input type="time" value={jamBuka} onChange={(e) => setJamBuka(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Jam tutup *</Label>
                      <Input type="time" value={jamTutup} onChange={(e) => setJamTutup(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Alamat usaha di RW 03 *</Label>
                    <Textarea
                      value={alamatUsaha}
                      onChange={(e) => setAlamatUsaha(e.target.value)}
                      rows={2}
                      placeholder="Alamat lengkap lokasi lapak/kiosk/usaha"
                      required
                    />
                  </div>
                  <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                    <p className="text-sm font-medium">Data penanggung jawab *</p>
                    <div className="space-y-2">
                      <Label className="text-xs">NIK (16 digit)</Label>
                      <Input
                        maxLength={16}
                        value={pjNik}
                        onChange={(e) => setPjNik(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input value={pjNomorWhatsapp} onChange={(e) => setPjNomorWhatsapp(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Tanggal lahir</Label>
                      <Input type="date" value={pjTanggalLahir} onChange={(e) => setPjTanggalLahir(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Foto KTP</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadKtpPj(f).catch(() => toast({ title: "Upload gagal", variant: "destructive" }));
                        }}
                      />
                      {pjFotoKtpPath && <p className="text-xs text-success">KTP terunggah</p>}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <div className="space-y-2">
            <Label>RT lokasi {keperluan === "bisnis" ? "usaha" : "tinggal"} *</Label>
            <Select value={rt} onValueChange={(v) => { setRt(v); setPemilikKostId(""); }}>
              <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
              <SelectContent>
                {rtOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>RT {String(n).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(keperluan === "tinggal" || (keperluan === "bisnis" && tinggalDiWilayahRw3 === true)) && (
            kostLoading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              <div className="space-y-2">
                <Label>Kost / Kontrakan *</Label>
                <Select value={pemilikKostId} onValueChange={setPemilikKostId}>
                  <SelectTrigger><SelectValue placeholder="Pilih properti" /></SelectTrigger>
                  <SelectContent>
                    {kostList.map((k) => (
                      <SelectItem key={k.id} value={String(k.id)}>
                        {k.namaKost} — {k.namaPemilik} ({k.jenisProperti})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rt && !kostLoading && kostList.length === 0 && (
                  <EmptyState
                    icon={Building2}
                    title="Belum ada properti tersedia"
                    description="Properti harus didaftarkan dan disetujui admin dulu. Pemilik bisa daftar lewat menu pemilik properti; pengurus bisa menambah di admin Visit RW3."
                    action={
                      <div className="flex flex-wrap justify-center gap-2 pt-1">
                        <Link href="/visitrw3/daftar-properti">
                          <Button type="button" variant="outline" size="sm">
                            Daftar properti (pemilik)
                          </Button>
                        </Link>
                        <Link href="/visitrw3">
                          <Button type="button" variant="ghost" size="sm">
                            Kembali ke menu
                          </Button>
                        </Link>
                      </div>
                    }
                  />
                )}
              </div>
            )
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => goStep(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button
              className="flex-1 touch-target"
              disabled={keperluan === "tinggal" ? !pemilikKostId : tinggalDiWilayahRw3 === null}
              onClick={() => {
                const err =
                  keperluan === "bisnis"
                    ? validateStepLokasiBisnis({
                        tinggalDiWilayahRw3,
                        rt,
                        pemilikKostId,
                        namaUsaha,
                        jenisTempatUsaha,
                        jenisTempatUsahaLain,
                        penanggungJawab,
                        jamBuka,
                        jamTutup,
                        alamatUsaha,
                        pjNik,
                        pjNomorWhatsapp,
                        pjTanggalLahir,
                        pjFotoKtpPath,
                      })
                    : !rt
                      ? "Pilih RT"
                      : !pemilikKostId
                        ? "Pilih kost/kontrakan"
                        : null;
                if (err) return showErr(err);
                goStep(1);
              }}
            >
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "jumlah" && (
        <div className="space-y-4">
          <p className="prose-gov text-sm">
            Tentukan berapa orang dewasa dan anak. Form berikutnya akan disesuaikan (dewasa wajib NIK, anak tidak).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 rounded-xl border bg-card p-3">
              <Label htmlFor="jumlah-dewasa">Dewasa</Label>
              <Input
                id="jumlah-dewasa"
                type="number"
                min={1}
                max={20}
                value={jumlahDewasa}
                onChange={(e) => setJumlahDewasa(clampJumlahDewasa(parseInt(e.target.value, 10) || 1))}
              />
              <p className="text-[11px] text-muted-foreground">Min. 1 · wajib NIK & data lengkap</p>
            </div>
            <div className="space-y-2 rounded-xl border bg-card p-3">
              <Label htmlFor="jumlah-anak">Anak</Label>
              <Input
                id="jumlah-anak"
                type="number"
                min={0}
                max={19}
                value={jumlahAnak}
                onChange={(e) => setJumlahAnak(clampJumlahAnak(parseInt(e.target.value, 10) || 0))}
              />
              <p className="text-[11px] text-muted-foreground">Tanpa NIK · nama & tanggal lahir</p>
            </div>
          </div>
          <p className="text-sm font-medium text-center text-brand">
            Total {jumlah} penghuni
            <span className="text-muted-foreground font-normal">
              {" "}
              ({jumlahDewasa} dewasa{jumlahAnak > 0 ? `, ${jumlahAnak} anak` : ""})
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => goStep(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateStepJumlah(jumlahDewasa);
                if (err) return showErr(err);
                goStep(1);
              }}
            >
              Isi data penghuni <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "penghuni" && (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <p className="text-sm text-muted-foreground">Semua field bertanda * wajib diisi sebelum lanjut.</p>
          {penghuni.map((p, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 space-y-3 ${p.isAnak ? "border-dashed bg-muted/20" : "bg-card"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{penghuniHeading(p, i)}</p>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    p.isAnak ? "bg-muted text-muted-foreground" : "bg-brand/10 text-brand"
                  }`}
                >
                  {p.isAnak ? "Anak" : "Dewasa"}
                </span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama lengkap *</Label>
                <Input
                  placeholder="Nama lengkap"
                  value={p.namaLengkap}
                  onChange={(e) => updatePenghuni(i, { namaLengkap: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tanggal lahir *</Label>
                <Input
                  type="date"
                  value={p.tanggalLahir}
                  onChange={(e) => updatePenghuni(i, { tanggalLahir: e.target.value })}
                  required
                />
              </div>
              {p.isAnak && (
                <>
                  <p className="text-xs text-muted-foreground">Anak tidak perlu NIK atau foto KTP.</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Jenjang pendidikan *</Label>
                    <Select
                      value={p.namaSekolah}
                      onValueChange={(v) => updatePenghuni(i, { namaSekolah: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenjang" />
                      </SelectTrigger>
                      <SelectContent>
                        {visitrw3JenjangAnakOptions.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {!p.isAnak && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">NIK (16 digit) *</Label>
                    <Input
                      placeholder="NIK 16 digit"
                      maxLength={16}
                      value={p.nik}
                      onChange={(e) => updatePenghuni(i, { nik: e.target.value.replace(/\D/g, "") })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">WhatsApp *</Label>
                    <Input
                      placeholder="08xxxxxxxxxx"
                      value={p.nomorWhatsapp}
                      onChange={(e) => updatePenghuni(i, { nomorWhatsapp: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Jenis kelamin *</Label>
                    <Select value={p.jenisKelamin} onValueChange={(v) => updatePenghuni(i, { jenisKelamin: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pekerjaan *</Label>
                    <Select value={p.pekerjaan} onValueChange={(v) => updatePenghuni(i, { pekerjaan: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih pekerjaan" /></SelectTrigger>
                    <SelectContent>
                      {pekerjaanOptions.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                  {keperluan === "tinggal" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Keperluan tinggal *</Label>
                      <Select value={p.keperluanTinggal} onValueChange={(v) => updatePenghuni(i, { keperluanTinggal: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih keperluan tinggal" /></SelectTrigger>
                      <SelectContent>
                        {keperluanTinggalOptions.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Tempat kerja *</Label>
                    <Input
                      placeholder="Nama tempat kerja"
                      value={p.namaTempatKerja}
                      onChange={(e) => updatePenghuni(i, { namaTempatKerja: e.target.value })}
                      required
                    />
                  </div>
                  {umurFromDate(p.tanggalLahir) < 21 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Nama sekolah * (usia di bawah 21 tahun)</Label>
                      <Input
                        placeholder="Nama sekolah"
                        value={p.namaSekolah}
                        onChange={(e) => updatePenghuni(i, { namaSekolah: e.target.value })}
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={p.kendaraanList.length > 0}
                        onCheckedChange={(c) => setPunyaKendaraan(i, Boolean(c))}
                        id={`kendaraan-${i}`}
                      />
                      <Label htmlFor={`kendaraan-${i}`} className="font-normal text-sm">
                        Punya kendaraan
                      </Label>
                    </div>
                    {p.kendaraanList.length > 0 && (
                      <div className="space-y-3">
                        {p.kendaraanList.map((k, ki) => (
                          <div key={ki} className="space-y-2 rounded-md border bg-background p-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">
                                Kendaraan {ki + 1}
                              </p>
                              {p.kendaraanList.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removeKendaraan(i, ki)}
                                  aria-label={`Hapus kendaraan ${ki + 1}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Jenis kendaraan *</Label>
                              <Select
                                value={k.jenis}
                                onValueChange={(v) => updateKendaraan(i, ki, { jenis: v })}
                              >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih jenis" />
                              </SelectTrigger>
                              <SelectContent>
                                {jenisKendaraanOptions.map((o) => (
                                  <SelectItem key={o} value={o}>
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            </div>
                            <PlatNomorInput
                              required
                              idPrefix={`plat-${i}-${ki}`}
                              value={k.platParts}
                              onChange={(platParts) => updateKendaraan(i, ki, { platParts })}
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full gap-1"
                          onClick={() => addKendaraan(i)}
                        >
                          <Plus className="w-4 h-4" />
                          Tambah kendaraan
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Foto KTP *</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadKtp(f, i).catch(() => toast({ title: "Upload gagal", variant: "destructive" }));
                      }}
                    />
                    {p.fotoKtpPath && <p className="text-xs text-success">KTP terunggah</p>}
                  </div>
                </>
              )}
            </div>
          ))}
          <div className="flex gap-2 sticky bottom-0 bg-background pt-2">
            <Button variant="outline" onClick={() => goStep(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                if (!keperluan) return showErr("Keperluan belum dipilih");
                const err = validatePenghuniList(penghuni, keperluan);
                if (err) return showErr(err);
                goStep(1);
              }}
            >
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "tetangga" && (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <p className="text-sm text-muted-foreground">
            Pengajuan bisnis memerlukan persetujuan warga tetangga: 2 kanan, 2 kiri, 2 depan, 2 belakang (total 8 orang).
          </p>
          {VISITRW3_TETANGGA_SLOTS.map((slot) => {
            const row = persetujuanTetangga.find((r) => r.posisi === slot.posisi && r.slot === slot.slot)!;
            return (
              <div key={`${slot.posisi}-${slot.slot}`} className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">{slot.label}</p>
                <div className="space-y-1">
                  <Label className="text-xs">Nama warga *</Label>
                  <Input
                    value={row.namaWarga}
                    onChange={(e) => updateTetangga(slot.posisi, slot.slot, { namaWarga: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp *</Label>
                  <Input
                    value={row.nomorWhatsapp}
                    onChange={(e) => updateTetangga(slot.posisi, slot.slot, { nomorWhatsapp: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex gap-2 sticky bottom-0 bg-background pt-2">
            <Button variant="outline" onClick={() => goStep(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validatePersetujuanTetangga(persetujuanTetangga);
                if (err) return showErr(err);
                goStep(1);
              }}
            >
              Lanjut syarat <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "syarat" && (
        <div className="space-y-4">
          <Visitrw3SyaratPanel
            tataMasyarakat={settingsMap.tata_tertib_masyarakat ?? ""}
            tataKhusus={settingsMap.tata_tertib_penyewa ?? ""}
            setuju={setujuTataTertib}
            onSetuju={setSetujuTataTertib}
            loading={settingsLoading}
          />
          <div className="flex gap-2 sticky bottom-0 bg-background pt-2">
            <Button variant="outline" onClick={() => goStep(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateStepSyarat(setujuTataTertib);
                if (err) return showErr(err);
                goStep(1);
              }}
            >
              Lanjut ke bayar <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "bayar" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tanggal bayar *</Label>
            <Input type="date" value={tanggalBayar} onChange={(e) => setTanggalBayar(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Termin *</Label>
            <Select value={terminBulan} onValueChange={setTerminBulan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TERMIN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {previewSampai && (
            <p className="text-sm rounded-lg bg-muted p-3">
              Berlaku sampai: <span className="font-semibold">{previewSampai}</span>
            </p>
          )}
          <div className="space-y-2">
            <Label>{keperluan === "bisnis" ? "Nomor unit / lokasi usaha *" : "Nomor unit / kamar / rumah *"}</Label>
            <Input
              placeholder="Contoh: Kamar 3B, Unit 12, Rumah depan"
              value={nomorUnit}
              onChange={(e) => setNomorUnit(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Nomor kamar kost, unit kontrakan, atau rumah yang ditempati.</p>
          </div>
          <div className="space-y-2">
            <Label>Catatan *</Label>
            <Textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              placeholder="Informasi tambahan untuk admin survey"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => goStep(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button
              className="flex-1 touch-target"
              disabled={mutation.isPending || !setujuTataTertib}
              onClick={() => {
                const err = validateStepBayar(
                  tanggalBayar,
                  terminBulan,
                  nomorUnit,
                  catatan,
                  keperluan,
                  setujuTataTertib,
                );
                if (err) return showErr(err);
                mutation.mutate();
              }}
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim pengajuan"}
            </Button>
          </div>
        </div>
      )}
    </Visitrw3Shell>
  );
}
