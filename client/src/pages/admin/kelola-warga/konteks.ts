import { createContext, useContext } from "react";

export const KELOLA_WARGA_PATH = "/admin/kelola-warga";

export const KUNCI_RT_KELOLA = "kelola-warga-rt";

/** Path halaman Kelola warga untuk satu RT; RT disimpan agar langsung terpilih saat halaman dibuka. */
export function jalurKelolaRt(rt: number, sub: string): string {
  localStorage.setItem(KUNCI_RT_KELOLA, String(rt));
  return `${KELOLA_WARGA_PATH}${sub}`;
}

export type RtKelolaValue = {
  rt: number;
  setRt: (n: number) => void;
};

export const RtKelolaContext = createContext<RtKelolaValue | null>(null);

/** RT yang sedang dikelola admin RW di halaman Kelola warga. */
export function useRtKelola(): number | null {
  return useContext(RtKelolaContext)?.rt ?? null;
}

/** RT + setter (filter RT di daftar KK). */
export function useRtKelolaCtx(): RtKelolaValue | null {
  return useContext(RtKelolaContext);
}
