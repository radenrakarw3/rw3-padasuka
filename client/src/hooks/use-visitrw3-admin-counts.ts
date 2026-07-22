import { useQuery } from "@tanstack/react-query";
import type { PengajuanProduct } from "@/lib/visitrw3-produk-ui";

type PengajuanRow = { status: string };

export type Visitrw3AdminCounts = {
  propertiMenunggu: number;
  surveyMenunggu: number;
  isLoading: boolean;
};

export function useVisitrw3AdminCounts(
  product: PengajuanProduct = "visit",
): Visitrw3AdminCounts {
  const isBiz = product === "rw3biz";
  const path = isBiz
    ? "/api/admin/rw3biz/pengajuan?status=menunggu_survey"
    : "/api/admin/visitrw3/pengajuan?status=menunggu_survey&produk=visit";

  const { data: pengajuan = [], isLoading } = useQuery<PengajuanRow[]>({
    queryKey: [isBiz ? "/api/admin/rw3biz/pengajuan" : "/api/admin/visitrw3/pengajuan", "menunggu_survey", product],
    queryFn: async () => {
      const res = await fetch(path, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat antrian survey");
      return res.json();
    },
    staleTime: 30_000,
  });

  return {
    propertiMenunggu: 0,
    surveyMenunggu: pengajuan.length,
    isLoading,
  };
}
