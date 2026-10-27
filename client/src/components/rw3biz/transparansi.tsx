import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { readJsonSafely } from "@/lib/queryClient";
import {
  JENIS_PELANGGARAN_INFO,
  KENDARAAN_BIZ,
  TINGKAT_PELANGGARAN,
  TINGKAT_PELANGGARAN_LABEL,
  bulanIni,
  formatRp,
  type JenisPelanggaran,
  type TarifKontribusi,
} from "@shared/rw3biz-kontribusi";

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

function Baris({ kiri, kanan }: { kiri: React.ReactNode; kanan: React.ReactNode }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-muted-foreground">{kiri}</span>
      <span className="tabular-nums text-right">{kanan}</span>
    </li>
  );
}

/** Aturan RW3BIZ yang berlaku: sumbangsih, denda razia & pelanggaran — angka dari pengaturan admin. */
export function AturanRw3biz() {
  const { data: t, isLoading } = useTarifPublik();
  if (isLoading || !t) return <Skeleton className="h-40 w-full" />;
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium">Razia kendaraan</p>
        <p className="text-xs">
          Kendaraan menuju usaha yang tidak didaftarkan (milik maupun charter) dikenai denda per kendaraan berikut. Bila berulang dalam
          12 bulan, denda dikalikan pengali pengulangan di bawah (minimal 1×). Denda disetor ke Kas RW 03 dengan kwitansi.
        </p>
        <ul className="space-y-0.5 text-xs">
          {KENDARAAN_BIZ.map((k) => (
            <Baris key={k.kode} kiri={k.label} kanan={formatRp(Math.round(t[k.kode] * t.dendaRaziaKali))} />
          ))}
        </ul>
      </div>
      <div className="space-y-1">
        <p className="font-medium">Denda pelanggaran (aduan warga & temuan petugas)</p>
        <p className="text-xs">Denda = denda dasar jenis × tingkat × pengulangan dalam 12 bulan, paling banyak {formatRp(t.dendaMaks)}.</p>
        <ul className="space-y-0.5 text-xs">
          {(Object.keys(t.dendaPelanggaran) as Exclude<JenisPelanggaran, "lainnya">[]).map((j) => (
            <Baris key={j} kiri={JENIS_PELANGGARAN_INFO[j].label} kanan={formatRp(t.dendaPelanggaran[j])} />
          ))}
        </ul>
        <ul className="space-y-0.5 text-xs">
          <Baris
            kiri="Tingkat"
            kanan={TINGKAT_PELANGGARAN.map((k) => `${TINGKAT_PELANGGARAN_LABEL[k].toLowerCase()} ×${t.dendaTingkat[k]}`).join(" · ")}
          />
          <Baris
            kiri="Pengulangan"
            kanan={t.dendaPengulangan.map((p, i) => `ke-${i + 1}${i === t.dendaPengulangan.length - 1 ? "+" : ""}: ${p === 0 ? "teguran" : `×${p}`}`).join(" · ")}
          />
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Aduan warga dicek dulu ke lokasi; identitas pelapor dirahasiakan. Pelanggaran berat langsung didenda walau pertama kali.
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-medium">Kemudahan</p>
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
          <li>Tenggang {t.tenggangHari} hari tiap bulan, tanpa denda. Boleh dicicil.</li>
          <li>Sumbangsih boleh diubah saat memperbarui izin, atau ajukan lewat halaman cek status.</li>
          <li>Keringanan sementara bagi lansia, disabilitas, penerima bansos, atau usaha yang sedang sepi — ajukan ke pengurus.</li>
        </ul>
      </div>
      <PenjelasanVoucher target={t.targetBulanan} />
    </div>
  );
}

export function PenjelasanVoucher({ target }: { target: number }) {
  return (
    <div className="space-y-1 rounded-lg border border-[hsl(40,45%,55%)]/50 bg-[hsl(40,45%,55%)]/10 p-3">
      <p className="font-medium">Kelebihan dana kembali ke warga & usaha</p>
      <p className="text-xs">
        Kebutuhan anggaran RW {formatRp(target)} per bulan. Bila sumbangsih ditambah denda yang terkumpul dalam sebulan{" "}
        <strong>melebihi</strong> kebutuhan itu, kelebihannya dijadikan <strong>voucher belanja warga RW 03</strong>.
      </p>
      <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
        <li>Voucher hanya bisa dibelanjakan di usaha RW3BIZ yang tertib menyetor sumbangsih (tidak menunggak).</li>
        <li>Usaha yang menerima voucher menukarkannya ke pengurus dan dibayar penuh dari Kas RW 03.</li>
        <li>Jadi uang sumbangsih berputar lagi ke usaha di lingkungan sendiri, dan pencairannya tercatat di Kas RW.</li>
      </ul>
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
              <p className="text-xs text-muted-foreground">Sumbangsih + denda masuk</p>
              <p className="font-semibold tabular-nums">{formatRp(data.voucher.terkumpul)}</p>
              {data.voucher.denda > 0 && (
                <p className="text-[11px] text-muted-foreground">termasuk denda {formatRp(data.voucher.denda)}</p>
              )}
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
