import type { KependudukanLegacySummary } from "@/types/dashboard-stats";

export type FillRateItem = { field: string; label: string; filled: number; total: number; percent: number };
export type DistributionItem = { field: string; label: string; buckets: Record<string, number> };
export type BooleanItem = { field: string; label: string; true: number; false: number };

export type SectionStats = {
  key: string;
  title: string;
  description: string;
  totalWarga: number;
  sectionFillPercent: number;
  fillRates: FillRateItem[];
  distributions: DistributionItem[];
  booleans: BooleanItem[];
};

export type KkAnalytics = {
  totalKk: number;
  distributions: DistributionItem[];
  booleans: BooleanItem[];
  fillRates: FillRateItem[];
  penghuniMismatch: number;
  penerimaBansos: number;
  layakBansos: number;
  kkEkonomiTerisi: number;
};

export type KependudukanStats = {
  generatedAt: string;
  rtFilter?: number;
  totals: { kk: number; warga: number };
  legacy: KependudukanLegacySummary;
  kk: KkAnalytics;
  sections: SectionStats[];
  qualityBySection: { key: string; title: string; fillPercent: number }[];
};

export type SegmentRow = {
  wargaId: number;
  namaLengkap: string;
  nik: string;
  rt: number | null;
  kkId: number;
  nomorKk: string | null;
  fieldValue: string | null;
};

export type { KependudukanLegacySummary };
