import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Swords, Archive, X, RefreshCw, WifiOff } from "lucide-react";
import { BLUSUKAN_API } from "@shared/blusukan-api";
import { blusukanApi } from "@/lib/blusukan-api";
import type { BlusukanQuest } from "@shared/schema";
import { QuestCard } from "@/components/blusukanrw/quest-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { blusukanInputClass, blusukanTextareaClass } from "@/components/blusukanrw/blusukan-form-ui";
import { Link } from "wouter";
import { blusukanKkHref } from "@/lib/blusukan-navigation";

type QuestTab = "aktif" | "arsip";

type CariRow = {
  wargaId: number;
  namaLengkap: string;
  kkId: number;
  nomorKk: string;
  rt: number;
  alamat: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function BlusukanrwQuest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<QuestTab>("aktif");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailQuest, setDetailQuest] = useState<BlusukanQuest | null>(null);

  const [judul, setJudul] = useState("");
  const [perihal, setPerihal] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [wargaSearch, setWargaSearch] = useState("");
  const [wargaResults, setWargaResults] = useState<CariRow[]>([]);
  const [selectedWarga, setSelectedWarga] = useState<CariRow | null>(null);
  const [searching, setSearching] = useState(false);

  const [editProgres, setEditProgres] = useState(0);
  const [editCatatan, setEditCatatan] = useState("");
  const [catatanSelesai, setCatatanSelesai] = useState("");

  const {
    data: aktif = [],
    isPending: loadingAktif,
    isError: errorAktif,
    error: errAktif,
    refetch: refetchAktif,
  } = useQuery({
    queryKey: [BLUSUKAN_API.quest, "aktif"],
    queryFn: () => blusukanApi.quest.list("aktif"),
  });

  const {
    data: arsip = [],
    isPending: loadingArsip,
    isError: errorArsip,
    error: errArsip,
    refetch: refetchArsip,
  } = useQuery({
    queryKey: [BLUSUKAN_API.quest, "selesai"],
    queryFn: () => blusukanApi.quest.list("selesai"),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [BLUSUKAN_API.quest] }),
    ]);

  const createMutation = useMutation({
    mutationFn: () =>
      blusukanApi.quest.create({
        judul: judul.trim(),
        perihal: perihal.trim(),
        deadline,
        targetWargaId: selectedWarga?.wargaId ?? null,
        targetWargaNama: selectedWarga?.namaLengkap ?? (wargaSearch.trim() || null),
        targetKkId: selectedWarga?.kkId ?? null,
      }),
    onSuccess: () => {
      toast({ title: "Quest baru ditambahkan!" });
      setCreateOpen(false);
      setJudul("");
      setPerihal("");
      setWargaSearch("");
      setSelectedWarga(null);
      setWargaResults([]);
      void invalidate();
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal membuat quest",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      blusukanApi.quest.patch(detailQuest!.id, body),
    onSuccess: () => {
      void invalidate();
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menyimpan",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      blusukanApi.quest.patch(detailQuest!.id, {
        status: "selesai",
        progres: 100,
        catatanSelesai: catatanSelesai.trim() || null,
      }),
    onSuccess: () => {
      toast({ title: "Quest selesai — masuk arsip!" });
      setDetailQuest(null);
      setCatatanSelesai("");
      void invalidate();
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menyelesaikan quest",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const searchWarga = async (q: string) => {
    setWargaSearch(q);
    setSelectedWarga(null);
    if (q.trim().length < 2) {
      setWargaResults([]);
      return;
    }
    setSearching(true);
    try {
      const rows = await blusukanApi.cari<CariRow>(q.trim());
      setWargaResults(rows.slice(0, 8));
    } catch {
      setWargaResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openDetail = (q: BlusukanQuest) => {
    setDetailQuest(q);
    setEditProgres(q.progres);
    setEditCatatan(q.catatan ?? "");
    setCatatanSelesai("");
  };

  const list = tab === "aktif" ? aktif : arsip;
  const loading = tab === "aktif" ? loadingAktif : loadingArsip;
  const loadError = tab === "aktif" ? errorAktif : errorArsip;
  const loadErrorMsg =
    (tab === "aktif" ? errAktif : errArsip) instanceof Error
      ? (tab === "aktif" ? errAktif : errArsip)!.message
      : "Gagal memuat quest";
  const refetchCurrent = tab === "aktif" ? refetchAktif : refetchArsip;

  const overdueCount = useMemo(
    () => aktif.filter((q) => q.deadline < todayIso()).length,
    [aktif],
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-[hsl(40,45%,55%)]/40 bg-gradient-to-br from-[hsl(163,55%,18%)] to-[hsl(163,55%,12%)] p-4 text-white">
        <div className="absolute -right-4 -top-4 opacity-10">
          <Swords className="h-24 w-24" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(40,45%,55%)]">
          Quest Log RW
        </p>
        <h2 className="text-xl font-bold mt-1">Blusukan Quest</h2>
        <p className="text-xs text-white/70 mt-1">
          Buat misi lapangan sendiri — siapa yang harus ditemui, terkait apa, dan kapan harus beres.
        </p>
        <div className="flex gap-3 mt-3 text-xs">
          <span className="rounded-md bg-black/25 px-2 py-1">
            <strong className="text-[hsl(40,55%,65%)]">{aktif.length}</strong> aktif
          </span>
          {overdueCount > 0 && (
            <span className="rounded-md bg-red-950/50 px-2 py-1 text-red-300">
              <strong>{overdueCount}</strong> terlambat
            </span>
          )}
          <span className="rounded-md bg-black/25 px-2 py-1">
            <strong className="text-emerald-400">{arsip.length}</strong> selesai
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("aktif")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            tab === "aktif"
              ? "bg-[hsl(163,55%,22%)] text-white shadow-md"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Quest Aktif
        </button>
        <button
          type="button"
          onClick={() => setTab("arsip")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            tab === "arsip"
              ? "bg-[hsl(163,55%,22%)] text-white shadow-md"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Archive className="h-4 w-4" />
          Arsip
        </button>
      </div>

      {tab === "aktif" && (
        <Button
          type="button"
          className="w-full h-12 text-base font-bold"
          style={{ backgroundColor: "hsl(40,45%,45%)" }}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Buat Quest Baru
        </Button>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {loadError && !loading && (
        <div className="text-center py-10 rounded-xl border border-destructive/30 bg-destructive/5 px-4">
          <WifiOff className="h-9 w-9 mx-auto text-destructive/70 mb-2" />
          <p className="text-sm font-medium text-destructive">Tidak terhubung ke server</p>
          <p className="text-xs text-muted-foreground mt-1">{loadErrorMsg}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Pastikan server sudah di-restart setelah update terbaru (npm run dev).
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetchCurrent()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Coba lagi
          </Button>
        </div>
      )}

      {!loading && !loadError && list.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-dashed bg-muted/30">
          <Swords className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            {tab === "aktif" ? "Quest belum dibuat" : "Arsip quest masih kosong"}
          </p>
          {tab === "aktif" && (
            <p className="text-xs text-muted-foreground mt-1">Tap &quot;Buat Quest Baru&quot; untuk mulai misi lapangan</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {!loading && !loadError && list.map((q) => (
          <QuestCard
            key={q.id}
            quest={q}
            archived={tab === "arsip"}
            onClick={() => (tab === "aktif" ? openDetail(q) : openDetail(q))}
          />
        ))}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-[hsl(40,45%,55%)]/50 bg-gradient-to-b from-[hsl(163,55%,16%)] to-[hsl(163,55%,10%)] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Quest Baru</h3>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="Tutup">
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-white/80">Judul quest</Label>
                <Input
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Verifikasi data bansos"
                  className={`${blusukanInputClass} mt-1 bg-black/20 border-white/20 text-white`}
                />
              </div>
              <div>
                <Label className="text-white/80">Terkait apa</Label>
                <Textarea
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                  rows={3}
                  placeholder="Jelaskan tujuan kunjungan atau hal yang harus diselesaikan..."
                  className={`${blusukanTextareaClass} mt-1 bg-black/20 border-white/20 text-white`}
                />
              </div>
              <div>
                <Label className="text-white/80">Ngobrol dengan siapa</Label>
                <Input
                  value={selectedWarga ? selectedWarga.namaLengkap : wargaSearch}
                  onChange={(e) => void searchWarga(e.target.value)}
                  placeholder="Ketik nama warga (min. 2 huruf)"
                  className={`${blusukanInputClass} mt-1 bg-black/20 border-white/20 text-white`}
                />
                {searching && <p className="text-xs text-white/50 mt-1">Mencari...</p>}
                {wargaResults.length > 0 && !selectedWarga && (
                  <div className="mt-2 rounded-lg border border-white/15 bg-black/30 overflow-hidden">
                    {wargaResults.map((r) => (
                      <button
                        key={r.wargaId}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 border-b border-white/10 last:border-0"
                        onClick={() => {
                          setSelectedWarga(r);
                          setWargaSearch(r.namaLengkap);
                          setWargaResults([]);
                        }}
                      >
                        <span className="font-medium">{r.namaLengkap}</span>
                        {r.alamat?.trim() && (
                          <span className="text-white/50 text-xs block line-clamp-2">{r.alamat}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-white/80">Harus beres kapan</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={todayIso()}
                  className={`${blusukanInputClass} mt-1 bg-black/20 border-white/20 text-white`}
                />
              </div>
              <Button
                type="button"
                className="w-full h-11 font-bold"
                style={{ backgroundColor: "hsl(40,45%,45%)" }}
                disabled={!judul.trim() || !perihal.trim() || !deadline || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Menyimpan..." : "Terima Quest"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {detailQuest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-[hsl(40,45%,55%)]/50 bg-gradient-to-b from-[hsl(163,55%,16%)] to-[hsl(163,55%,10%)] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg line-clamp-2 pr-2">{detailQuest.judul}</h3>
              <button type="button" onClick={() => setDetailQuest(null)} aria-label="Tutup">
                <X className="h-5 w-5 text-white/70 shrink-0" />
              </button>
            </div>

            {detailQuest.status === "selesai" ? (
              <div className="space-y-3 text-sm">
                <p className="text-white/70">{detailQuest.perihal}</p>
                <p className="text-white/60">
                  Target: <strong>{detailQuest.targetWargaNama ?? "—"}</strong>
                </p>
                {detailQuest.catatanSelesai && (
                  <p className="italic text-white/50">"{detailQuest.catatanSelesai}"</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-white/70">{detailQuest.perihal}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-black/25 px-2 py-1">
                    Target: {detailQuest.targetWargaNama ?? "—"}
                  </span>
                  {detailQuest.targetKkId && (
                    <Link href={blusukanKkHref(detailQuest.targetKkId, "quest")}>
                      <span className="rounded-md bg-[hsl(40,45%,55%)]/20 px-2 py-1 text-[hsl(40,55%,70%)] underline">
                        Buka KK
                      </span>
                    </Link>
                  )}
                </div>

                <div>
                  <Label className="text-white/80">Progres ({editProgres}%)</Label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={editProgres}
                    onChange={(e) => setEditProgres(Number(e.target.value))}
                    className="w-full mt-2 accent-[hsl(40,45%,55%)]"
                  />
                </div>
                <div>
                  <Label className="text-white/80">Catatan progres</Label>
                  <Textarea
                    value={editCatatan}
                    onChange={(e) => setEditCatatan(e.target.value)}
                    rows={2}
                    className={`${blusukanTextareaClass} mt-1 bg-black/20 border-white/20 text-white`}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate(
                      { progres: editProgres, catatan: editCatatan.trim() || null },
                      {
                        onSuccess: () => toast({ title: "Progres disimpan" }),
                      },
                    )
                  }
                >
                  Simpan progres
                </Button>

                <div className="border-t border-white/15 pt-4">
                  <Label className="text-white/80">Selesaikan quest</Label>
                  <Textarea
                    value={catatanSelesai}
                    onChange={(e) => setCatatanSelesai(e.target.value)}
                    rows={2}
                    placeholder="Ringkasan hasil kunjungan / percakapan..."
                    className={`${blusukanTextareaClass} mt-1 bg-black/20 border-white/20 text-white`}
                  />
                  <Button
                    type="button"
                    className="w-full h-11 mt-2 font-bold"
                    style={{ backgroundColor: "hsl(163,55%,30%)" }}
                    disabled={completeMutation.isPending}
                    onClick={() => completeMutation.mutate()}
                  >
                    {completeMutation.isPending ? "Menyimpan..." : "Quest Selesai ✓"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
