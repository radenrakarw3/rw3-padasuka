import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Store, Plus, Search, Trash2, Eye, ClipboardCheck, Award, RefreshCw,
  ChevronLeft, ChevronRight, X, Upload, Users, FileCheck, AlertTriangle
} from "lucide-react";
import {
  jenisUsahaOptions, modalUsahaOptions, omsetBulananOptions,
  lamaUsahaOptions, posisiTetanggaOptions, jabatanKaryawanOptions
} from "@/lib/constants";
import type { Usaha, KaryawanUsaha, IzinTetangga, SurveyUsaha, RiwayatStiker } from "@shared/schema";

type UsahaDetail = Usaha & {
  karyawan: KaryawanUsaha[];
  izinTetangga: IzinTetangga[];
  survey: SurveyUsaha | null;
  riwayatStiker: RiwayatStiker[];
};

const statusColors: Record<string, string> = {
  pendaftaran: "bg-blue-100 text-blue-800",
  survey: "bg-yellow-100 text-yellow-800",
  disetujui: "bg-green-100 text-green-800",
  ditolak: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pendaftaran: "Pendaftaran",
  survey: "Survey",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export default function AdminKelolaUsaha() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [filterRt, setFilterRt] = useState<string>("semua");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showSurveyDialog, setShowSurveyDialog] = useState(false);
  const [showVerifikasiDialog, setShowVerifikasiDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUsaha, setSelectedUsaha] = useState<UsahaDetail | null>(null);
  const [selectedUsahaId, setSelectedUsahaId] = useState<number | null>(null);

  const [formStep, setFormStep] = useState(1);

  const [formData, setFormData] = useState({
    namaPemilik: "", nikPemilik: "", nomorWaPemilik: "", alamatPemilik: "",
    namaUsaha: "", jenisUsaha: "", alamatUsaha: "", rt: 1,
    nib: "", deskripsiUsaha: "", lamaUsaha: "",
    jamOperasionalMulai: "", jamOperasionalSelesai: "",
    modalUsaha: "", omsetBulanan: "",
  });
  const [karyawanList, setKaryawanList] = useState<{ namaLengkap: string; nik: string; alamat: string; nomorWhatsapp: string; jabatan: string; tanggalMulaiKerja: string }[]>([]);
  const [izinList, setIzinList] = useState([
    { posisi: "Kiri", namaWarga: "", nomorWhatsapp: "", statusPersetujuan: "setuju", alasanPenolakan: "" },
    { posisi: "Kanan", namaWarga: "", nomorWhatsapp: "", statusPersetujuan: "setuju", alasanPenolakan: "" },
    { posisi: "Depan", namaWarga: "", nomorWhatsapp: "", statusPersetujuan: "setuju", alasanPenolakan: "" },
    { posisi: "Belakang", namaWarga: "", nomorWhatsapp: "", statusPersetujuan: "setuju", alasanPenolakan: "" },
  ]);

  const [surveyForm, setSurveyForm] = useState({
    tanggalSurvey: new Date().toISOString().split("T")[0],
    petugasSurvey: "",
    kesesuaianData: "sesuai",
    dampakKebisingan: 1,
    dampakBau: 1,
    dampakLimbah: 1,
    kondisiLokasi: "",
    catatanSurvey: "",
    fotoLokasi: "",
    rekomendasi: "layak",
  });

  const [verifikasiKeputusan, setVerifikasiKeputusan] = useState<"disetujui" | "ditolak">("disetujui");
  const [alasanPenolakan, setAlasanPenolakan] = useState("");

  const { data: usahaList = [], isLoading } = useQuery<Usaha[]>({
    queryKey: ["/api/usaha"],
  });

  const filtered = usahaList.filter(u => {
    const matchSearch = search === "" ||
      u.namaUsaha.toLowerCase().includes(search.toLowerCase()) ||
      u.namaPemilik.toLowerCase().includes(search.toLowerCase()) ||
      (u.nib && u.nib.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "semua" || u.status === filterStatus;
    const matchRt = filterRt === "semua" || u.rt === parseInt(filterRt);
    return matchSearch && matchStatus && matchRt;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const stats = {
    total: usahaList.length,
    pendaftaran: usahaList.filter(u => u.status === "pendaftaran").length,
    survey: usahaList.filter(u => u.status === "survey").length,
    disetujui: usahaList.filter(u => u.status === "disetujui").length,
    ditolak: usahaList.filter(u => u.status === "ditolak").length,
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/usaha", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/usaha"] });
      setShowAddDialog(false);
      resetForm();
      toast({ title: "Berhasil", description: "Usaha berhasil didaftarkan" });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/usaha/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/usaha"] });
      setShowDeleteDialog(false);
      toast({ title: "Berhasil", description: "Usaha berhasil dihapus" });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const surveyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("POST", `/api/usaha/${id}/survey`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/usaha"] });
      setShowSurveyDialog(false);
      toast({ title: "Berhasil", description: "Survey berhasil disimpan" });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const verifikasiMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("POST", `/api/usaha/${id}/verifikasi`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/usaha"] });
      setShowVerifikasiDialog(false);
      toast({ title: "Berhasil", description: "Verifikasi berhasil" });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const perpanjangMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/usaha/${id}/perpanjang-stiker`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/usaha"] });
      if (selectedUsaha) fetchDetail(selectedUsaha.id);
      toast({ title: "Berhasil", description: "Stiker berhasil diperpanjang" });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormStep(1);
    setFormData({
      namaPemilik: "", nikPemilik: "", nomorWaPemilik: "", alamatPemilik: "",
      namaUsaha: "", jenisUsaha: "", alamatUsaha: "", rt: 1,
      nib: "", deskripsiUsaha: "", lamaUsaha: "",
      jamOperasionalMulai: "", jamOperasionalSelesai: "",
      modalUsaha: "", omsetBulanan: "",
    });
    setKaryawanList([]);
    setIzinList([
      { posisi: "Kiri", namaWarga: "", nomorWhatsapp: "", statusPersetujuan: "setuju", alasanPenolakan: "" },
      { posisi: "Kanan", namaWarga: "", nomorWhatsapp: "", statusPersetujuan: "setuju", alasanPenolakan: "" },
      { posisi: "Depan", namaWarga: "", nomorWhatsapp: "", statusPersetujuan: "setuju", alasanPenolakan: "" },
      { posisi: "Belakang", namaWarga: "", nomorWhatsapp: "", statusPersetujuan: "setuju", alasanPenolakan: "" },
    ]);
  }

  async function fetchDetail(id: number) {
    try {
      const res = await fetch(`/api/usaha/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat detail");
      const data = await res.json();
      setSelectedUsaha(data);
    } catch {
      toast({ title: "Gagal", description: "Gagal memuat detail usaha", variant: "destructive" });
    }
  }

  function handleSubmit() {
    for (const izin of izinList) {
      if (!izin.namaWarga.trim()) {
        toast({ title: "Error", description: `Nama tetangga posisi ${izin.posisi} harus diisi`, variant: "destructive" });
        return;
      }
    }
    for (let i = 0; i < karyawanList.length; i++) {
      const k = karyawanList[i];
      if (!k.namaLengkap.trim() || !k.nik.trim() || !k.alamat.trim() || !k.jabatan) {
        toast({ title: "Error", description: `Karyawan ${i + 1}: Nama, NIK, alamat, dan jabatan harus diisi`, variant: "destructive" });
        return;
      }
    }
    createMutation.mutate({
      ...formData,
      karyawan: karyawanList,
      izinTetangga: izinList,
    });
  }

  function addKaryawan() {
    setKaryawanList([...karyawanList, { namaLengkap: "", nik: "", alamat: "", nomorWhatsapp: "", jabatan: "", tanggalMulaiKerja: "" }]);
  }

  function updateKaryawan(index: number, field: string, value: string) {
    const updated = [...karyawanList];
    (updated[index] as any)[field] = value;
    setKaryawanList(updated);
  }

  function removeKaryawan(index: number) {
    setKaryawanList(karyawanList.filter((_, i) => i !== index));
  }

  function updateIzin(index: number, field: string, value: string) {
    const updated = [...izinList];
    (updated[index] as any)[field] = value;
    setIzinList(updated);
  }

  function getStikerStatus(u: Usaha) {
    if (u.status !== "disetujui" || !u.tanggalStikerExpired) return null;
    const today = new Date().toISOString().split("T")[0];
    if (u.tanggalStikerExpired < today) return "expired";
    const d = new Date();
    d.setDate(d.getDate() + 30);
    if (u.tanggalStikerExpired <= d.toISOString().split("T")[0]) return "mendekati";
    return "aktif";
  }

  return (
    <div className="space-y-4" data-testid="page-kelola-usaha">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-title-usaha">
          <Store className="w-5 h-5" /> Kelola Usaha
        </h1>
        <Button size="sm" onClick={() => { resetForm(); setShowAddDialog(true); }} data-testid="button-tambah-usaha">
          <Plus className="w-4 h-4 mr-1" /> Daftarkan Usaha
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Total", value: stats.total, color: "bg-gray-100 text-gray-800", filter: "semua" },
          { label: "Pendaftaran", value: stats.pendaftaran, color: "bg-blue-50 text-blue-700", filter: "pendaftaran" },
          { label: "Survey", value: stats.survey, color: "bg-yellow-50 text-yellow-700", filter: "survey" },
          { label: "Disetujui", value: stats.disetujui, color: "bg-green-50 text-green-700", filter: "disetujui" },
          { label: "Ditolak", value: stats.ditolak, color: "bg-red-50 text-red-700", filter: "ditolak" },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => { setFilterStatus(s.filter); setPage(1); }}
            className={`rounded-lg p-3 text-center transition-all ${s.color} ${filterStatus === s.filter ? "ring-2 ring-offset-1 ring-current" : ""}`}
            data-testid={`stat-usaha-${s.label.toLowerCase()}`}
          >
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama usaha, pemilik, atau NIB..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
            data-testid="input-search-usaha"
          />
        </div>
        <Select value={filterRt} onValueChange={(v) => { setFilterRt(v); setPage(1); }}>
          <SelectTrigger className="w-32" data-testid="select-filter-rt-usaha">
            <SelectValue placeholder="RT" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua RT</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7].map(rt => (
              <SelectItem key={rt} value={String(rt)}>RT {String(rt).padStart(2, "0")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat data...</div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Tidak ada data usaha</div>
      ) : (
        <div className="space-y-3">
          {paginated.map(u => {
            const stikerStatus = getStikerStatus(u);
            return (
              <div
                key={u.id}
                className={`border rounded-lg p-4 space-y-2 ${
                  u.status === "disetujui" ? "border-green-300" :
                  u.status === "ditolak" ? "border-red-300" :
                  u.status === "survey" ? "border-yellow-300" : "border-blue-300"
                }`}
                data-testid={`card-usaha-${u.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate" data-testid={`text-nama-usaha-${u.id}`}>{u.namaUsaha}</div>
                    <div className="text-xs text-muted-foreground">{u.namaPemilik} - RT {String(u.rt).padStart(2, "0")}</div>
                    <div className="text-xs text-muted-foreground">{u.jenisUsaha}</div>
                    {u.nib && <div className="text-xs text-muted-foreground">NIB: {u.nib}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusColors[u.status] || "bg-gray-100"} data-testid={`badge-status-${u.id}`}>
                      {statusLabels[u.status] || u.status}
                    </Badge>
                    {stikerStatus && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        stikerStatus === "aktif" ? "bg-green-50 text-green-700" :
                        stikerStatus === "mendekati" ? "bg-amber-50 text-amber-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        Stiker: {stikerStatus === "aktif" ? "Aktif" : stikerStatus === "mendekati" ? "Mendekati Expired" : "Expired"}
                      </span>
                    )}
                  </div>
                </div>

                {u.status === "disetujui" && u.nomorStiker && (
                  <div className="text-xs bg-green-50 rounded p-2">
                    <span className="font-medium">Stiker:</span> {u.nomorStiker} | Berlaku s/d {u.tanggalStikerExpired}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={async () => { await fetchDetail(u.id); setShowDetailDialog(true); }}
                    data-testid={`button-detail-${u.id}`}
                  >
                    <Eye className="w-3 h-3 mr-1" /> Detail
                  </Button>
                  {u.status === "pendaftaran" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-yellow-700 border-yellow-300"
                      onClick={() => {
                        setSelectedUsahaId(u.id);
                        setSurveyForm({
                          tanggalSurvey: new Date().toISOString().split("T")[0],
                          petugasSurvey: "", kesesuaianData: "sesuai",
                          dampakKebisingan: 1, dampakBau: 1, dampakLimbah: 1,
                          kondisiLokasi: "", catatanSurvey: "", fotoLokasi: "", rekomendasi: "layak",
                        });
                        setShowSurveyDialog(true);
                      }}
                      data-testid={`button-survey-${u.id}`}
                    >
                      <ClipboardCheck className="w-3 h-3 mr-1" /> Survey
                    </Button>
                  )}
                  {u.status === "survey" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-green-700 border-green-300"
                      onClick={() => {
                        setSelectedUsahaId(u.id);
                        setVerifikasiKeputusan("disetujui");
                        setAlasanPenolakan("");
                        setShowVerifikasiDialog(true);
                      }}
                      data-testid={`button-verifikasi-${u.id}`}
                    >
                      <FileCheck className="w-3 h-3 mr-1" /> Verifikasi
                    </Button>
                  )}
                  {u.status === "disetujui" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-blue-700 border-blue-300"
                      onClick={() => perpanjangMutation.mutate(u.id)}
                      disabled={perpanjangMutation.isPending}
                      data-testid={`button-perpanjang-${u.id}`}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Perpanjang
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-600 border-red-200"
                    onClick={() => { setSelectedUsahaId(u.id); setShowDeleteDialog(true); }}
                    data-testid={`button-delete-${u.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">Hal {page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" /> Daftarkan Usaha Baru
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`flex-1 h-1.5 rounded-full ${formStep >= s ? "bg-[hsl(163,55%,22%)]" : "bg-gray-200"}`} />
            ))}
          </div>
          <div className="text-xs text-center text-muted-foreground mb-4">
            {formStep === 1 && "Langkah 1: Data Pemilik"}
            {formStep === 2 && "Langkah 2: Data Usaha"}
            {formStep === 3 && "Langkah 3: Data Karyawan"}
            {formStep === 4 && "Langkah 4: Izin Tetangga"}
          </div>

          {formStep === 1 && (
            <div className="space-y-3">
              <div>
                <Label>Nama Lengkap Pemilik *</Label>
                <Input value={formData.namaPemilik} onChange={e => setFormData({ ...formData, namaPemilik: e.target.value })} data-testid="input-nama-pemilik" />
              </div>
              <div>
                <Label>NIK Pemilik *</Label>
                <Input value={formData.nikPemilik} onChange={e => setFormData({ ...formData, nikPemilik: e.target.value })} maxLength={16} data-testid="input-nik-pemilik" />
              </div>
              <div>
                <Label>Nomor WhatsApp Pemilik *</Label>
                <Input value={formData.nomorWaPemilik} onChange={e => setFormData({ ...formData, nomorWaPemilik: e.target.value })} placeholder="08xxxxxxxxxx" data-testid="input-wa-pemilik" />
              </div>
              <div>
                <Label>Alamat Pemilik *</Label>
                <Textarea value={formData.alamatPemilik} onChange={e => setFormData({ ...formData, alamatPemilik: e.target.value })} data-testid="input-alamat-pemilik" />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => {
                  if (!formData.namaPemilik || !formData.nikPemilik || !formData.nomorWaPemilik || !formData.alamatPemilik) {
                    toast({ title: "Error", description: "Semua field bertanda * harus diisi", variant: "destructive" });
                    return;
                  }
                  setFormStep(2);
                }} data-testid="button-next-step1">Selanjutnya</Button>
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-3">
              <div>
                <Label>Nama Usaha *</Label>
                <Input value={formData.namaUsaha} onChange={e => setFormData({ ...formData, namaUsaha: e.target.value })} data-testid="input-nama-usaha" />
              </div>
              <div>
                <Label>Jenis Usaha *</Label>
                <Select value={formData.jenisUsaha} onValueChange={v => setFormData({ ...formData, jenisUsaha: v })}>
                  <SelectTrigger data-testid="select-jenis-usaha"><SelectValue placeholder="Pilih jenis usaha" /></SelectTrigger>
                  <SelectContent>
                    {jenisUsahaOptions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alamat Usaha *</Label>
                <Textarea value={formData.alamatUsaha} onChange={e => setFormData({ ...formData, alamatUsaha: e.target.value })} data-testid="input-alamat-usaha" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>RT *</Label>
                  <Select value={String(formData.rt)} onValueChange={v => setFormData({ ...formData, rt: parseInt(v) })}>
                    <SelectTrigger data-testid="select-rt-usaha"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7].map(rt => <SelectItem key={rt} value={String(rt)}>RT {String(rt).padStart(2, "0")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>NIB (Nomor Induk Berusaha)</Label>
                  <Input value={formData.nib} onChange={e => setFormData({ ...formData, nib: e.target.value })} data-testid="input-nib" />
                </div>
              </div>
              <div>
                <Label>Deskripsi Usaha</Label>
                <Textarea value={formData.deskripsiUsaha} onChange={e => setFormData({ ...formData, deskripsiUsaha: e.target.value })} data-testid="input-deskripsi-usaha" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Lama Usaha</Label>
                  <Select value={formData.lamaUsaha} onValueChange={v => setFormData({ ...formData, lamaUsaha: v })}>
                    <SelectTrigger data-testid="select-lama-usaha"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {lamaUsahaOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Modal Usaha</Label>
                  <Select value={formData.modalUsaha} onValueChange={v => setFormData({ ...formData, modalUsaha: v })}>
                    <SelectTrigger data-testid="select-modal-usaha"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {modalUsahaOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Omset Bulanan</Label>
                  <Select value={formData.omsetBulanan} onValueChange={v => setFormData({ ...formData, omsetBulanan: v })}>
                    <SelectTrigger data-testid="select-omset"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {omsetBulananOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jam Operasional</Label>
                  <div className="flex gap-1 items-center">
                    <Input type="time" value={formData.jamOperasionalMulai} onChange={e => setFormData({ ...formData, jamOperasionalMulai: e.target.value })} data-testid="input-jam-mulai" />
                    <span className="text-xs">-</span>
                    <Input type="time" value={formData.jamOperasionalSelesai} onChange={e => setFormData({ ...formData, jamOperasionalSelesai: e.target.value })} data-testid="input-jam-selesai" />
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setFormStep(1)} data-testid="button-back-step2">Kembali</Button>
                <Button onClick={() => {
                  if (!formData.namaUsaha || !formData.jenisUsaha || !formData.alamatUsaha) {
                    toast({ title: "Error", description: "Nama, jenis, dan alamat usaha harus diisi", variant: "destructive" });
                    return;
                  }
                  setFormStep(3);
                }} data-testid="button-next-step2">Selanjutnya</Button>
              </div>
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1"><Users className="w-4 h-4" /> Data Karyawan ({karyawanList.length})</Label>
                <Button size="sm" variant="outline" onClick={addKaryawan} data-testid="button-tambah-karyawan">
                  <Plus className="w-3 h-3 mr-1" /> Tambah
                </Button>
              </div>
              {karyawanList.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Belum ada karyawan. Klik "Tambah" untuk menambahkan.
                </div>
              )}
              {karyawanList.map((k, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                  <button onClick={() => removeKaryawan(i)} className="absolute top-2 right-2 text-red-500 hover:text-red-700" data-testid={`button-remove-karyawan-${i}`}>
                    <X className="w-4 h-4" />
                  </button>
                  <div className="text-xs font-medium text-muted-foreground">Karyawan {i + 1}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Nama Lengkap *</Label>
                      <Input className="h-8 text-sm" value={k.namaLengkap} onChange={e => updateKaryawan(i, "namaLengkap", e.target.value)} data-testid={`input-karyawan-nama-${i}`} />
                    </div>
                    <div>
                      <Label className="text-xs">NIK *</Label>
                      <Input className="h-8 text-sm" value={k.nik} onChange={e => updateKaryawan(i, "nik", e.target.value)} maxLength={16} data-testid={`input-karyawan-nik-${i}`} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Alamat *</Label>
                    <Input className="h-8 text-sm" value={k.alamat} onChange={e => updateKaryawan(i, "alamat", e.target.value)} data-testid={`input-karyawan-alamat-${i}`} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">No. WhatsApp</Label>
                      <Input className="h-8 text-sm" value={k.nomorWhatsapp} onChange={e => updateKaryawan(i, "nomorWhatsapp", e.target.value)} data-testid={`input-karyawan-wa-${i}`} />
                    </div>
                    <div>
                      <Label className="text-xs">Jabatan *</Label>
                      <Select value={k.jabatan} onValueChange={v => updateKaryawan(i, "jabatan", v)}>
                        <SelectTrigger className="h-8 text-sm" data-testid={`select-karyawan-jabatan-${i}`}><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          {jabatanKaryawanOptions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Mulai Kerja</Label>
                      <Input className="h-8 text-sm" type="date" value={k.tanggalMulaiKerja} onChange={e => updateKaryawan(i, "tanggalMulaiKerja", e.target.value)} data-testid={`input-karyawan-mulai-${i}`} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setFormStep(2)} data-testid="button-back-step3">Kembali</Button>
                <Button onClick={() => setFormStep(4)} data-testid="button-next-step3">Selanjutnya</Button>
              </div>
            </div>
          )}

          {formStep === 4 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-500" /> Izin Tetangga (Wajib 4 Posisi)</Label>
              {izinList.map((iz, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium">Tetangga {iz.posisi}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Nama Warga *</Label>
                      <Input className="h-8 text-sm" value={iz.namaWarga} onChange={e => updateIzin(i, "namaWarga", e.target.value)} data-testid={`input-izin-nama-${iz.posisi.toLowerCase()}`} />
                    </div>
                    <div>
                      <Label className="text-xs">No. WhatsApp</Label>
                      <Input className="h-8 text-sm" value={iz.nomorWhatsapp} onChange={e => updateIzin(i, "nomorWhatsapp", e.target.value)} data-testid={`input-izin-wa-${iz.posisi.toLowerCase()}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Status Persetujuan</Label>
                      <Select value={iz.statusPersetujuan} onValueChange={v => updateIzin(i, "statusPersetujuan", v)}>
                        <SelectTrigger className="h-8 text-sm" data-testid={`select-izin-status-${iz.posisi.toLowerCase()}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="setuju">Setuju</SelectItem>
                          <SelectItem value="tidak_setuju">Tidak Setuju</SelectItem>
                          <SelectItem value="belum">Belum Dikonfirmasi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {iz.statusPersetujuan === "tidak_setuju" && (
                      <div>
                        <Label className="text-xs">Alasan Penolakan</Label>
                        <Input className="h-8 text-sm" value={iz.alasanPenolakan} onChange={e => updateIzin(i, "alasanPenolakan", e.target.value)} data-testid={`input-izin-alasan-${iz.posisi.toLowerCase()}`} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setFormStep(3)} data-testid="button-back-step4">Kembali</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-usaha">
                  {createMutation.isPending ? "Menyimpan..." : "Daftarkan Usaha"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Usaha</DialogTitle>
          </DialogHeader>
          {selectedUsaha && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={statusColors[selectedUsaha.status]}>{statusLabels[selectedUsaha.status]}</Badge>
                {selectedUsaha.nomorStiker && (
                  <div className="text-xs font-medium">Stiker: {selectedUsaha.nomorStiker}</div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="text-xs font-semibold text-muted-foreground mb-1">DATA PEMILIK</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground">Nama:</span> {selectedUsaha.namaPemilik}</div>
                  <div><span className="text-muted-foreground">NIK:</span> {selectedUsaha.nikPemilik}</div>
                  <div><span className="text-muted-foreground">WA:</span> {selectedUsaha.nomorWaPemilik}</div>
                  <div><span className="text-muted-foreground">Alamat:</span> {selectedUsaha.alamatPemilik}</div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="text-xs font-semibold text-muted-foreground mb-1">DATA USAHA</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground">Nama:</span> {selectedUsaha.namaUsaha}</div>
                  <div><span className="text-muted-foreground">Jenis:</span> {selectedUsaha.jenisUsaha}</div>
                  <div><span className="text-muted-foreground">Alamat:</span> {selectedUsaha.alamatUsaha}</div>
                  <div><span className="text-muted-foreground">RT:</span> {String(selectedUsaha.rt).padStart(2, "0")}</div>
                  <div><span className="text-muted-foreground">NIB:</span> {selectedUsaha.nib || "-"}</div>
                  <div><span className="text-muted-foreground">Lama:</span> {selectedUsaha.lamaUsaha || "-"}</div>
                  <div><span className="text-muted-foreground">Jam:</span> {selectedUsaha.jamOperasionalMulai || "-"} - {selectedUsaha.jamOperasionalSelesai || "-"}</div>
                  <div><span className="text-muted-foreground">Modal:</span> {selectedUsaha.modalUsaha || "-"}</div>
                  <div><span className="text-muted-foreground">Omset:</span> {selectedUsaha.omsetBulanan || "-"}</div>
                </div>
                {selectedUsaha.deskripsiUsaha && (
                  <div className="text-sm mt-1"><span className="text-muted-foreground">Deskripsi:</span> {selectedUsaha.deskripsiUsaha}</div>
                )}
              </div>

              {selectedUsaha.karyawan.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">KARYAWAN ({selectedUsaha.karyawan.length})</div>
                  <div className="space-y-2">
                    {selectedUsaha.karyawan.map(k => (
                      <div key={k.id} className="text-sm border-b border-border/50 pb-1 last:border-0 last:pb-0">
                        <div className="font-medium">{k.namaLengkap} - {k.jabatan}</div>
                        <div className="text-xs text-muted-foreground">NIK: {k.nik} | WA: {k.nomorWhatsapp || "-"} | Alamat: {k.alamat}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">IZIN TETANGGA ({selectedUsaha.izinTetangga.length})</div>
                <div className="space-y-2">
                  {selectedUsaha.izinTetangga.map(iz => (
                    <div key={iz.id} className="text-sm flex items-center justify-between border-b border-border/50 pb-1 last:border-0 last:pb-0">
                      <div>
                        <span className="font-medium">{iz.posisi}:</span> {iz.namaWarga}
                        {iz.nomorWhatsapp && <span className="text-xs text-muted-foreground ml-1">({iz.nomorWhatsapp})</span>}
                      </div>
                      <Badge className={
                        iz.statusPersetujuan === "setuju" ? "bg-green-100 text-green-800" :
                        iz.statusPersetujuan === "tidak_setuju" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }>
                        {iz.statusPersetujuan === "setuju" ? "Setuju" : iz.statusPersetujuan === "tidak_setuju" ? "Tidak Setuju" : "Belum"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {selectedUsaha.survey && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">HASIL SURVEY</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div><span className="text-muted-foreground">Tanggal:</span> {selectedUsaha.survey.tanggalSurvey}</div>
                    <div><span className="text-muted-foreground">Petugas:</span> {selectedUsaha.survey.petugasSurvey}</div>
                    <div><span className="text-muted-foreground">Kesesuaian:</span> {selectedUsaha.survey.kesesuaianData}</div>
                    <div><span className="text-muted-foreground">Rekomendasi:</span> <Badge className={selectedUsaha.survey.rekomendasi === "layak" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{selectedUsaha.survey.rekomendasi}</Badge></div>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="text-muted-foreground">Dampak:</span> Kebisingan {selectedUsaha.survey.dampakKebisingan}/5, Bau {selectedUsaha.survey.dampakBau}/5, Limbah {selectedUsaha.survey.dampakLimbah}/5
                  </div>
                  {selectedUsaha.survey.kondisiLokasi && <div className="text-sm"><span className="text-muted-foreground">Kondisi:</span> {selectedUsaha.survey.kondisiLokasi}</div>}
                  {selectedUsaha.survey.catatanSurvey && <div className="text-sm"><span className="text-muted-foreground">Catatan:</span> {selectedUsaha.survey.catatanSurvey}</div>}
                  {selectedUsaha.survey.fotoLokasi && (
                    <div className="mt-2">
                      <img src={selectedUsaha.survey.fotoLokasi} alt="Foto lokasi" className="rounded-md max-h-48 object-cover" />
                    </div>
                  )}
                </div>
              )}

              {selectedUsaha.status === "disetujui" && selectedUsaha.nomorStiker && (
                <div className="bg-green-50 rounded-lg p-3 space-y-1">
                  <div className="text-xs font-semibold text-green-800 mb-1">STIKER USAHA</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div><span className="text-muted-foreground">Nomor:</span> {selectedUsaha.nomorStiker}</div>
                    <div><span className="text-muted-foreground">Terbit:</span> {selectedUsaha.tanggalStikerTerbit}</div>
                    <div><span className="text-muted-foreground">Expired:</span> {selectedUsaha.tanggalStikerExpired}</div>
                  </div>
                </div>
              )}

              {selectedUsaha.riwayatStiker.length > 1 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">RIWAYAT STIKER</div>
                  <div className="space-y-1">
                    {selectedUsaha.riwayatStiker.map(rs => (
                      <div key={rs.id} className="text-xs flex justify-between border-b border-border/50 pb-1 last:border-0">
                        <span>{rs.nomorStiker}</span>
                        <span>{rs.tanggalTerbit} s/d {rs.tanggalExpired}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedUsaha.status === "ditolak" && selectedUsaha.alasanPenolakan && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-red-800 mb-1">ALASAN PENOLAKAN</div>
                  <div className="text-sm">{selectedUsaha.alasanPenolakan}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSurveyDialog} onOpenChange={setShowSurveyDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" /> Survey Lapangan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Survey *</Label>
                <Input type="date" value={surveyForm.tanggalSurvey} onChange={e => setSurveyForm({ ...surveyForm, tanggalSurvey: e.target.value })} data-testid="input-survey-tanggal" />
              </div>
              <div>
                <Label>Petugas Survey *</Label>
                <Input value={surveyForm.petugasSurvey} onChange={e => setSurveyForm({ ...surveyForm, petugasSurvey: e.target.value })} data-testid="input-survey-petugas" />
              </div>
            </div>
            <div>
              <Label>Kesesuaian Data *</Label>
              <Select value={surveyForm.kesesuaianData} onValueChange={v => setSurveyForm({ ...surveyForm, kesesuaianData: v })}>
                <SelectTrigger data-testid="select-survey-kesesuaian"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sesuai">Sesuai</SelectItem>
                  <SelectItem value="sebagian_sesuai">Sebagian Sesuai</SelectItem>
                  <SelectItem value="tidak_sesuai">Tidak Sesuai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dampak Lingkungan (Skala 1-5)</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Kebisingan", field: "dampakKebisingan" as const },
                  { label: "Bau", field: "dampakBau" as const },
                  { label: "Limbah", field: "dampakLimbah" as const },
                ].map(d => (
                  <div key={d.field}>
                    <Label className="text-xs">{d.label}</Label>
                    <Select value={String(surveyForm[d.field])} onValueChange={v => setSurveyForm({ ...surveyForm, [d.field]: parseInt(v) })}>
                      <SelectTrigger className="h-8" data-testid={`select-survey-${d.field}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Kondisi Lokasi</Label>
              <Textarea value={surveyForm.kondisiLokasi} onChange={e => setSurveyForm({ ...surveyForm, kondisiLokasi: e.target.value })} data-testid="input-survey-kondisi" />
            </div>
            <div>
              <Label>Catatan Survey</Label>
              <Textarea value={surveyForm.catatanSurvey} onChange={e => setSurveyForm({ ...surveyForm, catatanSurvey: e.target.value })} data-testid="input-survey-catatan" />
            </div>
            <div>
              <Label>Foto Lokasi</Label>
              <Input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !selectedUsahaId) return;
                const fd = new FormData();
                fd.append("foto", file);
                try {
                  const res = await fetch(`/api/usaha/${selectedUsahaId}/survey/upload`, {
                    method: "POST", body: fd, credentials: "include",
                  });
                  if (!res.ok) throw new Error("Upload gagal");
                  const { filePath } = await res.json();
                  setSurveyForm({ ...surveyForm, fotoLokasi: filePath });
                  toast({ title: "Berhasil", description: "Foto berhasil diupload" });
                } catch {
                  toast({ title: "Gagal", description: "Gagal upload foto", variant: "destructive" });
                }
              }} data-testid="input-survey-foto" />
              {surveyForm.fotoLokasi && <img src={surveyForm.fotoLokasi} alt="Preview" className="mt-2 rounded-md max-h-32 object-cover" />}
            </div>
            <div>
              <Label>Rekomendasi *</Label>
              <Select value={surveyForm.rekomendasi} onValueChange={v => setSurveyForm({ ...surveyForm, rekomendasi: v })}>
                <SelectTrigger data-testid="select-survey-rekomendasi"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="layak">Layak</SelectItem>
                  <SelectItem value="tidak_layak">Tidak Layak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!surveyForm.petugasSurvey || !surveyForm.tanggalSurvey) {
                  toast({ title: "Error", description: "Tanggal dan petugas survey harus diisi", variant: "destructive" });
                  return;
                }
                if (selectedUsahaId) surveyMutation.mutate({ id: selectedUsahaId, data: surveyForm });
              }}
              disabled={surveyMutation.isPending}
              data-testid="button-submit-survey"
            >
              {surveyMutation.isPending ? "Menyimpan..." : "Simpan Hasil Survey"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVerifikasiDialog} onOpenChange={setShowVerifikasiDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" /> Verifikasi Usaha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Keputusan</Label>
              <Select value={verifikasiKeputusan} onValueChange={v => setVerifikasiKeputusan(v as "disetujui" | "ditolak")}>
                <SelectTrigger data-testid="select-verifikasi-keputusan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disetujui">Disetujui - Terbitkan Stiker</SelectItem>
                  <SelectItem value="ditolak">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {verifikasiKeputusan === "ditolak" && (
              <div>
                <Label>Alasan Penolakan *</Label>
                <Textarea value={alasanPenolakan} onChange={e => setAlasanPenolakan(e.target.value)} placeholder="Jelaskan alasan penolakan..." data-testid="input-alasan-penolakan" />
              </div>
            )}
            {verifikasiKeputusan === "disetujui" && (
              <div className="bg-green-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-800">Stiker akan otomatis diterbitkan:</p>
                <ul className="text-green-700 text-xs mt-1 space-y-0.5">
                  <li>- Nomor stiker otomatis</li>
                  <li>- Berlaku 6 bulan dari hari ini</li>
                  <li>- Notifikasi WA ke pemilik usaha</li>
                </ul>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => {
                if (verifikasiKeputusan === "ditolak" && !alasanPenolakan.trim()) {
                  toast({ title: "Error", description: "Alasan penolakan harus diisi", variant: "destructive" });
                  return;
                }
                if (selectedUsahaId) {
                  verifikasiMutation.mutate({
                    id: selectedUsahaId,
                    data: { keputusan: verifikasiKeputusan, alasanPenolakan: verifikasiKeputusan === "ditolak" ? alasanPenolakan : undefined },
                  });
                }
              }}
              disabled={verifikasiMutation.isPending}
              data-testid="button-submit-verifikasi"
            >
              {verifikasiMutation.isPending ? "Memproses..." : verifikasiKeputusan === "disetujui" ? "Setujui & Terbitkan Stiker" : "Tolak Usaha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Usaha?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus semua data usaha termasuk data karyawan, izin tetangga, hasil survey, dan riwayat stiker. Data yang dihapus tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (selectedUsahaId) deleteMutation.mutate(selectedUsahaId); }}
              data-testid="button-confirm-delete"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
