/**
 * SSOT route API Blusukan RW — Ketua RW, master data kependudukan RT 01–04.
 * Ubah path di sini; client (blusukan-api.ts) & server (blusukan-routes.ts) mengikuti.
 */

export const BLUSUKAN_API = {
  base: "/api/blusukan",
  ping: "/api/blusukan/ping",
  auth: {
    login: "/api/blusukan/auth/login",
    logout: "/api/blusukan/auth/logout",
    me: "/api/blusukan/auth/me",
  },
  dashboard: "/api/blusukan/dashboard",
  quest: "/api/blusukan/quest",
  questItem: (id: number | string) => `/api/blusukan/quest/${id}`,
  laporan: "/api/blusukan/laporan",
  laporanItem: (id: number | string) => `/api/blusukan/laporan/${id}`,
  keluarga: "/api/blusukan/keluarga",
  cari: "/api/blusukan/cari",
  /** Daftar KK pemukiman (picker pindah KK / form warga). */
  kkList: "/api/blusukan/kk",
  kk: (id: number | string) => `/api/blusukan/kk/${id}`,
  wargaCreate: "/api/blusukan/warga",
  warga: (id: number | string) => `/api/blusukan/warga/${id}`,
  wargaByKk: (kkId: number | string) => `/api/blusukan/warga/kk/${kkId}`,
  kunjungan: "/api/blusukan/kunjungan",
} as const;

export const BLUSUKAN_ROLE = "ketua_rw" as const;
