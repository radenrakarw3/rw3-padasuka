import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rw3lawLayout } from "@/components/gov/rw3law-layout";
import { FeatureExplain } from "@/components/gov/feature-explain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { rw3lawKategoriOptions } from "@/lib/constants";
import { fetchPublicJson } from "@/lib/queryClient";
import {
  Rw3lawRegulationTable,
  type Rw3lawPublicListItem,
} from "@/components/gov/rw3law-regulation-table";
import { RW3LAW_LIST_PATH } from "@/pages/public/rw3law/paths";
import { groupByTahunNomor } from "@shared/rw3law-archive";

function filterByKategori(items: Rw3lawPublicListItem[], kategori: string) {
  if (kategori === "semua") return items;
  return items.filter((d) => d.kategori === kategori);
}

export default function Rw3lawIndex() {
  const [filterKategori, setFilterKategori] = useState("semua");

  const berlakuQuery = useQuery({
    queryKey: ["/api/public/rw3law"],
    queryFn: ({ signal }) =>
      fetchPublicJson<Rw3lawPublicListItem[]>("/api/public/rw3law", signal),
    retry: 1,
    staleTime: 60_000,
  });

  const dicabutQuery = useQuery({
    queryKey: ["/api/public/rw3law/arsip/dicabut"],
    queryFn: ({ signal }) =>
      fetchPublicJson<Rw3lawPublicListItem[]>("/api/public/rw3law/arsip/dicabut", signal),
    retry: 1,
    staleTime: 60_000,
  });

  const isError = berlakuQuery.isError || dicabutQuery.isError;
  const error = berlakuQuery.error ?? dicabutQuery.error;
  const showLoading =
    (berlakuQuery.isPending || dicabutQuery.isPending) &&
    !berlakuQuery.data &&
    !dicabutQuery.data;

  const berlaku = useMemo(
    () => filterByKategori(berlakuQuery.data ?? [], filterKategori),
    [berlakuQuery.data, filterKategori],
  );
  const dicabut = useMemo(
    () => filterByKategori(dicabutQuery.data ?? [], filterKategori),
    [dicabutQuery.data, filterKategori],
  );

  const dicabutByTahun = useMemo(() => groupByTahunNomor(dicabut), [dicabut]);
  const dicabutTanpaTahun = useMemo(
    () => dicabut.filter((d) => !d.tahunNomor),
    [dicabut],
  );

  const refetch = () => {
    berlakuQuery.refetch();
    dicabutQuery.refetch();
  };

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
          Peraturan berlaku dan arsip yang telah dicabut dipisah. Yang masih berlaku wajib dipatuhi
          warga.
        </p>
      </div>

      <FeatureExplain title="Untuk warga RW 03" className="mb-6">
        <p>
          RW3LAW berisi peraturan resmi lingkungan RW — tentang ketertiban, kebersihan, hewan
          peliharaan, renovasi rumah, dan lainnya. Baca peraturan yang masih berlaku dan patuhi
          sebagai pedoman hidup bertetangga.
        </p>
        <p>
          Peraturan yang sudah dicabut tetap bisa dibuka sebagai arsip. Klik judul peraturan untuk
          membaca teks lengkap.
        </p>
      </FeatureExplain>

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
          {berlaku.length} berlaku · {dicabut.length} dicabut
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
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-2 flex-wrap">
              <h3 className="font-serif text-lg font-bold text-[#1a2744]">Peraturan berlaku</h3>
              <span className="text-[11px] uppercase tracking-wider text-[#6b6b6b]">
                {berlaku.length} dokumen
              </span>
            </div>
            <Rw3lawRegulationTable
              items={berlaku}
              variant="berlaku"
              emptyMessage="Tidak ada peraturan berlaku untuk filter ini."
            />
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between gap-2 flex-wrap">
              <h3 className="font-serif text-lg font-bold text-[#5c5c5c]">Arsip dicabut</h3>
              <span className="text-[11px] uppercase tracking-wider text-[#6b6b6b]">
                {dicabut.length} dokumen
              </span>
            </div>
            <p className="font-serif text-xs text-[#6b6b6b] mb-3 italic">
              Dikelompokkan per tahun penomeran. Tidak berlaku — arsip referensi saja.
            </p>
            {dicabut.length === 0 ? (
              <Rw3lawRegulationTable
                items={[]}
                variant="dicabut"
                emptyMessage="Belum ada peraturan yang dicabut."
              />
            ) : (
              <div className="space-y-8">
                {dicabutByTahun.map(({ tahun, items }) => (
                  <div key={tahun}>
                    <p className="font-serif text-xs uppercase tracking-widest text-[#6b6b6b] mb-2">
                      Tahun {tahun}
                    </p>
                    <Rw3lawRegulationTable
                      items={items}
                      variant="dicabut"
                      emptyMessage=""
                    />
                  </div>
                ))}
                {dicabutTanpaTahun.length > 0 && (
                  <div>
                    <p className="font-serif text-xs uppercase tracking-widest text-[#6b6b6b] mb-2">
                      Arsip lainnya
                    </p>
                    <Rw3lawRegulationTable
                      items={dicabutTanpaTahun}
                      variant="dicabut"
                      emptyMessage=""
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      <p className="mt-6 text-center font-serif text-xs text-[#6b6b6b] italic px-4">
        Pilih baris berkas untuk membaca teks lengkap. Peraturan dicabut ditandai tidak berlaku.
      </p>
    </Rw3lawLayout>
  );
}
