import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Ban, Check, Loader2, MessageCircle, MoreHorizontal, Receipt, RotateCcw, Search, Trash2, Truck, Wallet } from "lucide-react";
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
import { toWaMeUrl } from "@/lib/wa";
import { HASIL_RAZIA_LABEL, KENDARAAN_BIZ, bulanIni, formatRp, type HasilRazia } from "@shared/rw3biz-kontribusi";

type UsahaRingkas = { id: number; nomorBiz: string; nomorInduk: string | null; namaUsaha: string; pjNama: string; pjNomorWhatsapp: string };

type RaziaRow = {
  id: number;
  tanggal: string;
  jam: string | null;
  lokasi: string;
  plat: string;
  jenis: string;
  kepemilikan: string;
  tujuanLain: string | null;
  namaSopir: string | null;
  hasil: HasilRazia;
  keteranganHasil: string | null;
  denda: number;
  dendaStatus: "tidak_ada" | "belum" | "lunas" | "dibebaskan";
  tanggalBayar: string | null;
  pembayarNama: string | null;
  alasanBebas: string | null;
  selesai: boolean;
  catatan: string | null;
  dicatatOleh: string;
  usaha: UsahaRingkas | null;
  totalTemuanPlat: number;
  nomorKwitansi: string | null;
};

type HasilCek = { hasil: HasilRazia; usahaId: number | null; keterangan: string; dendaUsulan: number; temuanSebelumnya: number };

const KEPEMILIKAN = [
  { value: "tidak_tahu", label: "Belum diketahui" },
  { value: "milik", label: "Milik usaha" },
  { value: "charter", label: "Charter / sewaan" },
];

const TANPA_USAHA = "— Bukan usaha terdaftar / hanya melintas —";

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const labelJenis = (kode: string) => KENDARAAN_BIZ.find((k) => k.kode === kode)?.label ?? kode;

const formKosong = () => ({
  tanggal: hariIni(),
  jam: "",
  lokasi: "",
  plat: "",
  jenis: "kendaraanTrukBesar",
  kepemilikan: "tidak_tahu",
  usahaLabel: TANPA_USAHA,
  tujuanLain: "",
  namaSopir: "",
  catatan: "",
});

function HasilBadge({ hasil }: { hasil: HasilRazia }) {
  const warna =
    hasil === "tidak_terdaftar" || hasil === "usaha_tidak_terdaftar"
      ? "bg-destructive/10 text-destructive"
      : hasil === "lewat"
        ? "bg-muted text-muted-foreground"
        : "bg-success/10 text-success";
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${warna}`}>{HASIL_RAZIA_LABEL[hasil] ?? hasil}</span>;
}

const DENDA_LABEL: Record<RaziaRow["dendaStatus"], string> = {
  tidak_ada: "Tanpa denda",
  belum: "Denda belum dibayar",
  lunas: "Denda lunas",
  dibebaskan: "Denda dibebaskan",
};

export default function AdminRw3bizRazia() {
  const { toast } = useToast();
  const [bulan, setBulan] = useState(bulanIni());
  const [filterHasil, setFilterHasil] = useState<"semua" | "melanggar" | "terdaftar" | "lewat">("semua");
  const [filterDenda, setFilterDenda] = useState<"semua" | "belum" | "lunas">("semua");
  const [cari, setCari] = useState("");
  const [form, setForm] = useState(formKosong);
  const [cek, setCek] = useState<HasilCek | null>(null);
  const [dendaManual, setDendaManual] = useState("");
  const [bayar, setBayar] = useState<RaziaRow | null>(null);
  const [tanggalBayar, setTanggalBayar] = useState(hariIni());
  const [pembayar, setPembayar] = useState("");
  const [bebas, setBebas] = useState<RaziaRow | null>(null);
  const [alasanBebas, setAlasanBebas] = useState("");

  const ubah = (patch: Partial<ReturnType<typeof formKosong>>) => {
    setForm((f) => ({ ...f, ...patch }));
    setCek(null);
  };

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
  const usahaDipilih = usahaList.find((u) => labelUsaha(u) === form.usahaLabel) ?? null;

  const { data: semua = [], isLoading } = useQuery<RaziaRow[]>({
    queryKey: ["/api/admin/rw3biz/razia", bulan],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rw3biz/razia?bulan=${bulan}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat razia");
      return res.json();
    },
  });

  const list = useMemo(() => {
    const q = cari.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return semua.filter((r) => {
      const melanggar = r.hasil === "tidak_terdaftar" || r.hasil === "usaha_tidak_terdaftar";
      if (filterHasil === "melanggar" && !melanggar) return false;
      if (filterHasil === "terdaftar" && !r.hasil.startsWith("terdaftar")) return false;
      if (filterHasil === "lewat" && r.hasil !== "lewat") return false;
      if (filterDenda !== "semua" && r.dendaStatus !== filterDenda) return false;
      if (q && !r.plat.toUpperCase().replace(/[^A-Z0-9]/g, "").includes(q)) return false;
      return true;
    });
  }, [semua, filterHasil, filterDenda, cari]);

  const ringkas = useMemo(
    () => ({
      total: semua.length,
      melanggar: semua.filter((r) => r.hasil === "tidak_terdaftar" || r.hasil === "usaha_tidak_terdaftar").length,
      terdaftar: semua.filter((r) => r.hasil.startsWith("terdaftar")).length,
      lewat: semua.filter((r) => r.hasil === "lewat").length,
      dendaBelum: semua.filter((r) => r.dendaStatus === "belum").reduce((s, r) => s + r.denda, 0),
      dendaMasuk: semua.filter((r) => r.dendaStatus === "lunas").reduce((s, r) => s + r.denda, 0),
      truk: semua.filter((r) => r.jenis === "kendaraanTrukBesar").length,
    }),
    [semua],
  );

  const payload = () => ({
    tanggal: form.tanggal,
    jam: form.jam || null,
    lokasi: form.lokasi,
    plat: form.plat,
    jenis: form.jenis,
    kepemilikan: form.kepemilikan,
    usahaId: usahaDipilih?.id ?? null,
    tujuanLain: usahaDipilih ? null : form.tujuanLain || null,
    namaSopir: form.namaSopir || null,
    catatan: form.catatan || null,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/razia"] });
  const gagal = (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" });

  const cekMutation = useMutation({
    mutationFn: async () => readJsonSafely<HasilCek>(await apiRequest("POST", "/api/admin/rw3biz/razia/cek", payload())),
    onSuccess: (h) => {
      setCek(h);
      setDendaManual(String(h.dendaUsulan));
    },
    onError: gagal,
  });

  const simpanMutation = useMutation({
    mutationFn: async () =>
      readJsonSafely<RaziaRow>(
        await apiRequest("POST", "/api/admin/rw3biz/razia", { ...payload(), denda: parseInt(dendaManual || "0", 10) || 0 }),
      ),
    onSuccess: (r) => {
      toast({
        title: "Temuan tersimpan",
        description: r.denda > 0 ? `Denda ${formatRp(r.denda)} menunggu pembayaran` : HASIL_RAZIA_LABEL[r.hasil],
      });
      setForm((f) => ({ ...formKosong(), tanggal: f.tanggal, jam: f.jam, lokasi: f.lokasi }));
      setCek(null);
      invalidate();
    },
    onError: gagal,
  });

  const bayarMutation = useMutation({
    mutationFn: async () => {
      if (!bayar) return null;
      return readJsonSafely<{ id: number; nomorKwitansi: string }>(
        await apiRequest("POST", `/api/admin/rw3biz/razia/${bayar.id}/bayar`, { tanggal: tanggalBayar, pembayarNama: pembayar || null }),
      );
    },
    onSuccess: (r) => {
      toast({ title: "Denda dicatat", description: `Masuk Kas RW · kwitansi ${r?.nomorKwitansi ?? ""}` });
      if (r?.id) window.open(`/api/admin/rw3biz/razia/${r.id}/kwitansi`, "_blank", "noopener");
      setBayar(null);
      invalidate();
    },
    onError: gagal,
  });

  const aksi = useMutation({
    mutationFn: async ({ id, jenis, body }: { id: number; jenis: "batal" | "bebaskan" | "hapus"; body?: unknown }) => {
      if (jenis === "hapus") return readJsonSafely(await apiRequest("DELETE", `/api/admin/rw3biz/razia/${id}`));
      return readJsonSafely(await apiRequest("POST", `/api/admin/rw3biz/razia/${id}/${jenis}`, body ?? {}));
    },
    onSuccess: () => {
      toast({ title: "Tersimpan" });
      setBebas(null);
      invalidate();
    },
    onError: gagal,
  });

  const siapCek = form.lokasi.trim().length >= 2 && form.plat.replace(/[^A-Za-z0-9]/g, "").length >= 3;

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="Razia kendaraan"
        description="Catat kendaraan yang lewat / bongkar muat di RW 03. Sistem mencocokkan plat dengan kendaraan milik & charter terdaftar; yang tidak terdaftar dikenai denda ke Kas RW."
        actions={
          <Input
            type="month"
            aria-label="Bulan razia"
            value={bulan}
            onChange={(e) => e.target.value && setBulan(e.target.value)}
            className="w-full sm:h-9 sm:w-40"
          />
        }
      />

      <Visitrw3Panel
        title="Catat temuan"
        description="Isi di lokasi razia, tekan Cek kendaraan, lalu simpan."
        className="overflow-clip"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Tanggal</Label>
              <Input type="date" value={form.tanggal} max={hariIni()} onChange={(e) => ubah({ tanggal: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Jam</Label>
              <Input type="time" value={form.jam} onChange={(e) => ubah({ jam: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Lokasi razia *</Label>
            <Input value={form.lokasi} onChange={(e) => ubah({ lokasi: e.target.value })} placeholder="Contoh: mulut gang RT 02" />
          </div>
          <div className="space-y-1">
            <Label>Plat nomor *</Label>
            <Input
              className="font-mono text-lg font-semibold uppercase tracking-wider sm:text-sm sm:font-normal sm:tracking-normal"
              value={form.plat}
              onChange={(e) => ubah({ plat: e.target.value.toUpperCase() })}
              placeholder="D 1234 AB"
              maxLength={20}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              onKeyDown={(e) => {
                if (e.key === "Enter" && siapCek && !cekMutation.isPending) cekMutation.mutate();
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
            <div className="space-y-1">
              <Label>Jenis kendaraan</Label>
              <Select value={form.jenis} onValueChange={(v) => ubah({ jenis: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KENDARAAN_BIZ.map((k) => (
                    <SelectItem key={k.kode} value={k.kode}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Menurut sopir</Label>
              <Select value={form.kepemilikan} onValueChange={(v) => ubah({ kepemilikan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KEPEMILIKAN.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Tujuan (usaha di RW 03)</Label>
            <SearchableSelect
              value={form.usahaLabel}
              onValueChange={(v) => ubah({ usahaLabel: v })}
              options={opsiUsaha}
              searchPlaceholder="Cari nama usaha / NIU"
            />
          </div>
          {!usahaDipilih && (
            <div className="space-y-1">
              <Label>Tujuan lain (bila menuju usaha yang belum terdaftar)</Label>
              <Input value={form.tujuanLain} onChange={(e) => ubah({ tujuanLain: e.target.value })} placeholder="Kosongkan bila hanya melintas" />
            </div>
          )}
          <div className="space-y-1">
            <Label>Nama sopir (opsional)</Label>
            <Input value={form.namaSopir} onChange={(e) => ubah({ namaSopir: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Catatan (opsional)</Label>
            <Textarea rows={2} value={form.catatan} onChange={(e) => ubah({ catatan: e.target.value })} placeholder="Muatan, kondisi jalan, dsb." />
          </div>
        </div>

        {cek && (
          <div
            className={`mt-3 space-y-2 rounded-lg border p-3 text-sm ${
              cek.dendaUsulan > 0 ? "border-destructive/40 bg-destructive/5" : "border-success/40 bg-success/5"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <HasilBadge hasil={cek.hasil} />
              {cek.temuanSebelumnya > 0 && (
                <span className="text-xs font-medium text-warning">Plat ini sudah {cek.temuanSebelumnya}× tercatat razia</span>
              )}
            </div>
            <p className="break-words">{cek.keterangan}</p>
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Denda (Rp) — bisa diubah</Label>
                <Input
                  className="w-full sm:h-9 sm:w-40"
                  inputMode="numeric"
                  value={dendaManual}
                  onChange={(e) => setDendaManual(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <p className="text-xs text-muted-foreground sm:pb-2">Usulan tarif: {formatRp(cek.dendaUsulan)}</p>
            </div>
          </div>
        )}

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-3 grid grid-cols-2 gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:flex-wrap sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button variant="outline" className="gap-1 px-3 sm:px-4" disabled={!siapCek || cekMutation.isPending} onClick={() => cekMutation.mutate()}>
            {cekMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Cek kendaraan
          </Button>
          <Button className="gap-1 px-3 sm:px-4" disabled={!cek || simpanMutation.isPending} onClick={() => simpanMutation.mutate()}>
            <Check className="h-4 w-4" /> Simpan temuan
          </Button>
        </div>
      </Visitrw3Panel>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Temuan {bulan}</p>
          <p className="font-semibold tabular-nums">{ringkas.total} <span className="text-xs font-normal text-muted-foreground">({ringkas.truk} truk besar)</span></p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Tidak terdaftar</p>
          <p className="font-semibold tabular-nums text-destructive">{ringkas.melanggar}</p>
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
              { value: "melanggar" as const, label: "Tidak terdaftar", count: ringkas.melanggar },
              { value: "terdaftar" as const, label: "Terdaftar", count: ringkas.terdaftar },
              { value: "lewat" as const, label: "Melintas", count: ringkas.lewat },
            ]}
            value={filterHasil}
            onChange={setFilterHasil}
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
        <Input
          placeholder="Cari plat"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          className="w-full font-mono uppercase sm:h-9 sm:w-44"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <Visitrw3EmptyState icon={Truck} title="Belum ada temuan" description="Temuan razia bulan ini akan tampil di sini." />
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const melanggar = r.hasil === "tidak_terdaftar" || r.hasil === "usaha_tidak_terdaftar";
            const bukaBebas = () => {
              setBebas(r);
              setAlasanBebas("");
            };
            const batalBayar = () =>
              window.confirm(`Batalkan pembayaran denda ${r.plat}? Catatan kas ikut dihapus.`) && aksi.mutate({ id: r.id, jenis: "batal" });
            const hapus = () => window.confirm(`Hapus temuan ${r.plat}?`) && aksi.mutate({ id: r.id, jenis: "hapus" });
            return (
              <Visitrw3ListItem
                key={r.id}
                accent={r.dendaStatus === "belum" ? "danger" : melanggar && !r.selesai ? "warning" : r.dendaStatus === "lunas" ? "success" : "default"}
                actions={
                  <>
                    {r.usaha?.pjNomorWhatsapp && melanggar && (
                      <Button size="sm" variant="outline" className="flex-1 gap-1 text-green-700 border-green-200 sm:h-8 sm:flex-none" asChild>
                        <a
                          href={toWaMeUrl(
                            r.usaha.pjNomorWhatsapp,
                            `Assalamu'alaikum, ${r.usaha.pjNama}.\n\nHasil razia kendaraan RW 03 tanggal ${r.tanggal}: ${labelJenis(r.jenis).toLowerCase()} *${r.plat}* menuju ${r.usaha.namaUsaha} belum terdaftar di data RW3BIZ (${r.usaha.nomorInduk ?? r.usaha.nomorBiz}).${r.denda > 0 && r.dendaStatus === "belum" ? `\n\nDenda: ${formatRp(r.denda)}, disetor ke Kas RW 03 dengan kwitansi.` : ""}\n\nMohon perbarui data kendaraan (milik/charter) di rw3padasukacimahi.org/rw3biz/perpanjang karena kendaraan berat ikut menentukan kontribusi pemeliharaan jalan. Terima kasih.`,
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
                            setPembayar(r.usaha ? `${r.usaha.pjNama} - ${r.usaha.namaUsaha}` : r.namaSopir ?? "");
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
                          <a href={`/api/admin/rw3biz/razia/${r.id}/kwitansi`} target="_blank" rel="noreferrer">
                            <Receipt className="w-3.5 h-3.5" /> Kwitansi
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hidden gap-1 sm:inline-flex sm:h-8"
                          aria-label="Batalkan pembayaran denda"
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
                        aria-label="Hapus temuan"
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
                            <Trash2 className="h-4 w-4" /> Hapus temuan
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                }
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Visitrw3MonoId>{r.plat}</Visitrw3MonoId>
                  <span className="text-xs">{labelJenis(r.jenis)}</span>
                  <HasilBadge hasil={r.hasil} />
                  {r.totalTemuanPlat > 1 && <span className="text-xs font-medium text-warning">{r.totalTemuanPlat}× tercatat</span>}
                </div>
                <p className="text-xs text-muted-foreground break-words">
                  {r.tanggal}
                  {r.jam ? ` ${r.jam}` : ""} · {r.lokasi}
                  {r.namaSopir ? ` · sopir ${r.namaSopir}` : ""}
                  {r.kepemilikan !== "tidak_tahu" ? ` · menurut sopir: ${r.kepemilikan === "charter" ? "charter" : "milik usaha"}` : ""}
                </p>
                <p className="text-sm break-words">
                  {r.usaha ? `${r.usaha.namaUsaha} (${r.usaha.nomorInduk ?? r.usaha.nomorBiz})` : r.tujuanLain ? `Tujuan: ${r.tujuanLain}` : "Melintas"}
                </p>
                {r.keteranganHasil && <p className="text-xs text-muted-foreground">{r.keteranganHasil}</p>}
                <p className="text-xs">
                  {DENDA_LABEL[r.dendaStatus]}
                  {r.denda > 0 ? ` · ${formatRp(r.denda)}` : ""}
                  {r.nomorKwitansi ? ` · ${r.nomorKwitansi}` : ""}
                  {r.alasanBebas ? ` · ${r.alasanBebas}` : ""}
                  {melanggar && r.usaha ? (r.selesai ? " · data usaha sudah diperbarui" : " · menunggu usaha memperbarui data") : ""}
                </p>
              </Visitrw3ListItem>
            );
          })}
        </div>
      )}

      <Dialog open={bayar != null} onOpenChange={(o) => !o && setBayar(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Catat pembayaran denda</DialogTitle>
          </DialogHeader>
          {bayar && (
            <div className="space-y-3 text-sm">
              <p>
                {bayar.plat} · {labelJenis(bayar.jenis)} · <strong>{formatRp(bayar.denda)}</strong>
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
              <p className="text-xs text-muted-foreground">Masuk Kas RW kategori "Denda razia kendaraan".</p>
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
                {bebas.plat} · {formatRp(bebas.denda)}
              </p>
              <Textarea rows={2} value={alasanBebas} onChange={(e) => setAlasanBebas(e.target.value)} placeholder="Alasan (mis. pelanggaran pertama, langsung daftar)" />
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
