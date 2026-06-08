export type BlusukanFromPage = "kunjungan" | "dashboard" | "cari";

export function parseBlusukanFrom(search: string): BlusukanFromPage {
  const raw = new URLSearchParams(search).get("from");
  if (raw === "dashboard" || raw === "cari" || raw === "kunjungan") return raw;
  return "kunjungan";
}

export function blusukanKkHref(kkId: number, from: BlusukanFromPage = "kunjungan") {
  return `/blusukanrw/kk/${kkId}?from=${from}`;
}

export function blusukanBackRoute(from: BlusukanFromPage): { href: string; label: string } {
  if (from === "dashboard") return { href: "/blusukanrw/dashboard", label: "Dashboard" };
  if (from === "cari") return { href: "/blusukanrw/cari", label: "Cari" };
  return { href: "/blusukanrw/kunjungan", label: "Antrian" };
}
