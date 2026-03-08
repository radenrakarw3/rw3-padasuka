import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "./queryClient";

interface AuthUser {
  type: "warga" | "admin";
  kkId?: number;
  nomorKk?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  requestOtp: (nomorKk: string) => Promise<{ phone: string }>;
  verifyOtp: (nomorKk: string, otp: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data) => {
        if (data) setUser(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setUser(data);
    return data;
  }, []);

  const requestOtp = useCallback(async (nomorKk: string) => {
    const res = await apiRequest("POST", "/api/auth/request-otp", { nomorKk });
    const data = await res.json();
    return data;
  }, []);

  const verifyOtp = useCallback(async (nomorKk: string, otp: string) => {
    const res = await apiRequest("POST", "/api/auth/verify-otp", { nomorKk, otp });
    const data = await res.json();
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
