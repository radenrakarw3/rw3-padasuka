import { createContext, useContext, useState, useEffect, useCallback } from "react";

import { BLUSUKAN_API } from "@shared/blusukan-api";

import { fetchWithTimeout, readJsonSafely } from "./queryClient";



type BlusukanAuthContextType = {

  authenticated: boolean;

  loading: boolean;

  bootError: string | null;

  login: (pin: string) => Promise<void>;

  logout: () => Promise<void>;

};



const BlusukanAuthContext = createContext<BlusukanAuthContextType | null>(null);



const PING_TIMEOUT_MS = 4_000;

const AUTH_TIMEOUT_MS = 15_000;



async function checkServerReachable(): Promise<boolean> {

  try {

    const res = await fetchWithTimeout(BLUSUKAN_API.ping, {}, PING_TIMEOUT_MS);

    return res.ok;

  } catch {

    return false;

  }

}



export function BlusukanAuthProvider({ children }: { children: React.ReactNode }) {

  const [authenticated, setAuthenticated] = useState(false);

  const [loading, setLoading] = useState(true);

  const [bootError, setBootError] = useState<string | null>(null);



  useEffect(() => {

    let cancelled = false;

    (async () => {

      try {

        const reachable = await checkServerReachable();

        if (!reachable) {

          if (!cancelled) {

            setAuthenticated(false);

            setBootError(

              "Server tidak merespons. Jalankan npm run dev lalu buka http://localhost:5000/blusukanrw (bukan port 5173).",

            );

          }

          return;

        }

        const res = await fetchWithTimeout(BLUSUKAN_API.auth.me, {}, AUTH_TIMEOUT_MS);

        if (!cancelled) {

          setAuthenticated(res.ok);

          setBootError(null);

        }

      } catch {

        if (!cancelled) {

          setAuthenticated(false);

          setBootError(null);

        }

      } finally {

        if (!cancelled) setLoading(false);

      }

    })();

    return () => {

      cancelled = true;

    };

  }, []);



  const login = useCallback(async (pin: string) => {

    setBootError(null);

    const reachable = await checkServerReachable();

    if (!reachable) {

      throw new Error(

        "Server tidak merespons. Jalankan npm run dev lalu buka http://localhost:5000/blusukanrw.",

      );

    }

    const res = await fetchWithTimeout(

      BLUSUKAN_API.auth.login,

      {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ pin }),

      },

      AUTH_TIMEOUT_MS,

    );

    const data = await readJsonSafely<{ ok?: boolean; authenticated?: boolean; message?: string }>(res);

    if (!res.ok) {

      throw new Error(data?.message || "PIN salah");

    }

    if (!data?.ok && !data?.authenticated) {

      throw new Error("Login gagal — respons server tidak valid");

    }

    setAuthenticated(true);

  }, []);



  const logout = useCallback(async () => {

    try {

      await fetchWithTimeout(BLUSUKAN_API.auth.logout, { method: "POST" }, AUTH_TIMEOUT_MS);

    } catch {

      /* tetap keluar di UI */

    }

    setAuthenticated(false);

  }, []);



  return (

    <BlusukanAuthContext.Provider value={{ authenticated, loading, bootError, login, logout }}>

      {children}

    </BlusukanAuthContext.Provider>

  );

}



export function useBlusukanAuth() {

  const ctx = useContext(BlusukanAuthContext);

  if (!ctx) throw new Error("useBlusukanAuth must be used within BlusukanAuthProvider");

  return ctx;

}


