/** Format plat Indonesia: [daerah] [angka] [belakang] contoh B 1234 DZ */

export type PlatParts = { daerah: string; angka: string; belakang: string };

export function emptyPlatParts(): PlatParts {
  return { daerah: "", angka: "", belakang: "" };
}

export function joinPlatNomor(parts: PlatParts): string {
  const d = parts.daerah.trim().toUpperCase();
  const a = parts.angka.replace(/\D/g, "");
  const b = parts.belakang.trim().toUpperCase();
  if (!d && !a && !b) return "";
  return [d, a, b].filter(Boolean).join(" ");
}

export function parsePlatNomor(plat?: string): PlatParts {
  if (!plat?.trim()) return emptyPlatParts();
  const parts = plat.trim().toUpperCase().split(/\s+/);
  if (parts.length === 1) {
    if (/^\d+$/.test(parts[0])) return { daerah: "", angka: parts[0], belakang: "" };
    if (/^[A-Z]{1,3}$/.test(parts[0])) return { daerah: parts[0], angka: "", belakang: "" };
  }
  if (parts.length === 2) {
    if (/^[A-Z]{1,3}$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      return { daerah: parts[0], angka: parts[1], belakang: "" };
    }
    if (/^\d+$/.test(parts[0]) && /^[A-Z]{1,3}$/.test(parts[1])) {
      return { daerah: "", angka: parts[0], belakang: parts[1] };
    }
  }
  if (parts.length >= 3) {
    const daerah = parts[0];
    const angka = parts[1]?.replace(/\D/g, "") || "";
    const belakang = parts.slice(2).join("");
    return { daerah, angka, belakang };
  }
  return { daerah: parts[0] || "", angka: "", belakang: "" };
}

export function isPlatLengkap(parts: PlatParts): boolean {
  return Boolean(parts.daerah.trim() && parts.angka.trim() && parts.belakang.trim());
}
