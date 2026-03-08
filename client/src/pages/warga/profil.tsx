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
import { Edit2, Check, X, User, MapPin, Clock, Upload, FileImage, RefreshCw } from "lucide-react";
import type { KartuKeluarga, Warga, ProfileEditRequest } from "@shared/schema";
import { pekerjaanOptions, agamaOptions, jenisKelaminOptions, statusPerkawinanOptions, kedudukanKeluargaOptions, statusKependudukanOptions } from "@/lib/constants";

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
  statusKependudukan: "Status",
};

export default function WargaProfil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [uploadingKk, setUploadingKk] = useState(false);
  const [uploadingKtpId, setUploadingKtpId] = useState<number | null>(null);
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
      statusKependudukan: w.statusKependudukan || "",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = (w: Warga) => {
    const changes: Record<string, string> = {};
    if (editData.namaLengkap !== (w.namaLengkap || "")) changes.namaLengkap = editData.namaLengkap;
    if (editData.nik !== (w.nik || "")) changes.nik = editData.nik;
    if (editData.nomorWhatsapp !== (w.nomorWhatsapp || "")) changes.nomorWhatsapp = editData.nomorWhatsapp;
    if (editData.jenisKelamin !== (w.jenisKelamin || "")) changes.jenisKelamin = editData.jenisKelamin;
    if (editData.statusPerkawinan !== (w.statusPerkawinan || "")) changes.statusPerkawinan = editData.statusPerkawinan;
    if (editData.agama !== (w.agama || "")) changes.agama = editData.agama;
    if (editData.kedudukanKeluarga !== (w.kedudukanKeluarga || "")) changes.kedudukanKeluarga = editData.kedudukanKeluarga;
    if (editData.tanggalLahir !== (w.tanggalLahir || "")) changes.tanggalLahir = editData.tanggalLahir;
    if (editData.pekerjaan !== (w.pekerjaan || "")) changes.pekerjaan = editData.pekerjaan;
    if (editData.statusKependudukan !== (w.statusKependudukan || "")) changes.statusKependudukan = editData.statusKependudukan;

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
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) return "Format tidak didukung. Gunakan JPG, PNG, atau PDF.";
    if (file.size > 5 * 1024 * 1024) return "File terlalu besar. Maksimal 5MB.";
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
      <h2 className="text-lg font-bold" data-testid="text-profil-title">Data Keluarga</h2>

      <Card className="bg-gradient-to-r from-[hsl(163,55%,22%)] to-[hsl(163,45%,28%)] text-white border-0">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs text-white/60">No. KK: {kk?.nomorKk}</p>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[hsl(40,45%,65%)]" />
            <p className="text-sm" data-testid="text-alamat">{kk?.alamat}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-white/15 px-2 py-0.5 rounded" data-testid="text-rt">RT {kk?.rt?.toString().padStart(2, "0")} / RW 03</span>
            <span className="bg-white/15 px-2 py-0.5 rounded">{kk?.statusRumah}</span>
            <span className="bg-white/15 px-2 py-0.5 rounded">{kk?.jumlahPenghuni} penghuni</span>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-upload-kk">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Dokumen Kartu Keluarga</p>
          </div>
          {kk?.fotoKk ? (
            <div className="space-y-2">
              <div className="relative rounded-md overflow-hidden border">
                <img
                  src={kk.fotoKk}
                  alt="Foto KK"
                  className="w-full max-h-48 object-contain bg-muted"
                  data-testid="img-foto-kk"
                />
              </div>
              <input
                ref={kkFileRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
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
                className="text-xs gap-1"
                disabled={uploadingKk}
                onClick={() => kkFileRef.current?.click()}
                data-testid="button-ganti-kk"
              >
                {uploadingKk ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Ganti
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Belum ada dokumen KK yang diunggah.</p>
              <input
                ref={kkFileRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
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
                className="text-xs gap-1"
                disabled={uploadingKk}
                onClick={() => kkFileRef.current?.click()}
                data-testid="button-upload-kk"
              >
                {uploadingKk ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Upload Foto KK
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <h3 className="text-sm font-semibold text-muted-foreground">
        Anggota Keluarga ({anggota?.length || 0})
      </h3>

      {anggota?.map((w) => {
        const pendingEdit = getPendingEdit(w.id);
        const isEditing = editingId === w.id;

        return (
          <Card key={w.id} data-testid={`card-warga-${w.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" data-testid={`text-nama-${w.id}`}>{w.namaLengkap}</p>
                    <p className="text-xs text-muted-foreground">{w.kedudukanKeluarga}</p>
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
                    <Input
                      value={editData.nik}
                      onChange={(e) => setField("nik", e.target.value)}
                      className="h-10 text-sm"
                      data-testid={`input-nik-${w.id}`}
                    />
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
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">NIK</span>
                    <p className="font-medium">{w.nik}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">No. WhatsApp</span>
                    <p className="font-medium">{w.nomorWhatsapp || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Jenis Kelamin</span>
                    <p className="font-medium">{w.jenisKelamin}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Agama</span>
                    <p className="font-medium">{w.agama}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tanggal Lahir</span>
                    <p className="font-medium">{w.tanggalLahir || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pekerjaan</span>
                    <p className="font-medium">{w.pekerjaan || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status Kawin</span>
                    <p className="font-medium">{w.statusPerkawinan}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={w.statusKependudukan === "Aktif" ? "default" : "secondary"} className="text-[10px]">
                      {w.statusKependudukan}
                    </Badge>
                  </div>
                </div>
              )}

              {pendingEdit && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Perubahan menunggu persetujuan admin:</p>
                  <div className="text-xs text-amber-600 dark:text-amber-500 mt-1 space-y-0.5">
                    {Object.entries(pendingEdit.fieldChanges as Record<string, string>).map(([key, val]) => (
                      <p key={key}>
                        {fieldLabels[key] || key}: <span className="font-medium">{val}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="flex items-center gap-2">
                  <FileImage className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">Dokumen KTP</p>
                </div>
                {w.fotoKtp ? (
                  <div className="space-y-2">
                    <div className="relative rounded-md overflow-hidden border">
                      <img
                        src={w.fotoKtp}
                        alt={`KTP ${w.namaLengkap}`}
                        className="w-full max-h-36 object-contain bg-muted"
                        data-testid={`img-foto-ktp-${w.id}`}
                      />
                    </div>
                    <input
                      ref={(el) => { ktpFileRefs.current[w.id] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
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
                      className="text-xs gap-1"
                      disabled={uploadingKtpId === w.id}
                      onClick={() => ktpFileRefs.current[w.id]?.click()}
                      data-testid={`button-ganti-ktp-${w.id}`}
                    >
                      {uploadingKtpId === w.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Ganti
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Belum ada dokumen KTP.</p>
                    <input
                      ref={(el) => { ktpFileRefs.current[w.id] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
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
                      className="text-xs gap-1"
                      disabled={uploadingKtpId === w.id}
                      onClick={() => ktpFileRefs.current[w.id]?.click()}
                      data-testid={`button-upload-ktp-${w.id}`}
                    >
                      {uploadingKtpId === w.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      Upload Foto KTP
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
