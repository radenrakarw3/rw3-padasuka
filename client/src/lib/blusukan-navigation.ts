export type BlusukanFromPage = "quest" | "cari";

export function parseBlusukanFrom(search: string): BlusukanFromPage {
  const raw = new URLSearchParams(search).get("from");
  if (raw === "cari") return raw;
  return "quest";
}

export function blusukanKkHref(kkId: number, from: BlusukanFromPage = "quest") {
  return `/blusukanrw/kk/${kkId}?from=${from}`;
}

export function blusukanBackRoute(from: BlusukanFromPage): { href: string; label: string } {
  if (from === "cari") return { href: "/blusukanrw/cari", label: "Cari" };
  return { href: "/blusukanrw/quest", label: "Quest" };
}
