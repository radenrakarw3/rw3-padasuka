import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getApiErrorMessage, readJsonSafely, getQueryFn } from "@/lib/queryClient";
import { invalidateVisitrw3Queries } from "@/lib/visitrw3-invalidate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Visitrw3SurveyKontribusiFields,
  defaultSurveyKontribusiState,
  surveyKontribusiToBody,
  type Visitrw3SurveyKontribusiState,
} from "@/components/gov/visitrw3-survey-kontribusi-fields";
import { Visitrw3SurveyChecklist } from "@/components/gov/visitrw3-survey-checklist";
import {
  getChecklistSurveyProperti,
  getChecklistSurveyPengajuan,
  initChecklistState,
} from "@shared/visitrw3-survey-checklist";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Eye, ClipboardList, Building2, MessageCircle, MapPin, Phone, DoorOpen, User, Calendar, FileText } from "lucide-react";
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
import {
  formatRupiah,
  formatTarifKontribusi,
  parseKontribusiSurveyRincian,
} from "@/lib/visitrw3-kontribusi";
import { labelPropertiStatus, labelPeranPropertiAdmin, labelJenisTempatUsahaAdmin, labelKategoriUsahaAdmin } from "@/lib/visitrw3-admin-labels";
import { labelJenisProperti, isUsahaRumahan } from "@/lib/constants";
import { hintSetelahPropertiAktif } from "@/lib/visitrw3-routes";

type InboxTab = "properti" | "pengajuan";
type LolosView = "belum" | "sudah";
type HasilPengajuan = "disetujui" | "ditolak";

function getSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function getInboxTabFromUrl(): InboxTab {
  return getSearchParams().get("tab") === "properti" ? "properti" : "pengajuan";
}

function getLolosViewFromUrl(): LolosView {
  return getSearchParams().get("view") === "sudah" ? "sudah" : "belum";
}

function getHasilPengajuanFromUrl(): HasilPengajuan {
  return getSearchParams().get("hasil") === "ditolak" ? "ditolak" : "disetujui";
}

function buildAntrianUrl(tab: InboxTab, view: LolosView, hasil?: HasilPengajuan): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  params.set("view", view);
  if (view === "sudah" && tab === "pengajuan" && hasil === "ditolak") {
    params.set("hasil", "ditolak");
  }
  return `/admin/visitrw3/antrian?${params.toString()}`;
}

type PengajuanRow = {
  id: number;
  nomorVisitrw3: string;
  tipe: string;
  status: string;
  keperluanPengajuan: string;
  rt: number;
  jumlahPenghuni: number;
  tanggalBerlakuSampai: string;
  createdAt: string;
  kontakWhatsapp?: string | null;
  namaKontak?: string | null;
};

type PropertiMenungguRow = {
  id: number;
  nomorPendaftaran: string | null;
  namaKost: string;
  namaPemilik: string;
  nomorWaPemilik: string;
  namaPenanggungJawab?: string | null;
  nomorWaPenanggungJawab?: string | null;
  rt: number;
  alamatLengkap: string;
  jenisProperti: string;
  jumlahPintu?: number;
  izinTinggal?: boolean;
  izinBisnis?: boolean;
  statusProperti: string;
  catatanPemohon?: string | null;
  createdAt: string;
};

function formatTanggalDaftar(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function labelIzinPengajuanProperti(row: PropertiMenungguRow): string {
  if (isUsahaRumahan(row.jenisProperti)) {
    return "Pemilik ajukan Visit RW3 sendiri (usaha di rumah milik sendiri)";
  }
  const parts: string[] = [];
  if (row.izinTinggal !== false) parts.push("Penyewa bisa ajukan tinggal");
  if (row.izinBisnis) parts.push("Penyewa bisa ajukan bisnis");
  return parts.length > 0 ? parts.join(" · ") : "Belum ada izin pengajuan";
}

function PropertiDetailBaris({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof MapPin;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  if (value == null || value === "") return null;
  return (
    <div className={`flex gap-2 min-w-0 ${className ?? ""}`}>
      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[hsl(163,55%,22%)]" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80">{label}</p>
        <p className="text-xs text-foreground leading-snug break-words">{value}</p>
      </div>
    </div>
  );
}

function pesanWaPengajuan(row: Pick<PengajuanRow, "nomorVisitrw3" | "status" | "keperluanPengajuan" | "namaKontak">) {
  const nama = row.namaKontak?.trim() || "Bapak/Ibu";
  return (
    `Assalamu'alaikum, ${nama}.\n\n` +
    `Ini dari pengurus KPP RW 03 Padasuka terkait pengajuan Visit RW3 *${row.nomorVisitrw3}* ` +
    `(${row.keperluanPengajuan}, status: ${row.status.replace(/_/g, " ")}).\n\n` +
    `Mohon konfirmasi ketersediaan untuk survey / tindak lanjut. Terima kasih.`
  );
}

function pesanWaProperti(row: Pick<PropertiMenungguRow, "namaKost" | "nomorPendaftaran" | "namaPemilik">) {
  const nomor = row.nomorPendaftaran || "pendaftaran properti";
  return (
    `Assalamu'alaikum, ${row.namaPemilik}.\n\n` +
    `Ini dari pengurus KPP RW 03 Padasuka terkait pendaftaran properti *${row.namaKost}* (${nomor}).\n\n` +
    `Mohon konfirmasi ketersediaan untuk verifikasi. Terima kasih.`
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

export default function AdminVisitrw3Antrian() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [inboxTab, setInboxTab] = useState<InboxTab>(getInboxTabFromUrl);
  const [lolosView, setLolosView] = useState<LolosView>(getLolosViewFromUrl);
  const [hasilPengajuan, setHasilPengajuan] = useState<HasilPengajuan>(getHasilPengajuanFromUrl);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [surveyForm, setSurveyForm] = useState<Visitrw3SurveyKontribusiState>(defaultSurveyKontribusiState);
  const [alasanTolak, setAlasanTolak] = useState("");
  const [approvePropertiTarget, setApprovePropertiTarget] = useState<PropertiMenungguRow | null>(null);
  const [surveyPropertiForm, setSurveyPropertiForm] = useState<Visitrw3SurveyKontribusiState>(
    defaultSurveyKontribusiState(),
  );

  const pengajuanStatus =
    lolosView === "belum" ? "menunggu_survey" : hasilPengajuan;

  const { data: list = [], isLoading } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/visitrw3/pengajuan", pengajuanStatus],
    queryFn: async () => {
      const res = await fetch(`/api/admin/visitrw3/pengajuan?status=${pengajuanStatus}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
    enabled: inboxTab === "pengajuan",
  });

  const { data: menungguPengajuan = [] } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/visitrw3/pengajuan", "menunggu_survey"],
    queryFn: async () => {
      const res = await fetch("/api/admin/visitrw3/pengajuan?status=menunggu_survey", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: propertiList = [], isLoading: propertiLoading } = useQuery<PropertiMenungguRow[]>({
    queryKey: ["/api/pemilik-kost"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const propertiMenunggu = propertiList.filter((p) => p.statusProperti === "menunggu_verifikasi");
  const propertiAktif = propertiList.filter((p) => p.statusProperti === "aktif");

  useEffect(() => {
    setInboxTab(getInboxTabFromUrl());
    setLolosView(getLolosViewFromUrl());
    setHasilPengajuan(getHasilPengajuanFromUrl());
  }, [location]);

  useEffect(() => {
    const params = getSearchParams();
    if (!params.get("tab") && propertiMenunggu.length > 0) {
      setLocation(buildAntrianUrl("properti", "belum"));
    }
  }, [propertiMenunggu.length, setLocation]);

  function switchInboxTab(tab: InboxTab) {
    setLocation(buildAntrianUrl(tab, lolosView, hasilPengajuan));
  }

  function switchLolosView(view: LolosView) {
    setLocation(buildAntrianUrl(inboxTab, view, hasilPengajuan));
  }

  function switchHasilPengajuan(hasil: HasilPengajuan) {
    setLocation(buildAntrianUrl("pengajuan", "sudah", hasil));
  }

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/admin/visitrw3/pengajuan", detailId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/visitrw3/pengajuan/${detailId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
    enabled: detailId != null,
  });

  useEffect(() => {
    if (!detail?.pengajuan || detail.pengajuan.status !== "menunggu_survey") return;
    const items = getChecklistSurveyPengajuan(
      detail.pengajuan.keperluanPengajuan as "tinggal" | "bisnis",
      detail.pengajuan.tinggalDiWilayahRw3,
    );
    setSurveyForm({
      ...defaultSurveyKontribusiState(),
      checklist: initChecklistState(items),
      keteranganKas: `Kontribusi Visit RW3 — ${detail.pengajuan.nomorVisitrw3}`,
    });
  }, [detailId, detail?.pengajuan?.status, detail?.pengajuan?.nomorVisitrw3, detail?.pengajuan?.keperluanPengajuan, detail?.pengajuan?.tinggalDiWilayahRw3]);

  useEffect(() => {
    if (!approvePropertiTarget) return;
    const items = getChecklistSurveyProperti(approvePropertiTarget.jenisProperti);
    setSurveyPropertiForm({
      ...defaultSurveyKontribusiState(),
      checklist: initChecklistState(items),
      keteranganKas: `Kontribusi properti — ${approvePropertiTarget.nomorPendaftaran ?? approvePropertiTarget.namaKost}`,
    });
  }, [approvePropertiTarget?.id, approvePropertiTarget?.jenisProperti, approvePropertiTarget?.nomorPendaftaran, approvePropertiTarget?.namaKost]);

  const checklistPengajuanItems = useMemo(() => {
    if (!detail?.pengajuan || detail.pengajuan.status !== "menunggu_survey") return [];
    return getChecklistSurveyPengajuan(
      detail.pengajuan.keperluanPengajuan as "tinggal" | "bisnis",
      detail.pengajuan.tinggalDiWilayahRw3,
    );
  }, [detail?.pengajuan]);

  const checklistPropertiItems = useMemo(
    () =>
      approvePropertiTarget
        ? getChecklistSurveyProperti(approvePropertiTarget.jenisProperti)
        : [],
    [approvePropertiTarget?.id, approvePropertiTarget?.jenisProperti],
  );

  const approveMutation = useMutation({
    mutationFn: async (payload: { id: number; checklistItems: typeof checklistPengajuanItems }) => {
      const body = surveyKontribusiToBody(surveyForm, { checklistItems: payload.checklistItems });
      const res = await apiRequest("PATCH", `/api/admin/visitrw3/pengajuan/${payload.id}/approve`, body);
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Disetujui", description: "Tarif kontribusi tersimpan — catat pembayaran manual di Keuangan" });
      setDetailId(null);
      setSurveyForm(defaultSurveyKontribusiState());
      invalidateVisitrw3Queries(queryClient);
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const approvePropertiMutation = useMutation({
    mutationFn: async (payload: { id: number; checklistItems: typeof checklistPropertiItems }) => {
      const body = surveyKontribusiToBody(surveyPropertiForm, { checklistItems: payload.checklistItems });
      const res = await apiRequest("PATCH", `/api/admin/visitrw3/properti/${payload.id}/approve`, body);
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({
        title: "Properti disetujui",
        description: "Properti aktif dan bisa dipilih penyewa di form pengajuan",
      });
      setApprovePropertiTarget(null);
      setSurveyPropertiForm(defaultSurveyKontribusiState());
      invalidateVisitrw3Queries(queryClient);
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/visitrw3/pengajuan/${id}/reject`, { alasanTolak });
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

  const belumLolosCount = propertiMenunggu.length + menungguPengajuan.length;

  const lolosViewOptions = [
    {
      value: "belum" as const,
      label: "Belum lolos",
      count: belumLolosCount,
    },
    {
      value: "sudah" as const,
      label: "Sudah lolos",
    },
  ];

  const inboxTabOptions = [
    {
      value: "properti" as const,
      label: "Properti",
      count: lolosView === "belum" ? propertiMenunggu.length : propertiAktif.length,
    },
    {
      value: "pengajuan" as const,
      label: "Pengajuan",
      count: lolosView === "belum" ? menungguPengajuan.length : undefined,
    },
  ];

  const hasilPengajuanOptions = [
    { value: "disetujui" as const, label: "Disetujui" },
    { value: "ditolak" as const, label: "Ditolak" },
  ];

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        title={lolosView === "belum" ? "Belum lolos" : "Sudah lolos"}
        description={
          lolosView === "belum"
            ? "Antrian verifikasi properti dan survey pengajuan yang masih menunggu keputusan admin."
            : "Riwayat properti aktif dan pengajuan yang sudah diputuskan (disetujui atau ditolak)."
        }
        actions={
          <Visitrw3ChipFilters options={lolosViewOptions} value={lolosView} onChange={switchLolosView} />
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <Visitrw3ChipFilters options={inboxTabOptions} value={inboxTab} onChange={switchInboxTab} />
      </div>

      {inboxTab === "properti" ? (
        propertiLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : lolosView === "belum" && propertiMenunggu.length === 0 ? (
          <Visitrw3EmptyState
            icon={Building2}
            title="Tidak ada properti yang belum lolos"
            description="Pendaftaran properti baru dari form publik akan muncul di sini. Kelola data master di tab Properti."
          />
        ) : lolosView === "sudah" && propertiAktif.length === 0 ? (
          <Visitrw3EmptyState
            icon={Building2}
            title="Belum ada properti yang sudah lolos"
            description="Properti yang sudah diverifikasi dan aktif akan muncul di sini."
          />
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {lolosView === "belum"
                ? "Lakukan survey lapangan, tentukan kontribusi, lalu setujui agar properti aktif di pengajuan Visit RW3."
                : "Properti sudah lolos verifikasi dan bisa dipilih penyewa saat pengajuan Visit RW3."}
            </p>
            {(lolosView === "belum" ? propertiMenunggu : propertiAktif).map((row) => (
            <Visitrw3ListItem
              key={`prop-${row.id}`}
              accent={lolosView === "belum" ? "warning" : "success"}
              actions={
                <>
                  <WaChatButton
                    phone={row.nomorWaPemilik}
                    message={pesanWaProperti(row)}
                    label="Chat WA"
                  />
                  {row.nomorWaPenanggungJawab &&
                    row.nomorWaPenanggungJawab !== row.nomorWaPemilik && (
                      <WaChatButton
                        phone={row.nomorWaPenanggungJawab}
                        message={pesanWaProperti(row)}
                        label="WA PJ"
                      />
                    )}
                  {lolosView === "belum" && (
                    <Button
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => {
                        setSurveyPropertiForm(defaultSurveyKontribusiState());
                        setApprovePropertiTarget(row);
                      }}
                      disabled={approvePropertiMutation.isPending}
                    >
                      <ClipboardList className="w-4 h-4" />
                      Survey
                    </Button>
                  )}
                </>
              }
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-[hsl(163,55%,22%)] shrink-0" />
                <span className="font-semibold text-sm">{row.namaKost}</span>
                <Visitrw3RtBadge rt={row.rt} />
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${
                    lolosView === "belum" ? "bg-amber-500" : "bg-[hsl(163,55%,22%)]"
                  }`}
                >
                  {labelPropertiStatus(row.statusProperti)}
                </span>
              </div>
              {row.nomorPendaftaran && (
                <div className="mb-2">
                  <Visitrw3MonoId>{row.nomorPendaftaran}</Visitrw3MonoId>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2.5 mb-2">
                <PropertiDetailBaris
                  icon={Building2}
                  label="Jenis & peran"
                  value={
                    <>
                      {labelJenisProperti(row.jenisProperti)}
                      <span className="text-muted-foreground"> · {labelPeranPropertiAdmin(row.jenisProperti)}</span>
                    </>
                  }
                />
                <PropertiDetailBaris
                  icon={DoorOpen}
                  label="Kapasitas"
                  value={
                    isUsahaRumahan(row.jenisProperti)
                      ? "1 lokasi (rumah milik sendiri)"
                      : `${row.jumlahPintu ?? 1} unit / pintu`
                  }
                />
                <PropertiDetailBaris icon={MapPin} label="Alamat" value={row.alamatLengkap} className="md:col-span-2 xl:col-span-1" />
                <PropertiDetailBaris
                  icon={User}
                  label="Pemilik"
                  value={
                    <>
                      {row.namaPemilik}
                      <span className="text-muted-foreground"> · </span>
                      {row.nomorWaPemilik}
                    </>
                  }
                />
                {(row.namaPenanggungJawab?.trim() ||
                  (row.nomorWaPenanggungJawab && row.nomorWaPenanggungJawab !== row.nomorWaPemilik)) && (
                  <PropertiDetailBaris
                    icon={Phone}
                    label="Pengelola (PJ)"
                    value={
                      <>
                        {row.namaPenanggungJawab?.trim() || "—"}
                        {row.nomorWaPenanggungJawab ? (
                          <>
                            <span className="text-muted-foreground"> · </span>
                            {row.nomorWaPenanggungJawab}
                          </>
                        ) : null}
                      </>
                    }
                  />
                )}
                <PropertiDetailBaris icon={ClipboardList} label="Izin pengajuan VRW3" value={labelIzinPengajuanProperti(row)} />
                <PropertiDetailBaris icon={Calendar} label="Tanggal daftar" value={formatTanggalDaftar(row.createdAt)} />
              </div>

              {lolosView === "belum" && (
                <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/50 pt-2 mt-1">
                  Setelah disetujui: {hintSetelahPropertiAktif(row.jenisProperti)}
                </p>
              )}

              {row.catatanPemohon?.trim() && (
                <div className="mt-2 rounded-lg border bg-muted/30 px-2.5 py-2 flex gap-2">
                  <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80">Catatan pemohon</p>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{row.catatanPemohon.trim()}</p>
                  </div>
                </div>
              )}
            </Visitrw3ListItem>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs text-muted-foreground">
              {lolosView === "belum"
                ? "Pengajuan tinggal/bisnis dan perpanjang kontrak — setujui setelah survey lapangan."
                : "Pengajuan yang sudah diputuskan admin. Buka detail untuk melihat data lengkap."}
            </p>
            {lolosView === "sudah" && (
              <Visitrw3ChipFilters
                options={hasilPengajuanOptions}
                value={hasilPengajuan}
                onChange={switchHasilPengajuan}
              />
            )}
          </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <Visitrw3EmptyState
          icon={ClipboardList}
          title={
            lolosView === "belum"
              ? "Tidak ada pengajuan yang belum lolos"
              : hasilPengajuan === "ditolak"
                ? "Tidak ada pengajuan ditolak"
                : "Belum ada pengajuan yang sudah lolos"
          }
          description={
            lolosView === "belum"
              ? "Pengajuan baru dari warga akan muncul di sini. Pastikan properti sudah aktif agar pengajuan tinggal/bisnis dalam wilayah bisa diproses."
              : "Riwayat keputusan admin akan muncul di sini setelah survey selesai."
          }
        />
      ) : (
        <div className="space-y-2">
          {list.map((row) => (
            <Visitrw3ListItem
              key={row.id}
              accent={
                row.status === "menunggu_survey" ? "warning" : row.status === "ditolak" ? "danger" : "success"
              }
              onClick={() => {
                setSurveyForm(defaultSurveyKontribusiState());
                setDetailId(row.id);
              }}
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
                      setSurveyForm(defaultSurveyKontribusiState());
                      setDetailId(row.id);
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
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {row.tipe.replace(/_/g, " ")} · {row.keperluanPengajuan} · {row.jumlahPenghuni} penghuni
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Berlaku sampai {row.tanggalBerlakuSampai}
              </p>
            </Visitrw3ListItem>
          ))}
        </div>
      )}
        </>
      )}

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail pengajuan</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4 text-sm">
              <p className="font-mono font-bold">{detail.pengajuan.nomorVisitrw3}</p>
              {detail.kost && (
                <div className="flex flex-wrap items-center gap-2">
                  <p>
                    <span className="text-muted-foreground">Properti: </span>
                    {detail.kost.namaKost} — {detail.kost.namaPemilik}
                    {detail.kost.jenisProperti && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {labelJenisProperti(detail.kost.jenisProperti)} (
                        {labelPeranPropertiAdmin(detail.kost.jenisProperti)})
                      </span>
                    )}
                  </p>
                  <WaChatButton
                    phone={detail.kost.nomorWaPemilik}
                    message={pesanWaPengajuan({
                      nomorVisitrw3: detail.pengajuan.nomorVisitrw3,
                      status: detail.pengajuan.status,
                      keperluanPengajuan: detail.pengajuan.keperluanPengajuan,
                      namaKontak: detail.kost.namaPemilik,
                    })}
                    label="WA pemilik"
                  />
                </div>
              )}
              <p>
                Bayar: {detail.pengajuan.tanggalBayar} · Berlaku sampai: {detail.pengajuan.tanggalBerlakuSampai} ·
                Termin {detail.pengajuan.terminBulan} bln
              </p>
              {(detail.pengajuan.estimasiKontribusi != null || detail.pengajuan.setujuTataTertib) && (
                <div className="rounded-lg border p-2 space-y-1">
                  <p className="font-medium">Persetujuan & kontribusi</p>
                  <p>
                    Setuju syarat:{" "}
                    {detail.pengajuan.setujuTataTertib ? (
                      <span className="text-green-700">Ya</span>
                    ) : (
                      <span className="text-muted-foreground">Tidak</span>
                    )}
                  </p>
                  {detail.pengajuan.estimasiKontribusi != null && (() => {
                    const survey = parseKontribusiSurveyRincian(detail.pengajuan.rincianKontribusi);
                    return (
                      <p>
                        Kontribusi ditetapkan:{" "}
                        {survey
                          ? formatTarifKontribusi(survey.tarifNominal, survey.satuan)
                          : formatRupiah(detail.pengajuan.estimasiKontribusi)}
                      </p>
                    );
                  })()}
                  {(() => {
                    const survey = parseKontribusiSurveyRincian(detail.pengajuan.rincianKontribusi);
                    if (survey?.tanggalMasukKas) {
                      return (
                        <p className="text-xs text-muted-foreground">
                          Tanggal masuk kas (info): {survey.tanggalMasukKas}
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {detail.pengajuan.kasRwId && (
                    <p className="text-xs text-muted-foreground">
                      Tercatat di Kas RW (ID #{detail.pengajuan.kasRwId}) — data lama
                    </p>
                  )}
                  {!detail.pengajuan.kasRwId && detail.pengajuan.estimasiKontribusi != null && (
                    <p className="text-xs text-muted-foreground">Belum dicatat di Kas RW — input manual di Keuangan</p>
                  )}
                  {detail.pengajuan.rincianKontribusi && !parseKontribusiSurveyRincian(detail.pengajuan.rincianKontribusi) && (() => {
                    try {
                      const r = JSON.parse(detail.pengajuan.rincianKontribusi);
                      return (
                        <p className="text-xs text-muted-foreground">
                          {r.kelompok || r.label}
                          {r.jumlahHari != null && ` · ${r.jumlahHari} hari`}
                          {r.terminBulan != null && r.jenis !== "pemilik" && ` · ${r.terminBulan} bln`}
                        </p>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              )}
              {detail.pengajuan.nomorUnit && (
                <p>
                  <span className="text-muted-foreground">Nomor unit: </span>
                  {detail.pengajuan.nomorUnit}
                </p>
              )}
              {detail.pengajuan.keperluanPengajuan === "bisnis" && detail.pengajuan.namaUsaha && (
                <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                  <p className="font-medium">Data usaha</p>
                  <p>Nama: {detail.pengajuan.namaUsaha}</p>
                  {detail.pengajuan.jenisTempatUsaha && (
                    <p className="text-muted-foreground">
                      Jenis tempat:{" "}
                      {labelJenisTempatUsahaAdmin(
                        detail.pengajuan.jenisTempatUsaha,
                        detail.pengajuan.jenisTempatUsahaLain,
                      )}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Kategori usaha:{" "}
                    {detail.pengajuan.kategoriUsaha
                      ? labelKategoriUsahaAdmin(detail.pengajuan.kategoriUsaha)
                      : "— (pengajuan lama, belum tercatat)"}
                  </p>
                  <p className="text-muted-foreground">
                    Tinggal di RW 03:{" "}
                    {detail.pengajuan.tinggalDiWilayahRw3 ? "Ya (form lengkap)" : "Tidak (luar wilayah)"}
                  </p>
                  {detail.pengajuan.jamBuka && detail.pengajuan.jamTutup && (
                    <p className="text-muted-foreground">
                      Jam operasional: {detail.pengajuan.jamBuka} – {detail.pengajuan.jamTutup}
                    </p>
                  )}
                  {detail.pengajuan.alamatUsaha && (
                    <p className="text-muted-foreground">Alamat usaha: {detail.pengajuan.alamatUsaha}</p>
                  )}
                  {detail.pengajuan.penanggungJawab && (
                    <p>Penanggung jawab: {detail.pengajuan.penanggungJawab}</p>
                  )}
                </div>
              )}
              {detail.pengajuan.keperluanPengajuan !== "bisnis" && detail.pengajuan.namaUsaha && (
                <div className="space-y-1">
                  <p>Usaha: {detail.pengajuan.namaUsaha}</p>
                </div>
              )}
              {detail.pengajuan.persetujuanTetangga && (() => {
                try {
                  const list = JSON.parse(detail.pengajuan.persetujuanTetangga) as {
                    posisi: string;
                    slot: number;
                    namaWarga: string;
                    nomorWhatsapp: string;
                  }[];
                  return (
                    <div className="space-y-2">
                      <p className="font-medium">Persetujuan tetangga</p>
                      <div className="grid grid-cols-2 gap-2">
                        {list.map((t) => (
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
                <p className="font-medium">Penghuni</p>
                {detail.penghuni?.map((p: any) => (
                  <div key={p.id} className="rounded border p-2 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{p.namaLengkap} {p.isAnak ? "(anak)" : ""}</p>
                      {!p.isAnak && p.nomorWhatsapp && (
                        <WaChatButton
                          phone={p.nomorWhatsapp}
                          message={pesanWaPengajuan({
                            nomorVisitrw3: detail.pengajuan.nomorVisitrw3,
                            status: detail.pengajuan.status,
                            keperluanPengajuan: detail.pengajuan.keperluanPengajuan,
                            namaKontak: p.namaLengkap,
                          })}
                          label="Chat WA"
                        />
                      )}
                    </div>
                    {!p.isAnak && <p className="text-xs">NIK: {p.nik} · WA: {p.nomorWhatsapp}</p>}
                    {p.punyaKendaraan && (
                      <p className="text-xs">
                        Kendaraan:{" "}
                        {formatKendaraanDisplay(p.jenisKendaraan, p.platNomor) || "—"}
                      </p>
                    )}
                    {p.isAnak && p.namaSekolah && (
                      <p className="text-xs">Jenjang: {p.namaSekolah}</p>
                    )}
                    {p.fotoKtpPath && (
                      <a
                        className="text-xs text-primary underline"
                        href={`/api/admin/visitrw3/ktp/${p.fotoKtpPath.split("/").pop()}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Lihat KTP
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {detail.pengajuan.status === "menunggu_survey" && (
                <>
                  <Visitrw3SurveyChecklist
                    title="Checklist survey pengajuan"
                    subtitle={
                      detail.pengajuan.tinggalDiWilayahRw3 === false
                        ? "Tanyakan ke penanggung jawab — centang setelah terkonfirmasi"
                        : "Tanyakan ke pemohon & koordinasi pemilik properti"
                    }
                    items={checklistPengajuanItems}
                    checked={surveyForm.checklist}
                    onChange={(id, value) =>
                      setSurveyForm((s) => ({ ...s, checklist: { ...s.checklist, [id]: value } }))
                    }
                  />
                  <Visitrw3SurveyKontribusiFields
                    {...surveyForm}
                    onChange={(patch) => setSurveyForm((s) => ({ ...s, ...patch }))}
                  />
                  <div className="space-y-2">
                    <Label>Alasan tolak</Label>
                    <Textarea value={alasanTolak} onChange={(e) => setAlasanTolak(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-1"
                      onClick={() => {
                        try {
                          surveyKontribusiToBody(surveyForm, { checklistItems: checklistPengajuanItems });
                          approveMutation.mutate({
                            id: detail.pengajuan.id,
                            checklistItems: checklistPengajuanItems,
                          });
                        } catch (e: unknown) {
                          toast({ title: "Lengkapi survey", description: getApiErrorMessage(e), variant: "destructive" });
                        }
                      }}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="w-4 h-4" /> Setujui
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-1"
                      onClick={() => rejectMutation.mutate(detail.pengajuan.id)}
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

      <Dialog open={!!approvePropertiTarget} onOpenChange={(o) => !o && setApprovePropertiTarget(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey properti</DialogTitle>
          </DialogHeader>
          {approvePropertiTarget && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-xs">
              <p className="font-semibold text-sm">{approvePropertiTarget.namaKost}</p>
              {approvePropertiTarget.nomorPendaftaran && (
                <p className="font-mono text-muted-foreground">{approvePropertiTarget.nomorPendaftaran}</p>
              )}
              <p className="text-muted-foreground">
                {labelJenisProperti(approvePropertiTarget.jenisProperti)} · RT{" "}
                {String(approvePropertiTarget.rt).padStart(2, "0")}
              </p>
              <p className="text-muted-foreground break-words">{approvePropertiTarget.alamatLengkap}</p>
              <p>
                Pemilik: {approvePropertiTarget.namaPemilik} · {approvePropertiTarget.nomorWaPemilik}
              </p>
              <WaChatButton
                phone={approvePropertiTarget.nomorWaPemilik}
                message={pesanWaProperti(approvePropertiTarget)}
                label="Hubungi pemilik (WA)"
              />
            </div>
          )}
          <Visitrw3SurveyChecklist
            items={checklistPropertiItems}
            checked={surveyPropertiForm.checklist}
            onChange={(id, value) =>
              setSurveyPropertiForm((s) => ({ ...s, checklist: { ...s.checklist, [id]: value } }))
            }
          />
          <Visitrw3SurveyKontribusiFields
            {...surveyPropertiForm}
            onChange={(patch) => setSurveyPropertiForm((s) => ({ ...s, ...patch }))}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApprovePropertiTarget(null)}>
              Batal
            </Button>
            <Button
              className="gap-1"
              disabled={approvePropertiMutation.isPending || !approvePropertiTarget}
              onClick={() => {
                if (!approvePropertiTarget) return;
                try {
                  surveyKontribusiToBody(surveyPropertiForm, { checklistItems: checklistPropertiItems });
                  approvePropertiMutation.mutate({
                    id: approvePropertiTarget.id,
                    checklistItems: checklistPropertiItems,
                  });
                } catch (e: unknown) {
                  toast({ title: "Lengkapi survey", description: getApiErrorMessage(e), variant: "destructive" });
                }
              }}
            >
              <Check className="w-4 h-4" /> Setujui setelah survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Visitrw3AdminShell>
  );
}
