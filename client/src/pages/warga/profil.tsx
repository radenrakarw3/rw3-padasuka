import { useState } from "react";
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
import { Edit2, Check, X, User, MapPin, Clock } from "lucide-react";
import type { KartuKeluarga, Warga, ProfileEditRequest } from "@shared/schema";

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
                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                          <SelectItem value="Perempuan">Perempuan</SelectItem>
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
                          <SelectItem value="Islam">Islam</SelectItem>
                          <SelectItem value="Kristen">Kristen</SelectItem>
                          <SelectItem value="Katolik">Katolik</SelectItem>
                          <SelectItem value="Hindu">Hindu</SelectItem>
                          <SelectItem value="Buddha">Buddha</SelectItem>
                          <SelectItem value="Konghucu">Konghucu</SelectItem>
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
                          <SelectItem value="Belum Kawin">Belum Kawin</SelectItem>
                          <SelectItem value="Kawin">Kawin</SelectItem>
                          <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
                          <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
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
                          <SelectItem value="Kepala Keluarga">Kepala Keluarga</SelectItem>
                          <SelectItem value="Istri">Istri</SelectItem>
                          <SelectItem value="Anak">Anak</SelectItem>
                          <SelectItem value="Menantu">Menantu</SelectItem>
                          <SelectItem value="Cucu">Cucu</SelectItem>
                          <SelectItem value="Orang Tua">Orang Tua</SelectItem>
                          <SelectItem value="Famili Lain">Famili Lain</SelectItem>
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
                          <SelectItem value="Aktif">Aktif</SelectItem>
                          <SelectItem value="Pindah">Pindah</SelectItem>
                          <SelectItem value="Meninggal">Meninggal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Pekerjaan</Label>
                    <Input
                      value={editData.pekerjaan}
                      onChange={(e) => setField("pekerjaan", e.target.value)}
                      placeholder="Masukkan pekerjaan"
                      className="h-10 text-sm"
                      data-testid={`input-pekerjaan-${w.id}`}
                    />
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
