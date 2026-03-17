import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Check, X, User, MapPin, Clock, Upload, RefreshCw, ChevronDown, ChevronUp, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { KartuKeluarga, Warga, ProfileEditRequest } from "@shared/schema";
import { pekerjaanOptions, pendidikanOptions, agamaOptions, jenisKelaminOptions, statusPerkawinanOptions, kedudukanKeluargaOptions, statusKependudukanOptions, statusDisabilitasOptions, kondisiKesehatanOptions } from "@/lib/constants";
import { useProfileCompleteness } from "@/lib/useProfileCompleteness";
import { Checkbox } from "@/components/ui/checkbox";

const fieldLabels: Record<string, string> = {
  namaLengkap: "Nama Lengkap",
  nik: "NIK",
  nomorWhatsapp: "No. WhatsApp",
  jenisKelamin: "Jenis Kelamin",
  statusPerkawinan: "Status Kawin",
  agama: "Agama",
  kedudukanKeluarga: "Kedudukan",
  tanggalLahir: "Tanggal Lahir",
  pekerjaan: "Pekerjaan",
  pendidikan: "Pendidikan",
  statusKependudukan: "Status",
  kondisiKesehatan: "Kondisi Kesehatan",
  statusDisabilitas: "Status Disabilitas",
  ibuHamil: "Status Kehamilan",
};

function maskNik(nik: string | null): string {
  if (!nik || nik.length < 6) return "••••••••••••••••";
  return nik.slice(0, 4) + "••••••••" + nik.slice(-4);
}

function maskKk(nomorKk: string | null | undefined): string {
  if (!nomorKk || nomorKk.length < 6) return "••••••••••••••••";
  return nomorKk.slice(0, 4) + "••••••••" + nomorKk.slice(-4);
}

export default function WargaProfil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [uploadingKk, setUploadingKk] = useState(false);
  const [uploadingKtpId, setUploadingKtpId] = useState<number | null>(null);
  const [showDokumen, setShowDokumen] = useState(false);
  const kkFileRef = useRef<HTMLInputElement>(null);
  const ktpFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data: kk, isLoading: kkLoading } = useQuery<KartuKeluarga>({
    queryKey: ["/api/kk", user?.kkId],
    enabled: !!user?.kkId,
  });

  const { data: anggota, isLoading: wargaLoading } = useQuery<Warga[]>({
    queryKey: ["/api/warga/kk", user?.kkId],
    enabled: !!user?.kkId,
  });

  const { data: editRequests } = useQuery<ProfileEditRequest[]>({
    queryKey: ["/api/profile-edits"],
  });

  const completeness = useProfileCompleteness(anggota, kk);

  const submitEdit = useMutation({
    mutationFn: async (data: { wargaId: number; kkId: number; changes: Record<string, string> }) => {
      await apiRequest("POST", "/api/profile-edits", {
        wargaId: data.wargaId,
        kkId: data.kkId,
        fieldChanges: data.changes,
      });
    },
    onSuccess: () => {
      toast({ title: "Perubahan diajukan", description: "Menunggu persetujuan admin" });
      setEditingId(null);
      setEditData({});
      queryClient.invalidateQueries({ queryKey: ["/api/profile-edits"] });
    },
    onError: (err: any) => {
      const msg = err.message.includes(":") ? err.message.split(":").slice(1).join(":").trim() : err.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Gagal mengajukan", description: parsed, variant: "destructive" });
    },
  });

  if (kkLoading || wargaLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const handleEdit = (w: Warga) => {
    setEditingId(w.id);
    setEditData({
      namaLengkap: w.namaLengkap || "",
      nik: w.nik || "",
      nomorWhatsapp: w.nomorWhatsapp || "",
      jenisKelamin: w.jenisKelamin || "",
      statusPerkawinan: w.statusPerkawinan || "",
      agama: w.agama || "",
      kedudukanKeluarga: w.kedudukanKeluarga || "",
      tanggalLahir: w.tanggalLahir || "",
      pekerjaan: w.pekerjaan || "",
      pendidikan: w.pendidikan || "",
      statusKependudukan: w.statusKependudukan || "",
      kondisiKesehatan: w.kondisiKesehatan || "Sehat",
      statusDisabilitas: w.statusDisabilitas || "Tidak Ada",
      ibuHamil: w.ibuHamil ? "true" : "false",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = (w: Warga) => {
    const changes: Record<string, string> = {};
    if (editData.namaLengkap !== (w.namaLengkap || "")) changes.namaLengkap = editData.namaLengkap;
    if (editData.nomorWhatsapp !== (w.nomorWhatsapp || "")) changes.nomorWhatsapp = editData.nomorWhatsapp;
    if (editData.jenisKelamin !== (w.jenisKelamin || "")) changes.jenisKelamin = editData.jenisKelamin;
    if (editData.statusPerkawinan !== (w.statusPerkawinan || "")) changes.statusPerkawinan = editData.statusPerkawinan;
    if (editData.agama !== (w.agama || "")) changes.agama = editData.agama;
    if (editData.kedudukanKeluarga !== (w.kedudukanKeluarga || "")) changes.kedudukanKeluarga = editData.kedudukanKeluarga;
    if (editData.tanggalLahir !== (w.tanggalLahir || "")) changes.tanggalLahir = editData.tanggalLahir;
    if (editData.pekerjaan !== (w.pekerjaan || "")) changes.pekerjaan = editData.pekerjaan;
    if (editData.pendidikan !== (w.pendidikan || "")) changes.pendidikan = editData.pendidikan;
    if (editData.statusKependudukan !== (w.statusKependudukan || "")) changes.statusKependudukan = editData.statusKependudukan;
    if (editData.kondisiKesehatan !== (w.kondisiKesehatan || "Sehat")) changes.kondisiKesehatan = editData.kondisiKesehatan;
    if (editData.statusDisabilitas !== (w.statusDisabilitas || "Tidak Ada")) changes.statusDisabilitas = editData.statusDisabilitas;
    const ibuHamilStr = w.ibuHamil ? "true" : "false";
    if (editData.ibuHamil !== ibuHamilStr) changes.ibuHamil = editData.ibuHamil;

    if (Object.keys(changes).length === 0) {
      toast({ title: "Tidak ada perubahan" });
      setEditingId(null);
      return;
    }

    submitEdit.mutate({ wargaId: w.id, kkId: w.kkId, changes });
  };

  const setField = (key: string, value: string) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  const getPendingEdit = (wargaId: number) => {
    return editRequests?.find(e => e.wargaId === wargaId && e.status === "pending");
  };

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") return "Hanya file PDF yang diterima untuk KK dan KTP.";
    if (file.size > 2 * 1024 * 1024) return "File terlalu besar. Maksimal 2MB. Kompres PDF terlebih dahulu.";
    return null;
  };

  const handleUploadKk = async (file: File) => {
    if (!kk) return;
    const err = validateFile(file);
    if (err) {
      toast({ title: "File tidak valid", description: err, variant: "destructive" });
      if (kkFileRef.current) kkFileRef.current.value = "";
      return;
    }
    setUploadingKk(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/upload/kk/${kk.id}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload gagal" }));
        throw new Error(err.message);
      }
      toast({ title: "Berhasil", description: "Foto KK berhasil diunggah" });
      queryClient.invalidateQueries({ queryKey: ["/api/kk", user?.kkId] });
    } catch (err: any) {
      toast({ title: "Gagal mengunggah", description: err.message, variant: "destructive" });
    } finally {
      setUploadingKk(false);
      if (kkFileRef.current) kkFileRef.current.value = "";
    }
  };

  const handleUploadKtp = async (wargaId: number, file: File) => {
    const err = validateFile(file);
    if (err) {
      toast({ title: "File tidak valid", description: err, variant: "destructive" });
      const input = ktpFileRefs.current[wargaId];
      if (input) input.value = "";
      return;
    }
    setUploadingKtpId(wargaId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/upload/ktp/${wargaId}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload gagal" }));
        throw new Error(err.message);
      }
      toast({ title: "Berhasil", description: "Foto KTP berhasil diunggah" });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/kk", user?.kkId] });
    } catch (err: any) {
      toast({ title: "Gagal mengunggah", description: err.message, variant: "destructive" });
    } finally {
      setUploadingKtpId(null);
      const input = ktpFileRefs.current[wargaId];
      if (input) input.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-profil-title">Profil Keluarga</h2>

      <Card className="bg-gradient-to-r from-[hsl(163,55%,22%)] to-[hsl(163,45%,28%)] text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[hsl(40,45%,65%)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug" data-testid="text-alamat">{kk?.alamat}</p>
              <p className="text-xs text-white/60 mt-0.5">RT {kk?.rt?.toString().padStart(2, "0")} / RW 03</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="bg-white/15 px-2 py-0.5 rounded" data-testid="text-rt">{kk?.statusRumah}</span>
            <span className="bg-white/15 px-2 py-0.5 rounded">{kk?.jumlahPenghuni} penghuni</span>
            <span className="bg-white/15 px-2 py-0.5 rounded flex items-center gap-1">
              <Shield className="w-3 h-3" />
              KK {maskKk(kk?.nomorKk)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Progress Kelengkapan Profil */}
      {anggota && kk && (
        <Card className={completeness.isComplete ? "border-green-200 bg-green-50/50 dark:bg-green-950/10" : "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {completeness.isComplete
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <AlertTriangle className="w-4 h-4 text-amber-600" />
                }
                <span className="text-sm font-semibold">
                  {completeness.isComplete ? "Profil Lengkap" : "Profil Belum Lengkap"}
                </span>
              </div>
              <span className={`text-sm font-bold ${completeness.isComplete ? "text-green-600" : "text-amber-600"}`}>
                {completeness.completionPercent}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${completeness.isComplete ? "bg-green-500" : "bg-amber-500"}`}
                style={{ width: `${completeness.completionPercent}%` }}
              />
            </div>
            {!completeness.isComplete && (
              <div className="space-y-1 mt-2">
                <p className="text-xs text-muted-foreground font-medium">Perlu dilengkapi:</p>
                {completeness.missingFields.slice(0, 4).map((f, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                    {f.label}{f.wargaNama ? ` — ${f.wargaNama}` : ""}
                  </p>
                ))}
                {completeness.missingFields.length > 4 && (
                  <p className="text-xs text-amber-600">+{completeness.missingFields.length - 4} lainnya</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Tekan Edit pada kartu anggota untuk melengkapi.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <h3 className="text-sm font-semibold text-muted-foreground">
        Anggota Keluarga ({anggota?.length || 0})
      </h3>

      {anggota?.map((w) => {
        const pendingEdit = getPendingEdit(w.id);
        const isEditing = editingId === w.id;

        return (
          <Card key={w.id} data-testid={`card-warga-${w.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" data-testid={`text-nama-${w.id}`}>{w.namaLengkap}</p>
                    <p className="text-[11px] text-muted-foreground">{w.kedudukanKeluarga}</p>
                  </div>
                </div>
                {!isEditing && !pendingEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(w)}
                    className="flex-shrink-0 text-xs gap-1"
                    data-testid={`button-edit-${w.id}`}
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(w)}
                      disabled={submitEdit.isPending}
                      className="text-xs gap-1"
                      data-testid={`button-save-${w.id}`}
                    >
                      <Check className="w-3 h-3" />
                      Simpan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      className="text-xs"
                      data-testid={`button-cancel-${w.id}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                {pendingEdit && (
                  <Badge variant="secondary" className="text-[10px] flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    Menunggu
                  </Badge>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nama Lengkap</Label>
                    <Input
                      value={editData.namaLengkap}
                      onChange={(e) => setField("namaLengkap", e.target.value)}
                      className="h-10 text-sm"
                      data-testid={`input-nama-${w.id}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">NIK</Label>
                    <p className="text-sm font-mono text-muted-foreground px-3 py-2 bg-muted rounded-md">{maskNik(w.nik)}</p>
                    <p className="text-[10px] text-muted-foreground">Hubungi admin untuk perubahan NIK</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">No. WhatsApp</Label>
                    <Input
                      value={editData.nomorWhatsapp}
                      onChange={(e) => setField("nomorWhatsapp", e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="h-10 text-sm"
                      data-testid={`input-wa-${w.id}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Jenis Kelamin</Label>
                      <Select value={editData.jenisKelamin} onValueChange={(v) => setField("jenisKelamin", v)}>
                        <SelectTrigger className="h-10 text-sm" data-testid={`select-jk-${w.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {jenisKelaminOptions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Agama</Label>
                      <Select value={editData.agama} onValueChange={(v) => setField("agama", v)}>
                        <SelectTrigger className="h-10 text-sm" data-testid={`select-agama-${w.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {agamaOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Status Kawin</Label>
                      <Select value={editData.statusPerkawinan} onValueChange={(v) => setField("statusPerkawinan", v)}>
                        <SelectTrigger className="h-10 text-sm" data-testid={`select-kawin-${w.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusPerkawinanOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Kedudukan</Label>
                      <Select value={editData.kedudukanKeluarga} onValueChange={(v) => setField("kedudukanKeluarga", v)}>
                        <SelectTrigger className="h-10 text-sm" data-testid={`select-kedudukan-${w.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {kedudukanKeluargaOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Tanggal Lahir</Label>
                      <Input
                        type="date"
                        value={editData.tanggalLahir}
                        onChange={(e) => setField("tanggalLahir", e.target.value)}
                        className="h-10 text-sm"
                        data-testid={`input-tgl-lahir-${w.id}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Status</Label>
                      <Select value={editData.statusKependudukan} onValueChange={(v) => setField("statusKependudukan", v)}>
                        <SelectTrigger className="h-10 text-sm" data-testid={`select-status-${w.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusKependudukanOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Pekerjaan</Label>
                    <Select value={editData.pekerjaan} onValueChange={(v) => setField("pekerjaan", v)}>
                      <SelectTrigger className="h-10 text-sm" data-testid={`select-pekerjaan-${w.id}`}>
                        <SelectValue placeholder="Pilih pekerjaan" />
                      </SelectTrigger>
                      <SelectContent>
                        {pekerjaanOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Pendidikan</Label>
                    <Select value={editData.pendidikan} onValueChange={(v) => setField("pendidikan", v)}>
                      <SelectTrigger className="h-10 text-sm" data-testid={`select-pendidikan-${w.id}`}>
                        <SelectValue placeholder="Pilih pendidikan" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendidikanOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                {/* ===== Data Kesehatan ===== */}
                <div className="pt-1 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Kesehatan & Kondisi Khusus</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Kondisi Kesehatan</Label>
                    <Select value={editData.kondisiKesehatan} onValueChange={(v) => setField("kondisiKesehatan", v)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {kondisiKesehatanOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Status Disabilitas</Label>
                    <Select value={editData.statusDisabilitas} onValueChange={(v) => setField("statusDisabilitas", v)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusDisabilitasOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(editData.jenisKelamin === "Perempuan") && (
                  <div className="flex items-center gap-2 h-9">
                    <Checkbox
                      id={`ibu-hamil-${w.id}`}
                      checked={editData.ibuHamil === "true"}
                      onCheckedChange={(checked) => setField("ibuHamil", checked ? "true" : "false")}
                    />
                    <Label htmlFor={`ibu-hamil-${w.id}`} className="text-xs cursor-pointer">Sedang Hamil</Label>
                  </div>
                )}
              </div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 flex-shrink-0">NIK</span>
                    <span className="font-medium font-mono tracking-wide">{maskNik(w.nik)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 flex-shrink-0">WhatsApp</span>
                    <span className="font-medium">{w.nomorWhatsapp || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 flex-shrink-0">Kelamin</span>
                    <span className="font-medium">{w.jenisKelamin}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 flex-shrink-0">Agama</span>
                    <span className="font-medium">{w.agama}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 flex-shrink-0">Pekerjaan</span>
                    <span className="font-medium">{w.pekerjaan || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 flex-shrink-0">Pendidikan</span>
                    <span className="font-medium">{w.pendidikan || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 flex-shrink-0">Status</span>
                    <Badge variant={w.statusKependudukan === "Aktif" ? "default" : "secondary"} className="text-[10px]">
                      {w.statusKependudukan}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 flex-shrink-0">Kesehatan</span>
                    <span className="font-medium">{w.kondisiKesehatan || "-"}</span>
                  </div>
                  {(w.statusDisabilitas && w.statusDisabilitas !== "Tidak Ada") && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 flex-shrink-0">Disabilitas</span>
                      <span className="font-medium">{w.statusDisabilitas}</span>
                    </div>
                  )}
                  {w.ibuHamil && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 flex-shrink-0">Kondisi</span>
                      <Badge className="text-[10px] bg-pink-100 text-pink-700 border-pink-200">Ibu Hamil</Badge>
                    </div>
                  )}
                </div>
              )}

              {pendingEdit && (
                <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Perubahan menunggu persetujuan:</p>
                  <div className="text-xs text-amber-600 dark:text-amber-500 mt-1 space-y-0.5">
                    {Object.entries(pendingEdit.fieldChanges as Record<string, string>).map(([key, val]) => (
                      <p key={key}>
                        {fieldLabels[key] || key}: <span className="font-medium">{key === "nik" ? maskNik(val) : val}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card data-testid="card-dokumen">
        <CardContent className="p-0">
          <button
            onClick={() => setShowDokumen(!showDokumen)}
            className="w-full flex items-center justify-between p-4 text-left"
            data-testid="button-toggle-dokumen"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Upload Dokumen</span>
            </div>
            {showDokumen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showDokumen && (
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              <p className="text-[11px] text-muted-foreground">Dokumen hanya digunakan untuk verifikasi oleh admin dan tidak ditampilkan secara publik.</p>

              <div className="space-y-2">
                <p className="text-xs font-medium">Kartu Keluarga (KK)</p>
                <div className="flex items-center gap-3">
                  <Badge variant={kk?.fotoKk ? "default" : "secondary"} className="text-[10px]">
                    {kk?.fotoKk ? "Sudah diunggah" : "Belum diunggah"}
                  </Badge>
                  <input
                    ref={kkFileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadKk(f);
                    }}
                    data-testid="input-file-kk"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 h-7"
                    disabled={uploadingKk}
                    onClick={() => kkFileRef.current?.click()}
                    data-testid="button-upload-kk"
                  >
                    {uploadingKk ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {kk?.fotoKk ? "Ganti" : "Upload"}
                  </Button>
                </div>
              </div>

              {anggota?.map((w) => (
                <div key={w.id} className="space-y-2">
                  <p className="text-xs font-medium">KTP — {w.namaLengkap}</p>
                  <div className="flex items-center gap-3">
                    <Badge variant={w.fotoKtp ? "default" : "secondary"} className="text-[10px]">
                      {w.fotoKtp ? "Sudah diunggah" : "Belum diunggah"}
                    </Badge>
                    <input
                      ref={(el) => { ktpFileRefs.current[w.id] = el; }}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadKtp(w.id, f);
                      }}
                      data-testid={`input-file-ktp-${w.id}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 h-7"
                      disabled={uploadingKtpId === w.id}
                      onClick={() => ktpFileRefs.current[w.id]?.click()}
                      data-testid={`button-upload-ktp-${w.id}`}
                    >
                      {uploadingKtpId === w.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {w.fotoKtp ? "Ganti" : "Upload"}
                    </Button>
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
