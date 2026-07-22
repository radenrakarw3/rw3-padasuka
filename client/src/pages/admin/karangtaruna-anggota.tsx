import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, Eye, MessageCircle, MapPin, Sparkles, Trash2, GraduationCap } from "lucide-react";
import { toWaMeUrl } from "@/lib/wa";
import { KarangtarunaAdminNav } from "@/components/admin/karangtaruna-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3ChipFilters,
  Visitrw3EmptyState,
  Visitrw3ListItem,
  Visitrw3MonoId,
  Visitrw3RtBadge,
  Visitrw3Toolbar,
} from "@/components/admin/visitrw3-admin-ui";
import {
  karangtarunaStatusLabel,
  karangtarunaStatusAktivitasLabel,
  karangtarunaKetersediaanLabel,
} from "@shared/karangtaruna";

type StatusFilter = "baru" | "aktif" | "arsip" | "semua";

type AnggotaRow = {
  id: number;
  nomorAnggota: string;
  namaLengkap: string;
  rt: number;
  alamat: string;
  nomorWhatsapp: string;
  statusKeanggotaan: string;
  statusAktivitas?: string | null;
  bidangKeahlian: string[];
  bidangMinat: string[];
  createdAt: string;
};

type AnggotaDetail = AnggotaRow & {
  nik?: string | null;
  jenisKelamin?: string | null;
  tanggalLahir: string;
  pendidikanTerakhir?: string | null;
  pekerjaan?: string | null;
  instagram?: string | null;
  ceritaSkill: string;
  pengalamanOrganisasi?: string | null;
  prestasi?: string | null;
  harapanFasilitasi: string;
  ketersediaanWaktu?: string | null;
  bersediaAktif: boolean;
  potensiUnggulan?: string | null;
  catatanAdmin?: string | null;
};

function getStatusFromSearch(search: string): StatusFilter {
  const v = new URLSearchParams(search).get("status");
  if (v === "aktif" || v === "arsip" || v === "semua") return v;
  return "baru";
}

function accentFor(status: string): "warning" | "success" | "default" {
  if (status === "baru") return "warning";
  if (status === "aktif") return "success";
  return "default";
}

export default function AdminKarangtarunaAnggota() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => getStatusFromSearch(search));
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

  const [editStatus, setEditStatus] = useState<string>("baru");
  const [potensi, setPotensi] = useState("");
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    setStatusFilter(getStatusFromSearch(search));
  }, [search]);

  const { data: list = [], isLoading, isFetching } = useQuery<AnggotaRow[]>({
    queryKey: ["/api/admin/karangtaruna/anggota", statusFilter, query],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "semua") params.set("status", statusFilter);
      if (query.trim()) params.set("search", query.trim());
      const res = await fetch(`/api/admin/karangtaruna/anggota?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
  });

  const counts = useQuery<AnggotaRow[]>({
    queryKey: ["/api/admin/karangtaruna/anggota", "baru"],
    queryFn: async () => {
      const res = await fetch("/api/admin/karangtaruna/anggota?status=baru", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: detail, isLoading: detailLoading } = useQuery<AnggotaDetail>({
    queryKey: ["/api/admin/karangtaruna/anggota", detailId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/karangtaruna/anggota/${detailId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
    enabled: detailId != null,
  });

  useEffect(() => {
    if (detail) {
      setEditStatus(detail.statusKeanggotaan);
      setPotensi(detail.potensiUnggulan ?? "");
      setCatatan(detail.catatanAdmin ?? "");
    }
  }, [detail]);

  const saveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/karangtaruna/anggota/${id}`, {
        statusKeanggotaan: editStatus,
        potensiUnggulan: potensi.trim() || null,
        catatanAdmin: catatan.trim() || null,
      });
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Tersimpan", description: "Data keanggotaan diperbarui." });
      setDetailId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/karangtaruna/anggota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/karangtaruna/stats"] });
    },
    onError: (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/karangtaruna/anggota/${id}`);
      return readJsonSafely(res);
    },
    onSuccess: () => {
      toast({ title: "Dihapus" });
      setDetailId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/karangtaruna/anggota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/karangtaruna/stats"] });
    },
    onError: (e: unknown) => toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const setStatus = (v: StatusFilter) => {
    setStatusFilter(v);
    setLocation(v === "baru" ? "/admin/karangtaruna/anggota" : `/admin/karangtaruna/anggota?status=${v}`);
  };

  const d = detail;

  return (
    <Visitrw3AdminShell>
      <KarangtarunaAdminNav
        title="Anggota Karang Taruna"
        description="Data pemuda RW 03 — verifikasi, tandai potensi, dan hubungi lewat WhatsApp."
        actions={
          <Visitrw3ChipFilters
            options={[
              { value: "baru" as const, label: "Baru", count: counts.data?.length ?? 0 },
              { value: "aktif" as const, label: "Aktif" },
              { value: "arsip" as const, label: "Arsip" },
              { value: "semua" as const, label: "Semua" },
            ]}
            value={statusFilter}
            onChange={setStatus}
          />
        }
      />

      <Visitrw3Toolbar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Cari nama / nomor / WhatsApp…"
        className="mb-3"
      />

      {isLoading && list.length === 0 ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <Visitrw3EmptyState
          icon={Users}
          title="Belum ada anggota"
          description="Anggota masuk lewat halaman publik /karangtaruna."
        />
      ) : (
        <div className={isFetching ? "space-y-2 opacity-80" : "space-y-2"}>
          {list.map((row) => (
            <Visitrw3ListItem
              key={row.id}
              accent={accentFor(row.statusKeanggotaan)}
              onClick={() => setDetailId(row.id)}
              actions={
                <>
                  {row.nomorWhatsapp?.trim() && (
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-green-700 border-green-200" asChild>
                      <a
                        href={toWaMeUrl(
                          row.nomorWhatsapp,
                          `Assalamu'alaikum, ${row.namaLengkap}.\n\nDari KPP RW 03 terkait Karang Taruna (${row.nomorAnggota}).`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WA
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
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
                <Visitrw3MonoId>{row.nomorAnggota}</Visitrw3MonoId>
                <Visitrw3RtBadge rt={row.rt} />
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {karangtarunaStatusLabel(row.statusKeanggotaan)}
                </span>
              </div>
              <p className="text-sm font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {row.namaLengkap}
              </p>
              {row.bidangKeahlian.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {row.bidangKeahlian.slice(0, 4).map((k) => (
                    <span key={k} className="rounded-full bg-brand/10 text-brand px-2 py-0.5 text-[10px]">{k}</span>
                  ))}
                  {row.bidangKeahlian.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">+{row.bidangKeahlian.length - 4}</span>
                  )}
                </div>
              )}
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
            <DialogTitle>Detail anggota</DialogTitle>
          </DialogHeader>
          {detailLoading || !d ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <p className="font-mono font-bold">{d.nomorAnggota}</p>
                <Visitrw3RtBadge rt={d.rt} />
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {karangtarunaStatusLabel(d.statusKeanggotaan)}
                </span>
              </div>

              <div className="rounded-lg border p-3 space-y-1 bg-muted/20">
                <p className="text-base font-semibold">{d.namaLengkap}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {d.pendidikanTerakhir || "-"} · {karangtarunaStatusAktivitasLabel(d.statusAktivitas)}
                </p>
                {d.pekerjaan && <p className="text-xs">Aktivitas: {d.pekerjaan}</p>}
                <p className="text-xs"><span className="text-muted-foreground">Lahir: </span>{d.tanggalLahir} · {d.jenisKelamin || "-"}</p>
                {d.nik && <p className="text-xs font-mono">NIK: {d.nik}</p>}
                <p className="text-xs"><span className="text-muted-foreground">WA: </span>{d.nomorWhatsapp}</p>
                {d.instagram && <p className="text-xs">IG: {d.instagram}</p>}
                <p className="text-xs"><span className="text-muted-foreground">Alamat: </span>{d.alamat}</p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Ketersediaan: </span>
                  {karangtarunaKetersediaanLabel(d.ketersediaanWaktu)} · Bersedia aktif: {d.bersediaAktif ? "ya" : "tidak"}
                </p>
              </div>

              <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-brand flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Skill & potensi
                </p>
                {d.bidangKeahlian.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {d.bidangKeahlian.map((k) => (
                      <span key={k} className="rounded-full bg-brand/15 text-brand px-2 py-0.5 text-[11px]">{k}</span>
                    ))}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{d.ceritaSkill}</p>
                {d.pengalamanOrganisasi && (
                  <p className="text-xs"><span className="text-muted-foreground">Organisasi: </span>{d.pengalamanOrganisasi}</p>
                )}
                {d.prestasi && (
                  <p className="text-xs"><span className="text-muted-foreground">Prestasi: </span>{d.prestasi}</p>
                )}
              </div>

              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs font-semibold">Minat & harapan difasilitasi</p>
                {d.bidangMinat.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {d.bidangMinat.map((m) => (
                      <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{m}</span>
                    ))}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{d.harapanFasilitasi}</p>
              </div>

              <div className="space-y-3 border-t pt-3">
                <div className="space-y-1.5">
                  <Label>Status keanggotaan</Label>
                  <div className="flex flex-wrap gap-2">
                    {(["baru", "aktif", "arsip"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditStatus(s)}
                        className={
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                          (editStatus === s
                            ? "border-brand bg-brand text-brand-foreground"
                            : "border-border bg-muted/40 text-muted-foreground hover:text-foreground")
                        }
                      >
                        {karangtarunaStatusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Catatan potensi unggulan (tampil ke anggota)</Label>
                  <Textarea value={potensi} onChange={(e) => setPotensi(e.target.value)} rows={2} placeholder="Contoh: Cocok jadi koordinator konten & dokumentasi RW." />
                </div>
                <div className="space-y-1.5">
                  <Label>Catatan internal admin</Label>
                  <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(d.id)}>
                    Simpan
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive border-destructive/30"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm(`Hapus anggota ${d.namaLengkap}?`)) deleteMutation.mutate(d.id);
                    }}
                    aria-label="Hapus anggota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Visitrw3AdminShell>
  );
}
