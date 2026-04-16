import type { QueryClient, QueryKey, UseQueryOptions } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";
import type { KartuKeluarga, Warga } from "@shared/schema";

type WalletData = {
  saldo?: number;
  namaWarga?: string;
  [key: string]: unknown;
} | null;

type CurhatKuotaData = {
  sudahCurhatHariIni: boolean;
  coinDiberikan: number;
  balasanGemini: string | null;
} | null;

type MitraRwcoinData = Array<Record<string, unknown>>;
type VoucherRwcoinData = Array<Record<string, unknown>>;
type PrefetchableQuery = {
  queryKey: QueryKey;
  queryFn?: ReturnType<typeof getQueryFn<unknown>>;
  staleTime?: number;
};

type IdleHandle = number;
type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleDeadline) => void;

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: IdleCallback, options?: { timeout?: number }) => IdleHandle;
  cancelIdleCallback?: (handle: IdleHandle) => void;
};

const walletQueryFn = getQueryFn<WalletData>({ on401: "returnNull" });
const kuotaQueryFn = getQueryFn<CurhatKuotaData>({ on401: "returnNull" });
const mitraQueryFn = getQueryFn<MitraRwcoinData>({ on401: "returnNull" });
const voucherQueryFn = getQueryFn<VoucherRwcoinData>({ on401: "returnNull" });
const kkQueryFn = getQueryFn<KartuKeluarga | null>({ on401: "throw" });
const anggotaQueryFn = getQueryFn<Warga[]>({ on401: "throw" });

export type WargaCoreUser = Pick<AuthUser, "type" | "kkId"> | null | undefined;

export function wargaKkQueryOptions(
  kkId: number | null | undefined,
): UseQueryOptions<KartuKeluarga | null, Error, KartuKeluarga | null, readonly [string, number | undefined]> {
  return {
    queryKey: ["/api/kk", kkId ?? undefined],
    queryFn: kkQueryFn,
    enabled: !!kkId,
  };
}

export function wargaAnggotaQueryOptions(
  kkId: number | null | undefined,
): UseQueryOptions<Warga[], Error, Warga[], readonly [string, number | undefined]> {
  return {
    queryKey: ["/api/warga/kk", kkId ?? undefined],
    queryFn: anggotaQueryFn,
    enabled: !!kkId,
  };
}

export function wargaWalletQueryOptions(): UseQueryOptions<WalletData, Error, WalletData, readonly [string]> {
  return {
    queryKey: ["/api/warga/rwcoin/wallet"],
    queryFn: walletQueryFn,
  };
}

export function wargaCurhatKuotaQueryOptions(): UseQueryOptions<CurhatKuotaData, Error, CurhatKuotaData, readonly [string]> {
  return {
    queryKey: ["/api/warga/curhat/kuota"],
    queryFn: kuotaQueryFn,
    staleTime: 30_000,
  };
}

export function wargaMitraQueryOptions(): UseQueryOptions<MitraRwcoinData, Error, MitraRwcoinData, readonly [string]> {
  return {
    queryKey: ["/api/warga/rwcoin/mitra"],
    queryFn: mitraQueryFn,
    staleTime: 60_000,
  };
}

export function wargaVoucherQueryOptions(): UseQueryOptions<VoucherRwcoinData, Error, VoucherRwcoinData, readonly [string]> {
  return {
    queryKey: ["/api/warga/rwcoin/voucher"],
    queryFn: voucherQueryFn,
  };
}

function isWargaReady(user: WargaCoreUser): user is Pick<AuthUser, "type" | "kkId"> & { type: "warga"; kkId: number } {
  return user?.type === "warga" && !!user.kkId;
}

function prefetchBatch(queryClient: QueryClient, batch: PrefetchableQuery[]) {
  return Promise.allSettled(
    batch.map((query) =>
      queryClient.prefetchQuery({
        queryKey: query.queryKey,
        queryFn: query.queryFn,
        staleTime: query.staleTime,
      }),
    ),
  );
}

export function prefetchWargaCoreData(queryClient: QueryClient, user: WargaCoreUser): () => void {
  if (!isWargaReady(user) || typeof window === "undefined") {
    return () => {};
  }

  const win = window as WindowWithIdleCallback;
  let cancelled = false;
  let started = false;
  let idleHandle: IdleHandle | null = null;
  const timeoutHandle = window.setTimeout(() => {
    void startPrefetch();
  }, 180);

  function startPrefetch() {
    if (cancelled || started) return;
    started = true;
    window.clearTimeout(timeoutHandle);
    void runBatches();
  }

  async function runBatches() {
    if (cancelled) return;
    const wallet = wargaWalletQueryOptions();
    const anggota = wargaAnggotaQueryOptions(user.kkId);
    const kk = wargaKkQueryOptions(user.kkId);
    const kuota = wargaCurhatKuotaQueryOptions();
    const mitra = wargaMitraQueryOptions();
    const voucher = wargaVoucherQueryOptions();

    await prefetchBatch(queryClient, [
      { queryKey: wallet.queryKey, queryFn: wallet.queryFn, staleTime: wallet.staleTime },
      { queryKey: anggota.queryKey, queryFn: anggota.queryFn, staleTime: anggota.staleTime },
      { queryKey: kk.queryKey, queryFn: kk.queryFn, staleTime: kk.staleTime },
      { queryKey: kuota.queryKey, queryFn: kuota.queryFn, staleTime: kuota.staleTime },
      { queryKey: mitra.queryKey, queryFn: mitra.queryFn, staleTime: mitra.staleTime },
      { queryKey: voucher.queryKey, queryFn: voucher.queryFn, staleTime: voucher.staleTime },
    ]);
  }

  if (typeof win.requestIdleCallback === "function") {
    idleHandle = win.requestIdleCallback(() => {
      startPrefetch();
    }, { timeout: 1200 });
  }

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutHandle);
    if (idleHandle != null && typeof win.cancelIdleCallback === "function") {
      win.cancelIdleCallback(idleHandle);
    }
  };
}
