import { joinPlatNomor, parsePlatNomor, type PlatParts } from "./visitrw3-plat";

export type KendaraanRow = { jenis: string; plat: string; platParts: PlatParts };

export function emptyKendaraanRow(): KendaraanRow {
  const platParts = { daerah: "", angka: "", belakang: "" };
  return { jenis: "", plat: "", platParts };
}

export function kendaraanWithPlatParts(row: Partial<KendaraanRow> & { jenis?: string; plat?: string }): KendaraanRow {
  const platParts = row.platParts ?? parsePlatNomor(row.plat);
  const plat = joinPlatNomor(platParts) || row.plat || "";
  return { jenis: row.jenis || "", plat, platParts };
}

/** Untuk kirim ke API (kompatibel single + multi). */
export function serializeKendaraanForApi(list: KendaraanRow[]) {
  const valid = list
    .map((k) => ({ ...k, plat: joinPlatNomor(k.platParts) || k.plat.trim() }))
    .filter((k) => k.jenis.trim());
  if (valid.length === 0) {
    return { punyaKendaraan: false, jenisKendaraan: null as string | null, platNomor: null as string | null };
  }
  if (valid.length === 1) {
    return {
      punyaKendaraan: true,
      jenisKendaraan: valid[0].jenis.trim(),
      platNomor: valid[0].plat.trim() || null,
    };
  }
  return {
    punyaKendaraan: true,
    jenisKendaraan: JSON.stringify(
      valid.map((k) => ({ jenis: k.jenis.trim(), platNomor: k.plat.trim() || null })),
    ),
    platNomor: valid
      .map((k) => k.plat.trim())
      .filter(Boolean)
      .join("; "),
  };
}

/** Tampilan admin / status. */
export function formatKendaraanDisplay(jenisKendaraan?: string | null, platNomor?: string | null): string | null {
  if (!jenisKendaraan?.trim()) return null;
  try {
    const parsed = JSON.parse(jenisKendaraan) as { jenis?: string; platNomor?: string | null }[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .map((k, i) => {
          const jenis = k.jenis || "Kendaraan";
          const plat = k.platNomor?.trim();
          return plat ? `${i + 1}. ${jenis} (${plat})` : `${i + 1}. ${jenis}`;
        })
        .join(" · ");
    }
  } catch {
    /* single legacy */
  }
  const plat = platNomor?.trim();
  return plat ? `${jenisKendaraan} (${plat})` : jenisKendaraan;
}
