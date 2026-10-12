import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronsDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  formatRupiah,
  infoUkuranTinggal,
  isUkuranTinggal,
  parseKontribusiSettings,
  tarifTinggalPerBulan,
  UKURAN_TINGGAL_VALUES,
  type UkuranProperti,
} from "@/lib/visitrw3-kontribusi";

type SettingsRows = { key: string; value: string }[];

/** Pilihan ukuran kamar kost / jumlah kamar tidur kontrakan beserta tarif per bulan. */
export function PilihUkuranTinggal({
  jenis,
  settingsRows,
  value,
  onChange,
  disabled,
}: {
  jenis: "kost" | "kontrak";
  settingsRows: SettingsRows;
  value: string;
  onChange: (v: UkuranProperti) => void;
  disabled?: boolean;
}) {
  const s = parseKontribusiSettings(settingsRows);
  return (
    <div className="grid gap-2" role="radiogroup">
      {UKURAN_TINGGAL_VALUES.map((u) => {
        const info = infoUkuranTinggal(jenis, u);
        const aktif = value === u;
        return (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={aktif}
            disabled={disabled}
            onClick={() => onChange(u)}
            className={`flex items-center justify-between gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-colors ${
              aktif ? "border-brand bg-brand/5" : "border-border hover:border-brand/40"
            }`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">{info.judul}</span>
              <span className="block text-xs text-muted-foreground">{info.ket}</span>
            </span>
            <span className="text-sm tabular-nums whitespace-nowrap">
              {formatRupiah(tarifTinggalPerBulan(jenis, u, s))}
              <span className="text-xs text-muted-foreground">/bln</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function KontribusiTinggalInfo({
  jenis,
  settingsRows,
  terminBulan,
  ukuran,
}: {
  jenis: "kost" | "kontrak";
  settingsRows: SettingsRows;
  terminBulan: number;
  ukuran?: string | null;
}) {
  const s = parseKontribusiSettings(settingsRows);
  const termin = Number.isFinite(terminBulan) && terminBulan > 0 ? terminBulan : 1;
  const tarif = Object.fromEntries(
    UKURAN_TINGGAL_VALUES.map((u) => [u, tarifTinggalPerBulan(jenis, u, s)]),
  ) as Record<UkuranProperti, number>;
  const terpilih = isUkuranTinggal(ukuran) ? ukuran : null;
  const nilai = Object.values(tarif);
  const min = Math.min(...nilai);
  const max = Math.max(...nilai);
  const rentang = (a: number, b: number) => (a === b ? formatRupiah(a) : `${formatRupiah(a)}–${formatRupiah(b)}`);

  return (
    <div className="rounded-xl border-2 border-brand/30 bg-card p-4 space-y-3 text-sm">
      <p className="font-semibold">
        Kontribusi {jenis === "kost" ? "kost per kamar" : "kontrakan per unit"} / bulan
      </p>
      <ul className="space-y-1">
        {UKURAN_TINGGAL_VALUES.map((u) => {
          const info = infoUkuranTinggal(jenis, u);
          return (
            <li
              key={u}
              className={`flex justify-between gap-3 ${terpilih === u ? "font-semibold text-foreground" : ""}`}
            >
              <span className={terpilih === u ? "" : "text-muted-foreground"}>
                {info.judul} ({info.ket}){terpilih === u ? " ✓" : ""}
              </span>
              <span className="tabular-nums">{formatRupiah(tarif[u])}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-baseline justify-between border-t pt-2">
        <span className="font-semibold">
          {terpilih ? `${formatRupiah(tarif[terpilih])} × ${termin} bulan` : `Termin ${termin} bulan`}
        </span>
        <span className="text-lg font-bold text-brand tabular-nums">
          {terpilih ? formatRupiah(tarif[terpilih] * termin) : rentang(min * termin, max * termin)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {terpilih
          ? "Besaran mengikuti ukuran tempat yang Anda pilih. Pengurus RW mencocokkannya saat survey dan dapat mengoreksi bila tidak sesuai."
          : jenis === "kost"
            ? "Besaran mengikuti ukuran kamar yang Anda tempati."
            : "Besaran mengikuti jumlah kamar tidur kontrakan yang Anda tempati."}
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
