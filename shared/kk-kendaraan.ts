/** Kendaraan terdaftar per Kartu Keluarga (Blusukan RW). */

export type KendaraanKkItem = {
  jenis: string;
  platNomor: string;
};

export function parseKkKendaraanData(raw: string | null | undefined): KendaraanKkItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as KendaraanKkItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((k) => k && typeof k.jenis === "string" && k.jenis.trim())
      .map((k) => ({
        jenis: k.jenis.trim(),
        platNomor: (k.platNomor || "").trim(),
      }));
  } catch {
    return [];
  }
}

export function serializeKkKendaraanData(items: KendaraanKkItem[]): string | null {
  const valid = items
    .map((k) => ({ jenis: k.jenis.trim(), platNomor: k.platNomor.trim() }))
    .filter((k) => k.jenis);
  return valid.length ? JSON.stringify(valid) : null;
}

/** Validasi saat ada entri kendaraan — return pesan error atau null jika ok. */
export function validateKkKendaraanList(items: KendaraanKkItem[]): string | null {
  for (let i = 0; i < items.length; i++) {
    const k = items[i];
    if (!k.jenis.trim()) return `Kendaraan #${i + 1}: jenis wajib diisi`;
    if (!k.platNomor.trim()) return `Kendaraan #${i + 1}: plat nomor wajib diisi`;
  }
  return null;
}

export function formatKkKendaraanDisplay(raw: string | null | undefined): string | null {
  const list = parseKkKendaraanData(raw);
  if (!list.length) return null;
  return list
    .map((k, i) => {
      const plat = k.platNomor.trim();
      return plat ? `${i + 1}. ${k.jenis} (${plat})` : `${i + 1}. ${k.jenis}`;
    })
    .join(" · ");
}
