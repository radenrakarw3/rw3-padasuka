import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, Home, User, ExternalLink } from "lucide-react";
import { toWhatsappLink } from "@/components/kependudukan/warga-form";
import { StatusKependudukanBadge } from "@/components/kependudukan/status-kependudukan-badge";
import { BagianStat } from "@/components/admin/kependudukan-stats-ui";
import { KkTagEditor } from "@/components/admin/kk-tag-editor";
import { parseKkLabelRw } from "@shared/kk-label-rw";
import { cn } from "@/lib/utils";

export type WargaCariRow = {
  id: number;
  kkId: number;
  namaLengkap: string;
  nik: string;
  kedudukanKeluarga: string;
  nomorWhatsapp?: string | null;
  jenisKelamin?: string | null;
  statusKependudukan?: string | null;
  nomorKk: string;
  rt: number;
  alamat: string;
};

export type KkCariMeta = {
  id: number;
  labelRw?: string | null;
};

type KkGroup = {
  kkId: number;
  nomorKk: string;
  rt: number;
  alamat: string;
  labelRw: string | null;
  anggota: WargaCariRow[];
  matchedIds: Set<number>;
};

const MAX_KK = 10;

function sortAnggota(a: WargaCariRow, b: WargaCariRow) {
  if (a.kedudukanKeluarga === "Kepala Keluarga") return -1;
  if (b.kedudukanKeluarga === "Kepala Keluarga") return 1;
  return a.namaLengkap.localeCompare(b.namaLengkap, "id");
}

function buildKkGroups(
  matches: WargaCariRow[],
  allWarga: WargaCariRow[],
  kkById: Map<number, KkCariMeta>,
): KkGroup[] {
  const kkIds = [...new Set(matches.map((m) => m.kkId))].slice(0, MAX_KK);

  return kkIds
    .map((kkId) => {
      const anggota = allWarga.filter((w) => w.kkId === kkId);
      const first = anggota[0];
      if (!first) return null;

      return {
        kkId,
        nomorKk: first.nomorKk,
        rt: first.rt,
        alamat: first.alamat,
        labelRw: kkById.get(kkId)?.labelRw ?? null,
        anggota: [...anggota].sort(sortAnggota),
        matchedIds: new Set(matches.filter((m) => m.kkId === kkId).map((m) => m.id)),
      };
    })
    .filter((g): g is KkGroup => g !== null)
    .sort((a, b) => a.rt - b.rt || a.nomorKk.localeCompare(b.nomorKk));
}

function AnggotaCard({
  warga,
  highlighted,
}: {
  warga: WargaCariRow;
  highlighted: boolean;
}) {
  return (
    <Card
      className={cn(
        "shadow-none",
        highlighted && "ring-2 ring-brand/40 bg-brand/[0.03]",
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="rounded-lg bg-muted p-2 shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight break-words">{warga.namaLengkap}</p>
            <p className="text-xs text-muted-foreground mt-0.5 break-all">NIK {warga.nik}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {warga.kedudukanKeluarga}
              </Badge>
              {warga.jenisKelamin && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {warga.jenisKelamin}
                </Badge>
              )}
              <StatusKependudukanBadge status={warga.statusKependudukan} />
            </div>
          </div>
        </div>
        <div className="pt-1 border-t">
          {warga.nomorWhatsapp ? (
            <Button size="sm" variant="outline" className="text-sm text-green-700 w-full sm:text-xs" asChild>
              <a href={toWhatsappLink(warga.nomorWhatsapp)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-1.5 sm:w-3 sm:h-3" />
                WhatsApp
              </a>
            </Button>
          ) : (
            <Badge variant="outline" className="text-xs w-full justify-center py-1.5 font-normal text-muted-foreground">
              Belum ada nomor WA
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function KependudukanCariWarga({
  wargaList,
  kkList = [],
  polos,
}: {
  wargaList: WargaCariRow[];
  kkList?: KkCariMeta[];
  polos?: boolean;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const kkById = useMemo(() => new Map(kkList.map((k) => [k.id, k])), [kkList]);

  const groups = useMemo(() => {
    if (debounced.length < 2) return [];

    const matches = wargaList.filter((w) => {
      const tags = parseKkLabelRw(kkById.get(w.kkId)?.labelRw).join(" ").toLowerCase();
      return (
        w.namaLengkap.toLowerCase().includes(debounced) ||
        w.nik.includes(debounced) ||
        w.nomorKk.includes(debounced) ||
        w.alamat.toLowerCase().includes(debounced) ||
        tags.includes(debounced)
      );
    });

    return buildKkGroups(matches, wargaList, kkById);
  }, [debounced, wargaList, kkById]);

  const truncated = debounced.length >= 2 && groups.length >= MAX_KK;

  return (
    <BagianStat
      polos={polos}
      title="Cari Warga"
      description="Nama, NIK, nomor KK, alamat, atau tag — di kartu KK Anda bisa menilai & menandai tindak lanjut"
    >
      <div className="relative max-w-xl">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ketik untuk mencari warga..."
          type="search"
          enterKeyHint="search"
          aria-label="Cari warga"
          className="pl-9"
        />
      </div>

      {debounced.length > 0 && debounced.length < 2 && (
        <p className="text-sm text-muted-foreground">Ketik minimal 2 karakter.</p>
      )}

      {debounced.length >= 2 && groups.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">Tidak ditemukan warga yang cocok.</p>
      )}

      {truncated && (
        <p className="text-xs text-muted-foreground">
          Menampilkan {MAX_KK} KK pertama — persempit kata kunci untuk hasil lebih spesifik.
        </p>
      )}

      <div className="space-y-4">
        {groups.map((kk) => (
          <Card key={kk.kkId} className="overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-3 bg-muted/30 sm:px-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand/10 p-2 shrink-0">
                  <Home className="w-4 h-4 text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold break-all">KK {kk.nomorKk}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 break-words sm:text-xs">{kk.alamat}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        RT {String(kk.rt).padStart(2, "0")} · {kk.anggota.length} anggota
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-8 shrink-0 gap-1 text-xs">
                      <Link href={`/admin/kelola-warga/keluarga/${kk.kkId}`}>
                        Buka KK
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
              <KkTagEditor
                kkId={kk.kkId}
                labelRw={kk.labelRw}
                ringkas
                invalidateKeys={[["/api/warga-with-kk"]]}
              />
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {kk.anggota.map((w) => (
                  <AnggotaCard
                    key={w.id}
                    warga={w}
                    highlighted={kk.matchedIds.has(w.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </BagianStat>
  );
}
