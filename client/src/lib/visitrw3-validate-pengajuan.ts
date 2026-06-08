import { visitrw3JenjangAnakOptions } from "./constants";
import { joinPlatNomor, isPlatLengkap } from "./visitrw3-plat";
import type { KendaraanRow } from "./visitrw3-kendaraan";
import type { PersetujuanTetanggaRow } from "./visitrw3-tetangga";
import { VISITRW3_TETANGGA_SLOTS } from "./visitrw3-tetangga";

export type PenghuniDraft = {
  namaLengkap: string;
  tanggalLahir: string;
  isAnak: boolean;
  nik: string;
  nomorWhatsapp: string;
  jenisKelamin: string;
  pekerjaan: string;
  keperluanTinggal: string;
  namaTempatKerja: string;
  namaSekolah: string;
  kendaraanList: KendaraanRow[];
  fotoKtpPath: string;
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function umur(tgl: string) {
  if (!tgl) return 99;
  const b = new Date(`${tgl}T00:00:00`);
  const today = new Date();
  let a = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) a--;
  return a;
}

export function validateStepKeperluan(keperluan: string) {
  if (!keperluan) return "Pilih keperluan pengajuan (tinggal atau bisnis)";
  return null;
}

export type BisnisLokasiInput = {
  tinggalDiWilayahRw3: boolean | null;
  rt: string;
  pemilikKostId: string;
  namaUsaha: string;
  jenisTempatUsaha: string;
  jenisTempatUsahaLain: string;
  penanggungJawab: string;
  jamBuka: string;
  jamTutup: string;
  alamatUsaha: string;
  pjNik: string;
  pjNomorWhatsapp: string;
  pjTanggalLahir: string;
  pjFotoKtpPath: string;
};

export function validateStepLokasi(
  rt: string,
  pemilikKostId: string,
  keperluan: string,
  namaUsaha: string,
  jenisUsaha: string,
  penanggungJawab: string,
) {
  if (!rt) return "Pilih RT";
  if (keperluan !== "bisnis" && !pemilikKostId) return "Pilih kost/kontrakan";
  if (keperluan === "bisnis") {
    return validateStepLokasiBisnis({
      tinggalDiWilayahRw3: null,
      rt,
      pemilikKostId,
      namaUsaha,
      jenisTempatUsaha: jenisUsaha,
      jenisTempatUsahaLain: "",
      penanggungJawab,
      jamBuka: "",
      jamTutup: "",
      alamatUsaha: "",
      pjNik: "",
      pjNomorWhatsapp: "",
      pjTanggalLahir: "",
      pjFotoKtpPath: "",
    });
  }
  return null;
}

export function validateStepLokasiBisnis(input: BisnisLokasiInput): string | null {
  if (input.tinggalDiWilayahRw3 === null) {
    return "Pilih apakah Anda tinggal di wilayah RW 03 atau di luar wilayah RW 03";
  }
  if (!input.rt) return "Pilih RT lokasi usaha";
  if (!input.namaUsaha.trim()) return "Nama usaha wajib diisi";
  if (!input.penanggungJawab.trim()) return "Penanggung jawab wajib diisi";
  if (!input.jenisTempatUsaha) return "Pilih jenis tempat usaha (lapak, kiosk, atau lainnya)";
  if (input.jenisTempatUsaha === "lainnya" && !input.jenisTempatUsahaLain.trim()) {
    return "Jelaskan jenis usaha lainnya";
  }
  if (input.tinggalDiWilayahRw3) {
    if (!input.pemilikKostId) return "Pilih kost/kontrakan tempat tinggal di wilayah RW 03";
  } else {
    if (!input.jamBuka.trim() || !TIME_REGEX.test(input.jamBuka)) {
      return "Jam buka wajib diisi (format HH:MM, contoh 08:00)";
    }
    if (!input.jamTutup.trim() || !TIME_REGEX.test(input.jamTutup)) {
      return "Jam tutup wajib diisi (format HH:MM, contoh 21:00)";
    }
    if (!input.alamatUsaha.trim()) return "Alamat usaha wajib diisi";
    if (!input.pjNik || input.pjNik.length !== 16) return "NIK penanggung jawab 16 digit wajib";
    if (!input.pjNomorWhatsapp.trim()) return "WhatsApp penanggung jawab wajib";
    if (!input.pjTanggalLahir) return "Tanggal lahir penanggung jawab wajib";
    if (!input.pjFotoKtpPath) return "Foto KTP penanggung jawab wajib diunggah";
  }
  return null;
}

export function validateStepJumlah(jumlahDewasa: number) {
  if (jumlahDewasa < 1) return "Minimal 1 penghuni dewasa";
  return null;
}

export function validatePersetujuanTetangga(rows: PersetujuanTetanggaRow[]): string | null {
  for (const slot of VISITRW3_TETANGGA_SLOTS) {
    const row = rows.find((r) => r.posisi === slot.posisi && r.slot === slot.slot);
    if (!row?.namaWarga.trim()) return `${slot.label}: nama warga wajib diisi`;
    if (!row.nomorWhatsapp.trim()) return `${slot.label}: nomor WhatsApp wajib diisi`;
  }
  return null;
}

export function validateSinglePenghuni(
  p: PenghuniDraft,
  keperluan: "tinggal" | "bisnis",
): string | null {
  const label = p.isAnak ? "Anak" : "Dewasa";

  if (!p.namaLengkap.trim()) return "Isi nama lengkap";
  if (!p.tanggalLahir) return "Pilih tanggal lahir";

  if (p.isAnak) {
    if (!p.namaSekolah.trim()) return "Pilih jenjang pendidikan anak";
    if (!(visitrw3JenjangAnakOptions as readonly string[]).includes(p.namaSekolah)) {
      return "Pilih jenjang pendidikan yang valid";
    }
    return null;
  }

  if (!p.nik || p.nik.length !== 16) return "NIK harus 16 digit";
  if (!p.nomorWhatsapp.trim()) return "Isi nomor WhatsApp";
  if (!p.jenisKelamin) return "Pilih jenis kelamin";
  if (!p.pekerjaan) return "Pilih pekerjaan";
  if (keperluan === "tinggal" && !p.keperluanTinggal) return "Pilih keperluan tinggal";
  const u = umur(p.tanggalLahir);
  if (!p.namaTempatKerja.trim()) return "Isi nama tempat kerja";
  if (u < 21 && !p.namaSekolah.trim()) return "Isi nama sekolah (usia di bawah 21 tahun)";
  if (!p.fotoKtpPath) return "Unggah foto KTP";

  if (p.kendaraanList.length > 0) {
    for (let ki = 0; ki < p.kendaraanList.length; ki++) {
      const k = p.kendaraanList[ki];
      if (!k.jenis.trim()) return `Pilih jenis kendaraan #${ki + 1}`;
      const parts = k.platParts;
      const plat = joinPlatNomor(parts) || k.plat;
      if (!isPlatLengkap(parts) && !plat.trim()) {
        return `Lengkapi plat nomor kendaraan #${ki + 1}`;
      }
      if (!isPlatLengkap(parts)) return `Lengkapi semua bagian plat nomor kendaraan #${ki + 1}`;
    }
  }
  return null;
}

export function validatePenghuniList(
  penghuni: PenghuniDraft[],
  keperluan: "tinggal" | "bisnis",
): string | null {
  for (let i = 0; i < penghuni.length; i++) {
    const err = validateSinglePenghuni(penghuni[i], keperluan);
    if (err) {
      const p = penghuni[i];
      const who = p.namaLengkap.trim() || (p.isAnak ? `Anak ${i + 1}` : `Dewasa ${i + 1}`);
      return `${who}: ${err}`;
    }
  }
  return null;
}

export function validateSingleTetangga(
  slot: { label: string },
  row: PersetujuanTetanggaRow | undefined,
): string | null {
  if (!row?.namaWarga.trim()) return `Isi nama warga (${slot.label})`;
  if (!row.nomorWhatsapp.trim()) return `Isi nomor WhatsApp (${slot.label})`;
  return null;
}

export function validateLokasiSubTinggal(sub: "rt" | "kost", rt: string, pemilikKostId: string): string | null {
  if (sub === "rt" && !rt) return "Pilih RT tempat tinggal";
  if (sub === "kost" && !pemilikKostId) return "Pilih kost atau kontrakan";
  return null;
}

export function validateLokasiSubBisnis(
  sub: "wilayah" | "usaha" | "operasional" | "pj" | "rt" | "kost",
  input: BisnisLokasiInput,
): string | null {
  if (sub === "wilayah" && input.tinggalDiWilayahRw3 === null) {
    return "Pilih apakah Anda tinggal di wilayah RW 03";
  }
  if (sub === "usaha") {
    if (!input.namaUsaha.trim()) return "Isi nama usaha";
    if (!input.penanggungJawab.trim()) return "Isi nama penanggung jawab";
    if (!input.jenisTempatUsaha) return "Pilih jenis tempat usaha";
    if (input.jenisTempatUsaha === "lainnya" && !input.jenisTempatUsahaLain.trim()) {
      return "Jelaskan jenis usaha Anda";
    }
    return null;
  }
  if (sub === "operasional") {
    if (!input.jamBuka.trim() || !TIME_REGEX.test(input.jamBuka)) return "Isi jam buka (contoh 08:00)";
    if (!input.jamTutup.trim() || !TIME_REGEX.test(input.jamTutup)) return "Isi jam tutup (contoh 21:00)";
    if (!input.alamatUsaha.trim()) return "Isi alamat usaha di RW 03";
    return null;
  }
  if (sub === "pj") {
    if (!input.pjNik || input.pjNik.length !== 16) return "NIK penanggung jawab harus 16 digit";
    if (!input.pjNomorWhatsapp.trim()) return "Isi WhatsApp penanggung jawab";
    if (!input.pjTanggalLahir) return "Pilih tanggal lahir penanggung jawab";
    if (!input.pjFotoKtpPath) return "Unggah foto KTP penanggung jawab";
    return null;
  }
  if (sub === "rt" && !input.rt) return "Pilih RT lokasi usaha";
  if (sub === "kost" && !input.pemilikKostId) return "Pilih kost/kontrakan tempat tinggal";
  return null;
}

export function validateStepSyarat(setuju: boolean) {
  if (!setuju) return "Anda harus menyetujui syarat dan tata tertib";
  return null;
}

export function validateStepBayar(
  tanggalBayar: string,
  terminBulan: string,
  nomorUnit: string,
  catatan: string,
  keperluan?: string,
  setujuTataTertib?: boolean,
) {
  if (!setujuTataTertib) return "Lengkapi langkah syarat terlebih dahulu";
  if (!tanggalBayar) return "Tanggal bayar wajib diisi";
  if (!terminBulan) return "Termin pembayaran wajib dipilih";
  if (!nomorUnit.trim()) {
    return keperluan === "bisnis"
      ? "Nomor unit/lokasi usaha wajib diisi"
      : "Nomor unit/kamar wajib diisi";
  }
  return null;
}
