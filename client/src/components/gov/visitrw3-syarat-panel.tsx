import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronsDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatRupiah, labelUkuranProperti, parseKontribusiSettings } from "@/lib/visitrw3-kontribusi";

export function KontribusiTinggalInfo({
  jenis,
  settingsRows,
  terminBulan,
}: {
  jenis: "kost" | "kontrak";
  settingsRows: { key: string; value: string }[];
  terminBulan: number;
}) {
  const s = parseKontribusiSettings(settingsRows);
  const tarif =
    jenis === "kost"
      ? { kecil: s.feeKostKecilPerUnitBulan, sedang: s.feeKostSedangPerUnitBulan, besar: s.feeKostBesarPerUnitBulan }
      : {
          kecil: s.feeKontrakanKecilPerUnitBulan,
          sedang: s.feeKontrakanSedangPerUnitBulan,
          besar: s.feeKontrakanBesarPerUnitBulan,
        };
  const min = Math.min(tarif.kecil, tarif.sedang, tarif.besar);
  const max = Math.max(tarif.kecil, tarif.sedang, tarif.besar);
  const termin = Number.isFinite(terminBulan) && terminBulan > 0 ? terminBulan : 1;
  const rentang = (a: number, b: number) => (a === b ? formatRupiah(a) : `${formatRupiah(a)}–${formatRupiah(b)}`);

  return (
    <div className="rounded-xl border-2 border-brand/30 bg-card p-4 space-y-3 text-sm">
      <p className="font-semibold">Kontribusi {jenis === "kost" ? "kost" : "kontrakan"} per unit / bulan</p>
      <ul className="space-y-1">
        {(["kecil", "sedang", "besar"] as const).map((u) => (
          <li key={u} className="flex justify-between gap-3">
            <span className="text-muted-foreground">Properti {labelUkuranProperti(u, s)}</span>
            <span className="tabular-nums">{formatRupiah(tarif[u])}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t pt-2">
        <span className="font-semibold">Termin {termin} bulan</span>
        <span className="text-lg font-bold text-brand tabular-nums">{rentang(min * termin, max * termin)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Besaran pasti mengikuti jumlah pintu properti tempat Anda tinggal dan ditetapkan pengurus RW setelah survey.
      </p>
    </div>
  );
}

type Props = {
  tataMasyarakat: string;
  tataKhusus: string;
  /** Nilai kontribusi yang ikut disetujui — tampil di akhir dokumen. */
  kontribusi?: ReactNode;
  setuju: boolean;
  onSetuju: (v: boolean) => void;
  loading?: boolean;
};

export function Visitrw3SyaratPanel({ tataMasyarakat, tataKhusus, kontribusi, setuju, onSetuju, loading }: Props) {
  const dokumenRef = useRef<HTMLDivElement>(null);
  const [sudahBaca, setSudahBaca] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          ref={dokumenRef}
          onScroll={cekAkhir}
          className="max-h-80 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm"
        >
          <div className="space-y-4">
            <p className="text-center font-semibold uppercase tracking-wide">Dokumen persetujuan</p>
            <div className="whitespace-pre-wrap">
              <p className="font-semibold mb-1">Tata tertib masyarakat</p>
              <p className="text-muted-foreground">{tataMasyarakat || "—"}</p>
            </div>
            <div className="whitespace-pre-wrap">
              <p className="font-semibold mb-1">Syarat & tata tertib</p>
              <p className="text-muted-foreground">{tataKhusus || "—"}</p>
            </div>
            {kontribusi && (
              <div>
                <p className="font-semibold mb-1">Nilai kontribusi</p>
                {kontribusi}
              </div>
            )}
            <p className="text-xs text-muted-foreground border-t pt-3">
              Setelah disetujui, pengurus RW dapat menghubungi Anda lewat WhatsApp yang terdaftar.
            </p>
          </div>
        </div>
        {!sudahBaca && !loading && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center rounded-b-lg bg-gradient-to-t from-background to-transparent pb-2 pt-8">
            <span className="flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white shadow">
              <ChevronsDown className="h-3.5 w-3.5" /> Gulir sampai bawah
            </span>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Memuat pengaturan…</p>}

      <div className={`flex items-start gap-2 rounded-lg border p-3 ${sudahBaca ? "" : "opacity-60"}`}>
        <Checkbox
          id="setuju-syarat"
          checked={setuju}
          onCheckedChange={(c) => onSetuju(c === true)}
          disabled={loading || !sudahBaca}
        />
        <Label htmlFor="setuju-syarat" className={`text-sm leading-snug ${sudahBaca ? "cursor-pointer" : ""}`}>
          {sudahBaca
            ? kontribusi
              ? "Saya telah membaca dan menyetujui syarat, tata tertib, serta nilai kontribusi di atas."
              : "Saya telah membaca dan menyetujui syarat serta tata tertib di atas."
            : "Baca dokumen sampai bawah untuk bisa mencentang persetujuan."}
        </Label>
      </div>
    </div>
  );
}
