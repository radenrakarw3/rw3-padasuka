import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { RTJUARA_API } from "@shared/rtjuara-api";
import { fetchWithTimeout, readJsonSafely } from "./queryClient";

type RtjuaraSesi = { rt: number; namaKetua: string | null };

type RtjuaraAuthContextType = {
  sesi: RtjuaraSesi | null;
  loading: boolean;
  bootError: string | null;
  login: (rt: number, pin: string) => Promise<void>;
  logout: () => Promise<void>;
};

const RtjuaraAuthContext = createContext<RtjuaraAuthContextType | null>(null);

const PING_TIMEOUT_MS = 4_000;
const AUTH_TIMEOUT_MS = 15_000;

const SERVER_MATI_MSG =
  "Server tidak merespons. Jalankan npm run dev lalu buka http://localhost:5000/rtjuara (bukan port 5173).";

async function serverHidup(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(RTJUARA_API.ping, {}, PING_TIMEOUT_MS);
    return res.ok;
  } catch {
    return false;
  }
}

export function RtjuaraAuthProvider({ children }: { children: React.ReactNode }) {
  const [sesi, setSesi] = useState<RtjuaraSesi | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let dibatalkan = false;
    (async () => {
      try {
        if (!(await serverHidup())) {
          if (!dibatalkan) {
            setSesi(null);
            setBootError(SERVER_MATI_MSG);
          }
          return;
        }
        const res = await fetchWithTimeout(RTJUARA_API.auth.me, {}, AUTH_TIMEOUT_MS);
        if (dibatalkan) return;
        if (res.ok) {
          const data = await readJsonSafely<{ rt: number; namaKetua: string | null }>(res);
          setSesi(data?.rt ? { rt: data.rt, namaKetua: data.namaKetua ?? null } : null);
        } else {
          setSesi(null);
        }
        setBootError(null);
      } catch {
        if (!dibatalkan) {
          setSesi(null);
          setBootError(null);
        }
      } finally {
        if (!dibatalkan) setLoading(false);
      }
    })();
    return () => {
      dibatalkan = true;
    };
  }, []);

  const login = useCallback(async (rt: number, pin: string) => {
    setBootError(null);
    if (!(await serverHidup())) throw new Error(SERVER_MATI_MSG);

    const res = await fetchWithTimeout(
      RTJUARA_API.auth.login,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rt, pin }),
      },
      AUTH_TIMEOUT_MS,
    );
    const data = await readJsonSafely<{ ok?: boolean; rt?: number; namaKetua?: string; message?: string }>(res);
    if (!res.ok) throw new Error(data?.message || "RT atau PIN salah");
    if (!data?.ok || !data.rt) throw new Error("Login gagal — respons server tidak valid");
    setSesi({ rt: data.rt, namaKetua: data.namaKetua ?? null });
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchWithTimeout(RTJUARA_API.auth.logout, { method: "POST" }, AUTH_TIMEOUT_MS);
    } catch {
      /* tetap keluar di UI */
    }
    setSesi(null);
  }, []);

  return (
    <RtjuaraAuthContext.Provider value={{ sesi, loading, bootError, login, logout }}>
      {children}
    </RtjuaraAuthContext.Provider>
  );
}

export function useRtjuaraAuth() {
  const ctx = useContext(RtjuaraAuthContext);
  if (!ctx) throw new Error("useRtjuaraAuth must be used within RtjuaraAuthProvider");
  return ctx;
}
