/** Validasi kontak warga — mencegah NIK tersimpan/terkirim sebagai nomor WhatsApp. */

export function digitsOnly(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

/** Pola NIK: 16 digit, diawali kode provinsi 11–94. */
export function looksLikeNik(value: string | null | undefined): boolean {
  const d = digitsOnly(value);
  if (d.length !== 16) return false;
  const prov = parseInt(d.slice(0, 2), 10);
  return prov >= 11 && prov <= 94;
}

/** Normalisasi ke format 08xx; null bila bukan nomor HP Indonesia yang masuk akal. */
export function normalizeNomorHp(value: string | null | undefined): string | null {
  let d = digitsOnly(value);
  if (!d) return null;
  if (d.startsWith("62")) d = `0${d.slice(2)}`;
  else if (d.startsWith("8")) d = `0${d}`;
  if (!d.startsWith("08")) return null;
  if (d.length < 10 || d.length > 13) return null;
  return d;
}

export function isNomorHpValid(value: string | null | undefined): boolean {
  return normalizeNomorHp(value) !== null;
}

/** Tampilkan NIK tersamar: 3277••••••••0001. */
export function maskNik(value: string | null | undefined): string {
  const d = digitsOnly(value);
  if (d.length < 8) return "••••";
  return `${d.slice(0, 4)}${"•".repeat(d.length - 8)}${d.slice(-4)}`;
}
