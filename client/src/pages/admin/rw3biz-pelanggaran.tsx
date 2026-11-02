import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Camera,
  Check,
  ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  ShieldAlert,
  Trash2,
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
  type JenisPelanggaran,
  type TingkatPelanggaran,
} from "@shared/rw3biz-kontribusi";

type UsahaRingkas = {
  id: number;
  nomorBiz: string;
  nomorInduk: string | null;
  namaUsaha: string;
  pjNama: string;
  pjNomorWhatsapp: string;
};

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
  catatanVerifikasi: string | null;
  usaha: UsahaRingkas | null;
};

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

function PilihJenisTingkat({
  jenis,
  tingkat,
  onChange,
}: {
  jenis: JenisPelanggaran;
  tingkat: TingkatPelanggaran;
  onChange: (p: { jenis?: JenisPelanggaran; tingkat?: TingkatPelanggaran }) => void;
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
        <p className="text-xs text-muted-foreground">Berat: berdampak luas / membahayakan warga.</p>
      </div>
    </>
  );
}

export default function AdminRw3bizPelanggaran() {
  const { toast } = useToast();
  const [bulan, setBulan] = useState(bulanIni());
  const [filterStatus, setFilterStatus] = useState<"semua" | StatusPelanggaran>("semua");
  const [cari, setCari] = useState("");

  const temuanKosong = () => ({
    usahaLabel: TANPA_USAHA,
    namaUsahaLain: "",
    jenis: "sampah_tercecer" as JenisPelanggaran,
    tingkat: "sedang" as TingkatPelanggaran,
    tanggalKejadian: hariIni(),
    lokasi: "",
    uraian: "",
    foto: "",
    catatan: "",
  });
  const [temuan, setTemuan] = useState(temuanKosong);
  const ubahTemuan = (patch: Partial<ReturnType<typeof temuanKosong>>) =>
    setTemuan((t) => ({ ...t, ...patch }));

  const [verif, setVerif] = useState<PelanggaranRow | null>(null);
  const [verifForm, setVerifForm] = useState({
    usahaLabel: TANPA_USAHA,
    jenis: "lainnya" as JenisPelanggaran,
    tingkat: "sedang" as TingkatPelanggaran,
    catatan: "",
  });

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
      if (
        q &&
        !`${r.usaha?.namaUsaha ?? ""} ${r.namaUsahaLain ?? ""} ${r.usaha?.nomorInduk ?? ""} ${r.nomorAduan}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [semua, menungguSemua, filterStatus, cari]);

  const ringkas = useMemo(
    () => ({
      total: semua.length,
      menunggu: menungguSemua.length,
      terbukti: semua.filter((r) => r.status === "terbukti").length,
      tidak: semua.filter((r) => r.status === "tidak_terbukti").length,
    }),
    [semua, menungguSemua],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/pelanggaran"] });
  const gagal = (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" });

  const usahaTemuan = usahaDari(temuan.usahaLabel);
  const simpanTemuan = useMutation({
    mutationFn: async () =>
      readJsonSafely(
        await apiRequest("POST", "/api/admin/rw3biz/pelanggaran", {
          usahaId: usahaTemuan?.id ?? null,
          namaUsahaLain: usahaTemuan ? null : temuan.namaUsahaLain || null,
          jenis: temuan.jenis,
          tingkat: temuan.tingkat,
          tanggalKejadian: temuan.tanggalKejadian,
          lokasi: temuan.lokasi || null,
          uraian: temuan.uraian,
          foto: temuan.foto || null,
          catatan: temuan.catatan || null,
        }),
      ),
    onSuccess: () => {
      toast({
        title: "Pelanggaran dicatat",
        description: "Terbukti tanpa denda. Penanganan lanjut lewat Aduan Warga / teguran resmi bila perlu.",
      });
      setTemuan(temuanKosong());
      invalidate();
    },
    onError: gagal,
  });

  const usahaVerif = usahaDari(verifForm.usahaLabel);
  const bukaVerif = (r: PelanggaranRow) => {
    setVerif(r);
    setVerifForm({
      usahaLabel: r.usaha ? labelUsaha(r.usaha) : TANPA_USAHA,
      jenis: r.jenis,
      tingkat: r.tingkat,
      catatan: "",
    });
  };

  const verifikasi = useMutation({
    mutationFn: async (terbukti: boolean) => {
      if (!verif) return null;
      return readJsonSafely(
        await apiRequest("POST", `/api/admin/rw3biz/pelanggaran/${verif.id}/verifikasi`, {
          terbukti,
          usahaId: usahaVerif?.id ?? null,
          jenis: verifForm.jenis,
          tingkat: verifForm.tingkat,
          catatan: verifForm.catatan || null,
        }),
      );
    },
    onSuccess: (_r, terbukti) => {
      toast({
        title: terbukti ? "Aduan terbukti" : "Aduan ditutup",
        description: terbukti
          ? "Tanpa denda. Lanjut teguran resmi lewat Aduan Warga bila perlu."
          : "Tidak terbukti",
      });
      setVerif(null);
      invalidate();
    },
    onError: gagal,
  });

  const hapusMutation = useMutation({
    mutationFn: async (id: number) => readJsonSafely(await apiRequest("DELETE", `/api/admin/rw3biz/pelanggaran/${id}`)),
    onSuccess: () => {
      toast({ title: "Dihapus" });
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
    r.usaha
      ? `${r.usaha.namaUsaha} (${r.usaha.nomorInduk ?? r.usaha.nomorBiz})`
      : r.namaUsahaLain
        ? `${r.namaUsahaLain} (belum terdaftar)`
        : "-";

  const siapSimpan =
    (usahaTemuan || temuan.namaUsahaLain.trim().length >= 2) && temuan.uraian.trim().length >= 5;

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="Pelanggaran & aduan"
        description="Aduan warga dan temuan petugas (sampah, kebisingan, parkir, limbah, jam operasional, fasum, data). Tanpa denda — penanganan lanjut lewat Aduan Warga / teguran resmi."
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
        description="Pelanggaran yang dilihat langsung petugas — langsung ditetapkan terbukti (tanpa denda)."
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
            onChange={(p) => ubahTemuan(p)}
          />
          <div className="space-y-1">
            <Label>Tanggal kejadian</Label>
            <Input
              type="date"
              value={temuan.tanggalKejadian}
              max={hariIni()}
              onChange={(e) => ubahTemuan({ tanggalKejadian: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Lokasi</Label>
            <Input
              value={temuan.lokasi}
              onChange={(e) => ubahTemuan({ lokasi: e.target.value })}
              placeholder="Contoh: depan toko, selokan RT 03"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Uraian *</Label>
            <Textarea
              rows={2}
              value={temuan.uraian}
              onChange={(e) => ubahTemuan({ uraian: e.target.value })}
              placeholder="Apa yang terjadi, dampaknya ke warga"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Catatan (opsional)</Label>
            <Input
              value={temuan.catatan}
              onChange={(e) => ubahTemuan({ catatan: e.target.value })}
              placeholder="Catatan internal petugas"
            />
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
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button className="w-full gap-1 sm:w-auto" disabled={!siapSimpan || simpanTemuan.isPending} onClick={() => simpanTemuan.mutate()}>
            {simpanTemuan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Simpan temuan
          </Button>
        </div>
      </Visitrw3Panel>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Aduan menunggu verifikasi</p>
          <p className="font-semibold tabular-nums text-warning">{ringkas.menunggu}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Terbukti {bulan}</p>
          <p className="font-semibold tabular-nums text-destructive">{ringkas.terbukti}</p>
        </div>
        <div className="col-span-2 rounded-xl border bg-card p-3 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Tidak terbukti {bulan}</p>
          <p className="font-semibold tabular-nums text-muted-foreground">{ringkas.tidak}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
        <Input
          placeholder="Cari usaha / NIU / ADU-"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          className="w-full sm:h-9 sm:w-52"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <Visitrw3EmptyState
          icon={ShieldAlert}
          title="Belum ada pelanggaran"
          description="Aduan warga dan temuan petugas akan tampil di sini."
        />
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const hapus = () => window.confirm(`Hapus ${r.nomorAduan}?`) && hapusMutation.mutate(r.id);
            return (
              <Visitrw3ListItem
                key={r.id}
                accent={
                  r.status === "menunggu_verifikasi"
                    ? "warning"
                    : r.status === "terbukti"
                      ? "danger"
                      : "default"
                }
                actions={
                  <>
                    {r.status === "menunggu_verifikasi" && (
                      <Button size="sm" className="flex-1 gap-1 sm:h-8 sm:flex-none" onClick={() => bukaVerif(r)}>
                        <Check className="w-3.5 h-3.5" /> Verifikasi
                      </Button>
                    )}
                    {r.status === "terbukti" && r.usaha?.pjNomorWhatsapp && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 text-green-700 border-green-200 sm:h-8 sm:flex-none"
                        asChild
                      >
                        <a
                          href={toWaMeUrl(
                            r.usaha.pjNomorWhatsapp,
                            `Assalamu'alaikum, ${r.usaha.pjNama}.\n\nPengurus RW 03 mencatat pelanggaran ${r.usaha.namaUsaha} (${r.usaha.nomorInduk ?? r.usaha.nomorBiz}) tanggal ${r.tanggalKejadian}: *${r.jenisLabel}*${r.lokasi ? ` di ${r.lokasi}` : ""}.\n\n${r.uraian}\n\nIni catatan resmi tanpa denda. Penanganan lanjut dapat lewat Aduan Warga / teguran resmi bila diperlukan.\n\nMohon segera diperbaiki. Terima kasih.`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WA PJ
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hidden text-destructive sm:inline-flex sm:h-8"
                      aria-label="Hapus"
                      onClick={hapus}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline" className="shrink-0 sm:hidden" aria-label="Aksi lain">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-52">
                        <DropdownMenuItem
                          className="min-h-11 gap-2 text-destructive focus:text-destructive"
                          onSelect={hapus}
                        >
                          <Trash2 className="h-4 w-4" /> Hapus
                        </DropdownMenuItem>
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
                  <span className="text-xs text-muted-foreground">
                    {r.sumber === "aduan_warga" ? "Aduan warga" : "Temuan petugas"}
                  </span>
                </div>
                <p className="text-sm font-medium break-words">{namaUsaha(r)}</p>
                <p className="text-xs text-muted-foreground break-words">
                  {r.tanggalKejadian}
                  {r.lokasi ? ` · ${r.lokasi}` : ""}
                  {r.status === "terbukti"
                    ? ` · ${TINGKAT_PELANGGARAN_LABEL[r.tingkat].toLowerCase()} · ke-${r.keBerapa}`
                    : ""}
                </p>
                <p className="text-sm break-words">{r.uraian}</p>
                {r.pelaporNama && (
                  <p className="text-xs text-muted-foreground break-words">
                    Pelapor: {r.pelaporNama}
                    {r.pelaporRt ? ` (RT 0${r.pelaporRt})` : ""}
                    {r.pelaporWa && (
                      <>
                        {" · "}
                        <a
                          className="inline-flex min-h-10 items-center text-brand hover:underline sm:min-h-0"
                          href={toWaMeUrl(
                            r.pelaporWa,
                            `Assalamu'alaikum, ${r.pelaporNama}. Terima kasih atas aduan ${r.nomorAduan} untuk RW 03. `,
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WA pelapor
                        </a>
                      </>
                    )}
                    {" · identitas pelapor dirahasiakan"}
                  </p>
                )}
                {r.adaFoto && (
                  <a
                    href={`/api/admin/rw3biz/pelanggaran/${r.id}/foto`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-1 text-sm text-brand hover:underline sm:min-h-0 sm:text-xs"
                  >
                    <ImageIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Lihat foto bukti
                  </a>
                )}
                {r.status === "terbukti" && (
                  <p className="text-xs text-muted-foreground">
                    Tanpa denda · lanjut Aduan Warga / teguran resmi bila perlu
                  </p>
                )}
                {r.catatanVerifikasi && (
                  <p className="text-xs text-muted-foreground break-words">Catatan petugas: {r.catatanVerifikasi}</p>
                )}
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
              <p className="text-xs text-muted-foreground">
                Cek ke lokasi / konfirmasi pelapor dan pemilik usaha sebelum menetapkan. Tidak ada denda —
                penanganan lanjut lewat Aduan Warga / teguran resmi.
              </p>
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
                  onChange={(p) => setVerifForm((f) => ({ ...f, ...p }))}
                />
              </div>
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
                <Button
                  className="flex-1 gap-1"
                  disabled={verifikasi.isPending}
                  onClick={() => verifikasi.mutate(true)}
                >
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
    </Visitrw3AdminShell>
  );
}
