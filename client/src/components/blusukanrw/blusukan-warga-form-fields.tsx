import { useMemo, type Dispatch, RefObject, SetStateAction } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { KartuKeluarga } from "@shared/schema";
import {
  type BlusukanWargaFormValues,
  type BlusukanWargaFormErrors,
  getWargaAge,
  needsWhatsapp,
  showWhatsappField,
} from "@shared/blusukan-warga-form";
import { needsPekerjaanDetail, needsStatusAngkatanKerja } from "@shared/warga-international";
import {
  pekerjaanOptions,
  agamaOptions,
  jenisKelaminOptions,
  statusPerkawinanOptions,
  kedudukanKeluargaOptions,
  statusPekerjaanOptions,
  jenjangSekolahOptions,
  semesterOptions,
  statusVerifikasiDataOptions,
  statusBansosIndividuOptions,
  jenisBansosIndividuOptions,
} from "@/lib/constants";
import {
  BlusukanCheckRow,
  BlusukanField,
  BlusukanFormSection,
  BlusukanNativeSelect,
  blusukanInputClass,
  blusukanTextareaClass,
} from "./blusukan-form-ui";

export function BlusukanWargaFormFields({
  formData,
  setFormData,
  errors,
  testIdPrefix,
  showVerifikasiAdmin = true,
  showPindahKk = false,
  searchVal,
  setSearchVal,
  dropdownOpen,
  setDropdownOpen,
  pickerRef,
  kkList,
}: {
  formData: BlusukanWargaFormValues;
  setFormData: Dispatch<SetStateAction<BlusukanWargaFormValues>>;
  errors: BlusukanWargaFormErrors;
  testIdPrefix: string;
  showVerifikasiAdmin?: boolean;
  showPindahKk?: boolean;
  searchVal: string;
  setSearchVal: (value: string) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (value: boolean) => void;
  pickerRef: RefObject<HTMLDivElement>;
  kkList?: KartuKeluarga[];
}) {
  const age = useMemo(() => getWargaAge(formData.tanggalLahir), [formData.tanggalLahir]);
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

  const updateField = <K extends keyof BlusukanWargaFormValues>(key: K, value: BlusukanWargaFormValues[K]) => {
    setFormData({ ...formData, [key]: value });
  };

  const waLabel =
    age !== null && needsWhatsapp(age)
      ? "No. WhatsApp *"
      : age !== null && age >= 7
        ? "No. WhatsApp (opsional)"
        : "No. WhatsApp";

  return (
    <div className="space-y-4 pb-2">
      {showPindahKk && kkList && kkList.length > 0 && (
        <BlusukanFormSection title="Pindah KK" subtitle="Hanya jika pindah domisili" defaultOpen={false}>
          <div className="space-y-2 relative" ref={pickerRef}>
            {selectedKk ? (
              <div className="flex items-center gap-2 rounded-lg border p-3 min-h-12">
                <span className="text-base flex-1 truncate">
                  {selectedKk.nomorKk} · RT {selectedKk.rt}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 shrink-0"
                  onClick={() => {
                    setFormData({ ...formData, kkId: "" });
                    setSearchVal("");
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchVal}
                  onChange={(e) => {
                    setSearchVal(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Cari nomor KK..."
                  className={`${blusukanInputClass} pl-10`}
                />
              </div>
            )}
            {dropdownOpen && !selectedKk && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredKkList.slice(0, 15).map((kk) => (
                  <button
                    key={kk.id}
                    type="button"
                    className="w-full text-left px-4 py-3.5 hover:bg-accent text-base border-b last:border-b-0 touch-manipulation min-h-12"
                    onClick={() => {
                      setFormData({ ...formData, kkId: kk.id.toString() });
                      setDropdownOpen(false);
                      setSearchVal("");
                    }}
                  >
                    <div className="font-medium">{kk.nomorKk}</div>
                    <div className="text-sm text-muted-foreground">RT {kk.rt}</div>
                  </button>
                ))}
              </div>
            )}
            {errors.kkId && <p className="text-sm text-destructive">{errors.kkId}</p>}
          </div>
        </BlusukanFormSection>
      )}

      <BlusukanFormSection title="Data pokok" subtitle="Nama, NIK, identitas dasar" defaultOpen>
        <BlusukanField label="Nama lengkap *" error={errors.namaLengkap}>
          <Input
            value={formData.namaLengkap}
            onChange={(e) => updateField("namaLengkap", e.target.value)}
            className={blusukanInputClass}
            autoComplete="name"
            data-testid={`input-nama-${testIdPrefix}`}
          />
        </BlusukanField>
        <BlusukanField label="NIK (16 digit) *" error={errors.nik}>
          <Input
            value={formData.nik}
            onChange={(e) => updateField("nik", e.target.value)}
            inputMode="numeric"
            className={`${blusukanInputClass} font-mono`}
          />
        </BlusukanField>
        <BlusukanField label="Tanggal lahir *" error={errors.tanggalLahir}>
          <Input
            type="date"
            value={formData.tanggalLahir}
            onChange={(e) => updateField("tanggalLahir", e.target.value)}
            className={blusukanInputClass}
          />
        </BlusukanField>
        <BlusukanField label="Tempat lahir *" error={errors.tempatLahir}>
          <Input
            value={formData.tempatLahir}
            onChange={(e) => updateField("tempatLahir", e.target.value)}
            className={blusukanInputClass}
          />
        </BlusukanField>
        <BlusukanField label="Jenis kelamin *">
          <BlusukanNativeSelect
            value={formData.jenisKelamin}
            onChange={(v) => updateField("jenisKelamin", v)}
            options={jenisKelaminOptions}
          />
        </BlusukanField>
        <BlusukanField label="Kedudukan dalam KK *">
          <BlusukanNativeSelect
            value={formData.kedudukanKeluarga}
            onChange={(v) => updateField("kedudukanKeluarga", v)}
            options={kedudukanKeluargaOptions}
          />
        </BlusukanField>
        <BlusukanField label="Status perkawinan">
          <BlusukanNativeSelect
            value={formData.statusPerkawinan}
            onChange={(v) => updateField("statusPerkawinan", v)}
            options={statusPerkawinanOptions}
          />
        </BlusukanField>
        <BlusukanField label="Agama">
          <BlusukanNativeSelect
            value={formData.agama}
            onChange={(v) => updateField("agama", v)}
            options={agamaOptions}
          />
        </BlusukanField>
      </BlusukanFormSection>

      {showWhatsappField(age) && (
        <BlusukanFormSection title="Kontak" subtitle="WhatsApp untuk koordinasi" defaultOpen>
          <BlusukanField label={waLabel} error={errors.nomorWhatsapp}>
            <Input
              value={formData.nomorWhatsapp}
              onChange={(e) => updateField("nomorWhatsapp", e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              className={blusukanInputClass}
            />
          </BlusukanField>
        </BlusukanFormSection>
      )}

      <BlusukanFormSection title="Akta kelahiran" subtitle="Standar Dukcapil" defaultOpen={false}>
        <BlusukanCheckRow
          id={`akta-${testIdPrefix}`}
          checked={formData.punyaAktaLahir}
          onCheckedChange={(c) => updateField("punyaAktaLahir", c)}
          label="Punya akta kelahiran"
        />
        {formData.punyaAktaLahir && (
          <>
            <BlusukanField label="Nomor akta kelahiran *" error={errors.noAktaLahir}>
              <Input value={formData.noAktaLahir} onChange={(e) => updateField("noAktaLahir", e.target.value)} className={blusukanInputClass} />
            </BlusukanField>
            <BlusukanField label="Tanggal terbit akta *" error={errors.tanggalTerbitAktaLahir}>
              <Input type="date" value={formData.tanggalTerbitAktaLahir} onChange={(e) => updateField("tanggalTerbitAktaLahir", e.target.value)} className={blusukanInputClass} />
            </BlusukanField>
            <BlusukanField label="Tempat terbit (Kab/Kota) *" error={errors.tempatTerbitAktaLahir}>
              <Input value={formData.tempatTerbitAktaLahir} onChange={(e) => updateField("tempatTerbitAktaLahir", e.target.value)} placeholder="Contoh: Kota Cimahi" className={blusukanInputClass} />
            </BlusukanField>
            <BlusukanField label="Nama ibu (sesuai akta) *" error={errors.namaIbuAktaLahir}>
              <Input value={formData.namaIbuAktaLahir} onChange={(e) => updateField("namaIbuAktaLahir", e.target.value)} className={blusukanInputClass} />
            </BlusukanField>
            <BlusukanField label="Nama ayah (sesuai akta)">
              <Input value={formData.namaAyahAktaLahir} onChange={(e) => updateField("namaAyahAktaLahir", e.target.value)} className={blusukanInputClass} />
            </BlusukanField>
          </>
        )}
        <BlusukanCheckRow
          id={`kia-${testIdPrefix}`}
          checked={formData.punyaKia}
          onCheckedChange={(c) => updateField("punyaKia", c)}
          label="Punya KIA (Kartu Identitas Anak)"
        />
      </BlusukanFormSection>

      <BlusukanFormSection title="Pendidikan" subtitle="Sekolah atau kuliah aktif" defaultOpen={false}>
        <BlusukanCheckRow
          id={`sekolah-${testIdPrefix}`}
          checked={formData.sedangSekolah}
          onCheckedChange={(c) => updateField("sedangSekolah", c)}
          label="Sedang sekolah"
        />
        {formData.sedangSekolah && (
          <>
            <BlusukanField label="Jenjang sekolah *" error={errors.jenjangSekolah}>
              <BlusukanNativeSelect
                value={formData.jenjangSekolah}
                onChange={(v) => updateField("jenjangSekolah", v)}
                options={jenjangSekolahOptions}
                placeholder="Pilih jenjang"
              />
            </BlusukanField>
            <BlusukanField label="Nama sekolah *" error={errors.namaSekolah}>
              <Input value={formData.namaSekolah} onChange={(e) => updateField("namaSekolah", e.target.value)} className={blusukanInputClass} />
            </BlusukanField>
            <BlusukanField label="Kelas">
              <Input value={formData.kelas} onChange={(e) => updateField("kelas", e.target.value)} placeholder="Contoh: 9, XII IPA" className={blusukanInputClass} />
            </BlusukanField>
          </>
        )}
        <BlusukanCheckRow
          id={`kuliah-${testIdPrefix}`}
          checked={formData.sedangKuliah}
          onCheckedChange={(c) => updateField("sedangKuliah", c)}
          label="Sedang kuliah"
        />
        {formData.sedangKuliah && (
          <>
            <BlusukanField label="Nama kampus *" error={errors.namaKampus}>
              <Input value={formData.namaKampus} onChange={(e) => updateField("namaKampus", e.target.value)} className={blusukanInputClass} />
            </BlusukanField>
            <BlusukanField label="Semester *" error={errors.semester}>
              <BlusukanNativeSelect
                value={formData.semester}
                onChange={(v) => updateField("semester", v)}
                options={semesterOptions}
                placeholder="Pilih semester"
              />
            </BlusukanField>
            <BlusukanField label="Jurusan / prodi">
              <Input value={formData.jurusan} onChange={(e) => updateField("jurusan", e.target.value)} className={blusukanInputClass} />
            </BlusukanField>
          </>
        )}
      </BlusukanFormSection>

      <BlusukanFormSection title="Pekerjaan" subtitle="Status kerja & usaha luar RW" defaultOpen={false}>
        {needsStatusAngkatanKerja(age) && (
          <>
            <BlusukanField label="Status pekerjaan *" error={errors.statusPekerjaan}>
              <p className="text-xs text-muted-foreground mb-2">
                Ibu/mengurus rumah tangga bukan pengangguran. Pilih «Mencari Kerja» hanya jika sedang aktif cari kerja.
              </p>
              <BlusukanNativeSelect
                value={formData.statusPekerjaan}
                onChange={(v) => {
                  setFormData((prev) => ({
                    ...prev,
                    statusPekerjaan: v,
                    ...(needsPekerjaanDetail(v)
                      ? {}
                      : { pekerjaan: "", namaTempatKerja: "", alamatTempatKerja: "" }),
                  }));
                }}
                options={statusPekerjaanOptions}
                placeholder="Pilih status pekerjaan"
              />
            </BlusukanField>
            {needsPekerjaanDetail(formData.statusPekerjaan) && (
              <>
                <BlusukanField label="Pekerjaan / jabatan *" error={errors.pekerjaan}>
                  <BlusukanNativeSelect
                    value={formData.pekerjaan}
                    onChange={(v) => updateField("pekerjaan", v)}
                    options={pekerjaanOptions}
                    placeholder="Pilih pekerjaan"
                  />
                </BlusukanField>
                <BlusukanField label="Nama tempat kerja *" error={errors.namaTempatKerja}>
                  <Input value={formData.namaTempatKerja} onChange={(e) => updateField("namaTempatKerja", e.target.value)} className={blusukanInputClass} />
                </BlusukanField>
                <BlusukanField label="Alamat tempat kerja *" error={errors.alamatTempatKerja}>
                  <Textarea value={formData.alamatTempatKerja} onChange={(e) => updateField("alamatTempatKerja", e.target.value)} rows={3} className={blusukanTextareaClass} />
                </BlusukanField>
              </>
            )}
          </>
        )}
        <BlusukanCheckRow
          id={`usaha-luar-${testIdPrefix}`}
          checked={formData.punyaUsahaLuarRw3}
          onCheckedChange={(c) => updateField("punyaUsahaLuarRw3", c)}
          label="Punya usaha di luar RW 03"
        />
        {formData.punyaUsahaLuarRw3 && (
          <BlusukanField label="Nama usaha *" error={errors.namaUsahaLuarRw3}>
            <Input value={formData.namaUsahaLuarRw3} onChange={(e) => updateField("namaUsahaLuarRw3", e.target.value)} className={blusukanInputClass} />
          </BlusukanField>
        )}
      </BlusukanFormSection>

      <BlusukanFormSection title="Kesehatan & bansos" defaultOpen={false}>
        <BlusukanCheckRow
          id={`kronis-${testIdPrefix}`}
          checked={formData.punyaPenyakitKronis}
          onCheckedChange={(c) => updateField("punyaPenyakitKronis", c)}
          label="Punya penyakit kronis"
        />
        {formData.punyaPenyakitKronis && (
          <BlusukanField label="Penyakit kronis *" error={errors.penyakitKronis}>
            <Input value={formData.penyakitKronis} onChange={(e) => updateField("penyakitKronis", e.target.value)} placeholder="Contoh: diabetes, hipertensi" className={blusukanInputClass} />
          </BlusukanField>
        )}
        <BlusukanField label="Status penerima bansos *" error={errors.statusBansosIndividu}>
          <BlusukanNativeSelect
            value={formData.statusBansosIndividu}
            onChange={(v) => updateField("statusBansosIndividu", v)}
            options={statusBansosIndividuOptions}
          />
        </BlusukanField>
        {formData.statusBansosIndividu === "Penerima" && (
          <BlusukanField label="Jenis bansos *" error={errors.jenisBansosIndividu}>
            <BlusukanNativeSelect
              value={formData.jenisBansosIndividu}
              onChange={(v) => updateField("jenisBansosIndividu", v)}
              options={jenisBansosIndividuOptions}
              placeholder="Pilih jenis"
            />
          </BlusukanField>
        )}
      </BlusukanFormSection>

      {showVerifikasiAdmin && (
        <BlusukanFormSection title="Verifikasi petugas" defaultOpen={false}>
          <BlusukanField label="Status verifikasi">
            <BlusukanNativeSelect
              value={formData.statusVerifikasiData}
              onChange={(v) => updateField("statusVerifikasiData", v)}
              options={statusVerifikasiDataOptions}
            />
          </BlusukanField>
          <BlusukanField label="Tanggal verifikasi" error={errors.tanggalVerifikasiData}>
            <Input type="date" value={formData.tanggalVerifikasiData} onChange={(e) => updateField("tanggalVerifikasiData", e.target.value)} className={blusukanInputClass} />
          </BlusukanField>
          <BlusukanField label="Catatan">
            <Textarea value={formData.catatanVerifikasi} onChange={(e) => updateField("catatanVerifikasi", e.target.value)} rows={3} className={blusukanTextareaClass} />
          </BlusukanField>
        </BlusukanFormSection>
      )}
    </div>
  );
}
