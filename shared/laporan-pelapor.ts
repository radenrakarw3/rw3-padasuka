/** Metadata pelapor di awal isi laporan kiosk publik. */
export function formatLaporanKioskIsi(opts: {
  namaPelapor: string;
  nomorRt: number;
  nomorWa: string;
  isi: string;
}): string {
  const rtLabel = String(opts.nomorRt).padStart(2, "0");
  return `[Pelapor: ${opts.namaPelapor.trim()} | RT: ${rtLabel}]\n[Kontak WA: ${opts.nomorWa.trim()}]\n\n${opts.isi.trim()}`;
}

export type LaporanPelaporMeta = {
  nama?: string;
  nomorRt?: number;
  nomorWa?: string;
};

export function parseLaporanPelaporMeta(isi: string): LaporanPelaporMeta {
  const pelapor = isi.match(/\[Pelapor:\s*([^|]+)\|\s*RT:\s*(\d+)\]/i);
  const wa = isi.match(/\[Kontak WA:\s*([^\]]+)\]/);
  return {
    nama: pelapor?.[1]?.trim(),
    nomorRt: pelapor?.[2] ? parseInt(pelapor[2], 10) : undefined,
    nomorWa: wa?.[1]?.trim(),
  };
}

export function stripLaporanMetaPrefix(isi: string): string {
  return isi
    .replace(/^\[Pelapor:[^\n]+\]\n?/m, "")
    .replace(/^\[Kontak WA:[^\n]+\]\n?/m, "")
    .trim();
}

export function formatRtLabel(rt: number): string {
  return `RT ${String(rt).padStart(2, "0")}`;
}
