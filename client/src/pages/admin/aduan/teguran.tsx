import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { ArrowLeft, Gavel } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { KUNCI_RINGKASAN_ADUAN, ambilAduanJson } from "@/hooks/use-aduan-admin";
import { ADUAN_ROUTES } from "@/components/aduan/aduan-ui";
import { ItemTeguran } from "./detail";
import { TINGKAT_TEGURAN, TINGKAT_TEGURAN_INFO, type StatusTeguran, type TingkatTeguran } from "@shared/aduan";

type BarisTeguran = {
  id: number; aduanId: number | null; aduanNomor: string | null; teraduKunci: string; teraduNama: string; tingkat: TingkatTeguran;
  pelanggaran: string; kewajiban: string; tenggat: string | null; suratId: number | null; nomorSurat: string | null;
  status: StatusTeguran; caraSerah: string | null; dibuat: string; lewat: boolean;
};

const FILTER = [
  { nilai: "aktif", label: "Menunggu perbaikan" },
  { nilai: "lewat", label: "Tenggat lewat" },
  { nilai: "semua", label: "Semua riwayat" },
];

export default function AdminAduanTeguran() {
  const awal = new URLSearchParams(useSearch()).get("filter") ?? "aktif";
  const [filter, setFilter] = useState(FILTER.some((f) => f.nilai === awal) ? awal : "aktif");
  const kunci = ["/api/admin/aduan/teguran", filter];
  const { data: list = [], isLoading, error } = useQuery<BarisTeguran[]>({
    queryKey: kunci,
    queryFn: () => ambilAduanJson(`/api/admin/aduan/teguran?filter=${filter}`),
  });
  const segarkan = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/aduan/teguran"], exact: false });
    queryClient.invalidateQueries({ queryKey: KUNCI_RINGKASAN_ADUAN });
  };
  const perTingkat = TINGKAT_TEGURAN.map((t) => ({ t, n: list.filter((x) => x.tingkat === t).length }));

  return (
    <div className="max-w-5xl space-y-4">
      <Link href={ADUAN_ROUTES.admin} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" /> Pusat aduan
      </Link>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-700 text-white"><Gavel className="h-6 w-6" /></span>
        <div>
          <h1 className="text-2xl font-bold">Teguran & Surat Peringatan</h1>
          <p className="text-sm text-muted-foreground">Pantau batas waktu perbaikan. Bila tidak dipatuhi, buka aduannya untuk menerbitkan tingkat berikutnya.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {perTingkat.map(({ t, n }) => (
          <div key={t} className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{n}</p>
            <p className="text-xs text-muted-foreground">{TINGKAT_TEGURAN_INFO[t].label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {FILTER.map((f) => (
          <button key={f.nilai} type="button" onClick={() => setFilter(f.nilai)}
            className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium", filter === f.nilai ? "border-brand bg-brand text-white" : "bg-card")}>
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(error as Error).message}</p>
      ) : isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Tidak ada teguran pada filter ini.</p>
      ) : (
        <div className="space-y-2">
          {list.map((t) => (
            <div key={t.id} className="space-y-1">
              <ItemTeguran t={t} onBerubah={segarkan} />
              <div className="flex gap-3 px-1 text-xs">
                {t.aduanId && <Link href={`${ADUAN_ROUTES.admin}/${t.aduanId}`} className="font-semibold text-brand underline">Buka aduan</Link>}
                <Link href={`${ADUAN_ROUTES.adminTeradu}?kunci=${encodeURIComponent(t.teraduKunci)}`} className="font-semibold text-brand underline">Rapor teradu</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
