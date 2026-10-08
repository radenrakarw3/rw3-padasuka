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
