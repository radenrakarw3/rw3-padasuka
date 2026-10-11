import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { TombolIsiPetugas } from "@/components/cetak/isi-petugas";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { invalidateVisitrw3Queries } from "@/lib/visitrw3-invalidate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Visitrw3SurveyChecklist } from "@/components/gov/visitrw3-survey-checklist";
import {
  getChecklistSurveyPengajuan,
  initChecklistState,
  validateSurveyChecklist,
} from "@shared/visitrw3-survey-checklist";
import { labelJenisWarga } from "@shared/visitrw3-jenis-warga";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Eye, ClipboardList, MessageCircle, MapPin } from "lucide-react";
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
import { formatKendaraanDisplay } from "@/lib/visitrw3-kendaraan";
import { labelJenisTempatUsahaAdmin, labelKategoriUsahaAdmin } from "@/lib/visitrw3-admin-labels";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import type { PengajuanProduct } from "@/lib/visitrw3-produk-ui";

type LolosView = "belum" | "sudah";
type HasilPengajuan = "disetujui" | "ditolak";

function getLolosViewFromSearch(search: string): LolosView {
  return new URLSearchParams(search).get("view") === "sudah" ? "sudah" : "belum";
}

function getHasilPengajuanFromSearch(search: string): HasilPengajuan {
  return new URLSearchParams(search).get("hasil") === "ditolak" ? "ditolak" : "disetujui";
}

function buildAntrianUrl(
  product: PengajuanProduct,
  view: LolosView,
  hasil?: HasilPengajuan,
): string {
  const base =
    product === "rw3biz" ? "/admin/rw3biz/antrian" : "/admin/visitrw3/antrian";
  const params = new URLSearchParams();
  params.set("view", view);
  if (view === "sudah" && hasil === "ditolak") {
    params.set("hasil", "ditolak");
  }
  return `${base}?${params.toString()}`;
}

type PengajuanRow = {
  id: number;
  nomorVisitrw3: string;
  tipe: string;
  status: string;
  keperluanPengajuan: string;
  jenisWarga?: string | null;
  alamat?: string | null;
  namaUsaha?: string | null;
  rt: number;
  jumlahPenghuni: number;
  tanggalBerlakuSampai: string;
  createdAt: string;
  kontakWhatsapp?: string | null;
  namaKontak?: string | null;
};

function pesanWaPengajuan(row: Pick<PengajuanRow, "nomorVisitrw3" | "status" | "keperluanPengajuan" | "namaKontak">) {
  const nama = row.namaKontak?.trim() || "Bapak/Ibu";
  return (
    `Assalamu'alaikum, ${nama}.\n\n` +
    `Ini dari pengurus KPP RW 03 Padasuka terkait pengajuan Visit RW3 *${row.nomorVisitrw3}* ` +
    `(${row.keperluanPengajuan}, status: ${row.status.replace(/_/g, " ")}).\n\n` +
    `Mohon konfirmasi ketersediaan untuk survey / tindak lanjut. Terima kasih.`
  );
}

function WaChatButton({
  phone,
  message,
  label = "Chat WA",
  className,
}: {
  phone?: string | null;
  message: string;
  label?: string;
  className?: string;
}) {
  if (!phone?.trim()) return null;
  const url = toWaMeUrl(phone, message);
  return (
    <Button
      size="sm"
      variant="outline"
      className={`h-8 gap-1 text-green-700 border-green-200 hover:bg-green-50 ${className ?? ""}`}
      asChild
    >
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        <MessageCircle className="w-3.5 h-3.5" />
        {label}
      </a>
    </Button>
  );
}

export default function AdminVisitrw3Antrian({
  product = "visit",
}: {
  product?: PengajuanProduct;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [lolosView, setLolosView] = useState<LolosView>(() => getLolosViewFromSearch(search));
  const [hasilPengajuan, setHasilPengajuan] = useState<HasilPengajuan>(() =>
    getHasilPengajuanFromSearch(search),
  );
  const [detailId, setDetailId] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [catatanSurvey, setCatatanSurvey] = useState("");
  const [alasanTolak, setAlasanTolak] = useState("");

  const produkQuery = product === "rw3biz" ? "rw3biz" : "visit";
  const pengajuanStatus = lolosView === "belum" ? "menunggu_survey" : hasilPengajuan;

  const { data: list = [], isLoading, isFetching } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/visitrw3/pengajuan", pengajuanStatus, produkQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/visitrw3/pengajuan?status=${pengajuanStatus}&produk=${produkQuery}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
  });

  const { data: menungguPengajuan = [] } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/visitrw3/pengajuan", "menunggu_survey", produkQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/visitrw3/pengajuan?status=menunggu_survey&produk=${produkQuery}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: disetujuiList = [] } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/visitrw3/pengajuan", "disetujui", produkQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/visitrw3/pengajuan?status=disetujui&produk=${produkQuery}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: ditolakList = [] } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/visitrw3/pengajuan", "ditolak", produkQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/visitrw3/pengajuan?status=ditolak&produk=${produkQuery}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
    staleTime: 30_000,
  });

  // Sinkron dari query string (wouter location path tidak berubah saat hanya ?view= berganti).
  useEffect(() => {
    setLolosView(getLolosViewFromSearch(search));
    setHasilPengajuan(getHasilPengajuanFromSearch(search));
  }, [search]);

  function switchLolosView(view: LolosView) {
    const nextHasil = view === "sudah" ? hasilPengajuan : "disetujui";
    setLolosView(view);
    if (view === "belum") setHasilPengajuan("disetujui");
    setLocation(buildAntrianUrl(product, view, nextHasil));
  }

  function switchHasilPengajuan(hasil: HasilPengajuan) {
    setLolosView("sudah");
    setHasilPengajuan(hasil);
    setLocation(buildAntrianUrl(product, "sudah", hasil));
  }

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/admin/visitrw3/pengajuan", detailId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/visitrw3/pengajuan/${detailId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
    enabled: detailId != null,
  });

  const checklistPengajuanItems = useMemo(() => {
    if (!detail?.pengajuan || detail.pengajuan.status !== "menunggu_survey") return [];
    const keperluan = detail.pengajuan.keperluanPengajuan as "tinggal" | "bisnis";
    return getChecklistSurveyPengajuan(keperluan, true);
  }, [detail?.pengajuan]);

  useEffect(() => {
    if (!detail?.pengajuan || detail.pengajuan.status !== "menunggu_survey") return;
    const keperluan = detail.pengajuan.keperluanPengajuan as "tinggal" | "bisnis";
    const items = getChecklistSurveyPengajuan(keperluan, true);
    setChecklist(initChecklistState(items));
    setCatatanSurvey("");
    setAlasanTolak("");
  }, [
    detailId,
    detail?.pengajuan?.status,
    detail?.pengajuan?.keperluanPengajuan,
  ]);

  function openDetail(id: number) {
    setChecklist({});
    setCatatanSurvey("");
    setAlasanTolak("");
    setDetailId(id);
  }

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const err = validateSurveyChecklist(checklistPengajuanItems, checklist);
      if (err) throw new Error(err);
      const body: { catatanSurvey?: string; checklistSurvey: Record<string, boolean> } = {
        checklistSurvey: checklist,
      };
      if (catatanSurvey.trim()) body.catatanSurvey = catatanSurvey.trim();
      const res = await apiRequest("PATCH", `/api/admin/visitrw3/pengajuan/${id}/approve`, body);
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Disetujui", description: "Pengajuan telah disetujui setelah survey" });
      setDetailId(null);
      setChecklist({});
      setCatatanSurvey("");
      invalidateVisitrw3Queries(queryClient);
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/visitrw3/pengajuan/${id}/reject`, {
        alasanTolak,
      });
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Ditolak" });
      setDetailId(null);
      invalidateVisitrw3Queries(queryClient, { includeKas: false });
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const lolosViewOptions = [
    {
      value: "belum" as const,
      label: "Menunggu survey",
      count: menungguPengajuan.length,
    },
    {
      value: "sudah" as const,
      label: "Sudah diputus",
      count: disetujuiList.length + ditolakList.length,
    },
  ];

  const hasilPengajuanOptions = [
    { value: "disetujui" as const, label: "Disetujui", count: disetujuiList.length },
    { value: "ditolak" as const, label: "Ditolak", count: ditolakList.length },
  ];

  const p = detail?.pengajuan;
  const isJualan =
    p?.jenisWarga === "jualan" || p?.keperluanPengajuan === "bisnis";

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product={product}
        title={
          lolosView === "belum"
            ? product === "rw3biz"
              ? "Menunggu survey usaha"
              : "Menunggu survey"
            : product === "rw3biz"
              ? "Sudah diputus (usaha)"
              : "Sudah diputus"
        }
        description={
          lolosView === "belum"
            ? product === "rw3biz"
              ? "Antrian izin jualan / usaha yang menunggu survey & keputusan admin."
              : "Antrian ngontrak / ngekost ber-KTP luar RW 03. Penyewa ber-KTP RW 03 didata di Kependudukan, bukan di sini."
            : "Riwayat pengajuan yang sudah disetujui atau ditolak."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Visitrw3ChipFilters options={lolosViewOptions} value={lolosView} onChange={switchLolosView} />
            <TombolIsiPetugas product={product === "rw3biz" ? "rw3biz" : "visit"} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-muted-foreground">
          {lolosView === "belum"
            ? "Pengajuan kontrak, kost, atau jualan — setujui setelah survey lapangan."
            : "Pilih Disetujui atau Ditolak untuk melihat riwayat keputusan."}
        </p>
        {lolosView === "sudah" && (
          <Visitrw3ChipFilters
            options={hasilPengajuanOptions}
            value={hasilPengajuan}
            onChange={switchHasilPengajuan}
          />
        )}
      </div>

      {isLoading && list.length === 0 ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <Visitrw3EmptyState
          icon={ClipboardList}
          title={
            lolosView === "belum"
              ? "Tidak ada yang menunggu survey"
              : hasilPengajuan === "ditolak"
                ? "Belum ada pengajuan ditolak"
                : "Belum ada pengajuan disetujui"
          }
          description={
            lolosView === "belum"
              ? `Pengajuan baru muncul di sini setelah warga kirim lewat ${VISITRW3_ROUTES.hub}.`
              : "Riwayat keputusan admin akan muncul di sini setelah survey selesai."
          }
        />
      ) : (
        <div className={isFetching ? "space-y-2 opacity-80 transition-opacity" : "space-y-2"}>
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
              onClick={() => openDetail(row.id)}
              actions={
                <>
                  <WaChatButton
                    phone={row.kontakWhatsapp}
                    message={pesanWaPengajuan(row)}
                    label="Chat WA"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(row.id);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    Detail
                  </Button>
                </>
              }
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Visitrw3MonoId>{row.nomorVisitrw3}</Visitrw3MonoId>
                <Visitrw3RtBadge rt={row.rt} />
                <StatusBadge variant={visitrw3StatusVariant(row.status)} />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(163,55%,22%)]/10 text-[hsl(163,55%,22%)]">
                  {labelJenisWarga(row.jenisWarga)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {row.tipe.replace(/_/g, " ")} · {labelJenisWarga(row.jenisWarga)} · {row.jumlahPenghuni}{" "}
                orang
                {row.namaUsaha ? ` · ${row.namaUsaha}` : ""}
              </p>
              {row.alamat?.trim() && (
                <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
                  <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                  <span className="break-words">{row.alamat.trim()}</span>
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Berlaku sampai {row.tanggalBerlakuSampai}
              </p>
            </Visitrw3ListItem>
          ))}
        </div>
      )}

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail pengajuan</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail || !p ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono font-bold">{p.nomorVisitrw3}</p>
                <Visitrw3RtBadge rt={p.rt} />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(163,55%,22%)]/10 text-[hsl(163,55%,22%)]">
                  {labelJenisWarga(p.jenisWarga)}
                </span>
                <StatusBadge variant={visitrw3StatusVariant(p.status)} />
              </div>

              <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                <p>
                  <span className="text-muted-foreground">RT: </span>
                  {String(p.rt).padStart(2, "0")}
                </p>
                {p.alamat?.trim() && (
                  <p>
                    <span className="text-muted-foreground">Alamat: </span>
                    {p.alamat.trim()}
                  </p>
                )}
                {p.nomorUnit && (
                  <p>
                    <span className="text-muted-foreground">Nomor unit: </span>
                    {p.nomorUnit}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Masa berlaku: </span>
                  {p.tanggalBayar} — {p.tanggalBerlakuSampai}
                  {p.terminBulan != null ? ` · ${p.terminBulan} bln` : ""}
                </p>
              </div>

              {isJualan && (
                <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                  <p className="font-medium">Data usaha</p>
                  {p.namaUsaha && <p>Nama: {p.namaUsaha}</p>}
                  {p.jenisTempatUsaha && (
                    <p className="text-muted-foreground">
                      Jenis tempat:{" "}
                      {labelJenisTempatUsahaAdmin(p.jenisTempatUsaha, p.jenisTempatUsahaLain)}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Kategori usaha:{" "}
                    {p.kategoriUsaha
                      ? labelKategoriUsahaAdmin(p.kategoriUsaha)
                      : "— (pengajuan lama, belum tercatat)"}
                  </p>
                  {p.jamBuka && p.jamTutup && (
                    <p className="text-muted-foreground">
                      Jam operasional: {p.jamBuka} – {p.jamTutup}
                    </p>
                  )}
                  {p.alamatUsaha && (
                    <p className="text-muted-foreground">Alamat usaha: {p.alamatUsaha}</p>
                  )}
                  {p.penanggungJawab && <p>Penanggung jawab: {p.penanggungJawab}</p>}
                </div>
              )}

              {!isJualan && p.namaUsaha && (
                <p>
                  <span className="text-muted-foreground">Usaha: </span>
                  {p.namaUsaha}
                </p>
              )}

              {p.persetujuanTetangga &&
                (() => {
                  try {
                    const tetangga = JSON.parse(p.persetujuanTetangga) as {
                      posisi: string;
                      slot: number;
                      namaWarga: string;
                      nomorWhatsapp: string;
                    }[];
                    return (
                      <div className="space-y-2">
                        <p className="font-medium">Persetujuan tetangga</p>
                        <div className="grid grid-cols-2 gap-2">
                          {tetangga.map((t) => (
                            <div key={`${t.posisi}-${t.slot}`} className="rounded border p-2 text-xs">
                              <p className="font-medium capitalize">
                                {t.posisi} {t.slot}
                              </p>
                              <p>{t.namaWarga}</p>
                              <p className="text-muted-foreground">{t.nomorWhatsapp}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch {
                    return null;
                  }
                })()}

              <div className="space-y-2">
                <p className="font-medium">Identitas penghuni</p>
                {detail.penghuni?.map(
                  (ph: {
                    id: number;
                    namaLengkap: string;
                    isAnak?: boolean;
                    nomorWhatsapp?: string | null;
                    nik?: string | null;
                    punyaKendaraan?: boolean;
                    jenisKendaraan?: string | null;
                    platNomor?: string | null;
                    namaSekolah?: string | null;
                    fotoKtpPath?: string | null;
                    hasFotoKtp?: boolean;
                  }) => (
                    <div key={ph.id} className="rounded border p-2 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {ph.namaLengkap} {ph.isAnak ? "(anak)" : ""}
                        </p>
                        {!ph.isAnak && ph.nomorWhatsapp && (
                          <WaChatButton
                            phone={ph.nomorWhatsapp}
                            message={pesanWaPengajuan({
                              nomorVisitrw3: p.nomorVisitrw3,
                              status: p.status,
                              keperluanPengajuan: p.keperluanPengajuan,
                              namaKontak: ph.namaLengkap,
                            })}
                            label="Chat WA"
                          />
                        )}
                      </div>
                      {!ph.isAnak && (
                        <p className="text-xs">
                          NIK: {ph.nik} · WA: {ph.nomorWhatsapp}
                        </p>
                      )}
                      {ph.punyaKendaraan && (
                        <p className="text-xs">
                          Kendaraan:{" "}
                          {formatKendaraanDisplay(ph.jenisKendaraan, ph.platNomor) || "—"}
                        </p>
                      )}
                      {ph.isAnak && ph.namaSekolah && (
                        <p className="text-xs">Jenjang: {ph.namaSekolah}</p>
                      )}
                      {(ph.hasFotoKtp || ph.fotoKtpPath) && (
                        <div className="pt-1 space-y-1">
                          <a
                            className="text-xs text-primary underline"
                            href={`/api/admin/visitrw3/penghuni/${ph.id}/ktp`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Lihat KTP
                          </a>
                          <img
                            src={`/api/admin/visitrw3/penghuni/${ph.id}/ktp`}
                            alt={`KTP ${ph.namaLengkap}`}
                            className="mt-1 max-h-40 rounded border object-contain bg-muted/40"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>

              {p.status === "menunggu_survey" && (
                <>
                  <Visitrw3SurveyChecklist
                    title="Checklist survey pengajuan"
                    subtitle="Tanyakan ke pemohon — centang setelah terkonfirmasi di lapangan"
                    items={checklistPengajuanItems}
                    checked={checklist}
                    onChange={(id, value) =>
                      setChecklist((s) => ({ ...s, [id]: value }))
                    }
                  />
                  <div className="space-y-2">
                    <Label>Catatan survey (opsional)</Label>
                    <Textarea
                      value={catatanSurvey}
                      onChange={(e) => setCatatanSurvey(e.target.value)}
                      placeholder="Catatan dari hasil survey lapangan…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alasan tolak</Label>
                    <Textarea value={alasanTolak} onChange={(e) => setAlasanTolak(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-1"
                      onClick={() => approveMutation.mutate(p.id)}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="w-4 h-4" /> Setujui
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-1"
                      onClick={() => rejectMutation.mutate(p.id)}
                      disabled={rejectMutation.isPending || !alasanTolak.trim()}
                    >
                      <X className="w-4 h-4" /> Tolak
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Visitrw3AdminShell>
  );
}
