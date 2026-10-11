/**
 * Kompresi foto di browser sebelum dikirim sebagai data URL base64.
 * Body JSON server dibatasi 20 MB, sedangkan foto kamera HP bisa 3–8 MB per file.
 */

const DEFAULT_MAX_SIDE = 1280;
const DEFAULT_QUALITY = 0.75;

export type CompressOptions = {
  maxSide?: number;
  quality?: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak bisa dibaca"));
    };
    img.src = url;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Perkecil sisi terpanjang gambar lalu encode ulang sebagai JPEG.
 * Bila canvas gagal (mis. format tidak didukung), file dikirim apa adanya.
 */
export async function compressImageToDataUrl(
  file: File,
  options: CompressOptions = {},
): Promise<string> {
  const maxSide = options.maxSide ?? DEFAULT_MAX_SIDE;
  const quality = options.quality ?? DEFAULT_QUALITY;

  try {
    const img = await loadImage(file);
    const terpanjang = Math.max(img.naturalWidth, img.naturalHeight);
    const skala = terpanjang > maxSide ? maxSide / terpanjang : 1;
    const width = Math.round(img.naturalWidth * skala);
    const height = Math.round(img.naturalHeight * skala);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return readAsDataUrl(file);

    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (!dataUrl.startsWith("data:image/")) return readAsDataUrl(file);
    return dataUrl;
  } catch {
    return readAsDataUrl(file);
  }
}

export type DokumenCompressOptions = {
  /** Sisi terpanjang awal (px). */
  maxSide: number;
  /** Target ukuran hasil (byte); kualitas lalu resolusi diturunkan bertahap sampai tercapai. */
  targetBytes: number;
  /** Batas bawah sisi terpanjang agar tulisan tetap terbaca. */
  minSide?: number;
};

let dukungWebp: boolean | null = null;
function bisaWebp(): boolean {
  if (dukungWebp === null) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    dukungWebp = c.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return dukungWebp;
}

/**
 * Kompres foto dokumen (KTP/KK) untuk disimpan di database: WEBP bila browser mendukung
 * (±30% lebih kecil dari JPEG), selain itu JPEG. Gagal dengan pesan jelas bila foto tak terbaca.
 */
export async function compressDokumen(file: File, options: DokumenCompressOptions): Promise<string> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error("Foto tidak bisa dibaca — gunakan JPG/PNG atau ambil foto langsung dengan kamera");
  }
  const mime = bisaWebp() ? "image/webp" : "image/jpeg";
  const minSide = options.minSide ?? 900;
  const terpanjangAsli = Math.max(img.naturalWidth, img.naturalHeight);
  let sisi = Math.min(options.maxSide, terpanjangAsli);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan foto");

  let hasil = "";
  for (;;) {
    const skala = sisi / terpanjangAsli;
    canvas.width = Math.round(img.naturalWidth * skala);
    canvas.height = Math.round(img.naturalHeight * skala);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.75, 0.65, 0.55]) {
      hasil = canvas.toDataURL(mime, q);
      if (dataUrlBytes(hasil) <= options.targetBytes) return hasil;
    }
    if (sisi <= minSide) return hasil;
    sisi = Math.max(minSide, Math.round(sisi * 0.8));
  }
}

/** Perkiraan ukuran byte sebuah data URL base64 — untuk menampilkan info ke pengguna. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((payload.length * 3) / 4);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
