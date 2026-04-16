import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  MessageCircle,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { KartuKeluarga } from "@shared/schema";
import {
  pekerjaanOptions,
  pendidikanOptions,
  agamaOptions,
  jenisKelaminOptions,
  statusPerkawinanOptions,
  kedudukanKeluargaOptions,
  statusKependudukanOptions,
  statusDisabilitasOptions,
  kondisiKesehatanOptions,
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

const PER_PAGE = 10;

type WargaFormValues = {
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

type WargaWithKk = {
  id: number;
  kkId: number | null;
  nomorKk?: string | null;
  rt?: number | null;
  alamat?: string | null;
} & {
  [K in Exclude<keyof WargaFormValues, "kkId">]: WargaFormValues[K] | null;
};

const defaultForm: WargaFormValues = {
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

function mapWargaToForm(warga: WargaWithKk): WargaFormValues {
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

function toWargaPayload(form: WargaFormValues) {
  return {
    ...form,
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

type FormErrors = Partial<Record<keyof WargaFormValues, string>>;

type FormSection = {
  key: string;
  title: string;
  description: string;
  fields: (keyof WargaFormValues)[];
};

const FORM_SECTIONS: FormSection[] = [
  { key: "identitas", title: "Identitas Utama", description: "Data dasar administrasi warga.", fields: ["kkId", "namaLengkap", "nik", "noKkDiKtp", "namaAlias", "jenisKelamin", "agama", "statusPerkawinan", "kedudukanKeluarga", "tempatLahir", "tanggalLahir", "golonganDarah", "kewarganegaraan", "suku"] },
  { key: "kontak", title: "Kontak & Domisili", description: "Kontak aktif, domisili, dan kontak darurat.", fields: ["nomorWhatsapp", "nomorWhatsappAlternatif", "email", "alamatDomisili", "lamaTinggalTahun", "statusTinggalIndividu", "hubunganDenganPemilikRumah", "namaKontakDarurat", "hubunganKontakDarurat", "nomorKontakDarurat"] },
  { key: "dokumen", title: "Dokumen Kependudukan", description: "Kelengkapan dokumen utama warga.", fields: ["statusEktp", "noAktaLahir", "punyaAktaLahir", "punyaKia", "punyaNpwp", "punyaSim", "jenisSim", "punyaPaspor"] },
  { key: "pendidikan", title: "Pendidikan & Aktivitas", description: "Status belajar, kampus, dan keahlian.", fields: ["pendidikan", "sedangSekolah", "namaSekolah", "jenjangSekolah", "kelas", "jurusan", "sedangKuliah", "namaKampus", "semester", "keahlian"] },
  { key: "kerja", title: "Pekerjaan & Ekonomi", description: "Data kerja dan sumber penghasilan pribadi.", fields: ["pekerjaan", "statusPekerjaan", "namaTempatKerja", "alamatTempatKerja", "penghasilanPribadi", "sumberPenghasilan", "punyaUsaha", "namaUsaha"] },
  { key: "kesehatan", title: "Kesehatan", description: "BPJS, penyakit kronis, dan kebutuhan kesehatan.", fields: ["kondisiKesehatan", "statusDisabilitas", "ibuHamil", "punyaBpjsKesehatan", "nomorBpjsKesehatan", "punyaPenyakitKronis", "penyakitKronis", "alergi", "riwayatRawatInap", "butuhPendampinganKesehatan"] },
  { key: "sosial", title: "Sosial & Kerentanan", description: "Bansos, lansia, dan kondisi khusus sosial.", fields: ["statusKependudukan", "statusBansosIndividu", "jenisBansosIndividu", "lansia", "anakYatimPiatu", "perluBantuanKhusus", "catatanKerentanan"] },
  { key: "partisipasi", title: "Partisipasi & Aset", description: "Keterlibatan warga dan aset pribadi ringan.", fields: ["aktifKegiatanRw", "bidangPartisipasi", "jabatanKomunitas", "punyaKendaraan", "jenisKendaraan", "jumlahKendaraan"] },
  { key: "verifikasi", title: "Verifikasi Admin", description: "Metadata review dan catatan verifikasi.", fields: ["statusVerifikasiData", "tanggalVerifikasiData", "catatanVerifikasi"] },
];

function isWorkingStatus(value: string) {
  return ["Bekerja", "Wiraswasta", "Pelaku Usaha", "Pekerja Lepas"].includes(value);
}

function validateWargaFormData(formData: WargaFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!formData.kkId) errors.kkId = "KK wajib dipilih";
  if (!formData.namaLengkap.trim()) errors.namaLengkap = "Nama lengkap wajib diisi";
  if (!/^\d{16}$/.test(formData.nik)) errors.nik = "NIK harus 16 digit";
  if (formData.nomorWhatsapp && !/^(0|62)\d{8,15}$/.test(formData.nomorWhatsapp)) errors.nomorWhatsapp = "No. WhatsApp tidak valid";
  if (formData.nomorWhatsappAlternatif && !/^(0|62)\d{8,15}$/.test(formData.nomorWhatsappAlternatif)) errors.nomorWhatsappAlternatif = "No. WhatsApp alternatif tidak valid";
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Email tidak valid";
  if (!formData.tempatLahir.trim()) errors.tempatLahir = "Tempat lahir wajib diisi";
  if (!formData.tanggalLahir) errors.tanggalLahir = "Tanggal lahir wajib diisi";
  if (formData.tanggalLahir && new Date(`${formData.tanggalLahir}T00:00:00`).getTime() > Date.now()) errors.tanggalLahir = "Tanggal lahir tidak boleh di masa depan";
  if (!formData.nomorWhatsappAlternatif.trim()) errors.nomorWhatsappAlternatif = "No. WhatsApp alternatif wajib diisi";
  if (!formData.alamatDomisili.trim()) errors.alamatDomisili = "Alamat domisili wajib diisi";
  if (formData.lamaTinggalTahun === "") errors.lamaTinggalTahun = "Lama tinggal wajib diisi";
  if (formData.lamaTinggalTahun && Number(formData.lamaTinggalTahun) < 0) errors.lamaTinggalTahun = "Lama tinggal tidak boleh negatif";
  if (!formData.namaKontakDarurat.trim()) errors.namaKontakDarurat = "Nama kontak darurat wajib diisi";
  if (!formData.nomorKontakDarurat.trim()) errors.nomorKontakDarurat = "Nomor kontak darurat wajib diisi";
  if (formData.nomorKontakDarurat && !/^(0|62)\d{8,15}$/.test(formData.nomorKontakDarurat)) errors.nomorKontakDarurat = "Nomor kontak darurat tidak valid";
  if (formData.punyaSim && !formData.jenisSim) errors.jenisSim = "Jenis SIM wajib dipilih";
  if (!formData.statusEktp) errors.statusEktp = "Status e-KTP wajib dipilih";
  if (formData.sedangSekolah) {
    if (!formData.namaSekolah.trim()) errors.namaSekolah = "Nama sekolah wajib diisi";
    if (!formData.jenjangSekolah) errors.jenjangSekolah = "Jenjang sekolah wajib dipilih";
  }
  if (formData.sedangKuliah) {
    if (!formData.namaKampus.trim()) errors.namaKampus = "Nama kampus wajib diisi";
    if (!formData.semester) errors.semester = "Semester wajib dipilih";
  }
  if (!formData.pendidikan) errors.pendidikan = "Pendidikan wajib dipilih";
  if (!formData.pekerjaan) errors.pekerjaan = "Pekerjaan wajib dipilih";
  if (!formData.statusPekerjaan) errors.statusPekerjaan = "Status pekerjaan wajib dipilih";
  if (isWorkingStatus(formData.statusPekerjaan) && !formData.namaTempatKerja.trim()) errors.namaTempatKerja = "Nama tempat kerja wajib diisi";
  if (formData.punyaUsaha && !formData.namaUsaha.trim()) errors.namaUsaha = "Nama usaha wajib diisi";
  if (formData.punyaBpjsKesehatan && !formData.nomorBpjsKesehatan.trim()) errors.nomorBpjsKesehatan = "Nomor BPJS wajib diisi";
  if (formData.punyaPenyakitKronis && !formData.penyakitKronis.trim()) errors.penyakitKronis = "Penyakit kronis wajib diisi";
  if (!formData.statusBansosIndividu) errors.statusBansosIndividu = "Status bansos wajib dipilih";
  if (formData.statusBansosIndividu === "Penerima" && !formData.jenisBansosIndividu) errors.jenisBansosIndividu = "Jenis bansos wajib dipilih";
  if (formData.aktifKegiatanRw && !formData.bidangPartisipasi) errors.bidangPartisipasi = "Bidang partisipasi wajib dipilih";
  if (formData.punyaKendaraan) {
    if (!formData.jenisKendaraan) errors.jenisKendaraan = "Jenis kendaraan wajib dipilih";
    if (!formData.jumlahKendaraan) errors.jumlahKendaraan = "Jumlah kendaraan wajib diisi";
  }
  if (formData.jumlahKendaraan && Number(formData.jumlahKendaraan) < 0) errors.jumlahKendaraan = "Jumlah kendaraan tidak boleh negatif";
  if (formData.tanggalVerifikasiData && new Date(`${formData.tanggalVerifikasiData}T00:00:00`).getTime() > Date.now()) errors.tanggalVerifikasiData = "Tanggal verifikasi tidak boleh di masa depan";

  return errors;
}

function toWhatsappLink(nomorWhatsapp: string) {
  return `https://wa.me/${nomorWhatsapp.replace(/^0/, "62").replace(/[^0-9]/g, "")}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

export default function AdminKelolaWarga() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<WargaFormValues>(defaultForm);
  const [editForm, setEditForm] = useState<WargaFormValues>(defaultForm);
  const [editingWargaId, setEditingWargaId] = useState<number | null>(null);
  const [kkSearch, setKkSearch] = useState("");
  const [kkDropdownOpen, setKkDropdownOpen] = useState(false);
  const [editKkSearch, setEditKkSearch] = useState("");
  const [editKkDropdownOpen, setEditKkDropdownOpen] = useState(false);
  const [deleteWarga, setDeleteWarga] = useState<WargaWithKk | null>(null);
  const kkPickerRef = useRef<HTMLDivElement>(null);
  const editKkPickerRef = useRef<HTMLDivElement>(null);
  const formErrors = useMemo(() => validateWargaFormData(form), [form]);
  const editFormErrors = useMemo(() => validateWargaFormData(editForm), [editForm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (kkPickerRef.current && !kkPickerRef.current.contains(event.target as Node)) {
        setKkDropdownOpen(false);
      }
      if (editKkPickerRef.current && !editKkPickerRef.current.contains(event.target as Node)) {
        setEditKkDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: kkList } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });
  const { data: wargaList, isLoading } = useQuery<WargaWithKk[]>({ queryKey: ["/api/warga-with-kk"] });

  const filteredWarga = useMemo(() => {
    return (
      wargaList?.filter((warga) => {
        const query = search.toLowerCase();
        return (
          (warga.namaLengkap || "").toLowerCase().includes(query) ||
          (warga.nik || "").includes(search) ||
          (warga.nomorKk && warga.nomorKk.includes(search))
        );
      }) || []
    );
  }, [search, wargaList]);

  const totalPages = Math.ceil(filteredWarga.length / PER_PAGE);
  const paginatedWarga = filteredWarga.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const resetCreateDialog = () => {
    setDialogOpen(false);
    setForm(defaultForm);
    setKkSearch("");
    setKkDropdownOpen(false);
  };

  const resetEditDialog = () => {
    setEditDialogOpen(false);
    setEditingWargaId(null);
    setEditForm(defaultForm);
    setEditKkSearch("");
    setEditKkDropdownOpen(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/warga", toWargaPayload(form));
    },
    onSuccess: () => {
      toast({ title: "Warga ditambahkan" });
      resetCreateDialog();
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingWargaId) return;
      await apiRequest("PATCH", `/api/warga/${editingWargaId}`, toWargaPayload(editForm));
    },
    onSuccess: () => {
      toast({ title: "Data warga diperbarui" });
      resetEditDialog();
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteWargaMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/warga/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Warga berhasil dihapus" });
      setDeleteWarga(null);
      queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    },
    onError: (error: unknown) => {
      toast({ title: "Gagal menghapus", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const openEditDialog = (warga: WargaWithKk) => {
    setEditForm(mapWargaToForm(warga));
    setEditingWargaId(warga.id);
    setEditDialogOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold" data-testid="text-warga-title">
          Data Warga
        </h2>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetCreateDialog();
              return;
            }
            setDialogOpen(true);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-1.5" data-testid="button-tambah-warga">
              <Plus className="w-4 h-4" /> Tambah Warga
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Warga</DialogTitle>
            </DialogHeader>
            <WargaFormFields
              formData={form}
              setFormData={setForm}
              errors={formErrors}
              testIdPrefix="warga"
              searchVal={kkSearch}
              setSearchVal={setKkSearch}
              dropdownOpen={kkDropdownOpen}
              setDropdownOpen={setKkDropdownOpen}
              pickerRef={kkPickerRef}
              kkList={kkList}
            />
            <Button
              className="w-full h-10"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || Object.keys(formErrors).length > 0}
              data-testid="button-simpan-warga"
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan Warga"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetEditDialog();
            return;
          }
          setEditDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Warga</DialogTitle>
          </DialogHeader>
          <WargaFormFields
            formData={editForm}
            setFormData={setEditForm}
            errors={editFormErrors}
            testIdPrefix="edit-warga"
            searchVal={editKkSearch}
            setSearchVal={setEditKkSearch}
            dropdownOpen={editKkDropdownOpen}
            setDropdownOpen={setEditKkDropdownOpen}
            pickerRef={editKkPickerRef}
            kkList={kkList}
          />
          <Button
            className="w-full h-10"
            onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending || Object.keys(editFormErrors).length > 0}
            data-testid="button-simpan-edit-warga"
          >
            {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Cari nama, NIK, atau nomor KK..."
          className="h-10 pl-9"
          data-testid="input-search-warga"
        />
      </div>

      <p className="text-xs text-muted-foreground" data-testid="text-warga-count">
        Menampilkan {paginatedWarga.length} dari {filteredWarga.length} warga
        {totalPages > 1 && ` (halaman ${page} dari ${totalPages})`}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedWarga.map((warga) => (
            <Card key={warga.id} data-testid={`card-warga-admin-${warga.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{warga.namaLengkap}</p>
                      <p className="text-[10px] text-muted-foreground">NIK: {warga.nik}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                    <Badge variant="secondary" className="text-[10px]">
                      RT {warga.rt?.toString().padStart(2, "0")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {warga.kedudukanKeluarga}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(warga)}
                    data-testid={`button-edit-warga-${warga.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteWarga(warga)}
                    data-testid={`button-delete-warga-${warga.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  {warga.nomorWhatsapp ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 h-7 text-green-700 border-green-200 hover:bg-green-50"
                      asChild
                      data-testid={`button-wa-${warga.id}`}
                    >
                      <a href={toWhatsappLink(warga.nomorWhatsapp)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-3 h-3" /> WA
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 h-7 opacity-40"
                      disabled
                      data-testid={`button-wa-${warga.id}`}
                    >
                      <MessageCircle className="w-3 h-3" /> WA
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page <= 1}
            onClick={() => setPage((currentPage) => currentPage - 1)}
            data-testid="button-prev-warga"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page >= totalPages}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            data-testid="button-next-warga"
          >
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!deleteWarga}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteWarga(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Hapus Data Warga?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <span className="block">
                Data <strong>{deleteWarga?.namaLengkap}</strong> (NIK: {deleteWarga?.nik}) akan dihapus beserta:
              </span>
              <span className="block text-red-600 font-medium">
                • Semua laporan warga terkait
                <br />
                • Semua surat warga terkait
                <br />
                • Semua pengajuan edit profil terkait
              </span>
              <span className="block font-semibold text-red-700">Tindakan ini tidak dapat dibatalkan!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-warga">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteWarga && deleteWargaMutation.mutate(deleteWarga.id)}
              disabled={deleteWargaMutation.isPending}
              data-testid="button-confirm-delete-warga"
            >
              {deleteWargaMutation.isPending ? "Menghapus..." : "Hapus Warga"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WargaFormFields({
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
}) {
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

  const sectionStats = FORM_SECTIONS.map((section) => {
    const total = section.fields.length;
    const invalid = section.fields.filter((field) => errors[field]).length;
    return { ...section, total, invalid, completed: total - invalid };
  });

  const updateField = <K extends keyof WargaFormValues>(key: K, value: WargaFormValues[K]) => {
    setFormData({ ...formData, [key]: value });
  };

  const renderError = (field: keyof WargaFormValues) =>
    errors[field] ? <p className="text-[11px] text-red-600">{errors[field]}</p> : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3">
        {sectionStats.map((section) => (
          <div key={section.key} className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-xs font-semibold">{section.title}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {section.invalid === 0 ? "Siap" : `${section.invalid} field perlu dicek`} · {section.completed}/{section.total}
            </p>
          </div>
        ))}
      </div>

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

      <div className="space-y-4 rounded-2xl border border-border/70 p-4">
        <div>
          <p className="text-sm font-semibold">Identitas Utama</p>
          <p className="text-xs text-muted-foreground">Identitas administrasi inti warga.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">Nama Lengkap</Label><Input value={formData.namaLengkap} onChange={(e) => updateField("namaLengkap", e.target.value)} className="h-10" data-testid={`input-nama-${testIdPrefix}`} />{renderError("namaLengkap")}</div>
          <div className="space-y-1"><Label className="text-sm">Nama Alias</Label><Input value={formData.namaAlias} onChange={(e) => updateField("namaAlias", e.target.value)} className="h-10" />{renderError("namaAlias")}</div>
          <div className="space-y-1"><Label className="text-sm">NIK</Label><Input value={formData.nik} onChange={(e) => updateField("nik", e.target.value)} className="h-10" data-testid={`input-nik-${testIdPrefix}`} />{renderError("nik")}</div>
          <div className="space-y-1"><Label className="text-sm">No KK di KTP</Label><Input value={formData.noKkDiKtp} onChange={(e) => updateField("noKkDiKtp", e.target.value)} className="h-10" />{renderError("noKkDiKtp")}</div>
          <div className="space-y-1"><Label className="text-sm">Tempat Lahir</Label><Input value={formData.tempatLahir} onChange={(e) => updateField("tempatLahir", e.target.value)} className="h-10" data-testid={`input-tempat-lahir-${testIdPrefix}`} />{renderError("tempatLahir")}</div>
          <div className="space-y-1"><Label className="text-sm">Tanggal Lahir</Label><Input type="date" value={formData.tanggalLahir} onChange={(e) => updateField("tanggalLahir", e.target.value)} className="h-10" data-testid={`input-tanggal-lahir-${testIdPrefix}`} />{renderError("tanggalLahir")}</div>
          <div className="space-y-1"><Label className="text-sm">Jenis Kelamin</Label><Select value={formData.jenisKelamin} onValueChange={(value) => updateField("jenisKelamin", value)}><SelectTrigger className="h-10" data-testid={`select-jk-${testIdPrefix}`}><SelectValue /></SelectTrigger><SelectContent>{jenisKelaminOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Kedudukan</Label><Select value={formData.kedudukanKeluarga} onValueChange={(value) => updateField("kedudukanKeluarga", value)}><SelectTrigger className="h-10" data-testid={`select-kedudukan-${testIdPrefix}`}><SelectValue /></SelectTrigger><SelectContent>{kedudukanKeluargaOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Agama</Label><Select value={formData.agama} onValueChange={(value) => updateField("agama", value)}><SelectTrigger className="h-10" data-testid={`select-agama-${testIdPrefix}`}><SelectValue /></SelectTrigger><SelectContent>{agamaOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Status Kawin</Label><Select value={formData.statusPerkawinan} onValueChange={(value) => updateField("statusPerkawinan", value)}><SelectTrigger className="h-10" data-testid={`select-status-kawin-${testIdPrefix}`}><SelectValue /></SelectTrigger><SelectContent>{statusPerkawinanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Golongan Darah</Label><Select value={formData.golonganDarah} onValueChange={(value) => updateField("golonganDarah", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{golonganDarahOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Kewarganegaraan</Label><Select value={formData.kewarganegaraan} onValueChange={(value) => updateField("kewarganegaraan", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{kewarganegaraanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="space-y-1"><Label className="text-sm">Suku</Label><Input value={formData.suku} onChange={(e) => updateField("suku", e.target.value)} className="h-10" />{renderError("suku")}</div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 p-4">
        <div>
          <p className="text-sm font-semibold">Kontak & Domisili</p>
          <p className="text-xs text-muted-foreground">Nomor aktif, email, domisili, dan kontak darurat.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">No. WhatsApp</Label><Input value={formData.nomorWhatsapp} onChange={(e) => updateField("nomorWhatsapp", e.target.value)} className="h-10" data-testid={`input-wa-${testIdPrefix}`} />{renderError("nomorWhatsapp")}</div>
          <div className="space-y-1"><Label className="text-sm">No. WhatsApp Alternatif</Label><Input value={formData.nomorWhatsappAlternatif} onChange={(e) => updateField("nomorWhatsappAlternatif", e.target.value)} className="h-10" />{renderError("nomorWhatsappAlternatif")}</div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Email</Label><Input value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="h-10" />{renderError("email")}</div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Alamat Domisili</Label><Textarea value={formData.alamatDomisili} onChange={(e) => updateField("alamatDomisili", e.target.value)} rows={3} />{renderError("alamatDomisili")}</div>
          <div className="space-y-1"><Label className="text-sm">Lama Tinggal (tahun)</Label><Input type="number" min="0" value={formData.lamaTinggalTahun} onChange={(e) => updateField("lamaTinggalTahun", e.target.value)} className="h-10" />{renderError("lamaTinggalTahun")}</div>
          <div className="space-y-1"><Label className="text-sm">Status Tinggal</Label><Select value={formData.statusTinggalIndividu} onValueChange={(value) => updateField("statusTinggalIndividu", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{statusTinggalIndividuOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Hubungan dengan Pemilik Rumah</Label><Input value={formData.hubunganDenganPemilikRumah} onChange={(e) => updateField("hubunganDenganPemilikRumah", e.target.value)} className="h-10" />{renderError("hubunganDenganPemilikRumah")}</div>
          <div className="space-y-1"><Label className="text-sm">Nama Kontak Darurat</Label><Input value={formData.namaKontakDarurat} onChange={(e) => updateField("namaKontakDarurat", e.target.value)} className="h-10" />{renderError("namaKontakDarurat")}</div>
          <div className="space-y-1"><Label className="text-sm">Hubungan Kontak Darurat</Label><Select value={formData.hubunganKontakDarurat} onValueChange={(value) => updateField("hubunganKontakDarurat", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{hubunganKontakDaruratOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Nomor Kontak Darurat</Label><Input value={formData.nomorKontakDarurat} onChange={(e) => updateField("nomorKontakDarurat", e.target.value)} className="h-10" />{renderError("nomorKontakDarurat")}</div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 p-4">
        <div>
          <p className="text-sm font-semibold">Dokumen Kependudukan</p>
          <p className="text-xs text-muted-foreground">Status dokumen penting warga.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">Status e-KTP</Label><Select value={formData.statusEktp} onValueChange={(value) => updateField("statusEktp", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{statusEktpOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("statusEktp")}</div>
          <div className="space-y-1"><Label className="text-sm">No. Akta Lahir</Label><Input value={formData.noAktaLahir} onChange={(e) => updateField("noAktaLahir", e.target.value)} className="h-10" />{renderError("noAktaLahir")}</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2"><Checkbox id={`akta-${testIdPrefix}`} checked={formData.punyaAktaLahir} onCheckedChange={(checked) => updateField("punyaAktaLahir", checked === true)} /><Label htmlFor={`akta-${testIdPrefix}`}>Punya Akta Lahir</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`kia-${testIdPrefix}`} checked={formData.punyaKia} onCheckedChange={(checked) => updateField("punyaKia", checked === true)} /><Label htmlFor={`kia-${testIdPrefix}`}>Punya KIA</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`npwp-${testIdPrefix}`} checked={formData.punyaNpwp} onCheckedChange={(checked) => updateField("punyaNpwp", checked === true)} /><Label htmlFor={`npwp-${testIdPrefix}`}>Punya NPWP</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`paspor-${testIdPrefix}`} checked={formData.punyaPaspor} onCheckedChange={(checked) => updateField("punyaPaspor", checked === true)} /><Label htmlFor={`paspor-${testIdPrefix}`}>Punya Paspor</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`sim-${testIdPrefix}`} checked={formData.punyaSim} onCheckedChange={(checked) => updateField("punyaSim", checked === true)} /><Label htmlFor={`sim-${testIdPrefix}`}>Punya SIM</Label></div>
        </div>
        {formData.punyaSim && (
          <div className="space-y-1"><Label className="text-sm">Jenis SIM</Label><Select value={formData.jenisSim} onValueChange={(value) => updateField("jenisSim", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih jenis SIM" /></SelectTrigger><SelectContent>{jenisSimOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("jenisSim")}</div>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 p-4">
        <div>
          <p className="text-sm font-semibold">Pendidikan & Aktivitas</p>
          <p className="text-xs text-muted-foreground">Riwayat pendidikan, sekolah, kuliah, dan keahlian.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">Pendidikan Terakhir</Label><Select value={formData.pendidikan} onValueChange={(value) => updateField("pendidikan", value)}><SelectTrigger className="h-10" data-testid={`select-pendidikan-${testIdPrefix}`}><SelectValue placeholder="Pilih pendidikan" /></SelectTrigger><SelectContent>{pendidikanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("pendidikan")}</div>
          <div className="space-y-1"><Label className="text-sm">Keahlian</Label><Input value={formData.keahlian} onChange={(e) => updateField("keahlian", e.target.value)} className="h-10" />{renderError("keahlian")}</div>
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

      <div className="space-y-4 rounded-2xl border border-border/70 p-4">
        <div>
          <p className="text-sm font-semibold">Pekerjaan & Ekonomi</p>
          <p className="text-xs text-muted-foreground">Pekerjaan utama, status kerja, dan usaha.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">Pekerjaan</Label><Select value={formData.pekerjaan} onValueChange={(value) => updateField("pekerjaan", value)}><SelectTrigger className="h-10" data-testid={`select-pekerjaan-${testIdPrefix}`}><SelectValue placeholder="Pilih pekerjaan" /></SelectTrigger><SelectContent>{pekerjaanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("pekerjaan")}</div>
          <div className="space-y-1"><Label className="text-sm">Status Pekerjaan</Label><Select value={formData.statusPekerjaan} onValueChange={(value) => updateField("statusPekerjaan", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{statusPekerjaanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("statusPekerjaan")}</div>
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

      <div className="space-y-4 rounded-2xl border border-border/70 p-4">
        <div>
          <p className="text-sm font-semibold">Kesehatan</p>
          <p className="text-xs text-muted-foreground">Kesehatan umum, BPJS, dan kerentanan medis.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">Kondisi Kesehatan</Label><Select value={formData.kondisiKesehatan} onValueChange={(value) => updateField("kondisiKesehatan", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{kondisiKesehatanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Status Disabilitas</Label><Select value={formData.statusDisabilitas} onValueChange={(value) => updateField("statusDisabilitas", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{statusDisabilitasOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        </div>
        {formData.jenisKelamin === "Perempuan" && <div className="flex items-center gap-2"><Checkbox id={`ibuHamil-${testIdPrefix}`} checked={formData.ibuHamil} onCheckedChange={(checked) => updateField("ibuHamil", checked === true)} /><Label htmlFor={`ibuHamil-${testIdPrefix}`} className="text-sm cursor-pointer">Sedang Hamil</Label></div>}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2"><Checkbox id={`bpjs-${testIdPrefix}`} checked={formData.punyaBpjsKesehatan} onCheckedChange={(checked) => updateField("punyaBpjsKesehatan", checked === true)} /><Label htmlFor={`bpjs-${testIdPrefix}`}>Punya BPJS</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`kronis-${testIdPrefix}`} checked={formData.punyaPenyakitKronis} onCheckedChange={(checked) => updateField("punyaPenyakitKronis", checked === true)} /><Label htmlFor={`kronis-${testIdPrefix}`}>Punya Penyakit Kronis</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`damping-${testIdPrefix}`} checked={formData.butuhPendampinganKesehatan} onCheckedChange={(checked) => updateField("butuhPendampinganKesehatan", checked === true)} /><Label htmlFor={`damping-${testIdPrefix}`}>Butuh Pendampingan Kesehatan</Label></div>
        </div>
        {formData.punyaBpjsKesehatan && <div className="space-y-1"><Label className="text-sm">Nomor BPJS Kesehatan</Label><Input value={formData.nomorBpjsKesehatan} onChange={(e) => updateField("nomorBpjsKesehatan", e.target.value)} className="h-10" />{renderError("nomorBpjsKesehatan")}</div>}
        {formData.punyaPenyakitKronis && <div className="space-y-1"><Label className="text-sm">Penyakit Kronis</Label><Input value={formData.penyakitKronis} onChange={(e) => updateField("penyakitKronis", e.target.value)} className="h-10" />{renderError("penyakitKronis")}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">Alergi</Label><Input value={formData.alergi} onChange={(e) => updateField("alergi", e.target.value)} className="h-10" /></div>
          <div className="space-y-1"><Label className="text-sm">Riwayat Rawat Inap</Label><Input value={formData.riwayatRawatInap} onChange={(e) => updateField("riwayatRawatInap", e.target.value)} className="h-10" /></div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 p-4">
        <div>
          <p className="text-sm font-semibold">Sosial, Partisipasi & Verifikasi</p>
          <p className="text-xs text-muted-foreground">Status sosial, partisipasi RW, aset, dan catatan admin.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">Status Kependudukan</Label><Select value={formData.statusKependudukan} onValueChange={(value) => updateField("statusKependudukan", value)}><SelectTrigger className="h-10" data-testid={`select-status-kependudukan-${testIdPrefix}`}><SelectValue /></SelectTrigger><SelectContent>{statusKependudukanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Status Bansos Individu</Label><Select value={formData.statusBansosIndividu} onValueChange={(value) => updateField("statusBansosIndividu", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{statusBansosIndividuOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("statusBansosIndividu")}</div>
          {formData.statusBansosIndividu === "Penerima" && <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Jenis Bansos Individu</Label><Select value={formData.jenisBansosIndividu} onValueChange={(value) => updateField("jenisBansosIndividu", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih jenis bansos" /></SelectTrigger><SelectContent>{jenisBansosIndividuOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("jenisBansosIndividu")}</div>}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2"><Checkbox id={`lansia-${testIdPrefix}`} checked={formData.lansia} onCheckedChange={(checked) => updateField("lansia", checked === true)} /><Label htmlFor={`lansia-${testIdPrefix}`}>Lansia</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`yatim-${testIdPrefix}`} checked={formData.anakYatimPiatu} onCheckedChange={(checked) => updateField("anakYatimPiatu", checked === true)} /><Label htmlFor={`yatim-${testIdPrefix}`}>Anak Yatim/Piatu</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`bantuan-${testIdPrefix}`} checked={formData.perluBantuanKhusus} onCheckedChange={(checked) => updateField("perluBantuanKhusus", checked === true)} /><Label htmlFor={`bantuan-${testIdPrefix}`}>Perlu Bantuan Khusus</Label></div>
        </div>
        <div className="space-y-1"><Label className="text-sm">Catatan Kerentanan</Label><Textarea value={formData.catatanKerentanan} onChange={(e) => updateField("catatanKerentanan", e.target.value)} rows={3} /></div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2"><Checkbox id={`aktifrw-${testIdPrefix}`} checked={formData.aktifKegiatanRw} onCheckedChange={(checked) => updateField("aktifKegiatanRw", checked === true)} /><Label htmlFor={`aktifrw-${testIdPrefix}`}>Aktif Kegiatan RW</Label></div>
          <div className="flex items-center gap-2"><Checkbox id={`kendaraan-${testIdPrefix}`} checked={formData.punyaKendaraan} onCheckedChange={(checked) => updateField("punyaKendaraan", checked === true)} /><Label htmlFor={`kendaraan-${testIdPrefix}`}>Punya Kendaraan</Label></div>
        </div>
        {formData.aktifKegiatanRw && <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label className="text-sm">Bidang Partisipasi</Label><Select value={formData.bidangPartisipasi} onValueChange={(value) => updateField("bidangPartisipasi", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih bidang" /></SelectTrigger><SelectContent>{bidangPartisipasiOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("bidangPartisipasi")}</div><div className="space-y-1"><Label className="text-sm">Jabatan Komunitas</Label><Input value={formData.jabatanKomunitas} onChange={(e) => updateField("jabatanKomunitas", e.target.value)} className="h-10" /></div></div>}
        {formData.punyaKendaraan && <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label className="text-sm">Jenis Kendaraan</Label><Select value={formData.jenisKendaraan} onValueChange={(value) => updateField("jenisKendaraan", value)}><SelectTrigger className="h-10"><SelectValue placeholder="Pilih jenis kendaraan" /></SelectTrigger><SelectContent>{jenisKendaraanOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{renderError("jenisKendaraan")}</div><div className="space-y-1"><Label className="text-sm">Jumlah Kendaraan</Label><Input type="number" min="0" value={formData.jumlahKendaraan} onChange={(e) => updateField("jumlahKendaraan", e.target.value)} className="h-10" />{renderError("jumlahKendaraan")}</div></div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-sm">Status Verifikasi Data</Label><Select value={formData.statusVerifikasiData} onValueChange={(value) => updateField("statusVerifikasiData", value)}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{statusVerifikasiDataOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-sm">Tanggal Verifikasi</Label><Input type="date" value={formData.tanggalVerifikasiData} onChange={(e) => updateField("tanggalVerifikasiData", e.target.value)} className="h-10" />{renderError("tanggalVerifikasiData")}</div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-sm">Catatan Verifikasi</Label><Textarea value={formData.catatanVerifikasi} onChange={(e) => updateField("catatanVerifikasi", e.target.value)} rows={3} /></div>
        </div>
      </div>
    </div>
  );
}
