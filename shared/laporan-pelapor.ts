/** Karakter invisible/spacer (mis. ㅤ dari copy-paste WA) yang membengkakan tampilan. */
const LAPORAN_ISI_FILLER = /[\u3164\u200B-\u200D\uFEFF\u2060\u00AD]/g;

export function sanitizeLaporanIsiInput(isi: string): string {
  return isi
    .replace(LAPORAN_ISI_FILLER, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Metadata pelapor di awal isi laporan kiosk publik. */
export function formatLaporanKioskIsi(opts: {
  namaPelapor: string;
  nomorRt: number;
  nomorWa: string;
  isi: string;
}): string {
  const rtLabel = String(opts.nomorRt).padStart(2, "0");
  return `[Pelapor: ${opts.namaPelapor.trim()} | RT: ${rtLabel}]\n[Kontak WA: ${opts.nomorWa.trim()}]\n\n${sanitizeLaporanIsiInput(opts.isi)}`;
}

/** Metadata laporan anonim — tanpa kontak pelapor. */
export function formatLaporanAnonimIsi(opts: { nomorRt: number; isi: string }): string {
  const rtLabel = String(opts.nomorRt).padStart(2, "0");
  return `[Pelapor: Anonim | RT: ${rtLabel}]\n\n${sanitizeLaporanIsiInput(opts.isi)}`;
}

export function isLaporanPelaporAnonim(isi: string): boolean {
  const pelapor = isi.match(/\[Pelapor:\s*([^|]+)\|/i);
  const nama = pelapor?.[1]?.trim().toLowerCase();
  return nama === "anonim";
}

export type LaporanPelaporMeta = {
  nama?: string;
  nomorRt?: number;
  nomorWa?: string;
};

export function parseLaporanPelaporMeta(isi: string): LaporanPelaporMeta {
  const pelapor = isi.match(/\[Pelapor:\s*([^|]+)\|\s*RT:\s*(\d+)\]/i);
  const wa = isi.match(/\[Kontak WA:\s*([^\]]+)\]/);
  const namaRaw = pelapor?.[1]?.trim();
  const nama = namaRaw ? sanitizeLaporanIsiInput(namaRaw) : undefined;
  return {
    nama: nama || undefined,
    nomorRt: pelapor?.[2] ? parseInt(pelapor[2], 10) : undefined,
    nomorWa: wa?.[1] ? sanitizeLaporanIsiInput(wa[1]) || undefined : undefined,
  };
}

/** Judul/isi laporan untuk tampilan UI — buang spacer invisible & potong panjang. */
export function formatPelaporNamaDisplay(
  nama: string | null | undefined,
  fallback = "Pelapor tidak diketahui",
): string {
  if (!nama) return fallback;
  const clean = sanitizeLaporanIsiInput(nama);
  if (!clean) return fallback;
  if (clean.toLowerCase() === "anonim") return "Pelapor anonim";
  return clean;
}

export function formatLaporanJudulDisplay(judul: string, fallback = "Laporan tanpa judul"): string {
  const clean = sanitizeLaporanIsiInput(judul);
  if (!clean) return fallback;
  if (clean.length <= 100) return clean;
  return `${clean.slice(0, 97)}…`;
}

export function stripLaporanMetaPrefix(isi: string): string {
  return sanitizeLaporanIsiInput(
    isi
      .replace(/^\[Pelapor:[^\n]+\]\n?/m, "")
      .replace(/^\[Kontak WA:[^\n]+\]\n?/m, ""),
  );
}

export function formatRtLabel(rt: number): string {
  return `RT ${String(rt).padStart(2, "0")}`;
}
