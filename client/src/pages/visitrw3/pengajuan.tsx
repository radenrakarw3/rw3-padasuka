import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, readJsonSafely, getApiErrorMessage } from "@/lib/queryClient";
import {
  rtOptions,
  keperluanTinggalOptions,
  pekerjaanLegacyOptions,
  jenisKendaraanOptions,
  visitrw3JenisTempatUsahaOptions,
  visitrw3JenjangAnakOptions,
} from "@/lib/constants";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Building2,
  Plus,
  Trash2,
  Minus,
  BookOpen,
  Home,
  Store,
  Layers,
} from "lucide-react";
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
  validateSinglePenghuni,
  validateLokasiSubTinggal,
  validateLokasiSubBisnis,
} from "@/lib/visitrw3-validate-pengajuan";
import { PlatNomorInput } from "@/components/gov/plat-nomor-input";
import { FormStepper } from "@/components/gov/form-stepper";
import { EmptyState } from "@/components/gov/empty-state";
import { SuccessPanel } from "@/components/gov/success-panel";
import { Visitrw3SyaratPanel } from "@/components/gov/visitrw3-syarat-panel";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { settingsRowsToMap } from "@/lib/visitrw3-kontribusi";

type StepDef = { id: string; label: string };
type KeperluanMode = "" | "tinggal" | "bisnis_dalam" | "bisnis_luar";

const KEPERLUAN_OPTIONS: {
  id: KeperluanMode;
  title: string;
  subtitle: string;
  icon: typeof Home;
  badge?: string;
}[] = [
  {
    id: "tinggal",
    title: "Tinggal saja",
    subtitle: "Ngekost atau kontrak di RW 03, tanpa usaha di sini",
    icon: Home,
  },
  {
    id: "bisnis_dalam",
    title: "Tinggal sekaligus usaha",
    subtitle: "Ngekost dan punya lapak/kiosk/usaha — cukup isi sekali, tidak double",
    icon: Layers,
    badge: "Paling sering",
  },
  {
    id: "bisnis_luar",
    title: "Usaha saja",
    subtitle: "Berjualan di RW 03, rumah tinggal di luar RW 03",
    icon: Store,
  },
];

function applyKeperluanMode(mode: KeperluanMode): {
  keperluan: "tinggal" | "bisnis" | "";
  tinggalDiWilayahRw3: boolean | null;
} {
  if (mode === "tinggal") return { keperluan: "tinggal", tinggalDiWilayahRw3: null };
  if (mode === "bisnis_dalam") return { keperluan: "bisnis", tinggalDiWilayahRw3: true };
  if (mode === "bisnis_luar") return { keperluan: "bisnis", tinggalDiWilayahRw3: false };
  return { keperluan: "", tinggalDiWilayahRw3: null };
}

function buildPengajuanSteps(keperluan: string, tinggalDiWilayahRw3: boolean | null): StepDef[] {
  const steps: StepDef[] = [
    { id: "keperluan", label: "Situasi" },
    { id: "lokasi", label: "Lokasi" },
  ];
  const formLengkap = keperluan === "tinggal" || (keperluan === "bisnis" && tinggalDiWilayahRw3 === true);
  if (formLengkap) {
    steps.push({ id: "jumlah", label: "Jumlah" }, { id: "penghuni", label: "Penghuni" });
  }
  steps.push({ id: "syarat", label: "Syarat" }, { id: "bayar", label: "Bayar" });
  return steps;
}

type LokasiSubId = "rt" | "kost" | "wilayah" | "usaha" | "operasional" | "pj";

function getLokasiSubSteps(keperluan: string, tinggalDiWilayahRw3: boolean | null): LokasiSubId[] {
  if (keperluan === "tinggal") return ["rt", "kost"];
  if (tinggalDiWilayahRw3 === null) return ["wilayah"];
  const subs: LokasiSubId[] = ["wilayah", "usaha"];
  if (!tinggalDiWilayahRw3) subs.push("operasional", "pj");
  subs.push("rt");
  if (tinggalDiWilayahRw3) subs.push("kost");
  return subs;
}

const LOKASI_SUB_LABELS: Record<LokasiSubId, string> = {
  rt: "Pilih RT",
  kost: "Pilih tempat tinggal",
  wilayah: "Apakah Anda tinggal di RW 03?",
  usaha: "Data usaha",
  operasional: "Jam & alamat usaha",
  pj: "Data penanggung jawab",
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
        Bagian {current} dari {total}
      </p>
      <p className="font-semibold text-sm">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function JumlahStepper({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  hint: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 text-center">
      <Label>{label}</Label>
      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 touch-target"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Kurangi ${label}`}
        >
          <Minus className="w-5 h-5" />
        </Button>
        <span className="text-3xl font-bold tabular-nums w-10">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 touch-target"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Tambah ${label}`}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
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
  const [keperluanMode, setKeperluanMode] = useState<KeperluanMode>("");
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
  const [lokasiSub, setLokasiSub] = useState(0);
  const [penghuniIndex, setPenghuniIndex] = useState(0);

  const steps = useMemo(
    () => buildPengajuanSteps(keperluan, tinggalDiWilayahRw3),
    [keperluan, tinggalDiWilayahRw3],
  );
  const stepId = steps[step]?.id ?? "keperluan";
  const bisnisLuar = keperluan === "bisnis" && tinggalDiWilayahRw3 === false;
  const formLengkap = keperluan === "tinggal" || (keperluan === "bisnis" && tinggalDiWilayahRw3 === true);
  const lokasiSubSteps = useMemo(
    () => getLokasiSubSteps(keperluan, tinggalDiWilayahRw3),
    [keperluan, tinggalDiWilayahRw3],
  );
  const lokasiSubId = lokasiSubSteps[lokasiSub] ?? lokasiSubSteps[0];
  const bisnisLokasiInput = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  const showErr = (msg: string) => {
    toast({ title: "Lengkapi data", description: msg, variant: "destructive" });
  };

  function goStep(delta: number) {
    setStep((s) => Math.min(Math.max(0, s + delta), steps.length - 1));
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
    setLokasiSub(0);
  }, [keperluan]);

  useEffect(() => {
    if (lokasiSub >= lokasiSubSteps.length) setLokasiSub(Math.max(0, lokasiSubSteps.length - 1));
  }, [lokasiSubSteps.length, lokasiSub]);

  useEffect(() => {
    setPenghuniIndex(0);
  }, [jumlahDewasa, jumlahAnak]);

  useEffect(() => {
    if (penghuniIndex >= penghuni.length) setPenghuniIndex(Math.max(0, penghuni.length - 1));
  }, [penghuni.length, penghuniIndex]);

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
        penanggungJawab: keperluan === "bisnis" ? penanggungJawab : null,
        jumlahPenghuni: bisnisLuar ? 1 : jumlah,
        tanggalBayar,
        terminBulan: parseInt(terminBulan, 10),
        nomorUnit: nomorUnit.trim(),
        catatanPemohon: catatan.trim() || null,
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
      <FeatureExplain title="Sebelum mulai" className="mb-3">
        <p>
          Pastikan properti tempat Anda tinggal/berusaha sudah <strong>terdaftar pemilik</strong> dan
          statusnya aktif. Isi form langkah demi langkah — tekan <strong>Lanjut</strong> setelah
          setiap bagian.
        </p>
        <p>
          Ngekost sekaligus berusaha? Pilih <strong>Tinggal sekaligus usaha</strong> di langkah
          pertama — cukup satu kali isi, tidak double.
        </p>
      </FeatureExplain>
      <Link
        href="/visitrw3/panduan"
        className="inline-flex items-center gap-1.5 text-sm text-brand font-medium mb-4 hover:underline"
      >
        <BookOpen className="w-4 h-4" />
        Bingung? Baca panduan lengkap
      </Link>
      <FormStepper steps={steps} currentStep={step} />

      {stepId === "keperluan" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-brand/5 border border-brand/20 p-3 space-y-1">
            <p className="text-sm font-medium">Pilih yang paling sesuai situasi Anda</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ngekost sekaligus berusaha? Pilih <strong className="text-foreground">Tinggal sekaligus usaha</strong> —
              cukup <strong className="text-foreground">satu kali</strong> isi form, tidak perlu ajukan tinggal dan bisnis
              terpisah.
            </p>
          </div>
          <div className="space-y-2">
            {KEPERLUAN_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = keperluanMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const next = applyKeperluanMode(opt.id);
                    setKeperluanMode(opt.id);
                    setKeperluan(next.keperluan);
                    setTinggalDiWilayahRw3(next.tinggalDiWilayahRw3);
                    if (opt.id === "bisnis_luar") {
                      setPemilikKostId("");
                      setJamBuka("");
                      setJamTutup("");
                      setAlamatUsaha("");
                    }
                    if (opt.id === "bisnis_dalam") {
                      setJamBuka("");
                      setJamTutup("");
                      setAlamatUsaha("");
                    }
                  }}
                  className={`w-full text-left rounded-xl border p-4 transition-colors touch-target ${
                    selected
                      ? "border-brand bg-brand/10 ring-1 ring-brand/30"
                      : "border-border bg-card hover:border-brand/40"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        selected ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{opt.title}</span>
                        {opt.badge && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{opt.subtitle}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <Button
            className="w-full touch-target"
            disabled={!keperluanMode}
            onClick={() => {
              const err = validateStepKeperluan(keperluan);
              if (err) return showErr(err);
              setLokasiSub(0);
              setStep(1);
            }}
          >
            Lanjut <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {stepId === "lokasi" && (
        <div className="space-y-4">
          <MicroStepHeader
            current={lokasiSub + 1}
            total={lokasiSubSteps.length}
            title={LOKASI_SUB_LABELS[lokasiSubId]}
            hint={
              lokasiSubId === "wilayah"
                ? "Pilih sesuai tempat tinggal Anda saat ini."
                : lokasiSubId === "kost"
                  ? keperluanMode === "bisnis_dalam"
                    ? "Pilih kost tempat Anda tinggal. Data usaha sudah diisi di langkah sebelumnya — tidak perlu pengajuan terpisah."
                    : "Pilih properti tempat Anda tinggal di RW 03."
                  : lokasiSubId === "usaha" && keperluanMode === "bisnis_dalam"
                    ? "Isi data usaha Anda. Nanti lanjut isi data penghuni kost di langkah berikutnya."
                    : undefined
            }
          />

          {lokasiSubId === "wilayah" && keperluan === "bisnis" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Langkah ini muncul jika pilihan awal belum jelas. Umumnya sudah terisi dari langkah pertama.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant={tinggalDiWilayahRw3 === true ? "default" : "outline"}
                  className="h-auto py-4 justify-start px-4"
                  onClick={() => {
                    setKeperluanMode("bisnis_dalam");
                    setTinggalDiWilayahRw3(true);
                    setJamBuka("");
                    setJamTutup("");
                    setAlamatUsaha("");
                  }}
                >
                  <span className="text-left">
                    <span className="block font-medium">Ya, saya tinggal di RW 03</span>
                    <span className="block text-xs font-normal opacity-80 mt-0.5">
                      Sekaligus isi data penghuni kost — satu pengajuan saja
                    </span>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={tinggalDiWilayahRw3 === false ? "default" : "outline"}
                  className="h-auto py-4 justify-start px-4"
                  onClick={() => {
                    setKeperluanMode("bisnis_luar");
                    setTinggalDiWilayahRw3(false);
                    setPemilikKostId("");
                  }}
                >
                  <span className="text-left">
                    <span className="block font-medium">Tidak, tinggal di luar RW 03</span>
                    <span className="block text-xs font-normal opacity-80 mt-0.5">
                      Cukup isi data usaha dan penanggung jawab
                    </span>
                  </span>
                </Button>
              </div>
            </div>
          )}

          {lokasiSubId === "usaha" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama usaha</Label>
                <Input
                  value={namaUsaha}
                  onChange={(e) => setNamaUsaha(e.target.value)}
                  placeholder="Contoh: Warung Bu Siti"
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis tempat usaha</Label>
                <Select value={jenisTempatUsaha} onValueChange={setJenisTempatUsaha}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                  <SelectContent>
                    {visitrw3JenisTempatUsahaOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {jenisTempatUsaha === "lainnya" && (
                <div className="space-y-2">
                  <Label>Jenis usaha lainnya</Label>
                  <Input
                    value={jenisTempatUsahaLain}
                    onChange={(e) => setJenisTempatUsahaLain(e.target.value)}
                    placeholder="Contoh: bengkel keliling"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Nama penanggung jawab</Label>
                <Input
                  value={penanggungJawab}
                  onChange={(e) => setPenanggungJawab(e.target.value)}
                  placeholder="Nama lengkap pemilik / PJ"
                />
              </div>
            </div>
          )}

          {lokasiSubId === "operasional" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Jam buka</Label>
                  <Input type="time" value={jamBuka} onChange={(e) => setJamBuka(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Jam tutup</Label>
                  <Input type="time" value={jamTutup} onChange={(e) => setJamTutup(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alamat usaha di RW 03</Label>
                <Textarea
                  value={alamatUsaha}
                  onChange={(e) => setAlamatUsaha(e.target.value)}
                  rows={3}
                  placeholder="Jl., gang, nomor, patokan lokasi usaha"
                />
              </div>
            </div>
          )}

          {lokasiSubId === "pj" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>NIK penanggung jawab (16 digit)</Label>
                <Input
                  maxLength={16}
                  inputMode="numeric"
                  value={pjNik}
                  onChange={(e) => setPjNik(e.target.value.replace(/\D/g, ""))}
                  placeholder="327xxxxxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp penanggung jawab</Label>
                <Input
                  value={pjNomorWhatsapp}
                  onChange={(e) => setPjNomorWhatsapp(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal lahir</Label>
                <Input type="date" value={pjTanggalLahir} onChange={(e) => setPjTanggalLahir(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Foto KTP</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadKtpPj(f).catch(() => toast({ title: "Upload gagal", variant: "destructive" }));
                  }}
                />
                {pjFotoKtpPath && <p className="text-xs text-success">KTP sudah terunggah</p>}
              </div>
            </div>
          )}

          {lokasiSubId === "rt" && (
            <div className="space-y-2">
              <Label>RT {keperluan === "bisnis" ? "lokasi usaha" : "tempat tinggal"}</Label>
              <Select value={rt} onValueChange={(v) => { setRt(v); setPemilikKostId(""); }}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                <SelectContent>
                  {rtOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>RT {String(n).padStart(2, "0")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {lokasiSubId === "kost" && (
            kostLoading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              <div className="space-y-2">
                <Label>Kost / kontrakan</Label>
                <Select value={pemilikKostId} onValueChange={setPemilikKostId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Pilih tempat tinggal" /></SelectTrigger>
                  <SelectContent>
                    {kostList.map((k) => (
                      <SelectItem key={k.id} value={String(k.id)}>
                        {k.namaKost} — {k.namaPemilik}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rt && !kostLoading && kostList.length === 0 && (
                  <EmptyState
                    icon={Building2}
                    title="Belum ada properti di RT ini"
                    description="Minta pemilik properti mendaftar dulu, atau hubungi pengurus RW."
                    action={
                      <Link href="/visitrw3/daftar-properti">
                        <Button type="button" variant="outline" size="sm">
                          Daftar properti
                        </Button>
                      </Link>
                    }
                  />
                )}
              </div>
            )
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="touch-target"
              onClick={() => {
                if (lokasiSub > 0) setLokasiSub((s) => s - 1);
                else goStep(-1);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err =
                  keperluan === "tinggal"
                    ? validateLokasiSubTinggal(lokasiSubId as "rt" | "kost", rt, pemilikKostId)
                    : validateLokasiSubBisnis(lokasiSubId, bisnisLokasiInput);
                if (err) return showErr(err);
                if (lokasiSub < lokasiSubSteps.length - 1) {
                  setLokasiSub((s) => s + 1);
                  return;
                }
                if (keperluan === "bisnis") {
                  const fullErr = validateStepLokasiBisnis(bisnisLokasiInput);
                  if (fullErr) return showErr(fullErr);
                }
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
          <MicroStepHeader
            current={1}
            total={1}
            title="Berapa orang yang akan tinggal?"
            hint={
              keperluanMode === "bisnis_dalam"
                ? "Data ini sekaligus untuk izin tinggal dan usaha — tidak perlu isi form kedua kalinya."
                : "Tekan + atau − untuk menambah/mengurangi. Nanti diisi satu per satu."
            }
          />
          <JumlahStepper
            label="Dewasa"
            value={jumlahDewasa}
            min={1}
            max={20}
            onChange={(n) => setJumlahDewasa(clampJumlahDewasa(n))}
            hint="Minimal 1 orang dewasa"
          />
          <JumlahStepper
            label="Anak"
            value={jumlahAnak}
            min={0}
            max={19}
            onChange={(n) => setJumlahAnak(clampJumlahAnak(n))}
            hint="Anak tidak perlu NIK"
          />
          <p className="text-sm font-medium text-center text-brand">
            Total {jumlah} orang
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="touch-target" onClick={() => goStep(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateStepJumlah(jumlahDewasa);
                if (err) return showErr(err);
                setPenghuniIndex(0);
                goStep(1);
              }}
            >
              Mulai isi data <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "penghuni" && (() => {
        const i = penghuniIndex;
        const p = penghuni[i];
        if (!p) return null;
        return (
          <div className="space-y-4">
            <MicroStepHeader
              current={penghuniIndex + 1}
              total={penghuni.length}
              title={penghuniHeading(p, i)}
              hint={p.isAnak ? "Anak cukup nama, tanggal lahir, dan jenjang sekolah." : "Isi data diri penghuni ini dulu, lalu lanjut ke berikutnya."}
            />
            <div className={`rounded-xl border p-4 space-y-4 ${p.isAnak ? "border-dashed bg-muted/20" : "bg-card"}`}>
              <div className="space-y-2">
                <Label>Nama lengkap</Label>
                <Input
                  className="h-12"
                  placeholder="Sesuai KTP"
                  value={p.namaLengkap}
                  onChange={(e) => updatePenghuni(i, { namaLengkap: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal lahir</Label>
                <Input
                  className="h-12"
                  type="date"
                  value={p.tanggalLahir}
                  onChange={(e) => updatePenghuni(i, { tanggalLahir: e.target.value })}
                />
              </div>
              {p.isAnak ? (
                <div className="space-y-2">
                  <Label>Jenjang pendidikan</Label>
                  <Select value={p.namaSekolah} onValueChange={(v) => updatePenghuni(i, { namaSekolah: v })}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Pilih jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      {visitrw3JenjangAnakOptions.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>NIK (16 digit)</Label>
                    <Input
                      className="h-12"
                      inputMode="numeric"
                      placeholder="327xxxxxxxxxxxxx"
                      maxLength={16}
                      value={p.nik}
                      onChange={(e) => updatePenghuni(i, { nik: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      className="h-12"
                      placeholder="08xxxxxxxxxx"
                      value={p.nomorWhatsapp}
                      onChange={(e) => updatePenghuni(i, { nomorWhatsapp: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Jenis kelamin</Label>
                      <Select value={p.jenisKelamin} onValueChange={(v) => updatePenghuni(i, { jenisKelamin: v })}>
                        <SelectTrigger className="h-12"><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                          <SelectItem value="Perempuan">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pekerjaan</Label>
                      <SearchableSelect
                        value={p.pekerjaan}
                        onValueChange={(v) => updatePenghuni(i, { pekerjaan: v })}
                        options={pekerjaanLegacyOptions}
                        placeholder="Pilih pekerjaan"
                        searchPlaceholder="Cari pekerjaan…"
                        triggerClassName="h-12"
                      />
                    </div>
                  </div>
                  {keperluan === "tinggal" && (
                    <div className="space-y-2">
                      <Label>Keperluan tinggal</Label>
                      <Select value={p.keperluanTinggal} onValueChange={(v) => updatePenghuni(i, { keperluanTinggal: v })}>
                        <SelectTrigger className="h-12"><SelectValue placeholder="Pilih keperluan" /></SelectTrigger>
                        <SelectContent>
                          {keperluanTinggalOptions.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Tempat kerja</Label>
                    <Input
                      className="h-12"
                      placeholder="Nama perusahaan / usaha"
                      value={p.namaTempatKerja}
                      onChange={(e) => updatePenghuni(i, { namaTempatKerja: e.target.value })}
                    />
                  </div>
                  {umurFromDate(p.tanggalLahir) < 21 && (
                    <div className="space-y-2">
                      <Label>Nama sekolah (usia di bawah 21)</Label>
                      <Input
                        className="h-12"
                        placeholder="Nama sekolah / kampus"
                        value={p.namaSekolah}
                        onChange={(e) => updatePenghuni(i, { namaSekolah: e.target.value })}
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
                        Punya kendaraan (opsional)
                      </Label>
                    </div>
                    {p.kendaraanList.length > 0 && (
                      <div className="space-y-3">
                        {p.kendaraanList.map((k, ki) => (
                          <div key={ki} className="space-y-2 rounded-md border bg-background p-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">Kendaraan {ki + 1}</p>
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
                            <Select value={k.jenis} onValueChange={(v) => updateKendaraan(i, ki, { jenis: v })}>
                              <SelectTrigger><SelectValue placeholder="Jenis kendaraan" /></SelectTrigger>
                              <SelectContent>
                                {jenisKendaraanOptions.map((o) => (
                                  <SelectItem key={o} value={o}>{o}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <PlatNomorInput
                              required
                              idPrefix={`plat-${i}-${ki}`}
                              value={k.platParts}
                              onChange={(platParts) => updateKendaraan(i, ki, { platParts })}
                            />
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={() => addKendaraan(i)}>
                          <Plus className="w-4 h-4" /> Tambah kendaraan
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Foto KTP</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadKtp(f, i).catch(() => toast({ title: "Upload gagal", variant: "destructive" }));
                      }}
                    />
                    {p.fotoKtpPath && <p className="text-xs text-success">KTP sudah terunggah</p>}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="touch-target"
                onClick={() => {
                  if (penghuniIndex > 0) setPenghuniIndex((idx) => idx - 1);
                  else goStep(-1);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                className="flex-1 touch-target"
                onClick={() => {
                  if (!keperluan) return showErr("Keperluan belum dipilih");
                  const err = validateSinglePenghuni(p, keperluan);
                  if (err) return showErr(err);
                  if (penghuniIndex < penghuni.length - 1) {
                    setPenghuniIndex((idx) => idx + 1);
                    return;
                  }
                  goStep(1);
                }}
              >
                {penghuniIndex < penghuni.length - 1 ? (
                  <>Penghuni berikutnya <ChevronRight className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Lanjut <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        );
      })()}

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
            <Label>Catatan (opsional)</Label>
            <Textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              placeholder="Ada info tambahan untuk admin? (boleh dikosongkan)"
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
