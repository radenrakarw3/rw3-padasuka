/** Parse kolom kategori_usaha (JSON array) dari DB. */
export function parseKategoriUsaha(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
    }
  } catch {
    /* fallback legacy comma-separated */
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stringifyKategoriUsaha(items: string[]): string | null {
  const clean = items.map((s) => s.trim()).filter(Boolean);
  return clean.length ? JSON.stringify(clean) : null;
}

export function formatKategoriUsahaLabel(raw: string | null | undefined): string {
  const items = parseKategoriUsaha(raw);
  return items.length ? items.join(", ") : "—";
}

/** Gabungkan pilihan checkbox + teks "Lainnya" untuk API. */
export function buildKategoriUsahaPayload(selected: string[], lainnya: string): string[] {
  const out = selected.filter((k) => k !== "Lainnya");
  if (selected.includes("Lainnya") && lainnya.trim()) {
    out.push(lainnya.trim());
  }
  return out;
}
