import { useQuery } from "@tanstack/react-query";
import { wil } from "@/lib/wilayah-api";

export interface KotakMasuk {
  total: number;
  perRt: { rt: number; usulan: number; pindah: number }[];
}

export const KUNCI_KOTAK_MASUK = "/api/wilayah/rw/kotak-masuk";

/** Isian QR & permintaan pindah RT yang menunggu keputusan, per RT (badge menu & tab). */
export function useKotakMasuk() {
  return useQuery<KotakMasuk>({
    queryKey: [KUNCI_KOTAK_MASUK],
    queryFn: () => wil(KUNCI_KOTAK_MASUK, { peran: "rw" }),
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}
