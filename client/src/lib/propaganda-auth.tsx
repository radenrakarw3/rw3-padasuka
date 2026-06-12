import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PROPAGANDA_API } from "@shared/propaganda-api";
import { fetchWithTimeout, readJsonSafely } from "./queryClient";

type PropagandaAuthContextType = {
  authenticated: boolean;
  loading: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
};

const PropagandaAuthContext = createContext<PropagandaAuthContextType | null>(null);
const AUTH_TIMEOUT_MS = 15_000;

export function PropagandaAuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout(PROPAGANDA_API.auth.me, { credentials: "include" }, AUTH_TIMEOUT_MS);
        if (!cancelled) setAuthenticated(res.ok && (await readJsonSafely<{ authenticated?: boolean }>(res))?.authenticated === true);
      } catch {
        if (!cancelled) setAuthenticated(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (pin: string) => {
    const res = await fetchWithTimeout(
      PROPAGANDA_API.auth.login,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin }),
      },
      AUTH_TIMEOUT_MS,
    );
    const data = await readJsonSafely<{ ok?: boolean; authenticated?: boolean; message?: string }>(res);
    if (!res.ok) throw new Error(data?.message || "PIN salah");
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchWithTimeout(PROPAGANDA_API.auth.logout, { method: "POST", credentials: "include" }, AUTH_TIMEOUT_MS);
    } catch {
      /* tetap keluar di UI */
    }
    setAuthenticated(false);
  }, []);

  return (
    <PropagandaAuthContext.Provider value={{ authenticated, loading, login, logout }}>
      {children}
    </PropagandaAuthContext.Provider>
  );
}

export function usePropagandaAuth() {
  const ctx = useContext(PropagandaAuthContext);
  if (!ctx) throw new Error("usePropagandaAuth must be used within PropagandaAuthProvider");
  return ctx;
}
