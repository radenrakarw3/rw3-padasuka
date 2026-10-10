const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
export const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function terbilangDasar(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilangDasar(n - 10)} belas`;
  if (n < 100) return `${terbilangDasar(Math.floor(n / 10))} puluh ${terbilangDasar(n % 10)}`;
  if (n < 200) return `seratus ${terbilangDasar(n - 100)}`;
  if (n < 1000) return `${terbilangDasar(Math.floor(n / 100))} ratus ${terbilangDasar(n % 100)}`;
  if (n < 2000) return `seribu ${terbilangDasar(n - 1000)}`;
  if (n < 1_000_000) return `${terbilangDasar(Math.floor(n / 1000))} ribu ${terbilangDasar(n % 1000)}`;
  if (n < 1_000_000_000) return `${terbilangDasar(Math.floor(n / 1_000_000))} juta ${terbilangDasar(n % 1_000_000)}`;
  if (n < 1_000_000_000_000) return `${terbilangDasar(Math.floor(n / 1_000_000_000))} miliar ${terbilangDasar(n % 1_000_000_000)}`;
  return `${terbilangDasar(Math.floor(n / 1_000_000_000_000))} triliun ${terbilangDasar(n % 1_000_000_000_000)}`;
}

export function terbilang(n: number): string {
  if (!Number.isFinite(n)) return "";
  const bulat = Math.floor(Math.abs(n));
  if (bulat === 0) return "nol";
  return terbilangDasar(bulat).replace(/\s+/g, " ").trim();
}

export function rupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID").replace(/,/g, ".")}`;
}

export function rupiahTerbilang(n: number): string {
  return `${rupiah(n)} (${terbilang(n)} rupiah)`;
}

/** Ubah "1.500.000" / "1500000" / 1500000 menjadi angka. */
export function keAngka(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || !v.trim()) return null;
  const n = Number(v.replace(/[^\d,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** "YYYY-MM-DD" → komponen tanpa pergeseran zona waktu. */
export function urai(iso: string): { y: number; m: number; d: number; hari: number } | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!r) return null;
  const y = Number(r[1]), m = Number(r[2]), d = Number(r[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return { y, m, d, hari: dt.getUTCDay() };
}

export function tanggalPanjang(iso: string): string {
  const u = urai(iso);
  return u ? `${u.d} ${NAMA_BULAN[u.m - 1]} ${u.y}` : iso;
}

export function hariTanggal(iso: string): string {
  const u = urai(iso);
  return u ? `${NAMA_HARI[u.hari]}, ${u.d} ${NAMA_BULAN[u.m - 1]} ${u.y}` : iso;
}

/** Kalimat berita acara: "Pada hari Senin tanggal dua belas bulan Oktober tahun dua ribu dua puluh enam". */
export function hariTanggalTerbilang(iso: string): string {
  const u = urai(iso);
  if (!u) return iso;
  return `Pada hari ${NAMA_HARI[u.hari]} tanggal ${terbilang(u.d)} bulan ${NAMA_BULAN[u.m - 1]} tahun ${terbilang(u.y)} (${tanggalPanjang(iso)})`;
}

/** Ganti {key} dengan nilai teks; key kosong → "" (validasi memastikan field wajib terisi). */
export function isiPola(pola: string, nilai: (key: string) => string): string {
  return pola.replace(/\{(\w+)\}/g, (_, k: string) => nilai(k)).replace(/\s+([,.])/g, "$1").replace(/ {2,}/g, " ").trim();
}

/** Penanda isian belum lengkap yang tidak boleh ada di dokumen final. */
export const POLA_PLACEHOLDER = /\{\{|\}\}|\{[a-zA-Z_]\w*\}|\[(isi|nama|tanggal|nomor|alamat|\.\.\.)[^\]]*\]|\bXXX+\b|lorem ipsum|_{5,}|\.{6,}/i;

/** Kata yang bermakna sanksi/pungutan/izin; tidak pernah dibuat otomatis, dan diberi peringatan bila ditulis manual. */
export const POLA_SENSITIF = /\b(denda|sanksi|pungutan wajib|iuran wajib|wajib membayar|izin (bangunan|usaha)|hak milik|penyegelan|pengusiran|diusir)\b/i;
