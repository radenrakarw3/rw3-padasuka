import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronsDown, Landmark, Scale } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useTarifPublik } from "@/components/rw3biz/transparansi";
import { formatRp } from "@shared/rw3biz-kontribusi";
import {
  ALASAN_SUMBANGSIH,
  GARANSI_ANTI_OKNUM,
  PERNYATAAN_VERSI,
  PERWAL_RW,
  pasalPernyataanSumbangsih,
  poinPersetujuan,
} from "@shared/rw3biz-pernyataan";

/** Bunyi lengkap Pasal 114 Perwal Cimahi 53/2021 beserta penerapannya pada RW3BIZ. */
export function DasarHukumPerwal({ tanpaBingkai = false }: { tanpaBingkai?: boolean }) {
  return (
    <div className={tanpaBingkai ? "space-y-3" : "space-y-3 rounded-xl border-2 border-[hsl(40,45%,55%)] bg-[hsl(40,60%,96%)] p-4"}>
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[hsl(40,45%,30%)]">
        <Scale className="h-4 w-4 shrink-0" /> Dasar hukum sumbangsih
      </p>
      <div className="text-center text-xs font-semibold uppercase leading-snug">
        {PERWAL_RW.kepala.map((baris) => (
          <p key={baris}>{baris}</p>
        ))}
      </div>
      <div className="text-center text-xs">
        <p className="font-semibold">{PERWAL_RW.bab}</p>
        <p className="text-sm font-bold">{PERWAL_RW.pasal}</p>
      </div>
      <ol className="space-y-2 text-sm leading-relaxed">
        {PERWAL_RW.ayat.map((a) => (
          <li key={a.no} className="flex gap-2">
            <span className="shrink-0 font-semibold">{a.no}</span>
            <div className="text-justify">
              {a.teks}
              {a.huruf && (
                <ul className="mt-1 space-y-0.5 pl-1">
                  {a.huruf.map((h) => (
                    <li key={h} className={h.startsWith("c.") ? "font-semibold" : undefined}>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="space-y-1 rounded-lg border border-[hsl(40,45%,55%)]/50 bg-white/70 p-3">
        <p className="text-xs font-bold uppercase tracking-wide">Penerapan pada sumbangsih RW3BIZ</p>
        <ul className="space-y-1 text-xs leading-relaxed">
          {PERWAL_RW.penerapan.map((p) => (
            <li key={p.ayat}>
              <b>{p.ayat}:</b> {p.teks}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Ringkasan Pasal 114 yang selalu terlihat, bunyi lengkapnya bisa dibuka. */
export function KutipanPerwal({ terbuka = false }: { terbuka?: boolean }) {
  return (
    <details open={terbuka} className="rounded-xl border-2 border-[hsl(40,45%,55%)] bg-[hsl(40,60%,96%)] p-3 text-sm">
      <summary className="flex cursor-pointer items-start gap-2 font-semibold">
        <Scale className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(40,45%,35%)]" />
        <span>
          Dasar hukum: {PERWAL_RW.judul}, {PERWAL_RW.pasal}
          <span className="block text-xs font-normal text-muted-foreground">
            Ayat (1) huruf a: sumber pembiayaan RW dari swadaya masyarakat. Ayat (4): dipakai sesuai Anggaran Penerimaan dan
            Pengeluaran RW. Ketuk untuk membaca bunyi lengkapnya.
          </span>
        </span>
      </summary>
      <div className="mt-3">
        <DasarHukumPerwal tanpaBingkai />
      </div>
    </details>
  );
}

/** Gambaran kebutuhan RW 03 per bulan & per tahun agar pengusaha paham ke mana sumbangsihnya. */
export function KebutuhanRw3({ ringkas = false }: { ringkas?: boolean }) {
  const { data: t, isLoading } = useTarifPublik();
  if (isLoading || !t) return <Skeleton className="h-40 w-full rounded-xl" />;
  const total = t.posAnggaran.reduce((s, p) => s + p.nominal, 0) || t.targetBulanan;
  const isi = (
    <div className="space-y-3">
      <ul className="space-y-2">
        {t.posAnggaran.map((p) => {
          const persen = total ? Math.round((p.nominal / total) * 100) : 0;
          return (
            <li key={p.id} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 font-medium">{p.label}</span>
                <span className="shrink-0 tabular-nums">{formatRp(p.nominal)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(2, persen)}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {p.keterangan ? `${p.keterangan} · ` : ""}
                {formatRp(p.nominal * 12)}/tahun · {persen}%
              </p>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 rounded-lg bg-muted/40 p-3">
        <p className="text-sm font-semibold">Manfaat bagi usaha Anda bila berkontribusi</p>
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
          {ALASAN_SUMBANGSIH.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="rounded-md border border-brand/40 bg-brand/5 p-2 text-xs font-medium leading-snug text-foreground">
          {GARANSI_ANTI_OKNUM}
        </p>
      </div>
      {!ringkas && <DasarHukumPerwal />}
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border-2 border-brand/25 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Landmark className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Kebutuhan RW 03 setiap bulan</p>
          <p className="text-2xl font-extrabold tabular-nums text-brand">{formatRp(total)}</p>
          <p className="text-xs text-muted-foreground">
            {formatRp(total * 12)} per tahun · untuk {t.posAnggaran.length} program yang dirasakan langsung oleh usaha Anda
          </p>
        </div>
      </div>
      {ringkas ? (
        <>
          <KutipanPerwal />
          <details>
            <summary className="cursor-pointer text-sm font-medium text-brand">Lihat rincian kebutuhan per program</summary>
            <div className="mt-3">{isi}</div>
          </details>
        </>
      ) : (
        isi
      )}
    </div>
  );
}

export type IdentitasPernyataan = { nama?: string; namaUsaha?: string; alamat?: string };

/** Isi Surat Pernyataan Sumbangsih untuk dibaca di layar. */
export function DokumenPernyataan({
  items,
  terminBulan,
  identitas,
}: {
  items: { label: string; nominal: number }[];
  terminBulan?: number | null;
  identitas?: IdentitasPernyataan;
}) {
  const { data: t } = useTarifPublik();
  const total = items.reduce((s, x) => s + x.nominal, 0);
  const pasal = pasalPernyataanSumbangsih({
    total,
    tenggangHari: t?.tenggangHari ?? 0,
    target: t?.targetBulanan ?? 0,
    terminBulan,
  });
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <div className="text-center">
        <p className="font-bold uppercase tracking-wide">Surat Pernyataan Sumbangsih</p>
        <p className="text-xs text-muted-foreground">RW3BIZ · versi {PERNYATAAN_VERSI}</p>
      </div>
      <DasarHukumPerwal />
      <p>
        Saya, <b>{identitas?.nama?.trim() || "pemilik / penanggung jawab usaha"}</b>
        {identitas?.namaUsaha?.trim() ? (
          <>
            {" "}
            dari usaha <b>{identitas.namaUsaha.trim()}</b>
          </>
        ) : null}
        {identitas?.alamat?.trim() ? ` (${identitas.alamat.trim()})` : ""}, selanjutnya disebut <b>PIHAK PERTAMA</b>, menyatakan
        kepada Pengurus RW 03 Kelurahan Padasuka yang diwakili Ketua RW 03 (<b>PIHAK KEDUA</b>) hal-hal berikut.
      </p>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60">
            <th className="border px-2 py-1 text-left">Program yang saya dukung</th>
            <th className="border px-2 py-1 text-right">Per bulan</th>
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x.label}>
              <td className="border px-2 py-1">{x.label}</td>
              <td className="border px-2 py-1 text-right tabular-nums">{formatRp(x.nominal)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="border px-2 py-1">Jumlah</td>
            <td className="border px-2 py-1 text-right tabular-nums">{formatRp(total)}</td>
          </tr>
        </tbody>
      </table>
      {pasal.map((p, i) => (
        <div key={p.judul}>
          <p className="text-center font-semibold">
            Pasal {i + 1}
            <br />
            {p.judul}
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            {p.ayat.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

/**
 * Persetujuan bergaya aplikasi keuangan: dokumen wajib dibaca sampai habis, lalu setiap poin penting dicentang.
 * `onSetuju(true)` hanya bila semua poin tercentang. Beri `key` yang berubah saat sumbangsih berubah agar centang terulang.
 */
export function PernyataanSumbangsihPanel({
  items,
  terminBulan,
  identitas,
  tataMasyarakat,
  tataKhusus,
  setuju,
  onSetuju,
  loading,
}: {
  items: { label: string; nominal: number }[];
  terminBulan?: number | null;
  identitas?: IdentitasPernyataan;
  tataMasyarakat: string;
  tataKhusus: string;
  setuju: boolean;
  onSetuju: (v: boolean) => void;
  loading?: boolean;
}) {
  const { data: t } = useTarifPublik();
  const dokumenRef = useRef<HTMLDivElement>(null);
  const [sudahBaca, setSudahBaca] = useState(false);
  const total = items.reduce((s, x) => s + x.nominal, 0);
  const poin = poinPersetujuan({ total, tenggangHari: t?.tenggangHari ?? 0 });
  const [centang, setCentang] = useState<boolean[]>(() => poin.map(() => false));

  const cekAkhir = useCallback(() => {
    const el = dokumenRef.current;
    if (!el || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setSudahBaca(true);
  }, [loading]);

  useEffect(() => {
    cekAkhir();
    const el = dokumenRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(cekAkhir);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [cekAkhir]);

  const ubah = (i: number, v: boolean) => {
    const baru = centang.map((c, j) => (j === i ? v : c));
    setCentang(baru);
    onSetuju(baru.every(Boolean));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div ref={dokumenRef} onScroll={cekAkhir} className="max-h-96 overflow-y-auto rounded-lg border bg-muted/30 p-3">
          <div className="space-y-4">
            <DokumenPernyataan items={items} terminBulan={terminBulan} identitas={identitas} />
            <div className="space-y-2 border-t pt-3 text-xs">
              <p className="font-semibold">Lampiran — Tata tertib lingkungan</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{tataMasyarakat || "—"}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{tataKhusus || "—"}</p>
            </div>
            <p className="border-t pt-3 text-center text-xs text-muted-foreground">— Akhir surat pernyataan —</p>
          </div>
        </div>
        {!sudahBaca && !loading && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center rounded-b-lg bg-gradient-to-t from-background to-transparent pb-2 pt-8">
            <span className="flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white shadow">
              <ChevronsDown className="h-3.5 w-3.5" /> Baca sampai akhir untuk menyetujui
            </span>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Memuat dokumen…</p>}

      <div className={`space-y-2 rounded-xl border-2 p-3 ${setuju ? "border-success/50 bg-success/5" : "border-brand/25"} ${sudahBaca ? "" : "opacity-60"}`}>
        <p className="text-sm font-semibold">
          {sudahBaca ? "Centang setiap pernyataan berikut:" : "Baca surat pernyataan sampai akhir untuk bisa mencentang."}
        </p>
        {poin.map((teks, i) => (
          <div key={teks} className="flex items-start gap-2.5">
            <Checkbox
              id={`poin-pernyataan-${i}`}
              className="mt-0.5 h-5 w-5"
              checked={centang[i] ?? false}
              disabled={!sudahBaca || loading}
              onCheckedChange={(v) => ubah(i, v === true)}
            />
            <Label htmlFor={`poin-pernyataan-${i}`} className={`text-sm font-normal leading-snug ${sudahBaca ? "cursor-pointer" : ""}`}>
              {teks}
            </Label>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">
          Waktu persetujuan dan versi dokumen ({PERNYATAAN_VERSI}) dicatat sistem. Salinan PDF bisa diunduh dari halaman cek status.
        </p>
      </div>
    </div>
  );
}
