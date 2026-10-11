import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Minus, Plus } from "lucide-react";
import { readJsonSafely } from "@/lib/queryClient";
import { useTarifPublik } from "@/components/rw3biz/transparansi";
import {
  ASAL_ORANG_BIZ,
  ASAL_ORANG_BIZ_LABEL,
  CHARTER_BIZ,
  JENIS_TEMPAT_BIZ,
  JENIS_TEMPAT_BIZ_LABEL,
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
  turunkanOperasionalMalam,
  type HasilKontribusi,
} from "@shared/rw3biz-kontribusi";

export const JENIS_TEMPAT_BIZ_OPTIONS = JENIS_TEMPAT_BIZ.map((v) => ({ value: v, label: JENIS_TEMPAT_BIZ_LABEL[v] }));

export type BizKontribusiForm = {
  statusTempat: string;
  luasM2: string;
  hariOperasional: string;
  rentangOmzet: string;
  /** "" = ikut jam buka/tutup */
  operasionalMalam: string;
  sampahKantongHari: string;
  pakaiBahuJalan: "" | "ya" | "tidak";
  kendaraanMotor: string;
  kendaraanMobil: string;
  kendaraanKolbak: string;
  kendaraanTruk: string;
  kendaraanTrukBesar: string;
  platOperasional: string;
  /** Memakai kolbak/truk charter (bukan milik usaha)? */
  adaCharter: "" | "ya" | "tidak";
  charterKolbak: string;
  charterTruk: string;
  charterTrukBesar: string;
  charterPenyedia: string;
  usahaBaru: "" | "ya" | "tidak";
};

export function emptyBizKontribusi(): BizKontribusiForm {
  return {
    statusTempat: "",
    luasM2: "",
    hariOperasional: "",
    rentangOmzet: "",
    operasionalMalam: "",
    sampahKantongHari: "",
    pakaiBahuJalan: "",
    kendaraanMotor: "0",
    kendaraanMobil: "0",
    kendaraanKolbak: "0",
    kendaraanTruk: "0",
    kendaraanTrukBesar: "0",
    platOperasional: "",
    adaCharter: "",
    charterKolbak: "0",
    charterTruk: "0",
    charterTrukBesar: "0",
    charterPenyedia: "",
    usahaBaru: "",
  };
}

/** Isi ulang form dari data tersimpan (perpanjang). */
export function bizFormDariData(d: {
  statusTempat: string;
  luasM2: number;
  hariOperasional: number;
  rentangOmzet: string;
  operasionalMalam: string;
  sampahKantongHari: number;
  pakaiBahuJalan: boolean;
  kendaraanMotor: number;
  kendaraanMobil: number;
  kendaraanKolbak?: number;
  kendaraanTruk?: number;
  kendaraanTrukBesar?: number;
  kendaraanOperasional: string[];
  charterKolbak?: number;
  charterTruk?: number;
  charterTrukBesar?: number;
  charterPenyedia?: string | null;
}): BizKontribusiForm {
  const adaCharter = CHARTER_BIZ.some((c) => (d[c.kode] ?? 0) > 0);
  return {
    statusTempat: d.statusTempat,
    luasM2: String(d.luasM2 ?? ""),
    hariOperasional: String(d.hariOperasional ?? ""),
    rentangOmzet: d.rentangOmzet,
    operasionalMalam: d.operasionalMalam,
    sampahKantongHari: String(d.sampahKantongHari ?? 0),
    pakaiBahuJalan: d.pakaiBahuJalan ? "ya" : "tidak",
    kendaraanMotor: String(d.kendaraanMotor ?? 0),
    kendaraanMobil: String(d.kendaraanMobil ?? 0),
    kendaraanKolbak: String(d.kendaraanKolbak ?? 0),
    kendaraanTruk: String(d.kendaraanTruk ?? 0),
    kendaraanTrukBesar: String(d.kendaraanTrukBesar ?? 0),
    platOperasional: (d.kendaraanOperasional ?? []).join(", "),
    adaCharter: adaCharter ? "ya" : "tidak",
    charterKolbak: String(d.charterKolbak ?? 0),
    charterTruk: String(d.charterTruk ?? 0),
    charterTrukBesar: String(d.charterTrukBesar ?? 0),
    charterPenyedia: d.charterPenyedia ?? "",
    usahaBaru: "tidak",
  };
}

const angka = (s: string | undefined) => {
  const n = parseInt(s ?? "0", 10);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export function totalKendaraanBiz(f: BizKontribusiForm): number {
  return KENDARAAN_BIZ.reduce((s, k) => s + (angka(f[k.kode]) || 0), 0);
}

export function validateBizKontribusi(f: BizKontribusiForm, jenisTempat: string): string | null {
  if (!f.statusTempat) return "Pilih status tempat usaha (milik, sewa, atau numpang)";
  if (jenisTempat !== "keliling" && !(angka(f.luasM2) > 0)) return "Isi perkiraan luas tempat usaha (m²)";
  const hari = angka(f.hariOperasional);
  if (!(hari >= 1 && hari <= 7)) return "Isi berapa hari buka dalam seminggu (1–7)";
  if (!f.rentangOmzet) return "Pilih kisaran omzet per bulan";
  if (Number.isNaN(angka(f.sampahKantongHari))) return "Isi perkiraan sampah per hari (kantong), 0 jika tidak ada";
  if (!f.pakaiBahuJalan) return "Jawab apakah usaha memakai bahu jalan / parkir pelanggan";
  if (KENDARAAN_BIZ.some((k) => Number.isNaN(angka(f[k.kode])))) {
    return "Isi jumlah kendaraan operasional (0 jika tidak ada)";
  }
  const totalKendaraan = totalKendaraanBiz(f);
  if (totalKendaraan > 0 && daftarPlat(f.platOperasional).length < totalKendaraan) {
    return `Tulis plat nomor semua kendaraan operasional (${totalKendaraan} kendaraan)`;
  }
  if (!f.adaCharter) return "Jawab apakah usaha memakai kolbak / truk charter (sewaan)";
  if (f.adaCharter === "ya" && !CHARTER_BIZ.some((c) => (angka(f[c.kode]) || 0) > 0)) {
    return "Isi berapa kali kendaraan charter datang per minggu";
  }
  if (!f.usahaBaru) return "Jawab apakah usaha ini baru buka";
  return null;
}

function daftarPlat(s: string): string[] {
  return s
    .split(/[,\n]/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
}

export function bizKontribusiPayload(f: BizKontribusiForm, jamBuka: string, jamTutup: string) {
  return {
    statusTempat: f.statusTempat,
    luasM2: angka(f.luasM2) || 0,
    hariOperasional: angka(f.hariOperasional) || 7,
    rentangOmzet: f.rentangOmzet,
    operasionalMalam: f.operasionalMalam || turunkanOperasionalMalam(jamBuka, jamTutup),
    sampahKantongHari: angka(f.sampahKantongHari) || 0,
    pakaiBahuJalan: f.pakaiBahuJalan === "ya",
    kendaraanMotor: angka(f.kendaraanMotor) || 0,
    kendaraanMobil: angka(f.kendaraanMobil) || 0,
    kendaraanKolbak: angka(f.kendaraanKolbak) || 0,
    kendaraanTruk: angka(f.kendaraanTruk) || 0,
    kendaraanTrukBesar: angka(f.kendaraanTrukBesar) || 0,
    kendaraanOperasional: daftarPlat(f.platOperasional),
    charterKolbak: f.adaCharter === "ya" ? angka(f.charterKolbak) || 0 : 0,
    charterTruk: f.adaCharter === "ya" ? angka(f.charterTruk) || 0 : 0,
    charterTrukBesar: f.adaCharter === "ya" ? angka(f.charterTrukBesar) || 0 : 0,
    charterPenyedia: f.adaCharter === "ya" ? (f.charterPenyedia ?? "").trim() || null : null,
    usahaBaru: f.usahaBaru === "ya",
  };
}

function PilihanYaTidak({
  value,
  onChange,
  ya,
  tidak,
}: {
  value: "" | "ya" | "tidak";
  onChange: (v: "ya" | "tidak") => void;
  ya: string;
  tidak: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["ya", "tidak"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-lg border px-3 py-3 text-sm text-left transition-colors ${
            value === v ? "border-brand bg-brand/10 font-medium" : "bg-card hover:bg-muted"
          }`}
        >
          {v === "ya" ? ya : tidak}
        </button>
      ))}
    </div>
  );
}

function PilihSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-12">
        <SelectValue placeholder={placeholder} />
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

/** Field tambahan langkah "Usaha" — penentu kontribusi bulanan. */
export function UsahaKontribusiFields({
  value: f,
  onChange,
  jenisTempat,
  jamBuka,
  jamTutup,
}: {
  value: BizKontribusiForm;
  onChange: (patch: Partial<BizKontribusiForm>) => void;
  jenisTempat: string;
  jamBuka: string;
  jamTutup: string;
}) {
  const otomatis = turunkanOperasionalMalam(jamBuka, jamTutup);
  const totalKendaraan = totalKendaraanBiz(f);
  const { data: tarif } = useTarifPublik();
  return (
    <div className="space-y-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
      <div>
        <p className="font-semibold text-sm">Data penentu kontribusi bulanan</p>
        <p className="text-xs text-muted-foreground">
          Isi sejujurnya — angka ini dicek saat survey. Usaha kecil membayar kecil; ada batas atas sesuai omzet.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Status tempat usaha *</Label>
        <PilihSelect
          value={f.statusTempat}
          onChange={(v) => onChange({ statusTempat: v })}
          placeholder="Milik sendiri / sewa / numpang"
          options={STATUS_TEMPAT_BIZ.map((v) => ({ value: v, label: STATUS_TEMPAT_BIZ_LABEL[v] }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Luas tempat (m²){jenisTempat === "keliling" ? "" : " *"}</Label>
          <Input
            className="h-12"
            inputMode="numeric"
            placeholder={jenisTempat === "keliling" ? "0" : "Contoh: 12"}
            value={f.luasM2}
            onChange={(e) => onChange({ luasM2: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Hari buka / minggu *</Label>
          <Input
            className="h-12"
            inputMode="numeric"
            placeholder="1–7"
            value={f.hariOperasional}
            onChange={(e) => onChange({ hariOperasional: e.target.value.replace(/\D/g, "").slice(0, 1) })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Kisaran omzet (pendapatan kotor) per bulan *</Label>
        <PilihSelect
          value={f.rentangOmzet}
          onChange={(v) => onChange({ rentangOmzet: v })}
          placeholder="Pilih kisaran"
          options={RENTANG_OMZET.map((v) => ({ value: v, label: RENTANG_OMZET_LABEL[v] }))}
        />
        <p className="text-xs text-muted-foreground">Cukup kisaran, bukan angka pasti. Tidak dibagikan ke pihak lain.</p>
      </div>
      <div className="space-y-2">
        <Label>Operasional malam</Label>
        <PilihSelect
          value={f.operasionalMalam || otomatis}
          onChange={(v) => onChange({ operasionalMalam: v === otomatis ? "" : v })}
          placeholder="Ikut jam buka/tutup"
          options={OPERASIONAL_MALAM.map((v) => ({
            value: v,
            label: `${OPERASIONAL_MALAM_LABEL[v]}${v === otomatis && jamBuka && jamTutup ? " (dari jam buka)" : ""}`,
          }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Sampah per hari (kantong kresek besar) *</Label>
        <Input
          className="h-12"
          inputMode="numeric"
          placeholder="Contoh: 1"
          value={f.sampahKantongHari}
          onChange={(e) => onChange({ sampahKantongHari: e.target.value.replace(/\D/g, "").slice(0, 3) })}
        />
      </div>
      <div className="space-y-2">
        <Label>Memakai bahu jalan / parkir pelanggan di jalan lingkungan? *</Label>
        <PilihanYaTidak
          value={f.pakaiBahuJalan}
          onChange={(v) => onChange({ pakaiBahuJalan: v })}
          ya="Ya, memakai"
          tidak="Tidak"
        />
      </div>
      <div className="space-y-2">
        <Label>Kendaraan operasional usaha (parkir / keluar-masuk RW 03)</Label>
        <p className="text-xs text-muted-foreground">
          Hanya kendaraan untuk usaha (antar barang, bongkar muat, delivery) — bukan kendaraan pribadi. Tulis 0 jika tidak ada.
        </p>
        <div className="divide-y rounded-lg border bg-background">
          {KENDARAAN_BIZ.map((k) => {
            const n = angka(f[k.kode]) || 0;
            const ubah = (v: number) => onChange({ [k.kode]: String(Math.max(0, Math.min(200, v))) } as Partial<BizKontribusiForm>);
            return (
              <div key={k.kode} className="flex items-center gap-3 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {k.label}
                    {k.beratJalan && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">beban jalan</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {k.contoh}
                    {tarif ? ` · ${formatRp(tarif[k.kode])}/unit/bulan` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => ubah(n - 1)} disabled={n <= 0} aria-label={`Kurangi ${k.label}`}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    className="h-9 w-12 text-center tabular-nums"
                    inputMode="numeric"
                    aria-label={`Jumlah ${k.label}`}
                    value={f[k.kode] ?? "0"}
                    onChange={(e) => onChange({ [k.kode]: e.target.value.replace(/\D/g, "").slice(0, 3) } as Partial<BizKontribusiForm>)}
                  />
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => ubah(n + 1)} aria-label={`Tambah ${k.label}`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {totalKendaraan > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Plat nomor semua kendaraan ({totalKendaraan}) *</Label>
            <Textarea
              className="uppercase"
              rows={Math.min(4, totalKendaraan)}
              placeholder="Satu plat per baris atau pisahkan koma. Contoh: D 1234 AB"
              value={f.platOperasional}
              onChange={(e) => onChange({ platOperasional: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Tertulis {daftarPlat(f.platOperasional).length} dari {totalKendaraan} plat.
            </p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Memakai kolbak / truk charter (sewaan) yang datang ke usaha? *</Label>
        <p className="text-xs text-muted-foreground">
          Kendaraan bukan milik usaha — disewa/dicarter untuk kirim atau ambil barang. Tetap lewat jalan RW 03 sehingga ikut
          dihitung beban jalan, sesuai seberapa sering datang.
        </p>
        <PilihanYaTidak
          value={f.adaCharter}
          onChange={(v) => onChange({ adaCharter: v })}
          ya="Ya, pakai charter"
          tidak="Tidak"
        />
        {f.adaCharter === "ya" && (
          <div className="space-y-2">
            <div className="divide-y rounded-lg border bg-background">
              {CHARTER_BIZ.map((c) => {
                const n = angka(f[c.kode]) || 0;
                const ubah = (v: number) => onChange({ [c.kode]: String(Math.max(0, Math.min(100, v))) } as Partial<BizKontribusiForm>);
                return (
                  <div key={c.kode} className="flex items-center gap-3 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Rata-rata datang per minggu
                        {tarif ? ` · ${formatRp(tarif[c.tarif])}/kedatangan, maks. ${formatRp(tarif[c.kendaraan])}/bulan per 7× seminggu` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => ubah(n - 1)} disabled={n <= 0} aria-label={`Kurangi ${c.label}`}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        className="h-9 w-12 text-center tabular-nums"
                        inputMode="numeric"
                        aria-label={`${c.label} datang per minggu`}
                        value={f[c.kode] ?? "0"}
                        onChange={(e) => onChange({ [c.kode]: e.target.value.replace(/\D/g, "").slice(0, 3) } as Partial<BizKontribusiForm>)}
                      />
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => ubah(n + 1)} aria-label={`Tambah ${c.label}`}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Input
              className="h-11"
              placeholder="Nama penyedia / rental charter (opsional)"
              maxLength={200}
              value={f.charterPenyedia ?? ""}
              onChange={(e) => onChange({ charterPenyedia: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Saat razia, kendaraan charter menuju usaha ini dianggap terdaftar. Yang tidak didaftarkan dikenai denda.
            </p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Usaha ini baru buka (kurang dari 3 bulan)? *</Label>
        <PilihanYaTidak
          value={f.usahaBaru}
          onChange={(v) => onChange({ usahaBaru: v })}
          ya="Ya, baru buka"
          tidak="Sudah lama berjalan"
        />
        <p className="text-xs text-muted-foreground">Usaha baru gratis kontribusi di bulan pertama.</p>
      </div>
    </div>
  );
}

/** Peran & asal setiap orang di usaha — dasar persentase pekerja warga RW 03. */
export function OrangKontribusiFields({
  peran,
  asal,
  domisili,
  onChange,
}: {
  peran: string;
  asal: string;
  domisili: string;
  onChange: (patch: { peran?: string; asal?: string; domisili?: string }) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="space-y-2">
        <Label>Peran di usaha *</Label>
        <PilihSelect
          value={peran}
          onChange={(v) => onChange({ peran: v })}
          placeholder="Pemilik / penanggung jawab / pekerja"
          options={PERAN_ORANG_BIZ.map((v) => ({ value: v, label: PERAN_ORANG_BIZ_LABEL[v] }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Asal tempat tinggal *</Label>
        <div className="grid grid-cols-2 gap-2">
          {ASAL_ORANG_BIZ.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ asal: v })}
              className={`rounded-lg border px-3 py-3 text-sm transition-colors ${
                asal === v ? "border-brand bg-brand/10 font-medium" : "bg-background hover:bg-muted"
              }`}
            >
              {ASAL_ORANG_BIZ_LABEL[v]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          NIK dicocokkan otomatis dengan data warga RW 03. Usaha yang mempekerjakan warga RW 03 mendapat potongan.
        </p>
      </div>
      {asal === "luar" && (
        <div className="space-y-2">
          <Label>Alamat domisili *</Label>
          <Input
            className="h-12 bg-background"
            placeholder="Contoh: Kel. Cibabat, Cimahi Utara"
            value={domisili}
            onChange={(e) => onChange({ domisili: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export function validateOrangKontribusi(o: { peran: string; asal: string; domisili: string }): string | null {
  if (!o.peran) return "Pilih peran orang ini di usaha";
  if (!o.asal) return "Pilih asal tempat tinggal (warga RW 03 atau luar)";
  if (o.asal === "luar" && !o.domisili.trim()) return "Isi alamat domisili untuk pekerja dari luar RW 03";
  return null;
}

export type PreviewKontribusi = {
  hasil: HasilKontribusi;
  alokasi: { id: string; label: string; nominal: number }[];
  potonganTermin: Record<string, number>;
  bulanGratisUsahaBaru: number;
  transisiPersen: number[];
  tenggangHari: number;
};

/** Kartu estimasi kontribusi + alokasi program, dihitung server (rumus yang sama dengan penetapan). */
export function EstimasiKontribusiCard({
  payload,
  terminBulan,
  usahaBaru,
  sementara,
}: {
  payload: Record<string, unknown> | null;
  terminBulan?: number;
  usahaBaru?: boolean;
  /** Teks penjelas bila sebagian data masih diasumsikan — kartu tampil ringkas. */
  sementara?: string;
}) {
  const kunci = useMemo(() => (payload ? JSON.stringify(payload) : ""), [payload]);
  const [kunciTunda, setKunciTunda] = useState(kunci);
  useEffect(() => {
    const t = window.setTimeout(() => setKunciTunda(kunci), 400);
    return () => window.clearTimeout(t);
  }, [kunci]);

  const { data, isFetching, error } = useQuery<PreviewKontribusi>({
    queryKey: ["/api/public/rw3biz/preview-kontribusi", kunciTunda],
    queryFn: async () => {
      const res = await fetch("/api/public/rw3biz/preview-kontribusi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: kunciTunda,
      });
      if (!res.ok) {
        const j = await readJsonSafely<{ message?: string }>(res).catch(() => ({ message: undefined }));
        throw new Error(j?.message || "Gagal menghitung estimasi");
      }
      return readJsonSafely<PreviewKontribusi>(res);
    },
    enabled: Boolean(kunciTunda),
    staleTime: 60_000,
  });

  if (!payload) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        {sementara
          ? "Perkiraan kontribusi bulanan muncul setelah data penentu kontribusi di atas lengkap."
          : "Estimasi kontribusi bulanan muncul setelah data usaha serta peran dan asal setiap orang lengkap."}
      </div>
    );
  }
  const h = data?.hasil;
  const potongan = terminBulan && terminBulan > 1 ? data?.potonganTermin[String(terminBulan)] ?? 0 : 0;

  if (sementara) {
    return (
      <div className="sticky bottom-2 z-10 rounded-xl border-2 border-brand/30 bg-card/95 p-3 text-sm shadow-md backdrop-blur">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">Perkiraan kontribusi</span>
          <span className="flex items-center gap-1.5 text-lg font-bold text-brand tabular-nums">
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {h ? `${formatRp(h.total)}/bulan` : "—"}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">{sementara}</p>
        {h && (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-medium text-brand">Lihat rincian</summary>
            <ul className="mt-1 space-y-0.5 text-xs">
              {h.komponen.map((k) => (
                <li key={k.kode} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{k.label}</span>
                  <span className="tabular-nums">{formatRp(k.nominal)}</span>
                </li>
              ))}
              {h.diskonLokal > 0 && (
                <li className="flex justify-between gap-3 text-success">
                  <span>Potongan pekerja warga RW 03 ({h.diskonLokalPersen}%)</span>
                  <span className="tabular-nums">−{formatRp(h.diskonLokal)}</span>
                </li>
              )}
              {h.terkenaBatasAtas && <li className="text-success">Dibatasi: {h.batasAtasAlasan}</li>}
            </ul>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-brand/30 bg-card p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Estimasi kontribusi bulanan</p>
        {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      {error && !h && <p className="text-xs text-destructive">{(error as Error).message}</p>}
      {h && (
        <>
          <ul className="space-y-1">
            {h.komponen.map((k) => (
              <li key={k.kode} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{k.label}</span>
                <span className="tabular-nums">{formatRp(k.nominal)}</span>
              </li>
            ))}
            {h.diskonLokal > 0 && (
              <li className="flex justify-between gap-3 text-success">
                <span>Potongan pekerja warga RW 03 ({h.diskonLokalPersen}%)</span>
                <span className="tabular-nums">−{formatRp(h.diskonLokal)}</span>
              </li>
            )}
            {h.faktorPenyesuaian !== 1 && (
              <li className="flex justify-between gap-3 text-muted-foreground">
                <span>Faktor penyesuaian RAB</span>
                <span className="tabular-nums">× {h.faktorPenyesuaian.toFixed(2)}</span>
              </li>
            )}
            {h.terkenaBatasAtas && (
              <li className="text-xs text-success">Dibatasi: {h.batasAtasAlasan}</li>
            )}
          </ul>
          <div className="flex items-baseline justify-between border-t pt-2">
            <span className="font-semibold">Per bulan</span>
            <span className="text-xl font-bold text-brand tabular-nums">{formatRp(h.total)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {h.jumlahPekerja} orang tercatat ({h.jumlahPegawai ?? h.jumlahPekerja} pegawai) · {h.pekerjaRw3} warga RW 03 ({h.persenPekerjaRw3}%) ·{" "}
            {h.pekerjaLuar} dari luar
          </p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
            {usahaBaru && <li>Bulan pertama gratis (usaha baru).</li>}
            {data.transisiPersen.length > 0 && (
              <li>Masa sosialisasi: bayar {data.transisiPersen.join("% → ")}% lalu penuh.</li>
            )}
            {potongan > 0 && <li>Bayar {terminBulan} bulan di muka: potongan {potongan}%.</li>}
            <li>Tenggang {data.tenggangHari} hari tiap bulan, tanpa denda. Cicilan boleh.</li>
            <li>Angka final ditetapkan setelah survey; bisa ajukan peninjauan bila keberatan.</li>
          </ul>
          <details className="rounded-lg bg-muted/40 p-2">
            <summary className="cursor-pointer text-xs font-medium">Kontribusi Anda dipakai untuk</summary>
            <ul className="mt-2 space-y-0.5 text-xs">
              {data.alokasi
                .filter((a) => a.nominal > 0)
                .map((a) => (
                  <li key={a.id} className="flex justify-between gap-3">
                    <span>{a.label}</span>
                    <span className="tabular-nums">{formatRp(a.nominal)}</span>
                  </li>
                ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
