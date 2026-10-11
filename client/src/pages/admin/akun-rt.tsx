import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import {
  Visitrw3AdminShell,
  Visitrw3FormCard,
  Visitrw3ListItem,
  Visitrw3Panel,
  Visitrw3RtBadge,
} from "@/components/admin/visitrw3-admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { RTJUARA_API } from "@shared/rtjuara-api";
import { rtLabel } from "@shared/rtjuara";
import { rtjuaraApi, type AkunView } from "@/lib/rtjuara-api";
import { getApiErrorMessage } from "@/lib/queryClient";

export default function AdminAkunRt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editRt, setEditRt] = useState<number | null>(null);
  const [namaKetua, setNamaKetua] = useState("");
  const [nomorWhatsapp, setNomorWhatsapp] = useState("");
  const [pin, setPin] = useState("");
  const [aktif, setAktif] = useState(true);
  const [hapusAkun, setHapusAkun] = useState<AkunView | null>(null);

  const { data: akun = [], isLoading } = useQuery({
    queryKey: [RTJUARA_API.admin.akun],
    queryFn: () => rtjuaraApi.admin.akunList(),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.admin.akun] }),
    ]);

  const tutupForm = () => {
    setEditRt(null);
    setNamaKetua("");
    setNomorWhatsapp("");
    setPin("");
    setAktif(true);
  };

  const simpanMutation = useMutation({
    mutationFn: () =>
      rtjuaraApi.admin.akunSave({
        rt: editRt,
        namaKetua: namaKetua.trim(),
        nomorWhatsapp: nomorWhatsapp.trim() || null,
        pin: pin.trim() || undefined,
        aktif,
      }),
    onSuccess: () => {
      toast({
        title: "Akun ketua RT tersimpan",
        description: pin ? "PIN baru sudah aktif untuk login portal RT." : undefined,
      });
      tutupForm();
      void invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal menyimpan akun", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const hapusMutation = useMutation({
    mutationFn: (rt: number) => rtjuaraApi.admin.akunDelete(rt),
    onSuccess: () => {
      toast({ title: "Akun ketua RT dihapus" });
      setHapusAkun(null);
      void invalidate();
    },
    onError: (e: unknown) => {
      setHapusAkun(null);
      toast({ title: "Gagal menghapus akun", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  const bukaForm = (item: AkunView) => {
    setEditRt(item.rt);
    setNamaKetua(item.namaKetua);
    setNomorWhatsapp(item.nomorWhatsapp ?? "");
    setPin("");
    setAktif(item.sudahDiatur ? item.aktif : true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = akun.find((a) => a.rt === editRt);
    if (namaKetua.trim().length < 2) {
      toast({ title: "Nama ketua RT wajib diisi", variant: "destructive" });
      return;
    }
    if (!target?.sudahDiatur && !/^\d{6}$/.test(pin)) {
      toast({ title: "PIN 6 digit wajib diisi untuk akun baru", variant: "destructive" });
      return;
    }
    if (pin && !/^\d{6}$/.test(pin)) {
      toast({ title: "PIN harus 6 digit angka", variant: "destructive" });
      return;
    }
    simpanMutation.mutate();
  };

  const akunAktif = akun.find((a) => a.rt === editRt);

  return (
    <Visitrw3AdminShell>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[hsl(163,55%,22%)]">Kependudukan</p>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Akun & PIN Ketua RT</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Atur PIN login Portal Ketua RT (/rt) untuk tiap ketua RT. Ketua RT mengelola data warga dari portal itu.
        </p>
      </div>

      {editRt != null && (
        <Visitrw3FormCard title={`Akun ${rtLabel(editRt)}`} onClose={tutupForm}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama-ketua">Nama ketua RT</Label>
              <Input
                id="nama-ketua"
                value={namaKetua}
                onChange={(e) => setNamaKetua(e.target.value)}
                placeholder="Nama lengkap ketua RT"
                maxLength={100}
                data-testid="input-nama-ketua"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wa-ketua">
                Nomor WhatsApp <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                id="wa-ketua"
                value={nomorWhatsapp}
                onChange={(e) => setNomorWhatsapp(e.target.value)}
                placeholder="08xxxxxxxxxx"
                maxLength={30}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pin-ketua">
                PIN 6 digit{" "}
                {akunAktif?.sudahDiatur && (
                  <span className="text-muted-foreground">(kosongkan bila tidak diganti)</span>
                )}
              </Label>
              <Input
                id="pin-ketua"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="tracking-[0.3em]"
                data-testid="input-pin-ketua"
              />
              <p className="text-[11px] text-muted-foreground">
                PIN disimpan dalam bentuk hash dan tidak bisa dilihat lagi. Catat lalu kirimkan ke
                ketua RT secara pribadi.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Akun aktif</p>
                <p className="text-xs text-muted-foreground">Akun nonaktif tidak bisa login ke portal RT.</p>
              </div>
              <Switch checked={aktif} onCheckedChange={setAktif} />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={simpanMutation.isPending}
                className="text-white"
                style={{ backgroundColor: "hsl(163,55%,22%)" }}
                data-testid="button-simpan-akun"
              >
                {simpanMutation.isPending ? "Menyimpan..." : "Simpan akun"}
              </Button>
              <Button type="button" variant="outline" onClick={tutupForm}>
                Batal
              </Button>
            </div>
          </form>
        </Visitrw3FormCard>
      )}

      <Visitrw3Panel
        title="Daftar RT"
        description="Satu akun login per RT."
        noPadding
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {akun.map((item) => (
              <Visitrw3ListItem
                key={item.rt}
                accent={item.sudahDiatur ? (item.aktif ? "success" : "warning") : "default"}
                testId={`akun-rt-${item.rt}`}
                actions={
                  <>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => bukaForm(item)}>
                      {item.sudahDiatur ? <Pencil className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                    </Button>
                    {item.sudahDiatur && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setHapusAkun(item)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                }
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Visitrw3RtBadge rt={item.rt} />
                    <p className="text-sm font-semibold">
                      {item.sudahDiatur ? item.namaKetua : "Belum diatur"}
                    </p>
                    {item.sudahDiatur && !item.aktif && (
                      <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {item.sudahDiatur
                      ? `${item.nomorWhatsapp || "Tanpa nomor WA"} · ${
                          item.lastLoginAt
                            ? `login terakhir ${new Date(item.lastLoginAt).toLocaleDateString("id-ID")}`
                            : "belum pernah login"
                        }`
                      : "Buat PIN supaya ketua RT bisa masuk ke Portal Ketua RT."}
                  </p>
                </div>
              </Visitrw3ListItem>
            ))}
          </div>
        )}
      </Visitrw3Panel>

      <AlertDialog open={hapusAkun != null} onOpenChange={(open) => !open && setHapusAkun(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun {hapusAkun ? rtLabel(hapusAkun.rt) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ketua RT tidak bisa login lagi sampai akun dibuat ulang. Bukti dan poin yang sudah
              masuk tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => hapusAkun && hapusMutation.mutate(hapusAkun.rt)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Visitrw3AdminShell>
  );
}
