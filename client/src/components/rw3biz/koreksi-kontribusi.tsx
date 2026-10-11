import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ASAL_ORANG_BIZ,
  ASAL_ORANG_BIZ_LABEL,
  JENIS_TEMPAT_BIZ,
  JENIS_TEMPAT_BIZ_LABEL,
  CHARTER_BIZ,
  KENDARAAN_BIZ,
  OPERASIONAL_MALAM,
  OPERASIONAL_MALAM_LABEL,
  PERAN_ORANG_BIZ,
  PERAN_ORANG_BIZ_LABEL,
  RENTANG_OMZET,
  RENTANG_OMZET_LABEL,
  STATUS_TEMPAT_BIZ,
  STATUS_TEMPAT_BIZ_LABEL,
  formatRp,
  hitungKontribusiRw3biz,
  type HasilKontribusi,
  type TarifKontribusi,
} from "@shared/rw3biz-kontribusi";

export type DataKontribusiEdit = {
  jenisTempatUsaha: string;
  statusTempat: string;
  luasM2: number;
  hariOperasional: number;
  rentangOmzet: string;
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

export type OrangKontribusiEdit = {
  id: number;
  namaLengkap: string;
  isAnak: boolean;
  peran: string;
  asal: string;
  domisili?: string | null;
  wargaId?: number | null;
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
    rentangOmzet: pilih(RENTANG_OMZET, r.rentangOmzet, "lt3"),
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

export function orangKontribusiDariBaris(
  rows: { id: number; namaLengkap: string; isAnak: boolean; peran?: string | null; asal?: string | null; domisili?: string | null; wargaId?: number | null }[],
): OrangKontribusiEdit[] {
  return rows.map((o) => ({
    id: o.id,
    namaLengkap: o.namaLengkap,
    isAnak: o.isAnak,
    peran: pilih(PERAN_ORANG_BIZ, o.peran, "pekerja_tetap"),
    asal: pilih(ASAL_ORANG_BIZ, o.asal, "luar"),
    domisili: o.domisili ?? null,
    wargaId: o.wargaId ?? null,
  }));
}

export function koreksiPayload(data: DataKontribusiEdit, orang: OrangKontribusiEdit[]) {
  return {
    ...data,
    orang: orang.filter((o) => !o.isAnak).map((o) => ({ id: o.id, peran: o.peran, asal: o.asal })),
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

/** Editor hasil survey lapangan + pratinjau kontribusi (rumus sama dengan server). */
export function KoreksiKontribusiEditor({
  data,
  orang,
  onData,
  onOrang,
}: {
  data: DataKontribusiEdit;
  orang: OrangKontribusiEdit[];
  onData: (patch: Partial<DataKontribusiEdit>) => void;
  onOrang: (id: number, patch: Partial<OrangKontribusiEdit>) => void;
}) {
  const { data: tarif } = useTarifAdmin();
  const hasil = useMemo(
    () =>
      tarif
        ? hitungKontribusiRw3biz({ ...data, orang: orang.map((o) => ({ peran: o.peran, asal: o.asal, isAnak: o.isAnak })) }, tarif)
        : null,
    [tarif, data, orang],
  );
  const angka = (s: string) => Math.max(0, parseInt(s.replace(/\D/g, ""), 10) || 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Jenis tempat</Label>
          <PilihKecil value={data.jenisTempatUsaha} onChange={(v) => onData({ jenisTempatUsaha: v })} options={opsi(JENIS_TEMPAT_BIZ, JENIS_TEMPAT_BIZ_LABEL)} />
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Status tempat</Label>
          <PilihKecil value={data.statusTempat} onChange={(v) => onData({ statusTempat: v })} options={opsi(STATUS_TEMPAT_BIZ, STATUS_TEMPAT_BIZ_LABEL)} />
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Omzet / bulan</Label>
          <PilihKecil value={data.rentangOmzet} onChange={(v) => onData({ rentangOmzet: v })} options={opsi(RENTANG_OMZET, RENTANG_OMZET_LABEL)} />
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
        <label className="col-span-2 flex min-h-11 items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm sm:col-span-1 sm:min-h-0 sm:px-2 sm:text-xs">
          Pakai bahu jalan
          <Switch checked={data.pakaiBahuJalan} onCheckedChange={(v) => onData({ pakaiBahuJalan: v })} />
        </label>
        <label className="col-span-2 flex min-h-11 items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm sm:col-span-1 sm:min-h-0 sm:px-2 sm:text-xs">
          Usaha baru
          <Switch checked={data.usahaBaru} onCheckedChange={(v) => onData({ usahaBaru: v })} />
        </label>
      </div>

      {orang.some((o) => !o.isAnak) && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium">Peran & asal orang</p>
          {orang
            .filter((o) => !o.isAnak)
            .map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-2 items-center gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_auto_auto] sm:gap-1.5 sm:border-0 sm:p-0"
              >
                <p className="col-span-2 min-w-0 text-sm sm:col-span-1 sm:truncate sm:text-xs">
                  {o.namaLengkap}
                  {o.wargaId ? <span className="text-success"> · terdata warga RW 03</span> : null}
                </p>
                <div className="min-w-0 sm:w-36">
                  <PilihKecil value={o.peran} onChange={(v) => onOrang(o.id, { peran: v })} options={opsi(PERAN_ORANG_BIZ, PERAN_ORANG_BIZ_LABEL)} />
                </div>
                <div className="min-w-0 sm:w-28">
                  <PilihKecil value={o.asal} onChange={(v) => onOrang(o.id, { asal: v })} options={opsi(ASAL_ORANG_BIZ, ASAL_ORANG_BIZ_LABEL)} />
                </div>
              </div>
            ))}
        </div>
      )}

      {hasil && (
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-2">
          <p className="mb-1 text-xs font-semibold">Pratinjau kontribusi setelah koreksi</p>
          <RincianKontribusi hasil={hasil} />
        </div>
      )}
    </div>
  );
}
