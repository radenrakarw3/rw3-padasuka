import { useState, useMemo, useRef, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Home, Users, ChevronLeft, ChevronRight, Download, Upload, X, FileText, ChevronDown, User, MessageCircle, ShieldCheck, ShieldAlert, QrCode, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { statusRumahOptions, listrikOptions, rtOptions, kondisiBangunanOptions, sumberAirOptions, sanitasiWcOptions, jenisBansosOptions, penghasilanBulananOptions, kategoriEkonomiOptions } from "@/lib/constants";
import type { KartuKeluarga, Warga } from "@shared/schema";
import QRCode from "qrcode";

const PER_PAGE = 10;

type VerificationStatus = "verified" | "unverified";

interface VerificationResult {
  status: VerificationStatus;
  reasons: string[];
}

export default function AdminKelolaKK() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterRt, setFilterRt] = useState("semua");
  const [filterVerifikasi, setFilterVerifikasi] = useState("semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    nomorKk: "", rt: "1", alamat: "", statusRumah: "Milik Sendiri",
    jumlahPenghuni: "1", kondisiBangunan: "Permanen", sumberAir: "PDAM",
    sanitasiWc: "Jamban Sendiri", listrik: "PLN 900 VA", penerimaBansos: false,
    jenisBansos: "" as string,
    penghasilanBulanan: "" as string, layakBansos: false, kategoriEkonomi: "" as string,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingKkId, setEditingKkId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    nomorKk: "", rt: "1", alamat: "", statusRumah: "Milik Sendiri",
    jumlahPenghuni: "1", kondisiBangunan: "Permanen", sumberAir: "PDAM",
    sanitasiWc: "Jamban Sendiri", listrik: "PLN 900 VA", penerimaBansos: false,
    jenisBansos: "" as string,
    penghasilanBulanan: "" as string, layakBansos: false, kategoriEkonomi: "" as string,
  });
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editFilePreview, setEditFilePreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedKk, setExpandedKk] = useState<number | null>(null);
  const [qrDialogKk, setQrDialogKk] = useState<KartuKeluarga | null>(null);
  const [deleteKk, setDeleteKk] = useState<KartuKeluarga | null>(null);

  const { data: kkList, isLoading } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });
  const { data: wargaList } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });

  const kepalaByKkId = useMemo(() => {
    const map: Record<number, Warga> = {};
    wargaList?.forEach(w => {
      if (w.kedudukanKeluarga === "Kepala Keluarga") {
        map[w.kkId] = w;
      }
    });
    return map;
  }, [wargaList]);

  const membersByKkId = useMemo(() => {
    const map: Record<number, Warga[]> = {};
    wargaList?.forEach(w => {
      if (!map[w.kkId]) map[w.kkId] = [];
      map[w.kkId].push(w);
    });
    return map;
  }, [wargaList]);

  const normalizePhone = useCallback((phone: string) => {
    let n = phone.replace(/[^0-9]/g, "");
    if (n.startsWith("0")) n = "62" + n.substring(1);
    if (!n.startsWith("62")) n = "62" + n;
    return n;
  }, []);

  const duplicateWaNumbers = useMemo(() => {
    const phoneCount: Record<string, number> = {};
    wargaList?.forEach(w => {
      if (w.nomorWhatsapp) {
        const normalized = normalizePhone(w.nomorWhatsapp);
        phoneCount[normalized] = (phoneCount[normalized] || 0) + 1;
      }
    });
    const dupes = new Set<string>();
    Object.entries(phoneCount).forEach(([phone, count]) => {
      if (count > 1) dupes.add(phone);
    });
    return dupes;
  }, [wargaList, normalizePhone]);

  const getVerification = useCallback((kk: KartuKeluarga): VerificationResult => {
    const reasons: string[] = [];
    const kepala = kepalaByKkId[kk.id];
    const members = membersByKkId[kk.id] || [];

    if (!kk.fotoKk) reasons.push("Foto KK belum diupload");
    if (!kepala) {
      reasons.push("Kepala keluarga belum terdaftar");
    } else {
      if (!kepala.fotoKtp) reasons.push("KTP kepala keluarga belum diupload");
      if (!kepala.nomorWhatsapp) {
        reasons.push("Nomor WhatsApp belum diisi");
      } else {
        const normalized = normalizePhone(kepala.nomorWhatsapp);
        if (duplicateWaNumbers.has(normalized)) {
          reasons.push("Nomor WhatsApp digunakan lebih dari 1 warga");
        }
      }
    }

    return {
      status: reasons.length === 0 ? "verified" : "unverified",
      reasons,
    };
  }, [kepalaByKkId, membersByKkId, duplicateWaNumbers, normalizePhone]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Format tidak didukung", description: "Hanya file PDF yang diterima untuk KK dan KTP", variant: "destructive" });
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
      toast({ title: "Format tidak didukung", description: "Hanya file PDF yang diterima untuk KK dan KTP", variant: "destructive" });
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

  const openEditDialog = (kk: KartuKeluarga) => {
    setEditingKkId(kk.id);
    setEditForm({
      nomorKk: kk.nomorKk,
      rt: kk.rt.toString(),
      alamat: kk.alamat,
      statusRumah: kk.statusRumah,
      jumlahPenghuni: kk.jumlahPenghuni.toString(),
      kondisiBangunan: kk.kondisiBangunan,
      sumberAir: kk.sumberAir,
      sanitasiWc: kk.sanitasiWc,
      listrik: kk.listrik,
      penerimaBansos: kk.penerimaBansos,
      jenisBansos: kk.jenisBansos || "",
      penghasilanBulanan: kk.penghasilanBulanan || "",
      layakBansos: kk.layakBansos || false,
      kategoriEkonomi: kk.kategoriEkonomi || "",
    });
    clearEditFile();
    setEditDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/kk", {
        ...form,
        rt: parseInt(form.rt),
        jumlahPenghuni: parseInt(form.jumlahPenghuni),
        jenisBansos: form.penerimaBansos ? form.jenisBansos : null,
        penghasilanBulanan: form.penghasilanBulanan || null,
        kategoriEkonomi: form.kategoriEkonomi || null,
      });
      const created = await res.json();
      if (selectedFile && created.id) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch(`/api/upload/kk/${created.id}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ message: "Upload gagal" }));
          throw new Error(`KK disimpan, tapi upload foto gagal: ${err.message}`);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "KK berhasil ditambahkan" });
      setDialogOpen(false);
      setForm({ nomorKk: "", rt: "1", alamat: "", statusRumah: "Milik Sendiri", jumlahPenghuni: "1", kondisiBangunan: "Permanen", sumberAir: "PDAM", sanitasiWc: "Jamban Sendiri", listrik: "PLN 900 VA", penerimaBansos: false, jenisBansos: "", penghasilanBulanan: "", layakBansos: false, kategoriEkonomi: "" });
      clearFile();
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingKkId) return;
      await apiRequest("PATCH", `/api/kk/${editingKkId}`, {
        ...editForm,
        rt: parseInt(editForm.rt),
        jumlahPenghuni: parseInt(editForm.jumlahPenghuni),
        jenisBansos: editForm.penerimaBansos ? editForm.jenisBansos : null,
        penghasilanBulanan: editForm.penghasilanBulanan || null,
        kategoriEkonomi: editForm.kategoriEkonomi || null,
      });
      if (editSelectedFile && editingKkId) {
        const formData = new FormData();
        formData.append("file", editSelectedFile);
        const uploadRes = await fetch(`/api/upload/kk/${editingKkId}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ message: "Upload gagal" }));
          throw new Error(`KK diupdate, tapi upload foto gagal: ${err.message}`);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "KK berhasil diperbarui" });
      setEditDialogOpen(false);
      setEditingKkId(null);
      clearEditFile();
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const deleteKkMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/kk/${id}`);
    },
    onSuccess: () => {
      toast({ title: "KK berhasil dihapus" });
      setDeleteKk(null);
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    },
    onError: (err: any) => toast({ title: "Gagal menghapus", description: err.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    return kkList?.filter(k => {
      const q = search.toLowerCase();
      const kepala = kepalaByKkId[k.id];
      const members = membersByKkId[k.id] || [];
      const matchSearch = !q
        || k.nomorKk.includes(search)
        || k.alamat.toLowerCase().includes(q)
        || (kepala && kepala.namaLengkap.toLowerCase().includes(q))
        || members.some(w => w.namaLengkap.toLowerCase().includes(q));
      const matchRt = filterRt === "semua" || k.rt === parseInt(filterRt);
      let matchVerif = true;
      if (filterVerifikasi !== "semua") {
        const v = getVerification(k);
        matchVerif = filterVerifikasi === "terverifikasi" ? v.status === "verified" : v.status === "unverified";
      }
      return matchSearch && matchRt && matchVerif;
    }) || [];
  }, [kkList, wargaList, search, filterRt, filterVerifikasi, getVerification, kepalaByKkId, membersByKkId]);

  const verifiedCount = useMemo(() => {
    return kkList?.filter(k => getVerification(k).status === "verified").length || 0;
  }, [kkList, getVerification]);

  const unverifiedCount = useMemo(() => {
    return (kkList?.length || 0) - verifiedCount;
  }, [kkList, verifiedCount]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };
  const handleFilterChange = (val: string) => {
    setFilterRt(val);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-kk-title">Kartu Keluarga</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) clearFile(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" data-testid="button-tambah-kk">
              <Plus className="w-4 h-4" /> Tambah KK
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Kartu Keluarga</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Nomor KK</Label>
                <Input value={form.nomorKk} onChange={e => setForm({...form, nomorKk: e.target.value})} placeholder="16 digit nomor KK" className="h-10" data-testid="input-nomor-kk" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">RT</Label>
                  <Select value={form.rt} onValueChange={v => setForm({...form, rt: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {rtOptions.map(i => <SelectItem key={i} value={i.toString()}>RT {i.toString().padStart(2,"0")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Jumlah Penghuni</Label>
                  <Input type="number" value={form.jumlahPenghuni} onChange={e => setForm({...form, jumlahPenghuni: e.target.value})} className="h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Alamat</Label>
                <Input value={form.alamat} onChange={e => setForm({...form, alamat: e.target.value})} className="h-10" data-testid="input-alamat-kk" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Status Rumah</Label>
                  <Select value={form.statusRumah} onValueChange={v => setForm({...form, statusRumah: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusRumahOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Listrik</Label>
                  <Select value={form.listrik} onValueChange={v => setForm({...form, listrik: v})}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {listrikOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Kondisi Bangunan</Label>
                  <Select value={form.kondisiBangunan} onValueChange={v => setForm({...form, kondisiBangunan: v})} data-testid="select-kondisi-bangunan">
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {kondisiBangunanOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Sumber Air</Label>
                  <Select value={form.sumberAir} onValueChange={v => setForm({...form, sumberAir: v})} data-testid="select-sumber-air">
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sumberAirOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Sanitasi WC</Label>
                  <Select value={form.sanitasiWc} onValueChange={v => setForm({...form, sanitasiWc: v})} data-testid="select-sanitasi-wc">
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sanitasiWcOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex items-end">
                  <div className="flex items-center gap-2 h-10">
                    <Checkbox
                      id="penerimaBansos"
                      checked={form.penerimaBansos}
                      onCheckedChange={(checked) => setForm({...form, penerimaBansos: checked === true})}
                      data-testid="checkbox-penerima-bansos"
                    />
                    <Label htmlFor="penerimaBansos" className="text-sm cursor-pointer">Penerima Bansos</Label>
                  </div>
                </div>
              </div>
              {form.penerimaBansos && (
                <div className="space-y-1">
                  <Label className="text-sm">Jenis Bansos</Label>
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-md border">
                    {jenisBansosOptions.map(jenis => {
                      const selected = form.jenisBansos ? form.jenisBansos.split(", ") : [];
                      const isChecked = selected.includes(jenis);
                      return (
                        <div key={jenis} className="flex items-center gap-2">
                          <Checkbox
                            id={`bansos-${jenis}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              let updated: string[];
                              if (checked) {
                                updated = [...selected, jenis];
                              } else {
                                updated = selected.filter(s => s !== jenis);
                              }
                              setForm({...form, jenisBansos: updated.join(", ")});
                            }}
                            data-testid={`checkbox-bansos-${jenis}`}
                          />
                          <Label htmlFor={`bansos-${jenis}`} className="text-xs cursor-pointer">{jenis}</Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* ===== DATA EKONOMI ===== */}
              <div className="pt-1 pb-0.5 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data Ekonomi Keluarga</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Penghasilan Bulanan</Label>
                  <Select value={form.penghasilanBulanan} onValueChange={v => setForm({...form, penghasilanBulanan: v})}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Pilih range" /></SelectTrigger>
                    <SelectContent>
                      {penghasilanBulananOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Kategori Ekonomi</Label>
                  <Select value={form.kategoriEkonomi} onValueChange={v => setForm({...form, kategoriEkonomi: v})}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {kategoriEkonomiOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 h-9">
                <Checkbox
                  id="layakBansos"
                  checked={form.layakBansos}
                  onCheckedChange={(checked) => setForm({...form, layakBansos: checked === true})}
                />
                <Label htmlFor="layakBansos" className="text-sm cursor-pointer">Layak Bansos (belum menerima)</Label>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Upload Foto KK</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-kk"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-2 rounded-md border p-2">
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-md" data-testid="img-preview-kk" />
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={clearFile} data-testid="button-clear-file-kk">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-kk"
                  >
                    <Upload className="w-4 h-4" /> Pilih File
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground">JPG, PNG, atau PDF. Maks 5MB</p>
              </div>
              <Button className="w-full h-10" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.nomorKk || !form.alamat} data-testid="button-simpan-kk">
                {createMutation.isPending ? "Menyimpan..." : "Simpan KK"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setFilterVerifikasi(filterVerifikasi === "terverifikasi" ? "semua" : "terverifikasi"); setPage(1); }}
          className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${filterVerifikasi === "terverifikasi" ? "bg-green-50 border-green-300 ring-1 ring-green-300" : "bg-card border-border hover:border-green-200"}`}
          data-testid="button-filter-terverifikasi"
        >
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-green-700" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-lg font-bold text-green-700 leading-none" data-testid="text-count-terverifikasi">{verifiedCount}</p>
            <p className="text-[10px] text-muted-foreground">Terverifikasi</p>
          </div>
        </button>
        <button
          onClick={() => { setFilterVerifikasi(filterVerifikasi === "belum" ? "semua" : "belum"); setPage(1); }}
          className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${filterVerifikasi === "belum" ? "bg-amber-50 border-amber-300 ring-1 ring-amber-300" : "bg-card border-border hover:border-amber-200"}`}
          data-testid="button-filter-belum"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-lg font-bold text-amber-700 leading-none" data-testid="text-count-belum">{unverifiedCount}</p>
            <p className="text-[10px] text-muted-foreground">Belum Verifikasi</p>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Cari nama, nomor KK, atau alamat..." className="h-10 pl-9" data-testid="input-search-kk" />
        </div>
        <Select value={filterRt} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-32 h-10" data-testid="select-filter-rt">
            <SelectValue placeholder="Filter RT" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua RT</SelectItem>
            {rtOptions.map(i => <SelectItem key={i} value={i.toString()}>RT {i.toString().padStart(2,"0")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="text-kk-count">
        Menampilkan {paginated.length} dari {filtered.length} KK
        {totalPages > 1 && ` (halaman ${page} dari ${totalPages})`}
        {filterVerifikasi !== "semua" && ` · Filter: ${filterVerifikasi === "terverifikasi" ? "Terverifikasi" : "Belum Verifikasi"}`}
      </p>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {paginated.map(k => {
            const kepala = kepalaByKkId[k.id];
            const members = membersByKkId[k.id] || [];
            const isExpanded = expandedKk === k.id;
            const verification = getVerification(k);
            const isVerified = verification.status === "verified";
            return (
              <Card key={k.id} className={`${isVerified ? "border-green-200" : "border-amber-200"}`} data-testid={`card-kk-${k.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isVerified ? "bg-green-100" : "bg-amber-100"}`}>
                        {isVerified ? (
                          <ShieldCheck className="w-4 h-4 text-green-700" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-amber-700" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium truncate">{k.nomorKk}</p>
                        {kepala && (
                          <p className="text-[11px] font-medium truncate" data-testid={`text-kepala-${k.id}`}>{kepala.namaLengkap}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground truncate">{k.alamat}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                      <Badge variant="secondary" className="text-[10px]">RT {k.rt.toString().padStart(2,"0")}</Badge>
                      <Badge variant="secondary" className="text-[10px] gap-0.5">
                        <Users className="w-3 h-3" />{k.jumlahPenghuni}
                      </Badge>
                      {k.penerimaBansos && <Badge className="bg-green-100 text-green-800 text-[10px]">Bansos</Badge>}
                    </div>
                  </div>

                  {!isVerified && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-[10px] font-medium text-amber-800 mb-1">Belum terverifikasi:</p>
                      <ul className="space-y-0.5">
                        {verification.reasons.map((r, i) => (
                          <li key={i} className="text-[10px] text-amber-700 flex items-start gap-1">
                            <span className="text-amber-400 mt-0.5">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                    <button
                      onClick={() => setExpandedKk(isExpanded ? null : k.id)}
                      className="flex items-center gap-1 flex-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`button-toggle-anggota-${k.id}`}
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      <Users className="w-3 h-3" />
                      Anggota ({members.length})
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {k.fotoKk && (
                        <Button size="icon" variant="ghost" className="w-7 h-7" asChild data-testid={`button-download-kk-${k.id}`}>
                          <a href={k.fotoKk} download target="_blank" rel="noopener noreferrer" title="Download KK">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                      {kepala?.fotoKtp && (
                        <Button size="icon" variant="ghost" className="w-7 h-7" asChild data-testid={`button-download-ktp-kepala-${k.id}`}>
                          <a href={kepala.fotoKtp} download target="_blank" rel="noopener noreferrer" title="Download KTP">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={() => openEditDialog(k)}
                        data-testid={`button-edit-kk-${k.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteKk(k)}
                        data-testid={`button-delete-kk-${k.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      {isVerified && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-green-700"
                          onClick={() => setQrDialogKk(k)}
                          data-testid={`button-qr-${k.id}`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5" data-testid={`list-anggota-${k.id}`}>
                      {members.map(m => {
                        const mWaDupe = m.nomorWhatsapp ? duplicateWaNumbers.has(normalizePhone(m.nomorWhatsapp)) : false;
                        return (
                          <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-2" data-testid={`anggota-${m.id}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[hsl(163,55%,22%)]/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-[hsl(163,55%,22%)]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{m.namaLengkap}</p>
                                <p className="text-[10px] text-muted-foreground">{m.kedudukanKeluarga} · {m.jenisKelamin === "Laki-laki" ? "L" : "P"} · {m.pekerjaan || "-"}</p>
                                {mWaDupe && m.nomorWhatsapp && (
                                  <p className="text-[9px] text-amber-600 font-medium">⚠ Nomor WA duplikat</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {m.fotoKtp && (
                                <Button size="icon" variant="ghost" className="w-6 h-6" asChild data-testid={`button-download-ktp-anggota-${m.id}`}>
                                  <a href={m.fotoKtp} download target="_blank" rel="noopener noreferrer" title="Download KTP">
                                    <Download className="w-3 h-3" />
                                  </a>
                                </Button>
                              )}
                              {m.nomorWhatsapp && (
                                <Button size="icon" variant="ghost" className="w-6 h-6 text-green-700" asChild data-testid={`button-wa-anggota-${m.id}`}>
                                  <a href={`https://wa.me/${m.nomorWhatsapp.replace(/^0/, "62").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                                    <MessageCircle className="w-3 h-3" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
            data-testid="button-prev-kk"
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
            data-testid="button-next-kk"
          >
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {qrDialogKk && (
        <QrDialog
          kk={qrDialogKk}
          kepala={kepalaByKkId[qrDialogKk.id]}
          onClose={() => setQrDialogKk(null)}
        />
      )}

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) clearEditFile(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Kartu Keluarga</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Nomor KK</Label>
              <Input value={editForm.nomorKk} onChange={e => setEditForm({...editForm, nomorKk: e.target.value})} placeholder="16 digit nomor KK" className="h-10" data-testid="input-edit-nomor-kk" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">RT</Label>
                <Select value={editForm.rt} onValueChange={v => setEditForm({...editForm, rt: v})}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rtOptions.map(i => <SelectItem key={i} value={i.toString()}>RT {i.toString().padStart(2,"0")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Jumlah Penghuni</Label>
                <Input type="number" value={editForm.jumlahPenghuni} onChange={e => setEditForm({...editForm, jumlahPenghuni: e.target.value})} className="h-10" data-testid="input-edit-jumlah-penghuni" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Alamat</Label>
              <Input value={editForm.alamat} onChange={e => setEditForm({...editForm, alamat: e.target.value})} className="h-10" data-testid="input-edit-alamat-kk" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Status Rumah</Label>
                <Select value={editForm.statusRumah} onValueChange={v => setEditForm({...editForm, statusRumah: v})}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusRumahOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Listrik</Label>
                <Select value={editForm.listrik} onValueChange={v => setEditForm({...editForm, listrik: v})}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {listrikOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Kondisi Bangunan</Label>
                <Select value={editForm.kondisiBangunan} onValueChange={v => setEditForm({...editForm, kondisiBangunan: v})} data-testid="select-edit-kondisi-bangunan">
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {kondisiBangunanOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Sumber Air</Label>
                <Select value={editForm.sumberAir} onValueChange={v => setEditForm({...editForm, sumberAir: v})} data-testid="select-edit-sumber-air">
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sumberAirOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Sanitasi WC</Label>
                <Select value={editForm.sanitasiWc} onValueChange={v => setEditForm({...editForm, sanitasiWc: v})} data-testid="select-edit-sanitasi-wc">
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sanitasiWcOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex items-end">
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="edit-penerimaBansos"
                    checked={editForm.penerimaBansos}
                    onCheckedChange={(checked) => setEditForm({...editForm, penerimaBansos: checked === true})}
                    data-testid="checkbox-edit-penerima-bansos"
                  />
                  <Label htmlFor="edit-penerimaBansos" className="text-sm cursor-pointer">Penerima Bansos</Label>
                </div>
              </div>
            </div>
            {editForm.penerimaBansos && (
              <div className="space-y-1">
                <Label className="text-sm">Jenis Bansos</Label>
                <div className="grid grid-cols-2 gap-2 p-2 rounded-md border">
                  {jenisBansosOptions.map(jenis => {
                    const selected = editForm.jenisBansos ? editForm.jenisBansos.split(", ") : [];
                    const isChecked = selected.includes(jenis);
                    return (
                      <div key={jenis} className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-bansos-${jenis}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            let updated: string[];
                            if (checked) {
                              updated = [...selected, jenis];
                            } else {
                              updated = selected.filter(s => s !== jenis);
                            }
                            setEditForm({...editForm, jenisBansos: updated.join(", ")});
                          }}
                          data-testid={`checkbox-edit-bansos-${jenis}`}
                        />
                        <Label htmlFor={`edit-bansos-${jenis}`} className="text-xs cursor-pointer">{jenis}</Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* ===== DATA EKONOMI ===== */}
            <div className="pt-1 pb-0.5 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data Ekonomi Keluarga</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Penghasilan Bulanan</Label>
                <Select value={editForm.penghasilanBulanan} onValueChange={v => setEditForm({...editForm, penghasilanBulanan: v})}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Pilih range" /></SelectTrigger>
                  <SelectContent>
                    {penghasilanBulananOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Kategori Ekonomi</Label>
                <Select value={editForm.kategoriEkonomi} onValueChange={v => setEditForm({...editForm, kategoriEkonomi: v})}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {kategoriEkonomiOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 h-9">
              <Checkbox
                id="editLayakBansos"
                checked={editForm.layakBansos}
                onCheckedChange={(checked) => setEditForm({...editForm, layakBansos: checked === true})}
              />
              <Label htmlFor="editLayakBansos" className="text-sm cursor-pointer">Layak Bansos (belum menerima)</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Upload Foto KK</Label>
              <input
                ref={editFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleEditFileSelect}
                className="hidden"
                data-testid="input-edit-file-kk"
              />
              {editSelectedFile ? (
                <div className="flex items-center gap-2 rounded-md border p-2">
                  {editFilePreview ? (
                    <img src={editFilePreview} alt="Preview" className="w-16 h-16 object-cover rounded-md" data-testid="img-edit-preview-kk" />
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{editSelectedFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(editSelectedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={clearEditFile} data-testid="button-edit-clear-file-kk">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={() => editFileInputRef.current?.click()}
                  data-testid="button-edit-upload-kk"
                >
                  <Upload className="w-4 h-4" /> Pilih File
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground">JPG, PNG, atau PDF. Maks 5MB</p>
            </div>
            <Button className="w-full h-10" onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editForm.nomorKk || !editForm.alamat} data-testid="button-simpan-edit-kk">
              {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteKk} onOpenChange={(open) => { if (!open) setDeleteKk(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Hapus Kartu Keluarga?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <span className="block">KK <strong>{deleteKk?.nomorKk}</strong> akan dihapus beserta:</span>
              <span className="block text-red-600 font-medium">
                • Semua anggota keluarga ({deleteKk ? (membersByKkId[deleteKk.id]?.length || 0) : 0} orang)<br/>
                • Semua laporan warga terkait<br/>
                • Semua surat warga terkait<br/>
                • Semua donasi terkait<br/>
                • Semua pengajuan bansos terkait
              </span>
              <span className="block font-semibold text-red-700">Tindakan ini tidak dapat dibatalkan!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-kk">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteKk && deleteKkMutation.mutate(deleteKk.id)}
              disabled={deleteKkMutation.isPending}
              data-testid="button-confirm-delete-kk"
            >
              {deleteKkMutation.isPending ? "Menghapus..." : "Hapus KK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function QrDialog({ kk, kepala, onClose }: { kk: KartuKeluarga; kepala?: Warga; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrUrl = `https://rw3padasukacimahi.org`;
  const generated = useRef(false);

  if (!generated.current) {
    generated.current = true;
    QRCode.toDataURL(qrUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#1a5c45", light: "#ffffff" },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `QR-RW03-${kk.nomorKk}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code Keluarga Terverifikasi</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="bg-white p-4 rounded-xl border-2 border-green-200 shadow-sm">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-[200px] h-[200px]" data-testid="img-qr-code" />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground animate-pulse" />
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-[hsl(163,55%,22%)]">KELUARGA TERVERIFIKASI</p>
            <p className="text-sm font-bold">{kepala?.namaLengkap || "-"}</p>
            <p className="text-xs text-muted-foreground font-mono">{kk.nomorKk}</p>
            <p className="text-[11px] text-muted-foreground">RT {kk.rt.toString().padStart(2, "0")} · {kk.alamat}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-center w-full">
            <p className="text-[10px] text-green-700">
              Scan QR ini untuk mengakses layanan digital RW 03 Padasuka
            </p>
            <p className="text-[11px] font-medium text-green-800 mt-0.5">rw3padasukacimahi.org</p>
          </div>

          <Button
            className="w-full gap-2"
            onClick={downloadQr}
            disabled={!qrDataUrl}
            data-testid="button-download-qr"
          >
            <Download className="w-4 h-4" />
            Download QR untuk Stiker
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}