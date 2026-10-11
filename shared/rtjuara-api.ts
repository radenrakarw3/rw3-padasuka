/**
 * SSOT route API akun & login Ketua RT (portal /rt). Prefix `rtjuara` dipertahankan agar sesi lama tetap berlaku.
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

  /** Panel admin RW (butuh sesi admin). */
  admin: {
    akun: "/api/admin/rtjuara/akun",
    akunItem: (rt: number | string) => `/api/admin/rtjuara/akun/${rt}`,
  },
} as const;

export const RTJUARA_ROLE = "ketua_rt" as const;
