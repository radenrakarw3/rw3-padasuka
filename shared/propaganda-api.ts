import type { PropagandaProfil } from "@shared/schema";
import type { PropagandaFilterInput, PropagandaPreviewResult } from "@shared/propaganda-filters";

export const PROPAGANDA_API = {
  base: "/api/propaganda",
  auth: {
    login: "/api/propaganda/auth/login",
    logout: "/api/propaganda/auth/logout",
    me: "/api/propaganda/auth/me",
  },
  filterOptions: "/api/propaganda/filter-options",
  preview: "/api/propaganda/preview",
  campaign: "/api/propaganda/campaign",
  campaignItem: (id: number | string) => `/api/propaganda/campaign/${id}`,
  campaignAntrian: (id: number | string) => `/api/propaganda/campaign/${id}/antrian`,
  campaignJeda: (id: number | string) => `/api/propaganda/campaign/${id}/jeda`,
  campaignLanjut: (id: number | string) => `/api/propaganda/campaign/${id}/lanjut`,
  campaignBatalkan: (id: number | string) => `/api/propaganda/campaign/${id}/batalkan`,
  campaignUlangGagal: (id: number | string) => `/api/propaganda/campaign/${id}/ulang-gagal`,
  campaignGelombang: (id: number | string) => `/api/propaganda/campaign/${id}/gelombang`,
  campaignStats: (id: number | string) => `/api/propaganda/campaign/${id}/stats`,
  health: "/api/propaganda/health",
  generate: "/api/propaganda/generate",
} as const;

export type PropagandaCreateCampaignBody = {
  judul: string;
  pesanTemplate: string;
  filter: PropagandaFilterInput;
  profilDistribusi: PropagandaProfil;
  abaikanCooldown?: boolean;
  konfirmasiBesar?: boolean;
};

export type PropagandaCampaignSummary = {
  id: number;
  judul: string;
  status: string;
  profilDistribusi: string;
  formulaVersi: string | null;
  fairnessScore: number | null;
  jumlahGelombang: number;
  jumlahTarget: number;
  jumlahTerkirim: number;
  jumlahGagal: number;
  jumlahDilewati: number;
  jumlahMenunggu: number;
  mulaiKirim: string | null;
  estimasiSelesai: string | null;
  selesaiKirim: string | null;
  createdAt: string | null;
  createdBy: string | null;
};

export type PropagandaCampaignDetail = PropagandaCampaignSummary & {
  pesanTemplate: string;
  filterJson: string;
  abaikanCooldown: boolean;
  perRt: Record<string, number>;
  preview?: PropagandaPreviewResult;
};

export type PropagandaAntrianRow = {
  id: number;
  nama: string;
  nomorWhatsapp: string;
  rt: number | null;
  status: string;
  jadwalKirim: string;
  sentAt: string | null;
  lastError: string | null;
};

export const PROPAGANDA_PROFIL_LABEL: Record<PropagandaProfil, string> = {
  cepat_aman: "Cepat aman (2 jam)",
  standar: "Standar (6 jam)",
  merata: "Merata (12 jam)",
  hati_hati: "Hati-hati (24 jam)",
  sangat_hati_hati: "Sangat hati-hati (48 jam)",
};
