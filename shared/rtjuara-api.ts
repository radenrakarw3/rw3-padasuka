/**
 * SSOT route API RT JUARA — quest RT, verifikasi bukti, papan peringkat.
 * Ubah path di sini; client (rtjuara-api.ts) & server (rtjuara-routes.ts) mengikuti.
 */

export const RTJUARA_API = {
  base: "/api/rtjuara",
  ping: "/api/rtjuara/ping",

  /** Portal ketua RT (butuh sesi RT). */
  auth: {
    login: "/api/rtjuara/auth/login",
    logout: "/api/rtjuara/auth/logout",
    me: "/api/rtjuara/auth/me",
    /** Daftar RT yang akunnya sudah diaktifkan admin — untuk pemilih di halaman login. */
    rtList: "/api/rtjuara/auth/rt-list",
  },
  quest: "/api/rtjuara/quest",
  submission: "/api/rtjuara/submission",
  submissionItem: (id: number | string) => `/api/rtjuara/submission/${id}`,
  ringkasan: "/api/rtjuara/ringkasan",

  /** Foto dokumentasi — publik bila bukti sudah disetujui. */
  foto: (id: number | string) => `/api/rtjuara/foto/${id}`,

  /** Panel admin RW (butuh sesi admin). */
  admin: {
    dashboard: "/api/admin/rtjuara/dashboard",
    quest: "/api/admin/rtjuara/quest",
    questItem: (id: number | string) => `/api/admin/rtjuara/quest/${id}`,
    submission: "/api/admin/rtjuara/submission",
    submissionItem: (id: number | string) => `/api/admin/rtjuara/submission/${id}`,
    submissionReview: (id: number | string) => `/api/admin/rtjuara/submission/${id}/review`,
    akun: "/api/admin/rtjuara/akun",
    akunItem: (rt: number | string) => `/api/admin/rtjuara/akun/${rt}`,
    juara: "/api/admin/rtjuara/juara",
  },

  /** Publik — tanpa login. */
  publik: {
    leaderboard: "/api/public/rtjuara/leaderboard",
    juara: "/api/public/rtjuara/juara",
    galeri: "/api/public/rtjuara/galeri",
  },
} as const;

export const RTJUARA_ROLE = "ketua_rt" as const;
