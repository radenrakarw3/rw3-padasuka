import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Ban,
  Calculator,
  Camera,
  Check,
  ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Receipt,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3ChipFilters,
  Visitrw3EmptyState,
  Visitrw3ListItem,
  Visitrw3MonoId,
  Visitrw3Panel,
} from "@/components/admin/visitrw3-admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, queryClient, readJsonSafely } from "@/lib/queryClient";
import { compressImageToDataUrl } from "@/lib/image-compress";
import { toWaMeUrl } from "@/lib/wa";
import {
  JENIS_PELANGGARAN,
  JENIS_PELANGGARAN_INFO,
  TINGKAT_PELANGGARAN,
  TINGKAT_PELANGGARAN_LABEL,
  bulanIni,
  formatRp,
  type JenisPelanggaran,
  type TingkatPelanggaran,
} from "@shared/rw3biz-kontribusi";

type UsahaRingkas = { id: number; nomorBiz: string; nomorInduk: string | null; namaUsaha: string; pjNama: string; pjNomorWhatsapp: string };

type DendaStatus = "tidak_ada" | "belum" | "lunas" | "dibebaskan";
type StatusPelanggaran = "menunggu_verifikasi" | "terbukti" | "tidak_terbukti";

type PelanggaranRow = {
  id: number;
  nomorAduan: string;
  usahaId: number | null;
  namaUsahaLain: string | null;
  jenis: JenisPelanggaran;
  jenisLabel: string;
  tingkat: TingkatPelanggaran;
  sumber: "aduan_warga" | "temuan_petugas";
  tanggalKejadian: string;
  lokasi: string | null;
  uraian: string;
  adaFoto: boolean;
  pelaporNama: string | null;
  pelaporWa: string | null;
  pelaporRt: number | null;
  status: StatusPelanggaran;
  keBerapa: number;
  denda: number;
  dendaRincian: string | null;
  dendaStatus: DendaStatus;
  tanggalBayar: string | null;
  alasanBebas: string | null;
  catatanVerifikasi: string | null;
  usaha: UsahaRingkas | null;
  nomorKwitansi: string | null;
};

type Pratinjau = { keBerapa: number; denda: number; teguran: boolean; rincian: string };

const TANPA_USAHA = "— Usaha belum terdaftar RW3BIZ —";

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const STATUS_LABEL: Record<StatusPelanggaran, string> = {
  menunggu_verifikasi: "Menunggu verifikasi",
  terbukti: "Terbukti",
  tidak_terbukti: "Tidak terbukti",
};

const DENDA_LABEL: Record<DendaStatus, string> = {
  tidak_ada: "Teguran tertulis (tanpa denda)",
  belum: "Denda belum dibayar",
  lunas: "Denda lunas",
  dibebaskan: "Denda dibebaskan",
};

const angka = (s: string) => (s.trim() === "" ? null : parseInt(s, 10) || 0);

function PilihJenisTingkat({
  jenis,
  tingkat,
  dasarManual,
  onChange,
}: {
  jenis: JenisPelanggaran;
  tingkat: TingkatPelanggaran;
  dasarManual: string;
  onChange: (p: { jenis?: JenisPelanggaran; tingkat?: TingkatPelanggaran; dasarManual?: string }) => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label>Jenis pelanggaran</Label>
        <Select value={jenis} onValueChange={(v) => onChange({ jenis: v as JenisPelanggaran })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {JENIS_PELANGGARAN.map((j) => (
              <SelectItem key={j} value={j}>{JENIS_PELANGGARAN_INFO[j].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{JENIS_PELANGGARAN_INFO[jenis].contoh}</p>
      </div>
      <div className="space-y-1">
        <Label>Tingkat</Label>
        <Select value={tingkat} onValueChange={(v) => onChange({ tingkat: v as TingkatPelanggaran })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TINGKAT_PELANGGARAN.map((t) => (
              <SelectItem key={t} value={t}>{TINGKAT_PELANGGARAN_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Berat: berdampak luas / membahayakan — langsung didenda walau pertama kali.</p>
      </div>
      {jenis === "lainnya" && (
        <div className="space-y-1">
          <Label>Denda dasar (Rp) *</Label>
          <Input inputMode="numeric" value={dasarManual} onChange={(e) => onChange({ dasarManual: e.target.value.replace(/\D/g, "") })} />
        </div>
      )}
    </>
  );
}

function KotakDenda({ p, denda, setDenda }: { p: Pratinjau; denda: string; setDenda: (v: string) => void }) {
  return (
    <div className={`space-y-2 rounded-lg border p-3 text-sm ${p.denda > 0 ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5"}`}>
      <p className="font-medium">Pelanggaran ke-{p.keBerapa} dalam 12 bulan</p>
      <p className="text-xs text-muted-foreground break-words">{p.rincian}</p>
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Denda (Rp) — bisa diubah</Label>
          <Input className="w-full sm:h-9 sm:w-40" inputMode="numeric" value={denda} onChange={(e) => setDenda(e.target.value.replace(/\D/g, ""))} />
        </div>
        <p className="text-xs text-muted-foreground sm:pb-2">Rumus: {p.teguran ? "teguran" : formatRp(p.denda)}</p>
      </div>
    </div>
  );
}

export default function AdminRw3bizPelanggaran() {
  const { toast } = useToast();
  const [bulan, setBulan] = useState(bulanIni());
  const [filterStatus, setFilterStatus] = useState<"semua" | StatusPelanggaran>("semua");
  const [filterDenda, setFilterDenda] = useState<"semua" | "belum" | "lunas">("semua");
  const [cari, setCari] = useState("");

  const temuanKosong = () => ({
    usahaLabel: TANPA_USAHA,
    namaUsahaLain: "",
    jenis: "sampah_tercecer" as JenisPelanggaran,
    tingkat: "sedang" as TingkatPelanggaran,
    dasarManual: "",
    tanggalKejadian: hariIni(),
    lokasi: "",
    uraian: "",
    foto: "",
  });
  const [temuan, setTemuan] = useState(temuanKosong);
  const [pratinjauTemuan, setPratinjauTemuan] = useState<Pratinjau | null>(null);
  const [dendaTemuan, setDendaTemuan] = useState("");
  const ubahTemuan = (patch: Partial<ReturnType<typeof temuanKosong>>) => {
    setTemuan((t) => ({ ...t, ...patch }));
    setPratinjauTemuan(null);
  };

  const [verif, setVerif] = useState<PelanggaranRow | null>(null);
  const [verifForm, setVerifForm] = useState({ usahaLabel: TANPA_USAHA, jenis: "lainnya" as JenisPelanggaran, tingkat: "sedang" as TingkatPelanggaran, dasarManual: "", catatan: "" });
  const [dendaVerif, setDendaVerif] = useState("");
  const [bayar, setBayar] = useState<PelanggaranRow | null>(null);
  const [tanggalBayar, setTanggalBayar] = useState(hariIni());
  const [pembayar, setPembayar] = useState("");
  const [bebas, setBebas] = useState<PelanggaranRow | null>(null);
  const [alasanBebas, setAlasanBebas] = useState("");

  const { data: usahaList = [] } = useQuery<UsahaRingkas[]>({
    queryKey: ["/api/admin/rw3biz/usaha"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/usaha", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat usaha");
      return res.json();
    },
    staleTime: 60_000,
  });
  const labelUsaha = (u: UsahaRingkas) => `${u.nomorInduk ?? u.nomorBiz} — ${u.namaUsaha}`;
  const opsiUsaha = useMemo(() => [TANPA_USAHA, ...usahaList.map(labelUsaha)], [usahaList]);
  const usahaDari = (label: string) => usahaList.find((u) => labelUsaha(u) === label) ?? null;

  const { data: semua = [], isLoading } = useQuery<PelanggaranRow[]>({
    queryKey: ["/api/admin/rw3biz/pelanggaran", bulan],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rw3biz/pelanggaran?bulan=${bulan}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat pelanggaran");
      return res.json();
    },
  });
  const { data: menungguSemua = [] } = useQuery<PelanggaranRow[]>({
    queryKey: ["/api/admin/rw3biz/pelanggaran", "menunggu"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/pelanggaran?status=menunggu_verifikasi", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat aduan");
      return res.json();
    },
  });

  const list = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const sumber = filterStatus === "menunggu_verifikasi" ? menungguSemua : semua;
    return sumber.filter((r) => {
      if (filterStatus !== "semua" && r.status !== filterStatus) return false;
      if (filterDenda !== "semua" && r.dendaStatus !== filterDenda) return false;
      if (q && !`${r.usaha?.namaUsaha ?? ""} ${r.namaUsahaLain ?? ""} ${r.usaha?.nomorInduk ?? ""} ${r.nomorAduan}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [semua, menungguSemua, filterStatus, filterDenda, cari]);

  const ringkas = useMemo(
    () => ({
      total: semua.length,
      menunggu: menungguSemua.length,
      terbukti: semua.filter((r) => r.status === "terbukti").length,
      tidak: semua.filter((r) => r.status === "tidak_terbukti").length,
      dendaBelum: semua.filter((r) => r.dendaStatus === "belum").reduce((s, r) => s + r.denda, 0),
      dendaMasuk: semua.filter((r) => r.dendaStatus === "lunas").reduce((s, r) => s + r.denda, 0),
    }),
    [semua, menungguSemua],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/pelanggaran"] });
  const gagal = (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" });

  const usahaTemuan = usahaDari(temuan.usahaLabel);
  const hitungTemuan = useMutation({
    mutationFn: async () =>
      readJsonSafely<Pratinjau>(
        await apiRequest("POST", "/api/admin/rw3biz/pelanggaran/pratinjau", {
          usahaId: usahaTemuan?.id ?? null,
          jenis: temuan.jenis,
          tingkat: temuan.tingkat,
          tanggalKejadian: temuan.tanggalKejadian,
          dasarManual: angka(temuan.dasarManual),
        }),
      ),
    onSuccess: (p) => {
      setPratinjauTemuan(p);
      setDendaTemuan(String(p.denda));
    },
    onError: gagal,
  });

  const simpanTemuan = useMutation({
    mutationFn: async () =>
      readJsonSafely<PelanggaranRow>(
        await apiRequest("POST", "/api/admin/rw3biz/pelanggaran", {
          usahaId: usahaTemuan?.id ?? null,
          namaUsahaLain: usahaTemuan ? null : temuan.namaUsahaLain || null,
          jenis: temuan.jenis,
          tingkat: temuan.tingkat,
          tanggalKejadian: temuan.tanggalKejadian,
          lokasi: temuan.lokasi || null,
          uraian: temuan.uraian,
          foto: temuan.foto || null,
          dasarManual: angka(temuan.dasarManual),
          denda: angka(dendaTemuan),
        }),
      ),
    onSuccess: (r) => {
      toast({ title: "Pelanggaran dicatat", description: r.denda > 0 ? `Denda ${formatRp(r.denda)} menunggu pembayaran` : "Teguran tertulis" });
      setTemuan(temuanKosong());
      setPratinjauTemuan(null);
      invalidate();
    },
    onError: gagal,
  });

  const usahaVerif = usahaDari(verifForm.usahaLabel);
  const pratinjauVerif = useQuery<Pratinjau>({
    queryKey: ["pratinjau-verif", verif?.id, usahaVerif?.id, verifForm.jenis, verifForm.tingkat, verifForm.dasarManual],
    enabled: verif != null && (verifForm.jenis !== "lainnya" || verifForm.dasarManual !== ""),
    queryFn: async () =>
      readJsonSafely<Pratinjau>(
        await apiRequest("POST", "/api/admin/rw3biz/pelanggaran/pratinjau", {
          usahaId: usahaVerif?.id ?? null,
          jenis: verifForm.jenis,
          tingkat: verifForm.tingkat,
          tanggalKejadian: verif!.tanggalKejadian,
          dasarManual: angka(verifForm.dasarManual),
          kecualiId: verif!.id,
        }),
      ),
  });
  useEffect(() => {
    if (pratinjauVerif.data) setDendaVerif(String(pratinjauVerif.data.denda));
  }, [pratinjauVerif.data]);

  const bukaVerif = (r: PelanggaranRow) => {
    setVerif(r);
    setVerifForm({
      usahaLabel: r.usaha ? labelUsaha(r.usaha) : TANPA_USAHA,
      jenis: r.jenis,
      tingkat: r.tingkat,
      dasarManual: "",
      catatan: "",
    });
  };

  const verifikasi = useMutation({
    mutationFn: async (terbukti: boolean) => {
      if (!verif) return null;
      return readJsonSafely<PelanggaranRow>(
        await apiRequest("POST", `/api/admin/rw3biz/pelanggaran/${verif.id}/verifikasi`, {
          terbukti,
          usahaId: usahaVerif?.id ?? null,
          jenis: verifForm.jenis,
          tingkat: verifForm.tingkat,
          dasarManual: angka(verifForm.dasarManual),
          denda: terbukti ? angka(dendaVerif) : null,
          catatan: verifForm.catatan || null,
        }),
      );
    },
    onSuccess: (r) => {
      toast({
        title: r?.status === "terbukti" ? "Aduan terbukti" : "Aduan ditutup",
        description: r?.status === "terbukti" ? (r.denda > 0 ? `Denda ${formatRp(r.denda)}` : "Teguran tertulis") : "Tidak terbukti",
      });
      setVerif(null);
      invalidate();
    },
    onError: gagal,
  });

  const bayarMutation = useMutation({
    mutationFn: async () => {
      if (!bayar) return null;
      return readJsonSafely<{ id: number; nomorKwitansi: string }>(
        await apiRequest("POST", `/api/admin/rw3biz/pelanggaran/${bayar.id}/bayar`, { tanggal: tanggalBayar, pembayarNama: pembayar || null }),
      );
    },
    onSuccess: (r) => {
      toast({ title: "Denda dicatat", description: `Masuk Kas RW · kwitansi ${r?.nomorKwitansi ?? ""}` });
      if (r?.id) window.open(`/api/admin/rw3biz/pelanggaran/${r.id}/kwitansi`, "_blank", "noopener");
      setBayar(null);
      invalidate();
    },
    onError: gagal,
  });

  const aksi = useMutation({
    mutationFn: async ({ id, jenis, body }: { id: number; jenis: "batal" | "bebaskan" | "hapus"; body?: unknown }) => {
      if (jenis === "hapus") return readJsonSafely(await apiRequest("DELETE", `/api/admin/rw3biz/pelanggaran/${id}`));
      return readJsonSafely(await apiRequest("POST", `/api/admin/rw3biz/pelanggaran/${id}/${jenis}`, body ?? {}));
    },
    onSuccess: () => {
      toast({ title: "Tersimpan" });
      setBebas(null);
      invalidate();
    },
    onError: gagal,
  });

  const pilihFoto = async (file?: File) => {
    if (!file) return;
    try {
      ubahTemuan({ foto: await compressImageToDataUrl(file, { maxSide: 1280, quality: 0.7 }) });
    } catch {
      toast({ title: "Foto gagal dibaca", variant: "destructive" });
    }
  };

  const namaUsaha = (r: PelanggaranRow) =>
    r.usaha ? `${r.usaha.namaUsaha} (${r.usaha.nomorInduk ?? r.usaha.nomorBiz})` : r.namaUsahaLain ? `${r.namaUsahaLain} (belum terdaftar)` : "-";

  const siapHitung =
    (usahaTemuan || temuan.namaUsahaLain.trim().length >= 2) &&
    temuan.uraian.trim().length >= 5 &&
    (temuan.jenis !== "lainnya" || temuan.dasarManual !== "");

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="Pelanggaran & aduan"
        description="Aduan warga (dari halaman publik) dan temuan petugas: sampah tercecer, kebisingan, parkir, limbah, jam operasional, kerusakan fasum, data tidak sesuai. Denda = dasar × tingkat × pengulangan 12 bulan, masuk Kas RW."
        actions={
          <Input
            type="month"
            aria-label="Bulan pelanggaran"
            value={bulan}
            onChange={(e) => e.target.value && setBulan(e.target.value)}
            className="w-full sm:h-9 sm:w-40"
          />
        }
      />

      <Visitrw3Panel
        title="Catat temuan petugas"
        description="Pelanggaran yang dilihat langsung petugas — langsung ditetapkan terbukti."
        className="overflow-clip"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Usaha</Label>
            <SearchableSelect
              value={temuan.usahaLabel}
              onValueChange={(v) => ubahTemuan({ usahaLabel: v })}
              options={opsiUsaha}
              searchPlaceholder="Cari nama usaha / NIU"
            />
          </div>
          {!usahaTemuan && (
            <div className="space-y-1 sm:col-span-2">
              <Label>Nama usaha (belum terdaftar) *</Label>
              <Input value={temuan.namaUsahaLain} onChange={(e) => ubahTemuan({ namaUsahaLain: e.target.value })} />
            </div>
          )}
          <PilihJenisTingkat
            jenis={temuan.jenis}
            tingkat={temuan.tingkat}
            dasarManual={temuan.dasarManual}
            onChange={(p) => ubahTemuan(p)}
          />
          <div className="space-y-1">
            <Label>Tanggal kejadian</Label>
            <Input type="date" value={temuan.tanggalKejadian} max={hariIni()} onChange={(e) => ubahTemuan({ tanggalKejadian: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Lokasi</Label>
            <Input value={temuan.lokasi} onChange={(e) => ubahTemuan({ lokasi: e.target.value })} placeholder="Contoh: depan toko, selokan RT 03" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Uraian *</Label>
            <Textarea rows={2} value={temuan.uraian} onChange={(e) => ubahTemuan({ uraian: e.target.value })} placeholder="Apa yang terjadi, dampaknya ke warga" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Foto bukti (opsional)</Label>
            <div className="flex items-center gap-2">
              <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/30 px-3 text-sm font-medium hover:bg-muted/60 focus-within:ring-2 focus-within:ring-ring sm:min-h-10">
                <Camera className="h-5 w-5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
                <span className="truncate">{temuan.foto ? "Ganti foto" : "Ambil / pilih foto"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    pilihFoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {temuan.foto && (
                <>
                  <img src={temuan.foto} alt="Bukti" className="h-12 w-12 shrink-0 rounded object-cover sm:h-10 sm:w-10" />
                  <Button size="icon" variant="ghost" className="shrink-0" onClick={() => ubahTemuan({ foto: "" })} aria-label="Hapus foto">
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        {pratinjauTemuan && (
          <div className="mt-3">
            <KotakDenda p={pratinjauTemuan} denda={dendaTemuan} setDenda={setDendaTemuan} />
          </div>
        )}
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-3 grid grid-cols-2 gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:flex-wrap sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button variant="outline" className="gap-1 px-3 sm:px-4" disabled={!siapHitung || hitungTemuan.isPending} onClick={() => hitungTemuan.mutate()}>
            {hitungTemuan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />} Hitung denda
          </Button>
          <Button className="gap-1" disabled={!pratinjauTemuan || simpanTemuan.isPending} onClick={() => simpanTemuan.mutate()}>
            <Check className="h-4 w-4" /> Simpan<span className="hidden sm:inline"> pelanggaran</span>
          </Button>
        </div>
      </Visitrw3Panel>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Aduan menunggu verifikasi</p>
          <p className="font-semibold tabular-nums text-warning">{ringkas.menunggu}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Terbukti {bulan}</p>
          <p className="font-semibold tabular-nums text-destructive">{ringkas.terbukti}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Denda belum dibayar</p>
          <p className="font-semibold tabular-nums text-warning">{formatRp(ringkas.dendaBelum)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Denda masuk Kas RW</p>
          <p className="font-semibold tabular-nums text-success">{formatRp(ringkas.dendaMasuk)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Visitrw3ChipFilters
            options={[
              { value: "semua" as const, label: "Semua", count: ringkas.total },
              { value: "menunggu_verifikasi" as const, label: "Menunggu", count: ringkas.menunggu },
              { value: "terbukti" as const, label: "Terbukti", count: ringkas.terbukti },
              { value: "tidak_terbukti" as const, label: "Tidak terbukti", count: ringkas.tidak },
            ]}
            value={filterStatus}
            onChange={setFilterStatus}
          />
          <Visitrw3ChipFilters
            options={[
              { value: "semua" as const, label: "Semua denda" },
              { value: "belum" as const, label: "Belum bayar" },
              { value: "lunas" as const, label: "Lunas" },
            ]}
            value={filterDenda}
            onChange={setFilterDenda}
          />
        </div>
        <Input placeholder="Cari usaha / NIU / ADU-" value={cari} onChange={(e) => setCari(e.target.value)} className="w-full sm:h-9 sm:w-52" />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <Visitrw3EmptyState icon={ShieldAlert} title="Belum ada pelanggaran" description="Aduan warga dan temuan petugas akan tampil di sini." />
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const bukaBebas = () => {
              setBebas(r);
              setAlasanBebas("");
            };
            const batalBayar = () =>
              window.confirm(`Batalkan pembayaran denda ${r.nomorAduan}? Catatan kas ikut dihapus.`) && aksi.mutate({ id: r.id, jenis: "batal" });
            const hapus = () => window.confirm(`Hapus ${r.nomorAduan}?`) && aksi.mutate({ id: r.id, jenis: "hapus" });
            return (
            <Visitrw3ListItem
              key={r.id}
              accent={
                r.status === "menunggu_verifikasi" ? "warning" : r.dendaStatus === "belum" ? "danger" : r.dendaStatus === "lunas" ? "success" : "default"
              }
              actions={
                <>
                  {r.status === "menunggu_verifikasi" && (
                    <Button size="sm" className="flex-1 gap-1 sm:h-8 sm:flex-none" onClick={() => bukaVerif(r)}>
                      <Check className="w-3.5 h-3.5" /> Verifikasi
                    </Button>
                  )}
                  {r.status === "terbukti" && r.usaha?.pjNomorWhatsapp && (
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-green-700 border-green-200 sm:h-8 sm:flex-none" asChild>
                      <a
                        href={toWaMeUrl(
                          r.usaha.pjNomorWhatsapp,
                          `Assalamu'alaikum, ${r.usaha.pjNama}.\n\nPengurus RW 03 mencatat pelanggaran ${r.usaha.namaUsaha} (${r.usaha.nomorInduk ?? r.usaha.nomorBiz}) tanggal ${r.tanggalKejadian}: *${r.jenisLabel}*${r.lokasi ? ` di ${r.lokasi}` : ""}.\n\n${r.uraian}\n\n${r.denda > 0 ? `Denda: ${formatRp(r.denda)} (pelanggaran ke-${r.keBerapa} dalam 12 bulan), disetor ke Kas RW 03 dengan kwitansi.` : "Ini teguran tertulis. Pelanggaran berikutnya dalam 12 bulan akan dikenai denda."}\n\nMohon segera diperbaiki. Terima kasih.`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WA PJ
                      </a>
                    </Button>
                  )}
                  {r.dendaStatus === "belum" && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 gap-1 sm:h-8 sm:flex-none"
                        onClick={() => {
                          setBayar(r);
                          setTanggalBayar(hariIni());
                          setPembayar(r.usaha ? `${r.usaha.pjNama} - ${r.usaha.namaUsaha}` : r.namaUsahaLain ?? "");
                        }}
                      >
                        <Wallet className="w-3.5 h-3.5" /> Bayar
                      </Button>
                      <Button size="sm" variant="outline" className="hidden gap-1 sm:inline-flex sm:h-8" onClick={bukaBebas}>
                        <Ban className="w-3.5 h-3.5" /> Bebaskan
                      </Button>
                    </>
                  )}
                  {r.dendaStatus === "lunas" && (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 gap-1 sm:h-8 sm:flex-none" asChild>
                        <a href={`/api/admin/rw3biz/pelanggaran/${r.id}/kwitansi`} target="_blank" rel="noreferrer">
                          <Receipt className="w-3.5 h-3.5" /> Kwitansi
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hidden gap-1 sm:inline-flex sm:h-8"
                        aria-label="Batalkan pembayaran"
                        onClick={batalBayar}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  {r.dendaStatus !== "lunas" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hidden text-destructive sm:inline-flex sm:h-8"
                      aria-label="Hapus"
                      onClick={hapus}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="shrink-0 sm:hidden" aria-label="Aksi lain">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-52">
                      {r.dendaStatus === "belum" && (
                        <DropdownMenuItem className="min-h-11 gap-2" onSelect={bukaBebas}>
                          <Ban className="h-4 w-4" /> Bebaskan denda
                        </DropdownMenuItem>
                      )}
                      {r.dendaStatus === "lunas" && (
                        <DropdownMenuItem className="min-h-11 gap-2" onSelect={batalBayar}>
                          <RotateCcw className="h-4 w-4" /> Batalkan pembayaran
                        </DropdownMenuItem>
                      )}
                      {r.dendaStatus !== "lunas" && (
                        <DropdownMenuItem className="min-h-11 gap-2 text-destructive focus:text-destructive" onSelect={hapus}>
                          <Trash2 className="h-4 w-4" /> Hapus
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              }
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Visitrw3MonoId>{r.nomorAduan}</Visitrw3MonoId>
                <span className="text-xs font-medium">{r.jenisLabel}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                    r.status === "terbukti"
                      ? "bg-destructive/10 text-destructive"
                      : r.status === "tidak_terbukti"
                        ? "bg-muted text-muted-foreground"
                        : "bg-warning/10 text-warning"
                  }`}
                >
                  {STATUS_LABEL[r.status]}
                </span>
                <span className="text-xs text-muted-foreground">{r.sumber === "aduan_warga" ? "Aduan warga" : "Temuan petugas"}</span>
              </div>
              <p className="text-sm font-medium break-words">{namaUsaha(r)}</p>
              <p className="text-xs text-muted-foreground break-words">
                {r.tanggalKejadian}
                {r.lokasi ? ` · ${r.lokasi}` : ""}
                {r.status === "terbukti" ? ` · ${TINGKAT_PELANGGARAN_LABEL[r.tingkat].toLowerCase()} · ke-${r.keBerapa}` : ""}
              </p>
              <p className="text-sm break-words">{r.uraian}</p>
              {r.pelaporNama && (
                <p className="text-xs text-muted-foreground break-words">
                  Pelapor: {r.pelaporNama}
                  {r.pelaporRt ? ` (RT 0${r.pelaporRt})` : ""}
                  {r.pelaporWa && (
                    <>
                      {" · "}
                      <a className="inline-flex min-h-10 items-center text-brand hover:underline sm:min-h-0" href={toWaMeUrl(r.pelaporWa, `Assalamu'alaikum, ${r.pelaporNama}. Terima kasih atas aduan ${r.nomorAduan} untuk RW 03. `)} target="_blank" rel="noreferrer">
                        WA pelapor
                      </a>
                    </>
                  )}
                  {" · identitas pelapor dirahasiakan"}
                </p>
              )}
              {r.adaFoto && (
                <a href={`/api/admin/rw3biz/pelanggaran/${r.id}/foto`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 text-sm text-brand hover:underline sm:min-h-0 sm:text-xs">
                  <ImageIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Lihat foto bukti
                </a>
              )}
              {r.status === "terbukti" && (
                <p className="text-xs">
                  {DENDA_LABEL[r.dendaStatus]}
                  {r.denda > 0 ? ` · ${formatRp(r.denda)}` : ""}
                  {r.nomorKwitansi ? ` · ${r.nomorKwitansi}` : ""}
                  {r.alasanBebas ? ` · ${r.alasanBebas}` : ""}
                </p>
              )}
              {r.dendaRincian && <p className="text-xs text-muted-foreground break-words">{r.dendaRincian}</p>}
              {r.catatanVerifikasi && <p className="text-xs text-muted-foreground break-words">Catatan petugas: {r.catatanVerifikasi}</p>}
            </Visitrw3ListItem>
            );
          })}
        </div>
      )}

      <Dialog open={verif != null} onOpenChange={(o) => !o && setVerif(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Verifikasi aduan {verif?.nomorAduan}</DialogTitle>
          </DialogHeader>
          {verif && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-3 text-xs">
                <p className="font-medium">{namaUsaha(verif)}</p>
                <p className="text-muted-foreground">
                  {verif.tanggalKejadian}
                  {verif.lokasi ? ` · ${verif.lokasi}` : ""}
                </p>
                <p className="mt-1 break-words">{verif.uraian}</p>
              </div>
              <p className="text-xs text-muted-foreground">Cek ke lokasi / konfirmasi pelapor dan pemilik usaha sebelum menetapkan.</p>
              <div className="space-y-1">
                <Label>Usaha yang melanggar</Label>
                <SearchableSelect
                  value={verifForm.usahaLabel}
                  onValueChange={(v) => setVerifForm((f) => ({ ...f, usahaLabel: v }))}
                  options={opsiUsaha}
                  searchPlaceholder="Cari nama usaha / NIU"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PilihJenisTingkat
                  jenis={verifForm.jenis}
                  tingkat={verifForm.tingkat}
                  dasarManual={verifForm.dasarManual}
                  onChange={(p) => setVerifForm((f) => ({ ...f, ...p }))}
                />
              </div>
              {pratinjauVerif.data && <KotakDenda p={pratinjauVerif.data} denda={dendaVerif} setDenda={setDendaVerif} />}
              <div className="space-y-1">
                <Label>Catatan verifikasi</Label>
                <Textarea
                  rows={2}
                  value={verifForm.catatan}
                  onChange={(e) => setVerifForm((f) => ({ ...f, catatan: e.target.value }))}
                  placeholder="Hasil cek lapangan (wajib bila tidak terbukti)"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button className="flex-1 gap-1" disabled={!pratinjauVerif.data || verifikasi.isPending} onClick={() => verifikasi.mutate(true)}>
                  <Check className="h-4 w-4" /> Terbukti — tetapkan
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={verifForm.catatan.trim().length < 3 || verifikasi.isPending}
                  onClick={() => verifikasi.mutate(false)}
                >
                  Tidak terbukti
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={bayar != null} onOpenChange={(o) => !o && setBayar(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Catat pembayaran denda</DialogTitle>
          </DialogHeader>
          {bayar && (
            <div className="space-y-3 text-sm">
              <p>
                {bayar.nomorAduan} · {bayar.jenisLabel} · <strong>{formatRp(bayar.denda)}</strong>
              </p>
              <div className="space-y-1">
                <Label>Dibayar oleh</Label>
                <Input value={pembayar} onChange={(e) => setPembayar(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tanggal bayar</Label>
                <Input type="date" value={tanggalBayar} max={hariIni()} onChange={(e) => setTanggalBayar(e.target.value)} />
              </div>
              <Button className="w-full gap-1" disabled={bayarMutation.isPending} onClick={() => bayarMutation.mutate()}>
                <Check className="h-4 w-4" /> Simpan & cetak kwitansi
              </Button>
              <p className="text-xs text-muted-foreground">Masuk Kas RW kategori "Denda pelanggaran usaha".</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={bebas != null} onOpenChange={(o) => !o && setBebas(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bebaskan denda</DialogTitle>
          </DialogHeader>
          {bebas && (
            <div className="space-y-3 text-sm">
              <p>
                {bebas.nomorAduan} · {formatRp(bebas.denda)}
              </p>
              <Textarea rows={2} value={alasanBebas} onChange={(e) => setAlasanBebas(e.target.value)} placeholder="Alasan (mis. sudah diperbaiki & minta maaf ke warga)" />
              <Button
                className="w-full"
                disabled={alasanBebas.trim().length < 3 || aksi.isPending}
                onClick={() => aksi.mutate({ id: bebas.id, jenis: "bebaskan", body: { alasan: alasanBebas } })}
              >
                Bebaskan
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Visitrw3AdminShell>
  );
}
