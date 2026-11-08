import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, MessageSquareHeart, Star, Trophy, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { SASARAN_RATING_INFO, type SasaranRating } from "@shared/rating";
import { WILAYAH_RT_NUMBERS } from "@shared/wilayah";

type PerRt = {
  nomorRt: number;
  label: string;
  jumlah: number;
  rata: number | null;
  sebaran: Record<1 | 2 | 3 | 4 | 5, number>;
};

type Ringkasan = {
  total: number;
  belumDibaca: number;
  rt: number;
  rw: number;
  rataRt: number | null;
  rataRw: number | null;
  perRt: PerRt[];
  terbaik: { nomorRt: number; label: string; rata: number; jumlah: number } | null;
  terburuk: { nomorRt: number; label: string; rata: number; jumlah: number } | null;
};

type Baris = {
  id: number;
  sasaran: SasaranRating;
  sasaranLabel: string;
  nomorRt: number | null;
  bintang: number;
  bintangLabel: string;
  isi: string;
  nomorWa: string;
  dibaca: boolean;
  dibuat: string;
};

function Bintang({ n, size = "sm" }: { n: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-0.5 text-[hsl(40,70%,45%)]" aria-label={`${n} bintang`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(cls, i < n ? "fill-current" : "text-muted-foreground/30")}
          aria-hidden
        />
      ))}
    </span>
  );
}

function formatWaktu(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function formatRata(n: number | null | undefined) {
  if (n == null) return "–";
  return n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export default function AdminRating() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sasaran, setSasaran] = useState("semua");
  const [rt, setRt] = useState("semua");
  const [belumDibaca, setBelumDibaca] = useState(false);

  const qs = new URLSearchParams({
    ...(sasaran !== "semua" ? { sasaran } : {}),
    ...(rt !== "semua" ? { rt } : {}),
    ...(belumDibaca ? { belumDibaca: "1" } : {}),
  });

  const { data: ringkasan } = useQuery<Ringkasan>({
    queryKey: ["/api/admin/rating/ringkasan"],
    queryFn: async () => readJsonSafely(await apiRequest("GET", "/api/admin/rating/ringkasan")),
  });

  const { data: list = [], isLoading, error } = useQuery<Baris[]>({
    queryKey: ["/api/admin/rating", qs.toString()],
    queryFn: async () => readJsonSafely(await apiRequest("GET", `/api/admin/rating?${qs}`)),
    placeholderData: keepPreviousData,
  });

  const baca = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/rating/${id}/dibaca`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/rating"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/rating/ringkasan"] });
    },
    onError: (err) => {
      toast({
        title: "Gagal menandai dibaca",
        description: getApiErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  const perRt = ringkasan?.perRt ?? WILAYAH_RT_NUMBERS.map((n) => ({
    nomorRt: n,
    label: `RT ${String(n).padStart(2, "0")}`,
    jumlah: 0,
    rata: null,
    sebaran: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  }));
  const maksJumlah = Math.max(1, ...perRt.map((x) => x.jumlah));
  const peringkat = [...perRt]
    .filter((x) => x.jumlah > 0)
    .sort((a, b) => (b.rata ?? 0) - (a.rata ?? 0) || b.jumlah - a.jumlah);

  const pilihRt = (nomor: number) => {
    setSasaran("rt");
    setRt(String(nomor));
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white"
        style={{ background: "linear-gradient(135deg, hsl(163,52%,14%), hsl(163,48%,22%))" }}
      >
        <MessageSquareHeart className="absolute right-4 top-4 h-10 w-10 text-[hsl(40,58%,68%)]/40" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[hsl(40,45%,72%)]">
          Rahasia · bukan publik
        </p>
        <h1 className="text-2xl font-extrabold">Rating & masukan warga</h1>
        <p className="mt-1 max-w-xl text-sm text-white/75">
          Hasil rating RT dan RW hanya terlihat di sini. Bandingkan kinerja per RT dari rata-rata
          bintang warga.
        </p>
        <a
          href="/rating"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Halaman warga
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "Total masukan", n: ringkasan?.total },
          { label: "Belum dibaca", n: ringkasan?.belumDibaca, highlight: !!ringkasan?.belumDibaca },
          { label: "Untuk RT", n: ringkasan?.rt },
          { label: "Untuk RW", n: ringkasan?.rw },
          {
            label: "Rata-rata",
            n:
              ringkasan?.rataRt != null || ringkasan?.rataRw != null
                ? `RT ${formatRata(ringkasan?.rataRt)} · RW ${formatRata(ringkasan?.rataRw)}`
                : "–",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-xl border bg-card p-3 shadow-sm",
              s.highlight && "border-blue-300 bg-blue-50",
            )}
          >
            <p className="text-xl font-bold tabular-nums">{s.n ?? "–"}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-brand">Kinerja per RT</h2>
            <p className="text-sm text-muted-foreground">
              Berdasarkan rata-rata bintang dari rating warga (bukan rating RW).
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <Trophy className="h-4 w-4" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide">Terbaik</p>
            </div>
            {ringkasan?.terbaik ? (
              <button type="button" className="mt-1 w-full text-left" onClick={() => pilihRt(ringkasan.terbaik!.nomorRt)}>
                <p className="text-2xl font-extrabold text-emerald-950">{ringkasan.terbaik.label}</p>
                <p className="text-sm text-emerald-900/80">
                  Rata-rata <strong>{formatRata(ringkasan.terbaik.rata)}</strong> dari {ringkasan.terbaik.jumlah} rating
                </p>
              </button>
            ) : (
              <p className="mt-2 text-sm text-emerald-900/70">Belum ada rating RT.</p>
            )}
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center gap-2 text-orange-800">
              <TrendingDown className="h-4 w-4" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide">Perlu perhatian</p>
            </div>
            {ringkasan?.terburuk && ringkasan.terbaik && ringkasan.terburuk.nomorRt !== ringkasan.terbaik.nomorRt ? (
              <button type="button" className="mt-1 w-full text-left" onClick={() => pilihRt(ringkasan.terburuk!.nomorRt)}>
                <p className="text-2xl font-extrabold text-orange-950">{ringkasan.terburuk.label}</p>
                <p className="text-sm text-orange-900/80">
                  Rata-rata <strong>{formatRata(ringkasan.terburuk.rata)}</strong> dari {ringkasan.terburuk.jumlah} rating
                </p>
              </button>
            ) : ringkasan?.terburuk ? (
              <p className="mt-2 text-sm text-orange-900/70">Baru satu RT yang punya rating.</p>
            ) : (
              <p className="mt-2 text-sm text-orange-900/70">Belum ada rating RT.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[3rem_1fr_5rem_4.5rem_7rem]">
            <span>#</span>
            <span>RT</span>
            <span className="hidden text-right sm:block">Rata-rata</span>
            <span className="text-right">Jumlah</span>
            <span className="hidden sm:block">Sebaran</span>
          </div>
          <ul>
            {perRt.map((item) => {
              const rank = item.jumlah > 0 ? peringkat.findIndex((x) => x.nomorRt === item.nomorRt) + 1 : null;
              const isBest = ringkasan?.terbaik?.nomorRt === item.nomorRt;
              const isWorst =
                ringkasan?.terburuk?.nomorRt === item.nomorRt &&
                ringkasan?.terbaik?.nomorRt !== item.nomorRt;
              return (
                <li key={item.nomorRt}>
                  <button
                    type="button"
                    onClick={() => pilihRt(item.nomorRt)}
                    className={cn(
                      "grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-2 border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted/40 sm:grid-cols-[3rem_1fr_5rem_4.5rem_7rem]",
                      isBest && "bg-emerald-50/70",
                      isWorst && "bg-orange-50/70",
                      rt === String(item.nomorRt) && sasaran === "rt" && "ring-1 ring-inset ring-brand/30",
                    )}
                  >
                    <span className="w-8 text-sm font-bold tabular-nums text-muted-foreground">
                      {rank ?? "–"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.label}</p>
                        {isBest && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            Terbaik
                          </span>
                        )}
                        {isWorst && (
                          <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            Terendah
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            isBest ? "bg-emerald-500" : isWorst ? "bg-orange-500" : "bg-brand/70",
                          )}
                          style={{ width: `${(item.jumlah / maksJumlah) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                        Rata-rata {formatRata(item.rata)}
                      </p>
                    </div>
                    <p className="hidden text-right text-base font-bold tabular-nums sm:block">
                      {formatRata(item.rata)}
                    </p>
                    <p className="text-right text-sm font-semibold tabular-nums">{item.jumlah}</p>
                    <div className="hidden items-center justify-end gap-0.5 sm:flex" title="Sebaran 1–5 bintang">
                      {([1, 2, 3, 4, 5] as const).map((b) => (
                        <span
                          key={b}
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 text-[10px] font-semibold tabular-nums text-muted-foreground"
                        >
                          {item.sebaran[b]}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Select value={sasaran} onValueChange={(v) => { setSasaran(v); if (v !== "rt") setRt("semua"); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sasaran" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua sasaran</SelectItem>
            <SelectItem value="rt">{SASARAN_RATING_INFO.rt.label}</SelectItem>
            <SelectItem value="rw">{SASARAN_RATING_INFO.rw.label}</SelectItem>
          </SelectContent>
        </Select>
        {sasaran === "rt" && (
          <Select value={rt} onValueChange={setRt}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="RT" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua RT</SelectItem>
              {WILAYAH_RT_NUMBERS.map((n) => (
                <SelectItem key={n} value={String(n)}>RT {String(n).padStart(2, "0")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          type="button"
          variant={belumDibaca ? "default" : "outline"}
          size="sm"
          onClick={() => setBelumDibaca((v) => !v)}
        >
          Belum dibaca
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{getApiErrorMessage(error, "Gagal memuat data")}</p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada rating atau masukan.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((item) => (
            <article
              key={item.id}
              className={cn(
                "rounded-xl border bg-card p-4 shadow-sm",
                !item.dibaca && "border-blue-200 bg-blue-50/40",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.sasaranLabel}</p>
                    <Bintang n={item.bintang} />
                    <span className="text-xs text-muted-foreground">{item.bintangLabel}</span>
                    {!item.dibaca && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Baru
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatWaktu(item.dibuat)} · WA {item.nomorWa}
                  </p>
                </div>
                {!item.dibaca && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={baca.isPending}
                    onClick={() => baca.mutate(item.id)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Tandai dibaca
                  </Button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.isi}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
