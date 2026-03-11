import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileText, ScrollText, Download, Search, Calendar, File, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import type { SuratWarga, SuratRw, Warga } from "@shared/schema";
import { generateSuratPDF } from "@/lib/pdf-surat";

type ArchiveItem = {
  type: "warga" | "rw";
  id: number;
  jenisSurat: string;
  perihal: string;
  nomorSurat: string | null;
  isiSurat: string | null;
  fileSurat: string | null;
  status: string;
  pemohon: string;
  tanggal: string;
  raw: SuratWarga | SuratRw;
};

export default function AdminArsipSurat() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "warga" | "rw">("all");

  const { data: suratWargaList, isLoading: l1 } = useQuery<SuratWarga[]>({ queryKey: ["/api/surat-warga"] });
  const { data: suratRwList, isLoading: l2 } = useQuery<SuratRw[]>({ queryKey: ["/api/surat-rw"] });
  const { data: wargaList } = useQuery<Warga[]>({ queryKey: ["/api/warga"] });

  const getWargaName = (id: number) => wargaList?.find(w => w.id === id)?.namaLengkap || "Warga";

  const archiveItems = useMemo<ArchiveItem[]>(() => {
    const items: ArchiveItem[] = [];

    (suratWargaList || [])
      .filter(s => s.status === "disetujui")
      .forEach(s => {
        items.push({
          type: "warga",
          id: s.id,
          jenisSurat: s.jenisSurat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
          perihal: s.perihal,
          nomorSurat: s.nomorSurat,
          isiSurat: s.isiSurat,
          fileSurat: s.fileSurat || null,
          status: s.status,
          pemohon: getWargaName(s.wargaId),
          tanggal: s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "",
          raw: s,
        });
      });

    (suratRwList || [])
      .filter(s => s.nomorSurat)
      .forEach(s => {
        items.push({
          type: "rw",
          id: s.id,
          jenisSurat: s.jenisSurat,
          perihal: s.perihal,
          nomorSurat: s.nomorSurat,
          isiSurat: s.isiSurat,
          fileSurat: null,
          status: "terbit",
          pemohon: "-",
          tanggal: s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "",
          raw: s,
        });
      });

    items.sort((a, b) => {
      const da = a.raw.createdAt ? new Date(a.raw.createdAt).getTime() : 0;
      const db2 = b.raw.createdAt ? new Date(b.raw.createdAt).getTime() : 0;
      return db2 - da;
    });

    return items;
  }, [suratWargaList, suratRwList, wargaList]);

  const filtered = useMemo(() => {
    return archiveItems.filter(item => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.jenisSurat.toLowerCase().includes(q) ||
          item.perihal.toLowerCase().includes(q) ||
          (item.nomorSurat || "").toLowerCase().includes(q) ||
          item.pemohon.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [archiveItems, search, filterType]);

  const handleDownloadRw = async (item: ArchiveItem) => {
    if (!item.isiSurat) return;
    try {
      await generateSuratPDF({
        nomorSurat: item.nomorSurat,
        isiSurat: item.isiSurat,
        jenisSurat: item.jenisSurat,
        fileName: `${item.jenisSurat.replace(/\s/g, "_")}_${item.nomorSurat?.replace(/\//g, "-") || item.id}`,
      });
    } catch {
      toast({ title: "Gagal membuat PDF", variant: "destructive" });
    }
  };

  const isLoading = l1 || l2;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" data-testid="text-arsip-title">Arsip Surat</h2>
        <p className="text-xs text-muted-foreground">Daftar seluruh surat yang telah disetujui/terbit</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor surat, jenis, perihal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-sm"
            data-testid="input-search-arsip"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "warga", "rw"] as const).map(t => (
            <Button
              key={t}
              size="sm"
              variant={filterType === t ? "default" : "outline"}
              onClick={() => setFilterType(t)}
              className="text-xs"
              data-testid={`button-filter-${t}`}
            >
              {t === "all" ? "Semua" : t === "warga" ? "Surat Warga" : "Surat RW"}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} surat ditemukan</p>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Belum ada surat dalam arsip
          </CardContent>
        </Card>
      ) : (
        filtered.map(item => (
          <Card key={`${item.type}-${item.id}`} data-testid={`card-arsip-${item.type}-${item.id}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    {item.type === "warga" ? (
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    ) : (
                      <ScrollText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    )}
                    <p className="font-semibold text-sm truncate">{item.jenisSurat}</p>
                  </div>
                  {item.nomorSurat && <p className="text-xs font-medium text-primary">{item.nomorSurat}</p>}
                  <p className="text-xs text-muted-foreground">Perihal: {item.perihal}</p>
                  {item.type === "warga" && (
                    <p className="text-xs text-muted-foreground">Pemohon: {item.pemohon}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge className={`text-[10px] ${item.type === "warga" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                    {item.type === "warga" ? "Warga" : "RW"}
                  </Badge>
                  {item.type === "warga" && (
                    <Badge variant="outline" className={`text-[10px] gap-1 ${item.fileSurat ? "border-green-500 text-green-700" : "border-orange-400 text-orange-600"}`}>
                      <File className="w-3 h-3" />
                      {item.fileSurat ? "Ada Scan" : "Belum Scan"}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {item.tanggal}
                </div>
                <div className="flex gap-1">
                  {item.type === "warga" && item.fileSurat && (
                    <a
                      href={item.fileSurat}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`button-view-arsip-${item.type}-${item.id}`}
                    >
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7">
                        <ExternalLink className="w-3 h-3" /> Lihat Scan
                      </Button>
                    </a>
                  )}
                  {item.type === "rw" && item.isiSurat && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => handleDownloadRw(item)} data-testid={`button-download-arsip-${item.type}-${item.id}`}>
                      <Download className="w-3 h-3" /> PDF
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
