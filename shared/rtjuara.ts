/**
 * Konstanta & helper RT JUARA — "RW3 Muncul, RT-nya JUARA".
 * Dipakai bersama oleh portal ketua RT, panel admin, dan halaman publik.
 */

/** RT yang ikut kompetisi RT JUARA — seluruh RW 03 (01–07). */
export const RTJUARA_RT_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;

export type RtjuaraRtNumber = (typeof RTJUARA_RT_NUMBERS)[number];

export function isRtjuaraRt(rt: unknown): rt is RtjuaraRtNumber {
  const n = typeof rt === "number" ? rt : parseInt(String(rt ?? ""), 10);
  return Number.isFinite(n) && (RTJUARA_RT_NUMBERS as readonly number[]).includes(n);
}

export function rtLabel(rt: number): string {
  return `RT ${String(rt).padStart(2, "0")}`;
}

/** Irama quest: harian, mingguan, bulanan. */
export const RTJUARA_PERIODE = ["harian", "mingguan", "bulanan"] as const;
export type RtjuaraPeriode = (typeof RTJUARA_PERIODE)[number];

export function isRtjuaraPeriode(value: unknown): value is RtjuaraPeriode {
  return (RTJUARA_PERIODE as readonly string[]).includes(String(value));
}

export const RTJUARA_PERIODE_LABEL: Record<RtjuaraPeriode, string> = {
  harian: "Harian",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
};

/** Keterangan singkat kapan quest bisa diklaim ulang. */
export const RTJUARA_PERIODE_KETERANGAN: Record<RtjuaraPeriode, string> = {
  harian: "Bisa diklaim satu kali setiap hari",
  mingguan: "Bisa diklaim satu kali setiap minggu",
  bulanan: "Bisa diklaim satu kali setiap bulan",
};

/** Status verifikasi bukti oleh admin RW. */
export const RTJUARA_STATUS = ["menunggu", "disetujui", "ditolak"] as const;
export type RtjuaraStatus = (typeof RTJUARA_STATUS)[number];

export const RTJUARA_STATUS_LABEL: Record<RtjuaraStatus, string> = {
  menunggu: "Menunggu verifikasi",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

/** Batas upload dokumentasi per bukti. */
export const RTJUARA_MAX_FOTO = 4;
export const RTJUARA_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Kegiatan akhir pekan sering baru dilaporkan Senin, jadi backdate pendek diizinkan. */
export const RTJUARA_BACKDATE_HARI = 3;

export const RTJUARA_TAGLINE = "RW3 Muncul, RT-nya JUARA";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Ubah `Date` atau string `YYYY-MM-DD` menjadi Date lokal tengah hari (aman dari geser timezone). */
function toLocalDate(input: Date | string): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0, 0);
  }
  const raw = String(input).trim().slice(0, 10);
  if (DATE_REGEX.test(raw)) {
    const [y, m, d] = raw.split("-").map((x) => parseInt(x, 10));
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Tanggal tidak valid");
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
}

/** `YYYY-MM-DD` untuk tanggal lokal. */
export function hariKey(input: Date | string = new Date()): string {
  const d = toLocalDate(input);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Tanggal kegiatan paling awal yang masih boleh dilaporkan hari ini. */
export function tanggalTerawalLapor(acuan: Date = new Date()): string {
  const d = new Date(acuan.getFullYear(), acuan.getMonth(), acuan.getDate());
  d.setDate(d.getDate() - RTJUARA_BACKDATE_HARI);
  return hariKey(d);
}

/** `YYYY-MM` — kunci agregasi leaderboard & pengumuman juara. */
export function bulanKey(input: Date | string = new Date()): string {
  const d = toLocalDate(input);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** `YYYY-Www` mengikuti standar ISO-8601 (minggu mulai Senin). */
export function mingguKey(input: Date | string = new Date()): string {
  const d = toLocalDate(input);
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Kunci periode klaim: satu RT hanya boleh mengklaim satu quest sekali per kunci ini.
 * harian → `2026-09-09`, mingguan → `2026-W37`, bulanan → `2026-09`.
 */
export function periodeKey(periode: RtjuaraPeriode, input: Date | string = new Date()): string {
  switch (periode) {
    case "harian":
      return hariKey(input);
    case "mingguan":
      return mingguKey(input);
    case "bulanan":
      return bulanKey(input);
    default:
      return hariKey(input);
  }
}

/** `2026-09` → `September 2026`. */
export function bulanLabel(key: string): string {
  const [y, m] = String(key).split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return key;
  const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${namaBulan[m - 1]} ${y}`;
}

/** Bulan sebelum `key` — dipakai untuk menampilkan juara bulan lalu. */
export function bulanSebelumnya(key: string = bulanKey()): string {
  const [y, m] = String(key).split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return key;
  const d = new Date(y, m - 2, 15, 12, 0, 0, 0);
  return bulanKey(d);
}

export function isBulanKey(value: unknown): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value ?? ""));
}

export function isTanggalKey(value: unknown): boolean {
  return DATE_REGEX.test(String(value ?? ""));
}

/** Quest berlaku pada tanggal tertentu (rentang opsional `berlakuMulai`–`berlakuSampai`). */
export function questBerlakuPada(
  quest: { berlakuMulai?: string | null; berlakuSampai?: string | null },
  tanggal: string = hariKey(),
): boolean {
  if (quest.berlakuMulai && tanggal < quest.berlakuMulai) return false;
  if (quest.berlakuSampai && tanggal > quest.berlakuSampai) return false;
  return true;
}

/** Medali peringkat 1–3 untuk tampilan papan peringkat. */
export function peringkatMedali(peringkat: number): string {
  if (peringkat === 1) return "Juara 1";
  if (peringkat === 2) return "Juara 2";
  if (peringkat === 3) return "Juara 3";
  return `Peringkat ${peringkat}`;
}
