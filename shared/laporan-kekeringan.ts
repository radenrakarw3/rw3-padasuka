export const KEKERINGAN_STATUS = ["menunggu_survey", "tiket_keluar", "selesai", "ditolak"] as const;
export type KekeringanStatus = (typeof KEKERINGAN_STATUS)[number];

export const kekeringanStatusLabels: Record<KekeringanStatus, string> = {
  menunggu_survey: "Menunggu survey RW",
  tiket_keluar: "Tiket dikeluarkan",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

export function formatKekeringanAntrian(id: number): string {
  return `KRG-${id}`;
}

export function formatKekeringanTiket(id: number): string {
  return `TKT-KRG-${id}`;
}

export function parseKekeringanNomor(ref: string): { type: "antrian" | "tiket"; id: number } | null {
  const trimmed = ref.trim().toUpperCase();
  const tiket = trimmed.match(/^TKT-KRG-(\d+)$/);
  if (tiket) return { type: "tiket", id: parseInt(tiket[1], 10) };
  const antrian = trimmed.match(/^KRG-(\d+)$/);
  if (antrian) return { type: "antrian", id: parseInt(antrian[1], 10) };
  return null;
}
