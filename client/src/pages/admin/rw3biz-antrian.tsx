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
import { Check, X, Eye, ClipboardList, MessageCircle, MapPin, Store } from "lucide-react";
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
    <Button size="sm" variant="outline" className="h-8 gap-1 text-green-700 border-green-200" asChild>
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
      });
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Disetujui", description: "Usaha aktif — PJ dapat dihubungi untuk notifikasi/blast" });
      setDetailId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/pengajuan"] });
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
  }[];

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
          <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
                  <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={(e) => {
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
              <p className="text-xs font-medium flex items-center gap-1">
                <Store className="w-3 h-3" />
                {row.namaUsaha}
              </p>
              <p className="text-xs text-muted-foreground">
                PJ: {row.pjNama} · {row.jumlahOrang} orang · berlaku {row.tanggalBerlakuSampai}
              </p>
              {row.alamat?.trim() && (
                <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
                  <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                  {row.alamat}
                </p>
              )}
            </Visitrw3ListItem>
          ))}
        </div>
      )}

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
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
              </div>
              <div className="rounded-lg border p-3 space-y-1 bg-muted/20">
                <p><span className="text-muted-foreground">Usaha: </span>{p.namaUsaha}</p>
                <p><span className="text-muted-foreground">Tempat: </span>{labelJenisTempatUsahaAdmin(p.jenisTempatUsaha, p.jenisTempatUsahaLain)}</p>
                <p><span className="text-muted-foreground">Kategori: </span>{labelKategoriUsahaAdmin(p.kategoriUsaha)}</p>
                <p><span className="text-muted-foreground">Jam: </span>{p.jamBuka} – {p.jamTutup}</p>
                <p><span className="text-muted-foreground">Alamat: </span>{p.alamat}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50/40 p-3 space-y-1">
                <p className="text-xs font-semibold text-green-900">Penanggung jawab (WA blast)</p>
                <p>{p.pjNama}</p>
                <p className="font-mono text-xs">{p.pjNomorWhatsapp}</p>
                <p className="text-[11px] text-muted-foreground">
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
                    {o.nik && <p className="font-mono">{o.nik}</p>}
                    {o.nomorWhatsapp && <p>WA: {o.nomorWhatsapp}</p>}
                    {o.hasFotoKtp && (
                      <img
                        src={`/api/admin/rw3biz/pengajuan/${p.id}/orang/${o.id}/ktp`}
                        alt={`KTP ${o.namaLengkap}`}
                        className="mt-1 max-h-40 rounded border"
                      />
                    )}
                  </div>
                ))}
              </div>
              {p.status === "menunggu_survey" && (
                <div className="space-y-3 border-t pt-3">
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
