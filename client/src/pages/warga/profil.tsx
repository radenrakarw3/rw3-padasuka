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
import { Edit2, Check, X, User, MapPin, Phone, Briefcase } from "lucide-react";
import type { KartuKeluarga, Warga } from "@shared/schema";

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
      toast({ title: "Gagal mengajukan", description: err.message, variant: "destructive" });
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
      nomorWhatsapp: w.nomorWhatsapp || "",
      pekerjaan: w.pekerjaan || "",
      statusPerkawinan: w.statusPerkawinan,
    });
  };

  const handleSaveEdit = (w: Warga) => {
    const changes: Record<string, string> = {};
    if (editData.nomorWhatsapp !== (w.nomorWhatsapp || "")) changes.nomorWhatsapp = editData.nomorWhatsapp;
    if (editData.pekerjaan !== (w.pekerjaan || "")) changes.pekerjaan = editData.pekerjaan;
    if (editData.statusPerkawinan !== w.statusPerkawinan) changes.statusPerkawinan = editData.statusPerkawinan;

    if (Object.keys(changes).length === 0) {
      toast({ title: "Tidak ada perubahan" });
      setEditingId(null);
      return;
    }

    submitEdit.mutate({ wargaId: w.id, kkId: w.kkId, changes });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" data-testid="text-profil-title">Data Keluarga</h2>

      <Card className="bg-gradient-to-r from-[hsl(163,55%,22%)] to-[hsl(163,45%,28%)] text-white border-0">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[hsl(40,45%,65%)]" />
            <p className="text-sm" data-testid="text-alamat">{kk?.alamat}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-white/15 px-2 py-0.5 rounded" data-testid="text-rt">RT {kk?.rt?.toString().padStart(2, "0")} / RW 03</span>
            <span className="bg-white/15 px-2 py-0.5 rounded">{kk?.statusRumah}</span>
            <span className="bg-white/15 px-2 py-0.5 rounded">{kk?.listrik}</span>
          </div>
        </CardContent>
      </Card>

      <h3 className="text-sm font-semibold text-muted-foreground">
        Anggota Keluarga ({anggota?.length || 0})
      </h3>

      {anggota?.map((w) => (
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
              {editingId !== w.id ? (
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
              ) : (
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(w)}
                    disabled={submitEdit.isPending}
                    className="text-xs gap-1"
                    data-testid={`button-save-${w.id}`}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingId(null); setEditData({}); }}
                    className="text-xs"
                    data-testid={`button-cancel-${w.id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
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

              {editingId === w.id ? (
                <>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <Phone className="w-3 h-3" /> No. WhatsApp
                    </Label>
                    <Input
                      value={editData.nomorWhatsapp}
                      onChange={(e) => setEditData({...editData, nomorWhatsapp: e.target.value})}
                      className="h-10 text-sm"
                      data-testid={`input-wa-${w.id}`}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Pekerjaan
                    </Label>
                    <Input
                      value={editData.pekerjaan}
                      onChange={(e) => setEditData({...editData, pekerjaan: e.target.value})}
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
