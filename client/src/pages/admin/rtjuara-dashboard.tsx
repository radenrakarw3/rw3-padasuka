import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Coins, KeyRound, Swords, Trophy } from "lucide-react";
import { RtjuaraAdminNav, RTJUARA_ADMIN_ROUTES } from "@/components/admin/rtjuara-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3Panel,
  Visitrw3StatCard,
} from "@/components/admin/visitrw3-admin-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { bulanKey, bulanLabel, bulanSebelumnya, rtLabel } from "@shared/rtjuara";
import { rtjuaraApi } from "@/lib/rtjuara-api";
import { PapanPeringkat } from "@/components/rtjuara/rtjuara-ui";
import { getApiErrorMessage } from "@/lib/queryClient";

function daftarBulan(): string[] {
  const list: string[] = [];
  let key = bulanKey();
  for (let i = 0; i < 6; i++) {
    list.push(key);
    key = bulanSebelumnya(key);
  }
  return list;
}

export default function AdminRtjuaraDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bulan, setBulan] = useState(() => bulanKey());
  const [catatan, setCatatan] = useState("");
  const [konfirmasiUmumkan, setKonfirmasiUmumkan] = useState(false);
  const [konfirmasiBatal, setKonfirmasiBatal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [RTJUARA_API.admin.dashboard, bulan],
    queryFn: () => rtjuaraApi.admin.dashboard(bulan),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.admin.dashboard] }),
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.admin.juara] }),
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.publik.juara] }),
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.publik.leaderboard] }),
    ]);

  const umumkanMutation = useMutation({
    mutationFn: () => rtjuaraApi.admin.umumkanJuara(bulan, catatan.trim() || null),
    onSuccess: (res) => {
      const juara1 = res.juara.find((j) => j.peringkat === 1);
      toast({
        title: "RT Juara diumumkan",
        description: juara1
          ? `${rtLabel(juara1.rt)} juara ${bulanLabel(bulan)} dengan ${juara1.totalPoin} poin.`
          : `Pengumuman ${bulanLabel(bulan)} tersimpan.`,
      });
      setCatatan("");
      void invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal mengumumkan juara", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const batalMutation = useMutation({
    mutationFn: () => rtjuaraApi.admin.batalkanJuara(bulan),
    onSuccess: () => {
      toast({ title: "Pengumuman dibatalkan" });
      void invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal membatalkan", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const sudahDiumumkan = (data?.juara.length ?? 0) > 0;
  const juara1 = data?.juara.find((j) => j.peringkat === 1);

  return (
    <Visitrw3AdminShell>
      <RtjuaraAdminNav
        title="Ringkasan RT JUARA"
        description="Perolehan poin tiap RT, antrian verifikasi, dan pengumuman juara bulanan."
      />

      <div className="flex flex-wrap gap-1.5">
        {daftarBulan().map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setBulan(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              bulan === key
                ? "bg-[hsl(163,55%,22%)] text-white shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            {bulanLabel(key)}
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Visitrw3StatCard
              title="Poin terkumpul"
              value={String(data.totalPoin)}
              description={bulanLabel(data.bulan)}
              icon={Coins}
              tone="gold"
            />
            <Visitrw3StatCard
              title="Menunggu verifikasi"
              value={String(data.bukti.menunggu)}
              description={`${data.bukti.menungguSemuaBulan} total semua bulan`}
              icon={ClipboardCheck}
              tone={data.bukti.menunggu > 0 ? "warning" : "default"}
              href={RTJUARA_ADMIN_ROUTES.verifikasi}
            />
            <Visitrw3StatCard
              title="Quest aktif"
              value={String(data.quest.aktif)}
              description={`${data.quest.total} quest total`}
              icon={Swords}
              href={RTJUARA_ADMIN_ROUTES.quest}
            />
            <Visitrw3StatCard
              title="Akun ketua RT"
              value={`${data.akunAktif}/${data.akunTotal}`}
              description="Akun aktif"
              icon={KeyRound}
              href={RTJUARA_ADMIN_ROUTES.akun}
            />
          </div>

          <Visitrw3Panel
            title={`Papan peringkat ${bulanLabel(data.bulan)}`}
            description={`${data.bukti.disetujui} bukti disetujui · ${data.bukti.ditolak} ditolak`}
          >
            <PapanPeringkat rows={data.leaderboard} />
          </Visitrw3Panel>

          <Visitrw3Panel
            title="Pengumuman RT Juara"
            description={
              sudahDiumumkan
                ? `Sudah diumumkan${juara1 ? ` — ${rtLabel(juara1.rt)} sebagai Juara 1` : ""}.`
                : "Bekukan papan peringkat bulan ini menjadi pengumuman resmi."
            }
          >
            <div className="space-y-3">
              {sudahDiumumkan ? (
                <div className="space-y-2">
                  {data.juara
                    .filter((j) => j.peringkat <= 3)
                    .map((j) => (
                      <div key={j.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                        <div className="flex items-center gap-2">
                          <Trophy
                            className="w-4 h-4"
                            style={{ color: j.peringkat === 1 ? "hsl(40,45%,55%)" : "hsl(0,0%,65%)" }}
                          />
                          <span className="text-sm font-semibold">
                            Juara {j.peringkat} · {rtLabel(j.rt)}
                          </span>
                        </div>
                        <span className="text-sm font-bold tabular-nums" style={{ color: "hsl(40,45%,40%)" }}>
                          {j.totalPoin} poin
                        </span>
                      </div>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setKonfirmasiBatal(true)}
                    disabled={batalMutation.isPending}
                  >
                    Batalkan pengumuman
                  </Button>
                </div>
              ) : (
                <>
                  <Textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Catatan pengumuman (opsional) — misal: hadiah diserahkan saat rapat RW."
                  />
                  {data.bukti.menunggu > 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                      Masih ada {data.bukti.menunggu} bukti menunggu verifikasi di bulan ini. Selesaikan dulu
                      sebelum mengumumkan juara.
                    </p>
                  )}
                  <Button
                    onClick={() => setKonfirmasiUmumkan(true)}
                    disabled={umumkanMutation.isPending || data.bukti.menunggu > 0 || data.totalPoin === 0}
                    className="text-white"
                    style={{ backgroundColor: "hsl(163,55%,22%)" }}
                    data-testid="button-umumkan-juara"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Umumkan Juara {bulanLabel(data.bulan)}
                  </Button>
                </>
              )}
            </div>
          </Visitrw3Panel>
        </div>
      )}

      <AlertDialog open={konfirmasiUmumkan} onOpenChange={setKonfirmasiUmumkan}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Umumkan RT Juara {bulanLabel(bulan)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Peringkat akan dibekukan dan langsung tampil di halaman publik. Kamu masih bisa
              membatalkannya kalau ada koreksi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => umumkanMutation.mutate()}>Umumkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={konfirmasiBatal} onOpenChange={setKonfirmasiBatal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan pengumuman {bulanLabel(bulan)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Pengumuman akan dihapus dari halaman publik. Poin RT tidak berubah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction onClick={() => batalMutation.mutate()}>Batalkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Visitrw3AdminShell>
  );
}
