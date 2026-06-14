import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

type PemilikKostRow = { statusProperti?: string | null };
type PengajuanRow = { status: string };

export type Visitrw3AdminCounts = {
  propertiMenunggu: number;
  surveyMenunggu: number;
  isLoading: boolean;
};

export function useVisitrw3AdminCounts(): Visitrw3AdminCounts {
  const { data: properti = [], isLoading: lp } = useQuery<PemilikKostRow[]>({
    queryKey: ["/api/pemilik-kost"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 30_000,
  });

  const { data: pengajuan = [], isLoading: lq } = useQuery<PengajuanRow[]>({
    queryKey: ["/api/admin/visitrw3/pengajuan", "menunggu_survey"],
    queryFn: async () => {
      const res = await fetch("/api/admin/visitrw3/pengajuan?status=menunggu_survey", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal memuat antrian survey");
      return res.json();
    },
    staleTime: 30_000,
  });

  return {
    propertiMenunggu: properti.filter((p) => p.statusProperti === "menunggu_verifikasi").length,
    surveyMenunggu: pengajuan.length,
    isLoading: lp || lq,
  };
}
