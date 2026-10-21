import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { ArrowLeft, Gavel, ShieldAlert, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { ambilAduanJson } from "@/hooks/use-aduan-admin";
import { ADUAN_ROUTES, LencanaPrioritas, LencanaStatus, formatWaktu } from "@/components/aduan/aduan-ui";
import { ItemTeguran } from "./detail";
import {
  JENIS_TERADU_LABEL, KATEGORI_ADUAN_INFO, TINGKAT_TEGURAN, TINGKAT_TEGURAN_INFO,
  type JenisTeradu, type KategoriAduan, type StatusTeguran, type TingkatTeguran,
} from "@shared/aduan";

type Rapor = {
  kunci: string;
  nama: string;
  jenis: JenisTeradu;
  alamat: string | null;
  aduan: { id: number; nomor: string; kategori: KategoriAduan; judul: string; status: string; prioritas: string; dibuat: string }[];
  teguran: { id: number; tingkat: TingkatTeguran; pelanggaran: string; kewajiban: string; tenggat: string | null; suratId: number | null; nomorSurat: string | null; status: StatusTeguran; caraSerah: string | null; dibuat: string }[];
  saranTingkat: TingkatTeguran | null;
};

export default function AdminAduanTeradu() {
  const kunci = new URLSearchParams(useSearch()).get("kunci") ?? "";
  const qk = ["/api/admin/aduan/teradu", kunci];
  const { data: r, isLoading, error } = useQuery<Rapor>({
    queryKey: qk,
    queryFn: () => ambilAduanJson(`/api/admin/aduan/teradu?kunci=${encodeURIComponent(kunci)}`),
    enabled: !!kunci,
  });

  if (isLoading) return <Skeleton className="h-64 w-full max-w-4xl rounded-2xl" />;
  if (error || !r) return <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">{(error as Error)?.message ?? "Pilih pihak dari halaman aduan"}</p>;

  const aktif = r.teguran.filter((t) => t.status !== "dicabut");
  const tertinggi = aktif.reduce((m, t) => Math.max(m, TINGKAT_TEGURAN.indexOf(t.tingkat)), -1);
  const bersih = aktif.length === 0;

  return (
    <div className="max-w-4xl space-y-4">
      <Link href={ADUAN_ROUTES.admin} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" /> Pusat aduan
      </Link>
      <div className={`rounded-2xl border-2 p-5 ${bersih ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
        <div className="flex items-start gap-3">
          {bersih ? <ShieldCheck className="h-10 w-10 text-green-700" /> : <ShieldAlert className="h-10 w-10 text-red-700" />}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rapor pihak teradu · {JENIS_TERADU_LABEL[r.jenis] ?? r.jenis}</p>
            <h1 className="text-2xl font-extrabold">{r.nama}</h1>
            {r.alamat && <p className="text-sm text-muted-foreground">{r.alamat}</p>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/70 p-2"><p className="text-2xl font-bold">{r.aduan.length}</p><p className="text-xs">aduan</p></div>
          <div className="rounded-xl bg-white/70 p-2"><p className="text-2xl font-bold">{aktif.length}</p><p className="text-xs">teguran</p></div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-sm font-bold">{tertinggi >= 0 ? TINGKAT_TEGURAN_INFO[TINGKAT_TEGURAN[tertinggi]].label : "—"}</p>
            <p className="text-xs">tingkat tertinggi</p>
          </div>
        </div>
        <p className="mt-3 text-sm">
          Langkah berikutnya bila ada pelanggaran baru:{" "}
          <b>{r.saranTingkat ? TINGKAT_TEGURAN_INFO[r.saranTingkat].label : "teruskan ke Kelurahan Padasuka (SP-3 sudah diberikan)"}</b>
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-bold"><Gavel className="h-4 w-4" />Riwayat teguran</h2>
        {r.teguran.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada teguran.</p>
          : r.teguran.map((t) => <ItemTeguran key={t.id} t={t} onBerubah={() => queryClient.invalidateQueries({ queryKey: qk })} />)}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">Aduan tentang pihak ini</h2>
        {r.aduan.map((a) => (
          <Link key={a.id} href={`${ADUAN_ROUTES.admin}/${a.id}`} className="block rounded-xl border bg-card p-3 hover:border-brand/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{a.nomor}</span>
              <LencanaPrioritas prioritas={a.prioritas} />
              <LencanaStatus status={a.status} />
            </div>
            <p className="font-semibold">{a.judul}</p>
            <p className="text-xs text-muted-foreground">{KATEGORI_ADUAN_INFO[a.kategori]?.label} · {formatWaktu(a.dibuat)}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
