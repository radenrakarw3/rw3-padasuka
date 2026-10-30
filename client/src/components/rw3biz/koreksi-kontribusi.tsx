import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  JENIS_TEMPAT_BIZ,
  JENIS_TEMPAT_BIZ_LABEL,
  CHARTER_BIZ,
  KENDARAAN_BIZ,
  OPERASIONAL_MALAM,
  OPERASIONAL_MALAM_LABEL,
  RENTANG_OMZET,
  STATUS_TEMPAT_BIZ,
  STATUS_TEMPAT_BIZ_LABEL,
  formatRp,
  type HasilKontribusi,
  type TarifKontribusi,
} from "@shared/rw3biz-kontribusi";

export type DataKontribusiEdit = {
  jenisTempatUsaha: string;
  statusTempat: string;
  luasM2: number;
  hariOperasional: number;
  /** Data lama, tidak diubah lagi di editor. */
  rentangOmzet: string | null;
  operasionalMalam: string;
  sampahKantongHari: number;
  pakaiBahuJalan: boolean;
  kendaraanMotor: number;
  kendaraanMobil: number;
  kendaraanKolbak: number;
  kendaraanTruk: number;
  kendaraanTrukBesar: number;
  charterKolbak: number;
  charterTruk: number;
  charterTrukBesar: number;
  usahaBaru: boolean;
};

type BarisSumber = {
  jenisTempatUsaha?: string | null;
  statusTempat?: string | null;
  luasM2?: number | null;
  hariOperasional?: number | null;
  rentangOmzet?: string | null;
  operasionalMalam?: string | null;
  sampahKantongHari?: number | null;
  pakaiBahuJalan?: boolean | null;
  kendaraanMotor?: number | null;
  kendaraanMobil?: number | null;
  kendaraanKolbak?: number | null;
  kendaraanTruk?: number | null;
  kendaraanTrukBesar?: number | null;
  charterKolbak?: number | null;
  charterTruk?: number | null;
  charterTrukBesar?: number | null;
  usahaBaru?: boolean | null;
};

const pilih = <T extends string>(daftar: readonly T[], v: unknown, cadangan: T): T =>
  (daftar as readonly string[]).includes(String(v)) ? (v as T) : cadangan;

export function dataKontribusiDariBaris(r: BarisSumber): DataKontribusiEdit {
  return {
    jenisTempatUsaha: pilih(JENIS_TEMPAT_BIZ, r.jenisTempatUsaha, "lainnya"),
    statusTempat: pilih(STATUS_TEMPAT_BIZ, r.statusTempat, "sewa"),
    luasM2: r.luasM2 ?? 0,
    hariOperasional: r.hariOperasional ?? 7,
    rentangOmzet: (RENTANG_OMZET as readonly string[]).includes(String(r.rentangOmzet)) ? String(r.rentangOmzet) : null,
    operasionalMalam: pilih(OPERASIONAL_MALAM, r.operasionalMalam, "tidak"),
    sampahKantongHari: r.sampahKantongHari ?? 0,
    pakaiBahuJalan: Boolean(r.pakaiBahuJalan),
    kendaraanMotor: r.kendaraanMotor ?? 0,
    kendaraanMobil: r.kendaraanMobil ?? 0,
    kendaraanKolbak: r.kendaraanKolbak ?? 0,
    kendaraanTruk: r.kendaraanTruk ?? 0,
    kendaraanTrukBesar: r.kendaraanTrukBesar ?? 0,
    charterKolbak: r.charterKolbak ?? 0,
    charterTruk: r.charterTruk ?? 0,
    charterTrukBesar: r.charterTrukBesar ?? 0,
    usahaBaru: Boolean(r.usahaBaru),
  };
}

export function useTarifAdmin() {
  return useQuery<TarifKontribusi>({
    queryKey: ["/api/admin/rw3biz/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat tarif");
      return res.json();
    },
    staleTime: 60_000,
  });
}

/** Tampilan rincian komponen kontribusi (dipakai antrian, tagihan, status). */
export function RincianKontribusi({ hasil, ringkas }: { hasil: HasilKontribusi; ringkas?: boolean }) {
  return (
    <div className="space-y-1 text-xs">
      {!ringkas &&
        hasil.komponen.map((k) => (
          <div key={k.kode} className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              {k.label}
              {k.diLuarBatas ? <span className="text-warning"> · beban jalan</span> : null}
            </span>
            <span className="tabular-nums">{formatRp(k.nominal)}</span>
          </div>
        ))}
      {hasil.diskonLokal > 0 && (
        <div className="flex justify-between gap-3 text-success">
          <span>Potongan pekerja warga RW 03 ({hasil.diskonLokalPersen}%)</span>
          <span className="tabular-nums">−{formatRp(hasil.diskonLokal)}</span>
        </div>
      )}
      {hasil.faktorPenyesuaian !== 1 && (
        <div className="flex justify-between gap-3 text-muted-foreground">
          <span>Faktor penyesuaian</span>
          <span className="tabular-nums">× {hasil.faktorPenyesuaian.toFixed(2)}</span>
        </div>
      )}
      {hasil.terkenaBatasAtas && <p className="text-success">Dibatasi: {hasil.batasAtasAlasan}</p>}
      <div className="flex justify-between gap-3 border-t pt-1 text-sm font-semibold">
        <span>Kontribusi / bulan</span>
        <span className="tabular-nums text-brand">{formatRp(hasil.total)}</span>
      </div>
      <p className="text-muted-foreground">
        Pekerja {hasil.jumlahPekerja}
        {hasil.jumlahPegawai != null ? ` (pegawai ${hasil.jumlahPegawai})` : ""} · warga RW 03 {hasil.pekerjaRw3} ({hasil.persenPekerjaRw3}%) · luar {hasil.pekerjaLuar}
      </p>
    </div>
  );
}

function PilihKecil({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="text-sm sm:h-9 sm:text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const opsi = <T extends string>(daftar: readonly T[], label: Record<T, string>) =>
  daftar.map((v) => ({ value: v, label: label[v] }));

/** Editor verifikasi data usaha & kendaraan (untuk razia). Tidak menentukan sumbangsih. */
export function KoreksiKontribusiEditor({
  data,
  onData,
}: {
  data: DataKontribusiEdit;
  onData: (patch: Partial<DataKontribusiEdit>) => void;
}) {
  const angka = (s: string) => Math.max(0, parseInt(s.replace(/\D/g, ""), 10) || 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Jenis tempat</Label>
          <PilihKecil value={data.jenisTempatUsaha} onChange={(v) => onData({ jenisTempatUsaha: v })} options={opsi(JENIS_TEMPAT_BIZ, JENIS_TEMPAT_BIZ_LABEL)} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Status tempat</Label>
          <PilihKecil value={data.statusTempat} onChange={(v) => onData({ statusTempat: v })} options={opsi(STATUS_TEMPAT_BIZ, STATUS_TEMPAT_BIZ_LABEL)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Luas (m²)</Label>
          <Input className="sm:h-9 sm:text-xs" inputMode="numeric" value={String(data.luasM2)} onChange={(e) => onData({ luasM2: angka(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hari buka / minggu</Label>
          <Input
            className="sm:h-9 sm:text-xs"
            inputMode="numeric"
            value={String(data.hariOperasional)}
            onChange={(e) => onData({ hariOperasional: Math.min(7, Math.max(1, angka(e.target.value) || 1)) })}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Operasional malam</Label>
          <PilihKecil value={data.operasionalMalam} onChange={(v) => onData({ operasionalMalam: v })} options={opsi(OPERASIONAL_MALAM, OPERASIONAL_MALAM_LABEL)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sampah (kantong/hari)</Label>
          <Input className="sm:h-9 sm:text-xs" inputMode="numeric" value={String(data.sampahKantongHari)} onChange={(e) => onData({ sampahKantongHari: angka(e.target.value) })} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Kendaraan operasional (unit)</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-1">
            {KENDARAAN_BIZ.map((k) => (
              <div key={k.kode} className="space-y-0.5">
                <Input
                  className="sm:h-9 sm:text-xs"
                  inputMode="numeric"
                  aria-label={k.label}
                  value={String(data[k.kode])}
                  onChange={(e) => onData({ [k.kode]: angka(e.target.value) })}
                />
                <p className={`truncate text-xs sm:text-[10px] ${k.beratJalan ? "text-warning" : "text-muted-foreground"}`}>{k.label.split(" / ")[0]}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Charter / sewaan (datang per minggu)</Label>
          <div className="grid grid-cols-3 gap-2 sm:gap-1">
            {CHARTER_BIZ.map((c) => (
              <div key={c.kode} className="space-y-0.5">
                <Input
                  className="sm:h-9 sm:text-xs"
                  inputMode="numeric"
                  aria-label={`${c.label} per minggu`}
                  value={String(data[c.kode])}
                  onChange={(e) => onData({ [c.kode]: angka(e.target.value) })}
                />
                <p className="truncate text-xs text-warning sm:text-[10px]">{c.label.replace(" charter", "").split(" / ")[0]}</p>
              </div>
            ))}
          </div>
        </div>
        <label className="col-span-2 flex min-h-11 items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm sm:min-h-0 sm:px-2 sm:text-xs">
          Pakai bahu jalan / parkir pelanggan
          <Switch checked={data.pakaiBahuJalan} onCheckedChange={(v) => onData({ pakaiBahuJalan: v })} />
        </label>
      </div>
    </div>
  );
}
