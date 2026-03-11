import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, Users } from "lucide-react";
import type { ProfileEditRequest, Warga } from "@shared/schema";

export default function AdminProfilEdit() {
  const { toast } = useToast();

  const { data: editList, isLoading } = useQuery<ProfileEditRequest[]>({ queryKey: ["/api/profile-edits"] });
  const { data: wargaList } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/profile-edits/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Status diperbarui" });
      queryClient.invalidateQueries({ queryKey: ["/api/profile-edits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const getWargaName = (id: number) => wargaList?.find(w => w.id === id)?.namaLengkap || "Warga";

  const fieldLabels: Record<string, string> = {
    namaLengkap: "Nama Lengkap",
    nik: "NIK",
    nomorWhatsapp: "No. WhatsApp",
    jenisKelamin: "Jenis Kelamin",
    statusPerkawinan: "Status Perkawinan",
    agama: "Agama",
    kedudukanKeluarga: "Kedudukan Keluarga",
    tanggalLahir: "Tanggal Lahir",
    pekerjaan: "Pekerjaan",
    pendidikan: "Pendidikan",
    statusKependudukan: "Status Kependudukan",
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800" },
    disetujui: { label: "Disetujui", color: "bg-green-100 text-green-800" },
    ditolak: { label: "Ditolak", color: "bg-red-100 text-red-800" },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-profil-edit-title">Pengajuan Edit Profil</h2>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : editList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada pengajuan edit profil</p>
          </CardContent>
        </Card>
      ) : (
        editList?.map(edit => {
          const sc = statusConfig[edit.status] || statusConfig.pending;
          const changes = edit.fieldChanges as Record<string, string>;
          return (
            <Card key={edit.id} data-testid={`card-edit-${edit.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{getWargaName(edit.wargaId)}</p>
                    <p className="text-xs text-muted-foreground">
                      Mengajukan perubahan data
                    </p>
                  </div>
                  <Badge className={`${sc.color} text-[10px]`}>{sc.label}</Badge>
                </div>

                <div className="space-y-1.5 bg-muted p-3 rounded-md">
                  {Object.entries(changes).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{fieldLabels[key] || key}:</span>
                      <span className="font-medium">{val}</span>
                    </div>
                  ))}
                </div>

                {edit.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-700 gap-1" onClick={() => updateMutation.mutate({ id: edit.id, status: "disetujui" })} disabled={updateMutation.isPending} data-testid={`button-setujui-edit-${edit.id}`}>
                      <CheckCircle className="w-3 h-3" /> Setujui
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateMutation.mutate({ id: edit.id, status: "ditolak" })} disabled={updateMutation.isPending} data-testid={`button-tolak-edit-${edit.id}`}>
                      <XCircle className="w-3 h-3" /> Tolak
                    </Button>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  {edit.createdAt ? new Date(edit.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
