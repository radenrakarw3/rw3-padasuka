/** Tiga status independen. Distribusi & pekerjaan dihitung dari catatan, bukan diisi manual. */
export type StatusDokumen = "draft" | "terbit" | "dibatalkan" | "digantikan";
export type StatusDistribusi = "belum" | "diserahkan" | "gagal" | "diterima";
export type StatusPekerjaan = "tidak_diperlukan" | "menunggu" | "berjalan" | "selesai";
export type StatusTindak = "menunggu" | "berjalan" | "selesai" | "tidak_diperlukan";

export const LABEL_STATUS_DOKUMEN: Record<StatusDokumen, string> = { draft: "Draft", terbit: "Terbit", dibatalkan: "Dibatalkan", digantikan: "Digantikan" };
export const LABEL_STATUS_DISTRIBUSI: Record<StatusDistribusi, string> = { belum: "Belum diserahkan", diserahkan: "Diserahkan/dikirim", gagal: "Gagal dikirim", diterima: "Penerimaan terkonfirmasi" };
export const LABEL_STATUS_PEKERJAAN: Record<StatusPekerjaan, string> = { tidak_diperlukan: "Tidak diperlukan", menunggu: "Menunggu", berjalan: "Berjalan", selesai: "Selesai" };

export function statusDokumen(s: { status: string; adaPengganti?: boolean }): StatusDokumen {
  if (s.status === "draft") return "draft";
  if (s.status === "dibatalkan") return s.adaPengganti ? "digantikan" : "dibatalkan";
  return "terbit";
}

export function statusDistribusi(kirim: { status?: string | null; dikirim_pada?: string | Date }[]): StatusDistribusi {
  if (!kirim.length) return "belum";
  if (kirim.some((k) => k.status === "diterima")) return "diterima";
  if (kirim.some((k) => (k.status ?? "diserahkan") === "diserahkan")) return "diserahkan";
  return "gagal";
}

export function statusPekerjaan(tindak: { status: string }[]): StatusPekerjaan {
  const aktif = tindak.filter((t) => t.status !== "tidak_diperlukan");
  if (!aktif.length) return "tidak_diperlukan";
  if (aktif.every((t) => t.status === "selesai")) return "selesai";
  if (aktif.some((t) => t.status === "berjalan" || t.status === "selesai")) return "berjalan";
  return "menunggu";
}

/** Terlambat = tenggat lewat DAN belum selesai. Tidak ada status manual "terlambat". */
export function terlambat(t: { status: string; tenggat: string | null }, hariIni: string): boolean {
  return !!t.tenggat && t.tenggat < hariIni && (t.status === "menunggu" || t.status === "berjalan");
}

export function isoHariIni(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
