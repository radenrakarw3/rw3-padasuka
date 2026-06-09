import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Eye, ClipboardList } from "lucide-react";
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
import { formatRupiah } from "@/lib/visitrw3-kontribusi";

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
};

export default function AdminVisitrw3Antrian() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("menunggu_survey");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [surveyForm, setSurveyForm] = useState<Visitrw3SurveyKontribusiState>(defaultSurveyKontribusiState);
  const [alasanTolak, setAlasanTolak] = useState("");

  const { data: list = [], isLoading } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/visitrw3/pengajuan", filter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/visitrw3/pengajuan?status=${filter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/admin/visitrw3/pengajuan", detailId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/visitrw3/pengajuan/${detailId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
    enabled: detailId != null,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const body = surveyKontribusiToBody(surveyForm);
      const res = await apiRequest("PATCH", `/api/admin/visitrw3/pengajuan/${id}/approve`, body);
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Disetujui", description: "Kontribusi dicatat ke Kas RW" });
      setDetailId(null);
      setSurveyForm(defaultSurveyKontribusiState());
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

  const filterOptions = [
    { value: "menunggu_survey" as const, label: "Menunggu survey" },
    { value: "disetujui" as const, label: "Disetujui" },
    { value: "ditolak" as const, label: "Ditolak" },
    { value: "semua" as const, label: "Semua" },
  ];

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        title="Antrian pengajuan"
        description="Survey, setujui/tolak, dan catat kontribusi ke Kas RW"
        actions={
          <Visitrw3ChipFilters options={filterOptions} value={filter as typeof filterOptions[number]["value"]} onChange={setFilter} />
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <Visitrw3EmptyState
          icon={ClipboardList}
          title={filter === "menunggu_survey" ? "Antrian kosong" : "Tidak ada pengajuan pada filter ini"}
          description={
            filter === "menunggu_survey"
              ? "Pengajuan baru dari warga akan muncul di sini. Pastikan properti sudah aktif agar pengajuan tinggal/bisnis dalam wilayah bisa diproses."
              : "Ubah filter status untuk melihat riwayat disetujui atau ditolak."
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

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail pengajuan</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4 text-sm">
              <p className="font-mono font-bold">{detail.pengajuan.nomorVisitrw3}</p>
              {detail.kost && (
                <p>
                  <span className="text-muted-foreground">Kost: </span>
                  {detail.kost.namaKost} — {detail.kost.namaPemilik}
                </p>
              )}
              <p>Berlaku sampai: {detail.pengajuan.tanggalBerlakuSampai} · Termin {detail.pengajuan.terminBulan} bln</p>
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
                  {detail.pengajuan.estimasiKontribusi != null && (
                    <p>Kontribusi ditetapkan: {formatRupiah(detail.pengajuan.estimasiKontribusi)}</p>
                  )}
                  {detail.pengajuan.kasRwId && (
                    <p className="text-xs text-muted-foreground">Tercatat di Kas RW (ID #{detail.pengajuan.kasRwId})</p>
                  )}
                  {detail.pengajuan.rincianKontribusi && (() => {
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
              {detail.pengajuan.namaUsaha && (
                <div className="space-y-1">
                  <p>
                    Usaha: {detail.pengajuan.namaUsaha}
                    {detail.pengajuan.jenisTempatUsaha && (
                      <span>
                        {" "}
                        · {detail.pengajuan.jenisTempatUsaha === "lainnya"
                          ? detail.pengajuan.jenisTempatUsahaLain || detail.pengajuan.jenisUsaha
                          : detail.pengajuan.jenisTempatUsaha}
                      </span>
                    )}
                  </p>
                  {detail.pengajuan.keperluanPengajuan === "bisnis" && (
                    <p className="text-muted-foreground">
                      Tinggal di RW 03:{" "}
                      {detail.pengajuan.tinggalDiWilayahRw3 ? "Ya (form lengkap)" : "Tidak (luar wilayah)"}
                    </p>
                  )}
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
                  <div key={p.id} className="rounded border p-2">
                    <p className="font-medium">{p.namaLengkap} {p.isAnak ? "(anak)" : ""}</p>
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
                          surveyKontribusiToBody(surveyForm);
                          approveMutation.mutate(detail.pengajuan.id);
                        } catch (e: any) {
                          toast({ title: "Lengkapi kontribusi", description: getApiErrorMessage(e), variant: "destructive" });
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
    </Visitrw3AdminShell>
  );
}
