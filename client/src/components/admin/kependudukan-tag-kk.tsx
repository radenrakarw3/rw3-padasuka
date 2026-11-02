import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Tags } from "lucide-react";
import { BagianStat, formatNumber } from "@/components/admin/kependudukan-stats-ui";
import { KkTagBadge } from "@/components/admin/kk-tag-badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hitungTagKk,
  kategoriTag,
  KK_TAG_KATEGORI,
  parseKkLabelRw,
} from "@shared/kk-label-rw";

export type KkTagRow = {
  id: number;
  rt: number;
  nomorKk?: string | null;
  alamat?: string | null;
  labelRw?: string | null;
};

type Props = {
  kkList: KkTagRow[];
  polos?: boolean;
};

export function KependudukanTagKk({ kkList, polos }: Props) {
  const [filterTag, setFilterTag] = useState<string>("semua");
  const [filterKat, setFilterKat] = useState<string>("semua");

  const stats = useMemo(() => hitungTagKk(kkList), [kkList]);

  const daftar = useMemo(() => {
    return kkList
      .map((kk) => ({ ...kk, tags: parseKkLabelRw(kk.labelRw) }))
      .filter((kk) => {
        if (!kk.tags.length) return false;
        if (filterTag !== "semua" && !kk.tags.includes(filterTag)) return false;
        if (filterKat !== "semua") {
          if (!kk.tags.some((t) => (kategoriTag(t)?.id ?? "lainnya") === filterKat)) return false;
        }
        return true;
      })
      .sort((a, b) => a.rt - b.rt || (a.nomorKk ?? "").localeCompare(b.nomorKk ?? ""));
  }, [kkList, filterTag, filterKat]);

  const tanpaTag = kkList.length - stats.totalKkBertag;

  return (
    <BagianStat
      polos={polos}
      title="Kondisi tag keluarga"
      description="Tag internal untuk menilai & menandai tindak lanjut — dari Cari Warga atau halaman keluarga"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">KK bertag</p>
          <p className="text-2xl font-bold tabular-nums">{formatNumber(stats.totalKkBertag)}</p>
          <p className="text-xs text-muted-foreground">dari {formatNumber(kkList.length)} KK</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Belum bertag</p>
          <p className="text-2xl font-bold tabular-nums">{formatNumber(tanpaTag)}</p>
          <p className="text-xs text-muted-foreground">belum dinilai / ditandai</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Jenis tag dipakai</p>
          <p className="text-2xl font-bold tabular-nums">{formatNumber(stats.byTag.length)}</p>
          <p className="text-xs text-muted-foreground">unik di filter RT ini</p>
        </div>
      </div>

      {stats.byKategori.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Per kategori</p>
          <div className="flex flex-wrap gap-2">
            {stats.byKategori.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setFilterKat(filterKat === k.id ? "semua" : k.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  filterKat === k.id ? "border-brand bg-brand/10 font-semibold text-brand" : "bg-background"
                }`}
              >
                {k.label}
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
                  {k.jumlahKk}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {stats.byTag.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tag paling sering</p>
          <div className="flex flex-wrap gap-1.5">
            {stats.byTag.slice(0, 24).map((t) => (
              <button key={t.tag} type="button" onClick={() => setFilterTag(filterTag === t.tag ? "semua" : t.tag)}>
                <span className={filterTag === t.tag ? "ring-2 ring-brand rounded-full inline-flex" : "inline-flex"}>
                  <KkTagBadge tag={t.tag} />
                  <span className="ml-1 self-center text-[10px] tabular-nums text-muted-foreground">×{t.jumlah}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Filter tag</p>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[220px]" aria-label="Filter tag">
              <SelectValue placeholder="Semua tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua tag</SelectItem>
              {stats.byTag.map((t) => (
                <SelectItem key={t.tag} value={t.tag}>
                  {t.tag} ({t.jumlah})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Filter kategori</p>
          <Select value={filterKat} onValueChange={setFilterKat}>
            <SelectTrigger className="w-[200px]" aria-label="Filter kategori tag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua kategori</SelectItem>
              {KK_TAG_KATEGORI.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(filterTag !== "semua" || filterKat !== "semua") && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setFilterTag("semua"); setFilterKat("semua"); }}>
            Reset filter
          </Button>
        )}
      </div>

      {daftar.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 flex items-center gap-2">
          <Tags className="h-4 w-4" />
          {stats.totalKkBertag === 0
            ? "Belum ada KK bertag. Buka hasil Cari Warga atau halaman keluarga untuk menandai."
            : "Tidak ada KK yang cocok dengan filter tag."}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {daftar.slice(0, 50).map((kk) => (
            <li key={kk.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm font-medium">
                  RT {String(kk.rt).padStart(2, "0")}
                  {kk.nomorKk ? ` · KK ${kk.nomorKk}` : ` · #${kk.id}`}
                </p>
                {kk.alamat && <p className="text-xs text-muted-foreground break-words">{kk.alamat}</p>}
                <div className="flex flex-wrap gap-1">
                  {kk.tags.map((t) => (
                    <KkTagBadge key={t} tag={t} />
                  ))}
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={`/admin/kelola-warga/keluarga/${kk.id}`}>Buka keluarga</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {daftar.length > 50 && (
        <p className="text-xs text-muted-foreground">Menampilkan 50 dari {daftar.length} — persempit filter.</p>
      )}
    </BagianStat>
  );
}
