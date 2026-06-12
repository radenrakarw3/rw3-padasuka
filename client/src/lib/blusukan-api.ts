/**
 * Client SSOT — panggilan API Blusukan RW (master data Ketua RW).
 */
import { BLUSUKAN_API } from "@shared/blusukan-api";
import type { BlusukanQuest, KartuKeluarga, Laporan, Warga } from "@shared/schema";
import { fetchWithTimeout, readJsonSafely } from "./queryClient";

const jsonOpts = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
  credentials: "include",
  body: body !== undefined ? JSON.stringify(body) : undefined,
});

const BLUSUKAN_FETCH_TIMEOUT_MS = 20_000;

export async function blusukanFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(url, { credentials: "include", ...init }, BLUSUKAN_FETCH_TIMEOUT_MS);
  if (!res.ok) {
    const err = await readJsonSafely<{ message?: string }>(res);
    throw new Error(err?.message || `Permintaan gagal (${res.status})`);
  }
  const data = await readJsonSafely<T>(res);
  if (data == null) {
    return [] as T;
  }
  return data;
}

export type BlusukanAuthMe = {
  ok: boolean;
  role: string;
  masterData: boolean;
  scope: string;
};

export type BlusukanKeluargaPage<T = unknown> = {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filter?: "perlu" | "semua" | "selesai";
  counts?: { perlu: number; selesai: number; semua: number };
};

const KELUARGA_DEFAULT_LIMIT = 15;

function normalizeKeluargaPage<T>(raw: unknown, page: number, limit: number): BlusukanKeluargaPage<T> {
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    Array.isArray((raw as BlusukanKeluargaPage<T>).rows) &&
    typeof (raw as BlusukanKeluargaPage<T>).total === "number"
  ) {
    return raw as BlusukanKeluargaPage<T>;
  }

  const list = Array.isArray(raw) ? (raw as T[]) : [];
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * limit;

  return {
    rows: list.slice(offset, offset + limit),
    total,
    page: safePage,
    limit,
    totalPages,
  };
}

export const blusukanApi = {
  paths: BLUSUKAN_API,

  auth: {
    me: () => blusukanFetch<BlusukanAuthMe>(BLUSUKAN_API.auth.me),
    login: (pin: string) =>
      blusukanFetch<{ ok: boolean }>(BLUSUKAN_API.auth.login, jsonOpts("POST", { pin })),
    logout: () => blusukanFetch<{ ok: boolean }>(BLUSUKAN_API.auth.logout, jsonOpts("POST")),
  },

  dashboard: <T = unknown>(rt?: number) => {
    const q = rt != null ? `?rt=${rt}` : "";
    return blusukanFetch<T>(BLUSUKAN_API.dashboard + q);
  },

  keluarga: async <T = unknown>(params?: {
    rt?: number;
    q?: string;
    page?: number;
    limit?: number;
    filter?: "perlu" | "semua" | "selesai";
  }): Promise<BlusukanKeluargaPage<T>> => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? KELUARGA_DEFAULT_LIMIT;
    const sp = new URLSearchParams();
    if (params?.rt != null) sp.set("rt", String(params.rt));
    if (params?.q) sp.set("q", params.q);
    if (params?.filter) sp.set("filter", params.filter);
    sp.set("page", String(page));
    sp.set("limit", String(limit));
    const qs = `?${sp}`;
    const raw = await blusukanFetch<unknown>(BLUSUKAN_API.keluarga + qs);
    return normalizeKeluargaPage<T>(raw, page, limit);
  },

  cari: <T = unknown>(q: string) =>
    blusukanFetch<T[]>(`${BLUSUKAN_API.cari}?q=${encodeURIComponent(q)}`),

  kkList: () => blusukanFetch<KartuKeluarga[]>(BLUSUKAN_API.kkList),

  kk: {
    get: <T = unknown>(id: number) => blusukanFetch<T>(BLUSUKAN_API.kk(id)),
    create: (body: Record<string, unknown>) =>
      blusukanFetch<KartuKeluarga>(BLUSUKAN_API.kkList, jsonOpts("POST", body)),
    patch: (id: number, body: Record<string, unknown>) =>
      blusukanFetch<KartuKeluarga>(BLUSUKAN_API.kk(id), jsonOpts("PATCH", body)),
    delete: (id: number) =>
      blusukanFetch<{ message: string }>(BLUSUKAN_API.kk(id), { method: "DELETE", credentials: "include" }),
  },

  warga: {
    listByKk: (kkId: number) => blusukanFetch<Warga[]>(BLUSUKAN_API.wargaByKk(kkId)),
    create: (body: Record<string, unknown>) =>
      blusukanFetch<Warga>(BLUSUKAN_API.wargaCreate, jsonOpts("POST", body)),
    patch: (id: number, body: Record<string, unknown>) =>
      blusukanFetch<Warga>(BLUSUKAN_API.warga(id), jsonOpts("PATCH", body)),
    delete: (id: number) =>
      blusukanFetch<{ message: string }>(BLUSUKAN_API.warga(id), { method: "DELETE", credentials: "include" }),
  },

  kunjungan: (body: { kkId: number; hasil: string; catatan?: string | null; petugasLabel?: string | null }) =>
    blusukanFetch(BLUSUKAN_API.kunjungan, jsonOpts("POST", body)),

  quest: {
    list: (status?: "aktif" | "selesai") => {
      const q = status ? `?status=${status}` : "";
      return blusukanFetch<BlusukanQuest[]>(BLUSUKAN_API.quest + q);
    },
    create: (body: Record<string, unknown>) =>
      blusukanFetch<BlusukanQuest>(BLUSUKAN_API.quest, jsonOpts("POST", body)),
    patch: (id: number, body: Record<string, unknown>) =>
      blusukanFetch<BlusukanQuest>(BLUSUKAN_API.questItem(id), jsonOpts("PATCH", body)),
  },

  laporan: {
    list: () =>
      blusukanFetch<
        (Laporan & {
          pelaporNama: string | null;
          pelaporRt: number | null;
          pelaporAlamat: string | null;
          pelaporWa: string | null;
        })[]
      >(BLUSUKAN_API.laporan),
    updateStatus: (id: number, body: { status: string; tanggapan?: string }) =>
      blusukanFetch<Laporan>(BLUSUKAN_API.laporanItem(id), jsonOpts("PATCH", body)),
    delete: (id: number) =>
      blusukanFetch<{ ok: boolean; message: string }>(BLUSUKAN_API.laporanItem(id), {
        method: "DELETE",
        credentials: "include",
      }),
  },
};
