import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeartHandshake, Minus, Plus } from "lucide-react";
import { useTarifPublik } from "@/components/rw3biz/transparansi";
import { KebutuhanRw3 } from "@/components/rw3biz/pernyataan";
import {
  ASAL_ORANG_BIZ,
  ASAL_ORANG_BIZ_LABEL,
  CHARTER_BIZ,
  JENIS_TEMPAT_BIZ,
  JENIS_TEMPAT_BIZ_LABEL,
  KENDARAAN_BIZ,
  OPERASIONAL_MALAM,
  OPERASIONAL_MALAM_LABEL,
  PERAN_ORANG_BIZ_LABEL,
  STATUS_TEMPAT_BIZ,
  STATUS_TEMPAT_BIZ_LABEL,
  SUMBANGSIH_MAKS_PER_PROGRAM,
  formatRp,
  turunkanOperasionalMalam,
  type PosAnggaran,
} from "@shared/rw3biz-kontribusi";
import { JANGKAR_SUMBANGSIH_DETAIL, teksBagianSayaRab } from "@shared/rw3biz-pernyataan";

export const JENIS_TEMPAT_BIZ_OPTIONS = JENIS_TEMPAT_BIZ.map((v) => ({ value: v, label: JENIS_TEMPAT_BIZ_LABEL[v] }));

/** Peran yang boleh diisi pemohon: data pegawai tidak dicatat. */
export const PERAN_PEMOHON_BIZ = ["pemilik", "penanggung_jawab"] as const;

export type BizKontribusiForm = {
  statusTempat: string;
  luasM2: string;
  hariOperasional: string;
  /** Data lama; tidak ditanyakan lagi, dibawa apa adanya. */
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

/** Isi ulang form dari data tersimpan (perpanjang). */
export function bizFormDariData(d: {
  statusTempat: string;
  luasM2: number;
  hariOperasional: number;
  rentangOmzet?: string | null;
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
    rentangOmzet: d.rentangOmzet ?? "",
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
    rentangOmzet: f.rentangOmzet || null,
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

/** Data tempat & kendaraan usaha (perpanjang). Diverifikasi Ketua RW saat menyetujui; tidak menentukan sumbangsih. */
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
  return (
    <div className="space-y-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
      <div>
        <p className="font-semibold text-sm">Tempat & kendaraan usaha</p>
        <p className="text-xs text-muted-foreground">Isi sesuai keadaan sekarang. Ketua RW 03 dapat memverifikasi saat menyetujui.</p>
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
                  <p className="text-sm font-medium">{k.label}</p>
                  <p className="text-[11px] text-muted-foreground">{k.contoh}</p>
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
          Kendaraan bukan milik usaha — disewa/dicarter untuk kirim atau ambil barang lewat jalan RW 03.
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
                      <p className="text-[11px] text-muted-foreground">Rata-rata datang per minggu</p>
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
    </div>
  );
}

/** Peran & asal pemohon (pemilik / penanggung jawab). */
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
        <Label>Anda di usaha ini sebagai *</Label>
        <div className="grid grid-cols-2 gap-2">
          {PERAN_PEMOHON_BIZ.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ peran: v })}
              className={`rounded-lg border px-3 py-3 text-sm transition-colors ${
                peran === v ? "border-brand bg-brand/10 font-medium" : "bg-background hover:bg-muted"
              }`}
            >
              {PERAN_ORANG_BIZ_LABEL[v]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Tempat tinggal *</Label>
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
        <p className="text-xs text-muted-foreground">NIK dicocokkan otomatis dengan data warga RW 03.</p>
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
  if (!(PERAN_PEMOHON_BIZ as readonly string[]).includes(o.peran)) return "Pilih: pemilik atau penanggung jawab usaha";
  if (!o.asal) return "Pilih tempat tinggal (warga RW 03 atau luar)";
  if (o.asal === "luar" && !o.domisili.trim()) return "Isi alamat domisili bila tinggal di luar RW 03";
  return null;
}

// ---------------------------------------------------------------- Sumbangsih

/** Nominal per bulan per program (id pos anggaran → rupiah). */
export type IsianSumbangsih = Record<string, number>;

export function useProgramRw3(enabled = true): { program: PosAnggaran[]; isLoading: boolean } {
  const { data, isLoading } = useTarifPublik(enabled);
  return { program: data?.posAnggaran ?? [], isLoading };
}

export function sumbangsihPayload(isian: IsianSumbangsih) {
  return Object.entries(isian)
    .filter(([, n]) => n > 0)
    .map(([posId, nominal]) => ({ posId, nominal: Math.round(nominal) }));
}

/** Total hanya untuk program yang masih berlaku (isian draf lama bisa memuat program yang sudah dihapus). */
export function totalIsianSumbangsih(isian: IsianSumbangsih, program: PosAnggaran[]): number {
  return program.reduce((s, p) => s + Math.max(0, isian[p.id] ?? 0), 0);
}

export function validateSumbangsih(isian: IsianSumbangsih, program: PosAnggaran[]): string | null {
  return totalIsianSumbangsih(isian, program) > 0 ? null : "Isi sumbangsih untuk minimal satu program RW 03";
}

function InputRupiah({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex h-12 items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
      <span className="pl-3 pr-1 text-sm font-medium text-muted-foreground">Rp</span>
      <input
        className="h-full min-w-0 flex-1 bg-transparent pr-3 text-lg font-semibold tabular-nums outline-none"
        inputMode="numeric"
        aria-label={label}
        placeholder="0"
        value={value > 0 ? value.toLocaleString("id-ID") : ""}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, "").slice(0, 9), 10) || 0;
          onChange(Math.min(SUMBANGSIH_MAKS_PER_PROGRAM, n));
        }}
      />
      <span className="pr-3 text-xs text-muted-foreground">/bulan</span>
    </div>
  );
}

/** Pengusaha menyanggupkan sendiri nominal per program — tidak ada rumus/tarif. */
export function SumbangsihFields({
  value,
  onChange,
  tanpaPengantar,
}: {
  value: IsianSumbangsih;
  onChange: (v: IsianSumbangsih) => void;
  /** Penjelasan sudah ada di judul langkah. */
  tanpaPengantar?: boolean;
}) {
  const { program, isLoading } = useProgramRw3();
  const { data: tarif } = useTarifPublik();
  const total = totalIsianSumbangsih(value, program);
  const ubah = (id: string, n: number) => onChange({ ...value, [id]: n });
  const target = tarif?.targetBulanan ?? 0;

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  return (
    <div className="space-y-3">
      {!tanpaPengantar && (
        <div className="space-y-1 rounded-xl border border-brand/20 bg-brand/5 p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <HeartHandshake className="h-4 w-4 text-brand" /> Sumbangsih untuk program RW 03
          </p>
          <p className="text-muted-foreground">
            Tidak ada tarif. Tulis sebesar kemampuan Anda <b>setiap bulan</b>. Setor lewat transfer{" "}
            <b>BCA 1390997490 a.n. Raden Raka</b>, atau tunai dalam amplop — petugas RW mengambil sambil memberi kwitansi. Oknum di
            luar saluran resmi berhak ditolak.
          </p>
        </div>
      )}
      <KebutuhanRw3 ringkas />
      {target > 0 && (
        <div className="space-y-2 rounded-xl border border-brand/30 bg-card p-3 text-xs leading-snug">
          <p className="font-medium text-sm">Level sanggupan (bukan tarif)</p>
          <p className="text-muted-foreground">{teksBagianSayaRab(target)}</p>
          <p className="text-muted-foreground">Ketuk level — total dimasukkan ke program pertama; Anda bisa bagi ke 1–3 program.</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {JANGKAR_SUMBANGSIH_DETAIL.map((j) => {
              const aktif = total === j.nominal;
              return (
                <button
                  key={j.nominal}
                  type="button"
                  onClick={() => {
                    const pertama = program[0]?.id;
                    if (!pertama) return;
                    onChange({ [pertama]: j.nominal });
                  }}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    aktif ? "border-brand bg-brand text-white" : "bg-background hover:bg-muted"
                  }`}
                >
                  <span className="block text-sm font-semibold tabular-nums">{j.labelPendek}/bulan</span>
                  <span className={`block text-[11px] ${aktif ? "text-white/90" : "text-muted-foreground"}`}>{j.setara}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p className="pt-1 text-sm font-semibold">Rincian per program (utamakan 1–3):</p>
      {program.map((p) => {
        const n = value[p.id] ?? 0;
        return (
          <div key={p.id} className={`space-y-2 rounded-xl border p-3 ${n > 0 ? "border-brand/50 bg-brand/5" : "bg-card"}`}>
            <div>
              <p className="text-sm font-semibold">{p.label}</p>
              {p.keterangan && <p className="text-xs text-muted-foreground">{p.keterangan}</p>}
              {p.nominal > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Kebutuhan program {formatRp(p.nominal)}/bulan · {formatRp(p.nominal * 12)}/tahun
                </p>
              )}
            </div>
            <InputRupiah value={n} onChange={(v) => ubah(p.id, v)} label={`Sumbangsih untuk ${p.label}`} />
            {n > 0 && (
              <button type="button" onClick={() => ubah(p.id, 0)} className="text-xs text-muted-foreground underline">
                Kosongkan
              </button>
            )}
          </div>
        );
      })}
      <div className="sticky bottom-2 z-10 space-y-1 rounded-xl border-2 border-brand/30 bg-card/95 p-3 shadow-md backdrop-blur">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">Jumlah sumbangsih</span>
          <span className="text-lg font-bold tabular-nums text-brand">{formatRp(total)}/bulan</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ini komitmen Anda setiap bulan paling lambat tanggal 1 — bukan sekali bayar.
        </p>
      </div>
    </div>
  );
}

/** Ringkasan sumbangsih yang disanggupkan (periksa sebelum kirim, cek status). */
export function RingkasanSumbangsih({ items, catatan }: { items: { label: string; nominal: number }[]; catatan?: string }) {
  const total = items.reduce((s, x) => s + x.nominal, 0);
  return (
    <div className="space-y-2 rounded-xl border-2 border-brand/30 bg-card p-4 text-sm">
      <p className="font-semibold">Sumbangsih bulanan untuk program RW 03</p>
      <ul className="space-y-1">
        {items.map((x) => (
          <li key={x.label} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{x.label}</span>
            <span className="tabular-nums">{formatRp(x.nominal)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t pt-2">
        <span className="font-semibold">Per bulan</span>
        <span className="text-xl font-bold tabular-nums text-brand">{formatRp(total)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Komitmen setiap bulan paling lambat tanggal 1 — bukan sekali bayar.
      </p>
      {catatan && <p className="text-xs text-muted-foreground">{catatan}</p>}
    </div>
  );
}

export function ringkasIsianSumbangsih(isian: IsianSumbangsih, program: PosAnggaran[]) {
  return program.filter((p) => (isian[p.id] ?? 0) > 0).map((p) => ({ label: p.label, nominal: isian[p.id] }));
}
