import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, ChevronLeft, ChevronRight, Upload, X, FileText, Download, MessageCircle, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { KartuKeluarga } from "@shared/schema";
import { pekerjaanOptions, pendidikanOptions, agamaOptions, jenisKelaminOptions, statusPerkawinanOptions, kedudukanKeluargaOptions, statusKependudukanOptions, statusDisabilitasOptions, kondisiKesehatanOptions } from "@/lib/constants";

const PER_PAGE = 10;

const defaultForm = {
  kkId: "", namaLengkap: "", nik: "", nomorWhatsapp: "",
  jenisKelamin: "Laki-laki", statusPerkawinan: "Belum Kawin",
  agama: "Islam", kedudukanKeluarga: "Anak", tanggalLahir: "", pekerjaan: "",
  pendidikan: "", statusKependudukan: "Aktif",
  statusDisabilitas: "Tidak Ada", kondisiKesehatan: "Sehat", ibuHamil: false,
};

export default function AdminKelolaWarga() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ ...defaultForm });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...defaultForm });
  const [editingWargaId, setEditingWargaId] = useState<number | null>(null);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editFilePreview, setEditFilePreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [kkSearch, setKkSearch] = useState("");
  const [kkDropdownOpen, setKkDropdownOpen] = useState(false);
  const [editKkSearch, setEditKkSearch] = useState("");
  const [editKkDropdownOpen, setEditKkDropdownOpen] = useState(false);
  const [deleteWarga, setDeleteWarga] = useState<any>(null);
  const kkPickerRef = useRef<HTMLDivElement>(null);
  const editKkPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (kkPickerRef.current && !kkPickerRef.current.contains(e.target as Node)) setKkDropdownOpen(false);
      if (editKkPickerRef.current && !editKkPickerRef.current.contains(e.target as Node)) setEditKkDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: kkList } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });

  const { data: wargaList, isLoading } = useQuery<any[]>({ queryKey: ["/api/warga-with-kk"] });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Format tidak didukung", description: "Hanya file PDF yang diterima untuk KTP", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimal 2MB. Kompres PDF terlebih dahulu", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    setFilePreview(null);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Format tidak didukung", description: "Hanya file PDF yang diterima untuk KTP", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimal 2MB. Kompres PDF terlebih dahulu", variant: "destructive" });
      return;
    }
    setEditSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setEditFilePreview(null);
    }
  };

  const clearEditFile = () => {
    setEditSelectedFile(null);
    setEditFilePreview(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/warga", {
        ...form,
        kkId: parseInt(form.kkId),
        nomorWhatsapp: form.nomorWhatsapp || null,
        tanggalLahir: form.tanggalLahir || null,
        pekerjaan: form.pekerjaan || null,
        pendidikan: form.pendidikan || null,
        statusKependudukan: form.statusKependudukan,
      });
      const created = await res.json();
      if (selectedFile && created.id) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch(`/api/upload/ktp/${created.id}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ message: "Upload gagal" }));
          throw new Error(`Warga disimpan, tapi upload foto gagal: ${err.message}`);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Warga ditambahkan" });
      setDialogOpen(false);
      clearFile();
      setForm({ ...defaultForm });
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingWargaId) return;
      await apiRequest("PATCH", `/api/warga/${editingWargaId}`, {
        ...editForm,
        kkId: parseInt(editForm.kkId),
        nomorWhatsapp: editForm.nomorWhatsapp || null,
        tanggalLahir: editForm.tanggalLahir || null,
        pekerjaan: editForm.pekerjaan || null,
        pendidikan: editForm.pendidikan || null,
        statusKependudukan: editForm.statusKependudukan,
      });
      if (editSelectedFile && editingWargaId) {
        const formData = new FormData();
        formData.append("file", editSelectedFile);
        const uploadRes = await fetch(`/api/upload/ktp/${editingWargaId}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ message: "Upload gagal" }));
          throw new Error(`Data disimpan, tapi upload foto gagal: ${err.message}`);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Data warga diperbarui" });
      setEditDialogOpen(false);
      clearEditFile();
      setEditingWargaId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const deleteWargaMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/warga/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Warga berhasil dihapus" });
      setDeleteWarga(null);
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    },
    onError: (err: any) => toast({ title: "Gagal menghapus", description: err.message, variant: "destructive" }),
  });

  const openEditDialog = (w: any) => {
    setEditForm({
      kkId: w.kkId?.toString() || "",
      namaLengkap: w.namaLengkap || "",
      nik: w.nik || "",
      nomorWhatsapp: w.nomorWhatsapp || "",
      jenisKelamin: w.jenisKelamin || "Laki-laki",
      statusPerkawinan: w.statusPerkawinan || "Belum Kawin",
      agama: w.agama || "Islam",
      kedudukanKeluarga: w.kedudukanKeluarga || "Anak",
      tanggalLahir: w.tanggalLahir || "",
      pekerjaan: w.pekerjaan || "",
      pendidikan: w.pendidikan || "",
      statusKependudukan: w.statusKependudukan || "Aktif",
      statusDisabilitas: w.statusDisabilitas || "Tidak Ada",
      kondisiKesehatan: w.kondisiKesehatan || "Sehat",
      ibuHamil: w.ibuHamil || false,
    });
    setEditingWargaId(w.id);
    clearEditFile();
    setEditDialogOpen(true);
  };

  const filtered = useMemo(() => {
    return wargaList?.filter(w =>
      w.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      w.nik.includes(search) ||
      (w.nomorKk && w.nomorKk.includes(search))
    ) || [];
  }, [wargaList, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const renderFormFields = (
    formData: typeof defaultForm,
    setFormData: (f: typeof defaultForm) => void,
    fileRef: React.RefObject<HTMLInputElement>,
    file: File | null,
    preview: string | null,
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onClearFile: () => void,
    testIdPrefix: string,
    searchVal: string,
    setSearchVal: (v: string) => void,
    dropdownOpen: boolean,
    setDropdownOpen: (v: boolean) => void,
    pickerRef: React.RefObject<HTMLDivElement>,
  ) => {
    const selectedKk = kkList?.find(k => k.id.toString() === formData.kkId);
    const filteredKkList = kkList?.filter(k => {
      if (!searchVal) return true;
      const q = searchVal.toLowerCase();
      return k.nomorKk.toLowerCase().includes(q) || k.alamat.toLowerCase().includes(q) || `rt ${k.rt}`.includes(q);
    }) || [];
    return (
    <div className="space-y-3">
      <div className="space-y-1 relative" ref={pickerRef}>
        <Label className="text-sm">Kartu Keluarga</Label>
        {selectedKk ? (
          <div className="flex items-center gap-2 rounded-md border p-2 h-10">
            <span className="text-sm flex-1 truncate">{selectedKk.nomorKk} - RT {selectedKk.rt}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setFormData({...formData, kkId: ""}); setSearchVal(""); }} data-testid={`button-clear-kk-${testIdPrefix}`}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchVal}
              onChange={e => { setSearchVal(e.target.value); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Cari nomor KK, alamat, atau RT..."
              className="h-10 pl-9"
              data-testid={`input-search-kk-${testIdPrefix}`}
            />
          </div>
        )}
        {dropdownOpen && !selectedKk && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
            {filteredKkList.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">Tidak ditemukan</p>
            ) : (
              filteredKkList.slice(0, 20).map(k => (
                <button
                  key={k.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                  onClick={() => { setFormData({...formData, kkId: k.id.toString()}); setDropdownOpen(false); setSearchVal(""); }}
                  data-testid={`option-kk-${k.id}-${testIdPrefix}`}
                >
                  <div className="font-medium">{k.nomorKk}</div>
                  <div className="text-xs text-muted-foreground">RT {k.rt} - {k.alamat}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-sm">Nama Lengkap</Label>
        <Input value={formData.namaLengkap} onChange={e => setFormData({...formData, namaLengkap: e.target.value})} className="h-10" data-testid={`input-nama-${testIdPrefix}`} />
      </div>
      <div className="space-y-1">
        <Label className="text-sm">NIK</Label>
        <Input value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value})} className="h-10" data-testid={`input-nik-${testIdPrefix}`} />
      </div>
      <div className="space-y-1">
        <Label className="text-sm">No. WhatsApp</Label>
        <Input value={formData.nomorWhatsapp} onChange={e => setFormData({...formData, nomorWhatsapp: e.target.value})} className="h-10" data-testid={`input-wa-${testIdPrefix}`} />
      </div>
      <div className="space-y-1">
        <Label className="text-sm">Tanggal Lahir</Label>
        <Input type="date" value={formData.tanggalLahir} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} className="h-10" data-testid={`input-tanggal-lahir-${testIdPrefix}`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Jenis Kelamin</Label>
          <Select value={formData.jenisKelamin} onValueChange={v => setFormData({...formData, jenisKelamin: v})}>
            <SelectTrigger className="h-10" data-testid={`select-jk-${testIdPrefix}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {jenisKelaminOptions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Kedudukan</Label>
          <Select value={formData.kedudukanKeluarga} onValueChange={v => setFormData({...formData, kedudukanKeluarga: v})}>
            <SelectTrigger className="h-10" data-testid={`select-kedudukan-${testIdPrefix}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {kedudukanKeluargaOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Agama</Label>
          <Select value={formData.agama} onValueChange={v => setFormData({...formData, agama: v})}>
            <SelectTrigger className="h-10" data-testid={`select-agama-${testIdPrefix}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {agamaOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Status Kawin</Label>
          <Select value={formData.statusPerkawinan} onValueChange={v => setFormData({...formData, statusPerkawinan: v})}>
            <SelectTrigger className="h-10" data-testid={`select-status-kawin-${testIdPrefix}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusPerkawinanOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Pekerjaan</Label>
          <Select value={formData.pekerjaan} onValueChange={v => setFormData({...formData, pekerjaan: v})}>
            <SelectTrigger className="h-10" data-testid={`select-pekerjaan-${testIdPrefix}`}><SelectValue placeholder="Pilih pekerjaan" /></SelectTrigger>
            <SelectContent>
              {pekerjaanOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Pendidikan</Label>
          <Select value={formData.pendidikan} onValueChange={v => setFormData({...formData, pendidikan: v})}>
            <SelectTrigger className="h-10" data-testid={`select-pendidikan-${testIdPrefix}`}><SelectValue placeholder="Pilih pendidikan" /></SelectTrigger>
            <SelectContent>
              {pendidikanOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-sm">Status Kependudukan</Label>
        <Select value={formData.statusKependudukan} onValueChange={v => setFormData({...formData, statusKependudukan: v})}>
          <SelectTrigger className="h-10" data-testid={`select-status-kependudukan-${testIdPrefix}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusKependudukanOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* ===== DATA KESEHATAN ===== */}
      <div className="pt-1 pb-0.5 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data Kesehatan & Kondisi Khusus</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Kondisi Kesehatan</Label>
          <Select value={formData.kondisiKesehatan} onValueChange={v => setFormData({...formData, kondisiKesehatan: v})}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {kondisiKesehatanOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Status Disabilitas</Label>
          <Select value={formData.statusDisabilitas} onValueChange={v => setFormData({...formData, statusDisabilitas: v})}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusDisabilitasOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {formData.jenisKelamin === "Perempuan" && (
        <div className="flex items-center gap-2 h-9">
          <Checkbox
            id={`ibuHamil-${testIdPrefix}`}
            checked={formData.ibuHamil}
            onCheckedChange={(checked) => setFormData({...formData, ibuHamil: checked === true})}
          />
          <Label htmlFor={`ibuHamil-${testIdPrefix}`} className="text-sm cursor-pointer">Sedang Hamil</Label>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-sm">Upload Foto KTP</Label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={onFileSelect}
          className="hidden"
          data-testid={`input-file-ktp-${testIdPrefix}`}
        />
        {file ? (
          <div className="flex items-center gap-2 rounded-md border p-2">
            {preview ? (
              <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded-md" data-testid={`img-preview-ktp-${testIdPrefix}`} />
            ) : (
              <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">{file.name}</p>
              <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <Button size="icon" variant="ghost" onClick={onClearFile} data-testid={`button-clear-file-ktp-${testIdPrefix}`}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => fileRef.current?.click()}
            data-testid={`button-upload-ktp-${testIdPrefix}`}
          >
            <Upload className="w-4 h-4" /> Pilih File
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground">JPG, PNG, atau PDF. Maks 5MB</p>
      </div>
    </div>
  );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-warga-title">Data Warga</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { clearFile(); setForm({ ...defaultForm }); setKkSearch(""); setKkDropdownOpen(false); } }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" data-testid="button-tambah-warga">
              <Plus className="w-4 h-4" /> Tambah Warga
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Warga</DialogTitle>
            </DialogHeader>
            {renderFormFields(form, setForm, fileInputRef, selectedFile, filePreview, handleFileSelect, clearFile, "warga", kkSearch, setKkSearch, kkDropdownOpen, setKkDropdownOpen, kkPickerRef)}
            <Button className="w-full h-10" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.kkId || !form.namaLengkap || !form.nik} data-testid="button-simpan-warga">
              {createMutation.isPending ? "Menyimpan..." : "Simpan Warga"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { clearEditFile(); setEditingWargaId(null); setEditKkSearch(""); setEditKkDropdownOpen(false); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Warga</DialogTitle>
          </DialogHeader>
          {renderFormFields(editForm, setEditForm, editFileInputRef, editSelectedFile, editFilePreview, handleEditFileSelect, clearEditFile, "edit-warga", editKkSearch, setEditKkSearch, editKkDropdownOpen, setEditKkDropdownOpen, editKkPickerRef)}
          <Button className="w-full h-10" onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editForm.kkId || !editForm.namaLengkap || !editForm.nik} data-testid="button-simpan-edit-warga">
            {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Cari nama, NIK, atau nomor KK..." className="h-10 pl-9" data-testid="input-search-warga" />
      </div>

      <p className="text-xs text-muted-foreground" data-testid="text-warga-count">
        Menampilkan {paginated.length} dari {filtered.length} warga
        {totalPages > 1 && ` (halaman ${page} dari ${totalPages})`}
      </p>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {paginated.map(w => (
            <Card key={w.id} data-testid={`card-warga-admin-${w.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.namaLengkap}</p>
                      <p className="text-[10px] text-muted-foreground">NIK: {w.nik}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                    <Badge variant="secondary" className="text-[10px]">RT {w.rt?.toString().padStart(2,"0")}</Badge>
                    <Badge variant="outline" className="text-[10px]">{w.kedudukanKeluarga}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(w)} data-testid={`button-edit-warga-${w.id}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteWarga(w)}
                    data-testid={`button-delete-warga-${w.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  {w.fotoKtp ? (
                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7" asChild data-testid={`button-download-ktp-${w.id}`}>
                      <a href={w.fotoKtp} download target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3" /> KTP
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7 opacity-40" disabled data-testid={`button-download-ktp-${w.id}`}>
                      <Download className="w-3 h-3" /> KTP
                    </Button>
                  )}
                  {w.nomorWhatsapp ? (
                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7 text-green-700 border-green-200 hover:bg-green-50" asChild data-testid={`button-wa-${w.id}`}>
                      <a href={`https://wa.me/${w.nomorWhatsapp.replace(/^0/, "62").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-3 h-3" /> WA
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7 opacity-40" disabled data-testid={`button-wa-${w.id}`}>
                      <MessageCircle className="w-3 h-3" /> WA
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            data-testid="button-prev-warga"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            data-testid="button-next-warga"
          >
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <AlertDialog open={!!deleteWarga} onOpenChange={(open) => { if (!open) setDeleteWarga(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Hapus Data Warga?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <span className="block">Data <strong>{deleteWarga?.namaLengkap}</strong> (NIK: {deleteWarga?.nik}) akan dihapus beserta:</span>
              <span className="block text-red-600 font-medium">
                • Semua laporan warga terkait<br/>
                • Semua surat warga terkait<br/>
                • Semua pengajuan edit profil terkait
              </span>
              <span className="block font-semibold text-red-700">Tindakan ini tidak dapat dibatalkan!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-warga">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteWarga && deleteWargaMutation.mutate(deleteWarga.id)}
              disabled={deleteWargaMutation.isPending}
              data-testid="button-confirm-delete-warga"
            >
              {deleteWargaMutation.isPending ? "Menghapus..." : "Hapus Warga"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
