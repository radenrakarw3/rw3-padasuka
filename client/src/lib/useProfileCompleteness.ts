/**
 * useProfileCompleteness — hook client untuk cek kelengkapan profil warga.
 * Logika inti ada di @shared/profile-completeness.
 */

import type { Warga, KartuKeluarga } from "@shared/schema";
import {
  computeKkCompleteness,
  REQUIRED_WARGA_FIELDS,
  REQUIRED_KK_FIELDS,
  type RequiredField,
  type MissingField,
  type ProfileCompleteness,
} from "@shared/profile-completeness";

export {
  REQUIRED_WARGA_FIELDS,
  REQUIRED_KK_FIELDS,
  type RequiredField,
  type MissingField,
  type ProfileCompleteness,
};

export function useProfileCompleteness(
  anggota: Warga[] | undefined,
  kk: KartuKeluarga | undefined,
): ProfileCompleteness {
  if (!anggota || !kk) {
    return { isComplete: false, completionPercent: 0, missingFields: [], totalRequired: 0, totalFilled: 0 };
  }
  return computeKkCompleteness(anggota, kk);
}
