import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearch, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { compressDokumen, dataUrlBytes, formatBytes } from "@/lib/image-compress";
import { normalizeNomorHp } from "@shared/kontak";
import { hitungTanggalBerlaku } from "@shared/visitrw3-kontribusi";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, readJsonSafely, getApiErrorMessage } from "@/lib/queryClient";
import {
  rtOptions,
  keperluanTinggalOptions,
  pekerjaanLegacyOptions,
  jenisKendaraanOptions,
  visitrw3KategoriUsahaOptions,
  visitrw3JenjangAnakOptions,
  JAM_24H_OPTIONS,
} from "@/lib/constants";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Minus,
  BookOpen,
  Home,
  BedDouble,
  Store,
  Camera,
  ImageIcon,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import {
  emptyKendaraanRow,
  formatKendaraanDisplay,
  kendaraanWithPlatParts,
  serializeKendaraanForApi,
  type KendaraanRow,
} from "@/lib/visitrw3-kendaraan";
import { bulanIni, STATUS_KENDARAAN, type StatusKendaraan } from "@shared/visitrw3-kendaraan";
import { aturanKeperluan, barisKeperluan, type DetailKeperluan } from "@shared/visitrw3-keperluan";
import { joinPlatNomor } from "@/lib/visitrw3-plat";
import {
  validateStepBayar,
  validateJumlahByJenis,
  validateSinglePenghuni,
  validateLokasiWargaSinggah,
  validateJualanFields,
} from "@/lib/visitrw3-validate-pengajuan";
import { PlatNomorInput } from "@/components/gov/plat-nomor-input";
import { FormStepper } from "@/components/gov/form-stepper";
import { SuccessPanel } from "@/components/gov/success-panel";
import { KontribusiTinggalInfo, PilihUkuranTinggal, Visitrw3SyaratPanel } from "@/components/gov/visitrw3-syarat-panel";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { isUkuranTinggal, labelUkuranTinggal, settingsRowsToMap } from "@/lib/visitrw3-kontribusi";
import { buildKategoriUsahaPayload } from "@shared/visitrw3-kategori-usaha";
import {
  VISITRW3_ROUTES,
  parseJenisWargaFromSearch,
} from "@/lib/visitrw3-routes";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import {
  JENIS_WARGA_DESKRIPSI,
  JENIS_WARGA_LABEL,
  keperluanFromJenisWarga,
  type JenisWarga,
} from "@shared/visitrw3-jenis-warga";
import { isVisitRw3Jenis } from "@shared/visitrw3-produk";
import { aturanFotoKk, getVisitrw3FormProfile } from "@shared/visitrw3-form-by-jenis";
import type { PengajuanProduct } from "@/lib/visitrw3-produk-ui";
import {
  EstimasiKontribusiCard,
  JENIS_TEMPAT_BIZ_OPTIONS,
  OrangKontribusiFields,
  UsahaKontribusiFields,
  bizKontribusiPayload,
  emptyBizKontribusi,
  validateBizKontribusi,
  validateOrangKontribusi,
  type BizKontribusiForm,
} from "@/components/rw3biz/kontribusi-form";

import {
  ASAL_ORANG_BIZ_LABEL,
  PERAN_ORANG_BIZ_LABEL,
  type AsalOrangBiz,
  type PeranOrangBiz,
} from "@shared/rw3biz-kontribusi";

type StepDef = { id: string; label: string };
export type { PengajuanProduct };

const JENIS_CHOICES_VISIT: {
  id: "kontrak" | "kost";
  title: string;
  subtitle: string;
  icon: typeof Home;
  href: string;
}[] = [
  {
    id: "kontrak",
    title: JENIS_WARGA_LABEL.kontrak,
    subtitle: JENIS_WARGA_DESKRIPSI.kontrak,
    icon: Home,
    href: VISITRW3_ROUTES.kontrak.pengajuan,
  },
  {
    id: "kost",
    title: JENIS_WARGA_LABEL.kost,
    subtitle: JENIS_WARGA_DESKRIPSI.kost,
    icon: BedDouble,
    href: VISITRW3_ROUTES.kost.pengajuan,
  },
];

function buildPengajuanSteps(jenis: JenisWarga): StepDef[] {
  const steps: StepDef[] = [{ id: "lokasi", label: "Lokasi" }];
  if (jenis === "jualan") steps.push({ id: "usaha", label: "Usaha" });
  steps.push(
    {
      id: "jumlah",
      label: jenis === "jualan" ? "Pegawai" : jenis === "kost" ? "Isi kamar" : "Keluarga",
    },
    {
      id: "penghuni",
      label: jenis === "jualan" ? "Data pegawai" : "Data diri",
    },
    { id: "bayar", label: "Berlaku & setuju" },
  );
  return steps;
}

function MicroStepHeader({
  current,
  total,
  title,
  hint,
}: {
  current: number;
  total: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-brand/5 border border-brand/20 p-3 space-y-1">
      {total > 1 && (
        <p className="text-xs text-muted-foreground">
          Bagian {current} dari {total}
        </p>
      )}
      <p className="font-semibold text-sm">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function JumlahStepper({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  hint: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 text-center">
      <Label>{label}</Label>
      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 touch-target"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Kurangi ${label}`}
        >
          <Minus className="w-5 h-5" />
        </Button>
        {max > 12 ? (
          <Input
            className="h-12 w-20 text-center text-2xl font-bold tabular-nums"
            inputMode="numeric"
            aria-label={label}
            value={String(value)}
            onChange={(e) => {
              const n = parseInt(e.target.value.replace(/\D/g, "").slice(0, String(max).length), 10);
              onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
            }}
          />
        ) : (
          <span className="text-3xl font-bold tabular-nums w-10">{value}</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 touch-target"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Tambah ${label}`}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

const TERMIN_OPTIONS = [
  { value: "1", label: "Bulanan (1 bulan)" },
  { value: "3", label: "3 bulan" },
  { value: "6", label: "6 bulan" },
  { value: "12", label: "1 tahun" },
];

type PenghuniForm = {
  namaLengkap: string;
  tanggalLahir: string;
  isAnak: boolean;
  nik: string;
  nomorWhatsapp: string;
  jenisKelamin: string;
  pekerjaan: string;
  keperluanTinggal: string;
  detailKeperluan: DetailKeperluan;
  namaTempatKerja: string;
  namaSekolah: string;
  punyaKendaraan: "" | "ya" | "tidak";
  kendaraanList: KendaraanRow[];
  fotoKtpPath: string;
  /** RW3BIZ: peran & asal pekerja. */
  peran: string;
  asal: string;
  domisili: string;
};

function pegawaiBiasa(p: PenghuniForm) {
  return p.peran === "pekerja_tetap" || p.peran === "pekerja_harian";
}

/** Anak tidak dihitung sebagai pekerja; nilai bawaan hanya untuk lolos skema. */
function orangKontribusiPayload(p: PenghuniForm) {
  if (p.isAnak) return { peran: "pekerja_harian", asal: "rw3", domisili: null };
  return {
    peran: p.peran,
    asal: p.asal,
    domisili: p.asal === "luar" ? p.domisili.trim() || null : null,
  };
}

function emptyPenghuni(isAnak = false): PenghuniForm {
  return {
    namaLengkap: "",
    tanggalLahir: "",
    isAnak,
    nik: "",
    nomorWhatsapp: "",
    jenisKelamin: "",
    pekerjaan: "",
    keperluanTinggal: "",
    detailKeperluan: {},
    namaTempatKerja: "",
    namaSekolah: "",
    punyaKendaraan: "",
    kendaraanList: [],
    fotoKtpPath: "",
    peran: "",
    asal: "",
    domisili: "",
  };
}

function RincianKeperluanFields({
  idPrefix,
  penghuni: p,
  opsi,
  onKeperluan,
  onTempat,
  onDetail,
}: {
  idPrefix: string;
  penghuni: PenghuniForm;
  opsi: readonly string[];
  onKeperluan: (v: string) => void;
  onTempat: (v: string) => void;
  onDetail: (patch: Partial<DetailKeperluan>) => void;
}) {
  const aturan = aturanKeperluan(p.keperluanTinggal);
  const d = p.detailKeperluan;
  const bintang = (wajib: boolean) => (wajib ? " *" : "");
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="space-y-2">
        <Label>Keperluan tinggal di RW 03 *</Label>
        <Select value={p.keperluanTinggal} onValueChange={onKeperluan}>
          <SelectTrigger className="h-12 bg-background">
            <SelectValue placeholder="Pilih: kerja, kuliah, usaha, atau lainnya" />
          </SelectTrigger>
          <SelectContent>
            {opsi.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {aturan && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-tempat`}>{aturan.tempat.label.replace(" (opsional)", "")}{bintang(aturan.tempat.wajib)}</Label>
            <Input
              id={`${idPrefix}-tempat`}
              className="h-12 bg-background"
              placeholder={aturan.tempat.placeholder}
              value={p.namaTempatKerja}
              onChange={(e) => onTempat(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-alamat`}>{aturan.alamat.label.replace(" (opsional)", "")}{bintang(aturan.alamat.wajib)}</Label>
            <Input
              id={`${idPrefix}-alamat`}
              className="h-12 bg-background"
              placeholder={aturan.alamat.placeholder}
              value={d.alamat ?? ""}
              onChange={(e) => onDetail({ alamat: e.target.value })}
            />
          </div>
          {aturan.peran && (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-peran`}>{aturan.peran.label}{bintang(aturan.peran.wajib)}</Label>
              <Input
                id={`${idPrefix}-peran`}
                className="h-12 bg-background"
                placeholder={aturan.peran.placeholder}
                value={d.peran ?? ""}
                onChange={(e) => onDetail({ peran: e.target.value })}
              />
            </div>
          )}
          {aturan.status && (
            <div className="space-y-2">
              <Label>{aturan.status.label} *</Label>
              <Select value={d.status ?? ""} onValueChange={(v) => onDetail({ status: v })}>
                <SelectTrigger className="h-12 bg-background">
                  <SelectValue placeholder={`Pilih ${aturan.status.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {aturan.status.opsi.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-sampai`}>{aturan.sampaiLabel} *</Label>
            <Input
              id={`${idPrefix}-sampai`}
              type="month"
              className="h-12 bg-background"
              min={bulanIni()}
              disabled={Boolean(aturan.tidakTentuLabel && d.tidakTentu)}
              value={d.sampai ?? ""}
              onChange={(e) => onDetail({ sampai: e.target.value })}
            />
            {aturan.tidakTentuLabel && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${idPrefix}-tidak-tentu`}
                  checked={Boolean(d.tidakTentu)}
                  onCheckedChange={(c) => onDetail({ tidakTentu: Boolean(c), sampai: c ? null : d.sampai })}
                />
                <Label htmlFor={`${idPrefix}-tidak-tentu`} className="text-sm font-normal">
                  {aturan.tidakTentuLabel}
                </Label>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Pilih bulan dan tahun. Perkiraan juga boleh.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-uraian`}>{aturan.uraian.label}{bintang(aturan.uraian.wajib)}</Label>
            <Textarea
              id={`${idPrefix}-uraian`}
              rows={2}
              maxLength={500}
              className="bg-background"
              placeholder={aturan.uraian.placeholder}
              value={d.uraian ?? ""}
              onChange={(e) => onDetail({ uraian: e.target.value })}
            />
          </div>
        </>
      )}
    </div>
  );
}

function RingkasanPenghuni({ penghuni: p, pakaiKeperluan }: { penghuni: PenghuniForm; pakaiKeperluan: boolean }) {
  const keperluan = pakaiKeperluan ? barisKeperluan(p.keperluanTinggal, p.namaTempatKerja, p.detailKeperluan) : [];
  const api = serializeKendaraanForApi(p.kendaraanList, p.punyaKendaraan === "ya");
  const kendaraan =
    p.punyaKendaraan === "tidak"
      ? "Tidak punya"
      : p.punyaKendaraan === "ya"
        ? formatKendaraanDisplay(api.jenisKendaraan, api.platNomor) || "Belum lengkap"
        : "Belum dijawab";
  return (
    <dl className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
      {keperluan.map(([a, v]) => (
        <div key={a}>
          <dt className="inline">{a}: </dt>
          <dd className="inline text-foreground">{v}</dd>
        </div>
      ))}
      <div>
        <dt className="inline">Kendaraan: </dt>
        <dd className="inline text-foreground">{kendaraan}</dd>
      </div>
    </dl>
  );
}

function KendaraanFields({
  idPrefix,
  penghuni: p,
  onPunya,
  onUbah,
  onTambah,
  onHapus,
}: {
  idPrefix: string;
  penghuni: PenghuniForm;
  onPunya: (punya: boolean) => void;
  onUbah: (ki: number, patch: Partial<KendaraanRow>) => void;
  onTambah: () => void;
  onHapus: (ki: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="space-y-1">
        <Label>Punya kendaraan yang dibawa/dipakai di RW 03? *</Label>
        <p className="text-xs text-muted-foreground">
          Untuk keamanan lingkungan (mencegah kendaraan curian). Siapkan STNK, akan dicocokkan saat survey.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={p.punyaKendaraan === "ya" ? "default" : "outline"}
          className="h-11"
          aria-pressed={p.punyaKendaraan === "ya"}
          onClick={() => onPunya(true)}
        >
          Ya, punya
        </Button>
        <Button
          type="button"
          variant={p.punyaKendaraan === "tidak" ? "default" : "outline"}
          className="h-11"
          aria-pressed={p.punyaKendaraan === "tidak"}
          onClick={() => onPunya(false)}
        >
          Tidak punya
        </Button>
      </div>
      {p.punyaKendaraan === "ya" && (
        <div className="space-y-3">
          {p.kendaraanList.map((k, ki) => {
            const id = `${idPrefix}-${ki}`;
            return (
              <div key={ki} className="space-y-2 rounded-md border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Kendaraan {ki + 1}</p>
                  {p.kendaraanList.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onHapus(ki)}
                      aria-label={`Hapus kendaraan ${ki + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Jenis *</Label>
                    <Select value={k.jenis} onValueChange={(v) => onUbah(ki, { jenis: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                      <SelectContent>
                        {jenisKendaraanOptions.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-warna`} className="text-xs">Warna *</Label>
                    <Input
                      id={`${id}-warna`}
                      placeholder="Hitam"
                      value={k.warna}
                      onChange={(e) => onUbah(ki, { warna: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-merek`} className="text-xs">Merek / tipe *</Label>
                  <Input
                    id={`${id}-merek`}
                    placeholder="Contoh: Honda Beat, Toyota Avanza"
                    value={k.merek}
                    onChange={(e) => onUbah(ki, { merek: e.target.value })}
                  />
                </div>
                <PlatNomorInput
                  required
                  idPrefix={`${id}-plat`}
                  value={k.platParts}
                  onChange={(platParts) => onUbah(ki, { platParts })}
                />
                <div className="space-y-1">
                  <Label className="text-xs">Status kepemilikan *</Label>
                  <Select value={k.status} onValueChange={(v) => onUbah(ki, { status: v as StatusKendaraan })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Lunas, cicilan, atau milik orang lain?" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_KENDARAAN.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {k.status === "cicilan" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`${id}-leasing`} className="text-xs">Leasing / finance *</Label>
                      <Input
                        id={`${id}-leasing`}
                        placeholder="Adira, FIF, BAF…"
                        value={k.leasing}
                        onChange={(e) => onUbah(ki, { leasing: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${id}-lunas`} className="text-xs">Perkiraan lunas *</Label>
                      <Input
                        id={`${id}-lunas`}
                        type="month"
                        value={k.lunasPada}
                        onChange={(e) => onUbah(ki, { lunasPada: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor={`${id}-stnk`} className="text-xs">Nama pemilik di STNK *</Label>
                  <Input
                    id={`${id}-stnk`}
                    placeholder="Sesuai yang tertulis di STNK"
                    value={k.atasNama}
                    onChange={(e) => onUbah(ki, { atasNama: e.target.value })}
                  />
                  {k.status && k.status !== "lunas" && k.status !== "cicilan" && (
                    <p className="text-xs text-muted-foreground">
                      Kendaraan bukan milik sendiri: tulis nama pemilik di STNK, bukan nama Anda.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {p.kendaraanList.length < 10 && (
            <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={onTambah}>
              <Plus className="w-4 h-4" /> Tambah kendaraan lain
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function umurFromDate(tgl: string) {
  if (!tgl) return 99;
  const b = new Date(`${tgl}T00:00:00`);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

function hariIniLokal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTanggalPanjang(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function hitungBerlakuAman(tanggalBayar: string, terminBulan: string) {
  try {
    return tanggalBayar ? hitungTanggalBerlaku(tanggalBayar, parseInt(terminBulan, 10)) : "";
  } catch {
    return "";
  }
}

type DraftPengajuan = {
  v: 1;
  step: number;
  ktpRw3: boolean | null;
  rt: string;
  alamat: string;
  nomorUnit: string;
  ukuranTinggal?: string;
  namaUsaha: string;
  jenisTempatUsaha: string;
  jenisTempatUsahaLain: string;
  kategoriUsaha: string[];
  kategoriUsahaLain: string;
  penanggungJawab: string;
  jamBuka: string;
  jamTutup: string;
  alamatUsaha: string;
  jumlahDewasa: number;
  jumlahAnak: number;
  penghuni: PenghuniForm[];
  penghuniIndex: number;
  tanggalBayar: string;
  terminBulan: string;
  catatan: string;
  setujuTataTertib: boolean;
  fotoKk?: string;
  bizKontribusi?: BizKontribusiForm;
};

function bacaDraft(key: string): DraftPengajuan | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as DraftPengajuan;
    return d?.v === 1 && Array.isArray(d.penghuni) ? d : null;
  } catch {
    return null;
  }
}

/** localStorage ±5 MB: bila foto KTP membuat penuh, simpan draf tanpa foto. */
function simpanDraft(key: string, draft: DraftPengajuan) {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    try {
      const tanpaFoto = {
        ...draft,
        fotoKk: "",
        penghuni: draft.penghuni.map((p) => ({ ...p, fotoKtpPath: "" })),
      };
      localStorage.setItem(key, JSON.stringify(tanpaFoto));
    } catch {
      /* penyimpanan browser penuh / diblokir */
    }
  }
}

function hapusDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* abaikan */
  }
}

const DOKUMEN_FOTO = {
  ktp: {
    label: "Foto KTP",
    petunjuk: "Foto KTP asli, tidak buram, seluruh kartu terlihat. Foto otomatis diperkecil sebelum dikirim.",
    cekBaca: "Pastikan tulisan NIK & nama terbaca.",
    kompres: { maxSide: 1280, targetBytes: 200_000, minSide: 900 },
  },
  kk: {
    label: "Foto Kartu Keluarga",
    petunjuk: "Foto seluruh lembar KK dari atas, terang, tidak terpotong. Foto otomatis diperkecil sebelum dikirim.",
    cekBaca: "Pastikan nama anggota & nomor KK terbaca.",
    kompres: { maxSide: 2000, targetBytes: 450_000, minSide: 1400 },
  },
} as const;

type JenisFotoDokumen = keyof typeof DOKUMEN_FOTO;

async function siapkanFotoDokumen(file: File, jenis: JenisFotoDokumen): Promise<string> {
  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new Error(`File harus berupa gambar (${DOKUMEN_FOTO[jenis].label})`);
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("Ukuran foto terlalu besar (maks. 25 MB)");
  return compressDokumen(file, DOKUMEN_FOTO[jenis].kompres);
}

function FotoDokumenPicker({
  jenis,
  foto,
  diproses,
  onPilih,
  label,
}: {
  jenis: JenisFotoDokumen;
  foto: string;
  diproses: boolean;
  onPilih: (file: File) => void;
  label?: string;
}) {
  const kameraRef = useRef<HTMLInputElement>(null);
  const galeriRef = useRef<HTMLInputElement>(null);
  const bisaPratinjau = foto.startsWith("data:image/");
  const info = DOKUMEN_FOTO[jenis];

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPilih(f);
  };

  return (
    <div className="space-y-2">
      <Label>{label ?? info.label}</Label>
      {foto ? (
        <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/5 p-2">
          {bisaPratinjau ? (
            <img src={foto} alt={info.label} className="h-16 w-24 rounded object-cover border" />
          ) : (
            <div className="h-16 w-24 rounded border bg-muted flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-success">{info.label} siap ✓</p>
            <p className="text-xs text-muted-foreground">
              {info.cekBaca}
              {bisaPratinjau && ` (${formatBytes(dataUrlBytes(foto))})`}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{info.petunjuk}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={foto ? "outline" : "default"}
          className="h-11 gap-1.5"
          disabled={diproses}
          onClick={() => kameraRef.current?.click()}
        >
          {diproses ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {foto ? "Foto ulang" : "Ambil foto"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-1.5"
          disabled={diproses}
          onClick={() => galeriRef.current?.click()}
        >
          <ImageIcon className="w-4 h-4" />
          Dari galeri
        </Button>
      </div>
      <input ref={kameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={galeriRef} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}

function PesanGalat({ pesan }: { pesan: string | null }) {
  if (!pesan) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
    >
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{pesan}</span>
    </div>
  );
}

export default function Visitrw3Pengajuan() {
  return <PengajuanForm product="visit" />;
}

/** Penyewa ber-KTP RW 03 didata lewat pendataan warga, bukan Visit RW3. */
function AturanKtpRw3({ tegas, className = "" }: { tegas?: boolean; className?: string }) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${tegas ? "border-amber-400 bg-amber-50 text-amber-950" : "border-[hsl(40,45%,55%)] bg-[hsl(40,60%,96%)]"} ${className}`}>
      {tegas ? (
        <p>
          <b>Tidak perlu daftar Visit RW3.</b> Penghuni kost/kontrakan yang KTP-nya RW 03 didata sebagai warga.
          Isi lewat kode kartu pendataan keluarga di{" "}
          <Link href="/isi" className="font-semibold text-brand underline">halaman pendataan warga</Link>, atau minta
          pengurus RT/RW memperbarui data (status tinggal: kost/kontrak).
        </p>
      ) : (
        <ul className="space-y-1">
          <li>✅ Kost/kontrak, <b>KTP luar RW 03</b> → daftar di sini (Visit RW3).</li>
          <li>➡️ Kost/kontrak, <b>KTP RW 03</b> → bukan di sini; didata sebagai warga lewat{" "}
            <Link href="/isi" className="font-semibold text-brand underline">pendataan warga</Link>.
          </li>
        </ul>
      )}
    </div>
  );
}

export function PengajuanForm({ product }: { product: PengajuanProduct }) {
  const { toast } = useToast();
  const search = useSearch();
  const rawJenis = useMemo(() => parseJenisWargaFromSearch(search), [search]);
  const redirectToRw3biz = product === "visit" && rawJenis === "jualan";
  const petugas = useMemo(() => new URLSearchParams(search).get("petugas") === "1", [search]);
  const [ktpRw3, setKtpRw3] = useState<boolean | null>(null);

  const jenisWarga: JenisWarga | "" =
    product === "rw3biz" ? "jualan" : isVisitRw3Jenis(rawJenis) ? rawJenis : "";

  const Shell = product === "rw3biz" ? Rw3bizShell : Visitrw3Shell;
  const hubHref = product === "rw3biz" ? RW3BIZ_ROUTES.hub : VISITRW3_ROUTES.hub;
  const panduanHref = product === "rw3biz" ? RW3BIZ_ROUTES.panduan : VISITRW3_ROUTES.panduan;
  const statusHref = product === "rw3biz" ? RW3BIZ_ROUTES.status : VISITRW3_ROUTES.status;
  const productTitle = product === "rw3biz" ? "RW3BIZ" : "Visit RW3";

  const [step, setStep] = useState(0);
  const [rt, setRt] = useState("");
  const [alamat, setAlamat] = useState("");
  const [nomorUnit, setNomorUnit] = useState("");
  const [ukuranTinggal, setUkuranTinggal] = useState("");
  const [namaUsaha, setNamaUsaha] = useState("");
  const [jenisTempatUsaha, setJenisTempatUsaha] = useState("");
  const [jenisTempatUsahaLain, setJenisTempatUsahaLain] = useState("");
  const [kategoriUsaha, setKategoriUsaha] = useState<string[]>([]);
  const [kategoriUsahaLain, setKategoriUsahaLain] = useState("");
  const [penanggungJawab, setPenanggungJawab] = useState("");
  const [jamBuka, setJamBuka] = useState("");
  const [jamTutup, setJamTutup] = useState("");
  const [alamatUsaha, setAlamatUsaha] = useState("");
  const [jumlahDewasa, setJumlahDewasa] = useState(1);
  const [jumlahAnak, setJumlahAnak] = useState(0);
  const jumlah = jumlahDewasa + jumlahAnak;
  const aturanKk = product === "visit" ? aturanFotoKk(jenisWarga, jumlahAnak) : "tidak";
  const [penghuni, setPenghuni] = useState<PenghuniForm[]>([emptyPenghuni(false)]);
  const [tanggalBayar, setTanggalBayar] = useState(hariIniLokal);
  const [terminBulan, setTerminBulan] = useState("3");
  const [catatan, setCatatan] = useState("");
  const [setujuTataTertib, setSetujuTataTertib] = useState(false);
  const [nomorHasil, setNomorHasil] = useState<string | null>(null);
  const [penghuniIndex, setPenghuniIndex] = useState(0);
  const [galat, setGalat] = useState<{ pesan: string; step: number; idx: number } | null>(null);
  const [fotoDiproses, setFotoDiproses] = useState<number | null>(null);
  const [fotoKk, setFotoKk] = useState("");
  const [bizKontribusi, setBizKontribusi] = useState<BizKontribusiForm>(emptyBizKontribusi);
  const ubahBizKontribusi = (patch: Partial<BizKontribusiForm>) =>
    setBizKontribusi((prev) => ({ ...prev, ...patch }));
  const [kkDiproses, setKkDiproses] = useState(false);
  const [draftDipulihkan, setDraftDipulihkan] = useState(false);
  const previewSampai = useMemo(
    () => hitungBerlakuAman(tanggalBayar, terminBulan),
    [tanggalBayar, terminBulan],
  );

  const catatanKirim = () => {
    const isi = catatan.trim();
    if (!petugas) return isi || null;
    return `[Diisi petugas dari formulir kertas]${isi ? ` ${isi}` : ""}`;
  };

  const keperluan = jenisWarga ? keperluanFromJenisWarga(jenisWarga) : "tinggal";
  const formProfile = useMemo(
    () => (jenisWarga ? getVisitrw3FormProfile(jenisWarga) : null),
    [jenisWarga],
  );
  const steps = useMemo(
    () => (jenisWarga ? buildPengajuanSteps(jenisWarga) : []),
    [jenisWarga],
  );
  const stepId = steps[step]?.id ?? "lokasi";

  useEffect(() => {
    if (!formProfile) return;
    setTerminBulan(formProfile.defaultTerminBulan);
    if (!formProfile.showAnak) setJumlahAnak(0);
    setJumlahDewasa((d) => Math.min(Math.max(1, d), formProfile.maxDewasa));
  }, [formProfile]);

  const draftKey = jenisWarga ? `pengajuan-draft:${product}:${jenisWarga}` : "";
  const [draftSiapKey, setDraftSiapKey] = useState("");

  function terapkanDraft(d: DraftPengajuan | null) {
    setStep(d?.step ?? 0);
    setKtpRw3(d?.ktpRw3 ?? null);
    setRt(d?.rt ?? "");
    setAlamat(d?.alamat ?? "");
    setNomorUnit(d?.nomorUnit ?? "");
    setUkuranTinggal(d?.ukuranTinggal ?? "");
    setNamaUsaha(d?.namaUsaha ?? "");
    setJenisTempatUsaha(d?.jenisTempatUsaha ?? "");
    setJenisTempatUsahaLain(d?.jenisTempatUsahaLain ?? "");
    setKategoriUsaha(d?.kategoriUsaha ?? []);
    setKategoriUsahaLain(d?.kategoriUsahaLain ?? "");
    setPenanggungJawab(d?.penanggungJawab ?? "");
    setJamBuka(d?.jamBuka ?? "");
    setJamTutup(d?.jamTutup ?? "");
    setAlamatUsaha(d?.alamatUsaha ?? "");
    setJumlahDewasa(d?.jumlahDewasa ?? 1);
    setJumlahAnak(d?.jumlahAnak ?? 0);
    setPenghuni(
      d?.penghuni?.length
        ? d.penghuni.map((p) => {
            const list = (p.kendaraanList ?? []).map((k) => kendaraanWithPlatParts(k));
            return {
              ...emptyPenghuni(p.isAnak),
              ...p,
              detailKeperluan: { ...(p.detailKeperluan ?? {}) },
              kendaraanList: list,
              punyaKendaraan: p.punyaKendaraan ?? (list.length ? "ya" : ""),
            };
          })
        : [emptyPenghuni(false)],
    );
    setPenghuniIndex(d?.penghuniIndex ?? 0);
    setTanggalBayar(d?.tanggalBayar || hariIniLokal());
    if (d?.terminBulan) setTerminBulan(d.terminBulan);
    setCatatan(d?.catatan ?? "");
    setSetujuTataTertib(false);
    setFotoKk(d?.fotoKk ?? "");
    setBizKontribusi({ ...emptyBizKontribusi(), ...(d?.bizKontribusi ?? {}) });
  }

  // Dideklarasikan setelah efek formProfile agar nilai draf menimpa nilai bawaan.
  useEffect(() => {
    if (!draftKey) return;
    const d = bacaDraft(draftKey);
    if (d) {
      terapkanDraft(d);
      setDraftDipulihkan(true);
    } else {
      setDraftDipulihkan(false);
    }
    setDraftSiapKey(draftKey);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || draftSiapKey !== draftKey || nomorHasil) return;
    const t = window.setTimeout(() => {
      simpanDraft(draftKey, {
        v: 1,
        step,
        ktpRw3,
        rt,
        alamat,
        nomorUnit,
        ukuranTinggal,
        namaUsaha,
        jenisTempatUsaha,
        jenisTempatUsahaLain,
        kategoriUsaha,
        kategoriUsahaLain,
        penanggungJawab,
        jamBuka,
        jamTutup,
        alamatUsaha,
        jumlahDewasa,
        jumlahAnak,
        penghuni,
        penghuniIndex,
        tanggalBayar,
        terminBulan,
        catatan,
        setujuTataTertib,
        fotoKk,
        bizKontribusi,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [
    draftKey, draftSiapKey, nomorHasil, step, ktpRw3, rt, alamat, nomorUnit, ukuranTinggal, namaUsaha,
    jenisTempatUsaha, jenisTempatUsahaLain, kategoriUsaha, kategoriUsahaLain, penanggungJawab,
    jamBuka, jamTutup, alamatUsaha, jumlahDewasa, jumlahAnak, penghuni, penghuniIndex,
    tanggalBayar, terminBulan, catatan, setujuTataTertib, fotoKk, bizKontribusi,
  ]);

  function mulaiUlang() {
    if (!window.confirm("Hapus semua isian dan mulai dari awal?")) return;
    if (draftKey) hapusDraft(draftKey);
    terapkanDraft(null);
    if (formProfile) setTerminBulan(formProfile.defaultTerminBulan);
    setDraftDipulihkan(false);
    setErrMsg(null);
  }

  const sudahScroll = useRef(false);
  useEffect(() => {
    if (!sudahScroll.current) {
      sudahScroll.current = true;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, penghuniIndex]);

  const errMsg =
    galat && galat.step === step && (stepId !== "penghuni" || galat.idx === penghuniIndex)
      ? galat.pesan
      : null;

  function setErrMsg(pesan: string | null, tujuan?: { step: number; idx?: number }) {
    setGalat(
      pesan
        ? { pesan, step: tujuan?.step ?? step, idx: tujuan?.idx ?? penghuniIndex }
        : null,
    );
  }

  const showErr = (msg: string, tujuan?: { step: number; idx?: number }) => {
    setErrMsg(msg, tujuan);
    toast({ title: "Lengkapi data", description: msg, variant: "destructive" });
  };

  function goStep(delta: number) {
    setStep((s) => Math.min(Math.max(0, s + delta), steps.length - 1));
  }

  function indeksLangkah(id: string) {
    return steps.findIndex((s) => s.id === id);
  }

  function lompatKe(id: string) {
    const idx = indeksLangkah(id);
    if (idx >= 0) setStep(idx);
  }

  const settingsApi =
    product === "rw3biz" ? "/api/public/rw3biz/settings" : "/api/public/visitrw3/settings";
  const pengajuanApi =
    product === "rw3biz" ? "/api/public/rw3biz/pengajuan" : "/api/public/visitrw3/pengajuan";

  const { data: settingsRows = [], isLoading: settingsLoading } = useQuery({
    queryKey: [settingsApi],
    queryFn: async () => {
      const res = await fetch(settingsApi);
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return readJsonSafely<{ key: string; value: string; updatedAt?: string }[]>(res);
    },
    enabled: Boolean(jenisWarga) || product === "rw3biz",
  });

  const settingsMap = useMemo(() => settingsRowsToMap(settingsRows), [settingsRows]);

  useEffect(() => {
    if (step >= steps.length && steps.length > 0) setStep(Math.max(0, steps.length - 1));
  }, [steps.length, step]);

  useEffect(() => {
    if (penghuniIndex >= penghuni.length) setPenghuniIndex(Math.max(0, penghuni.length - 1));
  }, [penghuni.length, penghuniIndex]);

  useEffect(() => {
    setPenghuni((prev) => {
      const dewasaPrev = prev.filter((p) => !p.isAnak);
      const anakPrev = prev.filter((p) => p.isAnak);
      const dewasa = Array.from({ length: jumlahDewasa }, (_, i) => {
        const row = dewasaPrev[i] ?? emptyPenghuni(false);
        return { ...row, isAnak: false };
      });
      const anak = Array.from({ length: jumlahAnak }, (_, i) => {
        const row = anakPrev[i] ?? emptyPenghuni(true);
        return { ...row, isAnak: true };
      });
      return [...dewasa, ...anak];
    });
  }, [jumlahDewasa, jumlahAnak]);

  function penghuniHeading(p: PenghuniForm, index: number) {
    const sameTypeBefore = penghuni.slice(0, index).filter((x) => x.isAnak === p.isAnak).length;
    const n = sameTypeBefore + 1;
    return p.isAnak ? `Anak ${n}` : `Dewasa ${n}`;
  }

  function clampJumlahDewasa(n: number) {
    const maxDewasa = formProfile
      ? Math.min(formProfile.maxDewasa, Math.max(1, formProfile.maxTotal - jumlahAnak))
      : Math.max(1, 20 - jumlahAnak);
    return Math.min(maxDewasa, Math.max(1, n));
  }

  function clampJumlahAnak(n: number) {
    if (!formProfile?.showAnak) return 0;
    const maxAnak = Math.min(
      formProfile.maxAnak,
      Math.max(0, formProfile.maxTotal - jumlahDewasa),
    );
    return Math.min(maxAnak, Math.max(0, n));
  }

  const penghuniPayload = useMemo(
    () =>
      penghuni.map((p) => {
        const kendaraan = p.isAnak
          ? { punyaKendaraan: false, jenisKendaraan: null, platNomor: null }
          : serializeKendaraanForApi(p.kendaraanList, p.punyaKendaraan === "ya");
        const pakaiDetail = !p.isAnak && Boolean(formProfile?.requireKeperluanTinggal);
        return {
          namaLengkap: p.namaLengkap.trim(),
          tanggalLahir: p.tanggalLahir,
          isAnak: p.isAnak,
          nik: p.isAnak ? null : p.nik,
          nomorWhatsapp: p.isAnak
            ? null
            : normalizeNomorHp(p.nomorWhatsapp) ?? (p.nomorWhatsapp.trim() || null),
          jenisKelamin: p.isAnak ? null : p.jenisKelamin || null,
          pekerjaan: p.isAnak ? null : p.pekerjaan || null,
          keperluanTinggal: p.isAnak ? null : p.keperluanTinggal || null,
          detailKeperluan: pakaiDetail ? p.detailKeperluan : null,
          namaTempatKerja: p.isAnak ? null : p.namaTempatKerja.trim() || null,
          namaSekolah: p.namaSekolah?.trim() || null,
          fotoKtpPath: p.isAnak ? null : p.fotoKtpPath || null,
          ...kendaraan,
        };
      }),
    [penghuni, formProfile?.requireKeperluanTinggal],
  );

  function opsiValidasiOrang(p: PenghuniForm) {
    return {
      keperluan,
      requireKeperluanTinggal: formProfile?.requireKeperluanTinggal ?? false,
      requirePekerjaan: formProfile?.requirePekerjaan ?? true,
      requireTempatKerja: formProfile?.requireTempatKerja ?? true,
      tempatKerjaLabel: formProfile?.tempatKerjaLabel,
      dataUsaha: product === "rw3biz",
      pegawaiRingan: product === "rw3biz" && pegawaiBiasa(p),
    };
  }

  function validatePjAda(): string | null {
    const ada = penghuni.some(
      (x) => !x.isAnak && (x.peran === "pemilik" || x.peran === "penanggung_jawab") && x.nomorWhatsapp.trim(),
    );
    return ada ? null : "Minimal satu orang berperan Pemilik atau Penanggung jawab, lengkap dengan nomor WhatsApp";
  }

  /** Perkiraan sejak langkah Usaha: orang yang belum diisi dianggap pegawai dari luar RW 03. */
  const previewSementaraPayload = useMemo(() => {
    if (product !== "rw3biz" || !jenisTempatUsaha) return null;
    if (validateBizKontribusi(bizKontribusi, jenisTempatUsaha)) return null;
    const orang = penghuni
      .filter((p) => !p.isAnak)
      .map((p, idx) => ({
        isAnak: false,
        peran: p.peran || (idx === 0 ? "pemilik" : "pekerja_harian"),
        asal: p.asal || "luar",
        domisili: null,
      }));
    return {
      jenisTempatUsaha,
      ...bizKontribusiPayload(bizKontribusi, jamBuka, jamTutup),
      jamBuka: jamBuka || null,
      jamTutup: jamTutup || null,
      orang: orang.length ? orang : [{ isAnak: false, peran: "pemilik", asal: "luar", domisili: null }],
    };
  }, [product, jenisTempatUsaha, bizKontribusi, penghuni, jamBuka, jamTutup]);

  const previewKontribusiPayload = useMemo(() => {
    if (product !== "rw3biz" || !jenisTempatUsaha) return null;
    if (validateBizKontribusi(bizKontribusi, jenisTempatUsaha)) return null;
    const orang = penghuni.map((p) => ({ isAnak: p.isAnak, ...orangKontribusiPayload(p) }));
    if (orang.some((o) => !o.isAnak && (!o.peran || !o.asal))) return null;
    return {
      jenisTempatUsaha,
      ...bizKontribusiPayload(bizKontribusi, jamBuka, jamTutup),
      jamBuka: jamBuka || null,
      jamTutup: jamTutup || null,
      orang: orang.filter((o) => !o.isAnak),
    };
  }, [product, jenisTempatUsaha, bizKontribusi, penghuni, jamBuka, jamTutup]);

  const kunciKontribusi = `${terminBulan}|${JSON.stringify(previewKontribusiPayload)}`;
  useEffect(() => {
    setSetujuTataTertib(false);
  }, [kunciKontribusi]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!jenisWarga || !formProfile) throw new Error("Pilih jenis warga dulu");

      if (product === "rw3biz") {
        const orang = penghuniPayload.map((p, idx) => {
          const isPj =
            !p.isAnak &&
            (penanggungJawab.trim()
              ? p.namaLengkap.trim().toLowerCase() === penanggungJawab.trim().toLowerCase()
              : idx === 0);
          return {
            namaLengkap: p.namaLengkap,
            tanggalLahir: p.tanggalLahir,
            isAnak: p.isAnak,
            isPenanggungJawab: Boolean(isPj),
            nik: p.nik,
            nomorWhatsapp: p.nomorWhatsapp,
            jenisKelamin: p.jenisKelamin,
            pekerjaan: null,
            namaTempatKerja: p.namaTempatKerja?.trim() || namaUsaha.trim() || null,
            namaSekolah: p.namaSekolah,
            fotoKtpPath: p.fotoKtpPath,
            punyaKendaraan: p.punyaKendaraan,
            jenisKendaraan: p.jenisKendaraan,
            platNomor: p.platNomor,
            ...orangKontribusiPayload(penghuni[idx]),
          };
        });
        if (!orang.some((o) => o.isPenanggungJawab && !o.isAnak)) {
          const firstDewasa = orang.find((o) => !o.isAnak);
          if (firstDewasa) firstDewasa.isPenanggungJawab = true;
        }
        const res = await apiRequest("POST", pengajuanApi, {
          rt: parseInt(rt, 10),
          alamat: alamat.trim(),
          nomorLokasi: nomorUnit.trim() || null,
          namaUsaha: namaUsaha.trim(),
          jenisTempatUsaha,
          jenisTempatUsahaLain:
            jenisTempatUsaha === "lainnya" ? jenisTempatUsahaLain.trim() : null,
          kategoriUsaha: buildKategoriUsahaPayload(kategoriUsaha, kategoriUsahaLain),
          jamBuka: jamBuka.trim(),
          jamTutup: jamTutup.trim(),
          ...bizKontribusiPayload(bizKontribusi, jamBuka, jamTutup),
          alamatUsaha: alamatUsaha.trim() || null,
          pjSetujuNotifikasi: true,
          jumlahOrang: jumlah,
          tanggalBayar,
          terminBulan: parseInt(terminBulan, 10),
          catatanPemohon: catatanKirim(),
          orang,
          setujuTataTertib: true as const,
        });
        return readJsonSafely<{ nomorBiz: string; nomorVisitrw3?: string }>(res);
      }

      const payloadPenghuni = penghuniPayload.map((p) => {
        if (p.isAnak) return p;
        return p;
      });
      const res = await apiRequest("POST", pengajuanApi, {
        jenisWarga,
        rt: parseInt(rt, 10),
        alamat: alamat.trim(),
        nomorUnit:
          formProfile.nomorUnitMode === "hidden" ? null : nomorUnit.trim() || null,
        ukuranTinggal: jenisWarga === "kost" || jenisWarga === "kontrak" ? ukuranTinggal || null : null,
        namaUsaha: null,
        jenisTempatUsaha: null,
        jenisTempatUsahaLain: null,
        kategoriUsaha: null,
        jamBuka: null,
        jamTutup: null,
        alamatUsaha: null,
        penanggungJawab: null,
        jumlahPenghuni: jumlah,
        tanggalBayar,
        terminBulan: parseInt(terminBulan, 10),
        catatanPemohon: catatanKirim(),
        penghuni: payloadPenghuni,
        fotoKk: aturanKk === "tidak" ? null : fotoKk || null,
        setujuTataTertib: true as const,
      });
      return readJsonSafely<{ nomorVisitrw3: string; nomorBiz?: string }>(res);
    },
    onSuccess: (data) => {
      if (draftKey) hapusDraft(draftKey);
      setNomorHasil(data.nomorBiz || data.nomorVisitrw3 || null);
      window.scrollTo({ top: 0 });
    },
    onError: (e: unknown) => {
      const pesan = getApiErrorMessage(e);
      setErrMsg(pesan);
      toast({ title: "Gagal mengirim", description: pesan, variant: "destructive" });
    },
  });

  function toggleKategoriUsaha(kategori: string) {
    setKategoriUsaha((prev) =>
      prev.includes(kategori) ? prev.filter((k) => k !== kategori) : [...prev, kategori],
    );
  }

  /** Foto dikirim sebagai data URL di body pengajuan — disk server Railway tidak permanen. */
  async function pasangFotoKk(file: File) {
    setKkDiproses(true);
    try {
      setFotoKk(await siapkanFotoDokumen(file, "kk"));
      setErrMsg(null);
    } finally {
      setKkDiproses(false);
    }
  }

  async function pasangFotoKtp(file: File, index: number) {
    setFotoDiproses(index);
    try {
      const dataUrl = await siapkanFotoDokumen(file, "ktp");
      setPenghuni((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], fotoKtpPath: dataUrl };
        return next;
      });
      setErrMsg(null);
    } finally {
      setFotoDiproses(null);
    }
  }

  function updatePenghuni(i: number, patch: Partial<PenghuniForm>) {
    setPenghuni((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function setPunyaKendaraan(i: number, punya: boolean) {
    setPenghuni((prev) => {
      const next = [...prev];
      const row = next[i];
      next[i] = {
        ...row,
        punyaKendaraan: punya ? "ya" : "tidak",
        kendaraanList: punya
          ? row.kendaraanList.length > 0
            ? row.kendaraanList
            : [emptyKendaraanRow(row.namaLengkap.trim())]
          : [],
      };
      return next;
    });
  }

  function updateDetailKeperluan(i: number, patch: Partial<DetailKeperluan>) {
    setPenghuni((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], detailKeperluan: { ...next[i].detailKeperluan, ...patch } };
      return next;
    });
  }

  function updateKendaraan(i: number, ki: number, patch: Partial<KendaraanRow>) {
    setPenghuni((prev) => {
      const next = [...prev];
      const list = [...next[i].kendaraanList];
      const merged = { ...list[ki], ...patch };
      if (patch.platParts) {
        merged.plat = joinPlatNomor(merged.platParts);
      }
      list[ki] = merged;
      next[i] = { ...next[i], kendaraanList: list };
      return next;
    });
  }

  function addKendaraan(i: number) {
    setPenghuni((prev) => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        kendaraanList: [...next[i].kendaraanList, emptyKendaraanRow(next[i].namaLengkap.trim())],
      };
      return next;
    });
  }

  function removeKendaraan(i: number, ki: number) {
    setPenghuni((prev) => {
      const next = [...prev];
      const list = next[i].kendaraanList.filter((_, idx) => idx !== ki);
      next[i] = { ...next[i], kendaraanList: list };
      return next;
    });
  }

  if (redirectToRw3biz) {
    return <Redirect to={RW3BIZ_ROUTES.pengajuan} />;
  }

  if (nomorHasil) {
    return (
      <Shell title="Pengajuan" backHref={hubHref}>
        <SuccessPanel
          title="Pengajuan terkirim"
          referenceLabel={product === "rw3biz" ? "Nomor RW3BIZ" : "Nomor Visit RW3"}
          referenceValue={nomorHasil}
          nextSteps={[
            "Simpan nomor ini untuk cek status dan perpanjang nanti.",
            "Admin RW akan melakukan survey kelengkapan data.",
            ...(product === "rw3biz"
              ? [
                  "Anda akan dihubungi lewat WhatsApp jika diperlukan klarifikasi.",
                  "Kontribusi bulanan final ditetapkan setelah survey dan tampil di halaman cek status, lengkap dengan rinciannya.",
                ]
              : ["Setelah disetujui, Surat Izin Tinggal Sementara terbit — bisa dilihat & dicetak dari halaman cek status."]),
          ]}
          primaryAction={{
            label: "Cek status",
            href: product === "rw3biz" ? statusHref : `${statusHref}?nomor=${encodeURIComponent(nomorHasil)}`,
          }}
          secondaryAction={{ label: `Kembali ke ${productTitle}`, href: hubHref }}
        />
      </Shell>
    );
  }

  if (!jenisWarga) {
    return (
      <Shell title="Pengajuan baru" backHref={hubHref}>
        <FeatureExplain title="Pilih jenis tinggal" className="mb-4">
          <p>
            Visit RW3 hanya untuk <strong>ngontrak</strong> dan <strong>ngekost</strong> dengan{" "}
            <strong>KTP luar RW 03</strong>. Untuk jualan/usaha, gunakan{" "}
            <Link href={RW3BIZ_ROUTES.hub} className="text-brand font-medium underline">
              RW3BIZ
            </Link>
            .
          </p>
        </FeatureExplain>
        <AturanKtpRw3 className="mb-4" />
        <div className="space-y-2">
          {JENIS_CHOICES_VISIT.map((opt) => {
            const Icon = opt.icon;
            return (
              <Link
                key={opt.id}
                href={opt.href}
                className="block w-full text-left rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40 touch-target"
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="font-semibold text-sm">{opt.title}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{opt.subtitle}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 self-center" />
                </div>
              </Link>
            );
          })}
          <Link
            href={RW3BIZ_ROUTES.pengajuan}
            className="block w-full text-left rounded-xl border border-dashed border-border bg-muted/20 p-4 transition-colors hover:border-brand/40 touch-target"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/20 text-muted-foreground flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="font-semibold text-sm">Jualan / usaha → RW3BIZ</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Layanan terpisah untuk izin berjualan di RW 03
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 self-center" />
            </div>
          </Link>
        </div>
        <Link
          href={panduanHref}
          className="inline-flex items-center gap-1.5 text-sm text-brand font-medium mt-4 hover:underline"
        >
          <BookOpen className="w-4 h-4" />
          Baca panduan dulu
        </Link>
      </Shell>
    );
  }

  if (product === "visit" && (jenisWarga === "kontrak" || jenisWarga === "kost") && ktpRw3 !== false) {
    return (
      <Shell title={`Pengajuan — ${JENIS_WARGA_LABEL[jenisWarga]}`} backHref={hubHref}>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="font-semibold">Sebelum mulai: KTP {petugas ? "penghuni" : "Anda"} beralamat di mana?</p>
          <p className="text-sm text-muted-foreground">
            Visit RW3 khusus penghuni kost/kontrakan dengan KTP luar RW 03. Penghuni ber-KTP RW 03 didata sebagai warga.
          </p>
          <div className="grid gap-2">
            <Button variant="outline" className="h-auto justify-start py-3 text-left whitespace-normal" onClick={() => setKtpRw3(true)}>
              KTP RW 03 Kelurahan Padasuka
            </Button>
            <Button className="h-auto justify-start py-3 text-left whitespace-normal" onClick={() => setKtpRw3(false)}>
              KTP luar RW 03 (daerah lain) — lanjut isi Visit RW3
            </Button>
          </div>
          {ktpRw3 === true && <AturanKtpRw3 tegas />}
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={
        product === "rw3biz"
          ? "Pengajuan izin usaha"
          : `Pengajuan — ${JENIS_WARGA_LABEL[jenisWarga]}`
      }
      backHref={hubHref}
    >
      {step === 0 && (
        <>
          <FeatureExplain title="Sebelum mulai" className="mb-3">
            <p>{formProfile?.explainSebelum}</p>
            <p>
              Isi form langkah demi langkah — tekan <strong>Lanjut</strong> setelah setiap bagian.
              Isian tersimpan otomatis di HP ini, jadi aman bila halaman tertutup.
            </p>
          </FeatureExplain>
          <Link
            href={panduanHref}
            className="inline-flex items-center gap-1.5 text-sm text-brand font-medium mb-4 hover:underline"
          >
            <BookOpen className="w-4 h-4" />
            Bingung? Baca panduan
          </Link>
        </>
      )}
      {petugas && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Mode petugas:</b> diisi petugas dari formulir kertas. Salin isian sesuai formulir, foto KTP dari fotokopi yang dilampirkan.
          Pengajuan tetap masuk antrean survey seperti biasa.
        </div>
      )}
      {draftDipulihkan && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm">
          <span>Isian sebelumnya dipulihkan — lanjutkan dari sini.</span>
          <Button type="button" variant="ghost" size="sm" className="gap-1 flex-shrink-0" onClick={mulaiUlang}>
            <RotateCcw className="w-3.5 h-3.5" /> Mulai ulang
          </Button>
        </div>
      )}
      <FormStepper steps={steps} currentStep={step} />

      {stepId === "lokasi" && formProfile && (
        <div className="space-y-4">
          <MicroStepHeader
            current={1}
            total={1}
            title={formProfile.lokasiTitle}
            hint={formProfile.lokasiHint}
          />
          <div className="space-y-2">
            <Label>RT</Label>
            <Select value={rt} onValueChange={setRt}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Pilih RT" />
              </SelectTrigger>
              <SelectContent>
                {rtOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    RT {String(n).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{formProfile.alamatLabel}</Label>
            <Textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              rows={3}
              placeholder={formProfile.alamatPlaceholder}
              className="min-h-[88px]"
            />
          </div>
          {formProfile.nomorUnitMode !== "hidden" && (
            <div className="space-y-2">
              <Label>{formProfile.nomorUnitLabel}</Label>
              <Input
                className="h-12"
                placeholder={formProfile.nomorUnitPlaceholder}
                value={nomorUnit}
                onChange={(e) => setNomorUnit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{formProfile.nomorUnitHint}</p>
            </div>
          )}
          {(jenisWarga === "kost" || jenisWarga === "kontrak") && (
            <div className="space-y-2">
              <Label>{jenisWarga === "kost" ? "Ukuran kamar kost" : "Jumlah kamar tidur kontrakan"}</Label>
              <PilihUkuranTinggal
                jenis={jenisWarga}
                settingsRows={settingsRows}
                value={ukuranTinggal}
                onChange={setUkuranTinggal}
              />
              <p className="text-xs text-muted-foreground">
                Kontribusi dihitung dari ukuran tempat yang Anda tempati, bukan jumlah pintu bangunan. Pengurus RW
                mencocokkannya saat survey.
              </p>
            </div>
          )}
          <PesanGalat pesan={errMsg} />
          <div className="flex gap-2">
            <Link href={hubHref}>
              <Button variant="outline" className="touch-target">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateLokasiWargaSinggah({
                  rt,
                  alamat,
                  jenisWarga,
                  nomorUnit,
                  ukuranTinggal,
                });
                if (err) return showErr(err);
                goStep(1);
              }}
            >
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "usaha" && (
        <div className="space-y-4">
          <MicroStepHeader
            current={1}
            total={1}
            title="Data usaha"
            hint="Isi identitas usaha dan penanggung jawab di RW 03."
          />
          <div className="space-y-2">
            <Label>Nama usaha *</Label>
            <Input
              value={namaUsaha}
              onChange={(e) => setNamaUsaha(e.target.value)}
              placeholder="Contoh: Warung Bu Siti"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Jenis tempat usaha *</Label>
            <Select value={jenisTempatUsaha} onValueChange={setJenisTempatUsaha}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent>
                {JENIS_TEMPAT_BIZ_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {jenisTempatUsaha === "lainnya" && (
            <div className="space-y-2">
              <Label>Jenis usaha lainnya *</Label>
              <Input
                value={jenisTempatUsahaLain}
                onChange={(e) => setJenisTempatUsahaLain(e.target.value)}
                placeholder="Contoh: bengkel keliling"
                className="h-12"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Kategori usaha *</Label>
            <p className="text-xs text-muted-foreground">
              Bisa pilih lebih dari satu
              {kategoriUsaha.length > 0 && (
                <span className="text-brand font-medium"> · {kategoriUsaha.length} dipilih</span>
              )}
            </p>
            <div className="rounded-xl border bg-card p-3 max-h-64 overflow-y-auto space-y-2">
              {visitrw3KategoriUsahaOptions.map((kategori) => (
                <div key={kategori} className="flex items-start gap-2">
                  <Checkbox
                    id={`kategori-${kategori}`}
                    checked={kategoriUsaha.includes(kategori)}
                    onCheckedChange={() => toggleKategoriUsaha(kategori)}
                  />
                  <Label htmlFor={`kategori-${kategori}`} className="font-normal text-sm leading-snug">
                    {kategori}
                  </Label>
                </div>
              ))}
            </div>
            {kategoriUsaha.includes("Lainnya") && (
              <Input
                value={kategoriUsahaLain}
                onChange={(e) => setKategoriUsahaLain(e.target.value)}
                placeholder="Contoh: rental PS, jual es batu"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jam buka *</Label>
              <Select value={jamBuka || undefined} onValueChange={setJamBuka}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="00:00" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {JAM_24H_OPTIONS.map((jam) => (
                    <SelectItem key={`buka-${jam}`} value={jam}>
                      {jam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jam tutup *</Label>
              <Select value={jamTutup || undefined} onValueChange={setJamTutup}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="23:59" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {JAM_24H_OPTIONS.map((jam) => (
                    <SelectItem key={`tutup-${jam}`} value={jam}>
                      {jam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Format 24 jam (00:00–23:59), tanpa AM/PM. Petugas survey menyesuaikan kunjungan dengan jam buka.
          </p>
          {product === "rw3biz" && (
            <>
              <UsahaKontribusiFields
                value={bizKontribusi}
                onChange={ubahBizKontribusi}
                jenisTempat={jenisTempatUsaha}
                jamBuka={jamBuka}
                jamTutup={jamTutup}
              />
              <EstimasiKontribusiCard
                payload={previewSementaraPayload}
                sementara="Sementara dihitung tanpa pegawai. Angka berubah setelah jumlah, peran, dan asal pegawai diisi."
              />
            </>
          )}
          <div className="space-y-2">
            <Label>Alamat usaha (jika berbeda dari lokasi sebelumnya)</Label>
            <Textarea
              value={alamatUsaha}
              onChange={(e) => setAlamatUsaha(e.target.value)}
              rows={2}
              placeholder="Kosongkan jika sama dengan alamat lokasi usaha"
            />
          </div>
          <div className="space-y-2">
            <Label>Nama penanggung jawab *</Label>
            <Input
              value={penanggungJawab}
              onChange={(e) => setPenanggungJawab(e.target.value)}
              placeholder="Nama lengkap pemilik / PJ usaha"
              className="h-12"
            />
          </div>
          <PesanGalat pesan={errMsg} />
          <div className="flex gap-2">
            <Button variant="outline" className="touch-target" onClick={() => goStep(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateJualanFields({
                  namaUsaha,
                  jenisTempatUsaha,
                  jenisTempatUsahaLain,
                  kategoriUsaha,
                  kategoriUsahaLain,
                  penanggungJawab,
                  jamBuka,
                  jamTutup,
                  alamatUsaha,
                  requireJamOperasional: true,
                });
                if (err) return showErr(err);
                if (product === "rw3biz") {
                  const errBiz = validateBizKontribusi(bizKontribusi, jenisTempatUsaha);
                  if (errBiz) return showErr(errBiz);
                }
                goStep(1);
              }}
            >
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "jumlah" && formProfile && (
        <div className="space-y-4">
          <MicroStepHeader
            current={1}
            total={1}
            title={formProfile.jumlahTitle}
            hint={formProfile.jumlahHint}
          />
          <JumlahStepper
            label={formProfile.dewasaLabel}
            value={jumlahDewasa}
            min={1}
            max={formProfile.maxDewasa}
            onChange={(n) => setJumlahDewasa(clampJumlahDewasa(n))}
            hint={formProfile.dewasaHint}
          />
          {formProfile.showAnak && (
            <JumlahStepper
              label="Anak"
              value={jumlahAnak}
              min={0}
              max={formProfile.maxAnak}
              onChange={(n) => setJumlahAnak(clampJumlahAnak(n))}
              hint={formProfile.anakHint}
            />
          )}
          <p className="text-sm font-medium text-center text-brand">
            Total {jumlah} {formProfile.orangLabel}
          </p>
          {product === "rw3biz" && (
            <EstimasiKontribusiCard
              payload={previewSementaraPayload}
              sementara={`Orang pertama dianggap pemilik, sisanya pegawai dari luar RW 03 sampai datanya diisi. Pegawai warga RW 03 memberi potongan.`}
            />
          )}
          {aturanKk !== "tidak" && (
            <div className="rounded-xl border bg-card p-3">
              <FotoDokumenPicker
                jenis="kk"
                label={aturanKk === "wajib" ? "Foto Kartu Keluarga *" : "Foto Kartu Keluarga (opsional)"}
                foto={fotoKk}
                diproses={kkDiproses}
                onPilih={(f) =>
                  void pasangFotoKk(f).catch((err: unknown) => {
                    const pesan = err instanceof Error ? err.message : "Coba lagi";
                    setErrMsg(pesan);
                    toast({ title: "Foto KK gagal", description: pesan, variant: "destructive" });
                  })
                }
              />
              {aturanKk === "opsional" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Wajib bila tinggal bersama anak. Tinggal sendiri / bersama teman boleh dilewati.
                </p>
              )}
            </div>
          )}
          <PesanGalat pesan={errMsg} />
          <div className="flex gap-2">
            <Button variant="outline" className="touch-target" onClick={() => goStep(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1 touch-target"
              onClick={() => {
                const err = validateJumlahByJenis(jumlahDewasa, jumlahAnak, formProfile);
                if (err) return showErr(err);
                if (kkDiproses) return showErr("Tunggu foto KK selesai diproses");
                if (aturanKk === "wajib" && !fotoKk) {
                  return showErr("Unggah foto Kartu Keluarga (wajib bila tinggal bersama anak)");
                }
                setPenghuniIndex(0);
                goStep(1);
              }}
            >
              Mulai isi data <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {stepId === "penghuni" &&
        (() => {
          const i = penghuniIndex;
          const p = penghuni[i];
          if (!p) return null;
          return (
            <div className="space-y-4">
              <MicroStepHeader
                current={penghuniIndex + 1}
                total={penghuni.length}
                title={penghuniHeading(p, i)}
                hint={
                  p.isAnak
                    ? "Anak cukup nama, tanggal lahir, dan jenjang sekolah."
                    : jenisWarga === "jualan"
                      ? "Pegawai cukup nama, NIK, tanggal lahir, dan asal. WhatsApp & foto KTP wajib untuk pemilik/PJ."
                      : jenisWarga === "kost"
                        ? "Data diri penghuni kamar (KTP & WhatsApp wajib)."
                        : "Data diri penghuni kontrakan — isi satu per satu."
                }
              />
              <div
                className={`rounded-xl border p-4 space-y-4 ${
                  p.isAnak ? "border-dashed bg-muted/20" : "bg-card"
                }`}
              >
                <div className="space-y-2">
                  <Label>Nama lengkap</Label>
                  <Input
                    className="h-12"
                    placeholder={p.isAnak ? "Nama lengkap anak" : "Sesuai KTP"}
                    autoCapitalize="words"
                    autoComplete="off"
                    value={p.namaLengkap}
                    onChange={(e) => updatePenghuni(i, { namaLengkap: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal lahir</Label>
                  <Input
                    className="h-12"
                    type="date"
                    max={hariIniLokal()}
                    min="1900-01-01"
                    value={p.tanggalLahir}
                    onChange={(e) => updatePenghuni(i, { tanggalLahir: e.target.value })}
                  />
                </div>
                {p.isAnak ? (
                  <div className="space-y-2">
                    <Label>Jenjang pendidikan</Label>
                    <Select
                      value={p.namaSekolah}
                      onValueChange={(v) => updatePenghuni(i, { namaSekolah: v })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Pilih jenjang" />
                      </SelectTrigger>
                      <SelectContent>
                        {visitrw3JenjangAnakOptions.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    {product === "rw3biz" && (
                      <OrangKontribusiFields
                        peran={p.peran}
                        asal={p.asal}
                        domisili={p.domisili}
                        onChange={(patch) => updatePenghuni(i, patch)}
                      />
                    )}
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <Label>NIK (16 digit)</Label>
                        <span
                          className={`text-xs tabular-nums ${p.nik.length === 16 ? "text-success" : "text-muted-foreground"}`}
                        >
                          {p.nik.length}/16
                        </span>
                      </div>
                      <Input
                        className="h-12 tracking-wider"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Lihat di KTP, 16 angka"
                        maxLength={16}
                        value={p.nik}
                        onChange={(e) =>
                          updatePenghuni(i, { nik: e.target.value.replace(/\D/g, "").slice(0, 16) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Nomor WhatsApp aktif
                        {product === "rw3biz" && pegawaiBiasa(p) ? " (opsional untuk pegawai)" : ""}
                      </Label>
                      <Input
                        className="h-12"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="08xxxxxxxxxx"
                        value={p.nomorWhatsapp}
                        onChange={(e) =>
                          updatePenghuni(i, { nomorWhatsapp: e.target.value.replace(/[^\d+\s-]/g, "") })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Pengurus mengabari hasil survey lewat nomor ini.
                      </p>
                    </div>
                    <div
                      className={
                        formProfile?.requirePekerjaan !== false
                          ? "grid grid-cols-2 gap-3"
                          : "space-y-2"
                      }
                    >
                      <div className="space-y-2">
                        <Label>Jenis kelamin</Label>
                        <Select
                          value={p.jenisKelamin}
                          onValueChange={(v) => updatePenghuni(i, { jenisKelamin: v })}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formProfile?.requirePekerjaan !== false && (
                        <div className="space-y-2">
                          <Label>Pekerjaan</Label>
                          <SearchableSelect
                            value={p.pekerjaan}
                            onValueChange={(v) => updatePenghuni(i, { pekerjaan: v })}
                            options={pekerjaanLegacyOptions}
                            placeholder="Pilih pekerjaan"
                            searchPlaceholder="Cari pekerjaan…"
                            triggerClassName="h-12"
                          />
                        </div>
                      )}
                    </div>
                    {formProfile?.requireKeperluanTinggal ? (
                      <RincianKeperluanFields
                        idPrefix={`keperluan-${i}`}
                        penghuni={p}
                        opsi={
                          formProfile.keperluanTinggalOptions.length
                            ? formProfile.keperluanTinggalOptions
                            : keperluanTinggalOptions
                        }
                        onKeperluan={(v) =>
                          updatePenghuni(i, {
                            keperluanTinggal: v,
                            detailKeperluan: { ...p.detailKeperluan, status: null, tidakTentu: false },
                          })
                        }
                        onTempat={(v) => updatePenghuni(i, { namaTempatKerja: v })}
                        onDetail={(patch) => updateDetailKeperluan(i, patch)}
                      />
                    ) : product === "rw3biz" ? null : (
                    <div className="space-y-2">
                      <Label>{formProfile?.tempatKerjaLabel ?? "Tempat kerja"} *</Label>
                      <Input
                        className="h-12"
                        placeholder={
                          formProfile?.tempatKerjaPlaceholder ?? "Nama perusahaan / usaha"
                        }
                        value={p.namaTempatKerja}
                        onChange={(e) => updatePenghuni(i, { namaTempatKerja: e.target.value })}
                        onFocus={() => {
                          if (
                            jenisWarga === "jualan" &&
                            !p.namaTempatKerja.trim() &&
                            namaUsaha.trim()
                          ) {
                            updatePenghuni(i, { namaTempatKerja: namaUsaha.trim() });
                          }
                        }}
                      />
                      {jenisWarga === "jualan" && namaUsaha.trim() && !p.namaTempatKerja.trim() && (
                        <button
                          type="button"
                          className="text-xs text-brand font-medium hover:underline"
                          onClick={() =>
                            updatePenghuni(i, { namaTempatKerja: namaUsaha.trim() })
                          }
                        >
                          Pakai nama usaha: {namaUsaha.trim()}
                        </button>
                      )}
                    </div>
                    )}
                    {product !== "rw3biz" && umurFromDate(p.tanggalLahir) < 21 && (
                      <div className="space-y-2">
                        <Label>Nama sekolah (usia di bawah 21)</Label>
                        <Input
                          className="h-12"
                          placeholder="Nama sekolah / kampus"
                          value={p.namaSekolah}
                          onChange={(e) => updatePenghuni(i, { namaSekolah: e.target.value })}
                        />
                      </div>
                    )}
                    {product !== "rw3biz" && (
                      <KendaraanFields
                        idPrefix={`kendaraan-${i}`}
                        penghuni={p}
                        onPunya={(punya) => setPunyaKendaraan(i, punya)}
                        onUbah={(ki, patch) => updateKendaraan(i, ki, patch)}
                        onTambah={() => addKendaraan(i)}
                        onHapus={(ki) => removeKendaraan(i, ki)}
                      />
                    )}
                    <FotoDokumenPicker
                      jenis="ktp"
                      {...(product === "rw3biz" && pegawaiBiasa(p) ? { label: "Foto KTP (opsional untuk pegawai)" } : {})}
                      foto={p.fotoKtpPath}
                      diproses={fotoDiproses === i}
                      onPilih={(f) =>
                        void pasangFotoKtp(f, i).catch((err: unknown) => {
                          const pesan = err instanceof Error ? err.message : "Coba lagi";
                          setErrMsg(pesan);
                          toast({ title: "Foto KTP gagal", description: pesan, variant: "destructive" });
                        })
                      }
                    />
                  </>
                )}
              </div>
              {product === "rw3biz" && (
                <EstimasiKontribusiCard
                  payload={previewSementaraPayload}
                  sementara="Ikut berubah saat peran dan asal setiap orang diisi."
                />
              )}
              <PesanGalat pesan={errMsg} />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="touch-target"
                  onClick={() => {
                    if (penghuniIndex > 0) setPenghuniIndex((idx) => idx - 1);
                    else goStep(-1);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  className="flex-1 touch-target"
                  onClick={() => {
                    if (product === "rw3biz" && !p.isAnak) {
                      const errOrang = validateOrangKontribusi(p);
                      if (errOrang) return showErr(errOrang);
                    }
                    const err = validateSinglePenghuni(p, opsiValidasiOrang(p));
                    if (err) return showErr(err);
                    if (product === "rw3biz" && penghuniIndex === penghuni.length - 1) {
                      const errPj = validatePjAda();
                      if (errPj) return showErr(errPj);
                    }
                    if (fotoDiproses !== null) return showErr("Tunggu foto KTP selesai diproses");
                    if (!p.isAnak) {
                      const kembar = penghuni.findIndex(
                        (x, xi) => xi !== i && !x.isAnak && x.nik === p.nik,
                      );
                      if (kembar >= 0) {
                        return showErr(
                          `NIK ini sudah dipakai untuk ${penghuni[kembar].namaLengkap.trim() || penghuniHeading(penghuni[kembar], kembar)}`,
                        );
                      }
                    }
                    if (penghuniIndex < penghuni.length - 1) {
                      setPenghuniIndex((idx) => idx + 1);
                      return;
                    }
                    goStep(1);
                  }}
                >
                  {penghuniIndex < penghuni.length - 1 ? (
                    <>
                      {jenisWarga === "jualan" ? "Orang berikutnya" : "Penghuni berikutnya"}{" "}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Lanjut <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })()}

      {stepId === "bayar" && (
        <div className="space-y-4">
          <MicroStepHeader
            current={1}
            total={1}
            title="Masa berlaku"
            hint={formProfile?.bayarHint ?? "Tanggal bayar dan termin menentukan sampai kapan izin berlaku."}
          />
          <div className="space-y-2">
            <Label>Tanggal bayar *</Label>
            <Input
              type="date"
              value={tanggalBayar}
              onChange={(e) => setTanggalBayar(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Termin *</Label>
            <Select value={terminBulan} onValueChange={setTerminBulan}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMIN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {previewSampai && (
            <p className="text-sm rounded-lg bg-muted p-3">
              Berlaku sampai: <span className="font-semibold">{formatTanggalPanjang(previewSampai)}</span>
            </p>
          )}
          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              maxLength={900}
              placeholder="Ada info tambahan untuk admin? (boleh dikosongkan)"
            />
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
            <p className="font-semibold">Periksa sebelum kirim</p>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Lokasi</p>
                <p>
                  RT {rt ? rt.padStart(2, "0") : "—"} · {alamat.trim() || "—"}
                  {nomorUnit.trim() ? ` · ${nomorUnit.trim()}` : ""}
                </p>
                {(jenisWarga === "kost" || jenisWarga === "kontrak") && (
                  <p className="text-xs text-muted-foreground">
                    {isUkuranTinggal(ukuranTinggal) ? labelUkuranTinggal(jenisWarga, ukuranTinggal) : "Ukuran belum dipilih"}
                  </p>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-brand" onClick={() => lompatKe("lokasi")}>
                Ubah
              </Button>
            </div>
            {product === "rw3biz" && (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Usaha</p>
                  <p>{namaUsaha.trim() || "—"} · PJ {penanggungJawab.trim() || "—"}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-brand" onClick={() => lompatKe("usaha")}>
                  Ubah
                </Button>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {jumlah} {formProfile?.orangLabel ?? "orang"}
              </p>
              {penghuni.map((x, xi) => (
                <div key={xi} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate">
                      {x.namaLengkap.trim() || penghuniHeading(x, xi)}
                      <span className="text-muted-foreground">
                        {x.isAnak
                          ? " · anak"
                          : x.fotoKtpPath
                            ? " · KTP ✓"
                            : product === "rw3biz" && pegawaiBiasa(x)
                              ? ""
                              : " · KTP belum ada"}
                      </span>
                    </p>
                    {!x.isAnak && product === "rw3biz" && (
                      <p className="text-xs text-muted-foreground">
                        {PERAN_ORANG_BIZ_LABEL[x.peran as PeranOrangBiz] ?? "Peran belum dipilih"} ·{" "}
                        {ASAL_ORANG_BIZ_LABEL[x.asal as AsalOrangBiz] ?? "asal belum dipilih"}
                      </p>
                    )}
                    {!x.isAnak && product !== "rw3biz" && (
                      <RingkasanPenghuni penghuni={x} pakaiKeperluan={Boolean(formProfile?.requireKeperluanTinggal)} />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-brand flex-shrink-0"
                    onClick={() => {
                      setPenghuniIndex(xi);
                      lompatKe("penghuni");
                    }}
                  >
                    Ubah
                  </Button>
                </div>
              ))}
            </div>
            {aturanKk !== "tidak" && (
              <div className="flex items-center justify-between gap-2">
                <span>
                  Kartu Keluarga
                  <span className="text-muted-foreground">
                    {fotoKk ? " · KK ✓" : aturanKk === "wajib" ? " · KK belum ada" : " · tidak dilampirkan"}
                  </span>
                </span>
                <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-brand" onClick={() => lompatKe("jumlah")}>
                  Ubah
                </Button>
              </div>
            )}
          </div>
          <Visitrw3SyaratPanel
            tataMasyarakat={settingsMap.tata_tertib_masyarakat ?? ""}
            tataKhusus={settingsMap.tata_tertib_penyewa ?? ""}
            kontribusi={
              product === "rw3biz" ? (
                <EstimasiKontribusiCard
                  payload={previewKontribusiPayload}
                  terminBulan={parseInt(terminBulan, 10)}
                  usahaBaru={bizKontribusi.usahaBaru === "ya"}
                />
              ) : jenisWarga === "kost" || jenisWarga === "kontrak" ? (
                <KontribusiTinggalInfo
                  jenis={jenisWarga}
                  settingsRows={settingsRows}
                  terminBulan={parseInt(terminBulan, 10)}
                  ukuran={ukuranTinggal}
                />
              ) : null
            }
            setuju={setujuTataTertib}
            onSetuju={setSetujuTataTertib}
            loading={settingsLoading}
          />
          <PesanGalat pesan={errMsg} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => goStep(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1 touch-target"
              disabled={mutation.isPending || !setujuTataTertib}
              onClick={() => {
                const err = validateStepBayar(
                  tanggalBayar,
                  terminBulan,
                  nomorUnit,
                  catatan,
                  keperluan,
                  setujuTataTertib,
                );
                if (err) return showErr(err);
                const errLokasi = validateLokasiWargaSinggah({ rt, alamat, jenisWarga, nomorUnit, ukuranTinggal });
                if (errLokasi) {
                  lompatKe("lokasi");
                  return showErr(errLokasi, { step: indeksLangkah("lokasi") });
                }
                for (let xi = 0; xi < penghuni.length; xi++) {
                  const errP = validateSinglePenghuni(penghuni[xi], opsiValidasiOrang(penghuni[xi]));
                  if (errP) {
                    setPenghuniIndex(xi);
                    lompatKe("penghuni");
                    return showErr(
                      `${penghuni[xi].namaLengkap.trim() || penghuniHeading(penghuni[xi], xi)}: ${errP}`,
                      { step: indeksLangkah("penghuni"), idx: xi },
                    );
                  }
                  if (product === "rw3biz" && !penghuni[xi].isAnak) {
                    const errOrang = validateOrangKontribusi(penghuni[xi]);
                    if (errOrang) {
                      setPenghuniIndex(xi);
                      lompatKe("penghuni");
                      return showErr(
                        `${penghuni[xi].namaLengkap.trim() || penghuniHeading(penghuni[xi], xi)}: ${errOrang}`,
                        { step: indeksLangkah("penghuni"), idx: xi },
                      );
                    }
                  }
                }
                if (product === "rw3biz") {
                  const errPj = validatePjAda();
                  if (errPj) {
                    setPenghuniIndex(0);
                    lompatKe("penghuni");
                    return showErr(errPj, { step: indeksLangkah("penghuni"), idx: 0 });
                  }
                  const errBiz = validateBizKontribusi(bizKontribusi, jenisTempatUsaha);
                  if (errBiz) {
                    lompatKe("usaha");
                    return showErr(errBiz, { step: indeksLangkah("usaha") });
                  }
                }
                if (aturanKk === "wajib" && !fotoKk) {
                  lompatKe("jumlah");
                  return showErr("Unggah foto Kartu Keluarga (wajib bila tinggal bersama anak)", {
                    step: indeksLangkah("jumlah"),
                  });
                }
                mutation.mutate();
              }}
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Kirim pengajuan"
              )}
            </Button>
          </div>
        </div>
      )}
    </Shell>
  );
}
