/** @deprecated Import dari propaganda-helix — dipertahankan untuk kompatibilitas import lama. */
export {
  HELIX_FORMULA_VERSION,
  PROPAGANDA_PROFIL_JAM,
  getHelixConfigFromEnv as getDistribusiConfigFromEnv,
  buildHelixPlan as schedulePropagandaDistribution,
  estimateHelixTimeline as estimateTimeline,
  computeFairnessScore,
  type HelixPlan,
  type HelixSlot as ScheduledRecipient,
  type HelixConfig as PropagandaDistribusiConfig,
} from "@shared/propaganda-helix";
