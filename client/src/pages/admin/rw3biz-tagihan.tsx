import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Ban, Check, MessageCircle, MoreHorizontal, Pencil, Receipt, RotateCcw, Wallet } from "lucide-react";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3ChipFilters,
  Visitrw3EmptyState,
  Visitrw3ListItem,
  Visitrw3MonoId,
  Visitrw3RtBadge,
} from "@/components/admin/visitrw3-admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, queryClient, readJsonSafely } from "@/lib/queryClient";
import { toWaMeUrl } from "@/lib/wa";
import {
  KoreksiKontribusiEditor,
  RincianKontribusi,
  dataKontribusiDariBaris,
  type DataKontribusiEdit,
} from "@/components/rw3biz/koreksi-kontribusi";
import {
  RingkasanSumbangsih,
  SumbangsihFields,
  sumbangsihPayload,
  type IsianSumbangsih,
} from "@/components/rw3biz/kontribusi-form";
import {
  KERINGANAN_JENIS,
  KERINGANAN_JENIS_LABEL,
  bulanIni,
  formatRp,
  labelPeriode,
  parseSumbangsih,
  type HasilKontribusi,
} from "@shared/rw3biz-kontribusi";

type StatusTagihan = "semua" | "belum" | "sebagian" | "lunas" | "dibebaskan";

type TagihanRow = {
  id: number;
  usahaId: number;
  periode: string;
  kontribusiBulanan: number;
  jumlah: number;
  terbayar: number;
  status: string;
  catatan: string[];
  tanggalBayar: string | null;
  jatuhTempo: string;
  telat: boolean;
  pembayaran?: { id: number; jumlah: number; tanggal: string; nomorKwitansi: string }[];
  usaha: {
    id: number;
    nomorBiz: string;
    nomorInduk?: string | null;
    namaUsaha: string;
    rt: number;
    pjNama: string;
    pjNomorWhatsapp: string;
    jenisTempatUsaha: string | null;
  };
};

type KeberatanRow = {
  id: number;
  usahaId: number;
  alasan: string;
  status: string;
  tanggapanAdmin: string | null;
  createdAt: string;
  usaha: { id: number; nomorBiz: string; namaUsaha: string; pjNama: string; pjNomorWhatsapp: string; kontribusiBulanan: number | null };
};

type UsahaRow = {
  id: number;
  nomorBiz: string;
  namaUsaha: string;
  pengajuanId: number | null;
  kontribusiBulanan: number | null;
  sumbangsih: string | null;
  rincianKontribusi: string | null;
  keringananJenis: string | null;
  keringananPersen: number | null;
  keringananSampai: string | null;
  keringananAlasan: string | null;
  [k: string]: unknown;
};

const STATUS_LABEL: Record<string, string> = {
  belum: "Belum bayar",
  sebagian: "Cicilan",
  lunas: "Lunas",
  dibebaskan: "Dibebaskan",
};

const hariIni = () => new Date().toISOString().slice(0, 10);

function invalidateTagihan() {
  queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/tagihan"] });
  queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/rab"] });
  queryClient.invalidateQueries({ queryKey: ["/api/kas-rw"] });
}

function StatusPil({ status, telat }: { status: string; telat?: boolean }) {
  const warna =
    status === "lunas"
      ? "bg-success/15 text-success"
      : status === "dibebaskan"
        ? "bg-muted text-muted-foreground"
        : telat
          ? "bg-destructive/15 text-destructive"
          : "bg-warning/15 text-warning";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${warna}`}>
      {STATUS_LABEL[status] ?? status}
      {telat ? " · lewat tempo" : ""}
    </span>
  );
}

export default function AdminRw3bizTagihan() {
  const { toast } = useToast();
  const [bulan, setBulan] = useState(bulanIni());
  const [status, setStatus] = useState<StatusTagihan>("semua");
  const [cari, setCari] = useState("");
  const [bayar, setBayar] = useState<TagihanRow | null>(null);
  const [jumlahBayar, setJumlahBayar] = useState("");
  const [tanggalBayar, setTanggalBayar] = useState(hariIni());
  const [bebas, setBebas] = useState<TagihanRow | null>(null);
  const [alasanBebas, setAlasanBebas] = useState("");
  const [ubahUsahaId, setUbahUsahaId] = useState<number | null>(null);
  const [keberatanStatus, setKeberatanStatus] = useState<"menunggu" | "semua">("menunggu");
  const [tanggapi, setTanggapi] = useState<KeberatanRow | null>(null);
  const [tanggapan, setTanggapan] = useState("");

  const { data: semua = [], isLoading } = useQuery<TagihanRow[]>({
    queryKey: ["/api/admin/rw3biz/tagihan", bulan],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rw3biz/tagihan?bulan=${bulan}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat tagihan");
      return res.json();
    },
  });

  const { data: keberatan = [] } = useQuery<KeberatanRow[]>({
    queryKey: ["/api/admin/rw3biz/keberatan", keberatanStatus],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rw3biz/keberatan?status=${keberatanStatus}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat keberatan");
      return res.json();
    },
  });

  const list = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return semua.filter(
      (t) =>
        (status === "semua" || t.status === status) &&
        (!q || `${t.usaha.namaUsaha} ${t.usaha.nomorBiz} ${t.usaha.nomorInduk ?? ""} ${t.usaha.pjNama}`.toLowerCase().includes(q)),
    );
  }, [semua, status, cari]);

  const ringkas = useMemo(() => {
    const hitung = (s: string) => semua.filter((t) => t.status === s).length;
    return {
      ditagih: semua.reduce((s, t) => s + t.jumlah, 0),
      terbayar: semua.reduce((s, t) => s + t.terbayar, 0),
      belum: hitung("belum"),
      sebagian: hitung("sebagian"),
      lunas: hitung("lunas"),
      dibebaskan: hitung("dibebaskan"),
    };
  }, [semua]);

  const bayarMutation = useMutation({
    mutationFn: async () => {
      if (!bayar) return;
      const res = await apiRequest("POST", `/api/admin/rw3biz/tagihan/${bayar.id}/bayar`, {
        jumlah: parseInt(jumlahBayar.replace(/\D/g, ""), 10) || 0,
        tanggal: tanggalBayar,
      });
      return readJsonSafely<{ pembayaranId?: number; nomorKwitansi?: string }>(res);
    },
    onSuccess: (hasil) => {
      toast({
        title: "Pembayaran dicatat",
        description: `Masuk Kas RW kategori Kontribusi RW3BIZ${hasil?.nomorKwitansi ? ` · kwitansi ${hasil.nomorKwitansi}` : ""}`,
      });
      if (hasil?.pembayaranId) window.open(`/api/admin/rw3biz/kwitansi/${hasil.pembayaranId}`, "_blank", "noopener");
      setBayar(null);
      invalidateTagihan();
    },
    onError: (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const batalMutation = useMutation({
    mutationFn: async (id: number) => readJsonSafely(await apiRequest("POST", `/api/admin/rw3biz/tagihan/${id}/batal`)),
    onSuccess: () => {
      toast({ title: "Pembayaran dibatalkan", description: "Catatan kas terkait ikut dihapus" });
      invalidateTagihan();
    },
    onError: (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const bebasMutation = useMutation({
    mutationFn: async () => {
      if (!bebas) return;
      return readJsonSafely(
        await apiRequest("POST", `/api/admin/rw3biz/tagihan/${bebas.id}/bebaskan`, { alasan: alasanBebas }),
      );
    },
    onSuccess: () => {
      toast({ title: "Tagihan dibebaskan" });
      setBebas(null);
      invalidateTagihan();
    },
    onError: (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const tanggapiMutation = useMutation({
    mutationFn: async (hasil: "diterima" | "ditolak") => {
      if (!tanggapi) return;
      return readJsonSafely(
        await apiRequest("PATCH", `/api/admin/rw3biz/keberatan/${tanggapi.id}`, { status: hasil, tanggapan }),
      );
    },
    onSuccess: () => {
      toast({ title: "Tanggapan tersimpan" });
      setTanggapi(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/keberatan"] });
    },
    onError: (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="Tagihan sumbangsih"
        description="Catat setoran sumbangsih bulanan usaha — otomatis masuk Kas RW. Tenggang tanpa denda, cicilan boleh."
        actions={
          <Input
            type="month"
            aria-label="Bulan tagihan"
            value={bulan}
            onChange={(e) => e.target.value && setBulan(e.target.value)}
            className="w-full sm:h-9 sm:w-40"
          />
        }
      />

      <Tabs defaultValue="tagihan" className="space-y-3">
        <TabsList>
          <TabsTrigger value="tagihan">Tagihan {bulan}</TabsTrigger>
          <TabsTrigger value="keberatan">
            Keberatan{keberatanStatus === "menunggu" && keberatan.length ? ` (${keberatan.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tagihan" className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Ditagih</p>
              <p className="font-semibold tabular-nums">{formatRp(ringkas.ditagih)}</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Terbayar</p>
              <p className="font-semibold tabular-nums text-success">{formatRp(ringkas.terbayar)}</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Sisa</p>
              <p className="font-semibold tabular-nums">{formatRp(ringkas.ditagih - ringkas.terbayar)}</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Lunas</p>
              <p className="font-semibold tabular-nums">
                {ringkas.lunas} / {semua.length}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Visitrw3ChipFilters
              options={[
                { value: "semua" as const, label: "Semua", count: semua.length },
                { value: "belum" as const, label: "Belum", count: ringkas.belum },
                { value: "sebagian" as const, label: "Cicilan", count: ringkas.sebagian },
                { value: "lunas" as const, label: "Lunas", count: ringkas.lunas },
                { value: "dibebaskan" as const, label: "Dibebaskan", count: ringkas.dibebaskan },
              ]}
              value={status}
              onChange={setStatus}
            />
            <Input placeholder="Cari usaha / nomor / PJ" value={cari} onChange={(e) => setCari(e.target.value)} className="w-full sm:h-9 sm:w-56" />
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : list.length === 0 ? (
            <Visitrw3EmptyState
              icon={Receipt}
              title="Belum ada tagihan"
              description="Tagihan dibuat otomatis saat usaha disetujui dan setiap bulan berjalan."
            />
          ) : (
            <div className="space-y-2">
              {list.map((t) => {
                const sisa = t.jumlah - t.terbayar;
                const bisaBayar = sisa > 0 && t.status !== "dibebaskan";
                const bisaBatal = t.terbayar > 0;
                const bisaBebas = t.terbayar === 0 && t.status !== "dibebaskan";
                const batalkan = () => {
                  if (window.confirm(`Batalkan semua pembayaran ${t.usaha.namaUsaha} periode ${t.periode}? Catatan kas ikut dihapus.`)) {
                    batalMutation.mutate(t.id);
                  }
                };
                const bukaBebas = () => {
                  setBebas(t);
                  setAlasanBebas("");
                };
                return (
                  <Visitrw3ListItem
                    key={t.id}
                    accent={t.status === "lunas" ? "success" : t.telat ? "danger" : t.status === "dibebaskan" ? undefined : "warning"}
                    actions={
                      <>
                        {bisaBayar && t.usaha.pjNomorWhatsapp && (
                          <Button size="sm" variant="outline" className="flex-1 gap-1 text-green-700 border-green-200 sm:h-8 sm:flex-none" asChild>
                            <a
                              href={toWaMeUrl(
                                t.usaha.pjNomorWhatsapp,
                                `Assalamu'alaikum, ${t.usaha.pjNama}.\n\nPengingat sumbangsih RW3BIZ *${t.usaha.nomorBiz}* (${t.usaha.namaUsaha}) periode ${t.periode}: ${formatRp(sisa)}. Batas ${t.jatuhTempo}, tanpa denda dan boleh dicicil.\n\nSumbangsih dipakai untuk program RW 03: Linmas, kebersihan, dana sosial, dan pemeliharaan lingkungan. Terima kasih.`,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Ingatkan
                            </a>
                          </Button>
                        )}
                        {bisaBayar && (
                          <Button
                            size="sm"
                            className="flex-1 gap-1 sm:h-8 sm:flex-none"
                            onClick={() => {
                              setBayar(t);
                              setJumlahBayar(String(sisa));
                              setTanggalBayar(hariIni());
                            }}
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            Bayar
                          </Button>
                        )}
                        {bisaBatal && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hidden gap-1 sm:inline-flex sm:h-8"
                            disabled={batalMutation.isPending}
                            onClick={batalkan}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Batal
                          </Button>
                        )}
                        {bisaBebas && (
                          <Button size="sm" variant="ghost" className="hidden gap-1 sm:inline-flex sm:h-8" onClick={bukaBebas}>
                            <Ban className="w-3.5 h-3.5" />
                            Bebaskan
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hidden gap-1 sm:inline-flex sm:h-8"
                          onClick={() => setUbahUsahaId(t.usahaId)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Sumbangsih
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size={bisaBayar ? "icon" : "sm"}
                              variant="outline"
                              className={bisaBayar ? "shrink-0 sm:hidden" : "flex-1 gap-1 sm:hidden"}
                              aria-label="Aksi lain"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                              {bisaBayar ? null : "Aksi lain"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-52">
                            {bisaBatal && (
                              <DropdownMenuItem className="min-h-11 gap-2" disabled={batalMutation.isPending} onSelect={batalkan}>
                                <RotateCcw className="h-4 w-4" /> Batalkan pembayaran
                              </DropdownMenuItem>
                            )}
                            {bisaBebas && (
                              <DropdownMenuItem className="min-h-11 gap-2" onSelect={bukaBebas}>
                                <Ban className="h-4 w-4" /> Bebaskan tagihan
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => setUbahUsahaId(t.usahaId)}>
                              <Pencil className="h-4 w-4" /> Ubah sumbangsih
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Visitrw3MonoId>{t.usaha.nomorInduk ?? t.usaha.nomorBiz}</Visitrw3MonoId>
                      <Visitrw3RtBadge rt={t.usaha.rt} />
                      <StatusPil status={t.status} telat={t.telat} />
                    </div>
                    <p className="text-sm font-medium break-words">{t.usaha.namaUsaha}</p>
                    {bisaBayar && (
                      <p className="text-sm font-semibold tabular-nums sm:hidden">
                        Sisa {formatRp(sisa)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground break-words">
                      {labelPeriode(t.periode)} · tagihan {formatRp(t.jumlah)}
                      {t.jumlah !== t.kontribusiBulanan ? ` (sumbangsih ${formatRp(t.kontribusiBulanan)})` : ""} · terbayar{" "}
                      {formatRp(t.terbayar)} · tempo {t.jatuhTempo}
                    </p>
                    {t.catatan.length > 0 && <p className="text-xs text-muted-foreground break-words">{t.catatan.join(" · ")}</p>}
                    {(t.pembayaran ?? []).map((b) => (
                      <a
                        key={b.id}
                        href={`/api/admin/rw3biz/kwitansi/${b.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-10 items-center gap-1 text-xs text-brand hover:underline sm:min-h-0 sm:text-[11px]"
                      >
                        <Receipt className="h-3 w-3" /> {b.nomorKwitansi} · {formatRp(b.jumlah)} · {b.tanggal}
                      </a>
                    ))}
                  </Visitrw3ListItem>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="keberatan" className="space-y-3">
          <Visitrw3ChipFilters
            options={[
              { value: "menunggu" as const, label: "Menunggu" },
              { value: "semua" as const, label: "Semua" },
            ]}
            value={keberatanStatus}
            onChange={setKeberatanStatus}
          />
          {keberatan.length === 0 ? (
            <Visitrw3EmptyState
              icon={Receipt}
              title="Tidak ada keberatan"
              description="Pengusaha bisa mengajukan peninjauan tarif dari halaman cek status RW3BIZ."
            />
          ) : (
            <div className="space-y-2">
              {keberatan.map((k) => (
                <Visitrw3ListItem
                  key={k.id}
                  accent={k.status === "menunggu" ? "warning" : k.status === "diterima" ? "success" : "danger"}
                  actions={
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 sm:h-8 sm:flex-none sm:border-transparent sm:bg-transparent"
                        onClick={() => setUbahUsahaId(k.usahaId)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Kontribusi
                      </Button>
                      {k.status === "menunggu" && (
                        <Button
                          size="sm"
                          className="flex-1 sm:h-8 sm:flex-none"
                          onClick={() => {
                            setTanggapi(k);
                            setTanggapan("");
                          }}
                        >
                          Tanggapi
                        </Button>
                      )}
                    </>
                  }
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Visitrw3MonoId>{k.usaha.nomorBiz}</Visitrw3MonoId>
                    <span className="text-xs text-muted-foreground">{new Date(k.createdAt).toLocaleDateString("id-ID")}</span>
                    <span className="text-xs font-medium">{k.status}</span>
                  </div>
                  <p className="text-sm font-medium break-words">
                    {k.usaha.namaUsaha}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {k.usaha.kontribusiBulanan != null ? formatRp(k.usaha.kontribusiBulanan) : "—"}/bln
                    </span>
                  </p>
                  <p className="text-xs whitespace-pre-line break-words">{k.alasan}</p>
                  {k.tanggapanAdmin && <p className="text-xs text-muted-foreground mt-1">Tanggapan: {k.tanggapanAdmin}</p>}
                </Visitrw3ListItem>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={bayar != null} onOpenChange={(o) => !o && setBayar(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Catat pembayaran</DialogTitle>
          </DialogHeader>
          {bayar && (
            <div className="space-y-3 text-sm">
              <p>
                {bayar.usaha.namaUsaha} · periode {bayar.periode}
                <br />
                <span className="text-xs text-muted-foreground">
                  Sisa {formatRp(bayar.jumlah - bayar.terbayar)} — isi lebih kecil untuk cicilan.
                </span>
              </p>
              <div className="space-y-1">
                <Label>Jumlah (Rp)</Label>
                <Input inputMode="numeric" value={jumlahBayar} onChange={(e) => setJumlahBayar(e.target.value.replace(/\D/g, ""))} />
                {jumlahBayar && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatRp(parseInt(jumlahBayar, 10) || 0)}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Tanggal bayar</Label>
                <Input type="date" value={tanggalBayar} max={hariIni()} onChange={(e) => setTanggalBayar(e.target.value)} />
              </div>
              <Button className="w-full gap-1" disabled={bayarMutation.isPending || !jumlahBayar} onClick={() => bayarMutation.mutate()}>
                <Check className="w-4 h-4" /> Simpan ke Kas RW
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={bebas != null} onOpenChange={(o) => !o && setBebas(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bebaskan tagihan</DialogTitle>
          </DialogHeader>
          {bebas && (
            <div className="space-y-3 text-sm">
              <p>
                {bebas.usaha.namaUsaha} · periode {bebas.periode} ({formatRp(bebas.jumlah)})
              </p>
              <div className="space-y-1">
                <Label>Alasan</Label>
                <Textarea rows={2} value={alasanBebas} onChange={(e) => setAlasanBebas(e.target.value)} placeholder="Contoh: usaha tutup sebulan karena sakit" />
              </div>
              <Button className="w-full" disabled={bebasMutation.isPending || alasanBebas.trim().length < 3} onClick={() => bebasMutation.mutate()}>
                Bebaskan periode ini
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={tanggapi != null} onOpenChange={(o) => !o && setTanggapi(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tanggapi keberatan</DialogTitle>
          </DialogHeader>
          {tanggapi && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{tanggapi.usaha.namaUsaha}</p>
              <p className="rounded-lg bg-muted/40 p-2 text-xs whitespace-pre-line">{tanggapi.alasan}</p>
              <p className="text-xs text-muted-foreground">
                Bila diterima, sesuaikan data/keringanan lewat tombol Kontribusi agar tagihan bulan berjalan ikut berubah.
              </p>
              <div className="space-y-1">
                <Label>Tanggapan untuk pengusaha</Label>
                <Textarea rows={3} value={tanggapan} onChange={(e) => setTanggapan(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" disabled={tanggapiMutation.isPending || tanggapan.trim().length < 3} onClick={() => tanggapiMutation.mutate("diterima")}>
                  Terima
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={tanggapiMutation.isPending || tanggapan.trim().length < 3}
                  onClick={() => tanggapiMutation.mutate("ditolak")}
                >
                  Tolak
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UbahKontribusiDialog usahaId={ubahUsahaId} onClose={() => setUbahUsahaId(null)} />
    </Visitrw3AdminShell>
  );
}

function bacaHasil(raw: string | null): HasilKontribusi | null {
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { hasil?: HasilKontribusi }).hasil ?? null;
  } catch {
    return null;
  }
}

function UbahKontribusiDialog({ usahaId, onClose }: { usahaId: number | null; onClose: () => void }) {
  const { toast } = useToast();
  const { data: daftarUsaha = [] } = useQuery<UsahaRow[]>({
    queryKey: ["/api/admin/rw3biz/usaha"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/usaha", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat usaha");
      return res.json();
    },
    enabled: usahaId != null,
  });
  const usaha = daftarUsaha.find((u) => u.id === usahaId) ?? null;

  const [data, setData] = useState<DataKontribusiEdit | null>(null);
  const [sumbangsih, setSumbangsih] = useState<IsianSumbangsih>({});
  const [keringanan, setKeringanan] = useState({ jenis: "", persen: "50", sampai: "", alasan: "" });

  useEffect(() => {
    if (!usaha) return;
    setData(dataKontribusiDariBaris(usaha as Parameters<typeof dataKontribusiDariBaris>[0]));
    setSumbangsih(Object.fromEntries((parseSumbangsih(usaha.sumbangsih) ?? []).map((s) => [s.posId, s.nominal])));
    setKeringanan({
      jenis: usaha.keringananJenis ?? "",
      persen: String(usaha.keringananPersen ?? 50),
      sampai: usaha.keringananSampai ?? "",
      alasan: usaha.keringananAlasan ?? "",
    });
  }, [usaha?.id]);

  const simpan = useMutation({
    mutationFn: async () => {
      if (!usaha || !data) return;
      const res = await apiRequest("PATCH", `/api/admin/rw3biz/usaha/${usaha.id}/kontribusi`, {
        koreksi: data,
        sumbangsih: sumbangsihPayload(sumbangsih),
        keringanan: keringanan.jenis
          ? {
              jenis: keringanan.jenis,
              persen: Number(keringanan.persen),
              sampai: keringanan.sampai,
              alasan: keringanan.alasan,
            }
          : null,
      });
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Sumbangsih diperbarui", description: "Tagihan bulan berjalan yang belum dibayar ikut diperbarui" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/usaha"] });
      invalidateTagihan();
      onClose();
    },
    onError: (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const sumbangsihLama = usaha ? parseSumbangsih(usaha.sumbangsih) : null;
  const hasilLama = usaha && !sumbangsihLama ? bacaHasil(usaha.rincianKontribusi) : null;

  return (
    <Dialog open={usahaId != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Ubah sumbangsih usaha</DialogTitle>
        </DialogHeader>
        {!usaha || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-4 text-sm">
            <p>
              <span className="font-mono text-xs">{usaha.nomorBiz}</span> · {usaha.namaUsaha}
            </p>
            {sumbangsihLama && <RingkasanSumbangsih items={sumbangsihLama} catatan="Sumbangsih saat ini." />}
            {hasilLama && (
              <div className="rounded-lg border p-2">
                <p className="mb-1 text-xs font-semibold">Kontribusi saat ini (usaha lama, dari rumus)</p>
                <RincianKontribusi hasil={hasilLama} ringkas />
                <p className="mt-1 text-xs text-muted-foreground">Isi sumbangsih di bawah untuk beralih ke sumbangsih per program.</p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold">Sumbangsih baru (sesuai kesepakatan dengan pengusaha)</p>
              <SumbangsihFields value={sumbangsih} onChange={setSumbangsih} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Perbarui data usaha</p>
              <KoreksiKontribusiEditor data={data} onData={(patch) => setData((d) => (d ? { ...d, ...patch } : d))} />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-semibold">Keringanan sementara</p>
              <Select value={keringanan.jenis || "tidak"} onValueChange={(v) => setKeringanan((k) => ({ ...k, jenis: v === "tidak" ? "" : v }))}>
                <SelectTrigger className="text-sm sm:h-9 sm:text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tidak">Tidak ada keringanan</SelectItem>
                  {KERINGANAN_JENIS.map((j) => (
                    <SelectItem key={j} value={j}>
                      {KERINGANAN_JENIS_LABEL[j]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {keringanan.jenis && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Potongan</Label>
                    <Select value={keringanan.persen} onValueChange={(v) => setKeringanan((k) => ({ ...k, persen: v }))}>
                      <SelectTrigger className="text-sm sm:h-9 sm:text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50%</SelectItem>
                        <SelectItem value="100">100% (bebas)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Berlaku sampai</Label>
                    <Input type="date" className="sm:h-9 sm:text-xs" value={keringanan.sampai} onChange={(e) => setKeringanan((k) => ({ ...k, sampai: e.target.value }))} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Alasan</Label>
                    <Input className="sm:h-9 sm:text-xs" value={keringanan.alasan} onChange={(e) => setKeringanan((k) => ({ ...k, alasan: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
            <Button
              className="w-full"
              disabled={simpan.isPending || Boolean(keringanan.jenis && (!keringanan.sampai || keringanan.alasan.trim().length < 3))}
              onClick={() => simpan.mutate()}
            >
              Simpan & hitung ulang tagihan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
