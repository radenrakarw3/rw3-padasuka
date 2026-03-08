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
import { useToast } from "@/hooks/use-toast";
import { Edit2, Check, X, User, MapPin, Phone, Briefcase, Clock } from "lucide-react";
import type { KartuKeluarga, Warga, ProfileEditRequest } from "@shared/schema";

export default function WargaProfil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editWa, setEditWa] = useState("");
  const [editPekerjaan, setEditPekerjaan] = useState("");

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
    setEditWa(w.nomorWhatsapp || "");
    setEditPekerjaan(w.pekerjaan || "");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditWa("");
    setEditPekerjaan("");
  };

  const handleSaveEdit = (w: Warga) => {
    const changes: Record<string, string> = {};
    if (editWa !== (w.nomorWhatsapp || "")) changes.nomorWhatsapp = editWa;
    if (editPekerjaan !== (w.pekerjaan || "")) changes.pekerjaan = editPekerjaan;

    if (Object.keys(changes).length === 0) {
      toast({ title: "Tidak ada perubahan" });
      setEditingId(null);
      return;
    }

    submitEdit.mutate({ wargaId: w.id, kkId: w.kkId, changes });
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

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">NIK</span>
                  <p className="font-medium">{w.nik}</p>
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
                  <span className="text-muted-foreground">Status Kawin</span>
                  <p className="font-medium">{w.statusPerkawinan}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={w.statusKependudukan === "Aktif" ? "default" : "secondary"} className="text-[10px]">
                    {w.statusKependudukan}
                  </Badge>
                </div>

                {isEditing ? (
                  <>
                    <div className="col-span-2 space-y-1.5 pt-2 border-t">
                      <Label className="text-xs flex items-center gap-1 font-medium">
                        <Phone className="w-3 h-3" /> No. WhatsApp
                      </Label>
                      <Input
                        value={editWa}
                        onChange={(e) => setEditWa(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="h-10 text-sm"
                        data-testid={`input-wa-${w.id}`}
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs flex items-center gap-1 font-medium">
                        <Briefcase className="w-3 h-3" /> Pekerjaan
                      </Label>
                      <Input
                        value={editPekerjaan}
                        onChange={(e) => setEditPekerjaan(e.target.value)}
                        placeholder="Masukkan pekerjaan"
                        className="h-10 text-sm"
                        data-testid={`input-pekerjaan-${w.id}`}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> WhatsApp</span>
                      <p className="font-medium">{w.nomorWhatsapp || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" /> Pekerjaan</span>
                      <p className="font-medium">{w.pekerjaan || "-"}</p>
                    </div>
                  </>
                )}
              </div>

              {pendingEdit && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Perubahan menunggu persetujuan:</p>
                  <div className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    {Object.entries(pendingEdit.fieldChanges as Record<string, string>).map(([key, val]) => (
                      <p key={key}>
                        {key === "nomorWhatsapp" ? "No. WhatsApp" : key === "pekerjaan" ? "Pekerjaan" : key}: <span className="font-medium">{val}</span>
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
