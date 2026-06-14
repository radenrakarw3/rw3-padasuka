import { labelJenisProperti, isUsahaRumahan, visitrw3JenisTempatUsahaOptions } from "./constants";
import { formatKategoriUsahaLabel } from "@shared/visitrw3-kategori-usaha";

export const PROPERTI_STATUS_LABEL: Record<string, string> = {
  menunggu_verifikasi: "Menunggu verifikasi",
  aktif: "Aktif",
};

export const PENGAJUAN_STATUS_LABEL: Record<string, string> = {
  menunggu_survey: "Menunggu survey",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export function labelPropertiStatus(status?: string | null): string {
  if (!status) return "—";
  return PROPERTI_STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

export function labelPengajuanStatus(status?: string | null): string {
  if (!status) return "—";
  return PENGAJUAN_STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

/** Label peran/alur untuk admin — bedakan usaha rumahan vs disewakan. */
export function labelPeranPropertiAdmin(jenisProperti?: string | null): string {
  if (isUsahaRumahan(jenisProperti)) return "Usaha rumahan · pemilik = pengaju";
  if (jenisProperti === "kost" || jenisProperti === "kontrakan") return "Disewakan · penyewa terpisah";
  if (jenisProperti === "kiosk" || jenisProperti === "lapak") return "Usaha pihak ketiga";
  return labelJenisProperti(jenisProperti);
}

export function labelJenisTempatUsahaAdmin(value?: string | null, lainnya?: string | null): string {
  if (!value) return "—";
  if (value === "lainnya") return lainnya?.trim() || "Lainnya";
  const opt = visitrw3JenisTempatUsahaOptions.find((o) => o.value === value);
  return opt?.label ?? value;
}

export function labelKategoriUsahaAdmin(raw?: string | null): string {
  return formatKategoriUsahaLabel(raw);
}

/** Meta label & visibilitas field form tambah/edit properti admin. */
export function adminPropertiFormMeta(jenis: string, mode: "add" | "edit") {
  const usahaRumahan = isUsahaRumahan(jenis);
  const bisnisToko = jenis === "kiosk" || jenis === "lapak";
  const kontrakan = jenis === "kontrakan";
  const prefix = mode === "edit" ? "Edit" : "Tambah";

  if (usahaRumahan) {
    return {
      title: `${prefix} usaha rumahan`,
      namaLabel: "Nama usaha",
      namaPlaceholder: "Contoh: Dapur Bunda Yoels",
      alamatLabel: "Alamat rumah / tempat usaha",
      showJumlahPintu: false,
      jumlahPintuLabel: "",
      jumlahPintuHint: null as string | null,
      showIzinCheckboxes: false,
      showKontrakanBisnis: false,
    };
  }

  if (bisnisToko) {
    return {
      title: `${prefix} ${jenis === "lapak" ? "lapak" : "kiosk / usaha"}`,
      namaLabel: "Nama usaha / warung",
      namaPlaceholder: "Contoh: Warung Bu Siti",
      alamatLabel: "Alamat lokasi usaha",
      showJumlahPintu: true,
      jumlahPintuLabel: "Jumlah unit",
      jumlahPintuHint: "Biasanya 1 untuk kiosk/lapak",
      showIzinCheckboxes: false,
      showKontrakanBisnis: false,
    };
  }

  if (kontrakan) {
    return {
      title: `${prefix} kontrakan`,
      namaLabel: "Nama kontrakan",
      namaPlaceholder: "Contoh: Kontrakan Melati",
      alamatLabel: "Alamat lengkap",
      showJumlahPintu: true,
      jumlahPintuLabel: "Jumlah unit / pintu",
      jumlahPintuHint: "Pintu atau unit yang disewakan",
      showIzinCheckboxes: true,
      showKontrakanBisnis: true,
    };
  }

  return {
    title: `${prefix} ${jenis === "kost" ? "kost" : "properti"}`,
    namaLabel: jenis === "kost" ? "Nama kost" : "Nama properti",
    namaPlaceholder: "Contoh: Kost Melati",
    alamatLabel: "Alamat lengkap",
    showJumlahPintu: true,
    jumlahPintuLabel: "Jumlah unit / pintu",
    jumlahPintuHint: "Kamar atau pintu yang disewakan",
    showIzinCheckboxes: true,
    showKontrakanBisnis: false,
  };
}

/** Properti yang boleh dipilih untuk kontrak penghuni tinggal. */
export function isPropertiUntukPenghuniTinggal(p: {
  jenisProperti?: string | null;
  izinTinggal?: boolean | null;
  statusProperti?: string | null;
}): boolean {
  const jenis = p.jenisProperti ?? "kost";
  if (jenis !== "kost" && jenis !== "kontrakan") return false;
  if (p.izinTinggal === false) return false;
  return true;
}
