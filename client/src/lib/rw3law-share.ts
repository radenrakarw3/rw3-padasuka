/** URL publik resmi RW3LAW untuk dibagikan ke warga. */

export const RW3LAW_PUBLIC_ORIGIN = "https://rw3padasukacimahi.org";

/** Path kanonik di website (bukan /rw3law). */
export const RW3LAW_PUBLIC_PATH = "/rwlaw";

export function getRw3lawPublicPath(slug: string): string {
  const s = slug.trim().toLowerCase();
  return `${RW3LAW_PUBLIC_PATH}/${encodeURIComponent(s)}`;
}

export function getRw3lawPublicUrl(slug: string): string {
  return `${RW3LAW_PUBLIC_ORIGIN}${getRw3lawPublicPath(slug)}`;
}

export function buildRw3lawShareMessage(judul: string, slug: string): string {
  const url = getRw3lawPublicUrl(slug);
  return (
    `Peraturan RW 03 Padasuka\n` +
    `${judul}\n\n` +
    `Baca teks lengkap:\n${url}\n\n` +
    `RW 03 Kelurahan Padasuka`
  );
}

export function getRw3lawWhatsAppShareUrl(judul: string, slug: string): string {
  return `https://wa.me/?text=${encodeURIComponent(buildRw3lawShareMessage(judul, slug))}`;
}
