import { useState, useEffect, useMemo } from "react";
import { Link, useSearch, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Rw3bizShell } from "@/components/rw3biz-shell";
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
  visitrw3KategoriUsahaOptions,
  visitrw3JenjangAnakOptions,
  JAM_24H_OPTIONS,
} from "@/lib/constants";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Minus,
  BookOpen,
  Home,
  BedDouble,
  Store,
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
  validateJumlahByJenis,
  validateSinglePenghuni,
  validateLokasiWargaSinggah,
  validateJualanFields,
} from "@/lib/visitrw3-validate-pengajuan";
import { PlatNomorInput } from "@/components/gov/plat-nomor-input";
import { FormStepper } from "@/components/gov/form-stepper";
import { SuccessPanel } from "@/components/gov/success-panel";
import { Visitrw3SyaratPanel } from "@/components/gov/visitrw3-syarat-panel";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { settingsRowsToMap } from "@/lib/visitrw3-kontribusi";
import { buildKategoriUsahaPayload } from "@shared/visitrw3-kategori-usaha";
import {
  VISITRW3_ROUTES,
  parseJenisWargaFromSearch,
} from "@/lib/visitrw3-routes";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import {
  JENIS_WARGA_DESKRIPSI,
  JENIS_WARGA_LABEL,
  keperluanFromJenisWarga,
  type JenisWarga,
} from "@shared/visitrw3-jenis-warga";
import { isVisitRw3Jenis } from "@shared/visitrw3-produk";
import { getVisitrw3FormProfile } from "@shared/visitrw3-form-by-jenis";
import type { PengajuanProduct } from "@/lib/visitrw3-produk-ui";

type StepDef = { id: string; label: string };
export type { PengajuanProduct };

const JENIS_CHOICES_VISIT: {
  id: "kontrak" | "kost";
  title: string;
  subtitle: string;
  icon: typeof Home;
  href: string;
}[] = [
  {
    id: "kontrak",
    title: JENIS_WARGA_LABEL.kontrak,
    subtitle: JENIS_WARGA_DESKRIPSI.kontrak,
    icon: Home,
    href: VISITRW3_ROUTES.kontrak.pengajuan,
  },
  {
    id: "kost",
    title: JENIS_WARGA_LABEL.kost,
    subtitle: JENIS_WARGA_DESKRIPSI.kost,
    icon: BedDouble,
    href: VISITRW3_ROUTES.kost.pengajuan,
  },
];

const JENIS_TEMPAT_USAHA = visitrw3JenisTempatUsahaOptions.filter((o) => o.value !== "usaha_rumahan");

function buildPengajuanSteps(jenis: JenisWarga): StepDef[] {
  const steps: StepDef[] = [{ id: "lokasi", label: "Lokasi" }];
  if (jenis === "jualan") steps.push({ id: "usaha", label: "Usaha" });
  steps.push(
    {
      id: "jumlah",
      label: jenis === "jualan" ? "Orang" : jenis === "kost" ? "Isi kamar" : "Keluarga",
    },
    {
      id: "penghuni",
      label: jenis === "jualan" ? "Data orang" : "Data diri",
    },
    { id: "syarat", label: "Syarat" },
    { id: "bayar", label: "Berlaku" },
  );
  return steps;
}

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
  return <PengajuanForm product="visit" />;
}

/** Penyewa ber-KTP RW 03 didata lewat pendataan warga, bukan Visit RW3. */
function AturanKtpRw3({ tegas, className = "" }: { tegas?: boolean; className?: string }) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${tegas ? "border-amber-400 bg-amber-50 text-amber-950" : "border-[hsl(40,45%,55%)] bg-[hsl(40,60%,96%)]"} ${className}`}>
      {tegas ? (
        <p>
          <b>Tidak perlu daftar Visit RW3.</b> Penghuni kost/kontrakan yang KTP-nya RW 03 didata sebagai warga.
          Isi lewat kode kartu pendataan keluarga di{" "}
          <Link href="/isi" className="font-semibold text-brand underline">halaman pendataan warga</Link>, atau minta
          pengurus RT/RW memperbarui data (status tinggal: kost/kontrak).
        </p>
      ) : (
        <ul className="space-y-1">
          <li>✅ Kost/kontrak, <b>KTP luar RW 03</b> → daftar di sini (Visit RW3).</li>
          <li>➡️ Kost/kontrak, <b>KTP RW 03</b> → bukan di sini; didata sebagai warga lewat{" "}
            <Link href="/isi" className="font-semibold text-brand underline">pendataan warga</Link>.
          </li>
        </ul>
      )}
    </div>
  );
}

export function PengajuanForm({ product }: { product: PengajuanProduct }) {
  const { toast } = useToast();
  const search = useSearch();
  const rawJenis = useMemo(() => parseJenisWargaFromSearch(search), [search]);
  const redirectToRw3biz = product === "visit" && rawJenis === "jualan";
  const petugas = useMemo(() => new URLSearchParams(search).get("petugas") === "1", [search]);
  const [ktpRw3, setKtpRw3] = useState<boolean | null>(null);

  const jenisWarga: JenisWarga | "" =
    product === "rw3biz" ? "jualan" : isVisitRw3Jenis(rawJenis) ? rawJenis : "";

  const Shell = product === "rw3biz" ? Rw3bizShell : Visitrw3Shell;
  const hubHref = product === "rw3biz" ? RW3BIZ_ROUTES.hub : VISITRW3_ROUTES.hub;
  const panduanHref = product === "rw3biz" ? RW3BIZ_ROUTES.panduan : VISITRW3_ROUTES.panduan;
  const statusHref = product === "rw3biz" ? RW3BIZ_ROUTES.status : VISITRW3_ROUTES.status;
  const productTitle = product === "rw3biz" ? "RW3BIZ" : "Visit RW3";

  const [step, setStep] = useState(0);
  const [rt, setRt] = useState("");
  const [alamat, setAlamat] = useState("");
  const [nomorUnit, setNomorUnit] = useState("");
  const [namaUsaha, setNamaUsaha] = useState("");
  const [jenisTempatUsaha, setJenisTempatUsaha] = useState("");
  const [jenisTempatUsahaLain, setJenisTempatUsahaLain] = useState("");
  const [kategoriUsaha, setKategoriUsaha] = useState<string[]>([]);
  const [kategoriUsahaLain, setKategoriUsahaLain] = useState("");
  const [penanggungJawab, setPenanggungJawab] = useState("");
  const [jamBuka, setJamBuka] = useState("");
  const [jamTutup, setJamTutup] = useState("");
  const [alamatUsaha, setAlamatUsaha] = useState("");
  const [jumlahDewasa, setJumlahDewasa] = useState(1);
  const [jumlahAnak, setJumlahAnak] = useState(0);
  const jumlah = jumlahDewasa + jumlahAnak;
  const [penghuni, setPenghuni] = useState<PenghuniForm[]>([emptyPenghuni(false)]);
  const [tanggalBayar, setTanggalBayar] = useState("");
  const [terminBulan, setTerminBulan] = useState("3");
  const [previewSampai, setPreviewSampai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [setujuTataTertib, setSetujuTataTertib] = useState(false);
  const [nomorHasil, setNomorHasil] = useState<string | null>(null);
  const [penghuniIndex, setPenghuniIndex] = useState(0);

  const catatanKirim = () => {
    const isi = catatan.trim();
    if (!petugas) return isi || null;
    return `[Diisi petugas dari formulir kertas]${isi ? ` ${isi}` : ""}`;
  };

  const keperluan = jenisWarga ? keperluanFromJenisWarga(jenisWarga) : "tinggal";
  const formProfile = useMemo(
    () => (jenisWarga ? getVisitrw3FormProfile(jenisWarga) : null),
    [jenisWarga],
  );
  const steps = useMemo(
    () => (jenisWarga ? buildPengajuanSteps(jenisWarga) : []),
    [jenisWarga],
  );
  const stepId = steps[step]?.id ?? "lokasi";

  useEffect(() => {
    if (!formProfile) return;
    setTerminBulan(formProfile.defaultTerminBulan);
    if (!formProfile.showAnak) setJumlahAnak(0);
    setJumlahDewasa((d) => Math.min(Math.max(1, d), formProfile.maxDewasa));
  }, [formProfile]);

  const showErr = (msg: string) => {
    toast({ title: "Lengkapi data", description: msg, variant: "destructive" });
  };

  function goStep(delta: number) {
    setStep((s) => Math.min(Math.max(0, s + delta), steps.length - 1));
  }

  const settingsApi =
    product === "rw3biz" ? "/api/public/rw3biz/settings" : "/api/public/visitrw3/settings";
  const previewApi =
    product === "rw3biz"
      ? "/api/public/rw3biz/preview-berlaku"
      : "/api/public/visitrw3/preview-berlaku";
  const uploadKtpApi =
    product === "rw3biz" ? "/api/public/rw3biz/upload-ktp" : "/api/public/visitrw3/upload-ktp";
  const pengajuanApi =
    product === "rw3biz" ? "/api/public/rw3biz/pengajuan" : "/api/public/visitrw3/pengajuan";

  const { data: settingsRows = [], isLoading: settingsLoading } = useQuery({
    queryKey: [settingsApi],
    queryFn: async () => {
      const res = await fetch(settingsApi);
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return readJsonSafely<{ key: string; value: string; updatedAt?: string }[]>(res);
    },
    enabled: Boolean(jenisWarga) || product === "rw3biz",
  });

  const settingsMap = useMemo(() => settingsRowsToMap(settingsRows), [settingsRows]);

  useEffect(() => {
    if (step >= steps.length && steps.length > 0) setStep(Math.max(0, steps.length - 1));
  }, [steps.length, step]);

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
    const maxDewasa = formProfile
      ? Math.min(formProfile.maxDewasa, Math.max(1, formProfile.maxTotal - jumlahAnak))
      : Math.max(1, 20 - jumlahAnak);
    return Math.min(maxDewasa, Math.max(1, n));
  }

  function clampJumlahAnak(n: number) {
    if (!formProfile?.showAnak) return 0;
    const maxAnak = Math.min(
      formProfile.maxAnak,
      Math.max(0, formProfile.maxTotal - jumlahDewasa),
    );
    return Math.min(maxAnak, Math.max(0, n));
  }

  useEffect(() => {
    if (!tanggalBayar || !terminBulan) return;
    apiRequest("POST", previewApi, {
      tanggalBayar,
      terminBulan: parseInt(terminBulan, 10),
    })
      .then((r) => r.json())
      .then((d) => setPreviewSampai(d.tanggalBerlakuSampai))
      .catch(() => setPreviewSampai(""));
  }, [tanggalBayar, terminBulan, previewApi]);

  const penghuniPayload = useMemo(
    () =>
      penghuni.map((p) => {
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
      }),
    [penghuni],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!jenisWarga || !formProfile) throw new Error("Pilih jenis warga dulu");

      if (product === "rw3biz") {
        const orang = penghuniPayload.map((p, idx) => {
          const isPj =
            !p.isAnak &&
            (penanggungJawab.trim()
              ? p.namaLengkap.trim().toLowerCase() === penanggungJawab.trim().toLowerCase()
              : idx === 0);
          return {
            namaLengkap: p.namaLengkap,
            tanggalLahir: p.tanggalLahir,
            isAnak: p.isAnak,
            isPenanggungJawab: Boolean(isPj),
            nik: p.nik,
            nomorWhatsapp: p.nomorWhatsapp,
            jenisKelamin: p.jenisKelamin,
            pekerjaan: null,
            namaTempatKerja: p.namaTempatKerja?.trim() || namaUsaha.trim() || null,
            namaSekolah: p.namaSekolah,
            fotoKtpPath: p.fotoKtpPath,
            punyaKendaraan: p.punyaKendaraan,
            jenisKendaraan: p.jenisKendaraan,
            platNomor: p.platNomor,
          };
        });
        if (!orang.some((o) => o.isPenanggungJawab && !o.isAnak)) {
          const firstDewasa = orang.find((o) => !o.isAnak);
          if (firstDewasa) firstDewasa.isPenanggungJawab = true;
        }
        const res = await apiRequest("POST", pengajuanApi, {
          rt: parseInt(rt, 10),
          alamat: alamat.trim(),
          nomorLokasi: nomorUnit.trim() || null,
          namaUsaha: namaUsaha.trim(),
          jenisTempatUsaha,
          jenisTempatUsahaLain:
            jenisTempatUsaha === "lainnya" ? jenisTempatUsahaLain.trim() : null,
          kategoriUsaha: buildKategoriUsahaPayload(kategoriUsaha, kategoriUsahaLain),
          jamBuka: jamBuka.trim(),
          jamTutup: jamTutup.trim(),
          alamatUsaha: alamatUsaha.trim() || null,
          pjSetujuNotifikasi: true,
          jumlahOrang: jumlah,
          tanggalBayar,
          terminBulan: parseInt(terminBulan, 10),
          catatanPemohon: catatanKirim(),
          orang,
          setujuTataTertib: true as const,
        });
        return readJsonSafely<{ nomorBiz: string; nomorVisitrw3?: string }>(res);
      }

      const payloadPenghuni = penghuniPayload.map((p) => {
        if (p.isAnak) return p;
        return p;
      });
      const res = await apiRequest("POST", pengajuanApi, {
        jenisWarga,
        rt: parseInt(rt, 10),
        alamat: alamat.trim(),
        nomorUnit:
          formProfile.nomorUnitMode === "hidden" ? null : nomorUnit.trim() || null,
        namaUsaha: null,
        jenisTempatUsaha: null,
        jenisTempatUsahaLain: null,
        kategoriUsaha: null,
        jamBuka: null,
        jamTutup: null,
        alamatUsaha: null,
        penanggungJawab: null,
        jumlahPenghuni: jumlah,
        tanggalBayar,
        terminBulan: parseInt(terminBulan, 10),
        catatanPemohon: catatanKirim(),
        penghuni: payloadPenghuni,
        setujuTataTertib: true as const,
      });
      return readJsonSafely<{ nomorVisitrw3: string; nomorBiz?: string }>(res);
    },
    onSuccess: (data) => setNomorHasil(data.nomorBiz || data.nomorVisitrw3 || null),
    onError: (e: unknown) => {
      toast({ title: "Gagal mengirim", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  function toggleKategoriUsaha(kategori: string) {
    setKategoriUsaha((prev) =>
      prev.includes(kategori) ? prev.filter((k) => k !== kategori) : [...prev, kategori],
    );
  }

  async function uploadKtp(file: File, index: number) {
    if (!file.type.startsWith("image/")) {
      throw new Error("File harus berupa gambar");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Ukuran foto maksimal 5 MB");
    }

    const applyPath = (pathOrData: string) => {
      setPenghuni((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], fotoKtpPath: pathOrData };
        return next;
      });
    };

    // Coba unggah ke server; jika gagal (404/dll), simpan data URL lokal
    // — server sudah mendukung path yang diawali data:image/
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(uploadKtpApi, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({} as { message?: string; path?: string }));
      if (res.ok && body.path) {
        applyPath(body.path);
        return;
      }
      // Endpoint belum deploy / error — lanjut fallback
      console.warn("Upload KTP server gagal, pakai data URL:", body.message || res.status);
    } catch (err) {
      console.warn("Upload KTP network error, pakai data URL:", err);
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Gagal membaca foto KTP"));
      reader.readAsDataURL(file);
    });
    applyPath(dataUrl);
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

  if (redirectToRw3biz) {
    return <Redirect to={RW3BIZ_ROUTES.pengajuan} />;
  }

  if (nomorHasil) {
    return (
      <Shell title="Pengajuan" backHref={hubHref}>
        <SuccessPanel
          title="Pengajuan terkirim"
          referenceLabel={product === "rw3biz" ? "Nomor RW3BIZ" : "Nomor Visit RW3"}
          referenceValue={nomorHasil}
          nextSteps={[
            "Simpan nomor ini untuk cek status dan perpanjang nanti.",
            "Admin RW akan melakukan survey kelengkapan data.",
            "Anda akan dihubungi lewat WhatsApp jika diperlukan klarifikasi.",
          ]}
          primaryAction={{ label: "Cek status", href: statusHref }}
          secondaryAction={{ label: `Kembali ke ${productTitle}`, href: hubHref }}
        />
      </Shell>
    );
  }

  if (!jenisWarga) {
    return (
      <Shell title="Pengajuan baru" backHref={hubHref}>
        <FeatureExplain title="Pilih jenis tinggal" className="mb-4">
          <p>
            Visit RW3 hanya untuk <strong>ngontrak</strong> dan <strong>ngekost</strong> dengan{" "}
            <strong>KTP luar RW 03</strong>. Untuk jualan/usaha, gunakan{" "}
            <Link href={RW3BIZ_ROUTES.hub} className="text-brand font-medium underline">
              RW3BIZ
            </Link>
            .
          </p>
        </FeatureExplain>
        <AturanKtpRw3 className="mb-4" />
        <div className="space-y-2">
          {JENIS_CHOICES_VISIT.map((opt) => {
            const Icon = opt.icon;
            return (
              <Link
                key={opt.id}
                href={opt.href}
                className="block w-full text-left rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40 touch-target"
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="font-semibold text-sm">{opt.title}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{opt.subtitle}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 self-center" />
                </div>
              </Link>
            );
          })}
          <Link
            href={RW3BIZ_ROUTES.pengajuan}
            className="block w-full text-left rounded-xl border border-dashed border-border bg-muted/20 p-4 transition-colors hover:border-brand/40 touch-target"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/20 text-muted-foreground flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="font-semibold text-sm">Jualan / usaha → RW3BIZ</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Layanan terpisah untuk izin berjualan di RW 03
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 self-center" />
            </div>
          </Link>
        </div>
        <Link
          href={panduanHref}
          className="inline-flex items-center gap-1.5 text-sm text-brand font-medium mt-4 hover:underline"
        >
          <BookOpen className="w-4 h-4" />
          Baca panduan dulu
        </Link>
      </Shell>
    );
  }

  if (product === "visit" && (jenisWarga === "kontrak" || jenisWarga === "kost") && ktpRw3 !== false) {
    return (
      <Shell title={`Pengajuan — ${JENIS_WARGA_LABEL[jenisWarga]}`} backHref={hubHref}>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="font-semibold">Sebelum mulai: KTP {petugas ? "penghuni" : "Anda"} beralamat di mana?</p>
          <p className="text-sm text-muted-foreground">
            Visit RW3 khusus penghuni kost/kontrakan dengan KTP luar RW 03. Penghuni ber-KTP RW 03 didata sebagai warga.
          </p>
          <div className="grid gap-2">
            <Button variant="outline" className="h-auto justify-start py-3 text-left whitespace-normal" onClick={() => setKtpRw3(true)}>
              KTP RW 03 Kelurahan Padasuka
            </Button>
            <Button className="h-auto justify-start py-3 text-left whitespace-normal" onClick={() => setKtpRw3(false)}>
              KTP luar RW 03 (daerah lain) — lanjut isi Visit RW3
            </Button>
          </div>
          {ktpRw3 === true && <AturanKtpRw3 tegas />}
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={
        product === "rw3biz"
          ? "Pengajuan izin usaha"
          : `Pengajuan — ${JENIS_WARGA_LABEL[jenisWarga]}`
      }
      backHref={hubHref}
    >
      <FeatureExplain title="Sebelum mulai" className="mb-3">
        <p>{formProfile?.explainSebelum}</p>
        <p>
          Isi form langkah demi langkah — tekan <strong>Lanjut</strong> setelah setiap bagian.
          Setelah kirim, simpan nomor VRW3-… dan pantau status atau tunggu WhatsApp dari pengurus.
        </p>
      </FeatureExplain>
      <Link
        href={panduanHref}
        className="inline-flex items-center gap-1.5 text-sm text-brand font-medium mb-4 hover:underline"
      >
        <BookOpen className="w-4 h-4" />
        Bingung? Baca panduan
      </Link>
      {petugas && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Mode petugas:</b> diisi petugas dari formulir kertas. Salin isian sesuai formulir, foto KTP dari fotokopi yang dilampirkan.
          Pengajuan tetap masuk antrean survey seperti biasa.
        </div>
      )}
      <FormStepper steps={steps} currentStep={step} />

      {stepId === "lokasi" && formProfile && (
        <div className="space-y-4">
          <MicroStepHeader
            current={1}
            total={1}
            title={formProfile.lokasiTitle}
            hint={formProfile.lokasiHint}
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
            <Label>{formProfile.alamatLabel}</Label>
            <Textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              rows={3}
              placeholder={formProfile.alamatPlaceholder}
              className="min-h-[88px]"
            />
          </div>
          {formProfile.nomorUnitMode !== "hidden" && (
            <div className="space-y-2">
              <Label>{formProfile.nomorUnitLabel}</Label>
              <Input
                className="h-12"
                placeholder={formProfile.nomorUnitPlaceholder}
                value={nomorUnit}
                onChange={(e) => setNomorUnit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{formProfile.nomorUnitHint}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Link href={hubHref}>
              <Button variant="outline" className="touch-target">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateLokasiWargaSinggah({
                  rt,
                  alamat,
                  jenisWarga,
                  nomorUnit,
                });
                if (err) return showErr(err);
                goStep(1);
              }}
            >
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "usaha" && (
        <div className="space-y-4">
          <MicroStepHeader
            current={1}
            total={1}
            title="Data usaha"
            hint="Isi identitas usaha dan penanggung jawab di RW 03."
          />
          <div className="space-y-2">
            <Label>Nama usaha *</Label>
            <Input
              value={namaUsaha}
              onChange={(e) => setNamaUsaha(e.target.value)}
              placeholder="Contoh: Warung Bu Siti"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Jenis tempat usaha *</Label>
            <Select value={jenisTempatUsaha} onValueChange={setJenisTempatUsaha}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent>
                {JENIS_TEMPAT_USAHA.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {jenisTempatUsaha === "lainnya" && (
            <div className="space-y-2">
              <Label>Jenis usaha lainnya *</Label>
              <Input
                value={jenisTempatUsahaLain}
                onChange={(e) => setJenisTempatUsahaLain(e.target.value)}
                placeholder="Contoh: bengkel keliling"
                className="h-12"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Kategori usaha *</Label>
            <p className="text-xs text-muted-foreground">
              Bisa pilih lebih dari satu
              {kategoriUsaha.length > 0 && (
                <span className="text-brand font-medium"> · {kategoriUsaha.length} dipilih</span>
              )}
            </p>
            <div className="rounded-xl border bg-card p-3 max-h-64 overflow-y-auto space-y-2">
              {visitrw3KategoriUsahaOptions.map((kategori) => (
                <div key={kategori} className="flex items-start gap-2">
                  <Checkbox
                    id={`kategori-${kategori}`}
                    checked={kategoriUsaha.includes(kategori)}
                    onCheckedChange={() => toggleKategoriUsaha(kategori)}
                  />
                  <Label htmlFor={`kategori-${kategori}`} className="font-normal text-sm leading-snug">
                    {kategori}
                  </Label>
                </div>
              ))}
            </div>
            {kategoriUsaha.includes("Lainnya") && (
              <Input
                value={kategoriUsahaLain}
                onChange={(e) => setKategoriUsahaLain(e.target.value)}
                placeholder="Contoh: rental PS, jual es batu"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jam buka *</Label>
              <Select value={jamBuka || undefined} onValueChange={setJamBuka}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="00:00" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {JAM_24H_OPTIONS.map((jam) => (
                    <SelectItem key={`buka-${jam}`} value={jam}>
                      {jam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jam tutup *</Label>
              <Select value={jamTutup || undefined} onValueChange={setJamTutup}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="23:59" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {JAM_24H_OPTIONS.map((jam) => (
                    <SelectItem key={`tutup-${jam}`} value={jam}>
                      {jam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Format 24 jam (00:00–23:59), tanpa AM/PM. Petugas survey menyesuaikan kunjungan dengan jam buka.
          </p>
          <div className="space-y-2">
            <Label>Alamat usaha (jika berbeda dari lokasi sebelumnya)</Label>
            <Textarea
              value={alamatUsaha}
              onChange={(e) => setAlamatUsaha(e.target.value)}
              rows={2}
              placeholder="Kosongkan jika sama dengan alamat lokasi usaha"
            />
          </div>
          <div className="space-y-2">
            <Label>Nama penanggung jawab *</Label>
            <Input
              value={penanggungJawab}
              onChange={(e) => setPenanggungJawab(e.target.value)}
              placeholder="Nama lengkap pemilik / PJ usaha"
              className="h-12"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="touch-target" onClick={() => goStep(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateJualanFields({
                  namaUsaha,
                  jenisTempatUsaha,
                  jenisTempatUsahaLain,
                  kategoriUsaha,
                  kategoriUsahaLain,
                  penanggungJawab,
                  jamBuka,
                  jamTutup,
                  alamatUsaha,
                  requireJamOperasional: true,
                });
                if (err) return showErr(err);
                goStep(1);
              }}
            >
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "jumlah" && formProfile && (
        <div className="space-y-4">
          <MicroStepHeader
            current={1}
            total={1}
            title={formProfile.jumlahTitle}
            hint={formProfile.jumlahHint}
          />
          <JumlahStepper
            label={formProfile.dewasaLabel}
            value={jumlahDewasa}
            min={1}
            max={formProfile.maxDewasa}
            onChange={(n) => setJumlahDewasa(clampJumlahDewasa(n))}
            hint={formProfile.dewasaHint}
          />
          {formProfile.showAnak && (
            <JumlahStepper
              label="Anak"
              value={jumlahAnak}
              min={0}
              max={formProfile.maxAnak}
              onChange={(n) => setJumlahAnak(clampJumlahAnak(n))}
              hint={formProfile.anakHint}
            />
          )}
          <p className="text-sm font-medium text-center text-brand">
            Total {jumlah} {formProfile.orangLabel}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="touch-target" onClick={() => goStep(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateJumlahByJenis(jumlahDewasa, jumlahAnak, formProfile);
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

      {stepId === "penghuni" &&
        (() => {
          const i = penghuniIndex;
          const p = penghuni[i];
          if (!p) return null;
          return (
            <div className="space-y-4">
              <MicroStepHeader
                current={penghuniIndex + 1}
                total={penghuni.length}
                title={penghuniHeading(p, i)}
                hint={
                  p.isAnak
                    ? "Anak cukup nama, tanggal lahir, dan jenjang sekolah."
                    : jenisWarga === "jualan"
                      ? "Data diri pekerja / penanggung jawab di lokasi usaha."
                      : jenisWarga === "kost"
                        ? "Data diri penghuni kamar (KTP & WhatsApp wajib)."
                        : "Data diri penghuni kontrakan — isi satu per satu."
                }
              />
              <div
                className={`rounded-xl border p-4 space-y-4 ${
                  p.isAnak ? "border-dashed bg-muted/20" : "bg-card"
                }`}
              >
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
                    <Select
                      value={p.namaSekolah}
                      onValueChange={(v) => updatePenghuni(i, { namaSekolah: v })}
                    >
                      <SelectTrigger className="h-12">
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
                        onChange={(e) =>
                          updatePenghuni(i, { nik: e.target.value.replace(/\D/g, "") })
                        }
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
                    <div
                      className={
                        formProfile?.requirePekerjaan !== false
                          ? "grid grid-cols-2 gap-3"
                          : "space-y-2"
                      }
                    >
                      <div className="space-y-2">
                        <Label>Jenis kelamin</Label>
                        <Select
                          value={p.jenisKelamin}
                          onValueChange={(v) => updatePenghuni(i, { jenisKelamin: v })}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formProfile?.requirePekerjaan !== false && (
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
                      )}
                    </div>
                    {formProfile?.requireKeperluanTinggal && (
                      <div className="space-y-2">
                        <Label>Keperluan tinggal *</Label>
                        <Select
                          value={p.keperluanTinggal}
                          onValueChange={(v) => updatePenghuni(i, { keperluanTinggal: v })}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Pilih keperluan" />
                          </SelectTrigger>
                          <SelectContent>
                            {(formProfile.keperluanTinggalOptions.length
                              ? formProfile.keperluanTinggalOptions
                              : keperluanTinggalOptions
                            ).map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>{formProfile?.tempatKerjaLabel ?? "Tempat kerja"} *</Label>
                      <Input
                        className="h-12"
                        placeholder={
                          formProfile?.tempatKerjaPlaceholder ?? "Nama perusahaan / usaha"
                        }
                        value={p.namaTempatKerja}
                        onChange={(e) => updatePenghuni(i, { namaTempatKerja: e.target.value })}
                        onFocus={() => {
                          if (
                            jenisWarga === "jualan" &&
                            !p.namaTempatKerja.trim() &&
                            namaUsaha.trim()
                          ) {
                            updatePenghuni(i, { namaTempatKerja: namaUsaha.trim() });
                          }
                        }}
                      />
                      {jenisWarga === "jualan" && namaUsaha.trim() && !p.namaTempatKerja.trim() && (
                        <button
                          type="button"
                          className="text-xs text-brand font-medium hover:underline"
                          onClick={() =>
                            updatePenghuni(i, { namaTempatKerja: namaUsaha.trim() })
                          }
                        >
                          Pakai nama usaha: {namaUsaha.trim()}
                        </button>
                      )}
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
                              <Select
                                value={k.jenis}
                                onValueChange={(v) => updateKendaraan(i, ki, { jenis: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Jenis kendaraan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {jenisKendaraanOptions.map((o) => (
                                    <SelectItem key={o} value={o}>
                                      {o}
                                    </SelectItem>
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-1"
                            onClick={() => addKendaraan(i)}
                          >
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
                          if (f)
                            void uploadKtp(f, i).catch((err: unknown) =>
                              toast({
                                title: "Upload gagal",
                                description: err instanceof Error ? err.message : "Coba lagi",
                                variant: "destructive",
                              }),
                            );
                        }}
                      />
                      {p.fotoKtpPath && (
                        <p className="text-xs text-success">KTP sudah terunggah ✓</p>
                      )}
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
                    const err = validateSinglePenghuni(p, {
                      keperluan,
                      requireKeperluanTinggal: formProfile?.requireKeperluanTinggal ?? false,
                      requirePekerjaan: formProfile?.requirePekerjaan ?? true,
                      requireTempatKerja: formProfile?.requireTempatKerja ?? true,
                      tempatKerjaLabel: formProfile?.tempatKerjaLabel,
                    });
                    if (err) return showErr(err);
                    if (penghuniIndex < penghuni.length - 1) {
                      setPenghuniIndex((idx) => idx + 1);
                      return;
                    }
                    goStep(1);
                  }}
                >
                  {penghuniIndex < penghuni.length - 1 ? (
                    <>
                      {jenisWarga === "jualan" ? "Orang berikutnya" : "Penghuni berikutnya"}{" "}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Lanjut <ChevronRight className="w-4 h-4 ml-1" />
                    </>
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
            <Button variant="outline" onClick={() => goStep(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateStepSyarat(setujuTataTertib);
                if (err) return showErr(err);
                goStep(1);
              }}
            >
              Lanjut ke masa berlaku <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "bayar" && (
        <div className="space-y-4">
          <MicroStepHeader
            current={1}
            total={1}
            title="Masa berlaku"
            hint={formProfile?.bayarHint ?? "Tanggal bayar dan termin menentukan sampai kapan izin berlaku."}
          />
          <div className="space-y-2">
            <Label>Tanggal bayar *</Label>
            <Input
              type="date"
              value={tanggalBayar}
              onChange={(e) => setTanggalBayar(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Termin *</Label>
            <Select value={terminBulan} onValueChange={setTerminBulan}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMIN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
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
            <Label>Catatan (opsional)</Label>
            <Textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              placeholder="Ada info tambahan untuk admin? (boleh dikosongkan)"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => goStep(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
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
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Kirim pengajuan"
              )}
            </Button>
          </div>
        </div>
      )}
    </Shell>
  );
}
