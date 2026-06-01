/** RT yang aktif di RW 03 Padasuka (ketua RT & fitur pelayanan). */
export const ACTIVE_RT_NUMBERS = [1, 2, 3, 4] as const;

export type ActiveRtNumber = (typeof ACTIVE_RT_NUMBERS)[number];

export function isActiveRt(rt: number): rt is ActiveRtNumber {
  return (ACTIVE_RT_NUMBERS as readonly number[]).includes(rt);
}
