import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rw3lawLayout } from "@/components/gov/rw3law-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { rw3lawKategoriLabels, rw3lawKategoriOptions } from "@/lib/constants";
import { fetchPublicJson } from "@/lib/queryClient";
import { formatTanggalHukum } from "@/lib/rw3law-format";
import { cn } from "@/lib/utils";
import { RW3LAW_LIST_PATH, rw3lawDetailPath } from "@/pages/public/rw3law/paths";

type Rw3lawListItem = {
  id: number;
  judul: string;
  slug: string;
  kategori: string;
  versi: string | null;
  tanggalBerlaku: string | null;
  rtAsal: number | null;
  cuplikan: string;
};

function nomorBerkas(id: number) {
  return `RW3LAW-${String(id).padStart(4, "0")}`;
}

/** Kolom tabel: berkas | judul (fleksibel) | kategori | berlaku */
const TABLE_GRID =
  "grid grid-cols-[5.25rem_minmax(0,1fr)_4.75rem_4.25rem] sm:grid-cols-[6.5rem_minmax(0,1fr)_5.5rem_5rem] md:grid-cols-[7rem_minmax(0,1fr)_6.5rem_5.75rem] gap-x-2 sm:gap-x-3 items-center";

function formatBerlakuSingkat(tanggal: string | null) {
  if (!tanggal) return "—";
  const penuh = formatTanggalHukum(tanggal);
  const parts = penuh.split(" ");
  if (parts.length >= 3) return `${parts[0]} ${parts[1]} ${parts[2]}`;
  return penuh;
}

export default function Rw3lawIndex() {
  const [filterKategori, setFilterKategori] = useState("semua");

  const {
    data: list = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<Rw3lawListItem[]>({
    queryKey: ["/api/public/rw3law"],
    queryFn: ({ signal }) => fetchPublicJson<Rw3lawListItem[]>("/api/public/rw3law", signal),
    retry: 1,
    staleTime: 60_000,
  });

  const showLoading = isPending || (isFetching && list.length === 0);

  const filtered = useMemo(() => {
    if (filterKategori === "semua") return list;
    return list.filter((d) => d.kategori === filterKategori);
  }, [list, filterKategori]);

  return (
    <Rw3lawLayout title="Daftar Peraturan" backHref="/" subtitle="RW3LAW · Peraturan Warga">
      <div className="bg-[#fffef9] border border-[#d4cfc4] shadow-sm mb-6 px-6 py-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-[#1a2744] font-semibold mb-2">
          Arsip Resmi
        </p>
        <h2 className="font-serif text-2xl font-bold text-[#1a2744] mb-3">
          Peraturan Warga RW 03
        </h2>
        <p className="font-serif text-sm text-[#4a4a4a] max-w-md mx-auto leading-relaxed">
          Daftar peraturan lingkungan yang telah disahkan pengurus RW dan wajib dipatuhi seluruh
          warga, diterbitkan dalam bentuk peraturan resmi berkas RW3LAW.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5 min-w-[200px]">
          <Label className="text-[11px] uppercase tracking-wider text-[#1a2744] font-semibold">
            Filter kategori
          </Label>
          <Select value={filterKategori} onValueChange={setFilterKategori}>
            <SelectTrigger
              className="bg-[#fffef9] border-[#d4cfc4] font-serif"
              data-testid="filter-kategori-rw3law"
            >
              <SelectValue placeholder="Semua kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua kategori</SelectItem>
              {rw3lawKategoriOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-serif">
          {filtered.length} peraturan tercatat
        </p>
      </div>

      {isError ? (
        <div className="bg-[#fffef9] border border-[#d4cfc4] px-8 py-12 text-center">
          <AlertCircle className="w-10 h-10 text-[#8b4513] mx-auto mb-3" aria-hidden />
          <p className="font-serif text-sm text-[#4a4a4a] mb-4">
            {error instanceof Error ? error.message : "Gagal memuat daftar peraturan"}
          </p>
          <Button
            type="button"
            variant="outline"
            className="font-serif border-[#1a2744] text-[#1a2744]"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba lagi
          </Button>
        </div>
      ) : showLoading ? (
        <div
          className="flex justify-center py-16 bg-[#fffef9] border border-[#d4cfc4]"
          data-testid="rw3law-loading"
        >
          <Loader2 className="w-8 h-8 animate-spin text-[#1a2744]" aria-label="Memuat peraturan" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#fffef9] border border-[#d4cfc4] px-8 py-12 text-center">
          <FileText className="w-10 h-10 text-[#8b7355] mx-auto mb-3" aria-hidden />
          <p className="font-serif text-sm text-[#4a4a4a]">
            Tidak ada peraturan untuk kategori ini.
          </p>
        </div>
      ) : (
        <div className="bg-[#fffef9] border border-[#d4cfc4] overflow-hidden rounded-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[320px] sm:min-w-[520px]">
              <div
                className={cn(
                  TABLE_GRID,
                  "bg-[#1a2744] text-[9px] sm:text-[10px] uppercase tracking-wide sm:tracking-widest text-[#e8e4dc] font-semibold px-2 sm:px-3 py-3",
                )}
              >
                <div className="pr-1">No. Berkas</div>
                <div className="pr-1 min-w-0">Judul</div>
                <div className="text-center leading-tight px-0.5">Kategori</div>
                <div className="text-right leading-tight pl-0.5 whitespace-nowrap">Berlaku</div>
              </div>
              <ul className="divide-y divide-[#e5e0d5]">
                {filtered.map((d, idx) => (
                  <li key={d.id}>
                    <Link
                      href={rw3lawDetailPath(d.slug)}
                      className={cn(
                        "block transition-colors hover:bg-[#f0ebe3] px-2 sm:px-3 py-3.5",
                        idx % 2 === 1 && "bg-[#faf8f4]",
                      )}
                    >
                      <div className={TABLE_GRID}>
                        <div className="font-serif text-[10px] sm:text-xs font-semibold text-[#1a2744] tabular-nums leading-tight pr-1">
                          {nomorBerkas(d.id)}
                        </div>
                        <div className="min-w-0 pr-2">
                          <p className="font-serif text-[13px] sm:text-[15px] font-semibold text-[#1a2744] leading-snug line-clamp-2">
                            {d.judul}
                          </p>
                        </div>
                        <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#5c5c5c] text-center leading-tight px-0.5 line-clamp-2 break-words hyphens-auto">
                          {rw3lawKategoriLabels[d.kategori] ?? d.kategori}
                        </div>
                        <div className="text-[10px] sm:text-xs font-serif text-[#4a4a4a] text-right tabular-nums leading-tight pl-0.5 whitespace-nowrap">
                          {formatBerlakuSingkat(d.tanggalBerlaku)}
                        </div>
                      </div>
                      <p className="font-serif text-xs text-[#6b6b6b] mt-2 line-clamp-2 sm:hidden border-t border-[#e5e0d5]/80 pt-2">
                        {d.cuplikan}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-center font-serif text-xs text-[#6b6b6b] italic px-4">
        Pilih baris berkas untuk membaca teks lengkap peraturan yang telah disahkan.
      </p>
    </Rw3lawLayout>
  );
}
