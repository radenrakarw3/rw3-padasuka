import { useQuery } from "@tanstack/react-query";

type AnggotaRow = { statusKeanggotaan: string };

export type KarangtarunaAdminCounts = {
  anggotaBaru: number;
  isLoading: boolean;
};

/** Jumlah anggota Karang Taruna berstatus "baru" (belum diverifikasi) untuk badge nav. */
export function useKarangtarunaAdminCounts(): KarangtarunaAdminCounts {
  const { data: baru = [], isLoading } = useQuery<AnggotaRow[]>({
    queryKey: ["/api/admin/karangtaruna/anggota", "baru"],
    queryFn: async () => {
      const res = await fetch("/api/admin/karangtaruna/anggota?status=baru", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat anggota baru");
      return res.json();
    },
    staleTime: 30_000,
  });

  return { anggotaBaru: baru.length, isLoading };
}
