export type BlusukanFromPage = "quest" | "laporan" | "cari";

export function parseBlusukanFrom(search: string): BlusukanFromPage {
  const raw = new URLSearchParams(search).get("from");
  if (raw === "quest" || raw === "cari" || raw === "laporan") return raw;
  if (raw === "dashboard" || raw === "kunjungan") return raw === "dashboard" ? "quest" : "laporan";
  return "quest";
}

export function blusukanKkHref(kkId: number, from: BlusukanFromPage = "quest") {
  return `/blusukanrw/kk/${kkId}?from=${from}`;
}

export function blusukanBackRoute(from: BlusukanFromPage): { href: string; label: string } {
  if (from === "cari") return { href: "/blusukanrw/cari", label: "Cari" };
  if (from === "laporan") return { href: "/blusukanrw/laporan", label: "Laporan" };
  return { href: "/blusukanrw/quest", label: "Quest" };
}
