/**
 * Client SSOT — panggilan API RT JUARA (portal ketua RT, admin RW, publik).
 */
import { RTJUARA_API } from "@shared/rtjuara-api";
import type { RtjuaraQuest, RtjuaraJuara } from "@shared/schema";
import type { RtjuaraPeriode, RtjuaraStatus } from "@shared/rtjuara";
import { fetchWithTimeout, readJsonSafely } from "./queryClient";

const RTJUARA_FETCH_TIMEOUT_MS = 30_000;

const jsonOpts = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
  credentials: "include",
  body: body !== undefined ? JSON.stringify(body) : undefined,
});

export async function rtjuaraFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(url, { credentials: "include", ...init }, RTJUARA_FETCH_TIMEOUT_MS);
  if (!res.ok) {
    const err = await readJsonSafely<{ message?: string }>(res).catch(() => null);
    throw new Error(err?.message || `Permintaan gagal (${res.status})`);
  }
  const data = await readJsonSafely<T>(res);
  if (data == null) return [] as T;
  return data;
}

// ===================== Tipe respons =====================

export type RtjuaraKlaim = {
  id: number;
  status: RtjuaraStatus;
  poinDiberikan: number;
  catatanAdmin: string | null;
  createdAt: string | null;
};

export type QuestUntukRt = RtjuaraQuest & {
  periodeKey: string;
  klaim: RtjuaraKlaim | null;
  bisaKirim: boolean;
};

export type SubmissionView = {
  id: number;
  questId: number;
  rt: number;
  periodeKey: string;
  bulanKey: string;
  judulKegiatan: string;
  tanggalKegiatan: string;
  lokasi: string;
  jumlahPeserta: number | null;
  deskripsi: string;
  status: RtjuaraStatus;
  poinPotensi: number;
  poinDiberikan: number;
  catatanAdmin: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  dikirimOleh: string | null;
  createdAt: string | null;
  questJudul: string;
  questPeriode: RtjuaraPeriode;
  questPoin: number;
  fotoIds: number[];
};

export type LeaderboardRow = {
  rt: number;
  totalPoin: number;
  jumlahQuest: number;
  menunggu: number;
  peringkat: number;
};

export type LeaderboardResponse = {
  bulan: string;
  leaderboard: LeaderboardRow[];
  sudahDiumumkan: boolean;
};

export type JuaraResponse = {
  bulan: string;
  juara: RtjuaraJuara[];
  bulanTersedia: string[];
};

export type GaleriItem = {
  id: number;
  rt: number;
  judulKegiatan: string;
  tanggalKegiatan: string;
  lokasi: string;
  poinDiberikan: number;
  questJudul: string;
  questPeriode: RtjuaraPeriode;
  fotoId: number | null;
};

export type RingkasanRt = {
  rt: number;
  bulan: string;
  totalPoin: number;
  disetujui: number;
  menunggu: number;
  ditolak: number;
  peringkat: number;
  leaderboard: LeaderboardRow[];
};

export type AkunView = {
  rt: number;
  namaKetua: string;
  nomorWhatsapp: string | null;
  aktif: boolean;
  lastLoginAt: string | null;
  sudahDiatur: boolean;
};

export type AdminDashboard = {
  bulan: string;
  quest: { total: number; aktif: number };
  bukti: {
    total: number;
    menunggu: number;
    disetujui: number;
    ditolak: number;
    menungguSemuaBulan: number;
  };
  totalPoin: number;
  leaderboard: LeaderboardRow[];
  juara: RtjuaraJuara[];
  akunAktif: number;
  akunTotal: number;
};

export type KirimBuktiPayload = {
  questId: number;
  judulKegiatan: string;
  tanggalKegiatan: string;
  lokasi: string;
  jumlahPeserta?: number | null;
  deskripsi: string;
  dikirimOleh?: string | null;
  foto: string[];
};

function withBulan(base: string, bulan?: string | null): string {
  return bulan ? `${base}?bulan=${encodeURIComponent(bulan)}` : base;
}

export const rtjuaraApi = {
  paths: RTJUARA_API,

  fotoUrl: (fotoId: number) => RTJUARA_API.foto(fotoId),

  auth: {
    me: () =>
      rtjuaraFetch<{ ok: boolean; rt: number; namaKetua: string | null }>(RTJUARA_API.auth.me),
    rtList: () => rtjuaraFetch<{ rt: number; namaKetua: string }[]>(RTJUARA_API.auth.rtList),
    login: (rt: number, pin: string) =>
      rtjuaraFetch<{ ok: boolean; rt: number; namaKetua: string }>(
        RTJUARA_API.auth.login,
        jsonOpts("POST", { rt, pin }),
      ),
    logout: () => rtjuaraFetch<{ ok: boolean }>(RTJUARA_API.auth.logout, jsonOpts("POST")),
  },

  /** Portal ketua RT. */
  rt: {
    quest: () => rtjuaraFetch<QuestUntukRt[]>(RTJUARA_API.quest),
    riwayat: (bulan?: string | null) =>
      rtjuaraFetch<SubmissionView[]>(withBulan(RTJUARA_API.submission, bulan)),
    kirim: (payload: KirimBuktiPayload) =>
      rtjuaraFetch<SubmissionView>(RTJUARA_API.submission, jsonOpts("POST", payload)),
    ringkasan: (bulan?: string | null) =>
      rtjuaraFetch<RingkasanRt>(withBulan(RTJUARA_API.ringkasan, bulan)),
  },

  /** Panel admin RW. */
  admin: {
    dashboard: (bulan?: string | null) =>
      rtjuaraFetch<AdminDashboard>(withBulan(RTJUARA_API.admin.dashboard, bulan)),
    questList: () => rtjuaraFetch<RtjuaraQuest[]>(RTJUARA_API.admin.quest),
    questCreate: (body: Record<string, unknown>) =>
      rtjuaraFetch<RtjuaraQuest>(RTJUARA_API.admin.quest, jsonOpts("POST", body)),
    questPatch: (id: number, body: Record<string, unknown>) =>
      rtjuaraFetch<RtjuaraQuest>(RTJUARA_API.admin.questItem(id), jsonOpts("PATCH", body)),
    questDelete: (id: number) =>
      rtjuaraFetch<{ ok: boolean }>(RTJUARA_API.admin.questItem(id), {
        method: "DELETE",
        credentials: "include",
      }),

    submissionList: (params?: { status?: string | null; rt?: number | null; bulan?: string | null }) => {
      const sp = new URLSearchParams();
      if (params?.status) sp.set("status", params.status);
      if (params?.rt != null) sp.set("rt", String(params.rt));
      if (params?.bulan) sp.set("bulan", params.bulan);
      const qs = sp.toString();
      return rtjuaraFetch<SubmissionView[]>(
        qs ? `${RTJUARA_API.admin.submission}?${qs}` : RTJUARA_API.admin.submission,
      );
    },
    submissionReview: (id: number, body: { status: "disetujui" | "ditolak"; catatanAdmin?: string | null }) =>
      rtjuaraFetch<SubmissionView>(RTJUARA_API.admin.submissionReview(id), jsonOpts("PATCH", body)),
    submissionDelete: (id: number) =>
      rtjuaraFetch<{ ok: boolean }>(RTJUARA_API.admin.submissionItem(id), {
        method: "DELETE",
        credentials: "include",
      }),

    akunList: () => rtjuaraFetch<AkunView[]>(RTJUARA_API.admin.akun),
    akunSave: (body: Record<string, unknown>) =>
      rtjuaraFetch<AkunView>(RTJUARA_API.admin.akun, jsonOpts("POST", body)),
    akunDelete: (rt: number) =>
      rtjuaraFetch<{ ok: boolean }>(RTJUARA_API.admin.akunItem(rt), {
        method: "DELETE",
        credentials: "include",
      }),

    juara: (bulan?: string | null) =>
      rtjuaraFetch<JuaraResponse>(withBulan(RTJUARA_API.admin.juara, bulan)),
    umumkanJuara: (bulan: string, catatan?: string | null) =>
      rtjuaraFetch<{ bulan: string; juara: RtjuaraJuara[] }>(
        RTJUARA_API.admin.juara,
        jsonOpts("POST", { bulan, catatan }),
      ),
    batalkanJuara: (bulan: string) =>
      rtjuaraFetch<{ ok: boolean }>(withBulan(RTJUARA_API.admin.juara, bulan), {
        method: "DELETE",
        credentials: "include",
      }),
  },

  /** Publik — tanpa login. */
  publik: {
    leaderboard: (bulan?: string | null) =>
      rtjuaraFetch<LeaderboardResponse>(withBulan(RTJUARA_API.publik.leaderboard, bulan)),
    juara: (bulan?: string | null) =>
      rtjuaraFetch<JuaraResponse>(withBulan(RTJUARA_API.publik.juara, bulan)),
    galeri: (bulan?: string | null) =>
      rtjuaraFetch<GaleriItem[]>(withBulan(RTJUARA_API.publik.galeri, bulan)),
  },
};
