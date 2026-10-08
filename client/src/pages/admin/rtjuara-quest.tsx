import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Swords, Trash2 } from "lucide-react";
import { RtjuaraAdminNav } from "@/components/admin/rtjuara-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3ChipFilters,
  Visitrw3EmptyState,
  Visitrw3FormCard,
  Visitrw3ListItem,
  Visitrw3Panel,
} from "@/components/admin/visitrw3-admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  RTJUARA_MAX_FOTO,
  RTJUARA_PERIODE,
  RTJUARA_PERIODE_KETERANGAN,
  RTJUARA_PERIODE_LABEL,
  type RtjuaraPeriode,
} from "@shared/rtjuara";
import { rtjuaraApi } from "@/lib/rtjuara-api";
import type { RtjuaraQuest } from "@shared/schema";
import { PeriodeBadge, PoinBadge } from "@/components/rtjuara/rtjuara-ui";
import { getApiErrorMessage } from "@/lib/queryClient";

type FilterPeriode = RtjuaraPeriode | "semua";

const formKosong = {
  judul: "",
  deskripsi: "",
  periode: "harian" as RtjuaraPeriode,
  poin: "10",
  instruksiBukti: "",
  minFoto: "1",
  wajibJumlahPeserta: false,
  berlakuMulai: "",
  berlakuSampai: "",
  aktif: true,
};

export default function AdminRtjuaraQuest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterPeriode>("semua");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(formKosong);
  const [hapusQuest, setHapusQuest] = useState<RtjuaraQuest | null>(null);

  const { data: quests = [], isLoading } = useQuery({
    queryKey: [RTJUARA_API.admin.quest],
    queryFn: () => rtjuaraApi.admin.questList(),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.admin.quest] }),
      queryClient.invalidateQueries({ queryKey: [RTJUARA_API.admin.dashboard] }),
    ]);

  const resetForm = () => {
    setForm(formKosong);
    setEditId(null);
    setFormOpen(false);
  };

  const bodyDariForm = () => ({
    judul: form.judul.trim(),
    deskripsi: form.deskripsi.trim(),
    periode: form.periode,
    poin: Number(form.poin) || 0,
    instruksiBukti: form.instruksiBukti.trim() || null,
    minFoto: Number(form.minFoto) || 1,
    wajibJumlahPeserta: form.wajibJumlahPeserta,
    berlakuMulai: form.berlakuMulai || null,
    berlakuSampai: form.berlakuSampai || null,
    aktif: form.aktif,
  });

  const simpanMutation = useMutation({
    mutationFn: () =>
      editId != null
        ? rtjuaraApi.admin.questPatch(editId, bodyDariForm())
        : rtjuaraApi.admin.questCreate(bodyDariForm()),
    onSuccess: () => {
      toast({ title: editId != null ? "Quest diperbarui" : "Quest baru dibuat" });
      resetForm();
      void invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Gagal menyimpan quest", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const aktifMutation = useMutation({
    mutationFn: ({ id, aktif }: { id: number; aktif: boolean }) =>
      rtjuaraApi.admin.questPatch(id, { aktif }),
    onSuccess: () => void invalidate(),
    onError: (e: unknown) =>
      toast({ title: "Gagal mengubah status quest", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const hapusMutation = useMutation({
    mutationFn: (id: number) => rtjuaraApi.admin.questDelete(id),
    onSuccess: () => {
      toast({ title: "Quest dihapus" });
      setHapusQuest(null);
      void invalidate();
    },
    onError: (e: unknown) => {
      setHapusQuest(null);
      toast({ title: "Gagal menghapus quest", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  const handleEdit = (quest: RtjuaraQuest) => {
    setEditId(quest.id);
    setForm({
      judul: quest.judul,
      deskripsi: quest.deskripsi,
      periode: quest.periode as RtjuaraPeriode,
      poin: String(quest.poin),
      instruksiBukti: quest.instruksiBukti ?? "",
      minFoto: String(quest.minFoto),
      wajibJumlahPeserta: quest.wajibJumlahPeserta,
      berlakuMulai: quest.berlakuMulai ?? "",
      berlakuSampai: quest.berlakuSampai ?? "",
      aktif: quest.aktif,
    });
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.judul.trim().length < 3) {
      toast({ title: "Judul quest minimal 3 karakter", variant: "destructive" });
      return;
    }
    if (form.deskripsi.trim().length < 10) {
      toast({ title: "Deskripsi quest minimal 10 karakter", variant: "destructive" });
      return;
    }
    if (!Number(form.poin) || Number(form.poin) < 1) {
      toast({ title: "Poin minimal 1", variant: "destructive" });
      return;
    }
    simpanMutation.mutate();
  };

  const terfilter = useMemo(
    () => (filter === "semua" ? quests : quests.filter((q) => q.periode === filter)),
    [quests, filter],
  );

  const hitung = (periode: RtjuaraPeriode) => quests.filter((q) => q.periode === periode).length;

  return (
    <Visitrw3AdminShell>
      <RtjuaraAdminNav
        title="Kelola Quest"
        description="Buat tantangan harian, mingguan, dan bulanan beserta bobot poinnya."
        actions={
          !formOpen ? (
            <Button
              onClick={() => {
                setForm(formKosong);
                setEditId(null);
                setFormOpen(true);
              }}
              className="text-white"
              style={{ backgroundColor: "hsl(163,55%,22%)" }}
              data-testid="button-tambah-quest"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Quest Baru
            </Button>
          ) : null
        }
      />

      {formOpen && (
        <Visitrw3FormCard title={editId != null ? "Ubah quest" : "Quest baru"} onClose={resetForm}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quest-judul">Judul quest</Label>
              <Input
                id="quest-judul"
                value={form.judul}
                onChange={(e) => setForm({ ...form, judul: e.target.value })}
                placeholder="Contoh: Kerja bakti lingkungan RT"
                maxLength={120}
                data-testid="input-quest-judul"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quest-deskripsi">Deskripsi</Label>
              <Textarea
                id="quest-deskripsi"
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                rows={3}
                placeholder="Jelaskan apa yang harus dilakukan RT untuk menyelesaikan quest ini."
                data-testid="input-quest-deskripsi"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Periode</Label>
              <div className="grid grid-cols-3 gap-2">
                {RTJUARA_PERIODE.map((periode) => (
                  <button
                    key={periode}
                    type="button"
                    onClick={() => setForm({ ...form, periode })}
                    className={`h-10 rounded-lg border text-xs font-semibold transition-colors ${
                      form.periode === periode
                        ? "bg-[hsl(163,55%,22%)] text-white border-[hsl(163,55%,22%)]"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {RTJUARA_PERIODE_LABEL[periode]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">{RTJUARA_PERIODE_KETERANGAN[form.periode]}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quest-poin">Bobot poin</Label>
                <Input
                  id="quest-poin"
                  type="number"
                  min={1}
                  max={1000}
                  value={form.poin}
                  onChange={(e) => setForm({ ...form, poin: e.target.value })}
                  data-testid="input-quest-poin"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quest-min-foto">Minimal foto</Label>
                <Input
                  id="quest-min-foto"
                  type="number"
                  min={1}
                  max={RTJUARA_MAX_FOTO}
                  value={form.minFoto}
                  onChange={(e) => setForm({ ...form, minFoto: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quest-instruksi">
                Instruksi bukti <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Textarea
                id="quest-instruksi"
                value={form.instruksiBukti}
                onChange={(e) => setForm({ ...form, instruksiBukti: e.target.value })}
                rows={2}
                placeholder="Contoh: foto harus memperlihatkan minimal 5 warga dan kondisi sebelum-sesudah."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quest-mulai">
                  Berlaku mulai <span className="text-muted-foreground">(opsional)</span>
                </Label>
                <Input
                  id="quest-mulai"
                  type="date"
                  value={form.berlakuMulai}
                  onChange={(e) => setForm({ ...form, berlakuMulai: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quest-sampai">
                  Berlaku sampai <span className="text-muted-foreground">(opsional)</span>
                </Label>
                <Input
                  id="quest-sampai"
                  type="date"
                  value={form.berlakuSampai}
                  onChange={(e) => setForm({ ...form, berlakuSampai: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Wajib isi jumlah peserta</p>
                <p className="text-xs text-muted-foreground">RT harus mencantumkan berapa warga yang ikut.</p>
              </div>
              <Switch
                checked={form.wajibJumlahPeserta}
                onCheckedChange={(v) => setForm({ ...form, wajibJumlahPeserta: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Quest aktif</p>
                <p className="text-xs text-muted-foreground">Hanya quest aktif yang muncul di portal ketua RT.</p>
              </div>
              <Switch checked={form.aktif} onCheckedChange={(v) => setForm({ ...form, aktif: v })} />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={simpanMutation.isPending}
                className="text-white"
                style={{ backgroundColor: "hsl(163,55%,22%)" }}
                data-testid="button-simpan-quest"
              >
                {simpanMutation.isPending ? "Menyimpan..." : editId != null ? "Simpan perubahan" : "Buat quest"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </Visitrw3FormCard>
      )}

      <Visitrw3ChipFilters<FilterPeriode>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "semua", label: "Semua", count: quests.length },
          ...RTJUARA_PERIODE.map((p) => ({
            value: p as FilterPeriode,
            label: RTJUARA_PERIODE_LABEL[p],
            count: hitung(p),
          })),
        ]}
      />

      <Visitrw3Panel noPadding>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : terfilter.length === 0 ? (
          <div className="p-4">
            <Visitrw3EmptyState
              icon={Swords}
              title="Belum ada quest"
              description="Buat quest pertama supaya ketua RT bisa mulai mengumpulkan poin."
            />
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {terfilter.map((quest) => (
              <Visitrw3ListItem
                key={quest.id}
                accent={quest.aktif ? "default" : "warning"}
                testId={`admin-quest-${quest.id}`}
                actions={
                  <>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(quest)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setHapusQuest(quest)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                }
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{quest.judul}</p>
                    <PoinBadge poin={quest.poin} muted={!quest.aktif} />
                    <PeriodeBadge periode={quest.periode} />
                    {!quest.aktif && (
                      <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{quest.deskripsi}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Min. {quest.minFoto} foto</span>
                    {quest.wajibJumlahPeserta && <span>Wajib jumlah peserta</span>}
                    {(quest.berlakuMulai || quest.berlakuSampai) && (
                      <span>
                        Berlaku {quest.berlakuMulai || "…"} s/d {quest.berlakuSampai || "…"}
                      </span>
                    )}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => aktifMutation.mutate({ id: quest.id, aktif: !quest.aktif })}
                    >
                      {quest.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </div>
                </div>
              </Visitrw3ListItem>
            ))}
          </div>
        )}
      </Visitrw3Panel>

      <AlertDialog open={hapusQuest != null} onOpenChange={(open) => !open && setHapusQuest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus quest ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {hapusQuest?.judul} akan dihapus permanen. Kalau quest ini sudah punya bukti dari RT,
              sistem akan menolak penghapusan — nonaktifkan saja supaya riwayat poin tetap utuh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => hapusQuest && hapusMutation.mutate(hapusQuest.id)}
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
