import { useQuery } from "@tanstack/react-query";

export type RingkasanAduan = {
  baru: number;
  belumDibaca: number;
  darurat: number;
  menunggu: number;
  aktif: number;
  selesaiBulanIni: number;
  masukBulanIni: number;
  teguranAktif: number;
  tenggatLewat: number;
  perKategori: { kategori: string; n: number }[];
};

export const KUNCI_RINGKASAN_ADUAN = ["/api/admin/aduan/ringkasan"];

export function useRingkasanAduan() {
  return useQuery<RingkasanAduan | null>({
    queryKey: KUNCI_RINGKASAN_ADUAN,
    queryFn: async () => {
      const res = await fetch("/api/admin/aduan/ringkasan", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}

/** fetch JSON admin aduan; melempar Error berisi pesan server. */
export async function ambilAduanJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) },
  });
  const teks = await res.text();
  const data = teks ? JSON.parse(teks) : null;
  if (!res.ok) throw new Error(data?.message ?? `Gagal (${res.status})`);
  return data as T;
}

export const kirimAduanJson = <T>(url: string, method: "POST" | "PATCH", body: unknown) =>
  ambilAduanJson<T>(url, { method, body: JSON.stringify(body) });
