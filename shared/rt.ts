/** RT pemukiman RW 03 Padasuka — satu-satunya RT yang dikelola di sistem. */
export const ACTIVE_RT_NUMBERS = [1, 2, 3, 4] as const;

export type ActiveRtNumber = (typeof ACTIVE_RT_NUMBERS)[number];

/** Alias eksplisit untuk modul Blusukan RW. */
export const BLUSUKAN_RT_NUMBERS = ACTIVE_RT_NUMBERS;

export function isActiveRt(rt: unknown): rt is ActiveRtNumber {
  const n = typeof rt === "number" ? rt : parseInt(String(rt ?? ""), 10);
  return Number.isFinite(n) && (ACTIVE_RT_NUMBERS as readonly number[]).includes(n);
}

/** Modul kependudukan RW: hanya RT 01–04. */
export function filterKkByActiveRt<T extends { rt: unknown }>(items: T[]): T[] {
  return items.filter((k) => isActiveRt(k.rt));
}

export function assertKkInPemukimanScope<T extends { rt: unknown }>(
  kk: T | null | undefined,
): kk is T {
  return !!kk && isActiveRt(kk.rt);
}
