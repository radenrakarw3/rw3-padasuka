import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { TombolIsiPetugas } from "@/components/cetak/isi-petugas";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Eye, ClipboardList, FileText, MessageCircle, MapPin, Printer, Store } from "lucide-react";
import { toWaMeUrl } from "@/lib/wa";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3ChipFilters,
  Visitrw3EmptyState,
  Visitrw3ListItem,
  Visitrw3MonoId,
  Visitrw3RtBadge,
} from "@/components/admin/visitrw3-admin-ui";
import { StatusBadge, visitrw3StatusVariant } from "@/components/gov/status-badge";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { labelJenisTempatUsahaAdmin, labelKategoriUsahaAdmin } from "@/lib/visitrw3-admin-labels";
import {
  KoreksiKontribusiEditor,
  RincianKontribusi,
  dataKontribusiDariBaris,
  koreksiPayload,
  orangKontribusiDariBaris,
  type DataKontribusiEdit,
  type OrangKontribusiEdit,
} from "@/components/rw3biz/koreksi-kontribusi";
import {
  ASAL_ORANG_BIZ_LABEL,
  CHARTER_BIZ,
  KENDARAAN_BIZ,
  PERAN_ORANG_BIZ_LABEL,
  RENTANG_OMZET_LABEL,
  STATUS_TEMPAT_BIZ_LABEL,
  OPERASIONAL_MALAM_LABEL,
  formatRp,
  type HasilKontribusi,
} from "@shared/rw3biz-kontribusi";

function bacaRincian(raw: unknown): HasilKontribusi | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return (JSON.parse(raw) as { hasil?: HasilKontribusi }).hasil ?? null;
  } catch {
    return null;
  }
}

const labelDari = (peta: Record<string, string>, v: unknown) => (v != null && peta[String(v)]) || "—";

type LolosView = "belum" | "sudah";
type HasilPengajuan = "disetujui" | "ditolak";

type PengajuanRow = {
  id: number;
  nomorBiz: string;
  tipe: string;
  status: string;
  namaUsaha: string;
  pjNama: string;
  pjNomorWhatsapp: string;
  rt: number;
  alamat: string;
  jumlahOrang: number;
  tanggalBerlakuSampai: string;
  createdAt: string;
};

function getLolosViewFromSearch(search: string): LolosView {
  return new URLSearchParams(search).get("view") === "sudah" ? "sudah" : "belum";
}

function getHasilFromSearch(search: string): HasilPengajuan {
  return new URLSearchParams(search).get("hasil") === "ditolak" ? "ditolak" : "disetujui";
}

function buildUrl(view: LolosView, hasil?: HasilPengajuan): string {
  const params = new URLSearchParams();
  params.set("view", view);
  if (view === "sudah" && hasil === "ditolak") params.set("hasil", "ditolak");
  return `/admin/rw3biz/antrian?${params.toString()}`;
}

function WaBtn({ phone, message }: { phone?: string | null; message: string }) {
  if (!phone?.trim()) return null;
  return (
    <Button size="sm" variant="outline" className="flex-1 gap-1 text-green-700 border-green-200 sm:h-8 sm:flex-none" asChild>
      <a href={toWaMeUrl(phone, message)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        <MessageCircle className="w-3.5 h-3.5" />
        WA PJ
      </a>
    </Button>
  );
}

export default function AdminRw3bizAntrian() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [lolosView, setLolosView] = useState<LolosView>(() => getLolosViewFromSearch(search));
  const [hasil, setHasil] = useState<HasilPengajuan>(() => getHasilFromSearch(search));
  const [detailId, setDetailId] = useState<number | null>(null);
  const [catatanSurvey, setCatatanSurvey] = useState("");
  const [alasanTolak, setAlasanTolak] = useState("");
  const [koreksiAktif, setKoreksiAktif] = useState(false);
  const [dataKoreksi, setDataKoreksi] = useState<DataKontribusiEdit | null>(null);
  const [orangKoreksi, setOrangKoreksi] = useState<OrangKontribusiEdit[]>([]);

  const status = lolosView === "belum" ? "menunggu_survey" : hasil;

  useEffect(() => {
    setLolosView(getLolosViewFromSearch(search));
    setHasil(getHasilFromSearch(search));
  }, [search]);

  const { data: list = [], isLoading, isFetching } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/rw3biz/pengajuan", status],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rw3biz/pengajuan?status=${status}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
  });

  const { data: menunggu = [] } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/rw3biz/pengajuan", "menunggu_survey"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/pengajuan?status=menunggu_survey", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: disetujui = [] } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/rw3biz/pengajuan", "disetujui"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/pengajuan?status=disetujui", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: ditolak = [] } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/rw3biz/pengajuan", "ditolak"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/pengajuan?status=ditolak", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/admin/rw3biz/pengajuan", detailId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rw3biz/pengajuan/${detailId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
    enabled: detailId != null,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/rw3biz/pengajuan/${id}/approve`, {
        catatanSurvey: catatanSurvey.trim() || null,
        ...((koreksiAktif || !rincianDiajukan) && dataKoreksi ? { koreksi: koreksiPayload(dataKoreksi, orangKoreksi) } : {}),
      });
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Disetujui", description: "Usaha aktif, kontribusi bulanan ditetapkan dan tagihan dibuat" });
      setDetailId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/pengajuan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/usaha"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/rab"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/tagihan"] });
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/rw3biz/pengajuan/${id}/reject`, {
        alasanTolak,
      });
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Ditolak" });
      setDetailId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/pengajuan"] });
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const p = detail?.pengajuan;
  const orang = (detail?.orang ?? []) as {
    id: number;
    namaLengkap: string;
    isAnak: boolean;
    isPenanggungJawab: boolean;
    nik?: string | null;
    nomorWhatsapp?: string | null;
    hasFotoKtp?: boolean;
    peran?: string | null;
    asal?: string | null;
    domisili?: string | null;
    wargaId?: number | null;
  }[];
  const rincianDiajukan = bacaRincian(p?.rincianKontribusi);

  useEffect(() => {
    if (!detail?.pengajuan) return;
    setKoreksiAktif(false);
    setDataKoreksi(dataKontribusiDariBaris(detail.pengajuan));
    setOrangKoreksi(orangKontribusiDariBaris(detail.orang ?? []));
  }, [detail]);

  const viewOptions = useMemo(
    () => [
      { value: "belum" as const, label: "Menunggu survey", count: menunggu.length },
      { value: "sudah" as const, label: "Sudah diputus", count: disetujui.length + ditolak.length },
    ],
    [menunggu.length, disetujui.length, ditolak.length],
  );

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title={lolosView === "belum" ? "Survey izin usaha" : "Riwayat usaha"}
        description="Antrian RW3BIZ dari tabel terpisah — data PJ siap untuk notifikasi & blast WA."
        actions={
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <Visitrw3ChipFilters
              options={viewOptions}
              value={lolosView}
              onChange={(v) => {
                setLolosView(v);
                setLocation(buildUrl(v, hasil));
              }}
            />
            <TombolIsiPetugas product="rw3biz" />
          </div>
        }
      />

      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {lolosView === "belum"
            ? "Setujui setelah survey lokasi usaha."
            : "Filter disetujui / ditolak."}
        </p>
        {lolosView === "sudah" && (
          <Visitrw3ChipFilters
            options={[
              { value: "disetujui" as const, label: "Disetujui", count: disetujui.length },
              { value: "ditolak" as const, label: "Ditolak", count: ditolak.length },
            ]}
            value={hasil}
            onChange={(v) => {
              setHasil(v);
              setLocation(buildUrl("sudah", v));
            }}
          />
        )}
      </div>

      {isLoading && list.length === 0 ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <Visitrw3EmptyState
          icon={ClipboardList}
          title="Belum ada pengajuan"
          description={`Pengajuan baru masuk lewat ${RW3BIZ_ROUTES.hub}`}
        />
      ) : (
        <div className={isFetching ? "space-y-2 opacity-80" : "space-y-2"}>
          {list.map((row) => (
            <Visitrw3ListItem
              key={row.id}
              accent={
                row.status === "menunggu_survey"
                  ? "warning"
                  : row.status === "ditolak"
                    ? "danger"
                    : "success"
              }
              onClick={() => {
                setCatatanSurvey("");
                setAlasanTolak("");
                setDetailId(row.id);
              }}
              actions={
                <>
                  <WaBtn
                    phone={row.pjNomorWhatsapp}
                    message={`Assalamu'alaikum, ${row.pjNama}.\n\nDari KPP RW 03 terkait pengajuan RW3BIZ *${row.nomorBiz}* (${row.namaUsaha}).`}
                  />
                  <Button size="sm" variant="secondary" className="flex-1 gap-1 sm:h-8 sm:flex-none" onClick={(e) => {
                    e.stopPropagation();
                    setDetailId(row.id);
                  }}>
                    <Eye className="w-4 h-4" />
                    Detail
                  </Button>
                </>
              }
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Visitrw3MonoId>{row.nomorBiz}</Visitrw3MonoId>
                <Visitrw3RtBadge rt={row.rt} />
                <StatusBadge variant={visitrw3StatusVariant(row.status)} />
              </div>
              <p className="text-sm font-medium flex items-center gap-1 min-w-0 break-words sm:text-xs">
                <Store className="w-3.5 h-3.5 shrink-0 sm:w-3 sm:h-3" />
                {row.namaUsaha}
              </p>
              <p className="text-xs text-muted-foreground break-words">
                PJ: {row.pjNama} · {row.jumlahOrang} orang · berlaku {row.tanggalBerlakuSampai}
              </p>
              {row.alamat?.trim() && (
                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1 break-words">
                  <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                  {row.alamat}
                </p>
              )}
            </Visitrw3ListItem>
          ))}
        </div>
      )}

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="sm:max-w-xl sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Detail RW3BIZ</DialogTitle>
          </DialogHeader>
          {detailLoading || !p ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <p className="font-mono font-bold">{p.nomorBiz}</p>
                <Visitrw3RtBadge rt={p.rt} />
                <StatusBadge variant={visitrw3StatusVariant(p.status)} />
                {detail?.usaha?.nomorInduk && (
                  <span className="rounded bg-brand/10 px-2 py-0.5 font-mono text-xs font-semibold text-brand">
                    {detail.usaha.nomorInduk}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                <Button size="sm" variant="outline" className="gap-1" asChild>
                  <a href={`/api/admin/rw3biz/pengajuan/${p.id}/formulir`} target="_blank" rel="noreferrer">
                    <FileText className="w-3.5 h-3.5" /> Cetak formulir
                  </a>
                </Button>
                {p.status === "disetujui" && (
                  <Button size="sm" variant="outline" className="gap-1" asChild>
                    <a href={`/api/admin/rw3biz/pengajuan/${p.id}/surat`} target="_blank" rel="noreferrer">
                      <Printer className="w-3.5 h-3.5" /> Cetak surat izin
                    </a>
                  </Button>
                )}
              </div>
              <div className="rounded-lg border p-3 space-y-1 bg-muted/20">
                <p><span className="text-muted-foreground">Usaha: </span>{p.namaUsaha}</p>
                <p><span className="text-muted-foreground">Tempat: </span>{labelJenisTempatUsahaAdmin(p.jenisTempatUsaha, p.jenisTempatUsahaLain)}</p>
                <p><span className="text-muted-foreground">Kategori: </span>{labelKategoriUsahaAdmin(p.kategoriUsaha)}</p>
                <p><span className="text-muted-foreground">Jam: </span>{p.jamBuka} – {p.jamTutup}</p>
                <p><span className="text-muted-foreground">Alamat: </span>{p.alamat}</p>
              </div>
              <div className="rounded-lg border border-brand/30 p-3 space-y-2">
                <p className="text-xs font-semibold">Data penentu kontribusi (isian pemohon)</p>
                <div className="grid grid-cols-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-2 sm:gap-y-0.5">
                  <p><span className="text-muted-foreground">Status tempat: </span>{labelDari(STATUS_TEMPAT_BIZ_LABEL, p.statusTempat)}</p>
                  <p><span className="text-muted-foreground">Luas: </span>{p.luasM2 ?? "—"} m²</p>
                  <p className="sm:col-span-2"><span className="text-muted-foreground">Omzet: </span>{labelDari(RENTANG_OMZET_LABEL, p.rentangOmzet)}</p>
                  <p><span className="text-muted-foreground">Hari buka: </span>{p.hariOperasional ?? "—"}/minggu</p>
                  <p><span className="text-muted-foreground">Malam: </span>{labelDari(OPERASIONAL_MALAM_LABEL, p.operasionalMalam)}</p>
                  <p><span className="text-muted-foreground">Sampah: </span>{p.sampahKantongHari ?? 0} kantong/hari</p>
                  <p><span className="text-muted-foreground">Bahu jalan: </span>{p.pakaiBahuJalan ? "ya" : "tidak"}</p>
                  <p className="sm:col-span-2">
                    <span className="text-muted-foreground">Kendaraan: </span>
                    {KENDARAAN_BIZ.filter((k) => (p[k.kode] ?? 0) > 0)
                      .map((k) => `${p[k.kode]} ${k.label.toLowerCase()}`)
                      .join(" · ") || "tidak ada"}
                  </p>
                  {CHARTER_BIZ.some((c) => (p[c.kode] ?? 0) > 0) && (
                    <p className="sm:col-span-2">
                      <span className="text-muted-foreground">Charter: </span>
                      {CHARTER_BIZ.filter((c) => (p[c.kode] ?? 0) > 0)
                        .map((c) => `${c.label.replace(" charter", "").toLowerCase()} ${p[c.kode]}×/minggu`)
                        .join(" · ")}
                      {p.charterPenyedia ? ` (${p.charterPenyedia})` : ""}
                    </p>
                  )}
                  <p><span className="text-muted-foreground">Usaha baru: </span>{p.usahaBaru ? "ya" : "tidak"}</p>
                </div>
                {rincianDiajukan ? (
                  <RincianKontribusi hasil={rincianDiajukan} />
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada rincian (pengajuan lama) — isi koreksi survey sebelum menyetujui.</p>
                )}
                {p.kontribusiBulanan != null && p.status !== "menunggu_survey" && (
                  <p className="text-xs">Kontribusi ditetapkan: <strong>{formatRp(p.kontribusiBulanan)}</strong> / bulan</p>
                )}
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50/40 p-3 space-y-1">
                <p className="text-xs font-semibold text-green-900">Penanggung jawab (WA blast)</p>
                <p>{p.pjNama}</p>
                <p className="font-mono text-xs">{p.pjNomorWhatsapp}</p>
                <p className="text-xs text-muted-foreground">
                  Opt-in notifikasi: {p.pjSetujuNotifikasi ? "ya" : "tidak"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-xs">Orang terdaftar ({orang.length})</p>
                {orang.map((o) => (
                  <div key={o.id} className="rounded border p-2 text-xs space-y-1">
                    <p className="font-medium">
                      {o.namaLengkap}
                      {o.isPenanggungJawab ? " · PJ" : ""}
                      {o.isAnak ? " · anak" : ""}
                    </p>
                    {!o.isAnak && (
                      <p className="text-muted-foreground">
                        {labelDari(PERAN_ORANG_BIZ_LABEL, o.peran)} · {labelDari(ASAL_ORANG_BIZ_LABEL, o.asal)}
                        {o.wargaId ? <span className="text-success"> · cocok data warga RW 03</span> : null}
                        {o.asal === "luar" && o.domisili ? ` · ${o.domisili}` : ""}
                      </p>
                    )}
                    {o.nik && <p className="font-mono">{o.nik}</p>}
                    {o.nomorWhatsapp && <p>WA: {o.nomorWhatsapp}</p>}
                    {o.hasFotoKtp && (
                      <img
                        src={`/api/admin/rw3biz/pengajuan/${p.id}/orang/${o.id}/ktp`}
                        alt={`KTP ${o.namaLengkap}`}
                        className="mt-1 max-h-40 max-w-full rounded border"
                      />
                    )}
                  </div>
                ))}
              </div>
              {p.status === "menunggu_survey" && (
                <div className="space-y-3 border-t pt-3">
                  <div className="rounded-lg border p-3 space-y-2">
                    <label className="flex min-h-10 items-center gap-3 text-sm font-medium sm:min-h-0 sm:gap-2 sm:text-xs">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-[hsl(163,55%,22%)] sm:h-4 sm:w-4"
                        checked={koreksiAktif || !rincianDiajukan}
                        disabled={!rincianDiajukan}
                        onChange={(e) => setKoreksiAktif(e.target.checked)}
                      />
                      Koreksi hasil survey lapangan (isian pemohon berbeda dengan kondisi nyata)
                    </label>
                    {(koreksiAktif || !rincianDiajukan) && dataKoreksi && (
                      <KoreksiKontribusiEditor
                        data={dataKoreksi}
                        orang={orangKoreksi}
                        onData={(patch) => setDataKoreksi((d) => (d ? { ...d, ...patch } : d))}
                        onOrang={(id, patch) =>
                          setOrangKoreksi((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)))
                        }
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Catatan survey (opsional)</Label>
                    <Textarea value={catatanSurvey} onChange={(e) => setCatatanSurvey(e.target.value)} rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-1"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(p.id)}
                    >
                      <Check className="w-4 h-4" /> Setujui
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label>Alasan tolak</Label>
                    <Textarea value={alasanTolak} onChange={(e) => setAlasanTolak(e.target.value)} rows={2} />
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full gap-1"
                    disabled={!alasanTolak.trim() || rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(p.id)}
                  >
                    <X className="w-4 h-4" /> Tolak
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Visitrw3AdminShell>
  );
}
