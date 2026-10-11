import { useQuery } from "@tanstack/react-query";
import type { DefinisiFakta } from "@shared/wilayah";
import { wil } from "./wilayah-api";

let peta = new Map<string, DefinisiFakta>();

/** Simpan daftar pertanyaan agar komponen isian dapat mencari definisi per kunci. */
export function pasangStandar(list: DefinisiFakta[]) {
  peta = new Map(list.map((d) => [d.kunci, d]));
}

export function defStandar(kunci: string): DefinisiFakta | undefined {
  return peta.get(kunci);
}

/** Pertanyaan aktif standar data RW 03 (atau semua termasuk arsip). */
export function useStandar(semua = false) {
  return useQuery({
    queryKey: ["/api/wilayah/standar", semua],
    queryFn: async () => {
      const list = await wil<DefinisiFakta[]>(`/api/wilayah/standar${semua ? "?semua=1" : ""}`);
      if (!semua) pasangStandar(list);
      return list;
    },
    staleTime: 60_000,
  });
}
