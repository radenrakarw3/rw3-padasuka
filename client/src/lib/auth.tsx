import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "./queryClient";

interface AuthUser {
  type: "warga" | "admin" | "warga_singgah";
  kkId?: number;
  wargaId?: number;
  nomorKk?: string;
  isAdmin?: boolean;
  wargaSinggahId?: number;
  nik?: string;
}

interface WaContact {
  id: number;
  nama: string;
  phone: string;
  kedudukan: string;
  rt?: number;
  kkId?: number;
}

export interface SavedAccount {
  wargaId: number;
  kkId: number;
  nomorKk: string;
  nama: string;
  kedudukan: string;
  rt: number;
}

interface AuthContextType {
  user: AuthUser | null;
  pendingLoginData: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  checkKk: (nomorKk: string) => Promise<{ contacts: WaContact[] }>;
  requestOtp: (nomorKk: string, wargaId: number) => Promise<{ phone: string; nama: string }>;
  verifyOtp: (nomorKk: string, otp: string) => Promise<AuthUser>;
  checkWa: (nomorWa: string) => Promise<{ contacts: WaContact[] }>;
  requestWaOtp: (nomorWa: string, wargaId: number) => Promise<{ phone: string; nama: string }>;
  verifyWaOtp: (nomorWa: string, otp: string) => Promise<AuthUser>;
  singgahCheckNik: (nik: string) => Promise<{ nama: string; phone: string }>;
  singgahRequestOtp: (nik: string) => Promise<{ phone: string; nama: string }>;
  singgahVerifyOtp: (nik: string, otp: string) => Promise<AuthUser>;
  completePendingLogin: () => void;
  getSavedAccounts: (deviceId: string) => Promise<SavedAccount[]>;
  setupPinLogin: (pin: string, deviceId: string) => Promise<void>;
  pinLogin: (wargaId: number, pin: string, deviceId: string) => Promise<AuthUser>;
  deleteSavedLogin: (wargaId: number, deviceId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingLoginData, setPendingLoginData] = useState<AuthUser | null>(null);
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

  const checkKk = useCallback(async (nomorKk: string) => {
    const res = await apiRequest("POST", "/api/auth/check-kk", { nomorKk });
    return await res.json();
  }, []);

  const requestOtp = useCallback(async (nomorKk: string, wargaId: number) => {
    const res = await apiRequest("POST", "/api/auth/request-otp", { nomorKk, wargaId });
    return await res.json();
  }, []);

  // verifyOtp dan verifyWaOtp set pendingLoginData, bukan user langsung
  // supaya login page bisa tampilkan PIN setup sebelum redirect
  const verifyOtp = useCallback(async (nomorKk: string, otp: string) => {
    const res = await apiRequest("POST", "/api/auth/verify-otp", { nomorKk, otp });
    const data = await res.json();
    setPendingLoginData(data);
    return data;
  }, []);

  const checkWa = useCallback(async (nomorWa: string) => {
    const res = await apiRequest("POST", "/api/auth/check-wa", { nomorWa });
    return await res.json();
  }, []);

  const requestWaOtp = useCallback(async (nomorWa: string, wargaId: number) => {
    const res = await apiRequest("POST", "/api/auth/request-wa-otp", { nomorWa, wargaId });
    return await res.json();
  }, []);

  const verifyWaOtp = useCallback(async (nomorWa: string, otp: string) => {
    const res = await apiRequest("POST", "/api/auth/verify-wa-otp", { nomorWa, otp });
    const data = await res.json();
    setPendingLoginData(data);
    return data;
  }, []);

  const singgahCheckNik = useCallback(async (nik: string) => {
    const res = await apiRequest("POST", "/api/auth/singgah/check-nik", { nik });
    return await res.json();
  }, []);

  const singgahRequestOtp = useCallback(async (nik: string) => {
    const res = await apiRequest("POST", "/api/auth/singgah/request-otp", { nik });
    return await res.json();
  }, []);

  const singgahVerifyOtp = useCallback(async (nik: string, otp: string) => {
    const res = await apiRequest("POST", "/api/auth/singgah/verify-otp", { nik, otp });
    const data = await res.json();
    setUser(data); // singgah langsung redirect, tidak ada PIN
    return data;
  }, []);

  const completePendingLogin = useCallback(() => {
    if (pendingLoginData) {
      setUser(pendingLoginData);
      setPendingLoginData(null);
    }
  }, [pendingLoginData]);

  const getSavedAccounts = useCallback(async (deviceId: string): Promise<SavedAccount[]> => {
    const res = await fetch(`/api/auth/saved-login/accounts?deviceId=${encodeURIComponent(deviceId)}`, { credentials: "include" });
    const data = await res.json();
    return data.accounts || [];
  }, []);

  const setupPinLogin = useCallback(async (pin: string, deviceId: string) => {
    const res = await apiRequest("POST", "/api/auth/saved-login/setup", { pin, deviceId });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message);
    }
  }, []);

  const pinLogin = useCallback(async (wargaId: number, pin: string, deviceId: string): Promise<AuthUser> => {
    const res = await apiRequest("POST", "/api/auth/saved-login/pin-login", { wargaId, pin, deviceId });
    const data = await res.json();
    setUser(data);
    return data;
  }, []);

  const deleteSavedLogin = useCallback(async (wargaId: number, deviceId: string) => {
    await apiRequest("DELETE", "/api/auth/saved-login", { wargaId, deviceId });
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
    setPendingLoginData(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, pendingLoginData, loading,
      login, checkKk, requestOtp, verifyOtp,
      checkWa, requestWaOtp, verifyWaOtp,
      singgahCheckNik, singgahRequestOtp, singgahVerifyOtp,
      completePendingLogin, getSavedAccounts, setupPinLogin, pinLogin, deleteSavedLogin,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
