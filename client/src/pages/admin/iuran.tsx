import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, Receipt, Check, X, Settings, ChevronDown, ChevronUp, Pencil, Search
} from "lucide-react";
import type { IuranKk, IuranSetting } from "@shared/schema";

type IuranRow = IuranKk & { nomorKk: string; rt: number; alamat: string; kepalaKeluarga: string | null };
type RekapRow = { bulan: string; totalKk: number; sudahBayar: number; belumBayar: number; totalNominal: number };

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}

function formatTanggal(tanggal: string): string {
  const d = new Date(tanggal + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(monthStr: string, n: number): string {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function formatBulanLabel(bulanTahun: string): string {
  const [year, month] = bulanTahun.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function getCurrentDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function AdminIuranPage() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [filterRt, setFilterRt] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"semua" | "lunas" | "belum">("semua");
  const [showSettings, setShowSettings] = useState(false);
  const [settingInput, setSettingInput] = useState("");
  const [showRekap, setShowRekap] = useState(false);
  const [bayarDialog, setBayarDialog] = useState<{ id: number; tanggal: string } | null>(null);
  const [batalConfirm, setBatalConfirm] = useState<number | null>(null);
  const [editJumlah, setEditJumlah] = useState<{ id: number; value: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data: iuranList = [], isLoading } = useQuery<IuranRow[]>({
    queryKey: ["/api/iuran", selectedMonth, filterRt],
    queryFn: async () => {
      const params = new URLSearchParams({ bulanTahun: selectedMonth });
      if (filterRt) params.set("rt", String(filterRt));
      const res = await apiRequest("GET", `/api/iuran?${params}`);
      return res.json();
    },
  });

  const { data: setting } = useQuery<IuranSetting>({
    queryKey: ["/api/iuran/setting"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/iuran/setting");
      return res.json();
    },
  });

  const { data: rekap = [] } = useQuery<RekapRow[]>({
    queryKey: ["/api/iuran/rekap", selectedMonth.slice(0, 4)],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/iuran/rekap?tahun=${selectedMonth.slice(0, 4)}`);
      return res.json();
    },
    enabled: showRekap,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/iuran/generate", { bulanTahun: selectedMonth });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/iuran"] });
      toast({ title: `Generate berhasil: ${data.created} KK dibuat, ${data.skipped} sudah ada` });
    },
    onError: (e: any) => toast({ title: "Gagal generate", description: e.message, variant: "destructive" }),
  });

  const bayarMutation = useMutation({
    mutationFn: async ({ id, tanggalBayar }: { id: number; tanggalBayar: string }) => {
      const res = await apiRequest("PUT", `/api/iuran/${id}/bayar`, { tanggalBayar });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iuran"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/iuran/rekap"] });
      setBayarDialog(null);
      toast({ title: "Pembayaran dicatat dan masuk ke kas RW" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const batalMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/iuran/${id}/batal`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iuran"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/iuran/rekap"] });
      setBatalConfirm(null);
      toast({ title: "Pembayaran dibatalkan" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const jumlahMutation = useMutation({
    mutationFn: async ({ id, jumlah }: { id: number; jumlah: number }) => {
      const res = await apiRequest("PATCH", `/api/iuran/${id}/jumlah`, { jumlah });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iuran"] });
      setEditJumlah(null);
      toast({ title: "Nominal iuran diperbarui" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const settingMutation = useMutation({
    mutationFn: async (jumlahDefault: number) => {
      const res = await apiRequest("PUT", "/api/iuran/setting", { jumlahDefault });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iuran/setting"] });
      setShowSettings(false);
      toast({ title: "Nominal default iuran disimpan" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const searchLower = search.toLowerCase();
  const filtered = iuranList.filter(r => {
    if (filterStatus === "lunas" && r.status !== "lunas") return false;
    if (filterStatus === "belum" && r.status !== "belum") return false;
    if (searchLower) {
      const haystack = `${r.kepalaKeluarga ?? ""} ${r.nomorKk} ${r.alamat}`.toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalKk = iuranList.length;
  const sudahBayar = iuranList.filter(r => r.status === "lunas").length;
  const belumBayar = totalKk - sudahBayar;
  const totalTerkumpul = iuranList.filter(r => r.status === "lunas").reduce((s, r) => s + Number(r.jumlah), 0);
  const sudahGenerate = iuranList.length > 0;

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Receipt className="w-5 h-5 text-[hsl(163,55%,22%)]" />
        <h1 className="text-lg font-bold text-[hsl(163,55%,22%)]">Iuran Warga RT 1–4</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total KK</p>
            <p className="text-2xl font-bold">{totalKk}</p>
            <p className="text-xs text-muted-foreground">RT 1–4</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Sudah Bayar</p>
            <p className="text-2xl font-bold text-green-600">{sudahBayar}</p>
            <p className="text-xs text-green-600">{totalKk ? Math.round(sudahBayar / totalKk * 100) : 0}% lunas</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Belum Bayar</p>
            <p className="text-2xl font-bold text-red-500">{belumBayar}</p>
            <p className="text-xs text-red-400">KK</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Terkumpul</p>
            <p className="text-lg font-bold text-[hsl(40,45%,45%)]">{formatRupiah(totalTerkumpul)}</p>
            <p className="text-xs text-muted-foreground">bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">
          {/* Month picker */}
          <div className="flex items-center gap-2 justify-between flex-wrap">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-sm min-w-[140px] text-center">{formatMonthLabel(selectedMonth)}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-[hsl(163,55%,22%)] text-white h-8"
                onClick={() => generateMutation.mutate()}
                disabled={sudahGenerate || generateMutation.isPending}
              >
                {sudahGenerate ? "Sudah digenerate" : generateMutation.isPending ? "Loading..." : "Generate Iuran"}
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => { setShowSettings(!showSettings); setSettingInput(String(setting?.jumlahDefault ?? 30000)); }}>
                <Settings className="w-3.5 h-3.5" />
                Pengaturan
              </Button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="flex items-center gap-2 pt-1 border-t">
              <span className="text-sm text-muted-foreground">Nominal default:</span>
              <Input
                type="number"
                className="h-8 w-32"
                value={settingInput}
                onChange={e => setSettingInput(e.target.value)}
              />
              <Button size="sm" className="h-8 bg-[hsl(163,55%,22%)] text-white" onClick={() => settingMutation.mutate(parseInt(settingInput))} disabled={settingMutation.isPending}>
                Simpan
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama, no. KK, atau alamat..."
              className="h-8 pl-8 text-sm"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {[null, 1, 2, 3, 4].map(rt => (
                <Button key={rt ?? "all"} variant={filterRt === rt ? "default" : "outline"} size="sm" className={`h-7 px-2 text-xs ${filterRt === rt ? "bg-[hsl(163,55%,22%)] text-white" : ""}`} onClick={() => { setFilterRt(rt); setPage(1); }}>
                  {rt === null ? "Semua RT" : `RT ${rt}`}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["semua", "lunas", "belum"] as const).map(s => (
                <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" className={`h-7 px-2 text-xs ${filterStatus === s ? "bg-[hsl(163,55%,22%)] text-white" : ""}`} onClick={() => { setFilterStatus(s); setPage(1); }}>
                  {s === "semua" ? "Semua" : s === "lunas" ? "Lunas" : "Belum"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tandai Lunas Dialog */}
      {bayarDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="font-semibold text-[hsl(163,55%,22%)]">Tandai Lunas</h2>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Tanggal Bayar</label>
              <Input type="date" value={bayarDialog.tanggal} onChange={e => setBayarDialog({ ...bayarDialog, tanggal: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBayarDialog(null)}>Batal</Button>
              <Button className="bg-green-600 text-white hover:bg-green-700" onClick={() => bayarMutation.mutate({ id: bayarDialog.id, tanggalBayar: bayarDialog.tanggal })} disabled={bayarMutation.isPending}>
                <Check className="w-4 h-4 mr-1" /> Konfirmasi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batalkan Confirm */}
      {batalConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="font-semibold text-red-600">Batalkan Pembayaran?</h2>
            <p className="text-sm text-muted-foreground">Entri kas RW terkait akan dihapus otomatis.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBatalConfirm(null)}>Tidak</Button>
              <Button variant="destructive" onClick={() => batalMutation.mutate(batalConfirm)} disabled={batalMutation.isPending}>
                Ya, Batalkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">
            Daftar Iuran — {formatMonthLabel(selectedMonth)}
            <span className="ml-2 font-normal text-muted-foreground text-xs">({filtered.length} KK)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !sudahGenerate ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Belum ada data iuran untuk bulan ini.<br />
              Klik <strong>Generate Iuran</strong> untuk membuat daftar.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Tidak ada data sesuai filter.</div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">RT</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Kepala KK</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Alamat</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Jumlah</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Tgl Bayar</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(row => (
                    <tr key={row.id} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-center">
                        <span className="inline-block bg-[hsl(163,55%,22%)]/10 text-[hsl(163,55%,22%)] text-xs rounded px-1.5 py-0.5">{row.rt}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-xs">{row.kepalaKeluarga ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">{row.nomorKk}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell max-w-[160px] truncate">{row.alamat}</td>
                      <td className="px-3 py-2 text-right">
                        {editJumlah?.id === row.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              className="h-7 w-24 text-xs text-right"
                              value={editJumlah.value}
                              onChange={e => setEditJumlah({ id: row.id, value: e.target.value })}
                              autoFocus
                            />
                            <Button size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700" onClick={() => jumlahMutation.mutate({ id: row.id, jumlah: parseInt(editJumlah.value) })}>
                              <Check className="w-3 h-3 text-white" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setEditJumlah(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className={`text-xs font-medium ${row.status === "belum" ? "hover:underline cursor-pointer" : "cursor-default"}`}
                            onClick={() => row.status === "belum" && setEditJumlah({ id: row.id, value: String(row.jumlah) })}
                            title={row.status === "belum" ? "Klik untuk edit" : ""}
                          >
                            {formatRupiah(Number(row.jumlah))}
                            {row.status === "belum" && <Pencil className="inline ml-1 w-3 h-3 text-muted-foreground" />}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.status === "lunas" ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs rounded-full px-2 py-0.5">
                            <Check className="w-3 h-3" /> Lunas
                          </span>
                        ) : (
                          <span className="inline-block bg-red-100 text-red-600 text-xs rounded-full px-2 py-0.5">Belum</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-muted-foreground hidden sm:table-cell">
                        {row.tanggalBayar ? formatTanggal(row.tanggalBayar) : "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.status === "belum" ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 text-white hover:bg-green-700 px-2"
                            onClick={() => setBayarDialog({ id: row.id, tanggal: getCurrentDate() })}
                          >
                            <Check className="w-3 h-3 mr-1" /> Lunas
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50 px-2"
                            onClick={() => setBatalConfirm(row.id)}
                          >
                            <X className="w-3 h-3 mr-1" /> Batal
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs px-2">{page} / {totalPages}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Rekap Tahunan */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <button className="flex items-center justify-between w-full" onClick={() => setShowRekap(!showRekap)}>
            <CardTitle className="text-sm font-semibold">Rekap Tahunan {selectedMonth.slice(0, 4)}</CardTitle>
            {showRekap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </CardHeader>
        {showRekap && (
          <CardContent className="p-0">
            {rekap.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Belum ada data rekap tahun ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Bulan</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Total KK</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-green-600">Lunas</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-red-500">Belum</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Terkumpul</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekap.map(r => (
                      <tr key={r.bulan} className="border-b hover:bg-muted/20">
                        <td className="px-3 py-2 text-xs font-medium">{formatBulanLabel(r.bulan)}</td>
                        <td className="px-3 py-2 text-center text-xs">{r.totalKk}</td>
                        <td className="px-3 py-2 text-center text-xs text-green-600 font-medium">{r.sudahBayar}</td>
                        <td className="px-3 py-2 text-center text-xs text-red-500">{r.belumBayar}</td>
                        <td className="px-3 py-2 text-right text-xs font-medium">{formatRupiah(r.totalNominal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
