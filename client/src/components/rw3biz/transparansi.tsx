import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { readJsonSafely } from "@/lib/queryClient";
import { bulanIni, formatRp, type TarifKontribusi } from "@shared/rw3biz-kontribusi";
import {
  ALASAN_VOUCHER,
  CARA_KERJA_VOUCHER,
  LABEL_SETOR_SUMBANGSIH,
  TRANSPARANSI_SUMBANGSIH,
} from "@shared/rw3biz-pernyataan";

type TarifPublik = Omit<TarifKontribusi, "programMulai">;

type Transparansi = {
  periode: string;
  target: number;
  kontribusiMasuk: number;
  voucher: { kontribusi: number; denda: number; terkumpul: number; surplus: number; tersalur: number };
  usahaAktif: number;
  pos: { label: string; keterangan: string | null; anggaran: number; realisasi: number }[];
  tarif: TarifPublik;
};

export function useTarifPublik(enabled = true) {
  return useQuery<TarifPublik>({
    queryKey: ["/api/public/rw3biz/tarif"],
    queryFn: async () => {
      const res = await fetch("/api/public/rw3biz/tarif");
      if (!res.ok) throw new Error("Gagal memuat tarif");
      return readJsonSafely<TarifPublik>(res);
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Aturan RW3BIZ yang berlaku: sumbangsih & penanganan pelanggaran — angka dari pengaturan admin. */
export function AturanRw3biz() {
  const { data: t, isLoading } = useTarifPublik();
  if (isLoading || !t) return <Skeleton className="h-40 w-full" />;
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium">Pelanggaran & aduan</p>
        <p className="text-xs">
          Aduan warga dicek dulu ke lokasi; identitas pelapor dirahasiakan. Pelanggaran yang terbukti ditangani lewat teguran resmi
          bertingkat (teguran lisan, SP-1, SP-2, SP-3) tanpa denda uang.
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-medium">Sumbangsih & setor</p>
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
          <li>Seikhlasnya — boleh Rp0; izin usaha tetap berlaku. Tidak ada tarif atau nominal minimal.</li>
          <li>Setor {LABEL_SETOR_SUMBANGSIH}.</li>
          <li>Sumbangsih boleh diubah, dikurangi, atau dihentikan kapan saja lewat WhatsApp sekretariat.</li>
          <li>Usaha sepi, lansia, disabilitas, atau penerima bansos dianjurkan mengisi Rp0.</li>
        </ul>
      </div>
      <div className="space-y-1">
        <p className="font-medium">Transparansi & anti-oknum</p>
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
          {TRANSPARANSI_SUMBANGSIH.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <PenjelasanVoucher target={t.targetBulanan} />
    </div>
  );
}

export function PenjelasanVoucher({ target }: { target: number }) {
  return (
    <div className="space-y-1 rounded-lg border border-[hsl(40,45%,55%)]/50 bg-[hsl(40,45%,55%)]/10 p-3">
      <p className="font-medium">Cara kerja voucher belanja warga</p>
      <p className="text-xs">
        Usulan anggaran program voucher + kelebihan dana (di atas {formatRp(target)}/bulan bila terkumpul lebih) masuk ke kas
        RW dan disalurkan sebagai <strong>voucher belanja warga</strong> ke keluarga prasejahtera — dibelanjakan di usaha
        kontributor.
      </p>
      <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
        {CARA_KERJA_VOUCHER.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">{ALASAN_VOUCHER}</p>
    </div>
  );
}

/** Laporan publik: sumbangsih masuk dan pemakaiannya per program (pos anggaran). */
export function TransparansiKontribusi() {
  const [bulan, setBulan] = useState(bulanIni());
  const { data, isLoading } = useQuery<Transparansi>({
    queryKey: ["/api/public/rw3biz/transparansi", bulan],
    queryFn: async () => {
      const res = await fetch(`/api/public/rw3biz/transparansi?bulan=${bulan}`);
      if (!res.ok) throw new Error("Gagal memuat laporan");
      return readJsonSafely<Transparansi>(res);
    },
  });
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Periode</p>
        <Input type="month" value={bulan} onChange={(e) => e.target.value && setBulan(e.target.value)} className="h-9 w-40" />
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">Sumbangsih masuk</p>
              <p className="font-semibold tabular-nums">{formatRp(data.voucher.kontribusi)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">Kebutuhan / bulan</p>
              <p className="font-semibold tabular-nums">{formatRp(data.target)}</p>
              <p className="text-[11px] text-muted-foreground">{data.usahaAktif} usaha terdaftar</p>
            </div>
          </div>
          <div className="rounded-lg border border-[hsl(40,45%,55%)]/50 bg-[hsl(40,45%,55%)]/10 p-2 text-xs">
            {data.voucher.surplus > 0 ? (
              <p>
                Kelebihan bulan ini <strong className="tabular-nums">{formatRp(data.voucher.surplus)}</strong> dijadikan voucher belanja
                warga di usaha RW3BIZ
                {data.voucher.tersalur > 0 ? ` · sudah ditukar ${formatRp(data.voucher.tersalur)}` : ""}.
              </p>
            ) : (
              <p>
                Kurang {formatRp(Math.max(0, data.target - data.voucher.terkumpul))} lagi untuk memenuhi kebutuhan. Bila melebihi, kelebihannya
                dijadikan voucher belanja warga di usaha RW3BIZ.
              </p>
            )}
          </div>
          <ul className="space-y-1.5">
            {data.pos.map((p) => (
              <li key={p.label} className="space-y-0.5">
                <div className="flex justify-between gap-2 text-xs">
                  <span>
                    {p.label}
                    {p.keterangan ? <span className="text-muted-foreground"> — {p.keterangan}</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatRp(p.realisasi)} / {formatRp(p.anggaran)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${p.anggaran ? Math.min(100, Math.round((p.realisasi / p.anggaran) * 100)) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
