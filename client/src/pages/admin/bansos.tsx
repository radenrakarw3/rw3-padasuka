import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { HandCoins, Search, Plus, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, FileText, UserMinus, UserPlus, Download } from "lucide-react";
import { jenisBansosOptions, rtOptions } from "@/lib/constants";
import { generateSuratRekomendasiBansosPDF } from "@/lib/pdf-surat";
import type { KartuKeluarga, PengajuanBansos, Warga, RtData } from "@shared/schema";

type Tab = "penerima" | "pengajuan";

const PER_PAGE = 10;

type BansosRecipient = KartuKeluarga & { kepalaKeluarga: string | null };
type PengajuanWithKk = PengajuanBansos & { nomorKk: string; rt: number; kepalaKeluarga: string | null; alamat: string };

function KkSearchPicker({ kkOptions, allWarga, value, onChange, placeholder }: {
  kkOptions: KartuKeluarga[];
  allWarga: Warga[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [searchKk, setSearchKk] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const kepalaMap = useMemo(() => {
    const map: Record<number, string> = {};
    allWarga?.forEach(w => {
      if (w.kedudukanKeluarga === "Kepala Keluarga") map[w.kkId] = w.namaLengkap;
    });
    return map;
  }, [allWarga]);

  const filtered = useMemo(() => {
    if (!searchKk.trim()) return kkOptions.slice(0, 20);
    const q = searchKk.toLowerCase();
    return kkOptions.filter(k =>
      k.nomorKk.includes(q) ||
      (kepalaMap[k.id] || "").toLowerCase().includes(q) ||
      k.alamat.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [kkOptions, searchKk, kepalaMap]);

  const selected = kkOptions.find(k => k.id.toString() === value);

  return (
    <div ref={ref} className="relative">
      {value && selected ? (
        <div className="flex items-center gap-2 border rounded-lg p-2.5 bg-muted/30">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono truncate">{selected.nomorKk}</p>
            <p className="text-[11px] text-muted-foreground truncate">{kepalaMap[selected.id] || "-"} · RT {selected.rt.toString().padStart(2, "0")}</p>
          </div>
          <button onClick={() => { onChange(""); setSearchKk(""); }} className="text-muted-foreground hover:text-foreground">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div>
          <Input
            value={searchKk}
            onChange={e => { setSearchKk(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder || "Ketik no KK, nama kepala, atau alamat..."}
            className="h-10"
            data-testid="input-search-kk"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filtered.map(k => (
                <button
                  key={k.id}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0 transition-colors"
                  onClick={() => { onChange(k.id.toString()); setOpen(false); setSearchKk(""); }}
                  data-testid={`option-kk-${k.id}`}
                >
                  <p className="text-xs font-mono">{k.nomorKk}</p>
                  <p className="text-[10px] text-muted-foreground">{kepalaMap[k.id] || "-"} · RT {k.rt.toString().padStart(2, "0")} · {k.alamat}</p>
                </button>
              ))}
            </div>
          )}
          {open && filtered.length === 0 && searchKk.trim() && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg p-3 text-center text-xs text-muted-foreground">
              Tidak ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MultiJenisBansosSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="space-y-1.5">
      {jenisBansosOptions.map(opt => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={value.includes(opt)}
            onCheckedChange={() => toggle(opt)}
            data-testid={`checkbox-bansos-${opt}`}
          />
          <span className="text-sm">{opt}</span>
        </label>
      ))}
    </div>
  );
}

export default function AdminBansos() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("penerima");
  const [search, setSearch] = useState("");
  const [filterRt, setFilterRt] = useState("semua");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJenisKkId, setEditJenisKkId] = useState<number | null>(null);
  const [editJenisValue, setEditJenisValue] = useState<string[]>([]);

  const [formKkId, setFormKkId] = useState("");
  const [formJenisPengajuan, setFormJenisPengajuan] = useState("rekomendasi_penerima");
  const [formJenisBansos, setFormJenisBansos] = useState<string[]>(["PKH"]);
  const [formAlasan, setFormAlasan] = useState("");

  const { data: penerima, isLoading: loadingPenerima } = useQuery<BansosRecipient[]>({
    queryKey: ["/api/bansos/penerima"],
  });

  const { data: pengajuanList, isLoading: loadingPengajuan } = useQuery<PengajuanWithKk[]>({
    queryKey: ["/api/bansos/pengajuan"],
  });

  const { data: allKk } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });
  const { data: allWarga } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });
  const { data: rtDataList } = useQuery<RtData[]>({ queryKey: ["/api/rt"] });

  const kkOptions = useMemo(() => {
    if (!allKk) return [];
    if (formJenisPengajuan === "rekomendasi_coret") {
      return allKk.filter(k => k.penerimaBansos);
    }
    return allKk.filter(k => !k.penerimaBansos);
  }, [allKk, formJenisPengajuan]);

  const filteredPenerima = useMemo(() => {
    return penerima?.filter(k => {
      const matchSearch = k.nomorKk.includes(search) ||
        (k.kepalaKeluarga || "").toLowerCase().includes(search.toLowerCase()) ||
        k.alamat.toLowerCase().includes(search.toLowerCase());
      const matchRt = filterRt === "semua" || k.rt === parseInt(filterRt);
      return matchSearch && matchRt;
    }) || [];
  }, [penerima, search, filterRt]);

  const filteredPengajuan = useMemo(() => {
    return pengajuanList?.filter(p => {
      const matchSearch = p.nomorKk.includes(search) ||
        (p.kepalaKeluarga || "").toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    }) || [];
  }, [pengajuanList, search]);

  const totalPages = Math.ceil(
    (tab === "penerima" ? filteredPenerima.length : filteredPengajuan.length) / PER_PAGE
  );
  const paginatedPenerima = filteredPenerima.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const paginatedPengajuan = filteredPengajuan.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pendingCount = pengajuanList?.filter(p => p.status === "pending").length || 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bansos/pengajuan", {
        kkId: parseInt(formKkId),
        jenisPengajuan: formJenisPengajuan,
        jenisBansos: formJenisBansos.join(", "),
        alasan: formAlasan,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pengajuan berhasil dibuat" });
      setDialogOpen(false);
      setFormKkId("");
      setFormAlasan("");
      setFormJenisBansos(["PKH"]);
      queryClient.invalidateQueries({ queryKey: ["/api/bansos/pengajuan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bansos/penerima"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/bansos/pengajuan/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status pengajuan diperbarui" });
      queryClient.invalidateQueries({ queryKey: ["/api/bansos/pengajuan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bansos/penerima"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const updateJenisMutation = useMutation({
    mutationFn: async ({ kkId, jenisBansos }: { kkId: number; jenisBansos: string }) => {
      const res = await apiRequest("PATCH", `/api/bansos/penerima/${kkId}/jenis`, { jenisBansos });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Jenis bansos diperbarui" });
      setEditJenisKkId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/bansos/penerima"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const handleDownloadSurat = async (p: PengajuanWithKk) => {
    const ketuaRt = rtDataList?.find(r => r.nomorRt === p.rt);
    await generateSuratRekomendasiBansosPDF({
      jenisPengajuan: p.jenisPengajuan,
      jenisBansos: p.jenisBansos,
      kepalaKeluarga: p.kepalaKeluarga || "-",
      nomorKk: p.nomorKk,
      alamat: p.alamat,
      rt: p.rt,
      alasan: p.alasan,
      ketuaRt: ketuaRt?.namaKetua || "-",
    });
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setPage(1);
    setSearch("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-bansos-title">Kelola Bansos</h2>
        <Button className="gap-1.5" onClick={() => setDialogOpen(true)} data-testid="button-tambah-pengajuan">
          <Plus className="w-4 h-4" /> Buat Pengajuan
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => switchTab("penerima")}
          className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${tab === "penerima" ? "bg-green-50 border-green-300 ring-1 ring-green-300" : "bg-card border-border hover:border-green-200"}`}
          data-testid="tab-penerima"
        >
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <HandCoins className="w-4 h-4 text-green-700" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-lg font-bold text-green-700 leading-none" data-testid="text-total-penerima">{penerima?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Penerima</p>
          </div>
        </button>
        <button
          onClick={() => switchTab("pengajuan")}
          className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${tab === "pengajuan" ? "bg-amber-50 border-amber-300 ring-1 ring-amber-300" : "bg-card border-border hover:border-amber-200"}`}
          data-testid="tab-pengajuan"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-lg font-bold text-amber-700 leading-none" data-testid="text-pending-pengajuan">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">Pending Pengajuan</p>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={tab === "penerima" ? "Cari no KK, nama, atau alamat..." : "Cari no KK atau nama..."}
            className="h-10 pl-9"
            data-testid="input-search-bansos"
          />
        </div>
        {tab === "penerima" && (
          <Select value={filterRt} onValueChange={v => { setFilterRt(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-10" data-testid="select-filter-rt-bansos">
              <SelectValue placeholder="Filter RT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua RT</SelectItem>
              {rtOptions.map(i => <SelectItem key={i} value={i.toString()}>RT {i.toString().padStart(2, "0")}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {tab === "penerima" ? (
        <>
          <p className="text-xs text-muted-foreground" data-testid="text-penerima-count">
            Menampilkan {paginatedPenerima.length} dari {filteredPenerima.length} penerima
            {totalPages > 1 && ` (halaman ${page} dari ${totalPages})`}
          </p>

          {loadingPenerima ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : paginatedPenerima.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Tidak ada penerima bansos ditemukan</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {paginatedPenerima.map(k => (
                <Card key={k.id} className="border-green-200" data-testid={`card-penerima-${k.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <HandCoins className="w-4 h-4 text-green-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-medium truncate">{k.nomorKk}</p>
                          <p className="text-[11px] font-medium truncate" data-testid={`text-kepala-bansos-${k.id}`}>{k.kepalaKeluarga || "-"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{k.alamat}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge variant="secondary" className="text-[10px]">RT {k.rt.toString().padStart(2, "0")}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      {editJenisKkId === k.id ? (
                        <div className="space-y-2">
                          <MultiJenisBansosSelect value={editJenisValue} onChange={setEditJenisValue} />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => updateJenisMutation.mutate({ kkId: k.id, jenisBansos: editJenisValue.join(", ") })}
                              disabled={updateJenisMutation.isPending || editJenisValue.length === 0}
                              data-testid={`button-save-jenis-${k.id}`}
                            >
                              <CheckCircle className="w-3 h-3" /> Simpan
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditJenisKkId(null)}>
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditJenisKkId(k.id);
                            setEditJenisValue(k.jenisBansos ? k.jenisBansos.split(", ").filter(Boolean) : []);
                          }}
                          className="w-full text-left"
                          data-testid={`button-edit-jenis-${k.id}`}
                        >
                          <div className="flex flex-wrap gap-1">
                            {(k.jenisBansos || "Belum diisi").split(", ").map((j, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                                {j}
                              </span>
                            ))}
                            <span className="text-[10px] text-muted-foreground ml-1">✎</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground" data-testid="text-pengajuan-count">
            Menampilkan {paginatedPengajuan.length} dari {filteredPengajuan.length} pengajuan
            {totalPages > 1 && ` (halaman ${page} dari ${totalPages})`}
          </p>

          {loadingPengajuan ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : paginatedPengajuan.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Belum ada pengajuan</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {paginatedPengajuan.map(p => {
                const isCoret = p.jenisPengajuan === "rekomendasi_coret";
                const statusColor = p.status === "pending" ? "bg-amber-100 text-amber-800" :
                  p.status === "disetujui" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
                const statusIcon = p.status === "pending" ? <Clock className="w-3 h-3" /> :
                  p.status === "disetujui" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />;
                return (
                  <Card key={p.id} className={isCoret ? "border-red-200" : "border-blue-200"} data-testid={`card-pengajuan-${p.id}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isCoret ? "bg-red-100" : "bg-blue-100"}`}>
                            {isCoret ? <UserMinus className="w-4 h-4 text-red-700" /> : <UserPlus className="w-4 h-4 text-blue-700" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" data-testid={`text-kepala-pengajuan-${p.id}`}>{p.kepalaKeluarga || "-"}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">{p.nomorKk}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge className={`text-[10px] gap-0.5 ${isCoret ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                            {isCoret ? "Rek. Coret" : "Rek. Penerima"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {p.jenisBansos.split(", ").map((j, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{j}</Badge>
                        ))}
                      </div>

                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Alasan:</p>
                        <p className="text-xs">{p.alasan}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge className={`text-[10px] gap-0.5 ${statusColor}`}>
                            {statusIcon}
                            {p.status === "pending" ? "Pending" : p.status === "disetujui" ? "Disetujui" : "Ditolak"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            RT {p.rt.toString().padStart(2, "0")} · {p.createdAt ? new Date(p.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                          </span>
                        </div>
                        {p.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-green-700 hover:bg-green-100"
                              onClick={() => statusMutation.mutate({ id: p.id, status: "disetujui" })}
                              disabled={statusMutation.isPending}
                              data-testid={`button-approve-${p.id}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              <span className="text-[11px]">Setujui</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-red-600 hover:bg-red-100"
                              onClick={() => statusMutation.mutate({ id: p.id, status: "ditolak" })}
                              disabled={statusMutation.isPending}
                              data-testid={`button-reject-${p.id}`}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              <span className="text-[11px]">Tolak</span>
                            </Button>
                          </div>
                        )}
                        {p.status === "disetujui" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 gap-1"
                            onClick={() => handleDownloadSurat(p)}
                            data-testid={`button-download-surat-${p.id}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Surat Rekomendasi</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" className="gap-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="button-prev-bansos">
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </Button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" className="gap-1" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-next-bansos">
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Pengajuan Bansos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Jenis Pengajuan</Label>
              <Select value={formJenisPengajuan} onValueChange={v => { setFormJenisPengajuan(v); setFormKkId(""); }}>
                <SelectTrigger className="h-10" data-testid="select-jenis-pengajuan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rekomendasi_penerima">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                      Rekomendasi Penerima Baru
                    </div>
                  </SelectItem>
                  <SelectItem value="rekomendasi_coret">
                    <div className="flex items-center gap-2">
                      <UserMinus className="w-3.5 h-3.5 text-red-600" />
                      Rekomendasi Coret Penerima
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Pilih KK</Label>
              <KkSearchPicker
                kkOptions={kkOptions}
                allWarga={allWarga || []}
                value={formKkId}
                onChange={setFormKkId}
              />
              {kkOptions.length === 0 && (
                <p className="text-[10px] text-amber-600">
                  {formJenisPengajuan === "rekomendasi_coret" ? "Tidak ada penerima bansos yang bisa dicoret" : "Semua KK sudah penerima bansos"}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Jenis Bansos (bisa pilih lebih dari 1)</Label>
              <MultiJenisBansosSelect value={formJenisBansos} onChange={setFormJenisBansos} />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Alasan</Label>
              <Textarea
                value={formAlasan}
                onChange={e => setFormAlasan(e.target.value)}
                placeholder="Jelaskan alasan pengajuan..."
                rows={3}
                data-testid="input-alasan-pengajuan"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
              <p className="text-[10px] text-blue-700">
                Pengajuan ini bersifat rekomendasi dari RW kepada Kelurahan. Keputusan akhir ditentukan oleh pemerintah.
              </p>
            </div>

            <Button
              className="w-full h-10"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formKkId || !formAlasan.trim() || formJenisBansos.length === 0}
              data-testid="button-simpan-pengajuan"
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan Pengajuan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
