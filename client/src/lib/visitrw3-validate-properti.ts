import { jenisPropertiOptions } from "./constants";

type JenisPropertiValue = (typeof jenisPropertiOptions)[number]["value"];

export type PropertiDraft = {
  jenisProperti: JenisPropertiValue | "";
  namaKost: string;
  rt: string;
  alamatLengkap: string;
  jumlahPintu: number;
  namaPemilik: string;
  nomorWaPemilik: string;
  pjSamaPemilik: boolean;
  namaPenanggungJawab: string;
  nomorWaPenanggungJawab: string;
  izinTinggal: boolean;
  izinBisnis: boolean;
  setujuTataTertib: boolean;
};

export function izinDefaultFromJenis(jenis: JenisPropertiValue): { izinTinggal: boolean; izinBisnis: boolean } {
  if (jenis === "kiosk" || jenis === "lapak") {
    return { izinTinggal: false, izinBisnis: true };
  }
  return { izinTinggal: true, izinBisnis: false };
}

/** Penjelasan bahasa warga — tanpa istilah "izin Visit RW3". */
export function kegunaanPropertiLabel(
  jenis: JenisPropertiValue | "",
  izinTinggal: boolean,
  izinBisnis: boolean,
): string {
  if (jenis === "kiosk" || jenis === "lapak") {
    return "Nanti pengusaha bisa daftar Visit RW3 untuk usaha di sini.";
  }
  if (izinTinggal && izinBisnis) {
    return "Nanti penyewa bisa daftar Visit RW3 untuk tinggal atau usaha di sini.";
  }
  return "Nanti penyewa bisa daftar Visit RW3 untuk tinggal di sini.";
}

export function validatePropertiStep(stepId: string, d: PropertiDraft): string | null {
  switch (stepId) {
    case "jenis":
      if (!d.jenisProperti) return "Pilih jenis properti";
      return null;
    case "nama":
      if (!d.namaKost.trim()) return "Isi nama properti";
      return null;
    case "lokasi":
      if (!d.rt) return "Pilih RT";
      if (!d.alamatLengkap.trim()) return "Isi alamat properti";
      return null;
    case "unit":
      if (d.jumlahPintu < 1) return "Minimal 1 unit";
      return null;
    case "pemilik":
      if (!d.namaPemilik.trim()) return "Isi nama pemilik";
      if (!d.nomorWaPemilik.trim()) return "Isi WhatsApp pemilik";
      return null;
    case "pengelola":
      if (!d.pjSamaPemilik) {
        if (!d.namaPenanggungJawab.trim()) return "Isi nama pengelola";
        if (!d.nomorWaPenanggungJawab.trim()) return "Isi WhatsApp pengelola";
      }
      return null;
    case "syarat":
      if (!d.setujuTataTertib) return "Anda harus menyetujui syarat dan tata tertib";
      return null;
    default:
      return null;
  }
}
