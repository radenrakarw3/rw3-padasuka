/**
 * Client SSOT — login Ketua RT (portal /rt) dan pengelolaan akun oleh admin RW.
 */
import { RTJUARA_API } from "@shared/rtjuara-api";
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

export type AkunView = {
  rt: number;
  namaKetua: string;
  nomorWhatsapp: string | null;
  aktif: boolean;
  lastLoginAt: string | null;
  sudahDiatur: boolean;
};

export const rtjuaraApi = {
  paths: RTJUARA_API,

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

  /** Panel admin RW. */
  admin: {
    akunList: () => rtjuaraFetch<AkunView[]>(RTJUARA_API.admin.akun),
    akunSave: (body: Record<string, unknown>) =>
      rtjuaraFetch<AkunView>(RTJUARA_API.admin.akun, jsonOpts("POST", body)),
    akunDelete: (rt: number) =>
      rtjuaraFetch<{ ok: boolean }>(RTJUARA_API.admin.akunItem(rt), {
        method: "DELETE",
        credentials: "include",
      }),
  },
};
