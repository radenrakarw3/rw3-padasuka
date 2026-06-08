export type KependudukanStats = {
  generatedAt: string;
  rtFilter?: number;
  totalWarga: number;
  totalKk: number;
  rataRataAnggotaPerKk: number;
  kelompokUsia: Record<string, number>;
  perRt: { rt: number; warga: number; kk: number }[];
  pengangguran: {
    total: number;
    ratePercent: number;
  };
  pekerjaan: {
    distribusi: Record<string, number>;
    ringkasan?: import("@shared/pekerjaan-labor").PekerjaanRingkasan;
  };
};
