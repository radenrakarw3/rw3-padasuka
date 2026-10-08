import { useQuery } from "@tanstack/react-query";
import { RTJUARA_API } from "@shared/rtjuara-api";
import { rtjuaraApi } from "@/lib/rtjuara-api";

export type RtjuaraAdminCounts = {
  buktiMenunggu: number;
  isLoading: boolean;
};

/** Jumlah bukti RT JUARA yang menunggu verifikasi — untuk badge nav admin. */
export function useRtjuaraAdminCounts(): RtjuaraAdminCounts {
  const { data = [], isLoading } = useQuery({
    queryKey: [RTJUARA_API.admin.submission, "menunggu"],
    queryFn: () => rtjuaraApi.admin.submissionList({ status: "menunggu" }),
    staleTime: 30_000,
  });

  return { buktiMenunggu: data.length, isLoading };
}
