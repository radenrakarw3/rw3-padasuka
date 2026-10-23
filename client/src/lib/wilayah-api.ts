import { useCallback, useEffect, useRef, useState } from "react";
import { queryClient } from "@/lib/queryClient";

export class WilayahApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Peran = "rt" | "rw";
type Opsi = { method?: string; body?: unknown; peran?: Peran; rt?: number; signal?: AbortSignal };

let rtKelola: number | null = null;

/** RT yang sedang dikelola admin RW. Dikirim sebagai X-Wilayah-Rt kecuali permintaan berperan "rw". */
export function aturRtKelola(rt: number | null) {
  rtKelola = rt;
}

function headerPeran(peran?: Peran, rt?: number): Record<string, string> {
  if (peran === "rw") return { "X-Wilayah-Peran": "rw" };
  const r = rt ?? rtKelola;
  return r ? { "X-Wilayah-Rt": String(r) } : {};
}

/** Panggilan API wilayah. Selalu melempar error bila gagal — UI tidak boleh menyatakan berhasil. */
export async function wil<T = any>(path: string, opsi: Opsi = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opsi.method ?? (opsi.body !== undefined ? "POST" : "GET"),
      credentials: "include",
      headers: {
        ...(opsi.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headerPeran(opsi.peran, opsi.rt),
      },
      body: opsi.body !== undefined ? JSON.stringify(opsi.body) : undefined,
      signal: opsi.signal,
      referrerPolicy: "no-referrer",
    });
  } catch {
    throw new WilayahApiError(0, "Tidak ada sambungan internet. Isian Anda masih tersimpan — coba kirim lagi.");
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* bukan JSON */
  }
  if (!res.ok) throw new WilayahApiError(res.status, data?.message || `Gagal (kode ${res.status}). Coba lagi.`);
  if (opsi.method !== "GET" && (opsi.method || opsi.body !== undefined)) segarkanStatistikWarga();
  return data as T;
}

/** Angka warga di Dashboard & Kependudukan dihitung dari data yang baru saja bisa berubah. */
export function segarkanStatistikWarga() {
  for (const key of ["/api/statistik-warga", "/api/warga-with-kk", "/api/wilayah/rw/ringkasan", "/api/stats/kependudukan", "/api/wilayah/rw/kotak-masuk", "/api/rekap-warga/ringkasan", "/api/rekap-warga/daftar"]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export async function unduh(path: string, namaCadangan: string, peran?: Peran) {
  const res = await fetch(path, { credentials: "include", headers: headerPeran(peran) });
  if (!res.ok) {
    const t = await res.text();
    let m = `Gagal mengunduh (kode ${res.status})`;
    try {
      m = JSON.parse(t).message || m;
    } catch {
      /* abaikan */
    }
    throw new WilayahApiError(res.status, m);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const nama = /filename="([^"]+)"/.exec(cd)?.[1] || namaCadangan;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Buka berkas (PDF/foto) berotorisasi di tab baru. Tab dibuka dulu agar tidak diblokir browser. */
export async function bukaBerkas(path: string, peran?: Peran) {
  const w = window.open("", "_blank");
  try {
    const res = await fetch(path, { credentials: "include", headers: headerPeran(peran) });
    if (!res.ok) {
      let m = `Gagal membuka berkas (kode ${res.status})`;
      try {
        m = JSON.parse(await res.text()).message || m;
      } catch {
        /* abaikan */
      }
      throw new WilayahApiError(res.status, m);
    }
    const url = URL.createObjectURL(await res.blob());
    if (w) w.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    w?.close();
    throw e;
  }
}

export function kunciIdempoten(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Draft yang bertahan saat tombol kembali, muat ulang, atau gagal kirim.
 * Dihapus hanya setelah server mengonfirmasi tersimpan.
 */
export function useDraft<T>(kunci: string, awal: T) {
  const storageKey = `wil-draft:${kunci}`;
  const [nilai, setNilai] = useState<T>(() => {
    try {
      const s = localStorage.getItem(storageKey);
      return s ? { ...awal, ...JSON.parse(s) } : awal;
    } catch {
      return awal;
    }
  });
  const [adaDraft] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nilai));
    } catch {
      /* penyimpanan penuh */
    }
  }, [storageKey, nilai]);
  const hapus = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* abaikan */
    }
  }, [storageKey]);
  return { nilai, setNilai, hapus, adaDraft };
}

/** Kirim sekali: tombol terkunci selama proses; kunci idempoten tetap sama saat diulang setelah gagal. */
export function useKirimSekali<T>(fn: (kunci: string) => Promise<T>) {
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kunci = useRef(kunciIdempoten());
  const sedang = useRef(false);
  const kirim = useCallback(async (): Promise<T | null> => {
    if (sedang.current) return null;
    sedang.current = true;
    setMengirim(true);
    setError(null);
    try {
      const out = await fn(kunci.current);
      kunci.current = kunciIdempoten();
      return out;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim");
      return null;
    } finally {
      sedang.current = false;
      setMengirim(false);
    }
  }, [fn]);
  return { kirim, mengirim, error, setError };
}
