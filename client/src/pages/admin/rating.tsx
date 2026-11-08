import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, MessageSquareHeart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { SASARAN_RATING_INFO, type SasaranRating } from "@shared/rating";

type Ringkasan = {
  total: number;
  belumDibaca: number;
  rt: number;
  rw: number;
  rataRt: number | null;
  rataRw: number | null;
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

function Bintang({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[hsl(40,70%,45%)]" aria-label={`${n} bintang`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i < n ? "fill-current" : "text-muted-foreground/30")}
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
          Hasil rating RT dan RW hanya terlihat di sini. Tidak ada tampilan publik agar warga merasa
          aman menyampaikan kritik dan saran.
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
                ? `RT ${ringkasan?.rataRt ?? "–"} · RW ${ringkasan?.rataRw ?? "–"}`
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
              {[1, 2, 3, 4].map((n) => (
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
