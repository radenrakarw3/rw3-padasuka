import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Pencil, Trash2, X, Check, Filter
} from "lucide-react";
import type { KasRw } from "@shared/schema";

const KATEGORI_PEMASUKAN = [
  "Iuran Warga",
  "Donasi",
  "Infaq Surat",
  "Sumbangan",
  "Lainnya",
];

const KATEGORI_PENGELUARAN = [
  "Kegiatan RT/RW",
  "Kebersihan",
  "Keamanan",
  "Pembangunan",
  "Sosial",
  "Operasional",
  "Lainnya",
];

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}

function formatTanggal(tanggal: string): string {
  const d = new Date(tanggal + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminKeuangan() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [tipe, setTipe] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [kategori, setKategori] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);

  const [filterTipe, setFilterTipe] = useState<"semua" | "pemasukan" | "pengeluaran">("semua");
  const [filterKategori, setFilterKategori] = useState("");

  const { data: transaksi, isLoading } = useQuery<KasRw[]>({
    queryKey: ["/api/kas-rw"],
  });

  const { data: summary } = useQuery<{ totalPemasukan: number; totalPengeluaran: number; saldo: number }>({
    queryKey: ["/api/kas-rw/summary"],
  });

  const resetForm = () => {
    setTipe("pemasukan");
    setKategori("");
    setJumlah("");
    setKeterangan("");
    setTanggal(new Date().toISOString().split("T")[0]);
    setEditId(null);
    setShowForm(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        tipe,
        kategori,
        jumlah: parseInt(jumlah),
        keterangan,
        tanggal,
      };
      if (editId) {
        await apiRequest("PUT", `/api/kas-rw/${editId}`, body);
      } else {
        await apiRequest("POST", "/api/kas-rw", body);
      }
    },
    onSuccess: () => {
      toast({ title: editId ? "Transaksi diperbarui!" : "Transaksi ditambahkan!" });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/summary"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/kas-rw/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Transaksi dihapus!" });
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kas-rw/summary"] });
    },
    onError: (err: any) => {
      toast({ title: "Gagal menghapus", description: err.message, variant: "destructive" });
    },
  });

  const startEdit = (item: KasRw) => {
    setEditId(item.id);
    setTipe(item.tipe as "pemasukan" | "pengeluaran");
    setKategori(item.kategori);
    setJumlah(String(item.jumlah));
    setKeterangan(item.keterangan);
    setTanggal(item.tanggal);
    setShowForm(true);
  };

  const filteredTransaksi = (transaksi || []).filter((t) => {
    if (filterTipe !== "semua" && t.tipe !== filterTipe) return false;
    if (filterKategori && t.kategori !== filterKategori) return false;
    return true;
  });

  const allKategori = Array.from(new Set((transaksi || []).map((t) => t.kategori))).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-keuangan-title">Keuangan Kas RW</h2>
          <p className="text-sm text-muted-foreground">Kelola pemasukan dan pengeluaran kas RW</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)]"
          data-testid="button-tambah-transaksi"
        >
          <Plus className="w-4 h-4 mr-1" />
          Tambah
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card data-testid="card-pemasukan">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pemasukan</p>
                <p className="text-lg font-bold text-green-600" data-testid="text-total-pemasukan">
                  {summary ? formatRupiah(summary.totalPemasukan) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-pengeluaran">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
                <p className="text-lg font-bold text-red-600" data-testid="text-total-pengeluaran">
                  {summary ? formatRupiah(summary.totalPengeluaran) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-saldo">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Kas</p>
                <p className="text-lg font-bold text-blue-600" data-testid="text-saldo">
                  {summary ? formatRupiah(summary.saldo) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card data-testid="card-form-transaksi">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editId ? "Edit Transaksi" : "Tambah Transaksi Baru"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTipe("pemasukan"); setKategori(""); }}
                className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  tipe === "pemasukan"
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid="button-tipe-pemasukan"
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => { setTipe("pengeluaran"); setKategori(""); }}
                className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  tipe === "pengeluaran"
                    ? "bg-red-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid="button-tipe-pengeluaran"
              >
                Pengeluaran
              </button>
            </div>

            <div>
              <Label className="text-xs">Kategori</Label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-kategori"
              >
                <option value="">Pilih Kategori</option>
                {(tipe === "pemasukan" ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Jumlah (Rp)</Label>
              <Input
                type="number"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="Masukkan jumlah"
                min="1"
                data-testid="input-jumlah"
              />
            </div>

            <div>
              <Label className="text-xs">Keterangan</Label>
              <Input
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Deskripsi transaksi"
                data-testid="input-keterangan"
              />
            </div>

            <div>
              <Label className="text-xs">Tanggal</Label>
              <Input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                data-testid="input-tanggal"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!kategori || !jumlah || !keterangan || !tanggal || createMutation.isPending}
                className="flex-1 bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)]"
                data-testid="button-simpan-transaksi"
              >
                {createMutation.isPending ? "Menyimpan..." : (editId ? "Perbarui" : "Simpan")}
              </Button>
              <Button variant="outline" onClick={resetForm} data-testid="button-batal">
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Daftar Transaksi</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterTipe}
                onChange={(e) => setFilterTipe(e.target.value as any)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                data-testid="select-filter-tipe"
              >
                <option value="semua">Semua</option>
                <option value="pemasukan">Pemasukan</option>
                <option value="pengeluaran">Pengeluaran</option>
              </select>
              {allKategori.length > 0 && (
                <select
                  value={filterKategori}
                  onChange={(e) => setFilterKategori(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  data-testid="select-filter-kategori"
                >
                  <option value="">Semua Kategori</option>
                  {allKategori.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTransaksi.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-empty">
              Belum ada transaksi
            </p>
          ) : (
            <div className="space-y-2">
              {filteredTransaksi.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  data-testid={`row-transaksi-${t.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      t.tipe === "pemasukan" ? "bg-green-100" : "bg-red-100"
                    }`}>
                      {t.tipe === "pemasukan" ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.keterangan}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          t.tipe === "pemasukan"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {t.kategori}
                        </span>
                        <span>{formatTanggal(t.tanggal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-semibold ${
                      t.tipe === "pemasukan" ? "text-green-600" : "text-red-600"
                    }`}>
                      {t.tipe === "pemasukan" ? "+" : "-"}{formatRupiah(t.jumlah)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(t)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        data-testid={`button-edit-${t.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      {deleteConfirmId === t.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => deleteMutation.mutate(t.id)}
                            className="p-1.5 rounded-md bg-red-100 hover:bg-red-200 transition-colors"
                            data-testid={`button-confirm-delete-${t.id}`}
                          >
                            <Check className="w-3.5 h-3.5 text-red-600" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            data-testid={`button-cancel-delete-${t.id}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(t.id)}
                          className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                          data-testid={`button-delete-${t.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
