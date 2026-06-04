import { useMemo, useState, type Dispatch, RefObject, SetStateAction } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  applyDerivedWargaFields,
  getWargaAge,
  hasKesulitanFungsional,
  isKepalaKeluarga,
  KESULITAN_AKTIVITAS_OPTIONS,
  mapDisabilitasToKesulitan,
  mapKesulitanToDisabilitas,
  needsCrvsDocuments,
  needsLiterasi,
  needsPekerjaanDetail,
  needsPendidikan,
  needsStatusAngkatanKerja,
  needsWhatsapp,
  showIbuHamil,
  showWhatsappField,
  validateWargaFormTier,
} from "@shared/warga-form-tier";
import { LITERASI_OPTIONS, WG_DOMAIN_LEVEL_OPTIONS } from "@shared/warga-international";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { KartuKeluarga, Warga } from "@shared/schema";
import {
  pekerjaanOptions,
  pendidikanOptions,
  agamaOptions,
  jenisKelaminOptions,
  statusPerkawinanOptions,
  kedudukanKeluargaOptions,
  statusKependudukanOptions,
  statusEktpOptions,
  kewarganegaraanOptions,
  golonganDarahOptions,
  statusTinggalIndividuOptions,
  hubunganKontakDaruratOptions,
  statusPekerjaanOptions,
  penghasilanPribadiOptions,
  jenisSimOptions,
  jenjangSekolahOptions,
  semesterOptions,
  statusVerifikasiDataOptions,
  statusBansosIndividuOptions,
  jenisBansosIndividuOptions,
  bidangPartisipasiOptions,
  jenisKendaraanOptions,
} from "@/lib/constants";

export type WargaFormValues = {
  kkId: string;
  namaLengkap: string;
  nik: string;
  noKkDiKtp: string;
  namaAlias: string;
  nomorWhatsapp: string;
  nomorWhatsappAlternatif: string;
  email: string;
  jenisKelamin: string;
  statusPerkawinan: string;
  agama: string;
  kedudukanKeluarga: string;
  tempatLahir: string;
  tanggalLahir: string;
  golonganDarah: string;
  kewarganegaraan: string;
  suku: string;
  pekerjaan: string;
  pendidikan: string;
  literasi: string;
  wgKesulitanMelihat: string;
  wgKesulitanBerjalan: string;
  statusKependudukan: string;
  statusEktp: string;
  noAktaLahir: string;
  punyaAktaLahir: boolean;
  punyaKia: boolean;
  punyaNpwp: boolean;
  punyaSim: boolean;
  jenisSim: string;
  punyaPaspor: boolean;
  alamatDomisili: string;
  lamaTinggalTahun: string;
  statusTinggalIndividu: string;
  hubunganDenganPemilikRumah: string;
  namaKontakDarurat: string;
  hubunganKontakDarurat: string;
  nomorKontakDarurat: string;
  sedangSekolah: boolean;
  namaSekolah: string;
  jenjangSekolah: string;
  kelas: string;
  jurusan: string;
  sedangKuliah: boolean;
  namaKampus: string;
  semester: string;
  keahlian: string;
  statusPekerjaan: string;
  namaTempatKerja: string;
  alamatTempatKerja: string;
  penghasilanPribadi: string;
  sumberPenghasilan: string;
  punyaUsaha: boolean;
  namaUsaha: string;
  statusDisabilitas: string;
  kondisiKesehatan: string;
  ibuHamil: boolean;
  punyaBpjsKesehatan: boolean;
  nomorBpjsKesehatan: string;
  punyaPenyakitKronis: boolean;
  penyakitKronis: string;
  alergi: string;
  riwayatRawatInap: string;
  butuhPendampinganKesehatan: boolean;
  statusBansosIndividu: string;
  jenisBansosIndividu: string;
  lansia: boolean;
  anakYatimPiatu: boolean;
  perluBantuanKhusus: boolean;
  catatanKerentanan: string;
  aktifKegiatanRw: boolean;
  bidangPartisipasi: string;
  jabatanKomunitas: string;
  punyaKendaraan: boolean;
  jenisKendaraan: string;
  jumlahKendaraan: string;
  statusVerifikasiData: string;
  tanggalVerifikasiData: string;
  catatanVerifikasi: string;
};

export type WargaWithKk = {
  id: number;
  kkId: number | null;
  nomorKk?: string | null;
  rt?: number | null;
  alamat?: string | null;
} & {
  [K in Exclude<keyof WargaFormValues, "kkId">]: WargaFormValues[K] | null;
};

export const defaultWargaForm: WargaFormValues = {
  kkId: "",
  namaLengkap: "",
  nik: "",
  noKkDiKtp: "",
  namaAlias: "",
  nomorWhatsapp: "",
  nomorWhatsappAlternatif: "",
  email: "",
  jenisKelamin: "Laki-laki",
  statusPerkawinan: "Belum Kawin",
  agama: "Islam",
  kedudukanKeluarga: "Anak",
  tempatLahir: "",
  tanggalLahir: "",
  golonganDarah: "Tidak Tahu",
  kewarganegaraan: "WNI",
  suku: "",
  pekerjaan: "",
  pendidikan: "",
  literasi: "",
  wgKesulitanMelihat: "",
  wgKesulitanBerjalan: "",
  statusKependudukan: "Aktif",
  statusEktp: "Sudah Rekam",
  noAktaLahir: "",
  punyaAktaLahir: false,
  punyaKia: false,
  punyaNpwp: false,
  punyaSim: false,
  jenisSim: "",
  punyaPaspor: false,
  alamatDomisili: "",
  lamaTinggalTahun: "",
  statusTinggalIndividu: "Tinggal dengan Keluarga",
  hubunganDenganPemilikRumah: "",
  namaKontakDarurat: "",
  hubunganKontakDarurat: "Orang Tua",
  nomorKontakDarurat: "",
  sedangSekolah: false,
  namaSekolah: "",
  jenjangSekolah: "",
  kelas: "",
  jurusan: "",
  sedangKuliah: false,
  namaKampus: "",
  semester: "",
  keahlian: "",
  statusPekerjaan: "Belum Bekerja",
  namaTempatKerja: "",
  alamatTempatKerja: "",
  penghasilanPribadi: "Tidak Ada",
  sumberPenghasilan: "",
  punyaUsaha: false,
  namaUsaha: "",
  statusDisabilitas: "Tidak Ada",
  kondisiKesehatan: "Sehat",
  ibuHamil: false,
  punyaBpjsKesehatan: false,
  nomorBpjsKesehatan: "",
  punyaPenyakitKronis: false,
  penyakitKronis: "",
  alergi: "",
  riwayatRawatInap: "",
  butuhPendampinganKesehatan: false,
  statusBansosIndividu: "Bukan Penerima",
  jenisBansosIndividu: "",
  lansia: false,
  anakYatimPiatu: false,
  perluBantuanKhusus: false,
  catatanKerentanan: "",
  aktifKegiatanRw: false,
  bidangPartisipasi: "",
  jabatanKomunitas: "",
  punyaKendaraan: false,
  jenisKendaraan: "",
  jumlahKendaraan: "",
  statusVerifikasiData: "Belum Diverifikasi",
  tanggalVerifikasiData: "",
  catatanVerifikasi: "",
};

export function mapWargaToForm(warga: WargaWithKk | Warga): WargaFormValues {
  return {
    kkId: warga.kkId?.toString() || "",
    namaLengkap: warga.namaLengkap || "",
    nik: warga.nik || "",
    noKkDiKtp: warga.noKkDiKtp || "",
    namaAlias: warga.namaAlias || "",
    nomorWhatsapp: warga.nomorWhatsapp || "",
    nomorWhatsappAlternatif: warga.nomorWhatsappAlternatif || "",
    email: warga.email || "",
    jenisKelamin: warga.jenisKelamin || "Laki-laki",
    statusPerkawinan: warga.statusPerkawinan || "Belum Kawin",
    agama: warga.agama || "Islam",
    kedudukanKeluarga: warga.kedudukanKeluarga || "Anak",
    tempatLahir: warga.tempatLahir || "",
    tanggalLahir: warga.tanggalLahir || "",
    golonganDarah: warga.golonganDarah || "Tidak Tahu",
    kewarganegaraan: warga.kewarganegaraan || "WNI",
    suku: warga.suku || "",
    pekerjaan: warga.pekerjaan || "",
    pendidikan: warga.pendidikan || "",
    literasi: warga.literasi || "",
    wgKesulitanMelihat: warga.wgKesulitanMelihat || "",
    wgKesulitanBerjalan: warga.wgKesulitanBerjalan || "",
    statusKependudukan: warga.statusKependudukan || "Aktif",
    statusEktp: warga.statusEktp || "Sudah Rekam",
    noAktaLahir: warga.noAktaLahir || "",
    punyaAktaLahir: warga.punyaAktaLahir || false,
    punyaKia: warga.punyaKia || false,
    punyaNpwp: warga.punyaNpwp || false,
    punyaSim: warga.punyaSim || false,
    jenisSim: warga.jenisSim || "",
    punyaPaspor: warga.punyaPaspor || false,
    alamatDomisili: warga.alamatDomisili || "",
    lamaTinggalTahun: warga.lamaTinggalTahun?.toString() || "",
    statusTinggalIndividu: warga.statusTinggalIndividu || "Tinggal dengan Keluarga",
    hubunganDenganPemilikRumah: warga.hubunganDenganPemilikRumah || "",
    namaKontakDarurat: warga.namaKontakDarurat || "",
    hubunganKontakDarurat: warga.hubunganKontakDarurat || "Orang Tua",
    nomorKontakDarurat: warga.nomorKontakDarurat || "",
    sedangSekolah: warga.sedangSekolah || false,
    namaSekolah: warga.namaSekolah || "",
    jenjangSekolah: warga.jenjangSekolah || "",
    kelas: warga.kelas || "",
    jurusan: warga.jurusan || "",
    sedangKuliah: warga.sedangKuliah || false,
    namaKampus: warga.namaKampus || "",
    semester: warga.semester || "",
    keahlian: warga.keahlian || "",
    statusPekerjaan: warga.statusPekerjaan || "Belum Bekerja",
    namaTempatKerja: warga.namaTempatKerja || "",
    alamatTempatKerja: warga.alamatTempatKerja || "",
    penghasilanPribadi: warga.penghasilanPribadi || "Tidak Ada",
    sumberPenghasilan: warga.sumberPenghasilan || "",
    punyaUsaha: warga.punyaUsaha || false,
    namaUsaha: warga.namaUsaha || "",
    statusDisabilitas: warga.statusDisabilitas || "Tidak Ada",
    kondisiKesehatan: warga.kondisiKesehatan || "Sehat",
    ibuHamil: warga.ibuHamil || false,
    punyaBpjsKesehatan: warga.punyaBpjsKesehatan || false,
    nomorBpjsKesehatan: warga.nomorBpjsKesehatan || "",
    punyaPenyakitKronis: warga.punyaPenyakitKronis || false,
    penyakitKronis: warga.penyakitKronis || "",
    alergi: warga.alergi || "",
    riwayatRawatInap: warga.riwayatRawatInap || "",
    butuhPendampinganKesehatan: warga.butuhPendampinganKesehatan || false,
    statusBansosIndividu: warga.statusBansosIndividu || "Bukan Penerima",
    jenisBansosIndividu: warga.jenisBansosIndividu || "",
    lansia: warga.lansia || false,
    anakYatimPiatu: warga.anakYatimPiatu || false,
    perluBantuanKhusus: warga.perluBantuanKhusus || false,
    catatanKerentanan: warga.catatanKerentanan || "",
    aktifKegiatanRw: warga.aktifKegiatanRw || false,
    bidangPartisipasi: warga.bidangPartisipasi || "",
    jabatanKomunitas: warga.jabatanKomunitas || "",
    punyaKendaraan: warga.punyaKendaraan || false,
    jenisKendaraan: warga.jenisKendaraan || "",
    jumlahKendaraan: warga.jumlahKendaraan?.toString() || "",
    statusVerifikasiData: warga.statusVerifikasiData || "Belum Diverifikasi",
    tanggalVerifikasiData: warga.tanggalVerifikasiData || "",
    catatanVerifikasi: warga.catatanVerifikasi || "",
  };
}

export function toWargaPayload(form: WargaFormValues) {
  const derived = applyDerivedWargaFields(form);
  const kesulitan = mapDisabilitasToKesulitan(form.statusDisabilitas);
  const wgDetail = hasKesulitanFungsional(kesulitan);
  return {
    ...derived,
    statusDisabilitas: mapKesulitanToDisabilitas(kesulitan),
    kkId: parseInt(form.kkId),
    noKkDiKtp: form.noKkDiKtp || null,
    namaAlias: form.namaAlias || null,
    nomorWhatsapp: form.nomorWhatsapp || null,
    nomorWhatsappAlternatif: form.nomorWhatsappAlternatif || null,
    email: form.email || null,
    tempatLahir: form.tempatLahir || null,
    tanggalLahir: form.tanggalLahir || null,
    golonganDarah: form.golonganDarah || null,
    suku: form.suku || null,
    pekerjaan: form.pekerjaan || null,
    pendidikan: form.pendidikan || null,
    literasi: form.literasi || null,
    wgKesulitanMelihat: wgDetail ? form.wgKesulitanMelihat || null : null,
    wgKesulitanBerjalan: wgDetail ? form.wgKesulitanBerjalan || null : null,
    statusEktp: form.statusEktp || null,
    noAktaLahir: form.noAktaLahir || null,
    jenisSim: form.punyaSim ? form.jenisSim || null : null,
    alamatDomisili: form.alamatDomisili || null,
    lamaTinggalTahun: form.lamaTinggalTahun ? parseInt(form.lamaTinggalTahun) : null,
    statusTinggalIndividu: form.statusTinggalIndividu || null,
    hubunganDenganPemilikRumah: form.hubunganDenganPemilikRumah || null,
    namaKontakDarurat: form.namaKontakDarurat || null,
    hubunganKontakDarurat: form.namaKontakDarurat ? form.hubunganKontakDarurat || null : null,
    nomorKontakDarurat: form.nomorKontakDarurat || null,
    namaSekolah: form.sedangSekolah ? form.namaSekolah || null : null,
    jenjangSekolah: form.sedangSekolah ? form.jenjangSekolah || null : null,
    kelas: form.sedangSekolah ? form.kelas || null : null,
    jurusan: form.sedangSekolah ? form.jurusan || null : null,
    namaKampus: form.sedangKuliah ? form.namaKampus || null : null,
    semester: form.sedangKuliah ? form.semester || null : null,
    keahlian: form.keahlian || null,
    statusPekerjaan: form.statusPekerjaan || null,
    namaTempatKerja: form.namaTempatKerja || null,
    alamatTempatKerja: form.alamatTempatKerja || null,
    penghasilanPribadi: form.penghasilanPribadi || null,
    sumberPenghasilan: form.sumberPenghasilan || null,
    namaUsaha: form.punyaUsaha ? form.namaUsaha || null : null,
    statusKependudukan: form.statusKependudukan,
    nomorBpjsKesehatan: form.punyaBpjsKesehatan ? form.nomorBpjsKesehatan || null : null,
    penyakitKronis: form.punyaPenyakitKronis ? form.penyakitKronis || null : null,
    alergi: form.alergi || null,
    riwayatRawatInap: form.riwayatRawatInap || null,
    statusBansosIndividu: form.statusBansosIndividu || null,
    jenisBansosIndividu: form.statusBansosIndividu === "Penerima" ? form.jenisBansosIndividu || null : null,
    catatanKerentanan: form.catatanKerentanan || null,
    bidangPartisipasi: form.aktifKegiatanRw ? form.bidangPartisipasi || null : null,
    jabatanKomunitas: form.jabatanKomunitas || null,
    jenisKendaraan: form.punyaKendaraan ? form.jenisKendaraan || null : null,
    jumlahKendaraan: form.punyaKendaraan && form.jumlahKendaraan ? parseInt(form.jumlahKendaraan) : null,
    tanggalVerifikasiData: form.tanggalVerifikasiData || null,
    catatanVerifikasi: form.catatanVerifikasi || null,
  };
}

export type FormErrors = Partial<Record<keyof WargaFormValues, string>>;

/** Validasi Tier 0/1 — SSOT di @shared/warga-form-tier. */
export function validateWargaFormData(formData: WargaFormValues): FormErrors {
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    return { ...validateWargaFormTier(formData), email: "Email tidak valid" };
  }
  if (formData.nomorWhatsappAlternatif && !/^(0|62)\d{8,15}$/.test(formData.nomorWhatsappAlternatif)) {
    return {
      ...validateWargaFormTier(formData),
      nomorWhatsappAlternatif: "No. WhatsApp alternatif tidak valid",
    };
  }
  if (formData.lamaTinggalTahun && Number(formData.lamaTinggalTahun) < 0) {
    return { ...validateWargaFormTier(formData), lamaTinggalTahun: "Lama tinggal tidak boleh negatif" };
  }
  return validateWargaFormTier(formData) as FormErrors;
}
export function WargaFormFields({
  formData,
  setFormData,
  errors,
  testIdPrefix,
  searchVal,
  setSearchVal,
  dropdownOpen,
  setDropdownOpen,
  pickerRef,
  kkList,
  kkIdLocked,
  showVerifikasiAdmin = false,
  variant = "default",
  showPindahKk = false,
}: {
  formData: WargaFormValues;
  setFormData: Dispatch<SetStateAction<WargaFormValues>>;
  errors: FormErrors;
  testIdPrefix: string;
  searchVal: string;
  setSearchVal: (value: string) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (value: boolean) => void;
  pickerRef: RefObject<HTMLDivElement>;
  kkList?: KartuKeluarga[];
  kkIdLocked?: boolean;
  /** @deprecated Gunakan showVerifikasiAdmin */
  verifikasiTitle?: string;
  showVerifikasiAdmin?: boolean;
  /** Form lapangan Blusukan RW — status sosial di bagian tambahan. */
  variant?: "default" | "blusukan";
  /** Pindah ke KK lain (mode blusukan). */
  showPindahKk?: boolean;
}) {
  const isBlusukan = variant === "blusukan";
  const showAdmin = showVerifikasiAdmin ?? false;
  const [tambahanOpen, setTambahanOpen] = useState(false);
  const age = useMemo(() => getWargaAge(formData.tanggalLahir), [formData.tanggalLahir]);
  const kesulitanAktivitas = mapDisabilitasToKesulitan(formData.statusDisabilitas);
  const selectedKk = kkList?.find((kk) => kk.id.toString() === formData.kkId);
  const filteredKkList =
    kkList?.filter((kk) => {
      if (!searchVal) return true;
      const query = searchVal.toLowerCase();
      return (
        kk.nomorKk.toLowerCase().includes(query) ||
        kk.alamat.toLowerCase().includes(query) ||
        `rt ${kk.rt}`.includes(query)
      );
    }) || [];

  const updateField = <K extends keyof WargaFormValues>(key: K, value: WargaFormValues[K]) => {
    setFormData({ ...formData, [key]: value });
  };

  const renderError = (field: keyof WargaFormValues) =>
    errors[field] ? <p className="text-sm text-destructive">{errors[field]}</p> : null;

  const waLabel =
    age !== null && needsWhatsapp(age)
      ? "No. WhatsApp *"
      : age !== null && age >= 7
        ? "No. WhatsApp (opsional)"
        : "No. WhatsApp";

  const statusSosialFields = (
    <>
      <div className="space-y-1.5">
        <Label>Status perkawinan</Label>
        <Select value={formData.statusPerkawinan} onValueChange={(value) => updateField("statusPerkawinan", value)}>
          <SelectTrigger data-testid={`select-status-kawin-${testIdPrefix}`}><SelectValue /></SelectTrigger>
          <SelectContent>{statusPerkawinanOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Agama</Label>
        <Select value={formData.agama} onValueChange={(value) => updateField("agama", value)}>
          <SelectTrigger data-testid={`select-agama-${testIdPrefix}`}><SelectValue /></SelectTrigger>
          <SelectContent>{agamaOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Kewarganegaraan</Label>
        <Select value={formData.kewarganegaraan} onValueChange={(value) => updateField("kewarganegaraan", value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{kewarganegaraanOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div className={isBlusukan ? "space-y-6" : "mx-auto max-w-md space-y-8"}>
      {!kkIdLocked && !isBlusukan && (
      <div className="space-y-1 relative" ref={pickerRef}>
        <Label className="text-sm">Kartu Keluarga</Label>
        {selectedKk ? (
          <div className="flex items-center gap-2 rounded-md border p-2 h-10">
            <span className="text-sm flex-1 truncate">
              {selectedKk.nomorKk} - RT {selectedKk.rt}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => {
                setFormData({ ...formData, kkId: "" });
                setSearchVal("");
              }}
              data-testid={`button-clear-kk-${testIdPrefix}`}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchVal}
              onChange={(event) => {
                setSearchVal(event.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Cari nomor KK, alamat, atau RT..."
              className="h-10 pl-9"
              data-testid={`input-search-kk-${testIdPrefix}`}
            />
          </div>
        )}

        {dropdownOpen && !selectedKk && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
            {filteredKkList.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">Tidak ditemukan</p>
            ) : (
              filteredKkList.slice(0, 20).map((kk) => (
                <button
                  key={kk.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                  onClick={() => {
                    setFormData({ ...formData, kkId: kk.id.toString() });
                    setDropdownOpen(false);
                    setSearchVal("");
                  }}
                  data-testid={`option-kk-${kk.id}-${testIdPrefix}`}
                >
                  <div className="font-medium">{kk.nomorKk}</div>
                  <div className="text-xs text-muted-foreground">
                    RT {kk.rt} - {kk.alamat}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
        {renderError("kkId")}
      </div>
      )}

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Data pokok</h3>
          <p className="text-sm text-muted-foreground">Inti register kependudukan (standar sensus BPS/UN).</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nama lengkap *</Label>
            <Input value={formData.namaLengkap} onChange={(e) => updateField("namaLengkap", e.target.value)} data-testid={`input-nama-${testIdPrefix}`} />
            {renderError("namaLengkap")}
          </div>
          <div className="space-y-1.5">
            <Label>NIK (16 digit) *</Label>
            <Input value={formData.nik} onChange={(e) => updateField("nik", e.target.value)} inputMode="numeric" data-testid={`input-nik-${testIdPrefix}`} />
            {renderError("nik")}
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal lahir *</Label>
            <Input type="date" value={formData.tanggalLahir} onChange={(e) => updateField("tanggalLahir", e.target.value)} data-testid={`input-tanggal-lahir-${testIdPrefix}`} />
            {renderError("tanggalLahir")}
          </div>
          <div className="space-y-1.5">
            <Label>Tempat lahir *</Label>
            <Input value={formData.tempatLahir} onChange={(e) => updateField("tempatLahir", e.target.value)} data-testid={`input-tempat-lahir-${testIdPrefix}`} />
            {renderError("tempatLahir")}
          </div>
          <div className="space-y-1.5">
            <Label>Jenis kelamin *</Label>
            <Select value={formData.jenisKelamin} onValueChange={(value) => updateField("jenisKelamin", value)}>
              <SelectTrigger data-testid={`select-jk-${testIdPrefix}`}><SelectValue /></SelectTrigger>
              <SelectContent>{jenisKelaminOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kedudukan dalam KK *</Label>
            <Select value={formData.kedudukanKeluarga} onValueChange={(value) => updateField("kedudukanKeluarga", value)}>
              <SelectTrigger data-testid={`select-kedudukan-${testIdPrefix}`}><SelectValue /></SelectTrigger>
              <SelectContent>{kedudukanKeluargaOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status kependudukan *</Label>
            <Select value={formData.statusKependudukan} onValueChange={(value) => updateField("statusKependudukan", value)}>
              <SelectTrigger data-testid={`select-status-kependudukan-${testIdPrefix}`}><SelectValue /></SelectTrigger>
              <SelectContent>{statusKependudukanOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {!isBlusukan && (
        <section className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-base font-semibold">Status sosial</h3>
            <p className="text-sm text-muted-foreground">Opsional jika sudah sesuai default (WNI, Islam, dll.).</p>
          </div>
          <div className="space-y-4">{statusSosialFields}</div>
        </section>
      )}

      <section className={`space-y-4 ${isBlusukan ? "" : "border-t pt-6"}`}>
        <div>
          <h3 className="text-base font-semibold">Kontak & aktivitas</h3>
          <p className="text-sm text-muted-foreground">
            Menyesuaikan usia. Alamat & ekonomi keluarga di <strong>Kartu Keluarga</strong>.
            {selectedKk ? ` (${selectedKk.alamat})` : ""}
          </p>
        </div>
        <div className="space-y-4">
          {showWhatsappField(age) && (
            <div className="space-y-1.5">
              <Label>{waLabel}</Label>
              <Input value={formData.nomorWhatsapp} onChange={(e) => updateField("nomorWhatsapp", e.target.value)} data-testid={`input-wa-${testIdPrefix}`} />
              {renderError("nomorWhatsapp")}
            </div>
          )}
          {isKepalaKeluarga(formData.kedudukanKeluarga) && (
            <>
              <div className="space-y-1.5">
                <Label>Nama kontak darurat *</Label>
                <Input value={formData.namaKontakDarurat} onChange={(e) => updateField("namaKontakDarurat", e.target.value)} />
                {renderError("namaKontakDarurat")}
              </div>
              <div className="space-y-1.5">
                <Label>Hubungan</Label>
                <Select value={formData.hubunganKontakDarurat} onValueChange={(value) => updateField("hubunganKontakDarurat", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{hubunganKontakDaruratOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nomor kontak darurat *</Label>
                <Input value={formData.nomorKontakDarurat} onChange={(e) => updateField("nomorKontakDarurat", e.target.value)} />
                {renderError("nomorKontakDarurat")}
              </div>
            </>
          )}
          {needsLiterasi(age) && (
            <div className="space-y-1.5">
              <Label>Literasi baca-tulis *</Label>
              <p className="text-xs text-muted-foreground">UNESCO — huruf Latin/Indonesia.</p>
              <Select value={formData.literasi} onValueChange={(value) => updateField("literasi", value)}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {LITERASI_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {renderError("literasi")}
            </div>
          )}
          {needsPendidikan(age) && (
            <div className="space-y-1.5">
              <Label>Pendidikan terakhir (ISCED) *</Label>
              <p className="text-xs text-muted-foreground">Tingkat pendidikan — standar BPS/UNESCO.</p>
              <Select value={formData.pendidikan} onValueChange={(value) => updateField("pendidikan", value)}>
                <SelectTrigger data-testid={`select-pendidikan-${testIdPrefix}`}><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>{pendidikanOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              {renderError("pendidikan")}
            </div>
          )}
          {needsCrvsDocuments(age) && (
            <div className="space-y-3 rounded-lg border border-[hsl(163,55%,32%)]/30 bg-[hsl(163,55%,22%)]/5 p-3">
              <p className="text-sm font-medium">Registrasi sipil (CRVS)</p>
              <p className="text-xs text-muted-foreground">Wajib dicek untuk usia di bawah 18 tahun.</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`akta-inti-${testIdPrefix}`}
                  checked={formData.punyaAktaLahir}
                  onCheckedChange={(checked) => updateField("punyaAktaLahir", checked === true)}
                />
                <Label htmlFor={`akta-inti-${testIdPrefix}`} className="font-normal">Punya akta kelahiran</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`kia-inti-${testIdPrefix}`}
                  checked={formData.punyaKia}
                  onCheckedChange={(checked) => updateField("punyaKia", checked === true)}
                />
                <Label htmlFor={`kia-inti-${testIdPrefix}`} className="font-normal">Punya KIA</Label>
              </div>
            </div>
          )}
          {needsStatusAngkatanKerja(age) && (
            <div className="space-y-1.5">
              <Label>Status angkatan kerja (ILO) *</Label>
              <Select value={formData.statusPekerjaan} onValueChange={(value) => updateField("statusPekerjaan", value)}>
                <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                <SelectContent>
                  {statusPekerjaanOptions.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {renderError("statusPekerjaan")}
            </div>
          )}
          {needsStatusAngkatanKerja(age) && needsPekerjaanDetail(formData.statusPekerjaan) && (
            <div className="space-y-1.5">
              <Label>Pekerjaan / jabatan *</Label>
              <Select value={formData.pekerjaan} onValueChange={(value) => updateField("pekerjaan", value)}>
                <SelectTrigger data-testid={`select-pekerjaan-${testIdPrefix}`}><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>{pekerjaanOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              {renderError("pekerjaan")}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Kesulitan aktivitas sehari-hari</Label>
            <p className="text-xs text-muted-foreground">Washington Group — skrining fungsional.</p>
            <Select
              value={kesulitanAktivitas}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  statusDisabilitas: mapKesulitanToDisabilitas(value),
                  ...(hasKesulitanFungsional(value)
                    ? {}
                    : { wgKesulitanMelihat: "", wgKesulitanBerjalan: "" }),
                });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KESULITAN_AKTIVITAS_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasKesulitanFungsional(kesulitanAktivitas) && (
            <div className="space-y-4 rounded-lg border border-dashed p-3">
              <p className="text-sm font-medium">Detail kesulitan (Washington Group)</p>
              <div className="space-y-1.5">
                <Label>Melihat (dengan kacamata) *</Label>
                <Select value={formData.wgKesulitanMelihat} onValueChange={(v) => updateField("wgKesulitanMelihat", v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                  <SelectContent>
                    {WG_DOMAIN_LEVEL_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderError("wgKesulitanMelihat")}
              </div>
              <div className="space-y-1.5">
                <Label>Berjalan / naik tangga *</Label>
                <Select value={formData.wgKesulitanBerjalan} onValueChange={(v) => updateField("wgKesulitanBerjalan", v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                  <SelectContent>
                    {WG_DOMAIN_LEVEL_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderError("wgKesulitanBerjalan")}
              </div>
            </div>
          )}
        </div>
      </section>

      <Collapsible open={tambahanOpen} onOpenChange={setTambahanOpen} className="border-t pt-6">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
            <span className="text-sm font-medium">Data tambahan (opsional)</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${tambahanOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
      {showPindahKk && kkList && kkList.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium">Pindah ke KK lain</p>
          <p className="text-xs text-muted-foreground">Hanya jika warga pindah domisili ke kartu keluarga lain.</p>
          <div className="space-y-1 relative" ref={pickerRef}>
              <Label className="text-sm">Kartu Keluarga tujuan</Label>
              {selectedKk ? (
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <span className="text-sm flex-1 truncate">
                    {selectedKk.nomorKk} - RT {selectedKk.rt}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => {
                      setFormData({ ...formData, kkId: "" });
                      setSearchVal("");
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchVal}
                    onChange={(event) => {
                      setSearchVal(event.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder="Cari nomor KK atau alamat..."
                    className="pl-9"
                  />
                </div>
              )}
              {dropdownOpen && !selectedKk && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                  {filteredKkList.slice(0, 15).map((kk) => (
                    <button
                      key={kk.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                      onClick={() => {
                        setFormData({ ...formData, kkId: kk.id.toString() });
                        setDropdownOpen(false);
                        setSearchVal("");
                      }}
                    >
                      <div className="font-medium">{kk.nomorKk}</div>
                      <div className="text-xs text-muted-foreground">RT {kk.rt}</div>
                    </button>
                  ))}
                </div>
              )}
              {renderError("kkId")}
            </div>
        </div>
      )}
      {isBlusukan && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Status sosial</p>
          {statusSosialFields}
        </div>
      )}
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Identitas & kontak lain</p>
        <div className="space-y-4">
          <div className="space-y-1"><Label className="text-sm">Nama Alias</Label><Input value={formData.namaAlias} onChange={(e) => updateField("namaAlias", e.target.value)} className="h-10" /></div>
          <div className="space-y-1"><Label className="text-sm">No. KK di KTP</Label><Input value={formData.noKkDiKtp} onChange={(e) => updateField("noKkDiKtp", e.target.value)} className="h-10" /></div>
          <div className="space-y-1"><Label className="text-sm">Golongan Darah</Label><Select value={formData.golonganDarah} onValueChange={(value) => updateField("golonganDarah", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{golonganDarahOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Suku</Label><Input value={formData.suku} onChange={(e) => updateField("suku", e.target.value)} className="h-10" /></div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Kesehatan & program</p>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id={`bpjs-${testIdPrefix}`} checked={formData.punyaBpjsKesehatan} onCheckedChange={(checked) => updateField("punyaBpjsKesehatan", checked === true)} />
            <Label htmlFor={`bpjs-${testIdPrefix}`}>Punya BPJS Kesehatan</Label>
          </div>
          {formData.punyaBpjsKesehatan && (
            <div className="space-y-1.5">
              <Label>Nomor BPJS</Label>
              <Input value={formData.nomorBpjsKesehatan} onChange={(e) => updateField("nomorBpjsKesehatan", e.target.value)} />
              {renderError("nomorBpjsKesehatan")}
            </div>
          )}
          {showIbuHamil(formData.jenisKelamin, age) && (
            <div className="flex items-center gap-2">
              <Checkbox id={`ibuHamil-${testIdPrefix}`} checked={formData.ibuHamil} onCheckedChange={(checked) => updateField("ibuHamil", checked === true)} />
              <Label htmlFor={`ibuHamil-${testIdPrefix}`}>Sedang hamil</Label>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-1"><Label className="text-sm">No. WhatsApp Alternatif</Label><Input value={formData.nomorWhatsappAlternatif} onChange={(e) => updateField("nomorWhatsappAlternatif", e.target.value)} className="h-10" />{renderError("nomorWhatsappAlternatif")}</div>
          <div className="space-y-1"><Label className="text-sm">Email</Label><Input value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="h-10" />{renderError("email")}</div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Alamat Domisili (jika beda dari KK)</Label><Textarea value={formData.alamatDomisili} onChange={(e) => updateField("alamatDomisili", e.target.value)} rows={2} /></div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Dokumen kependudukan</p>
        <div className="space-y-4">
          <div className="space-y-1"><Label className="text-sm">Status e-KTP</Label><Select value={formData.statusEktp} onValueChange={(value) => updateField("statusEktp", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{statusEktpOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("statusEktp")}</div>
          <div className="space-y-1"><Label className="text-sm">No. Akta Lahir</Label><Input value={formData.noAktaLahir} onChange={(e) => updateField("noAktaLahir", e.target.value)} className="h-10" />{renderError("noAktaLahir")}</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {!needsCrvsDocuments(age) && (
            <div className="flex items-center gap-2">
              <Checkbox id={`akta-${testIdPrefix}`} checked={formData.punyaAktaLahir} onCheckedChange={(checked) => updateField("punyaAktaLahir", checked === true)} />
              <Label htmlFor={`akta-${testIdPrefix}`}>Punya Akta Lahir</Label>
            </div>
          )}
          <div className="flex items-center gap-2"><Checkbox id={`npwp-${testIdPrefix}`} checked={formData.punyaNpwp} onCheckedChange={(checked) => updateField("punyaNpwp", checked === true)} /><Label htmlFor={`npwp-${testIdPrefix}`}>Punya NPWP</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`paspor-${testIdPrefix}`} checked={formData.punyaPaspor} onCheckedChange={(checked) => updateField("punyaPaspor", checked === true)} /><Label htmlFor={`paspor-${testIdPrefix}`}>Punya Paspor</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`sim-${testIdPrefix}`} checked={formData.punyaSim} onCheckedChange={(checked) => updateField("punyaSim", checked === true)} /><Label htmlFor={`sim-${testIdPrefix}`}>Punya SIM</Label></div>
        </div>
        {formData.punyaSim && (
          <div className="space-y-1"><Label className="text-sm">Jenis SIM</Label><Select value={formData.jenisSim} onValueChange={(value) => updateField("jenisSim", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih jenis SIM" /></SelectTrigger><SelectContent>{jenisSimOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("jenisSim")}</div>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Sekolah / kuliah / kerja detail</p>
        <div className="space-y-1.5">
          <Label>Keahlian</Label>
          <Input value={formData.keahlian} onChange={(e) => updateField("keahlian", e.target.value)} />
        </div>
        <div className="flex items-center gap-2"><Checkbox id={`sekolah-${testIdPrefix}`} checked={formData.sedangSekolah} onCheckedChange={(checked) => updateField("sedangSekolah", checked === true)} /><Label htmlFor={`sekolah-${testIdPrefix}`}>Sedang Sekolah</Label></div>
        {formData.sedangSekolah && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Nama Sekolah</Label><Input value={formData.namaSekolah} onChange={(e) => updateField("namaSekolah", e.target.value)} className="h-10" />{renderError("namaSekolah")}</div>
            <div className="space-y-1"><Label className="text-sm">Jenjang Sekolah</Label><Select value={formData.jenjangSekolah} onValueChange={(value) => updateField("jenjangSekolah", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih jenjang" /></SelectTrigger><SelectContent>{jenjangSekolahOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("jenjangSekolah")}</div>
            <div className="space-y-1"><Label className="text-sm">Kelas</Label><Input value={formData.kelas} onChange={(e) => updateField("kelas", e.target.value)} className="h-10" /></div>
            <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Jurusan</Label><Input value={formData.jurusan} onChange={(e) => updateField("jurusan", e.target.value)} className="h-10" /></div>
          </div>
        )}
        <div className="flex items-center gap-2"><Checkbox id={`kuliah-${testIdPrefix}`} checked={formData.sedangKuliah} onCheckedChange={(checked) => updateField("sedangKuliah", checked === true)} /><Label htmlFor={`kuliah-${testIdPrefix}`}>Sedang Kuliah</Label></div>
        {formData.sedangKuliah && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Nama Kampus</Label><Input value={formData.namaKampus} onChange={(e) => updateField("namaKampus", e.target.value)} className="h-10" />{renderError("namaKampus")}</div>
            <div className="space-y-1"><Label className="text-sm">Semester</Label><Select value={formData.semester} onValueChange={(value) => updateField("semester", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih semester" /></SelectTrigger><SelectContent>{semesterOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("semester")}</div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Status pekerjaan</Label><Select value={formData.statusPekerjaan} onValueChange={(value) => updateField("statusPekerjaan", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusPekerjaanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("statusPekerjaan")}</div>
          <div className="space-y-1"><Label className="text-sm">Penghasilan Pribadi</Label><Select value={formData.penghasilanPribadi} onValueChange={(value) => updateField("penghasilanPribadi", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{penghasilanPribadiOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Sumber Penghasilan</Label><Input value={formData.sumberPenghasilan} onChange={(e) => updateField("sumberPenghasilan", e.target.value)} className="h-10" /></div>
          <div className="space-y-1"><Label className="text-sm">Nama Tempat Kerja</Label><Input value={formData.namaTempatKerja} onChange={(e) => updateField("namaTempatKerja", e.target.value)} className="h-10" />{renderError("namaTempatKerja")}</div>
          <div className="space-y-1"><Label className="text-sm">Alamat Tempat Kerja</Label><Input value={formData.alamatTempatKerja} onChange={(e) => updateField("alamatTempatKerja", e.target.value)} className="h-10" /></div>
        </div>
        <div className="flex items-center gap-2"><Checkbox id={`usaha-${testIdPrefix}`} checked={formData.punyaUsaha} onCheckedChange={(checked) => updateField("punyaUsaha", checked === true)} /><Label htmlFor={`usaha-${testIdPrefix}`}>Punya Usaha</Label></div>
        {formData.punyaUsaha && (
          <div className="space-y-1"><Label className="text-sm">Nama Usaha</Label><Input value={formData.namaUsaha} onChange={(e) => updateField("namaUsaha", e.target.value)} className="h-10" />{renderError("namaUsaha")}</div>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Kesehatan lanjutan</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2"><Checkbox id={`kronis-${testIdPrefix}`} checked={formData.punyaPenyakitKronis} onCheckedChange={(checked) => updateField("punyaPenyakitKronis", checked === true)} /><Label htmlFor={`kronis-${testIdPrefix}`}>Penyakit kronis</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`damping-${testIdPrefix}`} checked={formData.butuhPendampinganKesehatan} onCheckedChange={(checked) => updateField("butuhPendampinganKesehatan", checked === true)} /><Label htmlFor={`damping-${testIdPrefix}`}>Butuh pendampingan</Label></div>
        </div>
        {formData.punyaPenyakitKronis && <div className="space-y-1"><Label className="text-sm">Penyakit Kronis</Label><Input value={formData.penyakitKronis} onChange={(e) => updateField("penyakitKronis", e.target.value)} className="h-10" />{renderError("penyakitKronis")}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">Alergi</Label><Input value={formData.alergi} onChange={(e) => updateField("alergi", e.target.value)} className="h-10" /></div>
          <div className="space-y-1"><Label className="text-sm">Riwayat Rawat Inap</Label><Input value={formData.riwayatRawatInap} onChange={(e) => updateField("riwayatRawatInap", e.target.value)} className="h-10" /></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-1"><Label className="text-sm">Status Bansos Individu</Label><Select value={formData.statusBansosIndividu} onValueChange={(value) => updateField("statusBansosIndividu", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{statusBansosIndividuOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("statusBansosIndividu")}</div>
          {formData.statusBansosIndividu === "Penerima" && <div className="space-y-1"><Label className="text-sm">Jenis Bansos Individu</Label><Select value={formData.jenisBansosIndividu} onValueChange={(value) => updateField("jenisBansosIndividu", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih jenis bansos" /></SelectTrigger><SelectContent>{jenisBansosIndividuOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("jenisBansosIndividu")}</div>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2"><Checkbox id={`yatim-${testIdPrefix}`} checked={formData.anakYatimPiatu} onCheckedChange={(checked) => updateField("anakYatimPiatu", checked === true)} /><Label htmlFor={`yatim-${testIdPrefix}`}>Anak Yatim/Piatu</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`bantuan-${testIdPrefix}`} checked={formData.perluBantuanKhusus} onCheckedChange={(checked) => updateField("perluBantuanKhusus", checked === true)} /><Label htmlFor={`bantuan-${testIdPrefix}`}>Perlu Bantuan Khusus</Label></div>
        </div>
        {age !== null && age >= 60 && (
          <p className="text-xs text-muted-foreground">Status lansia dihitung otomatis dari tanggal lahir (≥60 tahun).</p>
        )}
        <div className="space-y-1"><Label className="text-sm">Catatan Kerentanan</Label><Textarea value={formData.catatanKerentanan} onChange={(e) => updateField("catatanKerentanan", e.target.value)} rows={2} /></div>
        <div className="flex items-center gap-2"><Checkbox id={`aktifrw-${testIdPrefix}`} checked={formData.aktifKegiatanRw} onCheckedChange={(checked) => updateField("aktifKegiatanRw", checked === true)} /><Label htmlFor={`aktifrw-${testIdPrefix}`}>Aktif kegiatan RW</Label></div>
        {formData.aktifKegiatanRw && <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label className="text-sm">Bidang Partisipasi</Label><Select value={formData.bidangPartisipasi} onValueChange={(value) => updateField("bidangPartisipasi", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih bidang" /></SelectTrigger><SelectContent>{bidangPartisipasiOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("bidangPartisipasi")}</div><div className="space-y-1"><Label className="text-sm">Jabatan Komunitas</Label><Input value={formData.jabatanKomunitas} onChange={(e) => updateField("jabatanKomunitas", e.target.value)} className="h-10" /></div></div>}
        <div className="flex items-center gap-2"><Checkbox id={`kendaraan-${testIdPrefix}`} checked={formData.punyaKendaraan} onCheckedChange={(checked) => updateField("punyaKendaraan", checked === true)} /><Label htmlFor={`kendaraan-${testIdPrefix}`}>Punya kendaraan</Label></div>
        {formData.punyaKendaraan && <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label className="text-sm">Jenis Kendaraan</Label><Select value={formData.jenisKendaraan} onValueChange={(value) => updateField("jenisKendaraan", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih jenis" /></SelectTrigger><SelectContent>{jenisKendaraanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("jenisKendaraan")}</div><div className="space-y-1"><Label className="text-sm">Jumlah</Label><Input type="number" min="0" value={formData.jumlahKendaraan} onChange={(e) => updateField("jumlahKendaraan", e.target.value)} className="h-10" />{renderError("jumlahKendaraan")}</div></div>}
      </div>
        </CollapsibleContent>
      </Collapsible>

      {showAdmin && (
        <section className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-base font-semibold">Verifikasi petugas</h3>
            <p className="text-sm text-muted-foreground">Hanya admin / Blusukan RW.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Status verifikasi</Label>
              <Select value={formData.statusVerifikasiData} onValueChange={(value) => updateField("statusVerifikasiData", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusVerifikasiDataOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal verifikasi</Label>
              <Input type="date" value={formData.tanggalVerifikasiData} onChange={(e) => updateField("tanggalVerifikasiData", e.target.value)} />
              {renderError("tanggalVerifikasiData")}
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={formData.catatanVerifikasi} onChange={(e) => updateField("catatanVerifikasi", e.target.value)} rows={3} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
export function toWhatsappLink(nomorWhatsapp: string) {
  return `https://wa.me/${nomorWhatsapp.replace(/^0/, "62").replace(/[^0-9]/g, "")}`;
}
