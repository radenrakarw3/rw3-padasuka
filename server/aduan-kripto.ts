/**
 * Kerahasiaan pelapor Aduan Warga: nama & WhatsApp disimpan AES-256-GCM, PIN lacak di-scrypt.
 * Kunci dari ADUAN_SECRET; bila kosong diturunkan dari SESSION_SECRET. Mengganti kunci membuat
 * identitas lama tidak terbaca lagi — jangan ganti setelah ada aduan.
 */
import crypto from "crypto";

const VERSI = "v1";

function bahanKunci(): string {
  const s = process.env.ADUAN_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (!s) throw new Error("ADUAN_SECRET / SESSION_SECRET belum diset — identitas pelapor tidak dapat dienkripsi");
  return s;
}

let kunciCache: { enc: Buffer; mac: Buffer } | null = null;
function kunci() {
  if (!kunciCache) {
    const dasar = bahanKunci();
    kunciCache = {
      enc: crypto.createHash("sha256").update(`aduan-enc:${dasar}`).digest(),
      mac: crypto.createHash("sha256").update(`aduan-mac:${dasar}`).digest(),
    };
  }
  return kunciCache;
}

export function enkripsi(teks: string | null | undefined): string | null {
  const t = teks?.trim();
  if (!t) return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", kunci().enc, iv);
  const isi = Buffer.concat([c.update(t, "utf8"), c.final()]);
  return [VERSI, iv.toString("base64"), c.getAuthTag().toString("base64"), isi.toString("base64")].join(":");
}

export function dekripsi(sandi: string | null | undefined): string | null {
  if (!sandi) return null;
  const [v, iv, tag, isi] = sandi.split(":");
  if (v !== VERSI || !iv || !tag || !isi) return null;
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", kunci().enc, Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(isi, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Sidik nomor WA (HMAC) untuk membatasi kiriman per nomor tanpa menyimpan nomor terbuka. */
export function sidikWa(waNormal: string | null | undefined): string | null {
  if (!waNormal) return null;
  return crypto.createHmac("sha256", kunci().mac).update(waNormal).digest("hex");
}

// ---------------------------------------------------------------- Kode lacak & PIN
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function buatKodeLacak(): string {
  const b = crypto.randomBytes(8);
  return Array.from(b, (x) => ALFABET[x % ALFABET.length]).join("");
}

export function buatPin(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashPin(pin: string): string {
  const garam = crypto.randomBytes(16);
  const h = crypto.scryptSync(pin, garam, 32);
  return `${garam.toString("base64")}:${h.toString("base64")}`;
}

export function cocokPin(pin: string, simpan: string): boolean {
  const [g, h] = simpan.split(":");
  if (!g || !h) return false;
  const hasil = crypto.scryptSync(pin, Buffer.from(g, "base64"), 32);
  const harap = Buffer.from(h, "base64");
  return harap.length === hasil.length && crypto.timingSafeEqual(harap, hasil);
}

export function normalKodeLacak(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

/** "Siti Rahma" → "S*** R****" untuk tampilan tersamar. */
export function samarNama(nama: string | null): string | null {
  if (!nama) return null;
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .map((k) => `${k[0]}${"*".repeat(Math.max(2, k.length - 1))}`)
    .join(" ");
}

export function samarWa(wa: string | null): string | null {
  if (!wa) return null;
  const d = wa.replace(/\D/g, "");
  return d.length < 6 ? "***" : `${d.slice(0, 4)}****${d.slice(-3)}`;
}
